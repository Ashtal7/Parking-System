import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Calendar, Menu, X, PlusCircle, LayoutDashboard } from 'lucide-react';
import { apiFetch, removeAuthToken } from '../lib/api';

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await apiFetch('/api/logout', { method: 'POST' });
    removeAuthToken();
    setUser(null);
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-white">ParkSmart</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-slate-300 hover:text-blue-400 font-medium transition-colors">Home</Link>
            {user ? (
              <>
                <Link to="/search" className="text-slate-300 hover:text-blue-400 font-medium transition-colors">Find Parking</Link>
                <Link to="/my-bookings" className="text-slate-300 hover:text-blue-400 font-medium transition-colors flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>My Bookings</span>
                </Link>
                <Link to="/owner-dashboard" className="text-slate-300 hover:text-blue-400 font-medium transition-colors flex items-center space-x-1">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Owner Dashboard</span>
                </Link>
                <Link to="/rent-parking" className="text-slate-300 hover:text-blue-400 font-medium transition-colors flex items-center space-x-1">
                  <PlusCircle className="h-4 w-4" />
                  <span>Rent My Spot</span>
                </Link>
                <div className="flex items-center space-x-4 pl-4 border-l border-white/10">
                  <div className="flex items-center space-x-2 text-slate-200">
                    <UserIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{user.name}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-red-400 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-slate-300 hover:text-blue-400 font-medium transition-colors">Login</Link>
                <Link 
                  to="/register" 
                  className="bg-blue-500 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-300 p-2"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-white/5 py-4 px-4 space-y-4 shadow-2xl">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className="block text-slate-300 font-medium">Home</Link>
          {user ? (
            <>
              <Link to="/search" onClick={() => setIsMenuOpen(false)} className="block text-slate-300 font-medium">Find Parking</Link>
              <Link to="/my-bookings" onClick={() => setIsMenuOpen(false)} className="block text-slate-300 font-medium">My Bookings</Link>
              <Link to="/owner-dashboard" onClick={() => setIsMenuOpen(false)} className="block text-slate-300 font-medium">Owner Dashboard</Link>
              <Link to="/rent-parking" onClick={() => setIsMenuOpen(false)} className="block text-slate-300 font-medium">Rent My Spot</Link>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-200">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{user.name}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-red-400 font-medium flex items-center space-x-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col space-y-4">
              <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-slate-300 font-medium">Login</Link>
              <Link 
                to="/register" 
                onClick={() => setIsMenuOpen(false)}
                className="bg-blue-500 text-white px-5 py-3 rounded-xl font-medium text-center"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
