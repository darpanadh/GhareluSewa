import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CityWardSelector from '../components/CityWardSelector';
import {
  Search, Star, ShieldCheck, Clock, ArrowRight, ArrowUpRight,
  Zap, Wifi, MapPin, Sparkles,
} from 'lucide-react';

const MARQUEE_ITEMS = [
  '12,000+ homes served',
  '850+ verified taskers',
  '4.8 average rating',
  'Live map tracking',
  'Pay Gharelu Sewa directly',
  'Emergency in 30 min',
  'Kathmandu · Pokhara · Lalitpur',
];

const categories = [
  { id: 1, name: 'Plumbing', icon: '🔧', count: '15+', span: 'md:col-span-2 md:row-span-2', accent: 'from-[#07535f] to-[#0a6b7a]' },
  { id: 2, name: 'Electrical', icon: '⚡', count: '20+', span: '', accent: 'from-[#d4920a] to-[#b87a08]' },
  { id: 3, name: 'Cleaning', icon: '🧹', count: '10+', span: '', accent: 'from-[#2d6a4f] to-[#1b4332]' },
  { id: 4, name: 'AC Service', icon: '❄️', count: '8+', span: 'md:col-span-2', accent: 'from-[#1d3557] to-[#457b9d]' },
];

const testimonials = [
  {
    id: 1,
    name: 'Sunita Sharma',
    location: 'Baneshwor',
    rating: 5,
    comment: 'Found a plumber within 20 minutes. Excellent work — will book again!',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120',
  },
  {
    id: 2,
    name: 'Bikash Rai',
    location: 'Pulchowk',
    rating: 5,
    comment: 'The electrician fixed our wiring perfectly. Live tracking was reassuring.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
  },
  {
    id: 3,
    name: 'Mira Thapa',
    location: 'Thamel',
    rating: 4,
    comment: 'Deep cleaning was thorough and affordable. My go-to for home services.',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120',
  },
];

