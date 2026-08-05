import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { HolidayService } from "../services/holidayService"
import { Company } from "../models/Company"

export class HolidayController {
    static async syncHolidays(req: AuthenticatedRequest, res: Response) {
        try {
            const { year } = req.body
            const org_id = req.user?.org_id

            if (!org_id) {
                return res.status(401).json({ success: false, message: "Unauthorized" })
            }

            // Get company to find country code
            const company = await Company.findById(org_id)
            if (!company || !company.countryCode) {
                return res.status(400).json({
                    success: false,
                    message: "Company country code not found. Please update company settings first.",
                })
            }

            const currentYear = year || new Date().getFullYear()
            const result = await HolidayService.fetchAndStorePublicHolidays(company.countryCode, currentYear, org_id)

            res.status(200).json(result)
            return
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to sync holidays",
                error: error.message,
            })
            return
        }
    }

    static async getHolidays(req: AuthenticatedRequest, res: Response) {
        try {
            const org_id = req.user?.org_id
            const year = Number.parseInt(req.query.year as string) || new Date().getFullYear()

            if (!org_id) {
                return res.status(401).json({ success: false, message: "Unauthorized" })
            }

            const holidays = await HolidayService.getHolidays(org_id, year)

            res.status(200).json({
                success: true,
                data: holidays,
            })
            return
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch holidays",
                error: error.message,
            })
            return
        }
    }
}
