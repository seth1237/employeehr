import mongoose, { Schema, type Document } from "mongoose"

export interface IPoolMember extends Document {
    pool_id: string
    employee_id: string
    employee_email?: string
    employee_name: string
    role: string
    submission_count: number
    anonymous_token_hash: string
    token_generated_at: Date
    last_submission_at?: Date
    createdAt: Date
    updatedAt: Date
}

const poolMemberSchema = new Schema<IPoolMember>(
    {
        pool_id: { type: String, required: true, index: true },
        employee_id: { type: String, required: true },
        employee_email: { type: String },
        employee_name: { type: String, required: true },
        role: { type: String, required: true },
        submission_count: { type: Number, default: 0, min: 0, max: 4 },
        anonymous_token_hash: { type: String, required: true },
        token_generated_at: { type: Date, required: true },
        last_submission_at: { type: Date },
    },
    { timestamps: true }
)

// Compound indexes for efficient queries
poolMemberSchema.index({ pool_id: 1, employee_id: 1 }, { unique: true })
poolMemberSchema.index({ employee_id: 1 })
poolMemberSchema.index({ anonymous_token_hash: 1 })

export const PoolMember = mongoose.model<IPoolMember>("PoolMember", poolMemberSchema)
