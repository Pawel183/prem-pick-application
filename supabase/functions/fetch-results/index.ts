// Fetches final results (and, when the provider has them, yellow cards + corners) and scores them.
// Triggered by pg_cron (23:45 Europe/Warsaw) and by the admin "Fetch results" button.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { formFromRecent, getProvider, saveStandings, type Call, type Provider } from "../_shared/football-providers.ts"

// A match is worth checking once it should be over (kickoff + ~2h).
const MATCH_DURATION_MS = 115 * 60 * 1000

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
})

class BudgetError extends Error {}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Logged, throttled, budget-guarded request function for the provider adapters. */
function createCall(provider: Provider, counter: { requests: number }): Call {
  const key = Deno.env.get(provider.envKey)
  if (!key) throw new Error(`MISSING_API_KEY:${provider.envKey}`)

  return async (endpoint, params = {}) => {
    if (provider.dailyLimit !== null) {
      const since = new Date()
      since.setUTCHours(0, 0, 0, 0)
      const { count } = await supabase
        .from("api_requests")
        .select("id", { count: "exact", head: true })
        .gte("called_at", since.toISOString())
      if ((count ?? 0) >= provider.dailyLimit) throw new BudgetError("API_BUDGET_EXCEEDED")
    }

    const { data: recent } = await supabase
      .from("api_requests")
      .select("called_at")
      .gte("called_at", new Date(Date.now() - 60_000).toISOString())
      .order("called_at", { ascending: true })
    if (recent && recent.length >= provider.perMinute) {
      const freeAt = new Date(recent[recent.length - provider.perMinute].called_at).getTime() + 60_000
      await sleep(Math.max(0, freeAt - Date.now()) + 250)
    }

    const url = new URL(`${provider.baseUrl}/${endpoint}`)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

    let statusCode: number | null = null
    let error: string | null = null
    let body: unknown = null
    try {
      const res = await fetch(url, { headers: provider.authHeaders(key) })
      statusCode = res.status
      body = await res.json().catch(() => null)
      error = provider.parseError(res.status, body)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
    counter.requests++
    await supabase.from("api_requests").insert({
      endpoint: `${provider.id}:${endpoint}`,
      params,
      status_code: statusCode,
      error,
      source: "edge",
    })
    if (error) throw new Error(`${provider.id} ${endpoint}: ${error}`)
    return body
  }
}

function warsawHour(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).format(date)
  )
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405)
  const secret = Deno.env.get("CRON_SECRET")
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "UNAUTHORIZED" }, 401)
  }

  const { source = "manual" } = await req.json().catch(() => ({}))
  // pg_cron runs at both 21:45 and 22:45 UTC to cover DST; only the 23:xx Warsaw run proceeds.
  if (source === "cron" && warsawHour() !== 23) {
    return json({ checked: 0, updated: 0, scored: 0, requests: 0, skipped: "not-23h-warsaw" })
  }

  const counter = { requests: 0 }
  try {
    const { data: season } = await supabase
      .from("seasons")
      .select("id, api_season, provider")
      .eq("is_active", true)
      .single()
    if (!season) return json({ error: "NO_ACTIVE_SEASON" }, 500)

    const provider = getProvider(season.provider)
    const col = provider.extColumn
    const cutoff = new Date(Date.now() - MATCH_DURATION_MS).toISOString()

    // Candidates: linked to this provider, not overridden, should be over, and either not
    // finished yet, finished without a score, or (stats providers) finished but not yet scored.
    const pending = provider.hasMatchStats
      ? "status.in.(scheduled,live),and(status.eq.finished,scored_at.is.null)"
      : "status.in.(scheduled,live),and(status.eq.finished,home_goals.is.null)"
    const { data: candidates, error } = await supabase
      .from("matches")
      .select(
        `id, ${col}, kickoff_at, status, home:teams!matches_home_team_id_fkey(${col}), away:teams!matches_away_team_id_fkey(${col}), gameweeks!inner(season_id)`
      )
      .eq("gameweeks.season_id", season.id)
      .eq("is_overridden", false)
      .not(col, "is", null)
      .lte("kickoff_at", cutoff)
      .or(pending)
    if (error) throw error

    const call = createCall(provider, counter)
    let updated = 0
    let scored = 0

    if (candidates?.length) {
      const dates = candidates.map((m: any) => m.kickoff_at.slice(0, 10)).sort()
      const fixtures = await provider.fixturesBetween(call, season.api_season, dates[0], dates[dates.length - 1])
      const byId = new Map(fixtures.map((f) => [f.externalId, f]))

      for (const m of candidates as any[]) {
        const f = byId.get(m[col])
        if (!f) continue
        const now = new Date().toISOString()

        if (f.status !== "finished") {
          // Postponed/rescheduled: keep kickoff in sync so predictions reopen correctly.
          await supabase
            .from("matches")
            .update({ status: f.status, kickoff_at: f.kickoffAt, results_fetched_at: now })
            .eq("id", m.id)
          if (f.status !== m.status) updated++
          continue
        }

        const stats = provider.hasMatchStats
          ? await provider.matchStats(call, { externalId: m[col], homeExt: m.home[col], awayExt: m.away[col] })
          : null

        await supabase
          .from("matches")
          .update({
            status: "finished",
            home_goals: f.homeGoals,
            away_goals: f.awayGoals,
            // Only write stats the provider actually returned; never wipe admin-entered values.
            ...(stats
              ? {
                  home_yellows: stats.homeYellows,
                  away_yellows: stats.awayYellows,
                  home_corners: stats.homeCorners,
                  away_corners: stats.awayCorners,
                }
              : {}),
            results_fetched_at: now,
          })
          .eq("id", m.id)
        updated++

        const { data: count, error: scoreError } = await supabase.rpc("score_match", { p_match_id: m.id })
        if (scoreError) throw scoreError
        scored += count ?? 0
      }

      if (updated > 0) {
        const standings = await provider.standings(call, season.api_season)
        const recent = await provider.recent(call, season.api_season)
        const teamIds = await saveStandings(
          supabase,
          provider,
          season.id,
          standings.map((s) => {
            const r = recent.get(s.team.externalId) ?? []
            return { ...s, recent: r, form: formFromRecent(r) ?? s.form }
          })
        )

        // Refresh form + last five shown on upcoming matches.
        const recentByTeam = new Map([...recent].map(([ext, r]) => [teamIds.get(ext), r]))
        const { data: upcoming } = await supabase
          .from("matches")
          .select("id, home_team_id, away_team_id, match_insights!inner(match_id)")
          .eq("status", "scheduled")
        for (const m of upcoming ?? []) {
          const home = recentByTeam.get(m.home_team_id) ?? []
          const away = recentByTeam.get(m.away_team_id) ?? []
          await supabase
            .from("match_insights")
            .update({ home_form: formFromRecent(home), away_form: formFromRecent(away), home_recent: home, away_recent: away })
            .eq("match_id", m.id)
        }
      }
    }

    // Finished matches still waiting for admin-entered cards/corners.
    const { count: needsStats } = await supabase
      .from("matches")
      .select("id, gameweeks!inner(season_id)", { count: "exact", head: true })
      .eq("gameweeks.season_id", season.id)
      .eq("status", "finished")
      .or("home_yellows.is.null,away_yellows.is.null,home_corners.is.null,away_corners.is.null")

    return json({ checked: candidates?.length ?? 0, updated, scored, requests: counter.requests, needsStats: needsStats ?? 0 })
  } catch (e) {
    if (e instanceof BudgetError) return json({ error: "API_BUDGET_EXCEEDED", requests: counter.requests }, 429)
    console.error(e)
    return json({ error: e instanceof Error ? e.message : String(e), requests: counter.requests }, 500)
  }
})
