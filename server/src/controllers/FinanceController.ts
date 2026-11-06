import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Account } from "../models/Account"
import { BankStatement } from "../models/BankStatement"
import { CashBankAccount } from "../models/CashBankAccount"
import { CurrencyRate } from "../models/CurrencyRate"
import { FiscalPeriod } from "../models/FiscalPeriod"
import { FixedAsset } from "../models/FixedAsset"
import { GlBudget } from "../models/GlBudget"
import { JournalEntry } from "../models/JournalEntry"
import { Payroll } from "../models/Payroll"
import { PurchaseCreditNote } from "../models/PurchaseCreditNote"
import { StockInvoice } from "../models/StockInvoice"
import { StockProduct } from "../models/StockProduct"
import { StockSale } from "../models/StockSale"
import { SupplierInvoice } from "../models/SupplierInvoice"
import { WithholdingTax } from "../models/WithholdingTax"
import AuditLog from "../models/AuditLog"
import { FinanceService, roundMoney } from "../services/finance.service"
import { GeneralLedgerService } from "../services/GeneralLedgerService"
import { postTransaction } from "../services/cashBankingPosting.service"

function userIdOf(req: AuthenticatedRequest) {
  return String(req.user?.userId || "system")
}

function orgOf(req: AuthenticatedRequest) {
  return req.user?.org_id || req.org_id
}

export class FinanceController {
  static async listCurrencies(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    await FinanceService.ensureCurrencies(org_id)
    const data = await CurrencyRate.find({ org_id }).sort({ isFunctional: -1, code: 1 })
    return res.json({ success: true, data })
  }

  static async saveCurrency(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const { code, name, symbol, rateToFunctional, isFunctional, isActive } = req.body || {}
    if (!code || !name) return res.status(400).json({ success: false, message: "code and name are required" })
    if (isFunctional) {
      await CurrencyRate.updateMany({ org_id }, { $set: { isFunctional: false } })
    }
    const row = await CurrencyRate.findOneAndUpdate(
      { org_id, code: String(code).toUpperCase() },
      {
        org_id,
        code: String(code).toUpperCase(),
        name,
        symbol: symbol || String(code).toUpperCase(),
        rateToFunctional: Number(rateToFunctional || 1),
        isFunctional: Boolean(isFunctional),
        isActive: isActive !== false,
      },
      { upsert: true, new: true },
    )
    return res.json({ success: true, data: row })
  }

  static async listPeriods(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const year = Number(req.query.year) || new Date().getFullYear()
    const data = await FinanceService.ensureFiscalYear(org_id, year)
    return res.json({ success: true, data, year })
  }

  static async setPeriodStatus(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const { year, month, status } = req.body || {}
    if (!year || !month || !["open", "closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "year, month and status are required" })
    }
    const period = await FiscalPeriod.findOneAndUpdate(
      { org_id, year: Number(year), month: Number(month) },
      {
        $set: {
          status,
          closedAt: status === "closed" ? new Date() : undefined,
          closedBy: status === "closed" ? userIdOf(req) : undefined,
        },
      },
      { new: true },
    )
    if (!period) return res.status(404).json({ success: false, message: "Period not found" })
    return res.json({ success: true, data: period })
  }

  static async listBudgets(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const year = Number(req.query.year) || new Date().getFullYear()
    const data = await GlBudget.find({ org_id, year }).sort({ createdAt: -1 })
    return res.json({ success: true, data })
  }

  static async saveBudget(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const { name, year, lines, status, currency } = req.body || {}
    if (!name) return res.status(400).json({ success: false, message: "Budget name is required" })
    const budget = await GlBudget.findOneAndUpdate(
      { org_id, year: Number(year) || new Date().getFullYear(), name },
      {
        org_id,
        year: Number(year) || new Date().getFullYear(),
        name,
        lines: Array.isArray(lines) ? lines : [],
        status: status === "approved" ? "approved" : "draft",
        currency: currency || "KES",
        createdBy: userIdOf(req),
      },
      { upsert: true, new: true },
    )
    return res.json({ success: true, data: budget })
  }

  static async budgetVsActual(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const year = Number(req.query.year) || new Date().getFullYear()
    const budget = await GlBudget.findOne({ org_id, year, status: "approved" }).sort({ updatedAt: -1 })
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31, 23, 59, 59, 999)
    const actuals = await GeneralLedgerService.getTrialBalance(org_id, start, end)
    const actualMap = new Map(actuals.map((row: any) => [String(row.accountId), Number(row.balance || 0)]))
    const rows = (budget?.lines || []).map((line) => {
      const actual = actualMap.get(String(line.accountId)) || 0
      return { ...line, actual: roundMoney(actual), variance: roundMoney(Number(line.amount || 0) - actual) }
    })
    return res.json({ success: true, data: { budget, rows } })
  }

