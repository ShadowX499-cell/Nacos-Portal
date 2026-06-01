import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi, exportApi, extractApiError } from '../../api/client';
import type { PaginationMeta, User, Level, Program, UserStatus, StudentStatus } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

const LEVEL_LABELS: Record<Level, string> = {
  L100: '100', L200: '200', L300: '300', L400: '400',
};

const STATUS_BADGE: Record<UserStatus, string> = {
  pending: 'badge-yellow',
  validated: 'badge-green',
  suspended: 'badge-red',
};

const ACADEMIC_BADGE: Record<StudentStatus, { cls: string; label: string }> = {
  active:    { cls: 'bg-green-100 text-green-700',  label: 'Active' },
  carryover: { cls: 'bg-orange-100 text-orange-700', label: 'Carryover' },
  graduated: { cls: 'bg-blue-100 text-blue-700',    label: 'Graduated' },
  suspended: { cls: 'bg-red-100 text-red-700',      label: 'Suspended' },
};

const PROGRAM_TABS: { value: Program | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'CSC', label: 'CSC' },
  { value: 'ICT', label: 'ICT' },
  { value: 'CRE', label: 'CRE' },
];

function Avatar({ user }: { user: User }) {
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (user.profilePhotoUrl) {
    return (
      <img
        src={`${API_BASE.replace('/api/v1', '')}${user.profilePhotoUrl}`}
        alt={user.name}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #16a34a 0%, #052e16 100%)' }}>
      {initials}
    </div>
  );
}

export default function UserListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<Level | ''>('');
  const [programFilter, setProgramFilter] = useState<Program | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 20 };
    if (search) params.search = search;
    if (levelFilter) params.level = levelFilter;
    if (programFilter) params.program = programFilter;
    if (statusFilter) params.status = statusFilter;

    adminApi.listUsers(params)
      .then((res) => { setUsers(res.data.data); setMeta(res.data.meta ?? null); })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [search, levelFilter, programFilter, statusFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, levelFilter, programFilter, statusFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">
          Students{meta ? ` (${meta.total})` : ''}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              exportApi.studentLoginsPdf()
                .then((res) => {
                  const url = URL.createObjectURL(res.data as Blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'student-logins.pdf';
                  a.click();
                  URL.revokeObjectURL(url);
                })
                .catch(() => alert('PDF download failed'));
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            ⬇ Student Logins PDF
          </button>
          <Link to="/admin/users/new" className="btn-primary btn-sm">+ Add Student</Link>
        </div>
      </div>

      {/* Program tab filter */}
      <div className="flex gap-1 mb-4">
        {PROGRAM_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setProgramFilter(t.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              programFilter === t.value
                ? 'bg-brand-700 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + level + status filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3">
        <input type="text" placeholder="Search name, ID, or email…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-48" />
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as Level | '')} className="input w-36">
          <option value="">All Levels</option>
          <option value="L100">100 Level</option>
          <option value="L200">200 Level</option>
          <option value="L300">300 Level</option>
          <option value="L400">400 Level</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')} className="input w-36">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="validated">Validated</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-6">{error}</div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-8"></th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-40">User ID</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-20">Program</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-20">Level</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-28">Account</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 w-28">Academic</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    No students found.{' '}
                    <Link to="/admin/users/new" className="text-brand-700 font-medium">Add the first student</Link>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const acad = ACADEMIC_BADGE[u.studentStatus] ?? ACADEMIC_BADGE.active;
                  return (
                    <tr key={u.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/users/${u.id}`)}>
                      <td className="px-3 py-3"><Avatar user={u} /></td>
                      <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-700">{u.userId}</td>
                      <td className="px-5 py-3 text-gray-600">{u.program}</td>
                      <td className="px-5 py-3 text-gray-600">{LEVEL_LABELS[u.level]}</td>
                      <td className="px-5 py-3">
                        <span className={STATUS_BADGE[u.status]}>{u.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${acad.cls}`}>
                          {acad.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <span>Page {meta.page} of {meta.totalPages} · {meta.total} students</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary btn-sm disabled:opacity-40">← Previous</button>
              <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary btn-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
