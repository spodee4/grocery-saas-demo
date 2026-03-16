"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchDashboard } from "@/lib/api"
import type { DashboardData } from "@/lib/api"
import { CoachBrief } from "@/components/CoachBrief"
import { Tooltip, MetricCard, DEFS, ctlInsight, atlInsight, tsbInsight, acwrInsight, vo2Insight } from "@/components/Tooltip"

function fmt(v: number | null | undefined, digits = 0): string {
  if (v == null) return "—"
  return v.toFixed(digits)
}

function fmtSleep(secs: number | null): string {
  if (!secs) return "—"
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h ${m}m`
}

function acwrColor(v: number | null): string {
  if (v == null) return "text-muted-foreground"
  if (v > 1.3) return "text-destructive"
  if (v > 1.1) return "text-accent"
  if (v < 0.8) return "text-muted-foreground"
  return "text-secondary"
}

function tsbColor(v: number | null): string {
  if (v == null) return "text-muted-foreground"
  if (v > 20) return "text-accent"
  if (v > 5) return "text-secondary"
  if (v < -20) return "text-destructive"
  return "text-muted-foreground"
}

function hrvColor(v: number | null, avg: number | null): string {
  if (v == null || avg == null) return "text-muted-foreground"
  const ratio = v / avg
  if (ratio >= 1.05) return "text-secondary"
  if (ratio >= 0.95) return "text-foreground"
  return "text-destructive"
}

function StatCard({ label, value, sub, valueClass = "" }: {
  label: string
  value: string
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="bg-card rounded-2xl p-4 space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold font-mono ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function WorkoutBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    running: "bg-primary/20 text-primary",
    cycling: "bg-secondary/20 text-secondary",
    strength: "bg-accent/20 text-accent-foreground",
    stretching: "bg-muted text-muted-foreground",
    yoga: "bg-muted text-muted-foreground",
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || "bg-muted text-muted-foreground"}`}>
      {type}
    </span>
  )
}

function ZoneBar({ z1, z2, z3, z4, z5 }: {
  z1: number | null; z2: number | null; z3: number | null; z4: number | null; z5: number | null
}) {
  const zones = [
    { pct: z1, color: "bg-blue-500/70" },
    { pct: z2, color: "bg-secondary/80" },
    { pct: z3, color: "bg-accent/80" },
    { pct: z4, color: "bg-orange-500/80" },
    { pct: z5, color: "bg-destructive/80" },
  ].filter(z => z.pct != null && z.pct > 0)

  if (!zones.length) return null

  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full gap-px">
      {zones.map((z, i) => (
        <div key={i} className={`${z.color} transition-all`} style={{ width: `${z.pct}%` }} />
      ))}
    </div>
  )
}

