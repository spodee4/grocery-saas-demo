"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { STORES, type ShrinkRow } from "@/lib/demo-data"
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

const DEPT_COLORS: Record<string, string> = {
  Meat: "oklch(0.65 0.18 25)",
  Produce: "oklch(0.65 0.18 145)",
  Bakery: "oklch(0.72 0.16 70)",
  "Service Deli": "oklch(0.68 0.16 55)",
  Dairy: "oklch(0.65 0.12 220)",
  Grocery: "oklch(0.6 0.12 260)",
  "Frozen Foods": "oklch(0.63 0.14 200)",
  Beverages: "oklch(0.68 0.15 300)",
}

const CAUSE_COLORS = [
  "oklch(0.65 0.18 145)",  // green — expired/pulldate
  "oklch(0.65 0.16 55)",   // amber — damage
  "oklch(0.63 0.14 200)",  // blue — employee
  "oklch(0.68 0.16 0)",    // red — unknown
]

// Build synthetic 6-week shrink trend from current + prior pct
function buildShrinkTrend(shrink: ShrinkRow[]) {
  const weeks = ["Feb 10", "Feb 17", "Feb 24", "Mar 3", "Mar 10 (LW)", "Mar 16 (TW)"]
  const totalSales = [148000, 151000, 147500, 153000, 149000, 155000] // synthetic weekly sales
  return weeks.map((week, i) => {
    const factor = 0.85 + i * 0.03 + (i === 3 ? 0.02 : 0) // slight upward drift
    const dollars = shrink.reduce((s, r) => {
      const base = i === 5 ? r.shrink_dollars : r.shrink_dollars * (r.prior_shrink_pct / r.shrink_pct) * factor
      return s + base
    }, 0)
    const shrink_pct = (dollars / totalSales[i]) * 100
    return { week, shrink_pct: +shrink_pct.toFixed(2), shrink_dollars: Math.round(dollars) }
  })
}

// Cause breakdown: split known into categories, keep unknown
function buildCauses(shrink: ShrinkRow[]) {
  const totalKnown = shrink.reduce((s, r) => s + r.known, 0)
  const totalUnknown = shrink.reduce((s, r) => s + r.unknown, 0)
  return [
    { name: "Expired / Pulldate", value: Math.round(totalKnown * 0.52) },
    { name: "Damage / Waste",     value: Math.round(totalKnown * 0.31) },
    { name: "Employee / Transfer", value: Math.round(totalKnown * 0.17) },
    { name: "Unknown",            value: totalUnknown },
  ]
}

// ─── Alert component ───────────────────────────────────────────────────────────

