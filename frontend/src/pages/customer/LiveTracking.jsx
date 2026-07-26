import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, Check, Compass, Wrench, Navigation, CheckCircle2, AlertCircle, PlayCircle, Clock, MapPin, User, X, Star, DollarSign } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSocket } from '../../services/socket';
import { reviewAPI } from '../../services/api';

// Custom Leaflet icons
const createCustomIcon = (iconHtml, bgColor) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background-color:${bgColor};color:white;padding:8px;border-radius:50%;box-shadow:0 4px 6px -1px rgb(0 0 0/0.15);border:2px solid white;display:flex;align-items:center;justify-content:center;width:36px;height:36px;">${iconHtml}</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

const homeIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
const wrenchIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;

const userIcon = createCustomIcon(homeIconHtml, '#07535f');
const providerIcon = createCustomIcon(wrenchIconHtml, '#10b981');

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

const STATUSES = [
  { label: 'Booking Confirmed',  icon: CheckCircle2,  desc: 'System received and validated your request.' },
  { label: 'Provider Assigned',  icon: User,          desc: (name) => `${name} accepted your job.` },
  { label: 'Provider En Route',  icon: Navigation,    desc: 'Provider is travelling to your location.' },
  { label: 'Work In Progress',   icon: Wrench,        desc: 'Repair work is currently underway.' },
  { label: 'Job Completed',      icon: Check,         desc: 'Job finished successfully!' },
];

