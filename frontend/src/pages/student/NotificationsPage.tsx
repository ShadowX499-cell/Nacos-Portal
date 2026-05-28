import { useEffect, useState } from 'react';
import { notificationsApi, extractApiError } from '../../api/client';
import type { Notification } from '../../types';

const TYPE_ICONS: Record<string, string> = {
  result: '📋',
  payment: '💳',
  election: '🗳️',
  system: '⚙️',
  general: '📣',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    notificationsApi.list()
      .then((r) => setNotifications(r.data.data))
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Department announcements and alerts</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => void handleMarkAll()} className="btn-secondary btn-sm">
            Mark all as read
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="card p-8 text-center text-gray-400">Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-gray-500">No notifications yet.</p>
          <p className="text-sm text-gray-400 mt-1">Department announcements will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => void handleMarkRead(n.id)}
              className={`card p-4 cursor-pointer transition-colors hover:shadow-md border-l-4 ${
                n.isRead ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? '📣'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm ${n.isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
                      {n.title}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{n.body}</p>
                </div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
