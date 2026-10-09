"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { LogOut, User } from "lucide-react"
import { logout } from "@/actions/auth"
import { cn } from "@/lib/utils"
import { LocaleToggle } from "./locale-toggle"
import { NAV, isActive, type NavKey } from "./nav-items"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const DESKTOP: NavKey[] = ["fixtures", "leaderboard", "standings", "rules"]

export function AppHeader({ displayName, isAdmin }: { displayName: string; isAdmin: boolean }) {
  const t = useTranslations()
  const pathname = usePathname()
  const items = isAdmin ? [...DESKTOP, "admin" as const] : DESKTOP

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="font-heading text-2xl font-bold tracking-wide">
          {t("common.appName")}
        </Link>
        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {items.map((key) => (
            <Link
              key={key}
              href={NAV[key].href}
              aria-current={isActive(pathname, NAV[key].href) ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground",
                "aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_-2px_0_var(--turf)]"
              )}
            >
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocaleToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden size-9 items-center justify-center rounded-full border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex">
              <User className="size-4" />
              <span className="sr-only">{t("nav.profile")}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">{t("nav.profile")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => logout()}>
                <LogOut />
                {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
