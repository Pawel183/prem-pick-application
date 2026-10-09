"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { ApiBudgetError, MissingApiKeyError, createCall, getActiveSeason } from "@/lib/football/client"
import {
  PROVIDERS,
  formFromRecent,
  resolveTeams,
  saveStandings,
  type Call,
  type NStanding,
  type Provider,
  type RecentMatch,
} from "@football/providers"
import type { ActionResult } from "@/lib/action-result"

function fail(e: unknown): { ok: false; error: string; detail?: string } {
  if (e instanceof ApiBudgetError) return { ok: false, error: "apiBudget" }
  if (e instanceof MissingApiKeyError) return { ok: false, error: "missingApiKey", detail: e.envKey }
  console.error(e)
  return { ok: false, error: "unknown", detail: e instanceof Error ? e.message : String(e) }
}

/** Fetches + stores the table with form and last-five details. Returns internal team id -> recent matches. */
async function syncStandings(call: Call, provider: Provider, seasonId: number, apiSeason: number) {
  const standings = await provider.standings(call, apiSeason)
  const recentByExt = await provider.recent(call, apiSeason)
  const enriched: NStanding[] = standings.map((s) => {
    const recent = recentByExt.get(s.team.externalId) ?? []
    return { ...s, recent, form: formFromRecent(recent) ?? s.form }
  })
  const teamIds = await saveStandings(createAdminClient(), provider, seasonId, enriched)

  const recentByTeam = new Map<number, RecentMatch[]>()
  for (const [ext, recent] of recentByExt) {
    const id = teamIds.get(ext)
    if (id) recentByTeam.set(id, recent)
  }
  return recentByTeam
}

const gameweekSchema = z.coerce.number().int().min(1).max(38)

/**
 * Syncs one gameweek from the season's provider: fixtures, table + form, and H2H for matches
 * without cached insights. Matches created by another provider are re-linked by teams, so
 * switching providers mid-season keeps existing predictions attached.
 */
