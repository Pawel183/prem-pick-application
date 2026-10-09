"use client"

import { useMemo, useState, useTransition } from "react"
import { useFormatter, useNow, useTranslations } from "next-intl"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"
import { ChevronDown, ChevronUp, Lock, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { savePrediction } from "@/actions/predictions"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/spinner"
import { CARDS_RANGES, CORNERS_RANGES, bucket, outcome, type PickMode } from "@/lib/scoring/ranges"
import type { MatchView, OtherPick, PredictionView, ScoreView } from "@/lib/types"
import type { RecentMatch } from "@football/providers"
import { TeamCrest } from "./team-crest"
import { FormBadges } from "./form-badges"
import { H2HList } from "./h2h-list"
import { PicksList } from "./picks-list"
import { Shirt } from "./shirt"
import { PointsChip } from "./points-chip"
import { describeStatPick } from "./describe"

type Draft = {
  homeGoals: number
  awayGoals: number
  goalsMode: PickMode
  cardsMode: PickMode
  cardsRange: string | null
  cardsExact: number | null
  cornersMode: PickMode
  cornersRange: string | null
  cornersExact: number | null
}

function toDraft(p: PredictionView | null): Draft {
  return {
    homeGoals: p?.home_goals ?? 0,
    awayGoals: p?.away_goals ?? 0,
    goalsMode: p?.goals_mode ?? "range",
    cardsMode: p?.cards_mode ?? "range",
    cardsRange: p?.cards_range ?? null,
    cardsExact: p?.cards_exact ?? null,
    cornersMode: p?.corners_mode ?? "range",
    cornersRange: p?.corners_range ?? null,
    cornersExact: p?.corners_exact ?? null,
  }
}

type Props = {
  match: MatchView
  prediction: PredictionView | null
  score: ScoreView | null
  picks: OtherPick[] | null
  currentUserId: string
  /** Called after a pick was saved (the modal closes). */
  onSaved?: () => void
}

/** Full match view shown in the modal: pick form before kickoff, result + everyone's picks after. */
export function MatchDetail({ match, prediction, score, picks, currentUserId, onSaved }: Props) {
  const t = useTranslations()
  const format = useFormatter()
  const now = useNow({ updateInterval: 30_000 })
  const kickoff = new Date(match.kickoff_at)
  const locked = match.status !== "scheduled" || now >= kickoff

  return (
    <div>
      <header className="pitch-soft flex items-center justify-between gap-2 px-4 pt-3 text-sm text-muted-foreground">
        <time dateTime={match.kickoff_at} className="tabular">
          {format.dateTime(kickoff, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", hourCycle: "h23", minute: "2-digit" })}
        </time>
        <MatchStatusLabel status={match.status} locked={locked} />
      </header>
      {locked ? (
        <LockedBody match={match} prediction={prediction} score={score} picks={picks} currentUserId={currentUserId} />
      ) : (
        <EditableBody key={prediction?.id ?? "new"} match={match} prediction={prediction} onSaved={onSaved} />
      )}

      <details className="group border-t">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium outline-none focus-visible:bg-muted">
          {t("fixtures.h2h")}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="px-4 pb-3">
          <H2HList entries={match.insights?.h2h ?? []} />
        </div>
      </details>
    </div>
  )
}

function MatchStatusLabel({ status, locked }: { status: MatchView["status"]; locked: boolean }) {
  const t = useTranslations()
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-loss">
        <span className="size-2 rounded-full bg-loss motion-safe:animate-pulse" aria-hidden />
        {t("status.live")}
      </span>
    )
  }
  if (status !== "scheduled") return <span className="font-medium">{t(`status.${status}`)}</span>
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 font-medium">
        <Lock className="size-3.5" aria-hidden />
        {t("fixtures.lockedAt")}
      </span>
    )
  }
  return null
}

function TeamColumn({
  team,
  form,
  recent,
}: {
  team: MatchView["home"]
  form: string | null | undefined
  recent?: RecentMatch[]
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <div className="relative">
        <Shirt team={team.name} className="size-16" />
        <span className="absolute -right-1 -bottom-1 rounded-full bg-white p-0.5 shadow">
          <TeamCrest name={team.name} logo={team.logo_url} size={22} />
        </span>
      </div>
      <span className="line-clamp-2 font-heading text-lg leading-tight font-semibold">{team.name}</span>
      <FormBadges form={form ?? null} recent={recent} team={team.name} />
    </div>
  )
}

