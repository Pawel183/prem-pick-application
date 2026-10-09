"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { updateDisplayName } from "@/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/spinner"

export function DisplayNameForm({ initial }: { initial: string }) {
  const t = useTranslations()
  const [name, setName] = useState(initial)
  const [pending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const res = await updateDisplayName(name)
          if (res.ok) toast.success(t("profile.nameSaved"))
          else toast.error(t(`errors.${res.error}` as "errors.unknown"))
        })
      }}
    >
      <Label htmlFor="displayName" className="mb-1.5">{t("profile.displayName")}</Label>
      <div className="flex gap-2">
        <Input id="displayName" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={30} required className="h-10" />
        <Button type="submit" size="lg" className="h-10" disabled={pending || name.trim() === initial}>
          {pending && <Spinner />}
          {t("profile.saveName")}
        </Button>
      </div>
    </form>
  )
}
