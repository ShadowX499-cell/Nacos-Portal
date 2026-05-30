import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Menu, X, BookOpen, Vote, Fingerprint, CreditCard, Bell, Users,
  ChevronRight, Calendar, Target, Heart, Lightbulb, ArrowRight,
  MapPin, Mail, Phone, Code2, Rocket, Network, Briefcase,
} from 'lucide-react';
import NacosLogo from '../components/NacosLogo';
import { TestimonialsColumn } from '../components/ui/TestimonialsColumn';

// ── Data ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'About',      href: '/about' },
  { label: 'Executives', href: '/executives' },
  { label: 'Events',     href: '/events' },
  { label: 'Gallery',    href: '/gallery' },
  { label: 'Blog',       href: '/blog' },
  { label: 'Contact',    href: '/contact' },
];

const MISSION_PILLARS = [
  { icon: Code2,    title: 'We Develop',       desc: 'Building technical skills through workshops, bootcamps, and hands-on projects that prepare members for the industry.' },
  { icon: Lightbulb, title: 'We Create',       desc: 'Fostering innovation through hackathons, research initiatives, and entrepreneurship programmes that solve real problems.' },
  { icon: Rocket,   title: 'We Build Capacity', desc: 'Growing the next generation of technology leaders through mentorship, networking, and career development programmes.' },
];

