"use client"

import { useEffect, useState } from "react"
import { Check, FileDown } from "lucide-react"
import { installDownloadFx, subscribeDownloadFx } from "@/lib/download-fx"

function prettyName(filename: string) {
  const base = filename.split(/[\\/]/).pop() || filename
  return base.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")
}

export function DownloadFxProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<{ id: number; filename: string } | null>(null)
  const [phase, setPhase] = useState<"in" | "saved" | "out">("in")

  useEffect(() => {
    installDownloadFx()
    return subscribeDownloadFx(({ filename }) => {
      setItem({ id: Date.now(), filename })
      setPhase("in")
    })
  }, [])

  useEffect(() => {
    if (!item) return
    const saved = window.setTimeout(() => setPhase("saved"), 480)
    const out = window.setTimeout(() => setPhase("out"), 1680)
    const clear = window.setTimeout(() => setItem(null), 2000)
    return () => {
      window.clearTimeout(saved)
      window.clearTimeout(out)
      window.clearTimeout(clear)
    }
  }, [item])

  return (
    <>
      {children}
      {item ? (
        <div
          className="download-fx"
          data-phase={phase}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="download-fx-backdrop" />
          <div className="download-fx-stage">
            <div className="download-fx-paper" aria-hidden>
              <span className="download-fx-fold" />
              <FileDown className="h-7 w-7 text-white" />
            </div>
            <div className="download-fx-dock">
              <span className="download-fx-mark" data-done={phase !== "in"}>
                {phase === "in" ? (
                  <span className="download-fx-spinner" />
                ) : (
                  <Check className="h-4 w-4" strokeWidth={2.6} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight text-slate-900">
                  {phase === "in" ? "Saving to device" : "Saved to device"}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                  {prettyName(item.filename)}
                </span>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
