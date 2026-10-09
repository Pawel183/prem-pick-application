import { CalendarCheck, Shield, Trophy, BookOpen, User, Table2, type LucideIcon } from "lucide-react"

export type NavKey = "fixtures" | "leaderboard" | "standings" | "rules" | "profile" | "admin"

export const NAV: Record<NavKey, { href: string; icon: LucideIcon }> = {
  fixtures: { href: "/", icon: CalendarCheck },
  leaderboard: { href: "/leaderboard", icon: Trophy },
  standings: { href: "/standings", icon: Table2 },
  rules: { href: "/rules", icon: BookOpen },
  profile: { href: "/profile", icon: User },
  admin: { href: "/admin", icon: Shield },
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}
