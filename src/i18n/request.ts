import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"
import { defaultLocale, isLocale, LOCALE_COOKIE, TIME_ZONE } from "./config"

export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(value) ? value : defaultLocale

  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
