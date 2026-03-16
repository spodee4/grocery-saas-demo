"use client"

import { useState, useRef, useEffect } from "react"

interface TooltipProps {
  definition: string
  children: React.ReactNode
  className?: string
}

export function Tooltip({ definition, children, className = "" }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // Close on outside click (mobile tap elsewhere)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("touchstart", handler)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("touchstart", handler)
    }
  }, [open])

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center gap-0.5 cursor-help ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(v => !v)}
    >
      {children}
      <span className="text-muted-foreground/50 text-[9px] leading-none">ⓘ</span>
      {open && (
        <span
          className="absolute bottom-full left-0 mb-2 w-56 bg-card border border-border rounded-xl p-3 text-xs text-foreground leading-relaxed shadow-xl z-50 pointer-events-none"
          style={{ whiteSpace: "normal" }}
        >
          {definition}
        </span>
      )}
    </span>
  )
}

// Pre-defined coaching term tooltips
export const DEFS = {
  CTL: "Chronic Training Load (CTL) — 42-day rolling fitness score. Higher = more aerobic fitness built up. Target 75+ by race day.",
  ATL: "Acute Training Load (ATL) — 7-day rolling fatigue score. Spikes after hard training weeks.",
  TSB: "Training Stress Balance (TSB) — your 'form'. CTL minus ATL. Positive = fresh & race-ready. Negative = tired & building. Optimal race day: +15 to +25.",
  ACWR: "Acute:Chronic Workload Ratio (ACWR) — this week's load vs your 4-week average. Safe zone: 0.8–1.3. Above 1.3 = injury risk.",
  HRV: "Heart Rate Variability (HRV) — milliseconds between heartbeats. Higher = more recovered nervous system. Low HRV = take it easy.",
  TSS: "Training Stress Score (TSS) — points for each workout based on intensity and duration. 100 TSS = 1 hour at threshold.",
  VO2: "VO2 Max — your aerobic engine size (ml O₂/kg/min). Higher = faster oxygen delivery to muscles. Target: 55+ by July.",
  RHR: "Resting Heart Rate (RHR) — lower baseline = better cardiovascular fitness. Elevated = fatigue or illness.",
  BB: "Body Battery — Garmin's composite recovery score (0–100) based on HRV, sleep, and stress. Wake score shows how recovered you started the day.",
}
