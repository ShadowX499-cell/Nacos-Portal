import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resultsApi, paymentsApi, extractApiError } from '../../api/client';
import type { ResultListItem } from '../../types';

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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-sm text-gray-500 mt-0.5">View and download your semester results</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-6">{error}</div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-gray-400">Loading…</div>
      ) : results.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          No published results available yet.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((item) => (
            <div
              key={item.gradebookId}
              className={`card p-4 flex items-center justify-between border-l-4 ${
                item.hasPaid ? 'border-green-500' : 'border-gray-300'
              }`}
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">{item.gradebookName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.level} &middot; {item.session} &middot;{' '}
                  <span className="capitalize">{item.semester}</span> Semester
                </p>
              </div>
              <div className="flex items-center gap-3">
                {item.hasPaid ? (
                  <Link
                    to={`/student/results/${item.gradebookId}`}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    View Result
                  </Link>
                ) : (
                  <button
                    onClick={() => void handlePay(item.gradebookId)}
                    disabled={payingId === item.gradebookId}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60"
                  >
                    {payingId === item.gradebookId ? 'Redirecting…' : 'Pay ₦500'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
