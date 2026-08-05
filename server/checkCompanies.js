import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

const companySchema = new mongoose.Schema({}, { strict: false })
const Company = mongoose.model("Company", companySchema, "companies")

async function checkCompanies() {
  try {
    const mongoURI = process.env.MONGODB_URI
    console.log("🔌 Connecting to MongoDB:", mongoURI?.split("@")[0] + "@...")

    await mongoose.connect(mongoURI)
    console.log("✅ Connected to MongoDB\n")

    // Check total count
    const count = await Company.countDocuments()
    console.log(`📊 Total companies in database: ${count}\n`)

    if (count === 0) {
      console.log("⚠️ No companies found")
      process.exit(0)
    }

    // Find TARUMED and ACCORD
    const tarumed = await Company.findOne({ name: { $regex: "TARUMED", $options: "i" } })
    const accord = await Company.findOne({ name: { $regex: "ACCORD", $options: "i" } })

    console.log("🔍 Searching for specific companies:")
    console.log("TARUMED:", tarumed ? "✅ Found" : "❌ Not found")
    console.log("ACCORD:", accord ? "✅ Found" : "❌ Not found\n")

    // List all companies
    console.log("📋 All companies:")
    const allCompanies = await Company.find({}).select("_id name email slug status subscription createdAt").limit(20)
    allCompanies.forEach((company, index) => {
      console.log(
        `${index + 1}. ${company.name?.padEnd(20)} | ${company.email?.padEnd(30)} | ${company.slug?.padEnd(15)} | ${company.status}`
      )
    })

    if (count > 20) {
      console.log(`\n... and ${count - 20} more`)
    }

    console.log("\n✅ Check complete")
  } catch (error) {
    console.error("❌ Error:", error.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

checkCompanies()