const EXPLORE_PAGES = [
  { title: 'About Us',    desc: 'Learn about our mission, vision, and values.',               href: '/about',      color: 'text-brand-700',   bg: 'bg-brand-50',   border: 'border-brand-200',  img: 'https://images.pexels.com/photos/7369237/pexels-photo-7369237.jpeg?w=600&auto=compress' },
  { title: 'Executives',  desc: 'Meet our leadership team and course representatives.',        href: '/executives', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',   img: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?w=600&auto=compress' },
  { title: 'Events',      desc: 'See upcoming and past events organised by NACOS AIFUE.',     href: '/events',     color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200', img: 'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?w=600&auto=compress' },
  { title: 'Gallery',     desc: 'Browse photos and memories from our events and activities.', href: '/gallery',    color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200',   img: '/IMG_0982.jpg' },
  { title: 'Blog',        desc: 'Read articles, announcements, and news from NACOS AIFUE.',   href: '/blog',       color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200', img: 'https://images.pexels.com/photos/261662/pexels-photo-261662.jpeg?w=600&auto=compress' },
  { title: 'Contact',     desc: 'Get in touch with the executive team and secretariat.',      href: '/contact',    color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',   img: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?w=600&auto=compress' },
];

const FEATURES = [
  { icon: BookOpen,    title: 'Academic Results',    desc: 'View semester result slips, track your SGPA and CGPA — available after result subscription payment.',              badge: 'Live',    live: true },
  { icon: Vote,        title: 'Dept. Elections',     desc: 'Participate in transparent NACOS elections with a cryptographically verified one-member-one-vote system.',         badge: 'Phase 3', live: false },
  { icon: Fingerprint, title: 'Biometric Attendance', desc: 'Fast fingerprint-based exam and lecture attendance tracking with real-time session reports.',                       badge: 'Phase 4', live: false },
  { icon: CreditCard,  title: 'Payments & Dues',     desc: 'Pay school fees, NACOS dues and result subscriptions securely via Paystack. Download instant receipts.',           badge: 'Live',    live: true },
  { icon: Bell,        title: 'Notifications',       desc: 'Receive real-time in-app notifications for results, elections, announcements, and departmental events.',            badge: 'Live',    live: true },
  { icon: Users,       title: 'Student Management',  desc: 'Admins register students, generate NACOS IDs, manage profiles and course registration approvals.',                  badge: 'Live',    live: true },
];

const UPCOMING_EVENTS = [
  { date: { month: 'MAR', day: '15' }, title: 'Web Development Workshop', desc: 'Learn modern web development with React, Node.js, and MongoDB.', location: 'CS Lab 1', tag: 'Free' },
  { date: { month: 'MAR', day: '22' }, title: 'AI/ML Hackathon 2024',     desc: '48-hour hackathon focused on artificial intelligence and machine learning.', location: 'Main Auditorium', tag: '₦2,000' },
  { date: { month: 'APR', day: '05' }, title: 'Career Fair 2024',         desc: 'Connect with top tech companies and explore internship opportunities.', location: 'University Main Hall', tag: 'Free' },
];

const PROGRAMS = [
  { icon: Code2,     title: 'Technical Training',   desc: 'Hands-on workshops covering web dev, mobile, AI/ML, cloud, and cybersecurity.' },
  { icon: Lightbulb, title: 'Innovation Hub',        desc: 'Hackathons, ideathons, and incubation support for student-led tech startups.' },
  { icon: Briefcase, title: 'Career Development',    desc: 'CV clinics, mock interviews, industry mentors, and recruitment connections.' },
  { icon: Network,   title: 'Global Network',        desc: 'Access NACOS national network — 1M+ members across 25 chapters nationwide.' },
];

const TESTIMONIALS = [
  { text: 'NACOS AIFUE gave me the technical skills and professional network that landed my internship at a top Lagos fintech. Best decision I made on campus.', image: 'https://randomuser.me/api/portraits/men/32.jpg',   name: 'Chibuike A.', role: '400L Computer Science' },
  { text: 'The hackathons and workshops are incredible. I built my first full-stack project here and now I freelance. NACOS is not just an association — it\'s a launchpad.', image: 'https://randomuser.me/api/portraits/women/44.jpg', name: 'Adaeze N.', role: '300L Computer Science' },
  { text: 'From the career fair to the mentorship programme — NACOS AIFUE prepared me for the real world. I credit this association for where I am today.', image: 'https://randomuser.me/api/portraits/men/55.jpg',   name: 'Emeka O.', role: 'Alumni, 2023' },
  { text: 'The presidential elections were so smooth on the new portal! Every vote counted and results were instant. True transparency in student governance.', image: 'https://randomuser.me/api/portraits/women/68.jpg', name: 'Ngozi U.', role: '200L ICT' },
  { text: 'I used to worry about missing result announcements. The notification system on the portal is a game-changer — I get alerts the moment results drop.', image: 'https://randomuser.me/api/portraits/men/77.jpg',   name: 'Favour I.', role: '300L CRE' },
  { text: 'Paying school fees from my phone without going to the bank? The NACOS portal made that possible. Technology at its finest.', image: 'https://randomuser.me/api/portraits/women/22.jpg', name: 'Chinwe P.', role: '400L Information Technology' },
  { text: 'Our department\'s Web Dev workshop opened my eyes to so many possibilities. I landed a junior developer role before even graduating.', image: 'https://randomuser.me/api/portraits/men/11.jpg',   name: 'Ikenna R.', role: 'Alumni, 2024' },
  { text: 'NACOS AIFUE is the reason I love computer science. The community, the events, the people — it made university life meaningful and purposeful.', image: 'https://randomuser.me/api/portraits/women/33.jpg', name: 'Obiageli C.', role: '200L Computer Science' },
  { text: 'The course registration review system is so much better than paper forms. Admin reviewed my form within a day and I got notified immediately.', image: 'https://randomuser.me/api/portraits/men/88.jpg',   name: 'Tobechukwu M.', role: '300L Computer Science' },
];

const firstColumn  = TESTIMONIALS.slice(0, 3);
const secondColumn = TESTIMONIALS.slice(3, 6);
const thirdColumn  = TESTIMONIALS.slice(6, 9);

// ── Portal Mockup ─────────────────────────────────────────────────────────────

function PortalMockup() {
  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Glow */}
      <div className="absolute -inset-6 bg-brand-500/10 rounded-3xl blur-3xl" />
      {/* Browser shell */}
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700/60">
        {/* Browser chrome */}
        <div className="bg-gray-950 px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-gray-800 rounded-lg px-3 py-1 text-xs text-gray-400 text-center font-mono tracking-tight">
            portal.nacos-aifue.edu.ng/student/dashboard
          </div>
        </div>
        {/* App UI */}
        <div className="flex" style={{ height: '280px' }}>
          {/* Sidebar */}
          <div className="w-44 bg-brand-900 flex flex-col flex-shrink-0 p-3">
            <div className="flex items-center gap-2 px-2 mb-4">
              <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
                <span className="text-brand-800 font-bold text-xs">N</span>
              </div>
              <span className="text-white font-semibold text-xs">NACOS Portal</span>
            </div>
            {[
              { label: 'Dashboard',   active: true },
              { label: 'My Results',  active: false },
              { label: 'Transcript',  active: false },
              { label: 'School Fees', active: false },
              { label: 'Payments',    active: false },
              { label: 'Notifications', active: false },
            ].map((item) => (
              <div key={item.label} className={`px-2 py-1.5 rounded-lg text-xs mb-0.5 ${
                item.active ? 'bg-white/15 text-white font-semibold' : 'text-white/50'
              }`}>
                {item.label}
              </div>
            ))}
          </div>
          {/* Main content */}
          <div className="flex-1 bg-gray-50 p-4 overflow-hidden">
            <p className="text-gray-800 font-bold text-sm mb-3">Good morning, Victor 👋</p>
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'CGPA',      value: '4.51', cls: 'text-brand-700 bg-brand-50' },
                { label: 'Credits',   value: '48',   cls: 'text-blue-700 bg-blue-50' },
                { label: 'Level',     value: 'L300',  cls: 'text-yellow-700 bg-yellow-50' },
                { label: 'Semesters', value: '4',    cls: 'text-purple-700 bg-purple-50' },
              ].map((s) => (
                <div key={s.label} className={`rounded-lg p-2 ${s.cls}`}>
                  <div className="font-bold text-sm leading-tight">{s.value}</div>
                  <div className="text-xs opacity-60">{s.label}</div>
                </div>
              ))}
            </div>
            {/* Two panels */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                <div className="text-xs font-semibold text-gray-700 mb-2">Recent Results</div>
                {[
                  { code: 'CSC 301 — Data Structures',  grade: 'A', color: 'text-brand-700' },
                  { code: 'CSC 305 — Web Engineering',  grade: 'B', color: 'text-blue-700' },
                  { code: 'CSC 311 — Networks',         grade: 'A', color: 'text-brand-700' },
                ].map((r) => (
                  <div key={r.code} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{r.code}</span>
                    <span className={`text-xs font-bold ${r.color}`}>{r.grade}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                <div className="text-xs font-semibold text-gray-700 mb-2">Action Required</div>
                {[
                  { icon: '💳', text: '2 results unpaid', urgent: true },
                  { icon: '🔔', text: '3 new notifications', urgent: false },
                  { icon: '📝', text: 'Registration open', urgent: false },
                ].map((a) => (
                  <div key={a.text} className={`flex items-center gap-1.5 py-1 text-xs ${a.urgent ? 'text-orange-600' : 'text-gray-500'}`}>
                    <span>{a.icon}</span><span>{a.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 overflow-x-hidden">

      {/* ── STICKY NAV ───────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}>
        <nav className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <NacosLogo size={40} />
            <div>
              <p className={`font-bold text-sm leading-tight transition-colors ${scrolled ? 'text-brand-900' : 'text-white'}`}>
                NACOS AIFUE
              </p>
              <p className={`text-xs transition-colors ${scrolled ? 'text-brand-600' : 'text-brand-200'}`}>
                Computer Science Chapter
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} to={l.href}
                className={`text-sm font-medium transition-colors ${
                  scrolled ? 'text-gray-600 hover:text-brand-700' : 'text-white/80 hover:text-white'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth/login"
              className={`text-sm font-medium transition-colors ${scrolled ? 'text-brand-700 hover:text-brand-900' : 'text-white/80 hover:text-white'}`}>
              Sign In
            </Link>
            <Link to="/auth/validate"
              className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
              Join Us →
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
            aria-label="Toggle menu">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-2 shadow-lg">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} to={l.href} onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 hover:text-brand-700 py-1.5">{l.label}</Link>
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              <Link to="/auth/login" className="text-sm font-medium text-brand-700 py-1">Sign In</Link>
              <Link to="/auth/validate" className="block w-full text-center bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
                Join Us →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
        style={{ backgroundImage: 'url(/IMG_0982.jpg)', backgroundSize: 'cover', backgroundPosition: 'center top' }}
      >
        {/* Dark green overlay */}
        <div className="absolute inset-0 bg-brand-900/78" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%"><defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern></defs><rect width="100%" height="100%" fill="url(#g)" /></svg>
        </div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-brand-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-brand-700/15 rounded-full blur-3xl animate-float delay-400" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Logo badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <NacosLogo size={52} className="ring-2 ring-white/20" />
            <span className="bg-brand-800/60 border border-brand-600/50 text-brand-200 text-xs font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm">
              National Association of Computing Students · AIFUE Chapter · Est. 2010
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-4"
          >
            Towards Advanced
            <span className="block text-brand-300 italic">Computing</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gold-400 font-semibold text-lg mb-6 tracking-wide"
          >
            We Develop · We Create · We Build Capacity
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-brand-100/80 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The official portal of NACOS-AIFUE — your gateway to academic results, elections,
            payments, and everything that powers your computing journey at AIFUE, Owerri.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/auth/login"
              className="group inline-flex items-center gap-2 bg-white text-brand-900 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-base">
              Access Student Portal
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/auth/validate"
              className="inline-flex items-center gap-2 border-2 border-brand-400/60 text-white font-semibold px-8 py-4 rounded-xl hover:bg-brand-800 transition-all text-base">
              Activate Account
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
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
          <div className="text-center mb-14">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Our Purpose</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-5">What Drives Us</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
              Fostering excellence in computer science education, promoting innovation, and building capacity — bridging academia and industry.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            {MISSION_PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`rounded-3xl p-8 border transition-all hover:shadow-lg hover:-translate-y-1 ${
                  i === 1 ? 'bg-brand-900 border-brand-800' : 'bg-brand-50 border-brand-100'
                }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${i === 1 ? 'bg-brand-600' : 'bg-brand-700'}`}>
                  <p.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className={`font-display text-2xl font-bold mb-3 ${i === 1 ? 'text-white' : 'text-brand-900'}`}>{p.title}</h3>
                <p className={`leading-relaxed text-sm ${i === 1 ? 'text-brand-200' : 'text-gray-600'}`}>{p.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/about" className="inline-flex items-center gap-2 text-brand-700 font-semibold hover:text-brand-900 transition-colors text-sm">
              Learn more about NACOS-AIFUE <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── PORTAL PREVIEW (replaces stats) ──────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%"><defs><pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1.5" fill="white"/>
          </pattern></defs><rect width="100%" height="100%" fill="url(#dots)" /></svg>
        </div>
        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="text-brand-400 text-xs font-bold uppercase tracking-widest">Student Portal</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mt-3 mb-5 leading-tight">
              Your Academic Life,<br />
              <span className="text-brand-300">All in One Place</span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              Access your results, pay dues, track attendance, vote in elections, and receive real-time notifications — all from a single secure platform designed for NACOS-AIFUE members.
            </p>
            <div className="space-y-3 mb-8">
              {['View semester results & CGPA instantly', 'Pay school fees & dues via Paystack', 'Submit & track course registration', 'Get notified of results & announcements'].map((feat) => (
                <div key={feat} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-300 text-sm">{feat}</span>
                </div>
              ))}
            </div>
            <Link to="/auth/login"
              className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-600 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg text-sm">
              Go to Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <PortalMockup />
        </div>
      </section>

      {/* ── EXPLORE OUR PAGES ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Navigate</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-3 mb-3">Explore Our Pages</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Everything about NACOS-AIFUE, all in one place.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXPLORE_PAGES.map((page, i) => (
              <motion.div
                key={page.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                viewport={{ once: true }}
              >
                <Link to={page.href}
                  className={`block rounded-2xl overflow-hidden border ${page.border} hover:shadow-xl transition-all hover:-translate-y-1 group`}>
                  <div className="h-44 overflow-hidden">
                    <img src={page.img} alt={page.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className={`p-5 ${page.bg}`}>
                    <h3 className={`font-bold text-lg mb-1 ${page.color}`}>{page.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 leading-relaxed">{page.desc}</p>
                    <span className={`text-sm font-semibold ${page.color} flex items-center gap-1`}>
                      View More <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PORTAL FEATURES ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-brand-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%"><defs><pattern id="dots2" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1.5" fill="white"/>
          </pattern></defs><rect width="100%" height="100%" fill="url(#dots2)" /></svg>
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-brand-300 text-xs font-bold uppercase tracking-widest">Features</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4 mt-3">Everything in One Place</h2>
            <p className="text-brand-200 max-w-xl mx-auto leading-relaxed">
              The NACOS-AIFUE portal brings your academic life, financial records, and departmental participation into one secure platform.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                viewport={{ once: true }}
                className={`rounded-2xl p-6 border transition-all hover:scale-[1.02] ${
                  f.live ? 'bg-white/10 border-brand-500/40 backdrop-blur-sm hover:bg-white/15' : 'bg-white/5 border-white/10'
                }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${f.live ? 'bg-brand-500/30' : 'bg-white/10'}`}>
                    <f.icon className={`w-5 h-5 ${f.live ? 'text-brand-300' : 'text-white/40'}`} />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${f.live ? 'bg-brand-400/20 text-brand-200' : 'bg-white/10 text-white/30'}`}>
                    {f.badge}
                  </span>
                </div>
                <h3 className={`font-bold mb-2 ${f.live ? 'text-white' : 'text-white/50'}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${f.live ? 'text-brand-200' : 'text-white/30'}`}>{f.desc}</p>
              </motion.div>
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

      {/* ── PROGRAMS ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">What We Offer</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-3 mb-3">Programs & Initiatives</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROGRAMS.map((p, i) => (
              <motion.div key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all hover:-translate-y-1">
                <div className="w-11 h-11 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
                  <p.icon className="w-5 h-5 text-brand-700" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
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
              <motion.div key={ev.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex gap-5 bg-white rounded-2xl p-6 border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all">
                <div className="flex-shrink-0 text-center bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 min-w-[70px]">
                  <div className="text-xs font-bold text-brand-600 uppercase">{ev.date.month}</div>
                  <div className="font-display text-2xl font-bold text-brand-900 leading-none">{ev.date.day}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-bold text-gray-900">{ev.title}</h3>
                    <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${ev.tag === 'Free' ? 'bg-brand-100 text-brand-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {ev.tag}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{ev.desc}</p>
                  <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{ev.location}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANIMATED TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center max-w-2xl mx-auto mb-14"
          >
            <div className="inline-block border border-brand-200 bg-brand-50 text-brand-700 text-xs font-bold px-4 py-1.5 rounded-full mb-5 uppercase tracking-widest">
              Member Stories
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 tracking-tight text-center">
              What Our Members Say
            </h2>
            <p className="text-center text-gray-500 mt-4 max-w-md leading-relaxed">
              Real experiences from NACOS-AIFUE students and alumni across all levels.
            </p>
          </motion.div>

          <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[680px] overflow-hidden">
            <TestimonialsColumn testimonials={firstColumn} duration={16} />
            <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={20} />
            <TestimonialsColumn testimonials={thirdColumn}  className="hidden lg:block" duration={18} />
          </div>
        </div>
      </section>

      {/* ── CONTACT CTA ───────────────────────────────────────────────────────── */}
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
                  Activate your portal account and unlock everything NACOS-AIFUE has to offer.
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

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer className="bg-brand-900 text-brand-300 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <NacosLogo size={36} />
                <div>
                  <p className="font-bold text-white text-sm">NACOS AIFUE</p>
                  <p className="text-brand-400 text-xs">Towards Advanced Computing</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-xs mb-5">
                The official student association of the Computer Science Department,
                Alvan Ikoku Federal University of Education, Owerri — uniting students, advancing technology since 2010.
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> nacos@aifue.edu.ng</div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +234 803 123 4567</div>
              </div>
            </div>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">Website</p>
              <ul className="space-y-2 text-sm">
                {NAV_LINKS.map((l) => <li key={l.label}><Link to={l.href} className="hover:text-white transition-colors">{l.label}</Link></li>)}
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
            <p className="text-brand-500">We Develop · We Create · We Build Capacity</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
