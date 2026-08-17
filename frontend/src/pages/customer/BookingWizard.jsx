import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Wrench, Calendar, MapPin, CreditCard, ChevronRight, X, Zap, 
  Wind, Sparkles, ArrowLeft, Building2, Clock, Sun, SunMedium, Moon, Check 
} from 'lucide-react';
import { bookingAPI } from '../../services/api';
import CityWardSelector from '../../components/CityWardSelector';
import { useAuth } from '../../context/AuthContext';

export default function BookingWizard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const categoryParam = queryParams.get('category');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    }
  }, [isAuthenticated, navigate, location]);

  // Services grouped by category
  const servicesByCategory = {
    Plumbing: {
      categoryId: 1,
      icon: <Wrench className="w-8 h-8" />,
      emoji: '🔧',
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      items: [
        { id: 'pipe-leak', name: 'Pipe Leak Repair', duration: '1–2 hrs', price: 'Rs. 500 – 800' },
        { id: 'drain-cleaning', name: 'Drain Cleaning', duration: '1 hr', price: 'Rs. 400 – 600' },
        { id: 'tap-repair', name: 'Tap / Faucet Repair', duration: '30–60 min', price: 'Rs. 300 – 500' },
        { id: 'new-pipe', name: 'New Pipe Installation', duration: '2–4 hrs', price: 'Rs. 1,000+' },
        { id: 'water-tank', name: 'Water Tank Cleaning', duration: '2–3 hrs', price: 'Rs. 800 – 1,200' },
      ]
    },
    Electrical: {
      categoryId: 2,
      icon: <Zap className="w-8 h-8" />,
      emoji: '⚡',
      color: 'bg-yellow-50 text-yellow-600 border-yellow-100',
      items: [
        { id: 'wiring', name: 'Home Rewiring', duration: '4–8 hrs', price: 'Rs. 2,000+' },
        { id: 'switchboard', name: 'Switchboard Repair', duration: '1–2 hrs', price: 'Rs. 400 – 700' },
        { id: 'appliance', name: 'Appliance Installation', duration: '1–3 hrs', price: 'Rs. 500 – 1,000' },
        { id: 'light-fitting', name: 'Light Fitting', duration: '1–2 hrs', price: 'Rs. 300 – 600' },
        { id: 'panel-box', name: 'Panel Box / MCB Repair', duration: '2–4 hrs', price: 'Rs. 800 – 1,500' },
      ]
    },
    Cleaning: {
      categoryId: 3,
      icon: <Sparkles className="w-8 h-8" />,
      emoji: '🧹',
      color: 'bg-green-50 text-green-600 border-green-100',
      items: [
        { id: 'deep-clean', name: 'Full Home Deep Clean', duration: '4–6 hrs', price: 'Rs. 1,500 – 2,500' },
        { id: 'kitchen-clean', name: 'Kitchen Deep Clean', duration: '2–3 hrs', price: 'Rs. 800 – 1,200' },
        { id: 'bathroom-clean', name: 'Bathroom Scrubbing', duration: '1–2 hrs', price: 'Rs. 400 – 700' },
        { id: 'sofa-clean', name: 'Sofa / Carpet Cleaning', duration: '2–4 hrs', price: 'Rs. 600 – 1,200' },
        { id: 'office-clean', name: 'Office Cleaning', duration: '3–5 hrs', price: 'Rs. 1,200 – 2,000' },
      ]
    },
    'AC Service': {
      categoryId: 4,
      icon: <Wind className="w-8 h-8" />,
      emoji: '❄️',
      color: 'bg-teal-50 text-teal-600 border-teal-100',
      items: [
        { id: 'ac-service', name: 'Regular AC Servicing', duration: '1–2 hrs', price: 'Rs. 600 – 900' },
        { id: 'gas-refill', name: 'Gas Refilling', duration: '1 hr', price: 'Rs. 800 – 1,200' },
        { id: 'ac-repair', name: 'AC Not Cooling Repair', duration: '2–3 hrs', price: 'Rs. 1,000 – 2,000' },
        { id: 'ac-install', name: 'New AC Installation', duration: '3–5 hrs', price: 'Rs. 2,500+' },
      ]
    }
  };

  const MORNING_SLOTS = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM'];
  const AFTERNOON_SLOTS = ['12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
  const EVENING_SLOTS = ['05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];

  // State
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return servicesByCategory[categoryParam] ? categoryParam : null;
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [selectedDate, setSelectedDate] = useState(() => tomorrow.toISOString().split('T')[0]);
  
  // Exact Time Selector State
  const [hour, setHour] = useState('10');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('AM');
  
  // Location States (City/Ward, Tole, Landmark)
  const [selectedWard, setSelectedWard] = useState(user?.ward || 'Pokhara Ward No. 6');
  const [tole, setTole] = useState('');
  const [landmark, setLandmark] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getQuickDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoDate = d.toISOString().split('T')[0];
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dates.push({ isoDate, label, dayNum });
    }
    return dates;
  };

  const getFormattedTimeStr = () => {
    return `${hour}:${minute} ${period}`;
  };

  const getSelectedDateTimeISO = () => {
    if (!selectedDate) return new Date().toISOString();
    let hours = parseInt(hour, 10);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minute).padStart(2, '0');

    return `${selectedDate}T${formattedHours}:${formattedMinutes}:00.000Z`;
  };

  // Assemble full address string
  const getFullAddress = () => {
    const parts = [];
    if (tole.trim()) parts.push(`Tole: ${tole.trim()}`);
    if (landmark.trim()) parts.push(`Landmark: ${landmark.trim()}`);
    if (selectedWard) parts.push(selectedWard);
    return parts.join(', ') || selectedWard || 'Not specified';
  };

  // Keep selectedService in sync when category changes
  useEffect(() => {
    if (selectedCategory && servicesByCategory[selectedCategory]) {
      setSelectedService(servicesByCategory[selectedCategory].items[0].id);
      setCurrentStep(1);
    }
  }, [selectedCategory]);

  const categoryData = selectedCategory ? servicesByCategory[selectedCategory] : null;
  const services = categoryData ? categoryData.items : [];

  const handleContinue = async () => {
    setErrorMsg('');

    if (currentStep === 2) {
      if (!selectedDate || !hour || !minute || !period) {
        setErrorMsg('Please select a valid date and exact arrival time.');
        return;
      }
    }

    // Step 3 Validation: Require Ward, Tole, and Landmark
    if (currentStep === 3) {
      if (!selectedWard) {
        setErrorMsg('Please select your city and ward.');
        return;
      }
      if (!tole.trim()) {
        setErrorMsg('Please enter your Tole / Street name.');
        return;
      }
      if (!landmark.trim()) {
        setErrorMsg('Please enter a nearby landmark.');
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsLoading(true);
      try {
        const serviceObj = services.find(s => s.id === selectedService);
        const fullAddress = getFullAddress();
        const res = await bookingAPI.createBooking({
          provider_id: 2,
          category_id: categoryData.categoryId,
          booking_date: getSelectedDateTimeISO(),
          location: fullAddress,
          description: `${selectedCategory} - ${serviceObj?.name || selectedService}: ${notes || 'No notes'}`,
          is_emergency: false
        });
        setIsLoading(false);
        navigate(`/customer/bookings/${res.data.booking.id}`);
      } catch (err) {
        console.warn('Booking create error', err);
        setIsLoading(false);
        navigate('/track');
      }
    }
  };

  const activeStepClass = "w-10 h-10 rounded-full bg-[#07535f] text-white flex items-center justify-center font-bold shadow-md ring-4 ring-[#07535f]/15 transition-all";
  const inactiveStepClass = "w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold border border-gray-200 transition-all";
  const lineClass = "flex-1 h-0.5 bg-[#07535f] mx-2";
  const activeLineClass = "flex-1 h-0.5 bg-[#07535f] mx-2";

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        
        {/* Wizard Header */}
        <div className="px-6 py-6 border-b border-gray-50 flex justify-between items-start bg-gray-50/20">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-serif">Book a Service</h1>
            {selectedCategory ? (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-500">Category: <span className="font-bold text-[#07535f]">{selectedCategory}</span></p>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  (Change)
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-0.5">Please select a service category to start</p>
            )}
          </div>
          <button
            onClick={() => navigate('/')}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {!selectedCategory ? (
          /* Category Selection Grid */
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">What service do you need?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Object.keys(servicesByCategory).map((catName) => {
                const cat = servicesByCategory[catName];
                return (
                  <button
                    key={catName}
                    onClick={() => setSelectedCategory(catName)}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-gray-100 hover:border-[#07535f] hover:bg-[#07535f]/5 transition-all text-center group bg-white shadow-sm"
                  >
                    <span className="text-5xl group-hover:scale-110 transition-transform mb-4 block">{cat.emoji}</span>
                    <h3 className="font-bold text-gray-800 text-lg">{catName}</h3>
                    <p className="text-xs text-gray-400 mt-2">Book instant home services for {catName.toLowerCase()}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Booking Multi-Step Form */
          <>
            {/* Multi-step progress bar */}
            <div className="px-8 py-8 border-b border-gray-50">
              <div className="flex items-center justify-between">
                {/* Step 1 */}
                <div className="flex flex-col items-center gap-2">
                  <div className={currentStep >= 1 ? activeStepClass : inactiveStepClass}>
                    <Wrench className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Service Details</span>
                </div>

                <div className={currentStep >= 2 ? activeLineClass : lineClass}></div>

                {/* Step 2 */}
                <div className="flex flex-col items-center gap-2">
                  <div className={currentStep >= 2 ? activeStepClass : inactiveStepClass}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400">Schedule</span>
                </div>

                <div className={currentStep >= 3 ? activeLineClass : lineClass}></div>

                {/* Step 3 */}
                <div className="flex flex-col items-center gap-2">
                  <div className={currentStep >= 3 ? activeStepClass : inactiveStepClass}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400">Address</span>
                </div>

                <div className={currentStep >= 4 ? activeLineClass : lineClass}></div>

                {/* Step 4 */}
                <div className="flex flex-col items-center gap-2">
                  <div className={currentStep >= 4 ? activeStepClass : inactiveStepClass}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400">Confirm & Pay</span>
                </div>
              </div>
            </div>

            {/* Wizard Form Content */}
            <div className="p-8">
              {currentStep === 1 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button 
                      onClick={() => setSelectedCategory(null)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors mr-1"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800">Select Service</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-6">Choose the specific service you need</p>

                  {/* Service Radio cards */}
                  <div className="space-y-3.5 mb-8">
                    {services.map(s => {
                      const isSelected = selectedService === s.id;
                      return (
                        <label
                          key={s.id}
                          className={`flex justify-between items-center p-4.5 rounded-2xl border-2 transition-all cursor-pointer select-none bg-white ${
                            isSelected
                              ? 'border-[#07535f] bg-[#07535f]/5 shadow-sm'
                              : 'border-gray-150 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="service"
                              value={s.id}
                              checked={isSelected}
                              onChange={() => setSelectedService(s.id)}
                              className="w-4 h-4 text-[#07535f] focus:ring-[#07535f] border-gray-300"
                            />
                            <div>
                              <p className="text-sm font-bold text-gray-800">{s.name}</p>
                              <span className="text-xs text-gray-400 block mt-0.5">{s.duration}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-extrabold text-[#07535f]">{s.price}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Additional notes */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-2">
                      Describe the Problem (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe the issue in detail..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 focus:outline-none focus:border-[#07535f] focus:ring-1 focus:ring-[#07535f] resize-none"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="mt-4">
                    <label className="text-xs font-bold text-gray-700 block mb-2">
                      Upload a Photo (optional)
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#07535f] hover:bg-[#07535f]/5 transition-all">
                      {photo ? (
                        <div className="text-center">
                          <p className="text-xs font-bold text-[#07535f]">✅ {photo.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Click to change</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-2xl">📸</p>
                          <p className="text-xs text-gray-400 mt-1">Click to attach a photo</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-1">
                    <button 
                      onClick={() => setCurrentStep(1)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors mr-1"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800">Schedule Appointment</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">Select the date and specify the exact time for your appointment</p>

                  {/* 1. Date Selector (Quick Date Pills + Custom Date Input) */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#07535f]" />
                      Select Service Date
                    </label>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {getQuickDates().map((d) => {
                        const isSelected = selectedDate === d.isoDate;
                        return (
                          <button
                            key={d.isoDate}
                            type="button"
                            onClick={() => setSelectedDate(d.isoDate)}
                            className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#07535f] bg-[#07535f]/5 text-[#07535f] font-extrabold shadow-xs ring-1 ring-[#07535f]/20'
                                : 'border-gray-200 bg-white text-gray-700 font-semibold hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">{d.label}</span>
                            <span className="text-xs font-black">{d.dayNum}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-medium text-gray-400">Or choose custom date:</span>
                      <input
                        type="date"
                        value={selectedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] cursor-pointer bg-white"
                      />
                    </div>
                  </div>

                  {/* 2. Exact Time Selector */}
                  <div className="space-y-4 pt-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#07535f]" />
                        Select Exact Service Time
                      </span>
                      <span className="text-[11px] text-[#07535f] font-bold bg-[#07535f]/10 px-2.5 py-0.5 rounded-full">
                        Exact Time Chooser
                      </span>
                    </label>

                    {/* Exact Time Picker Controls */}
                    <div className="bg-gray-50/70 border-2 border-[#07535f]/20 rounded-2xl p-5 shadow-xs space-y-4">
                      <p className="text-xs text-gray-500 font-medium">Select your exact preferred arrival hour, minute, and AM/PM:</p>

                      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200">
                        {/* Hour Dropdown */}
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hour</span>
                          <select
                            value={hour}
                            onChange={(e) => setHour(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-extrabold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] cursor-pointer"
                          >
                            {Array.from({ length: 12 }, (_, i) => {
                              const h = String(i + 1).padStart(2, '0');
                              return <option key={h} value={h}>{h}</option>;
                            })}
                          </select>
                        </div>

                        <span className="text-xl font-black text-gray-400 self-center">:</span>

                        {/* Minute Dropdown */}
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Minute</span>
                          <select
                            value={minute}
                            onChange={(e) => setMinute(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-extrabold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] cursor-pointer"
                          >
                            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        {/* AM/PM Switch */}
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Period</span>
                          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                            <button
                              type="button"
                              onClick={() => setPeriod('AM')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                period === 'AM'
                                  ? 'bg-[#07535f] text-white shadow-xs'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              AM
                            </button>
                            <button
                              type="button"
                              onClick={() => setPeriod('PM')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                period === 'PM'
                                  ? 'bg-[#07535f] text-white shadow-xs'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              PM
                            </button>
                          </div>
                        </div>

                        {/* Direct Time Input Option */}
                        <div className="flex flex-col items-start sm:border-l sm:border-gray-150 sm:pl-4">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Or Pick Custom Time</span>
                          <input
                            type="time"
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const [h24, m] = e.target.value.split(':');
                              let hNum = parseInt(h24, 10);
                              const p = hNum >= 12 ? 'PM' : 'AM';
                              if (hNum > 12) hNum -= 12;
                              if (hNum === 0) hNum = 12;
                              setHour(String(hNum).padStart(2, '0'));
                              setMinute(m);
                              setPeriod(p);
                            }}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#07535f] cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Quick Popular Times */}
                      <div className="pt-1">
                        <span className="text-[11px] font-bold text-gray-500 block mb-2">⚡ Quick Popular Times:</span>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { h: '08', m: '00', p: 'AM' },
                            { h: '09', m: '30', p: 'AM' },
                            { h: '10', m: '00', p: 'AM' },
                            { h: '11', m: '30', p: 'AM' },
                            { h: '01', m: '00', p: 'PM' },
                            { h: '02', m: '30', p: 'PM' },
                            { h: '04', m: '00', p: 'PM' },
                            { h: '05', m: '30', p: 'PM' },
                            { h: '07', m: '00', p: 'PM' },
                          ].map((t) => {
                            const formattedStr = `${t.h}:${t.m} ${t.p}`;
                            const isSelected = hour === t.h && minute === t.m && period === t.p;
                            return (
                              <button
                                key={formattedStr}
                                type="button"
                                onClick={() => {
                                  setHour(t.h);
                                  setMinute(t.m);
                                  setPeriod(t.p);
                                }}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#07535f] text-white border-[#07535f] shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#07535f]/50 hover:bg-[#07535f]/5'
                                }`}
                              >
                                {formattedStr}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  {/* Selected Schedule Summary Banner */}
                  <div className="bg-[#07535f]/10 border border-[#07535f]/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#07535f] text-white flex items-center justify-center font-bold">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Selected Appointment Time</span>
                        <p className="text-xs font-extrabold text-gray-900">
                          {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''} at {getFormattedTimeStr()}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#07535f] bg-white px-3 py-1 rounded-xl border border-[#07535f]/20 shadow-2xs">
                      Confirmed Exact Time
                    </span>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button 
                      onClick={() => setCurrentStep(2)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors mr-1"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800">Service Address &amp; Location</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-6">Select your city &amp; ward, and enter your tole and landmark</p>

                  <div className="space-y-4">
                    {/* 1. City & Ward Cascading Selector */}
                    <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-150">
                      <CityWardSelector
                        value={selectedWard}
                        onChange={(w) => {
                          setSelectedWard(w);
                          setErrorMsg('');
                        }}
                        required
                        layout="row"
                      />
                      <p className="text-[11px] text-gray-400 mt-2">Select your city (Bharatpur, Kathmandu, or Pokhara) and your specific ward.</p>
                    </div>

                    {/* 2. Tole Name */}
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#07535f]" />
                        Tole / Street Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tole}
                        onChange={(e) => { setTole(e.target.value); setErrorMsg(''); }}
                        placeholder="e.g. Siddhartha Tole, Ganesh Marg, New Road..."
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-[#07535f] focus:ring-1 focus:ring-[#07535f] text-gray-800 bg-white"
                      />
                    </div>

                    {/* 3. Landmark */}
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#07535f]" />
                        Nearby Landmark <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => { setLandmark(e.target.value); setErrorMsg(''); }}
                        placeholder="e.g. Opposite Prabhu Bank, Near Water Tank, Behind Hospital..."
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-[#07535f] focus:ring-1 focus:ring-[#07535f] text-gray-800 bg-white"
                      />
                    </div>

                    {errorMsg && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    {/* Full Address Live Preview */}
                    {selectedWard && (
                      <div className="bg-sky-50/70 border border-sky-150 p-3.5 rounded-xl text-xs text-sky-900">
                        <span className="font-bold block mb-0.5">📍 Service Address Preview:</span>
                        <span className="font-semibold text-sky-800">{getFullAddress()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button 
                      onClick={() => setCurrentStep(3)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors mr-1"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800">Confirm & Pay</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-6">Review your booking summary and confirm payment mode</p>

                  <div className="border border-gray-100 rounded-2xl p-5 space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Service:</span>
                      <span className="font-bold text-gray-800">
                        {services.find(s => s.id === selectedService)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Scheduled:</span>
                      <span className="font-bold text-gray-800">
                        {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''} at {selectedTimeSlot}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Address:</span>
                      <span className="font-bold text-gray-800">{getFullAddress()}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-50 pt-4">
                      <span className="text-gray-400">Estimated Cost:</span>
                      <span className="font-extrabold text-[#07535f]">
                        {services.find(s => s.id === selectedService)?.price}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#07535f]/5 border border-[#07535f]/15 p-4 rounded-xl text-xs text-[#07535f] font-semibold text-center leading-relaxed">
                    🔒 Pay Gharelu Sewa directly after service completion — eSewa, bank transfer, or cash deposit. Funds are held securely until the job is confirmed.
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-5 border-t border-gray-50 bg-gray-50/20">
              <button
                onClick={handleContinue}
                disabled={isLoading}
                className="w-full bg-[#07535f] text-white hover:bg-[#06424b] py-4 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-sm shadow-sm cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : currentStep === 4 ? (
                  'Confirm Booking'
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

