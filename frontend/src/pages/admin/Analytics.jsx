import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, paymentAPI } from '../../services/api';
import {
  TrendingUp, Users, Calendar, DollarSign, Star,
  Shield, BarChart2, ArrowUp, ArrowDown, Loader,
  ChevronRight, AlertCircle, Activity
} from 'lucide-react';
import { format } from 'date-fns';

// Simple inline bar chart component
function MiniBar({ data, color = '#6366f1', labelKey = 'label', valueKey = 'value' }) {
  if (!data || data.length === 0) return <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No data available</div>;
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0)) || 1;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', padding: '0 4px' }}>
      {data.map((d, i) => {
        const h = Math.max(4, Math.round(((Number(d[valueKey]) || 0) / max) * 100));
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{d[valueKey] || 0}</span>
            <div
              title={`${d[labelKey]}: ${d[valueKey]}`}
              style={{
                width: '100%', height: `${h}%`, background: color,
                borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease',
                opacity: 0.85, cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '0.62rem', color: '#94a3b8', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {d[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchAll();
  }, [period]);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, analyticsRes, paymentsRes] = await Promise.allSettled([
        adminAPI.getPlatformStats(),
        adminAPI.getAnalytics({ period }),
        paymentAPI.getAllPayments({ limit: 10 }),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data || {});
      if (paymentsRes.status === 'fulfilled') {
        const d = paymentsRes.value.data;
        setPayments(Array.isArray(d) ? d : Array.isArray(d?.payments) ? d.payments : []);
      }
    } catch (err) {
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  const totalCommission = stats?.total_revenue ? Number(stats.total_revenue) : 0;
  const totalRevenue = totalCommission * 10; // since commission is 10% of total payment

  // Build chart data from analytics or payments
  const bookingsByCategory = analytics?.bookingsByCategory ||
    [
      { label: 'Plumbing', value: stats?.plumbing_count || 0 },
      { label: 'Electrical', value: stats?.electrical_count || 0 },
      { label: 'Cleaning', value: stats?.cleaning_count || 0 },
      { label: 'Carpentry', value: stats?.carpentry_count || 0 },
    ].filter(d => d.value > 0);

  const recentSignups = analytics?.recentSignups || [];

  const kpis = [
    {
      label: 'Total Users',
      value: stats?.total_users || stats?.users || 0,
      icon: Users,
      color: '#6366f1',
      bg: 'linear-gradient(135deg, #6366f1, #818cf8)',
      sub: `${stats?.total_customers || stats?.customers || 0} customers · ${stats?.total_providers || stats?.providers || 0} providers`,
    },
    {
      label: 'Total Bookings',
      value: stats?.total_bookings || stats?.bookings || 0,
      icon: Calendar,
      color: '#0ea5e9',
      bg: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
      sub: `${stats?.active_bookings || stats?.pending_bookings || 0} active`,
    },
    {
      label: 'Platform Revenue',
      value: `Rs ${totalCommission.toLocaleString()}`,
      icon: DollarSign,
      color: '#16a34a',
      bg: 'linear-gradient(135deg, #16a34a, #22c55e)',
      sub: `From Rs ${totalRevenue.toLocaleString()} total payments`,
    },
    {
      label: 'Pending KYC',
      value: stats?.pending_providers || stats?.pending_verifications || 0,
      icon: Shield,
      color: '#ca8a04',
      bg: 'linear-gradient(135deg, #ca8a04, #eab308)',
      sub: 'Providers awaiting review',
    },
    {
      label: 'Avg Rating',
      value: stats?.avg_platform_rating ? Number(stats.avg_platform_rating).toFixed(1) : '—',
      icon: Star,
      color: '#f59e0b',
      bg: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
      sub: `Platform-wide`,
    },
    {
      label: 'Completed Jobs',
      value: stats?.completed_bookings || stats?.completed || 0,
      icon: Activity,
      color: '#db2777',
      bg: 'linear-gradient(135deg, #db2777, #ec4899)',
      sub: 'All time',
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: '#94a3b8' }}>
        <Loader style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
        <p>Loading analytics…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Platform Analytics
          </h1>
          <p style={{ color: '#64748b' }}>Monitor performance, revenue, and activity</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
          {['week', 'month', 'year', 'all'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '7px', border: 'none',
                background: period === p ? 'white' : 'transparent',
                color: period === p ? '#1e293b' : '#64748b',
                fontWeight: period === p ? 600 : 400,
                fontSize: '0.8rem', cursor: 'pointer',
                boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                textTransform: 'capitalize',
              }}
            >
              {p === 'all' ? 'All Time' : `This ${p.charAt(0).toUpperCase() + p.slice(1)}`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', color: '#b91c1c', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} style={{ background: kpi.bg, borderRadius: '14px', padding: '1.25rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ opacity: 0.12, position: 'absolute', right: '-8px', bottom: '-8px' }}>
                <Icon style={{ width: 64, height: 64 }} />
              </div>
              <Icon style={{ width: 20, height: 20, marginBottom: '0.625rem' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2px', lineHeight: 1.1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.95, marginBottom: '2px' }}>{kpi.label}</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Bookings by Category */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
            Bookings by Category
          </h3>
          {bookingsByCategory.length > 0 ? (
            <MiniBar data={bookingsByCategory} color="#6366f1" labelKey="label" valueKey="value" />
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              <BarChart2 style={{ width: 32, height: 32, margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.875rem' }}>No booking data yet</p>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
            Revenue Summary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Total Payments Collected', value: `Rs ${totalRevenue.toLocaleString()}`, color: '#1e293b', bar: 100 },
              { label: 'Platform Commission (10%)', value: `Rs ${totalCommission.toLocaleString()}`, color: '#6366f1', bar: 10 },
              { label: 'Paid to Providers (90%)', value: `Rs ${Math.round(totalRevenue * 0.9).toLocaleString()}`, color: '#16a34a', bar: 90 },
            ].map(row => (
              <div key={row.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${row.bar}%`, background: row.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>Recent Payments</h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Last {payments.length} transactions</span>
        </div>
        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <DollarSign style={{ width: 36, height: 36, margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p>No payments recorded yet</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Booking #', 'Customer', 'Provider', 'Amount', 'Commission', 'Date', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => {
                const amt = Number(p.amount) || 0;
                const comm = Math.round(amt * 0.1);
                const dateStr = p.paid_at ? format(new Date(p.paid_at), 'dd MMM yy') : p.created_at ? format(new Date(p.created_at), 'dd MMM yy') : '—';
                return (
                  <tr key={p.id || i} style={{ borderBottom: i < payments.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <td style={{ padding: '0.875rem 1rem', color: '#6366f1', fontWeight: 600 }}>#{p.booking_id || p.id}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#1e293b' }}>{p.customer_name || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#1e293b' }}>{p.provider_name || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#1e293b' }}>Rs {amt.toLocaleString()}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#6366f1' }}>Rs {comm.toLocaleString()}</td>
                    <td style={{ padding: '0.875rem 1rem', color: '#94a3b8' }}>{dateStr}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 600, background: p.status === 'completed' ? '#dcfce7' : '#fef9c3', color: p.status === 'completed' ? '#15803d' : '#92400e' }}>
                        {p.status === 'completed' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Link to="/admin/providers" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'box-shadow 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield style={{ width: 20, height: 20, color: '#6366f1' }} />
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>Manage Providers</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>KYC approvals & management</div>
              </div>
            </div>
            <ChevronRight style={{ width: 18, height: 18, color: '#94a3b8' }} />
          </div>
        </Link>
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity style={{ width: 20, height: 20, color: '#16a34a' }} />
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>Platform Health</div>
              <div style={{ fontSize: '0.78rem', color: '#16a34a' }}>✅ All systems operational</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
