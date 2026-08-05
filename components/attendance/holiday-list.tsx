"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar as CalendarIcon, MapPin } from "lucide-react"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface Holiday {
    _id: string
    name: string
    date: string
    countryCode: string
    type: string
    year: number
}

export function HolidayList() {
    const [holidays, setHolidays] = useState<Holiday[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const currentYear = new Date().getFullYear()
                const res = await api.holidays.getAll(currentYear)
                if (res.success && Array.isArray(res.data)) {
                    setHolidays(res.data)
                } else {
                    console.warn("Invalid holidays data:", res)
                    setHolidays([])
                }
            } catch (error) {
                console.error("Failed to fetch holidays:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchHolidays()
    }, [])

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading holidays...</div>
    }

    if (holidays.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Public Holidays</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No holidays found for this year.</p>
                </CardContent>
            </Card>
        )
    }

    // Sort holidays by date
    const sortedHolidays = [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Filter for upcoming holidays (or show all if preferred, let's show all but maybe highlight upcoming)
    const today = new Date()
    const upcomingHolidays = sortedHolidays.filter(h => new Date(h.date) >= today)
    const pastHolidays = sortedHolidays.filter(h => new Date(h.date) < today)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Public Holidays ({new Date().getFullYear()})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {upcomingHolidays.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Upcoming</h4>
                            <div className="space-y-2">
                                {upcomingHolidays.map((holiday) => (
                                    <div key={holiday._id} className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{holiday.name}</span>
                                            <span className="text-xs text-muted-foreground">{new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                        {(holiday.type !== 'public') && (
                                            <Badge variant="outline" className="text-xs">{holiday.type}</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {pastHolidays.length > 0 && (
                        <div className="pt-2">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Past</h4>
                            <div className="space-y-2 opacity-60">
                                {pastHolidays.map((holiday) => (
                                    <div key={holiday._id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/50">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{holiday.name}</span>
                                            <span className="text-xs text-muted-foreground">{new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
