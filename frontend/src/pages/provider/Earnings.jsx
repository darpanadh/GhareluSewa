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
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

export default function MyEarnings() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [earnings, setEarnings] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Server earnings state (for cash deduction / freeze logic)
  const [serverEarnings, setServerEarnings] = useState(null);
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);

  // Settle Dues State
  const [selectedDuesMethod, setSelectedDuesMethod] = useState('esewa');
  const [settlingDues, setSettlingDues] = useState(false);
  const [settleSuccess, setSettleSuccess] = useState('');
  const [settleError, setSettleError] = useState('');

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
      try {
        const data = await fetchProviderPayoutRequestsAsync(user.id);
        setPayoutRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to refresh payout requests', err);
        setPayoutRequests([]);
      }
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
      setServerEarnings(data);
      const totalAmt = Number(data.total ?? data.estimated_earnings ?? 0);
      const netAmt = Number(data.net_earnings ?? 0);
      const jobsCnt = Number(data.completed_bookings ?? data.total_bookings ?? data.jobs ?? 0);
      setEarnings({
        total: totalAmt,
        net: netAmt,
        commission: Number(data.commission ?? 0),
        pendingEscrow: Number(data.pending_escrow ?? 0),
        jobs: jobsCnt,
        avg: jobsCnt > 0 ? Math.round(netAmt / jobsCnt) : 0,
      });
      setChartData(Array.isArray(data.chartData) ? data.chartData : []);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch (err) {
      console.warn('Could not load server earnings', err);
      setEarnings({ total: 0, net: 0, commission: 0, pendingEscrow: 0, jobs: 0, avg: 0 });
      setChartData([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const safePayoutRequests = Array.isArray(payoutRequests) ? payoutRequests : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const total = Number(earnings?.total) || 0;
  const netTotal = earnings?.net !== undefined ? Number(earnings.net) : Math.max(0, total - Math.round(total * 0.10));
  const commission = earnings?.commission !== undefined ? Number(earnings.commission) : Math.round(total * 0.10);
  const pendingEscrow = Number(earnings?.pendingEscrow ?? serverEarnings?.pending_escrow) || 0;
  const jobsCount = Number(earnings?.jobs) || 0;
  const avg = jobsCount > 0 ? Math.round(netTotal / jobsCount) : 0;

  // Calculate Pending and Completed Withdrawals for exact financial consistency
  const pendingPayouts = safePayoutRequests
    .filter(r => r && r.status === 'pending')
    .reduce((sum, r) => sum + (Number(r?.amount) || 0), 0);

  const completedPayouts = safePayoutRequests
    .filter(r => r && r.status === 'completed')
    .reduce((sum, r) => sum + (Number(r?.amount) || 0), 0);

  // Available balance = Net Released Earnings - (Pending + Completed Withdrawals)
  const availableBalance = serverEarnings?.available_balance !== undefined
    ? Math.max(0, (Number(serverEarnings.available_balance) || 0) - pendingPayouts)
    : Math.max(0, netTotal - pendingPayouts - completedPayouts);

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
    const storeIds = new Set(safePayoutRequests.map(r => r?.id).filter(Boolean));
    // Update local payments with live status from store
    const updatedPayments = safePayments.map(p => {
      if (p && storeIds.has(p.id)) {
        const storeReq = safePayoutRequests.find(r => r && r.id === p.id);
        return { ...p, status: storeReq?.status || p.status };
      }
      return p;
    });
    // Add any store requests not yet in payments list
    const existingIds = new Set(updatedPayments.map(p => p?.id).filter(Boolean));
    const newFromStore = safePayoutRequests
      .filter(r => r && !existingIds.has(r.id))
      .map(r => ({ id: r.id, amount: r.amount, status: r.status, created_at: r.requested_at, method: r.method }));
    return [...newFromStore, ...updatedPayments];
  })();

  const barMax = mergedPayments.length ? Math.max(...mergedPayments.map(p => Number(p.amount) || 0)) : 1;

  // ── Cash deduction / negative balance / freeze logic ──
  const calcAvailableBalance = serverEarnings?.available_balance !== undefined
    ? Number(serverEarnings.available_balance) || 0
    : netTotal - pendingPayouts - completedPayouts;
  const isNegative = calcAvailableBalance < 0;
  const isFrozen = serverEarnings?.is_frozen || false;
  const daysRemaining = serverEarnings?.days_remaining ?? 3;

  const handleSettleDuesSubmit = async (e) => {
    if (e) e.preventDefault();
    const amountToSettle = Math.abs(calcAvailableBalance);
    if (!amountToSettle || amountToSettle <= 0) return;

    setSettlingDues(true);
    setSettleError('');
    setSettleSuccess('');

    try {
      const res = await providerAPI.settleDues({
        amount: amountToSettle,
        payment_method: selectedDuesMethod,
      });

      setSettleSuccess(res.data?.message || `Successfully paid Rs. ${amountToSettle} dues! Account unfrozen.`);
      await fetchEarnings();

      setTimeout(() => {
        setShowContactAdminModal(false);
        setSettleSuccess('');
      }, 2200);
    } catch (err) {
      setSettleError(err?.response?.data?.error || 'Failed to process dues payment. Please try again.');
    } finally {
      setSettlingDues(false);
    }
  };

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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${period === opt.value
                    ? 'bg-[#07535f] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Withdrawal / Negative Balance Highlight Banner */}
        <div className={`rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden transition-all ${isFrozen
            ? 'bg-gradient-to-r from-red-800 via-rose-900 to-red-950 border-2 border-red-500'
            : isNegative
              ? 'bg-gradient-to-r from-amber-700 via-orange-800 to-rose-900 border-2 border-amber-400'
              : 'bg-gradient-to-r from-[#07535f] via-[#06424b] to-[#0a6c7c]'
          }`}>
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <Wallet className="w-64 h-64 text-white" />
          </div>

          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
              {isFrozen ? (
                <span className="text-red-300 flex items-center gap-1.5 font-extrabold bg-red-950/60 px-3 py-1 rounded-full border border-red-400/30">
                  <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" /> 🛑 ACCOUNT FROZEN — OVERDUE PLATFORM DUES
                </span>
              ) : isNegative ? (
                <span className="text-amber-300 flex items-center gap-1.5 font-extrabold bg-amber-950/60 px-3 py-1 rounded-full border border-amber-400/30">
                  <AlertCircle className="w-4 h-4 text-amber-400 animate-bounce" /> ⚠️ NEGATIVE BALANCE — {daysRemaining} DAY TRIAL REMAINING
                </span>
              ) : (
                <span className="text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Available for Withdrawal
                </span>
              )}
            </div>

            <div className="text-4xl sm:text-5xl font-black tracking-tight">
              Rs. {calcAvailableBalance.toLocaleString()}
            </div>

            <div className="flex items-center gap-3 pt-1 flex-wrap">
              {isNegative && (
                <span className="bg-rose-900/60 border border-rose-400/40 text-rose-200 text-[11px] font-bold px-3 py-1 rounded-lg">
                  10% Commission on Cash Jobs Exceeds Wallet Balance
                </span>
              )}
              {pendingEscrow > 0 && (
                <span className="bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                  🔒 Held in Admin Escrow: Rs. {pendingEscrow.toLocaleString()}
                </span>
              )}
              {pendingPayouts > 0 && !isNegative && (
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

            <p className="text-xs text-white/80 max-w-md pt-1 leading-relaxed">
              {isFrozen
                ? 'Your account has been frozen because negative 10% platform fee dues were not cleared within the 3-day trial period. Please contact Admin immediately to settle dues and reactivate your profile.'
                : isNegative
                  ? `10% platform fee for cash jobs is deducted from your balance. You have a ${daysRemaining}-day grace period to clear your negative dues with Admin before account auto-freezes.`
                  : 'Net earnings after 10% platform fee minus pending/processed withdrawals. If admin rejects a request, funds automatically return here.'
              }
            </p>
          </div>

          {isNegative || isFrozen ? (
            <button
              onClick={() => setShowContactAdminModal(true)}
              className="z-10 bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold px-6 py-3.5 rounded-2xl shadow-xl transition-all flex items-center gap-2 text-sm cursor-pointer hover:scale-105"
            >
              <Smartphone className="w-4 h-4" />
              <span>Contact Admin to Clear Dues</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleOpenWithdraw}
              className="z-10 bg-[#10b981] hover:bg-[#0ea572] active:scale-95 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-md transition-all flex items-center gap-2 text-sm group cursor-pointer"
            >
              <Wallet className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Withdraw Payment</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
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
                    if (!p) return null;
                    const amt = Number(p.amount) || 0;
                    const pIdStr = String(p.id || '');
                    const isWithdrawal = pIdStr.startsWith('PW-') || pIdStr.startsWith('WITHDRAW');
                    let dateStr = '—';
                    try {
                      if (p.created_at) {
                        const d = new Date(p.created_at);
                        if (!isNaN(d.getTime())) {
                          dateStr = format(d, 'dd MMM yyyy, hh:mm a');
                        }
                      }
                    } catch {
                      dateStr = '—';
                    }

                    return (
                      <div key={p.id || i} className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${isWithdrawal ? 'bg-amber-50 text-amber-600' : 'bg-[#07535f]/10 text-[#07535f]'
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
                          <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${isWithdrawal
                              ? (p.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : p.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800')
                              : (p.escrow_released ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
                            }`}>
                            {isWithdrawal
                              ? (p.status === 'completed' ? 'Disbursed' : p.status === 'rejected' ? 'Rejected' : 'Pending Payout')
                              : (p.escrow_released ? 'Released to Balance ✓' : 'In Escrow (Awaiting Release)')}
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
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${withdrawMethod === 'esewa'
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
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${withdrawMethod === 'khalti'
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
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${withdrawMethod === 'bank'
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

        {/* CLEAR NEGATIVE DUES & UNFREEZE ACCOUNT MODAL */}
        {showContactAdminModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowContactAdminModal(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-1 font-bold">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">Clear Negative Dues & Unfreeze Account</h3>
                <p className="text-xs text-gray-500">Pay 10% platform cash commission dues to restore your profile to active status.</p>
              </div>

              {settleSuccess ? (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2.5 my-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-emerald-900 leading-snug">{settleSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleSettleDuesSubmit} className="space-y-4">
                  <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-800 font-semibold">Overdue Platform Dues:</span>
                      <span className="text-xl font-black text-rose-700">Rs. {Math.abs(calcAvailableBalance).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-amber-200/60 pt-2">
                      <span className="text-amber-800 font-medium">Status / Grace Period:</span>
                      <span className="font-extrabold text-amber-900 flex items-center gap-1">
                        {isFrozen ? '🛑 Account Frozen' : `⏳ ${daysRemaining} Days Trial Remaining`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="block font-bold text-gray-800">
                      Select Payment Method to Settle Dues:
                    </label>

                    {/* eSewa / Khalti Selector Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedDuesMethod('esewa')}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        selectedDuesMethod === 'esewa'
                          ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          eS
                        </div>
                        <div>
                          <p className="font-bold text-emerald-950 text-xs">eSewa / Khalti Direct</p>
                          <p className="text-[11px] text-emerald-700 font-mono">9841000000 (Gharelu Sewa Admin)</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        selectedDuesMethod === 'esewa' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedDuesMethod === 'esewa' ? 'Selected ✓' : 'Primary'}
                      </span>
                    </button>

                    {/* Direct Bank Transfer Selector Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedDuesMethod('bank')}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        selectedDuesMethod === 'bank'
                          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-blue-950 text-xs">Direct Bank Transfer</p>
                          <p className="text-[11px] text-blue-700">NIC Asia Bank - A/C 012345678910</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        selectedDuesMethod === 'bank' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedDuesMethod === 'bank' ? 'Selected ✓' : 'Bank'}
                      </span>
                    </button>
                  </div>

                  {settleError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                      {settleError}
                    </div>
                  )}

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-[11px] text-gray-600 leading-relaxed flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#07535f] shrink-0 mt-0.5" />
                    <span>
                      Clicking <strong>Pay & Settle Dues Now</strong> will process your settlement of <strong>Rs. {Math.abs(calcAvailableBalance).toLocaleString()}</strong> via {selectedDuesMethod === 'esewa' ? 'eSewa / Khalti' : 'Bank Transfer'} and automatically unfreeze your provider profile immediately.
                    </span>
                  </div>

                  {/* Primary Pay & Settle Dues Button */}
                  <button
                    type="submit"
                    disabled={settlingDues || Math.abs(calcAvailableBalance) <= 0}
                    className="w-full bg-[#10b981] hover:bg-[#0ea572] active:scale-98 text-white py-3.5 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {settlingDues ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" /> Processing Payment...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        Pay & Settle Rs. {Math.abs(calcAvailableBalance).toLocaleString()} Dues Now
                      </>
                    )}
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">or contact admin</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  {/* Call Admin Support Now Option */}
                  <a
                    href="tel:9841000000"
                    className="w-full bg-[#07535f] hover:bg-[#06424b] text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-center cursor-pointer block"
                  >
                    <Smartphone className="w-4 h-4" /> Call Admin Support Now (9841000000)
                  </a>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
