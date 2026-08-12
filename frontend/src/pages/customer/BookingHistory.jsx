import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../../services/api';
import Card from '../../components/Card';
import {
  Calendar, Clock, MapPin, Star, Search, Filter,
  ChevronRight, ArrowRight, CheckCircle, XCircle,
  AlertCircle, Loader, RefreshCw, FileText, Navigation, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'bg-yellow-100 text-yellow-700',  icon: Clock,        dot: 'bg-yellow-400' },
  confirmed:  { label: 'Confirmed',  color: 'bg-blue-100 text-blue-700',      icon: CheckCircle,  dot: 'bg-blue-400' },
  in_progress:{ label: 'In Progress',color: 'bg-purple-100 text-purple-700',  icon: Loader,       dot: 'bg-purple-400' },
  completed:  { label: 'Completed',  color: 'bg-green-100 text-green-700',    icon: CheckCircle,  dot: 'bg-green-400' },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-700',        icon: XCircle,      dot: 'bg-red-400' },
};

const FILTERS = ['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingAPI.getUserBookings();
      const data = Array.isArray(res.data) ? res.data : [];
      setBookings(data);
    } catch (err) {
      setError('Could not load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = bookings.filter(b => {
    const matchFilter = filter === 'All' || b.status.replace('_', ' ').toLowerCase() === filter.toLowerCase();
    const matchSearch = !search ||
      (b.provider_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.service_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.location || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const stats = {
    total: bookings.length,
    completed: bookings.filter(b => b.status === 'completed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Booking History
        </h1>
        <p style={{ color: '#64748b' }}>All your service bookings in one place</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Completed', value: stats.completed, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Pending', value: stats.pending, color: '#ca8a04', bg: '#fefce8' },
          { label: 'Cancelled', value: stats.cancelled, color: '#dc2626', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by provider, service, location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem',
              paddingTop: '0.625rem', paddingBottom: '0.625rem',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '0.875rem', outline: 'none', background: 'white',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.375rem 0.875rem',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: filter === f ? '#6366f1' : '#e2e8f0',
                background: filter === f ? '#6366f1' : 'white',
                color: filter === f ? 'white' : '#64748b',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={fetchBookings}
          title="Refresh"
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <RefreshCw style={{ width: 16, height: 16, color: '#64748b' }} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
          <Loader style={{ width: 32, height: 32, margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          <p>Loading your bookings…</p>
        </div>
      ) : error ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <AlertCircle style={{ width: 40, height: 40, color: '#ef4444', margin: '0 auto 1rem' }} />
            <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
            <button onClick={fetchBookings} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.5rem', cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <FileText style={{ width: 48, height: 48, color: '#cbd5e1', margin: '0 auto 1rem' }} />
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              {bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filter'}
            </p>
            {bookings.length === 0 && (
              <Link to="/customer/browse" style={{ display: 'inline-block', marginTop: '1rem', background: '#6366f1', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
                Book a Service →
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(booking => {
            const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const dateStr = booking.scheduled_date
              ? format(new Date(booking.scheduled_date), 'dd MMM yyyy, h:mm a')
              : 'Date TBD';

            return (
              <div
                key={booking.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                {/* Status dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.dot.replace('bg-', ''), flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                      {booking.service_type || 'Service'}
                    </span>
                    <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: 600, ...parseStyle(cfg.color) }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {booking.provider_name && (
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        👤 {booking.provider_name}
                      </span>
                    )}
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar style={{ width: 12, height: 12 }} /> {dateStr}
                    </span>
                    {booking.location && (
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin style={{ width: 12, height: 12 }} /> {booking.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                {booking.total_amount && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>Rs {booking.total_amount}</div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                  {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                    <Link
                      to="/track"
                      state={{ booking }}
                      style={{ padding: '0.375rem 0.75rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Navigation style={{ width: 14, height: 14 }} /> Track Job
                    </Link>
                  )}
                  {booking.status === 'completed' && (
                    <>
                      <Link
                        to={`/customer/invoice/${booking.id}`}
                        style={{ padding: '0.375rem 0.75rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                      >
                        Pay / Invoice
                      </Link>
                      <Link
                        to={`/customer/bookings/${booking.id}`}
                        style={{ padding: '0.375rem 0.75rem', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Star style={{ width: 14, height: 14 }} /> Rate & Review
                      </Link>
                    </>
                  )}
                  <Link
                    to={`/customer/bookings/${booking.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      window.dispatchEvent(new CustomEvent('open_global_chat', { detail: { bookingId: booking.id } }));
                    }}
                    style={{ padding: '0.375rem 0.75rem', background: '#07535f', color: '#ffffff', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                  >
                    <MessageSquare style={{ width: 14, height: 14 }} /> Chat
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Parse tailwind-like color strings to inline styles
function parseStyle(colorStr) {
  const map = {
    'bg-yellow-100 text-yellow-700': { background: '#fef9c3', color: '#a16207' },
    'bg-blue-100 text-blue-700':     { background: '#dbeafe', color: '#1d4ed8' },
    'bg-purple-100 text-purple-700': { background: '#f3e8ff', color: '#7e22ce' },
    'bg-green-100 text-green-700':   { background: '#dcfce7', color: '#15803d' },
    'bg-red-100 text-red-700':       { background: '#fee2e2', color: '#b91c1c' },
  };
  return map[colorStr] || { background: '#f1f5f9', color: '#475569' };
}
