import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi, extractApiError } from '../../api/client';
import type { PaginationMeta, User, Level, Program, UserStatus } from '../../types';

const LEVEL_LABELS: Record<Level, string> = {
  L100: '100', L200: '200', L300: '300', L400: '400',
};

const STATUS_BADGE: Record<UserStatus, string> = {
  pending: 'badge-yellow',
  validated: 'badge-green',
  suspended: 'badge-red',
};

export default function UserListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters
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

    adminApi
      .listUsers(params)
      .then((res) => {
        setUsers(res.data.data);
        setMeta(res.data.meta ?? null);
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [search, levelFilter, programFilter, statusFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, levelFilter, programFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-brand-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard" className="text-brand-200 hover:text-white text-sm">
            ← Dashboard
          </Link>
          <span className="text-brand-400">/</span>
          <span className="text-sm">Students</span>
        </div>
        <button onClick={() => navigate('/admin/users/new')} className="btn-primary btn-sm">
          + Add Student
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Students{meta ? ` (${meta.total})` : ''}
          </h1>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search name, ID, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input flex-1 min-w-48"
          />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as Level | '')}
            className="input w-36"
          >
            <option value="">All Levels</option>
            <option value="L100">100 Level</option>
            <option value="L200">200 Level</option>
            <option value="L300">300 Level</option>
            <option value="L400">400 Level</option>
          </select>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value as Program | '')}
            className="input w-32"
          >
            <option value="">All Programs</option>
            <option value="CSC">CSC</option>
            <option value="ICT">ICT</option>
            <option value="CRE">CRE</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
            className="input w-36"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="validated">Validated</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Table */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 w-40">User ID</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Email</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 w-20">Program</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 w-20">Level</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                      No students found.{' '}
                      <Link to="/admin/users/new" className="text-brand-700 font-medium">
                        Add the first student
                      </Link>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                    >
                      <td className="px-5 py-4 font-mono text-xs text-gray-700">{u.userId}</td>
                      <td className="px-5 py-4 font-medium text-gray-900">{u.name}</td>
                      <td className="px-5 py-4 text-gray-600">{u.email}</td>
                      <td className="px-5 py-4 text-gray-600">{u.program}</td>
                      <td className="px-5 py-4 text-gray-600">{LEVEL_LABELS[u.level]}</td>
                      <td className="px-5 py-4">
                        <span className={STATUS_BADGE[u.status]}>
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
              <span>
                Page {meta.page} of {meta.totalPages} · {meta.total} students
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-secondary btn-sm disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary btn-sm disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
