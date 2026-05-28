import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { paymentsApi } from '../../api/client';

export default function PaymentVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');

  const reference = searchParams.get('reference');
  const returnTo = searchParams.get('returnTo') ?? '/student/results';

  useEffect(() => {
    if (!reference) { setStatus('failed'); return; }

    paymentsApi.verify(reference)
      .then((res) => {
        if (res.data.data.status === 'success') {
          setStatus('success');
          setTimeout(() => navigate(returnTo, { replace: true }), 2000);
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [reference, navigate, returnTo]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="card p-10 text-center max-w-sm w-full">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-800 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Verifying your payment…</p>
            <p className="text-sm text-gray-400 mt-1">Please wait</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <p className="text-gray-900 font-semibold text-lg">Payment successful!</p>
            <p className="text-sm text-gray-500 mt-1">Redirecting you…</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <p className="text-gray-900 font-semibold text-lg">Could not verify payment</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              If you completed payment, your access will be unlocked shortly.
            </p>
            <Link to={returnTo} className="btn-primary">Go back</Link>
          </>
        )}
      </div>
    </div>
  );
}