function EditableBody({
  match,
  prediction,
  onSaved,
}: {
  match: MatchView
  prediction: PredictionView | null
  onSaved?: () => void
}) {
  const t = useTranslations()
  const [saved, setSaved] = useState(() => toDraft(prediction))
  const [draft, setDraft] = useState(saved)
  const [hasSaved, setHasSaved] = useState(prediction !== null)
  const [pending, startTransition] = useTransition()

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])
  const complete =
    (draft.cardsMode === "range" ? draft.cardsRange !== null : draft.cardsExact !== null) &&
    (draft.cornersMode === "range" ? draft.cornersRange !== null : draft.cornersExact !== null)
  const totalGoals = draft.homeGoals + draft.awayGoals

  function submit() {
    startTransition(async () => {
      const res = await savePrediction({ matchId: match.id, ...draft } as Parameters<typeof savePrediction>[0])
      if (res.ok) {
        setSaved(draft)
        setHasSaved(true)
        toast.success(t("prediction.saved"))
        onSaved?.()
      } else {
        toast.error(t(`errors.${res.error}` as "errors.unknown"))
      }
    })
  }

  return (
    <>
      <div className="pitch-soft grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 py-3 sm:gap-4 sm:px-4">
        <TeamColumn team={match.home} form={match.insights?.home_form} recent={match.insights?.home_recent} />
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-foreground px-2 py-1 text-background">
          <ScoreStepper value={draft.homeGoals} onChange={(v) => set("homeGoals", v)} team={match.home.name} />
          <span className="font-score text-4xl font-bold opacity-50" aria-hidden>
            :
          </span>
          <ScoreStepper value={draft.awayGoals} onChange={(v) => set("awayGoals", v)} team={match.away.name} />
        </div>
        <TeamColumn team={match.away} form={match.insights?.away_form} recent={match.insights?.away_recent} />
      </div>
      <p className="pitch-soft pb-3 text-center text-sm font-medium text-muted-foreground">
        {t(`outcome.${outcome(draft.homeGoals, draft.awayGoals)}`)}
      </p>

      <div className="space-y-4 border-t px-4 py-4">
        <PickRow label={t("prediction.totalGoals")} mode={draft.goalsMode} onModeChange={(m) => set("goalsMode", m)}>
          <p className="text-sm text-muted-foreground">
            {draft.goalsMode === "exact"
              ? t("prediction.goalsFromScore", { total: totalGoals })
              : t("prediction.goalsRangeFromScore", { range: bucket("goals", totalGoals) })}
          </p>
        </PickRow>

        <PickRow label={t("prediction.yellowCards")} mode={draft.cardsMode} onModeChange={(m) => set("cardsMode", m)}>
          {draft.cardsMode === "range" ? (
            <RangePicker ranges={CARDS_RANGES} value={draft.cardsRange} onChange={(v) => set("cardsRange", v)} label={t("prediction.yellowCards")} />
          ) : (
            <NumberStepper value={draft.cardsExact} onChange={(v) => set("cardsExact", v)} max={30} label={t("prediction.yellowCards")} />
          )}
        </PickRow>

        <PickRow label={t("prediction.corners")} mode={draft.cornersMode} onModeChange={(m) => set("cornersMode", m)}>
          {draft.cornersMode === "range" ? (
            <RangePicker ranges={CORNERS_RANGES} value={draft.cornersRange} onChange={(v) => set("cornersRange", v)} label={t("prediction.corners")} />
          ) : (
            <NumberStepper value={draft.cornersExact} onChange={(v) => set("cornersExact", v)} max={40} label={t("prediction.corners")} />
          )}
        </PickRow>

        <div className="space-y-2 pt-1">
          {!complete && <p className="text-sm text-muted-foreground">{t("prediction.chooseAll")}</p>}
          <Button
            type="button"
            size="lg"
            className="h-11 w-full text-base"
            variant={hasSaved && !dirty ? "outline" : "default"}
            disabled={pending || !complete || (hasSaved && !dirty)}
            onClick={submit}
          >
            {pending && <Spinner />}
            {hasSaved && !dirty ? t("prediction.saved") : hasSaved ? t("prediction.update") : t("prediction.save")}
          </Button>
          {hasSaved && dirty && <p className="text-center text-xs font-medium text-muted-foreground">{t("prediction.unsaved")}</p>}
        </div>
      </div>
    </>
  )
}

function ScoreStepper({ value, onChange, team }: { value: number; onChange: (v: number) => void; team: string }) {
  const t = useTranslations("prediction")
  const btn =
    "flex h-7 w-12 items-center justify-center rounded text-background/70 outline-none hover:bg-background/10 hover:text-background focus-visible:ring-2 focus-visible:ring-points disabled:opacity-30"
  return (
    <div className="flex flex-col items-center">
      <button type="button" className={btn} onClick={() => onChange(Math.min(20, value + 1))} disabled={value >= 20} aria-label={t("increase", { team })}>
        <ChevronUp className="size-5" />
      </button>
      <output aria-live="polite" aria-label={team} className="w-12 text-center font-score text-5xl leading-none font-bold tabular">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={t("decrease", { team })}>
        <ChevronDown className="size-5" />
      </button>
    </div>
  )
}

function PickRow({
  label,
  mode,
  onModeChange,
  children,
}: {
  label: string
  mode: PickMode
  onModeChange: (m: PickMode) => void
  children: React.ReactNode
}) {
  const t = useTranslations("prediction")
  return (
    <fieldset className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="font-heading text-lg font-semibold">{label}</legend>
        <ToggleGroupPrimitive.Root
          type="single"
          value={mode}
          onValueChange={(v) => v && onModeChange(v as PickMode)}
          aria-label={label}
          className="inline-flex rounded-md bg-muted p-0.5"
        >
          {(["range", "exact"] as const).map((m) => (
            <ToggleGroupPrimitive.Item
              key={m}
              value={m}
              className="rounded px-2.5 py-1 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
            >
              {t(m)} <span className="text-xs opacity-70">{t(m === "range" ? "rangeHint" : "exactHint")}</span>
            </ToggleGroupPrimitive.Item>
          ))}
        </ToggleGroupPrimitive.Root>
      </div>
      {children}
    </fieldset>
  )
}

