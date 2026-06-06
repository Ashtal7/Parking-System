import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Smartphone,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building,
  User,
  IndianRupee,
  Receipt,
  ArrowRight,
  Copy,
  Check,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';

export default function RefundPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('Wallet');
  const [refId, setRefId] = useState('');
  const [copied, setCopied] = useState(false);

  const booking = location.state?.booking;

  useEffect(() => {
    if (!booking) {
      navigate('/owner-dashboard');
      return;
    }
  }, [booking, navigate]);

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    
    const trimmedRefId = refId.trim();
    if (!trimmedRefId) {
      setError('Please enter a transaction reference ID.');
      return;
    }

    // Validation for Recipient IDs (User's ID)
    if (method === 'UPI') {
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
      if (!upiRegex.test(trimmedRefId)) {
        setError('Invalid Recipient UPI ID. Please enter a valid UPI ID (e.g., name@bank).');
        return;
      }
    } else if (method === 'Wallet') {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(trimmedRefId)) {
        setError('Invalid Wallet Number. It should be a 10-digit mobile number.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiFetch(`/api/owner/confirm-refund/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: booking.refund_amount,
          transaction_ref: refId,
          method: method
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/owner-dashboard'), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to process refund. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please check your connection.');
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-[1200px] mx-auto min-h-screen grid grid-cols-1 lg:grid-cols-[450px_1fr]">
        
        {/* Left: Refund Summary */}
        <div className="bg-slate-900/50 lg:border-r border-white/5 p-8 lg:p-12 flex flex-col">
          <Link 
            to="/owner-dashboard" 
            className="inline-flex items-center text-slate-500 hover:text-white mb-12 transition-colors group text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </Link>

          <header className="mb-12">
            <h1 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">Refund Processing</h1>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold text-emerald-400">₹{booking.refund_amount?.toFixed(2)}</span>
              <span className="text-slate-500 font-medium">to be refunded</span>
            </div>
          </header>

          <div className="flex-1 space-y-8">
            <div className="space-y-6">
              <div className="flex space-x-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <User className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold leading-none mb-2">{booking.user_name}</h3>
                  <p className="text-slate-500 text-sm truncate max-w-[250px]">{booking.user_email}</p>
                </div>
              </div>

              <div className="space-y-3 bg-white/5 p-5 rounded-3xl border border-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Receipt className="h-4 w-4 text-slate-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-white font-medium">Original Booking</p>
                      <p className="text-slate-500">{booking.parking_name}</p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs font-mono">#{booking.id}</span>
                </div>
                
                <div className="flex items-start space-x-3 pt-3 border-t border-white/5">
                  <Smartphone className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-emerald-400 font-medium">{booking.user_phone || 'N/A'}</p>
                    <p className="text-slate-500">User Phone Number</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 pt-3 border-t border-white/5">
                  <Receipt className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-emerald-400 font-medium">{booking.payment_reference || 'N/A'}</p>
                    <p className="text-slate-500">User Payment Ref</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Original Paid</span>
                <span className="text-white">₹{booking.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cancellation Fee (30%)</span>
                <span className="text-red-400">-₹{(booking.amount * 0.3).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-4 border-t border-white/10">
                <span className="text-white">Refund Payable</span>
                <span className="text-emerald-400">₹{booking.refund_amount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <footer className="mt-12 pt-8 border-t border-white/5">
            <div className="flex items-center space-x-3 text-slate-500">
              <ShieldCheck className="h-5 w-5 text-emerald-500/80" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Merchant Secure Refund Gate</span>
            </div>
          </footer>
        </div>

        {/* Right: Refund Action Area */}
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
                  <div className="bg-emerald-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">Refund Settled</h2>
                  <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                    The refund for <span className="text-white font-medium">{booking.user_name}</span> has been marked as settled and they have been notified.
                  </p>
                  <div className="flex items-center justify-center space-x-3 text-emerald-400 bg-emerald-500/10 py-3 px-6 rounded-full inline-flex font-medium">
                    <span>Transaction ID: {refId}</span>
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
                    <h2 className="text-2xl font-bold text-white mb-2">Process Settlement</h2>
                    <p className="text-slate-500">Select the method used for this manual transfer.</p>
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

                  {/* Card Refund Notice */}
                  {booking.payment_reference?.startsWith('CARD') && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-blue-500/10 p-5 rounded-[2rem] border border-blue-500/20 flex items-start space-x-4 shadow-lg shadow-blue-500/5"
                    >
                      <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/20 shrink-0">
                        <CreditCard className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Card Payment detected</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          This booking was paid via Card. You must contact <span className="text-white font-medium">{booking.user_email}</span> manually to obtain their refund details (UPI or Bank) before settling.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Method Selector */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setMethod('Wallet')}
                      className={`flex items-center justify-center space-x-2 py-4 rounded-xl transition-all font-semibold text-sm ${
                        method === 'Wallet'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Wallet className="h-4 w-4" />
                      <span>Wallet</span>
                    </button>
                    <button
                      onClick={() => setMethod('UPI')}
                      className={`flex items-center justify-center space-x-2 py-4 rounded-xl transition-all font-semibold text-sm ${
                        method === 'UPI'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>UPI</span>
                    </button>
                  </div>

                  {/* UPI Recipient Details - Only shown when UPI is selected */}
                  {method === 'UPI' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-emerald-500/70 uppercase font-black tracking-widest mb-1">Transfer To (UPI ID)</p>
                          <p className="text-white font-mono font-bold text-lg">{booking.payment_reference && booking.payment_reference.includes('@') ? booking.payment_reference : 'Not Provided'}</p>
                        </div>
                        {booking.payment_reference && booking.payment_reference.includes('@') && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(booking.payment_reference);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all group border border-emerald-500/20"
                            title="Copy UPI ID"
                          >
                            {copied ? (
                              <Check className="h-5 w-5 text-emerald-400" />
                            ) : (
                              <Copy className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        Use your UPI app to send <span className="text-emerald-400 font-bold">₹{booking.refund_amount?.toFixed(2)}</span> to this ID.
                      </p>
                    </motion.div>
                  )}

                  <form onSubmit={handleProcessRefund} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">
                          {method === 'UPI' ? "Recipient's UPI ID" : "Recipient's Mobile Number"}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={method === 'UPI' ? "e.g. user@bank" : "Enter 10-digit mobile number"}
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all font-mono"
                          value={refId}
                          onChange={(e) => {
                            setRefId(e.target.value);
                            if (error) setError('');
                          }}
                        />
                        <p className="text-[10px] text-slate-500 italic mt-1">
                          Enter the {method === 'UPI' ? "UPI ID" : "Mobile Number"} where you sent the refund.
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full relative overflow-hidden bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-emerald-500 transition-all active:scale-[0.98] mt-4 shadow-lg shadow-emerald-600/20"
                    >
                      <span className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity flex items-center justify-center space-x-2`}>
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Complete Settlement</span>
                      </span>
                      {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </button>

                    <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/10">
                      <div className="flex items-center space-x-3 text-amber-400 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Verification Required</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Ensure the transfer to <span className="text-white">{booking.payment_reference || booking.user_name}</span> is successful before clicking complete. This will notify the user and update their refund tracker.
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
