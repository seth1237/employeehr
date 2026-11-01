/** Kenya public holidays used when counting leave working days. */
const FIXED_HOLIDAYS = [
  { month: 1, day: 1 },
  { month: 5, day: 1 },
  { month: 6, day: 1 },
  { month: 10, day: 20 },
  { month: 12, day: 12 },
  { month: 12, day: 25 },
  { month: 12, day: 26 },
]

/** Easter-dependent holidays (Good Friday, Easter Monday) for nearby years. */
const EASTER_MONDAYS: Record<number, string> = {
  2025: "2025-04-21",
  2026: "2026-04-06",
  2027: "2027-03-29",
  2028: "2028-04-17",
}

const CALENDAR_LEAVE_TYPES = new Set(["Maternity", "Paternity"])

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function holidaySet(year: number): Set<string> {
  const days = new Set<string>()
  for (const item of FIXED_HOLIDAYS) {
    days.add(`${year}-${String(item.month).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`)
  }
  const easterMonday = EASTER_MONDAYS[year]
  if (easterMonday) {
    const monday = new Date(`${easterMonday}T00:00:00`)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() - 3)
    days.add(toDateKey(friday))
    days.add(toDateKey(monday))
  }
  return days
}

export function countCalendarDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  if (end < start) return 0
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export function countWorkingDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  if (end < start) return 0

  const holidaysByYear = new Map<number, Set<string>>()
  let days = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    const year = cursor.getFullYear()
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) {
      let holidays = holidaysByYear.get(year)
      if (!holidays) {
        holidays = holidaySet(year)
        holidaysByYear.set(year, holidays)
      }
      if (!holidays.has(toDateKey(cursor))) days += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function countLeaveDays(type: string, startDate: Date, endDate: Date): number {
  if (CALENDAR_LEAVE_TYPES.has(type)) return countCalendarDays(startDate, endDate)
  return countWorkingDays(startDate, endDate)
}
