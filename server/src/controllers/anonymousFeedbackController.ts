import type { Request, Response } from "express"
import { FeedbackPool } from "../models/FeedbackPool"
import { PoolMember } from "../models/PoolMember"
import { FeedbackResponse } from "../models/FeedbackResponse"
import { User } from "../models/User"
import { Company } from "../models/Company"
import { AnonymousFeedbackService } from "../services/anonymousFeedbackService"

export class AnonymousFeedbackController {
    // ==================== ADMIN ENDPOINTS (Authenticated) ====================

    /**
     * Create a new feedback pool
     * POST /api/feedback-360/pools
     */
    static async createFeedbackPool(req: Request, res: Response) {
        try {
            const { name, description, participants, form_config, expires_at } = req.body
            const org_id = (req as any).org_id
            const user_id = (req as any).user?.userId

            // Validation
            if (!name || !participants || !Array.isArray(participants)) {
                return res.status(400).json({
                    success: false,
                    message: "Pool name and participants are required",
                })
            }

            if (participants.length !== 5) {
                return res.status(400).json({
                    success: false,
                    message: "Pool must have exactly 5 members",
                })
            }

            // Validate each participant has required fields
            for (const participant of participants) {
                if (!participant.name || !participant.department) {
                    return res.status(400).json({
                        success: false,
                        message: "Each participant must have a name and department",
                    })
                }
            }

            if (!form_config || !form_config.questions || form_config.questions.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Form configuration with questions is required",
                })
            }

            // Create pool
            const pool = new FeedbackPool({
                org_id,
                name,
                description,
                form_config,
                created_by: user_id,
                expires_at: expires_at ? new Date(expires_at) : undefined,
            })

            await pool.save()

            // Fetch company to get slug for public link
            const company = await Company.findOne({ _id: org_id })
            const companySlug = company?.slug || 'company'
            
            // Generate public link base URL
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const publicLinkBase = `${baseUrl}/feedback/${companySlug}/${pool._id}`