function RangePicker({
  ranges,
  value,
  onChange,
  label,
}: {
  ranges: readonly string[]
  value: string | null
  onChange: (v: string) => void
  label: string
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value ?? ""}
      onValueChange={(v) => v && onChange(v)}
      aria-label={label}
      className="grid grid-cols-4 gap-1.5"
    >
      {ranges.map((r) => (
        <ToggleGroupPrimitive.Item
          key={r}
          value={r}
          className="h-10 rounded-md border bg-background font-score text-lg font-semibold tabular outline-none hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {r}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}

function NumberStepper({
  value,
  onChange,
  max,
  label,
}: {
  value: number | null
  onChange: (v: number) => void
  max: number
  label: string
}) {
  const current = value ?? 0
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="icon-lg" onClick={() => onChange(Math.max(0, current - 1))} disabled={value === null || current <= 0} aria-label={`${label} −1`}>
        <Minus />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value ?? ""}
        placeholder="–"
        aria-label={label}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10)
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(0, n)))
        }}
        className="h-10 w-16 rounded-md border bg-background text-center font-score text-2xl font-semibold tabular outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="button" variant="outline" size="icon-lg" onClick={() => onChange(value === null ? 0 : Math.min(max, current + 1))} aria-label={`${label} +1`}>
        <Plus />
      </Button>
    </div>
  )
}

function LockedBody({
  match,
  prediction,
  score,
  picks,
  currentUserId,
}: {
  match: MatchView
  prediction: PredictionView | null
  score: ScoreView | null
  picks: OtherPick[] | null
  currentUserId: string
}) {
  const t = useTranslations()
  const hasResult = match.home_goals !== null && match.away_goals !== null && match.status !== "scheduled"

  return (
    <>
      <div className="pitch-soft grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 py-3 sm:gap-4 sm:px-4">
        <TeamColumn team={match.home} form={match.insights?.home_form} recent={match.insights?.home_recent} />
        <div className="flex flex-col items-center gap-1 pt-4">
          <div className="rounded-lg bg-foreground px-3 py-1.5 font-score text-5xl leading-none font-bold text-background tabular">
            {hasResult ? `${match.home_goals}:${match.away_goals}` : "–:–"}
          </div>
          {hasResult && match.status === "finished" && match.total_yellows !== null && (
            <span className="text-xs text-muted-foreground">
              {t("admin.stats", { yellows: match.total_yellows, corners: match.total_corners ?? 0 })}
            </span>
          )}
        </div>
        <TeamColumn team={match.away} form={match.insights?.away_form} recent={match.insights?.away_recent} />
      </div>

      <div className="space-y-3 border-t px-4 py-3">
        {prediction ? (
          <PickSummary prediction={prediction} score={score} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("fixtures.noPrediction")}</p>
        )}
        {match.status === "finished" && !score && prediction && (
          <p className="text-sm text-muted-foreground">{t("fixtures.awaitingResult")}</p>
        )}
        {(match.status === "scheduled" || match.status === "live") && (
          <p className="text-sm text-muted-foreground">{t("fixtures.awaitingResult")}</p>
        )}
        {picks && <PicksList picks={picks} currentUserId={currentUserId} />}
      </div>
    </>
  )
}

export function PickSummary({ prediction, score }: { prediction: PredictionView; score: ScoreView | null }) {
  const t = useTranslations()
  const total = prediction.home_goals + prediction.away_goals
  const rows: { label: string; pick: string; pts: number | undefined }[] = [
    {
      label: t("prediction.result"),
      pick: `${prediction.home_goals}:${prediction.away_goals}`,
      pts: score?.result_pts,
    },
    {
      label: t("prediction.totalGoals"),
      pick: prediction.goals_mode === "exact" ? `${total} (${t("prediction.exact").toLowerCase()})` : bucket("goals", total),
      pts: score?.goals_pts,
    },
    {
      label: t("prediction.yellowCards"),
      pick: describeStatPick(prediction.cards_mode, prediction.cards_range, prediction.cards_exact, t("prediction.exact")),
      pts: score?.cards_pts,
    },
    {
      label: t("prediction.corners"),
      pick: describeStatPick(prediction.corners_mode, prediction.corners_range, prediction.corners_exact, t("prediction.exact")),
      pts: score?.corners_pts,
    },
  ]

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">{t("fixtures.yourPick")}</span>
        {score && <PointsChip points={score.total_pts ?? 0} size="lg" />}
      </div>
      <dl className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="font-score text-base font-semibold tabular">{r.pick}</dd>
            <dd className="w-10 text-right">{r.pts !== undefined ? <PointsChip points={r.pts} /> : null}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
