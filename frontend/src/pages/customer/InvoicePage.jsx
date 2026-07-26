import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentAPI, bookingAPI } from '../../services/api';
import { CheckCircle, CreditCard, Shield, ArrowRight, Loader2, Receipt } from 'lucide-react';
import Card from '../../components/Card';
import { format } from 'date-fns';

const ESEWA_PAYMENT_URL = import.meta.env.VITE_ESEWA_PAYMENT_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

export default function InvoicePage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [existingPayment, setExistingPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [bookingId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch booking
      const bRes = await bookingAPI.getUserBookings();
      const list = Array.isArray(bRes.data) ? bRes.data : [];
      const b = list.find(item => item.id === parseInt(bookingId));
      if (!b) { setError('Booking not found'); return; }
      setBooking(b);

      // Check if already paid
      const pRes = await paymentAPI.getPaymentByBooking(bookingId);
      if (pRes.data?.paid) {
        setExistingPayment(pRes.data.payment);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithEsewa = async () => {
    setInitiating(true);
    try {
      const res = await paymentAPI.initiatePayment(bookingId);
      const { esewa } = res.data;
      setPaymentData(esewa);

      // Give React time to render the hidden form, then submit it
      setTimeout(() => {
        document.getElementById('esewa-payment-form')?.submit();
      }, 300);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to initiate payment');
      setInitiating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#07535f] animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-500 text-center p-8">
      {error}
    </div>
  );

  // Already paid — show receipt
  if (existingPayment) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Complete!</h1>
          <p className="text-gray-500 mb-8">This booking has already been paid.</p>
          <Card className="p-6 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-bold text-gray-800">Rs. {existingPayment.amount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">eSewa Ref</span>
              <span className="font-mono font-bold text-gray-800">{existingPayment.esewa_ref_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paid On</span>
              <span className="font-bold text-gray-800">
                {existingPayment.paid_at ? format(new Date(existingPayment.paid_at), 'PPPp') : 'N/A'}
              </span>
            </div>
          </Card>
          <button
            onClick={() => navigate('/customer')}
            className="mt-6 w-full bg-[#07535f] text-white py-3 rounded-xl font-bold hover:bg-[#06424b] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Invoice & Pay flow
  const serviceAmount = parseFloat(booking?.hourly_rate || 800);
  const commission = parseFloat((serviceAmount * 0.10).toFixed(2));
  const providerPayout = parseFloat((serviceAmount - commission).toFixed(2));

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Receipt className="w-8 h-8 text-[#07535f]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-serif">Payment Invoice</h1>
            <p className="text-sm text-gray-500">Booking #{bookingId} · {booking?.service_category}</p>
          </div>
        </div>

        {/* Invoice Card */}
        <Card className="p-6 mb-6">
          <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Invoice To</p>
              <p className="font-bold text-gray-800 mt-1">{booking?.customer_name}</p>
              <p className="text-sm text-gray-500">{booking?.location}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Service By</p>
              <p className="font-bold text-gray-800 mt-1">{booking?.provider_name}</p>
              <p className="text-sm text-gray-500">{booking?.provider_phone}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{booking?.service_category || 'Home Service'}</span>
              <span className="font-semibold text-gray-800">Rs. {serviceAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Scheduled</span>
              <span>{booking?.booking_date ? format(new Date(booking.booking_date), 'PPPp') : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Location</span>
              <span>{booking?.location}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Platform Commission (10%)</span>
              <span>- Rs. {commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Provider Payout</span>
              <span>Rs. {providerPayout.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-lg pt-2 border-t border-gray-100 mt-2">
              <span className="text-gray-800">Total Due</span>
              <span className="text-[#07535f]">Rs. {serviceAmount.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400 mb-8">
          <Shield className="w-4 h-4" />
          <span>Secured by eSewa · 256-bit SSL Encryption</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Pay Now Button */}
        <button
          onClick={handlePayWithEsewa}
          disabled={initiating}
          className="w-full flex items-center justify-center gap-3 bg-[#60bb46] hover:bg-[#52a83b] disabled:opacity-60 text-white font-bold py-4 rounded-xl text-base shadow-lg transition-all"
        >
          {initiating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
          ) : (
            <>
              <img src="https://esewa.com.np/common/images/esewa_logo.png" alt="eSewa" className="h-5 w-auto brightness-0 invert" />
              Pay Rs. {serviceAmount.toFixed(2)} with eSewa
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          You will be redirected to eSewa's secure payment gateway.
          <br />This uses eSewa sandbox (test mode) — no real money is charged.
        </p>

        {/* Hidden eSewa form — auto-submitted */}
        {paymentData && (
          <form
            id="esewa-payment-form"
            method="POST"
            action={ESEWA_PAYMENT_URL}
            className="hidden"
          >
            {Object.entries(paymentData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
        )}
      </div>
    </div>
  );
}
