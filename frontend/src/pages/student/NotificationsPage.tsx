import { useEffect, useState } from 'react';
import { notificationsApi, extractApiError } from '../../api/client';
import type { Notification } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, Users, X, ChevronRight } from 'lucide-react';

// ── Upcoming events (mirrors Dashboard list) ──────────────────────────────────
const UPCOMING_EVENTS = [
  {
    id: 'evt-1',
    date: { month: 'JUN', day: '14', full: 'June 14, 2025' },
    title: 'NACOS Week 2025 Kick-off',
    location: 'Main Auditorium',
    time: '10:00 AM',
    tag: 'Free',
    description: 'The official opening of NACOS Week 2025. All students welcome — keynote address, departmental parade, and cultural performances. Refreshments provided.',
    organizer: 'NACOS Executive Council',
  },
  {
    id: 'evt-2',
    date: { month: 'JUN', day: '21', full: 'June 21, 2025' },
    title: 'Tech Showcase & Exhibition',
    location: 'CS Department',
    time: '9:00 AM – 4:00 PM',
    tag: 'Free',
    description: 'Students showcase semester projects. Industry judges from top Nigerian tech companies attend. Top 3 projects win cash prizes and internship placements.',
    organizer: 'NACOS Tech Committee',
  },
  {
    id: 'evt-3',
    date: { month: 'JUL', day: '05', full: 'July 5, 2025' },
    title: 'Executive Elections 2025',
    location: 'University Hall',
    time: '8:00 AM – 5:00 PM',
    tag: 'Members',
    description: 'Vote for the next NACOS executive team. Open to all paid-up NACOS members. Bring your student ID and ensure your NACOS Due is cleared before the election date.',
    organizer: 'NACOS Electoral Committee',
  },
];

type EventItem = typeof UPCOMING_EVENTS[number];

// ── Notification type icons ───────────────────────────────────────────────────
const TYPE_ICONS: Record<string, string> = {
  result: '📋', payment: '💳', election: '🗳️', system: '⚙️', general: '📣',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Event detail panel ────────────────────────────────────────────────────────
function EventDetail({ event, onClose }: { event: EventItem; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="bg-white rounded-2xl border border-brand-200 shadow-lg overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
        style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="text-center bg-white/15 rounded-xl px-3 py-2 min-w-[46px]">
            <p className="text-[9px] font-bold text-brand-300 uppercase">{event.date.month}</p>
            <p className="text-xl font-black text-white leading-none">{event.date.day}</p>
          </div>
          <div>
            <p className="text-xs text-brand-300">{event.date.full}</p>
            <p className="text-sm font-bold text-white leading-tight">{event.title}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <MapPin className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Venue</p>
              <p className="text-xs font-semibold text-gray-800">{event.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <Clock className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Time</p>
              <p className="text-xs font-semibold text-gray-800">{event.time}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <Users className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
          <div>
            <p className="text-[9px] text-gray-400 font-bold uppercase">Organizer</p>
            <p className="text-xs font-semibold text-gray-800">{event.organizer}</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{event.description}</p>
        <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full ${
          event.tag === 'Free' ? 'bg-brand-100 text-brand-700' : 'bg-blue-100 text-blue-700'
        }`}>{event.tag}</span>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [dismissedEvents, setDismissedEvents] = useState<Set<string>>(new Set());

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
  const visibleEvents = UPCOMING_EVENTS.filter((e) => !dismissedEvents.has(e.id));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Announcements and upcoming events</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => void handleMarkAll()}
            className="text-xs font-semibold text-brand-700 border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* ── Upcoming Events section ── */}
      {visibleEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">📅 Upcoming Events</h2>
            <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
              {visibleEvents.length} upcoming
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {visibleEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-4 px-5 py-3">
                {/* Date badge */}
                <div className="text-center bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 flex-shrink-0 min-w-[52px]">
                  <div className="text-[9px] font-bold text-brand-600 uppercase tracking-wide">{ev.date.month}</div>
                  <div className="font-black text-brand-900 text-lg leading-none">{ev.date.day}</div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <MapPin className="w-2.5 h-2.5" />{ev.location}
                    </span>
                    <span className="text-gray-200">·</span>
                    <span className="text-[10px] text-gray-400">{ev.time}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ev.tag === 'Free' ? 'bg-brand-100 text-brand-700' : 'bg-blue-100 text-blue-700'
                  }`}>{ev.tag}</span>
                  <button
                    onClick={() => setActiveEvent(activeEvent?.id === ev.id ? null : ev)}
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      activeEvent?.id === ev.id
                        ? 'bg-brand-700 text-white border-brand-700'
                        : 'text-brand-700 border-brand-200 hover:bg-brand-50'
                    }`}
                  >
                    {activeEvent?.id === ev.id ? 'Close' : 'Details'}
                    {activeEvent?.id !== ev.id && <ChevronRight className="w-2.5 h-2.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setDismissedEvents((prev) => new Set([...prev, ev.id]));
                      if (activeEvent?.id === ev.id) setActiveEvent(null);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Inline event detail panel */}
          <AnimatePresence>
            {activeEvent && (
              <div className="px-5 pb-5">
                <EventDetail event={activeEvent} onClose={() => setActiveEvent(null)} />
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Notifications section ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">🔔 Notifications</h2>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="w-6 h-6 rounded-full border-3 border-gray-200 border-t-brand-600 animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm font-medium text-gray-700">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">Department announcements will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => void handleMarkRead(n.id)}
                className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !n.isRead ? 'bg-blue-50/40' : ''
                }`}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? '📣'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.body}</p>
                </div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
