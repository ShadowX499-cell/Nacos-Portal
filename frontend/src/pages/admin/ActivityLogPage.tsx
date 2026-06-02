import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { adminApi, extractApiError } from '../../api/client';
import type { ActivityItem, PaginationMeta } from '../../types';

const ACTIVITY_ICONS: Record<string, string> = {
  registered: '👤', activated: '✅', payment: '💳', result_published: '📋',
};

const TYPE_LABELS: Record<string, string> = {
  registered: 'Registered', activated: 'Activated',
  payment: 'Payment', result_published: 'Result Published',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ActivityLogPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getActivityFeed({
      page,
      limit: 20,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    })
      .then((r) => {
        setItems(r.data.data);
        setMeta(r.data.meta ?? null);
      })
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [page, typeFilter, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/admin/dashboard" className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
          <p className="text-sm text-gray-500 mt-0.5">All department activity</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All types</option>
          <option value="registered">Registered</option>
          <option value="activated">Activated</option>
          <option value="payment">Payment</option>
          <option value="result_published">Result Published</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {(typeFilter || from || to) && (
          <button
            onClick={() => { setTypeFilter(''); setFrom(''); setTo(''); setPage(1); }}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl border border-gray-200 bg-white"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No activity found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((event, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 border-l-2 border-transparent hover:border-brand-400 hover:bg-brand-50/30 transition-all">
                <span className="text-base flex-shrink-0 mt-0.5">{ACTIVITY_ICONS[event.type] ?? '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{event.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(event.time)} · {formatDate(event.time)}</p>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 self-center">
                  {TYPE_LABELS[event.type] ?? event.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm font-medium text-brand-700 disabled:text-gray-300 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:bg-transparent transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {meta.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="text-sm font-medium text-brand-700 disabled:text-gray-300 hover:text-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:bg-transparent transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
