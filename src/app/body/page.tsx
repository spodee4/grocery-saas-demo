"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchBody } from "@/lib/api"
import type { BodyPoint } from "@/lib/api"
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts"

function fmt(v: number | null | undefined, d = 1) {
  return v == null ? "—" : v.toFixed(d)
}

function fmtKgLb(kg: number | null | undefined) {
  if (kg == null) return "—"
  const lb = kg * 2.20462
  return `${kg.toFixed(1)} kg · ${lb.toFixed(0)} lb`
}

function shortDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-xs space-y-1 shadow-xl">
      <p className="font-semibold text-foreground mb-1">{shortDate(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex gap-2 items-center">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium text-foreground">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function BodyPage() {
  const [days, setDays] = useState(90)
  const { data, isLoading } = useQuery<{ history: BodyPoint[]; latest: BodyPoint | null }>({
    queryKey: ["body", days],
    queryFn: () => fetchBody(days),
  })

  const latest = data?.latest
  const history = data?.history || []

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold">Body</h1>
        <div className="flex gap-1">
          {[30, 90, 180].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                days === d ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Latest measurements */}
      <div className="bg-card rounded-2xl p-4 space-y-3">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Latest · {latest?.date || "—"}
        </p>
        <div className="grid grid-cols-2 gap-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Weight</p>
            <p className="text-xl font-bold font-mono">{fmtKgLb(latest?.weight_kg)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Body Fat</p>
            <p className="text-xl font-bold font-mono text-accent">{fmt(latest?.fat_ratio)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Muscle Mass</p>
            <p className="text-xl font-bold font-mono text-secondary">{fmt(latest?.muscle_mass_kg)} kg</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fat Mass</p>
            <p className="text-xl font-bold font-mono">{fmt(latest?.fat_mass_kg)} kg</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : history.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No body measurements yet</p>
      ) : (
        <>
          {/* Weight trend */}
          <div className="bg-card rounded-2xl p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Weight (kg)</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={history} margin={{ left: -20, right: 4 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.6801 0.1583 276.93)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.6801 0.1583 276.93)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 257 / 0.5)" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} interval="preserveStartEnd" />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="weight_kg" stroke="oklch(0.6801 0.1583 276.93)" fill="url(#weightGrad)" strokeWidth={2.5} dot={false} name="Weight kg" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Body fat % trend */}
          {history.some(d => d.fat_ratio) && (
            <div className="bg-card rounded-2xl p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Body Fat %</p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={history} margin={{ left: -20, right: 4 }}>
                  <defs>
                    <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.8790 0.1534 91.61)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.8790 0.1534 91.61)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 257 / 0.5)" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} interval="preserveStartEnd" />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="fat_ratio" stroke="oklch(0.8790 0.1534 91.61)" fill="url(#fatGrad)" strokeWidth={2} dot={false} name="Fat %" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Muscle mass trend */}
          {history.some(d => d.muscle_mass_kg) && (
            <div className="bg-card rounded-2xl p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Muscle Mass (kg)</p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={history} margin={{ left: -20, right: 4 }}>
                  <defs>
                    <linearGradient id="muscleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.7845 0.1325 181.91)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.7845 0.1325 181.91)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 257 / 0.5)" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} interval="preserveStartEnd" />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="muscle_mass_kg" stroke="oklch(0.7845 0.1325 181.91)" fill="url(#muscleGrad)" strokeWidth={2} dot={false} name="Muscle kg" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
