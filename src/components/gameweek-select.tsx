"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function GameweekSelect({
  options,
  value,
  basePath,
  label,
  className,
}: {
  options: number[]
  value: number | undefined
  basePath: string
  label: string
  className?: string
}) {
  const t = useTranslations("common")
  const router = useRouter()
  const searchParams = useSearchParams()
  return (
    <div className={className}>
      <Select value={value ? String(value) : undefined} onValueChange={(v) => {
          const query = new URLSearchParams(searchParams)
          query.set("gw", v)
          router.push(`${basePath}?${query}`, { scroll: false })
        }}>
        <SelectTrigger aria-label={label} className="h-10 w-48">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {t("gameweek", { number: n })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
