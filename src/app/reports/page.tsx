"use client"

import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { STORES } from "@/lib/demo-data"

// ─── Types & helpers ──────────────────────────────────────────────────────────

type ReportType  = "pnl" | "sales" | "deposit" | "shrink" | "aging"
type PeriodKey   = "week" | "lastweek" | "mtd" | "lastmonth" | "ytd" | "custom"

const PERIODS: { id: PeriodKey; label: string; factor: number; label2: string }[] = [
  { id: "week",      label: "This Week",   factor: 1,    label2: "Mar 10–16, 2026" },
  { id: "lastweek",  label: "Last Week",   factor: 0.99, label2: "Mar 3–9, 2026" },
  { id: "mtd",       label: "MTD",         factor: 2.28, label2: "Mar 1–16, 2026" },
  { id: "lastmonth", label: "Last Month",  factor: 4.3,  label2: "Feb 1–28, 2026" },
  { id: "ytd",       label: "YTD",         factor: 11.2, label2: "Jan 1 – Mar 16, 2026" },
]

function fmtFull(n: number) {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtK(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return fmtFull(n)
}

function Row({ label, value, sub, indent = 0, bold = false, color = "", right2 }: { label: string; value: string; sub?: string; indent?: number; bold?: boolean; color?: string; right2?: string }) {
  return (
    <div className={`flex items-center justify-between py-[3px] ${bold ? "font-semibold" : ""}`} style={{ paddingLeft: indent * 16 }}>
      <span className="text-sm">{label}{sub && <span className="text-xs text-muted-foreground ml-1.5">{sub}</span>}</span>
      <div className="flex gap-8">
        {right2 && <span className={`text-sm tabular-nums w-28 text-right text-muted-foreground`}>{right2}</span>}
        <span className={`text-sm tabular-nums w-28 text-right ${color}`}>{value}</span>
      </div>
    </div>
  )
}
function Divider({ double = false }: { double?: boolean }) {
  return <div className={`my-1 border-t ${double ? "border-t-2 border-foreground/50" : "border-border/50"}`} />
}
function SectionHead({ label, col2 }: { label: string; col2?: string }) {
  return (
    <div className="flex items-center justify-between mt-4 mb-1">
      <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">{label}</p>
      {col2 && <p className="text-[11px] text-muted-foreground mr-0">{col2}</p>}
    </div>
  )
}

// ─── P&L Report ───────────────────────────────────────────────────────────────

function PnLReport({ storeId, period }: { storeId: string; period: typeof PERIODS[0] }) {
  const store = STORES[storeId] ?? STORES.lakes
  const f = period.factor

  const sales       = Math.round(store.weekly_sales * f)
  const returns_    = Math.round(sales * 0.014)
  const netSales    = sales - returns_
  const totalPurch  = Math.round(store.departments.reduce((s, d) => s + d.purchases, 0) * f)
  const begInv      = Math.round(netSales * 0.38)
  const endInv      = Math.round(netSales * 0.36)
  const cogs        = begInv + totalPurch - endInv
  const grossProfit = netSales - cogs
  const gmPct       = (grossProfit / netSales * 100)

  const labor       = Math.round(netSales * 0.178)
  const benefits    = Math.round(labor * 0.18)
  const rent        = Math.round(netSales * 0.024)
  const utilities   = Math.round(netSales * 0.022)
  const advertising = Math.round(netSales * 0.012)
  const insurance   = Math.round(netSales * 0.008)
  const supplies    = Math.round(netSales * 0.007)
  const repairs     = Math.round(netSales * 0.005)
  const bankFees    = Math.round(netSales * 0.006)
  const deprec      = Math.round(netSales * 0.009)
  const other       = Math.round(netSales * 0.006)
  const totalOpEx   = labor + benefits + rent + utilities + advertising + insurance + supplies + repairs + bankFees + deprec + other
  const ebitda      = grossProfit - totalOpEx + deprec
  const noi         = grossProfit - totalOpEx
  const noiPct      = (noi / netSales * 100)

  // prior period comparison (10% variance)
  const pp = (n: number) => fmtFull(Math.round(n * 0.972))

  return (
    <div className="font-sans text-sm space-y-0">
      <div className="border-b-2 border-foreground/40 pb-3 mb-2">
        <p className="text-base font-bold">{store.name} — {store.location}</p>
        <p className="text-xs text-muted-foreground">Profit & Loss Statement · {period.label2}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Basis: BRdata POS + Vendor Invoices · Accrual</p>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 mb-2">
        <div />
        <p className="text-[11px] font-bold text-muted-foreground uppercase text-right w-28">Current</p>
        <p className="text-[11px] font-bold text-muted-foreground uppercase text-right w-28">Prior Period</p>
      </div>

      <SectionHead label="Revenue" />
      <Row label="Gross Sales"                 value={fmtFull(sales)}       right2={pp(sales)}      indent={1} />
      <Row label="Less: Returns & Allowances"  value={`(${fmtFull(returns_)})`}  right2={`(${pp(returns_)})`}  indent={1} />
      <Divider />
      <Row label="Net Sales"                   value={fmtFull(netSales)}    right2={pp(netSales)}   bold color="text-foreground" />
      <Row label="Net Sales % change"          value=""                     right2="" sub={`${((netSales - Math.round(netSales * 0.972)) / Math.round(netSales * 0.972) * 100).toFixed(1)}% vs prior`} />

      <SectionHead label="Cost of Goods Sold" />
      <Row label="Beginning Inventory"         value={fmtFull(begInv)}      indent={1} />
      <Row label="Purchases (invoiced)"        value={fmtFull(totalPurch)}  indent={1} />
      <Row label="Less: Ending Inventory"      value={`(${fmtFull(endInv)})`}   indent={1} />
      <Divider />
      {store.departments.map(d => (
        <Row key={d.dept} label={d.dept} value={fmtFull(d.purchases * f)} indent={2} sub={`${((d.purchases / store.departments.reduce((s, x) => s + x.purchases, 0)) * 100).toFixed(1)}%`} />
      ))}
      <Divider />
      <Row label="Total COGS"                  value={fmtFull(cogs)}        right2={pp(cogs)}       bold />

      <Divider double />
      <Row label="GROSS PROFIT"                value={fmtFull(grossProfit)} right2={pp(grossProfit)} bold color="text-primary" />
      <Row label={`Gross Margin %`}            value={`${gmPct.toFixed(1)}%`} sub="target ≥ 28%" indent={1} />

      <SectionHead label="Operating Expenses" />
      <Row label="Labor — Hourly"              value={fmtFull(labor)}       indent={1} sub={`${(labor / netSales * 100).toFixed(1)}% of sales`} />
      <Row label="Benefits & Payroll Taxes"    value={fmtFull(benefits)}    indent={1} />
      <Row label="Rent & Occupancy"            value={fmtFull(rent)}        indent={1} />
      <Row label="Utilities"                   value={fmtFull(utilities)}   indent={1} />
      <Row label="Advertising & Promotions"    value={fmtFull(advertising)} indent={1} />
      <Row label="Insurance"                   value={fmtFull(insurance)}   indent={1} />
      <Row label="Supplies & Packaging"        value={fmtFull(supplies)}    indent={1} />
      <Row label="Repairs & Maintenance"       value={fmtFull(repairs)}     indent={1} />
      <Row label="Bank Fees & Processing"      value={fmtFull(bankFees)}    indent={1} />
      <Row label="Depreciation"                value={fmtFull(deprec)}      indent={1} />
      <Row label="Other Operating"             value={fmtFull(other)}       indent={1} />
      <Divider />
      <Row label="Total Operating Expenses"    value={fmtFull(totalOpEx)}   right2={pp(totalOpEx)}  bold />
      <Row label="OpEx as % of Sales"          value={`${(totalOpEx / netSales * 100).toFixed(1)}%`} indent={1} />

      <Divider double />
      <Row label="EBITDA"                      value={fmtFull(ebitda)}      bold color={ebitda >= 0 ? "text-primary" : "text-destructive"} />
      <Row label="Less: Depreciation"          value={`(${fmtFull(deprec)})`} indent={1} />
      <Divider />
      <Row label="NET OPERATING INCOME"        value={fmtFull(noi)}         right2={pp(noi)}        bold color={noi >= 0 ? "text-primary" : "text-destructive"} />
      <Row label="Net Margin %"                value={`${noiPct.toFixed(1)}%`} sub="target ≥ 3%" indent={1} />
    </div>
  )
}

// ─── Daily Sales Report ───────────────────────────────────────────────────────

function SalesReport({ storeId, period }: { storeId: string; period: typeof PERIODS[0] }) {
  const store = STORES[storeId] ?? STORES.lakes
  const f = period.factor
  const t = store.tender

  const gross   = Math.round(store.weekly_sales * f)
  const voidAmt = Math.round(t.voids * f * 14.20)
  const refunds = Math.round(t.refund_amount * f)
  const discounts = Math.round(gross * 0.028)
  const net     = gross - voidAmt - refunds - discounts
  const customers = Math.round(t.customer_count * f)
  const avgBasket = net / customers

  const cash       = Math.round(t.cash * f)
  const credit     = Math.round(t.credit * f)
  const debit      = Math.round(t.debit * f)
  const ebt        = Math.round(t.ebt * f)
  const checks     = Math.round(t.checks * f)
  const giftCards  = Math.round(t.gift_cards * f)
  const tenderTotal = cash + credit + debit + ebt + checks + giftCards

  // Hourly distribution (business hours 6am-10pm)
  const hourlyFracs = [0.018, 0.028, 0.045, 0.065, 0.072, 0.068, 0.055, 0.060, 0.072, 0.078, 0.062, 0.048, 0.035, 0.028, 0.032, 0.052, 0.065, 0.042, 0.025, 0.012, 0.005, 0.003, 0.002, 0.001]
  const hours = Array.from({ length: 16 }, (_, i) => {
    const h = i + 6
    const label = h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`
    const txns = Math.round(customers * hourlyFracs[i])
    const sales = Math.round(net * hourlyFracs[i])
    return { label, txns, sales, avg: txns > 0 ? sales / txns : 0 }
  })

  const topItems = store.departments.sort((a, b) => b.sales - a.sales).slice(0, 5)

  return (
    <div className="font-sans text-sm space-y-0">
      <div className="border-b-2 border-foreground/40 pb-3 mb-2">
        <p className="text-base font-bold">{store.name} — {store.location}</p>
        <p className="text-xs text-muted-foreground">Store Sales Report · {period.label2}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Source: BRdata POS · Register counts included</p>
      </div>

      <SectionHead label="Sales Summary" />
      <Row label="Gross Sales"               value={fmtFull(gross)}     bold />
      <Row label="Less: Voids"               value={`(${fmtFull(voidAmt)})`}  indent={1} sub={`${Math.round(t.voids * f)} transactions`} />
      <Row label="Less: Refunds / Returns"   value={`(${fmtFull(refunds)})`}   indent={1} sub={`${Math.round(t.refunds * f)} transactions`} />
      <Row label="Less: Discounts & Coupons" value={`(${fmtFull(discounts)})`} indent={1} />
      <Divider />
      <Row label="Net Sales"                 value={fmtFull(net)}       bold color="text-primary" />

      <SectionHead label="Transaction Summary" />
      <Row label="Customer Count / Transactions" value={customers.toLocaleString()} bold />
      <Row label="Average Basket (ATV)"          value={fmtFull(avgBasket)}   indent={1} />
      <Row label="Items Per Transaction (avg)"   value="14.2"                 indent={1} />
      <Row label="Voids"                         value={String(Math.round(t.voids * f))}   indent={1} sub="transactions reversed at register" />
      <Row label="Refunds"                       value={String(Math.round(t.refunds * f))} indent={1} />
      <Row label="Comps / Zero-Price Items"      value={fmtFull(gross * 0.003)} indent={1} />

      <SectionHead label="Tender Summary" />
      <div className="space-y-0.5 text-sm">
        {[
          { name: "Cash",              val: cash,      pct: cash / tenderTotal },
          { name: "Credit Card",       val: credit,    pct: credit / tenderTotal },
          { name: "Debit Card",        val: debit,     pct: debit / tenderTotal },
          { name: "EBT / SNAP",        val: ebt,       pct: ebt / tenderTotal },
          { name: "Checks",            val: checks,    pct: checks / tenderTotal },
          { name: "Gift Cards",        val: giftCards, pct: giftCards / tenderTotal },
        ].map(r => (
          <div key={r.name} className="flex items-center gap-2 py-[3px]">
            <span className="w-36">{r.name}</span>
            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary/50 rounded-full" style={{ width: `${r.pct * 100}%` }} />
            </div>
            <span className="w-10 text-right text-muted-foreground text-xs">{(r.pct * 100).toFixed(1)}%</span>
            <span className="w-28 text-right tabular-nums font-mono">{fmtFull(r.val)}</span>
          </div>
        ))}
      </div>
      <Divider />
      <Row label="Total Tender"      value={fmtFull(tenderTotal)} bold />
      <Row label="Tax Collected"     value={fmtFull(net * 0.082)} indent={1} />

      <SectionHead label="Sales by Department" />
      {store.departments.map(d => (
        <div key={d.dept} className="flex items-center gap-2 py-[3px] text-sm">
          <span className="w-28">{d.dept}</span>
          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary/40 rounded-full" style={{ width: `${d.sales / store.weekly_sales * 100}%` }} />
          </div>
          <span className="w-10 text-right text-muted-foreground text-xs">{(d.sales / store.weekly_sales * 100).toFixed(1)}%</span>
          <span className="w-28 text-right tabular-nums font-mono">{fmtFull(d.sales * f)}</span>
        </div>
      ))}

      <SectionHead label="Top Departments by Sales" />
      {topItems.map((d, i) => (
        <Row key={d.dept} label={`${i + 1}. ${d.dept}`} value={fmtFull(d.sales * f)} indent={1}
          sub={`GM: ${d.gm_pct.toFixed(1)}%`} />
      ))}

      <SectionHead label="Hourly Sales Breakdown" />
      <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-xs mt-1">
        <div className="text-muted-foreground font-medium">Hour</div>
        <div className="text-right text-muted-foreground font-medium">Txns</div>
        <div className="text-right text-muted-foreground font-medium">Sales</div>
        <div className="text-right text-muted-foreground font-medium">Avg $</div>
        {hours.map(h => (
          <>
            <div key={`${h.label}-label`} className="tabular-nums">{h.label}</div>
            <div key={`${h.label}-txns`} className="text-right tabular-nums text-muted-foreground">{h.txns}</div>
            <div key={`${h.label}-sales`} className="text-right tabular-nums">{fmtK(h.sales)}</div>
            <div key={`${h.label}-avg`} className="text-right tabular-nums text-muted-foreground">{fmtFull(h.avg)}</div>
          </>
        ))}
      </div>
    </div>
  )
}

// ─── Bank Deposit ──────────────────────────────────────────────────────────────

function DepositReport({ storeId, period }: { storeId: string; period: typeof PERIODS[0] }) {
  const store = STORES[storeId] ?? STORES.lakes
  const f = period.factor
  const d = store.bank_deposit

  const bills100 = Math.round(store.tender.cash * f * 0.18 / 100)
  const bills50  = Math.round(store.tender.cash * f * 0.14 / 50)
  const bills20  = Math.round(store.tender.cash * f * 0.31 / 20)
  const bills10  = Math.round(store.tender.cash * f * 0.17 / 10)
  const bills5   = Math.round(store.tender.cash * f * 0.11 / 5)
  const bills1   = Math.round(store.tender.cash * f * 0.09 / 1)
  const cashBills = bills100 * 100 + bills50 * 50 + bills20 * 20 + bills10 * 10 + bills5 * 5 + bills1

  const quarters = Math.round(store.bank_deposit.cash_coins * f / 0.25)
  const dimes    = Math.round(store.bank_deposit.cash_coins * f * 0.2 / 0.10)
  const nickels  = Math.round(store.bank_deposit.cash_coins * f * 0.1 / 0.05)
  const pennies  = Math.round(store.bank_deposit.cash_coins * f * 0.05 / 0.01)
  const cashCoins = quarters * 0.25 + dimes * 0.10 + nickels * 0.05 + pennies * 0.01

  const checks = d.checks.map(c => ({ ...c, amount: c.amount * (f > 2 ? Math.round(f) : 1) }))
  const checkTotal = checks.reduce((s, c) => s + c.amount, 0)
  const cashTotal = cashBills + cashCoins
  const grandTotal = cashTotal + checkTotal

  const creditBatch = Math.round(store.tender.credit * f)
  const debitBatch  = Math.round(store.tender.debit * f)

  return (
    <div className="font-sans text-sm space-y-0">
      <div className="border-b-2 border-foreground/40 pb-3 mb-2">
        <p className="text-base font-bold">{store.name} — {store.location}</p>
        <p className="text-xs text-muted-foreground">Bank Deposit Report · {period.label2}</p>
        <p className="text-xs text-muted-foreground mt-0.5">For deposit to: Akins Market Operating Account</p>
      </div>

      <SectionHead label="Currency (Bills)" />
      {[
        { label: "$100 bills", count: bills100, each: 100 },
        { label: "$50 bills",  count: bills50,  each: 50  },
        { label: "$20 bills",  count: bills20,  each: 20  },
        { label: "$10 bills",  count: bills10,  each: 10  },
        { label: "$5 bills",   count: bills5,   each: 5   },
        { label: "$1 bills",   count: bills1,   each: 1   },
      ].map(b => (
        <Row key={b.label} label={b.label} value={fmtFull(b.count * b.each)} sub={`${b.count} × $${b.each}`} indent={1} />
      ))}
      <Divider />
      <Row label="Subtotal — Currency" value={fmtFull(cashBills)} bold />

      <SectionHead label="Coin" />
      {[
        { label: "Quarters",   count: quarters, each: 0.25 },
        { label: "Dimes",      count: dimes,    each: 0.10 },
        { label: "Nickels",    count: nickels,  each: 0.05 },
        { label: "Pennies",    count: pennies,  each: 0.01 },
      ].map(c => (
        <Row key={c.label} label={c.label} value={fmtFull(c.count * c.each)} sub={`${c.count}`} indent={1} />
      ))}
      <Divider />
      <Row label="Subtotal — Coin" value={fmtFull(cashCoins)} bold />

      <Divider />
      <Row label="TOTAL CASH" value={fmtFull(cashTotal)} bold color="text-foreground" />

      <SectionHead label="Checks" />
      {checks.map(c => (
        <Row key={c.check_number} label={`Check #${c.check_number} — ${c.from}`} value={fmtFull(c.amount)} indent={1} />
      ))}
      <Divider />
      <Row label="Subtotal — Checks" value={fmtFull(checkTotal)} bold />

      <Divider double />
      <Row label="TOTAL DEPOSIT" value={fmtFull(grandTotal)} bold color="text-primary" />

      <SectionHead label="Electronic Batches (Reference — Not Deposited)" />
      <Row label="Credit Card Batch" value={fmtFull(creditBatch)} indent={1} sub="processed by card processor" />
      <Row label="Debit Card Batch"  value={fmtFull(debitBatch)}  indent={1} sub="processed by card processor" />
      <Divider />
      <Row label="Electronic Total" value={fmtFull(creditBatch + debitBatch)} />

      <SectionHead label="Safe Count" />
      <Row label="Safe — Start of Day"    value={fmtFull(d.safe_starting)} indent={1} />
      <Row label="Safe — End of Day"      value={fmtFull(d.safe_ending)}   indent={1} />
      <Row label="Change Order Needed"    value={fmtFull(d.change_order)}  indent={1} sub="order by 2:00 PM" />
      <Row label="Safe Variance"          value={fmtFull(d.safe_ending - d.safe_starting + d.change_order)} indent={1} />

      <div className="mt-6 border-t border-border pt-4 grid grid-cols-2 gap-6 text-xs">
        <div>
          <p className="font-semibold mb-2">Prepared By</p>
          <div className="border-b border-foreground/30 pb-5 mb-2 w-full" />
          <p className="text-muted-foreground">Store Manager Signature & Date</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Verified By</p>
          <div className="border-b border-foreground/30 pb-5 mb-2 w-full" />
          <p className="text-muted-foreground">Supervisor Signature & Date</p>
        </div>
      </div>
    </div>
  )
}

