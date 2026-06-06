import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Car, ArrowLeft, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Wallet, AlertTriangle, Star, MessageSquare, Zap, Bike } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';
import { formatDuration } from '../lib/utils';

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [spot, setSpot] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('12:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('13:00');
  const [duration, setDuration] = useState(1);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showRefundPolicy, setShowRefundPolicy] = useState(false);

  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [spotRes, userRes, reviewsRes] = await Promise.all([
          apiFetch(`/api/parking/${id}`),
          apiFetch('/api/me'),
          apiFetch(`/api/parking/${id}/reviews`)
        ]);

        if (spotRes.ok) setSpot(await spotRes.json());
        if (userRes.ok) setUser(await userRes.json());
        if (reviewsRes.ok) setReviews(await reviewsRes.json());
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!startDate || !startTime || !endDate || !endTime) return;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (end > start) {
      const diffMs = end.getTime() - start.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      setDuration(diffHrs);
    } else {
      setDuration(0);
    }
  }, [startDate, startTime, endDate, endTime]);

  const isOwner = spot && user && spot.owner_id === user.id;
  const isFixed = spot?.pricing_type === 'fixed';
  const totalAmount = isFixed ? (spot?.fixed_price || 0) : (spot?.price_per_hour || 0) * duration;

  const handleBook = (e) => {
    e.preventDefault();
    
    if (duration <= 0) {
      setError('End time must be after start time');
      return;
    }

    // Show refund policy modal before proceeding to payment
    setShowRefundPolicy(true);
  };

  const confirmProceed = () => {
    setShowRefundPolicy(false);
    navigate('/payment', {
      state: {
        parking_id: id,
        spot_name: spot?.name,
        address: spot?.address,
        date: startDate,
        time: startTime,
        duration_hours: parseFloat(duration.toFixed(2)),
        amount: parseFloat(totalAmount.toFixed(2)),
        price_per_hour: spot?.price_per_hour || 0,
        pricing_type: spot?.pricing_type || 'per_hour',
        fixed_price: spot?.fixed_price || 0
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white">Parking spot not found</h1>
        <Link to="/search" className="text-blue-400 hover:underline mt-4 inline-block">Back to search</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/search" className="inline-flex items-center text-slate-400 hover:text-blue-400 mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-2" />
        <span>Back to search</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Spot Details */}
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/10"
          >
            <div className="bg-blue-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 shrink-0">
              {spot.vehicle_type === 'bike' ? (
                <Bike className="h-8 w-8 text-blue-400" />
              ) : (
                <Car className="h-8 w-8 text-blue-400" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{spot.name}</h1>
            <div className="flex items-center text-slate-400 mb-4">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{spot.address}</span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {spot.is_ev === 1 && (
                <div className="flex items-center space-x-1 bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-bold text-emerald-400 border border-emerald-500/20">
                  <Zap className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/20 animate-pulse" />
                  <span>EV Charging Available</span>
                </div>
              )}
              <div className="flex items-center space-x-1.5 bg-indigo-500/10 px-3 py-1 rounded-full text-xs font-bold text-indigo-400 border border-indigo-500/20">
                {spot.vehicle_type === 'car' ? (
                  <>
                    <Car className="h-3.5 w-3.5" />
                    <span>Cars Only</span>
                  </>
                ) : spot.vehicle_type === 'bike' ? (
                  <>
                    <Bike className="h-3.5 w-3.5" />
                    <span>Bikes Only</span>
                  </>
                ) : (
                  <>
                    <div className="flex gap-0.5">
                      <Car className="h-3.5 w-3.5" />
                      <Bike className="h-3.5 w-3.5" />
                    </div>
                    <span>Cars & Bikes Supported</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{isFixed ? 'Pricing' : 'Price per hour'}</span>
                {isFixed ? (
                  <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Fixed Rate</span>
                ) : (
                  <span className="text-xl font-bold text-white">₹{spot.price_per_hour}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Available Slots</span>
                <span className="text-green-400 font-bold">{spot.availability}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Booked Slots</span>
                <span className="text-red-400 font-bold">{spot.total_slots - spot.availability}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Service Fee</span>
                <span className="text-slate-200 font-bold">₹0.00</span>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-lg font-bold text-white">Total</span>
                <span className="text-2xl font-black text-blue-500">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </motion.div>


        </div>

        {/* Right: Booking Form */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {success ? (
            <div className="bg-white/5 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-2xl border border-green-500/20 text-center">
              <div className="bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
              <p className="text-slate-400 mb-6">Your parking spot has been reserved successfully.</p>
              <p className="text-sm text-slate-500">Redirecting to your bookings...</p>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">Reservation Details</h2>
              
              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center space-x-2 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleBook} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Start Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <input 
                        type="date" 
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Start Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <input 
                        type="time" 
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">End Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <input 
                        type="date" 
                        required
                        min={startDate}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">End Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <input 
                        type="time" 
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                  <span className="text-sm text-slate-400">Calculated Duration</span>
                  <span className="font-bold text-white">
                    {duration > 0 ? (
                      formatDuration(duration)
                    ) : (
                      <span className="text-red-400">Invalid Range</span>
                    )}
                  </span>
                </div>

                <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                  {isFixed ? (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">Pricing Type</span>
                        <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">Fixed Rate</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">Total Time</span>
                        <span className="font-bold text-white">{formatDuration(duration)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-blue-500/10">
                        <span className="text-sm font-bold text-white">Total Amount</span>
                        <span className="text-xl font-black text-blue-500">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">Price per hour</span>
                        <span className="font-bold text-white">₹{spot.price_per_hour}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">Total Time</span>
                        <span className="font-bold text-white">{formatDuration(duration)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-blue-500/10">
                        <span className="text-sm font-bold text-white">Total Amount</span>
                        <span className="text-xl font-black text-blue-500">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                </div>
 
                <button 
                  type="submit"
                  disabled={booking || spot.availability <= 0 || isOwner}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {booking ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {isOwner ? (
                        <>
                          <span>You are the Owner</span>
                          <AlertCircle className="h-5 w-5" />
                        </>
                      ) : spot.availability <= 0 ? (
                        <>
                          <span>Sold Out</span>
                          <AlertCircle className="h-5 w-5" />
                        </>
                      ) : (
                        <>
                          <span>Proceed to Payment</span>
                          <CheckCircle2 className="h-5 w-5" />
                        </>
                      )}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>

      {/* Reviews Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-12"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
              <MessageSquare className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">User Reviews</h2>
          </div>
          {spot.avg_rating && (
            <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
              <div className="flex items-center text-yellow-400 font-bold">
                <Star className="h-4 w-4 fill-yellow-400 mr-1" />
                <span>{parseFloat(spot.avg_rating).toFixed(1)}</span>
              </div>
              <span className="text-slate-500 text-sm">•</span>
              <span className="text-slate-400 text-sm font-medium">{spot.review_count} Reviews</span>
            </div>
          )}
        </div>

        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-br from-slate-700 to-slate-800 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold border border-white/10">
                      {review.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{review.user_name}</p>
                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed italic">"{review.comment || 'No comment provided.'}"</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 border-dashed rounded-[2.5rem] py-16 text-center">
            <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <MessageSquare className="h-8 w-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">No reviews yet for this location.</p>
            <p className="text-slate-500 text-sm mt-1">Be the first to share your experience!</p>
          </div>
        )}
      </motion.div>



      {/* Refund Policy Modal */}
      <AnimatePresence>
        {showRefundPolicy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRefundPolicy(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                  className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"
                >
                  <ShieldCheck className="h-8 w-8" />
                </motion.div>
                <h2 className="text-2xl font-bold">Cancellation Policy</h2>
                <p className="text-amber-100 text-sm mt-1">Please review before proceeding</p>
              </div>

              <div className="p-8 space-y-5">
                {/* Policy info */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300 leading-relaxed">
                      If you cancel this booking after payment, a <span className="text-amber-400 font-bold">{spot.cancellation_fee_percent || 30}% cancellation fee</span> will be deducted from your paid amount.
                    </p>
                  </div>
                </div>

                {/* Refund breakdown */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center space-x-2 mb-3">
                    <Wallet className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">If Cancelled</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Booking Amount</span>
                    <span className="text-white font-medium">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Cancellation Fee ({spot.cancellation_fee_percent || 30}%)</span>
                    <span className="text-red-400 font-medium">-₹{(totalAmount * (spot.cancellation_fee_percent || 30) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10">
                    <span className="text-emerald-400">You'd get back ({100 - (spot.cancellation_fee_percent || 30)}%)</span>
                    <span className="text-emerald-400">₹{(totalAmount * (100 - (spot.cancellation_fee_percent || 30)) / 100).toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-slate-500 text-xs text-center">
                  By proceeding, you acknowledge and agree to the cancellation policy.
                </p>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowRefundPolicy(false)}
                    className="flex-1 bg-white/5 text-slate-300 py-3.5 rounded-xl font-bold text-sm hover:bg-white/10 transition-all border border-white/10"
                  >
                    Go Back
                  </button>
                  <button 
                    onClick={confirmProceed}
                    className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
                  >
                    <span>Continue to Pay</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
