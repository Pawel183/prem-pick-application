"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { LogOut, MoreHorizontal } from "lucide-react"
import { logout } from "@/actions/auth"
import { cn } from "@/lib/utils"
import { NAV, isActive, type NavKey } from "./nav-items"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PRIMARY: NavKey[] = ["fixtures", "leaderboard", "standings", "rules"]
const SECONDARY: NavKey[] = ["profile"]

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const more = isAdmin ? [...SECONDARY, "admin" as const] : SECONDARY
  const moreActive = more.some((key) => isActive(pathname, NAV[key].href))

  const itemClass =
    "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground outline-none focus-visible:bg-muted aria-[current=page]:text-primary"

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {PRIMARY.map((key) => {
        const Icon = NAV[key].icon
        return (
          <Link
            key={key}
            href={NAV[key].href}
            aria-current={isActive(pathname, NAV[key].href) ? "page" : undefined}
            className={itemClass}
          >
            <Icon className="size-5" aria-hidden />
            {t(key)}
          </Link>
        )
      })}
      <DropdownMenu>
        <DropdownMenuTrigger aria-current={moreActive ? "page" : undefined} className={cn(itemClass)}>
          <MoreHorizontal className="size-5" aria-hidden />
          {t("more")}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-48">
          {more.map((key) => {
            const Icon = NAV[key].icon
            return (
              <DropdownMenuItem key={key} asChild>
                <Link href={NAV[key].href}>
                  <Icon />
                  {t(key)}
                </Link>
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logout()}>
            <LogOut />
            {t("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
