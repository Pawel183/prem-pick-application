import "server-only"
import { createClient } from "@/lib/supabase/server"

/** Leagues visible to the user (RLS: global + ones they belong to), with member counts. */
export async function getMyLeagues(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, invite_code, is_global, created_by, league_members(user_id)")
    .order("is_global", { ascending: false })
    .order("created_at")
  if (error) throw error

  return (data ?? [])
    .filter((l) => l.league_members.some((m) => m.user_id === userId))
    .map(({ league_members, ...l }) => ({ ...l, memberCount: league_members.length }))
}

export type MyLeague = Awaited<ReturnType<typeof getMyLeagues>>[number]
