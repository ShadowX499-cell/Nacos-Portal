import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { gradebookApi, extractApiError } from '../../api/client';
import type { Gradebook, Course, Grade } from '../../types';

interface StudentRow {
  userId: string;
  name: string;
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

function gradeClass(grade: string | null) {
  if (grade === 'A') return 'text-green-700 font-bold';
  if (grade === 'F') return 'text-red-600 font-bold';
  return 'font-semibold text-gray-800';
}

export default function GradebookPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const printMode = searchParams.get('print') === '1';

  const [gradebook, setGradebook] = useState<(Gradebook & { courses: Course[] }) | null>(null);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState('');
  const [publishErr, setPublishErr] = useState('');

  const loadData = () => {
    if (!id) return;
    gradebookApi.get(id)
      .then(async (gbRes) => {
        const gb = gbRes.data.data;
        setGradebook(gb);
        const gradesByCoure = await Promise.all(
          gb.courses.map((c) => gradebookApi.getGrades(id, c.id).then((r) => r.data.data))
        );
        setAllGrades(gradesByCoure.flat());
        setReady(true);
      })
      .catch((err) => setError(extractApiError(err)));
  };

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    if (ready && printMode) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [ready, printMode]);

  const handlePublish = async () => {
    if (!id) return;
    if (!confirm('Publish this gradebook? Students will be able to view their results.')) return;
    setPublishing(true);
    setPublishErr('');
    try {
      await gradebookApi.publish(id);
      setPublishMsg('Gradebook published successfully!');
      loadData();
    } catch (err) {
      setPublishErr(extractApiError(err));
    } finally {
      setPublishing(false);
    }
  };

  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!gradebook || !ready) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-green-700 animate-spin mx-auto mb-3" />
        Loading results…
      </div>
    );
  }

  const courses = gradebook.courses;
  const studentMap = new Map<string, StudentRow>();

  for (const g of allGrades) {
    if (!studentMap.has(g.userId)) {
      studentMap.set(g.userId, { userId: g.studentUserId, name: g.studentName, grades: {}, gpa: null });
    }
    studentMap.get(g.userId)!.grades[g.courseId] = {
      ca: g.caScore, exam: g.examScore, total: g.total, grade: g.grade,
    };
  }

  const rows = Array.from(studentMap.values()).map((s) => {
    let pts = 0, units = 0;
    for (const c of courses) {
      const g = s.grades[c.id];
      if (g?.total !== null && g?.total !== undefined) {
        pts   += computeGradePoint(g.total) * c.creditUnits;
        units += c.creditUnits;
      }
    }
    return { ...s, gpa: units > 0 ? pts / units : null };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const isDraft = gradebook.status === 'draft';
  const allCoursesHaveGrades = courses.length > 0 && courses.every((c) =>
    rows.some((r) => r.grades[c.id]?.total !== null && r.grades[c.id]?.total !== undefined)
  );
  const canPublish = isDraft && allCoursesHaveGrades && rows.length > 0;

  const printDate = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 10px; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
        body { font-family: Arial, sans-serif; background: #f9fafb; color: #111; }
      `}</style>

      {/* Action bar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            ← Back
          </button>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-xs">{gradebook.name}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
          }`}>{gradebook.status}</span>
        </div>

        <div className="flex items-center gap-2">
          {publishMsg && (
            <span className="text-xs text-green-700 font-medium">{publishMsg}</span>
          )}
          {publishErr && (
            <span className="text-xs text-red-600">{publishErr}</span>
          )}

          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('print', '1');
              window.open(url.toString(), '_blank');
            }}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            🖨 Print / Save PDF
          </button>

          {isDraft && (
            <button
              onClick={() => void handlePublish()}
              disabled={publishing || !canPublish}
              title={!canPublish ? 'All courses must have grades before publishing' : undefined}
              className="text-sm font-bold px-4 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {publishing ? 'Publishing…' : '✓ Publish Gradebook'}
            </button>
          )}
        </div>
      </div>

      {/* Readiness warning */}
      {isDraft && !canPublish && rows.length > 0 && (
        <div className="no-print bg-orange-50 border-b border-orange-200 px-6 py-2 text-xs text-orange-800">
          ⚠ Not ready to publish — some courses have no grades entered yet.
        </div>
      )}
      {isDraft && rows.length === 0 && (
        <div className="no-print bg-orange-50 border-b border-orange-200 px-6 py-2 text-xs text-orange-800">
          ⚠ No grades entered yet. Enter grades before publishing.
        </div>
      )}

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        {/* Letterhead */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wide">NACOS-AIFUE</h1>
          <p className="text-sm font-semibold">Department of Computer Science</p>
          <p className="text-sm text-gray-600">Aifue University</p>
          <div className="border-t-2 border-b-2 border-gray-800 my-3 py-2">
            <h2 className="text-base font-bold uppercase">{gradebook.name}</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {gradebook.level.replace('L', '')} Level &bull; {gradebook.session} &bull;{' '}
              {gradebook.semester.charAt(0).toUpperCase() + gradebook.semester.slice(1)} Semester
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Generated: {printDate} &bull; {rows.length} student{rows.length !== 1 ? 's' : ''}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No grades entered yet.</p>
            <p className="text-sm mt-1">Go to the Courses &amp; Grades tab and enter or upload grades first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#166534', color: 'white' }}>
                  <th style={th}>#</th>
                  <th style={{ ...th, textAlign: 'left', minWidth: 120 }}>Student ID</th>
                  <th style={{ ...th, textAlign: 'left', minWidth: 160 }}>Name</th>
                  {courses.map((c) => (
                    <th key={c.id} style={{ ...th, minWidth: 90 }} colSpan={3}>
                      {c.courseCode}
                      <br /><span style={{ fontWeight: 400, fontSize: 9 }}>{c.creditUnits} units</span>
                    </th>
                  ))}
                  <th style={th}>GPA</th>
                </tr>
                <tr style={{ background: '#14532d', color: '#d1fae5', fontSize: 9 }}>
                  <th style={th} /><th style={th} /><th style={th} />
                  {courses.map((c) => (
                    <>
                      <th key={`${c.id}-ca`}  style={th}>CA</th>
                      <th key={`${c.id}-ex`}  style={th}>Exam</th>
                      <th key={`${c.id}-gr`}  style={th}>Grade</th>
                    </>
                  ))}
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.userId} style={{ background: i % 2 === 0 ? 'white' : '#f0fdf4' }}>
                    <td style={{ ...td, textAlign: 'center', color: '#9ca3af' }}>{i + 1}</td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 10 }}>{row.userId}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{row.name}</td>
                    {courses.map((c) => {
                      const g = row.grades[c.id];
                      return (
                        <>
                          <td key={`${c.id}-ca`}  style={{ ...td, textAlign: 'center' }}>{g?.ca    ?? '—'}</td>
                          <td key={`${c.id}-ex`}  style={{ ...td, textAlign: 'center' }}>{g?.exam  ?? '—'}</td>
                          <td key={`${c.id}-gr`}  style={{ ...td, textAlign: 'center' }}>
                            <span className={gradeClass(g?.grade ?? null)}>{g?.grade ?? '—'}</span>
                          </td>
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
        )}

        {/* Footer / signatures */}
        {rows.length > 0 && (
          <div className="mt-10 pt-4 border-t border-gray-300 grid grid-cols-3 gap-8 text-xs text-gray-600">
            {[
              { label: 'Prepared by', title: 'Examinations Officer' },
              { label: 'Verified by',  title: 'Head of Department' },
              { label: 'Approved by',  title: 'Dean of Faculty' },
            ].map((sig) => (
              <div key={sig.title}>
                <p className="font-semibold mb-7">{sig.label}:</p>
                <div className="border-b border-gray-400 w-40 mb-1" />
                <p>{sig.title}</p>
                <p className="mt-2 text-gray-400">Date: _______________</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const th: React.CSSProperties = {
  padding: '6px 4px', border: '1px solid #166534', textAlign: 'center', fontWeight: 700,
};
const td: React.CSSProperties = {
  padding: '5px 4px', border: '1px solid #d1d5db', fontSize: '11px',
};
