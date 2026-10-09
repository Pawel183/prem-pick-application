import { getTranslations } from "next-intl/server"
import { CARDS_RANGES, CORNERS_RANGES, GOALS_RANGES, POINTS } from "@/lib/scoring/ranges"

export default async function RulesPage() {
  const t = await getTranslations("rules")
  const pts = await getTranslations("common")

  const scoring = [
    [t("pointsResult"), POINTS.result],
    [t("pointsRange"), POINTS.range],
    [t("pointsExact"), POINTS.exact],
  ] as const

  const ranges = [
    [t("rangesGoals"), GOALS_RANGES],
    [t("rangesCards"), CARDS_RANGES],
    [t("rangesCorners"), CORNERS_RANGES],
  ] as const

  return (
    <article className="mx-auto max-w-prose">
      <h1 className="mb-2 text-4xl font-bold">{t("title")}</h1>
      <p className="mb-8 text-lg">{t("intro")}</p>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t("whatTitle")}</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>{t("whatScore")}</li>
          <li>{t("whatGoals")}</li>
          <li>{t("whatCards")}</li>
          <li>{t("whatCorners")}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t("pointsTitle")}</h2>
        <dl className="overflow-hidden rounded-xl border bg-card">
          {scoring.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b px-4 py-2.5">
              <dt>{label}</dt>
              <dd className="font-score text-xl font-bold tabular">{pts("pts", { count: value })}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between bg-foreground px-4 py-2.5 text-background">
            <dt className="font-semibold">{t("pointsMax")}</dt>
            <dd className="font-score text-2xl font-bold tabular">{pts("pts", { count: POINTS.maxPerMatch })}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t("rangesTitle")}</h2>
        <dl className="space-y-3">
          {ranges.map(([label, values]) => (
            <div key={label}>
              <dt className="mb-1 text-sm text-muted-foreground">{label}</dt>
              <dd className="grid grid-cols-4 gap-1.5">
                {values.map((r) => (
                  <span key={r} className="rounded-md border bg-card py-1.5 text-center font-score text-lg font-semibold">
                    {r}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t("exampleTitle")}</h2>
        <p className="rounded-xl border-l-4 border-points bg-card px-4 py-3 leading-relaxed">{t("example")}</p>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">{t("otherTitle")}</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>{t("otherPicks")}</li>
          <li>{t("otherPostponed")}</li>
          <li>{t("otherResults")}</li>
          <li>{t("otherTies")}</li>
        </ul>
      </section>
    </article>
  )
}
