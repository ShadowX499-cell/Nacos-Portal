import { MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const UPCOMING = [
  {
    date: { month: 'MAR', day: '15', year: '2024' },
    time: '10:00 AM – 4:00 PM',
    title: 'Web Development Workshop',
    desc: 'Learn modern web development with React, Node.js, and MongoDB. Perfect for beginners and intermediate developers looking to sharpen their skills.',
    location: 'Computer Science Lab 1',
    spots: '45/50',
    price: 'Free',
    tag: 'Workshop',
  },
  {
    date: { month: 'MAR', day: '22', year: '2024' },
    time: '9:00 AM – 9:00 PM',
    title: 'AI/ML Hackathon 2024',
    desc: '48-hour hackathon focused on artificial intelligence and machine learning solutions. Teams of 3–5 compete for prizes and industry recognition.',
    location: 'Main Auditorium',
    spots: '120/150',
    price: '₦2,000',
    tag: 'Hackathon',
  },
  {
    date: { month: 'APR', day: '05', year: '2024' },
    time: '9:00 AM – 5:00 PM',
    title: 'Career Fair 2024',
    desc: 'Connect with top tech companies and explore internship and job opportunities. Bring printed CVs and dress professionally.',
    location: 'University Main Hall',
    spots: '200/300',
    price: 'Free',
    tag: 'Career',
  },
  {
    date: { month: 'APR', day: '12', year: '2024' },
    time: '2:00 PM – 5:00 PM',
    title: 'Cybersecurity Seminar',
    desc: 'Learn about the latest cybersecurity threats and defense strategies from industry experts and NACOS-AIFUE technical team.',
    location: 'Lecture Theatre B',
    spots: '80/100',
    price: '₦1,500',
    tag: 'Seminar',
  },
];

const PAST = [
  { month: 'FEB', day: '20', title: 'Python Programming Bootcamp', tag: 'Workshop' },
  { month: 'FEB', day: '10', title: 'Tech Talk: Future of Computing', tag: 'Talk' },
];

const TAG_COLORS: Record<string, string> = {
  Workshop:  'bg-brand-100 text-brand-800',
  Hackathon: 'bg-purple-100 text-purple-800',
  Career:    'bg-yellow-100 text-yellow-800',
  Seminar:   'bg-blue-100 text-blue-800',
  Talk:      'bg-gray-100 text-gray-700',
};

export default function EventsPage() {
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
          <span className="inline-block text-brand-300 text-xs font-bold uppercase tracking-widest mb-4">Calendar</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-6">Events & Programs</h1>
          <p className="text-brand-100 text-lg max-w-2xl mx-auto leading-relaxed">
            From workshops and hackathons to career fairs and seminars — stay plugged in to everything
            NACOS-AIFUE has on offer.
          </p>
        </div>
      </section>

      {/* Upcoming events */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Coming Up</span>
            <h2 className="font-display text-4xl font-bold text-gray-900 mt-2">Upcoming Events</h2>
          </div>

          <div className="space-y-5">
            {UPCOMING.map((ev) => (
              <div key={ev.title}
                className="bg-white rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all p-6 flex gap-5">
                {/* Date block */}
                <div className="flex-shrink-0 text-center bg-brand-50 border border-brand-100 rounded-2xl px-5 py-3 min-w-[72px]">
                  <div className="text-xs font-bold text-brand-600 uppercase">{ev.date.month}</div>
                  <div className="font-display text-3xl font-bold text-brand-900 leading-none">{ev.date.day}</div>
                  <div className="text-xs text-brand-500">{ev.date.year}</div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{ev.title}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${TAG_COLORS[ev.tag] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ev.tag}
                      </span>
                    </div>
                    <span className={`flex-shrink-0 text-sm font-bold ${ev.price === 'Free' ? 'text-brand-700' : 'text-yellow-700'}`}>
                      {ev.price}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed mb-3">{ev.desc}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ev.time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ev.spots} registered</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Past events */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Archive</span>
            <h2 className="font-display text-3xl font-bold text-gray-900 mt-2">Past Events</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {PAST.map((ev) => (
              <div key={ev.title}
                className="flex gap-4 bg-white rounded-2xl border border-gray-200 p-5 items-center">
                <div className="flex-shrink-0 text-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 min-w-[52px]">
                  <div className="text-xs font-bold text-gray-500 uppercase">{ev.month}</div>
                  <div className="font-display text-xl font-bold text-gray-400">{ev.day}</div>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 text-sm">{ev.title}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${TAG_COLORS[ev.tag] ?? 'bg-gray-100 text-gray-500'}`}>
                    {ev.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stay updated CTA */}
      <section className="py-16 px-6 bg-brand-700 text-white text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Never Miss an Event</h2>
        <p className="text-brand-100 mb-8 max-w-lg mx-auto">
          Sign in to the student portal to receive instant notifications when new events are announced.
        </p>
        <Link to="/auth/login"
          className="inline-flex items-center gap-2 bg-white text-brand-800 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors text-sm">
          Go to Student Portal <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
