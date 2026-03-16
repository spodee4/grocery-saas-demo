import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"
import type { SessionData } from "@/lib/session"
import { sessionOptions } from "@/lib/session"

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  const { pin } = await req.json()

  if (pin !== process.env.COACH_PIN) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 })
  }

  const session = await getIronSession<SessionData>(req, res, sessionOptions)
  session.authenticated = true
  await session.save()

  return res
}
