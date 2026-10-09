"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { createLeague, joinLeague } from "@/actions/leagues"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/spinner"

export function CreateLeagueForm() {
  const t = useTranslations()
  const router = useRouter()
  const [name, setName] = useState("")
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const res = await createLeague(name)
          if (res.ok) {
            toast.success(t("leagues.created", { code: res.data!.inviteCode }))
            setName("")
            router.push(`/leaderboard?league=${res.data!.id}`, { scroll: false })
          } else toast.error(t(`errors.${res.error}` as "errors.unknown"))
        })
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("leagues.createPlaceholder")}
        aria-label={t("leagues.createPlaceholder")}
        minLength={2}
        maxLength={40}
        required
        className="h-10"
      />
      <Button type="submit" size="lg" className="h-10" disabled={pending}>
        {pending && <Spinner />}
        {t("leagues.createButton")}
      </Button>
    </form>
  )
}

export function JoinLeagueForm({ initialCode = "", redirectOnJoin = false }: { initialCode?: string; redirectOnJoin?: boolean }) {
  const t = useTranslations()
  const router = useRouter()
  const [code, setCode] = useState(initialCode)
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const res = await joinLeague(code)
          if (res.ok) {
            const { id, name, alreadyMember } = res.data!
            toast.success(t(alreadyMember ? "leagues.alreadyMember" : "leagues.joined", { name }))
            setCode("")
            if (redirectOnJoin) router.push(`/leaderboard?league=${id}`)
            else router.push(`/leaderboard?league=${id}`, { scroll: false })
          } else toast.error(t(`errors.${res.error}` as "errors.unknown"))
        })
      }}
    >
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder={t("leagues.joinPlaceholder")}
        aria-label={t("leagues.joinPlaceholder")}
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={16}
        required
        className="h-10 font-score text-lg tracking-wider"
      />
      <Button type="submit" size="lg" className="h-10" disabled={pending}>
        {pending && <Spinner />}
        {t("leagues.joinButton")}
      </Button>
    </form>
  )
}
