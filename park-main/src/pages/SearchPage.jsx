import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Navigation, Info, Car, Loader2, Calendar, Crosshair, XCircle, Star, Zap, Bike } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';
import { calculateDistance, formatDistance } from '../lib/utils';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState({ lat: 13.999319690644878, lon: 74.55549806962695 });
  const [searchLocation, setSearchLocation] = useState({ lat: 13.999319690644878, lon: 74.55549806962695 });
  const [locationName, setLocationName] = useState('Unknown');
  const [isLocating, setIsLocating] = useState(false);
  const [filterVehicleType, setFilterVehicleType] = useState('all');
  const [filterOnlyEV, setFilterOnlyEV] = useState(false);

  // Recalculate distances based on real-time user location or search target
  const resultsWithLiveDistance = useMemo(() => {
    if (results.length === 0) return results;

    let filtered = [...results];

    // Filter by vehicle type
    if (filterVehicleType !== 'all') {
      filtered = filtered.filter(spot => {
        const vType = spot.vehicle_type || 'both';
        if (filterVehicleType === 'car') {
          return vType === 'car' || vType === 'both';
        }
        if (filterVehicleType === 'bike') {
          return vType === 'bike' || vType === 'both';
        }
        return true;
      });
    }

    // Filter by EV charging
    if (filterOnlyEV) {
      filtered = filtered.filter(spot => spot.is_ev === 1);
    }

    // Sort logic: use searchLocation if searching, otherwise userLocation
    const sortRef = searchLocation || userLocation;
    // Display logic: ALWAYS use userLocation if available, otherwise searchLocation
    const displayRef = userLocation || searchLocation;

    if (!sortRef || !displayRef) return filtered;

    return filtered.map(spot => {
      // Calculate distance relative to the user for display
      const displayDistance = calculateDistance(displayRef.lat, displayRef.lon, spot.latitude, spot.longitude);
      // Calculate distance relative to the search center for sorting
      const sortDistance = calculateDistance(sortRef.lat, sortRef.lon, spot.latitude, spot.longitude);

      return {
        ...spot,
        distance: displayDistance, // This goes to the UI
        sortDistance // This handles the order
      };
    }).sort((a, b) => a.sortDistance - b.sortDistance);
  }, [results, userLocation, searchLocation, filterVehicleType, filterOnlyEV]);

  const fetchParking = async (lat, lon, query) => {
    setLoading(true);
    setError('');
    try {
      const url = query
        ? `/api/search?lat=${lat}&lon=${lon}&q=${encodeURIComponent(query)}`
        : `/api/search?lat=${lat}&lon=${lon}`;

      const res = await apiFetch(url);
      const data = await res.json();
      if (res.ok) {
        setResults(data);
        if (data.length === 0) {
          setError(query ? `No parking spot found matching "${query}".` : 'No parking spots found within 50km of your location.');
        }
      } else {
        setError(data.error || 'Failed to fetch parking spots');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log(`Detected: ${latitude}, ${longitude} (Accuracy: ${accuracy}m)`);

        // If accuracy is very poor (>5km), it's likely an inaccurate ISP/Cell detection.
        // In this case, we prefer the user's known home location (Bhatkal).
        const isLikelyInaccurate = accuracy > 5000;

        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
          .then(res => res.json())
          .then(data => {
            const locName = data.locality || data.city || '';
            const isHubballi = locName.includes('Hubballi') || locName.includes('Dharwad');

            // If detection is in Hubballi area (common ISP error) OR very inaccurate, force Anjuman Abad
            if (isLikelyInaccurate || isHubballi) {
              const bhatkalLat = 13.999319690644878;
              const bhatkalLon = 74.55549806962695;
              setUserLocation({ lat: bhatkalLat, lon: bhatkalLon });
              setSearchLocation({ lat: bhatkalLat, lon: bhatkalLon });
              setLocationName('Anjuman Abad');
              fetchParking(bhatkalLat, bhatkalLon);
            } else {
              setUserLocation({ lat: latitude, lon: longitude });
              setSearchLocation({ lat: latitude, lon: longitude });
              setLocationName(locName || 'Detected Location');
              fetchParking(latitude, longitude);
            }
          })
          .catch(() => {
            setUserLocation({ lat: latitude, lon: longitude });
            setSearchLocation({ lat: latitude, lon: longitude });
            fetchParking(latitude, longitude);
          })
          .finally(() => {
            setIsLocating(false);
          });
      },
      (err) => {
        console.error('Location error:', err);
        // Fallback to Anjuman Abad
        const lat = 13.999319690644878;
        const lon = 74.55549806962695;
        setUserLocation({ lat, lon });
        setSearchLocation({ lat, lon });
        setLocationName('Anjuman Abad');
        fetchParking(lat, lon);

        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    handleLocateMe();
  }, [handleLocateMe]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setLoading(true);
    setError('');

    // Searching without OSM. We search directly against our database 
    // using fetchParking which handles both cases.
    const lat = userLocation?.lat;
    const lon = userLocation?.lon;

    fetchParking(lat, lon, query);
    setLocationName(query);
  };

  const openInGoogleMaps = (spot) => {
    const dest = `${spot.latitude},${spot.longitude}`;

    // Default to Anjuman Abad if no user location, or use the detected/overridden location
    const lat = userLocation?.lat || 13.999319690644878;
    const lon = userLocation?.lon || 74.55549806962695;
    const origin = `${lat},${lon}`;

    let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
    url += `&origin=${encodeURIComponent(origin)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Find Parking</h1>
        <p className="text-slate-400">Search for a location or use your current position to find nearby spots.</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl border border-white/10 mb-10">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter any location (e.g. Bangalore)"
              className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white transition-all placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
              title="Use current location"
            >
              {isLocating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Crosshair className="h-5 w-5" />
              )}
            </button>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
          >
            <Search className="h-5 w-5" />
            <span>Search</span>
          </button>
        </form>

        {/* Dynamic Filters */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Vehicle Type Tabs */}
          <div className="flex flex-col space-y-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase ml-1">Vehicle Type</span>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start">
              <button
                type="button"
                onClick={() => setFilterVehicleType('all')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  filterVehicleType === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                All Vehicles
              </button>
              <button
                type="button"
                onClick={() => setFilterVehicleType('car')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  filterVehicleType === 'car'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Car className="h-3.5 w-3.5" />
                <span>Cars Only</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterVehicleType('bike')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  filterVehicleType === 'bike'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Bike className="h-3.5 w-3.5" />
                <span>Bikes Only</span>
              </button>
            </div>
          </div>

          {/* EV Toggle */}
          <div className="flex flex-col space-y-2 w-full sm:w-auto sm:items-end">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase mr-1 hidden sm:block">Power Source</span>
            <button
              type="button"
              onClick={() => setFilterOnlyEV(!filterOnlyEV)}
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all ${
                filterOnlyEV
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5'
                  : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-300 hover:border-white/10'
              }`}
            >
              <Zap className={`h-4 w-4 ${filterOnlyEV ? 'text-emerald-400 fill-emerald-400/25 animate-pulse' : 'text-slate-500'}`} />
              <span>EV Charging Station</span>
              <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
                filterOnlyEV ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}>
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow" />
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">
            <Info className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {locationName && (
          <div className="mt-4 flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="flex items-center space-x-2 text-slate-400 text-xs">
              <MapPin className="h-3 w-3 text-blue-400" />
              <span>Detected: <span className="font-bold text-slate-200">{locationName}</span></span>
            </div>
            <p className="text-[10px] text-slate-500 italic">Wrong location? Search for your city above.</p>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-white">
              {loading ? 'Searching...' : `${results.length} Parking Spots Found`}
            </h2>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live availability</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 border-dashed">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-400 font-medium">Scanning nearby parking spots...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {resultsWithLiveDistance.map((spot, idx) => (
                <motion.div
                  key={spot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl hover:border-white/20 transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-500/10 p-3 rounded-2xl group-hover:bg-blue-600 transition-colors border border-blue-500/20 shrink-0 flex items-center justify-center gap-1.5">
                        {spot.vehicle_type === 'both' && filterVehicleType === 'all' ? (
                          <>
                            <Car className="h-5 w-5 text-blue-400 group-hover:text-white transition-colors" />
                            <Bike className="h-5 w-5 text-blue-400 group-hover:text-white transition-colors" />
                          </>
                        ) : (spot.vehicle_type === 'bike' || (spot.vehicle_type === 'both' && filterVehicleType === 'bike')) ? (
                          <Bike className="h-6 w-6 text-blue-400 group-hover:text-white transition-colors" />
                        ) : (
                          <Car className="h-6 w-6 text-blue-400 group-hover:text-white transition-colors" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {spot.name}
                          {spot.avg_rating && (
                            <div className="flex items-center text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                              <Star className="h-3 w-3 fill-yellow-400 mr-1" />
                              <span>{parseFloat(spot.avg_rating).toFixed(1)}</span>
                              <span className="text-slate-500 ml-1 font-normal">({spot.review_count})</span>
                            </div>
                          )}
                        </h3>
                        <div className="flex items-center text-slate-400 text-sm mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>{spot.address}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <div className="flex items-center space-x-1 bg-blue-500/10 px-2 py-1 rounded-lg text-xs font-bold text-blue-400 border border-blue-500/20">
                            <Navigation className="h-3 w-3" />
                            <span>{formatDistance(spot.distance)} {userLocation ? 'from you' : 'away'}</span>
                          </div>

                          {/* EV Charger Badge */}
                          {spot.is_ev === 1 && (
                            <div className="flex items-center space-x-1 bg-emerald-500/10 px-2 py-1 rounded-lg text-xs font-bold text-emerald-400 border border-emerald-500/20">
                              <Zap className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/20 animate-pulse" />
                              <span>EV Charger</span>
                            </div>
                          )}

                          {/* Vehicle Compatibility Badge */}
                          <div className="flex items-center space-x-1 bg-indigo-500/10 px-2 py-1 rounded-lg text-xs font-bold text-indigo-400 border border-indigo-500/20">
                            {spot.vehicle_type === 'car' ? (
                              <>
                                <Car className="h-3 w-3" />
                                <span>Cars Only</span>
                              </>
                            ) : spot.vehicle_type === 'bike' ? (
                              <>
                                <Bike className="h-3 w-3" />
                                <span>Bikes Only</span>
                              </>
                            ) : (
                              <>
                                <div className="flex gap-0.5">
                                  <Car className="h-3 w-3" />
                                  <Bike className="h-3 w-3" />
                                </div>
                                <span>Cars & Bikes</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 bg-white/5 px-2 py-1 rounded-lg text-xs font-bold text-slate-400 border border-white/10">
                            <span>{spot.total_slots} total slots</span>
                          </div>
                          <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold ${spot.availability > 5 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                            <span>{spot.availability} available</span>
                          </div>
                          <div className="flex items-center space-x-1 bg-red-500/10 px-2 py-1 rounded-lg text-xs font-bold text-red-400 border border-red-500/20">
                            <span>{spot.total_slots - spot.availability} booked</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                      <div className="text-right">
                        <p className="text-2xl font-black text-white">₹{spot.pricing_type === 'fixed' ? spot.fixed_price : spot.price_per_hour}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{spot.pricing_type === 'fixed' ? 'Fixed Rate' : 'Per Hour'}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openInGoogleMaps(spot)}
                          className="px-4 py-3 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-colors font-bold text-sm border border-white/10"
                          title="View Route on Map"
                        >
                          Route
                        </button>
                        {spot.availability > 0 ? (
                          <Link
                            to={`/book/${spot.id}`}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center space-x-2"
                          >
                            <Calendar className="h-4 w-4" />
                            <span>Book Now</span>
                          </Link>
                        ) : (
                          <div className="bg-white/5 text-slate-500 px-6 py-3 rounded-xl font-bold border border-white/5 cursor-not-allowed flex items-center space-x-2">
                            <XCircle className="h-4 w-4" />
                            <span>Sold Out</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 border-dashed">
            <div className="bg-white/5 p-4 rounded-full mb-4 border border-white/10">
              <Search className="h-8 w-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">location not found try another</p>
            <p className="text-slate-500 text-sm mt-1">Try searching for a different area or city.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckCircle2({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}
