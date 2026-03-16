"use client"

import { useState, useEffect, useRef } from "react"
import { Suspense } from "react"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type IntegrationKey = "brdata" | "quickbooks" | "connecteam" | "urm" | "unfi" | "smtp"

export type JCSettings = {
  accountant: { name: string; email: string; preferredReports: string[]; format: "pdf" | "excel" }
  store: { displayName: string; timezone: string; fiscalWeekStart: "sun" | "mon"; logo: string }
  notifications: { sendOnExport: boolean; weeklyDigest: boolean; alertThreshold: number }
  integrations: Record<IntegrationKey, { connected: boolean; fields: Record<string, string> }>
}

const DEFAULTS: JCSettings = {
  accountant: { name: "", email: "", preferredReports: ["pnl", "deposit"], format: "pdf" },
  store: { displayName: "", timezone: "America/Los_Angeles", fiscalWeekStart: "sun", logo: "" },
  notifications: { sendOnExport: false, weeklyDigest: false, alertThreshold: 500 },
  integrations: {
    brdata:      { connected: true,  fields: { host: "sftp.brdata.com", username: "akins381", lastSync: "Today, 3:14 AM" } },
    quickbooks:  { connected: false, fields: { realmId: "", accessToken: "" } },
    connecteam:  { connected: false, fields: { apiKey: "" } },
    urm:         { connected: false, fields: { username: "", password: "" } },
    unfi:        { connected: false, fields: { username: "", password: "" } },
    smtp:        { connected: false, fields: { host: "", port: "587", username: "", password: "" } },
  },
}

export function loadSettings(): JCSettings {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = localStorage.getItem("jc-settings")
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULTS,
      ...parsed,
      store: { ...DEFAULTS.store, ...parsed.store },
      accountant: { ...DEFAULTS.accountant, ...parsed.accountant },
      notifications: { ...DEFAULTS.notifications, ...parsed.notifications },
      integrations: { ...DEFAULTS.integrations, ...parsed.integrations },
    }
  } catch { return DEFAULTS }
}

// ─── Integration definitions ───────────────────────────────────────────────────

const INTEGRATIONS: {
  key: IntegrationKey
  name: string
  desc: string
  status: "live" | "coming_soon"
  icon: string
  fields: { key: string; label: string; type?: string; placeholder?: string; readonly?: boolean }[]
}[] = [
  {
    key: "brdata",
    name: "BRdata POS",
    desc: "Sales data, daily reports, and shrink analysis via secure SFTP pull",
    status: "live",
    icon: "🏪",
    fields: [
      { key: "host",     label: "SFTP Host",    readonly: true },
      { key: "username", label: "Username",      readonly: true },
      { key: "lastSync", label: "Last Sync",     readonly: true },
    ],
  },
  {
    key: "quickbooks",
    name: "QuickBooks Online",
    desc: "Sync your P&L, chart of accounts, and vendor payments automatically",
    status: "coming_soon",
    icon: "📊",
    fields: [
      { key: "realmId",     label: "Company ID",   placeholder: "Connect via OAuth →" },
      { key: "accessToken", label: "Access Token",  type: "password", placeholder: "Auto-filled after OAuth" },
    ],
  },
  {
    key: "connecteam",
    name: "Connecteam",
    desc: "Pull scheduled hours and actual clock-in data for labor cost reporting",
    status: "live",
    icon: "👥",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "ct_live_xxxxxxxxxxxxxxxx" },
    ],
  },
  {
    key: "urm",
    name: "URM Stores",
    desc: "Auto-sync order guide, pricing, and weekly ad specials from URM portal",
    status: "live",
    icon: "📦",
    fields: [
      { key: "username", label: "URM Portal Username", placeholder: "your@email.com" },
      { key: "password", label: "Password",             type: "password", placeholder: "••••••••" },
    ],
  },
  {
    key: "unfi",
    name: "UNFI",
    desc: "Sync UNFI order guide, allowances, and invoice data",
    status: "live",
    icon: "🌿",
    fields: [
      { key: "username", label: "UNFI Portal Username", placeholder: "your@email.com" },
      { key: "password", label: "Password",             type: "password", placeholder: "••••••••" },
    ],
  },
  {
    key: "smtp",
    name: "Email (SMTP)",
    desc: "Send reports, alerts, and weekly digests from your own email domain",
    status: "live",
    icon: "✉️",
    fields: [
      { key: "host",     label: "SMTP Host",     placeholder: "smtp.gmail.com" },
      { key: "port",     label: "Port",          placeholder: "587" },
      { key: "username", label: "Email Address", placeholder: "reports@yourstore.com" },
      { key: "password", label: "App Password",  type: "password", placeholder: "••••••••" },
    ],
  },
]

