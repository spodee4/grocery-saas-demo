"use client"

import { useState, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const [pin, setPin] = useState(["", "", "", ""])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const router = useRouter()
  const params = useSearchParams()

  const submit = async (fullPin: string) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: fullPin }),
      })
      if (res.ok) {
        router.push(params.get("from") || "/")
      } else {
        setError("Wrong PIN")
        setPin(["", "", "", ""])
        refs[0].current?.focus()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return
    const next = [...pin]
    next[i] = val
    setPin(next)
    if (val && i < 3) refs[i + 1].current?.focus()
    if (next.every(d => d)) submit(next.join(""))
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      refs[i - 1].current?.focus()
    }
  }

  return (
    <>
      <div className="flex gap-3">
        {pin.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            autoFocus={i === 0}
            className="w-14 h-14 text-center text-2xl font-bold rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
          />
        ))}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading && <p className="text-muted-foreground text-sm">Checking…</p>}
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center space-y-1">
        <div className="text-5xl mb-4">◎</div>
        <h1 className="text-2xl font-bold text-foreground">JC Coach</h1>
        <p className="text-muted-foreground text-sm">Enter your PIN to continue</p>
      </div>
      <Suspense fallback={<div className="h-14 w-64 bg-card rounded-xl animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
