import mongoose, { Schema, type Document } from "mongoose"

export interface IHoliday extends Document {
    org_id: string
    name: string
    date: Date
    countryCode: string
    type: string
    year: number
    createdAt: Date
    updatedAt: Date
}

const holidaySchema = new Schema<IHoliday>(
    {
        org_id: { type: String, required: true },
        name: { type: String, required: true },
        date: { type: Date, required: true },
        countryCode: { type: String, required: true },
        type: { type: String, default: "public" }, // public, company
        year: { type: Number, required: true },
    },
    { timestamps: true },
)

holidaySchema.index({ org_id: 1, date: 1 })
holidaySchema.index({ countryCode: 1, year: 1 })

export const Holiday = mongoose.model<IHoliday>("Holiday", holidaySchema)
