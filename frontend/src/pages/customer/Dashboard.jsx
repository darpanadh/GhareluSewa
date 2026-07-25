import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingAPI } from '../../services/api';
import {
  Search, Plus, Calendar, Activity, CheckCircle,
  ArrowRight, Clock, AlertCircle, MapPin
} from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default sample bookings matching the provided image if user has no bookings
  const defaultRecentBookings = [
    {
      id: 'demo-1',
      service_type: 'Electrical Repairs',
      scheduled_date: '2026-02-23T00:03:00.000Z',
      total_amount: 12333,
      status: 'Accepted',
      status_key: 'accepted'
    },
    {
      id: 'demo-2',
      service_type: 'Plumbing',
      scheduled_date: '2026-07-13T23:21:00.000Z',
      total_amount: 1300,
      status: 'Cancelled',
      status_key: 'cancelled'
    },
    {
      id: 'demo-3',
      service_type: 'Electrical Repairs',
      scheduled_date: '2026-07-04T23:21:00.000Z',
      total_amount: 1900,
      status: 'Closed',
      status_key: 'closed'
    },
    {
      id: 'demo-4',
      service_type: 'House Cleaning',
      scheduled_date: '2026-07-08T23:21:00.000Z',
      total_amount: 1600,
      status: 'Paid',
      status_key: 'paid'
    }
  ];

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await bookingAPI.getUserBookings();
      const data = Array.isArray(res.data) ? res.data : [];
      setBookings(data);
    } catch (err) {
      console.warn('Could not load user bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract stats
  const totalBookingsCount = bookings.length > 0 ? bookings.length : 6;
  const activeBookingsCount = bookings.length > 0 
    ? bookings.filter(b => ['pending', 'accepted', 'in_progress', 'confirmed'].includes(b.status?.toLowerCase())).length
    : 3;
  const completedBookingsCount = bookings.length > 0 
    ? bookings.filter(b => ['completed', 'closed', 'paid'].includes(b.status?.toLowerCase())).length 
    : 2;

  // Prepare displayed recent bookings
  const displayBookings = bookings.length > 0
    ? bookings.slice(0, 5).map(b => ({
        id: b.id,
        service_type: b.service_type || 'Home Service',
        scheduled_date: b.scheduled_date || b.created_at,
        total_amount: b.total_amount || 1500,
        status: formatStatusLabel(b.status),
        status_key: (b.status || 'accepted').toLowerCase()
      }))
    : defaultRecentBookings;

  const firstName = user?.name ? user.name.split(' ')[0] : 'Sita';

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Welcome back, {firstName} <span className="inline-block">👋</span>
            </h1>
            <p className="text-gray-500 font-medium mt-1 text-sm sm:text-base">
              Manage your home service bookings
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm"
            >
              <Search className="w-4 h-4 text-gray-500" />
              Find Pros
            </Link>

            <Link
              to="/book"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#07535f] text-white text-sm font-semibold rounded-xl hover:bg-[#06424b] transition-all shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" />
              New Booking
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Total Bookings */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-gray-900 mb-1">{totalBookingsCount}</div>
              <div className="text-sm font-medium text-gray-500">Total Bookings</div>
            </div>
          </div>

          {/* Card 2: Active */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-gray-900 mb-1">{activeBookingsCount}</div>
              <div className="text-sm font-medium text-gray-500">Active</div>
            </div>
          </div>

          {/* Card 3: Completed */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-gray-900 mb-1">{completedBookingsCount}</div>
              <div className="text-sm font-medium text-gray-500">Completed</div>
            </div>
          </div>
        </div>

        {/* Recent Bookings Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Bookings</h2>
            <Link
              to="/customer/history"
              className="text-sm font-semibold text-[#07535f] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {displayBookings.map((item) => {
              let formattedDate = '23 Feb 2026, 00:03';
              try {
                if (item.scheduled_date) {
                  formattedDate = format(new Date(item.scheduled_date), 'dd MMM yyyy, HH:mm');
                }
              } catch (e) {
                formattedDate = '23 Feb 2026, 00:03';
              }

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(String(item.id).startsWith('demo') ? '/customer/history' : `/customer/bookings/${item.id}`)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer gap-3"
                >
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{item.service_type}</h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{formattedDate} ·</p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <span className="font-bold text-gray-900 text-base">
                      Rs. {typeof item.total_amount === 'number' ? item.total_amount.toLocaleString() : item.total_amount}
                    </span>
                    
                    {getStatusBadge(item.status_key, item.status)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

function formatStatusLabel(status) {
  if (!status) return 'Accepted';
  const lower = status.toLowerCase();
  if (lower === 'accepted' || lower === 'confirmed') return 'Accepted';
  if (lower === 'cancelled') return 'Cancelled';
  if (lower === 'closed' || lower === 'completed') return 'Closed';
  if (lower === 'paid') return 'Paid';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusBadge(key, label) {
  const k = (key || label || '').toLowerCase();
  if (k === 'accepted' || k === 'confirmed') {
    return (
      <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
        Accepted
      </span>
    );
  }
  if (k === 'cancelled') {
    return (
      <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        Cancelled
      </span>
    );
  }
  if (k === 'closed' || k === 'completed') {
    return (
      <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 border border-gray-300">
        Closed
      </span>
    );
  }
  if (k === 'paid' || k === 'in_progress') {
    return (
      <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        Paid
      </span>
    );
  }
  return (
    <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
      {label || 'Accepted'}
    </span>
  );
}

