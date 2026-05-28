import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi, extractApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { DashboardStats } from '../../types';

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  href?: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getDashboard()
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const statCards: StatCard[] = stats
    ? [
        {
          label: 'Total Students',
          value: stats.totalStudents,
          icon: '👥',
          color: 'bg-blue-50 border-blue-200',
          href: '/admin/users',
        },
        {
          label: 'Pending Activations',
          value: stats.pendingValidations,
          icon: '⏳',
          color: 'bg-yellow-50 border-yellow-200',
          href: '/admin/users?status=pending',
        },
        {
          label: 'Active Elections',
          value: stats.activeElections,
          icon: '🗳️',
          color: 'bg-green-50 border-green-200',
        },
        {
          label: 'Unpublished Results',
          value: stats.unpublishedResults,
          icon: '📋',
          color: 'bg-purple-50 border-purple-200',
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-brand-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-brand-800 font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-lg">NACOS-AIFUE Admin</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-brand-200">{user?.name || user?.userId}</span>
          <button
            onClick={() => void logout()}
            className="text-brand-200 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page heading */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Welcome back, {user?.name || user?.userId}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/users/new')}
              className="btn-primary"
            >
              + Add Student
            </button>
          </div>
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-8 w-8 bg-gray-200 rounded-full mb-3" />
                <div className="h-7 bg-gray-200 rounded w-16 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-28" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-8">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {statCards.map((card) =>
              card.href ? (
                <Link key={card.label} to={card.href} className={`card p-6 border ${card.color} hover:shadow-md transition-shadow`}>
                  <div className="text-3xl mb-2">{card.icon}</div>
                  <div className="text-3xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-sm text-gray-600 mt-1">{card.label}</div>
                </Link>
              ) : (
                <div key={card.label} className={`card p-6 border ${card.color}`}>
                  <div className="text-3xl mb-2">{card.icon}</div>
                  <div className="text-3xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-sm text-gray-600 mt-1">{card.label}</div>
                </div>
              )
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Add Student', icon: '👤', href: '/admin/users/new' },
              { label: 'View Students', icon: '📋', href: '/admin/users' },
              { label: 'Gradebooks', icon: '📚', href: '#', disabled: true },
              { label: 'Elections', icon: '🗳️', href: '#', disabled: true },
            ].map((action) =>
              action.disabled ? (
                <div
                  key={action.label}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 opacity-40 cursor-not-allowed text-center"
                >
                  <span className="text-2xl">{action.icon}</span>
                  <span className="text-xs font-medium text-gray-600">{action.label}</span>
                  <span className="text-xs text-gray-400">Phase 2</span>
                </div>
              ) : (
                <Link
                  key={action.label}
                  to={action.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all text-center"
                >
                  <span className="text-2xl">{action.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{action.label}</span>
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
