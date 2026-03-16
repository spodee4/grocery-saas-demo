import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"
import type { SessionData } from "@/lib/session"
import { sessionOptions } from "@/lib/session"

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return res
  }

  if (!session.authenticated) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
