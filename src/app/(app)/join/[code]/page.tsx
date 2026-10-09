import { getTranslations } from "next-intl/server"
import { JoinLeagueForm } from "@/components/leagues/league-forms"

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params
  const t = await getTranslations("join")
  const normalized = decodeURIComponent(code).toUpperCase()

  return (
    <div className="mx-auto max-w-md pt-6">
      <h1 className="mb-2 text-4xl font-bold">{t("title")}</h1>
      <p className="mb-5 text-muted-foreground">{t("body", { code: normalized })}</p>
      <JoinLeagueForm initialCode={normalized} redirectOnJoin />
    </div>
  )
}
