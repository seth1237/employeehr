import { Account, IAccount } from "../models/Account";
import { JournalEntry, IJournalEntry, IJournalLine } from "../models/JournalEntry";
import mongoose from "mongoose";

export class GeneralLedgerService {
  /**
   * Initializes default system accounts for a new organization if they don't exist.
   */
  static async initializeDefaultAccounts(org_id: string) {
    const defaultAccounts = [
      { code: "1000", name: "Cash on Hand", type: "asset", isSystem: true },
      { code: "1010", name: "Bank Account", type: "asset", isSystem: true },
      { code: "1020", name: "M-Pesa Account", type: "asset", isSystem: true },
      { code: "1200", name: "Accounts Receivable", type: "asset", isSystem: true },
      { code: "1300", name: "Inventory", type: "asset", isSystem: true },
      { code: "2000", name: "Accounts Payable", type: "liability", isSystem: true },
      { code: "2100", name: "VAT Payable", type: "liability", isSystem: true },
      { code: "3000", name: "Owner's Equity", type: "equity", isSystem: true },
      { code: "3100", name: "Retained Earnings", type: "equity", isSystem: true },
      { code: "4000", name: "Sales Revenue", type: "revenue", isSystem: true },
      { code: "5000", name: "Cost of Goods Sold", type: "expense", isSystem: true },
      { code: "6000", name: "Operating Expenses", type: "expense", isSystem: true },
      { code: "6100", name: "Payroll Expense", type: "expense", isSystem: true },
    ];

    for (const acc of defaultAccounts) {
      const exists = await Account.findOne({ org_id, code: acc.code });
      if (!exists) {
        await Account.create({ ...acc, org_id });
      }
    }
  }

  /**
   * Generates the next sequential journal entry number
   */
  static async generateEntryNumber(org_id: string): Promise<string> {
    const lastEntry = await JournalEntry.findOne({ org_id }).sort({ createdAt: -1 });
    if (!lastEntry) {
      return "JE-00001";
    }
    const lastNum = parseInt(lastEntry.entryNumber.replace("JE-", ""), 10);
    if (isNaN(lastNum)) return `JE-${Date.now().toString().slice(-5)}`;
    return `JE-${String(lastNum + 1).padStart(5, "0")}`;
  }

  /**
   * Validates and posts a journal entry. Ensures debits equal credits.
   */
  static async postJournalEntry(
    org_id: string,
    data: {
      date: Date;
      reference?: string;
      description: string;
      lines: IJournalLine[];
      source?: string;
    },
    userId: string
  ) {
    if (!data.lines || data.lines.length < 2) {
      throw new Error("A journal entry must have at least two lines.");
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of data.lines) {
      totalDebit += Number(line.debit) || 0;
      totalCredit += Number(line.credit) || 0;

      // Ensure account exists
      const account = await Account.findOne({ _id: line.accountId, org_id });
      if (!account) {
        throw new Error(`Account ${line.accountId} not found.`);
      }
    }

    // Floating point precision fix
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (totalDebit !== totalCredit) {
      throw new Error(`Journal entry unbalanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
    }
    if (totalDebit <= 0) {
      throw new Error("Journal entry must have a non-zero value.");
    }

    const entryNumber = await this.generateEntryNumber(org_id);

    const entry = new JournalEntry({
      org_id,
      entryNumber,
      date: data.date,
      reference: data.reference,
      description: data.description,
      lines: data.lines,
      status: "posted",
      source: data.source || "manual",
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
    });

    await entry.save();
    return entry;
  }

  /**
   * Retrieves the trial balance for a given date range
   */
  static async getTrialBalance(org_id: string, startDate?: Date, endDate?: Date) {
    const matchQuery: any = { org_id, status: "posted" };
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = startDate;
      if (endDate) matchQuery.date.$lte = endDate;
    }

    const result = await JournalEntry.aggregate([
      { $match: matchQuery },
      { $unwind: "$lines" },
      {
        $group: {
          _id: "$lines.accountId",
          totalDebit: { $sum: "$lines.debit" },
          totalCredit: { $sum: "$lines.credit" },
        },
      },
      {
        $lookup: {
          from: "accounts",
          localField: "_id",
          foreignField: "_id",
          as: "account",
        },
      },
      { $unwind: "$account" },
      {
        $project: {
          accountId: "$_id",
          code: "$account.code",
          name: "$account.name",
          type: "$account.type",
          totalDebit: 1,
          totalCredit: 1,
          balance: {
            $cond: [
              { $in: ["$account.type", ["asset", "expense"]] },
              { $subtract: ["$totalDebit", "$totalCredit"] },
              { $subtract: ["$totalCredit", "$totalDebit"] },
            ],
          },
        },
      },
      { $sort: { code: 1 } },
    ]);

    return result;
  }

  /**
   * Generates the Profit & Loss statement
   */
  static async getProfitAndLoss(org_id: string, startDate?: Date, endDate?: Date) {
    const trialBalance = await this.getTrialBalance(org_id, startDate, endDate);
    
    let revenue = 0;
    let cogs = 0;
    let expenses = 0;
    
    const revenueAccounts = [];
    const cogsAccounts = [];
    const expenseAccounts = [];

    for (const item of trialBalance) {
      if (item.type === "revenue") {
        revenue += item.balance;
        revenueAccounts.push(item);
      } else if (item.type === "expense") {
        if (item.code && item.code.startsWith("5")) { // COGS typically 5xxx
          cogs += item.balance;
          cogsAccounts.push(item);
        } else {
          expenses += item.balance;
          expenseAccounts.push(item);
        }
      }
    }

    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - expenses;

    return {
      revenue,
      cogs,
      grossProfit,
      expenses,
      netIncome,
      details: {
        revenueAccounts,
        cogsAccounts,
        expenseAccounts,
      }
    };
  }

  /**
   * Generates the Balance Sheet
   */
  static async getBalanceSheet(org_id: string, asOfDate?: Date) {
    const trialBalance = await this.getTrialBalance(org_id, undefined, asOfDate || new Date());
    
    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    
    const assetAccounts = [];
    const liabilityAccounts = [];
    const equityAccounts = [];

    for (const item of trialBalance) {
      if (item.type === "asset") {
        assets += item.balance;
        assetAccounts.push(item);
      } else if (item.type === "liability") {
        liabilities += item.balance;
        liabilityAccounts.push(item);
      } else if (item.type === "equity") {
        equity += item.balance;
        equityAccounts.push(item);
      }
    }

    // Add Net Income to Equity
    // A proper system rolls over net income into retained earnings at year end.
    // For this real-time balance sheet, we calculate YTD net income and add it.
    const pnl = await this.getProfitAndLoss(org_id, undefined, asOfDate); // All time P&L
    
    const totalEquity = equity + pnl.netIncome;
    const totalLiabilitiesAndEquity = liabilities + totalEquity;

    return {
      assets,
      liabilities,
      equity: totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(assets - totalLiabilitiesAndEquity) < 0.01,
      details: {
        assetAccounts,
        liabilityAccounts,
        equityAccounts,
        netIncome: pnl.netIncome
      }
    };
  }
}