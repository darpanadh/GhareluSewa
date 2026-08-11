import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, MessageSquare, Check, Compass, Wrench, Navigation,
  CheckCircle2, AlertCircle, PlayCircle, Clock, MapPin, User,
  X, Star, DollarSign, Loader2,
} from 'lucide-react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSocket, joinBooking, leaveBooking } from '../../services/socket';
import { reviewAPI, bookingAPI } from '../../services/api';

// ── Fix Leaflet default icon paths broken by Vite/Webpack bundlers ──────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom marker icons ──────────────────────────────────────────────────────
const makeIcon = (svgPath, bg) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};color:white;
      width:38px;height:38px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 12px rgba(0,0,0,0.25);
      border:2.5px solid white;
    ">${svgPath}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  });

const HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2.5">
  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</svg>`;

const WRENCH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2.5">
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
</svg>`;

const userIcon     = makeIcon(HOME_SVG,   '#07535f');
const providerIcon = makeIcon(WRENCH_SVG, '#10b981');

// ── Status timeline definition ───────────────────────────────────────────────
const STATUSES = [
  { label: 'Booking Confirmed', icon: CheckCircle2, desc: 'System received and validated your request.' },
  { label: 'Provider Assigned', icon: User,          desc: (name) => `${name} accepted your job.` },
  { label: 'Provider En Route', icon: Navigation,    desc: 'Provider is travelling to your location.' },
  { label: 'Work In Progress',  icon: Wrench,        desc: 'Repair work is currently underway.' },
  { label: 'Job Completed',     icon: Check,         desc: 'Job finished successfully!' },
];

// ── Map view controller: fit bounds to show both markers ─────────────────────
function FitBoundsView({ userPos, providerPos, currentStatus }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (currentStatus >= 3) {
      // Arrived — just centre on user
      map.setView(userPos, 15);
      fitted.current = false;
    } else {
      const bounds = L.latLngBounds([userPos, providerPos]).pad(0.25);
      map.fitBounds(bounds, { animate: true });
      fitted.current = true;
    }
  }, [providerPos, currentStatus]);

  return null;
}

// ── Pokhara demo coordinates ─────────────────────────────────────────────────
const USER_POS               = [28.2096, 83.9856];
const INITIAL_PROVIDER_POS   = [28.2260, 83.9700];
const MIDWAY_PROVIDER_POS    = [28.2170, 83.9790];

