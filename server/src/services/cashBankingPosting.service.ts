import {
  CashBankAccount,
  type CashAccountType,
  type ICashBankAccount,
} from "../models/CashBankAccount"
import { CashTransaction } from "../models/CashTransaction"

type AccountDoc = ICashBankAccount & { _id: any; save: () => Promise<any> }

export function resolveAccountTypeFromMethod(method?: string): CashAccountType {
  const normalized = String(method || "cash").toLowerCase()
  if (normalized.includes("mpesa") || normalized.includes("mobile")) return "mpesa"
  if (
    normalized.includes("bank") ||
    normalized.includes("cheque") ||
    normalized.includes("card")
  ) {
    return "bank"
  }
  return "cash"
}

export async function ensureDefaultCashAccounts(orgId: string, userId: string) {
  const count = await CashBankAccount.countDocuments({ org_id: orgId })
  if (count > 0) return

  await CashBankAccount.insertMany([
    {
      org_id: orgId,
      type: "cash",
      name: "Petty Cash",
      isDefault: true,
      openingBalance: 0,
      currentBalance: 0,
      currency: "KES",
      status: "active",
      createdBy: userId,
    },
    {
      org_id: orgId,
      type: "bank",
      name: "Main Bank Account",
      bankName: "Primary Bank",
      isDefault: true,
      openingBalance: 0,
      currentBalance: 0,
      currency: "KES",
      status: "active",
      createdBy: userId,
    },
    {
      org_id: orgId,
      type: "mpesa",
      name: "M-Pesa Business",
      mpesaMode: "till",
      isDefault: true,
      openingBalance: 0,
      currentBalance: 0,
      currency: "KES",
      status: "active",
      createdBy: userId,
    },
  ])
}

export async function findDefaultAccountForMethod(orgId: string, method?: string) {
  const type = resolveAccountTypeFromMethod(method)
  let account = await CashBankAccount.findOne({
    org_id: orgId,
    type,
    status: "active",
    isDefault: true,
  })
  if (!account) {
    account = await CashBankAccount.findOne({
      org_id: orgId,
      type,
      status: "active",
    }).sort({ createdAt: 1 })
  }
  return account
}

async function postTransaction(params: {
  orgId: string
  account: AccountDoc
  direction: "in" | "out"
  kind: string
  amount: number
  occurredAt: Date
  description: string
  reference?: string
  counterparty?: string
  transferGroupId?: string
  relatedAccountId?: string
  relatedAccountName?: string
  sourceType?: string
  sourceId?: string
  createdBy: string
}) {
  const signed = params.direction === "in" ? params.amount : -params.amount
  const nextBalance = Number(
    (Number(params.account.currentBalance || 0) + signed).toFixed(2),
  )
  params.account.currentBalance = nextBalance
  await params.account.save()

  return CashTransaction.create({
    org_id: params.orgId,
    accountId: String(params.account._id),
    accountName: params.account.name,
    accountType: params.account.type,
    direction: params.direction,
    kind: params.kind,
    amount: params.amount,
    balanceAfter: nextBalance,
    occurredAt: params.occurredAt,
    description: params.description,
    reference: params.reference,
    counterparty: params.counterparty,
    transferGroupId: params.transferGroupId,
    relatedAccountId: params.relatedAccountId,
    relatedAccountName: params.relatedAccountName,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    createdBy: params.createdBy,
  })
}

