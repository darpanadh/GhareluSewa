import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Calendar, Search, Filter, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  awaiting_payment: 'bg-amber-100 text-amber-700',
  accepted: 'bg-sky-100 text-sky-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function ManageBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAllBookings(statusFilter ? { status: statusFilter } : {});
      const data = Array.isArray(res.data) ? res.data : [];
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = bookings.filter(b => {
    const matchSearch = search === '' ||
      `${b.service_category} ${b.customer_name} ${b.provider_name || ''} ${b.location || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    in_progress: bookings.filter(b => b.status === 'in_progress' || b.status === 'accepted').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-[#07535f]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Platform Bookings</h1>
          <p className="text-sm text-gray-500">Monitor all service bookings across the platform.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: counts.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'In Progress', value: counts.in_progress, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: counts.completed, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Cancelled', value: counts.cancelled, color: 'text-red-500', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center cursor-pointer hover:shadow-sm transition-all`}
            onClick={() => setStatusFilter(s.label.toLowerCase().replace(' ', '_'))}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by service, customer, provider, or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#07535f] cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="awaiting_payment">Awaiting Payment</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {statusFilter && (
            <button onClick={() => setStatusFilter('')} className="text-xs text-gray-500 hover:text-gray-800 font-semibold underline">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-4">Booking ID</th>
                <th className="px-5 py-4">Service</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Provider</th>
                <th className="px-5 py-4">Date & Location</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="6" className="px-5 py-4">
                      <div className="h-8 bg-gray-100 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-gray-400 text-sm">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-xs text-gray-400 font-mono font-bold">#{b.id}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900 text-sm">{b.service_category}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 font-medium">{b.customer_name}</td>
                    <td className="px-5 py-4 text-sm text-gray-700 font-medium">
                      {b.provider_name || (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {b.booking_date ? format(new Date(b.booking_date), 'MMM d, yyyy • h:mm a') : '—'}
                      </div>
                      {b.location && (
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {b.location}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-700'}`}>
                        {b.status?.replaceAll('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 text-xs text-gray-400 font-semibold">
          Showing {filtered.length} of {bookings.length} bookings
        </div>
      </div>
    </div>
  );
}
