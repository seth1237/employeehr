import { Response } from "express"
import { AuthenticatedRequest } from "../../middleware/auth"
import { Supplier } from "../../models/Supplier"

export class SupplierController {
  
  // Get all suppliers for an organization
  static async getSuppliers(req: AuthenticatedRequest, res: Response) {
    try {
      const suppliers = await Supplier.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: suppliers })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Get a single supplier by ID
  static async getSupplierById(req: AuthenticatedRequest, res: Response) {
    try {
      const supplier = await Supplier.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" })
      return res.json({ success: true, data: supplier })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Create a new supplier
  static async createSupplier(req: AuthenticatedRequest, res: Response) {
    try {
      // Basic validation
      if (!req.body.name) {
        return res.status(400).json({ success: false, message: "Supplier name is required" })
      }

      const supplier = await Supplier.create({ 
        ...req.body, 
        org_id: req.org_id,
        createdBy: req.user?._id
      })
      return res.status(201).json({ success: true, data: supplier })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // Update an existing supplier
  static async updateSupplier(req: AuthenticatedRequest, res: Response) {
    try {
      const supplier = await Supplier.findOneAndUpdate(
        { _id: req.params.id, org_id: req.org_id },
        { $set: req.body },
        { new: true, runValidators: true }
      )
      
      if (!supplier) {
        return res.status(404).json({ success: false, message: "Supplier not found" })
      }
      
      return res.json({ success: true, data: supplier })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // Update supplier performance ratings (typically called automatically by GRN/Inspection)
  static async updatePerformance(req: AuthenticatedRequest, res: Response) {
    try {
      const { deliveryRating, qualityRating, riskRating } = req.body
      
      const supplier = await Supplier.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" })

      if (!supplier.performance) {
        supplier.performance = { deliveryRating: 0, qualityRating: 0, riskRating: "medium" }
      }

      // Simple moving average for ratings
      if (deliveryRating !== undefined) {
        supplier.performance.deliveryRating = supplier.performance.deliveryRating === 0 
          ? deliveryRating 
          : (supplier.performance.deliveryRating + deliveryRating) / 2
      }
      
      if (qualityRating !== undefined) {
        supplier.performance.qualityRating = supplier.performance.qualityRating === 0 
          ? qualityRating 
          : (supplier.performance.qualityRating + qualityRating) / 2
      }

      if (riskRating !== undefined) {
        supplier.performance.riskRating = riskRating
      }

      await supplier.save()
      return res.json({ success: true, data: supplier })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }
}
