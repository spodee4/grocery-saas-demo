"use client"

import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import type { WeeklyMealPlan, DayMeals } from "@/app/api/weekly-meals/route"

async function fetchWeeklyMeals(force = false): Promise<WeeklyMealPlan> {
  const res = await fetch(`/api/weekly-meals${force ? "?force=1" : ""}`)
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

function MacroRow({ carbs, protein, fat, calories }: { carbs: number; protein: number; fat: number; calories: number }) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-secondary font-medium">{carbs}g carbs</span>
      <span className="text-primary font-medium">{protein}g protein</span>
      <span className="text-accent font-medium">{fat}g fat</span>
      <span className="text-muted-foreground ml-auto">{calories} kcal</span>
    </div>
  )
}

function MacroBar({ carbs, protein, fat }: { carbs: number; protein: number; fat: number }) {
  const total = carbs * 4 + protein * 4 + fat * 9
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
      <div className="bg-secondary/70" style={{ width: `${(carbs * 4 / total) * 100}%` }} />
      <div className="bg-primary/70" style={{ width: `${(protein * 4 / total) * 100}%` }} />
      <div className="bg-accent/60" style={{ width: `${(fat * 9 / total) * 100}%` }} />
    </div>
  )
}

function trainingBadge(type: string) {
  const colors: Record<string, string> = {
    "Long Run": "bg-destructive/20 text-destructive",
    "Rest": "bg-muted text-muted-foreground",
    "Easy Run": "bg-secondary/20 text-secondary",
    "Moderate": "bg-accent/20 text-accent-foreground",
    "Strength": "bg-primary/20 text-primary",
    "Peloton": "bg-secondary/20 text-secondary",
    "Yoga": "bg-muted text-muted-foreground",
  }
  const match = Object.keys(colors).find(k => type.includes(k))
  return colors[match || ""] || "bg-muted text-muted-foreground"
}

