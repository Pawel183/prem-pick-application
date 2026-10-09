export const locales = ["pl", "en"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "pl"
export const LOCALE_COOKIE = "NEXT_LOCALE"
export const TIME_ZONE = "Europe/Warsaw"

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}
