import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { gradebookApi, extractApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { Gradebook, Course, CsvJob } from '../../types';

type Tab = 'courses' | 'csv' | 'publish';

export default function GradebookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('courses');
  const [gradebook, setGradebook] = useState<Gradebook & { courses: Course[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGradebook = () => {
    if (!id) return;
    gradebookApi.get(id)
      .then((res) => setGradebook(res.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadGradebook(); }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (error || !gradebook) return <div className="p-8 text-center text-red-600">{error || 'Not found'}</div>;

  const isDraft = gradebook.status === 'draft';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-brand-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-brand-800 font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-lg">NACOS-AIFUE Admin</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/admin/gradebooks" className="text-brand-200 hover:text-white">← Gradebooks</Link>
          <span className="text-brand-200">{user?.name || user?.userId}</span>
          <button onClick={() => void logout()} className="text-brand-200 hover:text-white">Sign out</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{gradebook.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {gradebook.level} &middot; {gradebook.session} &middot; {gradebook.semester} semester
              <span className={`ml-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                gradebook.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {gradebook.status}
              </span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {(['courses', 'csv', 'publish'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-brand-800 text-brand-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'courses' ? 'Courses & Grades' : t === 'csv' ? 'CSV Upload' : 'Publish'}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {tab === 'courses' && (
          <CoursesTab gradebook={gradebook} isDraft={isDraft} onRefresh={loadGradebook} navigate={navigate} />
        )}
        {tab === 'csv' && (
          <CsvTab gradebookId={gradebook.id} courses={gradebook.courses} isDraft={isDraft} />
        )}
        {tab === 'publish' && (
          <PublishTab gradebook={gradebook} onPublished={loadGradebook} />
        )}
      </div>
    </div>
  );
}

// ── Courses tab ───────────────────────────────────────────────────────────────

function CoursesTab({
  gradebook,
  isDraft,
  onRefresh,
  navigate,
}: {
  gradebook: Gradebook & { courses: Course[] };
  isDraft: boolean;
  onRefresh: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [creditUnits, setCreditUnits] = useState('3');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const handleAddCourse = async () => {
    if (!courseCode.trim() || !courseTitle.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      await gradebookApi.addCourse(gradebook.id, {
        courseCode: courseCode.trim().toUpperCase(),
        courseTitle: courseTitle.trim(),
        creditUnits: parseInt(creditUnits),
      });
      setCourseCode(''); setCourseTitle(''); setCreditUnits('3');
      onRefresh();
    } catch (err) {
      setAddError(extractApiError(err));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCourse = async (courseId: string) => {
    if (!confirm('Remove this course?')) return;
    try {
      await gradebookApi.removeCourse(gradebook.id, courseId);
      onRefresh();
    } catch (err) {
      alert(extractApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Add course form */}
      {isDraft && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Course</h3>
          {addError && <p className="text-red-600 text-xs mb-2">{addError}</p>}
          <div className="flex gap-2 flex-wrap">
            <input value={courseCode} onChange={(e) => setCourseCode(e.target.value)}
              className="input w-28" placeholder="Code (e.g. CSC201)" />
            <input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)}
              className="input flex-1 min-w-48" placeholder="Course Title" />
            <select value={creditUnits} onChange={(e) => setCreditUnits(e.target.value)} className="input w-20">
              {[1,2,3,4,5,6].map(n => <option key={n}>{n}</option>)}
            </select>
            <button onClick={() => void handleAddCourse()} disabled={adding} className="btn-primary">
              {adding ? '…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Course list */}
      {gradebook.courses.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">No courses added yet.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Title</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Units</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Grades</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gradebook.courses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{course.courseCode}</td>
                  <td className="px-4 py-3 text-gray-800">{course.courseTitle}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{course.creditUnits}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${(course.gradeCount ?? 0) > 0 ? 'text-green-700' : 'text-red-500'}`}>
                      {course.gradeCount ?? 0} entered
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex gap-3 justify-end">
                    <button
                      onClick={() => navigate(`/admin/gradebooks/${gradebook.id}/courses/${course.id}/grades`)}
                      className="text-brand-800 hover:underline text-xs font-medium"
                    >
                      {isDraft ? 'Enter grades' : 'View grades'}
                    </button>
                    {isDraft && (course.gradeCount ?? 0) === 0 && (
                      <button onClick={() => void handleRemoveCourse(course.id)} className="text-red-500 hover:underline text-xs">
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── CSV tab ───────────────────────────────────────────────────────────────────

function CsvTab({ gradebookId, courses, isDraft }: { gradebookId: string; courses: Course[]; isDraft: boolean }) {
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<CsvJob[]>([]);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    gradebookApi.listCsvJobs(gradebookId)
      .then((res) => setJobs(res.data.data))
      .catch(() => undefined);
  }, [gradebookId]);

  useEffect(() => {
    if (!pollingJobId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await gradebookApi.getCsvJob(gradebookId, pollingJobId);
        const job = res.data.data;
        setJobs((prev) => prev.map((j) => j.id === job.id ? job : j));
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(pollRef.current!);
          setPollingJobId(null);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollingJobId, gradebookId]);

  const handleUpload = async () => {
    if (!file || !selectedCourse) return;
    setUploading(true);
    try {
      const res = await gradebookApi.uploadCsv(gradebookId, selectedCourse, file);
      const newJobId = res.data.data.jobId;
      const jobRes = await gradebookApi.getCsvJob(gradebookId, newJobId);
      setJobs((prev) => [jobRes.data.data, ...prev]);
      setPollingJobId(newJobId);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      alert(extractApiError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isDraft && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800 text-sm">
          This gradebook is published. CSV uploads are disabled.
        </div>
      )}

      {isDraft && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Upload CSV</h3>
          <p className="text-xs text-gray-500 mb-4">
            Required columns: <code className="bg-gray-100 px-1 rounded">student_id, ca_score, exam_score</code>
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="input w-full">
                {courses.map((c) => <option key={c.id} value={c.id}>{c.courseCode} — {c.courseTitle}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CSV File</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block text-sm text-gray-600"
              />
            </div>
            <button onClick={() => void handleUpload()} disabled={uploading || !file} className="btn-primary">
              {uploading ? 'Uploading…' : 'Upload & Process'}
            </button>
          </div>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
            Upload History
          </div>
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <div key={job.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-gray-500">{job.id.slice(0, 8)}…</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    job.status === 'completed' ? 'bg-green-100 text-green-700'
                    : job.status === 'failed' ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                  }`}>
                    {job.status}
                  </span>
                </div>
                {job.totalRows !== null && (
                  <p className="text-xs text-gray-600">
                    {job.processedRows} / {job.totalRows} rows processed
                  </p>
                )}
                {job.errorLog && job.errorLog.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">{job.errorLog.length} errors</summary>
                    <div className="mt-1 space-y-0.5">
                      {job.errorLog.map((e, i) => (
                        <p key={i} className="text-xs text-red-500">Row {e.row}: {e.field} — {e.message}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Publish tab ───────────────────────────────────────────────────────────────

function PublishTab({ gradebook, onPublished }: { gradebook: Gradebook & { courses: Course[] }; onPublished: () => void }) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  if (gradebook.status === 'published') {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-gray-800 font-semibold">This gradebook has been published.</p>
        <p className="text-sm text-gray-500 mt-1">
          Published on {new Date(gradebook.publishedAt!).toLocaleDateString()}
        </p>
      </div>
    );
  }

  const allCoursesHaveGrades = gradebook.courses.every((c) => (c.gradeCount ?? 0) > 0);
  const hasCourses = gradebook.courses.length > 0;

  const handlePublish = async () => {
    if (!confirm('Publish this gradebook? Students will be able to purchase and view their results.')) return;
    setPublishing(true);
    setError('');
    try {
      await gradebookApi.publish(gradebook.id);
      onPublished();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="card p-6 max-w-lg">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Publish Readiness</h3>
      <div className="space-y-3 mb-6">
        <ReadinessItem ok={hasCourses} label="At least one course added" />
        <ReadinessItem ok={allCoursesHaveGrades} label="All courses have grades entered" />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <button
        onClick={() => void handlePublish()}
        disabled={publishing || !hasCourses || !allCoursesHaveGrades}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {publishing ? 'Publishing…' : 'Publish Gradebook'}
      </button>
      <p className="text-xs text-gray-400 mt-2 text-center">This action cannot be undone.</p>
    </div>
  );
}

function ReadinessItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>{ok ? '✅' : '❌'}</span>
      <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
    </div>
  );
}
