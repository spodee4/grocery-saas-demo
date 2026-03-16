"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchWorkouts } from "@/lib/api"
import type { Workout } from "@/lib/api"

function fmt(v: number | null | undefined, d = 0) {
  return v == null ? null : v.toFixed(d)
}

function fmtDist(mi: number | null | undefined) {
  if (!mi) return null
  return `${mi.toFixed(1)} mi`
}

function WorkoutTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    running: "🏃",
    cycling: "🚴",
    strength: "💪",
    stretching: "🧘",
    yoga: "🧘",
    meditation: "🧘",
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

const FILTERS = ["all", "running", "cycling", "strength"] as const
type Filter = (typeof FILTERS)[number]

export default function WorkoutsPage() {
  const [filter, setFilter] = useState<Filter>("all")
  const [limit, setLimit] = useState(20)

  const { data = [], isLoading } = useQuery<Workout[]>({
    queryKey: ["workouts", limit, filter],
    queryFn: () => fetchWorkouts(limit, filter === "all" ? undefined : filter),
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold">Workout Log</h1>
        <span className="text-xs text-muted-foreground">{data.length} shown</span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
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
                    <p className="text-xs text-muted-foreground">TSS</p>
                    <p className="font-bold font-mono text-primary">{fmt(w.hrTSS)}</p>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                {w.duration_min && <span>{fmt(w.duration_min)}m</span>}
                {w.distance_mi && <span>{fmtDist(w.distance_mi)}</span>}
                {w.avg_hr && <span>{fmt(w.avg_hr)} bpm</span>}
                {w.max_hr && <span>max {fmt(w.max_hr)}</span>}
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
