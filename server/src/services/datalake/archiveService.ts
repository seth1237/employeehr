import { StockInvoice } from '../../models/StockInvoice';
import { StockQuotation } from '../../models/StockQuotation';
import datalakePool from '../../config/mysql';

/**
 * Service to sync and archive data from MongoDB (Operational DB) 
 * to MySQL (Data Lake / Warehouse)
 */
export class DataLakeService {
  
  /**
   * Syncs new/updated invoices to MySQL Data Lake.
   */
  static async syncInvoices() {
    console.log('[DataLake] Starting Invoices Sync...');
    try {
      // Find invoices that haven't been synced to the Data Lake yet
      const unsyncedInvoices = await StockInvoice.find({ 
        $or: [
          { dataLakeSynced: false },
          { dataLakeSynced: { $exists: false } }
        ]
      }).lean();

      if (unsyncedInvoices.length === 0) {
        console.log('[DataLake] No new invoices to sync.');
        return;
      }

      const connection = await datalakePool.getConnection();
      let syncedCount = 0;

      for (const invoice of unsyncedInvoices) {
        try {
          const clientName = invoice.client?.name || 'Unknown Client';
          
          await connection.query(
            `INSERT INTO dl_invoices 
             (mongo_id, org_id, invoice_number, client_name, sub_total, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             client_name = VALUES(client_name),
             sub_total = VALUES(sub_total),
             status = VALUES(status)`,
            [
              String(invoice._id),
              invoice.org_id,
              invoice.invoiceNumber,
              clientName,
              invoice.subTotal || 0,
              invoice.status,
              invoice.createdAt || new Date()
            ]
          );

          // Mark as synced in MongoDB
          await StockInvoice.updateOne(
            { _id: invoice._id },
            { $set: { dataLakeSynced: true } }
          );
          
          syncedCount++;
        } catch (err: any) {
          console.error(`[DataLake] Error syncing invoice ${invoice._id}:`, err.message);
        }
      }

      connection.release();
      console.log(`[DataLake] Successfully synced ${syncedCount} invoices.`);
    } catch (error: any) {
      console.error('[DataLake] Failed to sync invoices:', error.message);
    }
  }

  /**
   * Syncs new/updated quotations to MySQL Data Lake.
   */
  static async syncQuotations() {
    console.log('[DataLake] Starting Quotations Sync...');
    try {
      const unsyncedQuotes = await StockQuotation.find({ 
        $or: [
          { dataLakeSynced: false },
          { dataLakeSynced: { $exists: false } }
        ]
      }).lean();

      if (unsyncedQuotes.length === 0) {
        console.log('[DataLake] No new quotations to sync.');
        return;
      }

      const connection = await datalakePool.getConnection();
      let syncedCount = 0;

      for (const quote of unsyncedQuotes) {
        try {
          const clientName = quote.client?.name || 'Unknown Client';
          
          await connection.query(
            `INSERT INTO dl_quotations 
             (mongo_id, org_id, quotation_number, client_name, sub_total, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             client_name = VALUES(client_name),
             sub_total = VALUES(sub_total),
             status = VALUES(status)`,
            [
              String(quote._id),
              quote.org_id,
              quote.quotationNumber,
              clientName,
              quote.subTotal || 0,
              quote.status,
              quote.createdAt || new Date()
            ]
          );

          // Mark as synced in MongoDB
          await StockQuotation.updateOne(
            { _id: quote._id },
            { $set: { dataLakeSynced: true } }
          );
          
          syncedCount++;
        } catch (err: any) {
          console.error(`[DataLake] Error syncing quotation ${quote._id}:`, err.message);
        }
      }

      connection.release();
      console.log(`[DataLake] Successfully synced ${syncedCount} quotations.`);
    } catch (error: any) {
      console.error('[DataLake] Failed to sync quotations:', error.message);
    }
  }

  /**
   * Archives old data by setting isArchived=true so frontend won't load it by default.
   * Runs daily.
   */
  static async archiveOldRecords(daysOld: number = 90) {
    console.log(`[DataLake] Archiving records older than ${daysOld} days...`);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      // Archive Invoices
      const invoiceResult = await StockInvoice.updateMany(
        { 
          createdAt: { $lt: cutoffDate },
          isArchived: false,
          dataLakeSynced: true // Ensure it's in the data lake first
        },
        { $set: { isArchived: true } }
      );
      
      console.log(`[DataLake] Archived ${invoiceResult.modifiedCount} old invoices.`);

      // Archive Quotations
      const quoteResult = await StockQuotation.updateMany(
        { 
          createdAt: { $lt: cutoffDate },
          isArchived: false,
          dataLakeSynced: true // Ensure it's in the data lake first
        },
        { $set: { isArchived: true } }
      );
      
      console.log(`[DataLake] Archived ${quoteResult.modifiedCount} old quotations.`);
    } catch (error: any) {
      console.error('[DataLake] Failed to archive old records:', error.message);
    }
  }
}
