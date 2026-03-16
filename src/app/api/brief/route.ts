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

const briefCache = new Map<string, { brief: CoachBrief; ts: number }>()

export interface CoachBrief {
  generated_at: string
  status: string
  today_plan: {
    type: string
    duration_min: number | null
    effort: string
    description: string
    key_focus: string
  }
  tomorrow_plan: {
    type: string
    duration_min: number | null
    effort: string
    preview: string
  }
  nutrition: {
    day_type: string
    calories_target: number
    carbs_g: number
    protein_g: number
    fat_g: number
    timing_tip: string
    meals: string[]
  }
  recovery: {
    primary: string
    protocol: string
    protein_shake: string     // "yes" or "no"
    shake_recipe: string | null
    stretch_yoga: string
    stretch_focus: string
    optional: string
  }
  daily_challenge: {
    name: string              // e.g. "Lunch Squat Drop"
    description: string       // what to do
    sets_reps: string         // e.g. "3 × 20 squats"
    timing: string            // "At lunch" / "Morning" / "Evening"
    why: string               // why this builds toward race goal
  }
  analysis: string
  alerts: string[]
  workout_notes: string
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date().toISOString().split("T")[0]
  const force = req.nextUrl.searchParams.get("force") === "1"

  const cached = briefCache.get(today)
  if (cached && !force && Date.now() - cached.ts < 6 * 60 * 60 * 1000) {
    return NextResponse.json(cached.brief)
  }

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
  const weightLb = body?.weight_kg ? (body.weight_kg * 2.20462).toFixed(0) : "~179"

  const prompt = `You are a personal endurance running coach for John Akins II. Generate his daily training brief.

## ATHLETE PROFILE
- 100-mile ultra race: July 18, 2026 (${Math.ceil((new Date("2026-07-18").getTime() - Date.now()) / (7*24*60*60*1000))} weeks out)
- Current phase: Build (→ June 1), then Peak (→ June 28), then Taper
- Max HR: 187 | LTHR: 167 | Zone 2: 134-147 bpm | Resting HR: 54 baseline
- Zone model: Polarized — 77% easy (Z1+Z2), 23% hard
- VO2 max: 49.3 (target 55+ by race day)
- Weight: ${weightLb} lb (${body?.weight_kg?.toFixed(1) ?? "~81"} kg) | Body fat: ${body?.fat_ratio?.toFixed(1) ?? "~18"}%
- Body GOALS: reach 170 lb and ≤15% body fat by race day (currently ~${weightLb} lb / ${body?.fat_ratio?.toFixed(1) ?? "~18"}%)
- Cross-training: Peloton bike, gym + kettlebells
- Recovery tools available: sauna, cold plunge, red light therapy, steam room

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
- Always: 180-200g protein/day, minimize processed food
- Post-run window (45 min): 80-100g carbs + 35-40g protein, low fat
- Body composition goal: gradual cut toward 170 lb — don't sacrifice training fuel

## RECOVERY TOOLS
Available: sauna, cold plunge, red light therapy, steam room
- Cold plunge protocol: 3-5 min at 50-55°F after hard workouts
- Sauna: 15-20 min after easy days or post-cold-plunge contrast
- Red light: 10-20 min any time, especially for muscle recovery
- Yoga/stretching: tailor to muscle groups used in recent workouts

## INSTRUCTIONS
Respond with ONLY a JSON object. No markdown, no explanation:

{
  "status": "one-line status",
  "today_plan": {
    "type": "Easy Run / Rest / Strength / Peloton / Long Run / Tempo / Yoga / Cross-train",
    "duration_min": number or null,
    "effort": "Zone 2 / Recovery / Threshold / Easy / Rest",
    "description": "2-3 specific sentences about what to do and why given current metrics",
    "key_focus": "one thing to nail today"
  },
  "tomorrow_plan": {
    "type": "workout type",
    "duration_min": number or null,
    "effort": "effort level",
    "preview": "one sentence"
  },
  "nutrition": {
    "day_type": "Easy day / Moderate day / Long run day / Rest day",
    "calories_target": number,
    "carbs_g": number,
    "protein_g": number,
    "fat_g": number,
    "timing_tip": "specific timing advice",
    "meals": ["breakfast", "lunch", "dinner", "snack or pre-workout"]
  },
  "recovery": {
    "primary": "best recovery tool for this specific workout — cold plunge only for runs/cardio NOT weights (heat/sauna/red-light better post-weights), or stretching/yoga for rest days",
    "protocol": "specific duration and temp e.g. '4 min at 52°F' or '20 min sauna at 170°F'",
    "protein_shake": "yes/no and specific recipe if yes — always yes on training days within 30-45 min of workout",
    "shake_recipe": "e.g. '2 scoops whey + banana + almond milk + oats — ~50g protein, 60g carbs' or null if rest day",
    "stretch_yoga": "specific routine e.g. 'Hip flexor + ITB release, 15 min'",
    "stretch_focus": "muscle groups to target based on last workout",
    "optional": "secondary recovery option e.g. red light 20 min or steam 15 min"
  },
  "daily_challenge": {
    "name": "creative challenge name e.g. Lunch Leg Drop",
    "description": "what to do — be specific and fun",
    "sets_reps": "e.g. 3 × 20 squats, rest 60s between sets",
    "timing": "Morning / At lunch / Evening / Anytime",
    "why": "how this builds toward the 100-mile race"
  },
  "analysis": "3-4 sentences coaching insight on fitness trajectory",
  "alerts": ["alert if any — keep to real concerns only, empty array if none"],
  "workout_notes": "2-3 sentences on last workout pattern and what it means"
}`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    })

    const text = (message.content[0] as any).text.trim()
    const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(jsonStr)

    const brief: CoachBrief = { generated_at: new Date().toISOString(), ...parsed }
    briefCache.set(today, { brief, ts: Date.now() })
    return NextResponse.json(brief)
  } catch (e) {
    console.error("Brief generation failed:", e)
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 })
  }
}
