import { useEffect, useState } from 'react';
import { paymentsApi, extractApiError } from '../../api/client';
import type { Payment } from '../../types';

const STATUS_BADGE: Record<string, string> = {
  success: 'badge-green',
  pending: 'badge-yellow',
  failed: 'badge-red',
  refunded: 'badge-blue',
};

const TYPE_LABELS: Record<string, string> = {
  result_subscription: 'Result Subscription',
  school_fees: 'NACOS Due',
  nacos_dues: 'NACOS Due',
  other: 'Other',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentsApi.history()
      .then((r) => setPayments(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment History</h1>
      <p className="text-sm text-gray-500 mb-6">All your result subscription and fee payments</p>

      {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="card p-8 text-center text-gray-400">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">💳</div>
          <p className="text-gray-500">No payments yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Period</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Reference</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{TYPE_LABELS[p.type] ?? p.type}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {p.sessionYear ?? '—'}{p.semester ? ` · ${p.semester}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ₦{p.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.reference.slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-blue'}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
