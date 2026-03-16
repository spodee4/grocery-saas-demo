import { NextRequest, NextResponse } from "next/server"

const JC_API_URL = process.env.JC_API_URL ?? "http://akinss-mac-mini.tail656e16.ts.net:5160"
const JC_API_TOKEN = process.env.JC_API_TOKEN ?? "cb-macbook-2026"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const store = searchParams.get("store") ?? "381"

  try {
    const res = await fetch(
      `${JC_API_URL}/api/ops/dept-pnl?store=${store}`,
      {
        headers: { Authorization: `Bearer ${JC_API_TOKEN}` },
        next: { revalidate: 300 },  // cache 5 min
      }
    )
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: "Could not reach data source" }, { status: 503 })
  }
}
