"use client"

import * as XLSX from "xlsx"
import { useState, useRef, useCallback } from "react"
import { CopyButton } from "@/components/CopyButton"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { STORES, type Invoice, lookupProduct } from "@/lib/demo-data"

// ─── OCR types ────────────────────────────────────────────────────────────────

type BBox = [number, number, number, number] | null
type FieldVal = { value: string | number | null; bbox: BBox }
type OCRLineItem = {
  description: string; upc?: string | null; pack_size?: string | null
  cases?: number | null; unit_cost?: number | null; promo_dollars?: number | null
  extended?: number | null; bbox: BBox; page?: number
}
type OCRAllowance = { program: string; amount: number; bbox?: BBox }
type OCRResult = {
  vendor?: FieldVal; invoice_number?: FieldVal; invoice_date?: FieldVal
  store_delivered_to?: FieldVal; total?: FieldVal
  line_items?: OCRLineItem[]; allowances?: OCRAllowance[]
  raw_summary?: string; page_count?: number
}
type Page = { file: File; preview: string }

// ─── Overlay helpers ──────────────────────────────────────────────────────────

const FIELD_COLORS: Record<string, string> = {
  vendor: "bg-blue-500/80", invoice_number: "bg-violet-500/80",
  invoice_date: "bg-amber-500/80", store_delivered_to: "bg-cyan-500/80",
  total: "bg-primary/80", line_item: "bg-emerald-500/80", allowance: "bg-yellow-400/80",
}
const FIELD_LABEL: Record<string, string> = {
  vendor: "Vendor", invoice_number: "Invoice #", invoice_date: "Date",
  store_delivered_to: "Ship-To", total: "Total",
}

function BBoxOverlay({ result, pageIdx }: { result: OCRResult; pageIdx: number }) {
  const headerFields = ["vendor", "invoice_number", "invoice_date", "store_delivered_to", "total"] as const
  const lineItems = (result.line_items ?? []).filter(li => (li.page ?? 0) === pageIdx)
  return (
    <>
      {headerFields.map(key => {
        const field = result[key] as FieldVal | undefined
        if (!field?.bbox || !field.value) return null
        const [l, t, r, b] = field.bbox
        return (
          <div key={key} className="absolute rounded border-2 border-white/60"
            style={{ left: `${l}%`, top: `${t}%`, width: `${r - l}%`, height: `${b - t}%` }}>
            <div className={`absolute -top-5 left-0 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded ${FIELD_COLORS[key]} whitespace-nowrap`}>
              {FIELD_LABEL[key]}: {typeof field.value === "number" ? `$${field.value.toLocaleString()}` : field.value}
            </div>
          </div>
        )
      })}
      {lineItems.map((li, i) => {
        if (!li.bbox) return null
        const [l, t, r, b] = li.bbox
        return (
          <div key={`li-${i}`} className="absolute rounded border border-white/40"
            style={{ left: `${l}%`, top: `${t}%`, width: `${r - l}%`, height: `${b - t}%` }}>
            <div className={`absolute -top-5 left-0 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded ${FIELD_COLORS.line_item} whitespace-nowrap max-w-[200px] truncate`}>
              {li.description}{li.upc ? ` · ${li.upc}` : ""}
            </div>
          </div>
        )
      })}
      {pageIdx === 0 && (result.allowances ?? []).map((a, i) => {
        if (!a.bbox) return null
        const [l, t, r, b] = a.bbox
        return (
          <div key={`all-${i}`} className="absolute rounded border border-white/40"
            style={{ left: `${l}%`, top: `${t}%`, width: `${r - l}%`, height: `${b - t}%` }}>
            <div className={`absolute -top-5 left-0 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded ${FIELD_COLORS.allowance} whitespace-nowrap`}>
              Allowance: ${a.amount}
            </div>
          </div>
        )
      })}
    </>
  )
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

function parseDateStr(dateStr: string): Date {
  // "Mar 14, 2026" → Date
  const [mon, dayRaw, yearRaw] = dateStr.replace(",", "").split(" ")
  return new Date(parseInt(yearRaw), MONTH_MAP[mon] ?? 0, parseInt(dayRaw))
}

function getWeekLabel(dateStr: string): string {
  const d = parseDateStr(dateStr)
  // Find the Sunday of that week (business week starts Sun)
  const day = d.getDay() // 0=Sun
  const sunday = new Date(d)
  sunday.setDate(d.getDate() - day)
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][sunday.getMonth()]
  return `Week of ${mon} ${sunday.getDate()}`
}

function weekSortKey(label: string): number {
  // "Week of Mar 8" → parse date for sorting
  const parts = label.replace("Week of ", "").split(" ")
  return (MONTH_MAP[parts[0]] ?? 0) * 100 + parseInt(parts[1])
}

// ─── Invoice Library ──────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  paid:    "bg-primary/10 text-primary",
  pending: "bg-secondary/20 text-secondary-foreground",
  overdue: "bg-destructive/10 text-destructive",
}

const ALL_VENDORS = Array.from(new Set(
  Object.values(STORES).flatMap(s => s.recent_invoices.map(i => i.vendor))
)).sort()

const ALL_DEPTS = Array.from(new Set(
  Object.values(STORES).flatMap(s => s.recent_invoices.map(i => i.dept))
)).sort()

