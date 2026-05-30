/**
 * One-time script to designate an existing admin as Head of Department (HOD).
 *
 * Usage:
 *   npx ts-node prisma/seed-hod.ts --email admin@dept.edu
 */
import { PrismaClient, UserRole, SuperAdminType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const emailArg = process.argv.find((a) => a.startsWith('--email='))?.split('=')[1]
    ?? process.argv[process.argv.indexOf('--email') + 1];

  if (!emailArg) {
    console.error('Usage: npx ts-node prisma/seed-hod.ts --email <admin-email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: emailArg } });
  if (!user) {
    console.error(`No user found with email: ${emailArg}`);
    process.exit(1);
  }

  if (user.role === UserRole.student) {
    console.error('Cannot assign HOD role to a student account');
    process.exit(1);
  }

  await prisma.user.update({
    where: { email: emailArg },
    data: { role: UserRole.super_admin, superAdminType: SuperAdminType.hod },
  });

  console.log(`✅ ${user.name} (${emailArg}) is now HOD (super_admin / hod)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
