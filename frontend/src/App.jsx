import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TripProvider, useTripContext } from './context/TripContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard    from './pages/Dashboard';
import MapPage      from './pages/MapPage';
import DriverPage   from './pages/DriverPage';
import PolicePage   from './pages/PolicePage';
import AdminDriver  from './pages/AdminDriver';
import AdminPolice  from './pages/AdminPolice';
import AdminStation from './pages/AdminStation';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OTPPage      from './pages/OTPPage';

/**
 * ProtectedRoute: Redirects to /login if the user is not authenticated.
 * Optionally enforces a specific role.
 */
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">🚑 Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect wrong-role users back to login with a hint
    return <Navigate to="/login" replace />;
  }

  return children;
}

function TripNotificationBanner() {
  const { trip, notification, dismissNotification } = useTripContext();

  if (notification?.type === 'arrived') {
    return (
      <div className="fixed bottom-5 right-5 z-[9999] max-w-sm animate-bounce-in">
        <div className="bg-emerald-700 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">✅</span>
          <div className="flex-1 min-w-0">
            <p className="font-poppins font-bold text-[15px] leading-tight">Trip Completed!</p>
            <p className="font-inter text-sm text-emerald-100 mt-0.5">
              {notification.ambName || `Ambulance #${notification.ambId}`} reached{' '}
              <span className="font-semibold">{notification.dstName || 'destination'}</span>
            </p>
            <p className="font-inter text-[11px] text-emerald-200 mt-1">Status reset to IDLE</p>
          </div>
          <button
            onClick={dismissNotification}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (trip?.status === 'active') {
    return (
      <div className="fixed bottom-5 right-5 z-[9999] max-w-sm">
        <div className="bg-white border border-blue-200 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl flex-shrink-0 animate-pulse">🚑</span>
          <div className="flex-1 min-w-0">
            <p className="font-inter font-semibold text-gray-900 text-[13px] truncate">
              {trip.ambName || `Amb #${trip.ambId}`} — en route
            </p>
            <p className="font-inter text-[11px] text-gray-500 truncate">→ {trip.dstName || 'destination'}</p>
            <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${trip.progress || 0}%` }}
              />
            </div>
          </div>
          <span className="font-poppins font-bold text-blue-600 text-[13px] flex-shrink-0">
            {Math.round(trip.progress || 0)}%
          </span>
        </div>
      </div>
    );
  }

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <TripProvider>
        <BrowserRouter>
          <TripNotificationBanner />
          <Routes>
            {/* Public routes */}
            <Route path="/"              element={<Dashboard />} />
            <Route path="/map"           element={<MapPage />} />
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/register"      element={<RegisterPage />} />
            <Route path="/verify-otp"    element={<OTPPage />} />

            {/* Protected: Driver only */}
            <Route path="/driver" element={
              <ProtectedRoute requiredRole="driver">
                <DriverPage />
              </ProtectedRoute>
            } />

            {/* Protected: Police only */}
            <Route path="/police" element={
              <ProtectedRoute requiredRole="police">
                <PolicePage />
              </ProtectedRoute>
            } />

            {/* Admin routes (unprotected for prototype; add auth later if needed) */}
            <Route path="/admin/driver"   element={<AdminDriver />} />
            <Route path="/admin/police"   element={<AdminPolice />} />
            <Route path="/admin/station"  element={<AdminStation />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TripProvider>
    </AuthProvider>
  );
}
