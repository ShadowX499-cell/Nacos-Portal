import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resultsApi, paymentsApi, extractApiError } from '../../api/client';
import type { ResultListItem } from '../../types';
import { CheckCircle, AlertCircle, CreditCard, FileText } from 'lucide-react';

const RESULT_FEE = 1000;

const RESULT_BENEFITS = [
  'Full course-by-course grade breakdown (CA + Exam + Total)',
  'Semester GPA (SGPA) and cumulative CGPA calculation',
  'Credit units earned per course and overall',
  'Official grade classification (A–F) for each subject',
  'Printable result sheet for personal records',
];

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

  const paidResults   = results.filter((r) => r.hasPaid);
  const unpaidResults = results.filter((r) => !r.hasPaid);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-sm text-gray-500 mt-1">
          Subscribe to each semester result for ₦{RESULT_FEE.toLocaleString()} to unlock your full grade sheet.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Transcript activation banner — only when some are paid */}
      {!loading && paidResults.length > 0 && (
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
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="font-bold text-gray-800 text-lg">No results published yet</p>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Your department admin will publish semester results here. Once available, you can pay
            ₦{RESULT_FEE.toLocaleString()} per semester to unlock your full grade sheet.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-5 py-3 text-sm text-brand-700 font-medium">
            <span>💡</span> Check back after end-of-semester exams
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {results.map((item) => {
            const isPaid = item.hasPaid;
            return (
              <div
                key={item.gradebookId}
                className={`bg-white rounded-2xl border-2 shadow-sm p-6 ${
                  isPaid ? 'border-brand-500' : 'border-orange-400'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">
                      {item.session} · <span className="capitalize">{item.semester}</span> Semester
                    </p>
                    <p className="text-2xl font-bold text-gray-900 leading-tight">{item.gradebookName}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.level} &nbsp;·&nbsp; Subscription fee:{' '}
                      <span className="font-bold text-gray-900">₦{RESULT_FEE.toLocaleString()}</span>
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 ${
                    isPaid ? 'bg-brand-100 text-brand-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {isPaid ? (
                      <><CheckCircle className="w-4 h-4" /> Subscribed</>
                    ) : (
                      <><AlertCircle className="w-4 h-4" /> Locked</>
                    )}
                  </div>
                </div>

                {/* Benefits list */}
                <div className="bg-gray-50 rounded-xl p-4 mb-5">
                  <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
                    What you get with this result
                  </p>
                  <ul className="space-y-2">
                    {RESULT_BENEFITS.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-gray-600">
                        <CheckCircle className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action */}
                {isPaid ? (
                  <div className="space-y-3">
                    <Link
                      to={`/student/results/${item.gradebookId}`}
                      className="w-full flex items-center justify-center gap-3 bg-brand-700 hover:bg-brand-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-brand-900/20 text-sm"
                    >
                      <FileText className="w-5 h-5" />
                      View Full Result Sheet
                    </Link>
                    <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 mt-2">
                      <CheckCircle className="w-5 h-5 text-brand-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-brand-800">Result unlocked</p>
                        <p className="text-xs text-brand-600">
                          You have full access to this semester's result.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => void handlePay(item.gradebookId)}
                    disabled={payingId === item.gradebookId}
                    className="w-full flex items-center justify-center gap-3 bg-brand-700 hover:bg-brand-800 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-brand-900/20 text-sm"
                  >
                    {payingId === item.gradebookId ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Redirecting to payment…
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Pay ₦{RESULT_FEE.toLocaleString()} via Paystack
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      {!loading && results.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mt-5">
          <p className="text-xs text-gray-400 leading-relaxed">
            Result subscriptions are one-time payments per semester, processed securely via Paystack.
            For disputes, contact the NACOS Academic Secretary at{' '}
            <a href="mailto:academic@nacos-aifue.org" className="text-brand-700 font-medium hover:underline">
              academic@nacos-aifue.org
            </a>
          </p>
        </div>
      )}

      {/* Summary counts */}
      {!loading && results.length > 0 && (
        <div className="flex gap-3 mt-4">
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2 text-sm">
            <CheckCircle className="w-4 h-4 text-brand-600" />
            <span className="font-semibold text-brand-800">{paidResults.length}</span>
            <span className="text-brand-600">Subscribed</span>
          </div>
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2 text-sm">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-orange-700">{unpaidResults.length}</span>
            <span className="text-orange-600">Locked</span>
          </div>
        </div>
      )}
    </div>
  );
}
