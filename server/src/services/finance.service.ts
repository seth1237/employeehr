import { Account } from "../models/Account"
import { BankStatement } from "../models/BankStatement"
import { CashTransaction } from "../models/CashTransaction"
import { CurrencyRate } from "../models/CurrencyRate"
import { FiscalPeriod } from "../models/FiscalPeriod"
import { JournalEntry } from "../models/JournalEntry"
import { GeneralLedgerService } from "./GeneralLedgerService"

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export class FinanceService {
  static async ensureCurrencies(org_id: string) {
    const count = await CurrencyRate.countDocuments({ org_id })
    if (count > 0) return
    await CurrencyRate.insertMany([
      { org_id, code: "KES", name: "Kenyan Shilling", symbol: "KES", rateToFunctional: 1, isFunctional: true, isActive: true },
      { org_id, code: "USD", name: "US Dollar", symbol: "USD", rateToFunctional: 129, isFunctional: false, isActive: true },
      { org_id, code: "EUR", name: "Euro", symbol: "EUR", rateToFunctional: 140, isFunctional: false, isActive: true },
      { org_id, code: "GBP", name: "British Pound", symbol: "GBP", rateToFunctional: 165, isFunctional: false, isActive: true },
    ])
  }

  static async ensureFiscalYear(org_id: string, year = new Date().getFullYear()) {
    const existing = await FiscalPeriod.find({ org_id, year }).lean()
    if (existing.length >= 12) return existing
    const docs = MONTHS.filter((month) => !existing.some((row) => row.month === month)).map((month) => {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59, 999)
      return { org_id, year, month, startDate, endDate, status: "open" as const }
    })
    if (docs.length) await FiscalPeriod.insertMany(docs)
    return FiscalPeriod.find({ org_id, year }).sort({ month: 1 }).lean()
  }

  static async assertPeriodOpen(org_id: string, date: Date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    await this.ensureFiscalYear(org_id, year)
    const period = await FiscalPeriod.findOne({ org_id, year, month })
    if (period?.status === "closed") {
      throw new Error(`Period ${year}-${String(month).padStart(2, "0")} is closed`)
    }
  }

  static async getAccountInquiry(org_id: string, accountId: string, startDate?: Date, endDate?: Date) {
    const account = await Account.findOne({ _id: accountId, org_id }).lean()
    if (!account) throw new Error("Account not found")

    const match: any = { org_id, status: "posted", "lines.accountId": account._id }
    if (startDate || endDate) {
      match.date = {}
      if (startDate) match.date.$gte = startDate
      if (endDate) match.date.$lte = endDate
    }

    const openingMatch: any = { org_id, status: "posted", "lines.accountId": account._id }
    if (startDate) openingMatch.date = { $lt: startDate }

    const [openingRows, entries] = await Promise.all([
      startDate
        ? JournalEntry.aggregate([
            { $match: openingMatch },
            { $unwind: "$lines" },
            { $match: { "lines.accountId": account._id } },
            { $group: { _id: null, debit: { $sum: "$lines.debit" }, credit: { $sum: "$lines.credit" } } },
          ])
        : Promise.resolve([]),
      JournalEntry.find(match).sort({ date: 1, createdAt: 1 }).lean(),
    ])

    const openingRaw = openingRows[0] || { debit: 0, credit: 0 }
    const normalDebit = account.type === "asset" || account.type === "expense"
    let balance = normalDebit
      ? Number(openingRaw.debit || 0) - Number(openingRaw.credit || 0)
      : Number(openingRaw.credit || 0) - Number(openingRaw.debit || 0)

    const lines = []
    for (const entry of entries) {
      for (const line of entry.lines as any[]) {
        if (String(line.accountId) !== String(account._id)) continue
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        balance = normalDebit ? balance + debit - credit : balance + credit - debit
        lines.push({
          date: entry.date,
          entryNumber: entry.entryNumber,
          journalType: entry.journalType,
          nature: entry.nature,
          reference: entry.reference,
          description: line.description || entry.description,
          debit,
          credit,
          balance: roundMoney(balance),
        })
      }
    }

    return {
      account,
      openingBalance: roundMoney(
        normalDebit
          ? Number(openingRaw.debit || 0) - Number(openingRaw.credit || 0)
          : Number(openingRaw.credit || 0) - Number(openingRaw.debit || 0),
      ),
      closingBalance: roundMoney(balance),
      lines,
    }
  }

  static async getCashFlow(org_id: string, startDate?: Date, endDate?: Date) {
    const match: any = { org_id, status: "posted" }
    if (startDate || endDate) {
      match.date = {}
      if (startDate) match.date.$gte = startDate
      if (endDate) match.date.$lte = endDate
    }
    const entries = await JournalEntry.find(match).populate("lines.accountId", "code name type").lean()
    let operating = 0
    let investing = 0
    let financing = 0
    for (const entry of entries) {
      for (const line of entry.lines as any[]) {
        const account = line.accountId
        if (!account || account.type !== "asset") continue
        const code = String(account.code || "")
        const movement = Number(line.debit || 0) - Number(line.credit || 0)
        if (code.startsWith("15")) investing += movement
        else if (code.startsWith("3") || code.startsWith("20")) financing += movement
        else operating += movement
      }
    }
    return {
      operating: roundMoney(operating),
      investing: roundMoney(investing),
      financing: roundMoney(financing),
      net: roundMoney(operating + investing + financing),
    }
  }

  static async getFinancialPack(org_id: string, startDate?: Date, endDate?: Date) {
    const [trialBalance, profitAndLoss, balanceSheet, cashFlow] = await Promise.all([
      GeneralLedgerService.getTrialBalance(org_id, startDate, endDate),
      GeneralLedgerService.getProfitAndLoss(org_id, startDate, endDate),
      GeneralLedgerService.getBalanceSheet(org_id, endDate),
      this.getCashFlow(org_id, startDate, endDate),
    ])
    return {
      generatedAt: new Date(),
      startDate,
      endDate,
      trialBalance,
      profitAndLoss,
      balanceSheet,
      cashFlow,
    }
  }

  static monthlyDepreciation(asset: {
    cost: number
    salvageValue: number
    usefulLifeMonths: number
    method: string
    reducingRate?: number
    accumulatedDepreciation: number
  }) {
    const book = Math.max(0, Number(asset.cost) - Number(asset.accumulatedDepreciation || 0))
    if (book <= Number(asset.salvageValue || 0)) return 0
    if (asset.method === "reducing") {
      const annual = book * (Number(asset.reducingRate || 20) / 100)
      return roundMoney(Math.min(annual / 12, book - Number(asset.salvageValue || 0)))
    }
    const straight = (Number(asset.cost) - Number(asset.salvageValue || 0)) / Number(asset.usefulLifeMonths || 1)
    return roundMoney(Math.min(straight, book - Number(asset.salvageValue || 0)))
  }

  static async autoMatchStatement(org_id: string, accountId: string, statementId: string) {
    const statement = await BankStatement.findOne({ _id: statementId, org_id, accountId })
    if (!statement) throw new Error("Statement not found")
    const txns = await CashTransaction.find({
      org_id,
      accountId,
      reconciled: { $ne: true },
    }).lean()

    let matched = 0
    for (const line of statement.lines) {
      if (line.status === "matched") continue
      const hit = txns.find((txn) => {
        const signed = Number(txn.amount || 0) * (txn.direction === "out" ? -1 : 1)
        const sameAmount = Math.abs(signed - Number(line.amount)) < 0.01
        const sameRef =
          line.reference &&
          String(txn.reference || "").toLowerCase() === String(line.reference).toLowerCase()
        const sameDay =
          new Date(txn.occurredAt).toISOString().slice(0, 10) ===
          new Date(line.date).toISOString().slice(0, 10)
        return sameAmount && (sameRef || sameDay)
      })
      if (!hit) continue
      line.status = "matched"
      line.matchedTransactionId = String(hit._id)
      matched += 1
    }
    await statement.save()
    const ids = statement.lines.map((line) => line.matchedTransactionId).filter(Boolean)
    if (ids.length) {
      await CashTransaction.updateMany(
        { _id: { $in: ids }, org_id },
        { $set: { reconciled: true, reconciledAt: new Date() } },
      )
    }
    return { matched, unmatched: statement.lines.filter((line) => line.status !== "matched").length }
  }
}