const DEMO_STATUS_TIMES = {
  0: '10:32 AM', 1: '10:35 AM',
  2: null, 3: null, 4: null,
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function LiveTracking() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { bookingId: paramBookingId } = useParams();

  // Booking data — prefer location.state, fall back to fetching by URL param
  const [booking,        setBooking]        = useState(location.state?.booking || null);
  const [bookingLoading, setBookingLoading] = useState(!location.state?.booking && !!paramBookingId);
  const [bookingError,   setBookingError]   = useState('');

  // Map / tracking state
  const [currentStatus,  setCurrentStatus]  = useState(1);
  const [providerPos,    setProviderPos]    = useState(INITIAL_PROVIDER_POS);
  const [distance,       setDistance]       = useState(2.4);
  const [timeRemaining,  setTimeRemaining]  = useState(12);
  const [showChatModal,  setShowChatModal]  = useState(false);
  const [statusTimes,    setStatusTimes]    = useState({ ...DEMO_STATUS_TIMES });

  // Review state
  const [reviewRating,     setReviewRating]     = useState(0);
  const [reviewHover,      setReviewHover]       = useState(0);
  const [reviewComment,    setReviewComment]     = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted,  setReviewSubmitted]  = useState(false);
  const [reviewError,      setReviewError]       = useState('');

  // ── Fetch booking by URL param if not in state ─────────────────────────────
  useEffect(() => {
    if (!booking && paramBookingId) {
      setBookingLoading(true);
      bookingAPI.getBookingById(paramBookingId)
        .then(res => setBooking(res.data))
        .catch(() => setBookingError('Could not load booking details.'))
        .finally(() => setBookingLoading(false));
    }
  }, [paramBookingId]);

  // Derived booking fields
  const providerName   = booking?.provider_name  || 'Your Provider';
  const serviceName    = booking?.service_category || booking?.description || 'Home Service';
  const bookingDate    = booking?.booking_date
    ? new Date(booking.booking_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Scheduled';
  const bookingAddress = booking?.location || 'Pokhara, Nepal';
  const bookingId      = booking?.id ? `GS-2024-${booking.id}` : 'GS-DEMO';

  // ── Socket: join room and listen for real-time updates ───────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const roomId = booking?.id;
    if (roomId) joinBooking(roomId);

    // Real-time location from provider
    socket.on('location_update', (data) => {
      if (data.lat && data.lng) setProviderPos([data.lat, data.lng]);
      if (data.distance    !== undefined) setDistance(data.distance);
      if (data.timeRemaining !== undefined) setTimeRemaining(data.timeRemaining);
    });

    // Real-time status change
    socket.on('status_updated', (data) => {
      const statusMap = {
        confirmed:   1,
        accepted:    1,
        in_progress: 3,
        completed:   4,
      };
      const newStatus = statusMap[data.status];
      if (newStatus !== undefined) {
        setCurrentStatus(newStatus);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatusTimes(prev => ({ ...prev, [newStatus]: now }));
      }
    });

    return () => {
      if (socket) {
        socket.off('location_update');
        socket.off('status_updated');
        if (roomId) leaveBooking(roomId);
      }
    };
  }, [booking?.id]);

  // ── Simulate marker movement when status changes ──────────────────────────
  useEffect(() => {
    if (currentStatus === 2) {
      setProviderPos(MIDWAY_PROVIDER_POS);
      setDistance(1.2);
      setTimeRemaining(6);
    } else if (currentStatus >= 3) {
      setProviderPos(USER_POS);
      setDistance(0);
      setTimeRemaining(0);
    } else {
      setProviderPos(INITIAL_PROVIDER_POS);
      setDistance(2.4);
      setTimeRemaining(12);
    }
  }, [currentStatus]);

  const simulateProgress = () => {
    const next = currentStatus < 4 ? currentStatus + 1 : 0;
    setCurrentStatus(next);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setStatusTimes(prev => ({ ...prev, [next]: now }));
  };

  // ── Review submit ─────────────────────────────────────────────────────────
  const submitReview = async (e) => {
    e.preventDefault();
    if (reviewRating === 0) { setReviewError('Please select a rating'); return; }
    setReviewSubmitting(true);
    setReviewError('');
    if (!booking?.id) {
      setTimeout(() => { setReviewSubmitted(true); setReviewSubmitting(false); }, 800);
      return;
    }
    try {
      await reviewAPI.createReview({
        booking_id:  booking.id,
        provider_id: booking.provider_id,
        rating:      reviewRating,
        comment:     reviewComment,
      });
      setReviewSubmitted(true);
    } catch (err) {
      setReviewError(err.response?.data?.error || 'Failed to submit review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Polyline path ─────────────────────────────────────────────────────────
  const routePath = currentStatus < 3 ? [providerPos, USER_POS] : null;

  // ── Loading / error states ────────────────────────────────────────────────
  if (bookingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#07535f] mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Loading tracking info…</p>
        </div>
      </div>
    );
  }
  if (bookingError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 font-semibold">{bookingError}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-5 py-2 bg-[#07535f] text-white rounded-full text-sm font-bold"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
                  {providerName.charAt(0).toUpperCase()}
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
                    {distance > 0 ? distance.toFixed(1) : '0'}
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
                  const isDone   = index < currentStatus;
                  const isActive = index === currentStatus;
                  const Icon     = status.icon;
                  return (
                    <div key={index} className="relative">
                      <div className={`absolute -left-8 top-0.5 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all ${
                        isDone   ? 'bg-[#10b981] border-[#10b981] text-white'
                        : isActive ? 'bg-[#07535f] border-[#07535f] text-white ring-4 ring-[#07535f]/15'
                        : 'bg-white border-2 border-gray-200 text-gray-300'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold ${isActive ? 'text-gray-800' : isDone ? 'text-gray-500' : 'text-gray-300'}`}>
                            {status.label}
                            {isActive && (
                              <span className="ml-2 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold animate-pulse">
                                LIVE
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] text-gray-400 ml-2">
                            {statusTimes[index] || 'Pending'}
                          </span>
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
                  <span className="text-xs font-bold text-gray-700">
                    Live Location Map — {bookingAddress}
                  </span>
                </div>
                <span className="text-[10px] text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /> Tracking
                </span>
              </div>

              {/* ── Leaflet Map ── */}
              <div className="h-[380px] relative" style={{ zIndex: 0 }}>
                <MapContainer
                  center={USER_POS}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                  scrollWheelZoom={true}
                >
                  <FitBoundsView
                    userPos={USER_POS}
                    providerPos={providerPos}
                    currentStatus={currentStatus}
                  />

                  {/* Carto tile layer — clean, modern look */}
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'
                  />

                  {/* Route polyline — dashed green line */}
                  {routePath && (
                    <Polyline
                      positions={routePath}
                      pathOptions={{
                        color: '#10b981',
                        weight: 3,
                        opacity: 0.7,
                        dashArray: '8 6',
                      }}
                    />
                  )}

                  {/* Customer / home marker */}
                  <Marker position={USER_POS} icon={userIcon}>
                    <Popup>
                      <div className="text-center py-1 min-w-[130px]">
                        <p className="font-bold text-gray-800 text-xs">📍 Your Location</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">{bookingAddress}</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Provider marker — hide when completed */}
                  {currentStatus < 4 && (
                    <Marker position={providerPos} icon={providerIcon}>
                      <Popup>
                        <div className="text-center py-1 min-w-[140px]">
                          <p className="font-bold text-[#07535f] text-xs">🔧 {providerName}</p>
                          <p className="text-gray-500 text-[10px] mt-0.5">
                            {timeRemaining > 0
                              ? `~${timeRemaining} mins away`
                              : 'Arrived at your location'}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              {/* Map Legend */}
              <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center gap-5 flex-wrap">
                <span className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                  <span className="w-3 h-3 rounded-full bg-[#07535f] inline-block border border-white shadow-sm" />
                  Your Location
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                  <span className="w-3 h-3 rounded-full bg-[#10b981] inline-block border border-white shadow-sm" />
                  {providerName}
                </span>
                {routePath && (
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                    <span className="inline-block w-6 border-b-2 border-dashed border-[#10b981]" />
                    Route
                  </span>
                )}
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

            {/* ── Completion Banner + Review ── */}
            {currentStatus >= 4 && (
              <div className="space-y-5">
                {/* Success Banner */}
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <h3 className="font-bold text-green-800 text-lg">Work completed successfully!</h3>
                  <p className="text-sm text-green-600 mt-1">
                    Total: Rs. {booking?.total_amount || booking?.estimated_cost || 650}
                  </p>
                </div>

                {/* Review Form */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  {reviewSubmitted ? (
                    <div className="text-center py-4">
                      <div className="flex justify-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-7 h-7 ${s <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                      <p className="font-bold text-gray-800">Thank you for your feedback!</p>
                      {reviewComment && (
                        <p className="text-sm text-gray-500 italic mt-2">"{reviewComment}"</p>
                      )}
                      <p className="text-xs text-green-600 font-semibold mt-3 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Review submitted successfully
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={submitReview}>
                      <h3 className="font-bold text-gray-800 text-base mb-4">Rate this service</h3>

                      {/* Interactive Stars */}
                      <div className="flex gap-1.5 mb-5">
                        {[1, 2, 3, 4, 5].map(star => (
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

                      {/* Completion Status */}
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                          Completion Status
                        </label>
                        <select
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#07535f]/30"
                          onChange={(e) =>
                            setReviewComment(prev =>
                              prev + (prev ? ' | ' : '') + `[Status: ${e.target.value}]`
                            )
                          }
                        >
                          <option value="completed_on_time">✅ Completed on time</option>
                          <option value="delayed">⚠️ Delayed but completed</option>
                          <option value="exceeded_expectations">🌟 Exceeded expectations</option>
                        </select>
                      </div>

                      {/* Photo Upload Simulation */}
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                          Photo Evidence (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#07535f] transition-colors bg-gray-50/50">
                          <span className="text-xl mb-1 block">📸</span>
                          <span className="text-xs text-gray-500 font-semibold">
                            Tap to upload photo of completed work
                          </span>
                        </div>
                      </div>

                      <textarea
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Tell us about your experience..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#07535f]/30 focus:border-[#07535f] resize-none transition-all mb-4"
                      />

                      {reviewError && (
                        <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-lg mb-3">
                          {reviewError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={reviewSubmitting || reviewRating === 0}
                        className="w-full bg-[#07535f] hover:bg-[#06424b] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                      >
                        {reviewSubmitting ? 'Submitting…' : 'Submit Verified Review'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Pay Invoice */}
                {booking?.id ? (
                  <Link
                    to={`/customer/invoice/${booking.id}`}
                    className="w-full flex items-center justify-center gap-2 bg-[#60bb46] hover:bg-[#52a83b] text-white px-6 py-3.5 rounded-full font-bold shadow-sm transition-colors text-sm"
                  >
                    <DollarSign className="w-4 h-4" /> Pay Invoice (eSewa)
                  </Link>
                ) : (
                  <button
                    onClick={() =>
                      alert(
                        'eSewa Payment Simulation: In a real flow, this redirects to the payment page. For this demo, payment is simulated successfully!'
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 bg-[#60bb46] hover:bg-[#52a83b] text-white px-6 py-3.5 rounded-full font-bold shadow-sm transition-colors text-sm"
                  >
                    <DollarSign className="w-4 h-4" /> Pay Invoice (eSewa — Demo)
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
                  onClick={() => {
                    if (window.confirm('Cancel this booking?')) navigate('/customer/bookings');
                  }}
                  className="flex-1 sm:flex-none border border-red-200 hover:bg-red-50 text-red-600 px-5 py-3 rounded-full text-xs font-bold transition-all"
                >
                  Cancel Booking
                </button>
                {booking?.id && (
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

        {/* ── Simple Chat Modal ── */}
        {showChatModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Chat with {providerName}</h3>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5 text-center text-gray-400 text-sm py-10">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                {booking?.id ? (
                  <Link
                    to={`/customer/bookings/${booking.id}`}
                    onClick={() => setShowChatModal(false)}
                    className="text-[#07535f] font-bold hover:underline"
                  >
                    Open full chat in Booking Details →
                  </Link>
                ) : (
                  <p>Chat is available in the Booking Details page.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
