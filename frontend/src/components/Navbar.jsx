import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { label: 'Live Map', to: '/map' },
  { label: 'Driver Dashboard', to: '/driver' },
  { label: 'Police Dashboard', to: '/police' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [online, setOnline] = useState(true);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  useEffect(() => {
    const t = setInterval(() => setOnline(v => v), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-md shadow-red-200 group-hover:scale-105 transition-transform">
            <span className="text-sm">🚑</span>
          </div>
          <div>
            <span className="font-poppins font-bold text-gray-900 text-sm">AmbulanceTrack</span>
            <span className="hidden sm:block text-[10px] text-gray-400 font-inter leading-none">Emergency Response System</span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-2">
          {NAV_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-inter font-medium transition-colors ${
                location.pathname === l.to
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Status badge + User info */}
        <div className="flex items-center gap-3">
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-inter font-medium ${
            online
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {online ? 'System Online' : 'Offline'}
          </div>

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-[12px] font-semibold text-gray-800 leading-none">{user.name}</p>
                <p className="text-[10px] text-gray-400 capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[12px] font-medium transition-colors"
              >
                <LogOut size={14} />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold transition-colors ml-1"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
