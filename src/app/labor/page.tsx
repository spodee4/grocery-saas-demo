"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { BarChart, Bar, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, ReferenceLine } from "recharts"
import { STORES } from "@/lib/demo-data"

// ─── Labor model ─────────────────────────────────────────────────────────────
// Labor % by dept (typical grocery benchmarks)
const DEPT_LABOR_PCT: Record<string, number> = {
  "Grocery":      0.110,
  "Meat":         0.220,
  "Produce":      0.185,
  "Dairy":        0.085,
  "Beverages":    0.075,
  "Frozen Foods": 0.080,
  "Bakery":       0.285,
  "Non-Foods":    0.095,
  "Beer & Wine":  0.060,
  "Service Deli": 0.310,
}
const AVG_HOURLY = 16.50
const BUDGET_LABOR_PCT = 0.175  // 17.5% target

const WEEKLY_LABOR_TREND = [
  { week: "Wk 7",  pct: 18.4, ot_hrs: 42 },
  { week: "Wk 8",  pct: 17.9, ot_hrs: 38 },
  { week: "Wk 9",  pct: 18.2, ot_hrs: 44 },
  { week: "Wk 10", pct: 17.6, ot_hrs: 31 },
  { week: "WTD",   pct: 17.8, ot_hrs: 36 },
]

