import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { LeaveRequest } from "../models/LeaveRequest"
import { LeaveBalance } from "../models/LeaveBalance"
import { User } from "../models/User"
import { Notification } from "../models/Notification"
import emailService from "../services/email.service"
import { countLeaveDays } from "../lib/leaveDays"

const ANNUAL_CARRY_CAP = 5

async function ensureLeaveBalance(org_id: string, user_id: string, year: number) {
    let balance = await LeaveBalance.findOne({ org_id, user_id, year })
    if (balance) return balance

    const previous = await LeaveBalance.findOne({ org_id, user_id, year: year - 1 })
    const unusedAnnual = previous
        ? Math.max(0, Number(previous.annual_total || 0) - Number(previous.annual_used || 0))
        : 0
    const carry = Math.min(ANNUAL_CARRY_CAP, unusedAnnual)

    balance = await LeaveBalance.create({
        org_id,
        user_id,
        year,
        annual_total: 21 + carry,
    })
    return balance
}

function remainingForType(balance: any, type: string): { remaining: number; label: string } {
    if (type === "Annual") return { remaining: Number(balance.annual_total) - Number(balance.annual_used), label: "annual" }
    if (type === "Sick") return { remaining: Number(balance.sick_total) - Number(balance.sick_used), label: "sick" }
    if (type === "Maternity") return { remaining: Number(balance.maternity_total || 0) - Number(balance.maternity_used || 0), label: "maternity" }
    if (type === "Paternity") return { remaining: Number(balance.paternity_total || 0) - Number(balance.paternity_used || 0), label: "paternity" }
    return { remaining: Number.POSITIVE_INFINITY, label: type.toLowerCase() }
}

async function populateLeaveUsers(requests: any[]) {
    const userIds = [...new Set(requests.map((row) => String(row.user_id)))]
    const users = await User.find({ _id: { $in: userIds } }).select("firstName lastName email avatar")
    const map = new Map(users.map((user) => [String(user._id), user]))
    return requests.map((row) => {
        const plain = typeof row.toObject === "function" ? row.toObject() : row
        const user = map.get(String(plain.user_id))
        return {
            ...plain,
            user: user
                ? { firstName: user.firstName, lastName: user.lastName, email: user.email, avatar: user.avatar }
                : null,
        }
    })
}

