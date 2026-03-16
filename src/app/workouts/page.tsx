"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchWorkouts } from "@/lib/api"
import type { Workout } from "@/lib/api"

function fmt(v: number | null | undefined, d = 0) {
  return v == null ? null : v.toFixed(d)
}

function fmtPace(durationMin: number | null, distanceMi: number | null): string | null {
  if (!durationMin || !distanceMi || distanceMi < 0.5) return null
  const minPerMile = durationMin / distanceMi
  const mins = Math.floor(minPerMile)
  const secs = Math.round((minPerMile - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, "0")}/mi`
}

function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// Riegel formula: T2 = T1 * (D2/D1)^1.06
function riegel(timeMins: number, distMi: number, targetMi: number): string {
  const t = timeMins * Math.pow(targetMi / distMi, 1.06)
  return fmtTime(t)
}

function WorkoutTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    run: "🏃",
    running: "🏃",
    cycling: "🚴",
    strength: "💪",
    stretching: "🧘",
    yoga: "🧘",
    meditation: "🧘",
    walk: "🚶",
  }
  return <span className="text-lg">{icons[type] || "◎"}</span>
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
    <div className="flex h-1.5 rounded-full overflow-hidden w-full gap-px mt-1">
      {zones.map((z, i) => (
        <div key={i} className={z.color} style={{ width: `${z.pct}%` }} />
      ))}
    </div>
  )
}

// DB stores "run", filter label shows "Running"
const FILTERS = [
  { label: "All", value: "all" },
  { label: "Running", value: "run" },
  { label: "Cycling", value: "cycling" },
  { label: "Strength", value: "strength" },
] as const
type FilterValue = (typeof FILTERS)[number]["value"]

export default function HistoryPage() {
  const [filter, setFilter] = useState<FilterValue>("all")
  const [limit, setLimit] = useState(20)

  // Fetch all runs for records (separate query)
  const { data: allRuns = [] } = useQuery<Workout[]>({
    queryKey: ["workouts-all-runs"],
    queryFn: () => fetchWorkouts(500, "run"),
    staleTime: 10 * 60 * 1000,
  })

  const { data = [], isLoading } = useQuery<Workout[]>({
    queryKey: ["workouts", limit, filter],
    queryFn: () => fetchWorkouts(limit, filter === "all" ? undefined : filter),
  })

  // Personal records computed from all runs
  const records = useMemo(() => {
    const validRuns = allRuns.filter(r => r.distance_mi && r.distance_mi > 0.5 && r.duration_min && r.duration_min > 5)

    const longest = validRuns.reduce<Workout | null>((best, r) =>
      (r.distance_mi ?? 0) > (best?.distance_mi ?? 0) ? r : best, null)

    // Fastest pace (min per mile) from runs ≥1 mile
    const fastestPaceRun = validRuns
      .filter(r => r.distance_mi! >= 1)
      .reduce<Workout | null>((best, r) => {
        const pace = r.duration_min! / r.distance_mi!
        const bestPace = best ? best.duration_min! / best.distance_mi! : 999
        return pace < bestPace ? r : best
      }, null)

    // Best long run (≥5 miles) for marathon estimate
    const bestLongRun = validRuns
      .filter(r => r.distance_mi! >= 5)
      .reduce<Workout | null>((best, r) => {
        // Use pace as proxy for "best" effort
        const pace = r.duration_min! / r.distance_mi!
        const bestPace = best ? best.duration_min! / best.distance_mi! : 999
        return pace < bestPace ? r : best
      }, null)

    const marathonEst = bestLongRun?.distance_mi && bestLongRun?.duration_min
      ? riegel(bestLongRun.duration_min, bestLongRun.distance_mi, 26.2)
      : null

    const halfMarathonEst = bestLongRun?.distance_mi && bestLongRun?.duration_min
      ? riegel(bestLongRun.duration_min, bestLongRun.distance_mi, 13.1)
      : null

    return { longest, fastestPaceRun, marathonEst, halfMarathonEst }
  }, [allRuns])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold">Workout History</h1>
        <span className="text-xs text-muted-foreground">{data.length} shown</span>
      </div>

      {/* Personal Records */}
      {allRuns.length > 0 && (
        <div className="bg-card rounded-2xl p-4 space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Personal Records</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">Longest Run</p>
              <p className="text-lg font-bold font-mono text-primary">
                {records.longest?.distance_mi?.toFixed(1) ?? "—"} mi
              </p>
              <p className="text-[10px] text-muted-foreground">
                {records.longest ? `${fmtTime(records.longest.duration_min!)} · ${records.longest.date}` : ""}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">Fastest Pace</p>
              <p className="text-lg font-bold font-mono text-secondary">
                {records.fastestPaceRun
                  ? fmtPace(records.fastestPaceRun.duration_min, records.fastestPaceRun.distance_mi)
                  : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {records.fastestPaceRun
                  ? `${records.fastestPaceRun.distance_mi?.toFixed(1)} mi · ${records.fastestPaceRun.date}`
                  : ""}
              </p>
            </div>
            {records.halfMarathonEst && (
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground">Est. Half Marathon</p>
                <p className="text-lg font-bold font-mono text-accent">{records.halfMarathonEst}</p>
                <p className="text-[10px] text-muted-foreground">Riegel formula projection</p>
              </div>
            )}
            {records.marathonEst && (
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground">Est. Marathon</p>
                <p className="text-lg font-bold font-mono text-[var(--chart-5)]">{records.marathonEst}</p>
                <p className="text-[10px] text-muted-foreground">Riegel formula projection</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No workouts found</p>
      ) : (
        <div className="space-y-3">
          {data.map(w => (
            <div key={w.id} className="bg-card rounded-2xl p-4 space-y-2">
              <div className="flex items-start gap-3">
                <WorkoutTypeIcon type={w.workout_type} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-snug line-clamp-1">
                    {w.class_title || w.workout_type}
                  </p>
                  <p className="text-xs text-muted-foreground">{w.date} · {w.source}</p>
                </div>
                {w.hrTSS && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Training Stress Score (TSS)</p>
                    <p className="font-bold font-mono text-primary">{fmt(w.hrTSS)}</p>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                {w.duration_min && <span>{fmtTime(w.duration_min)}</span>}
                {w.distance_mi && <span>{w.distance_mi.toFixed(1)} mi</span>}
                {w.duration_min && w.distance_mi && w.distance_mi > 0.5 && (
                  <span>{fmtPace(w.duration_min, w.distance_mi)}</span>
                )}
                {w.avg_hr && <span>{fmt(w.avg_hr)} bpm</span>}
                {w.avg_cadence && <span>{fmt(w.avg_cadence)} rpm</span>}
                {w.avg_power_watts && <span>{fmt(w.avg_power_watts)}W</span>}
                {w.total_output_kj && <span>{fmt(w.total_output_kj)} kJ</span>}
                {w.calories && <span>{w.calories} kcal</span>}
              </div>

              <ZoneBar z1={w.zone1_pct} z2={w.zone2_pct} z3={w.zone3_pct} z4={w.zone4_pct} z5={w.zone5_pct} />
            </div>
          ))}

          {data.length === limit && (
            <button
              onClick={() => setLimit(l => l + 20)}
              className="w-full py-3 rounded-2xl bg-card text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
