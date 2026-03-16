"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchTrends } from "@/lib/api"
import type { TrendPoint } from "@/lib/api"
import type { PerformanceInsights } from "@/app/api/performance-insights/route"
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts"

async function fetchInsights(force = false): Promise<PerformanceInsights> {
  const res = await fetch(`/api/performance-insights${force ? "?force=1" : ""}`)
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

const COLORS = {
  ctl: "oklch(0.6801 0.1583 276.93)",
  atl: "oklch(0.7845 0.1325 181.91)",
  tsb: "oklch(0.8790 0.1534 91.61)",
  acwr: "oklch(0.7106 0.1661 22.22)",
  vo2: "oklch(0.78 0.16 145)",
  tss: "oklch(0.55 0.12 257)",
}

function fmt(v: number | null | undefined, d = 1) {
  return v == null ? "—" : v.toFixed(d)
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
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium text-foreground">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function PerformancePage() {
  const [days, setDays] = useState(90)
  const [activeMetric, setActiveMetric] = useState<string | null>(null)
  const { data = [], isLoading } = useQuery<TrendPoint[]>({
    queryKey: ["trends", days],
    queryFn: () => fetchTrends(days),
  })

  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights, isFetching: insightsFetching } = useQuery<PerformanceInsights>({
    queryKey: ["performance-insights"],
    queryFn: () => fetchInsights(),
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  })

  const latest = data[data.length - 1]

  const tsbData = data.map(d => ({
    ...d,
    date: d.date,
    tsb: d.tsb != null ? Math.round(d.tsb * 10) / 10 : null,
  }))

  function getTrendDir(key: string): string {
    const vals = data.filter(d => (d as any)[key] != null && (d as any)[key] !== 0).map(d => (d as any)[key] as number)
    if (vals.length < 3) return ""
    const diff = vals[vals.length - 1] - vals[vals.length - 4 >= 0 ? vals.length - 4 : 0]
    if (Math.abs(diff) < 0.3) return "→ stable"
    return diff > 0 ? "↑ rising" : "↓ falling"
  }

  const firstMeaningfulIdx = data.findIndex(d => (d.ctl ?? 0) > 0 || (d.atl ?? 0) > 0)
  const pmcData = firstMeaningfulIdx >= 0 ? data.slice(Math.max(0, firstMeaningfulIdx - 1)) : data

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold">Performance</h1>
        <div className="flex gap-1">
          {[30, 60, 90].map(d => (
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

      {/* PMC summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: "ctl", label: "CTL", value: fmt(latest?.ctl), color: "text-[var(--chart-1)]" },
          { key: "atl", label: "ATL", value: fmt(latest?.atl), color: "text-[var(--chart-2)]" },
          { key: "tsb", label: "TSB", value: fmt(latest?.tsb), color: "text-[var(--chart-3)]" },
          { key: "acwr", label: "ACWR", value: fmt(latest?.acwr, 2), color: latest?.acwr != null && latest.acwr > 1.3 ? "text-destructive" : "text-[var(--chart-4)]" },
        ].map(({ key, label, value, color }) => (
          <button
            key={label}
            onClick={() => setActiveMetric(activeMetric === key ? null : key)}
            className={`bg-card rounded-xl p-2.5 text-center transition-all ${activeMetric === key ? "ring-1 ring-primary/50" : ""}`}
          >
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
          </button>
        ))}
      </div>

      {activeMetric && (() => {
        const metricInfo: Record<string, { full: string; definition: string; target: string; relationships: string; focus: string }> = {
          ctl: {
            full: "Chronic Training Load (CTL)",
            definition: "42-day rolling fitness score — the sum of all your training stress over the past 6 weeks. Higher = more aerobic base built.",
            target: "Target: 75+ by race day (July 18, 2026). Currently " + fmt(latest?.ctl) + " — need +" + (75 - (latest?.ctl ?? 0)).toFixed(0) + " more points.",
            relationships: "CTL rises when ATL consistently stays above it (progressive overload). When TSB is deeply negative, CTL is climbing — that's the point. CTL and VO2 max tend to track together over months.",
            focus: "Add 1 more workout per week. Every easy Zone 2 run adds ~5-10 CTL points over the following week. Consistency beats intensity here.",
          },
          atl: {
            full: "Acute Training Load (ATL)",
            definition: "7-day rolling fatigue — how hard you've trained in the past week. It spikes after hard sessions and drops quickly with rest.",
            target: "Healthy ATL: 1.0–1.3× your CTL. When ATL >> CTL (high ACWR), injury risk rises.",
            relationships: "ATL - CTL = TSB (your form). When ATL drops below CTL, TSB goes positive — you peak. ATL drives short-term fatigue and is the reason TSB is negative right now.",
            focus: "Don't spike ATL suddenly — it should rise gradually with CTL. After hard days, allow ATL to dip before the next quality session.",
          },
          tsb: {
            full: "Training Stress Balance (TSB)",
            definition: "Your 'form' score — CTL minus ATL. Positive = fresh and race-ready. Negative = fatigued and building fitness.",
            target: "Race day target: +15 to +25 (taper phase). Right now negative TSB is GOOD — you're in build mode, accumulating fitness stress.",
            relationships: "TSB is directly controlled by the gap between CTL and ATL. As you rest, ATL drops fast (7-day), CTL drops slow (42-day) — TSB rises. This is the taper effect.",
            focus: "During build: accept -10 to -25 TSB. It means you're loading. Flip it positive for key races by tapering 2-3 weeks before.",
          },
          acwr: {
            full: "Acute:Chronic Workload Ratio (ACWR)",
            definition: "This week's load (ATL) divided by your 4-week average (CTL). Safe zone: 0.8–1.3. Above 1.3 = injury risk. The current 6.00 is likely a data calibration artifact — CTL is near zero, making the ratio artificially extreme.",
            target: "Keep ACWR between 0.8–1.3 for safe progressive loading. As CTL builds over the next 4–6 weeks, this ratio will normalize automatically.",
            relationships: "ACWR is ATL÷CTL. As CTL grows from consistent training, this ratio will naturally drop to safe ranges without you doing anything different. The number should stabilize by week 4-5.",
            focus: "The biggest lever: build CTL through consistent easy running. As CTL rises, ACWR drops. Don't reduce volume — just keep it consistent.",
          },
        }
        const info = metricInfo[activeMetric]
        const trend = getTrendDir(activeMetric)
        if (!info) return null
        return (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3 -mt-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-primary">{info.full}</p>
              {trend && <span className="text-xs text-muted-foreground font-mono">{trend}</span>}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{info.definition}</p>
            <div className="space-y-2.5">
              <div className="border-l-2 border-primary/50 pl-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Target</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{info.target}</p>
              </div>
              <div className="border-l-2 border-secondary/50 pl-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">How It Relates</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{info.relationships}</p>
              </div>
              <div className="border-l-2 border-accent/50 pl-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Focus To Improve</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{info.focus}</p>
              </div>
            </div>
            <button onClick={() => setActiveMetric(null)} className="text-[10px] text-muted-foreground hover:text-foreground">Close ×</button>
          </div>
        )
      })()}

      {/* PMC chart — CTL / ATL / TSB */}
      {isLoading ? (
        <div className="h-64 bg-card rounded-2xl animate-pulse" />
      ) : (
        <div className="bg-card rounded-2xl p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Performance Management Chart</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={pmcData} margin={{ left: -20, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 257 / 0.5)" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="oklch(0.28 0.02 257)" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="ctl" stroke={COLORS.ctl} strokeWidth={2} dot={false} name="CTL" />
              <Line type="monotone" dataKey="atl" stroke={COLORS.atl} strokeWidth={2} dot={false} name="ATL" />
              <Line type="monotone" dataKey="tsb" stroke={COLORS.tsb} strokeWidth={1.5} dot={false} name="TSB" strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ACWR chart */}
      {!isLoading && (
        <div className="bg-card rounded-2xl p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ACWR (Injury Risk)</p>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={data} margin={{ left: -20, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 257 / 0.5)" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} interval="preserveStartEnd" />
              <YAxis domain={[0.5, 1.8]} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={1.3} stroke={COLORS.acwr} strokeDasharray="4 2" label={{ value: "1.3", position: "right", fontSize: 9, fill: COLORS.acwr }} />
              <ReferenceLine y={0.8} stroke="oklch(0.65 0.02 257)" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="acwr" stroke={COLORS.acwr} strokeWidth={2} dot={false} name="ACWR" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* VO2 max trend */}
      {!isLoading && data.some(d => d.vo2_max) && (
        <div className="bg-card rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">VO2 Max</p>
            <span className="text-sm font-bold font-mono text-[var(--chart-5)]">{fmt(latest?.vo2_max)} · target 55+</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <ComposedChart data={data.filter(d => d.vo2_max)} margin={{ left: -20, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 257 / 0.5)" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} interval="preserveStartEnd" />
              <YAxis domain={[45, 58]} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={55} stroke={COLORS.vo2} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="vo2_max" stroke={COLORS.vo2} strokeWidth={2.5} dot={{ fill: COLORS.vo2, r: 3 }} name="VO2" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* TSS load bars */}
      {!isLoading && (
        <div className="bg-card rounded-2xl p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Daily Training Stress Score (TSS)</p>
          <ResponsiveContainer width="100%" height={120}>
            <ComposedChart data={data.slice(-30)} margin={{ left: -20, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 257 / 0.5)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.65 0.02 257)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tss" fill={COLORS.tss} opacity={0.8} radius={[2, 2, 0, 0]} name="TSS" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Performance Insights */}
      <div className="bg-card rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Body Intelligence</p>
          <button
            onClick={() => refetchInsights()}
            disabled={insightsFetching}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            {insightsFetching ? "Analyzing…" : "↺ Refresh"}
          </button>
        </div>

        {insightsLoading || insightsFetching ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-muted/50 rounded animate-pulse" style={{ width: `${70 + i * 8}%` }} />
            ))}
          </div>
        ) : insights ? (
          <div className="space-y-4">
            {/* Narrative */}
            <p className="text-sm text-foreground/90 leading-relaxed italic border-l-2 border-primary/40 pl-3">
              {insights.narrative}
            </p>

            {/* What's working */}
            {insights.bullets_working?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-secondary uppercase tracking-wider">What's Working</p>
                {insights.bullets_working.map((b, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-secondary text-xs shrink-0 mt-0.5">✓</span>
                    <p className="text-xs text-foreground/80 leading-relaxed">{b}</p>
                  </div>
                ))}
              </div>
            )}

            {/* What to improve */}
            {insights.bullets_improve?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-accent uppercase tracking-wider">Focus Areas</p>
                {insights.bullets_improve.map((b, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-accent text-xs shrink-0 mt-0.5">→</span>
                    <p className="text-xs text-foreground/80 leading-relaxed">{b}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Patterns */}
            {insights.patterns?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-primary uppercase tracking-wider">Patterns Detected</p>
                {insights.patterns.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-primary text-xs shrink-0 mt-0.5">◈</span>
                    <p className="text-xs text-foreground/80 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Zone comment */}
            {insights.zone_comment && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
                Zone balance: {insights.zone_comment}
              </p>
            )}

            <p className="text-[10px] text-muted-foreground">
              Generated {new Date(insights.generated_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Could not load insights</p>
        )}
      </div>
    </div>
  )
}
