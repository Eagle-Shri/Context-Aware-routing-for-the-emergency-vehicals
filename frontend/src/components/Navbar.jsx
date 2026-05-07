import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Map, Truck, Shield, AlertTriangle, ChevronDown } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Live Map', to: '/map' },
  { label: 'Driver', to: '/driver' },
  { label: 'Police', to: '/police' },
];

export default function Navbar() {
  const location = useLocation();
  const [adminOpen, setAdminOpen] = useState(false);
  const [online, setOnline] = useState(true);

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
        <nav className="hidden md:flex items-center gap-1">
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

          {/* Admin dropdown */}
          <div className="relative">
            <button
              onClick={() => setAdminOpen(v => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-inter font-medium transition-colors ${
                location.pathname.startsWith('/admin')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Admin
              <ChevronDown size={13} className={`transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
            </button>
            {adminOpen && (
              <div
                className="absolute top-full right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/60 py-1.5 min-w-[160px] z-50"
                onMouseLeave={() => setAdminOpen(false)}
              >
                {[
                  { to: '/admin/driver',  label: 'Manage Drivers',  icon: <Truck size={13} /> },
                  { to: '/admin/police',  label: 'Manage Police',   icon: <Shield size={13} /> },
                  { to: '/admin/station', label: 'Manage Stations', icon: <Activity size={13} /> },
                ].map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setAdminOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-inter text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-inter font-medium ${
            online
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {online ? 'System Online' : 'Offline'}
          </div>
        </div>
      </div>
    </header>
  );
}