function AlertCard({ title, msg, level }: { title: string; msg: string; level: "warn" | "danger" }) {
  const colors = level === "danger"
    ? "bg-destructive/10 border-destructive/30 text-destructive"
    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
  return (
    <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${colors}`}>
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs opacity-80 mt-0.5">{msg}</p>
      </div>
    </div>
  )
}

// ─── Custom pie label ──────────────────────────────────────────────────────────

function PieLabel({ cx, cy, midAngle, outerRadius, percent }: {
  cx?: number; cy?: number; midAngle?: number; outerRadius?: number; percent?: number; name?: string; [key: string]: unknown
}) {
  if (!cx || !cy || midAngle === undefined || !outerRadius || !percent || percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 28
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central"
      className="fill-foreground/70 text-[11px]" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

function ShrinkInner() {
  const params = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const store = STORES[storeId] ?? STORES.lakes

  const shrink = store.shrink
  const totalDollars = shrink.reduce((s, r) => s + r.shrink_dollars, 0)
  const totalKnown   = shrink.reduce((s, r) => s + r.known, 0)
  const totalUnknown = shrink.reduce((s, r) => s + r.unknown, 0)
  const overallPct   = shrink.reduce((s, r) => s + r.shrink_pct, 0) / shrink.length
  const priorPct     = shrink.reduce((s, r) => s + r.prior_shrink_pct, 0) / shrink.length
  const wowDelta     = overallPct - priorPct

  const trend  = buildShrinkTrend(shrink)
  const causes = buildCauses(shrink)

  // Exceptions: unknown > known OR shrink_pct > 5
  const exceptions = shrink.filter(r => r.unknown > r.known || r.shrink_pct > 5)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Shrink</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {store.name} · Week of Mar 10–16, 2026
          </p>
        </div>
        <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md">
          BRdata · This Week
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Shrink",   value: fmt$(totalDollars),  sub: "this week" },
          { label: "Shrink %",       value: pct(overallPct),     sub: `WoW ${wowDelta >= 0 ? "+" : ""}${wowDelta.toFixed(2)}%`, warn: wowDelta > 0 },
          { label: "Known Shrink",   value: fmt$(totalKnown),    sub: `${pct(totalKnown / totalDollars * 100)} of total` },
          { label: "Unknown Shrink", value: fmt$(totalUnknown),  sub: `${pct(totalUnknown / totalDollars * 100)} of total`, warn: totalUnknown > totalKnown },
        ].map(k => (
          <div key={k.label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${k.warn ? "text-destructive" : ""}`}>{k.value}</p>
            <p className={`text-[11px] mt-0.5 ${k.warn ? "text-destructive/70" : "text-muted-foreground"}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Exception alerts */}
      {exceptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Exception Alerts</p>
          {exceptions.map(r => {
            const unknownHigh = r.unknown > r.known
            const rateHigh    = r.shrink_pct > 5
            const msg = [
              unknownHigh && `Unknown ($${r.unknown}) exceeds known ($${r.known}) — investigate root cause`,
              rateHigh    && `Shrink rate ${pct(r.shrink_pct)} exceeds 5% threshold (prior: ${pct(r.prior_shrink_pct)})`,
            ].filter(Boolean).join(" · ")
            return (
              <AlertCard
                key={r.dept}
                title={r.dept}
                msg={msg || ""}
                level={rateHigh ? "danger" : "warn"}
              />
            )
          })}
        </div>
      )}

      {/* Dept table + Cause pie (side by side on wide screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Dept breakdown table */}
        <div className="lg:col-span-3 rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <p className="text-sm font-semibold">Department Breakdown</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-2">Dept</th>
                <th className="text-right px-4 py-2">$</th>
                <th className="text-right px-4 py-2">%</th>
                <th className="text-right px-4 py-2">Known</th>
                <th className="text-right px-4 py-2">Unknown</th>
                <th className="text-right px-4 py-2">Unk %</th>
                <th className="text-right px-4 py-2">WoW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {shrink.map(r => {
                const unkPct   = r.shrink_dollars > 0 ? (r.unknown / r.shrink_dollars) * 100 : 0
                const wow      = r.shrink_pct - r.prior_shrink_pct
                const rateHigh = r.shrink_pct > 5
                const unkHigh  = r.unknown > r.known
                return (
                  <tr key={r.dept} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: DEPT_COLORS[r.dept] ?? "oklch(0.6 0.1 260)" }}
                      />
                      {r.dept}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${rateHigh ? "text-destructive font-medium" : ""}`}>
                      {fmt$(r.shrink_dollars)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${rateHigh ? "text-destructive font-medium" : ""}`}>
                      {pct(r.shrink_pct)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {fmt$(r.known)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${unkHigh ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {fmt$(r.unknown)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${unkPct > 60 ? "text-amber-500" : "text-muted-foreground"}`}>
                      {pct(unkPct)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${wow > 0 ? "text-destructive" : "text-emerald-500"}`}>
                      {wow >= 0 ? "+" : ""}{wow.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-semibold bg-muted/20">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmt$(totalDollars)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{pct(overallPct)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmt$(totalKnown)}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${totalUnknown > totalKnown ? "text-destructive" : "text-muted-foreground"}`}>
                  {fmt$(totalUnknown)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {pct(totalUnknown / totalDollars * 100)}
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${wowDelta > 0 ? "text-destructive" : "text-emerald-500"}`}>
                  {wowDelta >= 0 ? "+" : ""}{wowDelta.toFixed(2)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Cause breakdown pie */}
        <div className="lg:col-span-2 rounded-xl border bg-card px-4 py-3">
          <p className="text-sm font-semibold mb-2">Cause Breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={causes}
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="value"
                labelLine={false}
                label={(props) => <PieLabel {...props} />}
              >
                {causes.map((_, i) => (
                  <Cell key={i} fill={CAUSE_COLORS[i]} />
                ))}
              </Pie>
              <RTooltip
                formatter={(val: unknown) => [`$${Number(val ?? 0).toLocaleString()}`, ""]}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="mt-1 space-y-1.5">
            {causes.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CAUSE_COLORS[i] }} />
                  <span className="text-muted-foreground">{c.name}</span>
                </div>
                <span className="tabular-nums font-medium">{fmt$(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6-week trend */}
      <div className="rounded-xl border bg-card px-4 py-4">
        <p className="text-sm font-semibold mb-4">6-Week Shrink % Trend</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trend} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis
              tickFormatter={v => `${v.toFixed(1)}%`}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              domain={["auto", "auto"]}
            />
            <RTooltip
              formatter={(val: unknown) => [`${Number(val ?? 0).toFixed(2)}%`, "Shrink %"]}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="shrink_pct"
              stroke="var(--destructive)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--destructive)" }}
              activeDot={{ r: 5 }}
              name="Shrink %"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Threshold reference */}
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          Industry target: &lt;2.0% overall · &gt;5.0% by dept = exception alert
        </p>
      </div>
    </div>
  )
}

export default function ShrinkPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <ShrinkInner />
    </Suspense>
  )
}
