import { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

const GALLERY_ITEMS = [
  {
    src: '/IMG_0982.jpg',
    alt: 'NACOS-AIFUE members at iCONNECT tech summit — inspiring collaboration in emerging tech',
    category: 'Events',
    featured: true,
  },
  {
    src: '/nacos-event-mr-miss.jpg',
    alt: 'Mr & Miss NACOS AIFUE 2025 — celebrating excellence and campus royalty',
    category: 'Events',
  },
  {
    src: '/nacos-ticket-1.jpg',
    alt: 'NACOS AIFUE event poster — join us for an unforgettable evening',
    category: 'Events',
  },
  {
    src: '/nacos-ticket-2.jpg',
    alt: 'NACOS AIFUE event — a night to remember with the best of computing students',
    category: 'Events',
  },
  {
    src: '/nacos-prototype.jpg',
    alt: 'NACOS AIFUE portal prototype showcase — student innovation in action',
    category: 'Workshop',
  },
  {
    src: '/nacos-president.jpg',
    alt: 'Comr. Uzoma Victor Chukwuemeka — NACOS AIFUE President addressing members',
    category: 'Leadership',
  },
  {
    src: '/nacos-vp.jpg',
    alt: 'Comr. Egboh Miracle Chiamaka — NACOS AIFUE Vice President',
    category: 'Leadership',
  },
  {
    src: '/nacos-doi.jpg',
    alt: 'Comr. Oparanozie Franklyn — NACOS AIFUE Director of Information',
    category: 'Leadership',
  },
  {
    src: '/nacos-asg.jpg',
    alt: 'Comr. Ohabunwa Favour Mmesoma — NACOS AIFUE Assistant Secretary General',
    category: 'Leadership',
  },
  {
    src: '/nacos-dosport.jpg',
    alt: 'Comr. Dike Stephen Amarachukwu — NACOS AIFUE Director of Sports',
    category: 'Leadership',
  },
  {
    src: 'https://images.pexels.com/photos/7369237/pexels-photo-7369237.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'NACOS hackathon participants collaborating on AI solutions',
    category: 'Hackathon',
  },
  {
    src: 'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Web development workshop — students learning React and Node.js',
    category: 'Workshop',
  },
];

const CATEGORIES = ['All', 'Events', 'Leadership', 'Workshop', 'Hackathon', 'Seminar', 'Career'];

export default function GalleryPage() {
  const [active, setActive] = useState('All');
  const [lightbox, setLightbox] = useState<null | typeof GALLERY_ITEMS[0]>(null);

  const filtered = active === 'All' ? GALLERY_ITEMS : GALLERY_ITEMS.filter((i) => i.category === active);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-brand-900 text-white py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%"><defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern></defs><rect width="100%" height="100%" fill="url(#g)" /></svg>
        </div>
        {/* Featured hero image */}
        <div className="absolute inset-0 overflow-hidden">
          <img src="/nacos-event-mr-miss.jpg" alt="NACOS events" className="w-full h-full object-cover object-center opacity-25" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block text-brand-300 text-xs font-bold uppercase tracking-widest mb-4">Gallery</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-6">Photo Gallery</h1>
          <p className="text-brand-100 text-lg max-w-2xl mx-auto leading-relaxed">
            Memories from our events, workshops, hackathons, and community activities.
            Every photo tells a story of growth, innovation, and togetherness.
          </p>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="bg-white border-b border-gray-200 sticky top-[73px] z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                active === cat
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Gallery grid */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm text-gray-400 mb-6">{filtered.length} photo{filtered.length !== 1 ? 's' : ''}</p>

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filtered.map((item, i) => (
              <div
                key={i}
                onClick={() => setLightbox(item)}
                className="break-inside-avoid relative group cursor-pointer rounded-2xl overflow-hidden border border-gray-200 hover:border-brand-300 hover:shadow-xl transition-all"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  style={{ aspectRatio: item.featured ? '16/9' : undefined }}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/50 transition-all flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Category badge */}
                <div className="absolute top-3 left-3">
                  <span className="bg-brand-700/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                    {item.category}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">No photos in this category yet.</p>
              <p className="text-sm mt-1">Check back after our next event!</p>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-0 right-0 text-center px-6">
            <span className="bg-brand-700/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
              {lightbox.category}
            </span>
            <p className="text-white/70 text-sm mt-2 max-w-xl mx-auto">{lightbox.alt}</p>
          </div>
        </div>
      )}
    </div>
  );
}
