import axios from "axios"
import dotenv from "dotenv"

dotenv.config()

async function testOwnerAPI() {
  try {
    console.log("🔐 Testing Owner API Directly...\n")
    console.log("⚠️ Making unauthenticated request to check API response:\n")

    // Try calling without auth to see error
    try {
      const companiesRes = await axios.get("http://localhost:5010/api/owner/companies")
      console.log("Response:", companiesRes.data)
    } catch (error) {
      console.log("Expected auth error:", error.response?.data)
    }

    console.log("\n✅ This shows the API is working. Now:")
    console.log("1. Make sure you're logged in as bellarinseth@gmail.com in the browser")
    console.log("2. Open DevTools (F12) → Network tab")
    console.log("3. Go to http://localhost:3000/owner")
    console.log("4. Check the GET /api/owner/companies request")
    console.log("5. Look at the Response tab to see what companies are being returned")
  } catch (error) {
    console.error("❌ Error:", error.message)
  }
}

testOwnerAPI()
