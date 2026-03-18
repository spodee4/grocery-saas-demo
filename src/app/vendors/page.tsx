"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { STORES } from "@/lib/demo-data"

// ─── Vendor master data ───────────────────────────────────────────────────────
type VendorRecord = {
  id: string
  name: string
  rep: string
  repEmail: string
  terms: string
  ytd_purchases: number
  open_balance: number
  overdue: number
  last_invoice_date: string
  next_due: string
  invoices: { id: string; date: string; amount: number; paid: number; due: string; status: "paid" | "current" | "overdue" }[]
}

const VENDORS: VendorRecord[] = [
  {
    id: "urm",
    name: "URM Distributing",
    rep: "Ray Robinson",
    repEmail: "rrobinson@urmstores.com",
    terms: "Net 30",
    ytd_purchases: 1_041_600,
    open_balance: 89400,
    overdue: 0,
    last_invoice_date: "Mar 14, 2026",
    next_due: "Apr 13, 2026",
    invoices: [
      { id: "URM-241893", date: "Mar 14, 2026", amount: 89400, paid: 0,     due: "Apr 13, 2026", status: "current" },
      { id: "URM-241744", date: "Mar 7, 2026",  amount: 87200, paid: 87200, due: "Apr 6, 2026",  status: "paid" },
      { id: "URM-241602", date: "Feb 28, 2026", amount: 91800, paid: 91800, due: "Mar 30, 2026", status: "paid" },
      { id: "URM-241455", date: "Feb 21, 2026", amount: 88600, paid: 88600, due: "Mar 23, 2026", status: "paid" },
      { id: "URM-241310", date: "Feb 14, 2026", amount: 86400, paid: 86400, due: "Mar 16, 2026", status: "paid" },
    ],
  },
  {
    id: "unfi",
    name: "UNFI Natural",
    rep: "Dana Kowalski",
    repEmail: "d.kowalski@unfi.com",
    terms: "Net 30",
    ytd_purchases: 143_100,
    open_balance: 12300,
    overdue: 0,
    last_invoice_date: "Mar 12, 2026",
    next_due: "Apr 11, 2026",
    invoices: [
      { id: "UNFI-88412", date: "Mar 12, 2026", amount: 12300, paid: 0,     due: "Apr 11, 2026", status: "current" },
      { id: "UNFI-88210", date: "Feb 26, 2026", amount: 11800, paid: 11800, due: "Mar 28, 2026", status: "paid" },
      { id: "UNFI-88041", date: "Feb 12, 2026", amount: 12100, paid: 12100, due: "Mar 14, 2026", status: "paid" },
    ],
  },
  {
    id: "peirone",
    name: "Peirone Produce",
    rep: "Frank Peirone",
    repEmail: "frank@peirone.com",
    terms: "Net 15",
    ytd_purchases: 94_500,
    open_balance: 8100,
    overdue: 0,
    last_invoice_date: "Mar 11, 2026",
    next_due: "Mar 26, 2026",
    invoices: [
      { id: "PEI-30218", date: "Mar 11, 2026", amount: 8100, paid: 0,    due: "Mar 26, 2026", status: "current" },
      { id: "PEI-30198", date: "Mar 4, 2026",  amount: 7800, paid: 7800, due: "Mar 19, 2026", status: "paid" },
      { id: "PEI-30182", date: "Feb 25, 2026", amount: 8400, paid: 8400, due: "Mar 12, 2026", status: "paid" },
    ],
  },
  {
    id: "coca-cola",
    name: "Coca-Cola Bottling",
    rep: "Steve Yates",
    repEmail: "s.yates@coca-cola.com",
    terms: "COD",
    ytd_purchases: 48_900,
    open_balance: 0,
    overdue: 0,
    last_invoice_date: "Mar 10, 2026",
    next_due: "—",
    invoices: [
      { id: "CCB-19004", date: "Mar 10, 2026", amount: 4200, paid: 4200, due: "Mar 10, 2026", status: "paid" },
      { id: "CCB-18891", date: "Mar 3, 2026",  amount: 4100, paid: 4100, due: "Mar 3, 2026",  status: "paid" },
      { id: "CCB-18764", date: "Feb 24, 2026", amount: 4350, paid: 4350, due: "Feb 24, 2026", status: "paid" },
    ],
  },
  {
    id: "frito",
    name: "Frito-Lay DSD",
    rep: "Carlos Mendez",
    repEmail: "c.mendez@fritolay.com",
    terms: "Net 10",
    ytd_purchases: 44_200,
    open_balance: 3800,
    overdue: 3800,
    last_invoice_date: "Mar 10, 2026",
    next_due: "Mar 20, 2026",
    invoices: [
      { id: "FRI-77231", date: "Mar 10, 2026", amount: 3800, paid: 0,    due: "Mar 20, 2026", status: "overdue" },
      { id: "FRI-76998", date: "Mar 3, 2026",  amount: 3600, paid: 3600, due: "Mar 13, 2026", status: "paid" },
      { id: "FRI-76801", date: "Feb 24, 2026", amount: 3750, paid: 3750, due: "Mar 5, 2026",  status: "paid" },
    ],
  },
  {
    id: "bimbo",
    name: "Bimbo Bakeries",
    rep: "Terry Walsh",
    repEmail: "t.walsh@bimbobakeriesusa.com",
    terms: "COD",
    ytd_purchases: 33_000,
    open_balance: 0,
    overdue: 0,
    last_invoice_date: "Mar 13, 2026",
    next_due: "—",
    invoices: [
      { id: "BIM-44102", date: "Mar 13, 2026", amount: 2840, paid: 2840, due: "Mar 13, 2026", status: "paid" },
      { id: "BIM-43901", date: "Mar 6, 2026",  amount: 2760, paid: 2760, due: "Mar 6, 2026",  status: "paid" },
    ],
  },
  {
    id: "sysco",
    name: "Sysco Foods",
    rep: "Dan Hoyt",
    repEmail: "d.hoyt@sysco.com",
    terms: "Net 30",
    ytd_purchases: 37_700,
    open_balance: 7360,
    overdue: 4120,
    last_invoice_date: "Mar 5, 2026",
    next_due: "Apr 4, 2026",
    invoices: [
      { id: "SYS-8821", date: "Mar 5, 2026",  amount: 3240, paid: 0,    due: "Apr 4, 2026",  status: "current" },
      { id: "SYS-8701", date: "Feb 12, 2026", amount: 4120, paid: 0,    due: "Mar 14, 2026", status: "overdue" },
      { id: "SYS-8601", date: "Jan 22, 2026", amount: 3980, paid: 3980, due: "Feb 21, 2026", status: "paid" },
    ],
  },
  {
    id: "darigold",
    name: "Darigold Inc.",
    rep: "Pat Nielson",
    repEmail: "p.nielson@darigold.com",
    terms: "Net 30",
    ytd_purchases: 19_500,
    open_balance: 1680,
    overdue: 680,
    last_invoice_date: "Jan 28, 2026",
    next_due: "Feb 27, 2026",
    invoices: [
      { id: "DAR-4401", date: "Jan 28, 2026", amount: 1680, paid: 1000, due: "Feb 27, 2026", status: "overdue" },
      { id: "DAR-4310", date: "Jan 7, 2026",  amount: 1720, paid: 1720, due: "Feb 6, 2026",  status: "paid" },
    ],
  },
]

