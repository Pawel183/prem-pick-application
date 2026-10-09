import type { H2HEntry, RecentMatch } from "@football/providers"

export type Team = { id: number; name: string; logo_url: string | null }

export type MatchView = {
  id: number
  kickoff_at: string
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled"
  home_goals: number | null
  away_goals: number | null
  home_yellows: number | null
  away_yellows: number | null
  home_corners: number | null
  away_corners: number | null
  total_yellows: number | null
  total_corners: number | null
  home: Team
  away: Team
  insights: {
    home_form: string | null
    away_form: string | null
    home_recent: RecentMatch[]
    away_recent: RecentMatch[]
    h2h: H2HEntry[]
  } | null
}

export type PredictionView = {
  id: number
  match_id: number
  user_id: string
  home_goals: number
  away_goals: number
  goals_mode: "range" | "exact"
  cards_mode: "range" | "exact"
  cards_range: string | null
  cards_exact: number | null
  corners_mode: "range" | "exact"
  corners_range: string | null
  corners_exact: number | null
}

export type ScoreView = {
  result_pts: number
  goals_pts: number
  cards_pts: number
  corners_pts: number
  total_pts: number | null
}

export type OtherPick = PredictionView & { display_name: string; score: ScoreView | null }
