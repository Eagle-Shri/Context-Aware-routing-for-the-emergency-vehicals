import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, Shield, Map, Zap, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
        {icon}
      </div>
      <h3 className="font-poppins font-bold text-xl text-gray-900 mb-3">{title}</h3>
      <p className="font-inter text-gray-500 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 font-inter flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[13px] font-semibold mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Smart Ambulance Routing System
          </div>
          
          <h1 className="font-poppins font-extrabold text-5xl lg:text-7xl tracking-tight leading-tight mb-6 max-w-4xl">
            Saving lives through <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">intelligent routing.</span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed font-inter">
            Context-Aware Emergency Routing dynamically redirects ambulances by anticipating traffic, 
            avoiding roadblocks, and reacting instantly to police-reported incidents.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-poppins font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              System Login <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => navigate('/map')}
              className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white font-poppins font-semibold text-lg transition-all flex items-center justify-center gap-2"
            >
              View Live Map <Map size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 flex-1">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-poppins font-bold text-3xl text-gray-900 mb-4">A unified platform for emergency response</h2>
            <p className="text-gray-500 font-inter max-w-2xl mx-auto">
              Our system bridges the gap between emergency fleets and traffic control, ensuring zero delays during critical medical transports.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap size={28} />}
              title="Dynamic Rerouting"
              description="Ambulances automatically recalculate the fastest path the moment a new incident or roadblock is reported on their current route."
            />
            <FeatureCard 
              icon={<Shield size={28} />}
              title="Police Command"
              description="Traffic police can instantly log roadblocks, VIP movements, and accidents, seamlessly updating the global routing grid."
            />
            <FeatureCard 
              icon={<Activity size={28} />}
              title="Fleet Management"
              description="Drivers get a dedicated console to update locations, accept trips, and receive turn-by-turn alerts away from congestion."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-sm">
              <span className="text-sm">🚑</span>
            </div>
            <span className="font-poppins font-bold text-gray-900">AmbulanceTrack</span>
          </div>
          <p className="text-sm text-gray-500 font-inter">
            &copy; {new Date().getFullYear()} Emergency Response System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
