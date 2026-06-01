/**
 * Generates one PDF per level from published/draft gradebooks.
 * Output: docs/results-<level>-<session>-<semester>.pdf
 * Run: cd backend && npx ts-node prisma/export-results-pdf.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GREEN   = '#166534';
const LGREEN  = '#dcfce7';
const GRAY    = '#6b7280';
const BLACK   = '#111827';
const WHITE   = '#ffffff';
const ROW_ALT = '#f0fdf4';
const RED     = '#dc2626';

function gradeColor(grade: string | null) {
  if (!grade) return GRAY;
  if (grade === 'A') return GREEN;
  if (grade === 'F') return RED;
  return BLACK;
}

function computeGradePoint(total: number): number {
  if (total >= 70) return 5.0;
  if (total >= 60) return 4.0;
  if (total >= 50) return 3.0;
  if (total >= 45) return 2.0;
  if (total >= 40) return 1.0;
  return 0.0;
}

async function exportGradebook(gradebookId: string) {
  const gb = await prisma.gradebook.findUnique({
    where: { id: gradebookId },
    include: { courses: { orderBy: { createdAt: 'asc' } } },
  });
  if (!gb) return;

  const grades = await prisma.studentGrade.findMany({
    where: { course: { gradebookId } },
    include: { student: true, course: true },
    orderBy: { student: { name: 'asc' } },
  });

  // Build student map
  type StudentRow = {
    userId: string; name: string; program: string; level: string;
    courses: Record<string, { ca: number|null; exam: number|null; total: number|null; grade: string|null }>;
    gpa: number|null;
  };

  const studentMap = new Map<string, StudentRow>();
  for (const g of grades) {
    if (!studentMap.has(g.userId)) {
      studentMap.set(g.userId, {
        userId:  g.student.userId,
        name:    g.student.name,
        program: g.student.program,
        level:   g.student.level,
        courses: {},
        gpa:     null,
      });
    }
    studentMap.get(g.userId)!.courses[g.courseId] = {
      ca:    g.caScore    ? Number(g.caScore)    : null,
      exam:  g.examScore  ? Number(g.examScore)  : null,
      total: g.total      ? Number(g.total)      : null,
      grade: g.grade,
    };
  }

  const rows: StudentRow[] = Array.from(studentMap.values()).map((s) => {
    let pts = 0, units = 0;
    for (const c of gb.courses) {
      const g = s.courses[c.id];
      if (g?.total !== null && g?.total !== undefined) {
        pts   += computeGradePoint(g.total) * c.creditUnits;
        units += c.creditUnits;
      }
    }
    return { ...s, gpa: units > 0 ? pts / units : null };
  });

  if (rows.length === 0) {
    console.log(`  ⚠  No grades entered yet for: ${gb.name}`);
    return;
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  // Dynamic column widths based on number of courses
  const courses = gb.courses;
  const MARGIN  = 30;
  const PAGE_W_USABLE = 841 - MARGIN * 2; // A4 landscape ≈ 841pt wide

  const FIXED_W = 28 + 130 + 45 + 40; // #, name, program, GPA
  const courseW = Math.max(50, Math.floor((PAGE_W_USABLE - FIXED_W) / courses.length));
  const ROW_H   = 16;

  const COL_NO   = MARGIN;
  const COL_NAME = COL_NO + 28;
  const COL_PROG = COL_NAME + 130;
  const COL_GPA  = COL_PROG + 45;
  const COL_COURSES_START = COL_GPA + 40;

  const outDir  = path.join(__dirname, '../../docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const safeLevel = gb.level.replace('/', '-');
  const safeSess  = gb.session.replace('/', '-');
  const outPath   = path.join(outDir, `results-${safeLevel}-${safeSess}-${gb.semester}.pdf`);

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: MARGIN });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  let pageNum = 0;

  const printHeader = () => {
    pageNum++;
    // Green letterhead
    doc.rect(0, 0, doc.page.width, 55).fill(GREEN);
    doc.fillColor(WHITE).fontSize(13).font('Helvetica-Bold')
      .text('NACOS-AIFUE — Department of Computer Science', MARGIN, 8, { lineBreak: false });
    doc.fontSize(9).font('Helvetica')
      .text(gb.name, MARGIN, 24, { lineBreak: false });
    doc.fontSize(7.5)
      .text(
        `${gb.level.replace('L','')} Level  ·  ${gb.session}  ·  ${gb.semester.charAt(0).toUpperCase() + gb.semester.slice(1)} Semester  ·  Status: ${gb.status.toUpperCase()}  ·  ${rows.length} students`,
        MARGIN, 38, { lineBreak: false }
      );
    doc.fillColor('#a7f3d0').fontSize(7)
      .text(`Page ${pageNum}  ·  Generated ${new Date().toLocaleDateString('en-NG')}`,
        doc.page.width - 120, 20, { lineBreak: false });
  };

  const printColHeaders = (y: number) => {
    doc.rect(MARGIN, y, PAGE_W_USABLE, ROW_H).fill(GREEN);
    doc.fillColor(WHITE).fontSize(6).font('Helvetica-Bold');
    doc.text('#',       COL_NO   + 2, y + 4, { width: 26, lineBreak: false });
    doc.text('Name',    COL_NAME + 2, y + 4, { width: 128, lineBreak: false });
    doc.text('Prog',    COL_PROG + 2, y + 4, { width: 43, lineBreak: false });
    for (let ci = 0; ci < courses.length; ci++) {
      const cx = COL_COURSES_START + ci * courseW;
      doc.text(courses[ci].courseCode, cx + 2, y + 4, { width: courseW - 4, lineBreak: false });
    }
    doc.text('GPA', COL_GPA + 2, y + 4, { width: 38, lineBreak: false });
    return y + ROW_H;
  };

  const printSubHeader = (y: number) => {
    doc.rect(MARGIN, y, PAGE_W_USABLE, 12).fill('#14532d');
    doc.fillColor('#a7f3d0').fontSize(5.5).font('Helvetica');
    doc.text('',       COL_NO   + 2, y + 2, { width: 26, lineBreak: false });
    doc.text('',       COL_NAME + 2, y + 2, { width: 128, lineBreak: false });
    doc.text('',       COL_PROG + 2, y + 2, { width: 43, lineBreak: false });
    for (let ci = 0; ci < courses.length; ci++) {
      const cx = COL_COURSES_START + ci * courseW;
      doc.text('CA / Exam / Grade', cx + 2, y + 2, { width: courseW - 4, lineBreak: false });
    }
    doc.text('',       COL_GPA + 2, y + 2, { width: 38, lineBreak: false });
    return y + 12;
  };

  printHeader();
  let y = 62;
  y = printColHeaders(y);
  y = printSubHeader(y);

  const BOTTOM = doc.page.height - 35;

  for (let ri = 0; ri < rows.length; ri++) {
    if (y + ROW_H > BOTTOM) {
      // Footer on current page
      doc.rect(MARGIN, doc.page.height - 25, PAGE_W_USABLE, 20).fill(LGREEN);
      doc.fillColor(GREEN).fontSize(6).font('Helvetica')
        .text('CONFIDENTIAL — NACOS-AIFUE Official Result Sheet', MARGIN + 4, doc.page.height - 18, { lineBreak: false });
      doc.addPage();
      printHeader();
      y = 62;
      y = printColHeaders(y);
      y = printSubHeader(y);
    }

    const row = rows[ri];
    const bg  = ri % 2 === 0 ? WHITE : ROW_ALT;
    doc.rect(MARGIN, y, PAGE_W_USABLE, ROW_H).fill(bg);

    doc.fillColor(GRAY).fontSize(6).font('Helvetica');
    doc.text(String(ri + 1), COL_NO + 2, y + 4, { width: 26, lineBreak: false });

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(6.5);
    doc.text(row.name, COL_NAME + 2, y + 4, { width: 128, lineBreak: false });

    doc.fillColor(GRAY).font('Helvetica').fontSize(6);
    doc.text(row.program, COL_PROG + 2, y + 4, { width: 43, lineBreak: false });

    for (let ci = 0; ci < courses.length; ci++) {
      const cx  = COL_COURSES_START + ci * courseW;
      const g   = row.courses[courses[ci].id];
      const ca  = g?.ca    !== null && g?.ca    !== undefined ? String(g.ca)    : '—';
      const ex  = g?.exam  !== null && g?.exam  !== undefined ? String(g.exam)  : '—';
      const gr  = g?.grade ?? '—';
      const colW = Math.floor((courseW - 4) / 3);

      doc.fillColor(GRAY).font('Helvetica').fontSize(6);
      doc.text(ca, cx + 2,          y + 4, { width: colW, lineBreak: false });
      doc.text(ex, cx + 2 + colW,   y + 4, { width: colW, lineBreak: false });
      doc.fillColor(gradeColor(gr)).font('Helvetica-Bold');
      doc.text(gr, cx + 2 + colW*2, y + 4, { width: colW, lineBreak: false });
    }

    const gpaStr = row.gpa !== null ? row.gpa.toFixed(2) : '—';
    const gpaCol = row.gpa !== null && row.gpa >= 4.5 ? GREEN
                 : row.gpa !== null && row.gpa >= 3.0 ? BLACK : RED;
    doc.fillColor(gpaCol).font('Helvetica-Bold').fontSize(6.5);
    doc.text(gpaStr, COL_GPA + 2, y + 4, { width: 38, lineBreak: false });

    y += ROW_H;
  }

  // Final page footer
  y += 8;
  doc.rect(MARGIN, y, PAGE_W_USABLE, 24).fill(LGREEN);
  doc.fillColor(GREEN).fontSize(7).font('Helvetica-Bold')
    .text('CONFIDENTIAL — NACOS-AIFUE Official Result Sheet', MARGIN + 6, y + 4, { lineBreak: false });
  doc.fillColor(GRAY).fontSize(6.5).font('Helvetica')
    .text(`Total students: ${rows.length}  ·  Courses: ${courses.map(c => c.courseCode).join(', ')}`,
      MARGIN + 6, y + 14, { lineBreak: false });

  // Signature section
  y += 36;
  if (y + 50 > doc.page.height - 10) { doc.addPage(); printHeader(); y = 62; }
  const sigW = 160;
  const sigY = y + 30;
  const sigs = [
    { label: 'Prepared by', title: 'Examinations Officer', x: MARGIN },
    { label: 'Verified by',  title: 'Head of Department',   x: MARGIN + sigW + 30 },
    { label: 'Approved by',  title: 'Dean of Faculty',      x: MARGIN + (sigW + 30) * 2 },
  ];
  for (const sig of sigs) {
    doc.moveTo(sig.x, sigY).lineTo(sig.x + sigW, sigY).strokeColor('#9ca3af').stroke();
    doc.fillColor(BLACK).fontSize(7).font('Helvetica-Bold').text(sig.label, sig.x, sigY + 3, { lineBreak: false });
    doc.fillColor(GRAY).fontSize(6.5).font('Helvetica').text(sig.title,  sig.x, sigY + 12, { lineBreak: false });
    doc.text(`Date: _______________`, sig.x, sigY + 22, { lineBreak: false });
  }

  doc.end();
  await new Promise<void>((res, rej) => { stream.on('finish', res); stream.on('error', rej); });
  console.log(`  ✅ ${path.basename(outPath)}  (${rows.length} students, ${courses.length} courses)`);
}

async function main() {
  const gradebooks = await prisma.gradebook.findMany({
    select: { id: true, name: true, level: true, session: true, semester: true, status: true },
    orderBy: [{ level: 'asc' }, { session: 'asc' }, { semester: 'asc' }],
  });

  if (gradebooks.length === 0) {
    console.log('No gradebooks found. Create gradebooks and enter grades first.');
    return;
  }

  console.log(`\n📄 Exporting ${gradebooks.length} gradebook(s) to PDF...\n`);
  for (const gb of gradebooks) {
    process.stdout.write(`  → ${gb.name}  `);
    await exportGradebook(gb.id);
  }
  console.log(`\n✅ All PDFs written to docs/`);
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
