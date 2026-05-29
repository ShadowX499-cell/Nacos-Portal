import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu, X, BookOpen, Vote, Fingerprint, CreditCard, Bell, Users,
  ChevronRight, Mail, Phone, MapPin, GraduationCap, Calendar,
  Award, Target, Eye, Heart, ArrowRight, Star,
} from 'lucide-react';

// ── Data ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'About',      href: '#about' },
  { label: 'Portal',     href: '#portal' },
  { label: 'Executives', href: '#executives' },
  { label: 'Events',     href: '#events' },
  { label: 'Contact',    href: '#contact' },
];

const STATS = [
  { value: '500+', label: 'Registered Students' },
  { value: '3',    label: 'Programmes' },
  { value: '12+',  label: 'Annual Events' },
  { value: '2019', label: 'Founded' },
];

const VALUES = [
  { icon: Target,  title: 'Excellence',  desc: 'Pursuing the highest academic and professional standards in all endeavours.' },
  { icon: Heart,   title: 'Integrity',   desc: 'Building trust through honesty, transparency, and ethical conduct.' },
  { icon: Users,   title: 'Community',   desc: 'Fostering brotherhood, collaboration, and mutual support among members.' },
  { icon: Award,   title: 'Innovation',  desc: 'Embracing emerging technologies and forward-thinking solutions.' },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Academic Results',
    desc: 'View semester result slips, track your SGPA and CGPA — available after result subscription payment.',
    badge: 'Live',
    live: true,
  },
  {
    icon: Vote,
    title: 'Departmental Elections',
    desc: 'Participate in transparent NACOS elections with a cryptographically verified one-member-one-vote system.',
    badge: 'Phase 3',
    live: false,
  },
  {
    icon: Fingerprint,
    title: 'Biometric Attendance',
    desc: 'Fast fingerprint-based exam and lecture attendance tracking with real-time session reports.',
    badge: 'Phase 4',
    live: false,
  },
  {
    icon: CreditCard,
    title: 'Payments & Dues',
    desc: 'Pay school fees, NACOS dues and result subscriptions securely via Paystack. Download instant receipts.',
    badge: 'Live',
    live: true,
  },
  {
    icon: Bell,
    title: 'Notifications',
    desc: 'Receive real-time in-app notifications for results, elections, announcements, and events.',
    badge: 'Live',
    live: true,
  },
  {
    icon: Users,
    title: 'Student Management',
    desc: 'Admins register students, generate NACOS IDs, manage profiles and course registration approvals.',
    badge: 'Live',
    live: true,
  },
];

const EXECUTIVES = [
  { name: 'President',          role: 'President',             initials: 'PP' },
  { name: 'Vice President',     role: 'Vice President',        initials: 'VP' },
  { name: 'General Secretary',  role: 'General Secretary',     initials: 'GS' },
  { name: 'Financial Secretary', role: 'Financial Secretary',  initials: 'FS' },
  { name: 'PRO',                role: 'Public Relations',      initials: 'PR' },
  { name: 'Social Director',    role: 'Social Director',       initials: 'SD' },
];

