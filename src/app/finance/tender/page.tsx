"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { STORES } from "@/lib/demo-data"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function pct(n: number) { return `${n.toFixed(1)}%` }

// Synthetic per-cashier drill data
const CASHIER_DATA: Record<string, {
  id: string; name: string; transactions: number; voids: number;
  refunds: number; refund_amount: number; ebt: number; sales: number
}[]> = {
  lakes: [
    { id: "C01", name: "Maria G.",   transactions: 824, voids: 4,  refunds: 9,  refund_amount: 468,  ebt: 3920, sales: 34100 },
    { id: "C02", name: "Josh T.",    transactions: 712, voids: 7,  refunds: 11, refund_amount: 610,  ebt: 3280, sales: 29400 },
    { id: "C03", name: "Danielle K.", transactions: 688, voids: 3,  refunds: 7,  refund_amount: 342,  ebt: 3180, sales: 27900 },
    { id: "C04", name: "Aaron M.",   transactions: 645, voids: 5,  refunds: 8,  refund_amount: 412,  ebt: 3100, sales: 26800 },
    { id: "C05", name: "Self-Check", transactions: 973, voids: 4,  refunds: 6,  refund_amount: 350,  ebt: 4780, sales: 36800 },
  ],
  potlatch: [
    { id: "C01", name: "Sasha L.",   transactions: 520, voids: 3,  refunds: 5,  refund_amount: 248,  ebt: 2200, sales: 19400 },
    { id: "C02", name: "Ben R.",     transactions: 488, voids: 6,  refunds: 8,  refund_amount: 390,  ebt: 2040, sales: 18200 },
    { id: "C03", name: "Tori W.",    transactions: 450, voids: 2,  refunds: 4,  refund_amount: 180,  ebt: 1960, sales: 16600 },
    { id: "C04", name: "Self-Check", transactions: 760, voids: 3,  refunds: 5,  refund_amount: 260,  ebt: 4100, sales: 35800 },
  ],
  company: [
    { id: "C01", name: "Maria G.",   transactions: 824, voids: 4,  refunds: 9,  refund_amount: 468,  ebt: 3920, sales: 34100 },
    { id: "C02", name: "Josh T.",    transactions: 712, voids: 7,  refunds: 11, refund_amount: 610,  ebt: 3280, sales: 29400 },
    { id: "C03", name: "Danielle K.", transactions: 688, voids: 3,  refunds: 7,  refund_amount: 342,  ebt: 3180, sales: 27900 },
    { id: "C04", name: "Sasha L.",   transactions: 520, voids: 3,  refunds: 5,  refund_amount: 248,  ebt: 2200, sales: 19400 },
    { id: "C05", name: "Ben R.",     transactions: 488, voids: 6,  refunds: 8,  refund_amount: 390,  ebt: 2040, sales: 18200 },
  ],
}

// Synthetic 6-week void rate trend
function buildVoidTrend(voids: number, transactions: number) {
  const weeks = ["Feb 10", "Feb 17", "Feb 24", "Mar 3", "Mar 10", "Mar 16"]
  const baseRate = (voids / transactions) * 100
  const offsets  = [-0.12, 0.08, -0.05, 0.14, 0.06, 0]
  return weeks.map((week, i) => ({
    week,
    void_rate: +(baseRate + offsets[i]).toFixed(2),
    refund_rate: +(((transactions * 0.012) / transactions * 100) + offsets[i] * 0.5).toFixed(2),
  }))
}

const TENDER_COLORS: Record<string, string> = {
  "Credit Card": "oklch(0.63 0.14 260)",
  Debit:         "oklch(0.65 0.16 200)",
  EBT:           "oklch(0.65 0.18 145)",
  Cash:          "oklch(0.72 0.16 70)",
  Checks:        "oklch(0.68 0.12 30)",
  "Gift Cards":  "oklch(0.68 0.16 300)",
}

// ─── Tender page ───────────────────────────────────────────────────────────────

