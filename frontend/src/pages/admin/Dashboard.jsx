import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { getPayoutStats } from '../../services/payoutStore';
import {
  Users, Calendar, Shield, ArrowRight, ArrowUpRight, ArrowDownRight,
  RefreshCw, Download, CreditCard, LayoutGrid, DollarSign,
  PieChart as PieChartIcon, Wallet, AlertTriangle
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [payoutStats, setPayoutStats] = useState(null);

  // Refresh payout stats from shared store
  const refreshPayoutStats = () => setPayoutStats(getPayoutStats());

  useEffect(() => {
    refreshPayoutStats();
    const handler = () => refreshPayoutStats();
    window.addEventListener('payout_store_updated', handler);
    window.addEventListener('storage', handler);
    const interval = setInterval(refreshPayoutStats, 5000);
    return () => {
      window.removeEventListener('payout_store_updated', handler);
      window.removeEventListener('storage', handler);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    Promise.allSettled([
      adminAPI.getPlatformStats(),
      adminAPI.getAllBookings({ limit: 10 }),
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
  }, []);

  const handleApprove = async (id) => {
    try {
      await adminAPI.verifyProvider(id);
      setPendingProviders(prev => prev.filter(p => p.id !== id));
      alert('Provider verified successfully!');
    } catch (err) {
      alert('Failed to verify provider.');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this provider?')) return;
    try {
      await adminAPI.rejectProvider(id);
      setPendingProviders(prev => prev.filter(p => p.id !== id));
      alert('Provider rejected.');
    } catch (err) {
      alert('Failed to reject provider.');
    }
  };

  const tabs = [
    { name: 'Overview', icon: LayoutGrid },
    { name: 'Users', icon: Users },
    { name: 'Providers', icon: Shield },
    { name: 'Bookings', icon: Calendar },
    { name: 'Services', icon: PieChartIcon },
    { name: 'Payments', icon: CreditCard },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header section matching UX pilot */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#031d22] font-serif tracking-tight">Admin Control Center</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users, providers, and overall platform operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm">
            <RefreshCw className="w-4 h-4" /> Refresh Data
          </button>
          <button className="flex items-center gap-2 bg-[#07535f] hover:bg-[#06424b] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md">
            <ArrowUpRight className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:shadow-lg transition-all">
          <p className="text-gray-500 text-sm font-medium mb-1">Total Revenue</p>
          <h3 className="text-3xl font-extrabold text-[#031d22] tracking-tight">
            Rs. {stats?.total_revenue?.toLocaleString() || '45,231'}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+20.1% from last month</span>
          </div>
          <div className="absolute right-5 top-5 w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:shadow-lg transition-all">
          <p className="text-gray-500 text-sm font-medium mb-1">Active Users</p>
          <h3 className="text-3xl font-extrabold text-[#031d22] tracking-tight">
            +{stats?.total_customers?.toLocaleString() || '2,350'}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+180.1% from last month</span>
          </div>
          <div className="absolute right-5 top-5 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Service Providers */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:shadow-lg transition-all">
          <p className="text-gray-500 text-sm font-medium mb-1">Service Providers</p>
          <h3 className="text-3xl font-extrabold text-[#031d22] tracking-tight">
            {stats?.verified_providers?.toLocaleString() || '1,234'}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-rose-500 text-[11px] font-bold">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>-4% from last month</span>
          </div>
          <div className="absolute right-5 top-5 w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        {/* Active Bookings */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:shadow-lg transition-all">
          <p className="text-gray-500 text-sm font-medium mb-1">Active Bookings</p>
          <h3 className="text-3xl font-extrabold text-[#031d22] tracking-tight">
            +{stats?.active_bookings || '573'}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+201 since last hour</span>
          </div>
          <div className="absolute right-5 top-5 w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-white border border-gray-100 rounded-xl shadow-sm w-fit max-w-full hide-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                isActive 
                  ? 'bg-gray-50 text-gray-900 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue & Bookings Bar Chart (CSS based) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-[#031d22]">Revenue & Bookings Growth</h3>
              <p className="text-sm text-gray-500 mt-1">Visualizing platform activity over the last 7 days.</p>
            </div>
            
            <div className="relative h-64 flex items-end justify-between gap-4 px-2">
              <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-gray-400 font-medium">
                <span>10000</span>
                <span>7500</span>
                <span>5000</span>
                <span>2500</span>
                <span>0</span>
              </div>
              
              <div className="absolute left-10 right-0 top-1.5 bottom-8 flex flex-col justify-between pointer-events-none">
                <div className="w-full border-b border-dashed border-gray-200"></div>
                <div className="w-full border-b border-dashed border-gray-200"></div>
                <div className="w-full border-b border-dashed border-gray-200"></div>
                <div className="w-full border-b border-dashed border-gray-200"></div>
                <div className="w-full border-b border-gray-200"></div>
              </div>

              <div className="flex-1 flex justify-between items-end pl-12 pr-4 h-[calc(100%-2rem)] z-10">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const heights = [40, 30, 50, 28, 68, 85, 55];
                  return (
                    <div key={day} className="flex flex-col items-center w-8 group">
                      <div 
                        className="w-full bg-[#7c3aed] rounded-t-sm group-hover:bg-[#6d28d9] transition-all cursor-pointer relative"
                        style={{ height: `${heights[i]}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          {heights[i] * 100}
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-gray-500 mt-3">{day}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Services Distribution Donut (CSS based) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-[#031d22]">Services Distribution</h3>
              <p className="text-sm text-gray-500 mt-1">Most popular categories by volume.</p>
            </div>
            
            <div className="flex-1 flex items-center justify-center relative my-4">
              <div className="relative w-52 h-52 rounded-full flex items-center justify-center animate-[spin_1s_ease-out_reverse]" 
                   style={{
                     background: 'conic-gradient(from 0deg, #7c3aed 0% 30%, transparent 30% 32%, #ef4444 32% 55%, transparent 55% 57%, #10b981 57% 80%, transparent 80% 82%, #f59e0b 82% 98%, transparent 98% 100%)'
                   }}>
                <div className="absolute inset-2 bg-white rounded-full"></div>
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-auto pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#7c3aed]"></span>
                <span className="text-xs font-semibold text-gray-600">Cleaning</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
                <span className="text-xs font-semibold text-gray-600">Electrical</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
                <span className="text-xs font-semibold text-gray-600">Plumbing</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Users' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-[#031d22]">User Management</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">View and manage all registered platform users.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="font-medium py-3 px-4">User</th>
                  <th className="font-medium py-3 px-4">Role</th>
                  <th className="font-medium py-3 px-4">Status</th>
                  <th className="font-medium py-3 px-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="hover:bg-gray-50/50">
                  <td className="py-4 px-4"><p className="font-semibold text-gray-800">Priya Mallick</p><p className="text-xs text-gray-400">priya@example.com</p></td>
                  <td className="py-4 px-4"><span className="bg-[#07535f] text-white px-2 py-0.5 rounded-full text-xs">User</span></td>
                  <td className="py-4 px-4"><span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">Active</span></td>
                  <td className="py-4 px-4 text-gray-500">2023-10-12</td>
                </tr>
                <tr className="bg-gray-50/30 hover:bg-gray-50/50">
                  <td className="py-4 px-4"><p className="font-semibold text-gray-800">Rajan Kumar</p><p className="text-xs text-gray-400">rajan@example.com</p></td>
                  <td className="py-4 px-4"><span className="border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">Provider</span></td>
                  <td className="py-4 px-4"><span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">Active</span></td>
                  <td className="py-4 px-4 text-gray-500">2023-09-05</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Providers' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-[#031d22]">Provider Verification</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">Review and approve new service provider applications.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pendingProviders.length === 0 ? (
              <div className="col-span-full py-8 text-center text-gray-400">No pending providers.</div>
            ) : (
              pendingProviders.map((p, i) => (
                <div key={p.id || i} className="border border-gray-100 rounded-xl p-5 shadow-sm text-center">
                  <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-300">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-gray-800">{p.name}</h4>
                  <p className="text-xs text-gray-400 mb-4">{p.service_category || 'General'} Specialist</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApprove(p.id)}
                      className="flex-1 bg-[#07535f] text-white text-xs font-bold py-2 rounded-lg hover:bg-[#06424b] transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleReject(p.id)}
                      className="flex-1 border border-red-200 text-red-500 text-xs font-bold py-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'Bookings' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-[#031d22]">All Bookings</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">Monitor all platform transactions and service statuses.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="font-medium py-3 px-4">Booking ID</th>
                  <th className="font-medium py-3 px-4">Service</th>
                  <th className="font-medium py-3 px-4">Status</th>
                  <th className="font-medium py-3 px-4">Provider</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentBookings.length > 0 ? (
                  recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/50">
                      <td className="py-4 px-4 font-mono text-xs text-gray-500">BK-{b.id}</td>
                      <td className="py-4 px-4 text-gray-800">{b.service_category}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          b.status === 'completed' ? 'text-emerald-600 bg-emerald-50' :
                          b.status === 'cancelled' ? 'text-red-600 bg-red-50' :
                          'text-blue-600 bg-blue-50'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-800">{b.provider_name || 'Unassigned'}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="py-8 text-center text-gray-400">No recent bookings</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Services' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#07535f]/5 rounded-full flex items-center justify-center text-[#07535f] mb-4">
            <PieChartIcon className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#031d22]">Service Category Management</h3>
          <p className="text-sm text-gray-500 mt-2 mb-6 max-w-sm">Manage service categories, pricing tiers, and regional availability from this panel.</p>
          <button className="bg-[#07535f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#06424b] transition-colors">
            Add New Category
          </button>
        </div>
      )}

      {activeTab === 'Payments' && (() => {
        const totalVol = (payoutStats?.totalRequested || 0) + 29500;
        const platRev = Math.round(totalVol * 0.10);
        return (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold text-[#031d22]">Financial Operations & Revenue</h3>
              <p className="text-sm text-gray-500 mt-1">Live transaction volume, 10% platform revenue, and payout status.</p>
            </div>
            <Link
              to="/admin/payments"
              className="bg-[#07535f] hover:bg-[#06424b] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 w-fit"
            >
              <CreditCard className="w-4 h-4" />
              <span>Payout Control Center</span>
            </Link>
          </div>

          {(payoutStats?.pendingCount || 0) > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {payoutStats.pendingCount} pending payout request{payoutStats.pendingCount > 1 ? 's' : ''} totaling Rs. {(payoutStats.totalPending || 0).toLocaleString()}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase">Total Volume</span>
              <p className="text-2xl font-extrabold text-gray-900">Rs. {totalVol.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 space-y-1">
              <span className="text-xs font-bold text-emerald-700 uppercase">Platform Revenue</span>
              <p className="text-2xl font-extrabold text-emerald-900">Rs. {platRev.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 space-y-1">
              <span className="text-xs font-bold text-blue-700 uppercase">Total Disbursed</span>
              <p className="text-2xl font-extrabold text-blue-900">Rs. {(payoutStats?.totalDisbursed || 0).toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-1">
              <span className="text-xs font-bold text-amber-700 uppercase">Pending Payouts</span>
              <p className="text-2xl font-extrabold text-amber-900">Rs. {(payoutStats?.totalPending || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
}