export default function LiveTracking() {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = location.state?.booking || {};

  const providerName = booking.provider_name || 'Your Provider';
  const serviceName = booking.service_category || booking.description || 'Home Service';
  const bookingDate = booking.booking_date ? new Date(booking.booking_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Scheduled';
  const bookingAddress = booking.location || 'Pokhara, Nepal';
  const bookingId = booking.id ? `GS-2024-${booking.id}` : 'GS-DEMO';

  // Map positions (Pokhara, Nepal)
  const userLocation = [28.2096, 83.9856];
  const initialProviderLocation = [28.2200, 83.9700];

  const [currentStatus, setCurrentStatus] = useState(1);
  const [providerPos, setProviderPos] = useState(initialProviderLocation);
  const [distance, setDistance] = useState(2.4);
  const [timeRemaining, setTimeRemaining] = useState(12);
  const [showChatModal, setShowChatModal] = useState(false);

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const submitReview = async (e) => {
    e.preventDefault();
    if (reviewRating === 0) { setReviewError('Please select a rating'); return; }
    setReviewSubmitting(true);
    setReviewError('');

    // If it's a demo booking without a database ID, simulate success
    if (!booking.id) {
      setTimeout(() => {
        setReviewSubmitted(true);
        setReviewSubmitting(false);
      }, 800);
      return;
    }

    try {
      await reviewAPI.createReview({
        booking_id: booking.id,
        provider_id: booking.provider_id,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewSubmitted(true);
    } catch (err) {
      setReviewError(err.response?.data?.error || 'Failed to submit review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Socket: listen for real-time location updates
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('location_update', (data) => {
        if (data.lat && data.lng) setProviderPos([data.lat, data.lng]);
        if (data.distance !== undefined) setDistance(data.distance);
        if (data.timeRemaining !== undefined) setTimeRemaining(data.timeRemaining);
        if (data.status !== undefined) setCurrentStatus(data.status);
      });
    }
    return () => { if (socket) socket.off('location_update'); };
  }, []);

  // Simulate movement when status changes
  useEffect(() => {
    if (currentStatus === 2) { setProviderPos([28.2150, 83.9800]); setDistance(1.2); setTimeRemaining(6); }
    else if (currentStatus >= 3) { setProviderPos(userLocation); setDistance(0); setTimeRemaining(0); }
    else { setProviderPos(initialProviderLocation); setDistance(2.4); setTimeRemaining(12); }
  }, [currentStatus]);

  const simulateProgress = () => {
    if (currentStatus < 4) setCurrentStatus(s => s + 1);
    else setCurrentStatus(0);
  };

  const statusTimes = {
    0: '10:32 AM', 1: '10:35 AM',
    2: currentStatus >= 2 ? '10:48 AM' : 'Pending',
    3: currentStatus >= 3 ? '11:02 AM' : 'Pending',
    4: currentStatus >= 4 ? '11:20 AM' : 'Pending',
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Live Job Tracking</h1>
            <p className="text-xs text-gray-400 mt-1 font-mono">Booking #{bookingId}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3.5 py-1.5 rounded-full text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live Tracking
            </span>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-full transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Left Column ── */}
          <div className="lg:col-span-1 space-y-6">

            {/* Provider Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Your Provider</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#07535f]/10 flex items-center justify-center text-[#07535f] font-extrabold text-2xl">
                  {providerName.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-gray-800 text-base">{providerName}</h2>
                  <p className="text-xs text-gray-400">{serviceName}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    <span className="text-yellow-500 font-bold">★ 4.9</span>
                    <span className="text-gray-400">(Verified)</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <a
                  href="tel:9841000000"
                  className="flex items-center justify-center gap-2 bg-[#07535f]/5 hover:bg-[#07535f]/10 text-[#07535f] px-3 py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  <Phone className="w-4 h-4" /> Call
                </a>
                <button
                  onClick={() => setShowChatModal(true)}
                  className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
              </div>
            </div>

            {/* ETA Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Live ETA</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Distance</p>
                  <p className="text-2xl font-extrabold text-gray-800 mt-1">
                    {distance > 0 ? `${distance.toFixed(1)}` : '0'}
                  </p>
                  <p className="text-xs text-gray-400">km away</p>
                </div>
                <div className="bg-[#07535f]/5 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">ETA</p>
                  <p className="text-2xl font-extrabold text-[#07535f] mt-1">
                    {timeRemaining > 0 ? timeRemaining : '—'}
                  </p>
                  <p className="text-xs text-gray-400">{timeRemaining > 0 ? 'mins' : 'Arrived'}</p>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-5">Job Progress</h3>
              <div className="relative pl-8 space-y-6">
                <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-100" />
                {STATUSES.map((status, index) => {
                  const isDone = index < currentStatus;
                  const isActive = index === currentStatus;
                  const Icon = status.icon;
                  return (
                    <div key={index} className="relative">
                      <div className={`absolute -left-8 top-0.5 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all ${
                        isDone ? 'bg-[#10b981] border-[#10b981] text-white'
                        : isActive ? 'bg-[#07535f] border-[#07535f] text-white ring-4 ring-[#07535f]/15'
                        : 'bg-white border-2 border-gray-200 text-gray-300'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold ${isActive ? 'text-gray-800' : isDone ? 'text-gray-500' : 'text-gray-300'}`}>
                            {status.label}
                            {isActive && <span className="ml-2 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold animate-pulse">LIVE</span>}
                          </h4>
                          <span className="text-[10px] text-gray-400 ml-2">{statusTimes[index]}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                          {typeof status.desc === 'function' ? status.desc(providerName) : status.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Live Map */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#07535f]" />
                  <span className="text-xs font-bold text-gray-700">Live Location Map — {bookingAddress}</span>
                </div>
                <span className="text-[10px] text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /> Tracking
                </span>
              </div>
              <div className="h-[350px] z-0 relative">
                <MapContainer center={userLocation} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                  <ChangeView center={currentStatus >= 2 ? providerPos : userLocation} />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                  />
                  <Marker position={userLocation} icon={userIcon}>
                    <Popup>
                      <div className="text-center py-1">
                        <p className="font-bold text-gray-800 text-xs">Your Location</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">{bookingAddress}</p>
                      </div>
                    </Popup>
                  </Marker>
                  {currentStatus < 4 && (
                    <Marker position={providerPos} icon={providerIcon}>
                      <Popup>
                        <div className="text-center py-1">
                          <p className="font-bold text-[#07535f] text-xs">{providerName}</p>
                          <p className="text-gray-500 text-[10px] mt-0.5">
                            {timeRemaining > 0 ? `~${timeRemaining} mins away` : 'Arrived at your location'}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>

            {/* Booking Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 text-sm mb-4">Booking Summary</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-4 rounded-xl flex items-start gap-3">
                  <Wrench className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Service</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">{serviceName}</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Scheduled</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">{bookingDate}</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl flex items-start gap-3">
                  <Navigation className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Address</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">{bookingAddress}</span>
                  </div>
                </div>
                <div className="bg-[#07535f]/5 p-4 rounded-xl flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#07535f] mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Booking ID</span>
                    <span className="text-sm font-bold text-[#07535f] block mt-0.5 font-mono">#{bookingId}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Completion Banner + Review Section ── */}
            {currentStatus >= 4 && (
              <div className="space-y-5">
                {/* Success Banner */}
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <h3 className="font-bold text-green-800 text-lg">Work completed successfully!</h3>
                  <p className="text-sm text-green-600 mt-1">Total: Rs. {booking.total_amount || booking.estimated_cost || 650}</p>
                </div>

                {/* Rate this service */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  {reviewSubmitted ? (
                    <div className="text-center py-4">
                      <div className="flex justify-center gap-1 mb-3">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-7 h-7 ${s <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <p className="font-bold text-gray-800">Thank you for your feedback!</p>
                      {reviewComment && <p className="text-sm text-gray-500 italic mt-2">"{reviewComment}"</p>}
                      <p className="text-xs text-green-600 font-semibold mt-3 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Review submitted successfully
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={submitReview}>
                      <h3 className="font-bold text-gray-800 text-base mb-4">Rate this service</h3>

                      {/* Interactive Stars */}
                      <div className="flex gap-1.5 mb-5">
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            onMouseEnter={() => setReviewHover(star)}
                            onMouseLeave={() => setReviewHover(0)}
                            className="focus:outline-none transition-transform hover:scale-110"
                          >
                            <Star className={`w-9 h-9 transition-colors ${
                              star <= (reviewHover || reviewRating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`} />
                          </button>
                        ))}
                      </div>

                      {/* Comment Box */}
                      <textarea
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Tell us about your experience"
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#07535f]/30 focus:border-[#07535f] resize-none transition-all mb-4"
                      />

                      {reviewError && (
                        <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-lg mb-3">{reviewError}</p>
                      )}

                      <button
                        type="submit"
                        disabled={reviewSubmitting || reviewRating === 0}
                        className="w-full bg-[#07535f] hover:bg-[#06424b] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                      >
                        {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Pay Invoice Link */}
                {booking.id ? (
                  <Link
                    to={`/customer/invoice/${booking.id}`}
                    className="w-full flex items-center justify-center gap-2 bg-[#60bb46] hover:bg-[#52a83b] text-white px-6 py-3.5 rounded-full font-bold shadow-sm transition-colors text-sm"
                  >
                    <DollarSign className="w-4 h-4" /> Pay Invoice (eSewa)
                  </Link>
                ) : (
                  <button
                    onClick={() => alert('eSewa Payment Simulation: In a real flow, this redirects to the payment page. For this demo, payment is simulated successfully!')}
                    className="w-full flex items-center justify-center gap-2 bg-[#60bb46] hover:bg-[#52a83b] text-white px-6 py-3.5 rounded-full font-bold shadow-sm transition-colors text-sm"
                  >
                    <DollarSign className="w-4 h-4" /> Pay Invoice (eSewa - Demo)
                  </button>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={simulateProgress}
                className="w-full sm:w-auto bg-[#07535f] hover:bg-[#06424b] text-white px-8 py-3.5 rounded-full font-bold shadow-md transition-all text-sm flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" /> Simulate Next Step
              </button>

              <div className="flex w-full sm:w-auto gap-3">
                <button
                  onClick={() => { if (window.confirm('Cancel this booking?')) navigate('/customer/bookings'); }}
                  className="flex-1 sm:flex-none border border-red-200 hover:bg-red-50 text-red-600 px-5 py-3 rounded-full text-xs font-bold transition-all"
                >
                  Cancel Booking
                </button>
                {booking.id && (
                  <Link
                    to={`/customer/bookings/${booking.id}`}
                    className="flex-1 sm:flex-none border border-[#07535f] hover:bg-[#07535f]/5 text-[#07535f] px-5 py-3 rounded-full text-xs font-bold transition-all text-center"
                  >
                    View Full Details
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Simple Chat Modal */}
        {showChatModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Chat with {providerName}</h3>
                <button onClick={() => setShowChatModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5 text-center text-gray-400 text-sm py-10">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                {booking.id
                  ? <Link to={`/customer/bookings/${booking.id}`} onClick={() => setShowChatModal(false)} className="text-[#07535f] font-bold hover:underline">Open full chat in Booking Details →</Link>
                  : <p>Chat is available in the Booking Details page.</p>
                }
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
