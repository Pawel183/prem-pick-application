// Football data provider adapters, shared by the Next.js app and the fetch-results edge function.
// Keep this file dependency-free (plain TypeScript + fetch) so it runs in both Node and Deno.
// Each adapter turns provider responses into the normalized shapes below; HTTP, logging,
// throttling and budget checks are done by the runtime-specific caller passed in as `call`.

export type ProviderId = "football-data" | "api-football"
export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled"

/** Performs one request against the provider and returns the parsed JSON body (throws on error). */
export type Call = (endpoint: string, params?: Record<string, string | number>) => Promise<any>

export type NTeam = { externalId: number; name: string; logo: string | null }

export type NFixture = {
  externalId: number
  kickoffAt: string
  status: MatchStatus
  home: NTeam
  away: NTeam
  homeGoals: number | null
  awayGoals: number | null
}

export type NStanding = {
  team: NTeam
  rank: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  /** Last results, oldest first, newest last, e.g. "WWDLW". */
  form: string | null
  /** Details behind `form` (same order); filled in from `Provider.recent`. */
  recent?: RecentMatch[]
}

export type H2HEntry = { date: string; home: string; away: string; home_goals: number; away_goals: number }

/** One of a team's recent results, from that team's point of view. */
export type RecentMatch = {
  date: string
  opponent: string
  opponent_logo: string | null
  venue: "H" | "A"
  goals_for: number
  goals_against: number
  result: "W" | "D" | "L"
}

export type NStats = { homeYellows: number; awayYellows: number; homeCorners: number; awayCorners: number }

export type Provider = {
  id: ProviderId
  /** Column in teams/matches holding this provider's ids. */
  extColumn: "ext_football_data" | "ext_api_football"
  baseUrl: string
  envKey: string
  authHeaders(key: string): Record<string, string>
  /** Extracts an error message from a response, or null when it succeeded. */
  parseError(status: number, body: any): string | null
  dailyLimit: number | null
  perMinute: number
  /** Whether the provider supplies yellow cards and corners (otherwise the admin enters them). */
  hasMatchStats: boolean
  gameweekFixtures(call: Call, season: number, gameweek: number): Promise<NFixture[]>
  fixturesBetween(call: Call, season: number, from: string, to: string): Promise<NFixture[]>
  standings(call: Call, season: number): Promise<NStanding[]>
  /** Team external id -> last five results with opponents and scores, oldest first (1 request). */
  recent(call: Call, season: number): Promise<Map<number, RecentMatch[]>>
  headToHead(call: Call, fixture: { externalId: number; homeExt: number; awayExt: number }): Promise<H2HEntry[]>
  matchStats(call: Call, fixture: { externalId: number; homeExt: number; awayExt: number }): Promise<NStats | null>
}

const PREMIER_LEAGUE = { footballData: "PL", apiFootball: 39 }

type FinishedMatch = { date: string; home: NTeam; away: NTeam; homeGoals: number; awayGoals: number }

/** Builds each team's last five results from a season's finished matches. */
function buildRecent(matches: FinishedMatch[]): Map<number, RecentMatch[]> {
  const byTeam = new Map<number, RecentMatch[]>()
  const push = (team: NTeam, opponent: NTeam, venue: "H" | "A", gf: number, ga: number, date: string) =>
    byTeam.set(team.externalId, [
      ...(byTeam.get(team.externalId) ?? []),
      {
        date,
        opponent: opponent.name,
        opponent_logo: opponent.logo,
        venue,
        goals_for: gf,
        goals_against: ga,
        result: gf > ga ? "W" : gf < ga ? "L" : "D",
      },
    ])
  for (const m of matches) {
    push(m.home, m.away, "H", m.homeGoals, m.awayGoals, m.date)
    push(m.away, m.home, "A", m.awayGoals, m.homeGoals, m.date)
  }
  for (const [id, list] of byTeam) byTeam.set(id, list.sort((a, b) => a.date.localeCompare(b.date)).slice(-5))
  return byTeam
}

export function formFromRecent(recent: RecentMatch[] | undefined): string | null {
  return recent && recent.length > 0 ? recent.map((r) => r.result).join("") : null
}

function lastFinished(entries: (H2HEntry & { finished: boolean })[]): H2HEntry[] {
  return entries
    .filter((e) => e.finished)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map(({ finished: _finished, ...e }) => e)
}

