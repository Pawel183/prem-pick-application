// Shared by the UI and server-side validation. Mirrors public.bucket() in SQL.
export const GOALS_RANGES = ["0-1", "2-3", "4-5", "6+"] as const
export const CARDS_RANGES = ["0-1", "2-3", "4-5", "6+"] as const
export const CORNERS_RANGES = ["0-4", "5-7", "8-10", "11+"] as const

export type PickMode = "range" | "exact"
export type StatKind = "goals" | "cards" | "corners"

export const RANGES: Record<StatKind, readonly string[]> = {
  goals: GOALS_RANGES,
  cards: CARDS_RANGES,
  corners: CORNERS_RANGES,
}

export const POINTS = { result: 3, range: 1, exact: 3, maxPerMatch: 12 } as const

export function bucket(kind: StatKind, n: number): string {
  if (kind === "corners") {
    if (n <= 4) return "0-4"
    if (n <= 7) return "5-7"
    if (n <= 10) return "8-10"
    return "11+"
  }
  if (n <= 1) return "0-1"
  if (n <= 3) return "2-3"
  if (n <= 5) return "4-5"
  return "6+"
}

export function outcome(home: number, away: number): "H" | "D" | "A" {
  return home > away ? "H" : home < away ? "A" : "D"
}
