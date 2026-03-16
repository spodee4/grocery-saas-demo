import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getSession } from "@/lib/session"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const API_URL = process.env.COACH_API_URL || ""
const API_TOKEN = process.env.COACH_API_TOKEN || ""

async function fetchMacMini(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
    next: { revalidate: 0 },
  })
  if (!res.ok) return null
  return res.json()
}

// Simple in-memory cache keyed by date — regenerates once per day
const briefCache = new Map<string, { brief: CoachBrief; ts: number }>()

export interface CoachBrief {
  generated_at: string
  status: string                  // one-liner: "Ready to train" / "Rest day" etc
  today_plan: {
    type: string                  // "Easy run" / "Rest" / "Strength" etc
    duration_min: number | null
    effort: string                // "Zone 2" / "Recovery" / "Tempo" etc
    description: string           // 2-3 sentences with specifics
    key_focus: string             // one thing to nail today
  }
  tomorrow_plan: {
    type: string
    duration_min: number | null
    effort: string
    preview: string               // 1 sentence teaser
  }
  nutrition: {
    day_type: string              // "Easy day" / "Moderate" / "Long run day"
    calories_target: number
    carbs_g: number
    protein_g: number
    fat_g: number
    timing_tip: string            // post-workout window or pre-run fuel advice
    meals: string[]               // 3-4 meal/snack suggestions
  }
  analysis: string                // 3-4 sentence coaching insight on current metrics
  alerts: string[]                // flags (overreach, low HRV, taper ready, etc)
  workout_notes: string           // reflection on last workout — what it means for fitness
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date().toISOString().split("T")[0]
  const force = req.nextUrl.searchParams.get("force") === "1"

  // Return cached brief if same day and not forced
  const cached = briefCache.get(today)
  if (cached && !force && Date.now() - cached.ts < 6 * 60 * 60 * 1000) {
    return NextResponse.json(cached.brief)
  }

  // Fetch live data from Mac mini
  const [dashboard, workoutsRaw, trendsRaw] = await Promise.all([
    fetchMacMini("/api/coaching/dashboard"),
    fetchMacMini("/api/coaching/workouts?limit=7"),
    fetchMacMini("/api/coaching/trends?days=14"),
  ])

  const workouts = workoutsRaw?.workouts ?? []
  const trends = trendsRaw?.data ?? []
  const load = dashboard?.load
  const body = dashboard?.body
  const lastWorkout = dashboard?.last_workout

