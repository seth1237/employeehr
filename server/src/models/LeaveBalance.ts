import mongoose, { Schema } from "mongoose"

export interface ILeaveBalance extends Document {
    org_id: string
    user_id: string
    year: number
    annual_total: number
    annual_used: number
    sick_total: number
    sick_used: number
    maternity_total?: number
    maternity_used?: number
    paternity_total?: number
    paternity_used?: number
    unpaid_used: number
    createdAt: Date
    updatedAt: Date
}

const leaveBalanceSchema = new Schema<ILeaveBalance>(
    {
        org_id: { type: String, required: true },
        user_id: { type: String, required: true, index: true },
        year: { type: Number, required: true },
        annual_total: { type: Number, default: 21 },
        annual_used: { type: Number, default: 0 },
        sick_total: { type: Number, default: 14 },
        sick_used: { type: Number, default: 0 },
        maternity_total: { type: Number, default: 90 },
        maternity_used: { type: Number, default: 0 },
        paternity_total: { type: Number, default: 14 },
        paternity_used: { type: Number, default: 0 },
        unpaid_used: { type: Number, default: 0 },
    },
    { timestamps: true },
)

// Unique balance per user per year
leaveBalanceSchema.index({ user_id: 1, year: 1 }, { unique: true })

export const LeaveBalance = mongoose.model<ILeaveBalance>("LeaveBalance", leaveBalanceSchema)
