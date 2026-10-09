"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/action-result"

export async function createLeague(name: string): Promise<ActionResult<{ id: number; inviteCode: string }>> {
  if (!(await getCurrentUser())) return { ok: false, error: "unauthenticated" }
  const parsed = z.string().trim().min(2).max(40).safeParse(name)
  if (!parsed.success) return { ok: false, error: "leagueNameInvalid" }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_league", { p_name: parsed.data })
  if (error || !data?.[0]) return { ok: false, error: "unknown" }

  revalidatePath("/leaderboard")
  return { ok: true, data: { id: data[0].id, inviteCode: data[0].invite_code } }
}

export async function joinLeague(
  code: string
): Promise<ActionResult<{ id: number; name: string; alreadyMember: boolean }>> {
  if (!(await getCurrentUser())) return { ok: false, error: "unauthenticated" }
  const parsed = z.string().trim().min(4).max(16).safeParse(code)
  if (!parsed.success) return { ok: false, error: "leagueNotFound" }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("join_league", { p_code: parsed.data })
  if (error) return { ok: false, error: error.message.includes("LEAGUE_NOT_FOUND") ? "leagueNotFound" : "unknown" }
  const row = data?.[0]
  if (!row) return { ok: false, error: "unknown" }

  revalidatePath("/leaderboard")
  return { ok: true, data: { id: row.id, name: row.name, alreadyMember: row.already_member } }
}

export async function leaveLeague(leagueId: number): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "unauthenticated" }
  const supabase = await createClient()
  const { error } = await supabase.rpc("leave_league", { p_league_id: leagueId })
  if (error) return { ok: false, error: error.message.includes("CANNOT_LEAVE_GLOBAL") ? "cannotLeaveGlobal" : "unknown" }

  revalidatePath("/leaderboard")
  return { ok: true }
}
