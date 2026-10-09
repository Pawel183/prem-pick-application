import { getTranslations } from "next-intl/server"
import { LocaleToggle } from "@/components/layout/locale-toggle"

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("common")
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <span className="font-heading text-2xl font-bold tracking-wide">{t("appName")}</span>
        <LocaleToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
