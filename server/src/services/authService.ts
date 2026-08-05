import bcrypt from "bcryptjs"
import { syncUserToQueue, syncCompanyToQueue } from "../utils/queueHelper"
import { User } from "../models/User"
import { Company } from "../models/Company"
import { generateToken } from "../config/auth"
import type { IUser, ICompany, IJWTPayload, IAPIResponse } from "../types/interfaces"
import { emailService } from "./emailService"
import { PasswordReset } from "../models/PasswordReset"
import { LoginOtp } from "../models/LoginOtp"
import { randomUUID } from "crypto"

type LoginOtpType = "standard" | "company" | "employee"

interface LoginOtpChallenge {
  requiresOtp: true
  challengeId: string
  email: string
  loginType: LoginOtpType
}

interface LoginSuccessPayload {
  user: IUser
  token: string
  company?: ICompany
}

export class AuthService {
  private static async issueLoginOtpChallenge(params: {
    user: IUser
    loginType: LoginOtpType
    companySlug?: string
  }): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    const challengeId = randomUUID()

    await LoginOtp.updateMany(
      {
        email: params.user.email.toLowerCase(),
        loginType: params.loginType,
        used: false,
      },
      { $set: { used: true } },
    )

    await LoginOtp.create({
      challengeId,
      email: params.user.email.toLowerCase(),
      userId: params.user._id?.toString(),
      org_id: params.user.org_id,
      loginType: params.loginType,
      companySlug: params.companySlug,
      otp,
      expiresAt,
      used: false,
    })

    const html = `
      <p>Your login verification code is:</p>
      <h2>${otp}</h2>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not attempt to login, ignore this email.</p>
    `

    const sent = await emailService.sendEmail({
      to: params.user.email,
      subject: "Your login verification code",
      html,
      companyId: params.user.org_id,
    })

    if (!sent) {
      throw new Error(
        "Could not send login verification email. Check company SMTP settings or system email configuration.",
      )
    }

    // Log challenge creation for debugging (do not log the OTP itself)
    console.log(`Login OTP challenge issued`, { challengeId, email: params.user.email, loginType: params.loginType })

