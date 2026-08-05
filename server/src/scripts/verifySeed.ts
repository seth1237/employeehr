import 'dotenv/config'
import mongoose from 'mongoose'
import { Company } from '../models/Company'
import { StockProduct } from '../models/StockProduct'

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:37213/'
  await mongoose.connect(uri)
  const company = await Company.findOne({ email: 'accordmedsupplies@gmail.com' }).lean()
  const count = await StockProduct.countDocuments({ org_id: String(company?._id || '') })
  console.log(JSON.stringify({ companyFound: !!company, companyId: company?._id ? String(company._id) : null, stockProductCount: count }, null, 2))
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
