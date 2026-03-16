"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchDashboard, fetchWorkouts } from "@/lib/api"
import type { DashboardData, Workout } from "@/lib/api"

// Polarized training pattern (0=Sun, 1=Mon, ..., 6=Sat)
const WEEK_PATTERN: Record<number, { type: string; emoji: string; planned_miles: number }> = {
  0: { type: "Rest / Active Recovery", emoji: "😴", planned_miles: 0 },
  1: { type: "Easy Run", emoji: "🏃", planned_miles: 5 },
  2: { type: "Strength / Gym", emoji: "💪", planned_miles: 0 },
  3: { type: "Moderate Run", emoji: "🏃", planned_miles: 7 },
  4: { type: "Easy Run", emoji: "🏃", planned_miles: 4 },
  5: { type: "Rest / Yoga", emoji: "🧘", planned_miles: 0 },
  6: { type: "Long Run", emoji: "🏃", planned_miles: 12 },
}

const WEEKLY_PLANNED_MILES = Object.values(WEEK_PATTERN).reduce((s, d) => s + d.planned_miles, 0) // 28

function getWeeks(numWeeks = 4): { date: Date; iso: string }[][] {
  const weeks: { date: Date; iso: string }[][] = []
  const today = new Date()
  // Start from the most recent Sunday
  const startDay = new Date(today)
  startDay.setDate(today.getDate() - today.getDay())
  startDay.setHours(0, 0, 0, 0)

  for (let w = 0; w < numWeeks; w++) {
    const week: { date: Date; iso: string }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDay)
      date.setDate(startDay.getDate() + w * 7 + d)
      week.push({ date, iso: date.toISOString().split("T")[0] })
    }
    weeks.push(week)
  }
  return weeks
}

function fmt(v: number | null | undefined, d = 0) {
  return v == null ? "—" : v.toFixed(d)
}

function ProgressBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export default function PlanPage() {
  const today = new Date().toISOString().split("T")[0]
  const raceDate = new Date("2026-07-18")
  const daysToRace = Math.ceil((raceDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  const weeksToRace = Math.ceil(daysToRace / 7)

  // YTD mileage
  const ytdStart = `${new Date().getFullYear()}-01-01`
  const { data: body } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  })
  const { data: allWorkouts = [] } = useQuery<Workout[]>({
    queryKey: ["workouts-plan", 500],
    queryFn: () => fetchWorkouts(500),
    staleTime: 5 * 60 * 1000,
  })

  const weeks = getWeeks(4)

  // Build a date → workout map for the calendar
  const workoutByDate = allWorkouts.reduce<Record<string, Workout>>((acc, w) => {
    if (!acc[w.date] || (w.distance_mi ?? 0) > (acc[w.date]?.distance_mi ?? 0)) {
      acc[w.date] = w
    }
    return acc
  }, {})

  // YTD stats
  const ytdRuns = allWorkouts.filter(w => w.workout_type === "run" && w.date >= ytdStart)
  const ytdMiles = ytdRuns.reduce((s, w) => s + (w.distance_mi ?? 0), 0)
  const ytdGoalMiles = 800
  const ytdWorkouts = allWorkouts.filter(w => w.date >= ytdStart).length

  // Weekly stats for the 4 shown weeks
  const weekStats = weeks.map(week => {
    const weekWorkouts = week.map(d => workoutByDate[d.iso]).filter(Boolean)
    const actualMiles = weekWorkouts
      .filter(w => w.workout_type === "run" || w.workout_type === "walk")
      .reduce((s, w) => s + (w.distance_mi ?? 0), 0)
    return { actualMiles, workoutCount: weekWorkouts.length }
  })

  const weightLb = body?.body?.weight_kg ? (body.body.weight_kg * 2.20462) : null
  const fatPct = body?.body?.fat_ratio ?? null
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null)

  // Projection helpers
  const weeksElapsed = Math.max(1, Math.ceil((Date.now() - new Date(`${new Date().getFullYear()}-01-01`).getTime()) / (7 * 24 * 60 * 60 * 1000)))
  const miPerWeek = ytdMiles / weeksElapsed
  const weeksRemaining = 52 - weeksElapsed
  const projectedYtdMiles = ytdMiles + miPerWeek * weeksRemaining
  const milesNeededPerWeek = Math.max(0, (ytdGoalMiles - ytdMiles) / Math.max(weeksRemaining, 1))

  function projectDate(weeksNeeded: number): string {
    const d = new Date()
    d.setDate(d.getDate() + Math.round(weeksNeeded * 7))
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const weightToLose = weightLb ? Math.max(0, weightLb - 170) : 9
  // conservative: ~0.5 lb/week without explicit plan; with food plan: 1.5 lb/week
  const weightPaceWeeks = weightToLose / 0.5
  const weightFoodPlanWeeks = weightToLose / 1.5
  const weightAtRaceDay = weightLb ? Math.max(170, weightLb - 0.5 * weeksToRace).toFixed(0) : "—"
  const weightFoodPlanAtRace = weightLb ? Math.max(170, weightLb - 1.5 * weeksToRace).toFixed(0) : "—"

  const fatToLose = fatPct ? Math.max(0, fatPct - 15) : 3.2
  const fatPaceWeeks = fatToLose / 0.15   // ~0.15%/week without plan
  const fatFoodPlanWeeks = fatToLose / 0.35  // ~0.35%/week with deficit + training
  const fatAtRaceDay = fatPct ? Math.max(15, fatPct - 0.15 * weeksToRace).toFixed(1) : "—"
  const fatFoodPlanAtRace = fatPct ? Math.max(15, fatPct - 0.35 * weeksToRace).toFixed(1) : "—"

  return (
    <div className="p-4 space-y-5">
      <div className="pt-2">
        <h1 className="text-lg font-bold">Training Plan</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{weeksToRace}w to race day · July 18, 2026</p>
      </div>

      {/* Race countdown banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Javelina Jundred 100-Mile Ultra</p>
          <span className="text-primary font-bold font-mono text-sm">{daysToRace}d</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-bold font-mono text-primary">{weeksToRace}</p>
            <p className="text-[10px] text-muted-foreground">weeks out</p>
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-secondary">Build</p>
            <p className="text-[10px] text-muted-foreground">current phase</p>
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-accent">75+</p>
            <p className="text-[10px] text-muted-foreground">Chronic Training Load (CTL) target</p>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="bg-card rounded-2xl p-4 space-y-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Goals</p>

        {/* Weight goal */}
        {[
          {
            key: "weight",
            label: "Weight → 170 lb",
            current: weightLb ? `${weightLb.toFixed(0)} lb now` : "—",
            progress: weightLb ? Math.max(0, ((220 - weightLb) / (220 - 170)) * 100) : 0,
            color: (weightLb ?? 999) <= 170 ? "bg-secondary" : "bg-primary",
            sub: weightLb ? `${Math.max(0, weightLb - 170).toFixed(0)} lb to goal` : "Sync scale to track",
            insights: [
              { label: "At current pace", value: `~${projectDate(weightPaceWeeks)}`, note: `${weightAtRaceDay} lb at race day` },
              { label: "With food plan (−500 kcal/day)", value: `~${projectDate(weightFoodPlanWeeks)}`, note: `${weightFoodPlanAtRace} lb at race day ✓` },
              { label: "Race day target", value: "170 lb", note: `${weightToLose.toFixed(0)} lb to lose in ${weeksToRace}w` },
            ],
            tip: "Implementing a 300–500 kcal/day deficit while fueling workouts properly is the fastest safe path. Check your Fuel tab for the week's meal plan.",
          },
          {
            key: "fat",
            label: "Body fat → ≤15%",
            current: fatPct ? `${fatPct.toFixed(1)}% now` : "—",
            progress: fatPct ? Math.max(0, ((30 - fatPct) / (30 - 15)) * 100) : 0,
            color: (fatPct ?? 99) <= 15 ? "bg-secondary" : "bg-primary",
            sub: fatPct ? `${Math.max(0, fatPct - 15).toFixed(1)}% to goal` : "Sync scale to track",
            insights: [
              { label: "At current pace", value: `~${projectDate(fatPaceWeeks)}`, note: `${fatAtRaceDay}% at race day` },
              { label: "With training + food plan", value: `~${projectDate(fatFoodPlanWeeks)}`, note: `${fatFoodPlanAtRace}% at race day ✓` },
              { label: "Race day target", value: "≤15%", note: "Reduces dead weight for 100 miles" },
            ],
            tip: "Body fat drops from caloric deficit + increased easy mileage. Strength work preserves muscle. Zone 2 runs burn fat more efficiently over time.",
          },
          {
            key: "mileage",
            label: `Annual Mileage → ${ytdGoalMiles} mi`,
            current: `${ytdMiles.toFixed(0)} mi YTD`,
            progress: (ytdMiles / ytdGoalMiles) * 100,
            color: "bg-accent",
            sub: `${milesNeededPerWeek.toFixed(1)} mi/week needed to hit goal`,
            insights: [
              { label: "Current weekly avg", value: `${miPerWeek.toFixed(1)} mi/wk`, note: `${weeksElapsed}w elapsed` },
              { label: "Projected at current pace", value: `${projectedYtdMiles.toFixed(0)} mi`, note: projectedYtdMiles >= ytdGoalMiles ? "On track ✓" : `${(ytdGoalMiles - projectedYtdMiles).toFixed(0)} mi short` },
              { label: "Needed to hit 800 mi", value: `${milesNeededPerWeek.toFixed(1)} mi/wk`, note: `${weeksRemaining}w remaining in year` },
            ],
            tip: "Your training plan has 28 mi/week in the peak phase. Hitting that consistently will put you on track. Long runs on Saturdays drive most of the annual mileage.",
          },
        ].map(goal => (
          <div key={goal.key} className="space-y-1.5">
            <button
              className="w-full text-left"
              onClick={() => setExpandedGoal(expandedGoal === goal.key ? null : goal.key)}
            >
              <div className="flex justify-between items-baseline">
                <p className="text-xs font-medium flex items-center gap-1">
                  {goal.label}
                  <span className="text-muted-foreground text-[10px]">{expandedGoal === goal.key ? "↑" : "↓"}</span>
                </p>
                <p className="text-xs font-mono text-muted-foreground">{goal.current}</p>
              </div>
            </button>
            <ProgressBar value={goal.progress} max={100} color={goal.color} />
            <p className="text-[10px] text-muted-foreground">{goal.sub}</p>

            {expandedGoal === goal.key && (
              <div className="mt-2 rounded-xl bg-muted/40 p-3 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Projections</p>
                <div className="space-y-2">
                  {goal.insights.map((ins, i) => (
                    <div key={i} className="flex justify-between items-start gap-2">
                      <p className="text-[11px] text-muted-foreground flex-1">{ins.label}</p>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold text-foreground">{ins.value}</p>
                        <p className="text-[10px] text-muted-foreground">{ins.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/50 pt-2">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{goal.tip}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Daily Habits */}
      <div className="bg-card rounded-2xl p-4 space-y-3">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Daily Habits</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/8 rounded-xl p-3 space-y-1">
            <p className="text-sm font-bold">💪 Push-ups</p>
            <p className="text-xl font-bold font-mono text-primary">50</p>
            <p className="text-[10px] text-muted-foreground">per day · 18,250/year goal</p>
          </div>
          <div className="bg-secondary/8 rounded-xl p-3 space-y-1">
            <p className="text-sm font-bold">🧱 Plank</p>
            <p className="text-xl font-bold font-mono text-secondary">2 min</p>
            <p className="text-[10px] text-muted-foreground">per day · every day</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          These are in addition to your scheduled training. No excuses on rest days.
        </p>
      </div>

      {/* 4-Week Calendar */}
      <div className="space-y-3">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">4-Week View</p>

        {weeks.map((week, wi) => {
          const weekStart = week[0].iso
          const weekEnd = week[6].iso
          const isCurrentWeek = today >= weekStart && today <= weekEnd
          const stats = weekStats[wi]
          const isPast = weekEnd < today

          return (
            <div
              key={wi}
              className={`bg-card rounded-2xl overflow-hidden ${isCurrentWeek ? "ring-1 ring-primary/40" : ""}`}
            >
              {/* Week header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  {isCurrentWeek && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  <p className="text-xs font-semibold">
                    {isCurrentWeek ? "This Week" : isPast ? "Last" : `Week +${wi}`} · {week[1].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {stats.actualMiles.toFixed(1)}/{WEEKLY_PLANNED_MILES} mi
                </div>
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-px bg-border">
                {week.map(({ date, iso }) => {
                  const dow = date.getDay()
                  const plan = WEEK_PATTERN[dow]
                  const actual = workoutByDate[iso]
                  const isToday = iso === today
                  const isFuture = iso > today

                  const hasRun = actual && (actual.workout_type === "run" || actual.workout_type === "walk")
                  const hasWorkout = !!actual

                  return (
                    <div
                      key={iso}
                      className={`bg-card p-1.5 min-h-[72px] space-y-1 ${isToday ? "bg-primary/8" : ""}`}
                    >
                      {/* Day label */}
                      <div className="flex items-center justify-between">
                        <p className={`text-[9px] font-medium ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {DAY_LABELS[dow]}
                        </p>
                        <p className={`text-[9px] font-mono ${isToday ? "text-primary" : "text-muted-foreground/60"}`}>
                          {date.getDate()}
                        </p>
                      </div>

                      {/* Planned */}
                      <p className="text-[8px] text-muted-foreground/70 leading-tight line-clamp-2">
                        {plan.emoji} {plan.type.split(" / ")[0]}
                        {plan.planned_miles > 0 && ` ${plan.planned_miles}mi`}
                      </p>

                      {/* Actual */}
                      {hasWorkout && (
                        <div className={`rounded px-1 py-0.5 ${hasRun ? "bg-primary/20" : "bg-secondary/20"}`}>
                          <p className="text-[8px] font-medium leading-tight">
                            {actual.workout_type === "run" ? "🏃" : actual.workout_type === "cycling" ? "🚴" : "💪"}
                            {hasRun && actual.distance_mi ? ` ${actual.distance_mi.toFixed(1)}` : ""}
                          </p>
                        </div>
                      )}

                      {/* Future planned marker */}
                      {isFuture && !hasWorkout && plan.planned_miles > 0 && (
                        <div className="rounded px-1 py-0.5 border border-dashed border-primary/20">
                          <p className="text-[8px] text-primary/50">{plan.planned_miles}mi</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Week footer */}
              <div className="px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{stats.workoutCount} workouts logged</span>
                <span>
                  {stats.actualMiles > 0
                    ? `${((stats.actualMiles / WEEKLY_PLANNED_MILES) * 100).toFixed(0)}% of plan`
                    : isPast ? "no data" : `target: ${WEEKLY_PLANNED_MILES} mi`
                  }
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/20" /> Actual run</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary/20" /> Other workout</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-dashed border-primary/30" /> Planned (future)</span>
      </div>
    </div>
  )
}
