import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentAPI, bookingAPI } from '../../services/api';
import {
  CheckCircle, Shield, ArrowRight, Loader2, Receipt,
  Building2, Banknote, Wallet, Lock, Info, CreditCard,
  AlertCircle, CheckCircle2, ChevronRight, Copy,
} from 'lucide-react';
import { format } from 'date-fns';

const ESEWA_PAYMENT_URL =
  import.meta.env.VITE_ESEWA_PAYMENT_URL ||
  'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

// ── Gharelu Sewa official bank/wallet details ──────────────────────────────
const GS_ACCOUNTS = {
  bank_transfer: {
    bank:    'NIC Asia Bank',
    account: '0123456789012',
    name:    'Gharelu Sewa Pvt. Ltd.',
    branch:  'Pokhara, Lakeside Branch',
    swift:   'NICENPKA',
  },
  cash_deposit: {
    bank:    'NIC Asia Bank (Any Branch)',
    account: '0123456789012',
    name:    'Gharelu Sewa Pvt. Ltd.',
    note:    'Keep the deposit slip. Upload the slip number below.',
  },
  esewa: {
    id:   '9800000000',
    name: 'Gharelu Sewa',
  },
};

// ── Payment Method Card ────────────────────────────────────────────────────
function MethodCard({ id, icon: Icon, label, desc, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
        selected
          ? 'border-[#07535f] bg-[#07535f]/5 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        selected ? 'bg-[#07535f] text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${selected ? 'text-[#07535f]' : 'text-gray-800'}`}>{label}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
        selected ? 'border-[#07535f] bg-[#07535f]' : 'border-gray-300'
      }`}>
        {selected && <div className="w-2 h-2 bg-white rounded-full" />}
      </div>
    </button>
  );
}

// ── CopyField ─────────────────────────────────────────────────────────────
function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-xl border border-gray-100">
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="font-bold text-gray-800 text-sm mt-0.5 font-mono">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
          copied ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`}
      >
        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function InvoicePage() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();

  const [booking,         setBooking]         = useState(null);
  const [existingPayment, setExistingPayment] = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');

  // Payment method selection
  const [method,       setMethod]       = useState('esewa'); // 'esewa' | 'bank_transfer' | 'cash_deposit'
  const [manualRef,    setManualRef]    = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState('');
  const [manualSuccess,setManualSuccess]= useState(false);
  const [paymentData,  setPaymentData]  = useState(null); // for eSewa hidden form

  useEffect(() => { fetchData(); }, [bookingId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const bRes = await bookingAPI.getUserBookings();
      const list  = Array.isArray(bRes.data) ? bRes.data : [];
      const b     = list.find(item => item.id === parseInt(bookingId));
      if (!b) { setError('Booking not found'); return; }
      setBooking(b);

      const pRes = await paymentAPI.getPaymentByBooking(bookingId);
      if (pRes.data?.paid) {
        setExistingPayment(pRes.data.payment);
      } else if (pRes.data?.payment?.status === 'pending' && pRes.data.payment.payment_method !== 'esewa') {
        setManualSuccess(true);
        setManualRef(pRes.data.payment.manual_ref_id || '');
        setMethod(pRes.data.payment.payment_method || 'bank_transfer');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  // ── eSewa payment flow ──────────────────────────────────────────────────
  const handlePayWithEsewa = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await paymentAPI.initiatePayment(bookingId);
      const { esewa } = res.data;
      setPaymentData(esewa);
      setTimeout(() => { document.getElementById('esewa-payment-form')?.submit(); }, 300);
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.error || 'Failed to initiate payment');
      setSubmitting(false);
    }
  };

  // ── Manual payment flow ─────────────────────────────────────────────────
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualRef.trim()) { setSubmitError('Please enter a reference / slip number'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      await paymentAPI.submitManualPayment(bookingId, {
        payment_method: method,
        manual_ref_id:  manualRef.trim(),
      });
      setManualSuccess(true);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit payment reference');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Amounts ─────────────────────────────────────────────────────────────
  const serviceAmount  = parseFloat(booking?.hourly_rate || 800);
  const commission     = parseFloat((serviceAmount * 0.10).toFixed(2));
  const providerPayout = parseFloat((serviceAmount - commission).toFixed(2));

  // ────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#07535f] animate-spin" />
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-500 text-center p-8">{error}</div>
  );

  // ── Already paid ────────────────────────────────────────────────────────
  if (existingPayment) {
    const methodLabel = {
      esewa:        '🟢 eSewa',
      bank_transfer:'🏦 Bank Transfer',
      cash_deposit: '💵 Cash Deposit',
    }[existingPayment.payment_method || 'esewa'] || 'eSewa';

    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Payment Received!</h1>
          <p className="text-gray-500 mb-6 text-sm">
            {existingPayment.escrow_released
              ? 'Funds have been released to the service provider.'
              : 'Payment held securely by Gharelu Sewa. Funds pending release to provider.'}
          </p>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid to GS</span>
              <span className="font-bold text-gray-800">Rs. {existingPayment.amount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment Method</span>
              <span className="font-semibold text-gray-700">{methodLabel}</span>
            </div>
            {existingPayment.manual_ref_id && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reference ID</span>
                <span className="font-mono font-bold text-gray-800">{existingPayment.manual_ref_id}</span>
              </div>
            )}
            {existingPayment.esewa_ref_id && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">eSewa Ref</span>
                <span className="font-mono font-bold text-gray-800">{existingPayment.esewa_ref_id}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
              <span className="text-gray-500">Provider Payout</span>
              <span className={`font-bold ${existingPayment.escrow_released ? 'text-green-600' : 'text-orange-500'}`}>
                Rs. {existingPayment.provider_payout} {existingPayment.escrow_released ? '✓ Released' : '⏳ Pending'}
              </span>
            </div>
          </div>

          {!existingPayment.escrow_released && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-700 text-left mb-5 flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Admin is verifying your payment and will release Rs. {existingPayment.provider_payout} to the provider shortly.</span>
            </div>
          )}

          <button
            onClick={() => navigate('/customer')}
            className="w-full bg-[#07535f] text-white py-3 rounded-xl font-bold hover:bg-[#06424b] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Manual success screen ───────────────────────────────────────────────
  if (manualSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#07535f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#07535f]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Reference Submitted!</h1>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            Your payment reference has been submitted to Gharelu Sewa. Our team will verify your payment within <strong>1–2 hours</strong> and release funds to the provider.
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-left mb-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Method</span>
              <span className="font-semibold text-gray-800">
                {method === 'bank_transfer' ? '🏦 Bank Transfer' : '💵 Cash Deposit'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Your Ref #</span>
              <span className="font-mono font-bold text-[#07535f]">{manualRef}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-gray-800">Rs. {serviceAmount.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/customer')}
            className="w-full bg-[#07535f] text-white py-3 rounded-xl font-bold hover:bg-[#06424b] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Invoice + Payment Selection ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#07535f] rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Payment Invoice</h1>
            <p className="text-sm text-gray-500">Booking #{bookingId} · {booking?.service_category}</p>
          </div>
        </div>

        {/* Escrow Trust Banner */}
        <div className="bg-[#07535f] rounded-2xl p-5 text-white flex gap-4 items-start shadow-lg">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-base">You are paying Gharelu Sewa — not the professional</p>
            <p className="text-white/75 text-xs mt-1 leading-relaxed">
              Your payment is held securely in our escrow account. The provider receives their payout <strong className="text-white">only after job completion is confirmed</strong>. You are fully protected.
            </p>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Invoice header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#07535f]" />
            <span className="text-sm font-bold text-gray-700">Invoice from Gharelu Sewa</span>
            <span className="ml-auto text-xs text-gray-400 font-mono">GS-{bookingId}-INV</span>
          </div>

          <div className="p-6 space-y-4">
            {/* From / To */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bill To</p>
                <p className="font-bold text-gray-800 mt-0.5">{booking?.customer_name || 'Customer'}</p>
                <p className="text-xs text-gray-500">{booking?.location}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Billed By</p>
                <p className="font-bold text-[#07535f] mt-0.5">Gharelu Sewa Pvt. Ltd.</p>
                <p className="text-xs text-gray-500">Platform Account</p>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 pt-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{booking?.service_category || 'Home Service'}</span>
                <span className="font-semibold text-gray-800">Rs. {serviceAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Scheduled</span>
                <span>{booking?.booking_date ? format(new Date(booking.booking_date), 'PPPp') : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Provider</span>
                <span>{booking?.provider_name}</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Payment Breakdown</p>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Gharelu Sewa receives</span>
                <span className="font-bold text-[#07535f]">Rs. {serviceAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Platform Commission (10%)</span>
                <span>Rs. {commission.toFixed(2)} retained</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Provider Payout (after confirmation)</span>
                <span>Rs. {providerPayout.toFixed(2)} released</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-extrabold text-base">
                <span className="text-gray-800">Total You Pay</span>
                <span className="text-[#07535f]">Rs. {serviceAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment Method Selection ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#07535f]" />
            Choose Payment Method to Gharelu Sewa
          </h2>

          <div className="space-y-3">
            <MethodCard
              id="esewa"
              icon={Wallet}
              label="eSewa Digital Wallet"
              desc="Instant — redirected to eSewa secure gateway"
              selected={method === 'esewa'}
              onClick={() => setMethod('esewa')}
            />
            <MethodCard
              id="bank_transfer"
              icon={Building2}
              label="Bank Transfer (NEFT / RTGS)"
              desc="Transfer directly to Gharelu Sewa bank account, then submit reference"
              selected={method === 'bank_transfer'}
              onClick={() => setMethod('bank_transfer')}
            />
            <MethodCard
              id="cash_deposit"
              icon={Banknote}
              label="Cash Deposit at Bank"
              desc="Deposit cash at any NIC Asia Bank branch, then submit slip number"
              selected={method === 'cash_deposit'}
              onClick={() => setMethod('cash_deposit')}
            />
          </div>

          {/* ── eSewa info ── */}
          {method === 'esewa' && (
            <div className="bg-[#60bb46]/8 border border-[#60bb46]/20 rounded-xl p-4 space-y-1">
              <p className="text-xs font-bold text-gray-700 mb-2">You will pay to:</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#60bb46] rounded-lg flex items-center justify-center text-white font-black text-xs">e</div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{GS_ACCOUNTS.esewa.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{GS_ACCOUNTS.esewa.id}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Bank Transfer account details ── */}
          {method === 'bank_transfer' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Gharelu Sewa Bank Account
                </p>
                <CopyField label="Bank"           value={GS_ACCOUNTS.bank_transfer.bank} />
                <CopyField label="Account Number" value={GS_ACCOUNTS.bank_transfer.account} />
                <CopyField label="Account Name"   value={GS_ACCOUNTS.bank_transfer.name} />
                <CopyField label="Branch"         value={GS_ACCOUNTS.bank_transfer.branch} />
                <CopyField label="SWIFT/BIC"      value={GS_ACCOUNTS.bank_transfer.swift} />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                After completing the transfer, enter your bank reference number below so our team can verify it.
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Bank Reference / Transaction ID *
                  </label>
                  <input
                    type="text"
                    value={manualRef}
                    onChange={e => setManualRef(e.target.value)}
                    placeholder="e.g. TXN202608110001"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#07535f]/30 focus:border-[#07535f] font-mono"
                  />
                </div>
                {submitError && (
                  <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-lg">{submitError}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-[#07535f] hover:bg-[#06424b] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm shadow transition-all"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit Payment Reference <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </div>
          )}

          {/* ── Cash deposit account details ── */}
          {method === 'cash_deposit' && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-green-700 mb-1 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" /> Deposit To
                </p>
                <CopyField label="Bank"           value={GS_ACCOUNTS.cash_deposit.bank} />
                <CopyField label="Account Number" value={GS_ACCOUNTS.cash_deposit.account} />
                <CopyField label="Account Name"   value={GS_ACCOUNTS.cash_deposit.name} />
                <CopyField label="Amount"         value={`Rs. ${serviceAmount.toFixed(2)}`} />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                {GS_ACCOUNTS.cash_deposit.note}
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Deposit Slip Number *
                  </label>
                  <input
                    type="text"
                    value={manualRef}
                    onChange={e => setManualRef(e.target.value)}
                    placeholder="e.g. SLIP-0087654"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#07535f]/30 focus:border-[#07535f] font-mono"
                  />
                </div>
                {submitError && (
                  <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-lg">{submitError}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-[#07535f] hover:bg-[#06424b] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm shadow transition-all"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit Slip Number <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </div>
          )}

          {/* ── eSewa Pay Button ── */}
          {method === 'esewa' && (
            <div className="space-y-3">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}
              <button
                onClick={handlePayWithEsewa}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 bg-[#60bb46] hover:bg-[#52a83b] disabled:opacity-60 text-white font-bold py-4 rounded-xl text-base shadow-lg transition-all"
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
                ) : (
                  <>
                    <img
                      src="https://esewa.com.np/common/images/esewa_logo.png"
                      alt="eSewa"
                      className="h-5 w-auto brightness-0 invert"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    Pay Rs. {serviceAmount.toFixed(2)} to Gharelu Sewa
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-400">
                You will be redirected to eSewa's secure payment gateway.
                <br />This uses eSewa sandbox (test mode) — no real money is charged.
              </p>
            </div>
          )}
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-3 text-xs text-gray-400 pb-4">
          <Shield className="w-4 h-4" />
          <span>256-bit SSL Encrypted · Funds held in Gharelu Sewa Escrow · Provider paid only after confirmation</span>
        </div>

        {/* Hidden eSewa form — auto-submitted */}
        {paymentData && (
          <form id="esewa-payment-form" method="POST" action={ESEWA_PAYMENT_URL} className="hidden">
            {Object.entries(paymentData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
        )}

      </div>
    </div>
  );
}
