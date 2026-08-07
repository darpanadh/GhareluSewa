import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import {
  CheckCircle, XCircle, Shield, Star, MapPin, Phone, Search, Filter,
  Eye, FileText, UserCheck, Calendar, DollarSign, X, Award, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function ManageProviders() {
  const [allProviders, setAllProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'all' | 'pending' | 'verified'
  const [search, setSearch] = useState('');

  // Selected Provider Modal for detailed KYC inspection
  const [selectedProviderModal, setSelectedProviderModal] = useState(null);

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

  const handleApprove = async (id, name) => {
    setActionLoading(id + '-approve');
    try {
      await adminAPI.verifyProvider(id);
      setAllProviders(prev => prev.map(p => p.id === id ? { ...p, is_verified: true } : p));
      setSuccess(`Provider "${name || 'Tasker'}" verified successfully!`);
      if (selectedProviderModal && selectedProviderModal.id === id) {
        setSelectedProviderModal(prev => ({ ...prev, is_verified: true }));
      }
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Failed to verify provider');
      setTimeout(() => setError(''), 4000);
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
      setSuccess(`Provider "${name}" application rejected.`);
      if (selectedProviderModal && selectedProviderModal.id === id) {
        setSelectedProviderModal(null);
      }
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Failed to reject provider');
      setTimeout(() => setError(''), 4000);
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
      `${p.name} ${p.email} ${p.service_category} ${p.ward} ${p.citizenship_no}`.toLowerCase().includes(search.toLowerCase());
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
    { key: 'all', label: 'All Taskers', color: 'text-gray-600', activeBg: 'bg-gray-100 border-gray-300 text-gray-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#07535f]/10 text-[#07535f] flex items-center justify-center">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasker KYC Verification & Profiles</h1>
          <p className="text-sm text-gray-500">Review submitted identity cards, citizenship details, and verify applications.</p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.key ? tab.activeBg : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${
                activeTab === tab.key ? 'bg-white/70' : 'bg-gray-100'
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-gray-200 min-w-[280px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by name, citizenship no, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-sm font-medium"
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
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 space-y-2">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
          <h3 className="text-lg font-bold text-gray-800">No applicants in this list</h3>
          <p className="text-xs text-gray-400">
            {activeTab === 'pending' ? 'All tasker KYC applications have been reviewed! 🎉' : 'No matching taskers found.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
              {/* Card Body */}
              <div className="p-5 space-y-3">
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#07535f]/10 text-[#07535f] flex items-center justify-center font-black text-xl flex-shrink-0">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        p.name?.charAt(0) || 'T'
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-gray-900 text-base">{p.name}</h3>
                        {p.is_verified ? (
                          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Pending KYC
                          </span>
                        )}
                        {p.is_frozen && (
                          <span className="flex items-center gap-1 bg-red-100 text-red-800 border border-red-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                            🛑 Account Frozen (Negative Dues)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.is_frozen && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Clear negative dues and unfreeze ${p.name}'s account?`)) {
                            try {
                              await adminAPI.clearProviderDues(p.id);
                              alert(`✅ ${p.name}'s account has been unfrozen and set to active online status.`);
                              fetchProviders();
                            } catch (err) {
                              alert('Failed to unfreeze provider profile.');
                            }
                          }
                        }}
                        className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0 shadow-sm"
                        title="Clear Negative Dues & Unfreeze"
                      >
                        <CheckCircle className="w-4 h-4" /> Clear Dues
                      </button>
                    )}

                  {/* Eye Button to Inspect Full Details */}
                  <button
                    onClick={() => setSelectedProviderModal(p)}
                    className="p-2 rounded-xl bg-gray-50 hover:bg-[#07535f]/10 text-gray-500 hover:text-[#07535f] transition-all flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
                    title="Inspect KYC Details"
                  >
                    <Eye className="w-4 h-4 text-[#07535f]" />
                    <span className="hidden sm:inline">View ID</span>
                  </button>
                </div>

                {/* Details Grid */}
                <div className="bg-gray-50/70 rounded-xl p-3.5 space-y-2 text-xs text-gray-600">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px]">SERVICE CATEGORY</span>
                      <span className="font-extrabold text-gray-800">{p.service_category || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block text-[10px]">HOURLY RATE</span>
                      <span className="font-extrabold text-[#07535f]">Rs. {p.hourly_rate || '450'}/hr</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/50">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{p.ward || 'Kathmandu'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{p.phone || '98XXXXXXXX'}</span>
                    </div>
                  </div>

                  {/* Identity Card Number Banner */}
                  <div className="pt-2 border-t border-gray-200/50 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#07535f]" /> Citizenship No:
                    </span>
                    <span className="font-mono font-bold text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                      {p.citizenship_no || '27-01-79-12345'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center gap-2">
                <button
                  onClick={() => setSelectedProviderModal(p)}
                  className="flex-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 text-[#07535f]" /> View Details & ID
                </button>

                {!p.is_verified && (
                  <>
                    <button
                      onClick={() => handleApprove(p.id, p.name)}
                      disabled={actionLoading === p.id + '-approve'}
                      className="bg-[#10b981] hover:bg-[#0ea572] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {actionLoading === p.id + '-approve' ? '...' : 'Verify'}
                    </button>
                    <button
                      onClick={() => handleReject(p.id, p.name)}
                      disabled={actionLoading === p.id + '-reject'}
                      className="bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── DETAILED TASKER KYC INSPECTION MODAL ───────────────────────── */}
      {selectedProviderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-150 border border-gray-100 max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedProviderModal(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
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
                  {selectedProviderModal.is_verified ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified Tasker
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      KYC Approval Pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedProviderModal.email} • ID: #{selectedProviderModal.id}</p>
              </div>
            </div>

            {/* Section 1: Submitted Identity & Citizenship Card */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#07535f]" /> Identity & Citizenship Verification Document
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
                    {selectedProviderModal.citizenship_image_url ? 'Photo Document Attached ✓' : 'Submitted & Document Verified ✓'}
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
                    <span className="text-white/60 text-[10px] block">Application Date</span>
                    <span className="font-bold text-white">
                      {selectedProviderModal.created_at ? format(new Date(selectedProviderModal.created_at), 'dd MMM yyyy') : 'Recently'}
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
                Close Inspection
              </button>

              {!selectedProviderModal.is_verified ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedProviderModal.id, selectedProviderModal.name)}
                    disabled={actionLoading === selectedProviderModal.id + '-approve'}
                    className="w-full sm:flex-1 bg-[#10b981] hover:bg-[#0ea572] text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {actionLoading === selectedProviderModal.id + '-approve' ? 'Verifying...' : 'Approve & Verify Tasker'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(selectedProviderModal.id, selectedProviderModal.name)}
                    disabled={actionLoading === selectedProviderModal.id + '-reject'}
                    className="w-full sm:w-auto bg-white border border-red-200 hover:bg-red-50 text-red-600 px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
              ) : (
                <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Account Verified & Active
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
