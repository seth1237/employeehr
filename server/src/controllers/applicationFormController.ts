import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import ApplicationForm from "../models/ApplicationForm"

export class ApplicationFormController {
  // Create application form
  static async createForm(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const formData = {
        ...req.body,
        org_id: req.org_id,
        created_by: req.user.userId,
      }

      const form = await ApplicationForm.create(formData)

      res.status(201).json({
        success: true,
        message: "Application form created successfully",
        data: form,
      })
    } catch (error) {
      console.error("Create form error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create form",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get all forms for organization
  static async getAllForms(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const forms = await ApplicationForm.find({ org_id: req.org_id }).sort({ created_at: -1 })

      res.status(200).json({
        success: true,
        data: forms,
      })
    } catch (error) {
      console.error("Get forms error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch forms",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get form by job ID
  static async getFormByJobId(req: AuthenticatedRequest, res: Response) {
    try {
      const { jobId } = req.params
      const form = await ApplicationForm.findOne({ job_id: jobId, status: "active" })

      if (!form) {
        return res.status(404).json({ success: false, message: "Form not found" })
      }

      res.status(200).json({
        success: true,
        data: form,
      })
    } catch (error) {
      console.error("Get form error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch form",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Update form
  static async updateForm(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { formId } = req.params
      delete req.body.org_id

      const form = await ApplicationForm.findOneAndUpdate(
        { _id: formId, org_id: req.org_id },
        { $set: req.body },
        { new: true, runValidators: true }
      )

      if (!form) {
        return res.status(404).json({ success: false, message: "Form not found" })
      }

      res.status(200).json({
        success: true,
        message: "Form updated successfully",
        data: form,
      })
    } catch (error) {
      console.error("Update form error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update form",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Delete form
  static async deleteForm(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { formId } = req.params
      const form = await ApplicationForm.findOneAndDelete({ _id: formId, org_id: req.org_id })

      if (!form) {
        return res.status(404).json({ success: false, message: "Form not found" })
      }

      res.status(200).json({
        success: true,
        message: "Form deleted successfully",
      })
    } catch (error) {
      console.error("Delete form error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete form",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
