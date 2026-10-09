"use client"

import Link from "next/link"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Row = { rank: number; user_id: string; display_name: string; points: number }

export type MiniLeague = {
  id: number
  name: string
  isGlobal: boolean
  season: Row[]
  gameweek: Row[] | null
}

const TOP = 5

/** Sidebar ranking: a tab per league plus a gameweek/season switch, top 5 and the current user. */
export function MiniLeaderboard({
  leagues,
  currentUserId,
  gameweekNumber,
}: {
  leagues: MiniLeague[]
  currentUserId: string
  gameweekNumber: number | null
}) {
  const t = useTranslations()
  const [leagueId, setLeagueId] = useState(leagues[0]?.id)
  const [period, setPeriod] = useState<"gw" | "season">(gameweekNumber ? "gw" : "season")
  const league = leagues.find((l) => l.id === leagueId) ?? leagues[0]
  if (!league) return null

  const rows = (period === "gw" ? league.gameweek : league.season) ?? []
  const top = rows.slice(0, TOP)
  const me = rows.find((r) => r.user_id === currentUserId)
  const showMe = me && !top.some((r) => r.user_id === currentUserId)
  const href = `/leaderboard?league=${league.id}&period=${period}`

  return (
    <section aria-labelledby="mini-ranking" className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <h2 id="mini-ranking" className="font-heading text-xl font-semibold">
          {t("leaderboard.title")}
        </h2>
        <div role="group" aria-label={t("leaderboard.title")} className="inline-flex rounded-md bg-muted p-0.5 text-xs">
          {(["gw", "season"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              disabled={p === "gw" && !gameweekNumber}
              onClick={() => setPeriod(p)}
              className="rounded px-2 py-1 font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
            >
              {p === "gw" ? t("common.gameweek", { number: gameweekNumber ?? "" }) : t("leaderboard.season")}
            </button>
          ))}
        </div>
      </div>

      <div role="tablist" aria-label={t("leaderboard.selectLeague")} className="mt-2 flex gap-1 overflow-x-auto border-b px-3">
        {leagues.map((l) => (
          <button
            key={l.id}
            role="tab"
            type="button"
            aria-selected={l.id === league.id}
            onClick={() => setLeagueId(l.id)}
            className="shrink-0 border-b-2 border-transparent px-2 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none focus-visible:text-foreground aria-selected:border-primary aria-selected:text-foreground"
          >
            {l.isGlobal ? t("leaderboard.global") : l.name}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {rows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">{t("leaderboard.empty")}</p>
        ) : (
          <ol className="py-1 text-sm">
            {top.map((r) => (
              <RankRow key={r.user_id} row={r} isMe={r.user_id === currentUserId} you={t("leaderboard.you")} />
            ))}
            {showMe && (
              <>
                <li aria-hidden className="px-4 text-center leading-none text-muted-foreground">⋯</li>
                <RankRow row={me} isMe you={t("leaderboard.you")} />
              </>
            )}
          </ol>
        )}
        <Link
          href={href}
          className="flex items-center justify-between border-t px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted/60"
        >
          {t("dashboard.fullRanking")}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

function RankRow({ row, isMe, you }: { row: Row; isMe: boolean; you: string }) {
  return (
    <li className={cn("flex items-center gap-3 px-4 py-1.5", isMe && "bg-accent font-semibold")}>
      <span className="w-6 text-right font-score text-base font-bold text-muted-foreground tabular">{row.rank}</span>
      <span className="min-w-0 flex-1 truncate">
        {row.display_name}
        {isMe && <span className="ml-1 text-xs font-normal text-accent-foreground">({you})</span>}
      </span>
      <span className="font-score text-lg font-bold tabular">{row.points}</span>
    </li>
  )
}
