import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, IndianRupee, Car, Loader2, CheckCircle2, Info, Navigation, Crosshair, ArrowLeft, Lock, Zap, Bike } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../lib/api';

export default function EditParkingSpotPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    pricing_type: 'per_hour',
    price_per_hour: '',
    fixed_price: '',
    total_slots: '1',
    cancellation_fee_percent: '30',
    latitude: '',
    longitude: '',
    is_ev: false,
    vehicle_type: 'both'
  });

  useEffect(() => {
    const fetchSpot = async () => {
      try {
        const res = await apiFetch(`/api/parking/${id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name,
            address: data.address,
            pricing_type: data.pricing_type || 'per_hour',
            price_per_hour: data.price_per_hour.toString(),
            fixed_price: (data.fixed_price || 0).toString(),
            total_slots: data.total_slots.toString(),
            cancellation_fee_percent: (data.cancellation_fee_percent || 30).toString(),
            latitude: data.latitude.toString(),
            longitude: data.longitude.toString(),
            is_ev: !!data.is_ev,
            vehicle_type: data.vehicle_type || 'both'
          });
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to fetch spot details');
        }
      } catch (err) {
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchSpot();
  }, [id]);

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await apiFetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}&zoom=18`);
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          const house = data.address.house_number || data.address.building || '';
          const road = data.address.road || '';
          const suburb = data.address.suburb || data.address.neighbourhood || '';
          const city = data.address.city || data.address.town || data.address.village || '';
          
          const parts = [house, road, suburb, city].filter(Boolean);
          const cleanAddress = parts.join(', ') || data.display_name;
          
          setFormData(prev => ({ ...prev, address: cleanAddress }));
        } else if (data.display_name) {
          setFormData(prev => ({ ...prev, address: data.display_name }));
        }
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
  };

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6)
        }));
        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      (err) => {
        setError('Could not get your location. Please enter manually.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await apiFetch(`/api/parking/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          price_per_hour: formData.pricing_type === 'per_hour' ? parseFloat(formData.price_per_hour) : 0,
          fixed_price: formData.pricing_type === 'fixed' ? parseFloat(formData.fixed_price) : 0,
          total_slots: parseInt(formData.total_slots),
          cancellation_fee_percent: parseInt(formData.cancellation_fee_percent),
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          is_ev: formData.is_ev,
          vehicle_type: formData.vehicle_type
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/owner-dashboard'), 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update parking spot');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/10 text-center max-w-md w-full"
        >
          <div className="bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Spot Updated!</h2>
          <p className="text-slate-400 mb-6">Your changes have been saved successfully.</p>
          <div className="animate-pulse text-blue-400 font-medium">Redirecting to dashboard...</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button 
        onClick={() => navigate('/owner-dashboard')}
        className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold">Back to Dashboard</span>
      </button>

      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Edit Parking Spot</h1>
        <p className="text-slate-400 text-lg">Update your spot information and manage capacity.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/10"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 ml-1">Lot Name</label>
              <div className="relative">
                <Car className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. My Private Lot"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 ml-1">Total Parking Slots</label>
              <input 
                type="number" 
                required
                min="1"
                value={formData.total_slots}
                onChange={(e) => setFormData({...formData, total_slots: e.target.value})}
                onWheel={(e) => e.target.blur()}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Pricing Type Toggle */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-300 ml-1">Pricing Model</label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setFormData({...formData, pricing_type: 'per_hour'})}
                className={`flex items-center justify-center space-x-2 py-3.5 rounded-xl transition-all font-bold text-sm ${
                  formData.pricing_type === 'per_hour'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                <IndianRupee className="h-4 w-4" />
                <span>Per Hour</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, pricing_type: 'fixed'})}
                className={`flex items-center justify-center space-x-2 py-3.5 rounded-xl transition-all font-bold text-sm ${
                  formData.pricing_type === 'fixed'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                <Lock className="h-4 w-4" />
                <span>Fixed Amount</span>
              </button>
            </div>

            {formData.pricing_type === 'per_hour' ? (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 ml-1">Price per Hour (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input 
                    type="number" 
                    required
                    placeholder="50"
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData({...formData, price_per_hour: e.target.value})}
                    onWheel={(e) => e.target.blur()}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all placeholder:text-slate-600"
                  />
                </div>
                <p className="text-xs text-slate-500 ml-1">Users will be charged based on duration × this rate</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 ml-1">Fixed Price (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                  <input 
                    type="number" 
                    required
                    placeholder="200"
                    value={formData.fixed_price}
                    onChange={(e) => setFormData({...formData, fixed_price: e.target.value})}
                    onWheel={(e) => e.target.blur()}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-emerald-500/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white transition-all placeholder:text-slate-600"
                  />
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start space-x-2">
                  <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-300">This fixed amount will be charged regardless of how long the user parks (1 min, 1 hour, or 1 day — same price).</p>
                </div>
              </div>
            )}
          </div>

          {/* Lot Capabilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/5 rounded-3xl border border-white/10">
            {/* Vehicle Compatibility */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-300 ml-1">Supported Vehicles</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, vehicle_type: 'car' })}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-lg transition-all text-xs font-bold gap-1 ${
                    formData.vehicle_type === 'car'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Car className="h-4 w-4" />
                  <span>Cars Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, vehicle_type: 'bike' })}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-lg transition-all text-xs font-bold gap-1 ${
                    formData.vehicle_type === 'bike'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Bike className="h-4 w-4" />
                  <span>Bikes Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, vehicle_type: 'both' })}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-lg transition-all text-xs font-bold gap-1 ${
                    formData.vehicle_type === 'both'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className="flex gap-0.5">
                    <Car className="h-3.5 w-3.5" />
                    <Bike className="h-3.5 w-3.5" />
                  </div>
                  <span>Both</span>
                </button>
              </div>
            </div>

            {/* EV Charging Station */}
            <div className="flex flex-col justify-between space-y-2">
              <label className="text-sm font-bold text-slate-300 ml-1">EV Charging Capability</label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_ev: !formData.is_ev })}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all border font-bold text-sm ${
                  formData.is_ev
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Zap className={`h-4 w-4 ${formData.is_ev ? 'text-emerald-400 fill-emerald-400/25 animate-pulse' : 'text-slate-600'}`} />
                  <span>EV Charging Available</span>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
                  formData.is_ev ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                }`}>
                  <div className="w-3 h-3 rounded-full bg-white shadow" />
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 ml-1">Full Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input 
                  type="text" 
                  required
                  placeholder="Enter complete address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 ml-1">Latitude</label>
              <input 
                type="number" 
                step="any"
                required
                placeholder="12.9716"
                value={formData.latitude}
                onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                onWheel={(e) => e.target.blur()}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 ml-1">Longitude</label>
              <input 
                type="number" 
                step="any"
                required
                placeholder="77.5946"
                value={formData.longitude}
                onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                onWheel={(e) => e.target.blur()}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <button 
              type="button"
              onClick={handleGetLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-4 rounded-2xl hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crosshair className="h-4 w-4" />
              )}
              <span>{isLocating ? 'Detecting Your Exact Location...' : 'Detect My Location'}</span>
            </button>
            {isLocating && (
              <p className="text-center text-[10px] text-blue-400 font-medium animate-pulse">
                Getting location...
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
              <Info className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center space-x-3 disabled:opacity-70"
          >
            {saving ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