function autoFitCols(rows: (string | number)[][]): XLSX.ColInfo[] {
  const numCols = Math.max(...rows.map(r => r.length))
  return Array.from({ length: numCols }, (_, ci) => {
    const maxLen = rows.reduce((m, r) => Math.max(m, String(r[ci] ?? "").length), 0)
    return { wch: Math.min(Math.max(maxLen + 2, 8), 55) }
  })
}

function exportInvoiceCSV(inv: Invoice) {
  const gap = inv.allowance_earned - inv.allowance_applied
  const totalExt = inv.line_items.reduce((s, li) => s + li.extended, 0)
  const rows = [
    ["INVOICE DETAILS"],
    ["Invoice #", inv.id],
    ["Vendor", inv.vendor],
    ["Date", inv.date],
    ["Department", inv.dept],
    ["Status", inv.status.toUpperCase()],
    [],
    ["FINANCIAL SUMMARY"],
    ["Invoice Total", `$${inv.amount.toLocaleString()}`],
    ["Allowance Earned", `$${inv.allowance_earned.toLocaleString()}`],
    ["Applied", `$${inv.allowance_applied.toLocaleString()}`],
    ["Unclaimed Gap", gap > 0 ? `$${gap.toLocaleString()}` : "$0"],
    [],
    ["LINE ITEMS"],
    ["Description", "UPC", "Pack Size", "Cases", "Unit Cost", "Promo $", "Extended"],
    ...inv.line_items.map(li => [
      li.description, li.upc, li.pack_size, li.cases,
      `$${li.unit_cost.toFixed(2)}`,
      li.promo_dollars > 0 ? `$${li.promo_dollars.toFixed(2)}` : "",
      `$${li.extended.toFixed(2)}`,
    ]),
    ["", "", "", "", "", "TOTAL", `$${totalExt.toFixed(2)}`],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!cols"] = autoFitCols(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Invoice")
  XLSX.writeFile(wb, `${inv.id}.xlsx`)
}

