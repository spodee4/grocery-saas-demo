"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { STORES } from "@/lib/demo-data"

function fmt$(n: number) {
  if (n >= 1000000) return `$${(n/1000000).toFixed(2)}M`
  if (n >= 1000) return `$${(n/1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function AllowancesInner() {
  const params = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const store = STORES[storeId] ?? STORES.lakes
  const { allowances, recent_invoices } = store
  const annualGap = allowances.gap * 52

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vendor Allowances</h1>
        <p className="text-sm text-muted-foreground mt-1">{store.name} · Mar 10–16, 2026</p>
      </div>

      {/* Alert */}
      {allowances.gap > 0 && (
        <div className="bg-secondary/10 border border-secondary/40 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-semibold text-secondary-foreground text-base">
                ${allowances.gap.toLocaleString()} in earned allowances were never applied this week
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                At this rate, that&apos;s <span className="font-semibold text-foreground">${Math.round(annualGap).toLocaleString()}/year</span> left on the table.
                Store Intelligence tracks every vendor program automatically and flags gaps in real time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Purchases", value: fmt$(allowances.total_purchases) },
          { label: "Allowances Earned", value: fmt$(allowances.allowances_earned), color: "text-primary" },
          { label: "Applied to Invoice", value: fmt$(allowances.allowances_applied), color: "text-foreground" },
          { label: "Unclaimed Gap", value: fmt$(allowances.gap), color: "text-secondary" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{c.label}</p>
            <p className={`text-2xl font-semibold tabular-nums mt-1 ${c.color ?? ""}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Vendor table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-medium">Vendor Allowance Breakdown</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {["Vendor", "Purchases", "Earned", "Applied", "Gap", "Gap %"].map(h => (
                <th key={h} className={`px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide ${h === "Vendor" ? "text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allowances.vendors.map((v, i) => (
              <tr key={v.vendor} className={`border-b border-border/30 hover:bg-muted/20 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                <td className="px-5 py-3 font-medium">{v.vendor}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{fmt$(v.purchases)}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-primary">{fmt$(v.earned)}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{fmt$(v.applied)}</td>
                <td className={`px-5 py-3 text-right font-mono tabular-nums font-semibold ${v.gap > 0 ? "text-secondary" : "text-muted-foreground"}`}>
                  {v.gap > 0 ? fmt$(v.gap) : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-xs">
                  {v.gap > 0 ? (
                    <span className="bg-secondary/15 text-secondary px-2 py-0.5 rounded font-medium">
                      {((v.gap / v.purchases) * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice list */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium">Recent Invoices</p>
          <span className="text-xs text-muted-foreground">{recent_invoices.length} this week</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {["Invoice #", "Vendor", "Date", "Amount", "Allowance", "Status"].map(h => (
                <th key={h} className={`px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide ${h === "Invoice #" || h === "Vendor" ? "text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent_invoices.map((inv, i) => (
              <tr key={inv.id} className={`border-b border-border/30 hover:bg-muted/20 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{inv.id}</td>
                <td className="px-5 py-3 font-medium">{inv.vendor}</td>
                <td className="px-5 py-3 text-right text-muted-foreground text-xs">{inv.date}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{fmt$(inv.amount)}</td>
                <td className={`px-5 py-3 text-right font-mono tabular-nums ${inv.allowance_earned > inv.allowance_applied ? "text-secondary font-semibold" : "text-muted-foreground"}`}>
                  {inv.allowance_earned > 0 ? fmt$(inv.allowance_earned) : "—"}
                  {inv.allowance_earned > inv.allowance_applied && inv.allowance_earned > 0 && (
                    <span className="text-[10px] ml-1 opacity-70">(gap)</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    inv.status === "paid" ? "bg-primary/10 text-primary" :
                    inv.status === "pending" ? "bg-secondary/15 text-secondary" :
                    "bg-destructive/10 text-destructive"
                  }`}>{inv.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AllowancesPage() {
  return <Suspense><AllowancesInner /></Suspense>
}
