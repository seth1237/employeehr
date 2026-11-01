import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Payroll } from "../models/Payroll"
import { User } from "../models/User"
import { Company } from "../models/Company"
import { postMonthPayrollToCashbook, postPayrollToCashbook } from "../services/cashBankingPosting.service"
import { CashTransaction } from "../models/CashTransaction"
import { computeKenyaStatutory, roundKes } from "../services/kenyaStatutory.service"

const STATUTORY_NAMES = new Set(["PAYE", "SHIF", "SHA", "NHIF", "NSSF", "Housing Levy"])

function buildPayrollFigures(input: {
    baseSalary: number
    bonus?: number
    otherBonusItems?: { name: string; amount: number }[]
    deductionItems?: { name: string; amount: number }[]
    standardDeductionOverrides?: Record<string, unknown>
    deductionsDisabled?: boolean
}) {
    const bonusTotal =
        Number(input.bonus || 0) +
        (input.otherBonusItems || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const gross = roundKes(Number(input.baseSalary || 0) + bonusTotal)
    const customItems = (input.deductionItems || []).filter((item) => !STATUTORY_NAMES.has(String(item.name)))
    const statutoryItems = input.deductionsDisabled
        ? []
        : computeKenyaStatutory(gross, input.standardDeductionOverrides || {}).items.map((item) => ({
            name: item.name,
            amount: item.amount,
        }))
    const deduction_items = [...statutoryItems, ...customItems]
    const total_deductions = roundKes(deduction_items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
    return {
        bonusTotal,
        gross,
        deduction_items,
        total_deductions,
        net_pay: roundKes(gross - total_deductions),
    }
}

export class PayrollController {
    // Generate Payroll (Admin)
    static async generate(req: AuthenticatedRequest, res: Response) {
        try {
            const { user_id, month, bonus = 0, other_bonus_items = [], deduction_items = [], base_salary, standard_deduction_overrides = {}, deductions_disabled = false } = req.body
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

            const figures = buildPayrollFigures({
                baseSalary: salaryToUse,
                bonus,
                otherBonusItems: other_bonus_items,
                deductionItems: deduction_items,
                standardDeductionOverrides: standard_deduction_overrides,
                deductionsDisabled: Boolean(deductions_disabled),
            })

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
                deduction_items: figures.deduction_items,
                standard_deduction_overrides,
                deductions_disabled: Boolean(deductions_disabled),
                total_deductions: figures.total_deductions,
                net_pay: figures.net_pay,
                status: 'draft'
            })

            res.status(201).json({
                success: true,
                data: payroll,
                message: "Payslip saved as draft. Mark it processed, then paid after money leaves the bank.",
            })
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
            const { base_salary, bonus, other_bonus_items, deduction_items, standard_deduction_overrides, deductions_disabled, status } = req.body
            const actorId = req.user?.userId

            const payroll = await Payroll.findById(id)
            if (!payroll) {
                return res.status(404).json({ success: false, message: "Payroll record not found" })
            }

            const previousStatus = payroll.status

            // Update fields if provided
            if (base_salary !== undefined) payroll.base_salary = Number(base_salary)
            if (bonus !== undefined) payroll.bonus = Number(bonus)
            if (other_bonus_items !== undefined) payroll.other_bonus_items = other_bonus_items
            if (standard_deduction_overrides !== undefined) payroll.standard_deduction_overrides = standard_deduction_overrides
            if (deductions_disabled !== undefined) payroll.deductions_disabled = Boolean(deductions_disabled)
            if (status) payroll.status = status

            const figures = buildPayrollFigures({
                baseSalary: Number(payroll.base_salary),
                bonus: Number(payroll.bonus || 0),
                otherBonusItems: payroll.other_bonus_items as any,
                deductionItems: deduction_items !== undefined ? deduction_items : (payroll.deduction_items as any),
                standardDeductionOverrides: payroll.standard_deduction_overrides as any,
                deductionsDisabled: Boolean(payroll.deductions_disabled),
            })
            payroll.deduction_items = figures.deduction_items
            payroll.total_deductions = figures.total_deductions
            payroll.net_pay = figures.net_pay

            await payroll.save()

            // When a payslip is marked paid, cash leaves bank (default) and can be reconciled later
            if (
                payroll.org_id &&
                actorId &&
                payroll.status === "paid" &&
                previousStatus !== "paid"
            ) {
                const employee = await User.findById(payroll.user_id).select("firstName lastName")
                const employeeName = employee
                    ? [employee.firstName, employee.lastName].filter(Boolean).join(" ")
                    : String(payroll.user_id)

                try {
                    const monthPosted = await CashTransaction.findOne({
                        org_id: String(payroll.org_id),
                        sourceType: "payroll",
                        sourceId: `payroll-month:${payroll.month}`,
                    }).lean()
                    if (!monthPosted) {
                        await postPayrollToCashbook({
                            orgId: String(payroll.org_id),
                            userId: String(actorId),
                            payroll: {
                                _id: payroll._id,
                                net_pay: payroll.net_pay,
                                month: payroll.month,
                                user_id: String(payroll.user_id),
                                status: payroll.status,
                                paymentMethod: "bank",
                                employeeName,
                            },
                        })
                    }
                } catch (cashbookError: any) {
                    payroll.status = previousStatus
                    await payroll.save()
                    throw cashbookError
                }
            }

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
            const role = String(req.user?.role || "")
            const canViewAny = ["company_admin", "hr", "super_admin"].includes(role)
            if (!canViewAny && payslip.user_id.toString() !== user_id) {
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
            const page = Math.max(1, Number(req.query.page) || 1)
            const limit = Math.min(500, Math.max(1, Number(req.query.limit) || (month ? 200 : 25)))

            const [payrolls, total] = await Promise.all([
                Payroll.find(query).sort({ month: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
                Payroll.countDocuments(query),
            ])
            res.status(200).json({
                success: true,
                data: payrolls,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    static async generateBulk(req: AuthenticatedRequest, res: Response) {
        try {
            const org_id = req.user?.org_id
            const { month } = req.body
            if (!org_id || !month) {
                return res.status(400).json({ success: false, message: "month is required" })
            }

            const employees = await User.find({
                org_id,
                status: { $nin: ["terminated", "alumni", "inactive"] },
                role: { $nin: ["portal_client", "super_admin", "pos_cashier"] },
                salary: { $gt: 0 },
            }).select("_id salary firstName lastName")

            const created: string[] = []
            const skipped: string[] = []

            for (const employee of employees) {
                const existing = await Payroll.findOne({ org_id, user_id: String(employee._id), month })
                if (existing) {
                    skipped.push(String(employee._id))
                    continue
                }
                const figures = buildPayrollFigures({
                    baseSalary: Number(employee.salary),
                    bonus: 0,
                    otherBonusItems: [],
                    deductionItems: [],
                    deductionsDisabled: false,
                })
                await Payroll.create({
                    org_id,
                    user_id: String(employee._id),
                    month,
                    base_salary: Number(employee.salary),
                    bonus: 0,
                    other_bonus_items: [],
                    deduction_items: figures.deduction_items,
                    total_deductions: figures.total_deductions,
                    net_pay: figures.net_pay,
                    status: "draft",
                })
                created.push(String(employee._id))
            }

            return res.status(201).json({
                success: true,
                message: `Created ${created.length} draft payslips. Mark them processed, then paid after payout.`,
                data: { created: created.length, skipped: skipped.length },
            })
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message })
        }
    }

    static async markMonthPaid(req: AuthenticatedRequest, res: Response) {
        try {
            const org_id = req.user?.org_id
            const month = String(req.body?.month || "")
            if (!org_id || !month) {
                return res.status(400).json({ success: false, message: "month is required" })
            }

            const unpaid = await Payroll.find({ org_id, month, status: { $ne: "paid" } })
            if (!unpaid.length) {
                return res.status(400).json({ success: false, message: "No unpaid payroll records for that month" })
            }

            for (const row of unpaid) {
                row.status = "paid"
                await row.save()
            }

            const paid = await Payroll.find({ org_id, month, status: "paid" }).lean()
            const totalNet = paid.reduce((sum, row) => sum + Number(row.net_pay || 0), 0)
            const cashbook = await postMonthPayrollToCashbook({
                orgId: org_id,
                userId: String(req.user?.userId || "system"),
                month,
                amount: totalNet,
                employeeCount: paid.length,
            })

            return res.json({
                success: true,
                message: `Marked ${unpaid.length} payslips paid. Month bank payment is KES ${totalNet.toLocaleString()}.`,
                data: {
                    month,
                    paidCount: unpaid.length,
                    employeeCount: paid.length,
                    totalNet,
                    cashbookId: cashbook?._id,
                },
            })
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message })
        }
    }
}
