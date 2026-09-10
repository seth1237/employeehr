require('dotenv').config();
const mongoose = require('mongoose');
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const clients = await db.collection('stockclients').countDocuments();
  const quotes = await db.collection('stockquotations').countDocuments();
  const invoices = await db.collection('stockinvoices').countDocuments();
  console.log(`stockclients: ${clients}`);
  console.log(`stockquotations: ${quotes}`);
  console.log(`stockinvoices: ${invoices}`);
  process.exit(0);
}
main().catch(console.error);
