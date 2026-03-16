"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchTrends } from "@/lib/api"
import type { TrendPoint } from "@/lib/api"
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts"

function fmt(v: number | null | undefined, d = 0) {
  return v == null ? "—" : v.toFixed(d)
}

function fmtSleep(secs: number | null | undefined) {
  if (!secs) return "—"
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h ${m}m`
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
          <span className="font-mono font-medium text-foreground">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function RecoveryPage() {
  const [days, setDays] = useState(30)
  const { data: raw = [], isLoading } = useQuery<TrendPoint[]>({
    queryKey: ["trends", days],
    queryFn: () => fetchTrends(days),
  })

  // Cast trend data — the API may include extra fields
  const data = raw as any[]

  // Use most recently enriched row for snapshot cards (today's row often has nulls)
  const latest = [...data].reverse().find(d => d.hrv_last_night != null || d.sleep_seconds != null) ?? data[data.length - 1]

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold">Recovery</h1>
        <div className="flex gap-1">
          {[7, 14, 30, 60].map(d => (
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

      {/* Today snapshot */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">HRV (Last Night)</p>
          <p className="text-3xl font-bold font-mono text-secondary">{fmt(latest?.hrv_last_night, 1)}</p>
          <p className="text-xs text-muted-foreground">status: {latest?.hrv_status ?? "—"}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Resting HR</p>
          <p className="text-3xl font-bold font-mono">{fmt(latest?.resting_hr)}</p>
          <p className="text-xs text-muted-foreground">baseline: 54 bpm</p>
        </div>
        <div className="bg-card rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Sleep</p>
          <p className="text-3xl font-bold font-mono">{fmtSleep(latest?.sleep_seconds)}</p>
          <p className="text-xs text-muted-foreground">deep: {fmtSleep(latest?.deep_sleep_seconds)}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Body Battery</p>
          <p className="text-3xl font-bold font-mono text-accent">{fmt(latest?.body_battery_wake)}</p>
          <p className="text-xs text-muted-foreground">eod: {fmt(latest?.body_battery_eod)}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Steps</p>
          <p className="text-3xl font-bold font-mono">{latest?.steps ? latest.steps.toLocaleString() : "—"}</p>
          <p className="text-xs text-muted-foreground">active: {fmt(latest?.active_kcal, 0)} kcal</p>
        </div>
        <div className="bg-card rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Stress</p>
          <p className="text-3xl font-bold font-mono">{fmt(latest?.stress_avg, 0)}</p>
          <p className="text-xs text-muted-foreground">readiness: {latest?.training_readiness_score ?? "—"}</p>
        </div>
      </div>

      {!isLoading && !data.some((d: any) => d.hrv_last_night || d.sleep_seconds || d.body_battery_wake) && (
        <div className="bg-card rounded-2xl p-4 space-y-2 border border-border">
          <p className="text-sm font-medium text-foreground">Recovery data syncing</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Heart Rate Variability (HRV), sleep, and body battery pull from Garmin via the Mac mini enrichment pipeline.
            Data will appear here once the nightly sync (5–6 AM) runs and writes to coach.db.
          </p>
          <p className="text-xs text-muted-foreground">
            Once active, you'll see HRV trends, sleep quality, and body battery charts across 14–60 day windows.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* HRV trend */}
          {data.some((d: any) => d.hrv_last_night) && (
            <div className="bg-card rounded-2xl p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">HRV Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data} margin={{ left: -20, right: 4 }}>
                  <defs>
                    <linearGradient id="hrvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.7845 0.1325 181.91)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.7845 0.1325 181.91)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 257 / 0.5)" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="hrv_last_night" stroke="oklch(0.7845 0.1325 181.91)" fill="url(#hrvGrad)" strokeWidth={2} dot={false} name="HRV" />
                  {/* rolling avg computed client-side — skip if field unavailable */}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sleep trend */}
          {data.some((d: any) => d.sleep_seconds) && (
            <div className="bg-card rounded-2xl p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sleep (hours)</p>
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart
                  data={data.map((d: any) => ({
                    ...d,
                    sleep_h: d.sleep_seconds ? d.sleep_seconds / 3600 : null,
                    deep_h: d.deep_sleep_seconds ? d.deep_sleep_seconds / 3600 : null,
                  }))}
                  margin={{ left: -20, right: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 257 / 0.5)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={8} stroke="oklch(0.65 0.02 257)" strokeDasharray="3 2" />
                  <Bar dataKey="sleep_h" fill="oklch(0.6801 0.1583 276.93 / 0.6)" radius={[2, 2, 0, 0]} name="Sleep h" stackId="a" />
                  <Bar dataKey="deep_h" fill="oklch(0.6801 0.1583 276.93)" radius={[2, 2, 0, 0]} name="Deep h" stackId="b" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Body battery */}
          {data.some((d: any) => d.body_battery_wake) && (
            <div className="bg-card rounded-2xl p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Body Battery (Wake)</p>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={data} margin={{ left: -20, right: 4 }}>
                  <defs>
                    <linearGradient id="bbGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.8790 0.1534 91.61)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.8790 0.1534 91.61)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 257 / 0.5)" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="body_battery_wake" stroke="oklch(0.8790 0.1534 91.61)" fill="url(#bbGrad)" strokeWidth={2} dot={false} name="Battery" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