            // Create pool members with anonymous tokens
            const poolMembers = []
            let memberIndex = 1
            for (const participant of participants) {
                // Generate unique employee_id for custom participants
                const employee_id = participant.employee_id || `custom_${pool._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                // Generate email from name and department for internal use
                const generatedEmail = `${participant.name.toLowerCase().replace(/\s+/g, '.')}@${participant.department.toLowerCase().replace(/\s+/g, '')}.internal`
                
                const token = AnonymousFeedbackService.generateAnonymousToken(
                    pool._id.toString(),
                    employee_id,
                    org_id
                )
                const tokenHash = AnonymousFeedbackService.hashToken(token)

                const poolMember = new PoolMember({
                    pool_id: pool._id.toString(),
                    employee_id: employee_id,
                    employee_email: generatedEmail,
                    employee_name: `${participant.name} (${participant.department})`,
                    submission_count: 0,
                    anonymous_token_hash: tokenHash,
                    token_generated_at: new Date(),
                })

                await poolMember.save()
                poolMembers.push({
                    ...poolMember.toObject(),
                    anonymous_token: token,
                    public_link: `${publicLinkBase}?token=${token}&member=${memberIndex}`,
                    member_index: memberIndex,
                })
                memberIndex++
            }

            res.status(201).json({
                success: true,
                message: "Feedback pool created successfully",
                data: {
                    pool,
                    members: poolMembers,
                    public_link_base: publicLinkBase,
                    company_slug: companySlug,
                },
            })
        } catch (error: any) {
            console.error("Error creating feedback pool:", error)
            res.status(500).json({
                success: false,
                message: "Failed to create feedback pool",
                error: error.message,
            })
        }
    }

    /**
     * Get all feedback pools for the organization
     * GET /api/feedback-360/pools
     */
    static async getFeedbackPools(req: Request, res: Response) {
        try {
            const org_id = (req as any).org_id
            const { status } = req.query

            const query: any = { org_id }
            if (status) {
                query.status = status
            }

            const pools = await FeedbackPool.find(query).sort({ createdAt: -1 })

            // Get completion status for each pool
            const poolsWithStatus = await Promise.all(
                pools.map(async (pool) => {
                    const completionStatus = await AnonymousFeedbackService.getPoolCompletionStatus(
                        pool._id.toString()
                    )
                    return {
                        ...pool.toObject(),
                        completion_status: completionStatus,
                    }
                })
            )

            res.status(200).json({
                success: true,
                data: poolsWithStatus,
            })
        } catch (error: any) {
            console.error("Error fetching feedback pools:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch feedback pools",
                error: error.message,
            })
        }
    }

    /**
     * Get pool details with members
     * GET /api/feedback-360/pools/:poolId
     */
    static async getPoolDetails(req: Request, res: Response) {
        try {
            const { poolId } = req.params
            const org_id = (req as any).org_id

            const pool = await FeedbackPool.findOne({ _id: poolId, org_id })
            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Pool not found",
                })
            }

            const members = await PoolMember.find({ pool_id: poolId })
            const completionStatus = await AnonymousFeedbackService.getPoolCompletionStatus(poolId)

            // Fetch company slug for public links
            const company = await Company.findOne({ _id: org_id })
            const companySlug = company?.slug || 'company'
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const publicLinkBase = `${baseUrl}/feedback/${companySlug}/${poolId}`

            // Add public links to members
            const membersWithLinks = members.map((member, index) => ({
                ...member.toObject(),
                public_link: `${publicLinkBase}?member=${index + 1}`,
                member_index: index + 1,
            }))

            res.status(200).json({
                success: true,
                data: {
                    pool,
                    members: membersWithLinks,
                    completion_status: completionStatus,
                    public_link_base: publicLinkBase,
                },
            })
        } catch (error: any) {
            console.error("Error fetching pool details:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch pool details",
                error: error.message,
            })
        }
    }

    /**
     * Generate anonymous links for pool members
     * POST /api/feedback-360/pools/:poolId/generate-links
     */
    static async generatePoolLinks(req: Request, res: Response) {
        try {
            const { poolId } = req.params
            const org_id = (req as any).org_id

            const pool = await FeedbackPool.findOne({ _id: poolId, org_id })
            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Pool not found",
                })
            }

            const members = await PoolMember.find({ pool_id: poolId })

            // Fetch company slug
            const company = await Company.findOne({ _id: org_id })
            const companySlug = company?.slug || 'company'
            
            const links = members.map((member, index) => {
                const token = AnonymousFeedbackService.generateAnonymousToken(
                    poolId,
                    member.employee_id,
                    org_id
                )

                const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000"
                const link = `${baseUrl}/feedback/${companySlug}/${poolId}?token=${token}&member=${index + 1}`

                return {
                    employee_id: member.employee_id,
                    employee_name: member.employee_name,
                    employee_email: member.employee_email,
                    anonymous_link: link,
                    submission_count: member.submission_count,
                    member_index: index + 1,
                }
            })

            res.status(200).json({
                success: true,
                data: links,
            })
        } catch (error: any) {
            console.error("Error generating pool links:", error)
            res.status(500).json({
                success: false,
                message: "Failed to generate links",
                error: error.message,
            })
        }
    }

    /**
     * Get aggregated feedback analytics for an employee
     * GET /api/feedback-360/analytics/:employeeId
     */
    static async getEmployeeFeedbackAnalytics(req: Request, res: Response) {
        try {
            const { employeeId } = req.params
            const { pool_id } = req.query
            const org_id = (req as any).org_id

            // Verify employee belongs to organization
            const employee = await User.findOne({ _id: employeeId, org_id })
            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found",
                })
            }

            const analytics = await AnonymousFeedbackService.aggregateFeedbackAnalytics(
                employeeId,
                pool_id as string | undefined
            )

            res.status(200).json({
                success: true,
                data: {
                    employee: {
                        id: employee._id,
                        name: `${employee.firstName} ${employee.lastName}`,
                        email: employee.email,
                        department: employee.department,
                        position: employee.position,
                    },
                    analytics,
                },
            })
        } catch (error: any) {
            console.error("Error fetching employee analytics:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch analytics",
                error: error.message,
            })
        }
    }

    /**
     * Delete a feedback pool
     * DELETE /api/feedback-360/pools/:poolId
     */
    static async deleteFeedbackPool(req: Request, res: Response) {
        try {
            const { poolId } = req.params
            const org_id = (req as any).org_id

            const pool = await FeedbackPool.findOne({ _id: poolId, org_id })
            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Pool not found",
                })
            }

            // Delete pool members
            await PoolMember.deleteMany({ pool_id: poolId })

            // Delete feedback responses
            await FeedbackResponse.deleteMany({ pool_id: poolId })

            // Delete pool
            await FeedbackPool.findByIdAndDelete(poolId)

            res.status(200).json({
                success: true,
                message: "Pool deleted successfully",
            })
        } catch (error: any) {
            console.error("Error deleting pool:", error)
            res.status(500).json({
                success: false,
                message: "Failed to delete pool",
                error: error.message,
            })
        }
    }

    /**
     * Get all responses for a pool (Admin only)
     * GET /api/feedback-360/pools/:poolId/responses
     */
    static async getPoolResponses(req: Request, res: Response) {
        try {
            const { poolId } = req.params
            const org_id = (req as any).org_id

            const pool = await FeedbackPool.findOne({ _id: poolId, org_id })
            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Pool not found",
                })
            }

            // Get all responses for this pool
            const responses = await FeedbackResponse.find({ pool_id: poolId }).sort({ createdAt: -1 })

            // Get pool members for reference
            const members = await PoolMember.find({ pool_id: poolId })

            // Group responses by respondent (anonymously)
            const responsesByMember = responses.reduce((acc: any, response) => {
                const memberIndex = members.findIndex(m => m.employee_id === response.responder_id) + 1
                const key = `Member ${memberIndex}`
                
                if (!acc[key]) {
                    acc[key] = []
                }
                
                acc[key].push({
                    _id: response._id,
                    answers: response.answers,
                    submitted_at: response.createdAt,
                })
                
                return acc
            }, {})

            res.status(200).json({
                success: true,
                data: {
                    pool: {
                        _id: pool._id,
                        name: pool.name,
                        description: pool.description,
                        form_config: pool.form_config,
                        status: pool.status,
                    },
                    total_members: members.length,
                    total_responses: responses.length,
                    responses: responsesByMember,
                },
            })
        } catch (error: any) {
            console.error("Error fetching pool responses:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch pool responses",
                error: error.message,
            })
        }
    }

    // ==================== PUBLIC ENDPOINTS (No Auth Required) ====================

    /**
     * Validate feedback token and return pool context
     * POST /api/feedback-360/public/validate
     */
    static async validateFeedbackToken(req: Request, res: Response) {
        try {
            const { token } = req.body

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: "Token is required",
                })
            }

            // Validate token
            const tokenPayload = AnonymousFeedbackService.validateAnonymousToken(token)
            if (!tokenPayload) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired token",
                })
            }

            // Check if pool exists and is active
            const pool = await FeedbackPool.findById(tokenPayload.pool_id)
            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Feedback pool not found",
                })
            }

            // Check if pool has expired
            const isExpired = await AnonymousFeedbackService.isPoolExpired(tokenPayload.pool_id)
            if (isExpired) {
                return res.status(403).json({
                    success: false,
                    message: "This feedback link has expired",
                })
            }

            // Create or retrieve session
            const session = await AnonymousFeedbackService.createFeedbackSession(token, tokenPayload)
            if (!session) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid token or pool member not found",
                })
            }

            // Get pool member info
            const poolMember = await PoolMember.findOne({
                pool_id: tokenPayload.pool_id,
                employee_id: tokenPayload.employee_id,
            })

            res.status(200).json({
                success: true,
                data: {
                    pool: {
                        id: pool._id,
                        name: pool.name,
                        description: pool.description,
                        form_config: pool.form_config,
                    },
                    session: {
                        submission_count: poolMember?.submission_count || 0,
                        max_submissions: 4,
                        remaining: 4 - (poolMember?.submission_count || 0),
                    },
                },
            })
        } catch (error: any) {
            console.error("Error validating token:", error)
            res.status(500).json({
                success: false,
                message: "Failed to validate token",
                error: error.message,
            })
        }
    }

    /**
     * Get pool members for feedback (excluding self)
     * POST /api/feedback-360/public/members
     */
    static async getPoolMembersPublic(req: Request, res: Response) {
        try {
            const { token } = req.body

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: "Token is required",
                })
            }

            const tokenPayload = AnonymousFeedbackService.validateAnonymousToken(token)
            if (!tokenPayload) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired token",
                })
            }

            const members = await AnonymousFeedbackService.getPoolMembersForFeedback(
                tokenPayload.pool_id,
                tokenPayload.employee_id
            )

            res.status(200).json({
                success: true,
                data: members,
            })
        } catch (error: any) {
            console.error("Error fetching pool members:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch pool members",
                error: error.message,
            })
        }
    }

    /**
     * Submit anonymous feedback
     * POST /api/feedback-360/public/submit
     */
    static async submitFeedback(req: Request, res: Response) {
        try {
            const { token, reviewed_employee_id, response_payload } = req.body

            if (!token || !reviewed_employee_id || !response_payload) {
                return res.status(400).json({
                    success: false,
                    message: "Token, reviewed employee ID, and response payload are required",
                })
            }

            // Validate token
            const tokenPayload = AnonymousFeedbackService.validateAnonymousToken(token)
            if (!tokenPayload) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired token",
                })
            }

            // Prevent self-review
            if (reviewed_employee_id === tokenPayload.employee_id) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot review yourself",
                })
            }

            // Get pool member
            const tokenHash = AnonymousFeedbackService.hashToken(token)
            const poolMember = await PoolMember.findOne({
                pool_id: tokenPayload.pool_id,
                employee_id: tokenPayload.employee_id,
                anonymous_token_hash: tokenHash,
            })

            if (!poolMember) {
                return res.status(401).json({
                    success: false,
                    message: "Pool member not found",
                })
            }

            // Check submission limit
            if (poolMember.submission_count >= 4) {
                return res.status(403).json({
                    success: false,
                    message: "You have already completed all 4 feedback submissions",
                })
            }

            // Verify reviewed employee is in the same pool
            const reviewedMember = await PoolMember.findOne({
                pool_id: tokenPayload.pool_id,
                employee_id: reviewed_employee_id,
            })

            if (!reviewedMember) {
                return res.status(400).json({
                    success: false,
                    message: "Reviewed employee is not in this pool",
                })
            }

            // Create feedback response (NO rater_id stored - ensures anonymity)
            const feedbackResponse = new FeedbackResponse({
                org_id: tokenPayload.org_id,
                pool_id: tokenPayload.pool_id,
                reviewed_employee_id,
                reviewed_employee_name: reviewedMember.employee_name,
                response_payload,
            })

            await feedbackResponse.save()

            // Update submission count
            poolMember.submission_count += 1
            poolMember.last_submission_at = new Date()
            await poolMember.save()

            // Update session
            AnonymousFeedbackService.updateSessionSubmissionCount(token)

            res.status(201).json({
                success: true,
                message: "Feedback submitted successfully",
                data: {
                    submission_count: poolMember.submission_count,
                    remaining: 4 - poolMember.submission_count,
                    completed: poolMember.submission_count === 4,
                },
            })
        } catch (error: any) {
            console.error("Error submitting feedback:", error)
            res.status(500).json({
                success: false,
                message: "Failed to submit feedback",
                error: error.message,
            })
        }
    }

    /**
     * Get feedback progress
     * POST /api/feedback-360/public/progress
     */
    static async getFeedbackProgress(req: Request, res: Response) {
        try {
            const { token } = req.body

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: "Token is required",
                })
            }

            const tokenPayload = AnonymousFeedbackService.validateAnonymousToken(token)
            if (!tokenPayload) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired token",
                })
            }

            const poolMember = await PoolMember.findOne({
                pool_id: tokenPayload.pool_id,
                employee_id: tokenPayload.employee_id,
            })

            if (!poolMember) {
                return res.status(404).json({
                    success: false,
                    message: "Pool member not found",
                })
            }

            res.status(200).json({
                success: true,
                data: {
                    submission_count: poolMember.submission_count,
                    max_submissions: 4,
                    remaining: 4 - poolMember.submission_count,
                    completed: poolMember.submission_count === 4,
                },
            })
        } catch (error: any) {
            console.error("Error fetching progress:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch progress",
                error: error.message,
            })
        }
    }
}
