import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gradebookApi, extractApiError } from '../../api/client';
import type { Grade, Gradebook, Course } from '../../types';

interface GradeRow {
  userId: string;
  studentUserId: string;
  studentName: string;
  caScore: string;
  examScore: string;
}

export default function GradeEntryPage() {
  const { id, courseId } = useParams<{ id: string; courseId: string }>();
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !courseId) return;

    Promise.all([gradebookApi.get(id), gradebookApi.getGrades(id, courseId)])
      .then(([gbRes, gradesRes]) => {
        const gb = gbRes.data.data;
        setGradebook(gb);
        setCourse(gb.courses?.find((c) => c.id === courseId) ?? null);

        const existing = gradesRes.data.data;
        setRows(
          existing.map((g: Grade) => ({
            userId: g.userId,
            studentUserId: g.studentUserId,
            studentName: g.studentName,
            caScore: g.caScore !== null ? String(g.caScore) : '',
            examScore: g.examScore !== null ? String(g.examScore) : '',
          }))
        );
      })
      .catch((err) => setError(extractApiError(err)));
  }, [id, courseId]);

  const isDraft = gradebook?.status === 'draft';

  const updateRow = (index: number, field: 'caScore' | 'examScore', value: string) => {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!id || !courseId) return;
    setSaving(true);
    setSaveMsg('');
    setError('');
    try {
      const grades = rows.map((r) => ({
        userId: r.userId,
        caScore: r.caScore !== '' ? parseFloat(r.caScore) : null,
        examScore: r.examScore !== '' ? parseFloat(r.examScore) : null,
      }));
      await gradebookApi.upsertGrades(id, courseId, grades);
      setSaveMsg('Grades saved successfully.');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (error && !gradebook) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-brand-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-brand-800 font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-lg">NACOS-AIFUE Admin</span>
        </div>
        <Link to={`/admin/gradebooks/${id}`} className="text-brand-200 hover:text-white text-sm">
          ← Back to Gradebook
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {course ? `${course.courseCode} — ${course.courseTitle}` : 'Grade Entry'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {gradebook?.name} &middot; CA max 30 &middot; Exam max 70
          </p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-4">{error}</div>}
        {saveMsg && <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm mb-4">{saveMsg}</div>}

        {rows.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            No students found. Upload a CSV to add grades in bulk, or ensure students are enrolled.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Student ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">CA (0–30)</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Exam (0–70)</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => {
                  const ca = parseFloat(row.caScore);
                  const ex = parseFloat(row.examScore);
                  const total = !isNaN(ca) && !isNaN(ex) ? ca + ex : null;
                  return (
                    <tr key={row.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-600">{row.studentUserId}</td>
                      <td className="px-4 py-2 text-gray-800">{row.studentName}</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number" min={0} max={30} step={0.5}
                          value={row.caScore}
                          onChange={(e) => updateRow(i, 'caScore', e.target.value)}
                          disabled={!isDraft}
                          className="input w-20 text-center text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number" min={0} max={70} step={0.5}
                          value={row.examScore}
                          onChange={(e) => updateRow(i, 'examScore', e.target.value)}
                          disabled={!isDraft}
                          className="input w-20 text-center text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-center font-semibold text-gray-800">
                        {total !== null ? total.toFixed(1) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isDraft && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button onClick={() => void handleSave()} disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save All Grades'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
