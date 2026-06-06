import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Car, Loader2, CheckCircle2, ChevronRight, X, AlertTriangle, Receipt, Download, Printer, Trash2, Wallet, IndianRupee, ArrowDownLeft, ArrowRight, ShieldCheck, History, RefreshCw, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';
import { formatDuration } from '../lib/utils';

const isBookingPast = (dateStr, timeStr, duration) => {
  const bookingStart = new Date(`${dateStr}T${timeStr}`);
  const bookingEnd = new Date(bookingStart.getTime() + duration * 60 * 60 * 1000);
  return new Date() > bookingEnd;
};

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [clearingId, setClearingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [userLocation, setUserLocation] = useState({ lat: 13.999319690644878, lon: 74.55549806962695 });
  const [toast, setToast] = useState(null);
  const [cashbackInfo, setCashbackInfo] = useState(null);
  const [showCashbackModal, setShowCashbackModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('Change of plans');
  const [showRefundTracking, setShowRefundTracking] = useState(false);
  const [trackingBooking, setTrackingBooking] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '', endDate: '', endTime: '', duration: 1 });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [bookingToReview, setBookingToReview] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, experience: 'Smooth', recommend: 'Yes', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        null,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    if (!rescheduleData.date || !rescheduleData.time || !rescheduleData.endDate || !rescheduleData.endTime) return;
    const start = new Date(`${rescheduleData.date}T${rescheduleData.time}`);
    const end = new Date(`${rescheduleData.endDate}T${rescheduleData.endTime}`);
    if (end > start) {
      const diffMs = end.getTime() - start.getTime();
      setRescheduleData(prev => ({ ...prev, duration: diffMs / (1000 * 60 * 60) }));
    } else {
      setRescheduleData(prev => ({ ...prev, duration: 0 }));
    }
  }, [rescheduleData.date, rescheduleData.time, rescheduleData.endDate, rescheduleData.endTime]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBookings = () => {
    setLoading(true);
    apiFetch('/api/my-bookings')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setBookings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async () => {
    if (!bookingToCancel) return;

    const id = bookingToCancel;
    setCancellingId(id);
    setShowCancelModal(false);

    try {
      const res = await apiFetch(`/api/bookings/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancellationReason })
      });
      const data = await res.json();

      if (res.ok) {
        // Update booking status and store refund info
        setBookings(prev => prev.map(b => b.id === id ? {
          ...b,
          status: 'Cancelled',
          payment_status: 'Refunded',
          refund_amount: data.cashback?.refund_amount || 0,
          refund_id: data.cashback?.refund_id
        } : b));
        // Show cashback success modal
        setCashbackInfo(data.cashback);
        setShowCashbackModal(true);
      } else {
        showToast(data.error || 'Cancellation failed', 'error');
      }
    } catch (err) {
      showToast('Something went wrong', 'error');
    } finally {
      setCancellingId(null);
      setBookingToCancel(null);
    }
  };

  // Get the booking amount for cancel modal preview
  const cancelPreviewBooking = bookings.find(b => b.id === bookingToCancel);

  const handleClearBooking = async (id) => {
    setClearingId(id);
    try {
      const res = await apiFetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Booking removed from dashboard');
        setBookings(prev => prev.filter(b => b.id !== id));
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to clear booking', 'error');
      }
    } catch (err) {
      showToast('Something went wrong', 'error');
    } finally {
      setClearingId(null);
    }
  };

  const handleReschedule = async () => {
    if (!reschedulingId) {
      console.warn('handleReschedule called without reschedulingId');
      return;
    }

    try {
      const booking = bookings.find(b => b.id === reschedulingId);
      if (!booking) {
        console.error('Booking not found in state:', reschedulingId);
        throw new Error('Booking not found in state');
      }

      // Calculate additional amount safely
      const amtPaid = parseFloat(booking.amount_paid) || 0;
      const durHours = parseFloat(booking.duration_hours) || 1;
      const pricePerHour = amtPaid / durHours;

      const newDuration = parseFloat(rescheduleData.duration) || 1;
      const newTotal = pricePerHour * newDuration;
      const additionalAmount = parseFloat((newTotal - amtPaid).toFixed(2));

      const payload = {
        booking_date: rescheduleData.date,
        booking_time: rescheduleData.time,
        duration_hours: newDuration,
        additional_amount: additionalAmount
      };

      if (additionalAmount > 0) {
        setShowRescheduleModal(false);
        navigate('/payment', {
          state: {
            type: 'reschedule',
            booking_id: reschedulingId,
            spot_name: booking.parking_name,
            address: booking.parking_address,
            date: rescheduleData.date,
            duration_hours: newDuration,
            amount: additionalAmount,
            rescheduleData: payload
          }
        });
        return;
      }

      console.log('[Reschedule] Sending request:', { id: reschedulingId, payload });

      const res = await apiFetch(`/api/bookings/${reschedulingId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log('[Reschedule] Server response:', data);

      if (res.ok) {
        showToast('Booking rescheduled successfully');
        setShowRescheduleModal(false);
        fetchBookings();
      } else {
        showToast(data.error || 'Reschedule failed', 'error');
      }
    } catch (err) {
      console.error('Frontend reschedule error:', err);
      showToast('Something went wrong', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!bookingToReview) return;

    setSubmittingReview(true);

    const combinedComment = `Experience: ${reviewData.experience || 'Smooth'} | Recommend: ${reviewData.recommend || 'Yes'}\n${reviewData.comment}`;

    try {
      const res = await apiFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingToReview.id,
          rating: reviewData.rating,
          comment: combinedComment.trim()
        })
      });

      if (res.ok) {
        showToast('Feedback submitted successfully!');
        setShowReviewModal(false);
        setReviewData({ rating: 5, experience: 'Smooth', recommend: 'Yes', comment: '' });
        fetchBookings(); // Refresh to update is_reviewed status
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to submit review', 'error');
      }
    } catch (err) {
      showToast('Something went wrong', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!selectedBooking) return;

    const receiptText = `
BOOKING RECEIPT
-----------------------------
Transaction ID: #PS-${selectedBooking.id.toString().padStart(5, '0')}
Status: ${selectedBooking.status}
-----------------------------
Parking Spot: ${selectedBooking.parking_name}
Address: ${selectedBooking.parking_address}
Date: ${selectedBooking.booking_date}
Time: ${selectedBooking.booking_time}
Duration: ${formatDuration(selectedBooking.duration_hours)}
Slot: ${selectedBooking.slot_number || 'TBD'}
Payment Method: ${selectedBooking.payment_method || 'Simulated'}
-----------------------------
Total Amount: Rs. ${(selectedBooking.price_per_hour * selectedBooking.duration_hours).toFixed(2)}
-----------------------------
Powered by SafePass Secure
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_PS_${selectedBooking.id.toString().padStart(5, '0')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Bookings</h1>
          <p className="text-slate-400">Manage your parking reservations and refunds.</p>
        </div>

        {/* Wallet Stats Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 flex items-center space-x-4 min-w-[240px]"
        >
          <div className="bg-emerald-500/20 p-3 rounded-2xl">
            <Wallet className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-emerald-500/60 text-xs font-bold uppercase tracking-wider">Refunded to Bank</p>
            <p className="text-2xl font-black text-white">
              ₹{bookings
                .filter(b => b.status === 'Cancelled')
                .reduce((sum, b) => sum + (b.refund_amount || 0), 0)
                .toFixed(2)}
            </p>
          </div>
        </motion.div>
      </div>

      {loading && bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-400">Loading your data...</p>
        </div>
      ) : bookings.length > 0 ? (
        <div className="space-y-6">
          {bookings.map((booking, idx) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden hover:border-white/20 transition-all"
            >
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
                      <Car className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{booking.parking_name}</h3>
                      <div className="flex items-center text-slate-400 text-sm mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{booking.parking_address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold border ${booking.status === 'Confirmed'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                      {booking.status === 'Confirmed' ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>{booking.status}</span>
                    </div>

                    {booking.status === 'Cancelled' && (booking.refund_amount > 0 || booking.refund_id) && (
                      <button
                        onClick={() => {
                          setTrackingBooking(booking);
                          setShowRefundTracking(true);
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>Track Refund</span>
                      </button>
                    )}

                    {booking.status === 'Confirmed' ? (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setReschedulingId(booking.id);
                            const start = new Date(`${booking.booking_date}T${booking.booking_time}`);
                            const end = new Date(start.getTime() + (booking.duration_hours * 60 * 60 * 1000));
                            setRescheduleData({
                              date: booking.booking_date,
                              time: booking.booking_time,
                              endDate: end.toISOString().split('T')[0],
                              endTime: end.toTimeString().slice(0, 5),
                              duration: booking.duration_hours
                            });
                            setShowRescheduleModal(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors flex items-center space-x-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Reschedule</span>
                        </button>
                        <button
                          onClick={() => {
                            setBookingToCancel(booking.id);
                            setShowCancelModal(true);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleClearBooking(booking.id)}
                        className="text-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors flex items-center space-x-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  {booking.status === 'Confirmed' && !booking.is_reviewed && isBookingPast(booking.booking_date, booking.booking_time, booking.duration_hours) && (
                    <button
                      onClick={() => {
                        setBookingToReview(booking);
                        setShowReviewModal(true);
                      }}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold border bg-blue-600 text-white border-blue-500 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    >
                      <Star className="h-4 w-4" />
                      <span>Rate & Review</span>
                    </button>
                  )}
                  {booking.status === 'Confirmed' && !booking.is_reviewed && !isBookingPast(booking.booking_date, booking.booking_time, booking.duration_hours) && (
                    <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-slate-500/10 text-slate-400 border-slate-500/20">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Review after checkout</span>
                    </div>
                  )}
                  {booking.is_reviewed > 0 && (
                    <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Reviewed</span>
                    </div>
                  )}
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-4 gap-6 pt-8 border-t border-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <Calendar className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Date</p>
                      <p className="text-sm font-semibold text-slate-300">{new Date(booking.booking_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <Clock className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Time</p>
                      <p className="text-sm font-semibold text-slate-300">{booking.booking_time}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <Clock className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Duration</p>
                      <p className="text-sm font-semibold text-slate-300">
                        {formatDuration(booking.duration_hours)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-6 sm:col-span-1">
                    <button
                      onClick={() => {
                        const dest = `${booking.latitude},${booking.longitude}`;
                        // Default to Anjuman Abad if no user location, or use the detected location
                        const lat = userLocation?.lat || 13.999319690644878;
                        const lon = userLocation?.lon || 74.55549806962695;
                        const origin = `${lat},${lon}`;
                        const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
                        window.open(url, '_blank');
                      }}
                      className="text-slate-400 hover:text-blue-400 transition-colors font-bold text-sm"
                      title="View Route"
                    >
                      Route
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowReceipt(true);
                      }}
                      className="text-blue-400 font-bold text-sm hover:underline flex items-center"
                    >
                      <span>View Receipt</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 border-dashed py-20 text-center">
          <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
            <Calendar className="h-10 w-10 text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No bookings yet</h2>
          <p className="text-slate-400 mb-8">You haven't made any parking reservations yet.</p>
          <Link
            to="/search"
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            Find Parking Now
          </Link>
        </div>
      )
      }

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReceipt(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              id="receipt-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="bg-blue-600 p-8 text-white text-center relative">
                <button
                  onClick={() => setShowReceipt(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors print-hide"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Receipt className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold">Booking Receipt</h2>
                <p className="text-blue-100 text-sm mt-1">Transaction ID: #PS-{selectedBooking.id.toString().padStart(5, '0')}</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Parking Spot</p>
                    <h3 className="font-bold text-white">{selectedBooking.parking_name}</h3>
                    <p className="text-xs text-slate-400">{selectedBooking.parking_address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Status</p>
                    <span className={`text-xs font-bold ${selectedBooking.status === 'Confirmed' ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedBooking.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Date</p>
                    <p className="text-sm font-semibold text-slate-300">{selectedBooking.booking_date}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Time</p>
                    <p className="text-sm font-semibold text-slate-300">{selectedBooking.booking_time}</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Payment Method</p>
                    <p className="text-sm font-semibold text-slate-300">{selectedBooking.payment_method || 'Simulated'}</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Parking Slot</p>
                    <p className="text-sm font-semibold text-blue-400">{selectedBooking.slot_number || 'TBD'}</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Duration</p>
                    <p className="text-sm font-semibold text-slate-300">
                      {formatDuration(selectedBooking.duration_hours)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      Parking Fee ({formatDuration(selectedBooking.duration_hours)})
                    </span>
                    <span className="text-white font-semibold">₹{(selectedBooking.price_per_hour * selectedBooking.duration_hours).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Service Fee</span>
                    <span className="text-white font-semibold">₹0.00</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-3 border-t border-white/5">
                    <span className="text-white">Total Amount</span>
                    <span className="text-blue-400">₹{(selectedBooking.price_per_hour * selectedBooking.duration_hours).toFixed(2)}</span>
                  </div>

                  {/* Refund details for cancelled bookings */}
                  {selectedBooking.status === 'Cancelled' && selectedBooking.refund_amount > 0 && (
                    <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <Wallet className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Refund Details</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Cancellation Fee (30%)</span>
                        <span className="text-red-400 font-semibold">-₹{((selectedBooking.price_per_hour * selectedBooking.duration_hours) * 0.3).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-emerald-400">Cashback Refund (70%)</span>
                        <span className="text-emerald-400">₹{selectedBooking.refund_amount?.toFixed(2)}</span>
                      </div>
                      {selectedBooking.refund_id && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Refund ID</span>
                          <span className="text-white font-mono">{selectedBooking.refund_id}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Bank Transfer Status</span>
                        <span className="text-emerald-400 font-bold flex items-center">
                          {selectedBooking.payment_status === 'Settled' ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1 animate-pulse text-blue-400" />
                              <span className="text-blue-400">Processing</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 flex gap-3 print-hide">
                  <button
                    onClick={handleDownloadReceipt}
                    className="flex-1 bg-white/5 text-slate-300 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              <div className="bg-white/5 p-4 text-center border-t border-white/5">
                <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  This is a computer generated receipt.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center border border-white/10"
            >
              <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Cancel Booking?</h2>
              <p className="text-slate-400 text-sm mb-4">Are you sure you want to cancel this reservation? This action cannot be undone.</p>

              {/* Cashback breakdown preview */}
              {cancelPreviewBooking && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2.5">
                  <div className="flex items-center space-x-2 mb-3">
                    <IndianRupee className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Refund Breakdown</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Amount Paid</span>
                    <span className="text-white font-medium">₹{(cancelPreviewBooking.amount_paid || cancelPreviewBooking.price_per_hour * cancelPreviewBooking.duration_hours).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Cancellation Fee (30%)</span>
                    <span className="text-red-400 font-medium">-₹{((cancelPreviewBooking.amount_paid || cancelPreviewBooking.price_per_hour * cancelPreviewBooking.duration_hours) * 0.3).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10">
                    <span className="text-emerald-400">You'll receive back</span>
                    <span className="text-emerald-400">₹{((cancelPreviewBooking.amount_paid || cancelPreviewBooking.price_per_hour * cancelPreviewBooking.duration_hours) * 0.7).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="text-left mb-6">
                <label className="text-xs font-bold text-slate-500 ml-1 mb-2 block uppercase">Reason for cancellation</label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="Change of plans">Change of plans</option>
                  <option value="Found a better spot">Found a better spot</option>
                  <option value="Vehicle issues">Vehicle issues</option>
                  <option value="Mistake in booking">Mistake in booking</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 bg-white/5 text-slate-300 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-all border border-white/10"
                >
                  No, Keep it
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cashback Success Modal */}
      <AnimatePresence>
        {showCashbackModal && cashbackInfo && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCashbackModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="relative bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
            >
              {/* Green gradient header */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                  className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"
                >
                  <ArrowDownLeft className="h-10 w-10" />
                </motion.div>
                <h2 className="text-2xl font-bold">Cashback Initiated!</h2>
                <p className="text-emerald-100 text-sm mt-1">Your refund is being processed</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Refund Amount</span>
                    <span className="text-emerald-400 font-bold text-lg">₹{cashbackInfo.refund_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-4 border-t border-white/5">
                    <span className="text-slate-400">Refund Transaction ID</span>
                    <span className="text-white font-mono font-medium">{cashbackInfo.refund_id}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Original Payment</span>
                    <span className="text-white font-medium">UPI / Bank Account</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start space-x-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The refund has been initiated and will be credited to your original payment method within <span className="text-blue-400 font-bold">3-4 business days</span>. Please keep the Transaction ID for your records.
                  </p>
                </div>

                <button
                  onClick={() => setShowCashbackModal(false)}
                  className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 mt-2"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refund Tracking Modal */}
      <AnimatePresence>
        {showRefundTracking && trackingBooking && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRefundTracking(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="bg-slate-800/50 p-8 border-b border-white/10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Refund Tracking</h2>
                    <p className="text-slate-400 text-sm mt-1">Ref ID: {trackingBooking.refund_id}</p>
                  </div>
                  <button onClick={() => setShowRefundTracking(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="space-y-8 relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-white/10" />

                  {/* Step 1: Initiated */}
                  <div className="relative flex items-start space-x-6">
                    <div className="relative z-10 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border-4 border-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">Refund Initiated</h4>
                      <p className="text-slate-400 text-sm">Successfully requested for ₹{trackingBooking.refund_amount?.toFixed(2)}</p>
                      <p className="text-slate-600 text-xs mt-1">Day 1</p>
                    </div>
                  </div>

                  {/* Step 2: Processing */}
                  <div className={`relative flex items-start space-x-6 ${trackingBooking.payment_status === 'Settled' ? 'opacity-100' : ''}`}>
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-4 border-slate-900 ${trackingBooking.payment_status === 'Settled'
                      ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse'
                      }`}>
                      {trackingBooking.payment_status === 'Settled' ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Clock className="h-4 w-4 text-white" />}
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{trackingBooking.payment_status === 'Settled' ? 'Processed' : 'Bank Processing'}</h4>
                      <p className="text-slate-400 text-sm">{trackingBooking.payment_status === 'Settled' ? 'Verification completed by bank' : 'Transfer in progress with payment gateway'}</p>
                      <p className="text-slate-600 text-xs mt-1">Day 2</p>
                    </div>
                  </div>

                  {/* Step 3: Completed */}
                  <div className={`relative flex items-start space-x-6 ${trackingBooking.payment_status === 'Settled' ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-4 border-slate-900 ${trackingBooking.payment_status === 'Settled'
                      ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-white/10'
                      }`}>
                      {trackingBooking.payment_status === 'Settled' ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Wallet className="h-4 w-4 text-slate-400" />}
                    </div>
                    <div>
                      <h4 className={`${trackingBooking.payment_status === 'Settled' ? 'text-white' : 'text-slate-400'} font-bold`}>Credited to Bank</h4>
                      <p className={`${trackingBooking.payment_status === 'Settled' ? 'text-emerald-400' : 'text-slate-600'} text-sm font-medium`}>
                        {trackingBooking.payment_status === 'Settled' ? 'Success! Amount credited to your account' : 'Amount will reflect in your account statement'}
                      </p>
                      <p className="text-slate-700 text-xs mt-1">Day 3-4</p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center space-x-3 text-amber-400 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Note</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Refunds are processed back to your original payment method. If you used UPI, check your bank statement associated with the VPA.
                  </p>
                </div>

                <button
                  onClick={() => setShowRefundTracking(false)}
                  className="w-full bg-white/10 text-white py-4 rounded-xl font-bold text-sm hover:bg-white/20 transition-all mt-8 border border-white/10"
                >
                  Close Tracker
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Feedback Form Modal */}
      <AnimatePresence>
        {showReviewModal && bookingToReview && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReviewModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="bg-slate-800/50 p-6 border-b border-white/10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">Feedback Form</h2>
                  <p className="text-slate-400 text-sm mt-1">{bookingToReview.parking_name}</p>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="p-6 space-y-6">

                {/* Rating Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Overall Rating *</label>
                  <div className="flex items-center space-x-1 bg-white/5 border border-white/10 p-3 rounded-xl w-fit">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, rating: star })}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 transition-all duration-300 ${star <= (hoveredStar || reviewData.rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-600'
                            }`}
                        />
                      </button>
                    ))}
                    <span className="text-sm font-medium text-slate-400 ml-3 min-w-[80px]">
                      {hoveredStar === 1 || (reviewData.rating === 1 && !hoveredStar) ? 'Terrible' :
                        hoveredStar === 2 || (reviewData.rating === 2 && !hoveredStar) ? 'Bad' :
                          hoveredStar === 3 || (reviewData.rating === 3 && !hoveredStar) ? 'Okay' :
                            hoveredStar === 4 || (reviewData.rating === 4 && !hoveredStar) ? 'Good' :
                              hoveredStar === 5 || (reviewData.rating === 5 && !hoveredStar) ? 'Excellent' : ''}
                    </span>
                  </div>
                </div>

                {/* Experience Select */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">How was your parking experience?</label>
                  <select
                    value={reviewData.experience || 'Smooth'}
                    onChange={(e) => setReviewData({ ...reviewData, experience: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Smooth">Smooth - Easy to find and park</option>
                    <option value="Average">Average - Minor issues but acceptable</option>
                    <option value="Difficult">Difficult - Hard to find or tight space</option>
                  </select>
                </div>

                {/* Recommend Radio */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Would you recommend this spot?</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recommend"
                        value="Yes"
                        checked={(reviewData.recommend || 'Yes') === 'Yes'}
                        onChange={(e) => setReviewData({ ...reviewData, recommend: e.target.value })}
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-600 focus:ring-blue-600 focus:ring-offset-slate-900"
                      />
                      <span className="text-slate-300 text-sm">Yes</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recommend"
                        value="No"
                        checked={(reviewData.recommend || 'Yes') === 'No'}
                        onChange={(e) => setReviewData({ ...reviewData, recommend: e.target.value })}
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-600 focus:ring-blue-600 focus:ring-offset-slate-900"
                      />
                      <span className="text-slate-300 text-sm">No</span>
                    </label>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Additional Comments</label>
                  <textarea
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                    placeholder="Provide more details about your experience..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] resize-y"
                  />
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {submittingReview ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Submit Form</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Reschedule Modal */}
      <AnimatePresence>
        {showRescheduleModal && reschedulingId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRescheduleModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="bg-blue-600 p-8 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <RefreshCw className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold">Reschedule Booking</h2>
                <p className="text-blue-100 text-sm mt-1">Change your reservation time</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Date</label>
                    <input
                      type="date"
                      value={rescheduleData.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Time</label>
                    <input
                      type="time"
                      value={rescheduleData.time}
                      onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                    <input
                      type="date"
                      value={rescheduleData.endDate}
                      min={rescheduleData.date}
                      onChange={(e) => setRescheduleData({ ...rescheduleData, endDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Time</label>
                    <input
                      type="time"
                      value={rescheduleData.endTime}
                      onChange={(e) => setRescheduleData({ ...rescheduleData, endTime: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                  <span className="text-sm text-slate-400">Calculated Duration</span>
                  <span className="font-bold text-white">
                    {rescheduleData.duration > 0 ? (
                      formatDuration(rescheduleData.duration)
                    ) : (
                      <span className="text-red-400">Invalid Range</span>
                    )}
                  </span>
                </div>

                {/* Price Difference Indicator */}
                {(() => {
                  const booking = bookings.find(b => b.id === reschedulingId);
                  const pricePerHour = booking.amount_paid / booking.duration_hours;
                  const newTotal = pricePerHour * rescheduleData.duration;
                  const diff = newTotal - booking.amount_paid;

                  return (
                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${diff > 0 ? 'bg-amber-500/10 border-amber-500/20' : diff < 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'
                      }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${diff > 0 ? 'bg-amber-500/20' : diff < 0 ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                          <IndianRupee className={`h-4 w-4 ${diff > 0 ? 'text-amber-400' : diff < 0 ? 'text-emerald-400' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Price Adjustment</p>
                          <p className={`text-sm font-bold ${diff > 0 ? 'text-amber-400' : diff < 0 ? 'text-emerald-400' : 'text-white'}`}>
                            {diff > 0 ? `Pay Extra ₹${diff.toFixed(2)}` : diff < 0 ? `Refund ₹${Math.abs(diff).toFixed(2)}` : 'No Change'}
                          </p>
                        </div>
                      </div>
                      <ShieldCheck className={`h-5 w-5 ${diff >= 0 ? 'text-blue-500' : 'text-emerald-500'}`} />
                    </div>
                  );
                })()}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRescheduleModal(false)}
                    className="flex-1 bg-white/5 text-slate-300 py-3.5 rounded-xl font-bold text-sm hover:bg-white/10 transition-all border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReschedule}
                    className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    Confirm Change
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[120] px-6 py-3 rounded-2xl shadow-xl flex items-center space-x-3 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
