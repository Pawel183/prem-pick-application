import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/register"]

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const isAuthed = Boolean(data?.claims?.sub)
  const { pathname, search } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!isAuthed && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`
    return withCookies(NextResponse.redirect(url), response)
  }

  if (isAuthed && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return withCookies(NextResponse.redirect(url), response)
  }

  return response
}

function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie))
  return target
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
