"use client"

import { useState, useRef, useEffect } from "react"
import type { ChatMessage } from "@/app/api/coach-chat/route"

const SUGGESTIONS = [
  "What should I focus on this week?",
  "How's my fitness trending?",
  "I want to improve my VO2 max",
  "Tell me about my recovery",
  "Why is my TSB negative?",
  "What should I eat before tomorrow's long run?",
]

export function CoachChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const newMessages: ChatMessage[] = [...messages, { role: "user", content }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Coach is unavailable right now. Try again." }])
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Try again." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat panel */}
      <div className={`fixed bottom-16 left-0 right-0 max-w-md mx-auto z-50 transition-all duration-300 ease-out ${
        open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}>
        <div className="bg-background border-t border-border rounded-t-3xl shadow-2xl flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span className="font-semibold text-sm">Coach JC</span>
              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded-full">AI</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Ask me anything about your training, nutrition, or performance.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-card border border-border hover:border-primary/40 hover:text-primary transition-colors text-muted-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card text-foreground rounded-bl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-card rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-border shrink-0">
            <div className="flex gap-2 items-center bg-card rounded-2xl px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask your coach…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="text-primary disabled:opacity-30 transition-opacity font-bold text-base leading-none"
              >
                ↑
              </button>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-1.5 ml-1"
              >
                Clear chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-20 right-4 z-50 w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? "bg-muted text-muted-foreground scale-95"
            : "bg-primary text-primary-foreground hover:scale-105"
        }`}
        aria-label="Open coach chat"
      >
        {open ? "×" : "◎"}
      </button>
    </>
  )
}
