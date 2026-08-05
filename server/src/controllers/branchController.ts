import { Response } from "express"
import { Branch } from "../models/Branch"
import { User } from "../models/User"
import type { AuthenticatedRequest } from "../types/auth"
import type { IAPIResponse, IBranch } from "../types/interfaces"

export class BranchController {
  /**
   * Get all branches for organization
   */
  static async getAllBranches(req: AuthenticatedRequest, res: Response) {
    try {
      const { org_id } = req.user!
      const { active } = req.query

      const query: any = { org_id }
      if (active === "true") query.isActive = true
      if (active === "false") query.isActive = false

      const branches = await Branch.find(query).sort({ createdAt: -1 })

      return res.status(200).json({
        success: true,
        data: branches,
      })
    } catch (error) {
      console.error("Error fetching branches:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch branches",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Get single branch by ID
   */
  static async getBranchById(req: AuthenticatedRequest, res: Response) {
    try {
      const { org_id } = req.user!
      const { id } = req.params

      const branch = await Branch.findOne({ _id: id, org_id })

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found",
        })
      }

      return res.status(200).json({
        success: true,
        data: branch,
      })
    } catch (error) {
      console.error("Error fetching branch:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch branch",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Create new branch
   */
  static async createBranch(req: AuthenticatedRequest, res: Response) {
    try {
      const { org_id } = req.user!
      const { name, code, location, city, state, country, phone, email, description } = req.body

      if (!name || !code || !location) {
        return res.status(400).json({
          success: false,
          message: "Name, code, and location are required",
        })
      }

      // Check for duplicate code
      const existingBranch = await Branch.findOne({ org_id, code: code.toUpperCase() })
      if (existingBranch) {
        return res.status(400).json({
          success: false,
          message: `Branch code '${code}' already exists`,
        })
      }

      const branch = new Branch({
        org_id,
        name,
        code: code.toUpperCase(),
        location,
        city,
        state,
        country,
        phone,
        email,
        description,
        isActive: true,
      })

      await branch.save()

      return res.status(201).json({
        success: true,
        message: "Branch created successfully",
        data: branch,
      })
    } catch (error) {
      console.error("Error creating branch:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to create branch",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Update branch
   */
  static async updateBranch(req: AuthenticatedRequest, res: Response) {
    try {
      const { org_id } = req.user!
      const { id } = req.params
      const { name, location, city, state, country, phone, email, description, isActive } = req.body

      const branch = await Branch.findOne({ _id: id, org_id })

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found",
        })
      }

      // Update fields
      if (name) branch.name = name
      if (location) branch.location = location
      if (city) branch.city = city
      if (state) branch.state = state
      if (country) branch.country = country
      if (phone) branch.phone = phone
      if (email) branch.email = email
      if (description) branch.description = description
      if (typeof isActive === "boolean") branch.isActive = isActive

      await branch.save()

      return res.status(200).json({
        success: true,
        message: "Branch updated successfully",
        data: branch,
      })
    } catch (error) {
      console.error("Error updating branch:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to update branch",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Allocate branch to admin
   */
  static async allocateBranchToAdmin(req: AuthenticatedRequest, res: Response) {
    try {
      const { org_id } = req.user!
      const { branchId, managerId } = req.body

      if (!branchId || !managerId) {
        return res.status(400).json({
          success: false,
          message: "Branch ID and Manager ID are required",
        })
      }

      const branch = await Branch.findOne({ _id: branchId, org_id })
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found",
        })
      }

      // Verify manager exists and is an admin
      const manager = await User.findOne({ _id: managerId, org_id })
      if (!manager) {
        return res.status(404).json({
          success: false,
          message: "Manager not found",
        })
      }

      if (!["admin", "company_admin", "hr"].includes(manager.role)) {
        return res.status(400).json({
          success: false,
          message: "Only admins can manage branches",
        })
      }

      // Update branch with manager
      branch.managerId = managerId
      branch.managerName = manager.firstName + " " + manager.lastName
      branch.managerEmail = manager.email

      await branch.save()

      return res.status(200).json({
        success: true,
        message: "Branch allocated to admin successfully",
        data: branch,
      })
    } catch (error) {
      console.error("Error allocating branch:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to allocate branch",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Remove admin from branch
   */
  static async removeBranchManager(req: AuthenticatedRequest, res: Response) {
    try {
      const { org_id } = req.user!
      const { id } = req.params

      const branch = await Branch.findOne({ _id: id, org_id })
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found",
        })
      }

      branch.managerId = undefined
      branch.managerName = undefined
      branch.managerEmail = undefined

      await branch.save()

      return res.status(200).json({
        success: true,
        message: "Manager removed from branch successfully",
        data: branch,
      })
    } catch (error) {
      console.error("Error removing manager:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to remove manager",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Delete branch (soft delete - just deactivate)
   */
  static async deleteBranch(req: AuthenticatedRequest, res: Response) {
    try {
      const { org_id } = req.user!
      const { id } = req.params

      const branch = await Branch.findOne({ _id: id, org_id })
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found",
        })
      }

      branch.isActive = false
      await branch.save()

      return res.status(200).json({
        success: true,
        message: "Branch deactivated successfully",
        data: branch,
      })
    } catch (error) {
      console.error("Error deleting branch:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to delete branch",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Get branch analytics by branch
   */
  static async getBranchAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { org_id } = req.user!
      const { branchId } = req.params

      const branch = await Branch.findOne({ _id: branchId, org_id })
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found",
        })
      }

      // This would be extended with actual analytics based on branch
      const analytics = {
        branch: branch.name,
        branchCode: branch.code,
        manager: branch.managerName,
        // Stock data, sales, etc. would be aggregated here
      }

      return res.status(200).json({
        success: true,
        data: analytics,
      })
    } catch (error) {
      console.error("Error fetching branch analytics:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch analytics",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
