import mongoose from "mongoose"

mongoose.set("bufferCommands", false)

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/elevate"

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    })
    console.log("MongoDB connected successfully")
  } catch (error) {
    console.error("MongoDB connection error:", error)
    console.log("Server startup aborted because MongoDB is required")
    console.log("Please check your MONGODB_URI and MongoDB network access settings")
    throw error
  }
}

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect()
    console.log("MongoDB disconnected")
  } catch (error) {
    console.error("MongoDB disconnection error:", error)
  }
}
