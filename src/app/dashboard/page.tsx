"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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

function ChatButton({ prompt, storeId, className = "" }: { prompt: string; storeId: string; className?: string }) {
  const router = useRouter()
  return (
    <button
      onClick={e => { e.stopPropagation(); e.preventDefault(); router.push(`/chat?store=${storeId}&init=${encodeURIComponent(prompt)}`) }}
      title="Ask AI about this"
      className={`p-1 rounded-md text-muted-foreground/30 hover:text-primary hover:bg-primary/10 transition-colors ${className}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function KPICard({ label, value, sub, deltaLabel, positive, chatPrompt, storeId }: {
  label: string; value: string; sub?: string; deltaLabel?: string; positive?: boolean
  chatPrompt?: string; storeId?: string
}) {
  return (
    <div className="relative bg-card border border-border rounded-lg p-5 shadow-sm space-y-1">
      {chatPrompt && storeId && <ChatButton prompt={chatPrompt} storeId={storeId} className="absolute top-2.5 right-2.5" />}
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

// ─── Suspicious transaction data ─────────────────────────────────────────────

type SuspiciousTxn = {
  id: string; time: string; cashier: string; register: string
  type: "Void" | "Refund" | "Discount Override" | "Large Cash" | "Back-to-Back Refund"
  amount: number; reason: string; severity: "high" | "medium"
  items?: string
}

const SUSPICIOUS_TXN: Record<string, SuspiciousTxn[]> = {
  lakes: [
    { id: "TXN-4821", time: "Mon 8:14 AM",  cashier: "Josh T.",    register: "R2", type: "Void",              amount: 218.40, severity: "high",   reason: "High-value void — no manager override logged",   items: "Beef tenderloin ×2, Imported cheese" },
    { id: "TXN-4903", time: "Mon 11:52 AM", cashier: "Josh T.",    register: "R2", type: "Refund",            amount: 84.20,  severity: "medium", reason: "Refund without receipt", items: "Liquor items ×3" },
    { id: "TXN-5117", time: "Tue 2:08 PM",  cashier: "Aaron M.",   register: "R4", type: "Discount Override", amount: 47.00,  severity: "medium", reason: "15% override on non-promo items", items: "Meat dept — manager code used" },
    { id: "TXN-5284", time: "Tue 4:44 PM",  cashier: "Josh T.",    register: "R2", type: "Back-to-Back Refund", amount: 62.15, severity: "high",   reason: "2 refunds 4 min apart, same cashier", items: "Produce, Dairy" },
    { id: "TXN-5491", time: "Wed 9:21 AM",  cashier: "Maria G.",   register: "R1", type: "Large Cash",        amount: 380.00, severity: "medium", reason: "Cash transaction >$300 — no ID verified", items: "Gift cards ×4" },
    { id: "TXN-5602", time: "Wed 1:17 PM",  cashier: "Aaron M.",   register: "R4", type: "Void",              amount: 156.80, severity: "high",   reason: "Voided after drawer open — 3rd this week", items: "Beer & Wine" },
    { id: "TXN-5881", time: "Thu 5:32 PM",  cashier: "Danielle K.", register: "R3", type: "Refund",           amount: 29.50,  severity: "medium", reason: "No receipt, store credit issued in cash", items: "Bakery items" },
    { id: "TXN-6102", time: "Fri 10:48 AM", cashier: "Self-Check", register: "SC1", type: "Discount Override", amount: 18.20, severity: "medium", reason: "Produce weight key override", items: "Bulk produce" },
    { id: "TXN-6344", time: "Fri 3:15 PM",  cashier: "Josh T.",    register: "R2", type: "Void",              amount: 93.60,  severity: "high",   reason: "4th void this week — cashier flagged", items: "Frozen Foods, Beverages" },
    { id: "TXN-6571", time: "Sat 11:02 AM", cashier: "Aaron M.",   register: "R4", type: "Refund",            amount: 41.75,  severity: "medium", reason: "Refund exceeds original purchase amount", items: "Non-Foods" },
  ],
  potlatch: [
    { id: "TXN-2201", time: "Mon 9:44 AM",  cashier: "Ben R.",     register: "R2", type: "Void",              amount: 134.20, severity: "high",   reason: "High-value void — no manager override logged", items: "Meat dept" },
    { id: "TXN-2388", time: "Tue 1:30 PM",  cashier: "Ben R.",     register: "R2", type: "Discount Override", amount: 38.00,  severity: "medium", reason: "12% override on non-promo items", items: "Grocery" },
    { id: "TXN-2510", time: "Wed 3:18 PM",  cashier: "Sasha L.",   register: "R1", type: "Refund",            amount: 55.40,  severity: "medium", reason: "Refund without receipt", items: "Beer & Wine" },
    { id: "TXN-2741", time: "Thu 4:50 PM",  cashier: "Ben R.",     register: "R2", type: "Back-to-Back Refund", amount: 48.90, severity: "high",   reason: "2 refunds 6 min apart, same cashier", items: "Produce, Dairy" },
    { id: "TXN-2902", time: "Fri 2:10 PM",  cashier: "Tori W.",    register: "R3", type: "Large Cash",        amount: 290.00, severity: "medium", reason: "Cash transaction >$250", items: "Gift cards ×3" },
  ],
}

const SEVERITY_STYLE: Record<string, string> = {
  high:   "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/30",
}

function SuspiciousTxnModal({ txns, onClose }: { txns: SuspiciousTxn[]; onClose: () => void }) {
  const [detail, setDetail] = useState<SuspiciousTxn | null>(null)
  const highCount = txns.filter(t => t.severity === "high").length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { if (detail) setDetail(null); else onClose() }}>
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-semibold">Suspicious Transactions</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {txns.length} flagged this week · <span className="text-destructive font-medium">{highCount} high severity</span>
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Detail panel OR list */}
        {detail ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <button onClick={() => setDetail(null)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" strokeLinecap="round" /></svg>
              Back to list
            </button>
            <div className={`rounded-lg border px-4 py-3 ${SEVERITY_STYLE[detail.severity]}`}>
              <p className="font-semibold text-sm">{detail.type}</p>
              <p className="text-xs mt-1 opacity-80">{detail.reason}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Transaction ID", value: detail.id },
                { label: "Amount",         value: `$${detail.amount.toFixed(2)}` },
                { label: "Time",           value: detail.time },
                { label: "Cashier",        value: detail.cashier },
                { label: "Register",       value: detail.register },
                { label: "Severity",       value: detail.severity.toUpperCase() },
              ].map(f => (
                <div key={f.label} className="bg-muted/20 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm font-semibold mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
            {detail.items && (
              <div className="bg-muted/20 rounded-lg px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Items Involved</p>
                <p className="text-sm">{detail.items}</p>
              </div>
            )}
            <div className="bg-muted/10 rounded-lg px-4 py-3 text-xs text-muted-foreground leading-relaxed border border-border/50">
              Flag for manager review in BRdata or escalate to LP if pattern continues.
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-border/30">
            {txns.map(t => (
              <button
                key={t.id}
                onClick={() => setDetail(t)}
                className="w-full text-left px-5 py-3 hover:bg-muted/30 transition-colors flex items-center gap-3"
              >
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${SEVERITY_STYLE[t.severity]}`}>
                  {t.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{t.type}</p>
                    <p className="text-sm font-mono tabular-nums">${t.amount.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t.cashier} · {t.time} · {t.register}</p>
                </div>
                <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" strokeLinecap="round" /></svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const WEEK_PILLS = [
  { id: "wtd", label: "WTD",    range: "Mar 10–16, 2026",    sMult: 1.000, pMult: 1.010 },
  { id: "w10", label: "Wk 10",  range: "Mar 3–9, 2026",      sMult: 0.990, pMult: 0.982 },
  { id: "w9",  label: "Wk 9",   range: "Feb 24–Mar 2, 2026", sMult: 1.043, pMult: 0.990 },
  { id: "w8",  label: "Wk 8",   range: "Feb 17–23, 2026",    sMult: 0.921, pMult: 1.043 },
  { id: "w7",  label: "Wk 7",   range: "Feb 10–16, 2026",    sMult: 0.968, pMult: 0.921 },
  { id: "custom", label: "Custom", range: "",                 sMult: 1.000, pMult: 1.000 },
]

function buildCompanyStore() {
  const all = Object.values(STORES)
  const totalSales = all.reduce((s, st) => s + st.weekly_sales, 0)
  const totalGM    = all.reduce((s, st) => s + st.weekly_gm, 0)
  const totalTxns  = all.reduce((s, st) => s + st.transactions, 0)
  // Aggregate departments
  const deptMap: Record<string, typeof all[0]["departments"][0]> = {}
  all.forEach(st => st.departments.forEach(d => {
    if (!deptMap[d.dept]) deptMap[d.dept] = { ...d, sales: 0, purchases: 0, gm_dollars: 0, prior_sales: 0 }
    deptMap[d.dept].sales        += d.sales
    deptMap[d.dept].purchases    += d.purchases
    deptMap[d.dept].gm_dollars   += d.gm_dollars
    deptMap[d.dept].prior_sales  += d.prior_sales
  }))
  const depts = Object.values(deptMap).map(d => ({
    ...d, gm_pct: Math.round((d.gm_dollars / d.sales) * 1000) / 10,
    wow_pct: Math.round(((d.sales - d.prior_sales) / d.prior_sales) * 1000) / 10,
  }))
  // Aggregate weekly trend
  const trendMap: Record<string, { sales: number; gm_pct_sum: number; count: number }> = {}
  all.forEach(st => st.weekly_trend.forEach(w => {
    if (!trendMap[w.week]) trendMap[w.week] = { sales: 0, gm_pct_sum: 0, count: 0 }
    trendMap[w.week].sales += w.sales
    trendMap[w.week].gm_pct_sum += w.gm_pct
    trendMap[w.week].count++
  }))
  const trend = Object.entries(trendMap).map(([week, v]) => ({ week, sales: v.sales, gm_pct: v.gm_pct_sum / v.count }))
  return {
    id: "company", name: "All Stores", location: "Company — 5 Locations",
    weekly_sales: totalSales, weekly_gm: totalGM,
    weekly_gm_pct: Math.round((totalGM / totalSales) * 1000) / 10,
    prior_weekly_sales: all.reduce((s, st) => s + st.prior_weekly_sales, 0),
    transactions: totalTxns, avg_basket: totalSales / totalTxns,
    departments: depts, weekly_trend: trend,
    recent_invoices: all.flatMap(st => st.recent_invoices),
    tender: { cash: 0, credit: 0, debit: 0, ebt: 0, checks: 0, gift_cards: 0, customer_count: totalTxns, voids: 0, refunds: 0, refund_amount: 0 },
    bank_deposit: all[0].bank_deposit,
    shrink: all.flatMap(st => st.shrink),
    allowances: {
      total_purchases: all.reduce((s, st) => s + st.allowances.total_purchases, 0),
      allowances_earned: all.reduce((s, st) => s + st.allowances.allowances_earned, 0),
      allowances_applied: all.reduce((s, st) => s + st.allowances.allowances_applied, 0),
      gap: all.reduce((s, st) => s + st.allowances.gap, 0),
      gap_pct: 0,
      vendors: [],
    },
  }
}

function DashboardInner() {
  const params = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const isCompany = storeId === "company"
  const store = isCompany ? buildCompanyStore() : (STORES[storeId] ?? STORES.lakes)

  const [suspiciousOpen, setSuspiciousOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState("wtd")
  const [customFrom, setCustomFrom] = useState("2026-03-01")
  const [customTo,   setCustomTo]   = useState("2026-03-16")

  const customMult = Math.max(1, (new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000 + 1) / 7
  const customRange = (() => {
    const fmt = (s: string) => { const d = new Date(s); return `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}` }
    return `${fmt(customFrom)} – ${fmt(customTo)}, 2026`
  })()

  const weekPill = WEEK_PILLS.find(w => w.id === selectedWeek) ?? WEEK_PILLS[0]
  const effectivePill = selectedWeek === "custom"
    ? { ...weekPill, range: customRange, sMult: customMult, pMult: customMult * 1.01 }
    : weekPill
  const wSales   = store.weekly_sales * effectivePill.sMult
  const wGM      = store.weekly_gm    * effectivePill.sMult
  const wTxns    = Math.round(store.transactions * effectivePill.sMult)
  const wPrior   = store.prior_weekly_sales * effectivePill.pMult

  const salesDelta = delta(wSales, wPrior)
  const pendingInvoices = store.recent_invoices.filter(i => i.status === "pending").length

  // Dept breakdown
  const sortedDepts = [...store.departments].sort((a, b) => b.sales - a.sales)
  const totalWeekSales = store.departments.reduce((s, d) => s + d.sales, 0)

  // Alert card metrics


  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          {store.name}
          <span className="text-muted-foreground font-normal"> · {store.location}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{effectivePill.range || "Custom range"} · BRdata POS</p>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {WEEK_PILLS.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWeek(w.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedWeek === w.id
                  ? "bg-primary text-background"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {w.label}
            </button>
          ))}
          {selectedWeek === "custom" && (
            <div className="flex items-center gap-1.5 ml-1">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="text-xs bg-card border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="text-xs bg-card border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Weekly Sales" value={fmt$(wSales)} deltaLabel={salesDelta.label} positive={salesDelta.positive} sub="vs prior week"
          storeId={storeId} chatPrompt={`My store ${store.name} had weekly sales of ${fmt$(wSales)}, which is ${salesDelta.label} vs last week (${fmt$(wPrior)}). Analyze this performance and ask me 3 targeted questions to help diagnose what's driving the change.`} />
        <KPICard label="Gross Profit" value={fmt$(wGM)} deltaLabel={fmtPct(store.weekly_gm_pct)} positive={true} sub="margin"
          storeId={storeId} chatPrompt={`My gross profit this week is ${fmt$(wGM)} at ${fmtPct(store.weekly_gm_pct)} margin for ${store.name}. My top departments by GM% are: ${store.departments.slice().sort((a,b)=>b.gm_pct-a.gm_pct).slice(0,3).map(d=>`${d.dept} ${fmtPct(d.gm_pct)}`).join(', ')}. Is this healthy for an independent grocery? What should I be watching? Ask me 3 questions to dig deeper.`} />
        <KPICard label="Transactions" value={wTxns.toLocaleString()} sub="this week"
          storeId={storeId} chatPrompt={`${store.name} had ${wTxns.toLocaleString()} transactions this week with an average basket of $${store.avg_basket.toFixed(2)}. What do these numbers tell me about customer behavior and store traffic? Ask me 3 questions to understand the patterns better.`} />
        <KPICard label="Avg Basket" value={`$${store.avg_basket.toFixed(2)}`} sub="per transaction"
          storeId={storeId} chatPrompt={`My average basket size is $${store.avg_basket.toFixed(2)} across ${wTxns.toLocaleString()} transactions at ${store.name}. How does this compare to typical independent grocery benchmarks? What strategies could increase basket size? Ask me 3 questions first to understand my situation.`} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left column: action cards + trend chart */}
        <div className="col-span-2 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Suspicious transactions */}
            {(() => {
              const txns = SUSPICIOUS_TXN[storeId] ?? SUSPICIOUS_TXN.lakes
              const highCount = txns.filter(t => t.severity === "high").length
              return (
                <div className="relative bg-card border border-destructive/30 rounded-lg px-4 py-3 shadow-sm">
                  <ChatButton storeId={storeId} className="absolute top-2 right-2"
                    prompt={`I have ${txns.length} suspicious transactions flagged this week at ${store.name}, including ${highCount} HIGH severity. Types include: ${[...new Set(txns.map(t=>t.type))].join(', ')}. The most flagged cashier appears multiple times. What actions should I take immediately? Ask me 3 questions to understand the risk and whether this is a training issue, pricing error, or potential theft.`} />
                  <button onClick={() => setSuspiciousOpen(true)} className="text-left w-full">
                    <div className="flex items-center justify-between pr-6">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Suspicious Txns</p>
                      {highCount > 0 && (
                        <span className="text-[10px] font-bold bg-destructive text-white px-1.5 py-0.5 rounded-full">{highCount} HIGH</span>
                      )}
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-destructive mt-1">{txns.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">flagged this week · tap to review →</p>
                  </button>
                </div>
              )
            })()}

            {/* Week pacing */}
            {(() => {
              const DAY = 7  // Mar 16 = day 7 of 7 for this demo
              const paced = store.weekly_sales  // already full week in demo
              const pacedVsPrior = delta(paced, store.prior_weekly_sales)
              const progress = Math.min((DAY / 7) * 100, 100)
              return (
                <div className="relative bg-card border border-border rounded-lg px-4 py-3 shadow-sm">
                  <ChatButton storeId={storeId} className="absolute top-2 right-2"
                    prompt={`${store.name} is tracking ${fmt$(paced)} for the week (Day ${DAY} of 7), which is ${pacedVsPrior.label} vs last week's ${fmt$(store.prior_weekly_sales)}. The week is now complete. Analyze this pacing and ask me 3 questions to help understand what drove the ${pacedVsPrior.positive ? "improvement" : "shortfall"} and what I should do differently next week.`} />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Week Pacing</p>
                  <p className="text-2xl font-bold tabular-nums mt-1">{fmt$(paced)}</p>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Day {DAY} of 7 ·{" "}
                    <span className={pacedVsPrior.positive ? "text-primary font-medium" : "text-destructive font-medium"}>
                      {pacedVsPrior.label}
                    </span>{" "}
                    vs last week
                  </p>
                </div>
              )
            })()}
          </div>

          {/* Trend chart — flex-1 fills remaining height */}
          <div className="relative bg-card border border-border rounded-lg p-4 shadow-sm flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">6-Week Sales Trend</p>
              <div className="flex items-center gap-2">
                <ChatButton storeId={storeId}
                  prompt={`Here is my 6-week sales trend for ${store.name}: ${store.weekly_trend.map(w=>`${w.week}: $${(w.sales/1000).toFixed(1)}K`).join(', ')}. Analyze this trend — identify patterns, dips, and peaks. Ask me 3 questions to understand what external or operational factors are driving the shape of this curve.`} />
                <span className="text-xs text-muted-foreground">Weekly</span>
              </div>
            </div>
            <div className="flex-1 min-h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
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
        </div>

        {/* Alerts column */}
        <div className="space-y-3">
          {/* Allowance alert */}
          <div className="relative bg-card border border-secondary/40 rounded-lg p-4 shadow-sm hover:border-secondary/70 transition-colors">
            <ChatButton storeId={storeId} className="absolute top-2 right-2"
              prompt={`I have $${store.allowances.gap.toLocaleString()} in unclaimed vendor allowances this week at ${store.name}. Total earned: $${store.allowances.allowances_earned.toLocaleString()}, applied: $${store.allowances.allowances_applied.toLocaleString()}. My top vendors by purchase volume are: ${store.allowances.vendors.slice(0,3).map(v=>`${v.vendor} ($${v.purchases.toLocaleString()})`).join(', ')}. How do I recover this money and prevent it from happening again? Ask me 3 questions first.`} />
            <Link href={`/finance/allowances?store=${storeId}`} className="flex items-start gap-2">
              <span className="text-secondary text-lg leading-none">⚡</span>
              <div>
                <p className="text-sm font-medium">Unclaimed Allowances</p>
                <p className="text-xl font-semibold text-secondary tabular-nums mt-0.5">${store.allowances.gap.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Left on the table this week → View breakdown</p>
              </div>
            </Link>
          </div>

          {/* Invoice status */}
          <div className="relative bg-card border border-border rounded-lg p-4 shadow-sm hover:border-primary/40 transition-colors">
            <ChatButton storeId={storeId} className="absolute top-2 right-2"
              prompt={`I have ${store.recent_invoices.length} invoices this week totaling ${fmt$(store.recent_invoices.reduce((s,i)=>s+i.amount,0))} at ${store.name}. ${pendingInvoices > 0 ? `${pendingInvoices} are still pending.` : "All are paid or clear."} Vendors this week: ${[...new Set(store.recent_invoices.map(i=>i.vendor))].join(', ')}. What should I be reviewing in my invoice workflow? Ask me 3 questions about my payables health.`} />
            <Link href={`/invoices?store=${storeId}`} className="block">
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
            </Link>
          </div>

          {/* Margin health */}
          <div className="relative bg-card border border-border rounded-lg p-4 shadow-sm">
            <ChatButton storeId={storeId} className="absolute top-2 right-2"
              prompt={`Here is the margin health for ${store.name} this week: ${store.departments.map(d=>`${d.dept} ${fmtPct(d.gm_pct)}`).join(', ')}. Identify which departments are concerning and which are strong. What benchmarks should I be comparing against for an independent grocery? Ask me 3 questions to understand what's driving the margin gaps.`} />
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


      {/* Suspicious transactions modal */}
      {suspiciousOpen && (
        <SuspiciousTxnModal
          txns={SUSPICIOUS_TXN[storeId] ?? SUSPICIOUS_TXN.lakes}
          onClose={() => setSuspiciousOpen(false)}
        />
      )}


      {/* Dept breakdown chart */}
      <div className="relative bg-card border border-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium">Department Sales — This Week</p>
          <ChatButton storeId={storeId}
            prompt={`Here are my department sales for ${store.name} this week, with week-over-week change: ${sortedDepts.map(d=>`${d.dept}: ${fmt$(d.sales)} (${d.wow_pct>=0?'+':''}${d.wow_pct.toFixed(1)}% WoW)`).join(', ')}. Which departments need attention? Which are outperforming? Ask me 3 questions to understand the drivers behind the biggest movers.`} />
        </div>
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
          <div className="flex items-center gap-3">
            <ChatButton storeId={storeId}
              prompt={`Here is the full department P&L summary for ${store.name} this week: ${store.departments.map(d=>`${d.dept}: Sales ${fmt$(d.sales)}, GP ${fmt$(d.gm_dollars)} (${fmtPct(d.gm_pct)}), WoW ${d.wow_pct>=0?'+':''}${d.wow_pct.toFixed(1)}%`).join(' | ')}. Which departments have the most opportunity for improvement? Where should I be focused? Ask me 3 specific questions to build an action plan.`} />
            <Link href={`/finance/pnl?store=${storeId}`} className="text-xs text-primary hover:underline">Full P&L →</Link>
          </div>
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

      {/* Company view: per-store breakdown */}
      {isCompany && (
        <div className="bg-card border border-border rounded-xl shadow-lg ring-1 ring-border/30 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/10 flex items-center justify-between">
            <p className="text-sm font-semibold">Store-by-Store Breakdown</p>
            <p className="text-xs text-muted-foreground">All 5 locations · This week</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="text-left px-5 py-2.5 font-medium">Store</th>
                  <th className="text-right px-4 py-2.5 font-medium">Sales</th>
                  <th className="text-right px-4 py-2.5 font-medium">vs LW</th>
                  <th className="text-right px-4 py-2.5 font-medium">GM%</th>
                  <th className="text-right px-4 py-2.5 font-medium">Txns</th>
                  <th className="text-right px-4 py-2.5 font-medium">Avg $</th>
                  <th className="text-right px-4 py-2.5 font-medium">% of Co.</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(STORES).sort((a, b) => b.weekly_sales - a.weekly_sales).map((st, i) => {
                  const wow = delta(st.weekly_sales, st.prior_weekly_sales)
                  const pct = st.weekly_sales / store.weekly_sales * 100
                  return (
                    <tr key={st.id} className={`border-b border-border/30 hover:bg-muted/10 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium">{st.name}</p>
                        <p className="text-xs text-muted-foreground">{st.location}</p>
                      </td>
                      <td className="text-right px-4 py-3 font-mono tabular-nums font-semibold">{fmt$(st.weekly_sales)}</td>
                      <td className={`text-right px-4 py-3 tabular-nums text-xs font-medium ${wow.positive ? "text-primary" : "text-destructive"}`}>
                        {wow.label}
                      </td>
                      <td className={`text-right px-4 py-3 tabular-nums font-mono ${st.weekly_gm_pct >= 31 ? "text-primary" : st.weekly_gm_pct >= 28 ? "text-foreground" : "text-destructive"}`}>
                        {st.weekly_gm_pct.toFixed(1)}%
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums text-muted-foreground">{st.transactions.toLocaleString()}</td>
                      <td className="text-right px-4 py-3 tabular-nums text-muted-foreground">${st.avg_basket.toFixed(2)}</td>
                      <td className="text-right px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground w-9 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-muted/20 border-t-2 border-foreground/20 font-semibold">
                  <td className="px-5 py-3">Total — Company</td>
                  <td className="text-right px-4 py-3 font-mono tabular-nums">{fmt$(store.weekly_sales)}</td>
                  <td className={`text-right px-4 py-3 text-xs font-medium ${delta(store.weekly_sales, store.prior_weekly_sales).positive ? "text-primary" : "text-destructive"}`}>
                    {delta(store.weekly_sales, store.prior_weekly_sales).label}
                  </td>
                  <td className="text-right px-4 py-3 tabular-nums font-mono text-primary">{store.weekly_gm_pct.toFixed(1)}%</td>
                  <td className="text-right px-4 py-3 tabular-nums">{store.transactions.toLocaleString()}</td>
                  <td className="text-right px-4 py-3 tabular-nums">${store.avg_basket.toFixed(2)}</td>
                  <td className="text-right px-4 py-3 text-muted-foreground">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense><DashboardInner /></Suspense>
}
