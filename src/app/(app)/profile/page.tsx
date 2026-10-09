import { getTranslations } from "next-intl/server"
import { requireUser } from "@/lib/auth"
import { DisplayNameForm } from "@/components/profile/display-name-form"
import { LocaleToggle } from "@/components/layout/locale-toggle"

export default async function ProfilePage() {
  const user = await requireUser()
  const t = await getTranslations("profile")

  return (
    <div className="mx-auto max-w-4xl">
      <div className="max-w-md">
      <h1 className="mb-6 text-4xl font-bold">{t("title")}</h1>
      <div className="space-y-6">
        <DisplayNameForm initial={user.displayName} />
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("email")}</p>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("language")}</p>
          <LocaleToggle />
        </div>
      </div>
    </div>
    </div>
  )
}
