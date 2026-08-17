import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { X, Bell, Shield, DollarSign, Star, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Custom Toast notification component
export const ToastContainer = forwardRef((props, ref) => {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  // Expose function to trigger toast
  useImperativeHandle(ref, () => ({
    addToast(message, type = 'info', bookingId = null) {
      const id = Date.now();
      const newToast = { id, message, type, bookingId };
      setToasts((prev) => [...prev, newToast]);

      // Auto remove after 5 seconds
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    }
  }));

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastStyle = (type) => {
    switch (type) {
      case 'admin_new_booking':
      case 'admin_booking_accepted':
      case 'admin_booking_completed':
      case 'admin_booking_cancelled':
      case 'admin_payment_received':
      case 'admin_new_review':
        return {
          bg: 'bg-indigo-900 border-indigo-700 text-white',
          icon: <Shield className="w-5 h-5 text-indigo-400" />,
          title: 'Admin Alert'
        };
      case 'admin_emergency_booking':
      case 'emergency_request':
        return {
          bg: 'bg-red-50 border-red-200 text-red-800 shadow-red-100',
          icon: <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />,
          title: '🚨 Urgent Emergency'
        };
      case 'payment_received':
      case 'payment_confirmed':
        return {
          bg: 'bg-green-50 border-green-200 text-green-800 shadow-green-100',
          icon: <DollarSign className="w-5 h-5 text-green-600" />,
          title: 'Payment Update'
        };
      case 'review':
        return {
          bg: 'bg-yellow-50 border-yellow-200 text-yellow-800 shadow-yellow-100',
          icon: <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />,
          title: 'New Review'
        };
      case 'new_message':
        return {
          bg: 'bg-teal-50 border-teal-200 text-teal-900 shadow-teal-100',
          icon: <Bell className="w-5 h-5 text-[#07535f]" />,
          title: '💬 New Message'
        };
      default:
        return {
          bg: 'bg-white border-gray-150 text-gray-800 shadow-md',
          icon: <Bell className="w-5 h-5 text-[#07535f]" />,
          title: 'Notification'
        };
    }
  };

  const handleToastClick = (toast) => {
    removeToast(toast.id);
    if (toast.bookingId) {
      if (toast.type === 'new_message') {
        window.dispatchEvent(new CustomEvent('open_global_chat', { detail: { bookingId: toast.bookingId } }));
      } else if (toast.type.startsWith('admin_')) {
        navigate(`/admin/bookings`);
      } else {
        navigate(`/customer/bookings/${toast.bookingId}`);
      }
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((toast) => {
        const style = getToastStyle(toast.type);
        return (
          <div
            key={toast.id}
            onClick={() => handleToastClick(toast)}
            className={`flex items-start gap-3 p-4 rounded-2xl border shadow-xl cursor-pointer hover:scale-[1.02] transform transition-all duration-300 animate-slide-in ${style.bg}`}
          >
            <div className="mt-0.5">{style.icon}</div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{style.title}</p>
              <p className="text-xs font-semibold mt-0.5 leading-relaxed">{toast.message}</p>
              {toast.bookingId && (
                <span className="inline-block mt-2 text-[9px] font-bold underline opacity-80 hover:opacity-100">
                  View Details →
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="p-1 hover:bg-black/5 rounded-full transition-colors self-start"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
});
