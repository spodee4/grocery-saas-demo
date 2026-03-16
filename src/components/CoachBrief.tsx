"use client"

import { useState } from "react"
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

function WeeklyFocusCard({ focus }: { focus: CoachBrief["weekly_focus"] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-4 text-left flex items-center justify-between"
      >
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Weekly Focus</p>
          <p className="font-semibold text-sm mt-0.5 text-primary">{focus.headline}</p>
        </div>
        <span className={`text-muted-foreground text-sm transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
          ↓
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
          {/* Where we are / going */}
          <div className="space-y-2">
            <div className="border-l-2 border-muted pl-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Where We Are</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{focus.where_we_are}</p>
            </div>
            <div className="border-l-2 border-primary/50 pl-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Where We're Going</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{focus.where_we_go}</p>
            </div>
          </div>

          {/* This week */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">This Week</p>
            <div className="space-y-1.5">
              {focus.this_week?.map((bullet, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-primary font-bold text-xs shrink-0 mt-px">·</span>
                  <p className="text-xs text-foreground/80 leading-relaxed">{bullet}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming weeks */}
          {focus.upcoming?.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Lookahead</p>
              <div className="space-y-3">
                {focus.upcoming.map((week, i) => (
                  <div key={i} className="border border-border rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{week.label}</span>
                      <span className="text-[10px] text-accent font-medium">{week.theme}</span>
                    </div>
                    {week.bullets?.map((b, j) => (
                      <div key={j} className="flex gap-2 items-start">
                        <span className="text-muted-foreground text-xs shrink-0">→</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{b}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function CoachBrief() {
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(true)
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
      {/* Motivational Quote */}
      {brief.motivational_quote && (
        <div className="bg-card rounded-2xl p-4 border-l-2 border-primary/60">
          <p className="text-sm font-medium italic text-foreground/90 leading-relaxed">
            "{brief.motivational_quote.text}"
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5">— {brief.motivational_quote.author}</p>
        </div>
      )}

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

      {/* Today's workout + recovery — one card */}
      <div className="bg-card rounded-2xl p-4 space-y-3">
        {/* Workout */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Today's Workout</p>
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

        {/* Recovery — same card, divider */}
        {brief.recovery && (
          <>
            <div className="border-t border-border" />
            <div className="space-y-2.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Post-Workout Recovery</p>

              {/* Protein shake — always first if applicable */}
              {brief.recovery.protein_shake === "yes" && brief.recovery.shake_recipe && (
                <div className="flex items-start gap-2.5">
                  <span className="text-lg leading-none mt-0.5">🥤</span>
                  <div>
                    <p className="text-sm font-semibold">Protein Shake</p>
                    <p className="text-xs text-muted-foreground">{brief.recovery.shake_recipe}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none mt-0.5">
                  {brief.recovery.primary.toLowerCase().includes("cold") ? "🧊" :
                   brief.recovery.primary.toLowerCase().includes("sauna") ? "🔥" :
                   brief.recovery.primary.toLowerCase().includes("red") ? "💡" :
                   brief.recovery.primary.toLowerCase().includes("yoga") ? "🧘" : "◈"}
                </span>
                <div>
                  <p className="text-sm font-semibold">{brief.recovery.primary}</p>
                  <p className="text-xs text-muted-foreground">{brief.recovery.protocol}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none mt-0.5">🧘</span>
                <div>
                  <p className="text-sm font-semibold">{brief.recovery.stretch_yoga}</p>
                  <p className="text-xs text-muted-foreground">Focus: {brief.recovery.stretch_focus}</p>
                </div>
              </div>

              {brief.recovery.optional && (
                <div className="flex items-start gap-2.5">
                  <span className="text-lg leading-none mt-0.5">✦</span>
                  <p className="text-sm text-muted-foreground">{brief.recovery.optional}</p>
                </div>
              )}
            </div>
          </>
        )}

        {brief.daily_challenge && (
          <>
            <div className="border-t border-border" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Daily Challenge</p>
                <span className="text-xs text-muted-foreground">{brief.daily_challenge.timing}</span>
              </div>
              <p className="font-bold text-primary">{brief.daily_challenge.name}</p>
              <p className="text-sm text-foreground/80">{brief.daily_challenge.description}</p>
              <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-medium">
                {brief.daily_challenge.sets_reps}
              </span>
              <p className="text-xs text-muted-foreground">{brief.daily_challenge.why}</p>
            </div>
          </>
        )}
      </div>

      {/* Weekly Focus — collapsible */}
      {brief.weekly_focus && <WeeklyFocusCard focus={brief.weekly_focus} />}

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
        <div className="bg-card rounded-2xl overflow-hidden">
          <button
            onClick={() => setAnalysisOpen(o => !o)}
            className="w-full p-4 flex items-center justify-between"
          >
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Coaching Notes</p>
            <span className={`text-muted-foreground text-sm transition-transform duration-200 ${analysisOpen ? "rotate-180" : ""}`}>↓</span>
          </button>
          {analysisOpen && (
            <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
              <p className="text-sm text-foreground/80 leading-relaxed">{brief.analysis}</p>
              {brief.workout_notes && (
                <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-2 mt-2">
                  {brief.workout_notes}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {brief.alerts?.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl overflow-hidden">
          <button
            onClick={() => setAlertsOpen(o => !o)}
            className="w-full px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-destructive text-sm">⚠</span>
              <p className="text-xs font-medium text-destructive">
                {brief.alerts.length} Alert{brief.alerts.length > 1 ? "s" : ""}
              </p>
            </div>
            <span className={`text-destructive/70 text-sm transition-transform duration-200 ${alertsOpen ? "rotate-180" : ""}`}>↓</span>
          </button>
          {alertsOpen && (
            <div className="px-4 pb-3 space-y-2 border-t border-destructive/20 pt-2">
              {brief.alerts.map((alert, i) => (
                <p key={i} className="text-xs text-destructive leading-relaxed">· {alert}</p>
              ))}
            </div>
          )}
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

      {/* Daily Supplements */}
      {brief.daily_supplements && (
        <div className="bg-card rounded-2xl p-4 space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Daily Supplements</p>
          {brief.daily_supplements.note && (
            <p className="text-xs text-muted-foreground italic">{brief.daily_supplements.note}</p>
          )}
          {[
            { label: "With Lunch", items: brief.daily_supplements.morning },
            { label: "Pre-Workout", items: brief.daily_supplements.pre_workout },
            { label: "Post-Workout", items: brief.daily_supplements.post_workout },
            { label: "Evening", items: brief.daily_supplements.evening },
          ].filter(g => g.items?.length > 0).map(group => (
            <div key={group.label} className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{group.label}</p>
              {group.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-primary text-xs shrink-0 mt-0.5">◈</span>
                  <p className="text-xs text-foreground/80">{item}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {brief.generated_at && (
        <p className="text-[10px] text-muted-foreground text-center">
          Generated {new Date(brief.generated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </div>
  )
}
