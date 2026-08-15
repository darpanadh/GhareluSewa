import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { paymentAPI } from '../../services/api';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'failed'
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    const dataParam = searchParams.get('data');
    const oid = searchParams.get('oid');
    const amt = searchParams.get('amt');
    const refId = searchParams.get('refId');

    if (dataParam) {
      verifyPayment({ data: dataParam });
    } else if (oid && amt && refId) {
      verifyPayment({ oid, amt, refId });
    } else {
      setStatus('failed');
    }
  }, []);

  const verifyPayment = async (params) => {
    try {
      const res = await paymentAPI.verifyPayment(params);
      if (res.data?.success) {
        setPaymentInfo(res.data.payment);
        setStatus('success');
      } else {
        setStatus('failed');
      }
    } catch (err) {
      console.error('Payment verification failed:', err);
      setStatus('failed');
    }
  };

  if (status === 'verifying') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-[#07535f] animate-spin" />
      <p className="text-gray-600 font-semibold">Verifying your payment with eSewa...</p>
      <p className="text-sm text-gray-400">Please do not close this page.</p>
    </div>
  );

  if (status === 'failed') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
        <XCircle className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800">Payment Failed</h1>
      <p className="text-gray-500 text-center max-w-md">
        We could not verify your payment. If money was deducted, please contact support with your eSewa transaction ID.
      </p>
      <Link
        to="/customer"
        className="bg-[#07535f] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#06424b] transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {/* Success Animation */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-800 font-serif mb-2">Payment Successful! 🎉</h1>
        <p className="text-gray-500 mb-8">
          Thank you for paying Gharelu Sewa. Your payment is held securely in escrow until the provider payout is released.
        </p>

        {/* Payment Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left mb-8 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount Paid</span>
            <span className="font-extrabold text-[#07535f] text-base">Rs. {paymentInfo?.amount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Booking #</span>
            <span className="font-bold text-gray-800">{paymentInfo?.bookingId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">eSewa Ref ID</span>
            <span className="font-mono font-bold text-gray-700">{paymentInfo?.refId}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
            <span className="text-gray-500">Platform Commission</span>
            <span className="text-gray-600">Rs. {paymentInfo?.commission}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Provider Payout</span>
            <span className="font-bold text-orange-500">Rs. {paymentInfo?.providerPayout} (pending release)</span>
          </div>
        </div>

        {/* eSewa Branding */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-8">
          <span>Powered by</span>
          <span className="font-bold text-[#60bb46]">eSewa</span>
          <span>· Secure Digital Payments</span>
        </div>

        <button
          onClick={() => navigate('/customer')}
          className="w-full bg-[#07535f] text-white py-4 rounded-xl font-bold hover:bg-[#06424b] transition-colors text-base"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
