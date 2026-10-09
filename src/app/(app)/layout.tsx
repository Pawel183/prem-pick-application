import { requireUser } from "@/lib/auth"
import { AppHeader } from "@/components/layout/app-header"
import { MobileNav } from "@/components/layout/mobile-nav"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser()
  const isAdmin = user.role === "admin"

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader displayName={user.displayName} isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-12">{children}</main>
      <MobileNav isAdmin={isAdmin} />
    </div>
  )
}
