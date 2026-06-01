import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Menu,
  X,
  BookOpen,
  Vote,
  Fingerprint,
  CreditCard,
  Bell,
  Users,
  ChevronRight,
  Calendar,
  Target,
  Heart,
  Lightbulb,
  ArrowRight,
  MapPin,
  Mail,
  Phone,
  Code2,
  Rocket,
  Network,
  Briefcase,
  Star,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";
import NacosLogo from "../components/NacosLogo";
import { TestimonialsColumn } from "../components/ui/TestimonialsColumn";

// ── Data ──────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Executives", href: "/executives" },
  { label: "Events", href: "/events" },
  { label: "Gallery", href: "/gallery" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const MISSION_PILLARS = [
  {
    icon: Code2,
    title: "We Develop",
    desc: "Building technical skills through hands-on workshops, bootcamps, and industry-grade projects.",
  },
  {
    icon: Lightbulb,
    title: "We Create",
    desc: "Fostering innovation through hackathons, research initiatives, and student-led tech startups.",
  },
  {
    icon: Rocket,
    title: "We Build Capacity",
    desc: "Growing the next generation of tech leaders through mentorship, networking, and career development.",
  },
];

const EXPLORE_PAGES = [
  {
    title: "About Us",
    desc: "Our mission, vision, history and values.",
    href: "/about",
    color: "text-brand-700",
    bg: "from-brand-50 to-green-100",
    img: "/nacos-c-group.jpg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    title: "Executives",
    desc: "Meet our leadership team and course reps.",
    href: "/executives",
    color: "text-blue-700",
    bg: "from-blue-50 to-indigo-100",
    img: "nacos-president.jpg",
  },
  {
    title: "Events",
    desc: "Upcoming workshops, hackathons, and fairs.",
    href: "/events",
    color: "text-purple-700",
    bg: "from-purple-50 to-violet-100",
    img: "/women-event.jpg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    title: "Gallery",
    desc: "Photos and memories from NACOS activities.",
    href: "/gallery",
    color: "text-rose-700",
    bg: "from-rose-50 to-pink-100",
    img: "yr1-gallary - Copy.jpg",
  },
  {
    title: "Blog",
    desc: "Articles, recaps, guides, and announcements.",
    href: "/blog",
    color: "text-orange-700",
    bg: "from-orange-50 to-amber-100",
    img: "/Blog (1).jpg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    title: "Contact",
    desc: "Reach out to the secretariat or exec team.",
    href: "/contact",
    color: "text-teal-700",
    bg: "from-teal-50 to-cyan-100",
    img: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Academic Results",
    desc: "View result slips, track SGPA and CGPA after subscription payment.",
    badge: "Live",
    live: true,
  },
  {
    icon: Vote,
    title: "Dept. Elections",
    desc: "Transparent NACOS elections with cryptographically verified voting.",
    badge: "Phase 3",
    live: false,
  },
  {
    icon: Fingerprint,
    title: "Biometric Attendance",
    desc: "Fingerprint-based exam attendance tracking with live session reports.",
    badge: "Phase 4",
    live: false,
  },
  {
    icon: CreditCard,
    title: "Payments & Dues",
    desc: "Pay school fees and dues via Paystack. Download instant receipts.",
    badge: "Live",
    live: true,
  },
  {
    icon: Bell,
    title: "Notifications",
    desc: "Real-time alerts for results, elections, and announcements.",
    badge: "Live",
    live: true,
  },
  {
    icon: Users,
    title: "Student Management",
    desc: "Admin tools for registration, ID generation, and approvals.",
    badge: "Live",
    live: true,
  },
];

const UPCOMING_EVENTS = [
  {
    date: { month: "MAR", day: "15" },
    title: "Web Development Workshop",
    desc: "Learn modern web development with React, Node.js, and MongoDB.",
    location: "CS Lab 1",
    tag: "Free",
  },
  {
    date: { month: "MAR", day: "22" },
    title: "AI/ML Hackathon 2024",
    desc: "48-hour hackathon focused on AI and machine learning solutions.",
    location: "Main Auditorium",
    tag: "₦2,000",
  },
  {
    date: { month: "APR", day: "05" },
    title: "Career Fair 2024",
    desc: "Connect with top tech companies and explore internship opportunities.",
    location: "University Main Hall",
    tag: "Free",
  },
];

const PROGRAMS = [
  {
    icon: Code2,
    label: "Technical Training",
    desc: "Web dev, AI/ML, cloud, cybersecurity workshops.",
  },
  {
    icon: Lightbulb,
    label: "Innovation Hub",
    desc: "Hackathons, ideathons, startup incubation.",
  },
  {
    icon: Briefcase,
    label: "Career Development",
    desc: "CV clinics, interviews, mentors, recruiters.",
  },
  {
    icon: Network,
    label: "Global Network",
    desc: "1M+ members across 25 NACOS chapters nationwide.",
  },
];

const TESTIMONIALS = [
  {
    text: "NACOS AIFUE gave me the skills and network that landed my fintech internship. Best decision I made on campus.",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "Chibuike A.",
    role: "400L Computer Science",
  },
  {
    text: "The hackathons and workshops are incredible. I built my first full-stack project here and now I freelance.",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "Adaeze N.",
    role: "300L Computer Science",
  },
  {
    text: "NACOS AIFUE prepared me for the real world. I credit this association for where I am today.",
    image: "https://randomuser.me/api/portraits/men/55.jpg",
    name: "Emeka O.",
    role: "Alumni, 2023",
  },
  {
    text: "The elections were so smooth on the new portal! Every vote counted and results were instant. True transparency.",
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    name: "Ngozi U.",
    role: "200L ICT",
  },
  {
    text: "The notification system is a game-changer. I get alerts the moment results drop.",
    image: "https://randomuser.me/api/portraits/men/77.jpg",
    name: "Favour I.",
    role: "300L CRE",
  },
  {
    text: "Paying school fees from my phone without going to the bank? The NACOS portal made that possible.",
    image: "https://randomuser.me/api/portraits/women/22.jpg",
    name: "Chinwe P.",
    role: "400L IT",
  },
  {
    text: "Our Web Dev workshop opened my eyes. I landed a junior developer role before graduating.",
    image: "https://randomuser.me/api/portraits/men/11.jpg",
    name: "Ikenna R.",
    role: "Alumni, 2024",
  },
  {
    text: "NACOS AIFUE is the reason I love computer science. The community made university life meaningful.",
    image: "https://randomuser.me/api/portraits/women/33.jpg",
    name: "Obiageli C.",
    role: "200L Computer Science",
  },
  {
    text: "Admin reviewed my course registration within a day and I got notified immediately. So efficient.",
    image: "https://randomuser.me/api/portraits/men/88.jpg",
    name: "Tobechukwu M.",
    role: "300L Computer Science",
  },
];

const firstColumn = TESTIMONIALS.slice(0, 3);
const secondColumn = TESTIMONIALS.slice(3, 6);
const thirdColumn = TESTIMONIALS.slice(6, 9);

// ── VenLearn-style Portal Mockup ──────────────────────────────────────────────

function PortalMockup() {
  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-8 bg-brand-500/15 rounded-3xl blur-3xl pointer-events-none" />

      {/* Browser shell */}
      <div className="relative rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/10">
        {/* Chrome bar */}
        <div className="bg-[#1a1d2e] px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 bg-[#252836] rounded-md px-3 py-1 text-[11px] text-gray-400 text-center font-mono">
            portal.nacos-aifue.edu.ng/student/dashboard
          </div>
          <div className="flex gap-1.5">
            <div className="w-5 h-5 rounded bg-white/5" />
            <div className="w-5 h-5 rounded bg-white/5" />
          </div>
        </div>

        {/* Dashboard layout */}
        <div className="flex" style={{ height: "400px" }}>
          {/* Sidebar */}
          <div
            className="w-40 flex-shrink-0 flex flex-col"
            style={{
              background: "linear-gradient(180deg, #052e16 0%, #14532d 100%)",
            }}
          >
            <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
              <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-[10px]">N</span>
              </div>
              <div>
                <p className="text-white font-bold text-[11px] leading-tight">
                  NACOS Portal
                </p>
                <p className="text-brand-400 text-[9px]">AIFUE · Student</p>
              </div>
            </div>
            <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
              {[
                { icon: "🏠", label: "Dashboard", active: true },
                { icon: "📋", label: "My Results", active: false },
                { icon: "📈", label: "Transcript", active: false },
                { icon: "💰", label: "School Fees", active: false },
                { icon: "📝", label: "Registration", active: false },
                { icon: "🗳️", label: "Elections", active: false },
                { icon: "🔔", label: "Notifications", active: false },
                { icon: "👤", label: "Profile", active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
                    item.active
                      ? "bg-brand-500/25 text-white ring-1 ring-brand-500/30"
                      : "text-white/50"
                  }`}
                >
                  <span className="text-sm leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </nav>
            <div className="p-2 border-t border-white/10">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
                {/* Passport photo avatar */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-[9px] flex-shrink-0 overflow-hidden">
                  <span>VC</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-[10px] font-semibold truncate">
                    Victor C.
                  </p>
                  <p className="text-brand-400 text-[9px]">400L · CSC</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main area */}
          <div className="flex-1 flex flex-col bg-[#f4f6f9] overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
              <h2 className="text-gray-900 font-bold text-[11px]">Dashboard</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <Bell className="w-3 h-3 text-gray-500" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center text-white text-[7px] font-bold">
                    3
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 hidden sm:block">
                  May 2025
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-2.5 overflow-hidden space-y-2.5">
              {/* Hero banner — green gradient like real dashboard */}
              <div
                className="rounded-xl overflow-hidden relative"
                style={{
                  background:
                    "linear-gradient(135deg, #052e16 0%, #14532d 60%, #16a34a 100%)",
                }}
              >
                {/* Orb */}
                <div
                  className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 blur-xl"
                  style={{
                    background: "radial-gradient(circle, #4ade80, transparent)",
                  }}
                />
                <div className="relative p-3">
                  {/* Top row: avatar + name + CGPA */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      {/* Passport photo (simulated) */}
                      <div
                        className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden shadow-lg"
                        style={{
                          background: "linear-gradient(135deg,#16a34a,#052e16)",
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-[11px]">
                          VC
                        </div>
                      </div>
                      <div>
                        <p className="text-brand-300 text-[8px] font-medium">
                          Good morning 👋
                        </p>
                        <p className="text-white font-bold text-[11px] leading-tight">
                          Victor Chibuike
                        </p>
                        <p className="text-brand-300 text-[8px]">
                          CSC · 400L · NACOS/CSC/2024/47291
                        </p>
                      </div>
                    </div>
                    {/* CGPA pill */}
                    <div className="bg-white/15 border border-white/20 rounded-xl px-2.5 py-1.5 text-center backdrop-blur-sm flex-shrink-0">
                      <div className="text-white font-black text-base leading-none">
                        4.51
                      </div>
                      <div className="text-brand-300 text-[8px] font-bold uppercase tracking-widest mt-0.5">
                        CGPA
                      </div>
                    </div>
                  </div>

                  {/* 6 stat cards: Credits, Semesters, Results | NACOS Due, School Fees, Course Form */}
                  <div className="grid grid-cols-6 gap-1.5">
                    {[
                      { label: "Credits", value: "48", sub: "earned" },
                      { label: "Semesters", value: "4", sub: "done" },
                      { label: "Results", value: "3/5", sub: "subscribed" },
                      {
                        label: "NACOS Due",
                        value: "2/8",
                        sub: "semesters",
                        amber: true,
                      },
                      {
                        label: "School Fees",
                        value: "1/8",
                        sub: "semesters",
                        red: true,
                      },
                      {
                        label: "Course Form",
                        value: "3/8",
                        sub: "verified",
                        amber: true,
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="bg-white/10 border border-white/15 rounded-lg px-1 py-1.5 text-center"
                      >
                        <div
                          className={`font-black text-[11px] leading-none ${s.red ? "text-red-300" : s.amber ? "text-yellow-300" : "text-white"}`}
                        >
                          {s.value}
                        </div>
                        <div className="text-brand-300 text-[7px] font-semibold mt-0.5 leading-tight truncate">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom panels row */}
              <div className="grid grid-cols-2 gap-2">
                {/* Recent Results */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-800">
                      📋 Recent Results
                    </span>
                    <span className="text-[8px] text-brand-600 font-semibold">
                      View All →
                    </span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {[
                      {
                        code: "CSC 301",
                        name: "Data Structures",
                        grade: "A",
                        pct: 78,
                        color: "bg-green-500",
                      },
                      {
                        code: "CSC 305",
                        name: "Web Engineering",
                        grade: "B",
                        pct: 65,
                        color: "bg-blue-500",
                      },
                      {
                        code: "CSC 311",
                        name: "Networks",
                        grade: "A",
                        pct: 81,
                        color: "bg-green-500",
                      },
                    ].map((r) => (
                      <div key={r.code} className="flex items-center gap-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] font-semibold text-gray-700 truncate">
                              {r.code}
                            </span>
                            <span
                              className={`text-[9px] font-bold ml-1 flex-shrink-0 ${r.grade === "A" ? "text-green-600" : "text-blue-600"}`}
                            >
                              {r.grade}
                            </span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${r.color} rounded-full`}
                              style={{ width: `${r.pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Required */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-800">
                      ⚡ Action Required
                    </span>
                    <span className="bg-orange-100 text-orange-700 text-[8px] font-bold px-1 py-0.5 rounded-full">
                      2 urgent
                    </span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {[
                      {
                        dot: "bg-orange-400",
                        text: "Pay for CSC 301 result",
                        urgent: true,
                      },
                      {
                        dot: "bg-orange-400",
                        text: "NACOS due outstanding",
                        urgent: true,
                      },
                      {
                        dot: "bg-brand-400",
                        text: "Course form pending",
                        urgent: false,
                      },
                      {
                        dot: "bg-blue-400",
                        text: "3 new notifications",
                        urgent: false,
                      },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.dot}`}
                        />
                        <span
                          className={`text-[9px] ${a.urgent ? "text-orange-700 font-semibold" : "text-gray-500"}`}
                        >
                          {a.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 overflow-x-hidden">
      {/* ── STICKY NAV ───────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-gray-100"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-400/20 rounded-full blur-md group-hover:bg-brand-400/30 transition-all" />
              <div
                className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-colors ${scrolled ? "bg-white/80" : "bg-white/90"} shadow-md`}
              >
                <NacosLogo size={32} />
              </div>
            </div>
            <div>
              <p
                className={`font-bold text-sm leading-tight transition-colors ${scrolled ? "text-brand-900" : "text-white"}`}
              >
                NACOS AIFUE
              </p>
              <p
                className={`text-xs transition-colors ${scrolled ? "text-brand-500" : "text-brand-200"}`}
              >
                Computer Science Chapter
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                className={`text-sm font-medium transition-all hover:opacity-100 ${
                  scrolled
                    ? "text-gray-600 hover:text-brand-700"
                    : "text-white/75 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/auth/login"
              className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${
                scrolled
                  ? "text-gray-600 hover:text-brand-700"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Sign In
            </Link>
            <Link
              to="/auth/validate"
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-900/30 hover:shadow-brand-900/50 hover:-translate-y-0.5"
            >
              Join Us →
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 rounded-xl transition-colors ${scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10"}`}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 px-6 py-4 space-y-1 shadow-xl">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 hover:text-brand-700 py-2"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 flex gap-2">
              <Link
                to="/auth/login"
                className="flex-1 text-center text-sm font-medium text-brand-700 border border-brand-200 py-2.5 rounded-xl"
              >
                Sign In
              </Link>
              <Link
                to="/auth/validate"
                className="flex-1 text-center bg-brand-600 text-white text-sm font-bold py-2.5 rounded-xl"
              >
                Join Us
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-32 sm:pb-24"
        style={{
          background:
            "linear-gradient(135deg, #052e16 0%, #14532d 35%, #166534 65%, #15803d 100%)",
        }}
      >
        {/* Photo overlay — real image showing through */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/IMG_0982.jpg)", opacity: 0.65 }}
        />
        {/* Minimal dark scrim so text stays legible */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="hero-grid"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center z-10">
          {/* Logo + badge row */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center gap-4 mb-8"
          >
            <div className="relative inline-flex items-center justify-center">
              {/* Glow ring */}
              <div className="absolute -inset-4 bg-white/20 rounded-full blur-2xl" />
              {/* White circle background */}
              <div className="relative w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.4)] ring-4 ring-white/30">
                <NacosLogo size={38} />
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-brand-200 text-[11px] sm:text-xs font-semibold px-3 sm:px-5 py-2 rounded-full backdrop-blur-sm text-center">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
              <span>
                National Association of Computing Students · AIFUE Chapter ·
                Est. 2010
              </span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] mb-5"
          >
            Towards Advanced
            <span className="block text-green-400 italic drop-shadow-[0_0_30px_rgba(74,222,128,0.5)]">
              Computing
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="text-yellow-400 font-bold text-lg tracking-widest mb-5 uppercase"
          >
            We Develop · We Create · We Build Capacity
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-white/65 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The official portal of NACOS-AIFUE — your gateway to academic
            results, elections, payments, and everything that powers your
            computing journey at AIFUE, Owerri.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.52 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/auth/login"
              className="group relative inline-flex items-center justify-center gap-2.5 bg-white text-brand-900 font-bold px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl hover:bg-brand-50 transition-all shadow-2xl hover:-translate-y-1 text-sm sm:text-base overflow-hidden w-full sm:w-auto"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              Access Student Portal
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/auth/validate"
              className="inline-flex items-center justify-center gap-2.5 border-2 border-white/30 text-white font-semibold px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl hover:bg-white/10 hover:border-white/50 transition-all text-sm sm:text-base backdrop-blur-sm w-full sm:w-auto"
            >
              Activate Account
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </motion.div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg
            viewBox="0 0 1440 90"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-20"
          >
            <path
              d="M0 90L48 78C96 66 192 42 288 34C384 26 480 34 576 42C672 50 768 58 864 54C960 50 1056 34 1152 26C1248 18 1344 18 1392 18L1440 18V90H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* ── MISSION PILLARS ───────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-50/30 to-transparent pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <span className="inline-block bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-brand-200 mb-5">
                Our Purpose
              </span>
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-5">
                What Drives Us
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto text-lg leading-relaxed">
                Fostering excellence in computer science education, promoting
                innovation, and building capacity — bridging academia and
                industry.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MISSION_PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: i * 0.12 }}
                viewport={{ once: true }}
                className={`group relative rounded-3xl p-8 overflow-hidden transition-all hover:-translate-y-2 hover:shadow-2xl ${
                  i === 1
                    ? "text-white"
                    : "bg-white border border-gray-200 hover:border-brand-300"
                }`}
                style={
                  i === 1
                    ? {
                        background:
                          "linear-gradient(135deg, #052e16 0%, #166534 100%)",
                      }
                    : {}
                }
              >
                {i === 1 && (
                  <div
                    className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 blur-2xl"
                    style={{
                      background:
                        "radial-gradient(circle, #4ade80, transparent)",
                    }}
                  />
                )}
                <div
                  className={`relative w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
                    i === 1
                      ? "bg-brand-500/30 ring-1 ring-brand-400/30"
                      : "bg-brand-600 shadow-brand-600/40"
                  }`}
                >
                  <p.icon className="w-7 h-7 text-white" />
                </div>
                <h3
                  className={`font-display text-2xl font-bold mb-3 ${i === 1 ? "text-white" : "text-gray-900"}`}
                >
                  {p.title}
                </h3>
                <p
                  className={`leading-relaxed ${i === 1 ? "text-brand-200" : "text-gray-600"}`}
                >
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-brand-700 font-semibold hover:text-brand-900 transition-colors text-sm group"
            >
              Learn more about NACOS-AIFUE
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── PORTAL PREVIEW ───────────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0a0f1e 0%, #0d1a0d 50%, #0a1a0a 100%)",
        }}
      >
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="dots"
                width="30"
                height="30"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="15" cy="15" r="1.2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <span className="inline-block bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
              Student Portal
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Your Academic Life,
              <span className="block bg-gradient-to-r from-brand-400 to-emerald-300 bg-clip-text text-transparent">
                All in One Place
              </span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-8 text-base">
              Access results, pay dues, track attendance, vote in elections, and
              receive real-time notifications — all from a single secure
              platform built for NACOS-AIFUE members.
            </p>

            <div className="space-y-3 mb-8">
              {[
                {
                  icon: TrendingUp,
                  text: "View semester results & CGPA instantly",
                },
                {
                  icon: Shield,
                  text: "Pay school fees & dues via Paystack securely",
                },
                { icon: Zap, text: "Submit & track course registration forms" },
                { icon: Bell, text: "Get notified of results & announcements" },
              ].map((feat) => (
                <div key={feat.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                    <feat.icon className="w-4 h-4 text-brand-400" />
                  </div>
                  <span className="text-gray-300 text-sm">{feat.text}</span>
                </div>
              ))}
            </div>

            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-brand-900/40 hover:-translate-y-0.5 text-sm"
            >
              Access Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Mockup side — scrollable on mobile */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            viewport={{ once: true }}
            className="w-full overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 sm:overflow-visible"
          >
            <div className="min-w-[580px] sm:min-w-0">
              <PortalMockup />
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
      </section>

      {/* ── EXPLORE OUR PAGES ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-brand-200 mb-5">
              Navigate
            </span>
            <h2 className="font-display text-5xl font-bold text-gray-900 mb-3">
              Explore Our Pages
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Everything about NACOS-AIFUE, all in one place.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {EXPLORE_PAGES.map((page, i) => (
              <motion.div
                key={page.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                viewport={{ once: true }}
              >
                <Link
                  to={page.href}
                  className="block rounded-2xl overflow-hidden border border-gray-200 hover:border-transparent hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"
                >
                  <div className="h-44 overflow-hidden relative">
                    <img
                      src={page.img}
                      alt={page.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                  <div className={`p-5 bg-gradient-to-br ${page.bg}`}>
                    <h3 className={`font-bold text-lg mb-1.5 ${page.color}`}>
                      {page.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                      {page.desc}
                    </p>
                    <span
                      className={`text-sm font-bold ${page.color} flex items-center gap-1.5 group-hover:gap-2.5 transition-all`}
                    >
                      View More <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROGRAMS ─────────────────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-20 px-4 sm:px-6 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-white text-brand-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-brand-200 mb-5">
              What We Offer
            </span>
            <h2 className="font-display text-4xl font-bold text-gray-900">
              Programs & Initiatives
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PROGRAMS.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-brand-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-emerald-500 flex items-center justify-center mb-5 shadow-lg shadow-brand-600/30 group-hover:scale-110 transition-transform">
                  <p.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{p.label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PORTAL FEATURES (DARK) ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden bg-brand-900">
        <div className="absolute inset-0 opacity-[0.04]">
          <svg width="100%" height="100%">
            <defs>
              <pattern
                id="dots2"
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="18" cy="18" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots2)" />
          </svg>
        </div>
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />

        <div className="relative max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block bg-brand-800 text-brand-300 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-brand-700 mb-5">
              Features
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-white mb-4">
              Everything in One Place
            </h2>
            <p className="text-brand-300 max-w-lg mx-auto leading-relaxed">
              One secure platform for your entire academic life at AIFUE.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                viewport={{ once: true }}
                className={`group rounded-2xl p-6 border transition-all hover:-translate-y-1 cursor-default ${
                  f.live
                    ? "bg-white/8 border-brand-500/30 hover:bg-white/12 hover:border-brand-400/50 hover:shadow-lg hover:shadow-brand-900/50"
                    : "bg-white/3 border-white/8"
                }`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${
                      f.live
                        ? "bg-gradient-to-br from-brand-600 to-emerald-500 shadow-brand-900/40"
                        : "bg-white/8"
                    }`}
                  >
                    <f.icon
                      className={`w-5 h-5 ${f.live ? "text-white" : "text-white/30"}`}
                    />
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      f.live
                        ? "bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30"
                        : "bg-white/8 text-white/25"
                    }`}
                  >
                    {f.badge}
                  </span>
                </div>
                <h3
                  className={`font-bold mb-2 ${f.live ? "text-white" : "text-white/35"}`}
                >
                  {f.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${f.live ? "text-brand-200/80" : "text-white/20"}`}
                >
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2.5 bg-white text-brand-900 font-bold px-9 py-4 rounded-2xl hover:bg-brand-50 transition-all shadow-2xl hover:-translate-y-0.5 text-sm"
            >
              Access Your Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-400/30 to-transparent" />
      </section>

      {/* ── UPCOMING EVENTS ───────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-8 sm:mb-12 gap-4 flex-wrap">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <span className="inline-block bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-brand-200 mb-3">
                Calendar
              </span>
              <h2 className="font-display text-4xl font-bold text-gray-900">
                Upcoming Events
              </h2>
            </motion.div>
            <Link
              to="/events"
              className="text-sm text-brand-700 font-semibold hover:text-brand-900 flex items-center gap-1 whitespace-nowrap group"
            >
              View all{" "}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-4">
            {UPCOMING_EVENTS.map((ev, i) => (
              <motion.div
                key={ev.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group flex gap-3 sm:gap-5 bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-900/5 transition-all"
              >
                <div className="flex-shrink-0 text-center bg-gradient-to-br from-brand-50 to-green-100 border border-brand-200 rounded-2xl px-4 py-3 min-w-[72px]">
                  <div className="text-xs font-bold text-brand-600 uppercase tracking-wide">
                    {ev.date.month}
                  </div>
                  <div className="font-display text-3xl font-bold text-brand-900 leading-none">
                    {ev.date.day}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-brand-700 transition-colors">
                      {ev.title}
                    </h3>
                    <span
                      className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                        ev.tag === "Free"
                          ? "bg-brand-100 text-brand-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {ev.tag}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{ev.desc}</p>
                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                    <MapPin className="w-3 h-3" />
                    {ev.location}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANIMATED TESTIMONIALS ─────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #f8fafb 0%, #f0fdf4 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="flex flex-col items-center max-w-2xl mx-auto mb-14 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block bg-white text-brand-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-brand-200 mb-5">
              Member Stories
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-4">
              What Our Members Say
            </h2>
            <p className="text-gray-500 max-w-md leading-relaxed">
              Real experiences from NACOS-AIFUE students and alumni across all
              levels and programmes.
            </p>
          </motion.div>

          <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] max-h-[700px] overflow-hidden">
            <TestimonialsColumn testimonials={firstColumn} duration={16} />
            <TestimonialsColumn
              testimonials={secondColumn}
              className="hidden md:block"
              duration={21}
            />
            <TestimonialsColumn
              testimonials={thirdColumn}
              className="hidden lg:block"
              duration={18}
            />
          </div>
        </div>
      </section>

      {/* ── CONTACT CTA ───────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="relative rounded-3xl p-6 sm:p-10 md:p-14 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)",
            }}
          >
            {/* Decorative orbs */}
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
              style={{
                background: "radial-gradient(circle, #4ade80, transparent)",
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-15 blur-3xl pointer-events-none"
              style={{
                background: "radial-gradient(circle, #f59e0b, transparent)",
              }}
            />

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to join the NACOS family?
                </h2>
                <p className="text-brand-200 leading-relaxed mb-7">
                  Activate your portal account and unlock everything NACOS-AIFUE
                  has to offer for your academic journey.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/auth/login"
                    className="inline-flex items-center gap-2 bg-white text-brand-900 font-bold px-7 py-3.5 rounded-xl hover:bg-brand-50 transition-all shadow-xl text-sm hover:-translate-y-0.5"
                  >
                    Sign In to Portal <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/auth/validate"
                    className="inline-flex items-center gap-2 border border-brand-500/60 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-brand-800/50 transition-all text-sm backdrop-blur-sm"
                  >
                    Activate Account
                  </Link>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: Mail,
                    text: "nacos@aifue.edu.ng",
                    sub: "Email us anytime",
                  },
                  {
                    icon: Phone,
                    text: "+234 803 123 4567",
                    sub: "Mon–Fri, 9am–5pm",
                  },
                  {
                    icon: MapPin,
                    text: "CS Dept, AIFUE, Owerri",
                    sub: "Imo State, Nigeria",
                  },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brand-700/50 border border-brand-600/40 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-brand-300" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {item.text}
                      </p>
                      <p className="text-brand-400 text-xs mt-0.5">
                        {item.sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer
        className="text-brand-300 py-12 sm:py-14 px-4 sm:px-6"
        style={{
          background: "linear-gradient(180deg, #052e16 0%, #030f09 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <NacosLogo size={44} className="drop-shadow-lg" />
                <div>
                  <p className="font-bold text-white text-base">NACOS AIFUE</p>
                  <p className="text-brand-500 text-xs">
                    Towards Advanced Computing
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-xs mb-5 text-brand-400">
                Alvan Ikoku Federal University of Education, Owerri — advancing
                computer science education since 2010.
              </p>
              <div className="space-y-1.5 text-xs text-brand-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> nacos@aifue.edu.ng
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> +234 803 123 4567
                </div>
              </div>
            </div>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">
                Website
              </p>
              <ul className="space-y-2 text-sm">
                {NAV_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.href}
                      className="text-brand-400 hover:text-white transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">
                Portal
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/auth/login"
                    className="text-brand-400 hover:text-white transition-colors"
                  >
                    Student Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/auth/validate"
                    className="text-brand-400 hover:text-white transition-colors"
                  >
                    Activate Account
                  </Link>
                </li>
                <li>
                  <Link
                    to="/auth/forgot-password"
                    className="text-brand-400 hover:text-white transition-colors"
                  >
                    Forgot Password
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-brand-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-600 text-center sm:text-left">
            <p>
              © {year} NACOS-AIFUE. All rights reserved. Computer Science Dept,
              AIFUE, Owerri.
            </p>
            <p>We Develop · We Create · We Build Capacity</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
