import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, GraduationCap, Mail, Phone } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home',       href: '/' },
  { label: 'About',      href: '/about' },
  { label: 'Executives', href: '/executives' },
  { label: 'Events',     href: '/events' },
  { label: 'Contact',    href: '/contact' },
];

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const year = new Date().getFullYear();

  useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100' : 'bg-white border-b border-gray-200'
      }`}>
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-brand-700 rounded-xl flex items-center justify-center shadow-md group-hover:bg-brand-800 transition-colors">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight text-brand-900">NACOS-AIFUE</p>
              <p className="text-xs text-brand-600">Towards Advanced Computing</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} to={l.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? 'text-brand-700 font-semibold'
                    : 'text-gray-600 hover:text-brand-700'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth/validate" className="text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors">
              Activate Account
            </Link>
            <Link to="/auth/login"
              className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Sign In →
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 shadow-lg">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} to={l.href} onClick={() => setMenuOpen(false)}
                className={`block text-sm font-medium py-1 ${
                  pathname === l.href ? 'text-brand-700 font-semibold' : 'text-gray-700 hover:text-brand-700'
                }`}>
                {l.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <Link to="/auth/validate" className="block text-sm font-medium text-brand-700 py-1">Activate Account</Link>
              <Link to="/auth/login" className="block w-full text-center bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
                Sign In
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 pt-[73px]">
        <Outlet />
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-brand-900 text-brand-300 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <p className="font-bold text-white text-sm">NACOS-AIFUE</p>
              </div>
              <p className="text-sm leading-relaxed max-w-xs mb-4">
                Alvan Ikoku Federal University of Education, Owerri — advancing computer science education since 2010.
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> nacos@aifue.edu.ng</div>
                <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> +234 803 123 4567</div>
              </div>
            </div>

            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-3">Website</p>
              <ul className="space-y-1.5 text-sm">
                {NAV_LINKS.map((l) => (
                  <li key={l.label}><Link to={l.href} className="hover:text-white transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-3">Portal</p>
              <ul className="space-y-1.5 text-sm">
                <li><Link to="/auth/login" className="hover:text-white transition-colors">Student Login</Link></li>
                <li><Link to="/auth/validate" className="hover:text-white transition-colors">Activate Account</Link></li>
                <li><Link to="/auth/forgot-password" className="hover:text-white transition-colors">Forgot Password</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-brand-700 pt-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <p>© {year} NACOS-AIFUE. All rights reserved.</p>
            <p className="text-brand-500">We Develop · We Create · We Build Capacity</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
