import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi, extractApiError } from '../../api/client';
import type { User } from '../../types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  super_admin: 'Super Administrator',
};

export default function AdminProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    profileApi.getMe()
      .then((r) => setUser(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
    </div>
  );

  if (error || !user) return (
    <div className="p-6 text-center text-red-600">{error || 'Profile not found'}</div>
  );

  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500 font-mono">{user.userId}</p>
            <span className="inline-block mt-1 bg-brand-100 text-brand-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-4">
          <InfoRow label="Full Name" value={user.name} />
          <InfoRow label="Admin ID" value={user.userId} mono />
          <InfoRow label="Email Address" value={user.email} />
          {user.phone && <InfoRow label="Phone Number" value={user.phone} />}
          <InfoRow label="Role" value={ROLE_LABELS[user.role] ?? user.role} />
        </div>
      </div>

      {/* Account card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Account</h3>
        <Link to="/auth/forgot-password" className="text-sm text-brand-700 font-semibold hover:underline">
          Change Password →
        </Link>
        <p className="text-xs text-gray-400 mt-1">You'll be redirected to the password reset flow.</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
