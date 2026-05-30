import { useEffect, useRef, useState } from 'react';
import { resultsApi, profileApi, extractApiError } from '../../api/client';
import type { GpaSummary, User, StudentResultView } from '../../types';
import NacosLogo from '../../components/NacosLogo';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-green-700', B: 'text-blue-700', C: 'text-purple-700',
  D: 'text-yellow-700', E: 'text-orange-700', F: 'text-red-600',
};

export default function TranscriptPage() {
  const [gpa, setGpa] = useState<GpaSummary | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [semesterResults, setSemesterResults] = useState<StudentResultView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([resultsApi.getGpa(), profileApi.getMe()])
      .then(async ([gpaRes, profileRes]) => {
        const g = gpaRes.data.data;
        setGpa(g);
        setProfile(profileRes.data.data);

        // Fetch full course data for every paid semester in parallel
        if (g.semesters.length > 0) {
          const results = await Promise.all(
            g.semesters.map((s) => resultsApi.get(s.gradebookId).then((r) => r.data.data))
          );
          setSemesterResults(
            results.sort((a, b) =>
              a.session.localeCompare(b.session) || a.semester.localeCompare(b.semester)
            )
          );
        }
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
        <p className="text-sm text-gray-400">Building your transcript…</p>
      </div>
    </div>
  );
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  // Running CGPA calculation
  let runningWeighted = 0;
  let runningCredits = 0;
  const semestersWithCgpa = semesterResults.map((r) => {
    runningWeighted += r.sgpa * r.totalCredits;
    runningCredits += r.totalCredits;
    return { ...r, runningCgpa: runningCredits > 0 ? runningWeighted / runningCredits : 0 };
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Transcript</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {profile?.name} · {profile?.userId} · {profile?.program}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          🖨️ Print / Export
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6 print:hidden">
        <div className="bg-white rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center shadow-sm">
          <div className="text-3xl font-black text-brand-800">{gpa?.cgpa.toFixed(2) ?? '—'}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Overall CGPA</div>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-4 text-center shadow-sm">
          <div className="text-3xl font-black text-brand-700">{gpa?.totalCreditsEarned ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Credits Earned</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
          <div className="text-3xl font-black text-gray-800">{gpa?.semesters.length ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Semesters</div>
        </div>
      </div>

      {semesterResults.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📄</div>
          <p className="font-semibold text-gray-700">No transcript data yet</p>
          <p className="text-sm text-gray-400 mt-1">Results appear here after you subscribe to them.</p>
        </div>
      ) : (
        <div ref={printRef} className="space-y-6">

          {/* Print-only header */}
          <div className="hidden print:flex items-center gap-4 pb-4 border-b-2 border-gray-300 mb-6">
            <NacosLogo size={48} />
            <div>
              <h2 className="text-xl font-bold">NACOS-AIFUE Official Academic Transcript</h2>
              <p className="text-sm text-gray-600">
                {profile?.name} · {profile?.userId} · {profile?.program} · {profile?.level}
              </p>
              <p className="text-xs text-gray-400">Printed: {new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</p>
            </div>
          </div>

          {/* One card per semester */}
          {semestersWithCgpa.map((sem) => (
            <div key={`${sem.session}-${sem.semester}`} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:border print:shadow-none print:break-inside-avoid">

              {/* Semester header bar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
                style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                      {sem.session} · <span className="capitalize">{sem.semester}</span> Semester
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{sem.gradebookName}</p>
                  </div>
                  {/* Level badge */}
                  <span className="text-xs font-bold bg-white border border-brand-200 text-brand-800 px-2.5 py-1 rounded-lg">
                    {sem.level.replace('L', '')} Level
                  </span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-2xl font-black text-brand-800">{sem.sgpa.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">SGPA</div>
                  </div>
                  <div className="w-px h-10 bg-brand-100" />
                  <div>
                    <div className="text-2xl font-black text-gray-700">{sem.runningCgpa.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">CGPA so far</div>
                  </div>
                </div>
              </div>

              {/* Course table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Code</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Course Title</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">Level</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">CR</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">CA</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">Exam</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">Total</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">Grade</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">GP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sem.courses.map((c) => (
                      <tr key={c.courseCode} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500 bg-gray-50/50">{c.courseCode}</td>
                        <td className="px-4 py-2.5 text-gray-800 text-xs">{c.courseTitle}</td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-500">{sem.level.replace('L', '')}</td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-600">{c.creditUnits}</td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-600">{c.caScore ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-600">{c.examScore ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-800">{c.total ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`font-black text-sm ${GRADE_COLOR[c.grade ?? ''] ?? 'text-gray-400'}`}>
                            {c.grade ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-600">
                          {c.gradePoint != null ? c.gradePoint.toFixed(1) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-brand-50 border-t border-brand-100">
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 text-xs font-bold text-brand-800">Semester Total</td>
                      <td className="px-3 py-2.5 text-center text-xs font-bold text-brand-800">{sem.totalCredits}</td>
                      <td colSpan={4} />
                      <td className="px-3 py-2.5 text-center text-xs font-bold text-brand-800">{sem.sgpa.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {/* Grand total row */}
          <div className="bg-white rounded-2xl border-2 border-brand-300 p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-sm font-bold text-gray-900">Cumulative Summary</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {semesterResults.length} semester{semesterResults.length !== 1 ? 's' : ''} · {profile?.program} · {profile?.level}
              </p>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-black text-gray-700">{gpa?.totalCreditsEarned ?? 0}</div>
                <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Total Credits</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-brand-800">{gpa?.cgpa.toFixed(2) ?? '—'}</div>
                <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Final CGPA</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
