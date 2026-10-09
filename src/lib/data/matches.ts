import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { MatchView } from "@/lib/types"
import type { H2HEntry, RecentMatch } from "@football/providers"

export const MATCH_SELECT = `
  id, kickoff_at, status, home_goals, away_goals, home_yellows, away_yellows, home_corners, away_corners,
  total_yellows, total_corners, is_overridden,
  home:teams!matches_home_team_id_fkey(id, name, logo_url),
  away:teams!matches_away_team_id_fkey(id, name, logo_url),
  match_insights(home_form, away_form, home_recent, away_recent, h2h)
` as const

export async function getActiveGameweek() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("gameweeks")
    .select("id, number, seasons!inner(is_active)")
    .eq("is_active", true)
    .eq("seasons.is_active", true)
    .maybeSingle()
  return data ? { id: data.id, number: data.number } : null
}

export async function getSeasonGameweeks() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("gameweeks")
    .select("id, number, is_active, synced_at, seasons!inner(is_active)")
    .eq("seasons.is_active", true)
    .order("number")
  return (data ?? []).map(({ id, number, is_active, synced_at }) => ({ id, number, is_active, synced_at }))
}

type MatchRow = Omit<MatchView, "insights" | "status"> & {
  status: string
  is_overridden: boolean
  match_insights: { home_form: string | null; away_form: string | null; home_recent: unknown; away_recent: unknown; h2h: unknown } | null
}

export function toMatchView(row: MatchRow): MatchView & { is_overridden: boolean } {
  const { match_insights, ...rest } = row
  return {
    ...rest,
    status: row.status as MatchView["status"],
    insights: match_insights
      ? {
          home_form: match_insights.home_form,
          away_form: match_insights.away_form,
          home_recent: (match_insights.home_recent ?? []) as RecentMatch[],
          away_recent: (match_insights.away_recent ?? []) as RecentMatch[],
          h2h: (match_insights.h2h ?? []) as H2HEntry[],
        }
      : null,
  }
}

export async function getGameweekMatches(gameweekId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("gameweek_id", gameweekId)
    .order("kickoff_at")
    .order("id")
  if (error) throw error
  return (data as unknown as MatchRow[]).map(toMatchView)
}
