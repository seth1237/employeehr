import { Router } from "express"
import { AuthController } from "../controllers/authController"
import { authMiddleware } from "../middleware/auth"
import { authLimiter } from "../middleware/rateLimit.middleware"
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

// Password reset flow
router.post("/forgot-password", authLimiter, validateRequest(forgotPasswordSchema), AuthController.forgotPassword)
router.post("/verify-otp", authLimiter, validateRequest(verifyOtpSchema), AuthController.verifyOtp)
router.post("/verify-login-otp", authLimiter, validateRequest(verifyLoginOtpSchema), AuthController.verifyLoginOtp)
router.post("/resend-login-otp", authLimiter, AuthController.resendLoginOtp)
router.post("/reset-password", authLimiter, validateRequest(resetPasswordSchema), AuthController.resetPassword)

// Protected routes
router.post("/change-password", authMiddleware, AuthController.changePassword)

export default router
