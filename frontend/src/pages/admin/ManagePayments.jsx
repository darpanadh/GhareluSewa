import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import {
  getAllPayoutRequests, fetchAllPayoutRequestsAsync, markPayoutCompleted, markPayoutRejected, getPayoutStats
} from '../../services/payoutStore';
import {
  CreditCard, DollarSign, TrendingUp, CheckCircle, XCircle,
  Building, Smartphone, ArrowUpRight, Search, Filter, RefreshCw, Send,
  ShieldCheck, Loader, AlertTriangle, Users, Wallet, X
} from 'lucide-react';
import { format } from 'date-fns';

export default function ManagePayments() {
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed'
  const [stats, setStats] = useState(null);

  // Custom Confirmation Modal State: null | { type: 'approve' | 'reject', requestId, providerName, amount, method, accountDetails }
  const [confirmModal, setConfirmModal] = useState(null);

  // Load data from backend server & shared store
  const refreshData = useCallback(async () => {
    const requests = await fetchAllPayoutRequestsAsync();
    setPayoutRequests(requests);
    setStats(getPayoutStats());
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
    // Listen for real-time updates from provider side
    const handler = () => refreshData();
    window.addEventListener('payout_store_updated', handler);
    window.addEventListener('storage', handler);
    // Also poll every 5 seconds for cross-tab updates
    const interval = setInterval(refreshData, 5000);
    return () => {
      window.removeEventListener('payout_store_updated', handler);
      window.removeEventListener('storage', handler);
      clearInterval(interval);
    };
  }, [refreshData]);

  const triggerSendPayment = (req) => {
    setConfirmModal({
      type: 'approve',
      requestId: req.id,
      providerName: req.provider_name,
      amount: req.amount,
      method: req.method,
      accountDetails: req.account_details,
    });
  };

  const triggerRejectPayout = (req) => {
    setConfirmModal({
      type: 'reject',
      requestId: req.id,
      providerName: req.provider_name,
      amount: req.amount,
      method: req.method,
      accountDetails: req.account_details,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { type, requestId, providerName, amount, method } = confirmModal;

    setProcessingId(requestId);
    try {
      if (type === 'approve') {
        await markPayoutCompleted(requestId);
        setSuccessMsg(`✅ Payment of Rs. ${(Number(amount) || 0).toLocaleString()} successfully sent to ${providerName} via ${method}!`);
      } else {
        await markPayoutRejected(requestId);
        setSuccessMsg(`Payout request from ${providerName} has been rejected.`);
      }
      refreshData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert('Failed to update payout request status. Please try again.');
    } finally {
      setProcessingId(null);
      setConfirmModal(null);
    }
  };

  // Financial overview calculations
  const totalVolume = (stats?.totalRequested || 0) + 29500; // include historical
  const platformRevenue = Math.round(totalVolume * 0.10);

  const filteredRequests = payoutRequests.filter(p => filter === 'all' || p.status === filter);
  const pendingRequests = payoutRequests.filter(p => p.status === 'pending');

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#07535f]/10 text-[#07535f] flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments & Professional Payouts</h1>
            <p className="text-sm text-gray-500">Review withdrawal requests from professionals and disburse payments</p>
          </div>
        </div>

        <button
          onClick={refreshData}
          className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Urgent: Pending Requests Alert */}
      {pendingRequests.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-bold text-amber-900">{pendingRequests.length} pending payout request{pendingRequests.length > 1 ? 's' : ''}</span>
            <span className="text-amber-700"> totaling Rs. {pendingRequests.reduce((s, r) => s + (Number(r.amount) || 0), 0).toLocaleString()} — awaiting your action.</span>
          </div>
        </div>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Card 1: Total Platform Volume */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Transactions</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900">Rs. {totalVolume.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400">Gross volume processed on platform</p>
        </div>

        {/* Card 2: Platform Revenue (10% Commission) */}
        <div className="bg-gradient-to-br from-[#07535f] to-[#0d7182] p-6 rounded-2xl text-white shadow-md space-y-2 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
            <TrendingUp className="w-32 h-32" />
          </div>
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold text-teal-200 uppercase tracking-wider">Platform Revenue (10%)</span>
            <div className="w-9 h-9 rounded-xl bg-white/10 text-emerald-300 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white relative z-10">Rs. {platformRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-teal-100/80 relative z-10">Net platform earnings from commissions</p>
        </div>

        {/* Card 3: Disbursed */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Disbursed</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600">Rs. {(stats?.totalDisbursed || 0).toLocaleString()}</p>
          <p className="text-[11px] text-gray-400">{stats?.completedCount || 0} payouts completed</p>
        </div>

        {/* Card 4: Pending Payouts */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Payouts</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600">Rs. {(stats?.totalPending || 0).toLocaleString()}</p>
          <p className="text-[11px] text-gray-400">{stats?.pendingCount || 0} request{(stats?.pendingCount || 0) !== 1 ? 's' : ''} awaiting action</p>
        </div>

      </div>

      {/* Professional Payout Requests Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Professional Withdrawal Requests</h2>
            <p className="text-xs text-gray-400 mt-0.5">Review and disburse payments to service professionals</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'all' ? 'bg-[#07535f] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({payoutRequests.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Pending ({stats?.pendingCount || 0})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Paid ({stats?.completedCount || 0})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-[#07535f]" />
            <p className="text-sm font-semibold">Loading payout requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <Wallet className="w-12 h-12 mx-auto opacity-30" />
            <p className="text-sm font-semibold">
              {filter === 'pending'
                ? 'No pending payout requests! All professionals are paid up. 🎉'
                : filter === 'completed'
                ? 'No completed payouts yet.'
                : 'No withdrawal requests received from professionals yet.'}
            </p>
            <p className="text-xs text-gray-400">
              When a professional requests a withdrawal from their Earnings page, it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredRequests.map(req => (
              <div key={req.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                
                {/* Left: Provider Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#07535f]/10 text-[#07535f] flex items-center justify-center font-extrabold text-lg flex-shrink-0">
                    {req.provider_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900 text-sm">{req.provider_name}</h4>
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{req.id}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{req.provider_email} • <span className="font-semibold text-[#07535f]">{req.category}</span></p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        {req.method === 'eSewa' ? (
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        ) : req.method === 'Khalti' ? (
                          <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                        ) : (
                          <Building className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span className="font-bold">{req.method}</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-mono text-gray-500">{req.account_details}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Requested: {req.requested_at ? format(new Date(req.requested_at), 'dd MMM yyyy, hh:mm a') : '—'}
                      {req.processed_at && (
                        <span className="ml-2 text-emerald-600 font-semibold">
                          • Processed: {format(new Date(req.processed_at), 'dd MMM yyyy, hh:mm a')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Amount + Actions */}
                <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900">Rs. {(Number(req.amount) || 0).toLocaleString()}</p>
                    <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      req.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status === 'completed' ? 'Payment Sent' : req.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </div>

                  {req.status === 'pending' ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => triggerSendPayment(req)}
                        disabled={processingId === req.id}
                        className="bg-[#10b981] hover:bg-[#0ea572] active:scale-95 disabled:opacity-50 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{processingId === req.id ? 'Sending...' : 'Send Payment'}</span>
                      </button>
                      <button
                        onClick={() => triggerRejectPayout(req)}
                        disabled={processingId === req.id}
                        className="bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50 text-red-600 text-xs font-bold px-5 py-2 rounded-xl transition-all flex items-center gap-1.5 justify-center cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {req.status === 'completed' ? (
                        <span className="text-emerald-600 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Paid</span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1"><XCircle className="w-4 h-4" /> Rejected</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Commission Info */}
      <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
        <p className="font-bold">💡 How Payout Processing Works:</p>
        <p className="text-amber-800 leading-relaxed">
          When a professional requests a withdrawal from their Earnings page, it appears here as a "Pending" request.
          Click <strong>"Send Payment"</strong> to disburse funds via their chosen method (eSewa / Khalti / Bank).
          The professional's dashboard will instantly update to show "Paid" status.
          Platform retains 10% commission from each job automatically.
        </p>
      </div>

      {/* Custom Confirmation Modal (Replaces browser alert/confirm popup) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-150 border border-gray-100">
            
            {/* Close X Button */}
            <button
              onClick={() => setConfirmModal(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header / Icon */}
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${
                confirmModal.type === 'approve' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>
                {confirmModal.type === 'approve' ? <Send className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">
                  {confirmModal.type === 'approve' ? 'Disburse Payment' : 'Reject Payout Request'}
                </h3>
                <p className="text-xs text-gray-500">
                  {confirmModal.type === 'approve' ? 'Confirm financial transfer to professional' : 'Decline withdrawal request'}
                </p>
              </div>
            </div>

            {/* Details Box */}
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-2.5 text-xs text-gray-700">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-500 font-semibold">Professional:</span>
                <span className="font-extrabold text-gray-900 text-sm">{confirmModal.providerName}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-500 font-semibold">Payout Amount:</span>
                <span className={`font-black text-base ${confirmModal.type === 'approve' ? 'text-emerald-600' : 'text-gray-900'}`}>
                  Rs. {(Number(confirmModal.amount) || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-semibold">Payment Destination:</span>
                <span className="font-bold text-[#07535f]">{confirmModal.method} ({confirmModal.accountDetails})</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              {confirmModal.type === 'approve'
                ? 'Are you sure you want to mark this payout as completed? The professional will see funds marked as Paid.'
                : 'Rejecting this request will restore the requested funds back to the professional\'s available balance.'}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={processingId === confirmModal.requestId}
                className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={processingId === confirmModal.requestId}
                className={`flex-1 text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                  confirmModal.type === 'approve'
                    ? 'bg-[#10b981] hover:bg-[#0ea572]'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processingId === confirmModal.requestId ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  confirmModal.type === 'approve' ? 'Confirm Payment' : 'Confirm Rejection'
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
