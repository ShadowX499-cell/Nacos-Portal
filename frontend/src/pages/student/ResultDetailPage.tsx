import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resultsApi, extractApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { StudentResultView } from '../../types';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-green-700',
  B: 'text-blue-700',
  C: 'text-cyan-700',
  D: 'text-yellow-700',
  E: 'text-orange-700',
  F: 'text-red-700',
};

export default function ResultDetailPage() {
  const { gradebookId } = useParams<{ gradebookId: string }>();
  const { user } = useAuth();
  const [result, setResult] = useState<StudentResultView | null>(null);
  const [cgpa, setCgpa] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gradebookId) return;
    Promise.all([resultsApi.get(gradebookId), resultsApi.getGpa()])
      .then(([resResult, resGpa]) => {
        setResult(resResult.data.data);
        setCgpa(resGpa.data.data.cgpa);
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [gradebookId]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (error || !result) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error || 'Result not found.'}</p>
        <Link to="/student/results" className="text-brand-800 hover:underline text-sm">← Back to results</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-brand-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-brand-800 font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-lg">NACOS Student Portal</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/student/results" className="text-brand-200 hover:text-white">← My Results</Link>
          <span className="text-brand-200">{user?.name || user?.userId}</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{result.gradebookName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.level} &middot; {result.session} &middot;{' '}
            <span className="capitalize">{result.semester}</span> Semester &middot;{' '}
            Published {new Date(result.publishedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card p-5 text-center border border-blue-100 bg-blue-50">
            <div className="text-3xl font-bold text-brand-800">{result.sgpa.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">Semester GPA</div>
          </div>
          <div className="card p-5 text-center border border-green-100 bg-green-50">
            <div className="text-3xl font-bold text-green-700">{cgpa !== null ? cgpa.toFixed(2) : '—'}</div>
            <div className="text-xs text-gray-500 mt-1">Cumulative GPA</div>
          </div>
          <div className="card p-5 text-center border border-yellow-100 bg-yellow-50">
            <div className="text-3xl font-bold text-yellow-700">{result.totalCredits}</div>
            <div className="text-xs text-gray-500 mt-1">Total Credits</div>
          </div>
        </div>

        {/* Grade table */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Course</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">CR</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">CA</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Exam</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Grade</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">GP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.courses.map((course) => (
                <tr key={course.courseCode} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-500 mr-2">{course.courseCode}</span>
                    <span className="text-gray-800">{course.courseTitle}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{course.creditUnits}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{course.caScore ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{course.examScore ?? '—'}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-800">{course.total ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold text-base ${GRADE_COLOR[course.grade ?? ''] ?? 'text-gray-400'}`}>
                      {course.grade ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {course.gradePoint !== null ? course.gradePoint.toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">SGPA</td>
                <td className="px-4 py-3 text-center font-bold text-brand-800">{result.sgpa.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
