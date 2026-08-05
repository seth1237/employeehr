import type { Request, Response, NextFunction } from "express"
import { SanitizationService } from "../services/sanitization.service"

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        req.body[key] = SanitizationService.sanitizeText(req.body[key])
      }
    })
  }

  next()
}

export const sanitizeOutput = (data: any): any => {
  if (typeof data === "string") {
    return SanitizationService.sanitizeHtml(data)
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeOutput)
  }
  if (data && typeof data === "object") {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeOutput(value)
    }
    return sanitized
  }
  return data
}
