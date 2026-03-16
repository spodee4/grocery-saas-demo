"use client"

import { useQuery } from "@tanstack/react-query"
import type { CoachBrief } from "@/app/api/brief/route"

async function fetchBrief(force = false): Promise<CoachBrief> {
  const res = await fetch(`/api/brief${force ? "?force=1" : ""}`)
  if (!res.ok) throw new Error("Brief fetch failed")
  return res.json()
}

function effortBadge(effort: string) {
  const colors: Record<string, string> = {
    "Zone 2": "bg-secondary/20 text-secondary",
    "Recovery": "bg-muted text-muted-foreground",
    "Threshold": "bg-accent/20 text-accent-foreground",
    "Tempo": "bg-accent/20 text-accent-foreground",
    "VO2": "bg-destructive/20 text-destructive",
    "Easy": "bg-secondary/20 text-secondary",
    "Rest": "bg-muted text-muted-foreground",
  }
  const match = Object.keys(colors).find(k => effort.toLowerCase().includes(k.toLowerCase()))
  return colors[match || ""] || "bg-primary/20 text-primary"
}

function MacroBar({ carbs, protein, fat, target }: { carbs: number; protein: number; fat: number; target: number }) {
  const total = carbs * 4 + protein * 4 + fat * 9
  const carbPct = (carbs * 4 / total) * 100
  const protPct = (protein * 4 / total) * 100
  const fatPct = (fat * 9 / total) * 100

  return (
    <div className="space-y-1">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        <div className="bg-secondary/80 transition-all" style={{ width: `${carbPct}%` }} title={`Carbs ${carbs}g`} />
        <div className="bg-primary/80 transition-all" style={{ width: `${protPct}%` }} title={`Protein ${protein}g`} />
        <div className="bg-accent/60 transition-all" style={{ width: `${fatPct}%` }} title={`Fat ${fat}g`} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="text-secondary">{carbs}g carbs</span>
        <span className="text-primary">{protein}g protein</span>
        <span className="text-accent">{fat}g fat</span>
      </div>
    </div>
  )
}

export function CoachBrief() {
  const { data: brief, isLoading, isError, refetch, isFetching } = useQuery<CoachBrief>({
    queryKey: ["brief"],
    queryFn: () => fetchBrief(),
    staleTime: 60 * 60 * 1000, // 1hr — only regenerate manually
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">Coach is thinking…</span>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-card rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError || !brief) {
    return (
      <div className="bg-card rounded-2xl p-4 space-y-2">
        <p className="text-xs text-muted-foreground">Coach brief unavailable</p>
        <button onClick={() => refetch()} className="text-xs text-primary underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Status + regenerate */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full" />
          <span className="text-xs font-medium text-primary">{brief.status}</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          {isFetching ? "Thinking…" : "↺ Regenerate"}
        </button>
      </div>

      {/* Today's workout plan */}
      <div className="bg-card rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Today</p>
            <p className="text-base font-bold mt-0.5">{brief.today_plan.type}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${effortBadge(brief.today_plan.effort)}`}>
              {brief.today_plan.effort}
            </span>
            {brief.today_plan.duration_min && (
              <span className="text-xs text-muted-foreground">{brief.today_plan.duration_min}m</span>
            )}
          </div>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{brief.today_plan.description}</p>
        <div className="border-l-2 border-primary pl-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Key focus</p>
          <p className="text-sm font-medium">{brief.today_plan.key_focus}</p>
        </div>
      </div>

      {/* Tomorrow preview */}
      <div className="bg-card rounded-2xl p-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tomorrow</p>
          <p className="font-semibold text-sm mt-0.5">{brief.tomorrow_plan.type}</p>
          <p className="text-xs text-muted-foreground mt-1">{brief.tomorrow_plan.preview}</p>
        </div>
        <div className="text-right shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${effortBadge(brief.tomorrow_plan.effort)}`}>
            {brief.tomorrow_plan.effort}
          </span>
          {brief.tomorrow_plan.duration_min && (
            <p className="text-xs text-muted-foreground mt-1">{brief.tomorrow_plan.duration_min}m</p>
          )}
        </div>
      </div>

      {/* Coaching analysis */}
      {brief.analysis && (
        <div className="bg-card rounded-2xl p-4 space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Coaching Notes</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{brief.analysis}</p>
          {brief.workout_notes && (
            <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-2 mt-2">
              {brief.workout_notes}
            </p>
          )}
        </div>
      )}

      {/* Alerts */}
      {brief.alerts?.length > 0 && (
        <div className="space-y-2">
          {brief.alerts.map((alert, i) => (
            <div key={i} className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
              <p className="text-xs text-destructive font-medium">⚠ {alert}</p>
            </div>
          ))}
        </div>
      )}

      {/* Nutrition */}
      <div className="bg-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Fuel Plan</p>
          <span className="text-xs text-accent font-medium">{brief.nutrition.day_type}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono">{brief.nutrition.calories_target.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">kcal target</span>
        </div>
        <MacroBar
          carbs={brief.nutrition.carbs_g}
          protein={brief.nutrition.protein_g}
          fat={brief.nutrition.fat_g}
          target={brief.nutrition.calories_target}
        />
        {brief.nutrition.timing_tip && (
          <p className="text-xs text-muted-foreground border-t border-border pt-2">{brief.nutrition.timing_tip}</p>
        )}
        {brief.nutrition.meals?.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {brief.nutrition.meals.map((meal, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-muted-foreground text-xs mt-px">·</span>
                <p className="text-xs text-foreground/80">{meal}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {brief.generated_at && (
        <p className="text-[10px] text-muted-foreground text-center">
          Generated {new Date(brief.generated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </div>
  )
}
