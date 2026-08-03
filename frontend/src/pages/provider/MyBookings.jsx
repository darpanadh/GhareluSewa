import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/Card';
import { bookingAPI } from '../../services/api';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending:     { bg: '#fef9c3', text: '#92400e' },
  confirmed:   { bg: '#dbeafe', text: '#1d4ed8' },
  in_progress: { bg: '#f3e8ff', text: '#7e22ce' },
  completed:   { bg: '#dcfce7', text: '#15803d' },
  cancelled:   { bg: '#fee2e2', text: '#b91c1c' },
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="page-container">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Bookings</h1>
      
      {loading ? (
        <Card><div className="p-8 text-center text-gray-500">Loading bookings...</div></Card>
      ) : bookings.length === 0 ? (
        <Card><div className="p-12 text-center text-gray-500">No bookings yet.</div></Card>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => {
            const sc = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;
            return (
              <Link key={booking.id} to={`/provider/bookings/${booking.id}`} className="block">
                <Card className="hover:border-[#07535f] transition-colors p-5 cursor-pointer flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span style={{ background: sc.bg, color: sc.text, padding: '3px 12px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 700 }}>
                        {booking.status?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="font-bold text-gray-800">{booking.service_category || booking.service_type || 'Service'}</span>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-4">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {formatDate(booking)}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {booking.location || '—'}</span>
                    </div>
                    {booking.customer_name && (
                      <div className="text-sm text-gray-400 mt-1">Customer: {booking.customer_name}</div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