function fmtFull(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function StatusBadge({ status }: { status: "paid" | "current" | "overdue" }) {
  const cfg = {
    paid:    "bg-primary/10 text-primary",
    current: "bg-muted text-muted-foreground",
    overdue: "bg-destructive/10 text-destructive font-semibold",
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] ${cfg[status]}`}>
      {status === "overdue" ? "OVERDUE" : status === "current" ? "Due" : "Paid"}
    </span>
  )
}

function VendorsInner() {
  const params = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const store = STORES[storeId] ?? STORES.lakes

  const [expanded, setExpanded] = useState<string | null>(null)
  const [paid, setPaid] = useState<Set<string>>(new Set())
  const [payingId, setPayingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "outstanding" | "overdue">("all")

  const totalAP = VENDORS.reduce((s, v) => s + v.open_balance, 0)
  const totalOverdue = VENDORS.reduce((s, v) => s + v.overdue, 0)
  const dueThisWeek = VENDORS.filter(v => v.next_due.includes("Mar") && parseInt(v.next_due.split(" ")[1]) <= 20).reduce((s, v) => s + v.open_balance, 0)

  const filtered = VENDORS.filter(v => {
    if (filter === "outstanding") return v.open_balance > 0
    if (filter === "overdue") return v.overdue > 0
    return true
  })

  function handleMarkPaid(invoiceId: string, vendorId: string) {
    setPayingId(invoiceId)
    setTimeout(() => {
      setPaid(prev => new Set([...prev, invoiceId]))
      setPayingId(null)
    }, 1200)
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vendor Management / A/P</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {store.name} · {store.location} · As of Mar 17, 2026
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "outstanding", "overdue"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:border-primary/40"
              }`}>
              {f === "all" ? "All Vendors" : f === "outstanding" ? "Outstanding" : "Overdue"}
              {f === "overdue" && totalOverdue > 0 && (
                <span className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] px-1 py-0.5 rounded-full">
                  {VENDORS.filter(v => v.overdue > 0).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* AP summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total A/P",          value: fmtFull(totalAP),     sub: `${VENDORS.filter(v => v.open_balance > 0).length} vendors`,         color: "text-foreground" },
          { label: "Overdue",            value: fmtFull(totalOverdue), sub: `${VENDORS.filter(v => v.overdue > 0).length} invoices past due`,    color: totalOverdue > 0 ? "text-destructive" : "text-primary" },
          { label: "Due This Week",      value: fmtFull(dueThisWeek),  sub: "Mar 17–20",                                                         color: "text-foreground" },
          { label: "YTD Total Purchases",value: fmtFull(VENDORS.reduce((s, v) => s + v.ytd_purchases, 0)), sub: "All vendors",                  color: "text-foreground" },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {totalOverdue > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm font-semibold text-destructive mb-1">Overdue Invoices</p>
          {VENDORS.filter(v => v.overdue > 0).map(v => (
            <p key={v.id} className="text-xs text-muted-foreground">
              · {v.name}: {fmtFull(v.overdue)} past due — {v.invoices.filter(i => i.status === "overdue").map(i => i.id).join(", ")}
            </p>
          ))}
        </div>
      )}

      {/* Vendor table */}
      <div className="bg-card border border-border rounded-lg shadow-md ring-1 ring-border/30 overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold">Vendor Roster</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/20">
                <th className="text-left px-5 py-2.5 font-medium">Vendor</th>
                <th className="text-left px-3 py-2.5 font-medium">Terms</th>
                <th className="text-right px-3 py-2.5 font-medium">YTD Purchases</th>
                <th className="text-right px-3 py-2.5 font-medium">Open Balance</th>
                <th className="text-right px-3 py-2.5 font-medium">Overdue</th>
                <th className="text-left px-3 py-2.5 font-medium">Last Invoice</th>
                <th className="text-left px-3 py-2.5 font-medium">Next Due</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <>
                  <tr key={v.id}
                    onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                    className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.rep}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{v.terms}</td>
                    <td className="text-right px-3 py-3 tabular-nums font-mono">{fmtFull(v.ytd_purchases)}</td>
                    <td className={`text-right px-3 py-3 tabular-nums font-mono font-semibold ${v.open_balance > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                      {v.open_balance > 0 ? fmtFull(v.open_balance) : "—"}
                    </td>
                    <td className={`text-right px-3 py-3 tabular-nums font-mono ${v.overdue > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      {v.overdue > 0 ? fmtFull(v.overdue) : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{v.last_invoice_date}</td>
                    <td className={`px-3 py-3 text-xs ${v.overdue > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {v.next_due}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground/50 text-xs">
                      {expanded === v.id ? "▲" : "▼"}
                    </td>
                  </tr>

                  {expanded === v.id && (
                    <tr key={`${v.id}-detail`} className="bg-muted/10 border-b border-border/50">
                      <td colSpan={8} className="px-5 py-4">
                        {/* Rep contact */}
                        <div className="flex items-center gap-6 mb-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">Rep:</span>
                            <span className="font-medium">{v.rep}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">Email:</span>
                            <a href={`mailto:${v.repEmail}`} className="text-primary text-xs hover:underline">{v.repEmail}</a>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">Terms:</span>
                            <span className="text-xs">{v.terms}</span>
                          </div>
                        </div>

                        {/* Invoice list */}
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Invoice History</p>
                        <div className="space-y-1">
                          {v.invoices.map(inv => {
                            const isPaid = paid.has(inv.id) || inv.status === "paid"
                            const isPaying = payingId === inv.id
                            return (
                              <div key={inv.id} className={`flex items-center gap-4 text-xs py-1.5 px-3 rounded-md ${inv.status === "overdue" && !isPaid ? "bg-destructive/5" : "bg-muted/10"}`}>
                                <span className="font-mono w-28 text-muted-foreground">{inv.id}</span>
                                <span className="w-28 text-muted-foreground">{inv.date}</span>
                                <span className="w-28 tabular-nums font-mono">{fmtFull(inv.amount)}</span>
                                <span className="w-24 tabular-nums text-muted-foreground">
                                  Paid: {inv.paid > 0 ? fmtFull(inv.paid) : "—"}
                                </span>
                                <span className={`w-24 tabular-nums font-mono font-semibold ${inv.amount - inv.paid > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                                  Bal: {inv.amount - inv.paid > 0 ? fmtFull(inv.amount - inv.paid) : "—"}
                                </span>
                                <span className="text-muted-foreground w-28">Due: {inv.due}</span>
                                <StatusBadge status={isPaid ? "paid" : inv.status} />
                                {!isPaid && inv.status !== "paid" && (
                                  <button
                                    onClick={e => { e.stopPropagation(); handleMarkPaid(inv.id, v.id) }}
                                    disabled={isPaying}
                                    className="ml-auto px-2.5 py-1 bg-primary text-primary-foreground rounded text-[11px] font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                                  >
                                    {isPaying ? "Processing…" : "Mark Paid"}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Early pay discount */}
                        {v.id === "urm" && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
                            <span className="font-semibold">Early Pay Discount Available:</span>
                            <span>Pay URM-241893 by Mar 30 to earn 2% discount ({fmtFull(89400 * 0.02)})</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function VendorsPage() {
  return <Suspense><VendorsInner /></Suspense>
}
