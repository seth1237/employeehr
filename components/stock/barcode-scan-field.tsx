"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

function playScanBeep(ok: boolean) {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = "square"
    oscillator.frequency.value = ok ? 880 : 220
    gain.gain.value = 0.05
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + (ok ? 0.08 : 0.18))
  } catch {
    // Audio is optional on packing desks.
  }
}

export function BarcodeScanField({
  label = "Scan barcode",
  placeholder = "Focus here and scan, or type SKU then Enter",
  autoFocus = false,
  disabled = false,
  className,
  onCode,
}: {
  label?: string
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  className?: string
  onCode: (code: string) => void | Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [value, setValue] = useState("")
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (autoFocus && !disabled) inputRef.current?.focus()
  }, [autoFocus, disabled])

  const submit = async (raw: string) => {
    const code = raw.trim()
    if (code.length < 3 || busy || disabled) return
    setBusy(true)
    try {
      await onCode(code)
      playScanBeep(true)
      setValue("")
    } catch (error: any) {
      playScanBeep(false)
      throw error
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  useEffect(() => {
    if (!cameraOpen) return
    let stopped = false
    let reader: { reset?: () => void } | null = null
    let stream: MediaStream | null = null

    const start = async () => {
      setCameraError("")
      const video = videoRef.current
      if (!video) return
      try {
        const Detector = (window as any).BarcodeDetector
        if (typeof Detector === "function") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          })
          video.srcObject = stream
          await video.play()
          const detector = new Detector({
            formats: ["code_128", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e"],
          })
          const tick = async () => {
            if (stopped) return
            try {
              const codes = await detector.detect(video)
              const text = codes?.[0]?.rawValue
              if (text) {
                await submit(text)
                setCameraOpen(false)
                return
              }
            } catch {
              // Keep scanning.
            }
            requestAnimationFrame(() => void tick())
          }
          requestAnimationFrame(() => void tick())
          return
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        const zxing = new BrowserMultiFormatReader()
        reader = zxing
        const result = await zxing.decodeOnceFromVideoDevice(undefined, video)
        if (!stopped && result?.getText()) {
          await submit(result.getText())
          setCameraOpen(false)
        }
      } catch (error: any) {
        if (!stopped) {
          setCameraError(error?.message || "Camera is not available. Use a USB scanner.")
        }
      }
    }

    void start()
    return () => {
      stopped = true
      reader?.reset?.()
      stream?.getTracks().forEach((track) => track.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [cameraOpen])

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label>{label}</Label> : null}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          disabled={disabled || busy}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void submit(value).catch(() => undefined)
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 lg:hidden"
          disabled={disabled}
          onClick={() => setCameraOpen(true)}
          aria-label="Use camera"
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="hidden shrink-0 lg:inline-flex"
          disabled={disabled}
          onClick={() => setCameraOpen(true)}
          aria-label="Use camera"
        >
          <Camera className="mr-1.5 h-4 w-4" />
          Camera
        </Button>
      </div>
      {cameraOpen ? (
        <div className="relative overflow-hidden rounded-lg border bg-black">
          <video ref={videoRef} className="h-48 w-full object-cover" muted playsInline />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute right-2 top-2"
            onClick={() => setCameraOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          {cameraError ? (
            <p className="absolute inset-x-2 bottom-2 rounded bg-black/70 p-2 text-xs text-white">
              {cameraError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