export async function syncGameweek(
  number: number,
  refreshInsights = false
): Promise<ActionResult<{ matches: number; requests: number }>> {
  await requireAdmin()
  const parsed = gameweekSchema.safeParse(number)
  if (!parsed.success) return { ok: false, error: "invalid" }

  try {
    const admin = createAdminClient()
    const season = await getActiveSeason()
    const provider = season.provider
    const col = provider.extColumn
    let requests = 0
    const baseCall = createCall(provider)
    const call: Call = (endpoint, params) => {
      requests++
      return baseCall(endpoint, params)
    }

    const fixtures = await provider.gameweekFixtures(call, season.api_season, parsed.data)
    if (fixtures.length === 0) return { ok: false, error: "noFixtures" }

    const teamIds = await resolveTeams(admin, provider, fixtures.flatMap((f) => [f.home, f.away]))

    const { data: gameweek, error: gwError } = await admin
      .from("gameweeks")
      .upsert(
        {
          season_id: season.id,
          number: parsed.data,
          api_round: `Regular Season - ${parsed.data}`,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "season_id,number" }
      )
      .select("id")
      .single()
    if (gwError) throw gwError

    const { data: existing, error: existingError } = await admin
      .from("matches")
      .select("id, home_team_id, away_team_id, is_overridden, ext_football_data, ext_api_football")
      .or(`gameweek_id.eq.${gameweek.id},${col}.in.(${fixtures.map((f) => f.externalId).join(",")})`)
    if (existingError) throw existingError
    const byExt = new Map((existing ?? []).filter((m) => m[col] !== null).map((m) => [m[col]!, m]))
    const byTeams = new Map(
      (existing ?? []).filter((m) => m[col] === null).map((m) => [`${m.home_team_id}-${m.away_team_id}`, m])
    )

    for (const f of fixtures) {
      const home = teamIds.get(f.home.externalId)!
      const away = teamIds.get(f.away.externalId)!
      const current = byExt.get(f.externalId) ?? byTeams.get(`${home}-${away}`)
      // Cards/corners come from the results job or the admin; sync tracks schedule, status and,
      // for matches that already finished, the score.
      const row = {
        gameweek_id: gameweek.id,
        home_team_id: home,
        away_team_id: away,
        kickoff_at: f.kickoffAt,
        [col]: f.externalId,
        ...(current?.is_overridden
          ? {}
          : {
              status: f.status,
              ...(f.status === "finished" ? { home_goals: f.homeGoals, away_goals: f.awayGoals } : {}),
            }),
      }
      const { error } = current
        ? await admin.from("matches").update(row).eq("id", current.id)
        : await admin.from("matches").insert(row)
      if (error) throw error
    }

    const recent = await syncStandings(call, provider, season.id, season.api_season)

    const { data: matches, error: matchesError } = await admin
      .from("matches")
      .select(`id, home_team_id, away_team_id, ${col}, match_insights(match_id)`)
      .eq("gameweek_id", gameweek.id)
    if (matchesError) throw matchesError

    const extByTeam = new Map([...teamIds].map(([ext, id]) => [id, ext]))
    for (const m of (matches ?? []) as unknown as {
      id: number
      home_team_id: number
      away_team_id: number
      match_insights: unknown
      [key: string]: unknown
    }[]) {
      const hasInsights = Array.isArray(m.match_insights) ? m.match_insights.length > 0 : Boolean(m.match_insights)
      const externalId = m[col] as number | null
      const homeRecent = recent.get(m.home_team_id) ?? []
      const awayRecent = recent.get(m.away_team_id) ?? []
      const formFields = {
        home_form: formFromRecent(homeRecent),
        away_form: formFromRecent(awayRecent),
        home_recent: homeRecent,
        away_recent: awayRecent,
      }

      // Form and last-five details refresh on every sync at no extra cost; H2H only when missing.
      if ((hasInsights && !refreshInsights) || externalId === null) {
        if (hasInsights) {
          const { error } = await admin.from("match_insights").update(formFields).eq("match_id", m.id)
          if (error) throw error
        }
        continue
      }

      let h2h
      try {
        h2h = await provider.headToHead(call, {
          externalId,
          homeExt: extByTeam.get(m.home_team_id)!,
          awayExt: extByTeam.get(m.away_team_id)!,
        })
      } catch (e) {
        if (e instanceof ApiBudgetError) throw e
        console.error(e) // keep going; the next sync retries matches without insights
        continue
      }
      const { error } = await admin.from("match_insights").upsert({
        match_id: m.id,
        ...formFields,
        h2h,
        fetched_at: new Date().toISOString(),
      })
      if (error) throw error
    }

    revalidatePath("/", "layout")
    return { ok: true, data: { matches: fixtures.length, requests } }
  } catch (e) {
    return fail(e)
  }
}

