import "dotenv/config";
import mongoose from "mongoose";
import { Company } from "./src/models/Company.js";
import { User } from "./src/models/User.js";

async function findData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/elevate");
        console.log("Connected to database");

        const companies = await Company.find({}, "name slug _id");
        console.log("Found companies:", JSON.stringify(companies, null, 2));

        const accordId = "6960d00693ecbf6f0dd693ba";
        const users = await User.find({ org_id: accordId }, "firstName lastName email role _id");
        console.log("Found users for ACCORD:", JSON.stringify(users, null, 2));

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

findData();
