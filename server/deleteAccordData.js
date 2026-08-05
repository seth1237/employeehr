import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

const MONGODB_URI = 'mongodb+srv://bellarinseth_db_user:oEQ3O4OUEOMcY6vH@cluster0.1stof9q.mongodb.net/employeehr_db';
const OWNER_EMAIL = 'bellarinseth@gmail.com';
const TARGET_EMAIL = 'accord@gmail.com';

const prisma = new PrismaClient();

async function run() {
  try {
    console.log('🔍 Connecting to MongoDB to find Accord company...');
    await mongoose.connect(MONGODB_URI);

    // Import models after connecting
    const { Company } = await import('./src/models/Company.ts');
    const { User } = await import('./src/models/User.ts');

    // Find Accord company
    const accordCompany = await Company.findOne({ email: TARGET_EMAIL });
    if (!accordCompany) {
      console.log('❌ Accord company not found');
      process.exit(1);
    }
    
    const accordCompanyId = String(accordCompany._id);
    console.log(`✅ Found Accord: ${accordCompany.name} (ID: ${accordCompanyId})`);

    // Delete from MongoDB
    console.log('\n📝 Deleting from MongoDB...');
    
    // Delete all users for this company
    const userResult = await User.deleteMany({ company: accordCompany._id });
    console.log(`  - Deleted ${userResult.deletedCount} users`);

    // Delete the company
    const companyResult = await Company.deleteOne({ _id: accordCompany._id });
    console.log(`  - Deleted company document`);

    // Delete from MySQL (Prisma)
    console.log('\n📝 Deleting from MySQL...');
    
    // Delete employees for this company
    const employeeDeleteResult = await prisma.employees.deleteMany({
      where: { companyId: accordCompanyId }
    });
    console.log(`  - Deleted ${employeeDeleteResult.count} employees`);

    // Delete company record
    const companyDeleteResult = await prisma.companies.deleteMany({
      where: { companyId: accordCompanyId }
    });
    console.log(`  - Deleted company record(s)`);

    // Unfreeze owner
    console.log('\n🔓 Unfreezing owner account...');
    const ownerCompany = await Company.findOne({ email: OWNER_EMAIL });
    if (ownerCompany) {
      ownerCompany.isFrozen = false;
      ownerCompany.frozenReason = null;
      await ownerCompany.save();
      console.log(`  - ✅ ${OWNER_EMAIL} is now unfrozen`);
    } else {
      console.log(`  - ⚠️ Owner ${OWNER_EMAIL} not found in MongoDB`);
    }

    console.log('\n✅ All done! Accord data completely deleted and owner unfrozen.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
