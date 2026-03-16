"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { BarChart, Bar, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts"
import { STORES, PRODUCT_CATALOG } from "@/lib/demo-data"

const DEPT_COLORS: Record<string, string> = {
  "Grocery":      "oklch(0.6801 0.1583 276.93)",
  "Meat":         "oklch(0.6368 0.2078 27.33)",
  "Produce":      "oklch(0.7845 0.1325 181.91)",
  "Dairy":        "oklch(0.8790 0.1534 91.61)",
  "Beverages":    "oklch(0.65 0.12 240)",
  "Other":        "oklch(0.40 0.02 257)",
}

function fmt$(n: number) {
  if (n >= 1000000) return `$${(n/1000000).toFixed(2)}M`
  if (n >= 1000) return `$${(n/1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}
function fmtPct(n: number) { return `${n.toFixed(1)}%` }
function delta(curr: number, prior: number) {
  const pct = ((curr - prior) / prior) * 100
  const sign = pct >= 0 ? "+" : ""
  return { label: `${sign}${pct.toFixed(1)}%`, positive: pct >= 0 }
}

function KPICard({ label, value, sub, deltaLabel, positive }: {
  label: string; value: string; sub?: string; deltaLabel?: string; positive?: boolean
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <div className="flex items-center gap-2">
        {deltaLabel && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
            {deltaLabel}
          </span>
        )}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}

function DashboardInner() {
  const params = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const store = STORES[storeId] ?? STORES.lakes

  const [riskyOpen, setRiskyOpen] = useState(false)
  const salesDelta = delta(store.weekly_sales, store.prior_weekly_sales)
  const pendingInvoices = store.recent_invoices.filter(i => i.status === "pending").length

  // Dept breakdown
  const sortedDepts = [...store.departments].sort((a, b) => b.sales - a.sales)
  const totalWeekSales = store.departments.reduce((s, d) => s + d.sales, 0)

  // Alert card metrics
  const riskyCount = store.tender.voids + store.tender.refunds
  const totalShrink = store.shrink?.reduce((s, r) => s + r.shrink_dollars, 0) ?? 0
  const topShrinkDept = store.shrink?.reduce((a, b) => a.shrink_pct > b.shrink_pct ? a : b, store.shrink[0])
  const lowMarginItems = PRODUCT_CATALOG.filter(p => p.gm_pct < 25).length

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          {store.name}
          <span className="text-muted-foreground font-normal"> · {store.location}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Week of Mar 10–16, 2026 · BRdata POS</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          label="Weekly Sales"
          value={fmt$(store.weekly_sales)}
          deltaLabel={salesDelta.label}
          positive={salesDelta.positive}
          sub="vs prior week"
        />
        <KPICard
          label="Gross Profit"
          value={fmt$(store.weekly_gm)}
          deltaLabel={fmtPct(store.weekly_gm_pct)}
          positive={true}
          sub="margin"
        />
        <KPICard
          label="Transactions"
          value={store.transactions.toLocaleString()}
          sub="this week"
        />
        <KPICard
          label="Avg Basket"
          value={`$${store.avg_basket.toFixed(2)}`}
          sub="per transaction"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 items-start">
        {/* Left column: mini cards + trend chart */}
        <div className="col-span-2 space-y-3">
          {/* Mini stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Top dept this week */}
            <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Top Dept · This Week</p>
              <p className="text-lg font-semibold mt-1">{sortedDepts[0]?.dept}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmt$(sortedDepts[0]?.sales ?? 0)} sales · <span className="text-primary font-medium">{fmtPct(sortedDepts[0]?.gm_pct ?? 0)} GM</span>
              </p>
            </div>
            {/* EBT / tender split */}
            <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">EBT this week</p>
              <p className="text-lg font-semibold mt-1">{fmt$(store.tender.ebt)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmtPct((store.tender.ebt / (store.tender.cash + store.tender.credit + store.tender.debit + store.tender.ebt + store.tender.checks + store.tender.gift_cards)) * 100)} of tender ·{" "}
                <span className="text-foreground font-medium">Cash {fmtPct((store.tender.cash / (store.tender.cash + store.tender.credit + store.tender.debit + store.tender.ebt + store.tender.checks + store.tender.gift_cards)) * 100)}</span>
              </p>
            </div>
          </div>

          {/* Trend chart — shorter */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">6-Week Sales Trend</p>
              <span className="text-xs text-muted-foreground">Weekly</span>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={store.weekly_trend} barSize={28}>
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis hide domain={['auto', 'auto']} />
                <RTooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12, color: "var(--foreground)" }}
                  labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                  itemStyle={{ color: "var(--primary)", fontWeight: 600 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [fmt$(Number(v ?? 0)), ""]}
                />
                <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts column */}
        <div className="space-y-3">
          {/* Allowance alert */}
          <Link href={`/finance/allowances?store=${storeId}`} className="block">
            <div className="bg-card border border-secondary/40 rounded-lg p-4 shadow-sm hover:border-secondary/70 transition-colors">
              <div className="flex items-start gap-2">
                <span className="text-secondary text-lg leading-none">⚡</span>
                <div>
                  <p className="text-sm font-medium">Unclaimed Allowances</p>
                  <p className="text-xl font-semibold text-secondary tabular-nums mt-0.5">${store.allowances.gap.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Left on the table this week → View breakdown</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Invoice status */}
          <Link href={`/invoices?store=${storeId}`} className="block">
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:border-primary/40 transition-colors">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Invoices</p>
              <p className="text-sm mt-1">
                <span className="font-semibold">{store.recent_invoices.length}</span> this week ·{" "}
                {pendingInvoices > 0 ? (
                  <span className="text-destructive font-medium">{pendingInvoices} pending</span>
                ) : (
                  <span className="text-primary">all clear</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{fmt$(store.recent_invoices.reduce((s, i) => s + i.amount, 0))} total purchases</p>
            </div>
          </Link>

          {/* Margin health */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Margin Health</p>
            {store.departments.slice(0, 3).map(d => (
              <div key={d.dept} className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{d.dept}</span>
                <span className={`text-xs font-mono font-medium ${d.gm_pct >= 35 ? "text-primary" : d.gm_pct >= 28 ? "text-foreground" : "text-secondary"}`}>
                  {fmtPct(d.gm_pct)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert cards row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Risky Transactions */}
        <button onClick={() => setRiskyOpen(true)} className="text-left bg-card border border-destructive/30 rounded-lg p-4 shadow-sm hover:border-destructive/60 transition-colors">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risky Transactions</p>
          <p className="text-3xl font-semibold tabular-nums text-destructive mt-1">{riskyCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {store.tender.voids} voids · {store.tender.refunds} refunds (${store.tender.refund_amount.toLocaleString()})
          </p>
          <p className="text-xs text-primary mt-2">View details →</p>
        </button>

        {/* Low Margin Items */}
        <Link href={`/database?store=${storeId}`} className="block bg-card border border-secondary/30 rounded-lg p-4 shadow-sm hover:border-secondary/60 transition-colors">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Low Margin Items</p>
          <p className="text-3xl font-semibold tabular-nums text-secondary mt-1">{lowMarginItems}</p>
          <p className="text-xs text-muted-foreground mt-1">Items below 25% GM in catalog</p>
          <p className="text-xs text-primary mt-2">Review in database →</p>
        </Link>

        {/* Shrink Exposure */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shrink Exposure</p>
          <p className="text-3xl font-semibold tabular-nums mt-1">${totalShrink.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            This week · worst: <span className="font-medium text-foreground">{topShrinkDept?.dept}</span> at {topShrinkDept?.shrink_pct.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-2">Unknown: ${store.shrink?.reduce((s, r) => s + r.unknown, 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Risky transactions modal */}
      {riskyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setRiskyOpen(false)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-lg">Risky Transactions</p>
              <button onClick={() => setRiskyOpen(false)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Voids",          value: store.tender.voids,   color: "text-destructive", note: "Cancelled transactions" },
                { label: "Refunds",        value: store.tender.refunds,  color: "text-destructive", note: `$${store.tender.refund_amount.toLocaleString()} total` },
                { label: "Void Rate",      value: `${((store.tender.voids / store.transactions) * 100).toFixed(2)}%`, color: store.tender.voids / store.transactions > 0.01 ? "text-destructive" : "text-foreground", note: "of all transactions" },
                { label: "Refund Rate",    value: `${((store.tender.refunds / store.transactions) * 100).toFixed(2)}%`, color: "text-foreground", note: "of all transactions" },
              ].map(f => (
                <div key={f.label} className="bg-muted/20 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                  <p className={`text-xl font-semibold tabular-nums mt-0.5 ${f.color}`}>{f.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.note}</p>
                </div>
              ))}
            </div>
            <div className="bg-muted/20 rounded-lg px-4 py-3 text-xs text-muted-foreground leading-relaxed">
              High void rates (&gt;1%) can indicate training issues, pricing errors, or theft. Refund totals above $3K/week warrant cashier-level review.
            </div>
          </div>
        </div>
      )}

      {/* Dept breakdown chart */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <p className="text-sm font-medium mb-4">Department Sales — This Week</p>
        <div className="space-y-2.5">
          {sortedDepts.map(d => {
            const pct = (d.sales / totalWeekSales) * 100
            return (
              <div key={d.dept} className="grid grid-cols-[120px_1fr_64px_52px] items-center gap-3">
                <span className="text-xs text-muted-foreground truncate">{d.dept}</span>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: DEPT_COLORS[d.dept] ?? DEPT_COLORS["Other"] }}
                  />
                </div>
                <span className="text-xs font-mono tabular-nums text-right">{fmt$(d.sales)}</span>
                <span className={`text-xs font-mono tabular-nums text-right ${d.wow_pct >= 0 ? "text-primary" : "text-destructive"}`}>
                  {d.wow_pct >= 0 ? "+" : ""}{d.wow_pct.toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dept summary */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium">Department Summary</p>
          <Link href={`/finance/pnl?store=${storeId}`} className="text-xs text-primary hover:underline">Full P&L →</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Sales</th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Gross Profit</th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">GM%</th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">vs LW</th>
            </tr>
          </thead>
          <tbody>
            {store.departments.map((d, i) => (
              <tr key={d.dept} className={`border-b border-border/30 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                <td className="px-5 py-2.5 font-medium">{d.dept}</td>
                <td className="px-5 py-2.5 text-right font-mono tabular-nums">{fmt$(d.sales)}</td>
                <td className="px-5 py-2.5 text-right font-mono tabular-nums text-primary">{fmt$(d.gm_dollars)}</td>
                <td className={`px-5 py-2.5 text-right font-mono tabular-nums font-medium ${d.gm_pct >= 35 ? "text-primary" : d.gm_pct >= 28 ? "text-foreground" : "text-secondary"}`}>
                  {fmtPct(d.gm_pct)}
                </td>
                <td className={`px-5 py-2.5 text-right font-mono tabular-nums text-xs ${d.wow_pct >= 0 ? "text-primary" : "text-destructive"}`}>
                  {d.wow_pct >= 0 ? "+" : ""}{d.wow_pct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense><DashboardInner /></Suspense>
}