function TenderInner() {
  const params  = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const store   = STORES[storeId] ?? STORES.lakes
  const t       = store.tender

  const total = t.cash + t.credit + t.debit + t.ebt + t.checks + t.gift_cards

  const tenderBreakdown = [
    { name: "Credit Card", amount: t.credit },
    { name: "Debit",       amount: t.debit  },
    { name: "EBT",         amount: t.ebt    },
    { name: "Cash",        amount: t.cash   },
    { name: "Checks",      amount: t.checks },
    { name: "Gift Cards",  amount: t.gift_cards },
  ]

  const ebtPct       = (t.ebt / total) * 100
  const voidRate     = (t.voids / t.customer_count) * 100
  const refundRate   = (t.refunds / t.customer_count) * 100
  const cashPct      = (t.cash / total) * 100

  const voidTrend    = buildVoidTrend(t.voids, t.customer_count)
  const cashiers     = CASHIER_DATA[storeId] ?? CASHIER_DATA.lakes

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cash & Tender</h1>
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
          { label: "Total Tender",   value: fmt$(total),         sub: `${t.customer_count.toLocaleString()} transactions` },
          { label: "EBT %",          value: pct(ebtPct),         sub: fmt$(t.ebt) + " in benefits", warn: ebtPct > 15 },
          { label: "Void Rate",      value: pct(voidRate),       sub: `${t.voids} voids this week`,   warn: voidRate > 0.7 },
          { label: "Refund Rate",    value: pct(refundRate),     sub: `${t.refunds} refunds · ${fmt$(t.refund_amount)}` },
        ].map(k => (
          <div key={k.label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${k.warn ? "text-amber-500" : ""}`}>{k.value}</p>
            <p className={`text-[11px] mt-0.5 ${k.warn ? "text-amber-500/70" : "text-muted-foreground"}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tender breakdown bar + details table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Bar chart */}
        <div className="lg:col-span-3 rounded-xl border bg-card px-4 py-4">
          <p className="text-sm font-semibold mb-3">Tender Mix</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tenderBreakdown} layout="vertical" margin={{ left: 10, right: 32, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={v => `$${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <RTooltip
                formatter={(val: unknown) => [fmt$(Number(val ?? 0)), "Amount"]}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {tenderBreakdown.map(entry => (
                  <Cell key={entry.name} fill={TENDER_COLORS[entry.name] ?? "oklch(0.6 0.1 260)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tender % table */}
        <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <p className="text-sm font-semibold">Breakdown</p>
          </div>
          <div className="divide-y divide-border/30">
            {tenderBreakdown.map(row => {
              const share = (row.amount / total) * 100
              return (
                <div key={row.name} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: TENDER_COLORS[row.name] ?? "oklch(0.6 0.1 260)" }} />
                    <span className="text-sm">{row.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm tabular-nums">
                    <span className="text-muted-foreground">{pct(share)}</span>
                    <span className="font-medium w-16 text-right">{fmt$(row.amount)}</span>
                  </div>
                </div>
              )
            })}
            <div className="px-4 py-2.5 flex items-center justify-between bg-muted/20">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-semibold tabular-nums">{fmt$(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Void rate trend */}
      <div className="rounded-xl border bg-card px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Void & Refund Rate Trend (6 Weeks)</p>
          {voidRate > 0.7 && (
            <span className="text-[11px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full">
              Void rate elevated
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={voidTrend} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis
              tickFormatter={v => `${v.toFixed(1)}%`}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              domain={["auto", "auto"]}
            />
            <RTooltip
              formatter={(val: unknown, name: unknown) => [`${Number(val ?? 0).toFixed(2)}%`, name === "void_rate" ? "Void Rate" : "Refund Rate"]}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="void_rate"   stroke="oklch(0.65 0.18 25)"  strokeWidth={2} dot={{ r: 3 }} name="void_rate" />
            <Line type="monotone" dataKey="refund_rate" stroke="oklch(0.65 0.16 55)"  strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" name="refund_rate" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 justify-center mt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-5 h-0.5 inline-block" style={{ background: "oklch(0.65 0.18 25)" }} />
            Void Rate
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-5 h-0.5 inline-block border-t-2 border-dashed" style={{ borderColor: "oklch(0.65 0.16 55)" }} />
            Refund Rate
          </div>
        </div>
      </div>

      {/* Per-cashier drill */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <p className="text-sm font-semibold">Per-Cashier Drill</p>
          <span className="text-[11px] text-muted-foreground">Demo data</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-muted-foreground uppercase tracking-wide">
              <th className="text-left px-4 py-2">Cashier</th>
              <th className="text-right px-4 py-2">Trans</th>
              <th className="text-right px-4 py-2">Sales</th>
              <th className="text-right px-4 py-2">EBT</th>
              <th className="text-right px-4 py-2">EBT %</th>
              <th className="text-right px-4 py-2">Voids</th>
              <th className="text-right px-4 py-2">Void %</th>
              <th className="text-right px-4 py-2">Refunds</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {cashiers.map(c => {
              const cEbtPct   = (c.ebt  / c.sales) * 100
              const cVoidPct  = (c.voids / c.transactions) * 100
              const voidHigh  = cVoidPct > 0.8
              const ebtHigher = cEbtPct > ebtPct * 1.3
              return (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{c.transactions.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt$(c.sales)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmt$(c.ebt)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${ebtHigher ? "text-amber-500 font-medium" : "text-muted-foreground"}`}>
                    {pct(cEbtPct)}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${voidHigh ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {c.voids}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${voidHigh ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {pct(cVoidPct)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {c.refunds} · {fmt$(c.refund_amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cash accountability note */}
      <div className="rounded-xl border border-sidebar-primary/20 bg-sidebar-primary/5 px-4 py-3 text-sm">
        <p className="font-medium text-sidebar-primary">Cash Accountability</p>
        <p className="text-muted-foreground text-xs mt-1">
          Cash tendered: <strong>{fmt$(t.cash)}</strong> · {pct(cashPct)} of total sales.
          Safe starting balance synced from last Bank Deposit report.
          Discrepancies &gt; $10 flagged automatically.
        </p>
      </div>
    </div>
  )
}

export default function TenderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <TenderInner />
    </Suspense>
  )
}
