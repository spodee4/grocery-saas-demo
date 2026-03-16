"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchTrends } from "@/lib/api"
import type { TrendPoint } from "@/lib/api"
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts"

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
  const { data = [], isLoading } = useQuery<TrendPoint[]>({
    queryKey: ["trends", days],
    queryFn: () => fetchTrends(days),
  })

  const latest = data[data.length - 1]

  const tsbData = data.map(d => ({
    ...d,
    date: d.date,
    tsb: d.tsb != null ? Math.round(d.tsb * 10) / 10 : null,
  }))

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
          { label: "CTL", value: fmt(latest?.ctl), color: "text-[var(--chart-1)]" },
          { label: "ATL", value: fmt(latest?.atl), color: "text-[var(--chart-2)]" },
          { label: "TSB", value: fmt(latest?.tsb), color: "text-[var(--chart-3)]" },
          { label: "ACWR", value: fmt(latest?.acwr, 2), color: latest?.acwr != null && latest.acwr > 1.3 ? "text-destructive" : "text-[var(--chart-4)]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* PMC chart — CTL / ATL / TSB */}
      {isLoading ? (
        <div className="h-64 bg-card rounded-2xl animate-pulse" />
      ) : (
        <div className="bg-card rounded-2xl p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Performance Management Chart</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={data} margin={{ left: -20, right: 4 }}>
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Daily TSS</p>
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
    </div>
  )
}
