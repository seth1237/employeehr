const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function testSession() {
  const cookie = process.env.CFT_IP_SESSION;
  const url = `${process.env.CFT_BASE_URL || "https://cloud.cft.co.ke"}/index.php/clients/customers`;
  
  console.log(`Testing CFT URL: ${url}`);
  console.log(`Using Cookie: ip_session=${cookie}`);

  try {
    const res = await axios.get(url, {
      headers: {
        Cookie: `ip_session=${cookie}`,
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      },
      maxRedirects: 5
    });
    
    const html = String(res.data).toLowerCase();
    if (html.includes("login") || html.includes("sign in") || /sessions\/login/i.test(html)) {
      console.log("❌ SESSION EXPIRED: The server returned a login page.");
    } else {
      console.log("✅ SESSION ACTIVE: The page loaded successfully.");
    }
  } catch (error) {
    console.log("❌ ERROR:", error.message);
  }
}

testSession();
