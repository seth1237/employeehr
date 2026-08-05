import { Holiday } from "../models/Holiday"

interface NagerHoliday {
    date: string
    localName: string
    name: string
    countryCode: string
    fixed: boolean
    global: boolean
    counties: string[] | null
    launchYear: number | null
    types: string[]
}

export class HolidayService {
    /**
     * Fetch public holidays from Nager.Date API and store them for the organization
     */
    static async fetchAndStorePublicHolidays(countryCode: string, year: number, org_id: string) {
        try {
            if (!countryCode) {
                throw new Error("Country code is required")
            }

            const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`)

            if (!response.ok) {
                throw new Error(`Failed to fetch holidays: ${response.statusText}`)
            }

            const publicHolidays = (await response.json()) as NagerHoliday[]

            // Delete existing public holidays for this org/year to avoid duplicates/stale data
            await Holiday.deleteMany({
                org_id,
                year,
                type: "public",
            })

            const holidaysToInsert = publicHolidays.map((h) => ({
                org_id,
                name: h.name,
                date: new Date(h.date),
                countryCode,
                type: "public",
                year,
            }))

            if (holidaysToInsert.length > 0) {
                await Holiday.insertMany(holidaysToInsert)
            }

            return {
                success: true,
                count: holidaysToInsert.length,
                message: `Successfully synced ${holidaysToInsert.length} holidays for ${countryCode} in ${year}`,
            }
        } catch (error) {
            console.error("Error syncing holidays:", error)
            throw error
        }
    }

    /**
     * Get holidays for an organization in a specific year
     */
    static async getHolidays(org_id: string, year: number) {
        const startDate = new Date(`${year}-01-01`)
        const endDate = new Date(`${year}-12-31`)

        return await Holiday.find({
            org_id,
            date: { $gte: startDate, $lte: endDate },
        }).sort({ date: 1 })
    }
}
