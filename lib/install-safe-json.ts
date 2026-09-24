"use client"

import { parseApiJson } from "@/lib/safe-json"

let installed = false

export function installSafeJson() {
  if (installed || typeof Response === "undefined") return
  if ((Response.prototype as any).__elevateSafeJson) return
  installed = true
  ;(Response.prototype as any).__elevateSafeJson = true

  Response.prototype.json = async function safeJson() {
    try {
      return parseApiJson(await this.text())
    } catch {
      return { success: false, message: "Invalid JSON response" }
    }
  }
}

installSafeJson()
