import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getSession } from "@/lib/session"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const API_URL = process.env.COACH_API_URL || ""
const API_TOKEN = process.env.COACH_API_TOKEN || ""

// Cache keyed by week start (Monday)
const mealCache = new Map<string, { plan: WeeklyMealPlan; ts: number }>()

export interface DayMeals {
  day: string              // "Monday"
  date: string             // "2026-03-16"
  training_type: string    // "Easy Run" / "Rest" / "Long Run" etc
  calories: number
  carbs_g: number
  protein_g: number
  fat_g: number
  breakfast: string
  breakfast_macros: string // "~40g carbs, 30g protein"
  lunch: string
  lunch_macros: string
  dinner: string
  dinner_macros: string
  snacks: string[]         // 1-2 snacks or protein shakes
  pre_workout: string | null
  post_workout: string | null
  hydration_tip: string
}

export interface WeeklyMealPlan {
  generated_at: string
  week_start: string
  theme: string            // e.g. "Build week — prioritize carb loading on run days"
  days: DayMeals[]
  shopping_list: string[]  // top 20 items to have stocked
  meal_prep_tips: string[] // 3-4 tips for batch cooking this week
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split("T")[0]
}

function getWeekDays(start: string): { day: string; date: string }[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const startDate = new Date(start)
  return days.map((day, i) => {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    return { day, date: d.toISOString().split("T")[0] }
  })
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const weekStart = getWeekStart()
  const force = req.nextUrl.searchParams.get("force") === "1"

  const cached = mealCache.get(weekStart)
  if (cached && !force && Date.now() - cached.ts < 12 * 60 * 60 * 1000) {
    return NextResponse.json(cached.plan)
  }

  // Get trends to know training days
  let trendsData: any[] = []
  try {
    const tr = await fetch(`${API_URL}/api/coaching/trends?days=7`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    })
    if (tr.ok) {
      const d = await tr.json()
      trendsData = d?.data ?? []
    }
  } catch {}

  const weekDays = getWeekDays(weekStart)
  const weightKg = 81.2  // approximate — will be dynamic if body data available
  const weightLb = Math.round(weightKg * 2.20462)

  const prompt = `You are a sports nutritionist for an ultra-endurance athlete. Create a full week meal plan.

## ATHLETE
- John Akins II, ${weightLb} lb (${weightKg} kg), training for 100-mile ultra (July 18, 2026)
- Phase: Build — 18 weeks out
- Goals: Fuel training performance + gradual body recomposition (target 170 lb / ≤15% body fat by race day)
- ALWAYS: 180-200g protein/day minimum
- Recovery tools: sauna, cold plunge, red light

## WEEK OF ${weekStart}
Days: ${weekDays.map(d => d.day + " " + d.date).join(", ")}

## NUTRITION TARGETS BY DAY TYPE
- Rest day: ~2,400 kcal | 3g/kg carbs (245g) | 190g protein | 70g fat
- Easy run / Peloton (<60 min): ~2,800 kcal | 4.5g/kg carbs (365g) | 190g protein | 65g fat
- Moderate run (60-90 min): ~3,100 kcal | 6g/kg carbs (490g) | 190g protein | 65g fat
- Long run (>90 min): ~3,800 kcal | 8g/kg carbs (650g) | 190g protein | 80g fat
- Strength/gym: ~2,700 kcal | 4g/kg carbs (325g) | 200g protein | 75g fat

## POLARIZED TRAINING WEEK PATTERN (Build phase)
- Mon: Easy run or Peloton 45-60 min
- Tue: Rest or strength/gym
- Wed: Moderate run 60-75 min or tempo intervals
- Thu: Easy run or Peloton 30-45 min
- Fri: Rest or easy yoga
- Sat: Long run 90-150 min (longest day)
- Sun: Rest or very easy active recovery

## FOOD PREFERENCES / PRACTICAL
- Protein sources: chicken, ground turkey, eggs, Greek yogurt, cottage cheese, whey protein, salmon
- Carb sources: oats, rice, sweet potato, pasta, bread, bananas, berries, dates
- Fat sources: avocado, olive oil, nuts, almond butter
- Post-workout shake: always within 30-45 min on training days — 2 scoops whey + fruit + oats
- Practical: simple meals, batch-cook friendly, real food over supplements
- Keep processed food minimal

## INSTRUCTIONS
Return ONLY a JSON object with this schema:

{
  "theme": "one-line theme for this week's nutrition e.g. 'Carb-load the long run, recomp on rest days'",
  "days": [
    {
      "day": "Monday",
      "date": "${weekDays[0].date}",
      "training_type": "Easy Run",
      "calories": 2800,
      "carbs_g": 365,
      "protein_g": 190,
      "fat_g": 65,
      "breakfast": "specific meal with quantities e.g. '3 eggs scrambled + 2 slices toast + banana + black coffee'",
      "breakfast_macros": "~60g carbs, 25g protein, 15g fat",
      "lunch": "specific meal",
      "lunch_macros": "~macro breakdown",
      "dinner": "specific meal",
      "dinner_macros": "~macro breakdown",
      "snacks": ["snack 1 with quantity", "post-workout shake if training day"],
      "pre_workout": "pre-run fuel if applicable e.g. 'banana + coffee 30 min before' or null",
      "post_workout": "post-workout window within 30-45 min e.g. 'protein shake + banana immediately after' or null",
      "hydration_tip": "specific hydration advice for this day's training"
    }
    // repeat for all 7 days
  ],
  "shopping_list": ["item 1 with quantity e.g. 'Chicken breast, 3 lb'", ...20 items total],
  "meal_prep_tips": ["tip 1 e.g. 'Cook 3 cups rice Sunday for Mon-Wed lunches'", ...4 tips]
}`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const text = (message.content[0] as any).text.trim()
    const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(jsonStr)

    const plan: WeeklyMealPlan = {
      generated_at: new Date().toISOString(),
      week_start: weekStart,
      ...parsed,
    }

    mealCache.set(weekStart, { plan, ts: Date.now() })
    return NextResponse.json(plan)
  } catch (e) {
    console.error("Weekly meal plan failed:", e)
    return NextResponse.json({ error: "Failed to generate meal plan" }, { status: 500 })
  }
}
