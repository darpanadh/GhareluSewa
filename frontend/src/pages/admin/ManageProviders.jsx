import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { CheckCircle, XCircle, Shield, Star, MapPin, Phone, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function ManageProviders() {
  const [allProviders, setAllProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'all' | 'pending' | 'verified'
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAllProviders();
      const data = Array.isArray(res.data) ? res.data : [];
      setAllProviders(data);
    } catch (err) {
      // Fallback to pending providers if getAllProviders fails
      try {
        const res = await adminAPI.getPendingProviders();
        const data = Array.isArray(res.data) ? res.data : [];
        setAllProviders(data);
      } catch (e) {
        setError('Failed to fetch providers.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id + '-approve');
    try {
      await adminAPI.verifyProvider(id);
      setAllProviders(prev => prev.map(p => p.id === id ? { ...p, is_verified: true } : p));
      setSuccess(`Provider verified successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to verify provider');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Reject provider "${name}"? This will deactivate their account.`)) return;
    setActionLoading(id + '-reject');
    try {
      await adminAPI.rejectProvider(id, { reason: 'Failed KYC verification' });
      setAllProviders(prev => prev.filter(p => p.id !== id));
      setSuccess('Provider rejected and notified.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to reject provider');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = allProviders.filter(p => {
    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && !p.is_verified) ||
      (activeTab === 'verified' && p.is_verified);
    const matchSearch =
      search === '' ||
      `${p.name} ${p.email} ${p.service_category} ${p.ward}`.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabCounts = {
    all: allProviders.length,
    pending: allProviders.filter(p => !p.is_verified).length,
    verified: allProviders.filter(p => p.is_verified).length,
  };

  const tabs = [
    { key: 'pending', label: 'Pending KYC', color: 'text-amber-600', activeBg: 'bg-amber-50 border-amber-300 text-amber-700' },
    { key: 'verified', label: 'Verified', color: 'text-green-600', activeBg: 'bg-green-50 border-green-300 text-green-700' },
    { key: 'all', label: 'All Providers', color: 'text-gray-600', activeBg: 'bg-gray-100 border-gray-300 text-gray-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-[#07535f]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Providers</h1>
          <p className="text-sm text-gray-500">Review KYC submissions, verify or reject provider applications.</p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-1.5 ${
                activeTab === tab.key ? tab.activeBg : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-black rounded-full px-1.5 py-0.5 ${
                activeTab === tab.key ? 'bg-white/60' : 'bg-gray-100'
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-gray-200 min-w-[260px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by name, category, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-sm"
          />
        </div>
      </div>

      {/* Provider Cards */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-700">No providers here</h3>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'pending' ? 'All providers are verified! 🎉' : 'No results found.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Card Header */}
              <div className="px-5 py-4 border-b border-gray-50 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#07535f]/10 flex items-center justify-center text-[#07535f] font-extrabold text-xl flex-shrink-0">
                  {p.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-base">{p.name}</h3>
                    {p.is_verified ? (
                      <span className="flex items-center gap-1 bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Pending KYC
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.email}</p>
                </div>
              </div>

              {/* Card Details */}
              <div className="px-5 py-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-400">Category:</span>
                    <span className="font-bold text-gray-700">{p.service_category || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span>{p.ward || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span>{p.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span>{p.rating_avg ? Number(p.rating_avg).toFixed(1) : '—'} ({p.total_reviews || 0} reviews)</span>
                  </div>
                </div>
                {p.citizenship_no && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-semibold">Citizenship No:</span> {p.citizenship_no}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  Registered: {p.created_at ? format(new Date(p.created_at), 'MMM d, yyyy') : 'N/A'}
                  {p.hourly_rate && <span className="ml-3 font-bold text-[#07535f]">Rs. {p.hourly_rate}/hr</span>}
                </div>
              </div>

              {/* Actions */}
              {!p.is_verified && (
                <div className="px-5 py-3 border-t border-gray-50 flex gap-2">
                  <button
                    onClick={() => handleApprove(p.id)}
                    disabled={actionLoading === p.id + '-approve'}
                    className="flex-1 bg-[#10b981] hover:bg-[#0ea572] disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {actionLoading === p.id + '-approve' ? 'Verifying...' : 'Verify Provider'}
                  </button>
                  <button
                    onClick={() => handleReject(p.id, p.name)}
                    disabled={actionLoading === p.id + '-reject'}
                    className="flex-1 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50 text-red-500 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {actionLoading === p.id + '-reject' ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
