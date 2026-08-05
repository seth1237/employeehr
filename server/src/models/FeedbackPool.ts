import mongoose, { Schema, type Document } from "mongoose"

export interface IFeedbackPool extends Document {
    org_id: string
    survey_id?: string
    name: string
    description?: string
    form_config?: {
        questions: any[]
    }
    public_link_token?: string
    status: "active" | "completed" | "expired"
    created_by: string
    expires_at?: Date
    createdAt: Date
    updatedAt: Date
}

const feedbackPoolSchema = new Schema<IFeedbackPool>(
    {
        org_id: { type: String, required: true, index: true },
        survey_id: { type: String, index: true },
        name: { type: String, required: true },
        description: { type: String },
        form_config: {
            type: {
                questions: [{ type: Schema.Types.Mixed }]
            },
        },
        public_link_token: { type: String, unique: true, sparse: true },
        status: {
            type: String,
            enum: ["active", "completed", "expired"],
            default: "active",
        },
        created_by: { type: String, required: true },
        expires_at: { type: Date },
    },
    { timestamps: true }
)

// Compound index for tenant and status queries
feedbackPoolSchema.index({ org_id: 1, status: 1 })

export const FeedbackPool = mongoose.model<IFeedbackPool>("FeedbackPool", feedbackPoolSchema)
