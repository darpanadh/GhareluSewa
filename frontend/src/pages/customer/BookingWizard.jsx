import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wrench, Calendar, MapPin, CreditCard, ChevronRight, X, Zap, Wind, Sparkles, ArrowLeft } from 'lucide-react';
import { bookingAPI } from '../../services/api';

import { useAuth } from '../../context/AuthContext';

export default function BookingWizard() {
  const { isAuthenticated } = useAuth();
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

  // State
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return servicesByCategory[categoryParam] ? categoryParam : null;
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 16));
  const [address, setAddress] = useState('Lakeside, Pokhara');
  const [isLoading, setIsLoading] = useState(false);

  const pokharaLocations = [
    'Lakeside, Pokhara', 'New Road, Pokhara', 'Chipiyata, Pokhara',
    'Bagar, Pokhara', 'Mahendrapul, Pokhara', 'Simalchaur, Pokhara', 'Prithvichowk, Pokhara'
  ];
  const kathmanduLocations = [
    'Baneshwor, Kathmandu', 'Thamel, Kathmandu', 'Koteshwor, Kathmandu',
    'Pulchowk, Lalitpur', 'Jawalakhel, Lalitpur', 'Bhaktapur'
  ];

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
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsLoading(true);
      try {
        const serviceObj = services.find(s => s.id === selectedService);
        const res = await bookingAPI.createBooking({
          provider_id: 2,
          category_id: categoryData.categoryId,
          booking_date: date ? new Date(date).toISOString() : new Date().toISOString(),
          location: address,
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
  const lineClass = "flex-1 h-0.5 bg-gray-200 mx-2";
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
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button 
                      onClick={() => setCurrentStep(1)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors mr-1"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800">Schedule Appointment</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-6">Specify when you want the service professional to arrive</p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-2">Select Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full border border-gray-200 rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:border-[#07535f] focus:ring-1 focus:ring-[#07535f] text-gray-800"
                      />
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-500">
                      ⚡ Gharelu Sewa providers usually respond to booking requests within 15 minutes.
                    </div>
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
                    <h2 className="text-lg font-bold text-gray-800">Service Address</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-6">Enter the location details where the service is needed</p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-2">Service Address</label>
                      <select
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:border-[#07535f] focus:ring-1 focus:ring-[#07535f] text-gray-800 bg-white"
                      >
                        <optgroup label="🏔 Pokhara">
                          {pokharaLocations.map(l => <option key={l} value={l}>{l}</option>)}
                        </optgroup>
                        <optgroup label="🏙 Kathmandu Valley">
                          {kathmanduLocations.map(l => <option key={l} value={l}>{l}</option>)}
                        </optgroup>
                      </select>
                      <p className="text-xs text-gray-400 mt-2">Select the area closest to your home.</p>
                    </div>
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
                      <span className="font-bold text-gray-800">{date ? new Date(date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Address:</span>
                      <span className="font-bold text-gray-800">{address}</span>
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
                className="w-full bg-[#07535f] text-white hover:bg-[#06424b] py-4 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-sm shadow-sm"
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

