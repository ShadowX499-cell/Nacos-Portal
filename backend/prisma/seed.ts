import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus, Program, Level } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create the Computer Science department
  const dept = await prisma.department.upsert({
    where: { code: 'CSC' },
    update: {},
    create: {
      name: 'Computer Science',
      code: 'CSC',
      faculty: 'Faculty of Science and Technology',
      isActive: true,
    },
  });
  console.log(`✅ Department: ${dept.name} (${dept.code})`);

  // 2. Create super admin account
  const passwordHash = await bcrypt.hash('Admin@12345', 12);

  const admin = await prisma.user.upsert({
    where: { userId: 'NACOS/ADMIN/2024/001' },
    update: {},
    create: {
      userId: 'NACOS/ADMIN/2024/001',
      departmentId: dept.id,
      name: 'System Administrator',
      email: 'admin@nacos-aifue.edu.ng',
      phone: '+2348000000000',
      program: Program.CSC,
      level: Level.L400,
      role: UserRole.super_admin,
      passwordHash,
      status: UserStatus.validated,
    },
  });
  console.log(`✅ Super admin: ${admin.email} (password: Admin@12345)`);

  console.log('\n✨ Seed complete!');
  console.log('   Super Admin login:');
  console.log(`   User ID : ${admin.userId}`);
  console.log(`   Password: Admin@12345`);
  console.log('   ⚠️  Change this password immediately after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