function DayCard({ day, isToday }: { day: DayMeals; isToday: boolean }) {
  const [expanded, setExpanded] = useState(isToday)

  return (
    <div className={`bg-card rounded-2xl overflow-hidden transition-all ${isToday ? "ring-1 ring-primary/40" : ""}`}>
      {/* Header — always visible, tap to expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-4 text-left space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isToday && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
            <span className="font-bold text-sm">{day.day}</span>
            <span className="text-xs text-muted-foreground">{day.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${trainingBadge(day.training_type)}`}>
              {day.training_type}
            </span>
            <span className="text-muted-foreground text-sm">{expanded ? "↑" : "↓"}</span>
          </div>
        </div>
        <MacroBar carbs={day.carbs_g} protein={day.protein_g} fat={day.fat_g} />
        <MacroRow carbs={day.carbs_g} protein={day.protein_g} fat={day.fat_g} calories={day.calories} />
      </button>

      {/* Expanded meals */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Pre-workout */}
          {day.pre_workout && (
            <div className="flex gap-2">
              <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5">Pre-workout</span>
              <p className="text-sm text-accent">{day.pre_workout}</p>
            </div>
          )}

          {/* Breakfast */}
          <div className="flex gap-2">
            <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5">Breakfast</span>
            <div>
              <p className="text-sm">{day.breakfast}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{day.breakfast_macros}</p>
            </div>
          </div>

          {/* Post-workout */}
          {day.post_workout && (
            <div className="flex gap-2">
              <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5">Post-workout</span>
              <p className="text-sm text-primary">🥤 {day.post_workout}</p>
            </div>
          )}

          {/* Lunch */}
          <div className="flex gap-2">
            <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5">Lunch</span>
            <div>
              <p className="text-sm">{day.lunch}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{day.lunch_macros}</p>
            </div>
          </div>

          {/* Dinner */}
          <div className="flex gap-2">
            <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5">Dinner</span>
            <div>
              <p className="text-sm">{day.dinner}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{day.dinner_macros}</p>
            </div>
          </div>

          {/* Snacks */}
          {day.snacks?.length > 0 && (
            <div className="flex gap-2">
              <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5">Snacks</span>
              <div className="space-y-1">
                {day.snacks.map((s, i) => <p key={i} className="text-sm">{s}</p>)}
              </div>
            </div>
          )}

          {/* Hydration */}
          {day.hydration_tip && (
            <div className="flex gap-2 border-t border-border pt-2">
              <span className="text-xs font-medium text-muted-foreground w-20 shrink-0 pt-0.5">Hydration</span>
              <p className="text-xs text-muted-foreground">{day.hydration_tip}</p>
            </div>
          )}

          {/* Coach Analysis */}
          {day.daily_analysis && (
            <div className="border-t border-border pt-2 rounded-xl bg-primary/5 p-2 -mx-0.5">
              <p className="text-[10px] font-medium text-primary uppercase tracking-wider mb-1">Coach Analysis</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{day.daily_analysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FuelPage() {
  const today = new Date().toISOString().split("T")[0]
  const [notesSending, setNotesSending] = useState(false)
  const [notesSent, setNotesSent] = useState(false)

  const sendToNotes = useCallback(async (plan: WeeklyMealPlan) => {
    setNotesSending(true)
    const lines = [
      `JC Shopping List — Week of ${plan.week_start}`,
      `Theme: ${plan.theme}`,
      "",
      "SHOPPING LIST (family of 4)",
      ...plan.shopping_list.map(i => `• ${i}`),
      "",
      "MEAL PREP TIPS",
      ...plan.meal_prep_tips.map((t, i) => `${i + 1}. ${t}`),
    ]
    try {
      const res = await fetch("/api/send-to-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `JC Shopping List – Week of ${plan.week_start}`,
          body: lines.join("\n"),
        }),
      })
      if (res.ok) setNotesSent(true)
    } finally {
      setNotesSending(false)
    }
  }, [])

  const { data, isLoading, isError, refetch, isFetching } = useQuery<WeeklyMealPlan>({
    queryKey: ["weekly-meals"],
    queryFn: () => fetchWeeklyMeals(),
    staleTime: 12 * 60 * 60 * 1000,
    retry: 1,
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-lg font-bold">Weekly Fuel Plan</h1>
          {data?.theme && <p className="text-xs text-muted-foreground mt-0.5">{data.theme}</p>}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          {isFetching ? "Thinking…" : "↺ New"}
        </button>
      </div>

      {/* Macro legend */}
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-secondary/70" /> Carbs</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary/70" /> Protein</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-accent/60" /> Fat</span>
        <span className="text-muted-foreground ml-auto">Tap day to expand</span>
      </div>

      {isLoading || isFetching ? (
        <div className="space-y-2">
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <p className="text-xs text-muted-foreground">Building your week's meal plan…</p>
            </div>
          </div>
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-4 bg-card rounded-2xl text-center space-y-2">
          <p className="text-destructive text-sm">Could not generate meal plan</p>
          <button onClick={() => refetch()} className="text-xs text-primary underline">Retry</button>
        </div>
      ) : (
        <>
          {/* 7-day meal cards */}
          <div className="space-y-2">
            {data?.days?.map(day => (
              <DayCard key={day.date} day={day} isToday={day.date === today} />
            ))}
          </div>

          {/* Shopping list */}
          {(data?.shopping_list?.length ?? 0) > 0 && data && (
            <div className="bg-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Shopping List</p>
                <button
                  onClick={() => sendToNotes(data)}
                  disabled={notesSending || notesSent}
                  className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                >
                  {notesSent ? "✓ Sent to Notes" : notesSending ? "Sending…" : "Send to Notes"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">Quantities scaled for family of 4</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {data.shopping_list.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-muted-foreground rounded-full shrink-0" />
                    <p className="text-xs">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meal prep tips */}
          {(data?.meal_prep_tips?.length ?? 0) > 0 && data && (
            <div className="bg-card rounded-2xl p-4 space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Meal Prep Tips</p>
              <div className="space-y-2">
                {data.meal_prep_tips.map((tip, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-primary font-bold text-xs shrink-0">{i + 1}.</span>
                    <p className="text-xs text-foreground/80">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data?.generated_at && (
            <p className="text-[10px] text-muted-foreground text-center">
              Week of {data.week_start} · Generated {new Date(data.generated_at).toLocaleDateString()}
            </p>
          )}
        </>
      )}
    </div>
  )
}