function exportBulkCSV(invoices: (Invoice & { _store: string })[]) {
  const headers = ["Store", "Invoice #", "Vendor", "Dept", "Date", "Amount", "Status", "Allowance Earned", "Allowance Applied", "Gap"]
  const rows = [
    headers,
    ...invoices.map(i => [
      i._store, i.id, i.vendor, i.dept, i.date,
      i.amount, i.status,
      i.allowance_earned, i.allowance_applied,
      i.allowance_earned - i.allowance_applied,
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!cols"] = autoFitCols(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Invoices")
  const now = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `invoices-${now}.xlsx`)
}

function exportInvoicePDF(inv: Invoice) {
  const gap = inv.allowance_earned - inv.allowance_applied
  const totalExt = inv.line_items.reduce((s, li) => s + li.extended, 0)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.id}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; max-width: 760px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #666; font-size: 12px; margin: 0 0 24px; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
  .summary-item label { font-size: 10px; text-transform: uppercase; color: #888; display: block; }
  .summary-item span { font-size: 18px; font-weight: 700; }
  .gap { color: #dc2626; }
  .earned { color: #16a34a; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; color: #888; padding: 8px 10px; border-bottom: 2px solid #e5e5e5; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
  .right { text-align: right; }
  .promo { color: #16a34a; font-weight: 600; }
  tfoot td { font-weight: 700; border-top: 2px solid #e5e5e5; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${inv.vendor}</h1>
<p class="sub">${inv.id} &nbsp;·&nbsp; ${inv.date} &nbsp;·&nbsp; ${inv.dept} &nbsp;·&nbsp; <strong>${inv.status.toUpperCase()}</strong></p>
<div class="summary">
  <div class="summary-item"><label>Invoice Total</label><span>$${inv.amount.toLocaleString()}</span></div>
  <div class="summary-item"><label>Allowance Earned</label><span class="earned">$${inv.allowance_earned.toLocaleString()}</span></div>
  <div class="summary-item"><label>Applied</label><span>$${inv.allowance_applied.toLocaleString()}</span></div>
  <div class="summary-item"><label>Unclaimed Gap</label><span class="${gap > 0 ? "gap" : ""}">${gap > 0 ? "$" + gap.toLocaleString() : "—"}</span></div>
</div>
<table>
  <thead><tr>
    <th>Description</th><th>UPC</th><th>Pack Size</th>
    <th class="right">Cases</th><th class="right">Unit Cost</th>
    <th class="right">Promo $</th><th class="right">Extended</th>
  </tr></thead>
  <tbody>
    ${inv.line_items.map(li => `<tr>
      <td>${li.description}</td><td style="font-family:monospace;font-size:11px;color:#888">${li.upc}</td>
      <td>${li.pack_size}</td><td class="right">${li.cases}</td>
      <td class="right">$${li.unit_cost.toFixed(2)}</td>
      <td class="right ${li.promo_dollars > 0 ? "promo" : ""}">${li.promo_dollars > 0 ? "$" + li.promo_dollars.toFixed(2) : "—"}</td>
      <td class="right"><strong>$${li.extended.toFixed(2)}</strong></td>
    </tr>`).join("")}
  </tbody>
  <tfoot><tr><td colspan="6">Total</td><td class="right">$${totalExt.toFixed(2)}</td></tr></tfoot>
</table>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`
  const w = window.open("", "_blank")
  if (w) { w.document.write(html); w.document.close() }
}

function InvoiceDetailModal({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"items" | "dept">("items")
  const [expandedUpc, setExpandedUpc] = useState<string | null>(null)

  const totalExt = inv.line_items.reduce((s, li) => s + li.extended, 0)
  const gap = inv.allowance_earned - inv.allowance_applied

  // Enrich line items with product catalog lookup
  const enriched = inv.line_items.map(li => ({ ...li, product: lookupProduct(li.upc) }))

  // Group by dept (catalog dept if found, else invoice dept)
  const deptGroups = enriched.reduce<Record<string, typeof enriched>>((acc, li) => {
    const d = li.product?.dept ?? inv.dept
    acc[d] = acc[d] ?? []
    acc[d].push(li)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold">{inv.vendor}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{inv.id} · {inv.date} · {inv.dept}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportInvoiceCSV(inv)}
              className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              ↓ CSV
            </button>
            <button
              onClick={() => exportInvoicePDF(inv)}
              className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              🖨 PDF
            </button>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[inv.status]}`}>
              {inv.status.toUpperCase()}
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="px-6 py-4 grid grid-cols-4 gap-4 border-b border-border">
          {[
            { label: "Invoice Total",    value: `$${inv.amount.toLocaleString()}` },
            { label: "Allowance Earned", value: `$${inv.allowance_earned.toLocaleString()}`, color: "text-primary" },
            { label: "Applied",          value: `$${inv.allowance_applied.toLocaleString()}` },
            { label: "Unclaimed Gap",    value: gap > 0 ? `$${gap.toLocaleString()}` : "—", color: gap > 0 ? "text-destructive" : "text-muted-foreground" },
          ].map(f => (
            <div key={f.label}>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{f.label}</p>
              <p className={`text-xl font-semibold tabular-nums mt-0.5 ${f.color ?? ""}`}>{f.value}</p>
            </div>
          ))}
        </div>

        {/* Tab toggle */}
        <div className="px-6 pt-4 flex gap-1 border-b border-border pb-0">
          {([["items", `Line Items (${inv.line_items.length})`], ["dept", "By Department"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-xs font-medium rounded-t-md border-b-2 transition-colors ${activeTab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Line items tab */}
        {activeTab === "items" && (
          <div className="px-6 py-4">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">UPC</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Pack</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cases</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Unit $</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Promo $</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Ext.</th>
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((li, i) => (
                    <>
                      <tr key={i} className={`border-b border-border/30 ${i % 2 === 1 ? "bg-muted/5" : ""}`}>
                        <td className="px-4 py-2 font-medium">{li.description}</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedUpc(expandedUpc === li.upc ? null : li.upc)}
                              className={`font-mono underline decoration-dotted transition-colors ${expandedUpc === li.upc ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                            >
                              {li.upc}
                            </button>
                            <CopyButton value={li.upc} />
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{li.pack_size}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{li.cases}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${li.unit_cost.toFixed(2)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-medium ${li.promo_dollars > 0 ? "text-primary" : "text-muted-foreground"}`}>
                          {li.promo_dollars > 0 ? `$${li.promo_dollars.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">${li.extended.toFixed(2)}</td>
                      </tr>
                      {expandedUpc === li.upc && li.product && (
                        <tr key={`${i}-detail`} className="bg-primary/5 border-b border-primary/20">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dept</p>
                                <p className="text-xs font-medium mt-0.5">{li.product.dept}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Our Retail</p>
                                <p className="text-xs font-medium mt-0.5">${li.product.unit_retail.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">GM%</p>
                                <p className={`text-xs font-semibold mt-0.5 ${li.product.gm_pct >= 35 ? "text-primary" : li.product.gm_pct >= 25 ? "text-foreground" : "text-destructive"}`}>
                                  {li.product.gm_pct.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Promo Status</p>
                                {li.product.in_promo ? (
                                  <p className="text-xs font-medium text-primary mt-0.5">{li.product.promo_desc}</p>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-0.5">Regular price</p>
                                )}
                              </div>
                            </div>
                            {li.product.in_promo && li.product.promo_retail && (
                              <p className="text-[10px] text-muted-foreground mt-2">
                                Promo retail: <span className="text-primary font-medium">${li.product.promo_retail.toFixed(2)}</span>
                                {li.product.promo_end && ` · thru ${li.product.promo_end}`}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                      {expandedUpc === li.upc && !li.product && (
                        <tr key={`${i}-notfound`} className="bg-muted/10 border-b border-border/20">
                          <td colSpan={7} className="px-4 py-2 text-xs text-muted-foreground italic">
                            UPC {li.upc} not found in product catalog
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                    <td className="px-4 py-2" colSpan={6}>Total</td>
                    <td className="px-3 py-2 text-right tabular-nums">${totalExt.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* By department tab */}
        {activeTab === "dept" && (
          <div className="px-6 py-4 space-y-4">
            {Object.entries(deptGroups).map(([dept, items]) => {
              const subtotal = items.reduce((s, li) => s + li.extended, 0)
              const promoTotal = items.reduce((s, li) => s + li.promo_dollars, 0)
              return (
                <div key={dept} className="border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/20 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-semibold">{dept}</p>
                    <div className="flex gap-4 text-xs">
                      {promoTotal > 0 && (
                        <span className="text-primary font-medium">+${promoTotal.toFixed(2)} promo</span>
                      )}
                      <span className="font-mono font-semibold tabular-nums">${subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {items.map((li, i) => (
                        <tr key={i} className={`border-b border-border/20 ${i % 2 === 1 ? "bg-muted/5" : ""}`}>
                          <td className="px-4 py-2 font-medium">{li.description}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{li.upc}</td>
                          <td className="px-3 py-2 text-muted-foreground">{li.cases} cases</td>
                          {li.product && (
                            <td className={`px-3 py-2 text-right text-[10px] font-medium ${li.product.gm_pct >= 35 ? "text-primary" : li.product.gm_pct >= 25 ? "text-muted-foreground" : "text-destructive"}`}>
                              {li.product.gm_pct.toFixed(1)}% GM
                            </td>
                          )}
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">${li.extended.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
            <div className="flex justify-end">
              <p className="text-sm font-semibold tabular-nums">Grand Total: ${totalExt.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type SortCol = "id" | "vendor" | "dept" | "date" | "amount" | "gap" | "status"

function SortTh({ col, label, right = false, sortBy, sortDir, onSort }: {
  col: SortCol; label: string; right?: boolean
  sortBy: SortCol; sortDir: "asc" | "desc"; onSort: (c: SortCol) => void
}) {
  const active = sortBy === col
  const arrow = active ? (sortDir === "asc" ? "▲" : "▼") : ""
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-5 py-3 text-xs font-medium uppercase tracking-wide cursor-pointer select-none transition-colors ${right ? "text-right" : "text-left"} ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"}`}
    >
      {right ? <>{label}{arrow && <span className="ml-1 text-primary">{arrow}</span>}</> : <>{arrow && <span className="mr-1 text-primary">{arrow}</span>}{label}</>}
    </th>
  )
}

function InvoiceLibrary({ storeId }: { storeId: string }) {
  const [vendor, setVendor] = useState("")
  const [dept, setDept] = useState("")
  const [status, setStatus] = useState("")
  const [week, setWeek] = useState("")
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [sortBy, setSortBy] = useState<SortCol>("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  function toggleSort(col: SortCol) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("desc") }
  }

  // Collect invoices from active store(s)
  const allInvoices = storeId === "company"
    ? Object.values(STORES).flatMap(s => s.recent_invoices.map(i => ({ ...i, _store: s.name })))
    : (STORES[storeId]?.recent_invoices ?? []).map(i => ({ ...i, _store: STORES[storeId]?.name ?? "" }))

  // Build sorted week options (newest first)
  const allWeeks = Array.from(new Set(allInvoices.map(i => getWeekLabel(i.date))))
    .sort((a, b) => weekSortKey(b) - weekSortKey(a))

  const filtered = allInvoices.filter(i => {
    const d = new Date(i.date).getTime()
    const dateOk = week === "custom"
      ? (!customFrom || d >= new Date(customFrom).getTime()) && (!customTo || d <= new Date(customTo).getTime())
      : (!week || getWeekLabel(i.date) === week)
    return (!vendor || i.vendor === vendor) && (!dept || i.dept === dept) && (!status || i.status === status) && dateOk
  })

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number, bv: string | number
    const gap = (inv: typeof a) => inv.allowance_earned - inv.allowance_applied
    if (sortBy === "id")     { av = a.id;                bv = b.id }
    else if (sortBy === "vendor") { av = a.vendor;       bv = b.vendor }
    else if (sortBy === "dept")   { av = a.dept;         bv = b.dept }
    else if (sortBy === "date")   { av = new Date(a.date).getTime(); bv = new Date(b.date).getTime() }
    else if (sortBy === "amount") { av = a.amount;       bv = b.amount }
    else if (sortBy === "gap")    { av = gap(a);         bv = gap(b) }
    else                          { av = a.status;       bv = b.status }
    const cmp = typeof av === "string" ? av.localeCompare(String(bv)) : av - (bv as number)
    return sortDir === "asc" ? cmp : -cmp
  })

  const total = filtered.reduce((s, i) => s + i.amount, 0)
  const gaps  = filtered.reduce((s, i) => s + (i.allowance_earned - i.allowance_applied), 0)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <select value={week} onChange={e => setWeek(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium">
          <option value="">All Weeks</option>
          {allWeeks.map(w => <option key={w} value={w}>{w}</option>)}
          <option value="custom">Custom Range…</option>
        </select>
        {week === "custom" && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="bg-card border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="bg-card border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </>
        )}
        <select value={vendor} onChange={e => setVendor(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">All Vendors</option>
          {ALL_VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={dept} onChange={e => setDept(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">All Departments</option>
          {ALL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        {(vendor || dept || status || week) && (
          <button onClick={() => { setVendor(""); setDept(""); setStatus(""); setWeek("") }}
            className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear filters
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""} · ${total.toLocaleString()} total</span>
          {filtered.length > 0 && (
            <button
              onClick={() => exportBulkCSV(filtered)}
              className="flex items-center gap-1.5 text-xs bg-card border border-border hover:border-primary/60 hover:text-primary text-muted-foreground px-2.5 py-1.5 rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export All CSV
            </button>
          )}
        </div>
      </div>

      {gaps > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <span className="text-destructive font-bold">⚡</span>
          <span><span className="font-semibold text-destructive">${gaps.toLocaleString()}</span> in earned allowances not yet applied across filtered invoices</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <SortTh col="id"     label="Invoice"       sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="vendor" label="Vendor"        sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="dept"   label="Dept"          sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="date"   label="Date"          sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="amount" label="Amount"  right sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="gap"    label="Allowance Gap" right sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortTh col="status" label="Status"        sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv, i) => {
              const gap = inv.allowance_earned - inv.allowance_applied
              return (
                <tr key={inv.id}
                  onClick={() => setSelected(inv)}
                  className={`border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{inv.id}</td>
                  <td className="px-5 py-3 font-medium">{inv.vendor}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{inv.dept}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{inv.date}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">${inv.amount.toLocaleString()}</td>
                  <td className={`px-5 py-3 text-right font-mono tabular-nums font-semibold text-xs ${gap > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {gap > 0 ? `$${gap.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">No invoices match current filters</div>
        )}
      </div>

      {selected && <InvoiceDetailModal inv={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ─── Vendor template system ───────────────────────────────────────────────────

type VendorTemplate = {
  vendor: string
  version: number
  layout_signature: string
  field_map: Record<string, { x: number; y: number }>
  last_used: string
  created: string
}

type TemplateStatus =
  | { state: "new";     vendor: string; signature: string }
  | { state: "match";   vendor: string; version: number; last_used: string }
  | { state: "changed"; vendor: string; version: number; changed_fields: string[]; signature: string }

const TEMPLATE_KEY = "si_vendor_templates_v1"

function bucketCoord(n: number, bucket: number) { return Math.round(n / bucket) * bucket }

function bboxCenter(bbox: BBox): { x: number; y: number } | null {
  if (!bbox) return null
  return { x: (bbox[0] + bbox[2]) / 2, y: (bbox[1] + bbox[3]) / 2 }
}

function buildLayoutSignature(result: OCRResult): string {
  const BUCKET_X = 50, BUCKET_Y = 30
  const parts: string[] = []
  const fields = ["vendor", "invoice_number", "invoice_date", "total"] as const
  for (const f of fields) {
    const fv = result[f] as FieldVal | undefined
    if (fv?.bbox) {
      const c = bboxCenter(fv.bbox)
      if (c) parts.push(`${f}:x${bucketCoord(c.x, BUCKET_X)}y${bucketCoord(c.y, BUCKET_Y)}`)
    }
  }
  const li0 = result.line_items?.[0]
  if (li0?.bbox) {
    const c = bboxCenter(li0.bbox)
    if (c) parts.push(`li0:x${bucketCoord(c.x, BUCKET_X)}y${bucketCoord(c.y, BUCKET_Y)}`)
  }
  return parts.join(",")
}

function parseSignatureMap(sig: string): Record<string, string> {
  const map: Record<string, string> = {}
  sig.split(",").forEach(part => {
    const idx = part.indexOf(":")
    if (idx > 0) map[part.slice(0, idx)] = part.slice(idx + 1)
  })
  return map
}

function compareSignatures(stored: string, current: string): string[] {
  const storedMap = parseSignatureMap(stored)
  const currentMap = parseSignatureMap(current)
  return Object.keys(currentMap).filter(k => storedMap[k] && storedMap[k] !== currentMap[k])
}

function buildFieldMap(result: OCRResult): Record<string, { x: number; y: number }> {
  const map: Record<string, { x: number; y: number }> = {}
  const fields = ["vendor", "invoice_number", "invoice_date", "total", "store_delivered_to"] as const
  for (const f of fields) {
    const fv = result[f] as FieldVal | undefined
    const c = fv?.bbox ? bboxCenter(fv.bbox) : null
    if (c) map[f] = c
  }
  return map
}

function getAllTemplates(): Record<string, VendorTemplate> {
  if (typeof window === "undefined") return {}
  try { return JSON.parse(localStorage.getItem(TEMPLATE_KEY) ?? "{}") } catch { return {} }
}

function getTemplate(vendor: string): VendorTemplate | null {
  return getAllTemplates()[vendor.toLowerCase()] ?? null
}

function saveTemplate(vendor: string, signature: string, fieldMap: Record<string, { x: number; y: number }>, existingVersion?: number) {
  const all = getAllTemplates()
  const key = vendor.toLowerCase()
  const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  all[key] = {
    vendor,
    version: (existingVersion ?? 0) + 1,
    layout_signature: signature,
    field_map: fieldMap,
    last_used: now,
    created: all[key]?.created ?? now,
  }
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(all))
}

const FIELD_LABEL_MAP: Record<string, string> = {
  vendor: "Vendor", invoice_number: "Invoice #", invoice_date: "Date",
  total: "Total", li0: "First Line Item",
}

// ─── OCR Scanner ─────────────────────────────────────────────────────────────

function OCRScanner({ storeId }: { storeId: string }) {
  const [pages, setPages] = useState<Page[]>([])
  const [activePageIdx, setActivePageIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OCRResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [templateStatus, setTemplateStatus] = useState<TemplateStatus | null>(null)
  const [templateSaved, setTemplateSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((files: FileList | File[]) => {
    const newPages: Page[] = []
    Array.from(files).forEach(f => {
      if (!f.type.startsWith("image/") && f.type !== "application/pdf") return
      newPages.push({ file: f, preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : "" })
    })
    setPages(prev => [...prev, ...newPages])
    setResult(null)
    setError(null)
  }, [])

  function removePage(idx: number) {
    setPages(prev => prev.filter((_, i) => i !== idx))
    setActivePageIdx(prev => Math.max(0, prev > idx ? prev - 1 : prev))
  }

  async function handleSubmit() {
    if (pages.length === 0) return
    setLoading(true); setError(null); setResult(null); setTemplateStatus(null); setTemplateSaved(false)
    try {
      const fd = new FormData()
      pages.forEach((p, i) => fd.append(`file_${i}`, p.file))
      fd.append("store", storeId)
      const res = await fetch("/api/ocr", { method: "POST", body: fd })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: OCRResult = await res.json()
      setResult(data)
      setActivePageIdx(0)

      // Template detection
      const vendor = String(data.vendor?.value ?? "").trim()
      if (vendor) {
        const sig = buildLayoutSignature(data)
        const stored = getTemplate(vendor)
        if (!stored) {
          setTemplateStatus({ state: "new", vendor, signature: sig })
        } else {
          const changed = compareSignatures(stored.layout_signature, sig)
          if (changed.length === 0) {
            setTemplateStatus({ state: "match", vendor, version: stored.version, last_used: stored.last_used })
          } else {
            setTemplateStatus({ state: "changed", vendor, version: stored.version, changed_fields: changed, signature: sig })
          }
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "OCR failed")
    } finally {
      setLoading(false)
    }
  }

  function handleConfirmTemplate() {
    if (!result || !templateStatus) return
    const vendor = templateStatus.vendor
    const sig = templateStatus.state !== "match" ? templateStatus.signature : buildLayoutSignature(result)
    const fieldMap = buildFieldMap(result)
    const existingVersion = templateStatus.state !== "new" ? templateStatus.version : undefined
    saveTemplate(vendor, sig, fieldMap, existingVersion)
    setTemplateSaved(true)
  }

  const activePreview = pages[activePageIdx]?.preview ?? null

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium">Invoice Scans</p>
          {pages.length > 0 && <span className="text-xs text-muted-foreground">{pages.length} page{pages.length !== 1 ? "s" : ""}</span>}
        </div>
        <div className="p-5 space-y-4">
          {pages.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {pages.map((p, i) => (
                <div key={i} onClick={() => setActivePageIdx(i)}
                  className={`relative w-20 h-24 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${i === activePageIdx ? "border-primary shadow-md" : "border-border hover:border-primary/40"}`}>
                  {p.preview ? <img src={p.preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover" /> :
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                      </svg>
                    </div>}
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5 font-medium">Page {i + 1}</div>
                  <button onClick={e => { e.stopPropagation(); removePage(i) }}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center hover:opacity-80">×</button>
                </div>
              ))}
              <div onClick={() => inputRef.current?.click()}
                className="w-20 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
                <span className="text-[10px] text-muted-foreground font-medium">Add page</span>
              </div>
            </div>
          )}
          {pages.length === 0 && (
            <div onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
              className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-medium">Drop invoice photos here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Add multiple pages for long invoices (Coke, Frito, Bimbo)</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*,.pdf" multiple className="hidden"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = "" }} />
          {pages.length > 0 && (
            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Analyzing {pages.length} page{pages.length !== 1 ? "s" : ""}…
                </span>
              ) : `Extract Invoice Data${pages.length > 1 ? ` (${pages.length} pages)` : ""}`}
            </button>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>

      {/* Template status banner */}
      {templateStatus && !templateSaved && (
        <div className={`rounded-xl border px-5 py-4 flex items-start gap-4 ${
          templateStatus.state === "match"   ? "bg-primary/5 border-primary/30" :
          templateStatus.state === "changed" ? "bg-amber-500/10 border-amber-500/30" :
                                               "bg-blue-500/10 border-blue-500/30"
        }`}>
          {/* Icon */}
          <div className={`mt-0.5 shrink-0 ${
            templateStatus.state === "match" ? "text-primary" :
            templateStatus.state === "changed" ? "text-amber-500" : "text-blue-400"
          }`}>
            {templateStatus.state === "match" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" /></svg>
            ) : templateStatus.state === "changed" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" /></svg>
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            {templateStatus.state === "match" && (
              <>
                <p className="text-sm font-semibold text-primary">
                  Template matched — {templateStatus.vendor} (v{templateStatus.version})
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All field positions verified · Last used {templateStatus.last_used} · No action needed
                </p>
              </>
            )}
            {templateStatus.state === "changed" && (
              <>
                <p className="text-sm font-semibold text-amber-500">
                  Layout change detected — {templateStatus.vendor} (v{templateStatus.version})
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {templateStatus.changed_fields.length} field{templateStatus.changed_fields.length !== 1 ? "s" : ""} shifted:{" "}
                  <span className="text-foreground font-medium">
                    {templateStatus.changed_fields.map(f => FIELD_LABEL_MAP[f] ?? f).join(", ")}
                  </span>
                  {" "}· Review the overlay and re-confirm to update the template
                </p>
              </>
            )}
            {templateStatus.state === "new" && (
              <>
                <p className="text-sm font-semibold text-blue-400">
                  New vendor: {templateStatus.vendor}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No template on file. Confirm the field mapping below to save — future scans will auto-verify against this layout.
                </p>
              </>
            )}
          </div>

          {/* Action button */}
          {templateStatus.state !== "match" && (
            <button
              onClick={handleConfirmTemplate}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors ${
                templateStatus.state === "changed"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
                  : "bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30"
              }`}
            >
              {templateStatus.state === "changed" ? "Re-confirm Template" : "Save Template"}
            </button>
          )}
        </div>
      )}

      {/* Template saved confirmation */}
      {templateSaved && templateStatus && (
        <div className="rounded-xl border bg-primary/5 border-primary/30 px-5 py-3 flex items-center gap-3">
          <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" /></svg>
          <p className="text-sm text-primary font-medium">
            {templateStatus.state === "changed"
              ? `${templateStatus.vendor} template updated to v${templateStatus.version + 1}`
              : `${templateStatus.vendor} template saved — future scans will auto-verify`}
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm font-medium">Field Detection Map</p>
              </div>
              {pages.length > 1 && (
                <div className="flex gap-1">
                  {pages.map((_, i) => (
                    <button key={i} onClick={() => setActivePageIdx(i)}
                      className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${i === activePageIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/60"}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { label: "Vendor", color: "bg-blue-500" }, { label: "Invoice #", color: "bg-violet-500" },
                  { label: "Date", color: "bg-amber-500" }, { label: "Ship-To", color: "bg-cyan-500" },
                  { label: "Total", color: "bg-primary" }, { label: "Line Item", color: "bg-emerald-500" },
                  { label: "Allowance", color: "bg-yellow-400" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                    <span className="text-[11px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
              {activePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={activePreview} alt={`Page ${activePageIdx + 1}`} className="w-full block" />
                  <div className="absolute inset-0"><BBoxOverlay result={result} pageIdx={activePageIdx} /></div>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-8 text-center">
                  <p className="text-sm text-muted-foreground">Preview not available for PDF</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border"><p className="text-sm font-medium">Invoice Header</p></div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {[
                  { key: "vendor", label: "Vendor", color: "border-l-blue-500" },
                  { key: "invoice_number", label: "Invoice #", color: "border-l-violet-500" },
                  { key: "invoice_date", label: "Date", color: "border-l-amber-500" },
                  { key: "store_delivered_to", label: "Ship-To", color: "border-l-cyan-500" },
                  { key: "total", label: "Total", color: "border-l-primary" },
                ].map(({ key, label, color }) => {
                  const f = result[key as keyof OCRResult] as FieldVal | undefined
                  const val = f?.value
                  const display = val == null ? "—" : key === "total" ? `$${Number(val).toLocaleString()}` : String(val)
                  return (
                    <div key={key} className={`border-l-2 pl-3 ${color}`}>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
                      <p className="font-semibold text-sm mt-0.5">{display}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {result.line_items && result.line_items.length > 0 && (
              <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-medium">Line Items</p>
                  <span className="text-xs text-muted-foreground">{result.line_items.length} items</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/50">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">UPC</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Pack</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cases</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Unit $</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Promo $</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Ext.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.line_items.map((li, i) => (
                        <tr key={i} className={`border-b border-border/30 ${i % 2 === 1 ? "bg-muted/5" : ""}`}>
                          <td className="px-4 py-2 font-medium max-w-[160px] truncate">{li.description}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{li.upc ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{li.pack_size ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{li.cases ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{li.unit_cost != null ? `$${li.unit_cost.toFixed(2)}` : "—"}</td>
                          <td className={`px-3 py-2 text-right tabular-nums font-medium ${li.promo_dollars ? "text-primary" : "text-muted-foreground"}`}>
                            {li.promo_dollars ? `$${li.promo_dollars.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">{li.extended != null ? `$${li.extended.toFixed(2)}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.allowances && result.allowances.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
                  Allowances Detected · {result.allowances.length} program{result.allowances.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-2">
                  {result.allowances.map((a, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{a.program}</span>
                      <span className="font-semibold text-primary">${a.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.raw_summary && <p className="text-xs text-muted-foreground italic px-1">{result.raw_summary}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Spreadsheet Import ───────────────────────────────────────────────────────

const FIELD_META: { key: string; label: string; color: string; bgColor: string }[] = [
  { key: "description",    label: "Description", color: "border-emerald-500", bgColor: "bg-emerald-500/80" },
  { key: "upc",            label: "UPC",         color: "border-violet-500",  bgColor: "bg-violet-500/80"  },
  { key: "pack_size",      label: "Pack Size",   color: "border-cyan-500",    bgColor: "bg-cyan-500/80"    },
  { key: "cases",          label: "Cases",       color: "border-amber-500",   bgColor: "bg-amber-500/80"   },
  { key: "unit_cost",      label: "Unit Cost",   color: "border-blue-500",    bgColor: "bg-blue-500/80"    },
  { key: "promo_dollars",  label: "Promo $",     color: "border-primary",     bgColor: "bg-primary/80"     },
  { key: "extended",       label: "Extended",    color: "border-orange-500",  bgColor: "bg-orange-500/80"  },
  { key: "vendor",         label: "Vendor",      color: "border-pink-500",    bgColor: "bg-pink-500/80"    },
  { key: "invoice_number", label: "Invoice #",   color: "border-indigo-500",  bgColor: "bg-indigo-500/80"  },
  { key: "invoice_date",   label: "Date",        color: "border-teal-500",    bgColor: "bg-teal-500/80"    },
  { key: "allowance",      label: "Allowance",   color: "border-yellow-400",  bgColor: "bg-yellow-400/80"  },
]

type SheetMapping = Record<string, number | null | string>
type SheetResult = {
  headers: string[]
  sample_rows: string[][]
  total_rows: number
  mapping: SheetMapping
}

function SpreadsheetImport() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SheetResult | null>(null)
  const [mapping, setMapping] = useState<SheetMapping>({})
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f); setResult(null); setError(null); setConfirmed(false)
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("file", f)
      const res = await fetch("/api/sheet-import", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Import failed"); return }
      setResult(data)
      setMapping(data.mapping)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed")
    } finally {
      setLoading(false)
    }
  }

  function colField(colIdx: number): string | null {
    for (const [key, val] of Object.entries(mapping)) {
      if (typeof val === "number" && val === colIdx) return key
    }
    return null
  }

  const detectedCount = Object.values(mapping).filter(v => typeof v === "number").length

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-medium">Import Invoice Spreadsheet</p>
          <p className="text-xs text-muted-foreground mt-0.5">CSV from URM order portal, Sysco, McLane, UNFI, or any distributor export</p>
        </div>
        <div className="p-5">
          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
            >
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-medium">Drop spreadsheet here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .csv · .xlsx (Excel) · .xls · Google Sheets export</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-muted/30 rounded-lg px-4 py-3">
              <svg className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => { setFile(null); setResult(null); setError(null); setConfirmed(false) }}
                className="text-xs text-muted-foreground hover:text-foreground underline shrink-0">Remove</button>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />
          {loading && (
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Analyzing column structure…
            </div>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
      </div>

      {result && !confirmed && (
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                {detectedCount} of {result.headers.length} columns mapped
                {(mapping.confidence as string) === "high" ? " · High confidence" :
                 (mapping.confidence as string) === "low"  ? " · Low confidence — review carefully" : ""}
              </p>
              {mapping.notes && <p className="text-xs text-muted-foreground mt-0.5">{mapping.notes as string}</p>}
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              mapping.confidence === "high" ? "bg-primary/10 text-primary" :
              mapping.confidence === "low"  ? "bg-destructive/10 text-destructive" :
              "bg-muted text-muted-foreground"}`}>
              {result.total_rows} rows
            </span>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-sm font-medium">Column Detection Map</p>
              <p className="text-xs text-muted-foreground mt-0.5">AI detected field assignments — adjust any mapping before confirming</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Legend */}
              <div className="flex flex-wrap gap-2">
                {FIELD_META.map(f => (
                  <div key={f.key} className="flex items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-sm ${f.bgColor}`} />
                    <span className="text-[11px] text-muted-foreground">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* Spreadsheet preview with colored column highlights */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {result.headers.map((h, ci) => {
                        const field = colField(ci)
                        const meta = FIELD_META.find(f => f.key === field)
                        return (
                          <th key={ci} className={`px-3 py-2 text-left font-medium whitespace-nowrap border-r border-border/30 last:border-r-0 ${meta ? `border-b-2 ${meta.color}` : "border-b-2 border-transparent"}`}>
                            <div className="space-y-1">
                              <span className="text-muted-foreground">{h || `Col ${ci}`}</span>
                              {meta && (
                                <div className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.bgColor} text-white`}>
                                  {meta.label}
                                </div>
                              )}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {result.sample_rows.map((row, ri) => (
                      <tr key={ri} className={`border-b border-border/20 ${ri % 2 === 1 ? "bg-muted/5" : ""}`}>
                        {result.headers.map((_, ci) => {
                          const field = colField(ci)
                          const meta = FIELD_META.find(f => f.key === field)
                          return (
                            <td key={ci} className={`px-3 py-2 border-r border-border/20 last:border-r-0 ${meta ? `${meta.color} border-l-2` : ""}`}>
                              <span className="truncate max-w-[120px] block">{row[ci] ?? ""}</span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Adjust mappings */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Adjust Mappings</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {FIELD_META.map(f => {
                    const current = mapping[f.key]
                    return (
                      <div key={f.key} className={`border rounded-lg px-3 py-2 ${typeof current === "number" ? `${f.color} border-2` : "border-border"}`}>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1">{f.label}</p>
                        <select
                          value={typeof current === "number" ? current : ""}
                          onChange={e => {
                            const v = e.target.value === "" ? null : parseInt(e.target.value)
                            setMapping(prev => ({ ...prev, [f.key]: v }))
                          }}
                          className="w-full bg-transparent text-xs focus:outline-none"
                        >
                          <option value="">— not mapped —</option>
                          {result.headers.map((h, ci) => (
                            <option key={ci} value={ci}>{h || `Col ${ci}`}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button onClick={() => setConfirmed(true)}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Confirm Mapping &amp; Import {result.total_rows} Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmed && result && (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-semibold">Import Confirmed</p>
          <p className="text-sm text-muted-foreground">
            {result.total_rows} rows from <span className="font-medium">{file?.name}</span> mapped and staged.
            In production, these normalize into the Invoice Library using the confirmed column mapping — no manual entry required.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => { setFile(null); setResult(null); setConfirmed(false) }}
              className="px-4 py-2 text-sm bg-muted rounded-lg hover:bg-muted/70 transition-colors font-medium">
              Import Another
            </button>
            <button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium">
              View in Library
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "library" | "scan" | "import"

function InvoicesInner() {
  const params = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const [tab, setTab] = useState<Tab>("library")

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoice Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standardized invoice data regardless of vendor — URM, Coke, Frito, Bimbo, Franz, all in one format
          </p>
        </div>
        <div className="flex bg-muted rounded-lg p-1 gap-1">
          {([["library", "Invoice Library"], ["scan", "Scan Invoice"], ["import", "Import Sheet"]] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === id ? "bg-card ring-1 ring-primary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "library" && <InvoiceLibrary storeId={storeId} />}
      {tab === "scan"    && <OCRScanner    storeId={storeId} />}
      {tab === "import"  && <SpreadsheetImport />}
    </div>
  )
}

export default function InvoicesPage() {
  return <Suspense><InvoicesInner /></Suspense>
}
