import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, User } from 'lucide-react';

const POSTS = [
  {
    title: 'iCONNECT 2024: How NACOS-AIFUE Represented at Nigeria\'s Premier Tech Summit',
    excerpt: 'Our members attended iCONNECT — inspiring collaboration, opportunities and networks in emerging tech. Here\'s what we learnt and brought back to AIFUE.',
    date: 'May 15, 2024',
    author: 'Comr. Oparanozie Franklyn',
    tag: 'Events',
    tagColor: 'bg-brand-100 text-brand-800',
    img: '/IMG_0982.jpg',
    featured: true,
  },
  {
    title: 'AI/ML Hackathon 2024: Teams, Winners, and Lessons Learnt',
    excerpt: 'Over 120 participants competed in our 48-hour AI hackathon. The solutions built were extraordinary — from crop disease detection to exam malpractice prevention using computer vision.',
    date: 'Apr 2, 2024',
    author: 'Comr. Uzoma Victor Chukwuemeka',
    tag: 'Hackathon',
    tagColor: 'bg-purple-100 text-purple-800',
    img: 'https://images.pexels.com/photos/7369237/pexels-photo-7369237.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    title: 'Career Fair 2024 Recap: Companies, Tips, and Opportunities',
    excerpt: 'More than 200 students connected with recruiters from top Nigerian tech companies at our annual career fair. Here\'s how to stand out in your next technical interview.',
    date: 'Apr 10, 2024',
    author: 'Comr. Egboh Miracle Chiamaka',
    tag: 'Career',
    tagColor: 'bg-yellow-100 text-yellow-800',
    img: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    title: 'How to Activate and Use the New NACOS-AIFUE Student Portal',
    excerpt: 'Step-by-step guide to activating your portal account, checking results, paying dues, and making the most of every feature on the platform.',
    date: 'Mar 20, 2024',
    author: 'Comr. Okezue Akachukwu Favour',
    tag: 'Guide',
    tagColor: 'bg-blue-100 text-blue-800',
    img: 'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    title: '5 Python Libraries Every Computer Science Student at AIFUE Must Know',
    excerpt: 'From data analysis with pandas to web scraping with BeautifulSoup — a curated list of Python tools that will make your academic and career journey smoother.',
    date: 'Mar 5, 2024',
    author: 'Comr. Innocent Lilian Chinonye',
    tag: 'Technical',
    tagColor: 'bg-green-100 text-green-800',
    img: 'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    title: 'NACOS Week 2025: What to Expect',
    excerpt: 'Our biggest event of the year is coming. Workshops, hackathon, cultural night, talent show, and industry speakers. Mark your calendars and start preparing.',
    date: 'Feb 18, 2024',
    author: 'Comr. Ohabunwa Favour Mmesoma',
    tag: 'Announcement',
    tagColor: 'bg-orange-100 text-orange-800',
    img: 'https://images.pexels.com/photos/5940841/pexels-photo-5940841.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

export default function BlogPage() {
  const [featured, ...rest] = POSTS;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-brand-900 text-white py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%"><defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern></defs><rect width="100%" height="100%" fill="url(#g)" /></svg>
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block text-brand-300 text-xs font-bold uppercase tracking-widest mb-4">Blog</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-6">News & Articles</h1>
          <p className="text-brand-100 text-lg max-w-2xl mx-auto leading-relaxed">
            Insights, recaps, guides, and announcements from the NACOS-AIFUE executive team and community.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Featured post */}
          <div className="mb-12">
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Featured</span>
            <Link to="#" className="mt-4 flex flex-col md:flex-row gap-6 bg-white rounded-3xl border border-gray-200 overflow-hidden hover:border-brand-300 hover:shadow-xl transition-all group">
              <div className="md:w-2/5 h-56 md:h-auto overflow-hidden flex-shrink-0">
                <img src={featured.img} alt={featured.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-8 flex flex-col justify-center">
                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 w-fit ${featured.tagColor}`}>
                  {featured.tag}
                </span>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-3 group-hover:text-brand-700 transition-colors">
                  {featured.title}
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">{featured.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{featured.date}</span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{featured.author}</span>
                </div>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2 transition-all">
                  Read Article <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>

          {/* Grid */}
          <div>
            <span className="text-brand-700 text-xs font-bold uppercase tracking-widest">Latest Posts</span>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((post) => (
                <Link key={post.title} to="#"
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-brand-300 hover:shadow-lg transition-all group">
                  <div className="h-44 overflow-hidden">
                    <img src={post.img} alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-5">
                    <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-3 ${post.tagColor}`}>
                      {post.tag}
                    </span>
                    <h3 className="font-bold text-gray-900 mb-2 leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
                      <span className="text-brand-700 font-semibold flex items-center gap-1">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Newsletter CTA */}
          <div className="mt-16 bg-brand-900 rounded-3xl p-10 text-center">
            <h3 className="font-display text-3xl font-bold text-white mb-3">Stay in the Loop</h3>
            <p className="text-brand-200 mb-6 max-w-md mx-auto">
              Sign in to the student portal to receive instant notifications when new articles and announcements drop.
            </p>
            <Link to="/auth/login"
              className="inline-flex items-center gap-2 bg-white text-brand-900 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors text-sm">
              Go to Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
