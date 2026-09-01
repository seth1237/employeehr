import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Account } from "../models/Account";
import { JournalEntry } from "../models/JournalEntry";
import { GeneralLedgerService } from "../services/GeneralLedgerService";

export class GLController {
  static async getAccounts(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      await GeneralLedgerService.initializeDefaultAccounts(org_id);

      const accounts = await Account.find({ org_id }).sort({ code: 1 }).lean();
      return res.status(200).json({ success: true, data: accounts });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const { code, name, type, description } = req.body;

      const exists = await Account.findOne({ org_id, code });
      if (exists) {
        return res.status(400).json({ success: false, message: "Account code already exists" });
      }

      const account = new Account({ org_id, code, name, type, description });
      await account.save();

      return res.status(201).json({ success: true, data: account });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getJournalEntries(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const entries = await JournalEntry.find({ org_id })
        .populate("lines.accountId", "code name type")
        .sort({ date: -1, createdAt: -1 })
        .limit(100)
        .lean();

      return res.status(200).json({ success: true, data: entries });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async postJournalEntry(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const { date, reference, description, lines } = req.body;

      const entry = await GeneralLedgerService.postJournalEntry(
        org_id,
        { date, reference, description, lines, source: "manual" },
        req.user!._id
      );

      return res.status(201).json({ success: true, data: entry });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getTrialBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const data = await GeneralLedgerService.getTrialBalance(org_id, start, end);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getProfitAndLoss(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const data = await GeneralLedgerService.getProfitAndLoss(org_id, start, end);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getBalanceSheet(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const { asOfDate } = req.query;
      const date = asOfDate ? new Date(asOfDate as string) : undefined;

      const data = await GeneralLedgerService.getBalanceSheet(org_id, date);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getGeneralLedger(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id;
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const { accountId, startDate, endDate } = req.query;

      const matchQuery: any = { org_id, status: "posted" };
      
      if (startDate || endDate) {
        matchQuery.date = {};
        if (startDate) matchQuery.date.$gte = new Date(startDate as string);
        if (endDate) matchQuery.date.$lte = new Date(endDate as string);
      }

      if (accountId) {
        matchQuery["lines.accountId"] = accountId;
      }

      const entries = await JournalEntry.find(matchQuery)
        .populate("lines.accountId", "code name type")
        .sort({ date: 1, createdAt: 1 })
        .lean();

      // Transform into a ledger view
      const ledger = [];
      let balance = 0;

      for (const entry of entries) {
        for (const line of entry.lines as any) {
          if (accountId && String(line.accountId._id) !== String(accountId)) {
            continue;
          }

          // In a real ledger, balance calculation depends on account type.
          // Since we may be querying multiple accounts at once here, 
          // we'll just return the lines and let the client process it.
          ledger.push({
            date: entry.date,
            entryNumber: entry.entryNumber,
            reference: entry.reference,
            description: entry.description,
            account: line.accountId,
            debit: line.debit,
            credit: line.credit,
          });
        }
      }

      return res.status(200).json({ success: true, data: ledger });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}