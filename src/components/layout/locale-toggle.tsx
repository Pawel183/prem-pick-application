"use client"

import { useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { setLocale } from "@/actions/profile"
import { locales } from "@/i18n/config"
import { cn } from "@/lib/utils"

export function LocaleToggle({ className }: { className?: string }) {
  const current = useLocale()
  const t = useTranslations()
  const [pending, startTransition] = useTransition()

  return (
    <div role="group" aria-label={t("nav.language")} className={cn("inline-flex rounded-md border bg-card p-0.5", pending && "opacity-60", className)}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          aria-pressed={current === locale}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await setLocale(locale)
              if (!res.ok) toast.error(t("errors.unknown"))
            })
          }
          className={cn(
            "min-w-9 rounded px-2 py-1 text-sm font-semibold uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring",
            current === locale ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {locale}
        </button>
      ))}
    </div>
  )
}