const REPORT_OPTIONS = [
  { id: "pnl",     label: "Profit & Loss",     desc: "Income statement — COGS, OpEx, NOI" },
  { id: "sales",   label: "Store Sales Report", desc: "Tender, hourly, voids, customer count" },
  { id: "deposit", label: "Bank Deposit",       desc: "Cash by denomination, checks, safe" },
  { id: "aging",   label: "A/P Aging",          desc: "Vendor invoices by days past due" },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted/60"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  )
}

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
  return (
    <div className="px-5 py-3 border-b border-border flex items-center gap-2">
      <span className="text-muted-foreground w-4 h-4 flex items-center justify-center">{icon}</span>
      <p className="text-sm font-semibold">{title}</p>
      {badge && <span className="ml-auto text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{badge}</span>}
    </div>
  )
}

// ─── Main settings component ───────────────────────────────────────────────────

function SettingsInner() {
  const [s, setS] = useState<JCSettings>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const [expandedIntegration, setExpandedIntegration] = useState<IntegrationKey | null>(null)
  const [connectingKey, setConnectingKey] = useState<IntegrationKey | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setS(loadSettings()) }, [])

  function save() {
    localStorage.setItem("jc-settings", JSON.stringify(s))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function setAccountant<K extends keyof JCSettings["accountant"]>(k: K, v: JCSettings["accountant"][K]) {
    setS(prev => ({ ...prev, accountant: { ...prev.accountant, [k]: v } }))
  }
  function setStore<K extends keyof JCSettings["store"]>(k: K, v: JCSettings["store"][K]) {
    setS(prev => ({ ...prev, store: { ...prev.store, [k]: v } }))
  }
  function setNotif<K extends keyof JCSettings["notifications"]>(k: K, v: JCSettings["notifications"][K]) {
    setS(prev => ({ ...prev, notifications: { ...prev.notifications, [k]: v } }))
  }
  function setIntegrationField(key: IntegrationKey, field: string, value: string) {
    setS(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [key]: { ...prev.integrations[key], fields: { ...prev.integrations[key].fields, [field]: value } },
      },
    }))
  }
  function toggleReport(id: string) {
    setS(prev => {
      const list = prev.accountant.preferredReports
      return { ...prev, accountant: { ...prev.accountant, preferredReports: list.includes(id) ? list.filter(r => r !== id) : [...list, id] } }
    })
  }
  function handleLogoFile(f: File) {
    const reader = new FileReader()
    reader.onload = e => setStore("logo", e.target?.result as string ?? "")
    reader.readAsDataURL(f)
  }
  function handleConnect(key: IntegrationKey) {
    setConnectingKey(key)
    // Simulate OAuth / connection flow
    setTimeout(() => {
      setS(prev => ({ ...prev, integrations: { ...prev.integrations, [key]: { ...prev.integrations[key], connected: true } } }))
      setConnectingKey(null)
    }, 1800)
  }
  function handleDisconnect(key: IntegrationKey) {
    setS(prev => ({ ...prev, integrations: { ...prev.integrations, [key]: { ...prev.integrations[key], connected: false } } }))
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Accountant contacts, integrations, and display options</p>
        </div>
        <button onClick={save}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${saved ? "bg-primary/20 text-primary border border-primary/40" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
          {saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>

      {/* ─── Store Branding ─────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <SectionHeader icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" /></svg>} title="Store Branding" />
        <div className="p-5 space-y-5">
          {/* Logo upload */}
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">Store Logo</label>
            <div className="flex items-center gap-4">
              {/* Logo preview */}
              <div
                onClick={() => logoRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 flex items-center justify-center cursor-pointer transition-colors overflow-hidden shrink-0"
              >
                {s.store.logo ? (
                  <img src={s.store.logo} alt="Store logo" className="w-full h-full object-contain" />
                ) : (
                  <svg className="w-6 h-6 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); e.target.value = "" }} />
              <div className="space-y-2">
                <button onClick={() => logoRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  Upload logo
                </button>
                {s.store.logo && (
                  <button onClick={() => setStore("logo", "")}
                    className="block text-xs text-muted-foreground/60 hover:text-destructive transition-colors">
                    Remove
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground/60">PNG, JPG, SVG · Appears on exported reports</p>
              </div>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1.5">Business Name Override</label>
            <input value={s.store.displayName} onChange={e => setStore("displayName", e.target.value)}
              placeholder="Leave blank to use store name from POS"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1.5">Timezone</label>
              <select value={s.store.timezone} onChange={e => setStore("timezone", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/New_York">Eastern (ET)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1.5">Fiscal Week Start</label>
              <select value={s.store.fiscalWeekStart} onChange={e => setStore("fiscalWeekStart", e.target.value as "sun" | "mon")}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option value="sun">Sunday</option>
                <option value="mon">Monday</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Integrations ───────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <SectionHeader
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          title="Integrations & Data Sources"
          badge="Credentials stored encrypted"
        />
        <div className="divide-y divide-border/40">
          {INTEGRATIONS.map(intg => {
            const state = s.integrations[intg.key]
            const isExpanded = expandedIntegration === intg.key
            const isConnecting = connectingKey === intg.key

            return (
              <div key={intg.key}>
                {/* Row */}
                <div className="px-5 py-4 flex items-center gap-4">
                  <span className="text-2xl w-9 text-center shrink-0">{intg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{intg.name}</p>
                      {intg.status === "coming_soon" && (
                        <span className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">Coming soon</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{intg.desc}</p>
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {state.connected ? (
                      <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                        </span>
                        Connected
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">Not connected</span>
                    )}
                    {intg.status !== "coming_soon" && (
                      <button
                        onClick={() => setExpandedIntegration(isExpanded ? null : intg.key)}
                        className="text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                      >
                        {isExpanded ? "Close" : "Configure"}
                      </button>
                    )}
                    {intg.status === "coming_soon" && (
                      <button className="text-xs px-2.5 py-1 rounded-md border border-border/50 text-muted-foreground/40 cursor-not-allowed">
                        Coming soon
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded config */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 bg-background/40 border-t border-border/30 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {intg.fields.map(f => (
                        <div key={f.key}>
                          <label className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium block mb-1">{f.label}</label>
                          {f.readonly ? (
                            <p className="font-mono text-xs bg-muted/30 rounded-md px-3 py-2 text-muted-foreground">{state.fields[f.key] || "—"}</p>
                          ) : (
                            <input
                              type={f.type ?? "text"}
                              value={state.fields[f.key] ?? ""}
                              onChange={e => setIntegrationField(intg.key, f.key, e.target.value)}
                              placeholder={f.placeholder}
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      {!state.connected ? (
                        <button
                          onClick={() => handleConnect(intg.key)}
                          disabled={isConnecting}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {isConnecting ? "Connecting…" : intg.key === "quickbooks" ? "Connect with QuickBooks →" : "Save & Connect"}
                        </button>
                      ) : (
                        <>
                          <span className="text-xs text-primary font-medium">✓ Connected</span>
                          <button
                            onClick={() => handleDisconnect(intg.key)}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                          >
                            Disconnect
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── Accountant Contact ─────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <SectionHeader
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          title="Accountant Contact"
          badge='Used for "Send to Accountant"'
        />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1.5">Name</label>
              <input value={s.accountant.name} onChange={e => setAccountant("name", e.target.value)}
                placeholder="e.g. Sarah Johnson, CPA"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1.5">Email</label>
              <input type="email" value={s.accountant.email} onChange={e => setAccountant("email", e.target.value)}
                placeholder="accountant@example.com"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">Reports they receive</label>
            <div className="space-y-2">
              {REPORT_OPTIONS.map(r => (
                <label key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-border cursor-pointer transition-colors bg-background/40">
                  <input type="checkbox" checked={s.accountant.preferredReports.includes(r.id)} onChange={() => toggleReport(r.id)} className="mt-0.5 accent-[var(--primary)]" />
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1.5">Export Format</label>
            <div className="flex gap-3">
              {(["pdf", "excel"] as const).map(fmt => (
                <button key={fmt} onClick={() => setAccountant("format", fmt)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${s.accountant.format === fmt ? "bg-primary/10 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-border/80"}`}>
                  {fmt === "pdf" ? "PDF" : "Excel (.xlsx)"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Notifications ──────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <SectionHeader
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          title="Notifications"
        />
        <div className="p-5 space-y-4">
          {[
            { key: "sendOnExport" as const, label: "CC accountant on every export", desc: "Automatically email accountant when you click Export PDF" },
            { key: "weeklyDigest" as const, label: "Weekly digest to accountant", desc: "Send P&L + Bank Deposit every Monday morning" },
          ].map(item => (
            <div key={item.key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <Toggle checked={s.notifications[item.key]} onChange={v => setNotif(item.key, v)} />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-1.5">Alert threshold — suspicious transactions ($)</label>
            <input type="number" value={s.notifications.alertThreshold}
              onChange={e => setNotif("alertThreshold", Number(e.target.value))}
              className="w-40 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
        </div>
      </section>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  )
}
