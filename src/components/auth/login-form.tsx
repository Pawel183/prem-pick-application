"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { login, type AuthFormState } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/spinner"

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth")
  const [state, action, pending] = useActionState<AuthFormState, FormData>(login, {})

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} className="h-11" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11" />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}` as "errors.invalidCredentials")}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pending}>
        {pending && <Spinner />}
        {t("loginButton")}
      </Button>
      <p className="text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-medium text-primary underline-offset-4 hover:underline">
          {t("goRegister")}
        </Link>
      </p>
    </form>
  )
}
