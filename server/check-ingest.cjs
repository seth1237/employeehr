require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const clients = await db.collection('crmclients').countDocuments();
  const quotes = await db.collection('stockquotes').countDocuments();
  const invoices = await db.collection('stockinvoices').countDocuments();
  console.log(`Clients: ${clients}`);
  console.log(`Quotes: ${quotes}`);
  console.log(`Invoices: ${invoices}`);
  
  const orgCount = await db.collection('organizations').countDocuments({ _id: new mongoose.Types.ObjectId(process.env.CFT_TARGET_ORG_ID) });
  console.log(`Org found? ${orgCount > 0}`);
  
  process.exit(0);
}
main().catch(console.error);
