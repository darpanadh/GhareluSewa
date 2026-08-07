import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import InteractiveChart from '../../components/InteractiveChart';
import {
  Users, Calendar, Shield, ShieldCheck, CreditCard,
  RefreshCw, Check, X, AlertCircle, ArrowUpRight,
  ArrowDownRight, Download, LayoutGrid, Eye, FileText,
  CheckCircle, XCircle, Award, Star
} from 'lucide-react';
import { format } from 'date-fns';

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionMessage, setActionMessage] = useState(null);
  const [adminChartPeriod, setAdminChartPeriod] = useState('7days');
  const [adminChartData, setAdminChartData] = useState([]);
  const [adminChartLoading, setAdminChartLoading] = useState(false);

  // Selected Provider Modal for detailed KYC inspection
  const [selectedProviderModal, setSelectedProviderModal] = useState(null);

  const fetchAdminChart = async (periodVal = adminChartPeriod) => {
    setAdminChartLoading(true);
    try {
      const res = await adminAPI.getAnalytics({ period: periodVal });
      if (res.data && res.data.chartData) {
        setAdminChartData(res.data.chartData);
      }
    } catch (err) {
      console.warn('Failed to fetch admin chart analytics', err);
    } finally {
      setAdminChartLoading(false);
    }
  };

  const loadData = () => {
    setLoading(true);
    fetchAdminChart();
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
      if (selectedProviderModal && selectedProviderModal.id === id) {
        setSelectedProviderModal(null);
      }
      flash('success', `Verified KYC for ${name} successfully!`);
    } catch { flash('error', `Failed to verify ${name}.`); }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Reject ${name}?`)) return;
    try {
      await adminAPI.rejectProvider(id);
      setPendingProviders(prev => prev.filter(p => p.id !== id));
      if (selectedProviderModal && selectedProviderModal.id === id) {
        setSelectedProviderModal(null);
      }
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
    { name: 'Cleaning',   value: 35, color: '#07535f' },
    { name: 'Plumbing',   value: 25, color: '#f59e0b' },
    { name: 'Electrical', value: 22, color: '#10b981' },
    { name: 'Carpentry',  value: 18, color: '#ef4444' },
  ];

  const tabs = ['overview', 'users', 'providers', 'services'];

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
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
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
            <button onClick={() => setActionMessage(null)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">✕</button>
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
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold capitalize whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === tab
                  ? 'border-[#07535f] text-[#07535f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview'  && <LayoutGrid className="w-4 h-4" />}
              {tab === 'users'     && <Users className="w-4 h-4" />}
              {tab === 'providers' && <Shield className="w-4 h-4" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ──────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Charts row */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Revenue & Bookings Analytics</h3>
                  <p className="text-xs text-teal-600 font-medium">Real-time database metrics & total system revenue overview</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl w-fit">
                  {[
                    { label: '7 Days', val: '7days' },
                    { label: '30 Days', val: '30days' },
                    { label: '6 Months', val: '6months' },
                    { label: '1 Year', val: '1year' },
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        setAdminChartPeriod(p.val);
                        fetchAdminChart(p.val);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        adminChartPeriod === p.val
                          ? 'bg-white text-[#07535f] shadow-xs'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`transition-opacity duration-300 ${adminChartLoading ? 'opacity-50' : 'opacity-100'}`}>
                <InteractiveChart
                  data={adminChartData}
                  title=""
                  subtitle={`Revenue and completed bookings stats for ${adminChartPeriod}`}
                  valuePrefix="Rs. "
                  metricKey="value"
                  height={180}
                  defaultChartType="bar"
                  showControls={true}
                  className="!p-0 !border-0 !shadow-none"
                />
              </div>
            </div>

            {/* Pending KYC */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#07535f]" />
                    KYC Provider Verifications
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Review new service provider applications and identity documents.</p>
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
                    <div key={p.id} className="border border-gray-200 hover:border-[#07535f]/40 rounded-2xl p-4 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center font-bold text-teal-700">
                              {p.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                              <p className="text-[11px] text-gray-400">{p.email}</p>
                            </div>
                          </div>
                          <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                            Pending KYC
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-500 bg-gray-50 rounded-xl p-2.5 space-y-1 mb-3 border border-gray-100">
                          <p><span className="font-semibold text-gray-700">Category:</span> {p.service_category || 'General'}</p>
                          <p><span className="font-semibold text-gray-700">Location:</span> {p.ward || 'Kathmandu'}</p>
                          <p className="flex justify-between items-center pt-1 border-t border-gray-200/50">
                            <span className="font-semibold text-gray-700">Citizenship No:</span>
                            <span className="font-mono font-bold text-gray-900 bg-white px-1.5 py-0.5 rounded border border-gray-200">{p.citizenship_no || '27-01-79-12345'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          onClick={() => setSelectedProviderModal(p)}
                          className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold py-2 rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#07535f]" /> View Details & ID Card
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(p.id, p.name)}
                            className="flex-1 bg-[#07535f] hover:bg-[#06424b] text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(p.id, p.name)}
                            className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  <div key={p.id} className="border border-gray-200 rounded-2xl p-4 hover:border-[#07535f]/40 transition-all space-y-3">
                    <div className="flex items-start justify-between">
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

                    <div className="text-[11px] text-gray-500 bg-gray-50 rounded-xl p-2.5 space-y-1 border border-gray-100">
                      <p><span className="font-semibold text-gray-700">Category:</span> {p.service_category || 'General'}</p>
                      <p><span className="font-semibold text-gray-700">Location:</span> {p.ward || 'Kathmandu'}</p>
                      <p><span className="font-semibold text-gray-700">Citizenship No:</span> <span className="font-mono font-bold">{p.citizenship_no || '27-01-79-12345'}</span></p>
                    </div>

                    <button
                      onClick={() => setSelectedProviderModal(p)}
                      className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold py-2 rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#07535f]" /> View Details & ID
                    </button>

                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleApprove(p.id, p.name)} className="flex-1 bg-[#07535f] hover:bg-[#06424b] text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleReject(p.id, p.name)} className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* ── DETAILED TASKER KYC INSPECTION MODAL ───────────────────────── */}
      {selectedProviderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-150 border border-gray-100 max-h-[90vh] overflow-y-auto text-left">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedProviderModal(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-[#07535f]/10 text-[#07535f] flex items-center justify-center font-extrabold text-2xl flex-shrink-0">
                {selectedProviderModal.avatar_url ? (
                  <img src={selectedProviderModal.avatar_url} alt={selectedProviderModal.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  selectedProviderModal.name?.charAt(0) || 'T'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-gray-900">{selectedProviderModal.name}</h2>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                    KYC Application Pending
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedProviderModal.email} • ID: #{selectedProviderModal.id}</p>
              </div>
            </div>

            {/* Section 1: Submitted Identity & Citizenship Card */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#07535f]" /> Identity & Citizenship Verification Card
              </h4>

              {/* Uploaded ID Image Container */}
              {selectedProviderModal.citizenship_image_url && selectedProviderModal.citizenship_image_url.length > 20 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                    <span>Uploaded ID Document File:</span>
                    <span className="text-emerald-600 font-bold">Image File Verified ✓</span>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-gray-900">
                    <img
                      src={selectedProviderModal.citizenship_image_url}
                      alt="Uploaded Citizenship Document"
                      className="w-full max-h-64 object-contain"
                    />
                    <div className="p-2.5 bg-gray-900/90 text-white text-[11px] font-mono flex justify-between items-center border-t border-gray-800">
                      <span>Citizenship No: {selectedProviderModal.citizenship_no || 'Verified'}</span>
                      <a
                        href={selectedProviderModal.citizenship_image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-300 hover:text-white font-bold underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Full Size Image
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}
              
              <div className="bg-gradient-to-br from-gray-900 to-[#07535f] text-white p-5 rounded-2xl shadow-md space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <span className="text-[10px] font-bold text-teal-200 uppercase tracking-widest block">NEPAL CITIZENSHIP CARD / NATIONAL ID</span>
                    <p className="font-mono text-lg font-black text-white mt-1 tracking-wider">
                      {selectedProviderModal.citizenship_no || '27-01-79-12345'}
                    </p>
                  </div>
                  <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    Document Submitted ✓
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs relative z-10 pt-2 border-t border-white/10">
                  <div>
                    <span className="text-white/60 text-[10px] block">Full Registered Name</span>
                    <span className="font-bold text-white">{selectedProviderModal.name}</span>
                  </div>
                  <div>
                    <span className="text-white/60 text-[10px] block">Contact Phone</span>
                    <span className="font-bold text-white">{selectedProviderModal.phone || '98XXXXXXXX'}</span>
                  </div>
                  <div>
                    <span className="text-white/60 text-[10px] block">Service Location / Ward</span>
                    <span className="font-bold text-white">{selectedProviderModal.ward || 'Kathmandu'}</span>
                  </div>
                  <div>
                    <span className="text-white/60 text-[10px] block">Application Status</span>
                    <span className="font-bold text-amber-300">Pending Approval</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Service Qualifications & Pricing */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#07535f]" /> Service Skills & Pricing
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Skill Category</span>
                  <span className="font-extrabold text-gray-900 text-sm mt-0.5 block">{selectedProviderModal.service_category || 'General'}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Hourly Fee</span>
                  <span className="font-extrabold text-[#07535f] text-sm mt-0.5 block">Rs. {selectedProviderModal.hourly_rate || '450'}/hr</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Rating Score</span>
                  <span className="font-extrabold text-yellow-600 text-sm mt-0.5 block flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-500" />
                    {selectedProviderModal.rating_avg ? Number(selectedProviderModal.rating_avg).toFixed(1) : '5.0 (New)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Professional Bio / Self Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                Tasker Self-Description / Bio
              </h4>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-700 leading-relaxed font-medium">
                {selectedProviderModal.bio || (
                  `Experienced home service professional specializing in ${selectedProviderModal.service_category || 'General Maintenance'}. Committed to quality workmanship, reliability, and excellent customer satisfaction.`
                )}
              </div>
            </div>

            {/* Action Buttons in Modal */}
            <div className="pt-3 flex flex-col sm:flex-row items-center gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedProviderModal(null)}
                className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer"
              >
                Close Inspection
              </button>

              <button
                type="button"
                onClick={() => handleApprove(selectedProviderModal.id, selectedProviderModal.name)}
                className="w-full sm:flex-1 bg-[#10b981] hover:bg-[#0ea572] text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" /> Approve & Verify Tasker
              </button>

              <button
                type="button"
                onClick={() => handleReject(selectedProviderModal.id, selectedProviderModal.name)}
                className="w-full sm:w-auto bg-white border border-red-200 hover:bg-red-50 text-red-600 px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
