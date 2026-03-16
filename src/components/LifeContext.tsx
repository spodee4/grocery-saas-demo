"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface LifeContextData {
  notes: string[]
  updated_at: string
}

async function fetchContext(): Promise<LifeContextData> {
  const res = await fetch("/api/life-context")
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function mutateContext(payload: { action: string; note?: string; index?: number }) {
  const res = await fetch("/api/life-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export function LifeContext() {
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState("")
  const qc = useQueryClient()

  const { data } = useQuery<LifeContextData>({
    queryKey: ["life-context"],
    queryFn: fetchContext,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: mutateContext,
    onSuccess: (updated) => {
      qc.setQueryData(["life-context"], updated)
      setInput("")
    },
  })

  const notes = data?.notes ?? []

  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Notes to Coach</p>
          {notes.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
              {notes.length}
            </span>
          )}
        </div>
        <span className={`text-muted-foreground text-sm transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>↓</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Tell your coach about travel, events, illness, or life changes. These notes are injected into every AI response.
          </p>

          {/* Existing notes */}
          {notes.length > 0 && (
            <div className="space-y-2">
              {notes.map((note, i) => (
                <div key={i} className="flex gap-2 items-start bg-muted/30 rounded-xl px-3 py-2">
                  <p className="text-xs text-foreground/80 leading-relaxed flex-1">{note}</p>
                  <button
                    onClick={() => mutate({ action: "remove", index: i })}
                    className="text-muted-foreground hover:text-destructive text-sm shrink-0 mt-0.5"
                    disabled={isPending}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add note */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && input.trim() && mutate({ action: "add", note: input })}
              placeholder="e.g. Traveling Wed–Sat, hotel gym only…"
              className="flex-1 bg-muted/30 rounded-xl px-3 py-2 text-xs outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={() => input.trim() && mutate({ action: "add", note: input })}
              disabled={!input.trim() || isPending}
              className="text-primary text-sm font-bold disabled:opacity-30 px-1"
            >
              +
            </button>
          </div>

          {notes.length > 0 && (
            <button
              onClick={() => mutate({ action: "clear" })}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              disabled={isPending}
            >
              Clear all notes
            </button>
          )}
        </div>
      )}
    </div>
  )
}
