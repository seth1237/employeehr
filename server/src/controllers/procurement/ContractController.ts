import { Response } from "express"
import { AuthenticatedRequest } from "../../middleware/auth"
import { SupplierContract } from "../../models/SupplierContract"

export class ContractController {
  
  static async getContracts(req: AuthenticatedRequest, res: Response) {
    try {
      const contracts = await SupplierContract.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: contracts })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getContractById(req: AuthenticatedRequest, res: Response) {
    try {
      const contract = await SupplierContract.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!contract) return res.status(404).json({ success: false, message: "Contract not found" })
      return res.json({ success: true, data: contract })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createContract(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await SupplierContract.countDocuments({ org_id: req.org_id })
      const contractNumber = req.body.contractNumber || `CON-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`

      const contract = await SupplierContract.create({
        ...req.body,
        org_id: req.org_id,
        contractNumber,
        createdBy: req.user?._id,
        status: req.body.status || "draft"
      })

      return res.status(201).json({ success: true, data: contract })
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: "Contract number already exists." })
      }
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async updateContract(req: AuthenticatedRequest, res: Response) {
    try {
      const contract = await SupplierContract.findOneAndUpdate(
        { _id: req.params.id, org_id: req.org_id },
        { $set: req.body },
        { new: true }
      )
      
      if (!contract) return res.status(404).json({ success: false, message: "Contract not found" })
      
      return res.json({ success: true, data: contract })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }
}
