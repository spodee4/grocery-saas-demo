"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { STORES } from "@/lib/demo-data"
import { AreaChart, Area, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts"

function fmt$(n: number) {
  if (n >= 1000000) return `$${(n/1000000).toFixed(2)}M`
  if (n >= 1000) return `$${(n/1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

// Mini sparkline SVG for each department trend
function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 60; const h = 20
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(" ")
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={pts} fill="none" stroke={positive ? "var(--primary)" : "var(--destructive)"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Generate synthetic 6-week dept trend from WoW pattern (demo only)
function deptTrend(sales: number, wowPct: number): number[] {
  const points: number[] = []
  let v = sales / (1 + wowPct / 100) // prior week
  const step = wowPct / 5
  for (let i = 5; i >= 0; i--) {
    points.push(Math.round(v * (1 + (step * (5 - i)) / 100 * 0.2)))
  }
  points[5] = sales
  return points
}

function PnLInner() {
  const params = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const store = STORES[storeId] ?? STORES.lakes

  const totalPurchases = store.departments.reduce((s, d) => s + d.purchases, 0)

  // Build 6-week chart data per dept using store weekly trend as scaling base
  const weekLabels = store.weekly_trend.map(w => w.week)
  const deptChartData = weekLabels.map((week, wi) => {
    const scaleFactor = store.weekly_trend[wi].sales / store.weekly_sales
    const row: Record<string, number | string> = { week }
    store.departments.forEach(d => {
      row[d.dept] = Math.round(d.sales * scaleFactor)
    })
    return row
  })

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Department P&L</h1>
        <p className="text-sm text-muted-foreground mt-1">{store.name} · {store.location} · Week of Mar 10–16, 2026</p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Sales",    value: fmt$(store.weekly_sales) },
          { label: "Purchases (COGS)", value: fmt$(totalPurchases), color: "text-foreground" },
          { label: "Gross Profit",   value: fmt$(store.weekly_gm),      color: "text-primary" },
          { label: "Gross Margin",   value: `${store.weekly_gm_pct.toFixed(1)}%`, color: "text-primary" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{c.label}</p>
            <p className={`text-3xl font-semibold tabular-nums mt-1 ${c.color ?? ""}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-medium">By Department</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-5 py-3 text-left   text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</th>
              <th className="px-5 py-3 text-right  text-xs font-medium text-muted-foreground uppercase tracking-wide">Sales</th>
              <th className="px-5 py-3 text-right  text-xs font-medium text-muted-foreground uppercase tracking-wide">Purchases</th>
              <th className="px-5 py-3 text-right  text-xs font-medium text-muted-foreground uppercase tracking-wide">Prior Week</th>
              <th className="px-5 py-3 text-right  text-xs font-medium text-muted-foreground uppercase tracking-wide">WoW</th>
              <th className="px-5 py-3 text-right  text-xs font-medium text-muted-foreground uppercase tracking-wide">Gross Profit</th>
              <th className="px-5 py-3 text-right  text-xs font-medium text-muted-foreground uppercase tracking-wide">GM%</th>
              <th className="px-5 py-3 text-right  text-xs font-medium text-muted-foreground uppercase tracking-wide">6-Wk</th>
            </tr>
          </thead>
          <tbody>
            {store.departments.map((d, i) => {
              const salesShare = (d.sales / store.weekly_sales) * 100
              const trend = deptTrend(d.sales, d.wow_pct)
              return (
                <tr key={d.dept} className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                  <td className="px-5 py-3">
                    <div className="font-medium">{d.dept}</div>
                    <div className="mt-1 h-1 bg-border rounded-full overflow-hidden w-28">
                      <div className="h-full bg-primary/40 rounded-full" style={{ width: `${salesShare}%` }} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{fmt$(d.sales)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">{fmt$(d.purchases)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">{fmt$(d.prior_sales)}</td>
                  <td className={`px-5 py-3 text-right font-mono tabular-nums text-xs font-medium ${d.wow_pct >= 0 ? "text-primary" : "text-destructive"}`}>
                    {d.wow_pct >= 0 ? "+" : ""}{d.wow_pct.toFixed(1)}%
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-primary">{fmt$(d.gm_dollars)}</td>
                  <td className={`px-5 py-3 text-right font-mono tabular-nums font-semibold ${d.gm_pct >= 35 ? "text-primary" : d.gm_pct >= 28 ? "text-foreground" : "text-secondary"}`}>
                    {d.gm_pct.toFixed(1)}%
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Sparkline values={trend} positive={d.wow_pct >= 0} />
                  </td>
                </tr>
              )
            })}
            {/* Totals */}
            <tr className="border-t-2 border-border font-semibold bg-muted/20">
              <td className="px-5 py-3">Total</td>
              <td className="px-5 py-3 text-right font-mono tabular-nums">{fmt$(store.weekly_sales)}</td>
              <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">{fmt$(totalPurchases)}</td>
              <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">{fmt$(store.prior_weekly_sales)}</td>
              <td className={`px-5 py-3 text-right font-mono tabular-nums text-xs font-medium ${store.weekly_sales >= store.prior_weekly_sales ? "text-primary" : "text-destructive"}`}>
                {((store.weekly_sales - store.prior_weekly_sales) / store.prior_weekly_sales * 100).toFixed(1)}%
              </td>
              <td className="px-5 py-3 text-right font-mono tabular-nums text-primary">{fmt$(store.weekly_gm)}</td>
              <td className="px-5 py-3 text-right font-mono tabular-nums text-primary">{store.weekly_gm_pct.toFixed(1)}%</td>
              <td className="px-5 py-3" />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dept trends chart */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-medium">Department Sales Trends · 6 Weeks</p>
        </div>
        <div className="p-5 grid grid-cols-2 gap-6">
          {store.departments.slice(0, 6).map(d => {
            const color = d.wow_pct >= 0 ? "var(--primary)" : "var(--destructive)"
            const chartData = deptChartData.map(row => ({ week: row.week as string, sales: row[d.dept] as number }))
            return (
              <div key={d.dept}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium">{d.dept}</p>
                  <span className={`text-xs font-medium ${d.wow_pct >= 0 ? "text-primary" : "text-destructive"}`}>
                    {d.wow_pct >= 0 ? "+" : ""}{d.wow_pct.toFixed(1)}% WoW
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={70}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${d.dept}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="10%" stopColor={color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={["auto", "auto"]} />
                    <RTooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: 11, color: "var(--foreground)" }}
                      labelStyle={{ color: "var(--muted-foreground)" }}
                      itemStyle={{ fontWeight: 600 }}
                      formatter={(v: unknown) => [fmt$(Number(v ?? 0)), ""]}
                    />
                    <Area type="monotone" dataKey="sales" stroke={color} strokeWidth={2} fill={`url(#grad-${d.dept})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </div>
      </div>

      {/* FMS callout */}
      <div className="bg-card border border-secondary/30 rounded-lg p-5 flex items-center justify-between shadow-sm">
        <div>
          <p className="font-medium text-sm">FMS Solutions delivers this report 60–90 days late, via spreadsheet.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Store Intelligence pulls from your POS every night. Your financials are live.</p>
        </div>
        <div className="flex gap-8 ml-8 shrink-0">
          <div className="text-center space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">FMS Solutions</p>
            <div>
              <p className="text-[10px] text-muted-foreground">1 store</p>
              <p className="font-semibold text-destructive">$1,266/mo</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">2 stores</p>
              <p className="font-semibold text-destructive">$2,532/mo</p>
            </div>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Store Intelligence</p>
            <div>
              <p className="text-[10px] text-muted-foreground">1 store</p>
              <p className="font-semibold text-primary">$699/mo</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">2 stores</p>
              <p className="font-semibold text-primary">$1,199/mo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PnLPage() {
  return <Suspense><PnLInner /></Suspense>
}
