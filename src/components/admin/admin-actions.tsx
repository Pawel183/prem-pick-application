"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { fetchResults, refreshStandings, rescoreGameweek, setActiveGameweek, setProvider, syncGameweek } from "@/actions/admin"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/spinner"
import type { ActionResult } from "@/lib/action-result"

function useAction() {
  const t = useTranslations()
  const [pending, startTransition] = useTransition()
  function run<T>(action: () => Promise<ActionResult<T>>, onSuccess: (data: T | undefined) => string) {
    startTransition(async () => {
      const res = await action()
      if (res.ok) toast.success(onSuccess(res.data))
      else toast.error(t(`errors.${res.error}` as "errors.unknown"), { description: res.detail })
    })
  }
  return { pending, run, t }
}

export function SyncGameweekForm({ suggested }: { suggested: number }) {
  const { pending, run, t } = useAction()
  const [number, setNumber] = useState(String(Math.min(38, Math.max(1, suggested))))
  const [refreshInsights, setRefreshInsights] = useState(false)

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        run(
          () => syncGameweek(Number(number), refreshInsights),
          (d) => t("admin.synced", { matches: d?.matches ?? 0, requests: d?.requests ?? 0 })
        )
      }}
    >
      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="gw-number">{t("admin.gameweekNumber")}</Label>
          <Input id="gw-number" type="number" min={1} max={38} value={number} onChange={(e) => setNumber(e.target.value)} className="h-10 w-24" required />
        </div>
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending && <Spinner />}
          {t("admin.syncButton")}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={refreshInsights} onChange={(e) => setRefreshInsights(e.target.checked)} className="size-4 accent-[var(--turf)]" />
        {t("admin.refreshInsights")}
      </label>
    </form>
  )
}

export function ResultsActions() {
  const results = useAction()
  const standings = useAction()
  const t = results.t

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="lg"
        className="h-10"
        disabled={results.pending}
        onClick={() =>
          results.run(fetchResults, (d) =>
            t("admin.resultsFetched", {
              checked: d?.checked ?? 0,
              updated: d?.updated ?? 0,
              scored: d?.scored ?? 0,
              requests: d?.requests ?? 0,
            }) + (d?.needsStats ? ` ${t("admin.needsStatsCount", { count: d.needsStats })}` : "")
          )
        }
      >
        {results.pending && <Spinner />}
        {t("admin.fetchResults")}
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-10"
        disabled={standings.pending}
        onClick={() => standings.run(refreshStandings, () => t("admin.standingsRefreshed"))}
      >
        {standings.pending && <Spinner />}
        {t("admin.refreshStandings")}
      </Button>
    </div>
  )
}

export function GameweekActions({ gameweekId, number, isActive }: { gameweekId: number; number: number; isActive: boolean }) {
  const activate = useAction()
  const rescore = useAction()
  const t = activate.t

  return (
    <div className="flex gap-2">
      {!isActive && (
        <Button
          size="sm"
          variant="outline"
          disabled={activate.pending}
          onClick={() => activate.run(() => setActiveGameweek(gameweekId), () => t("admin.activeSet", { number }))}
        >
          {activate.pending && <Spinner />}
          {t("admin.setActive")}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={rescore.pending}
        onClick={() => rescore.run(() => rescoreGameweek(gameweekId), (d) => t("admin.rescored", { scored: d?.scored ?? 0 }))}
      >
        {rescore.pending && <Spinner />}
        {t("admin.rescore")}
      </Button>
    </div>
  )
}

const PROVIDER_OPTIONS = ["football-data", "api-football"] as const

export function ProviderSelect({ value }: { value: string }) {
  const { pending, run, t } = useAction()
  return (
    <div className="flex items-center gap-2">
      {pending && <Spinner />}
      <Select
        value={value}
        disabled={pending}
        onValueChange={(v) => run(() => setProvider(v), () => t("admin.providerSaved"))}
      >
        <SelectTrigger aria-label={t("admin.provider")} className="h-10 w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROVIDER_OPTIONS.map((p) => (
            <SelectItem key={p} value={p}>
              {t(`admin.providers.${p}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
