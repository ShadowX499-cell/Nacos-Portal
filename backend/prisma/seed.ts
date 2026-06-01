import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus, Program, Level, GradebookStatus, Semester } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. Department ────────────────────────────────────────────────────────────
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

  // ── 2. Super Admin ───────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@12345', 12);
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
      passwordHash: adminHash,
      status: UserStatus.validated,
    },
  });
  console.log(`✅ Super admin: ${admin.email} (password: Admin@12345)`);

  // ── 3. HOD + Examinations Officer ───────────────────────────────────────────
  const hodHash  = await bcrypt.hash('Hod@Nacos2026', 12);
  const examHash = await bcrypt.hash('Exams@Nacos2026', 12);

  const hod = await prisma.user.upsert({
    where: { userId: 'NACOS/ADMIN/2024/002' },
    update: {},
    create: {
      userId: 'NACOS/ADMIN/2024/002',
      departmentId: dept.id,
      name: 'Head of Department',
      email: 'hod@nacos-aifue.edu.ng',
      program: Program.CSC,
      level: Level.L400,
      role: UserRole.super_admin,
      superAdminType: 'hod',
      passwordHash: hodHash,
      status: UserStatus.validated,
      createdById: admin.id,
    },
  });
  console.log(`✅ HOD: ${hod.email} (password: Hod@Nacos2026)`);

  const examOfficer = await prisma.user.upsert({
    where: { userId: 'NACOS/ADMIN/2024/003' },
    update: {},
    create: {
      userId: 'NACOS/ADMIN/2024/003',
      departmentId: dept.id,
      name: 'Examinations Officer',
      email: 'examofficer@nacos-aifue.edu.ng',
      program: Program.CSC,
      level: Level.L400,
      role: UserRole.super_admin,
      superAdminType: 'result_exam_officer',
      passwordHash: examHash,
      status: UserStatus.validated,
      createdById: admin.id,
    },
  });
  console.log(`✅ Examinations Officer: ${examOfficer.email} (password: Exams@Nacos2026)`);

  // ── 4. Test Student ──────────────────────────────────────────────────────────
  const studentHash = await bcrypt.hash('Student@12345', 12);
  const student = await prisma.user.upsert({
    where: { userId: 'NACOS/CSC/2024/001' },
    update: {},
    create: {
      userId: 'NACOS/CSC/2024/001',
      departmentId: dept.id,
      name: 'John Adebayo Okonkwo',
      email: 'student@nacos-aifue.edu.ng',
      phone: '+2348012345678',
      program: Program.CSC,
      level: Level.L100,
      role: UserRole.student,
      passwordHash: studentHash,
      status: UserStatus.validated,
      createdById: admin.id,
    },
  });
  console.log(`✅ Test student: ${student.email} (password: Student@12345)`);

  // ── 4. Published Gradebook ───────────────────────────────────────────────────
  const gradebook = await prisma.gradebook.upsert({
    where: {
      // No unique constraint — use findFirst + create pattern
      id: 'seed-gradebook-l100-2024',
    },
    update: {},
    create: {
      id: 'seed-gradebook-l100-2024',
      departmentId: dept.id,
      name: '100 Level 2024/2025 First Semester Result',
      level: Level.L100,
      session: '2024/2025',
      semester: Semester.first,
      status: GradebookStatus.published,
      publishedAt: new Date('2025-02-15T10:00:00Z'),
      publishedById: admin.id,
      createdById: admin.id,
    },
  });
  console.log(`✅ Gradebook: ${gradebook.name}`);

  // ── 5. Courses ───────────────────────────────────────────────────────────────
  const courseData = [
    { id: 'seed-csc101', code: 'CSC101', title: 'Introduction to Computer Science', credits: 3 },
    { id: 'seed-csc103', code: 'CSC103', title: 'Computer Programming I', credits: 3 },
    { id: 'seed-mth101', code: 'MTH101', title: 'Elementary Mathematics I', credits: 3 },
    { id: 'seed-phy101', code: 'PHY101', title: 'General Physics I', credits: 3 },
    { id: 'seed-eng101', code: 'ENG101', title: 'Use of English I', credits: 2 },
  ];

  for (const c of courseData) {
    await prisma.course.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        gradebookId: gradebook.id,
        courseCode: c.code,
        courseTitle: c.title,
        level: Level.L100,
        creditUnits: c.credits,
      },
    });
  }
  console.log(`✅ Courses: ${courseData.length} courses created`);

  // ── 6. Student Grades ────────────────────────────────────────────────────────
  const gradeEntries = [
    { courseId: 'seed-csc101', ca: 28, exam: 55, total: 83, grade: 'A', gp: 5.0 },
    { courseId: 'seed-csc103', ca: 25, exam: 48, total: 73, grade: 'A', gp: 5.0 },
    { courseId: 'seed-mth101', ca: 22, exam: 42, total: 64, grade: 'B', gp: 4.0 },
    { courseId: 'seed-phy101', ca: 20, exam: 38, total: 58, grade: 'C', gp: 3.0 },
    { courseId: 'seed-eng101', ca: 26, exam: 50, total: 76, grade: 'A', gp: 5.0 },
  ];

  for (const g of gradeEntries) {
    await prisma.studentGrade.upsert({
      where: { courseId_userId: { courseId: g.courseId, userId: student.id } },
      update: {},
      create: {
        courseId: g.courseId,
        userId: student.id,
        caScore: g.ca,
        examScore: g.exam,
        total: g.total,
        grade: g.grade,
        gradePoint: g.gp,
        uploadMethod: 'manual',
        enteredById: admin.id,
      },
    });
  }
  console.log(`✅ Grades: entered for test student`);

  // ── 7. Result Snapshot ───────────────────────────────────────────────────────
  const snapshotJson = {
    gradebookId: gradebook.id,
    gradebookName: gradebook.name,
    level: '100',
    session: '2024/2025',
    semester: 'first',
    publishedAt: '2025-02-15T10:00:00.000Z',
    courses: courseData.map((c) => ({
      courseId: c.id,
      courseCode: c.code,
      courseTitle: c.title,
      creditUnits: c.credits,
    })),
    grades: {
      [student.id]: Object.fromEntries(
        gradeEntries.map((g) => [
          g.courseId,
          { caScore: g.ca, examScore: g.exam, total: g.total, grade: g.grade, gradePoint: g.gp },
        ])
      ),
    },
    students: {
      [student.id]: { userId: student.userId, name: student.name },
    },
  };

  const checksum = crypto.createHash('sha256').update(JSON.stringify(snapshotJson)).digest('hex');

  await prisma.resultSnapshot.upsert({
    where: { id: 'seed-snapshot-l100-2024' },
    update: {},
    create: {
      id: 'seed-snapshot-l100-2024',
      gradebookId: gradebook.id,
      snapshotJson,
      checksum,
      publishedById: admin.id,
      publishedAt: new Date('2025-02-15T10:00:00Z'),
    },
  });
  console.log(`✅ Result snapshot created`);

  console.log('\n✨ Seed complete!');
  console.log('   Super Admin:');
  console.log(`   User ID : ${admin.userId}  |  Password: Admin@12345`);
  console.log('   Test Student:');
  console.log(`   User ID : ${student.userId}  |  Password: Student@12345`);
  console.log('   ⚠️  Change passwords immediately after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
