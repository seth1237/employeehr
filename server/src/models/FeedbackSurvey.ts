import mongoose, { Schema, type Document } from "mongoose"

export interface IFeedbackSurvey extends Document {
    org_id: string
    name: string
    description?: string
    form_config: {
        questions: Array<{
            field_id: string
            label: string
            type: string
            required: boolean
            placeholder?: string
            options?: string[]
            order: number
        }>
    }
    public_token?: string
    status: "active" | "archived"
    created_by: string
    createdAt: Date
    updatedAt: Date
}

const feedbackSurveySchema = new Schema<IFeedbackSurvey>(
    {
        org_id: { type: String, required: true, index: true },
        name: { type: String, required: true },
        description: { type: String },
        form_config: {
            questions: [
                {
                    field_id: { type: String, required: true },
                    label: { type: String, required: true },
                    type: { type: String, required: true },
                    required: { type: Boolean, default: true },
                    placeholder: { type: String },
                    options: [{ type: String }],
                    order: { type: Number, required: true },
                },
            ],
        },
        public_token: { type: String, unique: true, sparse: true },
        status: {
            type: String,
            enum: ["active", "archived"],
            default: "active",
        },
        created_by: { type: String, required: true },
    },
    { timestamps: true }
)

feedbackSurveySchema.index({ org_id: 1, status: 1 })

export const FeedbackSurvey = mongoose.model<IFeedbackSurvey>("FeedbackSurvey", feedbackSurveySchema)