    return challengeId
  }

  private static getTokenFromUser(user: IUser): string {
    const payload: IJWTPayload = {
      userId: user._id?.toString() || "",
      org_id: user.org_id,
      email: user.email,
      role: user.role,
    }

    return generateToken(payload)
  }

  // Company Registration
  static async registerCompany(
    data: Partial<ICompany> & { adminEmail: string; adminPassword: string; adminName: string },
  ): Promise<IAPIResponse<{ company: ICompany; user: IUser; token: string }>> {
    try {
      if (!data.name) {
        return {
          success: false,
          message: "Company name is required",
        }
      }

      // Check if company email already exists
      const existingCompany = await Company.findOne({ email: data.email })
      if (existingCompany) {
        return {
          success: false,
          message: "Company with this email already exists",
        }
      }

      // Generate unique slug from company name
      const baseSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
      
      let slug = baseSlug
      let slugCounter = 1
      
      // Ensure slug is unique
      while (await Company.findOne({ slug })) {
        slug = `${baseSlug}-${slugCounter}`
        slugCounter++
      }

      // Create company
      const company = new Company({
        name: data.name,
        slug,
        email: data.email,
        phone: data.phone,
        website: data.website,
        industry: data.industry,
        employeeCount: data.employeeCount,
      })

      const savedCompany = await company.save()

      // Create admin user
      const hashedPassword = await bcrypt.hash(data.adminPassword, 10)
      const [firstName, ...lastNameParts] = data.adminName.split(" ")
      const lastName = lastNameParts.join(" ") || "Admin"

      const user = new User({
        org_id: savedCompany._id.toString(),
        firstName,
        lastName,
        email: data.adminEmail,
        password: hashedPassword,
        role: "company_admin",
        status: "active",
      })

      const savedUser = await user.save()

      void syncCompanyToQueue(savedCompany.toObject(), "CREATE")
      void syncUserToQueue(savedUser.toObject(), "CREATE")

      // Generate token
      const payload: IJWTPayload = {
        userId: savedUser._id.toString(),
        org_id: savedCompany._id.toString(),
        email: savedUser.email,
        role: savedUser.role,
      }

      const token = generateToken(payload)

      return {
        success: true,
        message: "Company registered successfully",
        data: {
          company: savedCompany.toObject(),
          user: savedUser.toObject() as any,
          token,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Registration failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // User Login
  static async login(
    email: string,
    password: string,
    options?: { requireOtp?: boolean },
  ): Promise<IAPIResponse<LoginSuccessPayload | LoginOtpChallenge>> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() })

      if (!user) {
        console.warn(`[AuthService] Login failed: user not found for ${email.toLowerCase()}`)
        return {
          success: false,
          message: "User not found",
        }
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        console.warn(`[AuthService] Login failed: invalid password for ${email.toLowerCase()}`)
        return {
          success: false,
          message: "Invalid credentials",
        }
      }

      // Check if user is active
      if (user.status !== "active") {
        console.warn(`[AuthService] Login failed: inactive account for ${email.toLowerCase()}`)
        return {
          success: false,
          message: "User account is inactive",
        }
      }

      // Check if company is frozen
      const company = await Company.findById(user.org_id)
      if (company?.isFrozen) {
        console.warn(`[AuthService] Login failed: frozen company for ${email.toLowerCase()}`)
        return {
          success: false,
          message: "Your account has been Frozen by the System owner. Contact him for Unlocking",
        }
      }

      if (options?.requireOtp) {
        const challengeId = await this.issueLoginOtpChallenge({
          user: user.toObject() as any,
          loginType: "standard",
        })

        return {
          success: true,
          message: "OTP sent to your email",
          data: {
            requiresOtp: true,
            challengeId,
            email: user.email,
            loginType: "standard",
          },
        }
      }

      user.lastLoginAt = new Date()
      await user.save()

      const token = this.getTokenFromUser(user.toObject() as any)

      return {
        success: true,
        message: "Login successful",
        data: {
          user: user.toObject() as any,
          token,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async verifyLoginOtp(
    email: string,
    otp: string,
    challengeId: string,
    loginType: LoginOtpType,
  ): Promise<IAPIResponse<LoginSuccessPayload>> {
    try {
      const challenge = await LoginOtp.findOne({
        email: email.toLowerCase(),
        otp,
        challengeId,
        loginType,
        used: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 })

      if (!challenge) {
        return {
          success: false,
          message: "Invalid or expired OTP",
        }
      }

      const user = await User.findById(challenge.userId)
      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      if (user.status !== "active") {
        return {
          success: false,
          message: "User account is inactive",
        }
      }

      const company = await Company.findById(user.org_id)
      if (!company) {
        return {
          success: false,
          message: "Company not found",
        }
      }

      if (company.isFrozen) {
        return {
          success: false,
          message: "Your account has been Frozen by the System owner. Contact him for Unlocking",
        }
      }

      if (company.status !== "active") {
        return {
          success: false,
          message: "Company account is not active",
        }
      }

      challenge.used = true
      await challenge.save()

      user.lastLoginAt = new Date()
      await user.save()

      const token = this.getTokenFromUser(user.toObject() as any)

      return {
        success: true,
        message: "Login successful",
        data: {
          user: user.toObject() as any,
          token,
          ...(loginType === "standard" ? {} : { company: company.toObject() as any }),
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to verify login OTP",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async resendLoginOtp(
    email: string,
    challengeId: string,
    loginType: LoginOtpType,
  ): Promise<IAPIResponse<LoginOtpChallenge>> {
    try {
      const currentChallenge = await LoginOtp.findOne({
        email: email.toLowerCase(),
        challengeId,
        loginType,
        used: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 })

      if (!currentChallenge) {
        return {
          success: false,
          message: "Challenge expired. Please login again.",
        }
      }

      const user = await User.findById(currentChallenge.userId)
      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      if (user.status !== "active") {
        return {
          success: false,
          message: "User account is inactive",
        }
      }

      const company = await Company.findById(user.org_id)
      if (!company) {
        return {
          success: false,
          message: "Company not found",
        }
      }

      if (company.isFrozen) {
        return {
          success: false,
          message: "Your account has been Frozen by the System owner. Contact him for Unlocking",
        }
      }

      if (company.status !== "active") {
        return {
          success: false,
          message: "Company account is not active",
        }
      }

      currentChallenge.used = true
      await currentChallenge.save()

      const nextChallengeId = await this.issueLoginOtpChallenge({
        user: user.toObject() as any,
        loginType,
      })

      return {
        success: true,
        message: "OTP resent to your email",
        data: {
          requiresOtp: true,
          challengeId: nextChallengeId,
          email: user.email,
          loginType,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to resend login OTP",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Create Employee User
  static async createEmployee(
    org_id: string,
    data: Partial<IUser> & { email: string; password?: string; inviter_name?: string },
  ): Promise<IAPIResponse<IUser>> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        org_id,
        email: data.email.toLowerCase(),
      })

      if (existingUser) {
        return {
          success: false,
          message: "User with this email already exists in organization",
        }
      }

      const tempPassword = data.password || Math.random().toString(36).slice(-8)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      // Support both camelCase and snake_case field names
      const firstName = data.firstName || (data as any).first_name
      const lastName = data.lastName || (data as any).last_name

      const user = new User({
        org_id,
        firstName,
        lastName,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: data.role || "employee",
        department: data.department,
        manager_id: data.manager_id,
        status: "active",
      })

      const savedUser = await user.save()

      void syncUserToQueue(savedUser.toObject(), "CREATE")

      // Send invitation email
      try {
      const loginUrl = process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke"
        await emailService.sendInvitationEmail({
          recipientEmail: savedUser.email,
          recipientName: `${savedUser.firstName} ${savedUser.lastName}`,
          inviterName: data.inviter_name || "Administrator",
          role: savedUser.role,
          temporaryPassword: tempPassword,
          loginUrl: `${loginUrl}/auth/login`,
          companyId: org_id,
        })
        console.log(`Invitation email sent to ${savedUser.email}`)
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError)
        // Don't fail the user creation if email fails
      }

      return {
        success: true,
        message: "Employee created successfully",
        data: savedUser.toObject() as any,
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to create employee",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Change Password
  static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<IAPIResponse<null>> {
    try {
      const user = await User.findById(userId)

      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      // Verify old password
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Current password is incorrect",
        }
      }

      // Hash and save new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      user.password = hashedPassword
      await user.save()

      return {
        success: true,
        message: "Password changed successfully",
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to change password",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Forgot Password - generate and send OTP
  static async forgotPassword(email: string): Promise<IAPIResponse<null>> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() })

      // Always respond with success to avoid user enumeration
      if (!user) {
        return {
          success: true,
          message: "If an account with that email exists, an OTP has been sent",
        }
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      await PasswordReset.create({ email: user.email.toLowerCase(), otp, expiresAt, used: false })

      const html = `
        <p>Your password reset code is:</p>
        <h2>${otp}</h2>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this, ignore this email.</p>
      `

      await emailService.sendEmail({ to: user.email, subject: "Password reset code", html, companyId: user.org_id })

      return {
        success: true,
        message: "If an account with that email exists, an OTP has been sent",
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to process forgot password",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Verify OTP
  static async verifyOtp(email: string, otp: string): Promise<IAPIResponse<null>> {
    try {
      const token = await PasswordReset.findOne({ email: email.toLowerCase(), otp, used: false, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 })

      if (!token) {
        return { success: false, message: "Invalid or expired OTP" }
      }

      return { success: true, message: "OTP verified" }
    } catch (error) {
      return {
        success: false,
        message: "Failed to verify OTP",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Reset password using OTP
  static async resetPassword(email: string, otp: string, newPassword: string): Promise<IAPIResponse<null>> {
    try {
      const token = await PasswordReset.findOne({ email: email.toLowerCase(), otp, used: false, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 })

      if (!token) {
        return { success: false, message: "Invalid or expired OTP" }
      }

      const user = await User.findOne({ email: email.toLowerCase() })
      if (!user) {
        return { success: false, message: "User not found" }
      }

      const hashed = await bcrypt.hash(newPassword, 10)
      user.password = hashed
      await user.save()

      token.used = true
      await token.save()

      return { success: true, message: "Password reset successfully" }
    } catch (error) {
      return {
        success: false,
        message: "Failed to reset password",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Company-specific login (for employees via company slug)
  static async companyLogin(
    slug: string,
    email: string,
    password: string,
    options?: { requireOtp?: boolean },
  ): Promise<IAPIResponse<LoginSuccessPayload | LoginOtpChallenge>> {
    try {
      // First, find the company by slug
      const company = await Company.findOne({ slug: slug.toLowerCase() })

      if (!company) {
        return {
          success: false,
          message: "Company not found",
        }
      }

      if (company.status !== "active") {
        return {
          success: false,
          message: "Company account is not active",
        }
      }

      // Check if company is frozen
      if (company.isFrozen) {
        return {
          success: false,
          message: "Your account has been Frozen by the System owner. Contact him for Unlocking",
        }
      }

      // Find user in that company
      const user = await User.findOne({
        email: email.toLowerCase(),
        org_id: company._id.toString(),
      })

      if (!user) {
        return {
          success: false,
          message: "Invalid credentials",
        }
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid credentials",
        }
      }

      // Check if user is active
      if (user.status !== "active") {
        return {
          success: false,
          message: "User account is inactive",
        }
      }

      if (options?.requireOtp) {
        const challengeId = await this.issueLoginOtpChallenge({
          user: user.toObject() as any,
          loginType: "company",
          companySlug: slug.toLowerCase(),
        })

        return {
          success: true,
          message: "OTP sent to your email",
          data: {
            requiresOtp: true,
            challengeId,
            email: user.email,
            loginType: "company",
          },
        }
      }

      const token = this.getTokenFromUser(user.toObject() as any)

      return {
        success: true,
        message: "Login successful",
        data: {
          user: user.toObject() as any,
          token,
          company: { ...company.toObject() } as ICompany,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Validate company exists
  static async validateCompany(slug: string): Promise<IAPIResponse<{ company: Partial<ICompany> }>> {
    try {
      const company = await Company.findOne(
        { slug: slug.toLowerCase() },
        { name: 1, slug: 1, logo: 1, primaryColor: 1, secondaryColor: 1, status: 1 }
      )

      if (!company) {
        return {
          success: false,
          message: "Company not found",
        }
      }

      if (company.status !== "active") {
        return {
          success: false,
          message: "Company is not active",
        }
      }

      return {
        success: true,
        message: "Company found",
        data: {
          company: company.toObject() as any,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Validation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Employee ID login (for /employee route)
  static async employeeIdLogin(
    employee_id: string,
    password: string,
    options?: { requireOtp?: boolean },
  ): Promise<IAPIResponse<LoginSuccessPayload | LoginOtpChallenge>> {
    try {
      // Find user by employee_id
      const user = await User.findOne({ employee_id: employee_id.toUpperCase() })

      if (!user) {
        return {
          success: false,
          message: "Invalid employee ID or password",
        }
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid employee ID or password",
        }
      }

      // Check if user is active
      if (user.status !== "active") {
        return {
          success: false,
          message: "Employee account is inactive",
        }
      }

      // Get company info
      const company = await Company.findById(user.org_id)
      if (!company) {
        return {
          success: false,
          message: "Company not found",
        }
      }

      if (company.status !== "active") {
        return {
          success: false,
          message: "Company account is not active",
        }
      }

      if (company.isFrozen) {
        return {
          success: false,
          message: "Your account has been Frozen by the System owner. Contact him for Unlocking",
        }
      }

      if (options?.requireOtp) {
        const challengeId = await this.issueLoginOtpChallenge({
          user: user.toObject() as any,
          loginType: "employee",
        })

        return {
          success: true,
          message: "OTP sent to your email",
          data: {
            requiresOtp: true,
            challengeId,
            email: user.email,
            loginType: "employee",
          },
        }
      }

      const token = this.getTokenFromUser(user.toObject() as any)

      return {
        success: true,
        message: "Login successful",
        data: {
          user: user.toObject() as any,
          token,
          company: { ...company.toObject() } as ICompany,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
