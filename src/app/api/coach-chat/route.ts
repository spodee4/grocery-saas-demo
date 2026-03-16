import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getSession } from "@/lib/session"
import { readLifeContext } from "@/app/api/life-context/route"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const API_URL = process.env.COACH_API_URL || ""
const API_TOKEN = process.env.COACH_API_TOKEN || ""

async function fetchMacMini(path: string) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messages }: { messages: ChatMessage[] } = await req.json()
  if (!messages?.length) {
    return NextResponse.json({ error: "No messages" }, { status: 400 })
  }

  const [dashboard, workoutsRaw, trendsRaw] = await Promise.all([
    fetchMacMini("/api/coaching/dashboard"),
    fetchMacMini("/api/coaching/workouts?limit=10"),
    fetchMacMini("/api/coaching/trends?days=14"),
  ])

  const load = dashboard?.load
  const body = dashboard?.body
  const lastWorkout = dashboard?.last_workout
  const workouts = workoutsRaw?.workouts ?? []
  const trends = trendsRaw?.data ?? []
  const today = new Date().toISOString().split("T")[0]
  const weightLb = body?.weight_kg ? (body.weight_kg * 2.20462).toFixed(0) : "~179"
  const weeksOut = Math.ceil((new Date("2026-07-18").getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))

  const systemPrompt = `You are Coach JC — a direct, knowledgeable personal endurance running coach for John Akins II. You have full access to his training data. Be conversational, specific, and actionable. No fluff. Use full metric names on first use (e.g., "Chronic Training Load (CTL)") then abbreviations after.

## ATHLETE
- 100-mile ultra: Javelina Jundred, July 18, 2026 (${weeksOut} weeks out)
- Phase: Build → Peak (June 1) → Taper (June 28)
- Max HR: 187 | LTHR: 167 | Zone 2: 134-147 bpm | Resting HR: 54
- Zone model: Polarized — 77% easy (Z1+Z2), 23% hard
- VO2 max: 49.3 (target 55+ by race day)
- Weight: ${weightLb} lb | Body fat: ${body?.fat_ratio?.toFixed(1) ?? "~18"}%
- Goals: 170 lb + ≤15% body fat by race day
- Recovery: sauna, cold plunge, red light therapy, steam
- No breakfast (IF) — eats lunch + snack + dinner

## TODAY'S METRICS (${today})
- Chronic Training Load (CTL): ${load?.ctl?.toFixed(1) ?? "unknown"} | Target at race: 75+
- Acute Training Load (ATL): ${load?.atl?.toFixed(1) ?? "unknown"}
- Training Stress Balance (TSB): ${load?.tsb?.toFixed(1) ?? "unknown"}
- Acute:Chronic Workload Ratio (ACWR): ${load?.acwr?.toFixed(2) ?? "unknown"} (safe: 0.8–1.3)
- Heart Rate Variability (HRV): ${load?.hrv_last_night ?? "no data"} | Status: ${load?.hrv_status ?? "unknown"}
- Resting HR: ${load?.resting_hr ?? "unknown"} bpm
- Sleep: ${load?.sleep_seconds ? `${(load.sleep_seconds / 3600).toFixed(1)}h` : "no data"}
- Body battery: ${load?.body_battery_wake ?? "unknown"}
- Training readiness: ${load?.training_readiness_score ?? "unknown"} (${load?.training_readiness_level ?? "unknown"})

## LAST WORKOUT
${lastWorkout ? `${lastWorkout.date}: ${lastWorkout.workout_type} — ${lastWorkout.duration_min?.toFixed(0)}min, avg HR ${lastWorkout.avg_hr ?? "N/A"}, TSS ${lastWorkout.hrTSS?.toFixed(0) ?? "N/A"} | ${lastWorkout.class_title ?? ""}` : "No recent workout"}

## RECENT 10 WORKOUTS
${workouts.slice(0, 10).map((w: any) => `- ${w.date}: ${w.workout_type} ${w.duration_min?.toFixed(0)}min | HR ${w.avg_hr ?? "—"} | TSS ${w.hrTSS?.toFixed(0) ?? "—"}`).join("\n") || "No data"}

## 14-DAY TREND
${trends.slice(-7).map((t: any) => `- ${t.date}: CTL ${t.ctl?.toFixed(1) ?? "—"} ATL ${t.atl?.toFixed(1) ?? "—"} TSB ${t.tsb?.toFixed(1) ?? "—"} HRV ${t.hrv_last_night ?? "—"}`).join("\n") || "No data"}

## NUTRITION
- Easy day: ~2,600–2,900 kcal | Moderate: ~3,000–3,300 | Long run: ~3,900–4,400
- Always: 180–200g protein/day. Slight deficit on rest days for body recomp.
- Post-workout (45 min): 80–100g carbs + 35–40g protein
- Favorite: frozen banana + blueberries + protein powder + Greek yogurt shake

${(() => { const lc = readLifeContext(); return lc.notes.length > 0 ? `## ATHLETE LIFE CONTEXT (override training recommendations accordingly)\n${lc.notes.map((n: string) => `- ${n}`).join("\n")}\n\n` : "" })()}Answer the athlete's question directly. If the athlete tells you about upcoming travel, events, illness, or life changes — acknowledge it and adjust your advice. If they say "remember this" or "save this", confirm you'll factor it in for this session (note: persistent saving requires the Notes to Coach feature on the Today tab). If they mention eating something, performance they noticed, or ask about a metric — give a specific, data-informed response. Keep replies under 200 words unless they ask for a detailed breakdown.

CRITICAL: Always spell out metric names fully on first use, with abbreviation in parentheses: "Chronic Training Load (CTL)", "Acute Training Load (ATL)", "Training Stress Balance (TSB)", "Acute:Chronic Workload Ratio (ACWR)", "Heart Rate Variability (HRV)", "VO2 max". After first use, abbreviations are fine.`

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const reply = (response.content[0] as any).text
    return NextResponse.json({ reply })
  } catch (e) {
    console.error("Coach chat failed:", e)
    return NextResponse.json({ error: "Coach is unavailable" }, { status: 500 })
  }
}
