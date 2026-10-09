import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { OtherPick, PredictionView, ScoreView } from "@/lib/types"

const PREDICTION_COLUMNS =
  "id, match_id, user_id, home_goals, away_goals, goals_mode, cards_mode, cards_range, cards_exact, corners_mode, corners_range, corners_exact"
const SCORE_COLUMNS = "result_pts, goals_pts, cards_pts, corners_pts, total_pts"

type Row = PredictionView & {
  prediction_scores: ScoreView | null
  profiles: { display_name: string } | null
}

/**
 * All predictions visible to the user for these matches: their own always, others' after kickoff (RLS).
 */
export async function getPredictionsForMatches(matchIds: number[]) {
  if (matchIds.length === 0) return [] as OtherPick[]
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("predictions")
    .select(`${PREDICTION_COLUMNS}, prediction_scores(${SCORE_COLUMNS}), profiles(display_name)`)
    .in("match_id", matchIds)
  if (error) throw error

  return (data as unknown as Row[]).map(({ prediction_scores, profiles, ...p }) => ({
    ...p,
    display_name: profiles?.display_name ?? "?",
    score: prediction_scores,
  }))
}