// ─── Shrink Report ────────────────────────────────────────────────────────────

function ShrinkReport({ storeId, period }: { storeId: string; period: typeof PERIODS[0] }) {
  const store = STORES[storeId] ?? STORES.lakes
  const f = period.factor

  const totalShrink   = store.shrink.reduce((s, r) => s + r.shrink_dollars, 0) * f
  const totalKnown    = store.shrink.reduce((s, r) => s + r.known, 0) * f
  const totalUnknown  = store.shrink.reduce((s, r) => s + r.unknown, 0) * f
  const netSales      = store.weekly_sales * f
  const shrinkPct     = totalShrink / netSales * 100

  // Cause breakdown
  const external    = totalUnknown * 0.54
  const internal    = totalUnknown * 0.18
  const adminError  = totalUnknown * 0.12
  const vendorShort = totalUnknown * 0.16

  return (
    <div className="font-sans text-sm space-y-0">
      <div className="border-b-2 border-foreground/40 pb-3 mb-2">
        <p className="text-base font-bold">{store.name} — {store.location}</p>
        <p className="text-xs text-muted-foreground">Shrink & Loss Analysis · {period.label2}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Known = documented spoilage / waste. Unknown = inventory variance (potential theft or receiving error).</p>
      </div>

      <SectionHead label="Inventory Method" />
      <Row label="Beginning Inventory (est.)"  value={fmtFull(netSales * 0.38)} indent={1} />
      <Row label="+ Purchases (invoiced)"       value={fmtFull(store.departments.reduce((s, d) => s + d.purchases, 0) * f)} indent={1} />
      <Row label="= Goods Available"            value={fmtFull(netSales * 0.38 + store.departments.reduce((s, d) => s + d.purchases, 0) * f)} indent={1} />
      <Row label="− Ending Inventory (count)"  value={`(${fmtFull(netSales * 0.36)})`} indent={1} />
      <Row label="− Net Sales (at cost)"        value={`(${fmtFull(netSales * (1 - store.weekly_gm_pct / 100))})`} indent={1} />
      <Divider />
      <Row label="Calculated Shrink"            value={fmtFull(totalShrink)} bold
        color={shrinkPct > 3 ? "text-destructive" : shrinkPct > 1.5 ? "text-secondary" : "text-primary"} />
      <Row label="Shrink Rate %"                value={`${shrinkPct.toFixed(2)}%`} indent={1}
        sub="industry avg: 1.4–2.0%" />

      <SectionHead label="By Department" />
      <div className="text-xs grid grid-cols-[1fr_80px_60px_70px_70px_60px] gap-x-2 text-muted-foreground font-medium mb-1">
        <span>Department</span><span className="text-right">Shrink $</span><span className="text-right">Rate %</span>
        <span className="text-right">Known</span><span className="text-right">Unknown</span><span className="text-right">vs LW</span>
      </div>
      {store.shrink.map(r => {
        const trend = r.shrink_pct - r.prior_shrink_pct
        return (
          <div key={r.dept} className="text-sm grid grid-cols-[1fr_80px_60px_70px_70px_60px] gap-x-2 py-1 border-b border-border/20">
            <span>{r.dept}</span>
            <span className="text-right tabular-nums font-mono">{fmtFull(r.shrink_dollars * f)}</span>
            <span className={`text-right tabular-nums font-semibold ${r.shrink_pct > 4 ? "text-destructive" : r.shrink_pct > 2.5 ? "text-secondary" : "text-foreground"}`}>{r.shrink_pct.toFixed(1)}%</span>
            <span className="text-right tabular-nums text-muted-foreground">{fmtFull(r.known * f)}</span>
            <span className={`text-right tabular-nums ${r.unknown > r.known ? "text-destructive" : "text-muted-foreground"}`}>{fmtFull(r.unknown * f)}</span>
            <span className={`text-right tabular-nums text-xs ${trend > 0 ? "text-destructive" : "text-primary"}`}>{trend > 0 ? "+" : ""}{trend.toFixed(1)}%</span>
          </div>
        )
      })}
      <div className="text-sm grid grid-cols-[1fr_80px_60px_70px_70px_60px] gap-x-2 py-1 font-semibold border-t-2 border-foreground/30">
        <span>Total</span>
        <span className="text-right tabular-nums font-mono text-destructive">{fmtFull(totalShrink)}</span>
        <span className={`text-right ${shrinkPct > 3 ? "text-destructive" : "text-foreground"}`}>{shrinkPct.toFixed(1)}%</span>
        <span className="text-right tabular-nums text-muted-foreground">{fmtFull(totalKnown)}</span>
        <span className="text-right tabular-nums text-destructive">{fmtFull(totalUnknown)}</span>
        <span />
      </div>

      <SectionHead label="Unknown Loss — Cause Estimate" />
      <Row label="External Theft (shoplifting)"    value={fmtFull(external)}    indent={1} sub={`${(external / totalUnknown * 100).toFixed(0)}%`} />
      <Row label="Internal / Employee"             value={fmtFull(internal)}    indent={1} sub={`${(internal / totalUnknown * 100).toFixed(0)}%`} color="text-destructive" />
      <Row label="Admin / Scanning Errors"         value={fmtFull(adminError)}  indent={1} sub={`${(adminError / totalUnknown * 100).toFixed(0)}%`} />
      <Row label="Vendor Shortage / Receiving"     value={fmtFull(vendorShort)} indent={1} sub={`${(vendorShort / totalUnknown * 100).toFixed(0)}%`} />

      {store.shrink.filter(r => r.unknown > r.known || r.shrink_pct > 4).length > 0 && (
        <div className="mt-4 bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs space-y-1">
          <p className="font-semibold text-destructive text-sm">⚠ Exception Alerts</p>
          {store.shrink.filter(r => r.unknown > r.known).map(r => (
            <p key={r.dept} className="text-muted-foreground">· {r.dept}: unknown loss (${(r.unknown * f).toFixed(0)}) exceeds known loss — investigate variance before next count</p>
          ))}
          {store.shrink.filter(r => r.shrink_pct > 5).map(r => (
            <p key={r.dept + "-rate"} className="text-muted-foreground">· {r.dept}: shrink rate {r.shrink_pct.toFixed(1)}% exceeds 5% threshold — schedule physical count</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Invoice Aging (A/P) ──────────────────────────────────────────────────────

function AgingReport({ storeId }: { storeId: string }) {
  const store = STORES[storeId] ?? STORES.lakes

  // Build aging data from invoices + synthetic overdue items
  const rows = [
    ...store.recent_invoices.map(inv => ({
      vendor: inv.vendor,
      invoice: inv.id,
      date: inv.date,
      due: inv.status === "paid" ? inv.date : "Apr 1, 2026",
      terms: inv.vendor.includes("Produce") ? "Net 15" : inv.vendor.includes("Coca") || inv.vendor.includes("Frito") || inv.vendor.includes("Bimbo") ? "COD" : "Net 30",
      amount: inv.amount,
      paid: inv.status === "paid" ? inv.amount : 0,
      balance: inv.status === "paid" ? 0 : inv.amount,
      bucket: inv.status === "paid" ? "current" as const : inv.status === "overdue" ? "61-90" as const : "current" as const,
      discount_avail: inv.allowance_earned > 0 && inv.status !== "paid" ? `$${(inv.amount * 0.02).toFixed(2)} if paid by ${inv.date.replace("Mar", "Mar")}` : null,
    })),
    // Add synthetic overdue for demo richness
    { vendor: "Sysco Foods", invoice: "SYS-8821", date: "Feb 12, 2026", due: "Mar 14, 2026", terms: "Net 30", amount: 3240, paid: 0, balance: 3240, bucket: "1-30" as const, discount_avail: null },
    { vendor: "Darigold Inc.", invoice: "DAR-4401", date: "Jan 28, 2026", due: "Feb 27, 2026", terms: "Net 30", amount: 1680, paid: 1000, balance: 680, bucket: "31-60" as const, discount_avail: null },
    { vendor: "Sysco Foods", invoice: "SYS-7702", date: "Jan 15, 2026", due: "Feb 14, 2026", terms: "Net 30", amount: 4120, paid: 2000, balance: 2120, bucket: "61-90" as const, discount_avail: null },
  ]

  const buckets = {
    current: rows.filter(r => r.bucket === "current").reduce((s, r) => s + r.balance, 0),
    "1-30":  rows.filter(r => r.bucket === "1-30").reduce((s, r) => s + r.balance, 0),
    "31-60": rows.filter(r => r.bucket === "31-60").reduce((s, r) => s + r.balance, 0),
    "61-90": rows.filter(r => r.bucket === "61-90").reduce((s, r) => s + r.balance, 0),
  }
  const totalBalance = Object.values(buckets).reduce((s, v) => s + v, 0)

  const BUCKET_LABEL: Record<string, string> = {
    "current": "Current", "1-30": "1–30 Days", "31-60": "31–60 Days", "61-90": "61–90 Days"
  }
  const BUCKET_COLOR: Record<string, string> = {
    "current": "text-primary", "1-30": "text-secondary-foreground", "31-60": "text-destructive", "61-90": "text-destructive"
  }

  return (
    <div className="font-sans text-sm space-y-0">
      <div className="border-b-2 border-foreground/40 pb-3 mb-2">
        <p className="text-base font-bold">{store.name} — {store.location}</p>
        <p className="text-xs text-muted-foreground">Accounts Payable Aging Report · As of Mar 16, 2026</p>
        <p className="text-xs text-muted-foreground mt-0.5">All outstanding vendor invoices sorted by days past due</p>
      </div>

      {/* Aging summary buckets */}
      <div className="grid grid-cols-4 gap-3 my-4">
        {Object.entries(buckets).map(([key, val]) => (
          <div key={key} className={`border rounded-lg px-3 py-2 ${key !== "current" && val > 0 ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/10"}`}>
            <p className="text-[11px] text-muted-foreground">{BUCKET_LABEL[key]}</p>
            <p className={`text-lg font-bold tabular-nums mt-0.5 ${val > 0 ? BUCKET_COLOR[key] : "text-muted-foreground"}`}>{fmtFull(val)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{totalBalance > 0 ? `${(val / totalBalance * 100).toFixed(0)}% of total` : "—"}</p>
          </div>
        ))}
      </div>

      <SectionHead label="Invoice Detail" />
      <div className="text-xs grid grid-cols-[130px_110px_80px_60px_70px_80px_80px_auto] gap-x-2 text-muted-foreground font-medium mb-1">
        <span>Vendor</span><span>Invoice #</span><span>Date</span><span>Terms</span>
        <span className="text-right">Amount</span><span className="text-right">Paid</span>
        <span className="text-right">Balance</span><span>Aging</span>
      </div>
      {rows.sort((a, b) => {
        const order = { "61-90": 0, "31-60": 1, "1-30": 2, "current": 3 }
        return order[a.bucket] - order[b.bucket]
      }).map((r, i) => (
        <div key={r.invoice} className={`text-sm grid grid-cols-[130px_110px_80px_60px_70px_80px_80px_auto] gap-x-2 py-1 border-b border-border/20 ${i % 2 === 1 ? "bg-muted/5" : ""}`}>
          <span className="truncate">{r.vendor}</span>
          <span className="font-mono text-xs text-muted-foreground">{r.invoice}</span>
          <span className="text-muted-foreground text-xs">{r.date}</span>
          <span className="text-muted-foreground text-xs">{r.terms}</span>
          <span className="text-right tabular-nums font-mono">{fmtFull(r.amount)}</span>
          <span className="text-right tabular-nums text-muted-foreground">{r.paid > 0 ? fmtFull(r.paid) : "—"}</span>
          <span className={`text-right tabular-nums font-semibold ${r.balance > 0 ? "text-foreground" : "text-muted-foreground"}`}>{r.balance > 0 ? fmtFull(r.balance) : "—"}</span>
          <span className={`text-xs font-medium ${BUCKET_COLOR[r.bucket]}`}>{BUCKET_LABEL[r.bucket]}</span>
        </div>
      ))}

      <div className="text-sm grid grid-cols-[130px_110px_80px_60px_70px_80px_80px_auto] gap-x-2 py-2 font-bold border-t-2 border-foreground/30">
        <span>Total A/P</span>
        <span /><span /><span />
        <span className="text-right tabular-nums">{fmtFull(rows.reduce((s, r) => s + r.amount, 0))}</span>
        <span className="text-right tabular-nums text-muted-foreground">{fmtFull(rows.reduce((s, r) => s + r.paid, 0))}</span>
        <span className="text-right tabular-nums text-destructive">{fmtFull(totalBalance)}</span>
        <span />
      </div>

      {rows.some(r => r.discount_avail) && (
        <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs space-y-1">
          <p className="font-semibold text-primary text-sm">Early Payment Discounts Available</p>
          {rows.filter(r => r.discount_avail).map(r => (
            <p key={r.invoice} className="text-muted-foreground">· {r.vendor} ({r.invoice}): {r.discount_avail}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────

const REPORT_TYPES: { id: ReportType; label: string; desc: string; icon: string }[] = [
  { id: "pnl",     label: "Profit & Loss",       desc: "Income statement — COGS, OpEx, NOI",    icon: "📊" },
  { id: "sales",   label: "Store Sales Report",   desc: "Tender, hourly, voids, customer count", icon: "🧾" },
  { id: "deposit", label: "Bank Deposit",         desc: "Cash by denomination, checks, safe",    icon: "🏦" },
  { id: "shrink",  label: "Shrink / Loss",        desc: "Known & unknown, cause breakdown",      icon: "🔍" },
  { id: "aging",   label: "A/P Aging",            desc: "Vendor invoices by days past due",      icon: "📋" },
]

function ReportsInner() {
  const params = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const [activeReport, setActiveReport] = useState<ReportType>("pnl")
  const [periodId, setPeriodId] = useState<PeriodKey>("week")
  const [customFrom, setCustomFrom] = useState("2026-03-01")
  const [customTo,   setCustomTo]   = useState("2026-03-16")

  const customFactor = useMemo(() => {
    const days = Math.max(1, (new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000 + 1)
    return days / 7
  }, [customFrom, customTo])

  const customLabel2 = useMemo(() => {
    const fmt = (s: string) => { const d = new Date(s); return `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}, ${d.getFullYear()}` }
    return `${fmt(customFrom)} – ${fmt(customTo)}`
  }, [customFrom, customTo])

  const period = useMemo(() => {
    if (periodId === "custom") return { id: "custom" as PeriodKey, label: "Custom", factor: customFactor, label2: customLabel2 }
    return PERIODS.find(p => p.id === periodId)!
  }, [periodId, customFactor, customLabel2])

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports & Export</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {STORES[storeId]?.name ?? "Lakes"} · {period.label2} · BRdata POS
          </p>
        </div>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity print:hidden">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export PDF
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 flex-wrap items-center print:hidden">
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriodId(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              periodId === p.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}>
            {p.label}
            <span className={`ml-1.5 ${periodId === p.id ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
              {p.label2}
            </span>
          </button>
        ))}
        {/* Custom range pill */}
        <button onClick={() => setPeriodId("custom")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            periodId === "custom"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}>
          Custom
          {periodId === "custom" && (
            <span className="ml-1.5 text-primary-foreground/70">{customLabel2}</span>
          )}
        </button>
        {/* Custom date inputs — only visible when custom selected */}
        {periodId === "custom" && (
          <div className="flex items-center gap-2 ml-1">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="text-xs bg-card border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="text-xs bg-card border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
        )}
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-5 gap-3 print:hidden">
        {REPORT_TYPES.map(rt => (
          <button key={rt.id} onClick={() => setActiveReport(rt.id)}
            className={`p-4 rounded-lg border text-left transition-all ${
              activeReport === rt.id
                ? "bg-primary/10 border-primary/50 ring-1 ring-primary/30"
                : "bg-card border-border hover:border-primary/30 hover:bg-muted/20"
            }`}>
            <p className="text-xl mb-2">{rt.icon}</p>
            <p className="text-xs font-semibold leading-tight">{rt.label}</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{rt.desc}</p>
          </button>
        ))}
      </div>

      {/* Report preview */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between print:hidden">
          <p className="text-sm font-medium">{REPORT_TYPES.find(r => r.id === activeReport)?.label} · {period.label2}</p>
          <p className="text-xs text-muted-foreground">Preview · Click "Export PDF" to print or save</p>
        </div>
        <div className="p-6 overflow-x-auto">
          {activeReport === "pnl"     && <PnLReport     storeId={storeId} period={period} />}
          {activeReport === "sales"   && <SalesReport   storeId={storeId} period={period} />}
          {activeReport === "deposit" && <DepositReport storeId={storeId} period={period} />}
          {activeReport === "shrink"  && <ShrinkReport  storeId={storeId} period={period} />}
          {activeReport === "aging"   && <AgingReport   storeId={storeId} />}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          aside, nav, button, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          .bg-card { background: white !important; border: none !important; box-shadow: none !important; }
          * { color: black !important; }
          .text-primary { color: #166534 !important; }
          .text-destructive { color: #dc2626 !important; }
          .text-muted-foreground { color: #6b7280 !important; }
          .border-primary { border-color: #166534 !important; }
        }
      `}</style>
    </div>
  )
}

export default function ReportsPage() {
  return <Suspense><ReportsInner /></Suspense>
}
