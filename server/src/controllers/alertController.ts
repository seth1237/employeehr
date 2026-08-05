import type { Response } from "express"
import Alert from "../models/Alert"
import { ContractAlert } from "../models/ContractAlert"
import { PDP } from "../models/PDP"
import { User } from "../models/User"
import { StockProduct } from "../models/StockProduct"
import { StockInvoice } from "../models/StockInvoice"
import { StockQuotation } from "../models/StockQuotation"
import type { AuthenticatedRequest } from "../middleware/auth"

export class AlertController {
  // Generate contract expiry warnings
  static async generateContractAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const contracts = await ContractAlert.find({
        org_id: req.org_id,
        status: { $in: ["active", "expiring_soon"] },
      })

      const now = new Date()
      let alertsCreated = 0

      for (const contract of contracts) {
        const daysUntilExpiry = Math.ceil(
          (contract.end_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysUntilExpiry <= contract.alert_days_before && daysUntilExpiry > 0) {
          // Check if alert already exists
          const existingAlert = await Alert.findOne({
            org_id: req.org_id,
            user_id: contract.user_id,
            alert_type: "contract_expiry",
            related_id: contract._id,
            is_dismissed: false,
          })

          if (!existingAlert) {
            const severity =
              daysUntilExpiry <= 7 ? "critical" : daysUntilExpiry <= 14 ? "high" : "medium"

            await Alert.create({
              org_id: req.org_id,
              user_id: contract.user_id,
              alert_type: "contract_expiry",
              severity,
              title: `${contract.contract_type} contract expiring soon`,
              message: `Your ${contract.contract_type} contract expires in ${daysUntilExpiry} days (${new Date(contract.end_date).toLocaleDateString()})`,
              related_id: contract._id?.toString(),
              related_type: "contract",
              action_url: `/employee/contracts#${contract._id}`,
              action_label: "View Contract",
              metadata: {
                contract_type: contract.contract_type,
                end_date: contract.end_date,
                days_until_expiry: daysUntilExpiry,
              },
            })
            alertsCreated++
          }
        } else if (daysUntilExpiry <= 0 && contract.status !== "expired") {
          // Contract has expired
          const existingAlert = await Alert.findOne({
            org_id: req.org_id,
            user_id: contract.user_id,
            alert_type: "contract_expiry",
            related_id: contract._id,
            is_dismissed: false,
          })

          if (!existingAlert) {
            await Alert.create({
              org_id: req.org_id,
              user_id: contract.user_id,
              alert_type: "contract_expiry",
              severity: "critical",
              title: `${contract.contract_type} contract has expired`,
              message: `Your ${contract.contract_type} contract expired on ${new Date(contract.end_date).toLocaleDateString()}. Action required!`,
              related_id: contract._id?.toString(),
              related_type: "contract",
              action_url: `/employee/contracts#${contract._id}`,
              action_label: "Renew Contract",
              metadata: {
                contract_type: contract.contract_type,
                end_date: contract.end_date,
                days_overdue: Math.abs(daysUntilExpiry),
              },
            })
            alertsCreated++
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: `Generated ${alertsCreated} contract alerts`,
        data: { alerts_created: alertsCreated },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate contract alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Generate incomplete PDP alerts
  static async generatePDPAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const pdps = await PDP.find({ org_id: req.org_id })

      let alertsCreated = 0

      for (const pdp of pdps) {
        const incompleteSections = []

        // Check personal profile
        if (!pdp.personalProfile || !pdp.personalProfile.values || pdp.personalProfile.values.length === 0) {
          incompleteSections.push("Personal Profile")
        }

        // Check vision & mission
        if (!pdp.visionMission || !pdp.visionMission.lifeVision) {
          incompleteSections.push("Vision & Mission")
        }

        // Check goals
        if (!pdp.goals || pdp.goals.length === 0) {
          incompleteSections.push("Goals")
        }

        // Check action plans
        if (!pdp.actionPlans || pdp.actionPlans.length === 0) {
          incompleteSections.push("Action Plans")
        }

        if (incompleteSections.length > 0) {
          const existingAlert = await Alert.findOne({
            org_id: req.org_id,
            user_id: pdp.user_id,
            alert_type: "incomplete_pdp",
            related_id: pdp._id,
            is_dismissed: false,
          })

          if (!existingAlert) {
            const completionPercent = Math.round(
              ((5 - incompleteSections.length) / 5) * 100
            )

            await Alert.create({
              org_id: req.org_id,
              user_id: pdp.user_id,
              alert_type: "incomplete_pdp",
              severity: incompleteSections.length > 3 ? "high" : "medium",
              title: "PDP Incomplete",
              message: `Your Personal Development Plan is ${completionPercent}% complete. Missing: ${incompleteSections.join(", ")}`,
              related_id: pdp._id?.toString(),
              related_type: "pdp",
              action_url: `/employee/pdp#${pdp._id}`,
              action_label: "Complete PDP",
              metadata: {
                incomplete_sections: incompleteSections,
                completion_percent: completionPercent,
              },
            })
            alertsCreated++
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: `Generated ${alertsCreated} PDP alerts`,
        data: { alerts_created: alertsCreated },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate PDP alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Generate task overload alerts
  static async generateTaskOverloadAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      // Get all users in organization
      const users = await User.find({ org_id: req.org_id, status: "active" })

      let alertsCreated = 0

      for (const user of users) {
        // For now, we'll use sample data since we need the full Task model integration
        // This should be updated once Task endpoints are integrated
        const overdueCount = 0 // Should come from actual database query
        const upcomingCount = 0 // Should come from actual database query

        if (overdueCount >= 3 || upcomingCount >= 10) {
          const existingAlert = await Alert.findOne({
            org_id: req.org_id,
            user_id: user._id,
            alert_type: "task_overload",
            is_dismissed: false,
          })

          if (!existingAlert) {
            const severity = overdueCount >= 5 ? "critical" : "high"

            await Alert.create({
              org_id: req.org_id,
              user_id: user._id?.toString(),
              alert_type: "task_overload",
              severity,
              title: "Task Overload Alert",
              message: `You have ${overdueCount} overdue tasks and ${upcomingCount} tasks due within 7 days. Consider prioritizing or requesting support.`,
              related_type: "task",
              action_url: `/employee/tasks?filter=overdue`,
              action_label: "View Tasks",
              metadata: {
                overdue_count: overdueCount,
                upcoming_count: upcomingCount,
                total_pending: overdueCount + upcomingCount,
              },
            })
            alertsCreated++
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: `Generated ${alertsCreated} task overload alerts`,
        data: { alerts_created: alertsCreated },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate task overload alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /** Admin inbox: personal alerts + operational signals (low stock, unpaid invoices, pending quotes) */
  static async getInbox(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const org_id = req.org_id
      const userId = req.user.userId

      const [alerts, lowStock, unpaidInvoices, pendingQuotes] = await Promise.all([
        Alert.find({
          org_id,
          user_id: userId,
          is_dismissed: false,
        })
          .sort({ created_at: -1 })
          .limit(40)
          .lean(),
        StockProduct.find({
          org_id,
          isActive: true,
          productType: "physical",
          $expr: { $lte: ["$currentQuantity", "$minAlertQuantity"] },
        })
          .select("name currentQuantity minAlertQuantity category updatedAt")
          .sort({ currentQuantity: 1 })
          .limit(8)
          .lean(),
        StockInvoice.find({
          org_id,
          status: "issued",
        })
          .select("invoiceNumber client status subTotal createdAt")
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
        StockQuotation.find({
          org_id,
          status: "pending_approval",
        })
          .select("quotationNumber client status subTotal createdAt")
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
      ])

      type InboxItem = {
        id: string
        source: "alert" | "operational"
        title: string
        message: string
        severity: "low" | "medium" | "high" | "critical"
        is_read: boolean
        created_at: string
        action_url?: string
        action_label?: string
      }

      const items: InboxItem[] = []

      for (const a of alerts) {
        items.push({
          id: String(a._id),
          source: "alert",
          title: a.title,
          message: a.message,
          severity: (a.severity as InboxItem["severity"]) || "medium",
          is_read: Boolean(a.is_read),
          created_at: new Date(a.created_at || Date.now()).toISOString(),
          action_url: a.action_url || "/admin/alerts",
          action_label: a.action_label || "View",
        })
      }

      for (const p of lowStock) {
        const qty = Number(p.currentQuantity || 0)
        const min = Number(p.minAlertQuantity || 0)
        items.push({
          id: `stock-${p._id}`,
          source: "operational",
          title: `Low stock: ${p.name}`,
          message: `Quantity ${qty} is at or below alert level ${min}${p.category ? ` · ${p.category}` : ""}`,
          severity: qty <= 0 ? "critical" : "high",
          is_read: false,
          created_at: new Date((p as any).updatedAt || Date.now()).toISOString(),
          action_url: `/admin/stock/add-inventory?productId=${p._id}`,
          action_label: "Open product",
        })
      }

      for (const inv of unpaidInvoices) {
        items.push({
          id: `invoice-${inv._id}`,
          source: "operational",
          title: `Unpaid invoice ${inv.invoiceNumber}`,
          message: `${inv.client?.name || "Client"} · KES ${Number(inv.subTotal || 0).toLocaleString("en-KE")}`,
          severity: "medium",
          is_read: false,
          created_at: new Date((inv as any).createdAt || Date.now()).toISOString(),
          action_url: `/admin/stock/invoices/${inv._id}`,
          action_label: "Open invoice",
        })
      }

      for (const qt of pendingQuotes) {
        items.push({
          id: `quote-${qt._id}`,
          source: "operational",
          title: `Quote awaiting approval ${qt.quotationNumber}`,
          message: `${qt.client?.name || "Client"} · KES ${Number(qt.subTotal || 0).toLocaleString("en-KE")}`,
          severity: "high",
          is_read: false,
          created_at: new Date((qt as any).createdAt || Date.now()).toISOString(),
          action_url: `/admin/stock/quotations/${qt._id}`,
          action_label: "Review quote",
        })
      }

      items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      const unread = items.filter((i) => !i.is_read).length

      return res.status(200).json({
        success: true,
        data: {
          items: items.slice(0, 40),
          unread,
          totals: {
            alerts: alerts.length,
            lowStock: lowStock.length,
            unpaidInvoices: unpaidInvoices.length,
            pendingQuotes: pendingQuotes.length,
          },
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch inbox",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get all alerts for user
  static async getAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { severity, alert_type, include_dismissed } = req.query

      const query: any = {
        org_id: req.org_id,
        user_id: req.user.userId,
      }

      if (!include_dismissed) {
        query.is_dismissed = false
      }

      if (severity) query.severity = severity
      if (alert_type) query.alert_type = alert_type

      const alerts = await Alert.find(query).sort({ severity: -1, created_at: -1 })

      // Separate into categories
      const criticalAlerts = alerts.filter((a) => a.severity === "critical")
      const highAlerts = alerts.filter((a) => a.severity === "high")
      const mediumAlerts = alerts.filter((a) => a.severity === "medium")
      const lowAlerts = alerts.filter((a) => a.severity === "low")

      return res.status(200).json({
        success: true,
        message: "Alerts fetched successfully",
        data: {
          total: alerts.length,
          unread: alerts.filter((a) => !a.is_read).length,
          by_severity: {
            critical: criticalAlerts.length,
            high: highAlerts.length,
            medium: mediumAlerts.length,
            low: lowAlerts.length,
          },
          alerts,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Mark alert as read
  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { alertId } = req.params

      const alert = await Alert.findOneAndUpdate(
        {
          _id: alertId,
          org_id: req.org_id,
          user_id: req.user.userId,
        },
        { $set: { is_read: true } },
        { new: true }
      )

      if (!alert) {
        return res.status(404).json({ success: false, message: "Alert not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Alert marked as read",
        data: alert,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to mark alert as read",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Dismiss alert
  static async dismissAlert(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { alertId } = req.params

      const alert = await Alert.findOneAndUpdate(
        {
          _id: alertId,
          org_id: req.org_id,
          user_id: req.user.userId,
        },
        { $set: { is_dismissed: true } },
        { new: true }
      )

      if (!alert) {
        return res.status(404).json({ success: false, message: "Alert not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Alert dismissed",
        data: alert,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to dismiss alert",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Dismiss all alerts of a type
  static async dismissAllOfType(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { alert_type } = req.params

      const result = await Alert.updateMany(
        {
          org_id: req.org_id,
          user_id: req.user.userId,
          alert_type,
          is_dismissed: false,
        },
        { $set: { is_dismissed: true } }
      )

      return res.status(200).json({
        success: true,
        message: `Dismissed ${result.modifiedCount} alerts`,
        data: { dismissed_count: result.modifiedCount },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to dismiss alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get alert summary
  static async getAlertSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const summary = await Alert.aggregate([
        {
          $match: {
            org_id: req.org_id,
            user_id: req.user.userId,
            is_dismissed: false,
          },
        },
        {
          $group: {
            _id: "$alert_type",
            count: { $sum: 1 },
            severity: { $first: "$severity" },
            critical: {
              $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
            },
            high: {
              $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] },
            },
            medium: {
              $sum: { $cond: [{ $eq: ["$severity", "medium"] }, 1, 0] },
            },
            low: {
              $sum: { $cond: [{ $eq: ["$severity", "low"] }, 1, 0] },
            },
          },
        },
      ])

      return res.status(200).json({
        success: true,
        message: "Alert summary fetched",
        data: summary,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch alert summary",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Delete alert
  static async deleteAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const { alertId } = req.params

      await Alert.findByIdAndDelete(alertId)

      return res.status(200).json({
        success: true,
        message: "Alert deleted successfully",
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete alert",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
