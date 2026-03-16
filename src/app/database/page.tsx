"use client"

import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { PRODUCT_CATALOG, URM_CATALOG, UNFI_CATALOG, type ProductCatalogItem, type OrderGuideItem } from "@/lib/demo-data"
import { CopyButton } from "@/components/CopyButton"

type DbTab = "store" | "urm" | "unfi"

// ─── My Store Products ────────────────────────────────────────────────────────

const DEPTS = Array.from(new Set(PRODUCT_CATALOG.map(p => p.dept))).sort()
const VENDORS_STORE = Array.from(new Set(PRODUCT_CATALOG.map(p => p.vendor))).sort()

function StoreDatabase() {
  const [search, setSearch] = useState("")
  const [dept, setDept] = useState("")
  const [vendor, setVendor] = useState("")
  const [promoOnly, setPromoOnly] = useState(false)
  const [selected, setSelected] = useState<ProductCatalogItem | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return PRODUCT_CATALOG.filter(p =>
      (!q || p.description.toLowerCase().includes(q) || p.upc.includes(q)) &&
      (!dept || p.dept === dept) &&
      (!vendor || p.vendor === vendor) &&
      (!promoOnly || p.in_promo)
    )
  }, [search, dept, vendor, promoOnly])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, UPC, brand…"
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
        </div>
        <select value={dept} onChange={e => setDept(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">All Depts</option>
          {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={vendor} onChange={e => setVendor(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">All Vendors</option>
          {VENDORS_STORE.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={promoOnly} onChange={e => setPromoOnly(e.target.checked)} className="accent-primary" />
          On promo
        </label>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} items</span>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {["Product", "UPC", "Dept", "Vendor", "Your Cost", "Retail", "GM%", "Promo"].map(h => (
                <th key={h} className={`px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide ${h === "Product" ? "text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.upc} onClick={() => setSelected(p)}
                className={`border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                <td className="px-4 py-3 font-medium max-w-[200px]">
                  <div className="truncate">{p.description}</div>
                  <div className="text-xs text-muted-foreground">{p.pack_size}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{p.upc}</td>
                <td className="px-4 py-3 text-right text-xs">{p.dept}</td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{p.vendor}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">${p.unit_cost.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-primary font-semibold">${p.unit_retail.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${p.gm_pct >= 40 ? "text-primary" : p.gm_pct >= 28 ? "text-foreground" : "text-destructive"}`}>
                  {p.gm_pct.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right">
                  {p.in_promo
                    ? <span className="text-[10px] font-semibold bg-secondary/20 text-secondary-foreground px-1.5 py-0.5 rounded-full">ON AD</span>
                    : <span className="text-[10px] text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-lg leading-snug">{selected.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.vendor} · {selected.dept}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground ml-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "UPC",         value: selected.upc,                          copy: true },
                { label: "Pack Size",   value: selected.pack_size },
                { label: "Units/Case",  value: String(selected.units_per_case) },
                { label: "Case Cost",   value: `$${selected.case_cost.toFixed(2)}` },
                { label: "Unit Cost",   value: `$${selected.unit_cost.toFixed(2)}` },
                { label: "Retail",      value: `$${selected.unit_retail.toFixed(2)}`, color: "text-primary" },
                { label: "Gross Margin",value: `${selected.gm_pct.toFixed(1)}%`,
                  color: selected.gm_pct >= 40 ? "text-primary" : selected.gm_pct >= 28 ? "text-foreground" : "text-destructive" },
              ].map(f => (
                <div key={f.label} className="bg-muted/20 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className={`font-semibold ${f.color ?? ""}`}>{f.value}</p>
                    {f.copy && <CopyButton value={f.value} />}
                  </div>
                </div>
              ))}
            </div>
            {selected.in_promo && (
              <div className="bg-secondary/10 border border-secondary/30 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-secondary-foreground">⚡ {selected.promo_desc}</p>
                {selected.promo_retail && <p className="text-xs text-muted-foreground">Promo price: <span className="font-semibold text-foreground">${selected.promo_retail.toFixed(2)}</span></p>}
                {selected.promo_start && <p className="text-xs text-muted-foreground">{selected.promo_start} – {selected.promo_end}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Order Guide (URM / UNFI) ─────────────────────────────────────────────────

const URM_DEPTS  = Array.from(new Set(URM_CATALOG.map(p => p.dept))).sort()
const UNFI_DEPTS = Array.from(new Set(UNFI_CATALOG.map(p => p.dept))).sort()

function OrderGuideTable({ catalog, deptList, vendorLabel }: { catalog: OrderGuideItem[]; deptList: string[]; vendorLabel: string }) {
  const [search, setSearch] = useState("")
  const [dept, setDept] = useState("")
  const [promoOnly, setPromoOnly] = useState(false)
  const [selected, setSelected] = useState<OrderGuideItem | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return catalog.filter(p =>
      (!q || p.description.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.upc.includes(q) || p.item_no.toLowerCase().includes(q)) &&
      (!dept || p.dept === dept) &&
      (!promoOnly || !!p.promo)
    )
  }, [catalog, search, dept, promoOnly])

  // Check if item is already in store catalog
  const storeUpcs = new Set(PRODUCT_CATALOG.map(p => p.upc))

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${vendorLabel} catalog by name, brand, UPC…`}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
        </div>
        <select value={dept} onChange={e => setDept(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">All Depts</option>
          {deptList.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={promoOnly} onChange={e => setPromoOnly(e.target.checked)} className="accent-primary" />
          Promo items only
        </label>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {catalog.length} items</span>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {["Item #", "Product", "UPC", "Dept", "Pack", "Case Cost", "Each", "Sugg. Retail", "Promo", "In Store"].map(h => (
                <th key={h} className={`px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide ${h === "Product" || h === "Item #" ? "text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const inStore = storeUpcs.has(p.upc)
              return (
                <tr key={p.item_no} onClick={() => setSelected(p)}
                  className={`border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{p.item_no}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium max-w-[180px] truncate">{p.description}</div>
                    <div className="text-[11px] text-muted-foreground">{p.brand}</div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-muted-foreground">{p.upc}</td>
                  <td className="px-3 py-3 text-right text-xs">{p.dept}</td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground">{p.pack_size}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">${p.case_cost.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">${p.unit_cost.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-primary">${p.suggested_retail.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right">
                    {p.promo
                      ? <span className="text-[10px] font-semibold bg-secondary/20 text-secondary-foreground px-1.5 py-0.5 rounded-full">{p.promo.split(" ").slice(0, 2).join(" ")}</span>
                      : <span className="text-[10px] text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {inStore
                      ? <span className="text-[10px] font-semibold text-primary">✓ Yes</span>
                      : <span className="text-[10px] text-muted-foreground">No</span>}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground text-sm">
                {search ? `No results for "${search}"` : "Enter a search term above"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (() => {
        const storeItem = PRODUCT_CATALOG.find(p => p.upc === selected.upc)
        const estGm = (((selected.suggested_retail - selected.unit_cost) / selected.suggested_retail) * 100).toFixed(1)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-lg leading-snug">{selected.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.brand} · {selected.vendor}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground ml-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Warehouse Item #", value: selected.item_no, mono: true, copy: true },
                  { label: "UPC",              value: selected.upc, mono: true, copy: true },
                  { label: "Pack Size",         value: selected.pack_size },
                  { label: "Units/Case",        value: String(selected.units_per_case) },
                  { label: "Case Cost",         value: `$${selected.case_cost.toFixed(2)}` },
                  { label: "Each Cost",         value: `$${selected.unit_cost.toFixed(2)}` },
                  { label: "Sugg. Retail",      value: `$${selected.suggested_retail.toFixed(2)}`, color: "text-primary" },
                  { label: "Est. GM%",          value: `${estGm}%`, color: "text-primary" },
                  { label: "Department",        value: selected.dept },
                ].map(f => (
                  <div key={f.label} className="bg-muted/20 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className={`font-semibold ${f.color ?? ""} ${f.mono ? "font-mono text-sm" : ""}`}>{f.value}</p>
                      {f.copy && <CopyButton value={f.value} />}
                    </div>
                  </div>
                ))}
              </div>
              {selected.promo && (
                <div className="bg-secondary/10 border border-secondary/30 rounded-lg px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-secondary-foreground uppercase tracking-wide">⚡ Active Promotion</p>
                  <p className="text-sm font-medium">{selected.promo}</p>
                  {storeItem?.in_promo && storeItem.promo_retail && (
                    <div className="flex gap-6 pt-1">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Promo Retail</p>
                        <p className="text-sm font-semibold text-primary">${storeItem.promo_retail.toFixed(2)}</p>
                      </div>
                      {storeItem.promo_start && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dates</p>
                          <p className="text-sm font-semibold">{storeItem.promo_start} – {storeItem.promo_end}</p>
                        </div>
                      )}
                      {storeItem.promo_desc && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Offer</p>
                          <p className="text-sm font-semibold">{storeItem.promo_desc}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {storeUpcs.has(selected.upc) && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-xs text-primary font-medium">
                  ✓ This item is in your store database
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DatabaseInner() {
  useSearchParams() // trigger suspense boundary
  const [tab, setTab] = useState<DbTab>("store")

  const TABS: { id: DbTab; label: string; count: number; sub: string }[] = [
    { id: "store", label: "My Store",     count: PRODUCT_CATALOG.length, sub: "Products in database" },
    { id: "urm",   label: "URM Catalog",  count: URM_CATALOG.length,     sub: "Order guide items" },
    { id: "unfi",  label: "UNFI Catalog", count: UNFI_CATALOG.length,    sub: "Natural/organic items" },
  ]

  return (
    <div className="p-6 max-w-7xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Product Database</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your store catalog, URM order guide, and UNFI catalog — all searchable. Ask AI can query any of these.
          </p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-xs font-medium hover:border-primary/40 transition-colors">
          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Import Catalog CSV
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 max-w-[200px] p-4 rounded-lg border text-left transition-all ${
              tab === t.id
                ? "bg-primary/10 border-primary/50 ring-1 ring-primary/30"
                : "bg-card border-border hover:border-primary/30"
            }`}>
            <p className="text-sm font-semibold">{t.label}</p>
            <p className="text-xl font-bold tabular-nums mt-0.5 text-primary">{t.count}</p>
            <p className="text-[11px] text-muted-foreground">{t.sub}</p>
          </button>
        ))}
      </div>

      {tab === "store" && <StoreDatabase />}
      {tab === "urm"   && <OrderGuideTable catalog={URM_CATALOG}  deptList={URM_DEPTS}  vendorLabel="URM" />}
      {tab === "unfi"  && <OrderGuideTable catalog={UNFI_CATALOG} deptList={UNFI_DEPTS} vendorLabel="UNFI" />}
    </div>
  )
}

export default function DatabasePage() {
  return <Suspense><DatabaseInner /></Suspense>
}
