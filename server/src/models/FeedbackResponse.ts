import mongoose, { Schema, type Document } from "mongoose"

export interface IFeedbackResponse extends Document {
    org_id: string
    pool_id: string
    survey_id?: string
    submitter_id?: string
    member_id?: string
    answers: Array<{
        question_id: string
        answer: any
    }>
    submitted_by_anonymous: boolean
    createdAt: Date
    updatedAt: Date
}

const feedbackResponseSchema = new Schema<IFeedbackResponse>(
    {
        org_id: { type: String, required: true, index: true },
        pool_id: { type: String, required: true, index: true },
        survey_id: { type: String, index: true },
        submitter_id: { type: String, index: true },
        member_id: { type: String, index: true },
        answers: [
            {
                question_id: { type: String, required: true },
                answer: { type: Schema.Types.Mixed, required: true },
            },
        ],
        submitted_by_anonymous: { type: Boolean, default: true },
    },
    { timestamps: true }
)

// Compound indexes for analytics queries
feedbackResponseSchema.index({ org_id: 1, pool_id: 1 })
feedbackResponseSchema.index({ org_id: 1, survey_id: 1 })
feedbackResponseSchema.index({ pool_id: 1, submitter_id: 1, member_id: 1 }, { unique: true })

// NOTE: submitter_id is stored but kept confidential in analytics
// It's used only to prevent duplicate submissions and track completion
// The submitting employee's identity is NEVER stored with the response

export const FeedbackResponse = mongoose.model<IFeedbackResponse>(
    "FeedbackResponse",
    feedbackResponseSchema
)
