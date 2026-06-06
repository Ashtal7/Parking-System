import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  PlusCircle,
  IndianRupee,
  TrendingUp,
  Trash2,
  Edit2,
  ShieldAlert,
  ArrowRightCircle,
  CreditCard,
  Building,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [mySpots, setMySpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [spotToDelete, setSpotToDelete] = useState(null);
  const [refundRequired, setRefundRequired] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, bookingsRes, spotsRes] = await Promise.all([
          apiFetch('/api/owner/stats'),
          apiFetch('/api/owner/bookings'),
          apiFetch('/api/my-spots')
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (bookingsRes.ok) setBookings(await bookingsRes.json());
        if (spotsRes.ok) setMySpots(await spotsRes.json());
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteSpot = async (confirmRefund = false) => {
    if (!spotToDelete) return;
    const id = spotToDelete;

    try {
      const url = confirmRefund ? `/api/parking/${id}?confirmRefund=true` : `/api/parking/${id}`;
      const res = await apiFetch(url, { method: 'DELETE' });
      
      if (res.ok) {
        showToast('Spot deleted successfully');
        setShowDeleteModal(false);
        setSpotToDelete(null);
        setRefundRequired(null);
        setMySpots(prev => prev.filter(s => s.id !== id));
        const statsRes = await apiFetch('/api/owner/stats');
        if (statsRes.ok) setStats(await statsRes.json());
      } else {
        const data = await res.json();
        if (data.requireRefund) {
          setRefundRequired({
            amount: data.totalRefund,
            count: data.activeBookingsCount
          });
        } else {
          showToast(data.error || 'Failed to delete spot', 'error');
          setShowDeleteModal(false);
          setSpotToDelete(null);
        }
      }
    } catch (err) {
      showToast('Something went wrong', 'error');
      setShowDeleteModal(false);
      setSpotToDelete(null);
    }
  };


  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Owner Dashboard</h1>
          <p className="text-slate-400">Track your earnings and manage your listed parking spots.</p>
        </div>
        <Link
          to="/rent-parking"
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
        >
          <PlusCircle className="h-5 w-5" />
          <span>List New Spot</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500/10 p-3 rounded-2xl border border-green-500/20">
              <IndianRupee className="h-6 w-6 text-green-400" />
            </div>
            <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">+12%</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
          <h3 className="text-2xl font-bold text-white">₹{stats?.totalRevenue.toLocaleString() || 0}</h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
              <Calendar className="h-6 w-6 text-blue-400" />
            </div>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">Active</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Bookings</p>
          <h3 className="text-2xl font-bold text-white">{stats?.totalBookings || 0}</h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500/10 p-3 rounded-2xl border border-purple-500/20">
              <Clock className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">Avg Duration</p>
          <h3 className="text-2xl font-bold text-white">{stats?.averageDuration.toFixed(1) || 0} hrs</h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-500/10 p-3 rounded-2xl border border-red-500/20">
              <TrendingUp className="h-6 w-6 text-red-400 rotate-180" />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">Cancellation Rate</p>
          <h3 className="text-2xl font-bold text-white">{stats?.cancellationRate.toFixed(1) || 0}%</h3>
        </motion.div>
      </div>

      <div className="space-y-8">
        <div className="space-y-8">
          {/* Revenue Chart */}
          <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white">Revenue Overview</h2>
              <select className="bg-white/5 border border-white/10 text-sm font-bold text-slate-300 rounded-xl px-4 py-2 focus:ring-0">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.revenueHistory || []}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pending Refunds Section */}
          {bookings.some(b => b.status === 'Cancelled' && b.payment_status === 'Refunded') && (
            <div className="bg-amber-500/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-amber-500/10 shadow-2xl">
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-amber-500/10 p-2 rounded-lg">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Pending Refunds</h2>
                  <p className="text-slate-500 text-xs">These cancellations require manual bank transfer confirmation.</p>
                </div>
              </div>

              <div className="space-y-4">
                {bookings.filter(b => b.status === 'Cancelled' && b.payment_status === 'Refunded').map((booking) => (
                  <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/20 transition-all gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="bg-slate-800 p-3 rounded-xl">
                        <Users className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{booking.user_name}</h4>
                        <div className="flex flex-col">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Contact</p>
                          <p className="text-xs text-blue-400 font-medium">{booking.user_phone || 'No phone provided'}</p>
                        </div>
                        <div className="flex flex-col mt-2">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Reason</p>
                          <p className="text-xs text-amber-400 font-medium">"{booking.cancellation_reason || 'No reason provided'}"</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-8">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Refund Amount</p>
                        <p className="font-bold text-emerald-400">₹{booking.refund_amount?.toFixed(2)}</p>
                      </div>

                      <Link
                        to="/refund-payment"
                        state={{ booking }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
                      >
                        <ArrowRightCircle className="h-4 w-4" />
                        <span>Confirm Transfer</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Bookings */}
          <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white">Recent Bookings</h2>
              <Link to="/my-bookings" className="text-blue-400 text-sm font-bold hover:underline">View All</Link>
            </div>

            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <Users className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{booking.user_name}</h4>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-slate-500">{booking.parking_name}</p>
                          <span className="text-slate-700">•</span>
                          <p className="text-xs text-blue-400 font-medium">{booking.user_phone || 'No phone'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">₹{booking.amount || 0}</p>
                      <p className="text-xs text-slate-500">{booking.booking_date}</p>
                    </div>
                    <div className="hidden sm:block">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${booking.status === 'Confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Calendar className="h-8 w-8 text-slate-600" />
                </div>
                <p className="text-slate-500">No bookings yet for your spots.</p>
              </div>
            )}
          </div>

          {/* My Listings */}
          <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">My Listings</h2>

            {mySpots.length > 0 ? (
              <div className="space-y-6">
                {mySpots.map((spot) => (
                  <div key={spot.id} className="group p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/20 transition-all flex flex-col h-full w-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
                          <MapPin className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{spot.name}</h4>
                          <p className="text-sm text-slate-500 line-clamp-1">{spot.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/edit-spot/${spot.id}`}
                          className="p-2 bg-white/5 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded-xl transition-all border border-transparent hover:border-blue-500/20"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setSpotToDelete(spot.id);
                            setShowDeleteModal(true);
                            setRefundRequired(null);
                          }}
                          className="p-2 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <div className="flex space-x-4 text-xs font-bold">
                        <div className="flex flex-col">
                          <span className="text-slate-500 uppercase tracking-tighter">Slots</span>
                          <span className="text-white">{spot.total_slots}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-500 uppercase tracking-tighter">Available</span>
                          <span className="text-green-400">{spot.availability}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-500 uppercase tracking-tighter">Booked</span>
                          <span className="text-red-400">{spot.total_slots - spot.availability}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`${spot.pricing_type === 'fixed' ? 'text-emerald-400' : 'text-blue-400'} font-black text-lg`}>₹{spot.pricing_type === 'fixed' ? spot.fixed_price : spot.price_per_hour}</span>
                        <span className="text-slate-500 text-[10px] font-bold block">{spot.pricing_type === 'fixed' ? 'fixed rate' : 'per hour'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <p className="text-slate-500 text-sm mb-4">You haven't listed any spots yet.</p>
                <Link to="/rent-parking" className="text-blue-400 text-sm font-bold hover:underline">List your first spot</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Spot Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center border border-white/10"
            >
              <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <Trash2 className="h-8 w-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Delete Parking Spot?</h2>
              
              {!refundRequired ? (
                <p className="text-slate-400 text-sm mb-8">Are you sure you want to delete this parking spot? This will remove it from search results and cancel all associated bookings.</p>
              ) : (
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 mb-8">
                  <p className="text-red-400 font-bold mb-2">Active Bookings Found!</p>
                  <p className="text-slate-300 text-sm mb-4">You have {refundRequired.count} active booking(s) for this lot.</p>
                  <p className="text-slate-400 text-xs">To proceed with deletion, you must refund a total of <span className="text-white font-bold">₹{refundRequired.amount}</span>. This will be automatically processed.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setRefundRequired(null);
                  }}
                  className="flex-1 bg-white/5 text-slate-300 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSpot(!!refundRequired)}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  {refundRequired ? 'Refund & Delete' : 'Delete'}
                </button>
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
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[120] px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border ${toast.type === 'success' ? 'bg-slate-900 text-white border-white/10' : 'bg-red-600 text-white border-red-500/20'
              }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <XCircle className="h-5 w-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
