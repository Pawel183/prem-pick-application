import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type CurrentUser = {
  id: string
  email: string | undefined
  displayName: string
  role: "user" | "admin"
  locale: "pl" | "en"
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, locale")
    .eq("id", claims.sub)
    .single()
  if (!profile) return null

  return {
    id: claims.sub,
    email: claims.email as string | undefined,
    displayName: profile.display_name,
    role: profile.role as CurrentUser["role"],
    locale: profile.locale as CurrentUser["locale"],
  }
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== "admin") redirect("/")
  return user
}
