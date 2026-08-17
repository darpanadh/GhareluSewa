import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, categoryAPI } from '../services/api';
import CityWardSelector from '../components/CityWardSelector';
import { Search, MapPin, Star, ShieldCheck, Clock, Users, ArrowRight, Wrench, Zap, Home, Wind, Sparkles, Snowflake, Paintbrush, Hammer } from 'lucide-react';

const renderCategoryIcon = (iconStr, catName) => {
  const iconLower = (iconStr || '').toLowerCase();
  const nameLower = (catName || '').toLowerCase();

  // If icon is an emoji, render text emoji
  if (iconStr && /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}]/u.test(iconStr)) {
    return <span className="text-3xl">{iconStr}</span>;
  }

  if (iconLower === 'wrench' || nameLower.includes('plumb')) {
    return <Wrench className="w-7 h-7 text-[#07535f] group-hover:text-white transition-colors" />;
  }
  if (iconLower === 'zap' || nameLower.includes('electr')) {
    return <Zap className="w-7 h-7 text-[#07535f] group-hover:text-white transition-colors" />;
  }
  if (iconLower === 'home' || nameLower.includes('clean')) {
    return <Home className="w-7 h-7 text-[#07535f] group-hover:text-white transition-colors" />;
  }
  if (iconLower === 'wind' || nameLower.includes('ac') || nameLower.includes('air')) {
    return <Wind className="w-7 h-7 text-[#07535f] group-hover:text-white transition-colors" />;
  }
  if (iconLower === 'sparkles' || nameLower.includes('sparkl')) {
    return <Sparkles className="w-7 h-7 text-[#07535f] group-hover:text-white transition-colors" />;
  }
  if (iconLower === 'snowflake' || nameLower.includes('cool')) {
    return <Snowflake className="w-7 h-7 text-[#07535f] group-hover:text-white transition-colors" />;
  }
  if (iconLower === 'paintbrush' || nameLower.includes('paint')) {
    return <Paintbrush className="w-7 h-7 text-[#07535f] group-hover:text-white transition-colors" />;
  }
  if (iconLower === 'hammer' || nameLower.includes('carpent')) {
    return <Hammer className="w-7 h-7 text-[#07535f] group-hover:text-white transition-colors" />;
  }

  return <Wrench className="w-7 h-7 text-[#07535f] group-hover:text-white transition-colors" />;
};

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      if (user.role === 'admin') navigate('/admin', { replace: true });
      else if (user.role === 'provider') navigate('/provider', { replace: true });
      else if (user.role === 'customer') navigate('/customer', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [ward, setWard] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total_customers: 0,
    total_providers: 0,
    avg_rating: 5.0,
    completed_bookings: 0
  });
  const [categories, setCategories] = useState([
    { id: 1, name: 'Plumbing', icon: '🔧', provider_count: 0 },
    { id: 2, name: 'Electrical', icon: '⚡', provider_count: 0 },
    { id: 3, name: 'Cleaning', icon: '🧹', provider_count: 0 },
    { id: 4, name: 'AC Service', icon: '❄️', provider_count: 0 }
  ]);

  useEffect(() => {
    // Fetch live statistics from database
    userAPI.getPublicStats()
      .then(res => {
        if (res.data) setStats(res.data);
      })
      .catch(err => console.error("Failed to load platform stats:", err));

    // Fetch live categories from database
    categoryAPI.getAllCategories()
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCategories(res.data);
        }
      })
      .catch(err => console.error("Failed to load categories:", err));
  }, []);

  const popularTags = ['Pipe Leak', 'Rewiring', 'Deep Clean', 'AC Service'];


  const testimonials = [
    {
      id: 1,
      name: 'Sunita Sharma',
      location: 'Baneshwor',
      rating: 5,
      comment: 'Found a plumber within 20 minutes. Excellent work and very professional. Will book again!',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120'
    },
    {
      id: 2,
      name: 'Bikash Rai',
      location: 'Pulchowk',
      rating: 5,
      comment: 'The electrician fixed our wiring issue perfectly. The live tracking feature was really reassuring.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120'
    },
    {
      id: 3,
      name: 'Mira Thapa',
      location: 'Thamel',
      rating: 4,
      comment: 'Deep cleaning service was thorough and affordable. Gharelu Sewa is my go-to for home services.',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120'
    }
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Redirect to browse with queries
    navigate(`/customer/browse?ward=${ward}&query=${searchQuery}`);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#053c45] via-[#07535f] to-[#10b981] text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center relative z-10">

          {/* Trust Badge */}
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium tracking-wide mb-6 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
            {stats.total_customers > 0
              ? `Trusted by ${stats.total_customers.toLocaleString()} Nepalese Homes`
              : `Verified Local Service Platform`
            }
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-serif mb-6 leading-tight">
            Reliable Home Services, <br className="sm:hidden" />
            <span className="text-[#10b981]">Near You</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-100/90 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Connect with trusted local professionals for reliable home services, clear pricing, and hassle-free booking.
          </p>

          {/* Search Bar Container */}
          <form onSubmit={handleSearchSubmit} className="bg-white p-2 rounded-2xl shadow-xl max-w-3xl mx-auto flex flex-col md:flex-row gap-2">

            {/* City & Ward Cascaded Selector */}
            <div className="flex-1 min-w-[280px]">
              <CityWardSelector
                value={ward}
                onChange={setWard}
                showLabels={false}
                layout="row"
              />
            </div>

            {/* Service Input */}
            <div className="flex items-center gap-2 px-3 py-2 flex-grow min-w-[250px]">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What service do you need?"
                className="w-full bg-transparent text-gray-800 focus:outline-none placeholder-gray-400 text-sm font-medium"
              />
            </div>

            {/* Find Services Button */}
            <button
              type="submit"
              className="bg-[#07535f] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#06424b] transition-all flex items-center justify-center gap-1 text-sm whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              Find Services
            </button>
          </form>

          {/* Popular Searches */}
          <div className="flex flex-wrap gap-2.5 items-center justify-center mt-6 text-xs sm:text-sm">
            <span className="text-gray-200">Popular:</span>
            {popularTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSearchQuery(tag);
                  navigate(`/customer/browse?query=${tag}`);
                }}
                className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-white transition-colors border border-white/5"
              >
                {tag}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="border-b border-gray-100 bg-gray-50/50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#07535f]">
                {stats.total_customers.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-1">Happy Customers</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#07535f]">
                {stats.total_providers.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-1">Verified Providers</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#07535f]">
                {parseFloat(stats.avg_rating || 5.0).toFixed(1)}★
              </p>
              <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-1">Average Rating</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#07535f]">24/7</p>
              <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-1">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 font-serif">What do you need today?</h2>
            <p className="text-sm text-gray-500 mt-1">
              {categories.length > 0
                ? `Choose from ${categories.length} home service categories`
                : `Choose from our home service categories`
              }
            </p>
          </div>
          <Link to="/customer/browse" className="text-xs font-bold text-[#07535f] hover:underline flex items-center gap-0.5">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.slice(0, 8).map(cat => (
            <Link
              key={cat.id}
              to={`/book?category=${encodeURIComponent(cat.name)}`}
              className="border border-gray-100 hover:border-transparent hover:shadow-lg p-6 rounded-2xl transition-all text-center flex flex-col items-center hover:-translate-y-1 group bg-white"
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-50/80 group-hover:bg-[#07535f] flex items-center justify-center mb-3.5 transition-all shadow-2xs group-hover:scale-110 group-hover:shadow-md">
                {renderCategoryIcon(cat.icon, cat.name)}
              </div>
              <h3 className="font-bold text-gray-800 text-sm sm:text-base">{cat.name}</h3>
              <p className="text-xs text-gray-400 mt-1">
                {cat.provider_count !== undefined
                  ? `${cat.provider_count} Provider${cat.provider_count !== 1 ? 's' : ''}`
                  : 'Available'
                }
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Features / Why Choose Us Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 font-serif mb-3">Why Choose Gharelu Sewa?</h2>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">Built for reliability, speed, and trust in every neighborhood.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 — Emergency Booking */}
            <Link
              to="/emergency"
              className="bg-red-50 border-2 border-red-100 p-6 rounded-2xl hover:shadow-lg hover:border-red-300 transition-all group cursor-pointer block"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <h3 className="font-bold text-gray-900">Emergency Booking</h3>
                <ArrowRight className="w-4 h-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Solves urgent household problems faster.
              </p>
              <span className="inline-block mt-3 text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">
                🚨 Tap to request now →
              </span>
            </Link>

            {/* Feature 2 — Offline Mode */}
            <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-2xl hover:shadow-lg hover:border-blue-300 transition-all group">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Offline/Low-Data Mode</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Helps in weak-network areas.
              </p>
              <span className="inline-block mt-3 text-xs font-semibold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">
                ✅ Auto-enabled
              </span>
            </div>

            {/* Feature 3 — Trust System */}
            <Link
              to="/register?role=provider"
              className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-2xl hover:shadow-lg hover:border-emerald-300 transition-all group block"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <h3 className="font-bold text-gray-900">Verified Trust System</h3>
                <ArrowRight className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                ID verification, skill badges, background checks, and visible service history.
              </p>
              <span className="inline-block mt-3 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                🛡 Provider signup →
              </span>
            </Link>

            {/* Feature 4 — Ratings */}
            <Link
              to="/services"
              className="bg-yellow-50 border-2 border-yellow-100 p-6 rounded-2xl hover:shadow-lg hover:border-yellow-300 transition-all group block"
            >
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Star className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <h3 className="font-bold text-gray-900">Ratings with Real Proof</h3>
                <ArrowRight className="w-4 h-4 text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Including photo reviews, completion status, and repeated-customer reputation.
              </p>
              <span className="inline-block mt-3 text-xs font-bold text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full">
                ⭐ Browse providers →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="bg-gray-50/70 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 font-serif mb-2">3 Steps to a Spotless Home</h2>
          <p className="text-sm text-gray-500 mb-12">Simple, transparent, reliable</p>

          <div className="grid md:grid-cols-3 gap-8 relative max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50/70 flex items-center justify-center text-blue-600 font-extrabold text-xl mb-4 border border-blue-100/50">
                01
              </div>
              <h3 className="font-bold text-gray-800 text-base mb-2">Search & Select</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                Browse verified professionals in your ward. Filter by category, price, and ratings.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-green-50/70 flex items-center justify-center text-green-600 font-extrabold text-xl mb-4 border border-green-100/50">
                02
              </div>
              <h3 className="font-bold text-gray-800 text-base mb-2">Book Instantly</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                Choose your time slot and complete a 4-step booking wizard with upfront pricing.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-teal-50/70 flex items-center justify-center text-teal-600 font-extrabold text-xl mb-4 border border-teal-100/50">
                03
              </div>
              <h3 className="font-bold text-gray-800 text-base mb-2">Track in Real-Time</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                Get live status updates and track your service professional on an interactive map.
              </p>
            </div>
          </div>

          <Link
            to="/book"
            className="inline-flex items-center gap-2 bg-[#07535f] text-white px-8 py-3.5 rounded-full hover:bg-[#06424b] transition-all font-bold mt-12 shadow-sm"
          >
            Get Started — It's Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-800 font-serif text-center mb-12">What Our Customers Say</h2>

        <div className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x scroll-smooth custom-scrollbar">
          {testimonials.map(t => (
            <div key={t.id} className="min-w-[300px] sm:min-w-[350px] snap-center shrink-0 border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
              <div>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 italic leading-relaxed mb-6">
                  "{t.comment}"
                </p>
              </div>
              <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{t.name}</h4>
                  <span className="text-[10px] text-gray-400 font-medium">{t.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Provider Call to Action */}
      <section className="bg-[#07535f] text-white py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-serif font-bold mb-4">Are you a skilled professional?</h2>
          <p className="text-gray-100/90 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Join our network of verified providers{stats.total_providers > 0 ? ` (${stats.total_providers} verified)` : ''}. Set your own rates, manage your schedule, grow your income.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register?role=provider"
              className="bg-[#10b981] hover:bg-[#0ea572] text-white px-8 py-3.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all text-sm w-full sm:w-auto flex items-center justify-center gap-1.5"
            >
              Join as Provider <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/about"
              className="border border-white/35 hover:bg-white/10 text-white px-8 py-3.5 rounded-full font-bold transition-all text-sm w-full sm:w-auto"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer copyright */}
      <footer className="bg-[#031d22] text-gray-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/gharelu_sewa_logo.png" alt="Gharelu Sewa" className="h-9 w-auto object-contain bg-white/95 p-1.5 rounded-xl shadow-xs" />
          </div>
          <p className="text-xs text-gray-500 text-center">
            &copy; 2026 Gharelu Sewa. Empowering Homes & Livelihoods in Nepal.
          </p>
          <div className="flex gap-4 text-xs font-semibold text-gray-400">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
