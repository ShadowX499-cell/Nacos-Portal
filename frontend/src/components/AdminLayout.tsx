import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Lock, LayoutDashboard, Users, BookOpen, Vote, Fingerprint, Bell, Settings, Shield, ClipboardList, TrendingUp, CalendarDays, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NacosLogo from './NacosLogo';
import type { SuperAdminType } from '../types';

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
  phase: string | null;
  hodOnly?: boolean;
  revenueAllowed?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',   to: '/admin/dashboard',  phase: null },
      { icon: Users,           label: 'Students',    to: '/admin/users',      phase: null },
      { icon: BookOpen,        label: 'Gradebooks',  to: '/admin/gradebooks', phase: null },
    ],
  },
  {
    label: 'Modules',
    items: [
      { icon: Vote,         label: 'Elections',     to: '/admin/elections',     phase: null },
      { icon: FileText,     label: 'Registrations', to: '/admin/registrations', phase: null },
      { icon: Fingerprint,  label: 'Attendance',    to: '/admin/attendance',    phase: 'Phase 4' },
      { icon: CalendarDays, label: 'Academic Calendar', to: '/admin/academic',  phase: null, hodOnly: true },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: Bell,          label: 'Notifications', to: '/admin/notifications', phase: null },
      { icon: TrendingUp,    label: 'Revenue',       to: '/admin/revenue',       phase: null, revenueAllowed: true },
      { icon: ClipboardList, label: 'Audit Logs',    to: '/admin/audit-logs',    phase: null },
      { icon: Shield,        label: 'Super Admins',  to: '/admin/super-admins',  phase: null, hodOnly: true },
      { icon: Settings,      label: 'Settings',      to: '/admin/settings',      phase: null },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':      'Dashboard',
  '/admin/users/new':      'Add Student',
  '/admin/users':          'Students',
  '/admin/gradebooks/new': 'New Gradebook',
  '/admin/gradebooks':     'Gradebooks',
  '/admin/elections':      'Elections',
  '/admin/registrations':  'Registrations',
  '/admin/attendance':     'Attendance',
  '/admin/notifications':  'Notifications',
  '/admin/audit-logs':     'Audit Logs',
  '/admin/activity':       'Activity Feed',
  '/admin/settings':       'Settings',
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const superAdminType = user?.superAdminType as SuperAdminType | null;
  const isHod = superAdminType === 'hod';
  const canViewRevenue = isHod || superAdminType === 'course_adviser';

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  const pageTitle = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'Admin';

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 flex-shrink-0">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
          <NacosLogo size={28} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-base leading-tight truncate">NACOS Portal</p>
          <p className="text-white/40 text-xs">AIFUE · Admin</p>
        </div>
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
            <p className="px-3 mb-1 text-white/40 text-[11px] font-bold uppercase tracking-widest">
              {section.label}
            </p>
            {section.items.filter((item) => {
              if (item.hodOnly) return isHod;
              if (item.revenueAllowed) return canViewRevenue;
              return true;
            }).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin/dashboard'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold ring-1 ring-white/10'
                      : 'text-white/65 hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.phase && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-white/30 bg-white/8 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    {item.phase}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-white/10 flex-shrink-0">
        <Link to="/admin/profile" onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name || 'Admin'}</p>
            <p className="text-white/50 text-xs truncate">{user?.userId}</p>
          </div>
        </Link>
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

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-56 flex-col flex-shrink-0 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #052e16 0%, #14532d 100%)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(180deg, #052e16 0%, #14532d 100%)' }}
          >
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-sm text-gray-500">
              Admin <span className="text-gray-300 mx-1">›</span>
              <span className="font-semibold text-gray-900">{pageTitle}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full border border-brand-200 capitalize">
              {user?.role?.replace('_', ' ')}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">
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
