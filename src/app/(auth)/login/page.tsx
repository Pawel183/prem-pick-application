import { getTranslations } from "next-intl/server"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams
  const t = await getTranslations("auth")
  return (
    <>
      <h1 className="text-4xl font-bold">{t("loginTitle")}</h1>
      <p className="mt-1 mb-6 text-muted-foreground">{t("loginSubtitle")}</p>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </>
  )
}
