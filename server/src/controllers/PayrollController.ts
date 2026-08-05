import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Payroll } from "../models/Payroll"
import { User } from "../models/User"
import { Company } from "../models/Company"

export class PayrollController {
    // Generate Payroll (Admin)
    static async generate(req: AuthenticatedRequest, res: Response) {
        try {
            const { user_id, month, bonus = 0, other_bonus_items = [], deduction_items = [], base_salary, standard_deduction_overrides = {} } = req.body
            const org_id = req.user?.org_id

            const user = await User.findById(user_id)
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" })
            }

            // Use provided base_salary or fall back to user profile salary
            let salaryToUse = Number(base_salary)
            if (!salaryToUse && user.salary) {
                salaryToUse = user.salary
            }

            if (!salaryToUse) {
                return res.status(400).json({ success: false, message: "No salary provided" })
            }

            const total_deductions = deduction_items.reduce((sum: number, item: any) => sum + Number(item.amount), 0)
            const net_pay = salaryToUse + Number(bonus) - total_deductions

            // Check if payroll already exists for this user/month
            const existing = await Payroll.findOne({ org_id, user_id, month })
            if (existing) {
                return res.status(409).json({ success: false, message: "Payroll already exists for this month. Please edit instead." })
            }

            const payroll = await Payroll.create({
                org_id,
                user_id,
                month,
                base_salary: salaryToUse,
                bonus: Number(bonus),
                other_bonus_items,
                deduction_items,
                standard_deduction_overrides,
                total_deductions,
                net_pay,
                status: 'processed'
            })

            res.status(201).json({ success: true, data: payroll })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    // Update Payroll
    static async update(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params
            const { base_salary, bonus, other_bonus_items, deduction_items, standard_deduction_overrides, status } = req.body

            const payroll = await Payroll.findById(id)
            if (!payroll) {
                return res.status(404).json({ success: false, message: "Payroll record not found" })
            }

            // Update fields if provided
            if (base_salary !== undefined) payroll.base_salary = Number(base_salary)
            if (bonus !== undefined) payroll.bonus = Number(bonus)
            if (other_bonus_items !== undefined) payroll.other_bonus_items = other_bonus_items
            if (standard_deduction_overrides !== undefined) payroll.standard_deduction_overrides = standard_deduction_overrides
            if (deduction_items !== undefined) {
                payroll.deduction_items = deduction_items
                payroll.total_deductions = deduction_items.reduce((sum: number, item: any) => sum + Number(item.amount), 0)
            }
            if (status) payroll.status = status

            // Recalculate net pay
            payroll.net_pay = payroll.base_salary + payroll.bonus - payroll.total_deductions

            await payroll.save()

            res.status(200).json({ success: true, data: payroll })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    // Get My Payslips
    static async getMyPayslips(req: AuthenticatedRequest, res: Response) {
        try {
            const user_id = req.user?.userId
            const org_id = req.user?.org_id
            
            const payslips = await Payroll.find({ user_id, org_id })
                .sort({ month: -1 })
                .lean()
            
            // Populate user details for each payslip
            const payslipsWithUser = await Promise.all(
                payslips.map(async (payslip) => {
                    const user = await User.findById(payslip.user_id).select('firstName lastName employee_id email position department')
                    return {
                        ...payslip,
                        user
                    }
                })
            )
            
            res.status(200).json({ success: true, data: payslipsWithUser })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }
    
    // Get Payslip Details with Company Info (for download/view)
    static async getPayslipDetails(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params
            const user_id = req.user?.userId
            const org_id = req.user?.org_id
            
            const payslip = await Payroll.findOne({ _id: id, org_id }).lean()
            
            if (!payslip) {
                return res.status(404).json({ success: false, message: "Payslip not found" })
            }
            
            // Verify user can only access their own payslip
            if (payslip.user_id.toString() !== user_id) {
                return res.status(403).json({ success: false, message: "Access denied" })
            }
            
            // Get user details
            const user = await User.findById(payslip.user_id).select('firstName lastName employee_id email position department')
            
            // Get company details
            const company = await Company.findById(org_id).select('name email phone address city state country logo').lean()
            
            res.status(200).json({ 
                success: true, 
                data: {
                    payslip,
                    user,
                    company
                }
            })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    // Get Company Payrolls (Admin)
    static async getAll(req: AuthenticatedRequest, res: Response) {
        try {
            const org_id = req.user?.org_id
            const { month } = req.query

            const query: any = { org_id }
            if (month) query.month = month

            const payrolls = await Payroll.find(query).sort({ month: -1 })
            res.status(200).json({ success: true, data: payrolls })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }
}
