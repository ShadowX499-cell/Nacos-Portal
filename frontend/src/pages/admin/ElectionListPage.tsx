import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { electionsAdminApi, extractApiError } from '../../api/client';
import type { Election, ElectionStatus } from '../../types';
import { Plus, Vote, Users, CheckCircle, Clock } from 'lucide-react';

const STATUS_CONFIG: Record<ElectionStatus, { label: string; color: string; dot: string }> = {
  draft:             { label: 'Draft',     color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  active:            { label: 'Active',    color: 'bg-brand-100 text-brand-800',   dot: 'bg-brand-500'  },
  closed:            { label: 'Closed',    color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400'   },
  results_published: { label: 'Published', color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500'   },
};

const TABS: { key: ElectionStatus | 'all'; label: string }[] = [
  { key: 'all',             label: 'All'       },
  { key: 'draft',           label: 'Draft'     },
  { key: 'active',          label: 'Active'    },
  { key: 'closed',          label: 'Closed'    },
  { key: 'results_published', label: 'Published' },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ElectionListPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ElectionStatus | 'all'>('all');

  useEffect(() => {
    electionsAdminApi.list()
      .then((r) => setElections(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? elections : elections.filter((e) => e.status === tab);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Elections</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage departmental elections</p>
        </div>
        <Link to="/admin/elections/new"
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Election
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'border-b-2 border-brand-700 text-brand-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            {t.key !== 'all' && (
              <span className="ml-1.5 text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {elections.filter((e) => e.status === t.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Vote className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No elections yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first election to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((election) => {
            const cfg = STATUS_CONFIG[election.status];
            return (
              <Link key={election.id} to={`/admin/elections/${election.id}`}
                className="block bg-white rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-md p-5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {election.status === 'active' && (
                        <span className="text-[10px] text-brand-600 font-semibold animate-pulse">● Live</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 truncate">{election.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {fmt(election.startTime)} → {fmt(election.endTime)}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3" />
                        {election.approvedCandidateCount} candidates
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <CheckCircle className="w-3 h-3" />
                        {election.voteCount} votes
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {election.positions.length} positions
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                    {election.eligibleLevels.join(', ')}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
