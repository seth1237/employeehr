"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, ChevronDown, Copy, Loader2, MessageCircle, RefreshCw, Send, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { aiAssistantApi, type AiChatTurn } from "@/lib/api"

// ─── Suggestion chips shown before first message ─────────────────────────────

const SUGGESTIONS = [
  "How many products did we sell last month?",
  "What is our total sales revenue this month?",
  "Which products are low on stock?",
  "Show me our top customers this month",
  "List client groups and member counts",
  "How many installed machines are active?",
  "What is our dispatch status this month?",
  "What is our payroll cost this month?",
]

const SALES_SUGGESTIONS = [
  "What's my leave balance?",
  "What's on my planner this week?",
  "How many visits have I logged this month?",
  "Which of my quotes are waiting on admin?",
  "Which products are low on stock?",
]

type AiAssistantChatProps = {
  variant?: "default" | "sales"
}

// ─── Minimal inline markdown renderer ────────────────────────────────────────
// Handles: **bold**, bullet lists (- /•), numbered lists, and line breaks.

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let keyIdx = 0

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()

    // Skip empty lines (add spacing handled by parent gap)
    if (!trimmed) {
      elements.push(<div key={keyIdx++} className="h-1" />)
      continue
    }

    // Numbered list item: "1. text"
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/)
    if (numberedMatch) {
      elements.push(
        <div key={keyIdx++} className="flex gap-2 text-sm">
          <span className="shrink-0 font-semibold text-primary/80">{numberedMatch[1]}.</span>
          <span>{inlineFormat(numberedMatch[2])}</span>
        </div>,
      )
      continue
    }

    // Bullet list: "- " or "• "
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const content = trimmed.replace(/^[-•]\s+/, "")
      elements.push(
        <div key={keyIdx++} className="flex gap-2 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
          <span>{inlineFormat(content)}</span>
        </div>,
      )
      continue
    }

    // Heading: "## text" or "### text"
    if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      const content = trimmed.replace(/^#{2,3}\s+/, "")
      elements.push(
        <p key={keyIdx++} className="text-sm font-semibold text-foreground pt-1">
          {inlineFormat(content)}
        </p>,
      )
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={keyIdx++} className="text-sm leading-relaxed">
        {inlineFormat(trimmed)}
      </p>,
    )
  }

  return <>{elements}</>
}

/** Handle **bold** and `code` inline formatting */
function inlineFormat(text: string): React.ReactNode {
  // Split on **...** or `...`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
              {part.slice(1, -1)}
            </code>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ─── Typing dots animation ────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="mr-auto flex items-center gap-1.5 rounded-2xl border bg-muted/40 px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiAssistantChat({ variant = "default" }: AiAssistantChatProps) {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [modelInfo, setModelInfo] = useState<{ model?: string; provider?: string }>({})
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AiChatTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch enabled status when panel opens
  useEffect(() => {
    if (!open) return
    aiAssistantApi
      .getStatus()
      .then((res) => {
        setEnabled(Boolean(res.data?.enabled))
        setModelInfo({ model: res.data?.model, provider: res.data?.provider })
      })
      .catch(() => setEnabled(false))
  }, [open])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  // Focus input when panel opens
  useEffect(() => {
    if (open && enabled) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, enabled])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      setError(null)
      setInput("")
      const userTurn: AiChatTurn = { role: "user", content: trimmed }
      const history = [...messages, userTurn]
      setMessages(history)
      setLoading(true)

      try {
        const res = await aiAssistantApi.chat(trimmed, history)
        const answer = res.data?.answer || "No response received."
        setMessages([...history, { role: "assistant", content: answer }])
      } catch (err: any) {
        const message = err?.message || "Failed to reach the assistant"
        setError(message)
        setMessages([...history, { role: "assistant", content: `Sorry, I couldn't process that. ${message}` }])
      } finally {
        setLoading(false)
      }
    },
    [loading, messages],
  )

  const copyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(index)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  const suggestions = variant === "sales" ? SALES_SUGGESTIONS : SUGGESTIONS
  const intro =
    variant === "sales"
      ? "Ask about your leave, planner, visits, quotes, or stock. Answers come from your own data."
      : "Ask about your company's sales, stock, invoices, payroll, or HR metrics. All answers come from your own data."
  const placeholder =
    variant === "sales"
      ? "Ask about leave, visits, quotes, stock…"
      : enabled === false
        ? "Not configured"
        : "Ask about sales, stock, payroll…"

  return (
    <>
      <div
        className={cn(
          "fixed z-[60] flex flex-col items-end gap-3",
          variant === "sales"
            ? "bottom-20 left-4 items-start lg:bottom-5 lg:left-auto lg:right-5 lg:items-end"
            : "bottom-5 right-5",
        )}
      >
        {/* ── Chat panel ── */}
        {open && (
          <div
            className={cn(
              "flex w-[min(100vw-2rem,420px)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
              "animate-in slide-in-from-bottom-4 fade-in duration-200",
            )}
            style={{ maxHeight: "min(72vh, 580px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/15">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Elevate AI</p>
                  {/* {modelLabel && (
                    <p className="text-[10px] opacity-75 leading-tight">{modelLabel}</p>
                  )} */}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={clearChat}
                    title="Clear conversation"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => setOpen(false)}
                  aria-label="Close assistant"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">

              {/* Not configured */}
              {enabled === false && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground">
                  AI assistant is not configured. Ask your admin to set{" "}
                  <code className="text-xs">OPENROUTER_API_KEY</code> in{" "}
                  <code className="text-xs">server/.env</code>.
                </div>
              )}

              {/* Empty state with suggestions */}
              {enabled !== false && messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{intro}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="rounded-full border bg-muted/40 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted active:scale-95"
                        onClick={() => sendMessage(suggestion)}
                        disabled={loading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message bubbles */}
              {messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={cn(
                    "group relative flex flex-col gap-1",
                    msg.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[92%] rounded-2xl px-3.5 py-2.5",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border bg-muted/30 text-foreground",
                    )}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-1">{renderMarkdown(msg.content)}</div>
                    )}
                  </div>

                  {/* Copy button on assistant messages */}
                  {msg.role === "assistant" && (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-1"
                      onClick={() => copyMessage(msg.content, index)}
                    >
                      <Copy className="h-3 w-3" />
                      {copied === index ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>
              ))}
              {/* Typing indicator */}
              {loading && <TypingIndicator />}

              {/* Error */}
              {error && (
                <p className="text-xs text-destructive px-1">{error}</p>
              )}
            </div>

            {/* Input bar */}
            <form
              className="flex gap-2 border-t bg-background p-3"
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage(input)
              }}
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={enabled === false ? "Not configured" : placeholder}
                disabled={loading || enabled === false}
                className="flex-1 text-sm"
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim() || enabled === false}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        )}

        {/* ── FAB button ── */}
        <Button
          type="button"
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-transform active:scale-95",
            open && "rotate-0",
          )}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        >
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </Button>
      </div>
    </>
  )
}
