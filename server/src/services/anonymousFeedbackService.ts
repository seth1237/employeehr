import jwt from "jsonwebtoken"
import crypto from "crypto"
import { FeedbackPool } from "../models/FeedbackPool"
import { PoolMember } from "../models/PoolMember"
import { FeedbackResponse } from "../models/FeedbackResponse"
import { User } from "../models/User"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const TOKEN_EXPIRY = "90d" // 90 days

interface AnonymousTokenPayload {
    pool_id: string
    employee_id: string
    org_id: string
    type: "anonymous_feedback"
}

interface FeedbackSession {
    pool_id: string
    employee_id: string
    org_id: string
    submission_count: number
    created_at: Date
}

// In-memory session store (could be Redis in production)
const feedbackSessions = new Map<string, FeedbackSession>()

export class AnonymousFeedbackService {
    /**
     * Generate anonymous token for a pool member
     */
    static generateAnonymousToken(
        pool_id: string,
        employee_id: string,
        org_id: string
    ): string {
        const payload: AnonymousTokenPayload = {
            pool_id,
            employee_id,
            org_id,
            type: "anonymous_feedback",
        }

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
        return token
    }

    /**
     * Validate anonymous token and return payload
     */
    static validateAnonymousToken(token: string): AnonymousTokenPayload | null {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as AnonymousTokenPayload

            if (decoded.type !== "anonymous_feedback") {
                return null
            }

            return decoded
        } catch (error) {
            return null
        }
    }

    /**
     * Generate hash of token for storage (never store actual token)
     */
    static hashToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex")
    }

    /**
     * Create or retrieve feedback session
     */
    static async createFeedbackSession(
        token: string,
        tokenPayload: AnonymousTokenPayload
    ): Promise<FeedbackSession | null> {
        const tokenHash = this.hashToken(token)

        // Check if session already exists
        const existingSession = feedbackSessions.get(tokenHash)
        if (existingSession) {
            return existingSession
        }

        // Verify pool member exists and get submission count
        const poolMember = await PoolMember.findOne({
            pool_id: tokenPayload.pool_id,
            employee_id: tokenPayload.employee_id,
            anonymous_token_hash: tokenHash,
        })

        if (!poolMember) {
            return null
        }

        // Create new session
        const session: FeedbackSession = {
            pool_id: tokenPayload.pool_id,
            employee_id: tokenPayload.employee_id,
            org_id: tokenPayload.org_id,
            submission_count: poolMember.submission_count,
            created_at: new Date(),
        }

        feedbackSessions.set(tokenHash, session)

        // Clean up old sessions (older than 24 hours)
        this.cleanupOldSessions()

        return session
    }

    /**
     * Get feedback session
     */
    static getFeedbackSession(token: string): FeedbackSession | null {
        const tokenHash = this.hashToken(token)
        return feedbackSessions.get(tokenHash) || null
    }

    /**
     * Update session submission count
     */
    static updateSessionSubmissionCount(token: string): void {
        const tokenHash = this.hashToken(token)
        const session = feedbackSessions.get(tokenHash)
        if (session) {
            session.submission_count += 1
            feedbackSessions.set(tokenHash, session)
        }
    }

    /**
     * Clean up sessions older than 24 hours
     */
    static cleanupOldSessions(): void {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        for (const [key, session] of feedbackSessions.entries()) {
            if (session.created_at < oneDayAgo) {
                feedbackSessions.delete(key)
            }
        }
    }

    /**
     * Get pool members for feedback (excluding self)
     */
    static async getPoolMembersForFeedback(
        pool_id: string,
        exclude_employee_id: string
    ): Promise<any[]> {
        const members = await PoolMember.find({
            pool_id,
            employee_id: { $ne: exclude_employee_id },
        }).select("employee_id employee_name employee_email")

        return members
    }

    /**
     * Aggregate feedback analytics for an employee
     */
    static async aggregateFeedbackAnalytics(
        employee_id: string,
        pool_id?: string
    ): Promise<any> {
        const query: any = { reviewed_employee_id: employee_id }
        if (pool_id) {
            query.pool_id = pool_id
        }

        const responses = await FeedbackResponse.find(query)

        if (responses.length === 0) {
            return {
                employee_id,
                total_responses: 0,
                scores: {},
                qualitative_feedback: [],
            }
        }

        // Get pool to understand form structure
        const pool = await FeedbackPool.findById(pool_id || responses[0].pool_id)
        if (!pool) {
            throw new Error("Pool not found")
        }

        // Aggregate scores by question
        const scoresByQuestion: { [questionId: string]: number[] } = {}
        const qualitativeFeedback: { [questionId: string]: string[] } = {}

        for (const response of responses) {
            for (const [questionId, answer] of Object.entries(response.response_payload)) {
                const question = pool.form_config.questions.find((q) => q.id === questionId)
                if (!question) continue

                if (
                    question.type === "likert" ||
                    question.type === "rating" ||
                    question.type === "single_choice"
                ) {
                    if (!scoresByQuestion[questionId]) {
                        scoresByQuestion[questionId] = []
                    }
                    scoresByQuestion[questionId].push(Number(answer))
                } else if (question.type === "text") {
                    if (!qualitativeFeedback[questionId]) {
                        qualitativeFeedback[questionId] = []
                    }
                    qualitativeFeedback[questionId].push(String(answer))
                }
            }
        }

        // Calculate averages
        const averageScores: { [questionId: string]: number } = {}
        for (const [questionId, scores] of Object.entries(scoresByQuestion)) {
            const sum = scores.reduce((a, b) => a + b, 0)
            averageScores[questionId] = sum / scores.length
        }

        // Calculate overall average
        const allScores = Object.values(scoresByQuestion).flat()
        const overallAverage =
            allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0

        return {
            employee_id,
            total_responses: responses.length,
            overall_average: Math.round(overallAverage * 100) / 100,
            scores_by_question: averageScores,
            qualitative_feedback: qualitativeFeedback,
            score_distribution: this.calculateScoreDistribution(allScores),
        }
    }

    /**
     * Calculate score distribution
     */
    static calculateScoreDistribution(scores: number[]): { [range: string]: number } {
        const distribution: { [range: string]: number } = {
            "1-2": 0,
            "3-4": 0,
            "5-6": 0,
            "7-8": 0,
            "9-10": 0,
        }

        for (const score of scores) {
            if (score <= 2) distribution["1-2"]++
            else if (score <= 4) distribution["3-4"]++
            else if (score <= 6) distribution["5-6"]++
            else if (score <= 8) distribution["7-8"]++
            else distribution["9-10"]++
        }

        return distribution
    }

    /**
     * Check if pool has expired
     */
    static async isPoolExpired(pool_id: string): Promise<boolean> {
        const pool = await FeedbackPool.findById(pool_id)
        if (!pool) return true

        if (pool.status === "expired") return true

        if (pool.expires_at && pool.expires_at < new Date()) {
            // Update status
            pool.status = "expired"
            await pool.save()
            return true
        }

        return false
    }

    /**
     * Get pool completion status
     */
    static async getPoolCompletionStatus(pool_id: string): Promise<{
        total_members: number
        completed_members: number
        completion_percentage: number
        total_submissions: number
        expected_submissions: number
    }> {
        const members = await PoolMember.find({ pool_id })
        const totalMembers = members.length
        const completedMembers = members.filter((m) => m.submission_count === 4).length
        const totalSubmissions = members.reduce((sum, m) => sum + m.submission_count, 0)
        const expectedSubmissions = totalMembers * 4

        return {
            total_members: totalMembers,
            completed_members: completedMembers,
            completion_percentage: Math.round((completedMembers / totalMembers) * 100),
            total_submissions: totalSubmissions,
            expected_submissions: expectedSubmissions,
        }
    }
}
