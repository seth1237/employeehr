import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { CashBankAccount } from "../models/CashBankAccount"
import { CashTransaction } from "../models/CashTransaction"
import { StockInvoicePayment } from "../models/StockInvoicePayment"
import { StockExpense } from "../models/StockExpense"
import { Payroll } from "../models/Payroll"
import { User } from "../models/User"
import {
  ensureDefaultCashAccounts,
  findDefaultAccountForMethod,
  postPayrollToCashbook,
  postTransaction,
} from "../services/cashBankingPosting.service"

function parseAmount(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Number(n.toFixed(2))
}

function parseDate(value: unknown, fallback = new Date()) {
  if (!value) return fallback
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? fallback : d
}

async function getAccountOrThrow(orgId: string, accountId: string) {
  const account = await CashBankAccount.findOne({ _id: accountId, org_id: orgId })
  if (!account) throw new Error("Account not found")
  return account
}

export class CashBankingController {
  static async getOverview(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      await ensureDefaultCashAccounts(req.org_id, String(req.user.userId))

      const accounts = await CashBankAccount.find({
        org_id: req.org_id,
        status: "active",
      })
        .sort({ type: 1, name: 1 })
        .lean()

      const byType = {
        cash: 0,
        bank: 0,
        mpesa: 0,
      }
      for (const account of accounts) {
        byType[account.type as keyof typeof byType] += Number(account.currentBalance || 0)
      }
      const totalOnHand = byType.cash + byType.bank + byType.mpesa

      const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const to = req.query.to ? new Date(String(req.query.to)) : new Date()
      to.setHours(23, 59, 59, 999)

      const periodTxns = await CashTransaction.find({
        org_id: req.org_id,
        occurredAt: { $gte: from, $lte: to },
      })
        .sort({ occurredAt: -1 })
        .limit(500)
        .lean()

      const inflow = periodTxns
        .filter((t) => t.direction === "in" && t.kind !== "transfer")
        .reduce((s, t) => s + Number(t.amount || 0), 0)
      const outflow = periodTxns
        .filter((t) => t.direction === "out" && t.kind !== "transfer")
        .reduce((s, t) => s + Number(t.amount || 0), 0)
      const transfers = periodTxns
        .filter((t) => t.kind === "transfer" && t.direction === "out")
        .reduce((s, t) => s + Number(t.amount || 0), 0)

      const recent = periodTxns.slice(0, 12)

      return res.json({
        success: true,
        data: {
          totals: {
            cash: Number(byType.cash.toFixed(2)),
            bank: Number(byType.bank.toFixed(2)),
            mpesa: Number(byType.mpesa.toFixed(2)),
            totalOnHand: Number(totalOnHand.toFixed(2)),
          },
          cashflow: {
            from,
            to,
            inflow: Number(inflow.toFixed(2)),
            outflow: Number(outflow.toFixed(2)),
            net: Number((inflow - outflow).toFixed(2)),
            transfers: Number(transfers.toFixed(2)),
          },
          accounts,
          recent,
        },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load cash overview",
      })
    }
  }

  static async listAccounts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }
      await ensureDefaultCashAccounts(req.org_id, String(req.user.userId))

      const query: any = { org_id: req.org_id }
      if (req.query.type) query.type = String(req.query.type)
      if (req.query.status && req.query.status !== "all") {
        query.status = String(req.query.status)
      } else if (!req.query.status) {
        query.status = "active"
      }

      const accounts = await CashBankAccount.find(query).sort({ type: 1, name: 1 }).lean()
      return res.json({ success: true, data: accounts })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list accounts",
      })
    }
  }

  static async createAccount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const {
        type,
        name,
        accountNumber,
        bankName,
        branchName,
        mpesaIdentifier,
        mpesaMode,
        openingBalance,
        notes,
        isDefault,
      } = req.body || {}

      if (!type || !["cash", "bank", "mpesa"].includes(type)) {
        return res.status(400).json({ success: false, message: "Valid account type is required" })
      }
      if (!String(name || "").trim()) {
        return res.status(400).json({ success: false, message: "Account name is required" })
      }

      const opening = Number(openingBalance || 0)
      if (!Number.isFinite(opening) || opening < 0) {
        return res.status(400).json({ success: false, message: "Opening balance must be >= 0" })
      }

      if (isDefault) {
        await CashBankAccount.updateMany(
          { org_id: req.org_id, type },
          { $set: { isDefault: false } },
        )
      }

      const account = await CashBankAccount.create({
        org_id: req.org_id,
        type,
        name: String(name).trim(),
        accountNumber: accountNumber ? String(accountNumber).trim() : undefined,
        bankName: bankName ? String(bankName).trim() : undefined,
        branchName: branchName ? String(branchName).trim() : undefined,
        mpesaIdentifier: mpesaIdentifier ? String(mpesaIdentifier).trim() : undefined,
        mpesaMode: mpesaMode || undefined,
        currency: "KES",
        openingBalance: Number(opening.toFixed(2)),
        currentBalance: Number(opening.toFixed(2)),
        isDefault: Boolean(isDefault),
        status: "active",
        notes: notes ? String(notes).trim() : undefined,
        createdBy: String(req.user.userId),
      })

      if (opening > 0) {
        await CashTransaction.create({
          org_id: req.org_id,
          accountId: String(account._id),
          accountName: account.name,
          accountType: account.type,
          direction: "in",
          kind: "opening",
          amount: Number(opening.toFixed(2)),
          balanceAfter: Number(opening.toFixed(2)),
          occurredAt: new Date(),
          description: "Opening balance",
          sourceType: "opening",
          sourceId: `opening:${account._id}`,
          createdBy: String(req.user.userId),
        })
      }

      return res.status(201).json({ success: true, data: account })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create account",
      })
    }
  }

  static async updateAccount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const account = await CashBankAccount.findOne({
        _id: req.params.id,
        org_id: req.org_id,
      })
      if (!account) {
        return res.status(404).json({ success: false, message: "Account not found" })
      }

      const {
        name,
        accountNumber,
        bankName,
        branchName,
        mpesaIdentifier,
        mpesaMode,
        notes,
        status,
        isDefault,
      } = req.body || {}

      if (name !== undefined) account.name = String(name).trim()
      if (accountNumber !== undefined) account.accountNumber = String(accountNumber).trim()
      if (bankName !== undefined) account.bankName = String(bankName).trim()
      if (branchName !== undefined) account.branchName = String(branchName).trim()
      if (mpesaIdentifier !== undefined) account.mpesaIdentifier = String(mpesaIdentifier).trim()
      if (mpesaMode !== undefined) account.mpesaMode = mpesaMode
      if (notes !== undefined) account.notes = String(notes).trim()
      if (status === "active" || status === "inactive") account.status = status

      if (isDefault === true) {
        await CashBankAccount.updateMany(
          { org_id: req.org_id, type: account.type, _id: { $ne: account._id } },
          { $set: { isDefault: false } },
        )
        account.isDefault = true
      } else if (isDefault === false) {
        account.isDefault = false
      }

      await account.save()
      return res.json({ success: true, data: account })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update account",
      })
    }
  }

  static async listTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const query: any = { org_id: req.org_id }
      if (req.query.accountId) query.accountId = String(req.query.accountId)
      if (req.query.accountType) query.accountType = String(req.query.accountType)
      if (req.query.direction) query.direction = String(req.query.direction)
      if (req.query.kind) query.kind = String(req.query.kind)
      if (req.query.reconciled === "true") query.reconciled = true
      if (req.query.reconciled === "false") query.reconciled = { $ne: true }

      if (req.query.from || req.query.to) {
        query.occurredAt = {}
        if (req.query.from) query.occurredAt.$gte = new Date(String(req.query.from))
        if (req.query.to) {
          const to = new Date(String(req.query.to))
          to.setHours(23, 59, 59, 999)
          query.occurredAt.$lte = to
        }
      }

      const limit = Math.min(Number(req.query.limit || 200), 500)
      const rows = await CashTransaction.find(query)
        .sort({ occurredAt: -1, createdAt: -1 })
        .limit(limit)
        .lean()

      const inflow = rows
        .filter((r) => r.direction === "in")
        .reduce((s, r) => s + Number(r.amount || 0), 0)
      const outflow = rows
        .filter((r) => r.direction === "out")
        .reduce((s, r) => s + Number(r.amount || 0), 0)

      return res.json({
        success: true,
        data: {
          rows,
          totals: {
            inflow: Number(inflow.toFixed(2)),
            outflow: Number(outflow.toFixed(2)),
            net: Number((inflow - outflow).toFixed(2)),
            count: rows.length,
          },
        },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list transactions",
      })
    }
  }

  static async createManualEntry(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { accountId, direction, amount, occurredAt, description, reference, counterparty } =
        req.body || {}

      if (!accountId || !["in", "out"].includes(direction)) {
        return res.status(400).json({
          success: false,
          message: "accountId and direction (in/out) are required",
        })
      }
      const parsedAmount = parseAmount(amount)
      if (!parsedAmount) {
        return res.status(400).json({ success: false, message: "Valid amount is required" })
      }
      if (!String(description || "").trim()) {
        return res.status(400).json({ success: false, message: "Description is required" })
      }

      const account = await getAccountOrThrow(req.org_id, String(accountId))
      if (account.status !== "active") {
        return res.status(400).json({ success: false, message: "Account is inactive" })
      }

      const txn = await postTransaction({
        orgId: req.org_id,
        account: account as any,
        direction,
        kind: "manual",
        amount: parsedAmount,
        occurredAt: parseDate(occurredAt),
        description: String(description).trim(),
        reference: reference ? String(reference).trim() : undefined,
        counterparty: counterparty ? String(counterparty).trim() : undefined,
        sourceType: "manual",
        createdBy: String(req.user.userId),
      })

      return res.status(201).json({ success: true, data: txn })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create entry",
      })
    }
  }

  static async createTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { fromAccountId, toAccountId, amount, occurredAt, note, reference } = req.body || {}
      if (!fromAccountId || !toAccountId) {
        return res.status(400).json({
          success: false,
          message: "fromAccountId and toAccountId are required",
        })
      }
      if (String(fromAccountId) === String(toAccountId)) {
        return res.status(400).json({
          success: false,
          message: "Cannot transfer to the same account",
        })
      }

      const parsedAmount = parseAmount(amount)
      if (!parsedAmount) {
        return res.status(400).json({ success: false, message: "Valid amount is required" })
      }

      const fromAccount = await getAccountOrThrow(req.org_id, String(fromAccountId))
      const toAccount = await getAccountOrThrow(req.org_id, String(toAccountId))
      if (fromAccount.status !== "active" || toAccount.status !== "active") {
        return res.status(400).json({ success: false, message: "Both accounts must be active" })
      }
      if (Number(fromAccount.currentBalance || 0) < parsedAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance in ${fromAccount.name}`,
        })
      }

      const when = parseDate(occurredAt)
      const transferGroupId = `xfer_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`
      const description =
        String(note || "").trim() ||
        `Transfer ${fromAccount.name} → ${toAccount.name}`

      const outTxn = await postTransaction({
        orgId: req.org_id,
        account: fromAccount as any,
        direction: "out",
        kind: "transfer",
        amount: parsedAmount,
        occurredAt: when,
        description,
        reference: reference ? String(reference).trim() : undefined,
        transferGroupId,
        relatedAccountId: String(toAccount._id),
        relatedAccountName: toAccount.name,
        sourceType: "transfer",
        sourceId: `${transferGroupId}:out`,
        createdBy: String(req.user.userId),
      })

      const inTxn = await postTransaction({
        orgId: req.org_id,
        account: toAccount as any,
        direction: "in",
        kind: "transfer",
        amount: parsedAmount,
        occurredAt: when,
        description,
        reference: reference ? String(reference).trim() : undefined,
        transferGroupId,
        relatedAccountId: String(fromAccount._id),
        relatedAccountName: fromAccount.name,
        sourceType: "transfer",
        sourceId: `${transferGroupId}:in`,
        createdBy: String(req.user.userId),
      })

      return res.status(201).json({
        success: true,
        data: {
          transferGroupId,
          out: outTxn,
          in: inTxn,
          fromBalance: fromAccount.currentBalance,
          toBalance: toAccount.currentBalance,
        },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create transfer",
      })
    }
  }

  static async listTransfers(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const outs = await CashTransaction.find({
        org_id: req.org_id,
        kind: "transfer",
        direction: "out",
      })
        .sort({ occurredAt: -1 })
        .limit(200)
        .lean()

      return res.json({ success: true, data: outs })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list transfers",
      })
    }
  }

  static async reconcileTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { transactionIds, reconciled = true } = req.body || {}
      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "transactionIds array is required",
        })
      }

      const result = await CashTransaction.updateMany(
        {
          org_id: req.org_id,
          _id: { $in: transactionIds.map(String) },
        },
        {
          $set: {
            reconciled: Boolean(reconciled),
            reconciledAt: reconciled ? new Date() : null,
          },
        },
      )

      return res.json({
        success: true,
        data: { matched: result.matchedCount, modified: result.modifiedCount },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to reconcile",
      })
    }
  }

  static async syncFromOperations(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      await ensureDefaultCashAccounts(req.org_id, String(req.user.userId))

      let importedPayments = 0
      let importedExpenses = 0
      let skipped = 0

      const payments = await StockInvoicePayment.find({ org_id: req.org_id })
        .sort({ paidAt: -1 })
        .limit(500)
        .lean()

      for (const payment of payments) {
        const sourceId = `invoice_payment:${payment._id}`
        const exists = await CashTransaction.findOne({
          org_id: req.org_id,
          sourceType: "invoice_payment",
          sourceId,
        }).lean()
        if (exists) {
          skipped += 1
          continue
        }

        const account = await findDefaultAccountForMethod(req.org_id, payment.paymentMethod)
        if (!account) {
          skipped += 1
          continue
        }

        const liveAccount = await CashBankAccount.findById(account._id)
        if (!liveAccount) {
          skipped += 1
          continue
        }

        await postTransaction({
          orgId: req.org_id,
          account: liveAccount as any,
          direction: "in",
          kind: "payment",
          amount: Number(payment.amount),
          occurredAt: payment.paidAt || payment.createdAt || new Date(),
          description: `Customer payment · Invoice ${payment.invoiceNumber}`,
          reference: payment.reference,
          counterparty: payment.invoiceNumber,
          sourceType: "invoice_payment",
          sourceId,
          createdBy: String(req.user.userId),
        })
        importedPayments += 1
      }

      const expenses = await StockExpense.find({
        org_id: req.org_id,
        $or: [{ status: "completed" }, { workflowStatus: "paid" }, { workflowStatus: "approved" }],
      })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean()

      for (const expense of expenses) {
        const sourceId = `expense:${expense._id}`
        const exists = await CashTransaction.findOne({
          org_id: req.org_id,
          sourceType: "expense",
          sourceId,
        }).lean()
        if (exists) {
          skipped += 1
          continue
        }

        const account = await findDefaultAccountForMethod(
          req.org_id,
          expense.paymentMethod || "mpesa",
        )
        if (!account) {
          skipped += 1
          continue
        }
        const liveAccount = await CashBankAccount.findById(account._id)
        if (!liveAccount) {
          skipped += 1
          continue
        }

        await postTransaction({
          orgId: req.org_id,
          account: liveAccount as any,
          direction: "out",
          kind: "expense",
          amount: Number(expense.amount),
          occurredAt: expense.expenseDate || expense.createdAt || new Date(),
          description: expense.purpose || expense.expenseNumber || "Company expense",
          reference: expense.mpesaReceiptNumber || expense.expenseNumber,
          counterparty: expense.payeePhone,
          sourceType: "expense",
          sourceId,
          createdBy: String(req.user.userId),
        })
        importedExpenses += 1
      }

      let importedPayrolls = 0
      const payrolls = await Payroll.find({
        org_id: req.org_id,
        status: "paid",
      })
        .sort({ updatedAt: -1 })
        .limit(500)
        .lean()

      for (const payroll of payrolls) {
        const before = await CashTransaction.findOne({
          org_id: req.org_id,
          sourceType: "payroll",
          sourceId: `payroll:${payroll._id}`,
        }).lean()
        const employee = await User.findById(payroll.user_id).select("firstName lastName")
        const employeeName = employee
          ? [employee.firstName, employee.lastName].filter(Boolean).join(" ")
          : String(payroll.user_id)
        const posted = await postPayrollToCashbook({
          orgId: req.org_id,
          userId: String(req.user.userId),
          payroll: {
            _id: payroll._id,
            net_pay: payroll.net_pay,
            month: payroll.month,
            user_id: String(payroll.user_id),
            status: payroll.status,
            paymentMethod: "bank",
            employeeName,
          },
        }).catch(() => null)
        if (before) skipped += 1
        else if (posted) importedPayrolls += 1
        else skipped += 1
      }

      return res.json({
        success: true,
        message: "Operations synced into cashbook",
        data: { importedPayments, importedExpenses, importedPayrolls, skipped },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to sync operations",
      })
    }
  }
}
