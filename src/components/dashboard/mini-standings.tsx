import Link from "next/link"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { TeamCrest } from "@/components/match/team-crest"
import { FormBadges } from "@/components/match/form-badges"
import { cn } from "@/lib/utils"
import type { StandingRow } from "@/lib/data/standings"

/** Compact Premier League table for the dashboard sidebar. */
export function MiniStandings({ rows }: { rows: StandingRow[] }) {
  const t = useTranslations()
  if (rows.length === 0) return null

  return (
    <section aria-labelledby="mini-table" className="overflow-hidden rounded-xl border bg-card">
      <h2 id="mini-table" className="px-4 pt-3 pb-2 font-heading text-xl font-semibold">
        {t("standings.title")}
      </h2>
      <table className="w-full text-sm tabular">
        <thead className="border-y bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-8 py-1.5 pl-3 text-left">#</th>
            <th scope="col" className="py-1.5 text-left">{t("standings.team")}</th>
            <th scope="col" className="w-[7.25rem] px-1 py-1.5 text-left">{t("standings.form")}</th>
            <th scope="col" className="w-10 px-1 py-1.5 text-right">{t("standings.goalDiff")}</th>
            <th scope="col" className="w-12 py-1.5 pr-4 pl-1 text-right">{t("standings.points")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.rank}
              className={cn(
                "border-b last:border-b-0",
                r.rank <= 4 && "shadow-[inset_3px_0_0_var(--turf)]",
                r.rank >= 18 && "shadow-[inset_3px_0_0_var(--red-card)]"
              )}
            >
              <td className="py-1 pl-3 font-medium text-muted-foreground">{r.rank}</td>
              <td className="max-w-0 py-1">
                <span className="flex items-center gap-1.5">
                  <TeamCrest name={r.teams.name} logo={r.teams.logo_url} size={16} />
                  <span className="truncate">{r.teams.name}</span>
                </span>
              </td>
              <td className="px-1 py-1">
                <FormBadges form={r.form} recent={r.recent} team={r.teams.name} />
              </td>
              <td className="px-1 py-1 text-right">{r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff}</td>
              <td className="py-1 pr-4 pl-1.5 text-right font-score text-base font-bold">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link
        href="/standings"
        className="flex items-center justify-between border-t px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted/60"
      >
        {t("dashboard.fullTable")}
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}
