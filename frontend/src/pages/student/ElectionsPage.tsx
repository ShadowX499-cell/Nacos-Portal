import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { electionsStudentApi, extractApiError } from '../../api/client';
import type { StudentElectionView, ElectionCandidate, CandidateResult } from '../../types';
import { Vote, Clock, CheckCircle, Trophy, AlertCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Countdown ─────────────────────────────────────────────────────────────────

function Countdown({ target }: { target: string }) {
  const [diff, setDiff] = useState(new Date(target).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setDiff(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (diff <= 0) return <span className="font-mono text-sm text-gray-500">Ended</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="font-mono text-sm font-bold text-brand-700">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

// ── Vote Modal ────────────────────────────────────────────────────────────────

function VoteModal({
  positions, candidates, onSubmit, onClose, submitting,
}: {
  positions: string[];
  candidates: ElectionCandidate[];
  onSubmit: (votes: { position: string; candidateId: string }[]) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const byPosition = positions.reduce((acc, p) => {
    acc[p] = candidates.filter((c) => c.position === p);
    return acc;
  }, {} as Record<string, ElectionCandidate[]>);

  const allSelected = positions.every((p) => !!selections[p]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)' }}>
          <div>
            <p className="text-white font-bold">Cast Your Vote</p>
            <p className="text-brand-300 text-xs mt-0.5">Select one candidate per position</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {positions.map((pos) => (
            <div key={pos}>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">{pos}</p>
              <div className="space-y-2">
                {byPosition[pos]?.map((c) => (
                  <label key={c.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selections[pos] === c.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-brand-300'
                    }`}>
                    <input type="radio" name={pos} value={c.id} className="hidden"
                      checked={selections[pos] === c.id}
                      onChange={() => setSelections((prev) => ({ ...prev, [pos]: c.id }))} />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                      {c.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.studentName}</p>
                      {c.manifesto && (
                        <p className="text-xs text-gray-500 truncate">{c.manifesto.slice(0, 60)}…</p>
                      )}
                    </div>
                    {selections[pos] === c.id && (
                      <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 flex-shrink-0">
          <button
            onClick={() => {
              if (allSelected) {
                onSubmit(positions.map((p) => ({ position: p, candidateId: selections[p] })));
              }
            }}
            disabled={!allSelected || submitting}
            className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 text-sm"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Submitting…
              </span>
            ) : allSelected ? 'Submit My Votes' : `Select all ${positions.length} positions to continue`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ElectionsPage() {
  const [view, setView] = useState<StudentElectionView | null | 'loading'>('loading');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [showNomForm, setShowNomForm] = useState<string | null>(null); // position
  const [nomManifesto, setNomManifesto] = useState('');
  const [nomPhoto, setNomPhoto] = useState('');
  const [nomSubmitting, setNomSubmitting] = useState(false);
  const [nomError, setNomError] = useState('');

  const load = () => {
    setView('loading');
    electionsStudentApi.getActive()
      .then((r) => setView(r.data.data))
      .catch((err) => { setError(extractApiError(err)); setView(null); });
  };

  useEffect(() => { load(); }, []);

  const handleVote = async (votes: { position: string; candidateId: string }[]) => {
    if (!view || view === 'loading' || !view.election) return;
    setVoting(true);
    try {
      await electionsStudentApi.vote(view.election.id, { votes });
      setVoteSuccess(true);
      setShowModal(false);
      load();
    } catch (err) {
      alert(extractApiError(err));
    } finally {
      setVoting(false);
    }
  };

  const handleNominate = async (position: string) => {
    if (!view || view === 'loading' || !view.election) return;
    if (!nomManifesto.trim() || nomManifesto.trim().length < 10) {
      setNomError('Manifesto must be at least 10 characters.');
      return;
    }
    setNomSubmitting(true);
    setNomError('');
    try {
      await electionsStudentApi.nominate(view.election.id, {
        position,
        manifesto: nomManifesto.trim(),
        photoUrl: nomPhoto.trim() || undefined,
      });
      setShowNomForm(null);
      setNomManifesto('');
      setNomPhoto('');
      load();
    } catch (err) {
      setNomError(extractApiError(err));
    } finally {
      setNomSubmitting(false);
    }
  };

  if (view === 'loading') {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  // No election for this student's level
  if (!view) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Departmental Elections</h1>
        <p className="text-sm text-gray-500 mb-8">Vote for your student union representatives</p>
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Vote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Elections</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            No elections are currently open for your level. You'll receive a notification when one opens.
          </p>
        </div>
      </div>
    );
  }

  const { election, candidates, myNominations, hasVoted, hasPaidDues, results } = view;
  const nomPositions = election.positions.filter(
    (p) => !myNominations.some((n) => n.position === p)
  );
  const byPosition = election.positions.reduce((acc, p) => {
    acc[p] = candidates.filter((c) => c.position === p);
    return acc;
  }, {} as Record<string, ElectionCandidate[]>);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {showModal && (
        <VoteModal
          positions={election.positions}
          candidates={candidates}
          onSubmit={handleVote}
          onClose={() => setShowModal(false)}
          submitting={voting}
        />
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Departmental Elections</h1>
      <p className="text-sm text-gray-500 mb-5">Vote for your student union representatives</p>

      {/* Election header card */}
      <div className="rounded-2xl overflow-hidden shadow-sm mb-5"
        style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)' }}>
        <div className="p-5">
          <p className="text-brand-300 text-xs font-bold uppercase tracking-widest mb-1">
            {election.status === 'draft' ? 'Nominations Open' :
             election.status === 'active' ? '🗳️ Voting Live' :
             election.status === 'closed' ? 'Voting Closed' : '✅ Results Published'}
          </p>
          <h2 className="text-white font-bold text-lg mb-2">{election.title}</h2>
          {election.description && (
            <p className="text-brand-300 text-xs mb-3">{election.description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <span className="text-xs text-brand-300">{election.positions.length} positions</span>
              <span className="text-xs text-brand-300">{election.approvedCandidateCount} candidates</span>
              <span className="text-xs text-brand-300">{election.voteCount} votes</span>
            </div>
            {election.status === 'active' && (
              <div className="text-right">
                <p className="text-[10px] text-brand-400 mb-0.5">Closes in</p>
                <Countdown target={election.endTime} />
              </div>
            )}
            {election.status === 'draft' && (
              <div className="text-right">
                <p className="text-[10px] text-brand-400 mb-0.5">Starts</p>
                <p className="text-xs text-brand-200">{new Date(election.startTime).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dues gate warning */}
      {!hasPaidDues && (election.status === 'draft' || election.status === 'active') && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-orange-800">NACOS Due required</p>
            <p className="text-xs text-orange-700 mt-0.5">Pay your NACOS dues to nominate or vote.</p>
          </div>
          <Link to="/student/school-fees"
            className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-orange-800 underline">
            Pay Now <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ── DRAFT: Nomination state ──────────────────────────────────────── */}
      {election.status === 'draft' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Positions</h2>
          {election.positions.map((pos) => {
            const myNom = myNominations.find((n) => n.position === pos);
            return (
              <div key={pos} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{pos}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {candidates.filter((c) => c.position === pos).length} nominee(s)
                    </p>
                  </div>
                  {myNom ? (
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                      myNom.isApproved
                        ? 'bg-brand-100 text-brand-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {myNom.isApproved ? '✅ Approved' : '⏳ Pending review'}
                    </span>
                  ) : hasPaidDues ? (
                    <button
                      onClick={() => setShowNomForm(showNomForm === pos ? null : pos)}
                      className="text-xs font-bold text-brand-700 border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Nominate Myself
                    </button>
                  ) : null}
                </div>
                <AnimatePresence>
                  {showNomForm === pos && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
                        {nomError && (
                          <p className="text-xs text-red-600">{nomError}</p>
                        )}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Manifesto *</label>
                          <textarea rows={4} value={nomManifesto} onChange={(e) => setNomManifesto(e.target.value)}
                            placeholder="Tell students why you're the best candidate for this position (min 10 characters)…"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Photo URL (optional)</label>
                          <input value={nomPhoto} onChange={(e) => setNomPhoto(e.target.value)}
                            placeholder="https://…"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setShowNomForm(null); setNomError(''); setNomManifesto(''); setNomPhoto(''); }}
                            className="flex-1 border border-gray-200 text-gray-600 text-xs font-semibold py-2.5 rounded-xl hover:bg-gray-50">
                            Cancel
                          </button>
                          <button onClick={() => void handleNominate(pos)} disabled={nomSubmitting}
                            className="flex-1 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60">
                            {nomSubmitting ? 'Submitting…' : 'Submit Nomination'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ACTIVE: Voting state ─────────────────────────────────────────── */}
      {election.status === 'active' && (
        <div className="space-y-4">
          {voteSuccess || hasVoted ? (
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 text-center">
              <CheckCircle className="w-10 h-10 text-brand-600 mx-auto mb-3" />
              <p className="font-bold text-brand-800 text-lg">Your vote has been cast!</p>
              <p className="text-brand-600 text-sm mt-1">Thank you for participating in the election.</p>
            </div>
          ) : hasPaidDues ? (
            <button onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-center gap-3 bg-brand-700 hover:bg-brand-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg text-sm">
              <Vote className="w-5 h-5" />
              Cast Your Vote
            </button>
          ) : null}

          {/* Candidate cards per position */}
          {election.positions.map((pos) => (
            <div key={pos} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">{pos}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {byPosition[pos]?.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-gray-400">No approved candidates for this position.</p>
                ) : (
                  byPosition[pos]?.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 px-5 py-4">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.studentName}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {c.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.studentName}</p>
                        <p className="text-xs text-gray-400">{c.studentUserId}</p>
                        {c.manifesto && (
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{c.manifesto}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CLOSED ──────────────────────────────────────────────────────── */}
      {election.status === 'closed' && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-700">Results are being tallied</p>
          <p className="text-sm text-gray-400 mt-1">Check back soon for the final results.</p>
        </div>
      )}

      {/* ── RESULTS PUBLISHED ────────────────────────────────────────────── */}
      {election.status === 'results_published' && results && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Final Results</h2>
          {election.positions.map((pos) => {
            const posResults = results.filter((r) => r.position === pos)
              .sort((a, b) => b.voteCount - a.voteCount);
            const winner = posResults.find((r) => r.isWinner);

            return (
              <div key={pos} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">{pos}</h3>
                </div>
                {winner && (
                  <div className="mx-5 mt-4 flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <Trophy className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Winner</p>
                      <p className="font-black text-gray-900">{winner.studentName}</p>
                      <p className="text-xs text-yellow-700">{winner.voteCount} votes · {winner.percentage}%</p>
                    </div>
                  </div>
                )}
                <div className="p-5 space-y-3">
                  {posResults.map((r) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                        {r.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{r.studentName}</p>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full rounded-full ${r.isWinner ? 'bg-brand-600' : 'bg-gray-300'}`}
                            style={{ width: `${r.percentage}%` }} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-black text-gray-900">{r.voteCount}</div>
                        <div className="text-[10px] text-gray-400">{r.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
