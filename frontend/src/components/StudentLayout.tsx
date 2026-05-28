import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/client';

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    notificationsApi.getUnreadCount()
      .then((r) => setUnread(r.data.data.count))
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.userId?.slice(0, 2).toUpperCase() ?? 'ST');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-56 bg-brand-800 flex flex-col flex-shrink-0 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-sm text-brand-800 flex-shrink-0">
            N
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight">NACOS Portal</p>
            <p className="text-white/40 text-xs">Student</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3">
          <Section label="Main">
            <Item icon="🏠" label="Dashboard" to="/student/dashboard" />
            <Item icon="📋" label="My Results" to="/student/results" />
            <Item icon="📈" label="Transcript" to="/student/transcript" />
          </Section>

          <Section label="Finance">
            <Item icon="🏫" label="School Fees" to="/student/school-fees" />
            <Item icon="💳" label="Payments" to="/student/payments" />
          </Section>

          <Section label="Academic">
            <Item icon="📝" label="Registration" to="/student/registration" />
            <Item icon="🗳️" label="Elections" to="/student/elections" />
          </Section>

          <Section label="Account">
            <Item icon="🔔" label="Notifications" to="/student/notifications" badge={unread > 0 ? unread : undefined} />
            <Item icon="👤" label="Profile" to="/student/profile" />
          </Section>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name || 'Student'}</p>
              <p className="text-white/40 text-xs truncate">{user?.userId}</p>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            className="w-full mt-1 text-left px-3 py-1.5 text-white/50 hover:text-white text-xs rounded-lg hover:bg-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-gray-500">
            NACOS Portal <span className="text-gray-300 mx-1">›</span>
            <span className="font-semibold text-gray-900">Student</span>
          </p>
          <div className="flex items-center gap-3">
            {user?.level && (
              <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                {user.level} · {user.program}
              </span>
            )}
            {unread > 0 && (
              <NavLink to="/student/notifications" className="relative text-lg leading-none">
                🔔
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              </NavLink>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="px-2 mb-1 text-white/35 text-xs font-bold uppercase tracking-widest">{label}</p>
      {children}
    </div>
  );
}

function Item({ icon, label, to, badge }: { icon: string; label: string; to: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === '/student/dashboard'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium mb-0.5 transition-colors ${
          isActive ? 'bg-white/15 text-white font-semibold' : 'text-white/65 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <span className="text-sm w-4 text-center flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}