function fmt$(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}
function fmtFull(n: number) {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function LaborInner() {
  const params = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const store = STORES[storeId] ?? STORES.lakes
  const [expandedDept, setExpandedDept] = useState<string | null>(null)

  const netSales = store.weekly_sales
  const totalLaborDollars = Math.round(netSales * 0.178)
  const totalLaborPct = totalLaborDollars / netSales * 100
  const budgetDollars = Math.round(netSales * BUDGET_LABOR_PCT)
  const laborVariance = totalLaborDollars - budgetDollars

  // Build department labor rows
  const deptRows = store.departments.map(d => {
    const pct = DEPT_LABOR_PCT[d.dept] ?? 0.12
    const laborDollars = Math.round(d.sales * pct)
    const budgetD = Math.round(d.sales * (pct * 0.96))
    const scheduledHrs = Math.round(laborDollars / AVG_HOURLY * 0.94)
    const actualHrs = Math.round(laborDollars / AVG_HOURLY)
    const otHrs = Math.round(actualHrs * (pct > 0.20 ? 0.08 : 0.04))
    const otPct = otHrs / actualHrs * 100
    const laborPct = laborDollars / d.sales * 100
    return { dept: d.dept, laborDollars, budgetD, scheduledHrs, actualHrs, otHrs, otPct, laborPct, deptSales: d.sales, variance: laborDollars - budgetD }
  })

  // FTE calc: assume 35hr week avg
  const totalHours = Math.round(totalLaborDollars / AVG_HOURLY)
  const fteCount = Math.round(totalHours / 35)
  const totalOtHrs = deptRows.reduce((s, d) => s + d.otHrs, 0)

  // Employee roster sim
  const EMPLOYEES: { name: string; dept: string; type: "FT" | "PT"; scheduled: number; actual: number; ot: number; rate: number }[] = [
    { name: "Josh T.",    dept: "Grocery",      type: "FT", scheduled: 40, actual: 44, ot: 4,  rate: 17.50 },
    { name: "Maria L.",   dept: "Bakery",       type: "FT", scheduled: 40, actual: 42, ot: 2,  rate: 18.25 },
    { name: "Aaron M.",   dept: "Meat",         type: "FT", scheduled: 40, actual: 45, ot: 5,  rate: 20.00 },
    { name: "Susan K.",   dept: "Produce",      type: "FT", scheduled: 40, actual: 41, ot: 1,  rate: 17.00 },
    { name: "Derek P.",   dept: "Service Deli", type: "FT", scheduled: 40, actual: 40, ot: 0,  rate: 18.75 },
    { name: "Chloe R.",   dept: "Dairy",        type: "PT", scheduled: 24, actual: 26, ot: 0,  rate: 15.75 },
    { name: "Tom W.",     dept: "Beverages",    type: "PT", scheduled: 20, actual: 20, ot: 0,  rate: 15.50 },
    { name: "Angela B.",  dept: "Frozen Foods", type: "PT", scheduled: 28, actual: 30, ot: 0,  rate: 16.00 },
    { name: "Mike S.",    dept: "Grocery",      type: "PT", scheduled: 32, actual: 34, ot: 0,  rate: 15.75 },
    { name: "Lisa N.",    dept: "Non-Foods",    type: "PT", scheduled: 24, actual: 24, ot: 0,  rate: 15.50 },
  ]

  const highLaborDepts = deptRows.filter(d => d.laborPct > 22)
  const overBudgetDepts = deptRows.filter(d => d.variance > 0)

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Labor & Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {store.name} · {store.location} · Week of Mar 10–16, 2026
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          Connected via Connecteam
        </div>
      </div>

      {/* Alerts */}
      {(highLaborDepts.length > 0 || laborVariance > 1000) && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-1">
          <p className="text-sm font-semibold text-destructive">Labor Alerts</p>
          {highLaborDepts.map(d => (
            <p key={d.dept} className="text-xs text-muted-foreground">
              · {d.dept}: {d.laborPct.toFixed(1)}% labor — above 22% threshold ({fmtFull(d.variance)} over budget)
            </p>
          ))}
          {laborVariance > 1000 && highLaborDepts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              · Total labor {fmtFull(laborVariance)} over budget this week
            </p>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Labor Cost",     value: fmtFull(totalLaborDollars), sub: `Budget: ${fmtFull(budgetDollars)}`, accent: laborVariance > 0 ? "text-destructive" : "text-primary" },
          { label: "Labor % of Sales",     value: `${totalLaborPct.toFixed(1)}%`, sub: `Target ≤ ${(BUDGET_LABOR_PCT * 100).toFixed(1)}%`, accent: totalLaborPct > 18 ? "text-destructive" : "text-primary" },
          { label: "Total Hours Worked",   value: totalHours.toLocaleString(), sub: `~${fteCount} FTE equivalent`, accent: "text-foreground" },
          { label: "Overtime Hours",       value: String(totalOtHrs), sub: `${(totalOtHrs / totalHours * 100).toFixed(1)}% of total hours`, accent: totalOtHrs > 50 ? "text-destructive" : "text-foreground" },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${card.accent}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Labor trend chart */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-5">
        <p className="text-sm font-semibold mb-4">Weekly Labor % Trend</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={WEEKLY_LABOR_TREND} barSize={32}>
            <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[16, 20]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
            <RTooltip
              formatter={(val) => [`${Number(val).toFixed(1)}%`, "Labor %"]}
              contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}
            />
            <ReferenceLine y={BUDGET_LABOR_PCT * 100} stroke="oklch(0.7 0.15 160)" strokeDasharray="3 3" label={{ value: "Target", fontSize: 10, fill: "oklch(0.7 0.15 160)" }} />
            <Bar dataKey="pct" fill="oklch(0.6801 0.1583 276.93)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Department breakdown */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold">Department Labor Breakdown</p>
          <p className="text-xs text-muted-foreground">Click row to expand employee detail</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border">
                <th className="text-left px-5 py-2.5 font-medium">Department</th>
                <th className="text-right px-3 py-2.5 font-medium">Labor $</th>
                <th className="text-right px-3 py-2.5 font-medium">% of Sales</th>
                <th className="text-right px-3 py-2.5 font-medium">Sched Hrs</th>
                <th className="text-right px-3 py-2.5 font-medium">Actual Hrs</th>
                <th className="text-right px-3 py-2.5 font-medium">OT Hrs</th>
                <th className="text-right px-3 py-2.5 font-medium">vs Budget</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {deptRows.map(d => (
                <>
                  <tr
                    key={d.dept}
                    onClick={() => setExpandedDept(expandedDept === d.dept ? null : d.dept)}
                    className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-2.5 font-medium">{d.dept}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums font-mono">{fmtFull(d.laborDollars)}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums font-semibold ${d.laborPct > 22 ? "text-destructive" : d.laborPct > 19 ? "text-yellow-500" : "text-foreground"}`}>
                      {d.laborPct.toFixed(1)}%
                    </td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-muted-foreground">{d.scheduledHrs}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums">{d.actualHrs}</td>
                    <td className={`text-right px-3 py-2.5 tabular-nums ${d.otHrs > 6 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {d.otHrs > 0 ? d.otHrs : "—"}
                    </td>
                    <td className={`text-right px-3 py-2.5 tabular-nums text-xs font-medium ${d.variance > 0 ? "text-destructive" : "text-primary"}`}>
                      {d.variance > 0 ? `+${fmtFull(d.variance)}` : fmtFull(Math.abs(d.variance)) === "$0" ? "On target" : `-${fmtFull(Math.abs(d.variance))}`}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground/50 text-xs">
                      {expandedDept === d.dept ? "▲" : "▼"}
                    </td>
                  </tr>
                  {expandedDept === d.dept && (
                    <tr key={`${d.dept}-expand`} className="bg-muted/10 border-b border-border/50">
                      <td colSpan={8} className="px-5 py-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Employees — {d.dept}</p>
                        <div className="space-y-1">
                          {EMPLOYEES.filter(e => e.dept === d.dept).map(e => (
                            <div key={e.name} className="flex items-center gap-6 text-xs">
                              <span className="w-24 font-medium">{e.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${e.type === "FT" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{e.type}</span>
                              <span className="text-muted-foreground">Sched: {e.scheduled}h</span>
                              <span>Actual: {e.actual}h</span>
                              {e.ot > 0 && <span className="text-destructive font-medium">OT: {e.ot}h</span>}
                              <span className="text-muted-foreground">${e.rate.toFixed(2)}/hr</span>
                              <span className="font-mono tabular-nums">{fmt$(e.actual * e.rate)}</span>
                            </div>
                          ))}
                          {EMPLOYEES.filter(e => e.dept === d.dept).length === 0 && (
                            <p className="text-xs text-muted-foreground italic">No employee data — connect Connecteam to pull live schedules</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {/* Totals row */}
              <tr className="bg-muted/20 font-semibold border-t-2 border-foreground/20">
                <td className="px-5 py-3">Total</td>
                <td className="text-right px-3 py-3 tabular-nums font-mono">{fmtFull(totalLaborDollars)}</td>
                <td className={`text-right px-3 py-3 tabular-nums font-bold ${totalLaborPct > 18 ? "text-destructive" : "text-primary"}`}>
                  {totalLaborPct.toFixed(1)}%
                </td>
                <td className="text-right px-3 py-3 tabular-nums text-muted-foreground">{deptRows.reduce((s, d) => s + d.scheduledHrs, 0)}</td>
                <td className="text-right px-3 py-3 tabular-nums">{totalHours}</td>
                <td className={`text-right px-3 py-3 tabular-nums ${totalOtHrs > 40 ? "text-destructive font-bold" : ""}`}>{totalOtHrs}</td>
                <td className={`text-right px-3 py-3 tabular-nums text-sm font-bold ${laborVariance > 0 ? "text-destructive" : "text-primary"}`}>
                  {laborVariance > 0 ? `+${fmtFull(laborVariance)}` : `-${fmtFull(Math.abs(laborVariance))}`}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Staffing mix */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg shadow-sm p-5">
          <p className="text-sm font-semibold mb-3">Staffing Mix</p>
          <div className="space-y-2 text-sm">
            {[
              { label: "Full-Time",   count: EMPLOYEES.filter(e => e.type === "FT").length, pct: 0.48, color: "bg-primary" },
              { label: "Part-Time",   count: EMPLOYEES.filter(e => e.type === "PT").length, pct: 0.52, color: "bg-primary/40" },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-20 text-xs text-muted-foreground">{r.label}</span>
                <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                  <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct * 100}%` }} />
                </div>
                <span className="text-xs tabular-nums w-8 text-right">{r.count}</span>
                <span className="text-xs text-muted-foreground w-10">{(r.pct * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between"><span>Avg hourly rate</span><span className="font-mono">${AVG_HOURLY.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Benefits load (est.)</span><span className="font-mono">18.2%</span></div>
            <div className="flex justify-between"><span>Total labor + benefits</span><span className="font-mono font-semibold">{fmtFull(Math.round(totalLaborDollars * 1.182))}</span></div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm p-5">
          <p className="text-sm font-semibold mb-3">Week-over-Week OT</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={WEEKLY_LABOR_TREND} barSize={28}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <RTooltip
                formatter={(val) => [`${val} hrs`, "OT Hours"]}
                contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}
              />
              <ReferenceLine y={40} stroke="oklch(0.7 0.15 27)" strokeDasharray="3 3" />
              <Bar dataKey="ot_hrs" fill="oklch(0.6368 0.2078 27.33)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-muted-foreground mt-2">Dashed line = 40hr OT threshold · Connecteam sync daily at 5 AM</p>
        </div>
      </div>
    </div>
  )
}

export default function LaborPage() {
  return <Suspense><LaborInner /></Suspense>
}
