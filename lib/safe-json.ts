export type SafeApiJson = {
  success?: boolean
  data?: any
  message?: string
  error?: string
  [key: string]: any
}

export function parseApiJson(text: string | null | undefined): SafeApiJson {
  const raw = String(text || "").trim()
  if (!raw) {
    return { success: false, message: "Empty response" }
  }
  try {
    const parsed = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object") {
      return { success: false, message: "Invalid response", data: parsed }
    }
    return parsed
  } catch {
    return { success: false, message: "Invalid JSON response" }
  }
}

export async function readApiJson(response: Response): Promise<SafeApiJson> {
  try {
    return parseApiJson(await response.text())
  } catch {
    return { success: false, message: "Failed to read response" }
  }
}
