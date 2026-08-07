import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingAPI, providerAPI } from '../../services/api';
import InteractiveChart from '../../components/InteractiveChart';
import {
  Bell, Calendar, Clock, MapPin, Check, X,
  Phone, Eye, TrendingUp, AlertCircle, Star,
  ChevronRight, Activity, DollarSign, Shield
} from 'lucide-react';
import { format } from 'date-fns';

// ── Simple SVG line chart ──────────────────────────────────────────────────
function WeeklyEarningsChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const W = 300, H = 100, PAD = 16;
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (d.value / maxVal) * (H - PAD * 2);
    return { x, y };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
      {/* Gridlines */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={PAD} x2={W - PAD}
          y1={H - PAD - f * (H - PAD * 2)}
          y2={H - PAD - f * (H - PAD * 2)}
          stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
      ))}
      {/* Y-labels */}
      {[0, 1500, 3000, 6000].map((v, i) => (
        <text key={v} x={PAD - 2} y={H - PAD - (v / maxVal) * (H - PAD * 2) + 3}
          textAnchor="end" fontSize="7" fill="#9ca3af">{v > 0 ? v : ''}</text>
      ))}
      {/* Area fill */}
      <polygon
        points={`${pts[0].x},${H - PAD} ${polyline} ${pts[pts.length - 1].x},${H - PAD}`}
        fill="rgba(7,83,95,0.08)" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#07535f" strokeWidth="2" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#07535f" stroke="white" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ProviderDashboard() {
  const { user, refreshUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('week');
  const [earningsData, setEarningsData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    refreshUser();
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchEarningsChart();
  }, [chartPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await bookingAPI.getUserBookings();
      const list = Array.isArray(res.data) ? res.data : [];
      setBookings(list);
      if (user?.availability !== undefined) setAvailability(user.availability);
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEarningsChart = async () => {
    setChartLoading(true);
    try {
      const res = await providerAPI.getEarnings({ period: chartPeriod });
      setEarningsData(res.data || {});
    } catch (err) {
      console.warn('Could not load earnings chart', err);
    } finally {
      setChartLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      await providerAPI.toggleAvailability({ availability: !availability });
      setAvailability(prev => !prev);
    } catch (err) { console.error(err); }
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    setActionLoading(bookingId);
    try {
      await bookingAPI.updateBookingStatus(bookingId, { status: newStatus });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    } catch (err) { alert('Failed to update booking status'); }
    finally { setActionLoading(null); }
  };

  const newRequests = bookings.filter(b => b.status === 'pending');
  const activeJobs  = bookings.filter(b => b.status === 'accepted' || b.status === 'in_progress');
  const completedJobs = bookings.filter(b => b.status === 'completed');
  const hourlyRate  = parseFloat(user?.hourly_rate || 650);
  // Use real API earnings when available
  const totalEarnings = earningsData?.total ?? (completedJobs.length * hourlyRate);
  const totalMonthly = totalEarnings;
  const netPayout   = Math.round(totalMonthly * 0.93);
  const liveChartData = earningsData?.chartData || [];
  const PERIOD_LABELS = { week: 'This Week', month: 'This Month', year: 'This Year', all: 'All Time' };

  const todaySchedule = [...activeJobs, ...completedJobs].slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50/60">

      {/* ── KYC Banner ─────────────────────────────────────────────────── */}
      {!user?.is_verified && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-semibold">
            Account Pending KYC Verification — Your profile is under review. You'll be visible to customers once approved.
          </p>
        </div>
      )}

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="bg-[#07535f] px-4 sm:px-8 pt-6 pb-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shrink-0">
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (user?.name?.charAt(0) || 'P')}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white leading-tight">
                  Welcome back, {user?.name?.split(' ')[0] || 'Provider'}!
                </h1>
                <p className="text-white/65 text-[11px] mt-0.5">
                  {user?.service_category || 'Service Provider'}&nbsp;·&nbsp;{user?.ward || 'Baneshwor'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-white/60 text-[11px]">4.9 (142 reviews)</span>
                  <span className={`w-2 h-2 rounded-full ${availability ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                  <span className={`text-[11px] font-bold ${availability ? 'text-emerald-300' : 'text-gray-300'}`}>
                    {availability ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/provider/bookings"
                className="flex items-center gap-2 bg-white text-[#07535f] px-4 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-gray-50 transition-all"
              >
                <Calendar className="w-4 h-4" />
                My Schedule
              </Link>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[
              { label: "Today's Earnings", value: `Rs. ${totalMonthly.toLocaleString()}`, badge: completedJobs.length > 0 ? '+15%' : '0%' },
              { label: 'Completed Today',  value: `${completedJobs.length} Jobs`, badge: completedJobs.length > 0 ? 'On track' : 'No jobs' },
              { label: 'Active Now',        value: `${activeJobs.length} Jobs`,   badge: activeJobs.length > 0 ? 'Live' : 'Idle' },
              { label: 'Acceptance Rate',   value: bookings.length > 0 ? '100%' : '0%', badge: 'Active' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-2xl px-5 py-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-white/55 text-[9px] font-bold uppercase tracking-widest">{s.label}</span>
                  <span className="text-white/70 text-[9px] font-bold bg-white/10 px-1.5 py-0.5 rounded-full">{s.badge}</span>
                </div>
                <p className="text-white text-lg font-extrabold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main 3-column layout ──────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Col 1: New Requests + Today Schedule ── */}
          <div className="space-y-5">

            {/* New Requests */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  New Requests
                  {newRequests.length > 0 && (
                    <span className="bg-[#07535f] text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                      {newRequests.length}
                    </span>
                  )}
                </h2>
                <Link to="/provider/bookings" className="text-[11px] text-[#07535f] font-bold hover:underline flex items-center gap-0.5">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {newRequests.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-400">No pending requests right now.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {newRequests.slice(0, 4).map(req => (
                    <div key={req.id} className="p-4">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center text-sm font-bold text-teal-700 shrink-0">
                          {req.customer_name?.charAt(0) || 'C'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-2">
                            <p className="font-bold text-gray-900 text-sm truncate">{req.customer_name || 'Customer'}</p>
                            <span className="font-extrabold text-[#07535f] text-xs shrink-0">Rs. {hourlyRate}</span>
                          </div>
                          <p className="text-[11px] text-gray-400">{req.service_category || 'Home Service'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {req.booking_date ? format(new Date(req.booking_date), 'MMM d, h:mm a') : 'Today 11:00 AM'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {req.location || 'Baneshwor'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'accepted')}
                          disabled={actionLoading === req.id}
                          className="flex-1 bg-[#10b981] hover:bg-[#0ea572] disabled:opacity-60 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'cancelled')}
                          disabled={actionLoading === req.id}
                          className="flex-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Schedule */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-4">Today's Schedule</h2>
              {todaySchedule.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No schedule for today.</p>
              ) : (
                <div className="space-y-3">
                  {todaySchedule.map((job, i) => (
                    <div key={job.id} className="flex items-center gap-3 text-xs">
                      <span className="text-gray-400 w-16 shrink-0 text-[11px]">
                        {job.booking_date ? format(new Date(job.booking_date), 'h:mm a') : `${9 + i}:00 AM`}
                      </span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        job.status === 'in_progress' ? 'bg-red-500' :
                        job.status === 'completed'   ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}></span>
                      <span className={`font-semibold text-[11px] ${
                        job.status === 'in_progress' ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {job.service_category || 'Home Service'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Col 2: Active Jobs ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">Active Jobs</h2>
              {activeJobs.length > 0 && (
                <span className="bg-red-100 text-red-700 text-[9px] px-2.5 py-0.5 rounded-full font-bold">
                  {activeJobs.length} Live
                </span>
              )}
            </div>

            {activeJobs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-16 text-xs text-gray-400">
                No active jobs right now.
              </div>
            ) : (
              <div className="divide-y divide-gray-50 overflow-y-auto">
                {activeJobs.map(job => (
                  <div key={job.id} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">
                          {job.customer_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{job.customer_name || 'Customer'}</p>
                          <p className="text-[11px] text-gray-500">{job.service_category || 'Home Service'}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        job.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {job.status === 'in_progress' ? 'In Progress' : 'En Route'}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-500 space-y-1 mb-3">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {job.location || 'Maharajgunj'}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {job.booking_date ? format(new Date(job.booking_date), 'h:mm a') : '9:00 AM'} – 11:30 AM
                      </p>
                    </div>

                    <div className="flex justify-between items-center mb-1.5 text-xs">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-extrabold text-[#07535f]">Rs. {hourlyRate.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
                      <div
                        className="bg-[#07535f] h-1.5 rounded-full transition-all"
                        style={{ width: job.status === 'in_progress' ? '65%' : '30%' }}
                      ></div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex items-center gap-1 border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold transition-all">
                        <Phone className="w-3.5 h-3.5" /> Call
                      </button>
                      <Link
                        to={`/provider/bookings/${job.id}`}
                        className="flex items-center gap-1 border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </Link>
                      <button
                        onClick={() => handleUpdateStatus(job.id, job.status === 'accepted' ? 'in_progress' : 'completed')}
                        disabled={actionLoading === job.id}
                        className="flex-1 bg-[#07535f] hover:bg-[#06424b] disabled:opacity-60 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Col 3: Earnings & Payouts ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-3">Earnings & Payouts</h2>

            {/* Period Toggle */}
            <div className="flex gap-1 mb-3 bg-gray-100/70 p-1 rounded-xl w-fit">
              {['week', 'month', 'year'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setChartPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    chartPeriod === p
                      ? 'bg-white text-[#07535f] shadow-xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>

            {/* Dynamic Interactive Chart */}
            <div className={`transition-opacity duration-300 ${chartLoading ? 'opacity-50' : 'opacity-100'} mb-3`}>
              <InteractiveChart
                data={liveChartData}
                title=""
                subtitle={chartLoading ? 'Loading real data...' : `${PERIOD_LABELS[chartPeriod]} income from completed jobs`}
                valuePrefix="Rs. "
                metricKey="value"
                height={120}
                defaultChartType="bar"
                showControls={true}
                className="!p-0 !border-0 !shadow-none"
              />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {[
                { icon: <TrendingUp className="w-3.5 h-3.5 text-[#07535f]" />, val: `Rs. ${totalMonthly.toLocaleString()}`, label: PERIOD_LABELS[chartPeriod] },
                { icon: <Activity className="w-3.5 h-3.5 text-blue-500" />,     val: `${earningsData?.completed_bookings ?? completedJobs.length}`, label: 'Jobs Completed' },
                { icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,        val: `${earningsData?.active_bookings ?? activeJobs.length}`,              label: 'In Progress' },
                { icon: <Check className="w-3.5 h-3.5 text-emerald-500" />,      val: `Rs. ${earningsData?.avg?.toLocaleString() ?? 0}`,                        label: 'Avg. Per Job' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="mb-1">{s.icon}</div>
                  <p className="text-xs font-extrabold text-gray-900">{s.val}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Breakdown */}
            <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Gross Earnings</span>
                <span className="font-bold text-gray-800">Rs. {(totalMonthly * 4).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Platform Fee (6%)</span>
                <span className="font-bold text-red-500">– Rs. {Math.round((totalMonthly * 4) * 0.06).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (1%)</span>
                <span className="font-bold text-red-500">– Rs. {Math.round((totalMonthly * 4) * 0.01).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-extrabold text-gray-900 pt-2 border-t border-gray-100">
                <span>Net Payout</span>
                <span className="text-[#07535f]">Rs. {netPayout.toLocaleString()}</span>
              </div>
            </div>

            {/* Payout Methods */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-700 mb-2">Payout Methods</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-[9px] font-extrabold text-emerald-700">eS</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">eSewa</p>
                      <p className="text-[10px] text-gray-400">9841XXXXXX</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-[#07535f] text-white px-2 py-0.5 rounded-full">Primary</span>
                </div>
              </div>
            </div>

            <Link
              to="/provider/earnings"
              className="block w-full text-center bg-[#07535f] hover:bg-[#06424b] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Request Payout — Rs. {netPayout.toLocaleString()}
            </Link>

            {/* Badges */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-700 mb-3">Your Badges</p>
              <div className="flex gap-2 flex-wrap">
                {['Top Rated', 'Fast Response', '50+ Jobs'].map(b => (
                  <span key={b} className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
