import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingAPI, providerAPI } from '../../services/api';
import Card from '../../components/Card';
import { 
  AlertCircle, Star, DollarSign, Calendar, Clock, 
  MapPin, Check, X, ArrowRight, TrendingUp, 
  Search, User, Activity, Briefcase
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProviderDashboard() {
  const { user, refreshUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    refreshUser();
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await bookingAPI.getUserBookings();
      const list = Array.isArray(res.data) ? res.data : [];
      setBookings(list);
      
      if (user && user.availability !== undefined) {
        setAvailability(user.availability);
      }
    } catch (err) {
      console.error('Failed to load provider bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      const nextAvailability = !availability;
      await providerAPI.toggleAvailability({ availability: nextAvailability });
      setAvailability(nextAvailability);
    } catch (err) {
      console.error('Failed to toggle availability', err);
    }
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    setActionLoading(bookingId);
    try {
      await bookingAPI.updateBookingStatus(bookingId, { status: newStatus });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    } catch (err) {
      console.error(err);
      alert('Failed to update booking status');
    } finally {
      setActionLoading(null);
    }
  };

  const isVerified = user?.is_verified;

  // Filter bookings
  const newRequests = bookings.filter(b => b.status === 'pending');
  const activeJobs = bookings.filter(b => b.status === 'accepted' || b.status === 'in_progress');
  const completedJobs = bookings.filter(b => b.status === 'completed');

  const hourlyRate = parseFloat(user?.hourly_rate || 650);
  const totalEarnings = completedJobs.length * hourlyRate;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* KYC Pending Banner */}
        {!isVerified && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800 text-sm">Account Pending KYC Verification</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Your profile is currently under review by our team. Verification ensures your profile is visible to local customers.
              </p>
            </div>
          </div>
        )}

        {/* Header Summary Banner */}
        <div className="bg-[#07535f] text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white text-xl font-bold border border-white/20">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                user?.name?.charAt(0) || 'P'
              )}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Welcome back, {user?.name || 'Provider'} 👋</h1>
              <p className="text-xs text-white/80 mt-1 flex items-center gap-2">
                <span>{user?.service_category || 'Service Provider'}</span> • <span>{user?.ward || 'Pokhara'}</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center gap-1 text-xs font-bold text-yellow-300">
                  <Star className="w-3.5 h-3.5 fill-yellow-300" /> 4.9
                </span>
                <span className="text-[11px] text-white/60">• 142 reviews</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleToggleAvailability}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                availability ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-700 hover:bg-gray-800 text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${availability ? 'bg-white' : 'bg-gray-400'}`}></span>
              {availability ? 'Status: Online' : 'Status: Offline'}
            </button>
            <Link 
              to="/provider/profile"
              className="bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/20"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* 4 Essential Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">New Requests</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{newRequests.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Jobs</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{activeJobs.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{completedJobs.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#07535f]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Gross Income</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-0.5">Rs. {totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Actionable Sections Grid: Active Jobs & New Requests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Active Jobs Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#07535f]" />
                Active Jobs ({activeJobs.length})
              </h2>
              <Link to="/provider/bookings" className="text-xs font-bold text-[#07535f] hover:underline">
                View All →
              </Link>
            </div>

            {activeJobs.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                No active jobs currently in progress.
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map(job => (
                  <div key={job.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{job.service_category || 'Home Service'}</h3>
                        <p className="text-xs text-gray-500 font-medium">{job.customer_name || 'Customer'}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-100 text-teal-800">
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" /> {job.booking_date ? format(new Date(job.booking_date), 'PPP p') : 'Scheduled'}</p>
                      <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {job.location || 'Pokhara'}</p>
                    </div>

                    <div className="flex gap-2">
                      {job.status === 'accepted' ? (
                        <button
                          onClick={() => handleUpdateStatus(job.id, 'in_progress')}
                          disabled={actionLoading === job.id}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          Start Job
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(job.id, 'completed')}
                          disabled={actionLoading === job.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          Mark Completed
                        </button>
                      )}
                      <Link
                        to={`/provider/bookings/${job.id}`}
                        className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Service Requests */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                New Requests ({newRequests.length})
              </h2>
              <Link to="/provider/bookings" className="text-xs font-bold text-[#07535f] hover:underline">
                View All →
              </Link>
            </div>

            {newRequests.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                No pending requests right now.
              </div>
            ) : (
              <div className="space-y-3">
                {newRequests.map(req => (
                  <div key={req.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{req.service_category || 'Service Request'}</h3>
                        <p className="text-xs text-gray-500 font-medium">{req.customer_name}</p>
                      </div>
                      <span className="font-extrabold text-[#07535f] text-xs">Rs. {hourlyRate}/hr</span>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" /> {req.booking_date ? format(new Date(req.booking_date), 'PPP p') : 'Scheduled'}</p>
                      <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {req.location || 'Pokhara'}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'accepted')}
                        disabled={actionLoading === req.id}
                        className="flex-1 bg-[#10b981] hover:bg-[#0ea572] text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'cancelled')}
                        disabled={actionLoading === req.id}
                        className="flex-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Organized Sub-Topic Shortcut Hub */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Provider Sub-Topics & Quick Access</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Shortcut 1: Schedule */}
            <Link
              to="/provider/schedule"
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#07535f] flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base group-hover:text-[#07535f] transition-colors">
                  Work Schedule
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Manage today's appointments timeline and working availability.
                </p>
              </div>
              <div className="mt-4 text-xs font-bold text-[#07535f] flex items-center gap-1">
                Open Schedule <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Shortcut 2: Earnings */}
            <Link
              to="/provider/earnings"
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-600 transition-colors">
                  Earnings & Payouts
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Track revenue, platform commissions, and request instant payouts.
                </p>
              </div>
              <div className="mt-4 text-xs font-bold text-emerald-600 flex items-center gap-1">
                View Earnings <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Shortcut 3: Profile */}
            <Link
              to="/provider/profile"
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base group-hover:text-purple-600 transition-colors">
                  Provider Profile
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Update hourly rate, skills, service area, and check KYC status.
                </p>
              </div>
              <div className="mt-4 text-xs font-bold text-purple-600 flex items-center gap-1">
                Manage Profile <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}
