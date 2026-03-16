"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { STORES, type ProductCatalogItem } from "@/lib/demo-data"

type TextMessage   = { type: "text"; role: "user" | "assistant"; content: string }
type ScanMessage   = { type: "scan"; role: "user"; preview: string; filename: string }
type ProductCard   = { type: "product"; role: "assistant"; result: ProductScanResult }
type Message = TextMessage | ScanMessage | ProductCard

type ProductScanResult =
  | { status: "found"; identified: Identified; product: ProductCatalogItem }
  | { status: "not_found"; identified: Identified; links: SearchLink[] }
  | { status: "scanning" }
  | { status: "error"; message: string }

type Identified = { upc: string | null; name: string | null; brand: string | null }
type SearchLink = { label: string; url: string; icon: string }

const SUGGESTIONS = [
  "What's my best-margin department this week?",
  "How much did I leave on the table in vendor allowances?",
  "Which department had the biggest sales drop vs last week?",
  "What's my bank deposit look like today?",
  "Compare Lakes and Potlatch performance",
  "Which invoices are still pending?",
]

// ─── Product Card ─────────────────────────────────────────────────────────────

function FoundCard({ result }: { result: Extract<ProductScanResult, { status: "found" }> }) {
  const p = result.product
  const id = result.identified
  return (
    <div className="bg-card border border-primary/30 rounded-xl overflow-hidden shadow-sm min-w-[280px] max-w-[340px]">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-primary/5">
        <span className="w-2 h-2 rounded-full bg-primary" />
        <p className="text-sm font-semibold truncate">{p.description}</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{id.upc ?? p.upc}</span>
          <span>·</span><span>{p.vendor}</span><span>·</span><span>{p.dept}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Your Cost", value: `$${p.unit_cost.toFixed(2)}`, sub: "per unit" },
            { label: "Retail",    value: `$${p.unit_retail.toFixed(2)}`, sub: "selling price", color: "text-primary" },
            { label: "Margin",    value: `${p.gm_pct.toFixed(1)}%`, sub: "gross", color: p.gm_pct >= 35 ? "text-primary" : p.gm_pct >= 25 ? "text-foreground" : "text-destructive" },
          ].map(f => (
            <div key={f.label} className="bg-muted/30 rounded-lg px-2 py-2 text-center">
              <p className="text-[10px] text-muted-foreground">{f.label}</p>
              <p className={`text-base font-semibold tabular-nums mt-0.5 ${f.color ?? ""}`}>{f.value}</p>
              <p className="text-[10px] text-muted-foreground">{f.sub}</p>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          <span>Pack: {p.pack_size}</span>
          <span className="mx-2">·</span>
          <span>Case cost: ${p.case_cost.toFixed(2)}</span>
        </div>
        {p.in_promo ? (
          <div className="bg-secondary/10 border border-secondary/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-base">⚡</span>
            <div>
              <p className="text-xs font-semibold text-secondary-foreground">{p.promo_desc}</p>
              {p.promo_retail && (
                <p className="text-xs text-muted-foreground">Promo price: <span className="font-semibold text-foreground">${p.promo_retail.toFixed(2)}</span></p>
              )}
              {p.promo_end && <p className="text-[10px] text-muted-foreground">Through {p.promo_end}</p>}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
            Not currently on promotion
          </div>
        )}
      </div>
    </div>
  )
}

function NotFoundCard({ result }: { result: Extract<ProductScanResult, { status: "not_found" }> }) {
  const id = result.identified
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm min-w-[280px] max-w-[340px]">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/20">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-semibold text-muted-foreground">Not in your database</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        {(id.name || id.upc) && (
          <div>
            {id.name && <p className="text-sm font-medium">{id.name}</p>}
            {id.upc && <p className="text-xs font-mono text-muted-foreground mt-0.5">UPC: {id.upc}</p>}
          </div>
        )}
        <p className="text-xs text-muted-foreground">This item isn't in your store catalog yet. Find it in your order guides:</p>
        <div className="space-y-1.5">
          {result.links.map(link => (
            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/60 border border-border rounded-lg text-xs font-medium transition-colors">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function ScanningCard() {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-4 min-w-[200px]">
      <div className="flex items-center gap-3">
        <svg className="w-4 h-4 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-sm text-muted-foreground">Scanning product…</p>
      </div>
    </div>
  )
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

function ChatInner() {
  const params = useSearchParams()
  const storeId = params.get("store") ?? "lakes"
  const store = STORES[storeId] ?? STORES.lakes

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  // Text chat
  async function send(text: string) {
    if (!text.trim() || loading) return
    const userMsg: TextMessage = { type: "text", role: "user", content: text }
    const apiMessages = [...messages
      .filter((m): m is TextMessage => m.type === "text")
      .map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ]
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, store: storeId }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { type: "text", role: "assistant", content: data.content ?? "Sorry, couldn't process that." }])
    } catch {
      setMessages(prev => [...prev, { type: "text", role: "assistant", content: "Connection error. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  // Product scan
  async function handleScan(file: File) {
    if (!file.type.startsWith("image/")) return
    const preview = URL.createObjectURL(file)
    const scanMsg: ScanMessage = { type: "scan", role: "user", preview, filename: file.name }
    const cardPlaceholder: ProductCard = { type: "product", role: "assistant", result: { status: "scanning" } }
    setMessages(prev => [...prev, scanMsg, cardPlaceholder])
    setScanning(true)

    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/product-scan", { method: "POST", body: fd })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMessages(prev => {
        const copy = [...prev]
        const idx = copy.findLastIndex(m => m.type === "product" && m.result.status === "scanning")
        if (idx !== -1) copy[idx] = { type: "product", role: "assistant", result: data }
        return copy
      })
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        const idx = copy.findLastIndex(m => m.type === "product" && m.result.status === "scanning")
        if (idx !== -1) copy[idx] = { type: "product", role: "assistant", result: { status: "error", message: "Scan failed. Try again." } }
        return copy
      })
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-3 max-w-3xl">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm">Ask your books</p>
            <p className="text-xs text-muted-foreground">{store.name} · Live BRdata + invoice + product data · Scan any product for instant lookup</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-w-3xl w-full">
        {messages.length === 0 && (
          <div className="space-y-5 pt-2">
            <div>
              <p className="text-sm font-medium mb-1">Ask anything about your finances</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="px-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-xs font-semibold">Product Scan</p>
              </div>
              <p className="text-xs text-muted-foreground">Tap the camera button to photograph any product — instantly see your cost, retail price, margin, and whether it&apos;s on promotion. If it&apos;s not in your database, we&apos;ll help you find it in the URM or UNFI order guide.</p>
            </div>
          </div>
        )}

        <div className="space-y-4 mt-4">
          {messages.map((m, i) => {
            if (m.type === "scan") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-2 max-w-[200px]">
                    <img src={m.preview} alt="scanned product" className="rounded-lg max-h-40 object-contain mx-auto" />
                    <p className="text-[10px] text-muted-foreground text-center mt-1 truncate">{m.filename}</p>
                  </div>
                </div>
              )
            }
            if (m.type === "product") {
              const r = m.result
              return (
                <div key={i} className="flex justify-start">
                  {r.status === "scanning" && <ScanningCard />}
                  {r.status === "found" && <FoundCard result={r} />}
                  {r.status === "not_found" && <NotFoundCard result={r} />}
                  {r.status === "error" && (
                    <div className="bg-card border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive">
                      {r.message}
                    </div>
                  )}
                </div>
              )
            }
            // text message
            return (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-card/30 max-w-3xl w-full shrink-0">
        <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2">
          {/* Camera / scan button */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            title="Scan a product"
            className="flex-none w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center hover:border-primary/50 hover:bg-muted/30 disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleScan(f); e.target.value = "" }} />

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about sales, margins, allowances… or scan a product"
            className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Send
          </button>
        </form>
        {messages.length > 0 && (
          <div className="flex gap-3 mt-2 flex-wrap">
            {SUGGESTIONS.slice(0, 3).map(s => (
              <button key={s} onClick={() => send(s)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {s.split(" ").slice(0, 5).join(" ")}…
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return <Suspense><ChatInner /></Suspense>
}
