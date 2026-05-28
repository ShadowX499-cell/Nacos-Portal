import { useEffect, useState } from 'react';
import { schoolFeesApi, extractApiError } from '../../api/client';
import type { SchoolFeesStatus } from '../../types';

export default function SchoolFeesPage() {
  const [feesStatus, setFeesStatus] = useState<SchoolFeesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    schoolFeesApi.getStatus()
      .then((r) => setFeesStatus(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handlePay = async () => {
    if (!feesStatus) return;
    setPaying(true);
    try {
      const res = await schoolFeesApi.initiate(feesStatus.currentSession);
      window.location.href = res.data.data.authorization_url;
    } catch (err) {
      setError(extractApiError(err));
      setPaying(false);
    }
  };

  const isPaid = feesStatus?.status === 'success';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">School Fees</h1>
      <p className="text-sm text-gray-500 mb-6">Pay and manage your tuition fees</p>

      {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="card p-8 text-center text-gray-400">Loading…</div>
      ) : feesStatus ? (
        <>
          <div className={`card p-6 mb-4 border-l-4 ${isPaid ? 'border-green-500' : 'border-orange-400'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Current Session</p>
                <p className="text-lg font-bold text-gray-900">{feesStatus.currentSession}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Amount: <span className="font-semibold text-gray-900">₦{feesStatus.amount.toLocaleString()}</span>
                </p>
              </div>
              <span className={`badge text-sm px-3 py-1 ${isPaid ? 'badge-green' : 'badge-yellow'}`}>
                {isPaid ? '✅ Paid' : '⚠️ Unpaid'}
              </span>
            </div>

            {isPaid && feesStatus.paidAt && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                <p>Paid on: <strong>{new Date(feesStatus.paidAt).toLocaleDateString()}</strong></p>
                <p className="font-mono text-xs text-gray-400 mt-0.5">Ref: {feesStatus.reference}</p>
              </div>
            )}

            {!isPaid && (
              <button
                onClick={() => void handlePay()}
                disabled={paying}
                className="btn-primary mt-4 w-full disabled:opacity-60"
              >
                {paying ? 'Redirecting to payment…' : `Pay ₦${feesStatus.amount.toLocaleString()} Now`}
              </button>
            )}
          </div>

          <div className="card p-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              School fees payments are processed securely via Paystack. After payment, your receipt will be
              available on this page. For queries, contact the department office.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
