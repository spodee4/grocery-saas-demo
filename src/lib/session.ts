import { getIronSession, SessionOptions } from "iron-session"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export interface SessionData {
  authenticated?: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "jc-coach-session-secret-fallback-dev",
  cookieName: "jc-coach-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function getSessionFromRequest(req: NextRequest, res: NextResponse) {
  return getIronSession<SessionData>(req, res, sessionOptions)
}
