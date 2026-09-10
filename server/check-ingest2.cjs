require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const colNames = await db.listCollections().toArray();
  const c = colNames.map(c => c.name);
  console.log('Collections:', c);
  
  const clients = await db.collection('crmclients').countDocuments();
  const quotes = await db.collection('stockquotes').countDocuments();
  const invoices = await db.collection('stockinvoices').countDocuments();
  
  console.log(`crmclients: ${clients}`);
  console.log(`stockquotes: ${quotes}`);
  console.log(`stockinvoices: ${invoices}`);
  
  process.exit(0);
}
main().catch(console.error);
