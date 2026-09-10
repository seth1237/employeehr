require('dotenv').config();
const mongoose = require('mongoose');
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Database name:", mongoose.connection.db.databaseName);
  process.exit(0);
}
main().catch(console.error);
