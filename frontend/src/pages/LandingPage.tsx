import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu, X, BookOpen, Vote, Fingerprint, CreditCard, Bell, Users,
  ChevronRight, GraduationCap, Calendar, Target, Eye, Heart,
  Lightbulb, ArrowRight, Star, MapPin, Mail, Phone, Trophy,
  Code2, Rocket, Network, Briefcase,
} from 'lucide-react';

// ── Real data from nacos-aifue.vercel.app ────────────────────────────────────

const NAV_LINKS = [
  { label: 'About',      href: '/about' },
  { label: 'Executives', href: '/executives' },
  { label: 'Events',     href: '/events' },
  { label: 'Contact',    href: '/contact' },
];

const STATS = [
  { value: '500+',  label: 'Active Members',    icon: Users },
  { value: '100+',  label: 'Events Hosted',     icon: Calendar },
  { value: '25',    label: 'Local Chapters',    icon: Network },
  { value: '15',    label: 'Awards Won',        icon: Trophy },
];

const MISSION_PILLARS = [
  {
    icon: Code2,
    title: 'We Develop',
    desc: 'Building technical skills through workshops, bootcamps, and hands-on projects that prepare members for the industry.',
  },
  {
    icon: Lightbulb,
    title: 'We Create',
    desc: 'Fostering innovation through hackathons, research initiatives, and entrepreneurship programs that solve real problems.',
  },
  {
    icon: Rocket,
    title: 'We Build Capacity',
    desc: 'Growing the next generation of technology leaders through mentorship, networking, and career development programs.',
  },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Academic Results',
    desc: 'View semester result slips, track your SGPA and CGPA — available after result subscription payment.',
    badge: 'Live', live: true,
  },
  {
    icon: Vote,
    title: 'Departmental Elections',
    desc: 'Participate in transparent NACOS elections with a cryptographically verified one-member-one-vote system.',
    badge: 'Phase 3', live: false,
  },
  {
    icon: Fingerprint,
    title: 'Biometric Attendance',
    desc: 'Fast fingerprint-based exam and lecture attendance tracking with real-time session reports.',
    badge: 'Phase 4', live: false,
  },
  {
    icon: CreditCard,
    title: 'Payments & Dues',
    desc: 'Pay school fees, NACOS dues and result subscriptions securely via Paystack. Download instant receipts.',
    badge: 'Live', live: true,
  },
  {
    icon: Bell,
    title: 'Notifications',
    desc: 'Receive real-time in-app notifications for results, elections, announcements, and departmental events.',
    badge: 'Live', live: true,
  },
  {
    icon: Users,
    title: 'Student Management',
    desc: 'Admins register students, generate NACOS IDs, manage profiles and course registration approvals.',
    badge: 'Live', live: true,
  },
];

const UPCOMING_EVENTS = [
  {
    date: 'Mar 15, 2024',
    time: '10:00 AM – 4:00 PM',
    title: 'Web Development Workshop',
    desc: 'Learn modern web development with React, Node.js, and MongoDB.',
    location: 'Computer Science Lab 1',
    tag: 'Free',
    spots: '45/50',
  },
  {
    date: 'Mar 22, 2024',
    time: '9:00 AM – 9:00 PM',
    title: 'AI/ML Hackathon 2024',
    desc: '48-hour hackathon focused on artificial intelligence and machine learning solutions.',
    location: 'Main Auditorium',
    tag: '₦2,000',
    spots: '120/150',
  },
  {
    date: 'Apr 5, 2024',
    time: '9:00 AM – 5:00 PM',
    title: 'Career Fair 2024',
    desc: 'Connect with top tech companies and explore internship and job opportunities.',
    location: 'University Main Hall',
    tag: 'Free',
    spots: '200/300',
  },
];

const PROGRAMS = [
  { icon: Code2,     title: 'Technical Training',   desc: 'Hands-on workshops covering web dev, mobile, AI/ML, cloud, and cybersecurity.' },
  { icon: Lightbulb, title: 'Innovation Hub',        desc: 'Hackathons, ideathons, and incubation support for student-led tech startups.' },
  { icon: Briefcase, title: 'Career Development',    desc: 'CV clinics, mock interviews, industry mentors, and recruitment connections.' },
  { icon: Network,   title: 'Global Network',        desc: 'Access NACOS national network — 1M+ members across 25 chapters nationwide.' },
];

