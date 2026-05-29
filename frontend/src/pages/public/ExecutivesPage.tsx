import { Mail, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const EXECUTIVES = [
  {
    name: 'Comr. Uzoma Victor Chukwuemeka',
    position: 'President',
    level: '400L Computer Science',
    bio: 'Passionate about artificial intelligence and machine learning. Led multiple successful hackathons and has interned at top tech companies. Committed to advancing NACOS-AIFUE to new heights.',
    email: 'president@nacos-aifue.org',
    initials: 'UVC',
  },
  {
    name: 'Comr. Egboh Miracle Chiamaka',
    position: 'Vice President',
    level: '400L Computer Science',
    bio: 'Full-stack developer with expertise in React and Node.js. Organises technical workshops and mentorship programs. Advocates for women in tech and diversity in computing.',
    email: 'vp@nacos-aifue.org',
    initials: 'EMC',
  },
  {
    name: 'Comr. Innocent Lilian Chinonye',
    position: 'Secretary General',
    level: '400L Computer Science',
    bio: 'Detail-oriented leader with excellent organisational skills. Manages all chapter documentation and communications. Active in open-source projects and community building.',
    email: 'secretary@nacos-aifue.org',
    initials: 'ILC',
  },
  {
    name: 'Comr. Opara Christian Ugonna',
    position: 'Financial Secretary',
    level: '400L Computer Science',
    bio: 'Expert in financial management and budgeting. Ensures transparent handling of chapter funds and coordinates fundraising activities. Background in fintech development.',
    email: 'finance@nacos-aifue.org',
    initials: 'OCU',
  },
  {
    name: 'Comr. Okezue Akachukwu Favour',
    position: 'Director of Software',
    level: '300L Computer Science',
    bio: 'Expert in cloud computing and DevOps practices. Leads technical training sessions and manages chapter IT infrastructure. AWS certified solutions architect.',
    email: 'tech@nacos-aifue.org',
    initials: 'OAF',
  },
  {
    name: 'Comr. Oparanozie Franklyn',
    position: 'Director of Information',
    level: '300L Computer Science',
    bio: 'Creative communicator and social media strategist. Manages chapter branding and external communications. Passionate about digital marketing and content creation.',
    email: 'pro@nacos-aifue.org',
    initials: 'OF',
  },
  {
    name: 'Comr. Ohabunwa Favour Mmesoma',
    position: 'Assistant Secretary General',
    level: '300L Computer Science',
    bio: 'Event planning specialist who organises memorable social activities and networking events. Focuses on building strong community bonds among members.',
    email: 'social@nacos-aifue.org',
    initials: 'OFM',
  },
  {
    name: 'Comr. Dike Stephen Amarachukwu',
    position: 'Director of Sports',
    level: '400L Information Technology',
    bio: 'Promotes physical fitness and wellness among members. Organises inter-departmental competitions and recreational activities. Believes in work-life balance.',
    email: 'sports@nacos-aifue.org',
    initials: 'DSA',
  },
];

const COURSE_REPS = [
  { name: 'Emmanuel Uchechukwu Ejims',  position: '100L Course Representative',       level: '100L Computer Science', initials: 'EUE' },
  { name: 'Adaobi Nwosu',               position: '100L Asst. Course Representative', level: '100L Computer Science', initials: 'AN' },
  { name: 'Emeka Uche',                 position: '200L Course Representative',       level: '200L Computer Science', initials: 'EU' },
  { name: 'Ngozi Eze',                  position: '200L Asst. Course Representative', level: '200L Computer Science', initials: 'NE' },
  { name: 'Ajunwa Mmesomachi Happiness', position: '300L Course Representative',      level: '300L Computer Science', initials: 'AMH' },
  { name: 'Okoro Felix Nzube',          position: '300L Asst. Course Representative', level: '300L Computer Science', initials: 'OFN' },
  { name: 'Mark Catherine Maduabuchi',  position: '400L Course Representative',       level: '400L Computer Science', initials: 'MCM' },
  { name: 'Dikeh Stephen Amarachukwu',  position: '400L Asst. Course Representative', level: '400L Computer Science', initials: 'DSA' },
];

const ORG_STRUCTURE = [
  { num: 1, title: 'Executive Leadership',  desc: 'President and Vice President provide strategic direction and overall leadership.' },
  { num: 2, title: 'Administrative Team',   desc: 'Secretary General and Financial Secretary handle documentation and finances.' },
  { num: 3, title: 'Technical & PR',        desc: 'Director of Software and Director of Information manage technology and communications.' },
  { num: 4, title: 'Community & Wellness',  desc: 'Assistant Secretary General and Director of Sports focus on member engagement and well-being.' },
];

function Avatar({ initials, size = 'md' }: { initials: string; size?: 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-20 h-20 text-xl' : 'w-14 h-14 text-sm';
  return (
    <div className={`${sz} rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function ExecutivesPage() {
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
          <span className="inline-block text-brand-300 text-xs font-bold uppercase tracking-widest mb-4">Leadership</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-6">Our Executive Team</h1>
          <p className="text-brand-100 text-lg max-w-2xl mx-auto leading-relaxed">
            Meet the dedicated leaders driving innovation and excellence in our chapter. Our executives
            bring diverse skills and unwavering commitment to serve our community.
          </p>
        </div>
      </section>

      {/* Leadership message */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold text-gray-900 mb-5">Leadership Excellence</h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
            Our executive team represents the best of NACOS-AIFUE — combining technical expertise,
            leadership skills, and a passion for advancing computer science education. Each member
            brings unique perspectives and experiences to guide our chapter toward continued success.
          </p>
        </div>
      </section>

      {/* Executives grid */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Council</span>
            <h2 className="font-display text-3xl font-bold text-gray-900 mt-2">Executive Council</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {EXECUTIVES.map((exec) => (
              <div key={exec.name}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-brand-300 hover:shadow-md transition-all">
                <Avatar initials={exec.initials} size="lg" />
                <div className="mt-4">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{exec.name}</h3>
                  <p className="text-brand-700 font-semibold text-xs mt-1">{exec.position}</p>
                  <p className="text-gray-400 text-xs mt-0.5 mb-3">{exec.level}</p>
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{exec.bio}</p>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <a href={`mailto:${exec.email}`}
                    className="p-2 text-gray-400 hover:text-brand-700 transition-colors rounded-lg hover:bg-brand-50" title="Email">
                    <Mail className="w-4 h-4" />
                  </a>
                  <a href="#" className="p-2 text-gray-400 hover:text-brand-700 transition-colors rounded-lg hover:bg-brand-50" title="LinkedIn">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Org structure */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Structure</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-2 mb-3">Organisational Structure</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Our executive structure ensures effective governance and representation across all aspects of chapter operations.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {ORG_STRUCTURE.map((s) => (
              <div key={s.num} className="text-center p-6 bg-brand-50 rounded-2xl border border-brand-100">
                <div className="w-14 h-14 bg-brand-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 font-display text-xl font-bold">
                  {s.num}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{s.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course reps */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Representatives</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-2 mb-3">Course Representatives</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Course reps and their assistants for each level — ensuring smooth communication between students and faculty.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {COURSE_REPS.map((rep) => (
              <div key={rep.name}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-brand-200 hover:shadow-sm transition-all flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {rep.initials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-xs leading-tight">{rep.name}</p>
                  <p className="text-brand-600 text-xs mt-0.5">{rep.position}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{rep.level}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-brand-700 text-white text-center">
        <h2 className="font-display text-4xl font-bold mb-4">Get in Touch with Our Leaders</h2>
        <p className="text-brand-100 mb-8 max-w-xl mx-auto">
          Have questions, suggestions, or want to collaborate? Our executive team is always ready to listen and support.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="mailto:executives@nacos-aifue.org"
            className="inline-flex items-center gap-2 bg-white text-brand-800 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors text-sm">
            <Mail className="w-4 h-4" /> Email Executive Team
          </a>
          <Link to="/contact"
            className="inline-flex items-center gap-2 border-2 border-white/60 text-white font-semibold px-8 py-4 rounded-xl hover:bg-brand-800 transition-colors text-sm">
            Contact Form <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
