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
function MiniBar({ data, color = 'bg-[#07535f]', labelKey = 'label', valueKey = 'value' }) {
  if (!data || data.length === 0) return <div className="text-gray-400 text-center py-8">No data available</div>;
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0)) || 1;

  return (
    <div className="flex items-end gap-2 h-32 px-1">
      {data.map((d, i) => {
        const h = Math.max(4, Math.round(((Number(d[valueKey]) || 0) / max) * 100));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            <span className="text-[11px] text-gray-500 font-bold group-hover:text-gray-700 transition-colors">{d[valueKey] || 0}</span>
            <div
              title={`${d[labelKey]}: ${d[valueKey]}`}
              className={`w-full ${color} rounded-t-md opacity-85 group-hover:opacity-100 transition-all duration-500 cursor-pointer shadow-sm`}
              style={{ height: `${h}%` }}
            />
            <span className="text-[10px] text-gray-400 text-center max-w-full overflow-hidden whitespace-nowrap text-ellipsis group-hover:text-gray-600">
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

  const kpis = [
    {
      label: 'Total Users',
      value: stats?.total_users || stats?.users || 0,
      icon: Users,
      gradient: 'from-blue-600 to-indigo-600',
      sub: `${stats?.total_customers || stats?.customers || 0} customers · ${stats?.total_providers || stats?.providers || 0} providers`,
    },
    {
      label: 'Total Bookings',
      value: stats?.total_bookings || stats?.bookings || 0,
      icon: Calendar,
      gradient: 'from-[#07535f] to-[#0a7a8a]',
      sub: `${stats?.active_bookings || stats?.pending_bookings || 0} active`,
    },
    {
      label: 'Platform Revenue',
      value: `Rs ${totalCommission.toLocaleString()}`,
      icon: DollarSign,
      gradient: 'from-[#10b981] to-emerald-600',
      sub: `From Rs ${totalRevenue.toLocaleString()} total payments`,
    },
    {
      label: 'Pending KYC',
      value: stats?.pending_providers || stats?.pending_verifications || 0,
      icon: Shield,
      gradient: 'from-amber-500 to-orange-500',
      sub: 'Providers awaiting review',
    },
    {
      label: 'Avg Rating',
      value: stats?.avg_platform_rating ? Number(stats.avg_platform_rating).toFixed(1) : '—',
      icon: Star,
      gradient: 'from-yellow-400 to-amber-500',
      sub: `Platform-wide`,
    },
    {
      label: 'Completed Jobs',
      value: stats?.completed_bookings || stats?.completed || 0,
      icon: Activity,
      gradient: 'from-pink-500 to-rose-500',
      sub: 'All time',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader className="w-8 h-8 mb-4 animate-spin text-[#07535f]" />
        <p className="font-medium text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-[#07535f]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Platform Analytics</h1>
            <p className="text-sm text-gray-500">Monitor performance, revenue, and activity</p>
          </div>
        </div>
        
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          {['week', 'month', 'year', 'all'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                period === p 
                  ? 'bg-[#07535f] text-white shadow-md' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {p === 'all' ? 'All Time' : p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`bg-gradient-to-br ${kpi.gradient} rounded-2xl p-5 text-white relative overflow-hidden shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 group`}>
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                <Icon className="w-24 h-24" />
              </div>
              <div className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center mb-4 backdrop-blur-sm">
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mb-1 tracking-tight">{kpi.value}</div>
              <div className="text-sm font-bold opacity-95 mb-0.5">{kpi.label}</div>
              <div className="text-[11px] opacity-75 font-medium">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bookings by Category */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#07535f]" />
            Bookings by Category
          </h3>
          {bookingsByCategory.length > 0 ? (
            <MiniBar data={bookingsByCategory} color="bg-[#07535f]" />
          ) : (
            <div className="text-center py-10 text-gray-400">
              <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No booking data yet</p>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#10b981]" />
            Revenue Summary
          </h3>
          <div className="space-y-5">
            {[
              { label: 'Total Payments Collected', value: `Rs ${totalRevenue.toLocaleString()}`, color: 'bg-gray-800', bar: 100, textCol: 'text-gray-800' },
              { label: 'Platform Commission (10%)', value: `Rs ${totalCommission.toLocaleString()}`, color: 'bg-[#07535f]', bar: 10, textCol: 'text-[#07535f]' },
              { label: 'Paid to Providers (90%)', value: `Rs ${Math.round(totalRevenue * 0.9).toLocaleString()}`, color: 'bg-[#10b981]', bar: 90, textCol: 'text-[#10b981]' },
            ].map(row => (
              <div key={row.label} className="group">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-500">{row.label}</span>
                  <span className={`text-sm font-bold ${row.textCol}`}>{row.value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full group-hover:brightness-110 transition-all`} style={{ width: `${row.bar}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-bold text-gray-800">Recent Transactions</h2>
          <span className="text-xs font-bold text-[#07535f] bg-[#07535f]/10 px-3 py-1 rounded-full">Last {payments.length}</span>
        </div>
        
        {payments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">No payments recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  {['Booking ID', 'Customer', 'Provider', 'Amount', 'Commission', 'Date', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p, i) => {
                  const amt = Number(p.amount) || 0;
                  const comm = Math.round(amt * 0.1);
                  const dateStr = p.paid_at ? format(new Date(p.paid_at), 'MMM d, yyyy') : p.created_at ? format(new Date(p.created_at), 'MMM d, yyyy') : '—';
                  return (
                    <tr key={p.id || i} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-[#07535f]">#{p.booking_id || p.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{p.customer_name || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{p.provider_name || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-extrabold text-gray-900">Rs {amt.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-[#10b981]">Rs {comm.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">{dateStr}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'completed' 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {p.status === 'completed' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/admin/providers" className="block">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:border-[#07535f]/30 hover:shadow-md transition-all group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#07535f]/10 flex items-center justify-center text-[#07535f] group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 group-hover:text-[#07535f] transition-colors">Manage Providers</h3>
                <p className="text-xs text-gray-500 mt-0.5">Approve KYC & manage accounts</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#07535f] group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Platform Health</h3>
              <p className="text-xs text-green-600 font-semibold mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> All systems operational
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
