"use client"

import { useTranslations } from "next-intl"
import { bucket } from "@/lib/scoring/ranges"
import { cn } from "@/lib/utils"
import type { OtherPick } from "@/lib/types"
import { PointsChip } from "./points-chip"
import { describeStatPick } from "./describe"

/** Everyone's picks for a match (visible after kickoff), best score first. */
export function PicksList({ picks, currentUserId }: { picks: OtherPick[]; currentUserId: string }) {
  const t = useTranslations()
  const exact = t("prediction.exact")
  const sorted = [...picks].sort(
    (a, b) => (b.score?.total_pts ?? 0) - (a.score?.total_pts ?? 0) || a.display_name.localeCompare(b.display_name)
  )

  return (
    <section aria-labelledby="all-picks" className="border-t pt-3">
      <h3 id="all-picks" className="mb-1 font-heading text-lg font-semibold">
        {t("fixtures.seePicks")} ({picks.length})
      </h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("fixtures.noPicks")}</p>
      ) : (
        <ul className="divide-y">
          {sorted.map((p) => {
            const total = p.home_goals + p.away_goals
            return (
              <li key={p.id} className={cn("flex items-center gap-3 py-2", p.user_id === currentUserId && "font-semibold")}>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{p.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("prediction.totalGoals")}: {p.goals_mode === "exact" ? `${total} (${exact.toLowerCase()})` : bucket("goals", total)}
                    {", "}
                    {t("prediction.yellowCards")}: {describeStatPick(p.cards_mode, p.cards_range, p.cards_exact, exact)}
                    {", "}
                    {t("prediction.corners")}: {describeStatPick(p.corners_mode, p.corners_range, p.corners_exact, exact)}
                  </p>
                </div>
                <span className="font-score text-2xl font-bold tabular">
                  {p.home_goals}:{p.away_goals}
                </span>
                {p.score && <PointsChip points={p.score.total_pts ?? 0} />}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