const EVENTS = [
  {
    date: 'TBA',
    title: 'NACOS Week 2025',
    desc: 'Annual departmental week celebration with tech talks, hackathon, and cultural events.',
    tag: 'Upcoming',
  },
  {
    date: 'TBA',
    title: 'Executive Elections 2025',
    desc: 'Departmental elections for the 2025/2026 executive council. All registered members eligible to vote.',
    tag: 'Upcoming',
  },
  {
    date: 'Past',
    title: 'Orientation & Welcome Party',
    desc: 'Welcome ceremony for new 100-level Computer Science, ICT, and CRE students.',
    tag: 'Past',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSent, setContactSent] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 overflow-x-hidden">

      {/* ── STICKY NAV ───────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}>
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-brand-700 rounded-xl flex items-center justify-center shadow-md group-hover:bg-brand-800 transition-colors">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`font-bold text-sm leading-tight transition-colors ${scrolled ? 'text-brand-900' : 'text-white'}`}>
                NACOS-AIFUE
              </p>
              <p className={`text-xs transition-colors ${scrolled ? 'text-brand-600' : 'text-brand-200'}`}>
                Computer Science Dept.
              </p>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  scrolled ? 'text-gray-600 hover:text-brand-700' : 'text-white/80 hover:text-white'
                }`}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Auth CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/auth/validate"
              className={`text-sm font-medium transition-colors ${
                scrolled ? 'text-brand-700 hover:text-brand-900' : 'text-white/80 hover:text-white'
              }`}
            >
              Activate Account
            </Link>
            <Link
              to="/auth/login"
              className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Sign In →
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
            }`}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 shadow-lg">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 hover:text-brand-700 py-1">
                {l.label}
              </a>
            ))}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <Link to="/auth/validate" className="block text-sm font-medium text-brand-700 py-1">Activate Account</Link>
              <Link to="/auth/login" className="block w-full text-center bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                Sign In
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen bg-brand-900 flex items-center justify-center overflow-hidden pt-16">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Floating green orbs */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-brand-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-brand-700/20 rounded-full blur-3xl animate-float delay-400" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gold-500/10 rounded-full blur-2xl animate-float delay-200" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Pill badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 bg-brand-800/60 border border-brand-600/50 text-brand-200 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm">
            <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
            National Association of Computer Science Students · AIFUE Chapter
          </div>

          {/* Main heading */}
          <h1 className="animate-fade-up delay-100 font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Towards Advanced
            <span className="block text-brand-300 italic">Computing</span>
          </h1>

          <p className="animate-fade-up delay-200 text-brand-100/80 text-lg md:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
            The official portal of NACOS-AIFUE — your gateway to academic results,
            elections, payments, and everything that powers your computer science journey.
          </p>

          <p className="animate-fade-up delay-300 text-brand-300 text-sm mb-10 font-medium">
            Abia State University · Computer Science Department · Fudge Campus
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-up delay-400 flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/auth/login"
              className="group inline-flex items-center gap-2 bg-white text-brand-900 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-base"
            >
              Student Portal Login
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/auth/validate"
              className="inline-flex items-center gap-2 border-2 border-brand-400/60 text-white font-semibold px-8 py-4 rounded-xl hover:bg-brand-800 transition-all text-base"
            >
              Activate Your Account
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats row */}
          <div className="animate-fade-up delay-500 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl px-6 py-4">
                <div className="font-display text-3xl font-bold text-white">{s.value}</div>
                <div className="text-brand-300 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-16">
            <path d="M0 80L60 68C120 57 240 34 360 28C480 22 600 34 720 40C840 45 960 45 1080 40C1200 34 1320 22 1380 16L1440 10V80H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────────────────────────── */}
      <section id="about" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            {/* Text */}
            <div>
              <span className="inline-block text-brand-700 text-xs font-bold uppercase tracking-widest mb-3">About NACOS-AIFUE</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
                Empowering the Next Generation of
                <span className="text-brand-700"> Computer Scientists</span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                The National Association of Computer Science Students (NACOS) — AIFUE Chapter was
                established to unite and empower students of the Computer Science Department at
                Abia State University Fudge Campus.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                We bridge the gap between academic theory and industry practice through events,
                mentorship, and technology initiatives — while ensuring every student has a voice
                in departmental governance.
              </p>
              <div className="flex gap-4">
                <div className="flex-1 bg-brand-50 rounded-2xl p-5 border border-brand-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-brand-700" />
                    <span className="text-sm font-bold text-brand-900">Our Vision</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    To be the foremost student association driving technological excellence in South-East Nigeria.
                  </p>
                </div>
                <div className="flex-1 bg-green-50 rounded-2xl p-5 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-green-700" />
                    <span className="text-sm font-bold text-green-900">Our Mission</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Advancing computing knowledge while fostering unity, leadership, and professional growth.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual card */}
            <div className="relative">
              <div className="bg-brand-900 rounded-3xl p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-700/40 rounded-full -translate-y-12 translate-x-12 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold-500/20 rounded-full translate-y-8 -translate-x-8 blur-xl" />
                <div className="relative">
                  <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mb-6">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div className="font-display text-2xl font-bold mb-2">Est. 2019</div>
                  <p className="text-brand-200 text-sm leading-relaxed mb-6">
                    Serving students across three undergraduate programmes:
                  </p>
                  {['Computer Science (B.Sc.)', 'Information Technology (B.Sc.)', 'Computer & Robotics Eng.'].map((p) => (
                    <div key={p} className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                      <span className="text-sm text-brand-100">{p}</span>
                    </div>
                  ))}
                  <div className="mt-8 pt-6 border-t border-brand-700 grid grid-cols-2 gap-4">
                    <div><div className="font-display text-2xl font-bold">500+</div><div className="text-brand-400 text-xs">Members</div></div>
                    <div><div className="font-display text-2xl font-bold">12+</div><div className="text-brand-400 text-xs">Events / Year</div></div>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-gold-500 text-white rounded-2xl px-5 py-3 shadow-xl">
                <div className="text-xs font-bold">Towards Advanced</div>
                <div className="text-xs opacity-80">Computing</div>
              </div>
            </div>
          </div>

          {/* Values */}
          <div>
            <div className="text-center mb-10">
              <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Core Values</span>
              <h3 className="font-display text-3xl font-bold text-gray-900 mt-2">What We Stand For</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {VALUES.map((v, i) => (
                <div key={v.title} className={`p-6 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-1 animate-fade-up delay-${(i + 1) * 100}`}
                  style={{ borderColor: '#dcfce7', background: i % 2 === 0 ? '#f0fdf4' : 'white' }}>
                  <div className="w-10 h-10 bg-brand-700 rounded-xl flex items-center justify-center mb-4">
                    <v.icon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{v.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PORTAL FEATURES ───────────────────────────────────────────────────── */}
      <section id="portal" className="py-24 px-6 bg-brand-900 relative overflow-hidden">
        {/* Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.5" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-brand-300 text-xs font-bold uppercase tracking-widest mb-3">Student Portal</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Everything in One Place
            </h2>
            <p className="text-brand-200 max-w-xl mx-auto leading-relaxed">
              The NACOS-AIFUE portal brings your academic life, financial records, and
              departmental participation into one secure, easy-to-use platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`rounded-2xl p-6 border transition-all hover:scale-[1.02] animate-fade-up delay-${(i + 1) * 100} ${
                  f.live
                    ? 'bg-white/10 border-brand-500/40 backdrop-blur-sm hover:bg-white/15'
                    : 'bg-white/5 border-white/10 backdrop-blur-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${f.live ? 'bg-brand-500/30' : 'bg-white/10'}`}>
                    <f.icon className={`w-5 h-5 ${f.live ? 'text-brand-300' : 'text-white/50'}`} />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    f.live ? 'bg-brand-500/30 text-brand-200' : 'bg-white/10 text-white/40'
                  }`}>
                    {f.badge}
                  </span>
                </div>
                <h3 className={`font-bold mb-2 ${f.live ? 'text-white' : 'text-white/60'}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${f.live ? 'text-brand-200' : 'text-white/40'}`}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/auth/login"
              className="inline-flex items-center gap-2 bg-white text-brand-900 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-all shadow-xl text-sm">
              Access Your Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── EXECUTIVES ────────────────────────────────────────────────────────── */}
      <section id="executives" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Leadership</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-2 mb-4">Executive Council</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Your elected representatives for the current academic session, committed to advancing
              the interests of all NACOS-AIFUE members.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {EXECUTIVES.map((exec, i) => (
              <div key={exec.role} className={`text-center animate-fade-up delay-${(i + 1) * 100}`}>
                <div className="w-20 h-20 bg-gradient-to-br from-brand-700 to-brand-900 rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl mx-auto mb-3 shadow-lg">
                  {exec.initials}
                </div>
                <p className="text-xs font-bold text-gray-900">{exec.name}</p>
                <p className="text-xs text-brand-600 mt-0.5">{exec.role}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-brand-50 rounded-3xl p-8 border border-brand-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-bold text-brand-900 text-lg mb-1">Interested in leading NACOS-AIFUE?</h3>
              <p className="text-sm text-gray-600">Watch for election announcements on the portal and in department notices.</p>
            </div>
            <Link to="/auth/login"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-800 transition-colors text-sm">
              Go to Elections
              <Vote className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── EVENTS ────────────────────────────────────────────────────────────── */}
      <section id="events" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Calendar</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-2 mb-4">Events & Activities</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              From annual NACOS Week to executive elections and departmental seminars — stay plugged in.
            </p>
          </div>

          <div className="space-y-4">
            {EVENTS.map((ev, i) => (
              <div key={ev.title}
                className={`flex gap-5 bg-white rounded-2xl p-6 border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all animate-fade-up delay-${(i + 1) * 100}`}>
                <div className="flex-shrink-0 w-14 h-14 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
                  <Calendar className="w-6 h-6 text-brand-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-bold text-gray-900">{ev.title}</h3>
                    <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                      ev.tag === 'Upcoming' ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-500'
                    }`}>{ev.tag}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{ev.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center mt-8 text-sm text-gray-500">
            Event dates are announced via the portal and department notice board.
            <Link to="/auth/login" className="text-brand-700 font-medium ml-1 hover:underline">Sign in for notifications →</Link>
          </p>
        </div>
      </section>

      {/* ── CONTACT ───────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Get in Touch</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-2 mb-4">Contact Us</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Questions about the portal, membership, or upcoming events?
              Reach out and we'll respond within 24 hours.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
              {contactSent ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-brand-700" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Message Sent!</h3>
                  <p className="text-sm text-gray-500">Thanks for reaching out. We'll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <h3 className="font-bold text-gray-900 text-lg mb-5">Send a Message</h3>
                  <div>
                    <label className="label" htmlFor="c-name">Full Name</label>
                    <input id="c-name" type="text" placeholder="Your name" className="input"
                      value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label" htmlFor="c-email">Email Address</label>
                    <input id="c-email" type="email" placeholder="you@example.com" className="input"
                      value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label" htmlFor="c-msg">Message</label>
                    <textarea id="c-msg" rows={5} placeholder="How can we help?" className="input resize-none"
                      value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} required />
                  </div>
                  <button type="submit" className="btn-primary w-full btn-lg">
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {/* Contact info */}
            <div className="space-y-6">
              <div className="bg-brand-900 rounded-3xl p-8 text-white">
                <h3 className="font-bold text-lg mb-6">Direct Contact</h3>
                <div className="space-y-5">
                  {[
                    { icon: Mail,    label: 'Email',    value: 'nacos@aifue.edu.ng' },
                    { icon: Phone,   label: 'Phone',    value: '+234 803 123 4567' },
                    { icon: MapPin,  label: 'Location', value: 'Computer Science Dept., AIFUE, Uturu, Abia State' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-brand-700 rounded-xl flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-brand-200" />
                      </div>
                      <div>
                        <p className="text-brand-400 text-xs font-semibold uppercase tracking-wide">{item.label}</p>
                        <p className="text-white text-sm mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-brand-50 rounded-3xl p-6 border border-brand-100">
                <h4 className="font-bold text-brand-900 mb-2">Office Hours</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  The NACOS secretariat is open during lecture hours, Mon–Fri. For urgent portal
                  issues, email us or use the portal's notification system.
                </p>
              </div>

              <div className="rounded-3xl p-6 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3">Quick Access</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/auth/login"
                    className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900 bg-brand-50 rounded-xl px-4 py-3 hover:bg-brand-100 transition-colors">
                    <ArrowRight className="w-4 h-4" /> Student Login
                  </Link>
                  <Link to="/auth/validate"
                    className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900 bg-brand-50 rounded-xl px-4 py-3 hover:bg-brand-100 transition-colors">
                    <ArrowRight className="w-4 h-4" /> Activate Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer className="bg-brand-900 text-brand-300 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">NACOS-AIFUE</p>
                  <p className="text-brand-400 text-xs">Towards Advanced Computing</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                The official student association of the Computer Science Department,
                Abia State University Fudge Campus — uniting students, advancing technology.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">Navigate</p>
              <ul className="space-y-2 text-sm">
                {NAV_LINKS.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="hover:text-white transition-colors cursor-pointer">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Portal */}
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">Portal</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/auth/login" className="hover:text-white transition-colors">Student Login</Link></li>
                <li><Link to="/auth/validate" className="hover:text-white transition-colors">Activate Account</Link></li>
                <li><Link to="/auth/forgot-password" className="hover:text-white transition-colors">Forgot Password</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-brand-700 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <p>© {year} NACOS-AIFUE. All rights reserved. Computer Science Department, AIFUE.</p>
            <p className="text-brand-500">nacos@aifue.edu.ng · +234 803 123 4567</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
