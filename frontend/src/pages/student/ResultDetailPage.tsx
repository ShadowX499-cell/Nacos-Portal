import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resultsApi, extractApiError } from '../../api/client';
import type { StudentResultView } from '../../types';
import { ArrowLeft, FileText, Download, MessageSquare, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-green-700 bg-green-50',
  B: 'text-blue-700 bg-blue-50',
  C: 'text-cyan-700 bg-cyan-50',
  D: 'text-yellow-700 bg-yellow-50',
  E: 'text-orange-700 bg-orange-50',
  F: 'text-red-700 bg-red-50',
};

export default function ResultDetailPage() {
  const { gradebookId } = useParams<{ gradebookId: string }>();
  const [result, setResult] = useState<StudentResultView | null>(null);
  const [cgpa, setCgpa] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

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

  const handleFeedback = () => {
    if (!feedbackMsg.trim()) return;
    // In Phase 3 this will call a notifications/feedback API
    setFeedbackSent(true);
    setFeedbackMsg('');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
          <p className="text-sm text-gray-400">Loading result…</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error || 'Result not found.'}</p>
        <Link to="/student/results" className="text-brand-800 hover:underline text-sm">← Back to results</Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

      {/* Back + title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/student/results"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-700 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Results
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{result.gradebookName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.level} · {result.session} · <span className="capitalize">{result.semester}</span> Semester ·{' '}
            Published {new Date(result.publishedAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/student/transcript"
            className="flex items-center gap-1.5 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Request Transcript</span>
            <span className="sm:hidden">Transcript</span>
          </Link>
          <button
            className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl transition-colors"
            onClick={() => window.print()}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print / Save</span>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-blue-100 p-5 text-center shadow-sm">
          <div className="text-3xl font-bold text-brand-800">{result.sgpa.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Semester GPA</div>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5 text-center shadow-sm">
          <div className="text-3xl font-bold text-brand-700">{cgpa !== null ? cgpa.toFixed(2) : '—'}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Cumulative GPA</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
          <div className="text-3xl font-bold text-gray-800">{result.totalCredits}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Total Credits</div>
        </div>
      </div>

      {/* Grade table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Course Breakdown</h2>
          <span className="text-xs text-gray-400">{result.courses.length} courses</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs">Course</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 text-xs">CR</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 text-xs">CA</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 text-xs">Exam</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 text-xs">Total</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 text-xs">Grade</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 text-xs">GP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {result.courses.map((course) => (
                <tr key={course.courseCode} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] text-gray-400 mr-2 bg-gray-100 px-1.5 py-0.5 rounded">{course.courseCode}</span>
                    <span className="text-gray-800 text-xs">{course.courseTitle}</span>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-600 text-xs">{course.creditUnits}</td>
                  <td className="px-3 py-3 text-center text-gray-600 text-xs">{course.caScore ?? '—'}</td>
                  <td className="px-3 py-3 text-center text-gray-600 text-xs">{course.examScore ?? '—'}</td>
                  <td className="px-3 py-3 text-center font-semibold text-gray-800 text-xs">{course.total ?? '—'}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block font-bold text-sm px-2 py-0.5 rounded-lg ${GRADE_COLOR[course.grade ?? ''] ?? 'text-gray-400 bg-gray-50'}`}>
                      {course.grade ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-600 text-xs">
                    {course.gradePoint !== null ? course.gradePoint.toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-brand-50 border-t border-brand-100">
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-brand-800">SGPA</td>
                <td className="px-3 py-3 text-center font-bold text-brand-800">{result.sgpa.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Transcript activation CTA */}
      <div className="bg-white rounded-2xl border border-brand-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Need an Official Transcript?</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Request your cumulative academic transcript covering all subscribed semesters.
              Processed within 3–5 working days.
            </p>
          </div>
        </div>
        <Link
          to="/student/transcript"
          className="flex-shrink-0 flex items-center gap-2 text-sm font-semibold bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <FileText className="w-4 h-4" />
          Request Transcript
        </Link>
      </div>

      {/* Feedback accordion */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setFeedbackOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            Report an Issue or Give Feedback
          </div>
          {feedbackOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {feedbackOpen && (
          <div className="px-5 pb-5 border-t border-gray-100">
            {feedbackSent ? (
              <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 mt-4">
                <CheckCircle className="w-5 h-5 text-brand-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-brand-800">Feedback received</p>
                  <p className="text-xs text-brand-600">Your message has been sent to the academic office.</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-gray-500">
                  Found an error in your result? Message your departmental admin directly.
                </p>
                <textarea
                  rows={3}
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  placeholder="Describe the issue — e.g., incorrect score for CSC201, missing course…"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                />
                <button
                  onClick={handleFeedback}
                  disabled={!feedbackMsg.trim()}
                  className="flex items-center gap-2 text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Send Feedback
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
