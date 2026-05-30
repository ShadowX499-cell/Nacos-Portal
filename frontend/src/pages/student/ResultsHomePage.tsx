import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resultsApi, paymentsApi, extractApiError } from '../../api/client';
import type { ResultListItem } from '../../types';
import { CheckCircle, AlertCircle, CreditCard, FileText, Lock } from 'lucide-react';

const RESULT_FEE = 1000;

export default function ResultsHomePage() {
  const [results, setResults] = useState<ResultListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    resultsApi.list()
      .then((res) => setResults(res.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handlePay = async (gradebookId: string) => {
    setPayingId(gradebookId);
    try {
      const res = await paymentsApi.initiate(gradebookId);
      window.location.href = res.data.data.authorization_url;
    } catch (err) {
      alert(extractApiError(err));
      setPayingId(null);
    }
  };

  const paidCount = results.filter((r) => r.hasPaid).length;
  const unpaidCount = results.filter((r) => !r.hasPaid).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pay ₦{RESULT_FEE.toLocaleString()} per semester to unlock and view your full result sheet.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Summary pills */}
      {!loading && results.length > 0 && (
        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2 text-sm">
            <CheckCircle className="w-4 h-4 text-brand-600" />
            <span className="font-semibold text-brand-800">{paidCount}</span>
            <span className="text-brand-600">Subscribed</span>
          </div>
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2 text-sm">
            <Lock className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-orange-700">{unpaidCount}</span>
            <span className="text-orange-600">Locked</span>
          </div>
        </div>
      )}

      {/* Transcript activation banner */}
      {!loading && paidCount > 0 && (
        <div className="bg-white border border-brand-200 rounded-2xl p-4 mb-5 flex items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-brand-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Official Transcript</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Request your cumulative academic transcript for all paid results.
              </p>
            </div>
          </div>
          <Link
            to="/student/transcript"
            className="flex-shrink-0 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            Request Transcript
          </Link>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-brand-600 animate-spin mx-auto mb-3" />
          Loading…
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">📂</div>
          <p className="font-semibold text-gray-700">No published results yet</p>
          <p className="text-sm text-gray-400 mt-1">Check back after your semester results are published.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((item) => (
            <div
              key={item.gradebookId}
              className={`bg-white rounded-2xl border-2 shadow-sm p-5 flex items-start justify-between gap-4 transition-all ${
                item.hasPaid ? 'border-brand-200' : 'border-gray-200'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.gradebookName}</p>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.hasPaid
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {item.hasPaid ? 'Subscribed' : 'Locked'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {item.level} · {item.session} · <span className="capitalize">{item.semester}</span> Semester
                </p>
                {!item.hasPaid && (
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Pay ₦{RESULT_FEE.toLocaleString()} to unlock full result sheet
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                {item.hasPaid ? (
                  <Link
                    to={`/student/results/${item.gradebookId}`}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-xl transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View Result
                  </Link>
                ) : (
                  <button
                    onClick={() => void handlePay(item.gradebookId)}
                    disabled={payingId === item.gradebookId}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {payingId === item.gradebookId ? (
                      <>
                        <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Redirecting…
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay ₦{RESULT_FEE.toLocaleString()}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      {!loading && results.length > 0 && (
        <p className="text-xs text-gray-400 mt-5 text-center">
          Result subscriptions are one-time payments per semester. Contact your admin for disputes.
        </p>
      )}
    </div>
  );
}
