import "dotenv/config"
import { connectDB } from "../src/config/database"
import bcrypt from "bcryptjs"
import { User } from "../src/models/User"

async function createOwner() {
  await connectDB()

  const email = process.env.OWNER_EMAIL || "bellarinseth@gmail.com"
  const password = process.env.OWNER_PASSWORD || "seth123qP1"

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    console.log("Owner user already exists:", existing.email)
    process.exit(0)
  }

  const hashed = await bcrypt.hash(password, 10)

  const owner = new User({
    org_id: "system",
    firstName: "System",
    lastName: "Owner",
    email: email.toLowerCase(),
    password: hashed,
    role: "super_admin",
    status: "active",
  })

  await owner.save()
  console.log("Created owner user:", owner.email)
  process.exit(0)
}

createOwner().catch((err) => {
  console.error(err)
  process.exit(1)
})
