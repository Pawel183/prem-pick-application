// Generated from Supabase (MCP generate_typescript_types). Regenerate after schema changes.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      api_requests: {
        Row: {
          called_at: string
          endpoint: string
          error: string | null
          id: number
          params: Json
          remaining: number | null
          source: string
          status_code: number | null
        }
        Insert: {
          called_at?: string
          endpoint: string
          error?: string | null
          id?: never
          params?: Json
          remaining?: number | null
          source?: string
          status_code?: number | null
        }
        Update: {
          called_at?: string
          endpoint?: string
          error?: string | null
          id?: never
          params?: Json
          remaining?: number | null
          source?: string
          status_code?: number | null
        }
        Relationships: []
      }
      gameweeks: {
        Row: {
          api_round: string
          id: number
          is_active: boolean
          number: number
          season_id: number
          synced_at: string | null
        }
        Insert: {
          api_round: string
          id?: never
          is_active?: boolean
          number: number
          season_id: number
          synced_at?: string | null
        }
        Update: {
          api_round?: string
          id?: never
          is_active?: boolean
          number?: number
          season_id?: number
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gameweeks_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          joined_at: string
          league_id: number
          user_id: string
        }
        Insert: {
          joined_at?: string
          league_id: number
          user_id: string
        }
        Update: {
          joined_at?: string
          league_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          invite_code: string
          is_global: boolean
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          invite_code: string
          is_global?: boolean
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          invite_code?: string
          is_global?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leagues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_insights: {
        Row: {
          away_form: string | null
          away_recent: Json
          fetched_at: string
          h2h: Json
          home_form: string | null
          home_recent: Json
          match_id: number
        }
        Insert: {
          away_form?: string | null
          away_recent?: Json
          fetched_at?: string
          h2h?: Json
          home_form?: string | null
          home_recent?: Json
          match_id: number
        }
        Update: {
          away_form?: string | null
          away_recent?: Json
          fetched_at?: string
          h2h?: Json
          home_form?: string | null
          home_recent?: Json
          match_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_insights_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_corners: number | null
          away_goals: number | null
          away_team_id: number
          away_yellows: number | null
          ext_api_football: number | null
          ext_football_data: number | null
          gameweek_id: number
          home_corners: number | null
          home_goals: number | null
          home_team_id: number
          home_yellows: number | null
          id: number
          is_overridden: boolean
          kickoff_at: string
          results_fetched_at: string | null
          scored_at: string | null
          status: string
          total_corners: number | null
          total_yellows: number | null
        }
        Insert: {
          away_corners?: number | null
          away_goals?: number | null
          away_team_id: number
          away_yellows?: number | null
          ext_api_football?: number | null
          ext_football_data?: number | null
          gameweek_id: number
          home_corners?: number | null
          home_goals?: number | null
          home_team_id: number
          home_yellows?: number | null
          id?: never
          is_overridden?: boolean
          kickoff_at: string
          results_fetched_at?: string | null
          scored_at?: string | null
          status?: string
          total_corners?: number | null
          total_yellows?: number | null
        }
        Update: {
          away_corners?: number | null
          away_goals?: number | null
          away_team_id?: number
          away_yellows?: number | null
          ext_api_football?: number | null
          ext_football_data?: number | null
          gameweek_id?: number
          home_corners?: number | null
          home_goals?: number | null
          home_team_id?: number
          home_yellows?: number | null
          id?: never
          is_overridden?: boolean
          kickoff_at?: string
          results_fetched_at?: string | null
          scored_at?: string | null
          status?: string
          total_corners?: number | null
          total_yellows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_gameweek_id_fkey"
            columns: ["gameweek_id"]
            isOneToOne: false
            referencedRelation: "gameweeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_scores: {
        Row: {
          cards_pts: number
          corners_pts: number
          gameweek_id: number
          goals_pts: number
          match_id: number
          prediction_id: number
          result_pts: number
          scored_at: string
          total_pts: number | null
          user_id: string
        }
        Insert: {
          cards_pts: number
          corners_pts: number
          gameweek_id: number
          goals_pts: number
          match_id: number
          prediction_id: number
          result_pts: number
          scored_at?: string
          total_pts?: number | null
          user_id: string
        }
        Update: {
          cards_pts?: number
          corners_pts?: number
          gameweek_id?: number
          goals_pts?: number
          match_id?: number
          prediction_id?: number
          result_pts?: number
          scored_at?: string
          total_pts?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_scores_gameweek_id_fkey"
            columns: ["gameweek_id"]
            isOneToOne: false
            referencedRelation: "gameweeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_scores_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_scores_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: true
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          away_goals: number
          cards_exact: number | null
          cards_mode: string
          cards_range: string | null
          corners_exact: number | null
          corners_mode: string
          corners_range: string | null
          created_at: string
          goals_mode: string
          home_goals: number
          id: number
          match_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          away_goals: number
          cards_exact?: number | null
          cards_mode: string
          cards_range?: string | null
          corners_exact?: number | null
          corners_mode: string
          corners_range?: string | null
          created_at?: string
          goals_mode: string
          home_goals: number
          id?: never
          match_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          away_goals?: number
          cards_exact?: number | null
          cards_mode?: string
          cards_range?: string | null
          corners_exact?: number | null
          corners_mode?: string
          corners_range?: string | null
          created_at?: string
          goals_mode?: string
          home_goals?: number
          id?: never
          match_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          locale: string
          role: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          locale?: string
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          role?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          api_season: number
          end_date: string
          id: number
          is_active: boolean
          name: string
          provider: string
          start_date: string
        }
        Insert: {
          api_season: number
          end_date: string
          id?: never
          is_active?: boolean
          name: string
          provider?: string
          start_date: string
        }
        Update: {
          api_season?: number
          end_date?: string
          id?: never
          is_active?: boolean
          name?: string
          provider?: string
          start_date?: string
        }
        Relationships: []
      }
      standings: {
        Row: {
          drawn: number
          form: string | null
          goal_diff: number
          goals_against: number
          goals_for: number
          lost: number
          played: number
          points: number
          rank: number
          recent: Json
          season_id: number
          team_id: number
          updated_at: string
          won: number
        }
        Insert: {
          drawn: number
          form?: string | null
          goal_diff: number
          goals_against: number
          goals_for: number
          lost: number
          played: number
          points: number
          rank: number
          recent?: Json
          season_id: number
          team_id: number
          updated_at?: string
          won: number
        }
        Update: {
          drawn?: number
          form?: string | null
          goal_diff?: number
          goals_against?: number
          goals_for?: number
          lost?: number
          played?: number
          points?: number
          rank?: number
          recent?: Json
          season_id?: number
          team_id?: number
          updated_at?: string
          won?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          ext_api_football: number | null
          ext_football_data: number | null
          id: number
          logo_url: string | null
          name: string
        }
        Insert: {
          ext_api_football?: number | null
          ext_football_data?: number | null
          id?: never
          logo_url?: string | null
          name: string
        }
        Update: {
          ext_api_football?: number | null
          ext_football_data?: number | null
          id?: never
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bucket: { Args: { kind: string; n: number }; Returns: string }
      create_league: {
        Args: { p_name: string }
        Returns: {
          id: number
          invite_code: string
        }[]
      }
      gen_invite_code: { Args: never; Returns: string }
      get_leaderboard: {
        Args: { p_gameweek_id?: number; p_league_id: number }
        Returns: {
          display_name: string
          exact_hits: number
          points: number
          rank: number
          results_correct: number
          scored: number
          user_id: string
        }[]
      }
      invoke_fetch_results: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_league_member: { Args: { p_league_id: number }; Returns: boolean }
      join_league: {
        Args: { p_code: string }
        Returns: {
          already_member: boolean
          id: number
          name: string
        }[]
      }
      leave_league: { Args: { p_league_id: number }; Returns: undefined }
      score_match: { Args: { p_match_id: number }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
