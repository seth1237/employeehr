import mongoose from "mongoose"
import { EtimsConfig } from "./server/src/models/EtimsConfig"

async function run() {
  await mongoose.connect("mongodb://localhost:27017/employeehr")
  const config = await EtimsConfig.findOne()
  console.log(config)
  process.exit(0)
}
run()
