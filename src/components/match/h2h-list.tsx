import { useFormatter, useTranslations } from "next-intl"
import type { H2HEntry } from "@football/providers"

export function H2HList({ entries }: { entries: H2HEntry[] }) {
  const t = useTranslations("fixtures")
  const format = useFormatter()
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">{t("noH2h")}</p>

  return (
    <ul className="divide-y text-sm">
      {entries.map((e) => (
        <li key={e.date + e.home} className="grid grid-cols-[4.5rem_1fr_auto_1fr] items-center gap-2 py-1.5">
          <span className="text-xs text-muted-foreground tabular">
            {format.dateTime(new Date(e.date), { day: "2-digit", month: "2-digit", year: "2-digit" })}
          </span>
          <span className="truncate text-right">{e.home}</span>
          <span className="rounded bg-muted px-1.5 font-score font-semibold tabular">
            {e.home_goals}:{e.away_goals}
          </span>
          <span className="truncate">{e.away}</span>
        </li>
      ))}
    </ul>
  )
}
