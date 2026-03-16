"use client"

import { useState, useRef, useEffect } from "react"

interface TooltipProps {
  definition: string
  insight?: string
  children: React.ReactNode
  className?: string
}

export function Tooltip({ definition, insight, children, className = "" }: TooltipProps) {
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
          className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-xl p-3 text-xs text-foreground leading-relaxed shadow-xl z-50 pointer-events-none space-y-2"
          style={{ whiteSpace: "normal" }}
        >
          <span className="block text-muted-foreground">{definition}</span>
          {insight && (
            <span className="block border-t border-border pt-2 text-foreground font-medium">{insight}</span>
          )}
        </span>
      )}
    </span>
  )
}

// Full-card hover metric — wraps a whole stat card in an interactive tooltip
interface MetricCardProps {
  label: string
  value: string
  sub?: string
  valueClass?: string
  definition: string
  insight: string
  highlight?: boolean
}

export function MetricCard({ label, value, sub, valueClass = "", definition, insight, highlight }: MetricCardProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    <div
      ref={ref}
      className={`bg-card rounded-2xl p-4 space-y-1 cursor-help relative transition-all select-none ${
        open ? "ring-1 ring-primary/50" : ""
      } ${highlight ? "ring-1 ring-destructive/40" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(v => !v)}
    >
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {label}
        <span className="text-muted-foreground/40 text-[9px]">ⓘ</span>
      </p>
      <p className={`text-2xl font-bold font-mono ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl p-3 shadow-2xl space-y-2 pointer-events-none"
          style={{ minWidth: "16rem" }}
        >
          <p className="text-xs text-muted-foreground leading-relaxed">{definition}</p>
          <div className="border-t border-border pt-2">
            <p className="text-xs text-foreground leading-relaxed font-medium">{insight}</p>
          </div>
        </div>
      )}
    </div>
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

// Insight generators — dynamic based on current value
export function ctlInsight(v: number | null): string {
  if (v == null) return "No CTL data yet — keep logging workouts."
  if (v < 10) return "CTL is very low. Build consistency with 4+ workouts/week. Every session adds to this score."
  if (v < 30) return "Early fitness base. At this pace you need aggressive but progressive volume to hit 75+ CTL by July."
  if (v < 50) return "Solid base building. Keep progressive overload — add ~5 CTL points per month to hit race targets."
  if (v < 70) return "Strong aerobic fitness. Protect this with proper recovery between hard sessions."
  return "Elite-level fitness base. Focus on maintaining and sharpening into race form."
}

export function atlInsight(v: number | null): string {
  if (v == null) return "No recent workout data."
  if (v < 5) return "Very low recent training load. Time to add stimulus — your body is rested and ready."
  if (v < 20) return "Light recent load — you're fresh. Good time for a quality workout or build week."
  if (v < 50) return "Moderate recent fatigue — normal training range. Fuel well and sleep 7-9h."
  if (v < 80) return "Elevated fatigue — hard week behind you. Balance with recovery days."
  return "Very high recent load. Mandatory rest/easy day before next hard session."
}

export function tsbInsight(v: number | null): string {
  if (v == null) return "No data."
  if (v > 25) return "Very fresh — peak race form. Don't let it get too high or you'll lose fitness edge."
  if (v > 5) return "Fresh and ready to perform. Ideal day for a quality workout or race simulation."
  if (v > -10) return "Slight fatigue — normal build state. Body is adapting. Keep nutrition dialed."
  if (v > -25) return "Notably fatigued. Prioritize sleep, protein intake, and keep today easy."
  return "Overreached — risk of overtraining. Take a full recovery day. No workouts until TSB climbs."
}

export function acwrInsight(v: number | null): string {
  if (v == null) return "No data."
  if (v > 2.0) return "⚠ Extreme spike — this likely reflects a data issue or sudden load jump. Back off intensity immediately."
  if (v > 1.5) return "⚠ Very high injury risk. Recent load far exceeds your chronic baseline. Mandatory easy or rest day."
  if (v > 1.3) return "⚠ Injury risk zone. Your recent load exceeds what your body is adapted to. Take an easy day."
  if (v > 1.1) return "Caution — load is above baseline. Monitor for early signs of overuse. Stick to planned easy sessions."
  if (v >= 0.8) return "Safe zone. Load is well-matched to your fitness. Keep this range for injury-free training."
  return "Below baseline — you're under-training relative to your fitness. Gradually increase load."
}

export function vo2Insight(v: number | null): string {
  if (v == null) return "No VO2 Max data from Garmin yet."
  if (v < 40) return "Below average for your age. Zone 2 running and interval work will improve this over months."
  if (v < 50) return "Average to good aerobic capacity. Consistent Z2 volume + 1-2 intervals/week will push this up."
  if (v < 55) return "Good aerobic engine. You're approaching the 55 race target — stay consistent."
  return "Strong VO2. Above race target. Protect this with consistent training and proper recovery."
}
