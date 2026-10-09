"use client"

import { useState } from "react"
import { useFormatter, useNow, useTranslations } from "next-intl"
import { Check, ChevronRight, Lock } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { MatchView, OtherPick, PredictionView, ScoreView } from "@/lib/types"
import { MatchDetail } from "./match-detail"
import { PointsChip } from "./points-chip"
import { Shirt } from "./shirt"

type Props = {
  match: MatchView
  prediction: PredictionView | null
  score: ScoreView | null
  picks: OtherPick[] | null
  currentUserId: string
}

/** One fixture as a compact row (home – centre – away – action); opens the pick modal. */
export function MatchRow({ match, prediction, score, picks, currentUserId }: Props) {
  const t = useTranslations()
  const format = useFormatter()
  const now = useNow({ updateInterval: 30_000 })
  const [open, setOpen] = useState(false)

  const kickoff = new Date(match.kickoff_at)
  const locked = match.status !== "scheduled" || now >= kickoff
  const hasResult = match.status !== "scheduled" && match.home_goals !== null && match.away_goals !== null
  const needsPick = !locked && !prediction
  const time = format.dateTime(kickoff, { hour: "2-digit", hourCycle: "h23", minute: "2-digit" })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="grid w-full grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5 px-2.5 py-2.5 text-left outline-none hover:bg-muted/60 focus-visible:bg-muted sm:gap-3 sm:px-4"
        >
          <span className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
            <span className="truncate text-right font-heading text-[15px] font-semibold sm:text-lg">{match.home.name}</span>
            <Shirt team={match.home.name} className="size-6 shrink-0 sm:size-9" />
          </span>

          <span className="flex w-14 flex-col items-center sm:w-20">
            {hasResult ? (
              <span className="rounded-md bg-foreground px-2 py-0.5 font-score text-xl font-bold text-background tabular">
                {match.home_goals}:{match.away_goals}
              </span>
            ) : prediction ? (
              <span className="rounded-md border-2 border-primary px-1.5 font-score text-xl leading-tight font-bold tabular">
                {prediction.home_goals}:{prediction.away_goals}
              </span>
            ) : (
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-score text-base font-semibold tabular sm:px-2 sm:text-lg">{time}</span>
            )}
            <span className="mt-0.5 text-[11px] leading-none text-muted-foreground">
              {match.status === "live" ? (
                <span className="font-semibold text-loss">{t("status.live")}</span>
              ) : hasResult ? (
                prediction ? t("fixtures.yourPickValue", { pick: `${prediction.home_goals}:${prediction.away_goals}` }) : t(`status.${match.status}`)
              ) : prediction ? (
                time
              ) : match.status !== "scheduled" ? (
                t(`status.${match.status}`)
              ) : null}
            </span>
          </span>

          <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Shirt team={match.away.name} className="size-6 shrink-0 sm:size-9" />
            <span className="truncate font-heading text-[15px] font-semibold sm:text-lg">{match.away.name}</span>
          </span>

          <span className="flex w-8 justify-end sm:w-36">
            {needsPick ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-1 text-xs font-semibold whitespace-nowrap text-primary-foreground sm:px-3">
                <span className="hidden sm:inline">{t("fixtures.makePick")}</span>
                <ChevronRight className="size-4" aria-hidden />
                <span className="sr-only sm:hidden">{t("fixtures.makePick")}</span>
              </span>
            ) : !locked ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-primary">
                <Check className="size-4" aria-hidden />
                <span className="hidden sm:inline">{t("fixtures.editPick")}</span>
                <span className="sr-only sm:hidden">{t("fixtures.pickSaved")}</span>
              </span>
            ) : score ? (
              <PointsChip points={score.total_pts ?? 0} />
            ) : (
              <Lock className="size-4 text-muted-foreground" aria-label={t("fixtures.lockedAt")} />
            )}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">
          {match.home.name} – {match.away.name}
        </DialogTitle>
        <DialogDescription className="sr-only">{locked ? t("fixtures.lockedAt") : t("fixtures.deadline")}</DialogDescription>
        <MatchDetail
          match={match}
          prediction={prediction}
          score={score}
          picks={picks}
          currentUserId={currentUserId}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Day heading + rows in one card. */
export function MatchDay({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <h2 className={cn("pitch-soft border-b px-4 py-2 font-heading text-base font-semibold first-letter:uppercase")}>{label}</h2>
      <div className="divide-y">{children}</div>
    </section>
  )
}
