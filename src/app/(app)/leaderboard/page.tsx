import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getActiveGameweek, getGameweekMatches, getSeasonGameweeks } from "@/lib/data/matches"
import { getMyLeagues } from "@/lib/data/leagues"
import { getLeaderboard } from "@/lib/data/leaderboard"
import { getPredictionsForMatches } from "@/lib/data/predictions"
import { hasKickedOff } from "@/lib/match-state"
import { EmptyState } from "@/components/empty-state"
import { GameweekSelect } from "@/components/gameweek-select"
import { LeaguesPanel } from "@/components/leagues/leagues-panel"
import { PickSummary } from "@/components/match/match-detail"
import { TeamCrest } from "@/components/match/team-crest"
import { cn } from "@/lib/utils"

type Period = "gw" | "season"

/** Ranking hub: personal summary, league leaderboards, league management and per-match points. */
export default async function RankingPage({ searchParams }: PageProps<"/leaderboard">) {
  const user = await requireUser()
  const t = await getTranslations()
  const params = await searchParams
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined)

  const [leagues, activeGw, gameweeks] = await Promise.all([getMyLeagues(user.id), getActiveGameweek(), getSeasonGameweeks()])
  const global = leagues.find((l) => l.is_global)!
  const privateLeagues = leagues.filter((l) => !l.is_global)
  const league = leagues.find((l) => String(l.id) === one(params.league)) ?? global
  const period: Period = one(params.period) === "gw" && activeGw ? "gw" : "season"

  const [rows, globalSeason] = await Promise.all([
    getLeaderboard(league.id, period === "gw" ? activeGw?.id : undefined),
    getLeaderboard(global.id),
  ])
  const me = globalSeason.find((r) => r.user_id === user.id)

  // My points: selected gameweek (defaults to the active one).
  const selected =
    gameweeks.find((g) => String(g.number) === one(params.gw)) ?? gameweeks.find((g) => g.id === activeGw?.id) ?? gameweeks.at(-1)
  const supabase = await createClient()
  const { data: myScores } = await supabase
    .from("prediction_scores")
    .select("total_pts, gameweek_id")
    .eq("user_id", user.id)
    .in("gameweek_id", gameweeks.map((g) => g.id))
  const pointsIn = (gwId: number | undefined) =>
    (myScores ?? []).filter((s) => s.gameweek_id === gwId).reduce((sum, s) => sum + (s.total_pts ?? 0), 0)

  const matches = selected ? await getGameweekMatches(selected.id) : []
  const started = matches.filter((m) => hasKickedOff(m))
  const predictions = await getPredictionsForMatches(started.map((m) => m.id))
  const mine = new Map(predictions.filter((p) => p.user_id === user.id).map((p) => [p.match_id, p]))

  const href = (next: { league?: number; period?: Period }) => {
    const q = new URLSearchParams()
    q.set("league", String(next.league ?? league.id))
    q.set("period", next.period ?? period)
    if (one(params.gw)) q.set("gw", one(params.gw)!)
    return `/leaderboard?${q}`
  }
  const leagueName = (l: { is_global: boolean; name: string }) => (l.is_global ? t("leaderboard.global") : l.name)

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">{t("rankingPage.title")}</h1>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="pitch rounded-xl px-4 py-3 text-white">
          <dt className="text-sm text-white/85">{t("rankingPage.season")}</dt>
          <dd className="font-score text-5xl font-bold tabular">{me?.points ?? 0}</dd>
        </div>
        <SummaryTile
          label={t("rankingPage.rank")}
          value={me ? t("rankingPage.rankValue", { rank: me.rank, total: globalSeason.length }) : "—"}
        />
        <SummaryTile
          label={activeGw ? t("rankingPage.gameweek", { number: activeGw.number }) : t("leaderboard.currentGameweek")}
          value={pointsIn(activeGw?.id)}
        />
        <SummaryTile label={t("rankingPage.exact")} value={me?.exact_hits ?? 0} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="table-title" className="min-w-0 overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
            <h2 id="table-title" className="font-heading text-xl font-semibold">
              {leagueName(league)}
            </h2>
            <div role="group" className="inline-flex rounded-md bg-muted p-0.5 text-sm">
              {(["gw", "season"] as const).map((p) => (
                <Link
                  key={p}
                  href={href({ period: p })}
                  scroll={false}
                  aria-current={period === p ? "page" : undefined}
                  aria-disabled={p === "gw" && !activeGw}
                  className={cn(
                    "rounded px-3 py-1 font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-sm",
                    p === "gw" && !activeGw && "pointer-events-none opacity-40"
                  )}
                >
                  {p === "gw" ? t("common.gameweek", { number: activeGw?.number ?? "" }) : t("leaderboard.season")}
                </Link>
              ))}
            </div>
          </div>

          <nav aria-label={t("leaderboard.selectLeague")} className="mt-2 flex gap-1 overflow-x-auto border-b px-3">
            {leagues.map((l) => (
              <Link
                key={l.id}
                href={href({ league: l.id })}
                scroll={false}
                aria-current={l.id === league.id ? "page" : undefined}
                className="shrink-0 border-b-2 border-transparent px-2 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground"
              >
                {leagueName(l)}
              </Link>
            ))}
          </nav>

          {rows.length === 0 ? (
            <p className="px-4 py-6 text-muted-foreground">{t("leaderboard.empty")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-12 px-3 py-2 text-center">{t("leaderboard.rank")}</th>
                  <th scope="col" className="px-2 py-2">{t("leaderboard.player")}</th>
                  <th scope="col" className="hidden px-2 py-2 text-right sm:table-cell">{t("leaderboard.resultsCorrect")}</th>
                  <th scope="col" className="px-2 py-2 text-right">{t("leaderboard.exactHits")}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t("leaderboard.points")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const isMe = r.user_id === user.id
                  return (
                    <tr key={r.user_id} className={cn(isMe && "bg-accent")}>
                      <td className="px-3 py-2.5 text-center font-score text-lg font-bold tabular">{r.rank}</td>
                      <td className="max-w-[12rem] truncate px-2 py-2.5 font-medium sm:max-w-none">
                        {r.display_name}
                        {isMe && <span className="ml-1.5 text-xs text-accent-foreground">({t("leaderboard.you")})</span>}
                      </td>
                      <td className="hidden px-2 py-2.5 text-right tabular sm:table-cell">{r.results_correct}</td>
                      <td className="px-2 py-2.5 text-right tabular">{r.exact_hits}</td>
                      <td className="px-4 py-2.5 text-right font-score text-xl font-bold tabular">{r.points}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        <LeaguesPanel
          leagues={privateLeagues.map((l) => ({ id: l.id, name: l.name, inviteCode: l.invite_code, memberCount: l.memberCount }))}
          siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
          activeId={league.id}
        />
      </div>

      <section id="my-points" aria-labelledby="my-points-title" className="scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="my-points-title" className="font-heading text-2xl font-semibold">
            {t("rankingPage.myPoints")}
            {selected && (
              <span className="ml-2 font-score text-xl text-muted-foreground tabular">
                {t("common.gameweek", { number: selected.number })}: {t("common.pts", { count: pointsIn(selected.id) })}
              </span>
            )}
          </h2>
          {gameweeks.length > 0 && (
            <GameweekSelect
              label={t("myPoints.selectGameweek")}
              options={gameweeks.map((g) => g.number)}
              value={selected?.number}
              basePath="/leaderboard"
            />
          )}
        </div>

        {started.length === 0 ? (
          <EmptyState>{t("myPoints.empty")}</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {started.map((m) => {
              const p = mine.get(m.id)
              const hasResult = m.home_goals !== null && m.away_goals !== null
              return (
                <li key={m.id} className="rounded-xl border bg-card px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <TeamCrest name={m.home.name} logo={m.home.logo_url} size={20} />
                    <span className="min-w-0 flex-1 truncate font-heading text-lg font-semibold">
                      {m.home.name} – {m.away.name}
                    </span>
                    <TeamCrest name={m.away.name} logo={m.away.logo_url} size={20} />
                    <span
                      className={cn(
                        "rounded bg-foreground px-2 font-score text-xl font-bold text-background tabular",
                        !hasResult && "opacity-40"
                      )}
                    >
                      {hasResult ? `${m.home_goals}:${m.away_goals}` : "–:–"}
                    </span>
                  </div>
                  {p ? (
                    <>
                      <PickSummary prediction={p} score={p.score} />
                      {!p.score && <p className="mt-1 text-xs text-muted-foreground">{t("myPoints.notScored")}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("fixtures.noPrediction")}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-score text-4xl font-bold tabular">{value}</dd>
    </div>
  )
}
