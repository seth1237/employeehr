import mongoose, { Schema } from "mongoose"

export interface ILeaveRequest extends Document {
    org_id: string
    user_id: string
    type: "Annual" | "Sick" | "Maternity" | "Paternity" | "Unpaid" | "Other"
    startDate: Date
    endDate: Date
    reason: string
    status: "pending" | "approved" | "rejected"
    manager_id?: string
    manager_comment?: string
    createdAt: Date
    updatedAt: Date
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
    {
        org_id: { type: String, required: true },
        user_id: { type: String, required: true, index: true },
        type: {
            type: String,
            enum: ["Annual", "Sick", "Maternity", "Paternity", "Unpaid", "Other"],
            required: true,
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        reason: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        manager_id: { type: String },
        manager_comment: { type: String },
    },
    { timestamps: true },
)

export const LeaveRequest = mongoose.model<ILeaveRequest>("LeaveRequest", leaveRequestSchema)
