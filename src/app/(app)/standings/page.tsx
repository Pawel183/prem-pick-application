import { getFormatter, getTranslations } from "next-intl/server"
import { getStandings } from "@/lib/data/standings"
import { EmptyState } from "@/components/empty-state"
import { TeamCrest } from "@/components/match/team-crest"
import { FormBadges } from "@/components/match/form-badges"
import { cn } from "@/lib/utils"

export default async function StandingsPage() {
  const t = await getTranslations("standings")
  const format = await getFormatter()
  const rows = await getStandings()

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold">{t("title")}</h1>
        <EmptyState>{t("empty")}</EmptyState>
      </div>
    )
  }

  const updated = rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), rows[0].updated_at)

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-4xl font-bold">{t("title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {t("updated", { time: format.dateTime(new Date(updated), { dateStyle: "medium", timeStyle: "short", hourCycle: "h23" }) })}
      </p>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm tabular">
          <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-8 px-2 py-2 text-center">#</th>
              <th scope="col" className="px-2 py-2 text-left">{t("team")}</th>
              <th scope="col" className="px-1.5 py-2 text-right">{t("played")}</th>
              <th scope="col" className="hidden px-1.5 py-2 text-right sm:table-cell">{t("won")}</th>
              <th scope="col" className="hidden px-1.5 py-2 text-right sm:table-cell">{t("drawn")}</th>
              <th scope="col" className="hidden px-1.5 py-2 text-right sm:table-cell">{t("lost")}</th>
              <th scope="col" className="px-1.5 py-2 text-right">{t("goalDiff")}</th>
              <th scope="col" className="px-2 py-2 text-right">{t("points")}</th>
              <th scope="col" className="hidden px-3 py-2 text-left md:table-cell">{t("form")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr
                key={r.rank}
                className={cn(
                  r.rank <= 4 && "shadow-[inset_3px_0_0_var(--turf)]",
                  r.rank >= 18 && "shadow-[inset_3px_0_0_var(--red-card)]"
                )}
              >
                <td className="px-2 py-2 text-center font-semibold">{r.rank}</td>
                <td className="px-2 py-2">
                  <span className="flex items-center gap-2">
                    <TeamCrest name={r.teams.name} logo={r.teams.logo_url} size={20} />
                    <span className="truncate font-medium">{r.teams.name}</span>
                  </span>
                </td>
                <td className="px-1.5 py-2 text-right">{r.played}</td>
                <td className="hidden px-1.5 py-2 text-right sm:table-cell">{r.won}</td>
                <td className="hidden px-1.5 py-2 text-right sm:table-cell">{r.drawn}</td>
                <td className="hidden px-1.5 py-2 text-right sm:table-cell">{r.lost}</td>
                <td className="px-1.5 py-2 text-right">{r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff}</td>
                <td className="px-2 py-2 text-right font-score text-lg font-bold">{r.points}</td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <FormBadges form={r.form} recent={r.recent} team={r.teams.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
