import cron from 'node-cron';
import { DataLakeService } from '../services/datalake/archiveService';

/**
 * Initializes and starts all ETL and Archiving jobs for the Data Lake architecture.
 */
export const startDataLakeJobs = () => {
  console.log('[DataLake Jobs] Initializing scheduled tasks...');

  // 1. Sync Data from Mongo to MySQL (Runs every hour)
  // This keeps the Data Lake relatively real-time.
  cron.schedule('0 * * * *', async () => {
    console.log('[DataLake Jobs] Running hourly ETL sync...');
    await DataLakeService.syncInvoices();
    await DataLakeService.syncQuotations();
  });

  // 2. Archive Old Records (Runs daily at 2:00 AM)
  // Moves data older than 90 days out of active operational queries.
  cron.schedule('0 2 * * *', async () => {
    console.log('[DataLake Jobs] Running nightly archive sweep...');
    await DataLakeService.archiveOldRecords(90); // Archive anything older than 90 days
  });

  console.log('[DataLake Jobs] Scheduled tasks started.');
};