const TESTIMONIALS = [
  {
    name: 'Chisom A.',
    level: '400L Computer Science',
    text: 'NACOS AIFUE gave me the technical skills and professional network that landed my internship at a top Lagos fintech. Best decision I made on campus.',
    stars: 5,
  },
  {
    name: 'Emeka O.',
    level: '300L Information Technology',
    text: 'The hackathons and workshops are incredible. I built my first full-stack project here and now I freelance. NACOS is not just an association, it\'s a launchpad.',
    stars: 5,
  },
  {
    name: 'Adaeze N.',
    level: 'Alumni, 2023',
    text: 'From the career fair to the mentorship program — NACOS AIFUE prepared me for the real world. I credit this association for where I am today.',
    stars: 5,
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
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-brand-700 rounded-xl flex items-center justify-center shadow-md group-hover:bg-brand-800 transition-colors">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`font-bold text-sm leading-tight transition-colors ${scrolled ? 'text-brand-900' : 'text-white'}`}>
                NACOS-AIFUE
              </p>
              <p className={`text-xs transition-colors ${scrolled ? 'text-brand-600' : 'text-brand-200'}`}>
                Towards Advanced Computing
              </p>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} to={l.href}
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  scrolled ? 'text-gray-600 hover:text-brand-700' : 'text-white/80 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth/validate"
              className={`text-sm font-medium transition-colors ${
                scrolled ? 'text-brand-700 hover:text-brand-900' : 'text-white/80 hover:text-white'
              }`}
            >
              Activate Account
            </Link>
            <Link to="/auth/login"
              className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Sign In →
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
            }`}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 shadow-lg">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} to={l.href} onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 hover:text-brand-700 py-1">
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

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen bg-brand-900 flex items-center justify-center overflow-hidden pt-16">
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
        <div className="absolute top-24 right-16 w-80 h-80 bg-brand-600/25 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-24 left-8 w-96 h-96 bg-brand-700/20 rounded-full blur-3xl animate-float delay-400" />
        <div className="absolute top-1/2 left-1/3 w-56 h-56 bg-gold-500/10 rounded-full blur-2xl animate-float delay-200" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 bg-brand-800/60 border border-brand-600/50 text-brand-200 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm">
            <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
            National Association of Computer Science Students · AIFUE Chapter · Est. 2010
          </div>

          <h1 className="animate-fade-up delay-100 font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-4">
            Towards Advanced
            <span className="block text-brand-300 italic">Computing</span>
          </h1>

          <p className="animate-fade-up delay-200 text-gold-400 font-semibold text-lg mb-6 tracking-wide">
            We Develop · We Create · We Build Capacity
          </p>

          <p className="animate-fade-up delay-300 text-brand-100/80 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            The official portal of NACOS-AIFUE — your gateway to academic results, elections,
            payments, and everything that powers your computer science journey at
            Alvan Ikoku Federal University of Education, Owerri.
          </p>

          <div className="animate-fade-up delay-400 flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/auth/login"
              className="group inline-flex items-center gap-2 bg-white text-brand-900 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-base"
            >
              Access Student Portal
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/auth/validate"
              className="inline-flex items-center gap-2 border-2 border-brand-400/60 text-white font-semibold px-8 py-4 rounded-xl hover:bg-brand-800 transition-all text-base"
            >
              Activate Account
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats */}
          <div className="animate-fade-up delay-500 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl px-4 py-5">
                <s.icon className="w-5 h-5 text-brand-300 mx-auto mb-2" />
                <div className="font-display text-3xl font-bold text-white">{s.value}</div>
                <div className="text-brand-300 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-16">
            <path d="M0 80L60 68C120 57 240 34 360 28C480 22 600 34 720 40C840 45 960 45 1080 40C1200 34 1320 22 1380 16L1440 10V80H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ── MISSION PILLARS ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Our Purpose</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-5">
              What Drives Us
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
              To foster excellence in computer science education, promote innovation and research,
              and build capacity among students — bridging the gap between academia and industry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MISSION_PILLARS.map((p, i) => (
              <div key={p.title}
                className={`rounded-3xl p-8 border transition-all hover:shadow-lg hover:-translate-y-1 animate-fade-up delay-${(i + 1) * 100} ${
                  i === 1 ? 'bg-brand-900 border-brand-800 text-white' : 'bg-brand-50 border-brand-100'
                }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
                  i === 1 ? 'bg-brand-600' : 'bg-brand-700'
                }`}>
                  <p.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className={`font-display text-2xl font-bold mb-3 ${i === 1 ? 'text-white' : 'text-brand-900'}`}>
                  {p.title}
                </h3>
                <p className={`leading-relaxed text-sm ${i === 1 ? 'text-brand-200' : 'text-gray-600'}`}>{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/about"
              className="inline-flex items-center gap-2 text-brand-700 font-semibold hover:text-brand-900 transition-colors text-sm">
              Learn more about NACOS-AIFUE <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── PROGRAMS ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">What We Offer</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-3 mb-4">Programs & Initiatives</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROGRAMS.map((p, i) => (
              <div key={p.title}
                className={`bg-white rounded-2xl p-6 border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all hover:-translate-y-1 animate-fade-up delay-${(i + 1) * 100}`}>
                <div className="w-11 h-11 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
                  <p.icon className="w-5 h-5 text-brand-700" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STUDENT PORTAL ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-brand-900 relative overflow-hidden">
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
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Everything in One Place</h2>
            <p className="text-brand-200 max-w-xl mx-auto leading-relaxed">
              The NACOS-AIFUE portal brings your academic life, financial records,
              and departmental participation into one secure platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className={`rounded-2xl p-6 border transition-all hover:scale-[1.02] animate-fade-up delay-${(i + 1) * 100} ${
                  f.live
                    ? 'bg-white/10 border-brand-500/40 backdrop-blur-sm hover:bg-white/15'
                    : 'bg-white/5 border-white/10 backdrop-blur-sm'
                }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${f.live ? 'bg-brand-500/30' : 'bg-white/10'}`}>
                    <f.icon className={`w-5 h-5 ${f.live ? 'text-brand-300' : 'text-white/40'}`} />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    f.live ? 'bg-brand-400/20 text-brand-200' : 'bg-white/10 text-white/30'
                  }`}>{f.badge}</span>
                </div>
                <h3 className={`font-bold mb-2 ${f.live ? 'text-white' : 'text-white/50'}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${f.live ? 'text-brand-200' : 'text-white/30'}`}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/auth/login"
              className="inline-flex items-center gap-2 bg-white text-brand-900 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-all shadow-xl text-sm">
              Access Your Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── UPCOMING EVENTS ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Calendar</span>
              <h2 className="font-display text-4xl font-bold text-gray-900 mt-2">Upcoming Events</h2>
            </div>
            <Link to="/events" className="text-sm text-brand-700 font-semibold hover:text-brand-900 flex items-center gap-1 whitespace-nowrap">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {UPCOMING_EVENTS.map((ev, i) => (
              <div key={ev.title}
                className={`flex gap-5 bg-white rounded-2xl p-6 border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all animate-fade-up delay-${(i + 1) * 100}`}>
                <div className="flex-shrink-0 text-center bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 min-w-[72px]">
                  <div className="text-xs font-bold text-brand-600 uppercase">{ev.date.split(' ')[0]}</div>
                  <div className="font-display text-2xl font-bold text-brand-900 leading-none">{ev.date.split(' ')[1].replace(',', '')}</div>
                  <div className="text-xs text-brand-500">{ev.date.split(' ')[2]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-bold text-gray-900">{ev.title}</h3>
                    <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                      ev.tag === 'Free' ? 'bg-brand-100 text-brand-800' : 'bg-gold-500/10 text-yellow-800'
                    }`}>{ev.tag}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{ev.desc}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ev.spots} registered</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Member Stories</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-2 mb-3">What Our Members Say</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Real experiences from NACOS-AIFUE students and alumni.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i}
                className={`bg-white rounded-2xl p-7 border border-gray-200 hover:border-brand-200 hover:shadow-md transition-all animate-fade-up delay-${(i + 1) * 100}`}>
                <div className="flex mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-gold-500 fill-gold-500" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {t.name.split(' ')[0][0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.level}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT STRIP ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="bg-brand-900 rounded-3xl p-10 md:p-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-brand-700/30 rounded-full -translate-y-20 translate-x-20 blur-3xl" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to join the NACOS family?
                </h2>
                <p className="text-brand-200 leading-relaxed mb-6">
                  Whether you're a new student or returning member, activate your portal account
                  and unlock everything NACOS-AIFUE has to offer.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/auth/login"
                    className="inline-flex items-center gap-2 bg-white text-brand-900 font-bold px-6 py-3 rounded-xl hover:bg-brand-50 transition-all text-sm">
                    Sign In to Portal <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/auth/validate"
                    className="inline-flex items-center gap-2 border border-brand-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-800 transition-all text-sm">
                    Activate Account
                  </Link>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { icon: Mail,   text: 'nacos@aifue.edu.ng' },
                  { icon: Phone,  text: '+234 803 123 4567' },
                  { icon: MapPin, text: 'CS Dept, AIFUE, Owerri, Imo State' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-brand-300" />
                    </div>
                    <span className="text-brand-100 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUICK CONTACT FORM ───────────────────────────────────────────────── */}
      <section id="contact" className="py-16 px-6 bg-gray-50">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Get in Touch</span>
            <h2 className="font-display text-3xl font-bold text-gray-900 mt-2">Send Us a Message</h2>
          </div>
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
            {contactSent ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-brand-700" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Message Sent!</h3>
                <p className="text-sm text-gray-500">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
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
                  <textarea id="c-msg" rows={4} placeholder="How can we help?" className="input resize-none"
                    value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} required />
                </div>
                <button type="submit" className="btn-primary w-full btn-lg">Send Message</button>
              </form>
            )}
          </div>
          <p className="text-center mt-5 text-sm text-gray-500">
            Or visit the <Link to="/contact" className="text-brand-700 font-medium hover:underline">full contact page →</Link>
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer className="bg-brand-900 text-brand-300 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
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
              <p className="text-sm leading-relaxed max-w-xs mb-5">
                The official student association of the Computer Science Department,
                Alvan Ikoku Federal University of Education, Owerri — uniting students, advancing technology since 2010.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> nacos@aifue.edu.ng</div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +234 803 123 4567</div>
              </div>
            </div>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">Website</p>
              <ul className="space-y-2 text-sm">
                {NAV_LINKS.map((l) => (
                  <li key={l.label}><Link to={l.href} className="hover:text-white transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>
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
            <p>© {year} NACOS-AIFUE. All rights reserved. Computer Science Department, AIFUE, Owerri.</p>
            <p className="text-brand-500">Est. 2010 · We Develop · We Create · We Build Capacity</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
