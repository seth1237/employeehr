/**
 * Migration script to sync existing MongoDB data to MySQL
 * Run: node dist/scripts/syncMongoToMySQL.js
 * Or: ts-node server/src/scripts/syncMongoToMySQL.ts
 */

import mongoose from "mongoose"
import { User } from "../models/User"
import { Company } from "../models/Company"
import { SecondaryStorageService } from "../services/secondaryStorageService"
import dotenv from "dotenv"
import { fileURLToPath } from 'url'

dotenv.config()

async function migrateUsers() {
  console.log("🔄 Starting user migration...")
  try {
    const users = await User.find().lean()
    console.log(`📊 Found ${users.length} users in MongoDB`)
    
    if (users.length === 0) {
      console.log("⚠️  No users found in MongoDB - nothing to migrate")
      return 0
    }

    let migratedCount = 0
    const failedUsers: Array<{ email: string; error: string }> = []

    for (const user of users) {
      try {
        await SecondaryStorageService.syncUserToMySQL(user as any, "CREATE")
        migratedCount++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`❌ Failed to migrate user ${user.email}: ${errorMsg}`)
        failedUsers.push({ email: user.email, error: errorMsg })
      }
    }

    console.log(`✅ Migrated ${migratedCount}/${users.length} users`)
    
    if (failedUsers.length > 0) {
      console.log(`\n⚠️  Failed user migrations:`)
      failedUsers.forEach(({ email, error }) => {
        console.log(`   - ${email}: ${error}`)
      })
    }

    return migratedCount
  } catch (error) {
    console.error("❌ User migration failed:", error)
    throw error
  }
}

async function migrateCompanies() {
  console.log("🔄 Starting company migration...")
  try {
    const companies = await Company.find().lean()
    console.log(`📊 Found ${companies.length} companies in MongoDB`)
    
    if (companies.length === 0) {
      console.log("⚠️  No companies found in MongoDB - nothing to migrate")
      return 0
    }

    let migratedCount = 0
    const failedCompanies: Array<{ name: string; error: string }> = []

    for (const company of companies) {
      try {
        await SecondaryStorageService.syncCompanyToMySQL(company as any, "CREATE")
        migratedCount++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`❌ Failed to migrate company ${company.name}: ${errorMsg}`)
        failedCompanies.push({ name: company.name, error: errorMsg })
      }
    }

    console.log(`✅ Migrated ${migratedCount}/${companies.length} companies`)
    
    if (failedCompanies.length > 0) {
      console.log(`\n⚠️  Failed company migrations:`)
      failedCompanies.forEach(({ name, error }) => {
        console.log(`   - ${name}: ${error}`)
      })
    }

    return migratedCount
  } catch (error) {
    console.error("❌ Company migration failed:", error)
    throw error
  }
}

async function runMigration() {
  try {
    console.log("📊 Starting MongoDB → MySQL migration...")
    console.log(`MongoDB URL: ${process.env.MONGODB_URI?.split("@")[1]}...`)
    console.log(`MySQL URL: ${process.env.MYSQL_DATABASE_URL?.split("@")[1]}...`)

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!)
    console.log("✅ Connected to MongoDB")

    // Run migrations
    const userCount = await migrateUsers()
    const companyCount = await migrateCompanies()

    console.log("\n✅ Migration completed successfully!")
    console.log(`   - Users: ${userCount}`)
    console.log(`   - Companies: ${companyCount}`)
  } catch (error) {
    console.error("❌ Migration error:", error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    await SecondaryStorageService.disconnect()
    console.log("🔌 Connections closed")
  }
}

// Run if executed directly (ESM-safe)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void runMigration()
}

export { runMigration, migrateUsers, migrateCompanies }
