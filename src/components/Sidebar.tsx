"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/database",
    label: "Database",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5" /><path d="M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3" />
      </svg>
    ),
  },
  {
    href: "/finance/pnl",
    label: "P&L",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M3 20h18M8 16V10M12 16V4M16 16v-6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/finance/tender",
    label: "Cash/Tender",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20" strokeLinecap="round" />
        <circle cx="12" cy="15" r="1.5" />
      </svg>
    ),
  },
  {
    href: "/finance/allowances",
    label: "Allowances",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M7 7h.01M17 17h.01M7 17h.01M17 7h.01" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 12a9 9 0 1018 0A9 9 0 003 12z" /><path d="M7.5 7.5l9 9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/labor",
    label: "Labor",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/compare",
    label: "Compare Stores",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/vendors",
    label: "Vendors / A/P",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/reports",
    label: "Reports",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

function SidebarInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const store = searchParams.get("store") ?? "lakes"

  function switchStore(newStore: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("store", newStore)
    router.push(`${pathname}?${params.toString()}`)
  }

  const isChat = pathname === "/chat"

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center shrink-0">
            <img src="/logo.svg" alt="Store Intelligence" className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground leading-none">Store Intelligence</p>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">Analytics Suite</p>
          </div>
        </div>

        {/* Store switcher */}
        <select
          value={store}
          onChange={e => switchStore(e.target.value)}
          className="w-full bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
        >
          <option value="lakes">Lakes — Medical Lake, WA</option>
          <option value="potlatch">Potlatch — Potlatch, ID</option>
          <option value="quincy">Quincy — Quincy, WA</option>
          <option value="oroville">Oroville — Oroville, WA</option>
          <option value="soaplake">Soap Lake — Soap Lake, WA</option>
          <option disabled value="">────────────</option>
          <option value="company">All Stores (Company)</option>
        </select>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={`${item.href}?store=${store}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium ring-1 ring-sidebar-primary/60"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Ask AI — persistent at bottom */}
      <div className="px-3 pb-2">
        <Link
          href={`/chat?store=${store}`}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all w-full ${
            isChat
              ? "bg-primary text-primary-foreground font-medium shadow-md ring-2 ring-primary/40"
              : "bg-sidebar-accent/80 text-sidebar-accent-foreground hover:bg-sidebar-accent border border-sidebar-border hover:border-sidebar-primary/40"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="flex-1">Ask AI</span>
          {!isChat && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">Live</span>
          )}
        </Link>
      </div>

      {/* Footer — BRdata connection indicator */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[11px] text-sidebar-foreground/60">Connected: BRdata POS</span>
        </div>
        <p className="text-[10px] text-sidebar-foreground/30 mt-1">Last sync: today, 3:14 AM</p>
      </div>
    </aside>
  )
}

export function Sidebar() {
  return (
    <Suspense fallback={<aside className="w-[220px] shrink-0 bg-sidebar border-r border-sidebar-border" />}>
      <SidebarInner />
    </Suspense>
  )
}
