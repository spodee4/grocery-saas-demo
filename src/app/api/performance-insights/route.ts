import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getSession } from "@/lib/session"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const API_URL = process.env.COACH_API_URL || ""
const API_TOKEN = process.env.COACH_API_TOKEN || ""

export interface PerformanceInsights {
  generated_at: string
  bullets_working: string[]
  bullets_improve: string[]
  patterns: string[]
  narrative: string
  zone_comment: string
}

// Cache: date-keyed, 6hr TTL
const cache = new Map<string, { data: PerformanceInsights; ts: number }>()

async function fetchFromApi(path: string) {
  try {
    const r = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${API_TOKEN}` } })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const today = new Date().toISOString().split("T")[0]
  const force = req.nextUrl.searchParams.get("force") === "1"
  const cached = cache.get(today)
  if (cached && !force && Date.now() - cached.ts < 6 * 60 * 60 * 1000) {
    return NextResponse.json(cached.data)
  }

  const [dashboard, trendsRaw, workoutsRaw] = await Promise.all([
    fetchFromApi("/api/coaching/dashboard"),
    fetchFromApi("/api/coaching/trends?days=90"),
    fetchFromApi("/api/coaching/workouts?limit=14"),
  ])

  const trends: any[] = trendsRaw?.data ?? trendsRaw ?? []
  const workouts: any[] = workoutsRaw?.workouts ?? workoutsRaw ?? []
  const load = dashboard?.load
  const body = dashboard?.body

  const weightLb = body?.weight_kg ? Math.round(body.weight_kg * 2.20462) : null

  // Compute zone distribution from recent workouts
  const runWorkouts = workouts.filter((w: any) => w.workout_type === "run")
  const avgZ2 = runWorkouts.length > 0
    ? runWorkouts.reduce((sum: number, w: any) => sum + (w.zone2_pct ?? 0), 0) / runWorkouts.length
    : null

  const recentTrends = trends.slice(-30).map((t: any) => ({
    date: t.date,
    ctl: t.ctl,
    atl: t.atl,
    tsb: t.tsb,
    acwr: t.acwr,
    hrv: t.hrv_last_night,
    tss: t.tss,
    readiness: t.training_readiness_score,
  }))

  const recentWorkoutsSummary = workouts.slice(0, 10).map((w: any) => ({
    date: w.date,
    type: w.workout_type,
    duration_min: w.duration_min,
    distance_mi: w.distance_mi,
    avg_hr: w.avg_hr,
    tss: w.hrTSS,
    z2_pct: w.zone2_pct,
    title: w.class_title,
  }))

  const prompt = `You are a high-performance endurance sports coach analyzing an athlete's training data.

## ATHLETE PROFILE
- John Akins II, training for 100-mile ultra (July 18, 2026) — ${Math.ceil((new Date("2026-07-18").getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))} weeks out
- Phase: Build
- Lactate Threshold Heart Rate (LTHR): 167 bpm | Zone 2: 134-147 bpm | VO2 Max: ${load?.vo2_max ?? 49.3}
- Weight: ${weightLb ?? "~181"} lb → goal: 170 lb / ≤15% body fat by race day

## TODAY'S METRICS
- Chronic Training Load (CTL): ${load?.ctl?.toFixed(1) ?? "—"} (target 75+ by July)
- Acute Training Load (ATL): ${load?.atl?.toFixed(1) ?? "—"}
- Training Stress Balance (TSB): ${load?.tsb?.toFixed(1) ?? "—"}
- Acute:Chronic Workload Ratio (ACWR): ${load?.acwr?.toFixed(2) ?? "—"}
- Heart Rate Variability (HRV): ${load?.hrv_last_night ?? "—"} ms (avg: ${load?.hrv_weekly_avg ?? "—"})
- Training Readiness: ${load?.training_readiness_score ?? "—"}/100
- Zone 2 avg % on runs (last 2 weeks): ${avgZ2?.toFixed(0) ?? "—"}%

## 30-DAY TREND DATA
${JSON.stringify(recentTrends)}

## RECENT WORKOUTS (last 10)
${JSON.stringify(recentWorkoutsSummary)}

Based on this data, provide specific, data-driven insights. Be direct and use the actual numbers. No fluff.

Return ONLY a JSON object:
{
  "bullets_working": ["2-3 specific things going well, cite actual data values"],
  "bullets_improve": ["2-3 specific, actionable improvements with targets — use full metric names"],
  "patterns": ["1-2 correlations you can identify from the data, format: 'When X... Y tends to...'"],
  "narrative": "3-4 sentence first-person coach commentary — what the data says about this athlete's current state, biggest opportunity, and one clear action for this week. Be honest about low CTL/data gaps if present.",
  "zone_comment": "One sentence on their zone distribution balance and whether it supports ultra training"
}`

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    })

    const text = (msg.content[0] as any).text.trim()
    const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(jsonStr)

    const result: PerformanceInsights = {
      generated_at: new Date().toISOString(),
      ...parsed,
    }

    cache.set(today, { data: result, ts: Date.now() })
    return NextResponse.json(result)
  } catch (e) {
    console.error("Performance insights failed:", e)
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 })
  }
}
