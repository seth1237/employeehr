import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { User } from "../models/User"
import { KPI } from "../models/KPI"
import { Award } from "../models/Award"
import { Performance } from "../models/Performance"
import { Attendance } from "../models/Attendance"
import { LeaveRequest } from "../models/LeaveRequest"
import { Payroll } from "../models/Payroll"
import { Meeting } from "../models/Meeting"
import { Report } from "../models/Report"
import { Feedback } from "../models/Feedback"
import { PDP } from "../models/PDP"
import { StockInvoice } from "../models/StockInvoice"
import { StockProduct } from "../models/StockProduct"
import { StockQuotation } from "../models/StockQuotation"

const DEPARTMENT_ORDER = ["HR", "Operations", "Finance", "Sales", "Engineering", "Support"]
const PENDING_DISPATCH = new Set(["not_assigned", "assigned", "packing", "packed"])

async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`getAdminStats ${label}:`, error)
    return fallback
  }
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function percentDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export class DashboardController {
  static async getAdminStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }
      const orgId = req.org_id
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const startOfTrend = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const startOfHeatmap = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 16 * 7)
      startOfHeatmap.setHours(0, 0, 0, 0)
      const startOfVelocity = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 11 * 7)
      startOfVelocity.setHours(0, 0, 0, 0)

      const [
        users,
        kpiCount,
        awardCount,
        feedbackCount,
        pdpCount,
        payrollProcessed,
        quotationCount,
        performances,
        leaveDocs,
        meetingDocs,
        reportDocs,
        attendanceToday,
        attendanceMonth,
        products,
        invoiceFacet,
      ] = await Promise.all([
        safeQuery(
          "users",
          () =>
            User.find({ org_id: orgId })
              .select("_id firstName lastName email department status createdAt")
              .lean(),
          [] as any[],
        ),
        safeQuery("kpis", () => KPI.countDocuments({ org_id: orgId }), 0),
        safeQuery("awards", () => Award.countDocuments({ org_id: orgId }), 0),
        safeQuery("feedback", () => Feedback.countDocuments({ org_id: orgId }), 0),
        safeQuery("pdps", () => PDP.countDocuments({ org_id: orgId }), 0),
        safeQuery(
          "payroll",
          () => Payroll.countDocuments({ org_id: orgId, status: { $in: ["processed", "paid"] } }),
          0,
        ),
        safeQuery("quotations", () => StockQuotation.countDocuments({ org_id: orgId }), 0),
        safeQuery(
          "performances",
          () =>
            Performance.aggregate([
              { $match: { org_id: orgId } },
              { $group: { _id: "$user_id", avg: { $avg: "$overall_score" }, n: { $sum: 1 } } },
            ]),
          [] as any[],
        ),
        safeQuery(
          "leave",
          () =>
            LeaveRequest.find({ org_id: orgId })
              .select("status leave_type createdAt updatedAt user_id user")
              .sort({ updatedAt: -1 })
              .limit(200)
              .lean(),
          [] as any[],
        ),
        safeQuery(
          "meetings",
          () =>
            Meeting.find({ org_id: orgId, $or: [{ scheduled_at: { $gte: startOfTrend } }, { createdAt: { $gte: startOfTrend } }] })
              .select("title scheduled_at scheduled_start createdAt updatedAt organizer_id")
              .sort({ updatedAt: -1 })
              .limit(300)
              .lean(),
          [] as any[],
        ),
        safeQuery(
          "reports",
          () =>
            Report.find({
              org_id: orgId,
              $or: [{ createdAt: { $gte: startOfTrend } }, { created_at: { $gte: startOfTrend } }],
            })
              .select("createdAt created_at user_id")
              .limit(400)
              .lean(),
          [] as any[],
        ),
        safeQuery(
          "attendanceToday",
          () =>
            Attendance.aggregate([
              {
                $match: {
                  org_id: orgId,
                  $or: [{ date: { $gte: startOfToday } }, { createdAt: { $gte: startOfToday } }],
                },
              },
              {
                $group: {
                  _id: null,
                  checkedIn: { $sum: { $cond: [{ $gt: ["$checkIn", null] }, 1, 0] } },
                  checkedOut: { $sum: { $cond: [{ $gt: ["$checkOut", null] }, 1, 0] } },
                },
              },
            ]),
          [] as any[],
        ),
        safeQuery(
          "attendanceMonth",
          () =>
            Attendance.aggregate([
              { $match: { org_id: orgId, date: { $gte: startOfMonth } } },
              {
                $group: {
                  _id: "$user_id",
                  total: { $sum: 1 },
                  attended: {
                    $sum: {
                      $cond: [{ $in: ["$status", ["present", "late", "half_day"]] }, 1, 0],
                    },
                  },
                },
              },
            ]),
          [] as any[],
        ),
        safeQuery(
          "products",
          () =>
            StockProduct.find({ org_id: orgId })
              .select("name currentQuantity")
              .sort({ currentQuantity: -1 })
              .limit(400)
              .lean(),
          [] as any[],
        ),
        safeQuery(
          "invoices",
          () =>
            StockInvoice.aggregate([
              { $match: { org_id: orgId } },
              {
                $facet: {
                  total: [{ $count: "n" }],
                  converted: [
                    {
                      $match: {
                        $or: [
                          { quotationId: { $exists: true, $nin: [null, ""] } },
                          { quotationNumber: { $exists: true, $nin: [null, ""] } },
                        ],
                      },
                    },
                    { $count: "n" },
                  ],
                  thisMonth: [
                    { $match: { createdAt: { $gte: startOfMonth } } },
                    { $count: "n" },
                  ],
                  prevMonth: [
                    { $match: { createdAt: { $gte: startOfPrevMonth, $lt: startOfMonth } } },
                    { $count: "n" },
                  ],
                  monthly: [
                    { $match: { createdAt: { $gte: startOfTrend } } },
                    {
                      $group: {
                        _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
                        n: { $sum: 1 },
                        sales: {
                          $sum: {
                            $max: [{ $ifNull: ["$grandTotal", 0] }, { $ifNull: ["$subTotal", 0] }],
                          },
                        },
                      },
                    },
                  ],
                  dispatch: [
                    { $match: { createdAt: { $gte: startOfMonth } } },
                    {
                      $group: {
                        _id: { $ifNull: ["$dispatch.status", "not_assigned"] },
                        n: { $sum: 1 },
                      },
                    },
                  ],
                  topProducts: [
                    { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
                    {
                      $group: {
                        _id: { $ifNull: ["$items.productId", "$items.productName"] },
                        productName: { $first: "$items.productName" },
                        soldQuantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
                        salesAmount: { $sum: { $ifNull: ["$items.lineTotal", 0] } },
                      },
                    },
                    { $sort: { soldQuantity: -1 } },
                    { $limit: 5 },
                  ],
                  productWeekly: [
                    { $match: { createdAt: { $gte: startOfVelocity } } },
                    { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
                    {
                      $group: {
                        _id: {
                          product: { $ifNull: ["$items.productName", "Unknown"] },
                          day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        },
                        productName: { $first: { $ifNull: ["$items.productName", "Unknown"] } },
                        qty: { $sum: { $ifNull: ["$items.quantity", 0] } },
                      },
                    },
                  ],
                  topClients: [
                    {
                      $group: {
                        _id: { $ifNull: ["$client.name", "$clientName"] },
                        spent: { $sum: { $ifNull: ["$subTotal", 0] } },
                        invoiceCount: { $sum: 1 },
                      },
                    },
                    { $sort: { spent: -1 } },
                    { $limit: 8 },
                  ],
                  topSellers: [
                    {
                      $group: {
                        _id: "$createdBy",
                        spent: { $sum: { $ifNull: ["$subTotal", 0] } },
                      },
                    },
                    { $sort: { spent: -1 } },
                    { $limit: 1 },
                  ],
                  recent: [
                    { $sort: { updatedAt: -1 } },
                    { $limit: 8 },
                    { $project: { invoiceNumber: 1, number: 1, updatedAt: 1, createdAt: 1 } },
                  ],
                  daily: [
                    { $match: { createdAt: { $gte: startOfHeatmap } } },
                    {
                      $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        n: { $sum: 1 },
                        sales: {
                          $sum: {
                            $max: [{ $ifNull: ["$grandTotal", 0] }, { $ifNull: ["$subTotal", 0] }],
                          },
                        },
                      },
                    },
                  ],
                },
              },
            ]),
          [] as any[],
        ),
      ])

      const invoiceData = invoiceFacet[0] || {}
      const invoiceCount = invoiceData.total?.[0]?.n || 0
      const convertedCount = invoiceData.converted?.[0]?.n || 0
      const invoicesThisMonth = invoiceData.thisMonth?.[0]?.n || 0
      const invoicesPrevMonth = invoiceData.prevMonth?.[0]?.n || 0

      const userById = new Map(users.map((user: any) => [String(user._id), user]))
      const perfByUser = new Map(
        performances.map((row: any) => [String(row._id), { avg: Number(row.avg || 0), n: Number(row.n || 0) }]),
      )
      const attendanceByUser = new Map(
        attendanceMonth.map((row: any) => [String(row._id), row]),
      )

      const pendingLeave = leaveDocs.filter((row: any) => row.status === "pending")
      const meetingsThisMonth = meetingDocs.filter((row: any) => {
        const date = new Date(row.scheduled_at || row.scheduled_start || row.createdAt)
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      const reportsThisMonth = reportDocs.filter((row: any) => {
        const date = new Date(row.createdAt || row.created_at)
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })

      let scoreTotal = 0
      let scoreCount = 0
      performances.forEach((row: any) => {
        scoreTotal += Number(row.avg || 0) * Number(row.n || 1)
        scoreCount += Number(row.n || 0)
      })

      const departments = DEPARTMENT_ORDER.map((name) => {
        const departmentUsers = users.filter((user: any) => (user.department || "Unassigned") === name)
        const deptUserIds = departmentUsers.map((user: any) => String(user._id))
        const deptSet = new Set(deptUserIds)
        const deptPerf = deptUserIds
          .map((id) => perfByUser.get(id))
          .filter(Boolean) as Array<{ avg: number; n: number }>
        const avgPerformance = deptPerf.length
          ? deptPerf.reduce((sum, row) => sum + row.avg, 0) / deptPerf.length
          : 0
        const leaveCount = pendingLeave.filter((row: any) =>
          deptSet.has(String(row.user_id || row.user)),
        ).length
        const reportsCount = reportsThisMonth.filter((row: any) => {
          const userId = String(row.user_id?._id || row.user_id || "")
          return deptSet.has(userId)
        }).length
        let attended = 0
        let total = 0
        deptUserIds.forEach((id) => {
          const row = attendanceByUser.get(id)
          if (!row) return
          attended += Number(row.attended || 0)
          total += Number(row.total || 0)
        })
        return {
          name,
          headcount: departmentUsers.length,
          avgPerformance: Number(avgPerformance.toFixed(1)),
          pendingLeave: leaveCount,
          meetingsThisMonth: meetingsThisMonth.filter((row: any) =>
            deptSet.has(String(row.organizer_id)),
          ).length,
          reportsThisMonth: reportsCount,
          attendanceRate: total ? Math.round((attended / total) * 100) : 0,
        }
      }).filter((row) => row.headcount > 0)
        .sort((a, b) => b.headcount - a.headcount)

      const trendMonths = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
        return {
          key: monthKey(date),
          label: date.toLocaleString("default", { month: "short" }),
          meetings: 0,
          reports: 0,
          invoices: 0,
          sales: 0,
        }
      })
      const trendIndex = new Map(trendMonths.map((month, index) => [month.key, index]))
      const bump = (value: any, field: "meetings" | "reports" | "invoices") => {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return
        const index = trendIndex.get(monthKey(date))
        if (index === undefined) return
        trendMonths[index][field] += 1
      }
      meetingDocs.forEach((row: any) => bump(row.scheduled_at || row.createdAt, "meetings"))
      reportDocs.forEach((row: any) => bump(row.createdAt || row.created_at, "reports"))
      ;(invoiceData.monthly || []).forEach((row: any) => {
        const date = new Date(row._id?.y || now.getFullYear(), (row._id?.m || 1) - 1, 1)
        const index = trendIndex.get(monthKey(date))
        if (index === undefined) return
        trendMonths[index].invoices = Number(row.n || 0)
        trendMonths[index].sales = Number(row.sales || 0)
      })

      let dispatchPending = 0
      let dispatchDispatched = 0
      let dispatchDelivered = 0
      ;(invoiceData.dispatch || []).forEach((row: any) => {
        const status = String(row._id || "not_assigned")
        const count = Number(row.n || 0)
        if (status === "delivered") dispatchDelivered += count
        else if (status === "dispatched") dispatchDispatched += count
        else if (PENDING_DISPATCH.has(status)) dispatchPending += count
      })

      const topSeller = invoiceData.topSellers?.[0]
      const sellerUser = topSeller?._id ? userById.get(String(topSeller._id)) : null
      const leadingSalesPerson = sellerUser
        ? `${sellerUser.firstName || ""} ${sellerUser.lastName || ""}`.trim() || sellerUser.email
        : topSeller?._id
          ? String(topSeller._id)
          : "No sales data"

      const mostInStock = products.slice(0, 5).map((product: any) => ({
        name: product.name,
        currentQuantity: Number(product.currentQuantity || 0),
      }))
      const outOfStock = products
        .filter((product: any) => Number(product.currentQuantity || 0) <= 0)
        .slice(0, 30)
        .map((product: any) => ({
          name: product.name,
          currentQuantity: Number(product.currentQuantity || 0),
        }))
      const critical = outOfStock
      const warning = products
        .filter((product: any) => {
          const qty = Number(product.currentQuantity || 0)
          return qty > 0 && qty < 5
        })
        .slice(0, 30)
        .map((product: any) => ({ name: product.name, currentQuantity: Number(product.currentQuantity || 0) }))
      const low = products
        .filter((product: any) => {
          const qty = Number(product.currentQuantity || 0)
          return qty >= 5 && qty < 10
        })
        .slice(0, 30)
        .map((product: any) => ({ name: product.name, currentQuantity: Number(product.currentQuantity || 0) }))

      const activity = [
        ...(invoiceData.recent || []).map((invoice: any) => ({
          label: `Invoice ${invoice.invoiceNumber || invoice.number || String(invoice._id || "").slice(-6)}`,
          detail: "Updated in stock billing",
          timestamp: invoice.updatedAt || invoice.createdAt,
          href: "/admin/stock/invoices",
        })),
        ...leaveDocs.slice(0, 8).map((request: any) => ({
          label: `Leave ${request.status || "request"}`,
          detail: `${request.leave_type || "Leave"} request updated`,
          timestamp: request.updatedAt || request.createdAt,
          href: "/admin/leave",
        })),
        ...meetingDocs.slice(0, 8).map((meeting: any) => ({
          label: meeting.title || "Meeting update",
          detail: "Meeting activity captured",
          timestamp: meeting.updatedAt || meeting.scheduled_at || meeting.createdAt,
          href: "/admin/meetings",
        })),
      ]
        .filter((item) => item.timestamp)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 6)

      const usersThisMonth = users.filter((user: any) => {
        const date = new Date(user.createdAt)
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }).length
      const usersPrevMonth = users.filter((user: any) => {
        const date = new Date(user.createdAt)
        return date.getMonth() === startOfPrevMonth.getMonth() && date.getFullYear() === startOfPrevMonth.getFullYear()
      }).length
      const leaveThisMonth = leaveDocs.filter((row: any) => {
        const date = new Date(row.createdAt || row.updatedAt)
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }).length
      const leavePrevMonth = leaveDocs.filter((row: any) => {
        const date = new Date(row.createdAt || row.updatedAt)
        return date.getMonth() === startOfPrevMonth.getMonth() && date.getFullYear() === startOfPrevMonth.getFullYear()
      }).length
      const meetingsPrevMonth = meetingDocs.filter((row: any) => {
        const date = new Date(row.scheduled_at || row.createdAt)
        return date.getMonth() === startOfPrevMonth.getMonth() && date.getFullYear() === startOfPrevMonth.getFullYear()
      }).length

      const today = attendanceToday[0] || { checkedIn: 0, checkedOut: 0 }
      const uniqueDepartments = new Set(users.map((user: any) => user.department).filter(Boolean))

      const dailyMap = new Map<string, { date: string; invoices: number; meetings: number; reports: number; sales: number }>()
      const ensureDay = (iso: string) => {
        if (!dailyMap.has(iso)) {
          dailyMap.set(iso, { date: iso, invoices: 0, meetings: 0, reports: 0, sales: 0 })
        }
        return dailyMap.get(iso)!
      }
      const toIso = (value: any) => {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return null
        return date.toISOString().slice(0, 10)
      }
      ;(invoiceData.daily || []).forEach((row: any) => {
        const iso = String(row._id || "")
        if (!iso) return
        ensureDay(iso).invoices = Number(row.n || 0)
        ensureDay(iso).sales = Number(row.sales || 0)
      })
      meetingDocs.forEach((row: any) => {
        const iso = toIso(row.scheduled_at || row.createdAt)
        if (!iso || iso < startOfHeatmap.toISOString().slice(0, 10)) return
        ensureDay(iso).meetings += 1
      })
      reportDocs.forEach((row: any) => {
        const iso = toIso(row.createdAt || row.created_at)
        if (!iso || iso < startOfHeatmap.toISOString().slice(0, 10)) return
        ensureDay(iso).reports += 1
      })
      const dailyActivity = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

      const WEEK_MS = 7 * 24 * 60 * 60 * 1000
      const weekLabels = Array.from({ length: 12 }, (_, index) => `Wk ${index + 1}`)
      const productTotals = new Map<string, { name: string; total: number; volumes: number[] }>()
      ;(invoiceData.productWeekly || []).forEach((row: any) => {
        const name = String(row.productName || row._id?.product || "Unknown")
        const day = new Date(`${row._id?.day || row._id}T00:00:00`)
        if (Number.isNaN(day.getTime())) return
        const weekIndex = Math.min(11, Math.max(0, Math.floor((day.getTime() - startOfVelocity.getTime()) / WEEK_MS)))
        const current = productTotals.get(name) || { name, total: 0, volumes: Array.from({ length: 12 }, () => 0) }
        const qty = Number(row.qty || 0)
        current.volumes[weekIndex] += qty
        current.total += qty
        productTotals.set(name, current)
      })
      const purchaseVelocity = {
        weeks: weekLabels,
        products: Array.from(productTotals.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
          .map((row) => ({ name: row.name, volumes: row.volumes })),
      }

      return res.status(200).json({
        success: true,
        data: {
          snapshot: true,
          stats: {
            totalUsers: users.length,
            activeUsers: users.filter((user: any) => user.status !== "inactive").length,
            departments: uniqueDepartments.size,
            kpis: kpiCount,
            awards: awardCount,
            avgPerformance: scoreCount ? scoreTotal / scoreCount : 0,
            pendingLeave: pendingLeave.length,
            meetingsThisMonth: meetingsThisMonth.length,
            reportsThisMonth: reportsThisMonth.length,
            payrollProcessed,
            invoices: invoiceCount,
            quotations: quotationCount,
            products: products.length,
            feedback: feedbackCount,
            pdps: pdpCount,
          },
          attendanceToday: {
            checkedIn: Number(today.checkedIn || 0),
            checkedOut: Number(today.checkedOut || 0),
            pendingCheckOut: Math.max(0, Number(today.checkedIn || 0) - Number(today.checkedOut || 0)),
          },
          dispatch: {
            pending: dispatchPending,
            dispatched: dispatchDispatched,
            delivered: dispatchDelivered,
          },
          inventory: {
            quotationsGenerated: quotationCount,
            invoicesConverted: convertedCount,
            leadingSalesPerson,
            leadingSalesAmount: Number(topSeller?.spent || 0),
          },
          departments,
          salesAnalytics: {
            mostInStock,
            outOfStock,
            topSelling: (invoiceData.topProducts || []).map((row: any) => ({
              productName: row.productName || "Unknown",
              soldQuantity: Number(row.soldQuantity || 0),
              salesAmount: Number(row.salesAmount || 0),
            })),
          },
          monthlyTrends: trendMonths,
          dailyActivity,
          purchaseVelocity,
          activityFeed: activity,
          kpiTrends: {
            employees: percentDelta(usersThisMonth, usersPrevMonth),
            leave: percentDelta(leaveThisMonth, leavePrevMonth),
            meetings: percentDelta(meetingsThisMonth.length, meetingsPrevMonth),
            invoices: percentDelta(invoicesThisMonth, invoicesPrevMonth),
          },
          topPurchasingClients: (invoiceData.topClients || []).map((row: any) => ({
            name: row._id || "Unknown",
            spent: Number(row.spent || 0),
            invoiceCount: Number(row.invoiceCount || 0),
          })),
          stockSeverity: {
            critical,
            warning,
            low,
            productCount: products.length,
          },
        },
      })
    } catch (error) {
      console.error("Error in getAdminStats:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard stats",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
