"use client"

import { useState } from "react"
import { Suspense } from "react"
import { BarChart, Bar, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, Cell } from "recharts"
import { STORES } from "@/lib/demo-data"

// ─── All stores ordered by size ───────────────────────────────────────────────
const STORE_ORDER = ["quincy", "lakes", "potlatch", "oroville", "soaplake"]
const STORE_COLORS = [
  "oklch(0.6801 0.1583 276.93)",
  "oklch(0.6368 0.2078 27.33)",
  "oklch(0.7845 0.1325 181.91)",
  "oklch(0.8790 0.1534 91.61)",
  "oklch(0.65 0.12 240)",
]

type MetricKey = "sales" | "gm_pct" | "labor_pct" | "transactions" | "avg_basket" | "noi_pct"
const METRICS: { id: MetricKey; label: string; format: (n: number) => string; benchmark?: number; benchmarkLabel?: string; higherBetter: boolean }[] = [
  { id: "sales",        label: "Weekly Sales",        format: n => `$${(n / 1000).toFixed(1)}K`, higherBetter: true },
  { id: "gm_pct",       label: "Gross Margin %",      format: n => `${n.toFixed(1)}%`, benchmark: 28, benchmarkLabel: "≥28% target", higherBetter: true },
  { id: "labor_pct",    label: "Labor % of Sales",    format: n => `${n.toFixed(1)}%`, benchmark: 17.5, benchmarkLabel: "≤17.5% target", higherBetter: false },
  { id: "transactions", label: "Transactions / Week", format: n => n.toLocaleString(), higherBetter: true },
  { id: "avg_basket",   label: "Avg Basket ($)",      format: n => `$${n.toFixed(2)}`, higherBetter: true },
  { id: "noi_pct",      label: "Net Operating Income %", format: n => `${n.toFixed(1)}%`, benchmark: 3, benchmarkLabel: "≥3% target", higherBetter: true },
]

function getMetric(storeId: string, metric: MetricKey): number {
  const s = STORES[storeId]
  if (!s) return 0
  switch (metric) {
    case "sales":        return s.weekly_sales
    case "gm_pct":       return s.weekly_gm_pct
    case "labor_pct":    return 17.8 + (Math.random() * 1.4 - 0.7) // realistic variance per store
    case "transactions": return s.transactions
    case "avg_basket":   return s.avg_basket
    case "noi_pct": {
      const gm = s.weekly_gm
      const sales = s.weekly_sales
      const opex = sales * (0.178 + 0.024 + 0.022 + 0.012 + 0.008 + 0.007 + 0.005 + 0.006 + 0.009 + 0.006)
      return ((gm - opex) / sales * 100)
    }
  }
}

// Stable metric values (avoid re-render randomness)
const LABOR_PCTS: Record<string, number> = {
  quincy: 17.2, lakes: 17.8, potlatch: 18.4, oroville: 19.1, soaplake: 18.7
}
function getStableMetric(storeId: string, metric: MetricKey): number {
  const s = STORES[storeId]
  if (!s) return 0
  switch (metric) {
    case "sales":        return s.weekly_sales
    case "gm_pct":       return s.weekly_gm_pct
    case "labor_pct":    return LABOR_PCTS[storeId] ?? 18.0
    case "transactions": return s.transactions
    case "avg_basket":   return s.avg_basket
    case "noi_pct": {
      const gm = s.weekly_gm
      const sales = s.weekly_sales
      const opexPct = LABOR_PCTS[storeId] / 100 + 0.024 + 0.022 + 0.012 + 0.008 + 0.007 + 0.005 + 0.006 + 0.009 + 0.006
      return ((gm / sales - opexPct) * 100)
    }
  }
}

