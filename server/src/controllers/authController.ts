import type { Response } from "express"
import { AuthService } from "../services/authService"
import type { AuthenticatedRequest } from "../middleware/auth"

export class AuthController {
  private static shouldRequireLoginOtp(req: AuthenticatedRequest) {
    // Login OTP is on by default for non-local hosts (including deployed).
    // Force off with SKIP_LOGIN_OTP=true. Local dev always skips.

    if (process.env.SKIP_LOGIN_OTP === "true") {
      console.log("Login OTP bypassed due to SKIP_LOGIN_OTP env var")
      return false
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Login OTP skipped: NODE_ENV=development")
      return false
    }

    const origin = (req.get("origin") || "").toLowerCase()
    const referer = (req.get("referer") || "").toLowerCase()
    const combined = `${origin} ${referer}`

    // Never require OTP for local browsers, even if FRONTEND_URL is a prod domain.
    if (
      combined.includes("localhost") ||
      combined.includes("127.0.0.1") ||
      combined.includes("[::1]")
    ) {
      console.log("Login OTP skipped: request from local/dev environment", {
        origin,
        referer,
      })
      return false
    }

    const fromEnv = String(process.env.OTP_REQUIRED_DOMAINS || "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)

    // If domains are listed, only those hosts require OTP. Otherwise all non-local.
    if (fromEnv.length > 0) {
      const matched = fromEnv.filter(
        (domain) =>
          origin.includes(domain) ||
          referer.includes(domain) ||
          combined.includes(domain),
      )
      if (matched.length === 0) {
        console.log("Login OTP skipped: origin not in OTP_REQUIRED_DOMAINS", {
          origin,
          referer,
        })
        return false
      }
      console.log("Login OTP required: matched OTP_REQUIRED_DOMAINS", {
        origin,
        referer,
        matched,
      })
      return true
    }

    console.log("Login OTP required", { origin, referer })
    return true
  }

  static async registerCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, email, phone, website, industry, employeeCount, adminEmail, adminPassword, adminName } = req.body

      // Debug logging
      console.log('Registration request body:', req.body)

      const result = await AuthService.registerCompany({
        name,
        email,
        phone,
        website,
        industry,
        employeeCount,
        adminEmail,
        adminPassword,
        adminName,
      })

      // Debug logging
      console.log('Registration result:', result)

      res.status(result.success ? 201 : 400).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Registration failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async login(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        })
      }

      const result = await AuthService.login(email, password, {
        requireOtp: AuthController.shouldRequireLoginOtp(req),
      })
      const status = result.success
        ? 200
        : String(result.message || "").toLowerCase().includes("email")
          ? 503
          : 401
      res.status(status).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const { oldPassword, newPassword } = req.body

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Old password and new password are required",
        })
      }

      const result = await AuthService.changePassword(req.user.userId, oldPassword, newPassword)
      res.status(result.success ? 200 : 400).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Password change failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async forgotPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { email } = req.body

      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" })
      }

      const result = await AuthService.forgotPassword(email)
      res.status(result.success ? 200 : 400).json(result)
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed", error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  static async verifyOtp(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, otp } = req.body

      if (!email || !otp) {
        return res.status(400).json({ success: false, message: "Email and OTP are required" })
      }

      const result = await AuthService.verifyOtp(email, otp)
      res.status(result.success ? 200 : 400).json(result)
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed", error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  static async verifyLoginOtp(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, otp, challengeId, loginType } = req.body

      if (!email || !otp || !challengeId || !loginType) {
        return res.status(400).json({
          success: false,
          message: "Email, OTP, challengeId and loginType are required",
        })
      }

      if (!["standard", "company", "employee"].includes(loginType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid loginType",
        })
      }

      const result = await AuthService.verifyLoginOtp(email, otp, challengeId, loginType)
      res.status(result.success ? 200 : 401).json(result)
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed", error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  static async resendLoginOtp(req: AuthenticatedRequest, res: Response) {
    try {
      if (!AuthController.shouldRequireLoginOtp(req)) {
        return res.status(400).json({
          success: false,
          message: "Login OTP is not required in this environment",
        })
      }

      const { email, challengeId, loginType } = req.body

      if (!email || !challengeId || !loginType) {
        return res.status(400).json({
          success: false,
          message: "Email, challengeId and loginType are required",
        })
      }

      if (!["standard", "company", "employee"].includes(loginType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid loginType",
        })
      }

      const result = await AuthService.resendLoginOtp(email, challengeId, loginType)
      res.status(result.success ? 200 : 400).json(result)
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed", error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  static async resetPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, otp, newPassword } = req.body

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: "Email, OTP and new password are required" })
      }

      const result = await AuthService.resetPassword(email, otp, newPassword)
      res.status(result.success ? 200 : 400).json(result)
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed", error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  // Company-specific login (for employees via company slug)
  static async companyLogin(req: AuthenticatedRequest, res: Response) {
    try {
      const { slug, email, password } = req.body

      if (!slug || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Company slug, email and password are required",
        })
      }

      const result = await AuthService.companyLogin(slug, email, password, {
        requireOtp: AuthController.shouldRequireLoginOtp(req),
      })
      res.status(result.success ? 200 : 401).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Validate if company exists
  static async validateCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const { slug } = req.params

      if (!slug) {
        return res.status(400).json({
          success: false,
          message: "Company slug is required",
        })
      }

      const result = await AuthService.validateCompany(slug)
      res.status(result.success ? 200 : 404).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Validation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Employee ID login (for /employee route)
  static async employeeIdLogin(req: AuthenticatedRequest, res: Response) {
    try {
      const { employee_id, password } = req.body

      if (!employee_id || !password) {
        return res.status(400).json({
          success: false,
          message: "Employee ID and password are required",
        })
      }

      const result = await AuthService.employeeIdLogin(employee_id, password, {
        requireOtp: AuthController.shouldRequireLoginOtp(req),
      })
      res.status(result.success ? 200 : 401).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
