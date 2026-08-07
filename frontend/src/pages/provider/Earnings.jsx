import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { providerAPI } from '../../services/api';
import InteractiveChart from '../../components/InteractiveChart';
import { submitPayoutRequest, getProviderPayoutRequests, fetchProviderPayoutRequestsAsync } from '../../services/payoutStore';
import {
  TrendingUp, DollarSign, Calendar, Clock,
  Award, ChevronRight, Loader, AlertCircle, BarChart2,
  Wallet, ArrowUpRight, CheckCircle2, ShieldCheck, X, Building, Smartphone
} from 'lucide-react';
import { format } from 'date-fns';

const PERIOD_OPTIONS = [
  { label: 'This Week',  value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year',  value: 'year' },
  { label: 'All Time',   value: 'all' },
];

export default function MyEarnings() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [earnings, setEarnings] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Withdraw Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState('esewa'); // 'esewa' | 'khalti' | 'bank'
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState({
    esewaId: '',
    khaltiId: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  // Load payout requests from shared store (syncs with admin)
  const [payoutRequests, setPayoutRequests] = useState([]);

  const refreshPayoutRequests = useCallback(async () => {
    if (user?.id) {
      const data = await fetchProviderPayoutRequestsAsync(user.id);
      setPayoutRequests(data);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshPayoutRequests();
    // Listen for store updates (e.g. admin disbursing a payment)
    const handler = () => refreshPayoutRequests();
    window.addEventListener('payout_store_updated', handler);
    window.addEventListener('storage', handler); // cross-tab sync
    return () => {
      window.removeEventListener('payout_store_updated', handler);
      window.removeEventListener('storage', handler);
    };
  }, [refreshPayoutRequests]);

  useEffect(() => {
    fetchEarnings();
  }, [period]);

  const fetchEarnings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await providerAPI.getEarnings({ period });
      const data = res.data || {};
      const totalAmt = Number(data.estimated_earnings ?? data.total ?? 0);
      const jobsCnt = Number(data.completed_bookings ?? data.total_bookings ?? data.jobs ?? 0);
      setEarnings({
        total: totalAmt,
        jobs: jobsCnt,
        avg: jobsCnt > 0 ? Math.round(totalAmt / jobsCnt) : 0,
      });
      setChartData(Array.isArray(data.chartData) ? data.chartData : []);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch (err) {
      console.warn('Could not load server earnings', err);
      setEarnings({ total: 0, jobs: 0, avg: 0 });
      setChartData([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const total      = Number(earnings?.total ?? 0);
  const jobsCount  = Number(earnings?.jobs ?? 0);
  const avg        = jobsCount > 0 ? Math.round(total / jobsCount) : 0;
  const commission = Math.round(total * 0.10);
  const netTotal   = total - commission;
  
  // Calculate Pending and Completed Withdrawals for exact financial consistency
  const pendingPayouts = payoutRequests
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const completedPayouts = payoutRequests
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Available balance = Net Earnings - (Pending + Completed Withdrawals)
  // Rejections are excluded, so rejected amounts automatically return to Available Balance!
  const availableBalance = Math.max(0, netTotal - pendingPayouts - completedPayouts);

  const handleOpenWithdraw = () => {
    setWithdrawAmount(availableBalance.toString());
    setShowWithdrawModal(true);
    setWithdrawSuccess('');
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }
    if (amountNum > availableBalance && availableBalance > 0) {
      alert(`Withdrawal amount cannot exceed available balance of Rs. ${availableBalance.toLocaleString()}`);
      return;
    }

    // Build account details string based on method
    let acctStr = '';
    if (withdrawMethod === 'esewa') acctStr = `${accountDetails.esewaId} (eSewa)`;
    else if (withdrawMethod === 'khalti') acctStr = `${accountDetails.khaltiId} (Khalti)`;
    else acctStr = `${accountDetails.bankName} - A/C ${accountDetails.accountNumber}`;

    setWithdrawing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Save to shared payout store so admin can see it
      const newReq = await submitPayoutRequest({
        provider_id: user?.id,
        provider_name: user?.name || 'Unknown',
        provider_email: user?.email || '',
        category: user?.service_category || 'General',
        amount: amountNum,
        method: withdrawMethod === 'esewa' ? 'eSewa' : withdrawMethod === 'khalti' ? 'Khalti' : 'Bank Transfer',
        account_details: acctStr,
      });

      // Also add to local transaction list for immediate UI feedback
      setPayments(prev => [{
        id: newReq.id,
        amount: amountNum,
        status: 'pending',
        created_at: newReq.requested_at,
        method: newReq.method,
      }, ...prev]);

      refreshPayoutRequests();

      setWithdrawSuccess(`Payout request of Rs. ${amountNum.toLocaleString()} via ${newReq.method} submitted! Admin will process your payment within 24 hours.`);
      
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawSuccess('');
      }, 2500);

    } catch (err) {
      alert('Failed to process withdrawal request. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Merge server payments with payout store requests for unified history
  const mergedPayments = (() => {
    const storeIds = new Set(payoutRequests.map(r => r.id));
    // Update local payments with live status from store
    const updatedPayments = payments.map(p => {
      if (storeIds.has(p.id)) {
        const storeReq = payoutRequests.find(r => r.id === p.id);
        return { ...p, status: storeReq.status };
      }
      return p;
    });
    // Add any store requests not yet in payments list
    const existingIds = new Set(updatedPayments.map(p => p.id));
    const newFromStore = payoutRequests
      .filter(r => !existingIds.has(r.id))
      .map(r => ({ id: r.id, amount: r.amount, status: r.status, created_at: r.requested_at, method: r.method }));
    return [...newFromStore, ...updatedPayments];
  })();

  const barMax = mergedPayments.length ? Math.max(...mergedPayments.map(p => Number(p.amount) || 0)) : 1;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Earnings & Payouts</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Track revenue, platform commissions, and request instant withdrawals</p>
          </div>

          {/* Period Filter */}
          <div className="bg-white border border-gray-200 p-1 rounded-2xl flex items-center gap-1 shadow-xs self-start">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  period === opt.value
                    ? 'bg-[#07535f] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Withdrawal Highlight Banner */}
        <div className="bg-gradient-to-r from-[#07535f] via-[#06424b] to-[#0a6c7c] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <Wallet className="w-64 h-64 text-white" />
          </div>

          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Available for Withdrawal
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight">
              Rs. {availableBalance.toLocaleString()}
            </div>
            <div className="flex items-center gap-3 pt-1 flex-wrap">
              {pendingPayouts > 0 && (
                <span className="bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                  ⏳ Pending Hold: Rs. {pendingPayouts.toLocaleString()}
                </span>
              )}
              {completedPayouts > 0 && (
                <span className="bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                  ✓ Total Disbursed: Rs. {completedPayouts.toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-xs text-white/80 max-w-md pt-1">
              Net earnings after 10% platform fee minus pending/processed withdrawals. If admin rejects a request, funds automatically return here.
            </p>
          </div>

          <button
            onClick={handleOpenWithdraw}
            className="z-10 bg-[#10b981] hover:bg-[#0ea572] active:scale-95 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-md transition-all flex items-center gap-2 text-sm group"
          >
            <Wallet className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Withdraw Payment</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-[#07535f]" />
            <p className="text-sm font-semibold">Loading earnings details...</p>
          </div>
        ) : (
          <>
            {/* 4 Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Gross Income</p>
                  <p className="text-xl font-extrabold text-gray-900 mt-0.5">Rs. {total.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Net Earnings</p>
                  <p className="text-xl font-extrabold text-[#10b981] mt-0.5">Rs. {netTotal.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Platform Fee (10%)</p>
                  <p className="text-xl font-extrabold text-amber-700 mt-0.5">Rs. {commission.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Completed Jobs</p>
                  <p className="text-xl font-extrabold text-gray-900 mt-0.5">{jobsCount}</p>
                </div>
              </div>
            </div>

            {/* Dynamic Interactive Chart */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
              <InteractiveChart
                data={chartData}
                title="Earnings Trend & Performance"
                subtitle={`Completed job revenues for ${PERIOD_OPTIONS.find(p => p.value === period)?.label || period}`}
                valuePrefix="Rs. "
                metricKey="value"
                height={200}
                defaultChartType="bar"
                showControls={true}
                className="!p-0 !border-0 !shadow-none"
              />
            </div>

            {/* Average Job Income Banner */}
            {jobsCount > 0 && (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-xs text-emerald-900 font-semibold">
                  Average revenue of <strong className="text-emerald-700 text-sm">Rs. {avg.toLocaleString()}</strong> per completed service booking in this period.
                </div>
              </div>
            )}

            {/* Payment & Payout History */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Transaction & Payout History</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Recent earnings deposits and withdrawal logs</p>
                </div>
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  {mergedPayments.length} Records
                </span>
              </div>

              {mergedPayments.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <DollarSign className="w-10 h-10 mx-auto opacity-30 text-gray-400" />
                  <p className="text-sm font-semibold">No payment records found for this period</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {mergedPayments.map((p, i) => {
                    const amt = Number(p.amount) || 0;
                    const isWithdrawal = p.id?.startsWith('PW-') || p.id?.startsWith('WITHDRAW');
                    const dateStr = p.created_at
                      ? format(new Date(p.created_at), 'dd MMM yyyy, hh:mm a')
                      : '—';

                    return (
                      <div key={p.id || i} className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isWithdrawal ? 'bg-amber-50 text-amber-600' : 'bg-[#07535f]/10 text-[#07535f]'
                          }`}>
                            {isWithdrawal ? <Wallet className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">
                              {isWithdrawal ? `Withdrawal Request (${p.method || 'Payout'})` : `Service Booking #${p.booking_id || p.id}`}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className={`font-extrabold text-sm ${isWithdrawal ? 'text-amber-700' : 'text-gray-900'}`}>
                              {isWithdrawal ? `- Rs. ${amt.toLocaleString()}` : `+ Rs. ${amt.toLocaleString()}`}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {isWithdrawal
                                ? (p.status === 'completed' ? 'Admin Paid ✓' : 'Awaiting Admin Disbursal')
                                : `Net: Rs. ${Math.round(amt * 0.9).toLocaleString()}`
                              }
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${
                            p.status === 'completed' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : p.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status === 'completed' ? 'Paid' : p.status === 'rejected' ? 'Rejected' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Platform Policy Info */}
            <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
              <p className="font-bold">💡 Gharelu Sewa Payout Policy:</p>
              <p className="text-amber-800 leading-relaxed">
                Platform fee of 10% is automatically calculated on job completion. Withdrawals requested via eSewa, Khalti, or Direct Bank Transfer are processed within 24 hours.
              </p>
            </div>
          </>
        )}

        {/* WITHDRAW PAYMENT MODAL */}
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-150">
              
              {/* Close Button */}
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#10b981] flex items-center justify-center mb-2">
                  <Wallet className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">Withdraw Earnings</h3>
                <p className="text-xs text-gray-500">Transfer funds to your mobile wallet or bank account</p>
              </div>

              {withdrawSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-emerald-900">{withdrawSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleWithdrawSubmit} className="space-y-5">

                  {/* Available Balance Notice */}
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-semibold">Available for Payout:</span>
                    <span className="font-extrabold text-[#07535f] text-sm">Rs. {availableBalance.toLocaleString()}</span>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Withdrawal Amount (Rs.)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="100"
                        max={availableBalance || 50000}
                        required
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#07535f] focus:ring-2 focus:ring-[#07535f]/20 outline-none font-bold text-gray-900 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(availableBalance.toString())}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold bg-[#07535f]/10 text-[#07535f] hover:bg-[#07535f]/20 px-2 py-1 rounded-lg"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Select Payout Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setWithdrawMethod('esewa')}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                          withdrawMethod === 'esewa'
                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs">eSewa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWithdrawMethod('khalti')}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                          withdrawMethod === 'khalti'
                            ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-bold ring-2 ring-purple-500/20'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-purple-600" />
                        <span className="text-xs">Khalti</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWithdrawMethod('bank')}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                          withdrawMethod === 'bank'
                            ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-bold ring-2 ring-blue-500/20'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Building className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-semibold">Bank</span>
                      </button>
                    </div>
                  </div>

                  {/* Account Input Fields */}
                  {withdrawMethod === 'esewa' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">eSewa Registered Mobile No.</label>
                      <input
                        type="text"
                        required
                        placeholder="98XXXXXXXX"
                        value={accountDetails.esewaId}
                        onChange={(e) => setAccountDetails({ ...accountDetails, esewaId: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:border-[#07535f] outline-none"
                      />
                    </div>
                  )}

                  {withdrawMethod === 'khalti' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Khalti Registered Mobile No.</label>
                      <input
                        type="text"
                        required
                        placeholder="98XXXXXXXX"
                        value={accountDetails.khaltiId}
                        onChange={(e) => setAccountDetails({ ...accountDetails, khaltiId: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:border-[#07535f] outline-none"
                      />
                    </div>
                  )}

                  {withdrawMethod === 'bank' && (
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Nabil Bank / NIC Asia"
                          value={accountDetails.bankName}
                          onChange={(e) => setAccountDetails({ ...accountDetails, bankName: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Account Number</label>
                        <input
                          type="text"
                          required
                          placeholder="Account Number"
                          value={accountDetails.accountNumber}
                          onChange={(e) => setAccountDetails({ ...accountDetails, accountNumber: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={withdrawing}
                    className="w-full bg-[#10b981] hover:bg-[#0ea572] text-white py-3 rounded-2xl text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {withdrawing ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" /> Processing Payout...
                      </>
                    ) : (
                      `Submit Withdrawal — Rs. ${parseFloat(withdrawAmount || 0).toLocaleString()}`
                    )}
                  </button>

                </form>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
