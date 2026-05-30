import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { X, Menu, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/client';
import NacosLogo from './NacosLogo';

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { icon: '🏠', label: 'Dashboard',     to: '/student/dashboard' },
      { icon: '📋', label: 'My Results',    to: '/student/results' },
      { icon: '📈', label: 'Transcript',    to: '/student/transcript' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { icon: '💰', label: 'NACOS Due',     to: '/student/school-fees' },
      { icon: '💳', label: 'Payments',      to: '/student/payments' },
    ],
  },
  {
    label: 'Academic',
    items: [
      { icon: '📝', label: 'Registration',  to: '/student/registration' },
      { icon: '🗳️', label: 'Elections',     to: '/student/elections' },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: '🔔', label: 'Notifications', to: '/student/notifications', badge: true },
      { icon: '👤', label: 'Profile',       to: '/student/profile' },
    ],
  },
];

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    notificationsApi.getUnreadCount()
      .then((r) => setUnread(r.data.data.count))
      .catch(() => {});
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.userId?.slice(0, 2).toUpperCase() ?? 'ST');

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 flex-shrink-0">
        <NacosLogo size={36} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-white text-sm leading-tight truncate">NACOS Portal</p>
          <p className="text-white/40 text-[10px]">AIFUE · Student</p>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden ml-auto w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors flex-shrink-0"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-3 mb-1 text-white/30 text-[10px] font-bold uppercase tracking-widest">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/student/dashboard'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium mb-0.5 transition-all ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold ring-1 ring-white/10'
                      : 'text-white/55 hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                <span className="text-sm w-4 text-center flex-shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && unread > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/5 mb-1">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name || 'Student'}</p>
            <p className="text-white/40 text-[10px] truncate">{user?.userId}</p>
          </div>
        </div>
        <button
          onClick={() => void logout()}
          className="w-full text-left px-3 py-1.5 text-white/40 hover:text-white text-xs rounded-lg hover:bg-white/8 transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Desktop sidebar ───────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-col flex-shrink-0 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #052e16 0%, #14532d 100%)' }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ────────────────────────────────────────────── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(180deg, #052e16 0%, #14532d 100%)' }}
          >
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <NacosLogo size={28} className="md:hidden" />
              <p className="text-sm text-gray-500 hidden sm:block">
                NACOS Portal <span className="text-gray-300 mx-1">›</span>
                <span className="font-semibold text-gray-900">Student</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {user?.level && (
              <span className="hidden sm:block bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full border border-brand-200">
                {user.level} · {user.program}
              </span>
            )}
            {unread > 0 && (
              <NavLink to="/student/notifications"
                className="relative w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-brand-50 transition-colors">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              </NavLink>
            )}
            {/* Mobile avatar */}
            <div className="md:hidden w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
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