export async function setActiveGameweek(gameweekId: number): Promise<ActionResult> {
  await requireAdmin()
  try {
    const admin = createAdminClient()
    const { data: gw, error } = await admin.from("gameweeks").select("season_id").eq("id", gameweekId).single()
    if (error || !gw) return { ok: false, error: "invalid" }

    const { error: clearError } = await admin
      .from("gameweeks")
      .update({ is_active: false })
      .eq("season_id", gw.season_id)
      .eq("is_active", true)
    if (clearError) throw clearError

    const { error: setError } = await admin.from("gameweeks").update({ is_active: true }).eq("id", gameweekId)
    if (setError) throw setError

    revalidatePath("/", "layout")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setProvider(providerId: string): Promise<ActionResult> {
  await requireAdmin()
  if (!(providerId in PROVIDERS)) return { ok: false, error: "invalid" }
  try {
    const { error } = await createAdminClient().from("seasons").update({ provider: providerId }).eq("is_active", true)
    if (error) throw error
    revalidatePath("/admin")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function refreshStandings(): Promise<ActionResult> {
  await requireAdmin()
  try {
    const season = await getActiveSeason()
    await syncStandings(createCall(season.provider), season.provider, season.id, season.api_season)
    revalidatePath("/standings")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

type FetchResultsSummary = {
  checked: number
  updated: number
  scored: number
  requests: number
  needsStats?: number
  skipped?: string
}

/** Runs the same edge function the nightly cron uses, so there is one results code path. */
export async function fetchResults(): Promise<ActionResult<FetchResultsSummary>> {
  await requireAdmin()
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": process.env.CRON_SECRET! },
      body: JSON.stringify({ source: "manual" }),
      cache: "no-store",
    })
    const body = await res.json()
    if (!res.ok) {
      if (body?.error === "API_BUDGET_EXCEEDED") return { ok: false, error: "apiBudget" }
      if (typeof body?.error === "string" && body.error.startsWith("MISSING_API_KEY")) {
        return { ok: false, error: "missingApiKey", detail: body.error.split(":")[1] }
      }
      throw new Error(body?.error ?? `HTTP ${res.status}`)
    }
    revalidatePath("/", "layout")
    return { ok: true, data: body as FetchResultsSummary }
  } catch (e) {
    return fail(e)
  }
}

const count = (max: number) => z.number().int().min(0).max(max)

const statsSchema = z.object({
  matchId: z.number().int().positive(),
  homeYellows: count(20),
  awayYellows: count(20),
  homeCorners: count(30),
  awayCorners: count(30),
})

/**
 * Admin-entered yellow cards + corners (for providers without match statistics).
 * Leaves the score and the automatic results flow untouched, then scores the match.
 */
export async function saveMatchStats(input: z.infer<typeof statsSchema>): Promise<ActionResult<{ scored: number }>> {
  await requireAdmin()
  const parsed = statsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid" }
  const v = parsed.data

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("matches")
      .update({
        home_yellows: v.homeYellows,
        away_yellows: v.awayYellows,
        home_corners: v.homeCorners,
        away_corners: v.awayCorners,
      })
      .eq("id", v.matchId)
    if (error) throw error

    const { data: scored, error: scoreError } = await admin.rpc("score_match", { p_match_id: v.matchId })
    if (scoreError) throw scoreError

    revalidatePath("/", "layout")
    return { ok: true, data: { scored: scored ?? 0 } }
  } catch (e) {
    return fail(e)
  }
}

const overrideSchema = statsSchema.extend({
  status: z.enum(["finished", "postponed", "cancelled"]),
  homeGoals: count(20),
  awayGoals: count(20),
})

/** Full manual result; marks the match overridden so automatic fetches won't touch it. */
export async function overrideResult(input: z.infer<typeof overrideSchema>): Promise<ActionResult<{ scored: number }>> {
  await requireAdmin()
  const parsed = overrideSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid" }
  const v = parsed.data

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("matches")
      .update({
        status: v.status,
        home_goals: v.homeGoals,
        away_goals: v.awayGoals,
        home_yellows: v.homeYellows,
        away_yellows: v.awayYellows,
        home_corners: v.homeCorners,
        away_corners: v.awayCorners,
        is_overridden: true,
        results_fetched_at: new Date().toISOString(),
      })
      .eq("id", v.matchId)
    if (error) throw error

    const { data: scored, error: scoreError } = await admin.rpc("score_match", { p_match_id: v.matchId })
    if (scoreError) throw scoreError

    revalidatePath("/", "layout")
    return { ok: true, data: { scored: scored ?? 0 } }
  } catch (e) {
    return fail(e)
  }
}

/** Hands the match back to the automatic results job. */
export async function clearOverride(matchId: number): Promise<ActionResult> {
  await requireAdmin()
  try {
    const { error } = await createAdminClient().from("matches").update({ is_overridden: false }).eq("id", matchId)
    if (error) throw error
    revalidatePath("/admin")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function rescoreGameweek(gameweekId: number): Promise<ActionResult<{ scored: number }>> {
  await requireAdmin()
  try {
    const admin = createAdminClient()
    const { data: matches, error } = await admin.from("matches").select("id").eq("gameweek_id", gameweekId)
    if (error) throw error

    let scored = 0
    for (const m of matches ?? []) {
      const { data, error: scoreError } = await admin.rpc("score_match", { p_match_id: m.id })
      if (scoreError) throw scoreError
      scored += data ?? 0
    }
    revalidatePath("/", "layout")
    return { ok: true, data: { scored } }
  } catch (e) {
    return fail(e)
  }
}
