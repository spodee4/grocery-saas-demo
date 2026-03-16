import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

const API_URL = process.env.COACH_API_URL || ""
const API_TOKEN = process.env.COACH_API_TOKEN || ""

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession()
  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { path } = await params
  const search = req.nextUrl.search
  const upstreamUrl = `${API_URL}/api/${path.join("/")}${search}`

  const res = await fetch(upstreamUrl, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
    next: { revalidate: 60 },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession()
  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { path } = await params
  const body = await req.json()
  const upstreamUrl = `${API_URL}/api/${path.join("/")}`

  const res = await fetch(upstreamUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
