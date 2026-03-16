import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title, body } = await req.json()
  if (!title || !body) {
    return NextResponse.json({ error: "Missing title or body" }, { status: 400 })
  }

  // Escape for AppleScript: backslash-escape backslashes first, then quotes, then newlines
  const escaped = body
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")

  const script = `tell application "Notes"
    tell account "iCloud"
      make new note at folder "Notes" with properties {name:"${title}", body:"${escaped}"}
    end tell
  end tell`

  try {
    await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("Notes creation failed:", e)
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 })
  }
}
