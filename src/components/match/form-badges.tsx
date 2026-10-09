"use client"

import { useRef, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"
import type { RecentMatch } from "@football/providers"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { TeamCrest } from "./team-crest"

const COLORS: Record<string, string> = {
  W: "bg-win text-white",
  D: "bg-draw text-white",
  L: "bg-loss text-white",
}

type Props = { form: string | null; recent?: RecentMatch[]; team?: string; className?: string }

/**
 * Last-five form as result chips. When match details are available the chips open a popover
 * (click, or hover with a mouse) listing opponent, venue and score.
 */
export function FormBadges({ form, recent, team, className }: Props) {
  const t = useTranslations("form")
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const results = (form ?? "").slice(-5).split("").filter((c) => c in COLORS)
  if (results.length === 0) return <span className="text-xs text-muted-foreground">—</span>

  const chips = results.map((r, i) => (
    <span
      key={i}
      title={recent?.length ? undefined : t(`${r}long` as "Wlong")}
      className={cn("inline-flex size-5 items-center justify-center rounded-sm text-[11px] font-bold", COLORS[r])}
    >
      {t(r as "W")}
    </span>
  ))

  if (!recent?.length) return <span className={cn("inline-flex gap-0.5", className)}>{chips}</span>

  const hover = (next: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    if (next) setOpen(true)
    else closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        aria-label={t("showRecent", { team: team ?? "" })}
        className={cn(
          "inline-flex cursor-pointer gap-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          className
        )}
      >
        {chips}
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <RecentList recent={recent} team={team} />
      </PopoverContent>
    </Popover>
  )
}

function RecentList({ recent, team }: { recent: RecentMatch[]; team?: string }) {
  const t = useTranslations("form")
  const format = useFormatter()
  return (
    <div>
      <p className="border-b px-3 py-2 font-heading text-base font-semibold">
        {team ? t("recentTitle", { team }) : t("recentTitleShort")}
      </p>
      <ul className="divide-y text-sm">
        {[...recent].reverse().map((m) => (
          <li key={m.date + m.opponent} className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-11 shrink-0 text-xs text-muted-foreground tabular">
              {format.dateTime(new Date(m.date), { day: "2-digit", month: "2-digit" })}
            </span>
            <span className="w-4 shrink-0 text-center text-xs font-semibold text-muted-foreground" title={t(m.venue === "H" ? "home" : "away")}>
              {t(m.venue === "H" ? "homeShort" : "awayShort")}
            </span>
            <TeamCrest name={m.opponent} logo={m.opponent_logo} size={16} />
            <span className="min-w-0 flex-1 truncate">{m.opponent}</span>
            <span className={cn("rounded px-1.5 font-score text-sm font-bold tabular", COLORS[m.result])}>
              {m.goals_for}:{m.goals_against}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
