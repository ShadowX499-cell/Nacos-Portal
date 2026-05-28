import { Link } from 'react-router-dom';

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <header className="bg-brand-900 text-white">
        <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <span className="text-brand-900 font-bold">N</span>
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">NACOS-AIFUE</p>
              <p className="text-brand-300 text-xs">Computer Science Dept.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="#about" className="text-brand-200 hover:text-white transition-colors hidden sm:block">
              About
            </a>
            <Link to="/auth/validate" className="text-brand-200 hover:text-white transition-colors">
              Activate Account
            </Link>
            <Link to="/auth/login" className="btn bg-white text-brand-900 hover:bg-brand-50 px-4 py-2 rounded-lg font-semibold text-sm">
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-brand-600/50 text-brand-100 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            Aifue University
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Computer Science Department
            <br />
            <span className="text-brand-300">Student Portal</span>
          </h1>
          <p className="text-brand-100 text-lg max-w-2xl mx-auto mb-10">
            Access your academic results, participate in elections, track attendance,
            and manage your NACOS membership — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/login" className="btn-primary btn-lg text-base shadow-lg">
              Student Login
            </Link>
            <Link to="/auth/validate" className="btn bg-brand-700 hover:bg-brand-600 text-white border border-brand-500 px-6 py-3 rounded-lg font-semibold text-base transition-colors">
              First Time? Activate Account →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50" id="about">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Everything You Need</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              The NACOS-AIFUE portal brings all your academic and departmental activities
              together in a secure, easy-to-use platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '📊',
                title: 'Academic Results',
                desc: 'View semester results, download result slips, track your GPA and CGPA — available after result subscription.',
                badge: 'Phase 2',
                available: false,
              },
              {
                icon: '🗳️',
                title: 'Departmental Elections',
                desc: 'Participate in transparent NACOS elections with a verified voting system and instant result publication.',
                badge: 'Phase 3',
                available: false,
              },
              {
                icon: '🖐️',
                title: 'Biometric Attendance',
                desc: 'Fast fingerprint-based exam attendance tracking with real-time session reports.',
                badge: 'Phase 4',
                available: false,
              },
              {
                icon: '💳',
                title: 'NACOS Dues & Payments',
                desc: 'Pay NACOS dues and result subscriptions securely via Paystack and download receipts.',
                badge: 'Phase 3',
                available: false,
              },
              {
                icon: '🔔',
                title: 'Notifications',
                desc: 'Receive real-time in-app and email notifications for results, elections, and announcements.',
                badge: 'Phase 3',
                available: false,
              },
              {
                icon: '👤',
                title: 'Student Management',
                desc: 'Admins can register students, generate IDs, and manage profiles through a powerful admin panel.',
                badge: 'Phase 1 ✓',
                available: true,
              },
            ].map((f) => (
              <div
                key={f.title}
                className={`card p-6 ${f.available ? 'border-brand-200 bg-brand-50/30' : ''}`}
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{f.title}</h3>
                  <span className={`badge text-xs ${f.available ? 'badge-green' : 'badge-blue'}`}>
                    {f.badge}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-brand-800 text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Already have your Student ID?</h2>
        <p className="text-brand-200 mb-8">
          Check your email for your NACOS ID, then activate your account to get started.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/auth/validate" className="btn bg-white text-brand-900 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors">
            Activate Account
          </Link>
          <Link to="/auth/login" className="btn border border-brand-500 text-white hover:bg-brand-700 px-6 py-3 rounded-lg font-semibold transition-colors">
            Sign In
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-sm">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white">NACOS-AIFUE</p>
            <p>Computer Science Department · Aifue University</p>
          </div>
          <div className="flex gap-6 text-xs">
            <Link to="/auth/login" className="hover:text-white transition-colors">Student Login</Link>
            <Link to="/auth/validate" className="hover:text-white transition-colors">Activate Account</Link>
          </div>
          <p className="text-xs">© {year} NACOS-AIFUE. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