const steps = [
  { num: '01', title: 'Pick your ward', desc: 'Search verified pros near you — filter by skill, price, and reviews.' },
  { num: '02', title: 'Book in 4 taps', desc: 'Transparent pricing upfront. Pay Gharelu Sewa, not cash to strangers.' },
  { num: '03', title: 'Track live', desc: 'Watch your tasker arrive on the map. Release payment only when satisfied.' },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [ward, setWard] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      if (user.role === 'admin') navigate('/admin', { replace: true });
      else if (user.role === 'provider') navigate('/provider', { replace: true });
      else if (user.role === 'customer') navigate('/customer', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/customer/browse?ward=${ward}&query=${searchQuery}`);
  };

  return (
    <div className="home-page min-h-screen overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center home-grain overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[#031d22]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#07535f]/90 via-[#031d22] to-[#0a2e35]" />
        <div className="absolute top-0 right-0 w-[55vw] h-[55vw] max-w-[700px] rounded-full bg-[#d4920a]/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] max-w-[500px] rounded-full bg-[#10b981]/8 blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 home-pattern-diamond opacity-30" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left — headline */}
            <div className="lg:col-span-7 home-reveal">
              <div className="inline-flex items-center gap-2 border border-[#d4920a]/40 bg-[#d4920a]/10 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase text-[#f5e6c8] mb-8">
                <span className="w-2 h-2 rounded-full bg-[#d4920a] animate-pulse" />
                Nepal&apos;s neighborhood service network
              </div>

              <p className="text-[#d4920a] text-sm font-bold tracking-widest uppercase mb-3 opacity-90">
                घरेलु सेवा · Gharelu Sewa
              </p>

              <h1 className="home-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold text-[#faf6ef] leading-[1.05] tracking-tight mb-6">
                Your home fixes,
                <span className="block italic text-[#d4920a]">done right next door.</span>
              </h1>

              <p className="text-[#a8c4c8] text-base sm:text-lg max-w-lg leading-relaxed mb-10">
                Verified plumbers, electricians, and cleaners in your ward.
                Live tracking, escrow payments, zero guesswork.
              </p>

              {/* Search — offset shadow */}
              <form
                onSubmit={handleSearchSubmit}
                className="home-search-shadow bg-[#faf6ef] rounded-2xl p-2 max-w-2xl flex flex-col sm:flex-row gap-2 border-2 border-[#07535f]"
              >
                <div className="flex-1 min-w-0 px-1">
                  <CityWardSelector value={ward} onChange={setWard} showLabels={false} layout="row" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 flex-grow border-t sm:border-t-0 sm:border-l border-[#07535f]/15">
                  <Search className="w-4 h-4 text-[#07535f] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pipe leak, rewiring, deep clean…"
                    className="w-full bg-transparent text-[#0c1f24] focus:outline-none placeholder-[#07535f]/40 text-sm font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#07535f] hover:bg-[#06424b] text-[#faf6ef] px-6 py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-colors shrink-0"
                >
                  Find pros <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="flex flex-wrap gap-2 mt-5">
                {['Pipe Leak', 'Rewiring', 'Deep Clean', 'AC Service'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => navigate(`/customer/browse?query=${tag}`)}
                    className="text-xs font-bold text-[#a8c4c8] hover:text-[#faf6ef] border border-white/10 hover:border-[#d4920a]/50 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Right — floating stat cards */}
            <div className="lg:col-span-5 relative hidden lg:block h-[420px]">
              <div className="home-float absolute top-8 right-4 bg-[#faf6ef] text-[#0c1f24] rounded-2xl p-5 shadow-2xl max-w-[220px] border-2 border-[#07535f]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#07535f] mb-1">Live now</p>
                <p className="home-display text-3xl font-bold text-[#07535f]">847</p>
                <p className="text-xs text-gray-500 mt-1">taskers available in Pokhara</p>
              </div>
              <div className="home-float absolute bottom-16 left-0 bg-[#d4920a] text-[#031d22] rounded-2xl p-5 shadow-2xl max-w-[240px]" style={{ animationDelay: '-2s' }}>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#031d22] text-[#031d22]" />
                  ))}
                </div>
                <p className="text-sm font-bold leading-snug">&ldquo;Best plumber I&apos;ve hired in years.&rdquo;</p>
                <p className="text-[10px] font-bold mt-2 opacity-70">— Rajesh, Lakeside</p>
              </div>
              <div className="home-float absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#07535f] border-2 border-[#d4920a]/50 rounded-full w-32 h-32 flex flex-col items-center justify-center text-[#faf6ef] shadow-xl" style={{ animationDelay: '-4s' }}>
                <MapPin className="w-6 h-6 text-[#d4920a] mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Track</span>
                <span className="text-lg font-extrabold">Live</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ────────────────────────────────────────────────── */}
      <div className="bg-[#07535f] border-y-2 border-[#d4920a] py-3 overflow-hidden">
        <div className="home-marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-3 px-8 text-sm font-bold text-[#faf6ef] whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-[#d4920a] shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES BENTO ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4920a] mb-2">Services</p>
            <h2 className="home-display text-3xl sm:text-4xl font-bold text-[#0c1f24]">
              What needs fixing today?
            </h2>
          </div>
          <Link
            to="/customer/browse"
            className="inline-flex items-center gap-1 text-sm font-extrabold text-[#07535f] hover:gap-2 transition-all group"
          >
            Browse all categories
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[120px] md:auto-rows-[140px]">
          {categories.map(cat => (
            <Link
              key={cat.id}
              to={`/book?category=${encodeURIComponent(cat.name)}`}
              className={`home-bento-card relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between bg-gradient-to-br ${cat.accent} text-white ${cat.span} group`}
            >
              <span className="text-3xl md:text-4xl group-hover:scale-125 transition-transform duration-500 block origin-left">
                {cat.icon}
              </span>
              <div>
                <h3 className="font-extrabold text-base md:text-lg">{cat.name}</h3>
                <p className="text-xs text-white/70 font-semibold">{cat.count} pros nearby</p>
              </div>
              <ArrowUpRight className="absolute top-4 right-4 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── WHY GHARELU SEWA — asymmetric bento (not generic pastels) ───── */}
      <section className="py-20 bg-[#0c1f24] relative overflow-hidden">
        <div className="absolute inset-0 home-pattern-diamond opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4920a] mb-3">Why us</p>
            <h2 className="home-display text-3xl sm:text-5xl font-bold text-[#faf6ef] leading-tight">
              Built different.<br />
              <span className="italic text-[#a8c4c8]">Built for Nepal.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-6 gap-4 auto-rows-auto">

            {/* Emergency — hero feature card */}
            <Link
              to="/emergency"
              className="home-bento-card md:col-span-4 md:row-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7f1d1d] via-[#991b1b] to-[#450a0a] p-8 sm:p-10 text-white group min-h-[280px] flex flex-col justify-between border border-[#d4920a]/20"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#d4920a]/20 rounded-full blur-3xl" />
              <div className="relative">
                <span className="inline-block text-[10px] font-bold uppercase tracking-[0.3em] text-[#fca5a5] mb-4">Priority</span>
                <Clock className="w-10 h-10 text-[#d4920a] mb-4" />
                <h3 className="home-display text-2xl sm:text-3xl font-bold mb-3">Emergency booking</h3>
                <p className="text-red-100/80 text-sm max-w-md leading-relaxed">
                  Burst pipe at midnight? Power out before guests arrive?
                  Skip the queue — we dispatch the nearest verified pro in under 30 minutes.
                </p>
              </div>
              <span className="relative inline-flex items-center gap-2 text-sm font-extrabold text-[#faf6ef] group-hover:gap-3 transition-all">
                Request emergency help <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            {/* Trust */}
            <Link
              to="/register?role=provider"
              className="home-bento-card md:col-span-2 rounded-3xl bg-[#faf6ef] p-6 sm:p-7 flex flex-col justify-between border-2 border-[#07535f] group min-h-[200px]"
            >
              <ShieldCheck className="w-9 h-9 text-[#07535f]" />
              <div>
                <h3 className="font-extrabold text-[#0c1f24] text-lg mb-2">Verified trust</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Citizenship KYC, skill badges, background checks — every pro is vetted before they touch your door.
                </p>
              </div>
              <span className="text-xs font-extrabold text-[#07535f] flex items-center gap-1 group-hover:gap-2 transition-all">
                Join as provider <ArrowRight className="w-3 h-3" />
              </span>
            </Link>

            {/* Offline mode */}
            <div className="home-bento-card md:col-span-2 rounded-3xl bg-[#07535f] p-6 sm:p-7 text-[#faf6ef] flex flex-col justify-between min-h-[180px] border border-[#d4920a]/30">
              <Wifi className="w-9 h-9 text-[#d4920a]" />
              <div>
                <h3 className="font-extrabold text-lg mb-2">Low-data mode</h3>
                <p className="text-xs text-[#a8c4c8] leading-relaxed">
                  Weak signal in your lane? Core booking flows work offline and sync when you&apos;re back online.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4920a]">Auto-enabled</span>
            </div>

            {/* Ratings */}
            <Link
              to="/services"
              className="home-bento-card md:col-span-4 rounded-3xl bg-[#d4920a] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6 group min-h-[160px]"
            >
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-3">
                  <Star className="w-5 h-5 fill-[#031d22] text-[#031d22]" />
                  <Star className="w-5 h-5 fill-[#031d22] text-[#031d22]" />
                  <Star className="w-5 h-5 fill-[#031d22] text-[#031d22]" />
                  <Star className="w-5 h-5 fill-[#031d22] text-[#031d22]" />
                  <Star className="w-5 h-5 fill-[#031d22]/30 text-[#031d22]/30" />
                </div>
                <h3 className="home-display text-xl sm:text-2xl font-bold text-[#031d22] mb-2">Reviews with proof</h3>
                <p className="text-sm text-[#031d22]/75 max-w-lg">
                  Photo reviews, completion badges, repeat-customer tags — no fake five-stars.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 bg-[#031d22] text-[#faf6ef] px-5 py-3 rounded-full text-sm font-extrabold shrink-0 group-hover:gap-3 transition-all">
                Browse pros <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            {/* Escrow payment — new unique card */}
            <div className="home-bento-card md:col-span-6 rounded-3xl bg-[#faf6ef] border-2 border-dashed border-[#07535f]/30 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-[#07535f] flex items-center justify-center shrink-0">
                <Zap className="w-7 h-7 text-[#d4920a]" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-[#0c1f24] text-lg mb-1">Pay Gharelu Sewa — not the tasker</h3>
                <p className="text-sm text-gray-600">
                  Your money sits in platform escrow until the job is done. Providers get paid only after you confirm.
                </p>
              </div>
              <Link
                to="/book"
                className="inline-flex items-center gap-2 bg-[#07535f] text-[#faf6ef] px-6 py-3 rounded-full text-sm font-extrabold hover:bg-[#06424b] transition-colors shrink-0"
              >
                Book securely <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 STEPS — editorial timeline ─────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4920a] mb-2">How it works</p>
          <h2 className="home-display text-3xl sm:text-4xl font-bold text-[#0c1f24]">
            Three steps. Zero drama.
          </h2>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-[#07535f]/15" />
          <div className="grid md:grid-cols-3 gap-10 md:gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative text-center md:text-left">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-[#07535f] text-[#faf6ef] items-center justify-center mb-5 shadow-lg shadow-[#07535f]/25 relative z-10 mx-auto md:mx-0">
                  <span className="home-display text-xl font-bold">{step.num}</span>
                </div>
                <h3 className="font-extrabold text-[#0c1f24] text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="md:hidden flex justify-center my-6">
                    <ArrowRight className="w-5 h-5 text-[#07535f]/30 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-14">
          <Link
            to="/book"
            className="inline-flex items-center gap-2 bg-[#d4920a] hover:bg-[#b87a08] text-[#031d22] px-10 py-4 rounded-full font-extrabold text-sm shadow-lg shadow-[#d4920a]/30 transition-all hover:shadow-xl"
          >
            Start your first booking <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS — dark editorial ────────────────────────────────── */}
      <section className="py-20 bg-[#031d22] relative overflow-hidden">
        <div className="absolute inset-0 home-grain" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4920a] mb-3 text-center">Voices</p>
          <h2 className="home-display text-3xl sm:text-4xl font-bold text-[#faf6ef] text-center mb-14">
            Real homes. Real reviews.
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={t.id}
                className={`rounded-3xl p-7 flex flex-col justify-between border transition-transform hover:-translate-y-1 ${
                  i === 1
                    ? 'bg-[#d4920a] border-[#d4920a] text-[#031d22] md:-translate-y-4'
                    : 'bg-[#0c1f24] border-[#07535f]/50 text-[#faf6ef]'
                }`}
              >
                <div>
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star
                        key={j}
                        className={`w-3.5 h-3.5 ${
                          j < t.rating
                            ? i === 1 ? 'fill-[#031d22] text-[#031d22]' : 'fill-[#d4920a] text-[#d4920a]'
                            : 'text-white/20'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`home-display text-lg leading-snug mb-6 ${i === 1 ? 'text-[#031d22]' : 'text-[#faf6ef]'}`}>
                    &ldquo;{t.comment}&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-current/10">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-current/20" />
                  <div>
                    <h4 className="font-extrabold text-sm">{t.name}</h4>
                    <span className="text-[10px] opacity-60 font-semibold">{t.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROVIDER CTA — split panel ───────────────────────────────────── */}
      <section className="py-0">
        <div className="grid md:grid-cols-2">
          <div className="bg-[#07535f] p-12 sm:p-16 flex flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d4920a] mb-4">For taskers</p>
            <h2 className="home-display text-3xl sm:text-4xl font-bold text-[#faf6ef] mb-4 leading-tight">
              Got skills?<br />Get booked.
            </h2>
            <p className="text-[#a8c4c8] text-sm leading-relaxed mb-8 max-w-md">
              Join 850+ verified providers. Set your rates, pick your wards, grow your income on your schedule.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register?role=provider"
                className="inline-flex items-center justify-center gap-2 bg-[#d4920a] hover:bg-[#b87a08] text-[#031d22] px-8 py-3.5 rounded-full font-extrabold text-sm transition-colors"
              >
                Apply as provider <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center justify-center gap-2 border-2 border-[#faf6ef]/30 hover:bg-[#faf6ef]/10 text-[#faf6ef] px-8 py-3.5 rounded-full font-extrabold text-sm transition-colors"
              >
                Learn more
              </Link>
            </div>
          </div>
          <div className="bg-[#d4920a] p-12 sm:p-16 flex flex-col justify-center relative overflow-hidden home-pattern-diamond">
            <div className="relative">
              <p className="home-display text-6xl sm:text-7xl font-bold text-[#031d22]/15 leading-none mb-4">850+</p>
              <p className="text-[#031d22] font-extrabold text-xl mb-2">Verified professionals</p>
              <p className="text-[#031d22]/70 text-sm max-w-xs">
                Plumbers, electricians, cleaners — all background-checked and rated by real customers in your city.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
