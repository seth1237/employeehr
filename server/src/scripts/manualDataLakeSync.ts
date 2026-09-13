import "dotenv/config";
import mongoose from "mongoose";
import { initDataLake } from "../config/mysql";
import { DataLakeService } from "../services/datalake/archiveService";

async function run() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/employeehr";
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected.");

    console.log("🔌 Initializing MySQL Data Lake tables...");
    await initDataLake();
    
    console.log("🔄 Manually triggering Invoices Sync...");
    await DataLakeService.syncInvoices();
    
    console.log("🔄 Manually triggering Quotations Sync...");
    await DataLakeService.syncQuotations();
    
    console.log("✅ Manual sync complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during manual sync:", err);
    process.exit(1);
  }
}

run();
