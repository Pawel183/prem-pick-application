import { getFormatter, getTranslations } from "next-intl/server"
import { requireUser } from "@/lib/auth"
import { getActiveGameweek, getGameweekMatches } from "@/lib/data/matches"
import { getPredictionsForMatches } from "@/lib/data/predictions"
import { getMyLeagues } from "@/lib/data/leagues"
import { getLeaderboard } from "@/lib/data/leaderboard"
import { getStandings } from "@/lib/data/standings"
import { MatchDay, MatchRow } from "@/components/match/match-row"
import { HeroStat, PitchHero } from "@/components/match/pitch-hero"
import { MiniLeaderboard, type MiniLeague } from "@/components/dashboard/mini-leaderboard"
import { MiniStandings } from "@/components/dashboard/mini-standings"
import { EmptyState } from "@/components/empty-state"
import { hasKickedOff } from "@/lib/match-state"
import { TIME_ZONE } from "@/i18n/config"

// Sidebar shows the global league plus up to this many private leagues.
const MAX_PRIVATE_LEAGUES = 4

export default async function DashboardPage() {
  const user = await requireUser()
  const t = await getTranslations("fixtures")
  const format = await getFormatter()

  const [gameweek, leagues, standings] = await Promise.all([getActiveGameweek(), getMyLeagues(user.id), getStandings()])
  const matches = gameweek ? await getGameweekMatches(gameweek.id) : []
  const predictions = await getPredictionsForMatches(matches.map((m) => m.id))

  const sidebarLeagues = [...leagues.filter((l) => l.is_global), ...leagues.filter((l) => !l.is_global).slice(0, MAX_PRIVATE_LEAGUES)]
  const miniLeagues: MiniLeague[] = await Promise.all(
    sidebarLeagues.map(async (l) => ({
      id: l.id,
      name: l.name,
      isGlobal: l.is_global,
      season: await getLeaderboard(l.id),
      gameweek: gameweek ? await getLeaderboard(l.id, gameweek.id) : null,
    }))
  )

  const mine = new Map(predictions.filter((p) => p.user_id === user.id).map((p) => [p.match_id, p]))
  const done = matches.filter((m) => mine.has(m.id)).length
  const points = [...mine.values()].reduce((sum, p) => sum + (p.score?.total_pts ?? 0), 0)
  const next = matches.find((m) => !hasKickedOff(m))

  // Group fixtures by local (Warsaw) calendar day.
  const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TIME_ZONE })
  const days = new Map<string, typeof matches>()
  for (const m of matches) days.set(dayKey(m.kickoff_at), [...(days.get(dayKey(m.kickoff_at)) ?? []), m])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0">
        {gameweek ? (
          <>
            <PitchHero title={t("title", { number: gameweek.number })}>
              <p className="mt-1 max-w-xl text-white/90">{t("deadline")}</p>
              <dl className="mt-5 grid grid-cols-3 gap-2 sm:flex">
                <HeroStat label={t("statPicked")} value={`${done} / ${matches.length}`} />
                <HeroStat label={t("statPoints")} value={points} />
                <HeroStat
                  label={next ? t("statNext") : t("statDone")}
                  value={
                    next
                      ? format.dateTime(new Date(next.kickoff_at), { weekday: "short", hour: "2-digit", hourCycle: "h23", minute: "2-digit" })
                      : "—"
                  }
                />
              </dl>
            </PitchHero>

            {matches.length === 0 ? (
              <EmptyState>{t("noMatches")}</EmptyState>
            ) : (
              <div className="space-y-4">
                {[...days].map(([key, dayMatches]) => (
                  <MatchDay
                    key={key}
                    label={format.dateTime(new Date(dayMatches[0].kickoff_at), { weekday: "long", day: "numeric", month: "long" })}
                  >
                    {dayMatches.map((match) => {
                      const own = mine.get(match.id) ?? null
                      return (
                        <MatchRow
                          key={match.id}
                          match={match}
                          prediction={own}
                          score={own?.score ?? null}
                          picks={hasKickedOff(match) ? predictions.filter((p) => p.match_id === match.id) : null}
                          currentUserId={user.id}
                        />
                      )
                    })}
                  </MatchDay>
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState>{t("noActiveGameweek")}</EmptyState>
        )}
      </div>

      <aside className="space-y-6">
        <MiniLeaderboard leagues={miniLeagues} currentUserId={user.id} gameweekNumber={gameweek?.number ?? null} />
        <MiniStandings rows={standings} />
      </aside>
    </div>
  )
}
