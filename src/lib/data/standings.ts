import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { RecentMatch } from "@football/providers"

export type StandingRow = {
  rank: number
  played: number
  won: number
  drawn: number
  lost: number
  goal_diff: number
  points: number
  form: string | null
  recent: RecentMatch[]
  updated_at: string
  teams: { name: string; logo_url: string | null }
}

export async function getStandings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("standings")
    .select("rank, played, won, drawn, lost, goal_diff, points, form, recent, updated_at, teams(name, logo_url), seasons!inner(is_active)")
    .eq("seasons.is_active", true)
    .order("rank")
  return (data ?? []) as unknown as StandingRow[]
}
