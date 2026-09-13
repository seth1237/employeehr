import { Response } from "express"
import { AuthenticatedRequest } from "../../middleware/auth"
import { PurchaseRequest } from "../../models/PurchaseRequest"
import { DepartmentBudget } from "../../models/DepartmentBudget"
import { User } from "../../models/User"

export class PurchaseRequestController {
  
  // Get all PRs
  static async getRequests(req: AuthenticatedRequest, res: Response) {
    try {
      // Employees only see their own requests unless they are admins/procurement
      const filter: any = { org_id: req.org_id }
      
      const user = await User.findById(req.user?._id)
      const role = user?.role || ""
      
      if (role === "employee" || role === "sales_rep") {
        filter.requestedBy = req.user?._id
      } else if (role === "manager") {
        // Managers see their own department's PRs
        if (user?.department) {
          filter.$or = [
            { requestedBy: req.user?._id },
            { department: user.department }
          ]
        }
      }

      const requests = await PurchaseRequest.find(filter).sort({ createdAt: -1 })
      return res.json({ success: true, data: requests })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Get single PR
  static async getRequestById(req: AuthenticatedRequest, res: Response) {
    try {
      const request = await PurchaseRequest.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!request) return res.status(404).json({ success: false, message: "Purchase Request not found" })
      return res.json({ success: true, data: request })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Create PR
  static async createRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const { items, department, costCenter } = req.body
      
      // Calculate total
      const totalEstimatedAmount = items.reduce((sum: number, item: any) => {
        return sum + (Number(item.quantity) * Number(item.estimatedUnitPrice || 0))
      }, 0)

      const count = await PurchaseRequest.countDocuments({ org_id: req.org_id })
      const requestNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`

      // Optional: Check Budget if Cost Center is provided
      let budgetValidated = false
      let reservedAmount = 0
      
      if (department && costCenter) {
        const currentYear = new Date().getFullYear().toString()
        const budget = await DepartmentBudget.findOne({ 
          org_id: req.org_id, 
          department, 
          costCenter,
          financialYear: { $regex: currentYear } 
        })
        
        if (budget) {
          if (budget.balance >= totalEstimatedAmount) {
            budgetValidated = true
            // We don't reserve yet until it's submitted for approval
          }
        }
      }

      const request = await PurchaseRequest.create({
        ...req.body,
        org_id: req.org_id,
        requestNumber,
        requestedBy: req.user?._id,
        totalEstimatedAmount,
        budgetValidated,
        status: "draft"
      })

      return res.status(201).json({ success: true, data: request })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // Submit PR for Approval Workflow
  static async submitForApproval(req: AuthenticatedRequest, res: Response) {
    try {
      const request = await PurchaseRequest.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!request) return res.status(404).json({ success: false, message: "Request not found" })
      if (request.status !== "draft") return res.status(400).json({ success: false, message: "Only draft requests can be submitted" })

      // Define standard approval hierarchy based on amount
      const approvers = []
      
      // We'd typically fetch actual User IDs here based on roles. For demo, we use placeholders.
      if (request.totalEstimatedAmount <= 10000) {
        approvers.push({ role: "manager", status: "pending" })
      } else if (request.totalEstimatedAmount <= 100000) {
        approvers.push({ role: "manager", status: "pending" })
        approvers.push({ role: "admin", status: "pending" }) // Procurement Manager
      } else {
        approvers.push({ role: "manager", status: "pending" })
        approvers.push({ role: "admin", status: "pending" }) // Procurement Manager
        approvers.push({ role: "company_admin", status: "pending" }) // Finance/Director
      }

      request.status = "pending_approval"
      request.approvers = approvers as any
      request.approvalStage = 0

      // Reserve Budget
      if (request.department && request.costCenter) {
        const currentYear = new Date().getFullYear().toString()
        const budget = await DepartmentBudget.findOne({ 
          org_id: req.org_id, 
          department: request.department, 
          costCenter: request.costCenter,
          financialYear: { $regex: currentYear }
        })
        
        if (budget) {
          budget.totalCommitted += request.totalEstimatedAmount
          await budget.save()
          request.budgetValidated = true
          request.reservedAmount = request.totalEstimatedAmount
        }
      }

      await request.save()
      return res.json({ success: true, data: request })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Action an approval step
  static async processApproval(req: AuthenticatedRequest, res: Response) {
    try {
      const { action, comments } = req.body // "approve" or "reject"
      const request = await PurchaseRequest.findOne({ _id: req.params.id, org_id: req.org_id })
      
      if (!request) return res.status(404).json({ success: false, message: "Request not found" })
      if (request.status !== "pending_approval") return res.status(400).json({ success: false, message: "Request is not pending approval" })

      const currentStage = request.approvalStage || 0
      
      if (currentStage >= request.approvers.length) {
        return res.status(400).json({ success: false, message: "Approval workflow already completed" })
      }

      const approverStep = request.approvers[currentStage]
      
      if (action === "approve") {
        approverStep.status = "approved"
        approverStep.userId = req.user?._id || ""
        approverStep.date = new Date()
        approverStep.comments = comments

        // Check if there are more stages
        if (currentStage + 1 < request.approvers.length) {
          request.approvalStage = currentStage + 1
        } else {
          // Fully approved
          request.status = "approved"
          request.approvedBy = req.user?._id
          request.approvalDate = new Date()
        }
      } else if (action === "reject") {
        approverStep.status = "rejected"
        approverStep.userId = req.user?._id || ""
        approverStep.date = new Date()
        approverStep.comments = comments
        
        request.status = "rejected"
        request.rejectionReason = comments

        // Release budget if reserved
        if (request.reservedAmount && request.department && request.costCenter) {
          const currentYear = new Date().getFullYear().toString()
          const budget = await DepartmentBudget.findOne({ 
            org_id: req.org_id, 
            department: request.department, 
            costCenter: request.costCenter,
            financialYear: { $regex: currentYear }
          })
          
          if (budget) {
            budget.totalCommitted -= request.reservedAmount
            // Prevent negative commitment
            if (budget.totalCommitted < 0) budget.totalCommitted = 0
            await budget.save()
            request.reservedAmount = 0
          }
        }
      }

      await request.save()
      return res.json({ success: true, data: request })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}
