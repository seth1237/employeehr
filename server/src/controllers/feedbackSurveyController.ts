import type { Request, Response } from "express"
import { FeedbackSurvey } from "../models/FeedbackSurvey"
import { FeedbackPool } from "../models/FeedbackPool"
import { FeedbackResponse } from "../models/FeedbackResponse"
import { PoolMember } from "../models/PoolMember"
import { SurveyResponse } from "../models/SurveyResponse"
import { Company } from "../models/Company"
import crypto from "crypto"

export class FeedbackSurveyController {
    /**
     * Create a new feedback survey
     * POST /api/feedback-surveys
     */
    static async createSurvey(req: Request, res: Response) {
        try {
            const { name, description, form_config } = req.body
            const org_id = (req as any).org_id
            const user_id = (req as any).user?.userId

            // Validation
            if (!name || !form_config || !form_config.questions || form_config.questions.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Survey name and questions are required",
                })
            }

            // Create survey
            const survey = new FeedbackSurvey({
                org_id,
                name,
                description,
                form_config,
                created_by: user_id,
            })

            await survey.save()

            res.status(201).json({
                success: true,
                message: "Survey created successfully",
                data: survey,
            })
        } catch (error: any) {
            console.error("Error creating survey:", error)
            res.status(500).json({
                success: false,
                message: "Failed to create survey",
                error: error.message,
            })
        }
    }

    /**
     * Get all surveys for the organization
     * GET /api/feedback-surveys
     */
    static async getSurveys(req: Request, res: Response) {
        try {
            const org_id = (req as any).org_id
            const { status } = req.query

            const query: any = { org_id }
            if (status) {
                query.status = status
            }

            const surveys = await FeedbackSurvey.find(query).sort({ createdAt: -1 })

            // Get pool count for each survey
            const surveysWithPools = await Promise.all(
                surveys.map(async (survey) => {
                    const poolCount = await FeedbackPool.countDocuments({ survey_id: survey._id.toString() })
                    const responseCount = await FeedbackResponse.countDocuments({ survey_id: survey._id.toString() })

                    return {
                        ...survey.toObject(),
                        pool_count: poolCount,
                        response_count: responseCount,
                    }
                })
            )

            res.status(200).json({
                success: true,
                data: surveysWithPools,
            })
        } catch (error: any) {
            console.error("Error fetching surveys:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch surveys",
                error: error.message,
            })
        }
    }

    /**
     * Get survey details
     * GET /api/feedback-surveys/:surveyId
     */
    static async getSurveyDetails(req: Request, res: Response) {
        try {
            const { surveyId } = req.params
            const org_id = (req as any).org_id

            const survey = await FeedbackSurvey.findOne({ _id: surveyId, org_id })
            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            // Get all pools for this survey
            const pools = await FeedbackPool.find({ survey_id: surveyId })

            // Get company details for public link
            const company = await Company.findOne({ org_id })
            const companySlug = company?.slug || 'company'

            // Add public link, total members, and total responses to each pool
            const poolsWithDetails = await Promise.all(
                pools.map(async (pool) => {
                    const totalMembers = await PoolMember.countDocuments({ pool_id: pool._id })
                    const totalResponses = await FeedbackResponse.countDocuments({ pool_id: pool._id })

                    return {
                        _id: pool._id,
                        name: pool.name,
                        description: pool.description,
                        status: pool.status,
                        created_at: pool.createdAt,
                        total_members: totalMembers,
                        total_responses: totalResponses,
                        public_link: pool.public_link_token
                            ? `${process.env.FRONTEND_URL}/feedback/${companySlug}/${pool._id}?token=${pool.public_link_token}`
                            : null,
                    }
                })
            )

            res.status(200).json({
                success: true,
                data: {
                    survey,
                    pools: poolsWithDetails,
                },
            })
        } catch (error: any) {
            console.error("Error fetching survey details:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch survey details",
                error: error.message,
            })
        }
    }

    /**
     * Update survey
     * PUT /api/feedback-surveys/:surveyId
     */
    static async updateSurvey(req: Request, res: Response) {
        try {
            const { surveyId } = req.params
            const org_id = (req as any).org_id
            const { name, description, form_config, status } = req.body

            const survey = await FeedbackSurvey.findOne({ _id: surveyId, org_id })
            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            if (name) survey.name = name
            if (description !== undefined) survey.description = description
            if (form_config) survey.form_config = form_config
            if (status) survey.status = status

            await survey.save()

            res.status(200).json({
                success: true,
                message: "Survey updated successfully",
                data: survey,
            })
        } catch (error: any) {
            console.error("Error updating survey:", error)
            res.status(500).json({
                success: false,
                message: "Failed to update survey",
                error: error.message,
            })
        }
    }

    /**
     * Delete survey
     * DELETE /api/feedback-surveys/:surveyId
     */
    static async deleteSurvey(req: Request, res: Response) {
        try {
            const { surveyId } = req.params
            const org_id = (req as any).org_id

            const survey = await FeedbackSurvey.findOne({ _id: surveyId, org_id })
            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            // Check if survey has active pools
            const poolCount = await FeedbackPool.countDocuments({ survey_id: surveyId, status: "active" })
            if (poolCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot delete survey with active pools. Please delete or complete all pools first.",
                })
            }

            // Delete survey and associated data
            await FeedbackPool.deleteMany({ survey_id: surveyId })
            await FeedbackResponse.deleteMany({ survey_id: surveyId })
            await FeedbackSurvey.findByIdAndDelete(surveyId)

            res.status(200).json({
                success: true,
                message: "Survey deleted successfully",
            })
        } catch (error: any) {
            console.error("Error deleting survey:", error)
            res.status(500).json({
                success: false,
                message: "Failed to delete survey",
                error: error.message,
            })
        }
    }

    /**
     * Create a pool for a survey
     * POST /api/feedback-surveys/:surveyId/pools
     */
    static async createPool(req: Request, res: Response) {
        try {
            const { surveyId } = req.params
            const { name, description, expires_at, members } = req.body
            const org_id = (req as any).org_id
            const user_id = (req as any).user?.userId

            console.log('Creating pool for survey:', surveyId, 'org_id:', org_id)

            // Verify survey exists
            const survey = await FeedbackSurvey.findById(surveyId)
            console.log('Survey found:', survey ? 'YES' : 'NO')
            if (survey) {
                console.log('Survey org_id:', survey.org_id, 'Request org_id:', org_id, 'Match:', survey.org_id.toString() === org_id.toString())
            }

            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            // Check org_id match
            if (survey.org_id.toString() !== org_id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "You don't have permission to create pools for this survey",
                })
            }

            // Validate members
            if (!members || !Array.isArray(members) || members.length !== 5) {
                return res.status(400).json({
                    success: false,
                    message: "Pool must have exactly 5 members",
                })
            }

            // Validate each member has required fields
            for (const member of members) {
                if (!member.name || !member.role) {
                    return res.status(400).json({
                        success: false,
                        message: "Each member must have name and role",
                    })
                }
            }

            // Generate unique public link token
            const public_link_token = crypto.randomBytes(32).toString('hex')

            // Create pool
            const pool = new FeedbackPool({
                org_id,
                survey_id: surveyId,
                name,
                description,
                public_link_token,
                created_by: user_id,
                expires_at: expires_at ? new Date(expires_at) : undefined,
            })

            await pool.save()

            // Create pool members - all share the same pool token
            const poolMembers = await Promise.all(
                members.map(async (member: any) => {
                    // Generate unique employee_id if not provided
                    const employee_id = member.employee_id ||
                        `member_${pool._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

                    // Use the pool's public token hash for all members
                    const anonymous_token_hash = crypto
                        .createHash('sha256')
                        .update(public_link_token)
                        .digest('hex')

                    const poolMember = new PoolMember({
                        pool_id: pool._id.toString(),
                        employee_id,
                        employee_email: member.email,
                        employee_name: member.name,
                        role: member.role,
                        submission_count: 0,
                        anonymous_token_hash,
                        token_generated_at: new Date(),
                    })

                    await poolMember.save()

                    return {
                        _id: poolMember._id,
                        name: member.name,
                        role: member.role,
                    }
                })
            )

            // Generate public link
            const company = await Company.findOne({ _id: org_id })
            const companySlug = company?.slug || 'company'
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const publicLink = `${baseUrl}/feedback/${companySlug}/${pool._id}?token=${public_link_token}`

            res.status(201).json({
                success: true,
                message: "Pool created successfully with 5 members",
                data: {
                    pool,
                    members: poolMembers,
                    public_link: publicLink,
                    company_slug: companySlug,
                    total_members: poolMembers.length,
                },
            })
        } catch (error: any) {
            console.error("Error creating pool:", error)
            res.status(500).json({
                success: false,
                message: "Failed to create pool",
                error: error.message,
            })
        }
    }

    /**
     * Get pool details with responses
     * GET /api/feedback-surveys/:surveyId/pools/:poolId
     */
    static async getPoolDetails(req: Request, res: Response) {
        try {
            const { surveyId, poolId } = req.params
            const org_id = (req as any).org_id

            const survey = await FeedbackSurvey.findOne({ _id: surveyId, org_id })
            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            const pool = await FeedbackPool.findOne({ _id: poolId, survey_id: surveyId, org_id })
            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Pool not found",
                })
            }

            // Get pool members
            const poolMembers = await PoolMember.find({ pool_id: poolId }).select('-anonymous_token_hash')

            // Get responses
            const responses = await FeedbackResponse.find({ pool_id: poolId }).sort({ createdAt: -1 })

            // Generate public link
            const company = await Company.findOne({ _id: org_id })
            const companySlug = company?.slug || 'company'
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const publicLink = `${baseUrl}/feedback/${companySlug}/${poolId}?token=${pool.public_link_token}`

            res.status(200).json({
                success: true,
                data: {
                    survey,
                    pool,
                    members: poolMembers,
                    responses,
                    public_link: publicLink,
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
     * Update pool
     * PUT /api/feedback-surveys/:surveyId/pools/:poolId
     */
    static async updatePool(req: Request, res: Response) {
        try {
            const { surveyId, poolId } = req.params
            const { name, description, status, expires_at, members } = req.body
            const org_id = (req as any).org_id

            // Verify pool exists and belongs to organization
            const pool = await FeedbackPool.findOne({ _id: poolId, survey_id: surveyId, org_id })
            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Pool not found",
                })
            }

            // Update pool basic information
            if (name) pool.name = name
            if (description !== undefined) pool.description = description
            if (status) pool.status = status
            if (expires_at !== undefined) pool.expires_at = expires_at ? new Date(expires_at) : undefined

            await pool.save()

            // Update members if provided
            if (members && Array.isArray(members)) {
                // Validate members count (should be 5 for 360 feedback)
                if (members.length !== 5) {
                    return res.status(400).json({
                        success: false,
                        message: "Pool must have exactly 5 members",
                    })
                }

                // Check if pool has any responses
                const responseCount = await FeedbackResponse.countDocuments({ pool_id: poolId })
                if (responseCount > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Cannot update members after responses have been submitted",
                    })
                }

                // Get existing members
                const existingMembers = await PoolMember.find({ pool_id: poolId })

                // Update existing members or create new ones
                for (let i = 0; i < members.length; i++) {
                    const memberData = members[i]
                    const existingMember = existingMembers[i]

                    if (existingMember) {
                        // Update existing member
                        existingMember.employee_name = memberData.name
                        existingMember.role = memberData.role
                        if (memberData.email) existingMember.employee_email = memberData.email
                        await existingMember.save()
                    } else {
                        // Create new member (shouldn't happen if validation is correct)
                        const employee_id = memberData.employee_id ||
                            `member_${pool._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

                        const anonymous_token_hash = crypto
                            .createHash('sha256')
                            .update(pool.public_link_token || '')
                            .digest('hex')

                        const newMember = new PoolMember({
                            pool_id: pool._id.toString(),
                            employee_id,
                            employee_email: memberData.email,
                            employee_name: memberData.name,
                            role: memberData.role,
                            submission_count: 0,
                            anonymous_token_hash,
                            token_generated_at: new Date(),
                        })
                        await newMember.save()
                    }
                }

                // Delete extra members if any
                if (existingMembers.length > members.length) {
                    const membersToDelete = existingMembers.slice(members.length)
                    await PoolMember.deleteMany({
                        _id: { $in: membersToDelete.map(m => m._id) }
                    })
                }
            }

            // Get updated members
            const updatedMembers = await PoolMember.find({ pool_id: poolId }).select('-anonymous_token_hash')

            // Generate public link
            const company = await Company.findOne({ _id: org_id })
            const companySlug = company?.slug || 'company'
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
            const publicLink = pool.public_link_token
                ? `${baseUrl}/feedback/${companySlug}/${poolId}?token=${pool.public_link_token}`
                : null

            res.status(200).json({
                success: true,
                message: "Pool updated successfully",
                data: {
                    pool,
                    members: updatedMembers,
                    public_link: publicLink,
                },
            })
        } catch (error: any) {
            console.error("Error updating pool:", error)
            res.status(500).json({
                success: false,
                message: "Failed to update pool",
                error: error.message,
            })
        }
    }

    /**
     * Delete pool
     * DELETE /api/feedback-surveys/:surveyId/pools/:poolId
     */
    static async deletePool(req: Request, res: Response) {
        try {
            const { surveyId, poolId } = req.params
            const org_id = (req as any).org_id

            const pool = await FeedbackPool.findOne({ _id: poolId, survey_id: surveyId, org_id })
            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Pool not found",
                })
            }

            // Delete pool and responses
            await FeedbackResponse.deleteMany({ pool_id: poolId })
            await PoolMember.deleteMany({ pool_id: poolId })
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
     * Get pool responses
     * GET /api/feedback-surveys/:surveyId/pools/:poolId/responses
     */
    static async getPoolResponses(req: Request, res: Response) {
        try {
            const { surveyId, poolId } = req.params
            const org_id = (req as any).org_id

            const survey = await FeedbackSurvey.findOne({ _id: surveyId, org_id })
            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            const pool = await FeedbackPool.findOne({ _id: poolId, survey_id: surveyId, org_id })
            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Pool not found",
                })
            }

            // Get responses
            const responses = await FeedbackResponse.find({ pool_id: poolId }).sort({ createdAt: -1 }).lean()

            // Enrich 360 responses with names
            const enrichedResponses = await Promise.all(responses.map(async (resp) => {
                const sub = resp.submitter_id ? await PoolMember.findById(resp.submitter_id).select('employee_name role') : null
                const mem = resp.member_id ? await PoolMember.findById(resp.member_id).select('employee_name role') : null

                return {
                    ...resp,
                    submitter_name: sub?.employee_name || 'Anonymous',
                    member_name: mem?.employee_name || 'N/A',
                    submitter_role: sub?.role,
                    member_role: mem?.role
                }
            }))

            res.status(200).json({
                success: true,
                data: {
                    responses: enrichedResponses,
                    total: responses.length,
                },
            })
        } catch (error: any) {
            console.error("Error fetching pool responses:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch responses",
                error: error.message,
            })
        }
    }

    /**
     * PUBLIC: Get survey and pool for public form
     * GET /api/feedback-surveys/public/:poolId
     * Accepts poolId or token - if token, looks up pool by token
     */
    static async getPublicPool(req: Request, res: Response) {
        try {
            const { poolId } = req.params
            const { token } = req.query

            let pool;

            // Try to find by pool ID first
            pool = await FeedbackPool.findById(poolId)

            // If not found and poolId looks like a token (64 hex chars), try finding by token
            if (!pool && poolId.length === 64) {
                pool = await FeedbackPool.findOne({ public_link_token: poolId })
            }

            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Pool not found",
                })
            }

            // Verify token if provided as query parameter
            if (token && pool.public_link_token !== token) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid access token",
                })
            }

            // If no token provided, verify that poolId IS the token (for simplified URLs)
            // This allows both patterns: /poolId?token=xyz OR /token
            const hasValidToken = token || poolId === pool.public_link_token

            if (!hasValidToken) {
                return res.status(401).json({
                    success: false,
                    message: "Access token required",
                })
            }

            // Check if pool is active
            if (pool.status !== "active") {
                return res.status(400).json({
                    success: false,
                    message: `This feedback pool is ${pool.status}`,
                })
            }

            // Check expiration
            if (pool.expires_at && new Date() > pool.expires_at) {
                return res.status(400).json({
                    success: false,
                    message: "This feedback pool has expired",
                })
            }

            // Get survey
            const survey = await FeedbackSurvey.findById(pool.survey_id)
            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            // Get pool members - use actual pool ID, not the URL param which might be a token
            const members = await PoolMember.find({ pool_id: pool._id.toString() }).select('_id employee_name role submission_count')

            res.status(200).json({
                success: true,
                data: {
                    pool: {
                        _id: pool._id,
                        name: pool.name,
                        description: pool.description,
                    },
                    members,
                    survey: {
                        _id: survey._id,
                        name: survey.name,
                        description: survey.description,
                        form_config: survey.form_config,
                    },
                    branding: await Company.findOne({ _id: pool.org_id }).select('name logo primaryColor secondaryColor accentColor backgroundColor textColor borderRadius fontFamily buttonStyle')
                },
            })
        } catch (error: any) {
            console.error("Error fetching public pool:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch feedback form",
                error: error.message,
            })
        }
    }

    /**
     * PUBLIC: Submit feedback
     * POST /api/feedback-surveys/public/:poolId/submit
     */
    static async submitFeedback(req: Request, res: Response) {
        try {
            const { poolId } = req.params
            const { token, submitter_id, member_id, answers } = req.body

            if (!submitter_id) {
                return res.status(400).json({
                    success: false,
                    message: "Submitter identification is required",
                })
            }

            if (!member_id) {
                return res.status(400).json({
                    success: false,
                    message: "Member selection is required",
                })
            }

            // Cannot provide feedback for yourself
            if (submitter_id === member_id) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot provide feedback for yourself",
                })
            }

            let pool;

            // Try to find by pool ID first
            pool = await FeedbackPool.findById(poolId)

            // If not found and poolId looks like a token (64 hex chars), try finding by token
            if (!pool && poolId.length === 64) {
                pool = await FeedbackPool.findOne({ public_link_token: poolId })
            }

            if (!pool) {
                return res.status(404).json({
                    success: false,
                    message: "Pool not found",
                })
            }

            // Verify token if provided
            if (token && pool.public_link_token !== token) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid access token",
                })
            }

            // If no token provided, verify that poolId IS the token (for simplified URLs)
            const hasValidToken = token || poolId === pool.public_link_token

            if (!hasValidToken) {
                return res.status(401).json({
                    success: false,
                    message: "Access token required",
                })
            }

            // Use the actual pool ID for subsequent operations
            const actualPoolId = pool._id.toString()

            // Check if pool is active            // Check if pool is active
            if (pool.status !== "active") {
                return res.status(400).json({
                    success: false,
                    message: `This feedback pool is ${pool.status}`,
                })
            }

            // Verify submitter exists in pool
            const submitter = await PoolMember.findOne({ _id: submitter_id, pool_id: actualPoolId })
            if (!submitter) {
                return res.status(404).json({
                    success: false,
                    message: "Submitter not found in this pool",
                })
            }

            // Check submission limit (max 4 - one for each other member)
            if (submitter.submission_count >= 4) {
                return res.status(400).json({
                    success: false,
                    message: "You have already submitted feedback for all team members",
                })
            }

            // Verify member exists in pool
            const member = await PoolMember.findOne({ _id: member_id, pool_id: actualPoolId })
            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: "Member not found in this pool",
                })
            }

            // Check if already submitted feedback for this member
            const existingFeedback = await FeedbackResponse.findOne({
                pool_id: actualPoolId,
                submitter_id: submitter_id,
                member_id: member_id,
            })

            if (existingFeedback) {
                return res.status(400).json({
                    success: false,
                    message: "You have already submitted feedback for this member",
                })
            }

            // Create response
            const response = new FeedbackResponse({
                org_id: pool.org_id,
                pool_id: actualPoolId,
                survey_id: pool.survey_id,
                submitter_id: submitter_id,
                member_id: member_id,
                answers,
                submitted_by_anonymous: true,
            })

            await response.save()

            // Update submitter's submission count
            submitter.submission_count += 1
            submitter.last_submission_at = new Date()
            await submitter.save()

            res.status(201).json({
                success: true,
                message: "Feedback submitted successfully",
                data: {
                    remaining: 4 - submitter.submission_count,
                    total_completed: submitter.submission_count,
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
     * Get public survey (for direct survey responses without pools)
     * GET /api/feedback-surveys/survey/:surveyToken
     */
    static async getPublicSurvey(req: Request, res: Response) {
        try {
            const { surveyToken } = req.params

            const survey = await FeedbackSurvey.findOne({ public_token: surveyToken })
            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            // Check if survey is active
            if (survey.status !== "active") {
                return res.status(400).json({
                    success: false,
                    message: `This survey is ${survey.status}`,
                })
            }

            // Get company info
            const company = await Company.findOne({ org_id: survey.org_id })

            res.status(200).json({
                success: true,
                data: {
                    survey: {
                        _id: survey._id,
                        name: survey.name,
                        description: survey.description,
                        form_config: survey.form_config,
                    },
                    company: {
                        name: company?.name,
                        slug: company?.slug,
                    },
                },
            })
        } catch (error: any) {
            console.error("Error fetching public survey:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch survey",
                error: error.message,
            })
        }
    }

    /**
     * Submit public survey response
     * POST /api/feedback-surveys/survey/:surveyToken/submit
     */
    static async submitPublicSurvey(req: Request, res: Response) {
        try {
            const { surveyToken } = req.params
            const { respondent_name, respondent_email, answers } = req.body

            const survey = await FeedbackSurvey.findOne({ public_token: surveyToken })
            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            // Check if survey is active
            if (survey.status !== "active") {
                return res.status(400).json({
                    success: false,
                    message: `This survey is ${survey.status}`,
                })
            }

            // Validate answers
            if (!answers || !Array.isArray(answers) || answers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Answers are required",
                })
            }

            // Create response
            const response = new SurveyResponse({
                survey_id: survey._id,
                org_id: survey.org_id,
                respondent_name,
                respondent_email,
                answers,
                submitted_at: new Date(),
            })

            await response.save()

            res.status(201).json({
                success: true,
                message: "Survey submitted successfully",
                data: {
                    response_id: response._id,
                },
            })
        } catch (error: any) {
            console.error("Error submitting survey:", error)
            res.status(500).json({
                success: false,
                message: "Failed to submit survey",
                error: error.message,
            })
        }
    }

    /**
     * Generate public token for survey
     * POST /api/feedback-surveys/:surveyId/generate-token
     */
    static async generatePublicToken(req: Request, res: Response) {
        try {
            const { surveyId } = req.params
            const org_id = (req as any).org_id

            const survey = await FeedbackSurvey.findOne({ _id: surveyId, org_id })
            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            // Generate unique token if not exists
            if (!survey.public_token) {
                survey.public_token = crypto.randomBytes(32).toString("hex")
                await survey.save()
            }

            // Get company slug for URL
            const company = await Company.findOne({ org_id })
            const publicUrl = `${process.env.FRONTEND_URL}/feedback/${company?.slug || 'company'}/survey/${survey.public_token}`

            res.status(200).json({
                success: true,
                data: {
                    public_token: survey.public_token,
                    public_url: publicUrl,
                },
            })
        } catch (error: any) {
            console.error("Error generating public token:", error)
            res.status(500).json({
                success: false,
                message: "Failed to generate public token",
                error: error.message,
            })
        }
    }

    /**
     * Get survey responses
     * GET /api/feedback-surveys/:surveyId/responses
     */
    static async getSurveyResponses(req: Request, res: Response) {
        try {
            const { surveyId } = req.params
            const org_id = (req as any).org_id

            const survey = await FeedbackSurvey.findOne({ _id: surveyId, org_id })
            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: "Survey not found",
                })
            }

            // Fetch generic survey responses
            const surveyResponses = await SurveyResponse.find({ survey_id: surveyId })
                .sort({ submitted_at: -1 })

            // Fetch 360 feedback responses
            const feedbackResponses = await FeedbackResponse.find({
                survey_id: surveyId,
                org_id
            }).lean()

            // Enrich 360 responses with names
            const enrichedFeedback = await Promise.all(feedbackResponses.map(async (resp) => {
                const sub = resp.submitter_id ? await PoolMember.findById(resp.submitter_id).select('employee_name role') : null
                const mem = resp.member_id ? await PoolMember.findById(resp.member_id).select('employee_name role') : null

                return {
                    ...resp,
                    submitter_name: sub?.employee_name || 'Anonymous',
                    member_name: mem?.employee_name || 'N/A',
                    submitter_role: sub?.role,
                    member_role: mem?.role
                }
            }))

            res.status(200).json({
                success: true,
                data: {
                    survey: {
                        name: survey.name,
                        description: survey.description,
                        form_config: survey.form_config
                    },
                    surveyResponses,
                    feedbackResponses: enrichedFeedback,
                    total: surveyResponses.length + enrichedFeedback.length,
                },
            })
        } catch (error: any) {
            console.error("Error fetching survey responses:", error)
            res.status(500).json({
                success: false,
                message: "Failed to fetch survey responses",
                error: error.message,
            })
        }
    }
}

