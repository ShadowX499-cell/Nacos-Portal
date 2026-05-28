import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi, extractApiError } from '../../api/client';
import type { User } from '../../types';

const LEVEL_LABELS: Record<string, string> = {
  L100: '100 Level', L200: '200 Level', L300: '300 Level', L400: '400 Level',
};
const PROGRAM_LABELS: Record<string, string> = {
  CSC: 'Computer Science',
  ICT: 'Information Technology',
  CRE: 'Computer & Robotics Engineering',
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    profileApi.getMe()
      .then((r) => setUser(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-400">Loading profile…</div>;
  if (error || !user) return <div className="p-6 text-center text-red-600">{error || 'Profile not found'}</div>;

  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="card p-6 mb-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-brand-800 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.userId}</p>
            <span className={`badge mt-1 ${user.status === 'validated' ? 'badge-green' : 'badge-yellow'}`}>
              {user.status}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-4">
          <InfoRow label="Full Name" value={user.name} />
          <InfoRow label="Student ID" value={user.userId} mono />
          <InfoRow label="Email Address" value={user.email} />
          <InfoRow label="Phone Number" value={user.phone ?? '—'} />
          <InfoRow label="Programme" value={PROGRAM_LABELS[user.program] ?? user.program} />
          <InfoRow label="Current Level" value={LEVEL_LABELS[user.level] ?? user.level} />
        </div>
      </div>

      {/* Account actions */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Account</h3>
        <Link to="/auth/forgot-password" className="text-sm text-brand-800 font-medium hover:underline">
          Change Password →
        </Link>
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
