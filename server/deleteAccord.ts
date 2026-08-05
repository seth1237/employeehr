import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { Company } from './src/models/Company';
import { User } from './src/models/User';

const MONGODB_URI = 'mongodb+srv://bellarinseth_db_user:oEQ3O4OUEOMcY6vH@cluster0.1stof9q.mongodb.net/employeehr_db';
const ACCORD_MYSQL_ID = '69f9cf05a3122769268f9205';
const OWNER_EMAIL = 'bellarinseth@gmail.com';
const ACCORD_EMAIL = 'accord@gmail.com';

const prisma = new PrismaClient();

async function run() {
  try {
    // ========== DELETE FROM MYSQL ==========
    console.log('\n📝 Deleting Accord from MySQL...');
    
    // Delete employees for Accord (users associated with the company)
    const userDeleteResult = await prisma.$executeRawUnsafe(
      `DELETE FROM User WHERE id LIKE CONCAT(?, '%')`,
      ACCORD_MYSQL_ID
    );
    console.log(`  ✅ Deleted ${userDeleteResult} employees`);

    // Delete company
    const companyDeleteResult = await prisma.$executeRawUnsafe(
      `DELETE FROM Company WHERE id = ?`,
      ACCORD_MYSQL_ID
    );
    console.log('  ✅ Deleted Accord company from MySQL');

    // Verify deletion
    const remaining = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM Company WHERE id = ?`,
      ACCORD_MYSQL_ID
    );
    console.log(`  ✅ Verification: ${remaining[0].count} records remain (should be 0)`);

    // ========== CONNECT TO MONGODB ==========
    console.log('\n📝 Connecting to MongoDB and unfreezing owner...');
    await mongoose.connect(MONGODB_URI);

    // Unfreeze owner
    const ownerCompany = await Company.findOne({ email: OWNER_EMAIL });
    if (ownerCompany) {
      ownerCompany.isFrozen = false;
      ownerCompany.frozenReason = null;
      await ownerCompany.save();
      console.log(`  ✅ Unfroze owner: ${OWNER_EMAIL}`);
    } else {
      console.log(`  ⚠️ Owner ${OWNER_EMAIL} not found in MongoDB`);
    }

    console.log('\n✅ ✅ ✅ All done!');
    console.log('   - Accord (accord@gmail.com) completely deleted from MySQL');
    console.log(`   - Owner (${OWNER_EMAIL}) unfrozen in MongoDB`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    await prisma.$disconnect();
  }
}

run();
