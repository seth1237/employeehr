import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let dataLakeReady = false;

const datalakePool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'elevat10_datalake',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'elevat10_datalake',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export function isDataLakeReady() {
  return dataLakeReady;
}

export const initDataLake = async () => {
  if (process.env.MYSQL_DATALAKE_ENABLED === "false") {
    console.log("[DataLake] Disabled (MYSQL_DATALAKE_ENABLED=false).");
    return false;
  }

  try {
    const connection = await datalakePool.getConnection();
    console.log("[DataLake] Connected to MySQL Data Lake successfully.");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS dl_invoices (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        mongo_id VARCHAR(50) UNIQUE NOT NULL,
        org_id VARCHAR(50) NOT NULL,
        invoice_number VARCHAR(100),
        client_name VARCHAR(255),
        sub_total DECIMAL(15,2),
        status VARCHAR(50),
        created_at DATETIME,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_org_status (org_id, status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS dl_quotations (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        mongo_id VARCHAR(50) UNIQUE NOT NULL,
        org_id VARCHAR(50) NOT NULL,
        quotation_number VARCHAR(100),
        client_name VARCHAR(255),
        sub_total DECIMAL(15,2),
        status VARCHAR(50),
        created_at DATETIME,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_org_status (org_id, status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("[DataLake] Core archive tables initialized.");
    connection.release();
    dataLakeReady = true;
    return true;
  } catch (error: any) {
    dataLakeReady = false;
    console.warn(
      `[DataLake] MySQL archive is unavailable (${error.message}). Invoice/quotation archive sync is skipped.`,
    );
    return false;
  }
};

export default datalakePool;
