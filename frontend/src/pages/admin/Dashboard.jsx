import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  Users, Calendar, Shield, ShieldCheck, CreditCard,
  RefreshCw, Check, X, AlertCircle, ArrowUpRight,
  ArrowDownRight, Download, LayoutGrid
} from 'lucide-react';

// ── Bar Chart (SVG) ──────────────────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 500, H = 180, PAD = { t: 10, b: 30, l: 40, r: 10 };
  const bW = (W - PAD.l - PAD.r) / data.length * 0.6;
  const gap = (W - PAD.l - PAD.r) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
      {/* Gridlines */}
      {[0.25, 0.5, 0.75, 1].map(f => {
        const y = PAD.t + (1 - f) * (H - PAD.t - PAD.b);
        return (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
            <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">
              {Math.round(max * f / 1000)}k
            </text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const bH = (d.value / max) * (H - PAD.t - PAD.b);
        const x = PAD.l + i * gap + (gap - bW) / 2;
        const y = H - PAD.b - bH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bW} height={bH} rx="4" fill="#7c3aed" opacity="0.85" />
            <text x={x + bW / 2} y={H - PAD.b + 14} textAnchor="middle" fontSize="8" fill="#6b7280">
              {d.day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut Chart (SVG) ────────────────────────────────────────────────────
function DonutChart({ data }) {
  const r = 60, cx = 90, cy = 80, strokeW = 22;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let offset = 0;

  return (
    <svg viewBox="0 0 180 160" className="w-full h-44">
      {data.map((d, i) => {
        const dash = (d.value / total) * circumference;
        const seg = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash - 2} ${circumference - dash + 2}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += dash;
        return seg;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1f2937">
        {total}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fill="#9ca3af">Services</text>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionMessage, setActionMessage] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.allSettled([
      adminAPI.getPlatformStats(),
      adminAPI.getAllBookings({ limit: 8 }),
      adminAPI.getPendingProviders({ limit: 10 }),
    ]).then(([sR, bR, pR]) => {
      if (sR.status === 'fulfilled') setStats(sR.value.data || {});
      if (bR.status === 'fulfilled') { const d = bR.value.data; setRecentBookings(Array.isArray(d) ? d : []); }
      if (pR.status === 'fulfilled') { const d = pR.value.data; setPendingProviders(Array.isArray(d) ? d : []); }
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const flash = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleApprove = async (id, name) => {
    try {
      await adminAPI.verifyProvider(id);
      setPendingProviders(prev => prev.filter(p => p.id !== id));
      flash('success', `Verified KYC for ${name} successfully!`);
    } catch { flash('error', `Failed to verify ${name}.`); }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Reject ${name}?`)) return;
    try {
      await adminAPI.rejectProvider(id);
      setPendingProviders(prev => prev.filter(p => p.id !== id));
      flash('info', `Rejected application for ${name}.`);
    } catch { flash('error', `Failed to reject ${name}.`); }
  };

  const revenueData = [
    { day: 'Mon', value: 3800 }, { day: 'Tue', value: 3100 },
    { day: 'Wed', value: 5000 }, { day: 'Thu', value: 2700 },
    { day: 'Fri', value: 6500 }, { day: 'Sat', value: 7800 },
    { day: 'Sun', value: 5500 },
  ];

  const serviceData = [
    { name: 'Cleaning',   value: 35, color: '#7c3aed' },
    { name: 'Plumbing',   value: 25, color: '#f59e0b' },
    { name: 'Electrical', value: 22, color: '#10b981' },
    { name: 'Carpentry',  value: 18, color: '#ef4444' },
  ];

  const tabs = ['overview', 'users', 'providers', 'bookings', 'services', 'payments'];

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: `Rs. ${Number(stats?.total_revenue || 0).toLocaleString()}`,
      trend: '+20.1% from last month',
      up: true,
      icon: <CreditCard className="w-5 h-5" />,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Active Users',
      value: `+${Number(stats?.total_users ?? stats?.total_customers ?? 0).toLocaleString()}`,
      trend: '+180.1% from last month',
      up: true,
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Service Providers',
      value: Number(stats?.verified_providers ?? stats?.total_providers ?? 0).toLocaleString(),
      trend: '-4% from last month',
      up: false,
      icon: <ShieldCheck className="w-5 h-5" />,
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Active Bookings',
      value: `+${Number(stats?.total_bookings ?? stats?.active_bookings ?? 0).toLocaleString()}`,
      trend: '+201 since last hour',
      up: true,
      icon: <Calendar className="w-5 h-5" />,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Admin Control Center</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage users, providers, and overall platform operations.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadData}
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
            <button className="flex items-center gap-2 bg-[#07535f] hover:bg-[#06424b] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* ── Action Alert ──────────────────────────────────────────────── */}
        {actionMessage && (
          <div className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between ${
            actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            actionMessage.type === 'error'   ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-gray-100 text-gray-800 border border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4" />}
              {actionMessage.text}
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((c, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{c.label}</p>
                  <h3 className="text-2xl font-extrabold text-gray-900">{loading ? '—' : c.value}</h3>
                  <p className={`text-[11px] font-bold mt-1.5 flex items-center gap-0.5 ${c.up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {c.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {c.trend}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${c.iconBg}`}>
                  {c.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab Navigation ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold capitalize whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-[#07535f] text-[#07535f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview'  && <LayoutGrid className="w-4 h-4" />}
              {tab === 'users'     && <Users className="w-4 h-4" />}
              {tab === 'providers' && <Shield className="w-4 h-4" />}
              {tab === 'bookings'  && <Calendar className="w-4 h-4" />}
              {tab === 'payments'  && <CreditCard className="w-4 h-4" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ──────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Charts row */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-base mb-1">Revenue & Bookings Growth</h3>
              <p className="text-xs text-blue-500 font-medium mb-4">Visualizing platform activity over the last 7 days.</p>
              <BarChart data={revenueData} />
            </div>

            {/* Pending KYC */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#07535f]" />
                    KYC Provider Verifications
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Review new service provider applications.</p>
                </div>
                <span className="text-xs font-bold bg-[#07535f]/10 text-[#07535f] px-3 py-1 rounded-full w-fit">
                  {pendingProviders.length} Pending
                </span>
              </div>

              {pendingProviders.length === 0 ? (
                <div className="py-10 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-gray-700 text-sm">All Clear! No pending KYC requests.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingProviders.map(p => (
                    <div key={p.id} className="border border-gray-200 hover:border-[#07535f]/40 rounded-2xl p-4 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center font-bold text-teal-700">
                            {p.name?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                            <p className="text-[11px] text-gray-400">{p.email}</p>
                          </div>
                        </div>
                        <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                          Pending
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 bg-gray-50 rounded-xl p-2.5 space-y-1 mb-3">
                        <p><span className="font-semibold text-gray-700">Category:</span> {p.service_category || 'General'}</p>
                        <p><span className="font-semibold text-gray-700">Location:</span> {p.ward || 'Kathmandu'}</p>
                        <p><span className="font-semibold text-gray-700">KYC:</span> <span className="text-emerald-600 font-bold">Uploaded ✓</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(p.id, p.name)}
                          className="flex-1 bg-[#07535f] hover:bg-[#06424b] text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(p.id, p.name)}
                          className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#07535f]" />
                    Recent Platform Bookings
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Latest bookings across the marketplace.</p>
                </div>
                <button onClick={() => setActiveTab('bookings')} className="text-xs font-bold text-[#07535f] hover:underline">View All →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-3 px-2">Booking ID</th>
                      <th className="pb-3 px-2">Service</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 px-2">Provider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentBookings.length > 0 ? recentBookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-2 font-mono text-xs text-gray-500 font-bold">BK-{b.id}</td>
                        <td className="py-3.5 px-2 font-semibold text-gray-800 text-sm">{b.service_category || 'Home Service'}</td>
                        <td className="py-3.5 px-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            b.status === 'completed'  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
                            b.status === 'cancelled'  ? 'text-red-700 bg-red-50 border border-red-200' :
                            b.status === 'in_progress'? 'text-blue-700 bg-blue-50 border border-blue-200' :
                            'text-amber-700 bg-amber-50 border border-amber-200'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 font-medium text-gray-700 text-sm">{b.provider_name || '—'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="py-10 text-center text-gray-400 text-xs">No recent bookings recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Providers Tab ─────────────────────────────────────────────── */}
        {activeTab === 'providers' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#07535f]" /> KYC Verification Queue
              </h2>
              <span className="text-xs font-bold bg-[#07535f]/10 text-[#07535f] px-3 py-1 rounded-full">
                {pendingProviders.length} Pending
              </span>
            </div>
            {pendingProviders.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Check className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-gray-700">All KYC verifications cleared!</p>
                <p className="text-xs text-gray-400 mt-1">No pending provider applications.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingProviders.map(p => (
                  <div key={p.id} className="border border-gray-200 rounded-2xl p-4 hover:border-[#07535f]/40 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center font-bold text-teal-700 text-lg">
                          {p.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                          <p className="text-[11px] text-gray-400">{p.email}</p>
                        </div>
                      </div>
                      <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        Pending
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 bg-gray-50 rounded-xl p-2.5 space-y-1 mb-3">
                      <p><span className="font-semibold text-gray-700">Category:</span> {p.service_category || 'General'}</p>
                      <p><span className="font-semibold text-gray-700">Location:</span> {p.ward || 'Kathmandu'}</p>
                      <p><span className="font-semibold text-gray-700">KYC Docs:</span> <span className="text-emerald-600 font-bold">Uploaded ✓</span></p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(p.id, p.name)} className="flex-1 bg-[#07535f] hover:bg-[#06424b] text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleReject(p.id, p.name)} className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Bookings Tab ──────────────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
              <Calendar className="w-4 h-4 text-[#07535f]" /> All Platform Bookings
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-3 px-3">ID</th>
                    <th className="pb-3 px-3">Service</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentBookings.length > 0 ? recentBookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-3 font-mono text-xs text-gray-500 font-bold">BK-{b.id}</td>
                      <td className="py-3.5 px-3 font-semibold text-gray-800">{b.service_category || 'Home Service'}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          b.status === 'completed'   ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
                          b.status === 'cancelled'   ? 'text-red-700 bg-red-50 border border-red-200' :
                          b.status === 'in_progress' ? 'text-blue-700 bg-blue-50 border border-blue-200' :
                          'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}>{b.status}</span>
                      </td>
                      <td className="py-3.5 px-3 text-gray-700">{b.provider_name || '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="py-10 text-center text-gray-400 text-xs">No bookings found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Users Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center py-16">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-500">User Management</p>
            <p className="text-xs text-gray-400 mt-1">Navigate to <Link to="/admin/users" className="text-[#07535f] font-bold underline">Manage Users</Link> for full user administration.</p>
          </div>
        )}

        {/* ── Payments Tab ──────────────────────────────────────────────── */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center py-16">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-500">Payments & Revenue</p>
            <p className="text-xs text-gray-400 mt-1">View full payment data in the <Link to="/admin/analytics" className="text-[#07535f] font-bold underline">Analytics</Link> section.</p>
          </div>
        )}

        {/* ── Services Tab ──────────────────────────────────────────────── */}
        {(activeTab === 'services') && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 text-base mb-5 pb-4 border-b border-gray-100">Services Distribution</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {serviceData.map(s => (
                <div key={s.name} className="bg-gray-50 rounded-2xl p-4 text-center">
                  <div className="w-10 h-10 rounded-full mx-auto mb-2" style={{ background: s.color + '22', border: `2px solid ${s.color}` }}></div>
                  <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                  <p className="text-2xl font-extrabold mt-1" style={{ color: s.color }}>{s.value}%</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">of bookings</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
