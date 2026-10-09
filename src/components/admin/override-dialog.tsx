"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { clearOverride, overrideResult } from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/spinner"

type Props = {
  match: {
    id: number
    home: string
    away: string
    status: string
    isOverridden: boolean
    homeGoals: number | null
    awayGoals: number | null
    homeYellows: number | null
    awayYellows: number | null
    homeCorners: number | null
    awayCorners: number | null
  }
}

const FIELDS = [
  ["goals", "homeGoals", "awayGoals"],
  ["yellows", "homeYellows", "awayYellows"],
  ["corners", "homeCorners", "awayCorners"],
] as const

type Values = Record<(typeof FIELDS)[number][1 | 2], string>

export function OverrideDialog({ match }: Props) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<"finished" | "postponed" | "cancelled">("finished")
  const [values, setValues] = useState<Values>({
    homeGoals: String(match.homeGoals ?? 0),
    awayGoals: String(match.awayGoals ?? 0),
    homeYellows: String(match.homeYellows ?? 0),
    awayYellows: String(match.awayYellows ?? 0),
    homeCorners: String(match.homeCorners ?? 0),
    awayCorners: String(match.awayCorners ?? 0),
  })
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const res = await overrideResult({
        matchId: match.id,
        status,
        homeGoals: Number(values.homeGoals),
        awayGoals: Number(values.awayGoals),
        homeYellows: Number(values.homeYellows),
        awayYellows: Number(values.awayYellows),
        homeCorners: Number(values.homeCorners),
        awayCorners: Number(values.awayCorners),
      })
      if (res.ok) {
        toast.success(t("admin.overrideSaved", { scored: res.data?.scored ?? 0 }))
        setOpen(false)
      } else toast.error(t(`errors.${res.error}` as "errors.unknown"), { description: res.detail })
    })
  }

  function clear() {
    startTransition(async () => {
      const res = await clearOverride(match.id)
      if (res.ok) {
        toast.success(t("admin.overrideCleared"))
        setOpen(false)
      } else toast.error(t("errors.unknown"))
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("admin.override")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {t("admin.overrideTitle", { home: match.home, away: match.away })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("admin.status")}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["finished", "postponed", "cancelled"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 text-sm">
            <span />
            <span className="truncate text-center text-xs text-muted-foreground">{match.home}</span>
            <span className="truncate text-center text-xs text-muted-foreground">{match.away}</span>
            {FIELDS.map(([label, home, away]) => (
              <div key={label} className="contents">
                <span className="font-medium">{t(`admin.${label}`)}</span>
                {[home, away].map((key) => (
                  <Input
                    key={key}
                    type="number"
                    min={0}
                    max={30}
                    value={values[key]}
                    onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    aria-label={`${t(`admin.${label}`)}: ${key.startsWith("home") ? match.home : match.away}`}
                    className="h-10 text-center font-score text-lg"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {match.isOverridden ? (
            <Button variant="ghost" onClick={clear} disabled={pending}>
              {t("admin.clearOverride")}
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={pending}>
            {pending && <Spinner />}
            {t("admin.saveOverride")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