  const prompt = `You are a personal endurance running coach for John Akins II. Generate his daily training brief.

## ATHLETE PROFILE
- 100-mile ultra race: July 18, 2026 (${Math.ceil((new Date("2026-07-18").getTime() - Date.now()) / (7*24*60*60*1000))} weeks out)
- Current phase: Build (→ June 1), then Peak (→ June 28), then Taper
- Max HR: 187 | LTHR: 167 | Zone 2: 134-147 bpm | Resting HR: 54 baseline
- Zone model: Polarized — 77% easy (Z1+Z2), 23% hard
- VO2 max: 49.3 (target 55+ by race day)
- Weight: ${body?.weight_kg ? `${body.weight_kg.toFixed(1)} kg` : "~81 kg"} | Body fat: ${body?.fat_ratio ? `${body.fat_ratio.toFixed(1)}%` : "~18%"}
- Cross-training: Peloton bike, gym + kettlebells

## TODAY'S METRICS (${today})
- CTL (fitness): ${load?.ctl?.toFixed(1) ?? "unknown"} | Target at race: 75+
- ATL (fatigue): ${load?.atl?.toFixed(1) ?? "unknown"}
- TSB (form): ${load?.tsb?.toFixed(1) ?? "unknown"} (positive = fresh, negative = fatigued)
- ACWR: ${load?.acwr?.toFixed(2) ?? "unknown"} (safe zone: 0.8-1.3, danger > 1.3)
- HRV last night: ${load?.hrv_last_night ?? "no data"} | Status: ${load?.hrv_status ?? "unknown"}
- Resting HR: ${load?.resting_hr ?? "unknown"} bpm
- Sleep: ${load?.sleep_seconds ? `${(load.sleep_seconds/3600).toFixed(1)}h` : "no data"}
- Body battery (wake): ${load?.body_battery_wake ?? "unknown"}
- Training readiness: ${load?.training_readiness_score ?? "unknown"} (${load?.training_readiness_level ?? "unknown"})
- Steps today: ${load?.steps?.toLocaleString() ?? "unknown"}
- Stress avg: ${load?.stress_avg ?? "unknown"}

## LAST WORKOUT
${lastWorkout ? `- ${lastWorkout.date}: ${lastWorkout.workout_type} — ${lastWorkout.duration_min?.toFixed(0)}min, avg HR ${lastWorkout.avg_hr ?? "N/A"}, TSS ${lastWorkout.hrTSS?.toFixed(0) ?? "N/A"}
- Class: ${lastWorkout.class_title ?? "N/A"}` : "No recent workout data"}

## RECENT 7 WORKOUTS
${workouts.slice(0, 7).map((w: any) => `- ${w.date}: ${w.workout_type} ${w.duration_min?.toFixed(0)}min | HR ${w.avg_hr ?? "—"} | TSS ${w.hrTSS?.toFixed(0) ?? "—"} | ${w.class_title ?? ""}`).join("\n") || "No data"}

## 14-DAY LOAD TREND
${trends.slice(-7).map((t: any) => `- ${t.date}: CTL ${t.ctl?.toFixed(1) ?? "—"} ATL ${t.atl?.toFixed(1) ?? "—"} TSB ${t.tsb?.toFixed(1) ?? "—"} HRV ${t.hrv_last_night ?? "—"}`).join("\n") || "No data"}

## NUTRITION REFERENCE
- Easy day: 4-5g/kg carbs, ~2,600-2,900 kcal total
- Moderate day: 6-7g/kg carbs, ~3,000-3,300 kcal total
- Long run day: 8g/kg carbs, ~3,900-4,400 kcal total
- Always: 180-200g protein/day
- Post-run window (45 min): 80-100g carbs + 35-40g protein, low fat

## INSTRUCTIONS
Respond with ONLY a JSON object matching this exact schema. No markdown, no explanation, just the JSON:

{
  "status": "one-line status like Ready to train / Rest day needed / Fresh and building",
  "today_plan": {
    "type": "workout type e.g. Easy Run / Rest / Strength / Peloton / Long Run / Tempo",
    "duration_min": number or null,
    "effort": "e.g. Zone 2 / Recovery / Threshold / Easy",
    "description": "2-3 specific sentences about what to do and why given current metrics",
    "key_focus": "one thing to absolutely nail today"
  },
  "tomorrow_plan": {
    "type": "workout type",
    "duration_min": number or null,
    "effort": "effort level",
    "preview": "one sentence preview"
  },
  "nutrition": {
    "day_type": "Easy day / Moderate day / Long run day / Rest day",
    "calories_target": number,
    "carbs_g": number,
    "protein_g": 190,
    "fat_g": number,
    "timing_tip": "specific timing advice for today",
    "meals": ["breakfast idea", "lunch idea", "dinner idea", "snack if needed"]
  },
  "analysis": "3-4 sentences coaching insight: what the metrics say about fitness trajectory, any concerns, what's working",
  "alerts": ["alert string if any — overreach, low HRV, taper window, etc"],
  "workout_notes": "2-3 sentences reflecting on the last workout — what it means for fitness, any patterns noticed"
}`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const text = (message.content[0] as any).text.trim()
    // Strip markdown if model wrapped it
    const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(jsonStr)

    const brief: CoachBrief = {
      generated_at: new Date().toISOString(),
      ...parsed,
    }

    briefCache.set(today, { brief, ts: Date.now() })
    return NextResponse.json(brief)
  } catch (e) {
    console.error("Brief generation failed:", e)
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 })
  }
}
