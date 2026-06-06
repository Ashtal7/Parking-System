import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SearchPage from './pages/SearchPage';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import RentParkingPage from './pages/RentParkingPage';
import EditParkingSpotPage from './pages/EditParkingSpotPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import PaymentPage from './pages/PaymentPage';
import RefundPaymentPage from './pages/RefundPaymentPage';
import { apiFetch } from './lib/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f8]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#f4f6f8] text-slate-900 font-sans relative">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#f4f6f8]">
          <div 
            className="absolute inset-0 opacity-[0.15]" 
            style={{ 
              backgroundImage: `
                linear-gradient(to right, #cbd5e1 1px, transparent 1px),
                linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 90%)'
            }} 
          />
          
          <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-200/40 blur-[120px]" />
          <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-300/30 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[10%] w-[60%] h-[60%] rounded-full bg-blue-200/30 blur-[130px]" />
          <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-slate-200/40 blur-[100px]" />
          
          <div 
            className="absolute inset-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-20"
            style={{
              animation: 'scan 8s linear infinite',
              top: '0%'
            }}
          />
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes scan {
              0% { top: -10%; }
              100% { top: 110%; }
            }
          `}} />
        </div>
        
        <Navbar user={user} setUser={setUser} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route 
              path="/login" 
              element={user ? <Navigate to="/search" /> : <LoginPage setUser={setUser} />} 
            />
            <Route 
              path="/register" 
              element={user ? <Navigate to="/search" /> : <RegisterPage setUser={setUser} />} 
            />
            <Route 
              path="/forgot-password" 
              element={user ? <Navigate to="/search" /> : <ForgotPasswordPage />} 
            />
            <Route 
              path="/search" 
              element={user ? <SearchPage /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/book/:id" 
              element={user ? <BookingPage /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/my-bookings" 
              element={user ? <MyBookingsPage /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/rent-parking" 
              element={user ? <RentParkingPage /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/owner-dashboard" 
              element={user ? <OwnerDashboardPage /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/edit-spot/:id" 
              element={user ? <EditParkingSpotPage /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/payment" 
              element={user ? <PaymentPage /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/refund-payment" 
              element={user ? <RefundPaymentPage /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
