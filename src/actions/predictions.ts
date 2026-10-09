"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { CARDS_RANGES, CORNERS_RANGES } from "@/lib/scoring/ranges"
import type { ActionResult } from "@/lib/action-result"

const goals = z.number().int().min(0).max(20)

const predictionSchema = z
  .object({
    matchId: z.number().int().positive(),
    homeGoals: goals,
    awayGoals: goals,
    goalsMode: z.enum(["range", "exact"]),
    cardsMode: z.enum(["range", "exact"]),
    cardsRange: z.enum(CARDS_RANGES).nullable(),
    cardsExact: z.number().int().min(0).max(30).nullable(),
    cornersMode: z.enum(["range", "exact"]),
    cornersRange: z.enum(CORNERS_RANGES).nullable(),
    cornersExact: z.number().int().min(0).max(40).nullable(),
  })
  .refine((v) => (v.cardsMode === "range" ? v.cardsRange !== null : v.cardsExact !== null))
  .refine((v) => (v.cornersMode === "range" ? v.cornersRange !== null : v.cornersExact !== null))

export type PredictionInput = z.infer<typeof predictionSchema>

export async function savePrediction(input: PredictionInput): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthenticated" }

  const parsed = predictionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "predictionIncomplete" }
  const v = parsed.data

  const values = {
    home_goals: v.homeGoals,
    away_goals: v.awayGoals,
    goals_mode: v.goalsMode,
    cards_mode: v.cardsMode,
    cards_range: v.cardsMode === "range" ? v.cardsRange : null,
    cards_exact: v.cardsMode === "exact" ? v.cardsExact : null,
    corners_mode: v.cornersMode,
    corners_range: v.cornersMode === "range" ? v.cornersRange : null,
    corners_exact: v.cornersMode === "exact" ? v.cornersExact : null,
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", user.id)
    .eq("match_id", v.matchId)
    .maybeSingle()

  // Insert/update separately: users only hold UPDATE on the pick columns, so upsert is not allowed.
  const { error } = existing
    ? await supabase.from("predictions").update(values).eq("id", existing.id)
    : await supabase.from("predictions").insert({ ...values, user_id: user.id, match_id: v.matchId })

  if (error) {
    const locked = error.message.includes("PREDICTION_LOCKED") || error.code === "42501"
    return { ok: false, error: locked ? "predictionLocked" : "unknown" }
  }

  revalidatePath("/")
  return { ok: true }
}
