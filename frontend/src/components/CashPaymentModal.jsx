import React from 'react';
import { DollarSign, ShieldCheck, X, AlertTriangle } from 'lucide-react';

export default function CashPaymentModal({ isOpen, onClose, onConfirm, loading, amount }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#07535f] to-[#0a6c7c] p-6 text-white relative">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-3 text-white shadow-inner">
            <DollarSign className="w-7 h-7 text-emerald-300" />
          </div>
          
          <h3 className="text-xl font-extrabold font-serif">Cash Payment Confirmation</h3>
          <p className="text-xs text-white/80 mt-1 font-medium">Confirm physical cash received from customer</p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-2xl p-4 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-lg">
              💵
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-snug">
                Confirm customer paid full cash?
              </p>
              <p className="text-xs text-emerald-800 mt-1 font-medium leading-relaxed">
                10% platform commission will be deducted for Gharelu Sewa.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2.5 text-xs">
            {amount && (
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Total Service Price:</span>
                <span className="font-bold text-gray-900">{amount}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600 font-medium pt-2 border-t border-gray-200/60">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Gharelu Sewa Fee (10%):
              </span>
              <span className="font-bold text-emerald-700">Deducted from Platform Balance</span>
            </div>
          </div>

          <div className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/60 rounded-xl p-3.5 flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> Cash received is kept directly by you. Your platform balance will be charged the 10% commission. If your balance goes negative, new booking requests will be restricted until cleared.
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-6 pt-0 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                Confirm Cash
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
