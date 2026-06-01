import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi, extractApiError } from '../../api/client';
import type { StudentProfile } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success:  'bg-green-100 text-green-700',
    pending:  'bg-yellow-100 text-yellow-700',
    failed:   'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-600',
    validated:'bg-green-100 text-green-700',
    verified: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    suspended:'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function UploadBadge({ status, fileUrl }: { status: string | null; fileUrl: string | null }) {
  if (!fileUrl && !status) {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Not uploaded</span>;
  }
  if (status === 'verified') {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Verified</span>;
  }
  if (status === 'pending') {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⏳ Pending review</span>;
  }
  if (status === 'rejected') {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">✗ Rejected</span>;
  }
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Uploaded</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-xs text-gray-500 flex-shrink-0 w-32">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right break-all">{value ?? '—'}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StudentProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminApi.getStudentProfile(id)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-green-700 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error || 'Not found'}</div>
      </div>
    );
  }

  const { profile, cgpa, nacosDues, schoolFees, courseRegistrations, results } = data;

  const initials = profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const level = profile.level.replace('L', '') + ' Level';

  const gpaBand = (gpa: number | null) => {
    if (gpa === null) return 'text-gray-400';
    if (gpa >= 4.5) return 'text-green-700';
    if (gpa >= 3.5) return 'text-blue-600';
    if (gpa >= 2.0) return 'text-yellow-700';
    return 'text-red-600';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link to="/admin/users" className="hover:text-gray-600">Students</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium truncate">{profile.name}</span>
      </div>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.profilePhotoUrl ? (
              <img
                src={`${API_BASE.replace('/api/v1', '')}${profile.profilePhotoUrl}`}
                alt={profile.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #16a34a 0%, #052e16 100%)' }}>
                {initials}
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{profile.name}</h1>
            <p className="font-mono text-sm text-gray-500 mt-0.5">{profile.userId}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full font-semibold">
                {profile.program} · {level}
              </span>
              <StatusBadge status={profile.status} />
              <StatusBadge status={profile.studentStatus} />
            </div>
          </div>

          {/* CGPA pill */}
          <div className="flex-shrink-0 text-center bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3">
            <p className="text-xs text-gray-500 font-medium mb-0.5">CGPA</p>
            <p className={`text-3xl font-black leading-none ${gpaBand(cgpa)}`}>
              {cgpa !== null ? cgpa.toFixed(2) : '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">out of 5.00</p>
          </div>
        </div>

        {/* Edit link */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <Link to={`/admin/users/${id}/edit`}
            className="text-xs font-medium text-brand-700 hover:underline">
            Edit Profile →
          </Link>
        </div>
      </div>

      {/* Two-column grid on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Personal details */}
        <Section title="Personal Details">
          <Row label="Email"         value={profile.email} />
          <Row label="Phone"         value={profile.phone} />
          <Row label="Date of Birth" value={profile.dateOfBirth ?? '—'} />
          <Row label="State of Origin" value={profile.stateOfOrigin ?? '—'} />
          <Row label="LGA"           value={profile.lga ?? '—'} />
          <Row label="Home Address"  value={profile.homeAddress ?? '—'} />
          <Row label="Department ID" value={<span className="font-mono">{profile.departmentId.slice(0, 8)}…</span>} />
        </Section>

        {/* NACOS Dues */}
        <Section title="NACOS Dues">
          {nacosDues.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No NACOS dues payments on record.</p>
          ) : (
            <div className="space-y-2">
              {nacosDues.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-semibold text-gray-800">{d.session ?? 'Unknown session'}</p>
                    <p className="text-gray-400 mt-0.5">
                      {d.paidAt ? new Date(d.paidAt).toLocaleDateString('en-NG') : 'Not paid yet'}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={d.status} />
                    {d.status === 'success' && (
                      <p className="text-gray-500 mt-0.5">₦{d.amount.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* School Fees */}
        <Section title="School Fees">
          {schoolFees.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No school fees payments on record.</p>
          ) : (
            <div className="space-y-2">
              {schoolFees.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {f.session ?? 'Unknown'} · {f.semester ?? ''}
                    </p>
                    <p className="text-gray-400 mt-0.5">
                      {f.paidAt ? new Date(f.paidAt).toLocaleDateString('en-NG') : 'Not paid'}
                    </p>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Course Registrations */}
        <Section title="Course Form Uploads">
          {courseRegistrations.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No course forms submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {courseRegistrations.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-semibold text-gray-800">{r.session} · {r.semester}</p>
                    <p className="text-gray-400 mt-0.5">
                      Submitted {new Date(r.submittedAt).toLocaleDateString('en-NG')}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <UploadBadge status={r.status} fileUrl={r.fileUrl} />
                    {r.fileUrl && (
                      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-brand-700 hover:underline text-[11px]">
                        View file
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>

      {/* Results table — full width */}
      <Section title="Academic Results">
        {results.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No published results available.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs min-w-[480px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Gradebook</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Session</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Program</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600">GPA</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600">Result Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r) => (
                  <tr key={r.gradebookId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px] truncate">{r.name}</td>
                    <td className="px-3 py-2 text-gray-600">{r.session} · {r.semester}</td>
                    <td className="px-3 py-2 text-gray-600">{r.program ?? '—'}</td>
                    <td className={`px-3 py-2 text-center font-bold ${gpaBand(r.gpa)}`}>
                      {r.gpa !== null ? r.gpa.toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.paid
                        ? <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">✓ Paid</span>
                        : <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Unpaid</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {results.length > 0 && cgpa !== null && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <p className="text-sm font-bold text-gray-800">
              CGPA: <span className={`text-lg ${gpaBand(cgpa)}`}>{cgpa.toFixed(2)}</span>
              <span className="text-xs text-gray-400 ml-1">/ 5.00</span>
            </p>
          </div>
        )}
      </Section>

    </div>
  );
}
