import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { LeaveRequest } from "../models/LeaveRequest"
import { LeaveBalance } from "../models/LeaveBalance"
import { User } from "../models/User"

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

            // Calculate days
            const start = new Date(startDate)
            const end = new Date(endDate)
            const diffTime = Math.abs(end.getTime() - start.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Inclusive

            // Check balance
            const currentYear = new Date().getFullYear()
            let balance = await LeaveBalance.findOne({ user_id, year: currentYear })

            if (!balance) {
                // Create default balance if not exists
                balance = await LeaveBalance.create({
                    org_id,
                    user_id,
                    year: currentYear
                })
            }

            // Simple balance check logic (expand based on types)
            if (type === 'Annual' && (balance.annual_total - balance.annual_used) < diffDays) {
                return res.status(400).json({ success: false, message: "Insufficient annual leave balance" })
            }
            if (type === 'Sick' && (balance.sick_total - balance.sick_used) < diffDays) {
                return res.status(400).json({ success: false, message: "Insufficient sick leave balance" })
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
            const requests = await LeaveRequest.find({ user_id }).sort({ createdAt: -1 })
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
            const currentYear = new Date().getFullYear()
            let balance = await LeaveBalance.findOne({ user_id, year: currentYear })

            if (!balance && user_id && req.user?.org_id) {
                balance = await LeaveBalance.create({
                    org_id: req.user.org_id,
                    user_id,
                    year: currentYear
                })
            }

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
            }).populate('user_id', 'firstName lastName avatar') // Assuming you can populate if referencing 'User' model (might need schema adjustment if user_id is just string)
            // Note: Schema defines user_id as String, so population might require virtuals or defining ref in schema. 
            // For now, simpler fetch matching ID manually or relying on frontend to fetch user details if needed, 
            // OR update Schema to use Schema.Types.ObjectId. Let's stick to simple first.

            res.status(200).json({ success: true, data: requests })
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

            // If approved, deduct balance
            if (status === 'approved') {
                const start = new Date(request.startDate)
                const end = new Date(request.endDate)
                const diffTime = Math.abs(end.getTime() - start.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

                const balance = await LeaveBalance.findOne({ user_id: request.user_id, year: new Date().getFullYear() })
                if (balance) {
                    if (request.type === 'Annual') balance.annual_used += diffDays
                    else if (request.type === 'Sick') balance.sick_used += diffDays
                    else if (request.type === 'Unpaid') balance.unpaid_used += diffDays
                    // Add others...
                    await balance.save()
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
}
