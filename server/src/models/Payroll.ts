import mongoose, { Schema } from "mongoose"

export interface IPayroll extends Document {
    org_id: string
    user_id: string
    month: string // YYYY-MM
    base_salary: number
    bonus: number
    other_bonus_items: { name: string; amount: number }[]
    deduction_items: { name: string; amount: number }[]
    total_deductions: number
    net_pay: number
    status: 'draft' | 'processed' | 'paid'
    generated_at: Date
    standard_deduction_overrides: Record<string, any>
    // createdAt and updatedAt are added by timestamps: true
    createdAt: Date
    updatedAt: Date
}

const payrollSchema = new Schema<IPayroll>(
    {
        org_id: { type: String, required: true },
        user_id: { type: String, required: true, index: true },
        month: { type: String, required: true },
        base_salary: { type: Number, required: true },
        bonus: { type: Number, default: 0 },
        other_bonus_items: [{
            name: { type: String, required: true },
            amount: { type: Number, required: true }
        }],
        deduction_items: [{
            name: { type: String, required: true },
            amount: { type: Number, required: true }
        }],
        total_deductions: { type: Number, default: 0 },
        net_pay: { type: Number, required: true },
        status: {
            type: String,
            enum: ["draft", "processed", "paid"],
            default: "processed", // Changed default from "draft" to "processed"
        },
        generated_at: { type: Date, default: Date.now },
        standard_deduction_overrides: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
)

// Unique payroll per user per month
payrollSchema.index({ user_id: 1, month: 1 }, { unique: true })

export const Payroll = mongoose.model<IPayroll>("Payroll", payrollSchema)