// ---------------------------------------------------------------------------------------------
// football-data.org v4 — https://www.football-data.org/documentation/quickstart
// Free tier: current season of the top competitions, 10 requests/minute, no card/corner stats.

function fdStatus(status: string): MatchStatus {
  if (status === "FINISHED" || status === "AWARDED") return "finished"
  if (status === "POSTPONED" || status === "SUSPENDED") return "postponed"
  if (status === "CANCELLED") return "cancelled"
  if (status === "SCHEDULED" || status === "TIMED") return "scheduled"
  return "live"
}

function fdTeam(t: any): NTeam {
  return { externalId: t.id, name: t.shortName ?? t.name, logo: t.crest ?? null }
}

function fdFixture(m: any): NFixture {
  return {
    externalId: m.id,
    kickoffAt: m.utcDate,
    status: fdStatus(m.status),
    home: fdTeam(m.homeTeam),
    away: fdTeam(m.awayTeam),
    homeGoals: m.score?.fullTime?.home ?? null,
    awayGoals: m.score?.fullTime?.away ?? null,
  }
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const footballData: Provider = {
  id: "football-data",
  extColumn: "ext_football_data",
  baseUrl: "https://api.football-data.org/v4",
  envKey: "FOOTBALL_DATA_API_KEY",
  authHeaders: (key) => ({ "X-Auth-Token": key }),
  parseError: (status, body) => (status >= 400 ? (body?.message ?? `HTTP ${status}`) : null),
  dailyLimit: null,
  perMinute: 9,
  hasMatchStats: false,

  async gameweekFixtures(call, season, gameweek) {
    const body = await call(`competitions/${PREMIER_LEAGUE.footballData}/matches`, { season, matchday: gameweek })
    return (body.matches ?? []).map(fdFixture)
  },

  async fixturesBetween(call, season, from, to) {
    // dateTo is treated as exclusive by the API, so widen by one day.
    const body = await call(`competitions/${PREMIER_LEAGUE.footballData}/matches`, {
      season,
      dateFrom: from,
      dateTo: addDays(to, 1),
    })
    return (body.matches ?? []).map(fdFixture)
  },

  async standings(call, season) {
    const body = await call(`competitions/${PREMIER_LEAGUE.footballData}/standings`, { season })
    const table = (body.standings ?? []).find((s: any) => s.type === "TOTAL")?.table ?? []
    return table.map((r: any) => ({
      team: fdTeam(r.team),
      rank: r.position,
      played: r.playedGames,
      won: r.won,
      drawn: r.draw,
      lost: r.lost,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      goalDiff: r.goalDifference,
      points: r.points,
      // football-data lists form newest first, comma separated ("W,D,L").
      form: r.form ? r.form.split(",").reverse().join("") : null,
    }))
  },

  async recent(call, season) {
    const body = await call(`competitions/${PREMIER_LEAGUE.footballData}/matches`, { season, status: "FINISHED" })
    return buildRecent(
      (body.matches ?? [])
        .filter((m: any) => m.score?.fullTime?.home != null && m.score?.fullTime?.away != null)
        .map((m: any) => ({
          date: m.utcDate,
          home: fdTeam(m.homeTeam),
          away: fdTeam(m.awayTeam),
          homeGoals: m.score.fullTime.home,
          awayGoals: m.score.fullTime.away,
        }))
    )
  },

  async headToHead(call, fixture) {
    const body = await call(`matches/${fixture.externalId}/head2head`, { limit: 10 })
    return lastFinished(
      (body.matches ?? [])
        .filter((m: any) => m.id !== fixture.externalId)
        .map((m: any) => ({
          date: m.utcDate,
          home: m.homeTeam.shortName ?? m.homeTeam.name,
          away: m.awayTeam.shortName ?? m.awayTeam.name,
          home_goals: m.score?.fullTime?.home,
          away_goals: m.score?.fullTime?.away,
          finished: fdStatus(m.status) === "finished" && m.score?.fullTime?.home != null,
        }))
    )
  },

  async matchStats() {
    return null
  },
}

// ---------------------------------------------------------------------------------------------
// API-Football v3 — https://www.api-football.com/documentation-v3
// Free plan: seasons 2022–2024 only, 100 requests/day, ~10/minute. Paid plans cover the current season.

function afStatus(short: string): MatchStatus {
  if (["FT", "AET", "PEN"].includes(short)) return "finished"
  if (short === "PST") return "postponed"
  if (["CANC", "ABD", "AWD", "WO"].includes(short)) return "cancelled"
  if (["TBD", "NS"].includes(short)) return "scheduled"
  return "live"
}

function afTeam(t: any): NTeam {
  return { externalId: t.id, name: t.name, logo: t.logo ?? null }
}

function afFixture(f: any): NFixture {
  return {
    externalId: f.fixture.id,
    kickoffAt: f.fixture.date,
    status: afStatus(f.fixture.status.short),
    home: afTeam(f.teams.home),
    away: afTeam(f.teams.away),
    homeGoals: f.goals.home,
    awayGoals: f.goals.away,
  }
}

function afStat(entry: any, type: string): number | null {
  const stat = entry?.statistics?.find((s: any) => s.type === type)
  if (!stat) return null
  return stat.value === null ? 0 : Number(stat.value) // null means zero
}

export const apiFootball: Provider = {
  id: "api-football",
  extColumn: "ext_api_football",
  baseUrl: "https://v3.football.api-sports.io",
  envKey: "API_FOOTBALL_API_KEY",
  authHeaders: (key) => ({ "x-apisports-key": key }),
  parseError(status, body) {
    const errors = body?.errors
    const has = Array.isArray(errors) ? errors.length > 0 : errors && Object.keys(errors).length > 0
    if (has) return JSON.stringify(errors)
    return status >= 400 ? `HTTP ${status}` : null
  },
  dailyLimit: 100,
  perMinute: 9,
  hasMatchStats: true,

  async gameweekFixtures(call, season, gameweek) {
    const body = await call("fixtures", {
      league: PREMIER_LEAGUE.apiFootball,
      season,
      round: `Regular Season - ${gameweek}`,
    })
    return (body.response ?? []).map(afFixture)
  },

  async fixturesBetween(call, season, from, to) {
    const body = await call("fixtures", { league: PREMIER_LEAGUE.apiFootball, season, from, to, timezone: "UTC" })
    return (body.response ?? []).map(afFixture)
  },

  async standings(call, season) {
    const body = await call("standings", { league: PREMIER_LEAGUE.apiFootball, season })
    const rows = body.response?.[0]?.league?.standings?.[0] ?? []
    return rows.map((r: any) => ({
      team: afTeam(r.team),
      rank: r.rank,
      played: r.all.played,
      won: r.all.win,
      drawn: r.all.draw,
      lost: r.all.lose,
      goalsFor: r.all.goals.for,
      goalsAgainst: r.all.goals.against,
      goalDiff: r.goalsDiff,
      points: r.points,
      form: r.form ?? null,
    }))
  },

  async recent(call, season) {
    const body = await call("fixtures", { league: PREMIER_LEAGUE.apiFootball, season, status: "FT-AET-PEN" })
    return buildRecent(
      (body.response ?? [])
        .filter((f: any) => f.goals.home !== null && f.goals.away !== null)
        .map((f: any) => ({
          date: f.fixture.date,
          home: afTeam(f.teams.home),
          away: afTeam(f.teams.away),
          homeGoals: f.goals.home,
          awayGoals: f.goals.away,
        }))
    )
  },

  async headToHead(call, fixture) {
    const body = await call("fixtures/headtohead", { h2h: `${fixture.homeExt}-${fixture.awayExt}` })
    return lastFinished(
      (body.response ?? []).map((f: any) => ({
        date: f.fixture.date,
        home: f.teams.home.name,
        away: f.teams.away.name,
        home_goals: f.goals.home,
        away_goals: f.goals.away,
        finished: afStatus(f.fixture.status.short) === "finished" && f.goals.home !== null,
      }))
    )
  },

  async matchStats(call, fixture) {
    const body = await call("fixtures/statistics", { fixture: fixture.externalId })
    const stats = body.response ?? []
    const home = stats.find((s: any) => s.team.id === fixture.homeExt)
    const away = stats.find((s: any) => s.team.id === fixture.awayExt)
    if (!home || !away) return null
    const values = [
      afStat(home, "Yellow Cards"),
      afStat(away, "Yellow Cards"),
      afStat(home, "Corner Kicks"),
      afStat(away, "Corner Kicks"),
    ]
    if (values.some((v) => v === null)) return null
    const [homeYellows, awayYellows, homeCorners, awayCorners] = values as number[]
    return { homeYellows, awayYellows, homeCorners, awayCorners }
  },
}

export const PROVIDERS: Record<ProviderId, Provider> = {
  "football-data": footballData,
  "api-football": apiFootball,
}

export function getProvider(id: string): Provider {
  const provider = PROVIDERS[id as ProviderId]
  if (!provider) throw new Error(`Unknown football provider: ${id}`)
  return provider
}

// ---------------------------------------------------------------------------------------------
// Team-name matching, used to re-link existing rows when switching providers mid-season
// (e.g. football-data "Man United" vs API-Football "Manchester United").

const ALIASES: Record<string, string> = {
  manutd: "manchesterunited",
  manunited: "manchesterunited",
  mancity: "manchestercity",
  spurs: "tottenham",
  tottenhamhotspur: "tottenham",
  wolverhampton: "wolves",
  wolverhamptonwanderers: "wolves",
  brightonhove: "brighton",
  brightonhovealbion: "brighton",
  nottingham: "nottinghamforest",
  nottmforest: "nottinghamforest",
  westhamunited: "westham",
  newcastleunited: "newcastle",
  leedsunited: "leeds",
  leicestercity: "leicester",
  ipswichtown: "ipswich",
  lutontown: "luton",
  sheffieldutd: "sheffieldunited",
  afcbournemouth: "bournemouth",
  bournemouthafc: "bournemouth",
}

export function normalizeTeamName(name: string): string {
  const key = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " ")
    .replace(/\b(fc|afc|cf)\b/g, " ")
    .replace(/[^a-z]/g, "")
  return ALIASES[key] ?? key
}

