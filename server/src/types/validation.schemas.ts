import { z } from "zod"

export const registerCompanySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.coerce.number().optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminName: z.string().min(2).max(100),
})

export const signupSchema = registerCompanySchema

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const createKPISchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(500),
  category: z.enum(["Sales", "Quality", "Attendance", "Customer", "Innovation", "Leadership"]),
  weight: z.number().min(0).max(100),
  targetValue: z.number().min(0),
})

export const createPDPSchema = z.object({
  employeeId: z.string(),
  title: z.string().min(5).max(200),
  goals: z.array(z.string().min(10)),
  timeline: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
})

export const performanceEvaluationSchema = z.object({
  employeeId: z.string(),
  overallScore: z.number().min(0).max(10),
  kpiScores: z.record(z.number().min(0).max(10)),
  strengths: z.string().min(10).max(1000),
  improvements: z.string().min(10).max(1000),
})

export const feedbackSchema = z.object({
  recipientId: z.string(),
  feedbackType: z.enum(["General", "Praise", "Constructive", "Recognition"]),
  rating: z.number().min(1).max(5),
  content: z.string().min(10).max(2000),
})

export const attendanceSchema = z.object({
  employeeId: z.string(),
  date: z.string().date(),
  status: z.enum(["Present", "Absent", "Leave", "Half-day"]),
  hoursWorked: z.number().min(0).max(24).optional(),
})

export const awardNominationSchema = z.object({
  nomineeId: z.string(),
  nominatorId: z.string(),
  awardType: z.string().min(3).max(100),
  reason: z.string().min(20).max(1000),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateKPIInput = z.infer<typeof createKPISchema>
export type CreatePDPInput = z.infer<typeof createPDPSchema>
export type PerformanceEvaluationInput = z.infer<typeof performanceEvaluationSchema>
export type FeedbackInput = z.infer<typeof feedbackSchema>
export type AttendanceInput = z.infer<typeof attendanceSchema>
export type AwardNominationInput = z.infer<typeof awardNominationSchema>

export const companyLoginSchema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
})

export const employeeIdLoginSchema = z.object({
  employee_id: z.string().min(1),
  password: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(8),
})

export const verifyLoginOtpSchema = verifyOtpSchema.extend({
  challengeId: z.string().min(1),
  loginType: z.enum(["standard", "company", "employee"]).optional(),
})

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(8),
  newPassword: z.string().min(8),
})

export const createEmployeeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: z.enum(["manager", "employee", "hr", "admin"]).optional(),
  department: z.string().optional(),
  manager_id: z.string().optional(),
  password: z.string().min(8).optional(),
}).refine((data) => (data.firstName || data.first_name) && (data.lastName || data.last_name), {
  message: "firstName and lastName are required",
})

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  manager_id: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
}).passthrough()
