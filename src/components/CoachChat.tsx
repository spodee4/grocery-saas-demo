"use client"

import { useState, useRef, useEffect } from "react"
import type { ChatMessage } from "@/app/api/coach-chat/route"

interface LocalMessage extends ChatMessage {
  imagePreview?: string  // data URL shown in bubble
}

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
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setPendingImage({ dataUrl })
    }
    reader.readAsDataURL(file)
    // Reset so same file can be re-selected
    e.target.value = ""
  }

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if ((!content && !pendingImage) || loading) return

    const displayContent = content || "What's this?"
    const imageDataUrl = pendingImage?.dataUrl

    const newMessages: LocalMessage[] = [
      ...messages,
      { role: "user", content: displayContent, imagePreview: imageDataUrl },
    ]
    setMessages(newMessages)
    setInput("")
    setPendingImage(null)
    setLoading(true)

    // Send to API — strip local imagePreview, pass imageDataUrl separately
    const apiMessages: ChatMessage[] = newMessages.map(m => ({ role: m.role, content: m.content }))
    const body: Record<string, unknown> = { messages: apiMessages }
    if (imageDataUrl) body.imageDataUrl = imageDataUrl

    try {
      const res = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

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
                  Ask me anything about your training, nutrition, or performance.<br />
                  <span className="text-[10px]">Tap 📷 to send a food photo or product barcode.</span>
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
                  {msg.imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.imagePreview}
                      alt="Attached photo"
                      className="rounded-lg mb-1.5 max-h-40 object-cover w-full"
                    />
                  )}
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

          {/* Image preview bar */}
          {pendingImage && (
            <div className="px-3 pt-2 shrink-0">
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingImage.dataUrl}
                  alt="Pending"
                  className="h-16 w-16 rounded-xl object-cover border border-border"
                />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-background border border-border rounded-full text-[10px] flex items-center justify-center hover:bg-muted"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2 border-t border-border shrink-0">
            <div className="flex gap-2 items-center bg-card rounded-2xl px-3 py-2">
              {/* Camera button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-primary transition-colors shrink-0 text-base leading-none"
                aria-label="Attach photo"
              >
                📷
              </button>
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
                disabled={(!input.trim() && !pendingImage) || loading}
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
