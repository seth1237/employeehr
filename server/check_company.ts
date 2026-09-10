import mongoose from "mongoose";
import dotenv from "dotenv";
import { Company } from "./src/models/Company";

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected");
  const companies = await Company.find();
  for (const c of companies) {
    console.log("Company:", c.name);
    console.log("platformEnabledSections:", c.pageAccess?.platformEnabledSections);
    
    if (c.pageAccess && Array.isArray(c.pageAccess.platformEnabledSections)) {
      if (!c.pageAccess.platformEnabledSections.includes("PROCUREMENT (P2P)")) {
        c.pageAccess.platformEnabledSections.push("PROCUREMENT (P2P)");
        await c.save();
        console.log("Added PROCUREMENT (P2P) to", c.name);
      }
    } else if (!c.pageAccess) {
      c.pageAccess = { platformEnabledSections: ["PROCUREMENT (P2P)"] } as any;
      await c.save();
      console.log("Added pageAccess and PROCUREMENT (P2P) to", c.name);
    }
  }
  process.exit(0);
}
check().catch(console.error);
