import type { Metadata, Viewport } from "next"
import { Barlow, Barlow_Condensed } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale } from "next-intl/server"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
})

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "Prem Picks",
  description: "Premier League predictions for friends",
}

export const viewport: Viewport = {
  themeColor: "#0e7c47",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale()

  return (
    <html lang={locale} className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
