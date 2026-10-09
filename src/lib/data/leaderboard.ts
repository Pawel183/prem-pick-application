import "server-only"
import { createClient } from "@/lib/supabase/server"

export type LeaderboardRow = {
  rank: number
  user_id: string
  display_name: string
  points: number
  scored: number
  exact_hits: number
  results_correct: number
}

/** League ranking for the active season, or for one gameweek when gameweekId is given. */
export async function getLeaderboard(leagueId: number, gameweekId?: number): Promise<LeaderboardRow[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_leaderboard", {
    p_league_id: leagueId,
    ...(gameweekId ? { p_gameweek_id: gameweekId } : {}),
  })
  return data ?? []
}