export default function TodayPage() {
  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 5 * 60 * 1000,
  })

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })

  // Race countdown — July 18, 2026
  const raceDate = new Date("2026-07-18")
  const weeksOut = Math.ceil((raceDate.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))

  const load = data?.load
  const body = data?.body
  const workout = data?.last_workout

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <div className="h-8 bg-card rounded-xl animate-pulse w-1/2" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <p className="text-destructive text-sm">Could not reach Mac mini</p>
        <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-card text-sm text-foreground hover:bg-muted transition-colors">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-baseline justify-between pt-2">
        <div>
          <h1 className="text-lg font-bold">{today}</h1>
          <p className="text-xs text-muted-foreground">{weeksOut}w to race day · Build phase</p>
        </div>
        <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground text-xl leading-none">
          ↺
        </button>
      </div>

      {/* Coach Brief — daily plan, analysis, nutrition */}
      <CoachBrief />

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Training load snapshot */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Chronic Training Load (CTL)"
          value={fmt(load?.ctl, 1)}
          sub="target: 75+ by July"
          valueClass="text-[var(--chart-1)]"
          definition={DEFS.CTL}
          insight={ctlInsight(load?.ctl ?? null)}
        />
        <MetricCard
          label="Acute Training Load (ATL)"
          value={fmt(load?.atl, 1)}
          sub={`Training Stress Score (TSS) today: ${fmt(load?.tss)}`}
          valueClass="text-[var(--chart-2)]"
          definition={DEFS.ATL}
          insight={atlInsight(load?.atl ?? null)}
        />
        <MetricCard
          label="Training Stress Balance (TSB)"
          value={fmt(load?.tsb, 1)}
          sub={load?.tsb != null ? (load.tsb > 5 ? "Fresh & ready" : load.tsb < -20 ? "Overreached" : "Building") : "—"}
          valueClass={tsbColor(load?.tsb ?? null)}
          definition={DEFS.TSB}
          insight={tsbInsight(load?.tsb ?? null)}
        />
        <MetricCard
          label="Workload Ratio (ACWR)"
          value={fmt(load?.acwr, 2)}
          sub={load?.acwr != null ? (load.acwr > 1.3 ? "⚠ Injury risk zone" : load.acwr > 1.1 ? "Caution" : "Safe zone") : "—"}
          valueClass={acwrColor(load?.acwr ?? null)}
          definition={DEFS.ACWR}
          insight={acwrInsight(load?.acwr ?? null)}
          highlight={(load?.acwr ?? 0) > 1.3}
        />
      </div>

      {/* HRV + Readiness */}
      <div className="bg-card rounded-2xl p-4 space-y-3">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Recovery Metrics</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-0.5">
            <Tooltip definition={DEFS.HRV}><p className="text-xs text-muted-foreground">Heart Rate Variability (HRV)</p></Tooltip>
            <p className={`text-xl font-bold font-mono ${hrvColor(load?.hrv_last_night ?? null, load?.hrv_weekly_avg ?? null)}`}>
              {fmt(load?.hrv_last_night)}
            </p>
            <p className="text-[10px] text-muted-foreground">avg {fmt(load?.hrv_weekly_avg)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Sleep</p>
            <p className="text-xl font-bold font-mono">{fmtSleep(load?.sleep_seconds ?? null)}</p>
            <p className="text-[10px] text-muted-foreground">rhr {fmt(load?.resting_hr)} bpm</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Battery</p>
            <p className="text-xl font-bold font-mono text-accent">{fmt(load?.body_battery_wake)}</p>
            <p className="text-[10px] text-muted-foreground">eod {fmt(load?.body_battery_eod)}</p>
          </div>
        </div>
        {load?.training_readiness_score != null && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${load.training_readiness_score}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Readiness {load.training_readiness_score} · {load.training_readiness_level}
            </span>
          </div>
        )}
      </div>

      {/* VO2 max + body */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="VO2 Max"
          value={fmt(load?.vo2_max, 1)}
          sub="target: 55+ by July"
          valueClass="text-[var(--chart-5)]"
          definition={DEFS.VO2}
          insight={vo2Insight(load?.vo2_max ?? null)}
        />
        <MetricCard
          label="Weight"
          value={body?.weight_kg ? `${(body.weight_kg * 2.20462).toFixed(0)} lb` : "—"}
          sub={body?.fat_ratio ? `${fmt(body.fat_ratio, 1)}% body fat · goal: ≤15%` : "goal: 170 lb / ≤15% body fat"}
          definition="Your current body weight from Withings scale sync. Goal is 170 lb at ≤15% body fat by race day (July 18, 2026)."
          insight={body?.weight_kg ? `Currently ${((body.weight_kg * 2.20462) - 170).toFixed(0)} lb above goal weight. Consistent caloric deficit on rest/easy days + high protein (180-200g) will drive gradual recomp without sacrificing training performance.` : "No recent weigh-in. Step on scale to track progress toward 170 lb goal."}
        />
      </div>

      {/* Last workout */}
      {workout && (
        <div className="bg-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Last Workout</p>
            <WorkoutBadge type={workout.workout_type} />
          </div>
          <p className="font-semibold text-sm leading-snug line-clamp-1">{workout.class_title || workout.workout_type}</p>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">{workout.duration_min != null ? `${fmt(workout.duration_min)}m` : "—"}</span>
            {workout.avg_hr && <span className="text-muted-foreground">{fmt(workout.avg_hr)} bpm</span>}
            {workout.hrTSS && <span className="text-muted-foreground">TSS {fmt(workout.hrTSS, 0)}</span>}
          </div>
          <p className="text-xs text-muted-foreground">{workout.date} · {workout.source}</p>
        </div>
      )}

      {/* Steps + calories */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Steps" value={load?.steps ? load.steps.toLocaleString() : "—"} />
        <StatCard label="Active kcal" value={fmt(load?.active_kcal)} sub={load?.total_kcal ? `${fmt(load.total_kcal)} total` : undefined} />
      </div>

      {/* Stress */}
      {load?.stress_avg != null && (
        <div className="bg-card rounded-2xl p-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Stress</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(load.stress_avg, 100)}%`,
                  background: load.stress_avg > 70 ? "var(--destructive)" : load.stress_avg > 40 ? "var(--accent)" : "var(--secondary)",
                }}
              />
            </div>
            <span className="text-sm font-mono font-bold">{fmt(load.stress_avg)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
