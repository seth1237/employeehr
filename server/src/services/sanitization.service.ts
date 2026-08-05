import sanitizeHtml from "sanitize-html"

export class SanitizationService {
  static sanitizeHtml(input: string): string {
    return sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {},
    })
  }

  static sanitizeText(input: string): string {
    if (typeof input !== "string") return ""
    return input
      .trim()
      .replace(/[<>"'`]/g, "") // Remove HTML special chars
      .substring(0, 5000) // Limit length
  }

  static sanitizeObject<T extends Record<string, any>>(obj: T, fieldsToSanitize: (keyof T)[]): T {
    const sanitized = { ...obj }
    fieldsToSanitize.forEach((field) => {
      if (typeof sanitized[field] === "string") {
        sanitized[field] = this.sanitizeText(sanitized[field] as string) as any
      }
    })
    return sanitized
  }

  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim()
  }

  static validateAndSanitizeEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const sanitized = this.sanitizeEmail(email)
    return emailRegex.test(sanitized) ? sanitized : null
  }
}