  static async listAssets(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const data = await FixedAsset.find({ org_id }).sort({ createdAt: -1 })
    return res.json({ success: true, data })
  }

  static async saveAsset(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const body = req.body || {}
    if (!body.name || !body.purchaseDate || !body.cost) {
      return res.status(400).json({ success: false, message: "name, purchaseDate and cost are required" })
    }
    const count = await FixedAsset.countDocuments({ org_id })
    const asset = await FixedAsset.create({
      org_id,
      assetCode: body.assetCode || `FA-${String(count + 1).padStart(4, "0")}`,
      name: body.name,
      category: body.category || "Equipment",
      purchaseDate: new Date(body.purchaseDate),
      cost: Number(body.cost),
      salvageValue: Number(body.salvageValue || 0),
      usefulLifeMonths: Number(body.usefulLifeMonths || 60),
      method: body.method === "reducing" ? "reducing" : "straight-line",
      reducingRate: Number(body.reducingRate || 20),
      location: body.location,
      department: body.department,
      branchId: body.branchId,
      assetAccountId: body.assetAccountId,
      accumDepAccountId: body.accumDepAccountId,
      depExpenseAccountId: body.depExpenseAccountId,
      notes: body.notes,
    })
    return res.status(201).json({ success: true, data: asset })
  }

  static async runDepreciation(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    await GeneralLedgerService.initializeDefaultAccounts(org_id)
    const assets = await FixedAsset.find({ org_id, status: "active" })
    const expense = await Account.findOne({ org_id, code: "6200" })
    const accum = await Account.findOne({ org_id, code: "1510" })
    if (!expense || !accum) return res.status(400).json({ success: false, message: "Depreciation accounts are missing" })

    const posted = []
    for (const asset of assets) {
      const amount = FinanceService.monthlyDepreciation(asset)
      if (amount <= 0) continue
      const entry = await GeneralLedgerService.postJournalEntry(
        org_id,
        {
          date: new Date(),
          description: `Depreciation ${asset.assetCode} ${asset.name}`,
          reference: asset.assetCode,
          source: "depreciation",
          journalType: "miscellaneous",
          nature: "automatic",
          lines: [
            { accountId: expense._id as any, debit: amount, credit: 0, description: asset.name },
            { accountId: accum._id as any, debit: 0, credit: amount, description: asset.name },
          ],
        },
        userIdOf(req),
      )
      asset.accumulatedDepreciation = roundMoney(Number(asset.accumulatedDepreciation || 0) + amount)
      asset.lastDepreciatedOn = new Date()
      await asset.save()
      posted.push({ assetId: asset._id, amount, entryNumber: entry.entryNumber })
    }
    return res.json({ success: true, data: posted })
  }

  static async disposeAsset(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const asset = await FixedAsset.findOne({ _id: req.params.id, org_id })
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" })
    const proceeds = Number(req.body?.proceeds || 0)
    const book = roundMoney(Number(asset.cost) - Number(asset.accumulatedDepreciation || 0))
    const gain = roundMoney(proceeds - book)
    await GeneralLedgerService.initializeDefaultAccounts(org_id)
    const assetAcc = await Account.findOne({ org_id, code: "1500" })
    const accumAcc = await Account.findOne({ org_id, code: "1510" })
    const bankAcc = await Account.findOne({ org_id, code: "1010" })
    const gainLossAcc = await Account.findOne({ org_id, code: "6300" })
    if (!assetAcc || !accumAcc || !bankAcc || !gainLossAcc) {
      return res.status(400).json({ success: false, message: "Disposal accounts are missing" })
    }
    const lines = [
      { accountId: accumAcc._id as any, debit: Number(asset.accumulatedDepreciation || 0), credit: 0, description: asset.name },
      { accountId: bankAcc._id as any, debit: proceeds, credit: 0, description: "Disposal proceeds" },
      { accountId: gainLossAcc._id as any, debit: gain < 0 ? Math.abs(gain) : 0, credit: gain > 0 ? gain : 0, description: "Disposal gain/loss" },
      { accountId: assetAcc._id as any, debit: 0, credit: Number(asset.cost), description: asset.name },
    ].filter((line) => line.debit > 0 || line.credit > 0)
    const entry = await GeneralLedgerService.postJournalEntry(
      org_id,
      {
        date: new Date(),
        description: `Dispose ${asset.assetCode} ${asset.name}`,
        reference: asset.assetCode,
        source: "asset",
        journalType: "miscellaneous",
        nature: "automatic",
        lines,
      },
      userIdOf(req),
    )
    asset.status = "disposed"
    asset.disposedAt = new Date()
    asset.disposalProceeds = proceeds
    asset.disposalGainLoss = gain
    await asset.save()
    return res.json({ success: true, data: { asset, entry } })
  }

