import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { gradebookApi, extractApiError } from '../../api/client';
import type { Gradebook, Course, Grade } from '../../types';

interface StudentRow {
  userId: string;
  name: string;
  program: string;
  level: string;
  grades: Record<string, { ca: number | null; exam: number | null; total: number | null; grade: string | null }>;
  gpa: number | null;
}

function computeGradePoint(total: number): number {
  if (total >= 70) return 5.0;
  if (total >= 60) return 4.0;
  if (total >= 50) return 3.0;
  if (total >= 45) return 2.0;
  if (total >= 40) return 1.0;
  return 0.0;
}

export default function GradebookPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [gradebook, setGradebook] = useState<(Gradebook & { courses: Course[] }) | null>(null);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) return;
    gradebookApi.get(id)
      .then(async (gbRes) => {
        const gb = gbRes.data.data;
        setGradebook(gb);
        // Fetch grades for every course in parallel
        const gradesByCoure = await Promise.all(
          gb.courses.map((c) => gradebookApi.getGrades(id, c.id).then((r) => r.data.data))
        );
        setAllGrades(gradesByCoure.flat());
        setReady(true);
      })
      .catch((err) => setError(extractApiError(err)));
  }, [id]);

  useEffect(() => {
    if (ready) {
      // Small delay so the DOM paints before print dialog opens
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!gradebook || !ready) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-green-700 animate-spin mx-auto mb-3" />
        Preparing result sheet…
      </div>
    );
  }

  // Build student rows
  const courses = gradebook.courses;
  const studentMap = new Map<string, StudentRow>();

  for (const g of allGrades) {
    if (!studentMap.has(g.userId)) {
      studentMap.set(g.userId, {
        userId: g.studentUserId,
        name: g.studentName,
        program: '',
        level: '',
        grades: {},
        gpa: null,
      });
    }
    studentMap.get(g.userId)!.grades[g.courseId] = {
      ca: g.caScore,
      exam: g.examScore,
      total: g.total,
      grade: g.grade,
    };
  }

  // Compute GPA per student
  const rows = Array.from(studentMap.values()).map((s) => {
    let totalPoints = 0;
    let totalUnits = 0;
    for (const c of courses) {
      const g = s.grades[c.id];
      if (g?.total !== null && g?.total !== undefined) {
        totalPoints += computeGradePoint(g.total) * c.creditUnits;
        totalUnits  += c.creditUnits;
      }
    }
    return { ...s, gpa: totalUnits > 0 ? totalPoints / totalUnits : null };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const printDate = new Date().toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 10px; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
        body { font-family: Arial, sans-serif; background: white; color: #111; }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Preview — click <strong>Print / Save as PDF</strong> to download
        </span>
        <button
          onClick={() => window.print()}
          className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800"
        >
          🖨 Print / Save as PDF
        </button>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        {/* Letterhead */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wide">NACOS-AIFUE</h1>
          <p className="text-sm font-semibold">Department of Computer Science</p>
          <p className="text-sm text-gray-600">Aifue University</p>
          <div className="border-t-2 border-b-2 border-gray-800 my-3 py-2">
            <h2 className="text-base font-bold uppercase">{gradebook.name}</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {gradebook.level.replace('L', '')} Level &bull; {gradebook.session} &bull; {gradebook.semester.charAt(0).toUpperCase() + gradebook.semester.slice(1)} Semester
            </p>
          </div>
          <p className="text-xs text-gray-500">Printed: {printDate} &bull; {rows.length} students</p>
        </div>

        {/* Results table */}
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ background: '#166534', color: 'white' }}>
                <th style={th}>#</th>
                <th style={{ ...th, textAlign: 'left', minWidth: 130 }}>Student ID</th>
                <th style={{ ...th, textAlign: 'left', minWidth: 160 }}>Name</th>
                {courses.map((c) => (
                  <th key={c.id} style={{ ...th, minWidth: 80 }} colSpan={3}>
                    {c.courseCode}<br />
                    <span style={{ fontWeight: 400, fontSize: 8 }}>{c.creditUnits} units</span>
                  </th>
                ))}
                <th style={th}>GPA</th>
              </tr>
              <tr style={{ background: '#14532d', color: '#d1fae5', fontSize: 8 }}>
                <th style={th} />
                <th style={th} />
                <th style={th} />
                {courses.map((c) => (
                  <>
                    <th key={`${c.id}-ca`}   style={th}>CA</th>
                    <th key={`${c.id}-ex`}   style={th}>Exam</th>
                    <th key={`${c.id}-gr`}   style={th}>Grade</th>
                  </>
                ))}
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.userId} style={{ background: i % 2 === 0 ? 'white' : '#f0fdf4' }}>
                  <td style={{ ...td, textAlign: 'center', color: '#6b7280' }}>{i + 1}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 9 }}>{row.userId}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{row.name}</td>
                  {courses.map((c) => {
                    const g = row.grades[c.id];
                    const gradeColor = g?.grade === 'F' ? '#dc2626' : g?.grade === 'A' ? '#16a34a' : '#111';
                    return (
                      <>
                        <td key={`${c.id}-ca`}   style={{ ...td, textAlign: 'center' }}>{g?.ca    ?? '—'}</td>
                        <td key={`${c.id}-ex`}   style={{ ...td, textAlign: 'center' }}>{g?.exam  ?? '—'}</td>
                        <td key={`${c.id}-gr`}   style={{ ...td, textAlign: 'center', fontWeight: 700, color: gradeColor }}>{g?.grade ?? '—'}</td>
                      </>
                    );
                  })}
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>
                    {row.gpa !== null ? row.gpa.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 grid grid-cols-3 gap-8 text-xs text-gray-600">
          <div>
            <p className="font-semibold mb-6">Prepared by:</p>
            <div className="border-b border-gray-400 w-40 mb-1" />
            <p>Examinations Officer</p>
          </div>
          <div>
            <p className="font-semibold mb-6">Verified by:</p>
            <div className="border-b border-gray-400 w-40 mb-1" />
            <p>Head of Department</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">NACOS-AIFUE Portal</p>
            <p className="text-gray-400">Official Result Sheet</p>
            <p className="mt-2">Date: {printDate}</p>
          </div>
        </div>
      </div>
    </>
  );
}

const th: React.CSSProperties = {
  padding: '6px 4px',
  border: '1px solid #166534',
  textAlign: 'center',
  fontWeight: 700,
};

const td: React.CSSProperties = {
  padding: '4px',
  border: '1px solid #d1d5db',
  fontSize: '10px',
};
