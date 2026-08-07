import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import CityWardSelector from '../../components/CityWardSelector';
import {
  Search, MapPin, Star, SlidersHorizontal, Tag,
  Banknote, ArrowRight, ShieldCheck
} from 'lucide-react';


export default function BrowseServices() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const initialQuery = queryParams.get('query') || '';
  const initialWard = queryParams.get('ward') || '';
  const initialCategory = queryParams.get('category') || 'All categories';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedWard, setSelectedWard] = useState(initialWard || 'All wards');
  const [minRating, setMinRating] = useState(0);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('highest_rated'); // 'highest_rated' | 'most_reviewed' | 'price_low' | 'price_high'
  const [onlyTopRated, setOnlyTopRated] = useState(false); // TaskRabbit Elite / 4.8+ Super Pros Filter

  const [backendProviders, setBackendProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sample initial professionals matching the image
  const defaultProviders = [
    {
      id: 'p-1',
      name: 'Hari Bahadur',
      hourlyRate: 750,
      rating: 5.0,
      reviewsCount: 42,
      category: 'Electrical Repairs',
      ward: 'Lakeside',
      description: 'Certified electrician specialising in wiring and switchboard work.',
      tags: ['Appliance Servicing', 'Electrical Repairs', 'Switch Installation', 'Wiring'],
      backgroundCheckStatus: 'approved'
    },
    {
      id: 'p-2',
      name: 'Anita Shrestha',
      hourlyRate: 700,
      rating: 5.0,
      reviewsCount: 38,
      category: 'Appliance Servicing',
      ward: 'Baneshwor',
      description: 'Appliance repair expert — AC, fridge, washing machine, geyser.',
      tags: ['Appliance Servicing', 'AC Filter Cleaning', 'Water Heater'],
      backgroundCheckStatus: 'approved'
    },
    {
      id: 'p-3',
      name: 'Bikash Rai',
      hourlyRate: 600,
      rating: 4.0,
      reviewsCount: 29,
      category: 'Plumbing',
      ward: 'Bagar',
      description: 'Licensed plumber with 8 years of experience in residential fittings.',
      tags: ['Plumbing', 'Pipe Repair', 'Tap Installation'],
      backgroundCheckStatus: 'approved'
    },
    {
      id: 'p-4',
      name: 'Suresh Magar',
      hourlyRate: 550,
      rating: 4.0,
      reviewsCount: 19,
      category: 'Carpentry',
      ward: 'New Road, Pokhara',
      description: 'Skilled carpenter for furniture, doors, and custom woodwork.',
      tags: ['Carpentry', 'General Handyman'],
      backgroundCheckStatus: 'approved'
    },
    {
      id: 'p-5',
      name: 'Rajesh Shrestha',
      hourlyRate: 650,
      rating: 4.9,
      reviewsCount: 54,
      category: 'Plumbing',
      ward: 'Lakeside',
      description: 'Expert plumber for leak repairs, pipe installations, and sanitation.',
      tags: ['Plumbing', 'Pipe Repair', 'Drain Cleaning'],
      backgroundCheckStatus: 'approved'
    },
    {
      id: 'p-6',
      name: 'Mira Thapa',
      hourlyRate: 500,
      rating: 4.8,
      reviewsCount: 67,
      category: 'House Cleaning',
      ward: 'Chipiyata',
      description: 'Thorough deep cleaning, sanitizing, and room disinfection.',
      tags: ['House Cleaning', 'Deep Clean', 'Bathroom Sanitization'],
      backgroundCheckStatus: 'approved'
    }
  ];

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await userAPI.getProviders();
      const data = Array.isArray(res.data) ? res.data : (res.data?.providers || []);
      if (data.length > 0) {
        const formatted = data.map(p => ({
          id: p.id,
          name: p.name || 'Service Pro',
          hourlyRate: p.hourly_rate || p.price || 650,
          rating: parseFloat(p.rating_avg || p.rating || 4.8),
          reviewsCount: p.total_reviews || 20,
          category: p.service_category || p.category_name || p.category || 'General',
          ward: p.ward || p.location || 'Kathmandu',
          description: p.bio || p.description || 'Experienced local service professional.',
          tags: p.skill_badges ? p.skill_badges.split(',') : (p.skills ? p.skills.split(',') : [p.service_category || 'Home Service']),
          backgroundCheckStatus: p.background_check_status || 'pending'
        }));
        setBackendProviders(formatted);
      }
    } catch (err) {
      console.warn('Backend provider fetch failed, using default showcase providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const allProviders = backendProviders.length > 0 ? backendProviders : defaultProviders;

  const categoriesList = [
    'All categories',
    'Electrical Repairs',
    'Plumbing',
    'Appliance Servicing',
    'Carpentry',
    'House Cleaning',
    'AC Service',
    'Painting'
  ];

  // Filtering Logic
  const filtered = allProviders.filter(p => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchCat = p.category.toLowerCase().includes(q);
      const matchTags = p.tags.some(t => t.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchCat && !matchTags) return false;
    }

    // Category
    if (selectedCategory !== 'All categories' && selectedCategory !== 'All') {
      if (p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        const hasTagMatch = p.tags.some(t => t.toLowerCase() === selectedCategory.toLowerCase());
        if (!hasTagMatch) return false;
      }
    }

    // Ward
    if (selectedWard !== 'All wards' && selectedWard !== '') {
      if (!p.ward.toLowerCase().includes(selectedWard.toLowerCase())) return false;
    }

    // Min Rating
    if (minRating > 0 && p.rating < minRating) return false;

    // TaskRabbit Style: Only 4.8+ Top Rated Pros
    if (onlyTopRated && p.rating < 4.8) return false;

    // Price range
    if (minPrice && p.hourlyRate < parseFloat(minPrice)) return false;
    if (maxPrice && p.hourlyRate > parseFloat(maxPrice)) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'highest_rated') {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.reviewsCount - a.reviewsCount;
    } else if (sortBy === 'most_reviewed') {
      if (b.reviewsCount !== a.reviewsCount) return b.reviewsCount - a.reviewsCount;
      return b.rating - a.rating;
    } else if (sortBy === 'price_low') {
      return a.hourlyRate - b.hourlyRate;
    } else if (sortBy === 'price_high') {
      return b.hourlyRate - a.hourlyRate;
    }
    return 0;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All categories');
    setSelectedWard('All wards');
    setMinRating(0);
    setMinPrice('');
    setMaxPrice('');
    setSortBy('highest_rated');
    setOnlyTopRated(false);
  };

  const handleBookNow = (provider) => {
    const targetUrl = `/book?providerId=${provider.id}&category=${encodeURIComponent(provider.category)}`;
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(targetUrl)}`);
    } else {
      navigate(targetUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Find Professionals
          </h1>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Verified local pros, filtered by your ward
          </p>
        </div>

        {/* Search Input Bar (Full Width) */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or expertise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#07535f] focus:border-transparent shadow-sm transition-all"
          />
        </div>

        {/* Main Content Area: Left Sidebar Filters + Right Results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Sidebar Filters Panel */}
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-base">
                <SlidersHorizontal className="w-4 h-4 text-gray-600" />
                <span>Filters</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-gray-400 hover:text-[#07535f] transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Filter 1: Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] cursor-pointer"
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Filter 2: City & Ward Cascaded Filter */}
            <CityWardSelector
              value={selectedWard === 'All wards' ? '' : selectedWard}
              onChange={(w) => setSelectedWard(w || 'All wards')}
              layout="col"
            />

            {/* Filter 3: Min Rating & Quick Badges */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  Min Rating: {minRating}★
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full accent-[#07535f] cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-semibold px-0.5">
                <span>0★</span>
                <span>2.5★</span>
                <span>5★</span>
              </div>

              {/* TaskRabbit Style: 4.8+ Top Rated Filter Badge */}
              <button
                type="button"
                onClick={() => setOnlyTopRated(!onlyTopRated)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  onlyTopRated
                    ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  Top Rated Pros (4.8★+)
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${onlyTopRated ? 'bg-amber-200 text-amber-900' : 'bg-gray-200 text-gray-600'}`}>
                  {onlyTopRated ? 'ACTIVE' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Filter 4: Sort By Rating & Reviews */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] cursor-pointer"
              >
                <option value="highest_rated">⭐ Highest Rating First</option>
                <option value="most_reviewed">🔥 Most Reviewed First</option>
                <option value="price_low">💰 Price: Low to High</option>
                <option value="price_high">💎 Price: High to Low</option>
              </select>
            </div>

            {/* Filter 4: Hourly Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-gray-400" />
                Hourly Rate (Rs.)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                />
              </div>
            </div>

          </div>

          {/* Right Content Area (Provider Cards Grid) */}
          <div className="lg:col-span-3 space-y-4">
            
            <div className="text-xs font-semibold text-gray-500">
              {filtered.length} {filtered.length === 1 ? 'professional' : 'professionals'} found
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <p className="text-gray-500 font-medium text-sm">No professionals found matching your filters.</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 bg-[#07535f] text-white text-xs font-bold rounded-xl hover:bg-[#06424b] transition-all"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filtered.map(provider => (
                  <div
                    key={provider.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-all group"
                  >
                    <div>
                      {/* Name & Hourly Rate */}
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-extrabold text-gray-900 text-lg group-hover:text-[#07535f] transition-colors">
                            {provider.name}
                          </h3>
                          {provider.backgroundCheckStatus === 'approved' && (
                            <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                              <span>Verified Pro</span>
                            </span>
                          )}
                        </div>
                        <span className="font-extrabold text-sm text-gray-900 shrink-0">
                          Rs. {provider.hourlyRate}<span className="text-xs text-gray-500 font-normal">/hr</span>
                        </span>
                      </div>

                      {/* Stars & Rating score */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < Math.floor(provider.rating)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-gray-700">{provider.rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({provider.reviewsCount} reviews)</span>
                      </div>

                      {/* Bio description */}
                      <p className="text-xs text-gray-600 leading-relaxed mb-4 line-clamp-2 font-medium">
                        {provider.description}
                      </p>

                      {/* Skill Tags */}
                      <div className="mb-6">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Approved Skill Badges</span>
                        <div className="flex flex-wrap gap-1.5">
                          {provider.tags.map((tag) => (
                            <span
                              key={tag}
                              className="bg-emerald-50/50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-0.5"
                            >
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Full-width Book Now button */}
                    <button
                      onClick={() => handleBookNow(provider)}
                      className="w-full bg-[#07535f] hover:bg-[#06424b] text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow transition-all"
                    >
                      Book Now
                    </button>

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

