import { Link } from 'react-router-dom';
import { Target, Eye, Heart, Users, Lightbulb, ArrowRight } from 'lucide-react';

const VALUES = [
  { icon: Target,   title: 'Excellence',    desc: 'We strive for the highest standards in everything we do, from academic pursuits to professional development.' },
  { icon: Heart,    title: 'Integrity',      desc: 'We uphold honesty, transparency, and ethical conduct in all our activities and interactions.' },
  { icon: Users,    title: 'Collaboration',  desc: 'We believe in the power of teamwork and collective effort to achieve greater success.' },
  { icon: Lightbulb,title: 'Innovation',     desc: 'We encourage creative thinking and innovative solutions to address technological challenges.' },
];

const OBJECTIVES = [
  'Promote excellence in computer science education and research',
  'Foster professional development and career advancement opportunities',
  'Create a platform for networking and knowledge sharing among students',
  'Organise technical workshops, seminars, and training programs',
  'Encourage innovation and entrepreneurship in technology',
  'Bridge the gap between academia and industry',
  'Advocate for the interests and welfare of computer science students',
  'Promote ethical practices in computing and technology',
];

const MILESTONES = [
  { year: '2010', label: 'Chapter establishment with 25 founding members' },
  { year: '2015', label: 'First major hackathon with 200+ participants' },
  { year: '2020', label: 'Launch of mentorship program and industry partnerships' },
  { year: '2024', label: '500+ active members and national recognition' },
];

const NATIONAL_STATS = [
  { value: '1M+', label: 'Members Nationwide' },
  { value: '25',  label: 'Local Chapters' },
  { value: '36',  label: 'States & FCT' },
  { value: '32',  label: 'Years of Excellence' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-brand-900 text-white py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/IMG_0982.jpg" alt="" className="w-full h-full object-cover object-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-900/60 to-brand-900/90" />
        </div>
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern></defs>
            <rect width="100%" height="100%" fill="url(#g)" />
          </svg>
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block text-brand-300 text-xs font-bold uppercase tracking-widest mb-4">About Us</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-6">About NACOS-AIFUE</h1>
          <p className="text-brand-100 text-lg max-w-2xl mx-auto leading-relaxed">
            Discover our rich history, mission, and commitment to advancing computer science
            education at Alvan Ikoku Federal University of Education, Owerri.
          </p>
        </div>
      </section>

      {/* History */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Our Story</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-3 mb-6">Our History</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                The National Association of Computer Science Students (NACOS) AIFUE Chapter was
                established in 2010 as part of the broader NACOS national organisation, which was
                founded in 1992 to unite computer science students across Nigeria.
              </p>
              <p>
                Our chapter began with just 25 pioneering students who shared a vision of creating
                a vibrant community for computer science enthusiasts at Alvan Ikoku Federal University
                of Education. Over the years, we have grown to become one of the most active and
                influential student organisations on campus.
              </p>
              <p>
                From humble beginnings in a small classroom, we have evolved into a dynamic
                organisation that has impacted thousands of students, organised hundreds of events,
                and established strong partnerships with industry leaders and academic institutions.
              </p>
              <p>
                Today, NACOS-AIFUE stands as a beacon of excellence, innovation, and leadership in
                computer science education, continuing to shape the future of technology in Nigeria.
              </p>
            </div>
          </div>

          <div className="bg-brand-50 rounded-3xl p-8 border border-brand-100">
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-8">Key Milestones</h3>
            <div className="space-y-5">
              {MILESTONES.map((m, i) => (
                <div key={m.year} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-brand-700 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-bold text-brand-900">{m.year}</div>
                    <div className="text-gray-600 text-sm mt-0.5">{m.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-brand-100 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-brand-700" />
              </div>
              <h2 className="font-display text-2xl font-bold text-gray-900">Our Mission</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              To foster excellence in computer science education, promote innovation and research,
              build capacity among students, and create a vibrant community that bridges the gap
              between academia and industry while upholding the highest standards of integrity
              and professionalism.
            </p>
          </div>
          <div className="bg-brand-900 p-8 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-brand-700 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white">Our Vision</h2>
            </div>
            <p className="text-brand-200 leading-relaxed">
              To be the leading student organisation in computer science education in Nigeria,
              producing world-class graduates who are innovative, ethical, and capable of driving
              technological advancement and digital transformation across Africa and beyond.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Principles</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-3 mb-3">Our Core Values</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              The principles that guide our actions and define our character as an organisation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v, i) => (
              <div key={v.title}
                className={`p-7 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-1 animate-fade-up delay-${(i + 1) * 100} ${
                  i % 2 === 0 ? 'bg-brand-50 border-brand-100' : 'bg-white border-gray-200'
                }`}>
                <div className="w-12 h-12 bg-brand-700 rounded-xl flex items-center justify-center mb-5">
                  <v.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Objectives */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Goals</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-3 mb-3">Our Objectives</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              The specific goals we work towards to fulfill our mission and realise our vision.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {OBJECTIVES.map((obj, i) => (
              <div key={i} className="flex items-start gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="w-8 h-8 bg-brand-700 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed pt-1">{obj}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NACOS National */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">National Body</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-3 mb-6">
              Aligned with NACOS National Values
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                As a proud chapter of the National Association of Computer Science Students, we are
                fully aligned with the national organisation's mission to advance computer science
                education across Nigeria.
              </p>
              <p>
                NACOS was established in 1992 with the vision of creating a unified platform for
                computer science students nationwide. Today, with over 1,000,000 members across
                25 local chapters, NACOS continues to be the voice of computer science students
                in Nigeria.
              </p>
              <p>
                Our chapter actively participates in national programmes, conventions, and
                initiatives while maintaining our unique identity and addressing the specific needs
                of our local community at AIFUE.
              </p>
            </div>
          </div>
          <div className="bg-brand-50 rounded-3xl p-8 border border-brand-100">
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-8">NACOS National Impact</h3>
            <div className="grid grid-cols-2 gap-6">
              {NATIONAL_STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-display text-3xl font-bold text-brand-700 mb-1">{s.value}</div>
                  <div className="text-gray-500 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-brand-700 text-white text-center">
        <h2 className="font-display text-4xl font-bold mb-4">Be Part of Our Story</h2>
        <p className="text-brand-100 mb-8 max-w-xl mx-auto">
          Join us in our mission to advance computer science education and build the next generation of technology leaders.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/auth/validate"
            className="inline-flex items-center gap-2 bg-white text-brand-800 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors text-sm">
            Activate Your Account <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/contact"
            className="inline-flex items-center gap-2 border-2 border-white/60 text-white font-semibold px-8 py-4 rounded-xl hover:bg-brand-800 transition-colors text-sm">
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
