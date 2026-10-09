import { getTranslations } from "next-intl/server"
import { RegisterForm } from "@/components/auth/register-form"

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams
  const t = await getTranslations("auth")
  return (
    <>
      <h1 className="text-4xl font-bold">{t("registerTitle")}</h1>
      <p className="mt-1 mb-6 text-muted-foreground">{t("registerSubtitle")}</p>
      <RegisterForm next={typeof next === "string" ? next : undefined} />
    </>
  )
}
