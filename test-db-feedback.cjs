require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const count = await db.collection('customerdeliveryfeedbacks').countDocuments();
  console.log(`Feedbacks: ${count}`);
  process.exit(0);
}
main().catch(console.error);