  static async transferAsset(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const asset = await FixedAsset.findOne({ _id: req.params.id, org_id })
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" })
    asset.location = req.body?.location || asset.location
    asset.department = req.body?.department || asset.department
    asset.branchId = req.body?.branchId || asset.branchId
    asset.transferredTo = req.body?.transferredTo || asset.transferredTo
    await asset.save()
    return res.json({ success: true, data: asset })
  }

  static async listWithholding(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const data = await WithholdingTax.find({ org_id }).sort({ date: -1 }).limit(200)
    return res.json({ success: true, data })
  }

  static async saveWithholding(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const { date, payee, pin, grossAmount, rate, reference, certificateNo } = req.body || {}
    if (!payee || !grossAmount) return res.status(400).json({ success: false, message: "payee and grossAmount are required" })
    const taxRate = Number(rate || 5)
    const row = await WithholdingTax.create({
      org_id,
      date: new Date(date || Date.now()),
      payee,
      pin,
      grossAmount: Number(grossAmount),
      rate: taxRate,
      taxAmount: roundMoney(Number(grossAmount) * (taxRate / 100)),
      reference,
      certificateNo,
    })
    return res.status(201).json({ success: true, data: row })
  }

  static async importBankStatement(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const { accountId, fileName, lines } = req.body || {}
    if (!accountId || !Array.isArray(lines) || !lines.length) {
      return res.status(400).json({ success: false, message: "accountId and statement lines are required" })
    }
    const statement = await BankStatement.create({
      org_id,
      accountId,
      fileName,
      importedBy: userIdOf(req),
      lines: lines.map((line: any) => ({
        date: new Date(line.date || Date.now()),
        description: String(line.description || "Bank line"),
        amount: Number(line.amount || 0),
        reference: line.reference,
        status: "unmatched",
      })),
    })
    const match = await FinanceService.autoMatchStatement(org_id, accountId, String(statement._id))
    return res.status(201).json({ success: true, data: { statement, match } })
  }

  static async listStatements(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const data = await BankStatement.find({ org_id, ...(req.query.accountId ? { accountId: req.query.accountId } : {}) })
      .sort({ importedAt: -1 })
      .limit(20)
    return res.json({ success: true, data })
  }

  static async accountInquiry(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const accountId = String(req.query.accountId || "")
    if (!accountId) return res.status(400).json({ success: false, message: "accountId is required" })
    const data = await FinanceService.getAccountInquiry(
      org_id,
      accountId,
      req.query.startDate ? new Date(String(req.query.startDate)) : undefined,
      req.query.endDate ? new Date(String(req.query.endDate)) : undefined,
    )
    return res.json({ success: true, data })
  }

  static async cashFlow(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const data = await FinanceService.getCashFlow(
      org_id,
      req.query.startDate ? new Date(String(req.query.startDate)) : undefined,
      req.query.endDate ? new Date(String(req.query.endDate)) : undefined,
    )
    return res.json({ success: true, data })
  }

  static async financialPack(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const data = await FinanceService.getFinancialPack(
      org_id,
      req.query.startDate ? new Date(String(req.query.startDate)) : undefined,
      req.query.endDate ? new Date(String(req.query.endDate)) : undefined,
    )
    return res.json({ success: true, data })
  }

