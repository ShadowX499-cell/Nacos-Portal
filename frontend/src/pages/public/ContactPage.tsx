import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'Email',
    lines: ['nacos@aifue.edu.ng', 'info@nacos-aifue.org'],
  },
  {
    icon: Phone,
    label: 'Phone',
    lines: ['+234 803 123 4567', '+234 806 789 0123'],
  },
  {
    icon: MapPin,
    label: 'Office Location',
    lines: ['Computer Science Department', 'Alvan Ikoku Federal University of Education', 'Owerri, Imo State, Nigeria'],
  },
  {
    icon: Clock,
    label: 'Office Hours',
    lines: ['Mon – Fri: 9:00 AM – 5:00 PM', 'Saturday: 10:00 AM – 2:00 PM', 'Sunday: Closed'],
  },
];

const EXECUTIVES_CONTACT = [
  { name: 'Comr. Uzoma Victor Chukwuemeka', position: 'President',          email: 'president@nacos-aifue.org' },
  { name: 'Comr. Egboh Miracle Chiamaka',   position: 'Vice President',     email: 'vp@nacos-aifue.org' },
  { name: 'Comr. Innocent Lilian Chinonye', position: 'Secretary General',  email: 'secretary@nacos-aifue.org' },
  { name: 'Comr. Opara Christian Ugonna',   position: 'Financial Secretary', email: 'finance@nacos-aifue.org' },
];

const CATEGORIES = ['General Inquiry', 'Membership', 'Events', 'Partnership', 'Technical Support', 'Feedback'];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', category: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-brand-900 text-white py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern></defs>
            <rect width="100%" height="100%" fill="url(#g)" />
          </svg>
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block text-brand-300 text-xs font-bold uppercase tracking-widest mb-4">Reach Us</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-6">Contact Us</h1>
          <p className="text-brand-100 text-lg max-w-2xl mx-auto leading-relaxed">
            Questions about the portal, membership, or upcoming events? We respond within 24 hours.
          </p>
        </div>
      </section>

      {/* Contact grid */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact form */}
          <div>
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Message Us</span>
            <h2 className="font-display text-3xl font-bold text-gray-900 mt-2 mb-8">Send a Message</h2>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
              {sent ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-brand-700" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Message Sent!</h3>
                  <p className="text-sm text-gray-500 mb-6">Thanks for reaching out. We'll get back to you within 24 hours.</p>
                  <button onClick={() => { setSent(false); setForm({ name: '', email: '', category: '', message: '' }); }}
                    className="text-sm text-brand-700 font-medium hover:underline">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label" htmlFor="cf-name">Full Name</label>
                      <input id="cf-name" type="text" placeholder="Your full name" className="input"
                        value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div>
                      <label className="label" htmlFor="cf-email">Email Address</label>
                      <input id="cf-email" type="email" placeholder="you@example.com" className="input"
                        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="cf-cat">Category</label>
                    <select id="cf-cat" className="input"
                      value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                      <option value="">Select a category…</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="cf-msg">Message</label>
                    <textarea id="cf-msg" rows={5} placeholder="How can we help you?" className="input resize-none"
                      value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                  </div>
                  <button type="submit" className="btn-primary w-full btn-lg">Send Message</button>
                </form>
              )}
            </div>
          </div>

          {/* Contact info */}
          <div>
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Details</span>
            <h2 className="font-display text-3xl font-bold text-gray-900 mt-2 mb-8">Contact Information</h2>

            <div className="space-y-4 mb-8">
              {CONTACT_INFO.map((item) => (
                <div key={item.label} className="flex gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="w-11 h-11 bg-brand-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                    {item.lines.map((line) => (
                      <p key={line} className="text-sm text-gray-800">{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick portal access */}
            <div className="bg-brand-50 rounded-2xl border border-brand-100 p-5">
              <h3 className="font-bold text-brand-900 text-sm mb-3">Quick Portal Access</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Student Login',     href: '/auth/login' },
                  { label: 'Activate Account',  href: '/auth/validate' },
                  { label: 'Forgot Password',   href: '/auth/forgot-password' },
                  { label: 'View Executives',   href: '/executives' },
                ].map((link) => (
                  <Link key={link.href} to={link.href}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-900 bg-white rounded-xl px-3 py-2.5 hover:bg-brand-50 transition-colors border border-brand-100">
                    <ArrowRight className="w-3 h-3 flex-shrink-0" /> {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Executive contacts */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Leadership</span>
            <h2 className="font-display text-3xl font-bold text-gray-900 mt-2">Contact Executive Team</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EXECUTIVES_CONTACT.map((exec) => (
              <div key={exec.name} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-brand-200 hover:shadow-sm transition-all text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center text-white font-bold text-sm mx-auto mb-3">
                  {exec.name.split(' ').slice(1).map(w => w[0]).slice(0, 2).join('')}
                </div>
                <h3 className="font-bold text-gray-900 text-xs leading-tight mb-0.5">{exec.name}</h3>
                <p className="text-brand-700 text-xs font-semibold mb-3">{exec.position}</p>
                <a href={`mailto:${exec.email}`}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-700 transition-colors">
                  <Mail className="w-3 h-3" /> {exec.email}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-brand-700 text-white text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Already a Member?</h2>
        <p className="text-brand-100 mb-8 max-w-lg mx-auto">
          Sign in to the student portal to access your results, notifications, and departmental updates.
        </p>
        <Link to="/auth/login"
          className="inline-flex items-center gap-2 bg-white text-brand-800 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors text-sm">
          Go to Student Portal <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
