import { Response } from "express"
import { AuthenticatedRequest } from "../../middleware/auth"
import { DepartmentBudget } from "../../models/DepartmentBudget"

export class BudgetController {
  
  static async getBudgets(req: AuthenticatedRequest, res: Response) {
    try {
      const year = req.query.year || new Date().getFullYear().toString()
      const budgets = await DepartmentBudget.find({ 
        org_id: req.org_id,
        financialYear: { $regex: year as string }
      }).sort({ department: 1 })
      
      return res.json({ success: true, data: budgets })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getBudgetById(req: AuthenticatedRequest, res: Response) {
    try {
      const budget = await DepartmentBudget.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!budget) return res.status(404).json({ success: false, message: "Budget not found" })
      return res.json({ success: true, data: budget })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createBudget(req: AuthenticatedRequest, res: Response) {
    try {
      const { department, costCenter, financialYear, totalAllocated } = req.body
      
      // Calculate initial balance
      const balance = totalAllocated

      const budget = await DepartmentBudget.create({
        ...req.body,
        org_id: req.org_id,
        balance,
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      })

      return res.status(201).json({ success: true, data: budget })
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: "A budget for this department and year already exists." })
      }
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async updateBudget(req: AuthenticatedRequest, res: Response) {
    try {
      const budget = await DepartmentBudget.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!budget) return res.status(404).json({ success: false, message: "Budget not found" })

      // Only allow updating certain fields (like totalAllocated)
      if (req.body.totalAllocated !== undefined) {
        budget.totalAllocated = req.body.totalAllocated
        // Recalculate balance
        budget.balance = budget.totalAllocated - (budget.totalCommitted + budget.totalSpent)
        
        // Update status based on new balance
        if (budget.balance <= 0 && budget.status === "active") {
          budget.status = "exhausted"
        } else if (budget.balance > 0 && budget.status === "exhausted") {
          budget.status = "active"
        }
      }

      if (req.body.status) budget.status = req.body.status
      if (req.body.alerts) budget.alerts = { ...budget.alerts, ...req.body.alerts }
      
      budget.updatedBy = req.user?._id || ""

      await budget.save()
      return res.json({ success: true, data: budget })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }
}