function fmtFull(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function CompareInner() {
  const [metric, setMetric] = useState<MetricKey>("sales")
  const metricDef = METRICS.find(m => m.id === metric)!

  const stores = STORE_ORDER.map(id => ({
    id,
    store: STORES[id],
    value: getStableMetric(id, metric),
    color: STORE_COLORS[STORE_ORDER.indexOf(id)],
  })).filter(s => s.store)

  const sorted = [...stores].sort((a, b) =>
    metricDef.higherBetter ? b.value - a.value : a.value - b.value
  )

  const chartData = stores.map(s => ({
    name: s.store.name,
    value: parseFloat(getStableMetric(s.id, metric).toFixed(2)),
    color: s.color,
  }))

  const best = sorted[0]
  const worst = sorted[sorted.length - 1]

  // WoW change (synthetic but realistic)
  const WOW: Record<string, number> = { quincy: 1.4, lakes: -0.8, potlatch: -1.5, oroville: 2.8, soaplake: 3.5 }

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Multi-Store Comparison</h1>
        <p className="text-sm text-muted-foreground mt-1">All stores · Week of Mar 10–16, 2026 · BRdata POS</p>
      </div>

      {/* Metric selector */}
      <div className="flex gap-2 flex-wrap">
        {METRICS.map(m => (
          <button key={m.id} onClick={() => setMetric(m.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              metric === m.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-card border border-border rounded-lg shadow-md ring-1 ring-border/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">{metricDef.label}</p>
          {metricDef.benchmark && (
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{metricDef.benchmarkLabel}</span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={42} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={v => metricDef.format(v).replace("$", "").replace(",", "")}
            />
            <RTooltip
              formatter={(val) => [metricDef.format(Number(val)), metricDef.label]}
              contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-5 gap-3">
        {stores.map((s, i) => {
          const rank = sorted.findIndex(r => r.id === s.id) + 1
          const wow = WOW[s.id] ?? 0
          return (
            <div key={s.id}
              className={`bg-card border rounded-lg p-4 shadow-sm space-y-3 transition-all ${
                rank === 1 ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
              }`}>
              {/* Store header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{s.store.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.store.location}</p>
                </div>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  rank === 1 ? "bg-primary/15 text-primary" :
                  rank === stores.length ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>#{rank}</span>
              </div>

              {/* Active metric */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{metricDef.label}</p>
                <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: s.color }}>
                  {metricDef.format(s.value)}
                </p>
                <p className={`text-xs font-medium mt-0.5 ${wow >= 0 ? "text-primary" : "text-destructive"}`}>
                  {wow >= 0 ? "+" : ""}{wow.toFixed(1)}% vs last week
                </p>
              </div>

              {/* Mini KPI grid */}
              <div className="space-y-1 text-[11px] pt-2 border-t border-border/50">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sales</span>
                  <span className="font-mono tabular-nums">{fmtFull(s.store.weekly_sales)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GM%</span>
                  <span className="tabular-nums">{s.store.weekly_gm_pct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Txns</span>
                  <span className="tabular-nums">{s.store.transactions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Avg $</span>
                  <span className="tabular-nums">${s.store.avg_basket.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full comparison table */}
      <div className="bg-card border border-border rounded-lg shadow-md ring-1 ring-border/30 overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold">Full KPI Scorecard</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/20">
                <th className="text-left px-5 py-3 font-medium">Metric</th>
                {stores.map(s => (
                  <th key={s.id} className="text-right px-4 py-3 font-medium">{s.store.name}</th>
                ))}
                <th className="text-right px-4 py-3 font-medium text-muted-foreground/50">Target</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map(m => {
                const vals = stores.map(s => getStableMetric(s.id, m.id))
                const best = m.higherBetter ? Math.max(...vals) : Math.min(...vals)
                return (
                  <tr key={m.id} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="px-5 py-2.5 font-medium text-muted-foreground">{m.label}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={`text-right px-4 py-2.5 tabular-nums font-mono ${
                        v === best ? "font-bold text-primary" : "text-foreground"
                      }`}>
                        {m.format(v)}
                      </td>
                    ))}
                    <td className="text-right px-4 py-2.5 text-xs text-muted-foreground/60">
                      {m.benchmarkLabel ?? "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm font-semibold text-primary mb-2">Top Performer This Week</p>
          <p className="text-base font-bold">{best.store.name} — {best.store.location}</p>
          <p className="text-sm text-muted-foreground mt-1">{metricDef.label}: {metricDef.format(best.value)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {best.id === "quincy" ? "Strong agricultural town traffic driving volume." :
             best.id === "lakes" ? "Solid suburban market with consistent basket size." :
             best.id === "potlatch" ? "Tight-knit community with loyal repeat shoppers." :
             "Smaller format with efficient labor model."}
          </p>
        </div>
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm font-semibold text-destructive mb-2">Needs Attention</p>
          <p className="text-base font-bold">{worst.store.name} — {worst.store.location}</p>
          <p className="text-sm text-muted-foreground mt-1">{metricDef.label}: {metricDef.format(worst.value)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {metricDef.id === "labor_pct" ? "Labor % above target — review scheduling and OT patterns." :
             metricDef.id === "gm_pct" ? "Margin below threshold — check shrink and promo mix." :
             metricDef.id === "noi_pct" ? "Low NOI — review all expense categories vs budget." :
             "Below chain average — investigate local market conditions."}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return <Suspense><CompareInner /></Suspense>
}
