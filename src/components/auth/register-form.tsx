"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { register, type AuthFormState } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/spinner"

export function RegisterForm({ next }: { next?: string }) {
  const t = useTranslations("auth")
  const [state, action, pending] = useActionState<AuthFormState, FormData>(register, {})

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-1.5">
        <Label htmlFor="displayName">{t("displayName")}</Label>
        <Input id="displayName" name="displayName" required minLength={2} maxLength={30} autoComplete="nickname" defaultValue={state.fields?.displayName} className="h-11" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} className="h-11" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="password-hint" className="h-11" />
        <p id="password-hint" className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}` as "errors.registerFailed")}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pending}>
        {pending && <Spinner />}
        {t("registerButton")}
      </Button>
      <p className="text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-primary underline-offset-4 hover:underline">
          {t("goLogin")}
        </Link>
      </p>
    </form>
  )
}
