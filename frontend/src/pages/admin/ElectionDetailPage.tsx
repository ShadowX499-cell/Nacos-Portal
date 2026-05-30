import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { electionsAdminApi, extractApiError } from '../../api/client';
import type { ElectionDetail, ElectionCandidate, CandidateResult, ElectionStatus } from '../../types';
import { CheckCircle, XCircle, Clock, Users, TrendingUp, ArrowLeft, Trophy } from 'lucide-react';

type Tab = 'overview' | 'candidates' | 'results';

const STATUS_STEPS: ElectionStatus[] = ['draft', 'active', 'closed', 'results_published'];
const STATUS_LABELS: Record<ElectionStatus, string> = {
  draft: 'Draft', active: 'Active', closed: 'Closed', results_published: 'Published',
};

function Countdown({ target, label }: { target: string; label: string }) {
  const [diff, setDiff] = useState(new Date(target).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setDiff(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (diff <= 0) return <span className="text-xs text-gray-500">{label} (ended)</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="text-xs font-mono text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">
      {label}: {h}h {m}m {s}s
    </span>
  );
}

export default function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<ElectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    electionsAdminApi.get(id)
      .then((r) => setElection(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action: 'activate' | 'close' | 'publish') => {
    if (!id) return;
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this election?`)) return;
    setActioning(true);
    setActionError('');
    try {
      await electionsAdminApi.updateStatus(id, action);
      load();
    } catch (err) {
      setActionError(extractApiError(err));
    } finally {
      setActioning(false);
    }
  };

  const handleReview = async (candidateId: string, approved: boolean) => {
    if (!id) return;
    try {
      await electionsAdminApi.reviewCandidate(id, candidateId, approved);
      load();
    } catch (err) {
      setActionError(extractApiError(err));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
    </div>
  );

  if (error || !election) return (
    <div className="p-6">
      <p className="text-red-600 mb-4">{error || 'Election not found'}</p>
      <Link to="/admin/elections" className="text-brand-700 hover:underline text-sm">← Back</Link>
    </div>
  );

  const currentStepIdx = STATUS_STEPS.indexOf(election.status);
  const byPosition = election.candidates.reduce((acc, c) => {
    if (!acc[c.position]) acc[c.position] = [];
    acc[c.position].push(c);
    return acc;
  }, {} as Record<string, ElectionCandidate[]>);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <Link to="/admin/elections" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-700 mb-2 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Elections
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{election.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {election.positions.join(' · ')} · {election.eligibleLevels.join(', ')}
            </p>
          </div>
          <div className="flex-shrink-0">
            {election.status === 'draft' && (
              <button onClick={() => void handleAction('activate')} disabled={actioning}
                className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                Activate Now
              </button>
            )}
            {election.status === 'active' && (
              <button onClick={() => void handleAction('close')} disabled={actioning}
                className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                Close Election
              </button>
            )}
            {election.status === 'closed' && (
              <button onClick={() => void handleAction('publish')} disabled={actioning}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                Publish Results
              </button>
            )}
          </div>
        </div>
        {actionError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs">{actionError}</div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {(['overview', 'candidates', 'results'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-b-2 border-brand-700 text-brand-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Status timeline */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Status Timeline</h2>
            <div className="flex items-center gap-0">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center flex-1 ${i < STATUS_STEPS.length - 1 ? '' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      i < currentStepIdx ? 'bg-brand-600 border-brand-600 text-white'
                      : i === currentStepIdx ? 'bg-white border-brand-600 text-brand-700 ring-2 ring-brand-200'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}>
                      {i < currentStepIdx ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 font-semibold ${i <= currentStepIdx ? 'text-brand-700' : 'text-gray-400'}`}>
                      {STATUS_LABELS[step]}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 ${i < currentStepIdx ? 'bg-brand-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Countdown + stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Nominations', value: election.candidateCount },
              { icon: CheckCircle, label: 'Approved', value: election.approvedCandidateCount },
              { icon: TrendingUp, label: 'Votes Cast', value: election.voteCount },
              { icon: Clock, label: 'Positions', value: election.positions.length },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
                <s.icon className="w-5 h-5 text-brand-600 mx-auto mb-2" />
                <div className="text-2xl font-black text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Countdown */}
          {election.status === 'draft' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800">Nominations open</p>
                <p className="text-yellow-700 text-xs mt-0.5">Election starts: {new Date(election.startTime).toLocaleString('en-NG')}</p>
              </div>
              <div className="ml-auto">
                <Countdown target={election.startTime} label="Starts in" />
              </div>
            </div>
          )}
          {election.status === 'active' && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse flex-shrink-0" />
              <p className="font-semibold text-brand-800">Voting is live</p>
              <div className="ml-auto">
                <Countdown target={election.endTime} label="Closes in" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Candidates tab */}
      {tab === 'candidates' && (
        <div className="space-y-5">
          {Object.keys(byPosition).length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">No nominations yet</p>
              <p className="text-sm text-gray-400 mt-1">Students will submit nominations when the election opens.</p>
            </div>
          ) : (
            Object.entries(byPosition).map(([position, candidates]) => (
              <div key={position} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">{position}</h3>
                  <span className="text-xs text-gray-400">{candidates.filter((c) => c.isApproved).length} / {candidates.length} approved</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {candidates.map((c) => (
                    <div key={c.id} className="flex items-start gap-4 px-5 py-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {c.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{c.studentName}</p>
                        <p className="text-xs text-gray-400">{c.studentUserId}</p>
                        {c.manifesto && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{c.manifesto}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.isApproved ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                            <CheckCircle className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <>
                            <button onClick={() => void handleReview(c.id, true)}
                              className="text-xs font-bold text-brand-700 border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors">
                              Approve
                            </button>
                            <button onClick={() => void handleReview(c.id, false)}
                              className="text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Results tab */}
      {tab === 'results' && (
        <ResultsTab results={election.results} election={election} />
      )}
    </div>
  );
}

function ResultsTab({ results, election }: { results: CandidateResult[] | null; election: ElectionDetail }) {
  if (!results || results.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
        <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">
          {election.status === 'draft' || election.status === 'active'
            ? 'Results will appear after voting closes'
            : 'No votes have been cast'}
        </p>
      </div>
    );
  }

  const byPosition = results.reduce((acc, r) => {
    if (!acc[r.position]) acc[r.position] = [];
    acc[r.position].push(r);
    return acc;
  }, {} as Record<string, CandidateResult[]>);

  return (
    <div className="space-y-5">
      {election.status !== 'results_published' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 font-semibold">
          ⚠️ Results are only visible to admin until published. Publish to show students.
        </div>
      )}
      {Object.entries(byPosition).map(([position, candidates]) => (
        <div key={position} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">{position}</h3>
            <span className="text-xs text-gray-400">{candidates.reduce((s, c) => s + c.voteCount, 0)} total votes</span>
          </div>
          <div className="p-5 space-y-3">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                  {c.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900 truncate">{c.studentName}</span>
                    {c.isWinner && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <Trophy className="w-2.5 h-2.5" /> Winner
                      </span>
                    )}
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${c.isWinner ? 'bg-brand-600' : 'bg-gray-300'}`}
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black text-gray-900">{c.voteCount}</div>
                  <div className="text-[10px] text-gray-400">{c.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
