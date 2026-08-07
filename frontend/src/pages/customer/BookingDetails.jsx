import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Chat from '../../components/Chat';
import { bookingAPI, reviewAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Calendar, Wrench, CheckCircle, XCircle, PlayCircle, AlertCircle, Star, Navigation } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending:     { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <AlertCircle className="w-4 h-4" /> },
  accepted:    { bg: 'bg-blue-100',   text: 'text-blue-800',   icon: <CheckCircle className="w-4 h-4" /> },
  in_progress: { bg: 'bg-[#07535f]/10', text: 'text-[#07535f]', icon: <PlayCircle className="w-4 h-4" /> },
  completed:   { bg: 'bg-green-100', text: 'text-green-800',  icon: <CheckCircle className="w-4 h-4" /> },
  cancelled:   { bg: 'bg-red-100',   text: 'text-red-800',   icon: <XCircle className="w-4 h-4" /> },
};

function StarRating({ rating, setRating }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`w-9 h-9 transition-colors ${
              star <= (hovered || rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function BookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Review state
  const [existingReview, setExistingReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const res = await bookingAPI.getUserBookings();
      const list = Array.isArray(res.data) ? res.data : [];
      const b = list.find(item => item.id === parseInt(bookingId));
      if (b) {
        setBooking(b);
        // Check for existing review if completed
        if (b.status === 'completed') {
          try {
            const reviewRes = await reviewAPI.getBookingReview(b.id);
            if (reviewRes.data) {
              setExistingReview(reviewRes.data);
              setReviewRating(reviewRes.data.rating);
              setReviewComment(reviewRes.data.comment || '');
            }
          } catch {
            // No review yet, that's fine
          }
        }
      } else {
        setError('Booking not found');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch booking');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setActionLoading(true);
    try {
      await bookingAPI.updateBookingStatus(bookingId, { status: newStatus });
      setBooking(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error(err);
      alert('Failed to update booking status');
    } finally {
      setActionLoading(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (reviewRating === 0) {
      setReviewError('Please select a star rating.');
      return;
    }
    setReviewSubmitting(true);
    setReviewError('');
    try {
      await reviewAPI.createReview({
        booking_id: booking.id,
        provider_id: booking.provider_id,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewSuccess(true);
      setExistingReview({ rating: reviewRating, comment: reviewComment });
    } catch (err) {
      setReviewError(err?.response?.data?.error || 'Failed to submit review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading booking...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  const isProvider = user?.role === 'provider';
  const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;

  const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-serif">Booking #{booking.id}</h1>
            <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.icon}
              <span className="uppercase tracking-wide">{booking.status.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Provider Action Buttons */}
          {isProvider && (
            <div className="flex gap-3">
              {booking.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateStatus('accepted')}
                    disabled={actionLoading}
                    className="flex items-center gap-2 bg-[#07535f] hover:bg-[#06424b] text-white px-5 py-2.5 rounded-full font-bold text-sm shadow transition-all disabled:opacity-60"
                  >
                    <CheckCircle className="w-4 h-4" /> Accept Job
                  </button>
                  <button
                    onClick={() => updateStatus('cancelled')}
                    disabled={actionLoading}
                    className="flex items-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 px-5 py-2.5 rounded-full font-bold text-sm transition-all disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" /> Decline
                  </button>
                </>
              )}
              {booking.status === 'accepted' && (
                <button
                  onClick={() => updateStatus('in_progress')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow transition-all disabled:opacity-60"
                >
                  <PlayCircle className="w-4 h-4" /> Start Job
                </button>
              )}
              {booking.status === 'in_progress' && (
                <button
                  onClick={() => updateStatus('completed')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow transition-all disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" /> Mark as Complete
                </button>
              )}
            </div>
          )}

          {/* Customer Action Buttons */}
          {!isProvider && (
            <div className="flex gap-3">
              {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                <Link to="/track" state={{ booking }} className="bg-[#07535f] hover:bg-[#06424b] text-white px-5 py-2.5 rounded-full font-bold shadow-sm transition-all text-sm flex items-center gap-1.5">
                  <Navigation className="w-4 h-4" /> Track Job
                </Link>
              )}
              {booking.status === 'completed' && (
                <Link to={`/customer/invoice/${booking.id}`} className="bg-[#60bb46] hover:bg-[#52a83b] text-white px-5 py-2.5 rounded-full font-bold shadow-sm transition-colors text-sm flex items-center gap-1.5">
                  💳 Pay Invoice (eSewa)
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left: Job Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-gray-800 text-lg mb-4 border-b border-gray-100 pb-2">Job Details</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Wrench className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase">Service</span>
                    <span className="block text-sm font-semibold text-gray-800 mt-0.5">{booking.service_category || booking.description}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase">Scheduled</span>
                    <span className="block text-sm font-semibold text-gray-800 mt-0.5">
                      {booking.booking_date ? format(new Date(booking.booking_date), 'PPPp') : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase">Location</span>
                    <span className="block text-sm font-semibold text-gray-800 mt-0.5">{booking.location}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Customer/Provider name card */}
            <Card className="p-5">
              <h3 className="font-bold text-gray-700 text-sm mb-3">{isProvider ? 'Customer' : 'Service Provider'}</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#07535f]/10 rounded-full flex items-center justify-center text-[#07535f] font-bold text-lg">
                  {isProvider ? (booking.customer_name?.charAt(0) || 'C') : (booking.provider_name?.charAt(0) || 'P')}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{isProvider ? booking.customer_name : booking.provider_name}</p>
                  <p className="text-xs text-gray-500">{isProvider ? booking.customer_phone : booking.provider_phone}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-[#07535f]/5 border-[#07535f]/10">
              <h3 className="font-bold text-[#07535f] text-sm mb-1">Need Help?</h3>
              <p className="text-xs text-gray-600 mb-3">Contact our support line for emergencies.</p>
              <button className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 rounded-lg text-sm transition-colors">
                Contact Support
              </button>
            </Card>
          </div>

          {/* Right: Chat + Review */}
          <div className="lg:col-span-2 space-y-6">
            <Chat bookingId={booking.id} />

            {/* ─── Review & Rating Section ─── */}
            {!isProvider && booking.status === 'completed' && (
              <Card className="p-6">
                <h3 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  {existingReview ? 'Your Review' : 'Rate & Review the Service'}
                </h3>
                <p className="text-xs text-gray-400 mb-5">
                  {existingReview ? 'Thank you for your feedback!' : 'How was your experience? Your review helps others choose the right provider.'}
                </p>

                {reviewSuccess || existingReview ? (
                  /* Show submitted review */
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-6 h-6 ${s <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                        />
                      ))}
                      <span className="ml-2 text-sm font-bold text-gray-700">{ratingLabels[reviewRating]}</span>
                    </div>
                    {reviewComment && (
                      <p className="text-sm text-gray-600 italic">"{reviewComment}"</p>
                    )}
                    <p className="text-xs text-green-600 font-semibold mt-3 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Review submitted successfully
                    </p>
                  </div>
                ) : (
                  /* Review Form */
                  <form onSubmit={submitReview} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Your Rating *</label>
                      <div className="flex items-center gap-3">
                        <StarRating rating={reviewRating} setRating={setReviewRating} />
                        {reviewRating > 0 && (
                          <span className="text-sm font-bold text-gray-600">{ratingLabels[reviewRating]}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Your Comment (Optional)</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Tell others about the quality of work, punctuality, and professionalism..."
                        rows={4}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#07535f]/30 focus:border-[#07535f] resize-none transition-all"
                      />
                    </div>

                    {reviewError && (
                      <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-lg">{reviewError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={reviewSubmitting || reviewRating === 0}
                      className="w-full bg-[#07535f] hover:bg-[#06424b] disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                    >
                      <Star className="w-4 h-4" />
                      {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
