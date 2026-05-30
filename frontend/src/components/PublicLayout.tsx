import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Mail, Phone, MapPin } from 'lucide-react';
import NacosLogo from './NacosLogo';

const NAV_LINKS = [
  { label: 'Home',       href: '/' },
  { label: 'About',      href: '/about' },
  { label: 'Executives', href: '/executives' },
  { label: 'Events',     href: '/events' },
  { label: 'Gallery',    href: '/gallery' },
  { label: 'Blog',       href: '/blog' },
  { label: 'Contact',    href: '/contact' },
];

const FOOTER_ABOUT = [
  { text: 'Our History',    href: '/about' },
  { text: 'Meet the Team',  href: '/executives' },
  { text: 'Our Mission',    href: '/about' },
  { text: 'Careers',        href: '/contact' },
];

const FOOTER_SERVICES = [
  { text: 'Technical Training',  href: '/about' },
  { text: 'Hackathons',          href: '/events' },
  { text: 'Career Development',  href: '/events' },
  { text: 'National Network',    href: '/about' },
];

const FOOTER_HELP = [
  { text: 'FAQs',                href: '/contact' },
  { text: 'Student Support',     href: '/contact' },
  { text: 'Contact Us',          href: '/contact', live: true },
];

const CONTACT_INFO = [
  { icon: Mail,   text: 'nacos@aifue.edu.ng',                  href: 'mailto:nacos@aifue.edu.ng' },
  { icon: Phone,  text: '+234 803 123 4567',                    href: 'tel:+2348031234567' },
  { icon: MapPin, text: 'CS Dept, AIFUE, Owerri, Imo State',   href: '#', isAddress: true },
];

// Inline social icon SVGs (lucide-react 1.x removed brand icons)
function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}
function IconTwitterX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}
function IconYoutube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.4 19.54C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
    </svg>
  );
}

const SOCIAL_LINKS = [
  { icon: IconFacebook,  label: 'Facebook',  href: 'https://facebook.com/nacos-aifue' },
  { icon: IconInstagram, label: 'Instagram', href: 'https://instagram.com/nacos-aifue' },
  { icon: IconTwitterX,  label: 'X/Twitter', href: 'https://twitter.com/nacos_aifue' },
  { icon: IconYoutube,   label: 'YouTube',   href: '#' },
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
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-white border-b border-gray-200'
      }`}>
        <nav className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <NacosLogo size={40} />
            <div>
              <p className="font-bold text-sm leading-tight text-brand-900">NACOS AIFUE</p>
              <p className="text-xs text-brand-600">Computer Science Chapter</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} to={l.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? 'text-brand-700 font-semibold'
                    : 'text-gray-600 hover:text-brand-700'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth/login" className="text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors">
              Sign In
            </Link>
            <Link to="/auth/validate"
              className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
              Join Us →
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Toggle menu">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-2 shadow-lg">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} to={l.href} onClick={() => setMenuOpen(false)}
                className={`block text-sm font-medium py-1.5 ${
                  pathname === l.href ? 'text-brand-700 font-semibold' : 'text-gray-700 hover:text-brand-700'
                }`}>
                {l.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 flex gap-2">
              <Link to="/auth/login" className="flex-1 text-center text-sm font-medium text-brand-700 border border-brand-200 py-2 rounded-lg">Sign In</Link>
              <Link to="/auth/validate" className="flex-1 text-center bg-brand-700 text-white text-sm font-semibold py-2 rounded-lg">Join Us</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 pt-[65px]">
        <Outlet />
      </main>

      {/* ── 4-Column Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-brand-900 mt-0 w-full">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 mb-12">
            {/* Brand column */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <NacosLogo size={44} className="ring-2 ring-brand-600/40" />
                <div>
                  <span className="text-white font-bold text-base block">NACOS AIFUE</span>
                  <span className="text-brand-400 text-xs">Computer Science Chapter</span>
                </div>
              </div>
              <p className="text-brand-300 text-sm leading-relaxed max-w-xs mb-6">
                Advancing computing knowledge, fostering unity, and building the next generation of technology
                leaders at Alvan Ikoku Federal University of Education, Owerri. Est. 2010.
              </p>
              {/* Social links */}
              <ul className="flex gap-4">
                {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-brand-400 hover:text-white transition-colors" aria-label={label}>
                      <Icon />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Link columns */}
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:col-span-2">
              {/* About */}
              <div className="text-center sm:text-left">
                <p className="text-white text-sm font-semibold mb-5">About Us</p>
                <ul className="space-y-3 text-sm">
                  {FOOTER_ABOUT.map(({ text, href }) => (
                    <li key={text}>
                      <Link to={href} className="text-brand-300 hover:text-white transition-colors">{text}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Programmes */}
              <div className="text-center sm:text-left">
                <p className="text-white text-sm font-semibold mb-5">Programmes</p>
                <ul className="space-y-3 text-sm">
                  {FOOTER_SERVICES.map(({ text, href }) => (
                    <li key={text}>
                      <Link to={href} className="text-brand-300 hover:text-white transition-colors">{text}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div className="text-center sm:text-left">
                <p className="text-white text-sm font-semibold mb-5">Contact Us</p>
                <ul className="space-y-3 text-sm">
                  {CONTACT_INFO.map(({ icon: Icon, text, href, isAddress }) => (
                    <li key={text}>
                      <a href={href} className="flex items-start justify-center sm:justify-start gap-2 text-brand-300 hover:text-white transition-colors">
                        <Icon className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                        {isAddress
                          ? <address className="not-italic text-left">{text}</address>
                          : <span>{text}</span>
                        }
                      </a>
                    </li>
                  ))}
                  {/* Helpful links */}
                  {FOOTER_HELP.map(({ text, href, live }) => (
                    <li key={text}>
                      <Link to={href} className="flex items-center justify-center sm:justify-start gap-1.5 text-brand-300 hover:text-white transition-colors">
                        <span>{text}</span>
                        {live && (
                          <span className="relative flex size-2 ml-1">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-brand-400" />
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-brand-800 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-400">
              <p>© {year} NACOS-AIFUE. All rights reserved. Computer Science Dept, AIFUE, Owerri.</p>
              <p>We Develop · We Create · We Build Capacity</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
