import mongoose, { Schema, type Document } from "mongoose"

export interface ISurveyResponse extends Document {
    survey_id: string
    org_id: string
    respondent_name?: string
    respondent_email?: string
    answers: Array<{
        question_id: string
        answer: any
    }>
    submitted_at: Date
    createdAt: Date
    updatedAt: Date
}

const surveyResponseSchema = new Schema<ISurveyResponse>(
    {
        survey_id: { type: String, required: true, index: true },
        org_id: { type: String, required: true, index: true },
        respondent_name: { type: String },
        respondent_email: { type: String },
        answers: [
            {
                question_id: { type: String, required: true },
                answer: { type: Schema.Types.Mixed, required: true },
            },
        ],
        submitted_at: { type: Date, default: Date.now },
    },
    { timestamps: true }
)

// Index for querying responses by survey
surveyResponseSchema.index({ survey_id: 1, submitted_at: -1 })

export const SurveyResponse = mongoose.model<ISurveyResponse>("SurveyResponse", surveyResponseSchema)
