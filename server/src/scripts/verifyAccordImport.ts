import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import mongoose from "mongoose"
import { User } from "../models/User"
import { Company } from "../models/Company"
import { StockCategory } from "../models/StockCategory"
import { StockClient } from "../models/StockClient"
import { StockQuotation } from "../models/StockQuotation"
import { StockInvoice } from "../models/StockInvoice"
import { StockExpense } from "../models/StockExpense"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, "../..")
dotenv.config({ path: path.join(serverRoot, ".env") })

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!)

  const user = await User.findOne({ email: "accord@gmail.com" }).lean()
  if (!user) {
    console.log("NO_USER")
    await mongoose.disconnect()
    return
  }

  const orgId = user.org_id
  const [company, categories, clients, quotations, invoices, expenses, legacy] = await Promise.all([
    Company.findById(orgId).lean(),
    StockCategory.countDocuments({ org_id: orgId }),
    StockClient.countDocuments({ org_id: orgId }),
    StockQuotation.countDocuments({ org_id: orgId }),
    StockInvoice.countDocuments({ org_id: orgId }),
    StockExpense.countDocuments({ org_id: orgId }),
    mongoose.connection.collection("legacy_imports").countDocuments({ org_id: orgId }),
  ])

  console.log(
    JSON.stringify(
      {
        userEmail: user.email,
        role: user.role,
        orgId,
        companyName: company?.name,
        counts: {
          categories,
          clients,
          quotations,
          invoices,
          expenses,
          legacy,
        },
      },
      null,
      2,
    ),
  )

  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error(error)
  if (mongoose.connection.readyState) {
    await mongoose.disconnect()
  }
  process.exit(1)
})