/** Best-effort: never throw to callers that must keep primary business flow. */
export async function postInvoicePaymentToCashbook(params: {
  orgId: string
  userId: string
  payment: {
    _id: any
    amount: number
    paymentMethod?: string
    reference?: string
    paidAt?: Date
    invoiceNumber?: string
  }
}) {
  try {
    await ensureDefaultCashAccounts(params.orgId, params.userId)
    const sourceId = `invoice_payment:${params.payment._id}`
    const exists = await CashTransaction.findOne({
      org_id: params.orgId,
      sourceType: "invoice_payment",
      sourceId,
    }).lean()
    if (exists) return exists

    const account = await findDefaultAccountForMethod(
      params.orgId,
      params.payment.paymentMethod,
    )
    if (!account) return null

    return postTransaction({
      orgId: params.orgId,
      account: account as any,
      direction: "in",
      kind: "payment",
      amount: Number(params.payment.amount),
      occurredAt: params.payment.paidAt || new Date(),
      description: `Customer payment · Invoice ${params.payment.invoiceNumber || ""}`.trim(),
      reference: params.payment.reference,
      counterparty: params.payment.invoiceNumber,
      sourceType: "invoice_payment",
      sourceId,
      createdBy: params.userId,
    })
  } catch (error) {
    console.error("postInvoicePaymentToCashbook failed:", error)
    return null
  }
}

export async function postExpenseToCashbook(params: {
  orgId: string
  userId: string
  expense: {
    _id: any
    amount: number
    paymentMethod?: string
    purpose?: string
    expenseNumber?: string
    expenseDate?: Date
    createdAt?: Date
    payeePhone?: string
    mpesaReceiptNumber?: string
  }
}) {
  try {
    await ensureDefaultCashAccounts(params.orgId, params.userId)
    const sourceId = `expense:${params.expense._id}`
    const exists = await CashTransaction.findOne({
      org_id: params.orgId,
      sourceType: "expense",
      sourceId,
    }).lean()
    if (exists) return exists

    const account = await findDefaultAccountForMethod(
      params.orgId,
      params.expense.paymentMethod || "mpesa",
    )
    if (!account) return null

    return postTransaction({
      orgId: params.orgId,
      account: account as any,
      direction: "out",
      kind: "expense",
      amount: Number(params.expense.amount),
      occurredAt:
        params.expense.expenseDate || params.expense.createdAt || new Date(),
      description:
        params.expense.purpose ||
        params.expense.expenseNumber ||
        "Company expense",
      reference:
        params.expense.mpesaReceiptNumber || params.expense.expenseNumber,
      counterparty: params.expense.payeePhone,
      sourceType: "expense",
      sourceId,
      createdBy: params.userId,
    })
  } catch (error) {
    console.error("postExpenseToCashbook failed:", error)
    return null
  }
}

/** Salary / net pay outflow when a payslip is marked paid. Defaults to bank. */
export async function postPayrollToCashbook(params: {
  orgId: string
  userId: string
  payroll: {
    _id: any
    net_pay: number
    month?: string
    user_id?: string
    status?: string
    paymentMethod?: string
    employeeName?: string
  }
}) {
  try {
    if (params.payroll.status && params.payroll.status !== "paid") return null
    const amount = Number(params.payroll.net_pay || 0)
    if (!Number.isFinite(amount) || amount <= 0) return null

    await ensureDefaultCashAccounts(params.orgId, params.userId)
    const sourceId = `payroll:${params.payroll._id}`
    const exists = await CashTransaction.findOne({
      org_id: params.orgId,
      sourceType: "payroll",
      sourceId,
    }).lean()
    if (exists) return exists

    const account = await findDefaultAccountForMethod(
      params.orgId,
      params.payroll.paymentMethod || "bank",
    )
    if (!account) return null

    const who = params.payroll.employeeName || params.payroll.user_id || "employee"
    return postTransaction({
      orgId: params.orgId,
      account: account as any,
      direction: "out",
      kind: "payroll",
      amount,
      occurredAt: new Date(),
      description: `Salary payment · ${params.payroll.month || ""} · ${who}`.trim(),
      reference: params.payroll.month,
      counterparty: who,
      sourceType: "payroll",
      sourceId,
      createdBy: params.userId,
    })
  } catch (error) {
    console.error("postPayrollToCashbook failed:", error)
    return null
  }
}

export { postTransaction }
