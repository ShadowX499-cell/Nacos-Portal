import { useEffect, useState } from 'react';
import { schoolFeesApi, extractApiError } from '../../api/client';
import type { SchoolFeesStatus } from '../../types';
import { CheckCircle, AlertCircle, CreditCard, Receipt, X, Printer } from 'lucide-react';
import NacosLogo from '../../components/NacosLogo';

const NACOS_DUE_AMOUNT = 3000;

// ── Receipt Modal ─────────────────────────────────────────────────────────────
function ReceiptModal({ feesStatus, onClose }: { feesStatus: SchoolFeesStatus; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Modal toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-800">Payment Receipt</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-brand-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-brand-300 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Receipt body */}
        <div id="nacos-receipt" className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-dashed border-gray-200">
            <NacosLogo size={40} className="flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900 text-sm">NACOS — AIFUE</p>
              <p className="text-xs text-gray-500">Computer Science Department</p>
              <p className="text-xs text-gray-400">Aifue University, Nigeria</p>
            </div>
          </div>

          <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            Official Payment Receipt
          </p>

          {/* Details grid */}
          <div className="space-y-3 mb-5">
            {[
              { label: 'Payment Type', value: 'NACOS Departmental Due' },
              { label: 'Academic Session', value: feesStatus.currentSession },
              { label: 'Amount Paid', value: `₦${NACOS_DUE_AMOUNT.toLocaleString()}.00` },
              { label: 'Payment Status', value: 'Successful ✅' },
              {
                label: 'Date Paid',
                value: feesStatus.paidAt
                  ? new Date(feesStatus.paidAt).toLocaleDateString('en-NG', { dateStyle: 'long' })
                  : '—',
              },
              { label: 'Reference', value: feesStatus.reference ?? '—' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-start gap-3">
                <span className="text-xs text-gray-500 flex-shrink-0">{row.label}</span>
                <span className="text-xs font-semibold text-gray-900 text-right break-all">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-dashed border-gray-200 pt-4 text-center">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              This receipt is computer-generated and valid without a signature.<br />
              For enquiries: <span className="text-brand-700">finance@nacos-aifue.org</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchoolFeesPage() {
  const [feesStatus, setFeesStatus] = useState<SchoolFeesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

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
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {showReceipt && feesStatus && (
        <ReceiptModal feesStatus={feesStatus} onClose={() => setShowReceipt(false)} />
      )}
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">NACOS Due</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pay your NACOS departmental dues to access all member benefits and the student portal.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-brand-600 animate-spin mx-auto mb-3" />
          Loading…
        </div>
      ) : feesStatus ? (
        <>
          {/* Status card */}
          <div className={`bg-white rounded-2xl border-2 shadow-sm p-6 mb-4 ${
            isPaid ? 'border-brand-500' : 'border-orange-400'
          }`}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Current Session</p>
                <p className="text-2xl font-bold text-gray-900">{feesStatus.currentSession}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Due Amount:{' '}
                  <span className="font-bold text-gray-900">
                    ₦{NACOS_DUE_AMOUNT.toLocaleString()}
                  </span>
                </p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm ${
                isPaid ? 'bg-brand-100 text-brand-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {isPaid ? (
                  <><CheckCircle className="w-4 h-4" /> Paid</>
                ) : (
                  <><AlertCircle className="w-4 h-4" /> Unpaid</>
                )}
              </div>
            </div>

            {/* Benefits list */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
                What you get with NACOS Due
              </p>
              <ul className="space-y-2">
                {[
                  'Access to NACOS student portal and all features',
                  'Eligibility to vote and contest in departmental elections',
                  'Free entry to NACOS Week workshops and events',
                  'NACOS membership certificate for the session',
                  'Priority access to career fairs and job placements',
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {isPaid ? (
              <div className="pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-600">
                {feesStatus.paidAt && (
                  <p>Paid on: <strong>{new Date(feesStatus.paidAt).toLocaleDateString('en-NG', { dateStyle: 'long' })}</strong></p>
                )}
                {feesStatus.reference && (
                  <p className="font-mono text-xs text-gray-400">Ref: {feesStatus.reference}</p>
                )}
                <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 mt-3">
                  <CheckCircle className="w-5 h-5 text-brand-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-brand-800">NACOS Due cleared for {feesStatus.currentSession}</p>
                    <p className="text-xs text-brand-600">You have full member access for this session.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReceipt(true)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-brand-300 text-brand-800 hover:bg-brand-50 font-semibold py-3 rounded-xl transition-all text-sm mt-1"
                >
                  <Receipt className="w-4 h-4" />
                  View Payment Receipt
                </button>
              </div>
            ) : (
              <button
                onClick={() => void handlePay()}
                disabled={paying}
                className="w-full flex items-center justify-center gap-3 bg-brand-700 hover:bg-brand-800 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-brand-900/20 text-sm"
              >
                {paying ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Redirecting to payment…
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay ₦{NACOS_DUE_AMOUNT.toLocaleString()} via Paystack
                  </>
                )}
              </button>
            )}
          </div>

          {/* Note */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              NACOS Due payments are processed securely via Paystack. Payment is per academic session.
              For payment issues, contact the NACOS Financial Secretary at{' '}
              <a href="mailto:finance@nacos-aifue.org" className="text-brand-700 font-medium hover:underline">
                finance@nacos-aifue.org
              </a>
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
