import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, categoryAPI } from '../../services/api';
import InteractiveChart from '../../components/InteractiveChart';
import {
  Users, Calendar, Shield, ShieldCheck, CreditCard,
  RefreshCw, Check, X, AlertCircle, ArrowUpRight,
  ArrowDownRight, Download, LayoutGrid, Eye, FileText,
  CheckCircle, XCircle, Award, Star, FileSpreadsheet,
  ShieldAlert, Wrench, Plus, Trash2, Edit3, Sparkles, Zap,
  Hammer, Paintbrush
} from 'lucide-react';
import { format } from 'date-fns';

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionMessage, setActionMessage] = useState(null);
  const [adminChartPeriod, setAdminChartPeriod] = useState('7days');
  const [adminChartData, setAdminChartData] = useState([]);
  const [adminChartLoading, setAdminChartLoading] = useState(false);

  // Filters for embedded tables
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Selected Provider Modal for detailed KYC inspection / profile view
  const [selectedProviderModal, setSelectedProviderModal] = useState(null);
  const [selectedCustomerModal, setSelectedCustomerModal] = useState(null);
  const [allProviders, setAllProviders] = useState([]);

  // Category & Service Management State
  const [categories, setCategories] = useState([]);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', icon: 'Wrench', description: '' });
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

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
      adminAPI.getAllBookings({ limit: 15 }),
      adminAPI.getPendingProviders({ limit: 10 }),
      adminAPI.getAllUsers(),
      adminAPI.getAllProviders(),
      categoryAPI.getAllCategories(),
    ]).then(([sR, bR, pR, uR, prR, cR]) => {
      if (sR.status === 'fulfilled') setStats(sR.value.data || {});
      if (bR.status === 'fulfilled') { const d = bR.value.data; setRecentBookings(Array.isArray(d) ? d : []); }
      if (pR.status === 'fulfilled') { const d = pR.value.data; setPendingProviders(Array.isArray(d) ? d : []); }
      if (uR.status === 'fulfilled') { const d = uR.value.data; setAllUsers(Array.isArray(d) ? d : []); }
      if (prR.status === 'fulfilled') { const d = prR.value.data; setAllProviders(Array.isArray(d) ? d : []); }
      if (cR.status === 'fulfilled') { const d = cR.value.data; setCategories(Array.isArray(d) ? d : []); }
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
      setAllUsers(prev => prev.map(u => u.id === id ? { ...u, is_verified: true } : u));
      setAllProviders(prev => prev.map(p => p.id === id ? { ...p, is_verified: true } : p));
      if (selectedProviderModal && selectedProviderModal.id === id) {
        setSelectedProviderModal(prev => prev ? ({ ...prev, is_verified: true }) : null);
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

  const handleToggleUserActive = async (user) => {
    try {
      if (user.is_active) {
        await adminAPI.deactivateUser(user.id, { reason: 'Admin action' });
      } else {
        await adminAPI.activateUser(user.id);
      }
      setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      setAllProviders(prev => prev.map(p => p.id === user.id ? { ...p, is_active: !p.is_active } : p));
      flash('success', `User "${user.name}" ${user.is_active ? 'deactivated' : 'activated'} successfully.`);
    } catch (err) {
      flash('error', `Failed to update user status.`);
    }
  };

  const handleOpenProfile = (userItem) => {
    if (userItem.role === 'provider' || userItem.citizenship_no || userItem.hourly_rate) {
      const fullP = allProviders.find(p => p.id === userItem.id) || userItem;
      setSelectedProviderModal(fullP);
    } else {
      setSelectedCustomerModal(userItem);
    }
  };

  // Service Management Handlers
  const handleOpenAddService = () => {
    setEditingCategory(null);
    setServiceForm({ name: '', icon: 'Wrench', description: '' });
    setServiceModalOpen(true);
  };

  const handleOpenEditService = (cat) => {
    setEditingCategory(cat);
    setServiceForm({ name: cat.name || '', icon: cat.icon || 'Wrench', description: cat.description || '' });
    setServiceModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) return flash('error', 'Please enter a service name.');
    setServiceSubmitting(true);
    try {
      if (editingCategory && typeof editingCategory.id === 'number') {
        await categoryAPI.updateCategory(editingCategory.id, serviceForm);
        flash('success', `Service "${serviceForm.name}" updated successfully!`);
      } else {
        await categoryAPI.createCategory(serviceForm);
        flash('success', `New service "${serviceForm.name}" created successfully!`);
      }
      setServiceModalOpen(false);
      const res = await categoryAPI.getAllCategories();
      if (res.data && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err) {
      flash('error', err.response?.data?.error || 'Failed to save service.');
    } finally {
      setServiceSubmitting(false);
    }
  };

  const handleDeleteService = async (cat) => {
    if (!window.confirm(`Are you sure you want to remove the "${cat.name}" service category?`)) return;
    try {
      if (typeof cat.id === 'number') {
        await categoryAPI.deleteCategory(cat.id);
      }
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      flash('info', `Service "${cat.name}" removed successfully.`);
    } catch (err) {
      flash('error', err.response?.data?.error || `Failed to remove service "${cat.name}".`);
    }
  };

  const defaultServices = [
    { id: 'def-1', name: 'Plumbing', icon: 'Wrench', description: 'Pipe leak repairs, bathroom fittings, tap installations, and drainage solutions.', provider_count: 5 },
    { id: 'def-2', name: 'Electrical', icon: 'Zap', description: 'Wiring, circuit breaker repair, fan & light installation, and socket fixes.', provider_count: 4 },
    { id: 'def-3', name: 'House Cleaning', icon: 'Sparkles', description: 'Full home deep cleaning, kitchen degreasing, and sofa shampooing.', provider_count: 6 },
    { id: 'def-4', name: 'Appliance Repair', icon: 'Wrench', description: 'Washing machine, refrigerator, microwave, and AC maintenance.', provider_count: 3 },
    { id: 'def-5', name: 'Painting & Decor', icon: 'Paintbrush', description: 'Interior/exterior wall painting, wall touchups, and waterproofing.', provider_count: 2 },
    { id: 'def-6', name: 'Carpentry & Furniture', icon: 'Hammer', description: 'Custom woodwork, door lock fixing, cabinet repairs, and assembly.', provider_count: 3 },
  ];

  const activeServicesList = categories.length > 0 ? categories : defaultServices;

  const tabs = ['overview', 'kyc', 'users', 'providers', 'services'];

  const kpiCards = [
    {
      label: 'Platform Revenue (10%)',
      value: `Rs. ${Number(stats?.platform_revenue ?? stats?.total_revenue ?? 0).toLocaleString()}`,
      trend: '10% Commission Earned',
      up: true,
      icon: <CreditCard className="w-5 h-5" />,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Total Volume Budget',
      value: `Rs. ${Number(stats?.total_transactions ?? (Number(stats?.platform_revenue || stats?.total_revenue || 0) * 10)).toLocaleString()}`,
      trend: 'Gross Booking Volume',
      up: true,
      icon: <CreditCard className="w-5 h-5" />,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Active Users',
      value: `+${Number(stats?.total_users ?? stats?.total_customers ?? 0).toLocaleString()}`,
      trend: 'Total Registered Accounts',
      up: true,
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Service Providers',
      value: Number(stats?.verified_providers ?? stats?.total_providers ?? 0).toLocaleString(),
      trend: 'Verified Professionals',
      up: true,
      icon: <ShieldCheck className="w-5 h-5" />,
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Active Bookings',
      value: `+${Number(stats?.total_bookings ?? stats?.active_bookings ?? 0).toLocaleString()}`,
      trend: 'Total System Bookings',
      up: true,
      icon: <Calendar className="w-5 h-5" />,
      iconBg: 'bg-teal-50 text-teal-600',
    },
  ];

  const filteredUsers = allUsers.filter(u => {
    const matchRole = userRoleFilter === '' || u.role === userRoleFilter;
    const matchSearch = userSearch === '' ||
      `${u.name} ${u.email} ${u.ward || ''}`.toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  });

  const providersList = allUsers.filter(u => u.role === 'provider');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full">Completed ✓</span>;
      case 'awaiting_payment': return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full">Awaiting Payment ⏳</span>;
      case 'in_progress': return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full">In Progress ⚡</span>;
      case 'accepted': return <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full">Accepted 👍</span>;
      case 'cancelled': return <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full">Cancelled ✕</span>;
      default: return <span className="bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full">{status?.replaceAll('_', ' ') || 'Pending'}</span>;
    }
  };

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
            <Link
              to="/admin/reports"
              className="flex items-center gap-2 bg-[#07535f] hover:bg-[#06424b] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              Master Reports & Excel
            </Link>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold capitalize whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === tab
                  ? 'border-[#07535f] text-[#07535f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview'  && <LayoutGrid className="w-4 h-4" />}
              {tab === 'kyc'       && <ShieldAlert className="w-4 h-4 text-amber-500" />}
              {tab === 'users'     && <Users className="w-4 h-4" />}
              {tab === 'providers' && <ShieldCheck className="w-4 h-4" />}
              {tab === 'services'  && <Wrench className="w-4 h-4" />}
              
              <span>
                {tab === 'kyc' ? 'KYC Verifications' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </span>

              {tab === 'kyc' && pendingProviders.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-0.5 animate-pulse">
                  {pendingProviders.length} Pending
                </span>
              )}
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

            {/* Quick KYC Status Banner */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" /> KYC Provider Verifications
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {pendingProviders.length > 0
                    ? `There are ${pendingProviders.length} new service provider applications pending identity verification.`
                    : 'All service provider applications and identity documents are reviewed and up to date.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('kyc')}
                className="bg-[#07535f] hover:bg-[#06424b] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                Go to KYC Workspace →
              </button>
            </div>

            {/* Current & Recent Bookings List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#07535f]" /> Current & Recent Bookings
                  </h3>
                  <p className="text-xs text-gray-400">Latest service bookings across the platform</p>
                </div>
                <Link
                  to="/admin/bookings"
                  className="text-xs font-bold text-[#07535f] hover:underline flex items-center gap-1"
                >
                  Manage All Bookings →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-3 rounded-l-xl">ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Professional</th>
                      <th className="px-4 py-3">Service Category</th>
                      <th className="px-4 py-3">Location / Ward</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Rate</th>
                      <th className="px-4 py-3 rounded-r-xl">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {recentBookings.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-gray-400">No bookings available.</td>
                      </tr>
                    ) : (
                      recentBookings.map(b => (
                        <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-[#07535f]">#{b.id}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{b.customer_name || 'Customer'}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{b.provider_name || 'Unassigned'}</td>
                          <td className="px-4 py-3 font-semibold text-gray-600">{b.service_category || 'Service'}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{b.location || 'Kathmandu'}</td>
                          <td className="px-4 py-3">{getStatusBadge(b.status)}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">Rs. {b.total_price || b.hourly_rate || 800}</td>
                          <td className="px-4 py-3 text-gray-400">
                            {b.booking_date ? format(new Date(b.booking_date), 'MMM d, yyyy') : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── KYC Verifications Tab ─────────────────────────────────────── */}
        {activeTab === 'kyc' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    KYC Provider Verifications Workspace
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Inspect citizenship documents and verify or reject new service provider registrations.
                  </p>
                </div>
                <span className="text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 px-3.5 py-1.5 rounded-full w-fit">
                  {pendingProviders.length} Applications Pending
                </span>
              </div>

              {pendingProviders.length === 0 ? (
                <div className="py-14 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-base">All Clear! No Pending KYC Applications</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    All registered service providers have been verified or processed. You will see new submissions here as soon as providers complete their registration.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pendingProviders.map(p => (
                    <div key={p.id} className="border border-gray-200 hover:border-[#07535f] rounded-2xl p-5 transition-all bg-white shadow-xs flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#07535f]/10 text-[#07535f] flex items-center justify-center font-extrabold text-base">
                              {p.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-gray-900 text-sm">{p.name}</h4>
                              <p className="text-[11px] text-gray-400">{p.email}</p>
                            </div>
                          </div>
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                            KYC Pending
                          </span>
                        </div>

                        <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 space-y-1.5 border border-gray-100 font-medium">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Category:</span>
                            <span className="font-bold text-gray-800">{p.service_category || 'General'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ward/Location:</span>
                            <span className="font-bold text-gray-800">{p.ward || 'Kathmandu'}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-gray-200/60">
                            <span className="text-gray-400">Citizenship No:</span>
                            <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 text-[11px]">
                              {p.citizenship_no || 'Document Attached'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          onClick={() => setSelectedProviderModal(p)}
                          className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold py-2.5 rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#07535f]" /> View Details & ID Card
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(p.id, p.name)}
                            className="flex-1 bg-[#07535f] hover:bg-[#06424b] text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(p.id, p.name)}
                            className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
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
          </div>
        )}

        {/* ── Providers Tab ─────────────────────────────────────────────── */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#07535f]" /> Service Professionals ({providersList.length})
                  </h2>
                  <p className="text-xs text-gray-400">Click any provider name or Profile button to view full details</p>
                </div>
                <Link to="/admin/providers" className="text-xs font-bold text-[#07535f] hover:underline">
                  Full Provider Management Page →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-3 rounded-l-xl">Provider</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">KYC Status</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3 text-right rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {providersList.length === 0 ? (
                      <tr><td colSpan="6" className="py-8 text-center text-gray-400">No providers found.</td></tr>
                    ) : (
                      providersList.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div
                              onClick={() => handleOpenProfile(p)}
                              className="flex items-center gap-2.5 cursor-pointer group"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#07535f]/10 text-[#07535f] font-bold flex items-center justify-center group-hover:scale-105 transition-transform">
                                {p.name?.charAt(0) || 'P'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 group-hover:text-[#07535f] group-hover:underline flex items-center gap-1">
                                  {p.name} <Eye className="w-3 h-3 text-[#07535f] opacity-60" />
                                </p>
                                <p className="text-[11px] text-gray-400">{p.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-700">{p.service_category || 'General'}</td>
                          <td className="px-4 py-3 text-gray-500">{p.ward || 'Nepal'}</td>
                          <td className="px-4 py-3">
                            {p.is_verified ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">Verified ✓</span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">Pending KYC</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${p.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                              {p.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenProfile(p)}
                                className="text-[11px] font-bold px-3 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-[#07535f]" /> Profile
                              </button>
                              <button
                                onClick={() => handleToggleUserActive(p)}
                                className={`text-[11px] font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                                  p.is_active ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                }`}
                              >
                                {p.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Users Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#07535f]" /> All Platform Users ({allUsers.length})
                </h3>
                <p className="text-xs text-gray-400">Click any user name or Profile button to inspect full account details</p>
              </div>
              <Link to="/admin/users" className="text-xs font-bold text-[#07535f] hover:underline">
                Full User Management Page →
              </Link>
            </div>

            {/* Search & Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search user by name, email, ward..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-[#07535f]"
              />
              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#07535f]"
              >
                <option value="">All Roles</option>
                <option value="customer">Customers</option>
                <option value="provider">Service Professionals</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3 rounded-l-xl">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan="5" className="py-8 text-center text-gray-400">No users match criteria.</td></tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div
                            onClick={() => handleOpenProfile(u)}
                            className="flex items-center gap-2.5 cursor-pointer group"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#07535f]/10 text-[#07535f] font-bold flex items-center justify-center group-hover:scale-105 transition-transform">
                              {u.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 group-hover:text-[#07535f] group-hover:underline flex items-center gap-1">
                                {u.name} <Eye className="w-3 h-3 text-[#07535f] opacity-60" />
                              </p>
                              <p className="text-[11px] text-gray-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            u.role === 'provider' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {u.role === 'provider' ? 'Professional' : 'Customer'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.ward || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${u.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenProfile(u)}
                              className="text-[11px] font-bold px-3 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-[#07535f]" /> Profile
                            </button>
                            <button
                              onClick={() => handleToggleUserActive(u)}
                              className={`text-[11px] font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                                u.is_active ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Services Management Tab ────────────────────────────────────── */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-[#07535f]" />
                    Platform Service Management
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Add, edit, or remove service categories available to customers and taskers on Gharelu Sewa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddService}
                  className="bg-[#07535f] hover:bg-[#06424b] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add New Service
                </button>
              </div>

              {/* Service Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeServicesList.map(s => (
                  <div key={s.id || s.name} className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all bg-white flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#07535f]/10 text-[#07535f] flex items-center justify-center font-extrabold">
                          {s.name?.toLowerCase().includes('plumb') ? <Wrench className="w-6 h-6" /> :
                           s.name?.toLowerCase().includes('electr') ? <Zap className="w-6 h-6" /> :
                           s.name?.toLowerCase().includes('clean') ? <Sparkles className="w-6 h-6" /> :
                           s.name?.toLowerCase().includes('paint') ? <Paintbrush className="w-6 h-6" /> :
                           s.name?.toLowerCase().includes('carpen') ? <Hammer className="w-6 h-6" /> :
                           <Wrench className="w-6 h-6" />}
                        </div>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                          Active Service ✓
                        </span>
                      </div>

                      <h3 className="font-extrabold text-gray-900 text-base mb-1">{s.name}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed min-h-[36px] line-clamp-2">
                        {s.description || 'Professional home maintenance and repair services.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                        {s.provider_count || 0} Registered Providers
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditService(s)}
                          className="p-2 text-gray-500 hover:text-[#07535f] hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                          title="Edit Service"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(s)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="Remove Service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ── DETAILED PROVIDER PROFILE & KYC INSPECTION MODAL ───────────────── */}
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
                  selectedProviderModal.name?.charAt(0) || 'P'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-gray-900">{selectedProviderModal.name}</h2>
                  {selectedProviderModal.is_verified ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified Tasker
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      KYC Pending
                    </span>
                  )}
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
                    {selectedProviderModal.is_verified ? 'Account Verified ✓' : 'Document Submitted ✓'}
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
                    <span className="text-white/60 text-[10px] block">Account Status</span>
                    <span className={`font-bold ${selectedProviderModal.is_active ? 'text-emerald-300' : 'text-red-400'}`}>
                      {selectedProviderModal.is_active ? 'Active Online' : 'Inactive / Deactivated'}
                    </span>
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
                Close Profile
              </button>

              {!selectedProviderModal.is_verified && (
                <button
                  type="button"
                  onClick={() => handleApprove(selectedProviderModal.id, selectedProviderModal.name)}
                  className="w-full sm:flex-1 bg-[#10b981] hover:bg-[#0ea572] text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Approve & Verify Tasker
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  handleToggleUserActive(selectedProviderModal);
                  setSelectedProviderModal(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
                }}
                className={`w-full sm:flex-1 text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedProviderModal.is_active
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {selectedProviderModal.is_active ? 'Deactivate Account' : 'Activate Account'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── CUSTOMER PROFILE MODAL ─────────────────────────────────────── */}
      {selectedCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-gray-100 text-left animate-in fade-in zoom-in-95 duration-150">
            
            <button
              onClick={() => setSelectedCustomerModal(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-extrabold text-2xl flex-shrink-0">
                {selectedCustomerModal.avatar_url ? (
                  <img src={selectedCustomerModal.avatar_url} alt={selectedCustomerModal.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  selectedCustomerModal.name?.charAt(0) || 'C'
                )}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">{selectedCustomerModal.name}</h2>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mt-1 inline-block">
                  Customer Account
                </span>
                <p className="text-xs text-gray-400 mt-1">ID: #{selectedCustomerModal.id}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-xs text-gray-700">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-400 font-semibold">Email Address</span>
                <span className="font-bold text-gray-900">{selectedCustomerModal.email}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-400 font-semibold">Contact Phone</span>
                <span className="font-bold text-gray-900">{selectedCustomerModal.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-400 font-semibold">Service Location / Ward</span>
                <span className="font-bold text-gray-900">{selectedCustomerModal.ward || 'Kathmandu'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-400 font-semibold">Account Status</span>
                <span className={`font-bold ${selectedCustomerModal.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                  {selectedCustomerModal.is_active ? 'Active ✓' : 'Inactive / Deactivated'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-semibold">Member Since</span>
                <span className="font-bold text-gray-900">
                  {selectedCustomerModal.created_at ? format(new Date(selectedCustomerModal.created_at), 'MMMM d, yyyy') : 'N/A'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedCustomerModal(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleUserActive(selectedCustomerModal);
                  setSelectedCustomerModal(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
                }}
                className={`flex-1 text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md cursor-pointer ${
                  selectedCustomerModal.is_active
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {selectedCustomerModal.is_active ? 'Deactivate Account' : 'Activate Account'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── ADD / EDIT SERVICE MODAL ───────────────────────────────────── */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-gray-100 text-left animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setServiceModalOpen(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#07535f]" />
                {editingCategory ? 'Edit Service Category' : 'Add New Service Category'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {editingCategory ? 'Update service details for platform taskers and customers.' : 'Create a new service category for Gharelu Sewa platform.'}
              </p>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Plumbing, Electrical, Solar Maintenance"
                  value={serviceForm.name}
                  onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#07535f] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Icon Category
                </label>
                <select
                  value={serviceForm.icon}
                  onChange={e => setServiceForm({ ...serviceForm, icon: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#07535f]"
                >
                  <option value="Wrench">Wrench (Plumbing / General)</option>
                  <option value="Zap">Zap (Electrical)</option>
                  <option value="Sparkles">Sparkles (Cleaning / Wash)</option>
                  <option value="Paintbrush">Paintbrush (Painting)</option>
                  <option value="Hammer">Hammer (Carpentry)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Service Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe the scope of work included in this service..."
                  value={serviceForm.description}
                  onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#07535f] focus:bg-white transition-all"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={serviceSubmitting}
                  className="flex-1 bg-[#07535f] hover:bg-[#06424b] text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {serviceSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
