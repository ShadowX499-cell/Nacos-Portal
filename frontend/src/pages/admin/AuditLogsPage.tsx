import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { auditLogsApi, type AuditLogEntry, extractApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { PaginationMeta } from '../../types';

const ACTION_COLOR: Record<string, string> = {
  STUDENT_CREATED: 'bg-green-100 text-green-700',
  STUDENT_VALIDATED: 'bg-blue-100 text-blue-700',
  STUDENT_SUSPENDED: 'bg-red-100 text-red-700',
  GRADE_ENTERED: 'bg-purple-100 text-purple-700',
  RESULT_PUBLISHED: 'bg-indigo-100 text-indigo-700',
  SESSION_ADVANCED: 'bg-orange-100 text-orange-700',
  SUPER_ADMIN_CREATED: 'bg-yellow-100 text-yellow-700',
  SUPER_ADMIN_REVOKED: 'bg-red-100 text-red-700',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'bg-red-200 text-red-800',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function DiffViewer({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase mb-1">{label}</p>
      <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-gray-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function LogRow({ log }: { log: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const color = ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-700';

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <td className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-900">{log.actorName}</p>
          <p className="text-[10px] text-gray-400 font-mono">{log.actorUserId}</p>
        </td>
        <td className="px-5 py-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${color}`}>
            {log.action.replace(/_/g, ' ')}
          </span>
        </td>
        <td className="px-5 py-3 text-xs text-gray-500">
          {log.entityType ?? '—'}
          {log.entityId && <span className="font-mono ml-1 text-gray-400">#{log.entityId.slice(0, 8)}</span>}
        </td>
        <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{timeAgo(log.createdAt)}</td>
        <td className="px-5 py-3 text-right">
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 inline" /> : <ChevronDown className="w-4 h-4 text-gray-400 inline" />}
        </td>
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={5} className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div><span className="font-semibold">Actor role:</span> {log.actorRole}</div>
                  <div><span className="font-semibold">IP:</span> {log.ipAddress ?? '—'}</div>
                  <div><span className="font-semibold">Entity:</span> {log.entityType} {log.entityId}</div>
                  <div><span className="font-semibold">Time:</span> {new Date(log.createdAt).toLocaleString()}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DiffViewer label="Before" value={log.oldValue} />
                  <DiffViewer label="After" value={log.newValue} />
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const isHod = user?.superAdminType === 'hod';

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 25 };
    if (actionFilter) params.action = actionFilter;
    if (entityFilter) params.entityType = entityFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    const apiFn = isHod ? auditLogsApi.list(params) : auditLogsApi.listOwn(params);
    apiFn
      .then((r) => { setLogs(r.data.data); setMeta(r.data.meta ?? null); })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [page, actionFilter, entityFilter, dateFrom, dateTo, isHod]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [actionFilter, entityFilter, dateFrom, dateTo]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isHod ? 'All Admin Activity' : 'Your Activity Trail'}
        </p>
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input type="text" placeholder="Action (e.g. RESULT_PUBLISHED)"
          value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          className="input flex-1 min-w-44" />
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="input w-36">
          <option value="">All entities</option>
          <option value="user">User</option>
          <option value="gradebook">Gradebook</option>
          <option value="permission">Permission</option>
          <option value="session">Session</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input w-36" />
        <span className="text-gray-400 text-sm">→</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input w-36" />
        <button onClick={() => { setActionFilter(''); setEntityFilter(''); setDateFrom(''); setDateTo(''); }}
          className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-700">{error}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Actor</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Action</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Entity</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">When</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">No audit logs found.</td></tr>
              ) : (
                logs.map((log) => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <span>Page {meta.page} of {meta.totalPages} · {meta.total} entries</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary btn-sm disabled:opacity-40">← Prev</button>
              <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary btn-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
