import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../../services/api';
import { Calendar, MapPin, ChevronRight, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  pending:     { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  confirmed:   { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle },
  in_progress: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: Clock },
  completed:   { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
  cancelled:   { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await bookingAPI.getUserBookings();
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (booking) => {
    const d = booking.scheduled_date || booking.booking_date;
    try { return d ? format(new Date(d), 'MMM d, yyyy h:mm a') : 'TBD'; } catch { return 'TBD'; }
  };

  const filteredBookings = bookings.filter(b => {
    const matchFilter = filter === 'all' || b.status === filter;
    const matchSearch = search === '' || 
      (b.customer_name || '').toLowerCase().includes(search.toLowerCase()) || 
      (b.service_category || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const tabs = [
    { id: 'all', label: 'All Bookings' },
    { id: 'pending', label: 'Pending' },
    { id: 'confirmed', label: 'Accepted' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Bookings</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage and track your service requests</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-gray-200 shadow-sm md:min-w-[280px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by customer or service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-sm font-medium"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              filter === tab.id 
                ? 'bg-[#07535f] text-white shadow-md' 
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800">No bookings found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {search || filter !== 'all' ? "Try adjusting your filters" : "When customers book your services, they will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map(booking => {
            const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;
            
            return (
              <Link key={booking.id} to={`/provider/bookings/${booking.id}`} className="block group">
                <div className="bg-white rounded-[1.25rem] border border-gray-100 p-5 sm:p-6 shadow-sm hover:shadow-xl hover:shadow-[#07535f]/5 hover:border-[#07535f]/30 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#07535f] opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-3">
                      {/* Top row: Status & Service */}
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${config.bg} ${config.text} ${config.border}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {booking.status?.replace('_', ' ')}
                        </span>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {booking.service_category || booking.service_type || 'General Service'}
                        </h3>
                      </div>
                      
                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#07535f]" />
                          {formatDate(booking)}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#07535f]" />
                          <span className="truncate max-w-[200px]">{booking.location || 'Location pending'}</span>
                        </div>
                        {booking.customer_name && (
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                            <span className="text-gray-400">Customer:</span>
                            <span className="font-bold text-gray-700">{booking.customer_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Area */}
                    <div className="flex items-center self-end sm:self-center">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#07535f]/10 transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#07535f] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
