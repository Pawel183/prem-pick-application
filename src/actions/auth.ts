"use server"

import { redirect } from "next/navigation"
import { getLocale } from "next-intl/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { setLocaleCookie } from "@/i18n/locale-cookie"
import { isLocale } from "@/i18n/config"

export type AuthFormState = { error?: string; fields?: Record<string, string> }

/** Maps Supabase Auth error codes to translated messages (auth.errors.*). */
function authError(code: string | undefined, fallback: string) {
  switch (code) {
    case "email_provider_disabled":
    case "signup_disabled":
      return "providerDisabled"
    case "email_not_confirmed":
      return "emailNotConfirmed"
    case "user_already_exists":
    case "email_exists":
      return "emailTaken"
    case "weak_password":
      return "passwordTooShort"
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimited"
    default:
      return fallback
  }
}

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : ""
  return value.startsWith("/") && !value.startsWith("//") ? value : "/"
}

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export async function login(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") })
  const fields = { email: String(formData.get("email") ?? "") }
  if (!parsed.success) return { error: "invalidCredentials", fields }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || !data.user) return { error: authError(error?.code, "invalidCredentials"), fields }

  const { data: profile } = await supabase.from("profiles").select("locale").eq("id", data.user.id).single()
  if (isLocale(profile?.locale)) await setLocaleCookie(profile.locale)

  redirect(safeNext(formData.get("next")))
}

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(30),
  email: z.email(),
  password: z.string().min(8),
})

export async function register(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = {
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
  }
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0]
    return { error: field === "password" ? "passwordTooShort" : field === "displayName" ? "displayNameInvalid" : "emailInvalid", fields }
  }

  const locale = await getLocale()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName, locale } },
  })
  if (error) {
    console.error("signUp failed", error.code, error.message)
    return { error: authError(error.code, "registerFailed"), fields }
  }
  // With email confirmation disabled a session is returned immediately.
  if (!data.session) return { error: "confirmationRequired", fields }

  redirect(safeNext(formData.get("next")))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
