"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { saveMatchStats } from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/spinner"

type Props = {
  match: {
    id: number
    home: string
    away: string
    homeYellows: number | null
    awayYellows: number | null
    homeCorners: number | null
    awayCorners: number | null
  }
  highlight: boolean
}

const ROWS = [
  ["yellows", "homeYellows", "awayYellows", 20],
  ["corners", "homeCorners", "awayCorners", 30],
] as const

type Key = (typeof ROWS)[number][1 | 2]

/** Quick entry of yellow cards + corners for providers that don't supply match statistics. */
export function StatsDialog({ match, highlight }: Props) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<Key, string>>({
    homeYellows: match.homeYellows?.toString() ?? "",
    awayYellows: match.awayYellows?.toString() ?? "",
    homeCorners: match.homeCorners?.toString() ?? "",
    awayCorners: match.awayCorners?.toString() ?? "",
  })
  const [pending, startTransition] = useTransition()
  const complete = Object.values(values).every((v) => v !== "" && Number(v) >= 0)

  function save() {
    startTransition(async () => {
      const res = await saveMatchStats({
        matchId: match.id,
        homeYellows: Number(values.homeYellows),
        awayYellows: Number(values.awayYellows),
        homeCorners: Number(values.homeCorners),
        awayCorners: Number(values.awayCorners),
      })
      if (res.ok) {
        toast.success(t("admin.statsSaved", { scored: res.data?.scored ?? 0 }))
        setOpen(false)
      } else toast.error(t(`errors.${res.error}` as "errors.unknown"), { description: res.detail })
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={highlight ? "default" : "outline"}>
          {t("admin.enterStats")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {t("admin.statsTitle", { home: match.home, away: match.away })}
          </DialogTitle>
          <DialogDescription>{t("admin.statsHint")}</DialogDescription>
        </DialogHeader>
        <form
          id={`stats-${match.id}`}
          className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            if (complete) save()
          }}
        >
          <span />
          <span className="truncate text-center text-xs text-muted-foreground">{match.home}</span>
          <span className="truncate text-center text-xs text-muted-foreground">{match.away}</span>
          {ROWS.map(([label, home, away, max]) => (
            <div key={label} className="contents">
              <span className="font-medium">{t(`admin.${label}`)}</span>
              {[home, away].map((key) => (
                <Input
                  key={key}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={max}
                  required
                  value={values[key]}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  aria-label={`${t(`admin.${label}`)}: ${key.startsWith("home") ? match.home : match.away}`}
                  className="h-11 text-center font-score text-xl"
                />
              ))}
            </div>
          ))}
        </form>
        <DialogFooter>
          <Button type="submit" form={`stats-${match.id}`} disabled={pending || !complete}>
            {pending && <Spinner />}
            {t("admin.saveStats")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
