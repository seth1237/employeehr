import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"
import { User } from "../models/User"
import { KPI } from "../models/KPI"

export class SetupController {
  /**
   * Get setup progress for current company
   */
  static async getSetupProgress(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      // Calculate statistics
      const employeeCount = await User.countDocuments({ org_id: req.org_id })
      const kpiCount = await KPI.countDocuments({ org_id: req.org_id })

      const setupProgress = company.setupProgress || {
        completed: false,
        currentStep: "companyInfo",
        steps: {
          companyInfo: false,
          branding: false,
          emailConfig: false,
          employees: false,
          kpis: false,
        },
      }

      res.status(200).json({
        success: true,
        data: {
          setupProgress,
          statistics: {
            employeeCount,
            kpiCount,
            hasLogo: !!company.logo,
            hasEmailConfig: !!company.emailConfig?.verified,
          },
          company: {
            name: company.name,
            email: company.email,
            slug: company.slug,
            logo: company.logo,
          },
        },
      })
    } catch (error) {
      console.error("Get setup progress error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch setup progress",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Update setup step completion
   */
  static async updateSetupStep(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { step, completed } = req.body

      if (!step || typeof completed !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Step name and completion status required",
        })
      }

      const validSteps = ["companyInfo", "branding", "emailConfig", "employees", "kpis"]
      if (!validSteps.includes(step)) {
        return res.status(400).json({
          success: false,
          message: "Invalid step name",
        })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      // Initialize setupProgress if not exists
      if (!company.setupProgress) {
        company.setupProgress = {
          completed: false,
          currentStep: "companyInfo",
          steps: {
            companyInfo: false,
            branding: false,
            emailConfig: false,
            employees: false,
            kpis: false,
          },
        }
      }

      // Update the specific step
      company.setupProgress.steps[step as keyof typeof company.setupProgress.steps] = completed

      // Check if all steps are completed
      const allStepsCompleted = Object.values(company.setupProgress.steps).every((s) => s === true)
      company.setupProgress.completed = allStepsCompleted

      await company.save()

      res.status(200).json({
        success: true,
        message: "Setup step updated successfully",
        data: {
          setupProgress: company.setupProgress,
        },
      })
    } catch (error) {
      console.error("Update setup step error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update setup step",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Mark setup as complete
   */
  static async completeSetup(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      if (!company.setupProgress) {
        company.setupProgress = {
          completed: false,
          currentStep: "companyInfo",
          steps: {
            companyInfo: false,
            branding: false,
            emailConfig: false,
            employees: false,
            kpis: false,
          },
        }
      }

      // Mark all steps as completed
      company.setupProgress.completed = true
      Object.keys(company.setupProgress.steps).forEach((key) => {
        company.setupProgress!.steps[key as keyof typeof company.setupProgress.steps] = true
      })

      await company.save()

      res.status(200).json({
        success: true,
        message: "Setup completed successfully! Welcome to Elevate HR.",
        data: {
          setupProgress: company.setupProgress,
        },
      })
    } catch (error) {
      console.error("Complete setup error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to complete setup",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Skip setup (allow users to skip optional steps)
   */
  static async skipSetup(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      if (!company.setupProgress) {
        company.setupProgress = {
          completed: false,
          currentStep: "companyInfo",
          steps: {
            companyInfo: false,
            branding: false,
            emailConfig: false,
            employees: false,
            kpis: false,
          },
        }
      }

      // Mark as completed even if some optional steps are skipped
      company.setupProgress.completed = true

      await company.save()

      res.status(200).json({
        success: true,
        message: "Setup skipped. You can complete it later from settings.",
        data: {
          setupProgress: company.setupProgress,
        },
      })
    } catch (error) {
      console.error("Skip setup error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to skip setup",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Reset setup (admin only - for testing)
   */
  static async resetSetup(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      company.setupProgress = {
        completed: false,
        currentStep: "companyInfo",
        steps: {
          companyInfo: false,
          branding: false,
          emailConfig: false,
          employees: false,
          kpis: false,
        },
      }

      await company.save()

      res.status(200).json({
        success: true,
        message: "Setup progress reset successfully",
      })
    } catch (error) {
      console.error("Reset setup error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to reset setup",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