// ---------------------------------------------------------------------------------------------
// Persistence helpers. `db` is a service-role supabase-js client (typed loosely to keep this
// file dependency-free; it is the same client API in Node and Deno).

/** Maps provider team ids to internal team ids, re-linking by name or inserting new teams. */
export async function resolveTeams(db: any, provider: Provider, teams: NTeam[]): Promise<Map<number, number>> {
  const col = provider.extColumn
  const unique = [...new Map(teams.map((t) => [t.externalId, t])).values()]
  const result = new Map<number, number>()
  if (unique.length === 0) return result

  const { data: linked, error } = await db
    .from("teams")
    .select(`id, logo_url, ${col}`)
    .in(col, unique.map((t) => t.externalId))
  if (error) throw error
  for (const row of linked ?? []) result.set(row[col], row.id)

  const missing = unique.filter((t) => !result.has(t.externalId))
  if (missing.length === 0) return result

  const { data: unlinked, error: unlinkedError } = await db.from("teams").select("id, name, logo_url").is(col, null)
  if (unlinkedError) throw unlinkedError
  const byName = new Map<string, { id: number; logo_url: string | null }>(
    (unlinked ?? []).map((t: any) => [normalizeTeamName(t.name), t])
  )

  for (const team of missing) {
    const match = byName.get(normalizeTeamName(team.name))
    if (match) {
      const { error: linkError } = await db
        .from("teams")
        .update({ [col]: team.externalId, ...(match.logo_url ? {} : { logo_url: team.logo }) })
        .eq("id", match.id)
      if (linkError) throw linkError
      result.set(team.externalId, match.id)
    } else {
      const { data: inserted, error: insertError } = await db
        .from("teams")
        .insert({ name: team.name, logo_url: team.logo, [col]: team.externalId })
        .select("id")
        .single()
      if (insertError) throw insertError
      result.set(team.externalId, inserted.id)
    }
  }
  return result
}

/** Replaces the season's table. Returns provider team id -> internal team id. */
export async function saveStandings(db: any, provider: Provider, seasonId: number, standings: NStanding[]) {
  const teamIds = await resolveTeams(db, provider, standings.map((s) => s.team))
  if (standings.length === 0) return teamIds
  const now = new Date().toISOString()
  const { error } = await db.from("standings").upsert(
    standings.map((s) => ({
      season_id: seasonId,
      team_id: teamIds.get(s.team.externalId),
      rank: s.rank,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goals_for: s.goalsFor,
      goals_against: s.goalsAgainst,
      goal_diff: s.goalDiff,
      points: s.points,
      form: s.form,
      recent: s.recent ?? [],
      updated_at: now,
    }))
  )
  if (error) throw error
  return teamIds
}
