import { useEffect, useRef, useState } from 'react';
import { resultsApi, profileApi, extractApiError } from '../../api/client';
import type { GpaSummary, User } from '../../types';

export default function TranscriptPage() {
  const [gpa, setGpa] = useState<GpaSummary | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([resultsApi.getGpa(), profileApi.getMe()])
      .then(([gpaRes, profileRes]) => {
        setGpa(gpaRes.data.data);
        setProfile(profileRes.data.data);
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => window.print();

  if (loading) return <div className="p-6 text-center text-gray-400">Loading transcript…</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  const sorted = [...(gpa?.semesters ?? [])].sort((a, b) =>
    a.session.localeCompare(b.session) || a.semester.localeCompare(b.semester)
  );

  let runningWeighted = 0;
  let runningCredits = 0;
  const rows = sorted.map((sem) => {
    runningWeighted += sem.sgpa * sem.totalCredits;
    runningCredits += sem.totalCredits;
    return { ...sem, runningCgpa: runningCredits > 0 ? runningWeighted / runningCredits : 0 };
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Transcript</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {profile?.name} · {profile?.userId} · {profile?.program}
          </p>
        </div>
        <button onClick={handlePrint} className="btn-secondary print:hidden">
          🖨️ Print / Export
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6 print:hidden">
        <div className="card p-4 text-center border border-blue-100 bg-blue-50">
          <div className="text-2xl font-bold text-brand-800">{gpa?.cgpa.toFixed(2) ?? '—'}</div>
          <div className="text-xs text-gray-500 mt-1">Overall CGPA</div>
        </div>
        <div className="card p-4 text-center border border-green-100 bg-green-50">
          <div className="text-2xl font-bold text-green-700">{gpa?.totalCreditsEarned ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Total Credits Earned</div>
        </div>
        <div className="card p-4 text-center border border-yellow-100 bg-yellow-50">
          <div className="text-2xl font-bold text-yellow-700">{gpa?.semesters.length ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Semesters Completed</div>
        </div>
      </div>

      {/* Transcript table */}
      <div className="card overflow-hidden" ref={printRef}>
        {/* Print header */}
        <div className="hidden print:block px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">NACOS-AIFUE Academic Transcript</h2>
          <p className="text-sm text-gray-600">{profile?.name} · {profile?.userId} · {profile?.program} · {profile?.level}</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No transcript data available.</p>
            <p className="text-sm mt-1">Results appear here after you pay for them.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Session</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Semester</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Credits</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">SGPA</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Running CGPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={`${row.session}-${row.semester}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{row.session}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{row.semester}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.totalCredits}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${row.sgpa >= 3.5 ? 'text-green-700' : row.sgpa >= 2.5 ? 'text-blue-700' : 'text-red-600'}`}>
                      {row.sgpa.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-brand-800">
                    {row.runningCgpa.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Overall</td>
                <td className="px-4 py-3 text-center font-bold">{gpa?.totalCreditsEarned}</td>
                <td className="px-4 py-3 text-center text-gray-400">—</td>
                <td className="px-4 py-3 text-center font-bold text-brand-800">{gpa?.cgpa.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
