"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { setLocaleCookie } from "@/i18n/locale-cookie"
import { isLocale } from "@/i18n/config"
import type { ActionResult } from "@/lib/action-result"

/** Works signed in (persists to profile) and signed out (cookie only). */
export async function setLocale(locale: string): Promise<ActionResult> {
  if (!isLocale(locale)) return { ok: false, error: "invalid" }
  await setLocaleCookie(locale)

  const user = await getCurrentUser()
  if (user) {
    const supabase = await createClient()
    const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id)
    if (error) return { ok: false, error: "unknown" }
  }
  revalidatePath("/", "layout")
  return { ok: true }
}

const displayNameSchema = z.string().trim().min(2).max(30)

export async function updateDisplayName(name: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthenticated" }
  const parsed = displayNameSchema.safeParse(name)
  if (!parsed.success) return { ok: false, error: "displayNameInvalid" }

  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data }).eq("id", user.id)
  if (error) return { ok: false, error: "unknown" }
  revalidatePath("/", "layout")
  return { ok: true }
}
