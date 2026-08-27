import mongoose from "mongoose";

async function run() {
  await mongoose.connect("mongodb+srv://bellarinseth_db_user:oEQ3O4OUEOMcY6vH@cluster0.1stof9q.mongodb.net/test?retryWrites=true&w=majority");
  console.log("Connected to MongoDB.");
  
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  const stats = [];
  for (const col of collections) {
    const stat = await db.command({ collStats: col.name });
    stats.push({
      name: col.name,
      sizeMB: (stat.size / 1024 / 1024).toFixed(2),
      count: stat.count
    });
  }
  
  stats.sort((a, b) => parseFloat(b.sizeMB) - parseFloat(a.sizeMB));
  console.table(stats.slice(0, 15));
  process.exit(0);
}
run().catch(console.error);
