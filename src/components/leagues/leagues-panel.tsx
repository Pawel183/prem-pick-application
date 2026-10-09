"use client"

import Link from "next/link"
import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { Copy, LogOut } from "lucide-react"
import { toast } from "sonner"
import { leaveLeague } from "@/actions/leagues"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/spinner"
import { CreateLeagueForm, JoinLeagueForm } from "./league-forms"

type League = { id: number; name: string; inviteCode: string; memberCount: number }

/** Private leagues with invite codes, plus create/join forms. */
export function LeaguesPanel({ leagues, siteUrl, activeId }: { leagues: League[]; siteUrl: string; activeId?: number }) {
  const t = useTranslations()
  return (
    <section id="leagues" aria-labelledby="leagues-title" className="scroll-mt-20 overflow-hidden rounded-xl border bg-card">
      <h2 id="leagues-title" className="px-4 pt-3 pb-1 font-heading text-xl font-semibold">
        {t("leagues.myLeagues")}
      </h2>
      {leagues.length === 0 ? (
        <p className="px-4 pb-3 text-sm text-muted-foreground">{t("leaderboard.noPrivateLeagues")}</p>
      ) : (
        <ul className="divide-y border-y">
          {leagues.map((l) => (
            <LeagueItem key={l.id} league={l} siteUrl={siteUrl} active={l.id === activeId} />
          ))}
        </ul>
      )}
      <div className="space-y-4 px-4 py-4">
        <div>
          <h3 className="mb-1.5 text-sm font-medium">{t("leagues.createTitle")}</h3>
          <CreateLeagueForm />
        </div>
        <div>
          <h3 className="mb-1.5 text-sm font-medium">{t("leagues.joinTitle")}</h3>
          <JoinLeagueForm />
        </div>
      </div>
    </section>
  )
}

function LeagueItem({ league, siteUrl, active }: { league: League; siteUrl: string; active: boolean }) {
  const t = useTranslations()
  const [pending, startTransition] = useTransition()

  async function copyLink() {
    const url = `${siteUrl || window.location.origin}/join/${league.inviteCode}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t("leagues.linkCopied"))
    } catch {
      toast.error(t("errors.unknown"))
    }
  }

  function leave() {
    if (!window.confirm(t("leagues.leaveConfirm", { name: league.name }))) return
    startTransition(async () => {
      const res = await leaveLeague(league.id)
      if (res.ok) toast.success(t("leagues.left", { name: league.name }))
      else toast.error(t(`errors.${res.error}` as "errors.unknown"))
    })
  }

  return (
    <li className={active ? "bg-accent/60" : undefined}>
      <div className="flex items-center gap-2 px-4 pt-2.5">
        <Link
          href={`/leaderboard?league=${league.id}`}
          scroll={false}
          className="min-w-0 flex-1 truncate font-heading text-lg font-semibold hover:underline"
        >
          {league.name}
        </Link>
        <span className="shrink-0 text-xs text-muted-foreground">{t("leagues.members", { count: league.memberCount })}</span>
      </div>
      <div className="flex items-center gap-2 px-4 pt-1 pb-2.5">
        <span className="rounded bg-muted px-2 py-0.5 font-score text-base font-semibold tracking-wider">
          <span className="sr-only">{t("leagues.inviteCode")}: </span>
          {league.inviteCode}
        </span>
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy />
          {t("leagues.copyLink")}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          onClick={leave}
          disabled={pending}
          aria-label={`${t("leagues.leave")}: ${league.name}`}
        >
          {pending ? <Spinner /> : <LogOut />}
        </Button>
      </div>
    </li>
  )
}
