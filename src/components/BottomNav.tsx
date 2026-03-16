"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/", label: "Today", icon: "◎" },
  { href: "/performance", label: "Perf", icon: "↑" },
  { href: "/recovery", label: "Recovery", icon: "♡" },
  { href: "/fuel", label: "Fuel", icon: "⊕" },
  { href: "/plan", label: "Plan", icon: "◫" },
  { href: "/workouts", label: "History", icon: "≡" },
]

export function BottomNav() {
  const path = usePathname()
  if (path === "/login") return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t border-border bg-background/95 backdrop-blur-sm z-50">
      <div className="flex items-center justify-around h-16 px-1">
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-[8px] font-medium tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
