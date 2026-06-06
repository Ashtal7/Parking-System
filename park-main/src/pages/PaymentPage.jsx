import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Smartphone,
  ArrowLeft,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';
import { formatDuration } from '../lib/utils';

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');

  // Data passed from BookingPage
  const bookingData = location.state;

  useEffect(() => {
    if (!bookingData) {
      navigate('/search');
    }
  }, [bookingData, navigate]);

  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [cardErrors, setCardErrors] = useState({});

  const getCardBrand = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5')) return 'Mastercard';
    if (cleaned.startsWith('3')) return 'Amex';
    return 'Card';
  };

  const validateUpiId = (id) => {
    // UPI ID format: username@provider
    // Username: letters, digits, dots, hyphens, underscores (min 2 chars)
    // Provider: letters and digits, may contain dots for sub-providers (min 2 chars)
    // Valid examples: name@oksbi, 9876543210@paytm, user.name@okicici, raj@ybl, user@ok.sbi
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z][a-zA-Z0-9.]{1,}$/;
    return upiRegex.test(id);
  };

  const validateCardDetails = () => {
    const errors = {};
    const cleanNumber = cardDetails.number.replace(/\s/g, '');
    const cleanExpiry = cardDetails.expiry.replace(/\s|\/|\//g, '');

    // Name: letters and spaces only, at least 2 chars
    if (!cardDetails.name.trim()) {
      errors.name = 'Cardholder name is required.';
    } else if (!/^[a-zA-Z\s]{2,}$/.test(cardDetails.name.trim())) {
      errors.name = 'Name must contain only letters and spaces.';
    }

    // Card number: must be exactly 16 digits
    if (!cleanNumber) {
      errors.number = 'Card number is required.';
    } else if (cleanNumber.length < 16) {
      errors.number = 'Card number must be 16 digits.';
    } else if (!/^\d{16}$/.test(cleanNumber)) {
      errors.number = 'Card number must contain only digits.';
    }

    // Expiry: valid MM/YY, month 01-12, not expired
    if (!cleanExpiry) {
      errors.expiry = 'Expiry date is required.';
    } else if (cleanExpiry.length < 4) {
      errors.expiry = 'Enter a valid expiry (MM / YY).';
    } else {
      const month = parseInt(cleanExpiry.slice(0, 2), 10);
      const year = parseInt('20' + cleanExpiry.slice(2, 4), 10);
      if (month < 1 || month > 12) {
        errors.expiry = 'Month must be between 01 and 12.';
      } else {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          errors.expiry = 'This card has expired.';
        }
      }
    }

    // CVV: exactly 3 digits
    if (!cardDetails.cvv) {
      errors.cvv = 'CVV is required.';
    } else if (!/^\d{3}$/.test(cardDetails.cvv)) {
      errors.cvv = 'CVV must be 3 digits.';
    }

    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUpiError('');

    // Validate based on payment method
    if (paymentMethod === 'UPI') {
      if (!upiId.trim()) {
        setUpiError('Please enter your UPI ID.');
        setLoading(false);
        return;
      }
      if (!validateUpiId(upiId.trim())) {
        setUpiError('Enter a valid UPI ID (e.g. name@oksbi, 9876543210@paytm)');
        setLoading(false);
        return;
      }
    } else if (paymentMethod === 'CARD') {
      if (!validateCardDetails()) {
        setLoading(false);
        return;
      }
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      let res;
      if (bookingData.type === 'reschedule') {
        const payload = bookingData.rescheduleData;
        res = await apiFetch(`/api/bookings/${bookingData.booking_id}/reschedule`, {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            payment_method: paymentMethod,
            payment_reference: paymentMethod === 'UPI' ? upiId : `CARD-****${cardDetails.number.slice(-4)}`
          }),
        });
      } else {
        res = await apiFetch('/api/book', {
          method: 'POST',
          body: JSON.stringify({
            ...bookingData,
            payment_method: paymentMethod,
            payment_reference: paymentMethod === 'UPI' ? upiId : `CARD-****${cardDetails.number.slice(-4)}`
          }),
        });
      }

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/my-bookings'), 2500);
      } else {
        const data = await res.json();
        setError(data.error || 'Your card was declined. Please try another payment method.');
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
      setLoading(false);
    }
  };

  if (!bookingData) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-[1200px] mx-auto min-h-screen grid grid-cols-1 lg:grid-cols-[450px_1fr]">

        {/* Left: Summary Sidebar */}
        <div className="bg-slate-900/50 lg:border-r border-white/5 p-8 lg:p-12 flex flex-col">
          <Link
            to={`/book/${bookingData.parking_id}`}
            className="inline-flex items-center text-slate-500 hover:text-white mb-12 transition-colors group text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span>Back to spot details</span>
          </Link>

          <header className="mb-12">
            <h1 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">Checkout</h1>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold text-white">₹{bookingData.amount.toLocaleString('en-IN')}</span>
              <span className="text-slate-500 font-medium">total due</span>
            </div>
          </header>

          <div className="flex-1 space-y-8">
            <div className="space-y-6">
              <div className="flex space-x-4">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shrink-0">
                  <MapPin className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold leading-none mb-2">{bookingData.spot_name}</h3>
                  <p className="text-slate-500 text-sm truncate max-w-[250px]">{bookingData.address || 'Premium Parking Spot'}</p>
                </div>
              </div>

              <div className="space-y-3 bg-white/5 p-5 rounded-3xl border border-white/5">
                <div className="flex items-start space-x-3">
                  <Calendar className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-white font-medium">
                      {new Date(bookingData.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-slate-500">Booking Date</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-white font-medium">{formatDuration(bookingData.duration_hours)}</p>
                    <p className="text-slate-500">Duration</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5 text-sm">
              <div className="flex justify-between">
                {bookingData.pricing_type === 'fixed' ? (
                  <>
                    <span className="text-slate-400">Rate</span>
                    <span className="text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 text-xs">Fixed Rate</span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-400">Rate (₹{bookingData.price_per_hour}/hr)</span>
                    <span className="text-white">₹{bookingData.amount}</span>
                  </>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Service Fee</span>
                <span className="text-green-400 font-medium">₹0.00</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-4 border-t border-white/10">
                <span className="text-white">Amount due</span>
                <span className="text-white">₹{bookingData.amount}</span>
              </div>
            </div>
          </div>

          <footer className="mt-12 pt-8 border-t border-white/5">
            <div className="flex items-center space-x-3 text-slate-500 mb-4">
              <ShieldCheck className="h-5 w-5 text-green-500/80" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Powered by SafePass Secure</span>
            </div>
          </footer>
        </div>

        {/* Right: Payment Form Area */}
        <div className="p-8 lg:p-24 flex flex-col justify-center">
          <div className="max-w-[450px] mx-auto w-full">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="bg-green-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/20 shadow-[0_0_50px_-12px_rgba(34,197,94,0.3)]">
                    <CheckCircle2 className="h-12 w-12 text-green-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">Payment Complete</h2>
                  <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                    Great! Your spot at <span className="text-white font-medium">{bookingData.spot_name}</span> is confirmed.
                  </p>
                  <div className="flex items-center justify-center space-x-3 text-blue-400 bg-blue-500/10 py-3 px-6 rounded-full inline-flex font-medium">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Confirming with host...</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Payment Details</h2>
                    <p className="text-slate-500">Complete your reservation securely.</p>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl flex items-center space-x-3 text-sm"
                    >
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setPaymentMethod('CARD')}
                      className={`flex items-center justify-center space-x-2 py-3 rounded-xl transition-all font-semibold text-sm ${paymentMethod === 'CARD'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Card</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('UPI')}
                      className={`flex items-center justify-center space-x-2 py-3 rounded-xl transition-all font-semibold text-sm ${paymentMethod === 'UPI'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>UPI</span>
                    </button>
                  </div>

                  <form onSubmit={handlePayment} className="space-y-6">
                    <AnimatePresence mode="wait">
                      {paymentMethod === 'CARD' ? (
                        <motion.div
                          key="card-fields"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Cardholder Name</label>
                            <input
                              type="text"
                              placeholder="Name on card"
                              className={`w-full px-5 py-4 bg-white/5 border rounded-2xl focus:outline-none focus:ring-2 text-white transition-all placeholder:text-slate-800 font-medium ${cardErrors.name ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-blue-500/50'}`}
                              value={cardDetails.name}
                              onChange={(e) => {
                                // Only allow letters and spaces
                                const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                setCardDetails({ ...cardDetails, name: val });
                                setCardErrors(prev => ({ ...prev, name: '' }));
                              }}
                            />
                            {cardErrors.name && (
                              <p className="text-red-400 text-xs mt-1 flex items-center space-x-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                <span>{cardErrors.name}</span>
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Card Information</label>
                            <div className="relative group">
                              <input
                                type="text"
                                placeholder="0000 0000 0000 0000"
                                maxLength={19}
                                className={`w-full px-5 py-4 bg-white/5 border rounded-2xl focus:outline-none focus:ring-2 text-white transition-all placeholder:text-slate-800 font-mono text-lg ${cardErrors.number ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-blue-500/50'}`}
                                value={cardDetails.number}
                                onChange={(e) => {
                                  let val = e.target.value.replace(/\D/g, '');
                                  val = val.match(/.{1,4}/g)?.join(' ') || val;
                                  setCardDetails({ ...cardDetails, number: val });
                                  setCardErrors(prev => ({ ...prev, number: '' }));
                                }}
                              />
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center">
                                <span className="text-[10px] font-black tracking-widest text-slate-600 group-focus-within:text-blue-400 uppercase transition-colors">
                                  {getCardBrand(cardDetails.number)}
                                </span>
                              </div>
                            </div>
                            {cardErrors.number && (
                              <p className="text-red-400 text-xs mt-1 flex items-center space-x-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                <span>{cardErrors.number}</span>
                              </p>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <input
                                  type="text"
                                  placeholder="MM / YY"
                                  maxLength={7}
                                  className={`w-full px-5 py-4 bg-white/5 border rounded-2xl focus:outline-none focus:ring-2 text-white transition-all placeholder:text-slate-800 font-mono ${cardErrors.expiry ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-blue-500/50'}`}
                                  value={cardDetails.expiry}
                                  onChange={(e) => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    if (val.length >= 2) val = val.slice(0, 2) + ' / ' + val.slice(2, 4);
                                    setCardDetails({ ...cardDetails, expiry: val });
                                    setCardErrors(prev => ({ ...prev, expiry: '' }));
                                  }}
                                />
                                {cardErrors.expiry && (
                                  <p className="text-red-400 text-xs mt-1 flex items-center space-x-1">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    <span>{cardErrors.expiry}</span>
                                  </p>
                                )}
                              </div>
                              <div>
                                <input
                                  type="password"
                                  placeholder="CVC"
                                  maxLength={3}
                                  className={`w-full px-5 py-4 bg-white/5 border rounded-2xl focus:outline-none focus:ring-2 text-white transition-all placeholder:text-slate-800 font-mono tracking-widest ${cardErrors.cvv ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-blue-500/50'}`}
                                  value={cardDetails.cvv}
                                  onChange={(e) => {
                                    setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '') });
                                    setCardErrors(prev => ({ ...prev, cvv: '' }));
                                  }}
                                />
                                {cardErrors.cvv && (
                                  <p className="text-red-400 text-xs mt-1 flex items-center space-x-1">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    <span>{cardErrors.cvv}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="upi-fields"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">UPI ID</label>
                            <input
                              type="text"
                              required
                              maxLength={20}
                              placeholder="username@upi"
                              className={`w-full px-5 py-4 bg-white/5 border rounded-2xl focus:outline-none focus:ring-2 text-white transition-all placeholder:text-slate-800 font-medium ${upiError
                                ? 'border-red-500/50 focus:ring-red-500/50'
                                : 'border-white/10 focus:ring-blue-500/50'
                                }`}
                              value={upiId}
                              onChange={(e) => {
                                // Only allow valid UPI characters: letters, numbers, dots, hyphens, underscores, @
                                let val = e.target.value.replace(/[^a-zA-Z0-9.\-_@]/g, '');
                                // Prevent multiple @ symbols — only one is allowed in a UPI ID
                                const atCount = (val.match(/@/g) || []).length;
                                if (atCount > 1) {
                                  const firstAt = val.indexOf('@');
                                  val = val.slice(0, firstAt + 1) + val.slice(firstAt + 1).replace(/@/g, '');
                                }
                                setUpiId(val);
                                setUpiError('');
                              }}
                              onBlur={() => {
                                if (upiId.trim() && !validateUpiId(upiId.trim())) {
                                  setUpiError('Enter a valid UPI ID (e.g. name@oksbi, 9876543210@paytm)');
                                }
                              }}
                            />
                            {upiError && (
                              <p className="text-red-400 text-xs mt-1 flex items-center space-x-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                <span>{upiError}</span>
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full relative overflow-hidden bg-white text-slate-950 py-5 rounded-2xl font-black text-lg hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] disabled:opacity-50 transition-all active:scale-[0.98] mt-4"
                    >
                      <span className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity flex items-center justify-center space-x-2`}>
                        <Lock className="h-5 w-5" />
                        <span>Pay ₹{bookingData.amount.toLocaleString('en-IN')}</span>
                      </span>
                      {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-950" />
                        </div>
                      )}
                    </button>

                    <div className="flex items-start space-x-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                      <Globe className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        By completing this transaction, you agree to the <span className="text-white hover:underline cursor-pointer">Terms of Service</span>. Your payment info is secured with 256-bit encryption.
                      </p>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
