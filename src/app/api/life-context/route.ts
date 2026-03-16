import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"

const CACHE_DIR = join(process.env.HOME || "/tmp", ".jc-coach-cache")
const CONTEXT_FILE = join(CACHE_DIR, "life-context.json")

export interface LifeContext {
  notes: string[]
  updated_at: string
}

export function readLifeContext(): LifeContext {
  try {
    if (!existsSync(CONTEXT_FILE)) return { notes: [], updated_at: "" }
    return JSON.parse(readFileSync(CONTEXT_FILE, "utf-8"))
  } catch {
    return { notes: [], updated_at: "" }
  }
}

function writeLifeContext(ctx: LifeContext) {
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(CONTEXT_FILE, JSON.stringify(ctx, null, 2))
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json(readLifeContext())
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { action, note, index } = await req.json()

  const ctx = readLifeContext()

  if (action === "add" && note?.trim()) {
    ctx.notes.push(note.trim())
    ctx.updated_at = new Date().toISOString().split("T")[0]
    writeLifeContext(ctx)
  } else if (action === "remove" && typeof index === "number") {
    ctx.notes.splice(index, 1)
    ctx.updated_at = new Date().toISOString().split("T")[0]
    writeLifeContext(ctx)
  } else if (action === "clear") {
    ctx.notes = []
    ctx.updated_at = new Date().toISOString().split("T")[0]
    writeLifeContext(ctx)
  }

  return NextResponse.json(ctx)
}
