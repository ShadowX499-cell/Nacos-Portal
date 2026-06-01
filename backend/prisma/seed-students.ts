/**
 * Seed 300 student accounts:
 *   3 programs (CSC, ICT, CRE) × 4 levels (L100–L400) × 25 students = 300
 * Status is set directly to `validated` (bypasses activation email flow).
 * Prints a credentials table at the end.
 */
import 'dotenv/config';
import { PrismaClient, Program, Level, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Nigerian name pools ──────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Emeka', 'Chidi', 'Ngozi', 'Amaka', 'Kelechi', 'Chisom', 'Obinna', 'Adaeze',
  'Ifeanyi', 'Uchenna', 'Nkechi', 'Chukwuemeka', 'Obiora', 'Ifeoma', 'Chidera',
  'Blessing', 'Precious', 'Peace', 'Faith', 'Grace', 'Emmanuel', 'Samuel',
  'Daniel', 'Michael', 'David', 'Joseph', 'John', 'James', 'Peter', 'Paul',
  'Mary', 'Ruth', 'Esther', 'Deborah', 'Sarah', 'Rachel', 'Hannah', 'Naomi',
  'Taiwo', 'Kehinde', 'Adebayo', 'Oluwaseun', 'Segun', 'Tunde', 'Bisi', 'Yemi',
  'Femi', 'Sola', 'Kunle', 'Wale', 'Lola', 'Funmi', 'Toyin', 'Bola', 'Kemi',
  'Aminu', 'Suleiman', 'Ibrahim', 'Musa', 'Aisha', 'Fatima', 'Hafsat', 'Zainab',
];

const LAST_NAMES = [
  'Okonkwo', 'Adeyemi', 'Usman', 'Nwosu', 'Eze', 'Obi', 'Chukwu', 'Aneke',
  'Okafor', 'Nnamdi', 'Igwe', 'Onwudiwe', 'Okeke', 'Nnaji', 'Ibeh', 'Odum',
  'Egwuatu', 'Agbo', 'Mba', 'Ogbu', 'Odo', 'Eneh', 'Onoh', 'Ezeh', 'Nweze',
  'Adebisi', 'Afolabi', 'Oduola', 'Omotosho', 'Akinwale', 'Olatunji', 'Fashola',
  'Babatunde', 'Oluwole', 'Adesanya', 'Ogundimu', 'Akintola', 'Lawal', 'Bello',
  'Mohammed', 'Hassan', 'Abdullahi', 'Garba', 'Aliyu', 'Salisu', 'Danjuma',
  'Yakubu', 'Abubakar', 'Shehu', 'Tanimu', 'Dangana', 'Abdulkadir', 'Haruna',
];

function pickName(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last  = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
}

// ── Password strategy: Nacos@<5-digit-suffix-from-userId> ──────────────────

function passwordFromUserId(userId: string): string {
  const suffix = userId.split('/').pop() ?? '00001';
  return `Nacos@${suffix}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding 300 student accounts...\n');

  // Get department
  const dept = await prisma.department.findFirst({ where: { isActive: true } });
  if (!dept) throw new Error('No active department found. Run the base seed first.');

  // Get an admin to use as createdById
  const admin = await prisma.user.findFirst({
    where: { role: { in: [UserRole.admin, UserRole.super_admin] } },
  });
  if (!admin) throw new Error('No admin user found. Run the base seed first.');

  const programs: Program[] = [Program.CSC, Program.ICT, Program.CRE];
  const levels: Level[]     = [Level.L100, Level.L200, Level.L300, Level.L400];
  const year = 2026;

  const credentials: { userId: string; name: string; program: string; level: string; password: string }[] = [];
  let globalIndex = 0;

  for (const program of programs) {
    for (const level of levels) {
      for (let i = 0; i < 25; i++) {
        const name  = pickName(globalIndex);
        const slug  = `${program.toLowerCase()}${level.replace('L', '').toLowerCase()}${String(i + 1).padStart(2, '0')}`;
        const email = `${slug}.${year}@nacos-aifue.edu.ng`;

        // Skip if email already exists (re-run safety)
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          credentials.push({
            userId: existing.userId,
            name: existing.name,
            program,
            level,
            password: passwordFromUserId(existing.userId),
          });
          globalIndex++;
          continue;
        }

        // Generate unique user ID
        let userId = '';
        for (let attempt = 0; attempt < 10; attempt++) {
          const suffix = String(Math.floor(Math.random() * 90000) + 10000);
          const candidate = `NACOS/${program}/${year}/${suffix}`;
          const taken = await prisma.user.findUnique({ where: { userId: candidate } });
          if (!taken) { userId = candidate; break; }
        }
        if (!userId) throw new Error(`Could not generate unique ID for ${program} ${level} #${i + 1}`);

        const password     = passwordFromUserId(userId);
        const passwordHash = await bcrypt.hash(password, 10);

        await prisma.user.create({
          data: {
            userId,
            departmentId: dept.id,
            name,
            email,
            program,
            level,
            role:   UserRole.student,
            status: UserStatus.validated,
            passwordHash,
            createdById: admin.id,
          },
        });

        credentials.push({ userId, name, program, level, password });
        globalIndex++;
      }
    }
  }

  // ── Print credentials table ───────────────────────────────────────────────
  console.log('\n' + '='.repeat(90));
  console.log(
    ' STUDENT CREDENTIALS'.padEnd(90)
  );
  console.log('='.repeat(90));
  console.log(
    ' User ID'.padEnd(28) +
    ' Name'.padEnd(28) +
    ' Program'.padEnd(10) +
    ' Level'.padEnd(8) +
    ' Password'
  );
  console.log('-'.repeat(90));

  for (const c of credentials) {
    console.log(
      (' ' + c.userId).padEnd(28) +
      (' ' + c.name).padEnd(28) +
      (' ' + c.program).padEnd(10) +
      (' ' + c.level).padEnd(8) +
      ' ' + c.password
    );
  }

  console.log('='.repeat(90));
  console.log(`\n✅ ${credentials.length} students created/verified.`);
  console.log(`   Dept: ${dept.name} | Year: ${year}`);
  console.log(`   Password format: Nacos@<5-digit-ID-suffix>\n`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