export class LeaveController {
    // Apply for leave
    static async apply(req: AuthenticatedRequest, res: Response) {
        try {
            const { type, startDate, endDate, reason } = req.body
            const user_id = req.user?.userId
            const org_id = req.user?.org_id

            if (!user_id || !org_id) {
                return res.status(401).json({ success: false, message: "Unauthorized" })
            }

            const start = new Date(startDate)
            const end = new Date(endDate)
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
                return res.status(400).json({ success: false, message: "Enter a valid leave date range" })
            }
            const diffDays = countLeaveDays(type, start, end)
            if (diffDays <= 0) {
                return res.status(400).json({ success: false, message: "This date range has no leave days to deduct" })
            }

            const currentYear = new Date().getFullYear()
            const balance = await ensureLeaveBalance(org_id, user_id, currentYear)
            const { remaining, label } = remainingForType(balance, type)
            if (Number.isFinite(remaining) && remaining < diffDays) {
                return res.status(400).json({ success: false, message: `Insufficient ${label} leave balance` })
            }

            const leaveRequest = await LeaveRequest.create({
                org_id,
                user_id,
                type,
                startDate,
                endDate,
                reason,
                status: "pending",
            })

            res.status(201).json({ success: true, data: leaveRequest })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    // Get my requests
    static async getMyRequests(req: AuthenticatedRequest, res: Response) {
        try {
            const user_id = req.user?.userId
            const org_id = req.user?.org_id || req.org_id
            const requests = await LeaveRequest.find({ user_id, ...(org_id ? { org_id } : {}) }).sort({ createdAt: -1 })
            res.status(200).json({ success: true, data: requests })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    // Get balance
    static async getBalance(req: AuthenticatedRequest, res: Response) {
        try {
            const user_id = req.user?.userId
            const org_id = req.user?.org_id || req.org_id
            const currentYear = new Date().getFullYear()
            let balance = user_id && org_id
                ? await ensureLeaveBalance(org_id, user_id, currentYear)
                : await LeaveBalance.findOne({ user_id, ...(org_id ? { org_id } : {}), year: currentYear })

            res.status(200).json({ success: true, data: balance })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    // Manager: Get team requests
    static async getTeamRequests(req: AuthenticatedRequest, res: Response) {
        try {
            const manager_id = req.user?.userId

            // Find users managed by this user
            const teamMembers = await User.find({ manager_id }).select('_id')
            const teamIds = teamMembers.map(u => u._id.toString())

            const requests = await LeaveRequest.find({
                user_id: { $in: teamIds },
                status: 'pending'
            }).sort({ createdAt: -1 })

            res.status(200).json({ success: true, data: await populateLeaveUsers(requests) })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    // Approve/Reject
    static async updateStatus(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params
            const { status, comment } = req.body
            const manager_id = req.user?.userId

            const request = await LeaveRequest.findById(id)
            if (!request) {
                return res.status(404).json({ success: false, message: "Request not found" })
            }

            // Verify manager (skip for simplicity or check if req.user is super_admin/hr)
            // implementation...

            request.status = status
            request.manager_id = manager_id
            request.manager_comment = comment
            await request.save()

            if (status === 'approved') {
                const diffDays = countLeaveDays(request.type, new Date(request.startDate), new Date(request.endDate))
                const balance = await ensureLeaveBalance(String(request.org_id), String(request.user_id), new Date().getFullYear())
                if (request.type === 'Annual') balance.annual_used += diffDays
                else if (request.type === 'Sick') balance.sick_used += diffDays
                else if (request.type === 'Maternity') balance.maternity_used = Number(balance.maternity_used || 0) + diffDays
                else if (request.type === 'Paternity') balance.paternity_used = Number(balance.paternity_used || 0) + diffDays
                else if (request.type === 'Unpaid') balance.unpaid_used += diffDays
                await balance.save()
            }

            const employee = await User.findById(request.user_id).select("firstName lastName email")
            const title = status === "approved" ? "Leave approved" : "Leave rejected"
            const message = `Your ${request.type} leave from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} was ${status}.${comment ? ` ${comment}` : ""}`
            await Notification.create({
                org_id: request.org_id,
                user_id: String(request.user_id),
                title,
                message,
                type: status === "approved" ? "achievement" : "alert",
                related_entity_type: "leave",
                related_entity_id: String(request._id),
            })
            if (employee?.email) {
                try {
                    await emailService.sendEmail({
                        to: employee.email,
                        subject: title,
                        companyId: String(request.org_id),
                        html: `<p>Hello ${employee.firstName},</p><p>${message}</p>`,
                    })
                } catch {
                    // In-app notification is enough if email fails.
                }
            }

            res.status(200).json({ success: true, data: request })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }
    // Admin: Get all requests (for full admin view)
    static async getAllRequests(req: AuthenticatedRequest, res: Response) {
        try {
            const org_id = req.user?.org_id

            // This relies on user_id schema definition being Ref if using populate directly, 
            // OR simple manual lookup. For improved admin table we will populate user info manually
            // if generic populate fails (as seen in team requests comment).
            // However, for admin table, we should allow fetching all requests.

            const requests = await LeaveRequest.find({ org_id }).sort({ createdAt: -1 })

            // Manually populate user info for now to match current schema capabilities
            // assuming user_id stores the string ID.
            const userIds = requests.map(r => r.user_id)
            const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email')

            const populatedRequests = requests.map(req => {
                const user = users.find(u => u._id.toString() === req.user_id)
                return {
                    ...req.toObject(),
                    user: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : null
                }
            })

            res.status(200).json({ success: true, data: populatedRequests })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    /** Org-wide leave balances for the current (or queried) year */
    static async getAllBalances(req: AuthenticatedRequest, res: Response) {
        try {
            const org_id = req.user?.org_id || req.org_id
            if (!org_id) {
                return res.status(401).json({ success: false, message: "Unauthorized" })
            }
            const year = Number(req.query.year) || new Date().getFullYear()
            const users = await User.find({
                org_id,
                status: { $nin: ["terminated", "alumni", "inactive"] },
            }).select("firstName lastName email department position status")

            const balances = await LeaveBalance.find({ org_id, year })
            const balanceMap = new Map(
                balances.map((b) => [String(b.user_id), b.toObject()]),
            )

            const data = []
            for (const user of users) {
                let balance = balanceMap.get(String(user._id))
                if (!balance) {
                    const created = await LeaveBalance.create({
                        org_id,
                        user_id: String(user._id),
                        year,
                    })
                    balance = created.toObject()
                }
                data.push({
                    user: {
                        _id: String(user._id),
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        department: user.department,
                        position: user.position,
                        status: user.status,
                    },
                    balance,
                })
            }

            return res.status(200).json({ success: true, data, year })
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message })
        }
    }

    /** Adjust leave entitlements / used days for an employee */
    static async updateBalance(req: AuthenticatedRequest, res: Response) {
        try {
            const org_id = req.user?.org_id || req.org_id
            if (!org_id) {
                return res.status(401).json({ success: false, message: "Unauthorized" })
            }
            const { userId } = req.params
            const year = Number(req.body?.year) || new Date().getFullYear()
            const allowed = [
                "annual_total",
                "annual_used",
                "sick_total",
                "sick_used",
                "maternity_total",
                "maternity_used",
                "paternity_total",
                "paternity_used",
                "unpaid_used",
            ] as const

            let balance = await LeaveBalance.findOne({
                org_id,
                user_id: userId,
                year,
            })
            if (!balance) {
                balance = await LeaveBalance.create({
                    org_id,
                    user_id: userId,
                    year,
                })
            }

            for (const key of allowed) {
                if (req.body?.[key] !== undefined && req.body?.[key] !== null) {
                    const value = Number(req.body[key])
                    if (Number.isFinite(value) && value >= 0) {
                        ;(balance as any)[key] = value
                    }
                }
            }
            await balance.save()

            return res.status(200).json({ success: true, data: balance })
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message })
        }
    }

    /** Pending + approved leave for team calendar view */
    static async getCalendar(req: AuthenticatedRequest, res: Response) {
        try {
            const org_id = req.user?.org_id || req.org_id
            if (!org_id) {
                return res.status(401).json({ success: false, message: "Unauthorized" })
            }
            const from = req.query.from
                ? new Date(String(req.query.from))
                : new Date(new Date().getFullYear(), 0, 1)
            const to = req.query.to
                ? new Date(String(req.query.to))
                : new Date(new Date().getFullYear(), 11, 31)

            const requests = await LeaveRequest.find({
                org_id,
                status: { $in: ["pending", "approved"] },
                startDate: { $lte: to },
                endDate: { $gte: from },
            }).sort({ startDate: 1 })

            const userIds = [...new Set(requests.map((r) => r.user_id))]
            const users = await User.find({ _id: { $in: userIds } }).select(
                "firstName lastName department",
            )
            const userMap = new Map(
                users.map((u) => [String(u._id), u]),
            )

            const data = requests.map((r) => {
                const user = userMap.get(String(r.user_id))
                return {
                    ...r.toObject(),
                    userName: user
                        ? `${user.firstName} ${user.lastName}`
                        : "Unknown",
                    department: user?.department || "",
                }
            })

            return res.status(200).json({ success: true, data })
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message })
        }
    }
}
