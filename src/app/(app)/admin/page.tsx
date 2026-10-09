import { getFormatter, getTranslations } from "next-intl/server"
import { requireAdmin } from "@/lib/auth"
import { getActiveSeason, getTodayRequestCount } from "@/lib/football/client"
import { getActiveGameweek, getGameweekMatches, getSeasonGameweeks } from "@/lib/data/matches"
import { SyncGameweekForm, ResultsActions, GameweekActions, ProviderSelect } from "@/components/admin/admin-actions"
import { OverrideDialog } from "@/components/admin/override-dialog"
import { StatsDialog } from "@/components/admin/stats-dialog"
import { GameweekSelect } from "@/components/gameweek-select"
import { Badge } from "@/components/ui/badge"
import { TeamCrest } from "@/components/match/team-crest"
import { cn } from "@/lib/utils"

// Syncs are throttled to the API's per-minute limit and can take a minute or two.
export const maxDuration = 300

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin()
  const t = await getTranslations()
  const format = await getFormatter()
  const { gw } = await searchParams

  const [requestCount, gameweeks, active, season] = await Promise.all([
    getTodayRequestCount(),
    getSeasonGameweeks(),
    getActiveGameweek(),
    getActiveSeason(),
  ])
  const provider = season.provider
  const hasKey = Boolean(process.env[provider.envKey])
  const selected = gameweeks.find((g) => String(g.number) === gw) ?? gameweeks.find((g) => g.id === active?.id) ?? gameweeks.at(-1)
  const matches = selected ? await getGameweekMatches(selected.id) : []
  const usage = provider.dailyLimit ? requestCount / provider.dailyLimit : 0
  const needsStats = (m: (typeof matches)[number]) =>
    m.status === "finished" && (m.total_yellows === null || m.total_corners === null)

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-5 text-4xl font-bold">{t("admin.title")}</h1>

      <section aria-labelledby="provider" className="mb-6 rounded-xl border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="provider" className="text-lg font-semibold">{t("admin.provider")}</h2>
            <p className="text-sm text-muted-foreground">
              {provider.hasMatchStats ? t("admin.providerHasStats") : t("admin.providerManualStats")}
            </p>
          </div>
          <ProviderSelect value={provider.id} />
        </div>
        {!hasKey && (
          <p role="alert" className="mt-2 text-sm font-medium text-destructive">
            {t("admin.missingKey", { key: provider.envKey })}
          </p>
        )}
        <div className="mt-3 flex items-baseline justify-between border-t pt-3">
          <span className="text-sm">{t("admin.apiUsage")}</span>
          <span className="font-score text-2xl font-bold tabular">
            {provider.dailyLimit
              ? t("admin.apiUsageValue", { count: requestCount, limit: provider.dailyLimit })
              : t("admin.apiUsageNoLimit", { count: requestCount })}
          </span>
        </div>
        {provider.dailyLimit !== null && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className={cn("h-full rounded-full", usage > 0.85 ? "bg-loss" : usage > 0.6 ? "bg-points" : "bg-primary")}
              style={{ width: `${Math.min(100, usage * 100)}%` }}
            />
          </div>
        )}
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <section aria-labelledby="sync" className="rounded-xl border bg-card px-4 py-4">
          <h2 id="sync" className="mb-1 text-2xl font-semibold">{t("admin.syncTitle")}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{t("admin.syncHint")}</p>
          <SyncGameweekForm suggested={(active?.number ?? 0) + 1} />
        </section>
        <section aria-labelledby="results" className="rounded-xl border bg-card px-4 py-4">
          <h2 id="results" className="mb-1 text-2xl font-semibold">{t("admin.resultsTitle")}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{t("admin.resultsHint")}</p>
          <ResultsActions />
        </section>
      </div>

      <section aria-labelledby="gameweeks" className="mb-8">
        <h2 id="gameweeks" className="mb-2 text-2xl font-semibold">{t("admin.gameweeksTitle")}</h2>
        {gameweeks.length === 0 ? (
          <p className="text-muted-foreground">{t("admin.noGameweeks")}</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {gameweeks.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                <span className="font-heading text-xl font-semibold">{t("common.gameweek", { number: g.number })}</span>
                {g.is_active && <Badge>{t("admin.active")}</Badge>}
                {g.synced_at && (
                  <span className="text-xs text-muted-foreground">
                    {t("admin.syncedAt", { time: format.dateTime(new Date(g.synced_at), { dateStyle: "short", timeStyle: "short", hourCycle: "h23" }) })}
                  </span>
                )}
                <div className="ml-auto">
                  <GameweekActions gameweekId={g.id} number={g.number} isActive={g.is_active} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <section aria-labelledby="matches">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 id="matches" className="text-2xl font-semibold">{t("admin.matchesTitle", { number: selected.number })}</h2>
            <GameweekSelect
              options={gameweeks.map((g) => g.number)}
              value={selected.number}
              basePath="/admin"
              label={t("myPoints.selectGameweek")}
            />
          </div>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {matches.map((m) => (
              <li key={m.id} className="space-y-2 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground tabular">
                    {format.dateTime(new Date(m.kickoff_at), { weekday: "short", hour: "2-digit", hourCycle: "h23", minute: "2-digit" })}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <TeamCrest name={m.home.name} logo={m.home.logo_url} size={18} />
                    <span className="truncate">{m.home.name}</span>
                    <span className="rounded bg-muted px-1.5 font-score font-bold tabular">
                      {m.home_goals ?? "–"}:{m.away_goals ?? "–"}
                    </span>
                    <span className="truncate">{m.away.name}</span>
                    <TeamCrest name={m.away.name} logo={m.away.logo_url} size={18} />
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="mr-auto text-xs text-muted-foreground">
                    {t(`status.${m.status}`)}
                    {m.total_yellows !== null && `, ${t("admin.stats", { yellows: m.total_yellows, corners: m.total_corners ?? 0 })}`}
                  </span>
                  {m.is_overridden && <Badge variant="secondary">{t("admin.overridden")}</Badge>}
                  {needsStats(m) && <Badge className="bg-points text-foreground">{t("admin.needsStats")}</Badge>}
                  {m.status === "finished" && (
                    <StatsDialog
                      match={{
                        id: m.id,
                        home: m.home.name,
                        away: m.away.name,
                        homeYellows: m.home_yellows,
                        awayYellows: m.away_yellows,
                        homeCorners: m.home_corners,
                        awayCorners: m.away_corners,
                      }}
                      highlight={needsStats(m)}
                    />
                  )}
                  <OverrideDialog
                    match={{
                      id: m.id,
                      home: m.home.name,
                      away: m.away.name,
                      status: m.status,
                      isOverridden: m.is_overridden,
                      homeGoals: m.home_goals,
                      awayGoals: m.away_goals,
                      homeYellows: m.home_yellows,
                      awayYellows: m.away_yellows,
                      homeCorners: m.home_corners,
                      awayCorners: m.away_corners,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