  static async vatReport(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const start = req.query.startDate ? new Date(String(req.query.startDate)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const end = req.query.endDate ? new Date(String(req.query.endDate)) : new Date()
    const invoices = await StockInvoice.find({
      org_id,
      createdAt: { $gte: start, $lte: end },
      status: { $ne: "cancelled" },
    }).select("invoiceNumber taxTotal grandTotal subTotal createdAt client").lean()
    const outputVat = invoices.reduce((sum, row) => sum + Number(row.taxTotal || 0), 0)
    return res.json({
      success: true,
      data: {
        outputVat: roundMoney(outputVat),
        inputVat: 0,
        netVat: roundMoney(outputVat),
        invoices,
      },
    })
  }

  static async taxReports(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const month = String(req.query.month || new Date().toISOString().slice(0, 7))
    const payrolls = await Payroll.find({ org_id, month }).lean()
    const aliases: Record<string, string[]> = {
      PAYE: ["paye", "tax"],
      SHIF: ["shif", "sha", "nhif"],
      NSSF: ["nssf"],
      "Housing Levy": ["housing levy", "housing"],
    }
    const sumNamed = (name: string) =>
      payrolls.reduce((sum, row) => {
        const wanted = aliases[name] || [name.toLowerCase()]
        return sum + (row.deduction_items || []).reduce((inner, item) => {
          return wanted.includes(String(item.name).trim().toLowerCase()) ? inner + Number(item.amount || 0) : inner
        }, 0)
      }, 0)
    const withholding = await WithholdingTax.find({ org_id }).lean()
    return res.json({
      success: true,
      data: {
        month,
        paye: roundMoney(sumNamed("PAYE")),
        shif: roundMoney(sumNamed("SHIF")),
        nssf: roundMoney(sumNamed("NSSF")),
        housing: roundMoney(sumNamed("Housing Levy")),
        withholding: roundMoney(withholding.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0)),
      },
    })
  }

  static async postPayrollJournal(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const month = String(req.body?.month || "")
    if (!month) return res.status(400).json({ success: false, message: "month is required" })
    await GeneralLedgerService.initializeDefaultAccounts(org_id)
    const payrolls = await Payroll.find({ org_id, month, status: { $in: ["processed", "paid"] } }).lean()
    if (!payrolls.length) return res.status(400).json({ success: false, message: "No processed or paid payroll for that month" })
    const existing = await JournalEntry.findOne({ org_id, source: "payroll", reference: month, status: "posted" })
    if (existing) {
      return res.status(400).json({ success: false, message: `Payroll journal for ${month} is already posted as ${existing.entryNumber}` })
    }
    await GeneralLedgerService.initializeDefaultAccounts(org_id)
    const expense = await Account.findOne({ org_id, code: "6100" })
    const cash = await Account.findOne({ org_id, code: "1010" })
    const payeAcc = await Account.findOne({ org_id, code: "2200" })
    const nssfAcc = await Account.findOne({ org_id, code: "2210" })
    const shifAcc = await Account.findOne({ org_id, code: "2220" })
    const housingAcc = await Account.findOne({ org_id, code: "2230" })
    if (!expense || !cash) return res.status(400).json({ success: false, message: "Payroll accounts are missing" })

    const aliases: Record<string, string[]> = {
      paye: ["paye", "tax"],
      shif: ["shif", "sha", "nhif"],
      nssf: ["nssf"],
      housing: ["housing levy", "housing"],
    }
    const sumAlias = (keys: string[]) =>
      payrolls.reduce((sum, row) => {
        return sum + (row.deduction_items || []).reduce((inner, item) => {
          return keys.includes(String(item.name).trim().toLowerCase()) ? inner + Number(item.amount || 0) : inner
        }, 0)
      }, 0)

    const net = roundMoney(payrolls.reduce((sum, row) => sum + Number(row.net_pay || 0), 0))
    const paye = roundMoney(sumAlias(aliases.paye))
    const shif = roundMoney(sumAlias(aliases.shif))
    const nssf = roundMoney(sumAlias(aliases.nssf))
    const housing = roundMoney(sumAlias(aliases.housing))
    const gross = roundMoney(net + paye + shif + nssf + housing)
    const lines = [
      { accountId: expense._id as any, debit: gross, credit: 0, description: `Payroll ${month}` },
      { accountId: cash._id as any, debit: 0, credit: net, description: `Bank payment ${month}` },
      { accountId: payeAcc?._id as any, debit: 0, credit: paye, description: "PAYE" },
      { accountId: shifAcc?._id as any, debit: 0, credit: shif, description: "SHIF" },
      { accountId: nssfAcc?._id as any, debit: 0, credit: nssf, description: "NSSF" },
      { accountId: housingAcc?._id as any, debit: 0, credit: housing, description: "Housing Levy" },
    ].filter((line) => line.accountId && (line.debit > 0 || line.credit > 0))

    const entry = await GeneralLedgerService.postJournalEntry(
      org_id,
      {
        date: new Date(),
        description: `Payroll journal ${month} · ${payrolls.length} employees`,
        reference: month,
        source: "payroll",
        journalType: "miscellaneous",
        nature: "automatic",
        lines,
      },
      userIdOf(req),
    )
    return res.json({
      success: true,
      data: {
        ...entry.toObject?.() || entry,
        summary: { month, employees: payrolls.length, gross, net, paye, shif, nssf, housing },
      },
    })
  }

