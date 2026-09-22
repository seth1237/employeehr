import mongoose from "mongoose"

mongoose.set("bufferCommands", false)

const MAX_CONNECT_ATTEMPTS = 5
const BASE_DELAY_MS = 2000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/elevate"
  let lastError: unknown

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected — waiting to reconnect")
  })
  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected")
  })
  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error instanceof Error ? error.message : error)
  })

  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4,
        retryWrites: true,
      })
      console.log("MongoDB connected successfully")
      return
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      console.error(
        `MongoDB connection attempt ${attempt}/${MAX_CONNECT_ATTEMPTS} failed: ${message}`,
      )
      if (attempt < MAX_CONNECT_ATTEMPTS) {
        const delay = BASE_DELAY_MS * attempt
        console.log(`Retrying MongoDB connection in ${delay / 1000}s...`)
        await sleep(delay)
      }
    }
  }

  console.error("Server startup aborted because MongoDB is required")
  console.error(
    "Check MONGODB_URI, Atlas Network Access (this server IP must be allowed), and outbound TCP 27017.",
  )
  throw lastError
}

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect()
    console.log("MongoDB disconnected")
  } catch (error) {
    console.error("MongoDB disconnection error:", error)
  }
}
