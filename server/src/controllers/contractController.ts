import type { Response } from "express"
import { ContractAlert } from "../models/ContractAlert"
import type { AuthenticatedRequest } from "../middleware/auth"

export class ContractController {
  // Get all contracts
  static async getContracts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { role, userId } = req.user
      const query: any = { org_id: req.org_id }

      // Employees see only their contracts
      if (role === "employee") {
        query.user_id = userId
      }

      const contracts = await ContractAlert.find(query).sort({ end_date: 1 })

      return res.status(200).json({
        success: true,
        message: "Contracts fetched successfully",
        data: contracts,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch contracts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get expiring contracts
  static async getExpiringContracts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const contracts = await ContractAlert.find({
        org_id: req.org_id,
        status: "expiring_soon",
      }).sort({ end_date: 1 })

      return res.status(200).json({
        success: true,
        message: "Expiring contracts fetched successfully",
        data: contracts,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch expiring contracts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Create contract
  static async createContract(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const contract = await ContractAlert.create({
        org_id: req.org_id,
        ...req.body,
      })

      return res.status(201).json({
        success: true,
        message: "Contract created successfully",
        data: contract,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create contract",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Acknowledge alert
  static async acknowledgeAlert(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { contractId } = req.params

      const contract = await ContractAlert.findOneAndUpdate(
        { _id: contractId, org_id: req.org_id },
        {
          $set: {
            is_acknowledged: true,
            acknowledged_by: req.user.userId,
            acknowledged_at: new Date(),
          },
        },
        { new: true }
      )

      if (!contract) {
        return res.status(404).json({ success: false, message: "Contract not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Alert acknowledged",
        data: contract,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to acknowledge alert",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Update renewal status
  static async updateRenewalStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      // Check role
      if (!['company_admin', 'hr', 'admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Insufficient permissions" })
      }

      const { contractId } = req.params
      const { renewal_status } = req.body

      const contract = await ContractAlert.findOneAndUpdate(
        { _id: contractId, org_id: req.org_id },
        {
          $set: {
            renewal_status,
            ...(renewal_status === "completed" && { status: "renewed" }),
          },
        },
        { new: true }
      )

      if (!contract) {
        return res.status(404).json({ success: false, message: "Contract not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Renewal status updated",
        data: contract,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update renewal status",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