  static async cogsReport(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const sales = await StockSale.find({ org_id }).sort({ createdAt: -1 }).limit(500).lean()
    const productIds = [...new Set(sales.map((row) => String(row.productId)))]
    const products = await StockProduct.find({ _id: { $in: productIds }, org_id }).select("name startingPrice averageCost").lean()
    const costMap = new Map(products.map((row) => [String(row._id), Number((row as any).averageCost || row.startingPrice || 0)]))
    const rows = sales.map((sale) => {
      const recorded = Number((sale as any).unitCost || 0)
      const unitCost = recorded > 0 ? recorded : costMap.get(String(sale.productId)) || 0
      const cogs = Number((sale as any).totalCost || 0) > 0
        ? Number((sale as any).totalCost)
        : roundMoney(unitCost * Number(sale.quantitySold || 0))
      return {
        ...sale,
        productName: products.find((row) => String(row._id) === String(sale.productId))?.name || sale.productId,
        unitCost,
        cogs,
        costingMethod: (sale as any).costingMethod || null,
      }
    })
    return res.json({
      success: true,
      data: {
        rows,
        totalCogs: roundMoney(rows.reduce((sum, row) => sum + row.cogs, 0)),
      },
    })
  }

  static async stockAdjustment(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const { productId, quantity, reason } = req.body || {}
    const product = await StockProduct.findOne({ _id: productId, org_id })
    if (!product) return res.status(404).json({ success: false, message: "Product not found" })
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty === 0) return res.status(400).json({ success: false, message: "quantity is required" })
    const { receiveStock, issueStock, unitCostOf } = await import("../services/inventoryCosting.service")
    const unit = unitCostOf(product)
    if (qty > 0) {
      await receiveStock({
        orgId: org_id,
        productId: String(product._id),
        quantity: qty,
        unitCost: unit,
        actorId: userIdOf(req),
        source: "adjustment",
      })
    } else {
      await issueStock({
        orgId: org_id,
        productId: String(product._id),
        quantity: Math.abs(qty),
      })
    }
    const fresh = await StockProduct.findOne({ _id: product._id, org_id })
    await GeneralLedgerService.initializeDefaultAccounts(org_id)
    const inventory = await Account.findOne({ org_id, code: "1300" })
    const expense = await Account.findOne({ org_id, code: "6000" })
    const amount = roundMoney(Math.abs(qty) * unit)
    let entry = null
    if (inventory && expense && amount > 0) {
      const writeOff = qty < 0
      entry = await GeneralLedgerService.postJournalEntry(
        org_id,
        {
          date: new Date(),
          description: reason || `Stock adjustment ${product.name}`,
          reference: String(product._id),
          source: "inventory",
          journalType: "inventory",
          nature: "automatic",
          lines: writeOff
            ? [
                { accountId: expense._id as any, debit: amount, credit: 0 },
                { accountId: inventory._id as any, debit: 0, credit: amount },
              ]
            : [
                { accountId: inventory._id as any, debit: amount, credit: 0 },
                { accountId: expense._id as any, debit: 0, credit: amount },
              ],
        },
        userIdOf(req),
      )
    }
    return res.json({ success: true, data: { product: fresh || product, entry } })
  }

  static async inventoryReconciliation(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const products = await StockProduct.find({ org_id, isActive: { $ne: false } }).select("name currentQuantity startingPrice averageCost").lean()
    const stockValue = roundMoney(
      products.reduce(
        (sum, row) =>
          sum +
          Number(row.currentQuantity || 0) *
            Number((row as any).averageCost || row.startingPrice || 0),
        0,
      ),
    )
    const tb = await GeneralLedgerService.getTrialBalance(org_id)
    const inventory = tb.find((row: any) => String(row.code) === "1300")
    const ledgerValue = roundMoney(Number(inventory?.balance || 0))
    return res.json({
      success: true,
      data: {
        stockValue,
        ledgerValue,
        difference: roundMoney(stockValue - ledgerValue),
        products: products.length,
      },
    })
  }

  static async accountReconciliation(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const [tb, cashAccounts] = await Promise.all([
      GeneralLedgerService.getTrialBalance(org_id),
      CashBankAccount.find({ org_id, status: "active" }).lean(),
    ])
    const cashbook = roundMoney(cashAccounts.reduce((sum, row) => sum + Number(row.currentBalance || 0), 0))
    const glCash = roundMoney(
      tb
        .filter((row: any) => ["1000", "1010", "1020"].includes(String(row.code)))
        .reduce((sum: number, row: any) => sum + Number(row.balance || 0), 0),
    )
    return res.json({
      success: true,
      data: { cashbook, glCash, difference: roundMoney(cashbook - glCash), accounts: cashAccounts.length },
    })
  }

  static async listAuditLogs(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const data = await AuditLog.find({ org_id }).sort({ timestamp: -1 }).limit(100).lean()
    return res.json({ success: true, data })
  }

  static async reverseJournal(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const original = await JournalEntry.findOne({ _id: req.params.id, org_id })
    if (!original || original.status !== "posted") {
      return res.status(404).json({ success: false, message: "Posted journal not found" })
    }
    if (original.reversedBy) {
      return res.status(400).json({ success: false, message: "This journal was already reversed" })
    }
    const reversal = await GeneralLedgerService.postJournalEntry(
      org_id,
      {
        date: new Date(),
        description: `Reversal of ${original.entryNumber}: ${original.description}`,
        reference: original.entryNumber,
        source: "system",
        journalType: original.journalType,
        nature: "reversing",
        reversedFrom: String(original._id),
        lines: original.lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.credit,
          credit: line.debit,
        })),
      },
      userIdOf(req),
    )
    original.reversedBy = String(reversal._id)
    await original.save()
    return res.json({ success: true, data: reversal })
  }

  static async listPayablesBills(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const data = await SupplierInvoice.find({ org_id }).sort({ invoiceDate: -1 }).limit(300).lean()
    return res.json({ success: true, data })
  }

  static async savePayablesBill(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const body = req.body || {}
    const supplierName = String(body.supplierName || "").trim()
    const invoiceNumber = String(body.invoiceNumber || "").trim()
    const amount = Number(body.amount || body.grandTotal || 0)
    if (!supplierName || !invoiceNumber || amount <= 0) {
      return res.status(400).json({ success: false, message: "supplierName, invoiceNumber and amount are required" })
    }
    const taxAmount = Number(body.taxAmount || 0)
    if (taxAmount < 0 || taxAmount > amount) {
      return res.status(400).json({ success: false, message: "taxAmount must be between 0 and the bill amount" })
    }
    const subTotal = roundMoney(amount - taxAmount)
    const invoiceDate = new Date(body.invoiceDate || Date.now())
    const dueDate = new Date(body.dueDate || invoiceDate)
    const invoice = await SupplierInvoice.create({
      org_id,
      invoiceNumber,
      supplierId: supplierName,
      invoiceDate,
      dueDate,
      items: [
        {
          productName: body.description || "Supplier bill",
          quantity: 1,
          unitPrice: subTotal,
          taxRate: taxAmount && subTotal ? roundMoney((taxAmount / subTotal) * 100) : 0,
          lineTotal: amount,
        },
      ],
      subTotal,
      taxAmount,
      grandTotal: amount,
      paidAmount: 0,
      balanceRemaining: amount,
      matchStatus: "override_approved",
      status: "pending_payment",
      createdBy: userIdOf(req),
    })

    await GeneralLedgerService.initializeDefaultAccounts(org_id)
    const expense = await Account.findOne({ org_id, code: body.inventory ? "1300" : "6000" })
    const vat = await Account.findOne({ org_id, code: "2100" })
    const ap = await Account.findOne({ org_id, code: "2000" })
    if (!expense || !ap) return res.status(400).json({ success: false, message: "Payable accounts are missing" })
    const lines = [
      { accountId: expense._id as any, debit: subTotal, credit: 0, description: supplierName },
      { accountId: vat?._id as any, debit: taxAmount, credit: 0, description: "Input VAT" },
      { accountId: ap._id as any, debit: 0, credit: amount, description: invoiceNumber },
    ].filter((line) => line.accountId && (line.debit > 0 || line.credit > 0))
    await GeneralLedgerService.postJournalEntry(
      org_id,
      {
        date: invoiceDate,
        description: `Supplier bill ${invoiceNumber} · ${supplierName}`,
        reference: invoiceNumber,
        source: "invoice",
        journalType: "purchases",
        nature: "automatic",
        lines,
      },
      userIdOf(req),
    )
    invoice.glPosted = true
    invoice.postedBy = userIdOf(req)
    await invoice.save()
    return res.status(201).json({ success: true, data: invoice })
  }

  static async payPayablesBill(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const invoice = await SupplierInvoice.findOne({ _id: req.params.id, org_id })
    if (!invoice) return res.status(404).json({ success: false, message: "Bill not found" })
    const payAmount = Number(req.body?.amount || invoice.balanceRemaining)
    if (payAmount <= 0 || payAmount > Number(invoice.balanceRemaining)) {
      return res.status(400).json({ success: false, message: "Invalid payment amount" })
    }
    if (!req.body?.accountId) return res.status(400).json({ success: false, message: "Choose the cash or bank account to pay from" })
    const cashAccount = await CashBankAccount.findOne({ _id: req.body.accountId, org_id, status: "active" })
    if (!cashAccount) return res.status(404).json({ success: false, message: "Payment account not found" })

    await postTransaction({
      orgId: org_id,
      account: cashAccount as any,
      direction: "out",
      kind: "expense",
      amount: payAmount,
      occurredAt: new Date(req.body?.paymentDate || Date.now()),
      description: `Supplier payment · ${invoice.invoiceNumber} · ${invoice.supplierId}`,
      reference: req.body?.reference || invoice.invoiceNumber,
      counterparty: invoice.supplierId,
      sourceType: "supplier_payment",
      sourceId: `supplier_payment:${invoice._id}:${Date.now()}`,
      createdBy: userIdOf(req),
    })

    await GeneralLedgerService.initializeDefaultAccounts(org_id)
    const ap = await Account.findOne({ org_id, code: "2000" })
    const glCashCode = cashAccount.type === "mpesa" ? "1020" : cashAccount.type === "bank" ? "1010" : "1000"
    const cashGl = await Account.findOne({ org_id, code: glCashCode })
    if (!ap || !cashGl) return res.status(400).json({ success: false, message: "Payable cash accounts are missing" })
    await GeneralLedgerService.postJournalEntry(
      org_id,
      {
        date: new Date(req.body?.paymentDate || Date.now()),
        description: `Pay supplier ${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
        source: "payment",
        journalType: "purchases",
        nature: "automatic",
        lines: [
          { accountId: ap._id as any, debit: payAmount, credit: 0, description: invoice.supplierId },
          { accountId: cashGl._id as any, debit: 0, credit: payAmount, description: cashAccount.name },
        ],
      },
      userIdOf(req),
    )

    invoice.paidAmount = roundMoney(Number(invoice.paidAmount || 0) + payAmount)
    invoice.balanceRemaining = roundMoney(Number(invoice.grandTotal) - Number(invoice.paidAmount))
    invoice.status = invoice.balanceRemaining <= 0 ? "paid" : "partially_paid"
    await invoice.save()
    return res.json({ success: true, data: invoice })
  }

  static async listPayablesCreditNotes(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const data = await PurchaseCreditNote.find({ org_id }).sort({ date: -1 }).limit(200).lean()
    return res.json({ success: true, data })
  }

  static async savePayablesCreditNote(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const supplierName = String(req.body?.supplierName || "").trim()
    const amount = Number(req.body?.amount || 0)
    const reason = String(req.body?.reason || "").trim()
    if (!supplierName || amount <= 0 || !reason) {
      return res.status(400).json({ success: false, message: "supplierName, amount and reason are required" })
    }
    const note = await PurchaseCreditNote.create({
      org_id,
      supplierId: supplierName,
      supplierName,
      billId: req.body?.billId,
      date: new Date(req.body?.date || Date.now()),
      amount,
      reason,
      reference: req.body?.reference,
      createdBy: userIdOf(req),
    })
    if (req.body?.billId) {
      const bill = await SupplierInvoice.findOne({ _id: req.body.billId, org_id })
      if (bill) {
        bill.balanceRemaining = Math.max(0, roundMoney(Number(bill.balanceRemaining) - amount))
        bill.status = bill.balanceRemaining <= 0 ? "paid" : bill.status
        await bill.save()
      }
    }
    await GeneralLedgerService.initializeDefaultAccounts(org_id)
    const ap = await Account.findOne({ org_id, code: "2000" })
    const expense = await Account.findOne({ org_id, code: "6000" })
    if (ap && expense) {
      await GeneralLedgerService.postJournalEntry(
        org_id,
        {
          date: note.date,
          description: `Purchase credit note · ${supplierName}`,
          reference: note.reference || String(note._id),
          source: "invoice",
          journalType: "purchases",
          nature: "automatic",
          lines: [
            { accountId: ap._id as any, debit: amount, credit: 0, description: reason },
            { accountId: expense._id as any, debit: 0, credit: amount, description: supplierName },
          ],
        },
        userIdOf(req),
      )
      note.glPosted = true
      await note.save()
    }
    return res.status(201).json({ success: true, data: note })
  }

  static async payablesCreditors(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const bills = await SupplierInvoice.find({ org_id, status: { $nin: ["cancelled"] } }).lean()
    const notes = await PurchaseCreditNote.find({ org_id }).lean()
    const map = new Map<string, { supplierId: string; billed: number; paid: number; credits: number; balance: number }>()
    for (const bill of bills) {
      const row = map.get(bill.supplierId) || { supplierId: bill.supplierId, billed: 0, paid: 0, credits: 0, balance: 0 }
      row.billed += Number(bill.grandTotal || 0)
      row.paid += Number(bill.paidAmount || 0)
      row.balance += Number(bill.balanceRemaining || 0)
      map.set(bill.supplierId, row)
    }
    for (const note of notes) {
      const row = map.get(note.supplierId) || { supplierId: note.supplierId, billed: 0, paid: 0, credits: 0, balance: 0 }
      row.credits += Number(note.amount || 0)
      map.set(note.supplierId, row)
    }
    return res.json({ success: true, data: [...map.values()].map((row) => ({ ...row, billed: roundMoney(row.billed), paid: roundMoney(row.paid), credits: roundMoney(row.credits), balance: roundMoney(row.balance) })) })
  }

  static async payablesAging(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const bills = await SupplierInvoice.find({ org_id, balanceRemaining: { $gt: 0 }, status: { $nin: ["cancelled", "paid"] } }).lean()
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, older: 0 }
    const today = new Date()
    const rows = bills.map((bill) => {
      const days = Math.max(0, Math.floor((today.getTime() - new Date(bill.dueDate || bill.invoiceDate).getTime()) / 86400000))
      const amount = Number(bill.balanceRemaining || 0)
      if (days <= 30) buckets.current += amount
      else if (days <= 60) buckets.d30 += amount
      else if (days <= 90) buckets.d60 += amount
      else if (days <= 120) buckets.d90 += amount
      else buckets.older += amount
      return { ...bill, days }
    })
    return res.json({
      success: true,
      data: {
        buckets: {
          current: roundMoney(buckets.current),
          d30: roundMoney(buckets.d30),
          d60: roundMoney(buckets.d60),
          d90: roundMoney(buckets.d90),
          older: roundMoney(buckets.older),
        },
        rows,
      },
    })
  }

  static async payablesStatement(req: AuthenticatedRequest, res: Response) {
    const org_id = orgOf(req)
    if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
    const supplierId = String(req.query.supplierId || "")
    if (!supplierId) return res.status(400).json({ success: false, message: "supplierId is required" })
    const bills = await SupplierInvoice.find({ org_id, supplierId }).sort({ invoiceDate: 1 }).lean()
    const notes = await PurchaseCreditNote.find({ org_id, supplierId }).sort({ date: 1 }).lean()
    return res.json({
      success: true,
      data: {
        supplierId,
        billed: roundMoney(bills.reduce((sum, row) => sum + Number(row.grandTotal || 0), 0)),
        paid: roundMoney(bills.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0)),
        credits: roundMoney(notes.reduce((sum, row) => sum + Number(row.amount || 0), 0)),
        balance: roundMoney(bills.reduce((sum, row) => sum + Number(row.balanceRemaining || 0), 0)),
        bills,
        notes,
      },
    })
  }
}
