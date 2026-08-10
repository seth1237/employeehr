import { Router } from "express"
import { AuthController } from "../controllers/authController"
import { authMiddleware } from "../middleware/auth"
import { authLimiter, authOtpLimiter } from "../middleware/rateLimit.middleware"
import { validateRequest } from "../middleware/validation.middleware"
import {
  loginSchema,
  registerCompanySchema,
  companyLoginSchema,
  employeeIdLoginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  verifyLoginOtpSchema,
  resetPasswordSchema,
} from "../types/validation.schemas"

const router = Router()

// Public routes
router.post("/register-company", authLimiter, validateRequest(registerCompanySchema), AuthController.registerCompany)
router.post("/login", authLimiter, validateRequest(loginSchema), AuthController.login)
router.post("/company-login", authLimiter, validateRequest(companyLoginSchema), AuthController.companyLogin)
router.post("/employee-login", authLimiter, validateRequest(employeeIdLoginSchema), AuthController.employeeIdLogin)
router.get("/validate-company/:slug", AuthController.validateCompany)

// Password reset / OTP flow — separate softer bucket so OTP retries don't block login
router.post("/forgot-password", authOtpLimiter, validateRequest(forgotPasswordSchema), AuthController.forgotPassword)
router.post("/verify-otp", authOtpLimiter, validateRequest(verifyOtpSchema), AuthController.verifyOtp)
router.post("/verify-login-otp", authOtpLimiter, validateRequest(verifyLoginOtpSchema), AuthController.verifyLoginOtp)
router.post("/resend-login-otp", authOtpLimiter, AuthController.resendLoginOtp)
router.post("/reset-password", authOtpLimiter, validateRequest(resetPasswordSchema), AuthController.resetPassword)

// Protected routes
router.post("/change-password", authMiddleware, AuthController.changePassword)

export default router
