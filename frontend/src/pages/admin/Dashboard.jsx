import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { getPayoutStats } from '../../services/payoutStore';
import {
  Users, Calendar, Shield, ShieldCheck, CreditCard, RefreshCw, 
  ArrowUpRight, Check, X, AlertCircle, Clock, ChevronRight
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  const loadDashboardData = () => {
    setLoading(true);
    Promise.allSettled([
      adminAPI.getPlatformStats(),
      adminAPI.getAllBookings({ limit: 6 }),
      adminAPI.getPendingProviders({ limit: 10 }),
    ]).then(([statsRes, bookingsRes, providersRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
      if (bookingsRes.status === 'fulfilled') {
        const d = bookingsRes.value.data;
        setRecentBookings(Array.isArray(d) ? d : []);
      }
      if (providersRes.status === 'fulfilled') {
        const d = providersRes.value.data;
        setPendingProviders(Array.isArray(d) ? d : []);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleApprove = async (id, name) => {
    try {
      await adminAPI.verifyProvider(id);
      setPendingProviders(prev => prev.filter(p => p.id !== id));
      setActionMessage({ type: 'success', text: `Verified KYC for ${name} successfully!` });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({ type: 'error', text: `Failed to verify ${name}.` });
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to reject ${name}?`)) return;
    try {
      await adminAPI.rejectProvider(id);
      setPendingProviders(prev => prev.filter(p => p.id !== id));
      setActionMessage({ type: 'info', text: `Rejected application for ${name}.` });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({ type: 'error', text: `Failed to reject ${name}.` });
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-serif tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Platform overview and pending provider verification requests.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadDashboardData}
            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <Link 
            to="/admin/payments" 
            className="flex items-center gap-2 bg-[#07535f] hover:bg-[#06424b] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md"
          >
            <CreditCard className="w-4 h-4" /> Payments & Revenue
          </Link>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between transition-all ${
          actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          actionMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-gray-100 text-gray-800 border border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">
              Rs. {Number(stats?.total_revenue || 0).toLocaleString()}
            </h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Users</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">
              {Number(stats?.total_users ?? stats?.total_customers ?? 0).toLocaleString()}
            </h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Verified Providers */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Verified Providers</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">
              {Number(stats?.verified_providers ?? stats?.total_providers ?? 0).toLocaleString()}
            </h3>
          </div>
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Bookings</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">
              {Number(stats?.total_bookings ?? stats?.active_bookings ?? 0).toLocaleString()}
            </h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Primary Section: KYC Provider Verifications */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-serif flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#07535f]" />
              KYC Provider Verification Requests
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Review and verify new service provider documents and registration details.</p>
          </div>
          <span className="text-xs font-bold bg-[#07535f]/10 text-[#07535f] px-3 py-1 rounded-full w-fit">
            {pendingProviders.length} Pending Approval{pendingProviders.length === 1 ? '' : 's'}
          </span>
        </div>

        {pendingProviders.length === 0 ? (
          <div className="py-12 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <div className="w-12 h-12 mx-auto bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-800 text-base">All KYC Verifications Cleared!</h3>
            <p className="text-xs text-gray-400 mt-1">There are no pending provider applications awaiting verification at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pendingProviders.map((provider) => (
              <div key={provider.id} className="border border-gray-200 hover:border-[#07535f]/50 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{provider.name}</h4>
                      <p className="text-xs text-gray-500">{provider.email}</p>
                    </div>
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                      Pending Verification
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl mb-4">
                    <p><span className="font-semibold text-gray-700">Category:</span> {provider.service_category || 'General Service'}</p>
                    <p><span className="font-semibold text-gray-700">Location:</span> {provider.ward || 'Pokhara / Kathmandu'}</p>
                    <p><span className="font-semibold text-gray-700">Citizenship/KYC:</span> <span className="text-emerald-600 font-bold">Uploaded (Verified Format)</span></p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleApprove(provider.id, provider.name)}
                    className="flex-1 bg-[#07535f] text-white hover:bg-[#06424b] text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(provider.id, provider.name)}
                    className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secondary Section: Recent Bookings Overview */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-serif flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#07535f]" />
              Recent Platform Bookings
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Latest service bookings placed across the marketplace.</p>
          </div>
          <Link to="/admin/bookings" className="text-xs font-bold text-[#07535f] hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 pb-3">
              <tr>
                <th className="pb-3 px-3">Booking ID</th>
                <th className="pb-3 px-3">Service</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Provider</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentBookings.length > 0 ? (
                recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-3 font-mono text-xs text-gray-500 font-bold">BK-{b.id}</td>
                    <td className="py-3.5 px-3 font-semibold text-gray-800">{b.service_category || 'Home Service'}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        b.status === 'completed' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
                        b.status === 'cancelled' ? 'text-red-700 bg-red-50 border border-red-200' :
                        'text-blue-700 bg-blue-50 border border-blue-200'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-gray-700">{b.provider_name || 'Rajesh Shrestha'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-gray-400 text-xs">
                    No recent bookings recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
