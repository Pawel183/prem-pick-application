import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export function PointsChip({ points, size = "sm" }: { points: number; size?: "sm" | "lg" }) {
  const t = useTranslations("common")
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded font-score font-bold tabular",
        size === "lg" ? "px-2 py-0.5 text-lg" : "min-w-8 px-1.5 text-sm",
        points > 0 ? "bg-points text-foreground" : "bg-muted text-muted-foreground"
      )}
    >
      {t("pts", { count: points })}
    </span>
  )
}
