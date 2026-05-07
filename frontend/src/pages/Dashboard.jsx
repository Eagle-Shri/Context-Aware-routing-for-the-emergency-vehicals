import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, AlertTriangle, Building2, Clock, Shield, Car,
  Navigation, Map, ChevronRight, Activity,
  Zap, TrendingUp, Route
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { getAmbulances, getActiveIncidents, getAvailableHospitals, getPoliceUpdates, getOfficers, getStations } from '../services/api';

function SectionCard({ title, subtitle, accent, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className={`px-5 py-4 flex items-center gap-3 ${accent}`}>
        <div className="text-white opacity-90">{icon}</div>
        <div>
          <h2 className="text-white font-poppins font-semibold text-[15px] leading-tight">{title}</h2>
          {subtitle && <p className="text-white/70 text-[11px] font-inter mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-5 py-5 flex flex-col flex-1">{children}</div>
    </div>
  );
}

function HeroStat({ icon, value, label, sub, color, loading }) {
  const colors = {
    blue:  { bg: 'bg-blue-50',    icon: 'bg-blue-600',    text: 'text-blue-600'    },
    red:   { bg: 'bg-red-50',     icon: 'bg-red-600',     text: 'text-red-600'     },
    green: { bg: 'bg-emerald-50', icon: 'bg-emerald-600', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50',   icon: 'bg-amber-500',   text: 'text-amber-600'   },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`${c.bg} rounded-2xl p-5 flex items-start gap-4`}>
      <div className={`w-11 h-11 ${c.icon} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
        <span className="text-white">{icon}</span>
      </div>
      <div>
        <p className={`font-poppins font-bold text-3xl ${c.text} leading-none`}>
          {loading ? <span className="inline-block w-8 h-7 bg-current opacity-20 rounded animate-pulse" /> : value}
        </p>
        <p className="text-gray-800 font-inter font-semibold text-sm mt-1">{label}</p>
        {sub && <p className="text-gray-500 font-inter text-[11px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function AdminButton({ icon, label, sub, color, onClick }) {
  const colors = {
    blue:   'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700',
    green:  'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700',
    slate:  'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700',
    amber:  'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all group ${colors[color] || colors.blue}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="text-left">
        <p className="font-inter font-semibold text-[13px] leading-tight">{label}</p>
        <p className="font-inter text-[11px] opacity-70 mt-0.5">{sub}</p>
      </div>
      <ChevronRight size={14} className="ml-auto opacity-50 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

function IncidentRow({ type, severity, time }) {
  const sevColor =
    severity === 'high'   ? 'bg-red-100 text-red-700 border-red-200' :
    severity === 'medium' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            'bg-yellow-100 text-yellow-700 border-yellow-200';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border font-inter flex-shrink-0 ${sevColor}`}>
        {String(severity).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-inter font-semibold text-gray-800 capitalize">{type}</p>
      </div>
      <p className="text-[11px] text-gray-400 font-inter flex-shrink-0">{time}</p>
    </div>
  );
}

function AmbulanceRow({ id, status, driverName, destination }) {
  const statusColor =
    status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    status === 'BUSY'   ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-gray-100 text-gray-500 border-gray-200';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-sm flex-shrink-0">🚑</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-poppins font-semibold text-gray-900">Unit #{id}</p>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border font-inter ${statusColor}`}>{status}</span>
        </div>
        <p className="text-[11px] text-gray-400 font-inter truncate">{driverName}{destination ? ` → ${destination}` : ''}</p>
      </div>
    </div>
  );
}

function RoadUpdateRow({ roadName, status, severity }) {
  const isBlocked = status === 'blocked';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border font-inter flex-shrink-0 ${isBlocked ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
        {isBlocked ? 'BLOCKED' : 'OPEN'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-inter font-semibold text-gray-800 truncate">{roadName}</p>
        <p className="text-[11px] text-gray-400 font-inter capitalize">{severity} severity</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [statsLoading, setStatsLoading] = useState(true);
  const [ambulances, setAmbulances]     = useState([]);
  const [incidents, setIncidents]       = useState([]);
  const [hospitals, setHospitals]       = useState([]);
  const [policeUpdates, setPoliceUpdates] = useState([]);
  const [officers, setOfficers]         = useState([]);
  const [stations, setStations]         = useState([]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [ambRes, incRes, hospRes, polRes, offRes, statRes] = await Promise.allSettled([
          getAmbulances(),
          getActiveIncidents(),
          getAvailableHospitals(),
          getPoliceUpdates(),
          getOfficers(),
          getStations(),
        ]);
        if (ambRes.status  === 'fulfilled') setAmbulances(ambRes.value?.data      || []);
        if (incRes.status  === 'fulfilled') setIncidents(incRes.value?.data       || []);
        if (hospRes.status === 'fulfilled') setHospitals(hospRes.value?.data      || []);
        if (polRes.status  === 'fulfilled') setPoliceUpdates(polRes.value?.data   || []);
        if (offRes.status  === 'fulfilled') setOfficers(offRes.value?.data        || []);
        if (statRes.status === 'fulfilled') setStations(statRes.value?.data       || []);      } catch {
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, []);

  const activeAmbs    = ambulances.filter(a => a.status !== 'IDLE').length;
  const totalAmbs     = ambulances.length;
  const activeIncs    = incidents.length;
  const criticalIncs  = incidents.filter(i => i.severity === 'high').length;
  const availHosps    = hospitals.length;
  const blockedRoads  = policeUpdates.filter(p => p.status === 'blocked');
  const onDutyOfficers = officers.filter(o => o.status === 'on_duty');

  const recentIncidents  = incidents.slice(0, 3);
  const recentAmbs       = ambulances.slice(0, 3);
  const recentUpdates    = policeUpdates.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Navbar />

      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-3">
            {/* <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> */}
            {/* <span className="text-blue-400 text-[11px] uppercase tracking-widest font-semibold font-inter">Live Operations</span> */}
          </div>
          <h1 className="font-poppins font-bold text-3xl sm:text-4xl mb-1">Emergency Response Control Center</h1>
          <p className="text-slate-400 font-inter text-sm mb-8">Real-time ambulance tracking, incident handling, and smart routing</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <HeroStat icon={<Truck size={20} />}         loading={statsLoading} value={totalAmbs > 0 ? `${activeAmbs}/${totalAmbs}` : '—'} label="Active Ambulances"  sub={totalAmbs > 0 ? `${totalAmbs - activeAmbs} idle` : 'No units registered'} color="blue"  />
            <HeroStat icon={<AlertTriangle size={20} />} loading={statsLoading} value={activeIncs}   label="Active Incidents"   sub={criticalIncs > 0 ? `${criticalIncs} critical` : 'None critical'} color="red"   />
            <HeroStat icon={<Building2 size={20} />}     loading={statsLoading} value={availHosps}   label="Available Hospitals" sub="City-wide coverage" color="green" />
            <HeroStat icon={<Shield size={20} />}        loading={statsLoading} value={stations.length}  label="Traffic Police Stations" sub="City-wide presence" color="amber" />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Admin Panel */}
        <div className="grid lg:grid-cols-2 gap-6">
          <SectionCard
            title="Admin Panel"
            subtitle="Manage system accounts & units"
            accent="bg-gradient-to-r from-slate-700 to-slate-800"
            icon={<Shield size={18} />}
          >
            <div className="flex flex-col gap-2.5 flex-1">
              <AdminButton icon={<Truck size={16} className="text-blue-600" />}         label="Add Ambulance Unit"       sub="Register a new ambulance + driver"          color="blue"  onClick={() => navigate('/admin/driver')} />
              <AdminButton icon={<Building2 size={16} className="text-emerald-700" />}  label="Add Hospital / Station"   sub="Register facility or dispatch station"      color="green" onClick={() => navigate('/admin/station')} />
              <AdminButton icon={<Shield size={16} className="text-amber-700" />}       label="Manage Police Officers"   sub="Register traffic officers & road units"     color="amber" onClick={() => navigate('/police')} />
            </div>
          </SectionCard>

          <SectionCard
            title="Smart Navigation Engine"
            subtitle="AI-based traffic + incident analysis"
            accent="bg-gradient-to-r from-blue-600 to-blue-700"
            icon={<Zap size={18} />}
          >
            <div className="flex flex-col flex-1">
              <p className="text-gray-600 font-inter text-sm leading-relaxed mb-4">
                Compute the optimal ambulance route dynamically accounting for all active incidents,
                road closures, and real-time traffic data across Bengaluru's road network.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {['OSRM Routing', 'Live Socket Feed', 'Auto Re-route', 'Bengaluru Grid'].map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-inter font-medium">{tag}</span>
                ))}
              </div>
              <div className="mt-auto">
                <button
                  onClick={() => navigate('/map')}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-poppins font-semibold text-sm transition-colors shadow-md shadow-blue-200 group"
                >
                  <Map size={16} />
                  Launch Live Map
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Incidents & Route Updates (2 columns after removing Traffic Updates) */}
        <div className="grid lg:grid-cols-2 gap-6">
          <SectionCard
            title="Traffic Incidents"
            subtitle="Active incidents · Bengaluru"
            accent="bg-gradient-to-r from-orange-600 to-red-600"
            icon={<AlertTriangle size={18} />}
          >
            <div className="flex flex-col flex-1">
              <div className="mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[12px] text-gray-500 font-inter font-medium">
                  {statsLoading ? 'Loading…' : `${activeIncs} active incident${activeIncs !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="flex-1">
                {recentIncidents.length === 0 && !statsLoading ? (
                  <p className="text-[12px] text-gray-400 font-inter py-4 text-center">No active incidents.</p>
                ) : recentIncidents.map(inc => (
                  <IncidentRow
                    key={inc.id}
                    type={inc.type}
                    severity={inc.severity}
                    time={inc.created_at ? new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  />
                ))}
              </div>
              <button
                onClick={() => navigate('/police')}
                className="mt-4 w-full py-2.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[13px] font-inter font-semibold transition-colors"
              >
                Manage Incidents
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Route Updates"
            subtitle="Incident-based rerouting"
            accent="bg-gradient-to-r from-orange-500 to-amber-600"
            icon={<Route size={18} />}
          >
            <div className="flex flex-col flex-1">
              <div className="mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[12px] text-gray-500 font-inter font-medium">
                  {statsLoading ? 'Loading…' : `${activeAmbs} ambulance${activeAmbs !== 1 ? 's' : ''} en route`}
                </span>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {ambulances.filter(a => a.status === 'ACTIVE').slice(0, 3).length === 0 && !statsLoading ? (
                  <p className="text-[12px] text-gray-400 font-inter py-4 text-center">No active routes.</p>
                ) : ambulances.filter(a => a.status === 'ACTIVE').slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm">🚑</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-inter font-semibold text-gray-900">Unit #{a.id} · {a.driver_name}</p>
                      {a.destination && <p className="text-[10px] text-amber-700 font-inter truncate">→ {a.destination}</p>}
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-100 text-emerald-700 border-emerald-200">EN ROUTE</span>
                  </div>
                ))}
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[11px] text-amber-800 font-inter font-medium">Routes auto-recalculate when incidents are reported on the ambulance path.</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/map')}
                className="mt-4 w-full py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[13px] font-inter font-semibold transition-colors"
              >
                View Live Map
              </button>
            </div>
          </SectionCard>
        </div>

        {/* Fleet + Police */}
        <div className="grid lg:grid-cols-2 gap-6">
          <SectionCard
            title="Ambulance Fleet"
            subtitle="Live unit status"
            accent="bg-gradient-to-r from-emerald-600 to-teal-600"
            icon={<Car size={18} />}
          >
            <div className="flex flex-col flex-1">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp size={13} className="text-emerald-600" />
                <span className="text-[12px] text-gray-500 font-inter font-medium">
                  {statsLoading ? 'Loading…' : `${totalAmbs} unit${totalAmbs !== 1 ? 's' : ''} registered · ${activeAmbs} active`}
                </span>
              </div>
              <div className="flex-1">
                {recentAmbs.length === 0 && !statsLoading ? (
                  <p className="text-[12px] text-gray-400 font-inter py-4 text-center">No ambulances registered yet.</p>
                ) : recentAmbs.map(amb => (
                  <AmbulanceRow
                    key={amb.id}
                    id={amb.id}
                    status={amb.status}
                    driverName={amb.driver_name}
                    destination={amb.destination}
                  />
                ))}
              </div>
              <button
                onClick={() => navigate('/driver')}
                className="mt-4 w-full py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[13px] font-inter font-semibold transition-colors"
              >
                Manage Fleet
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Police Command"
            subtitle={`${blockedRoads.length} blocked · ${onDutyOfficers.length} on duty`}
            accent="bg-gradient-to-r from-blue-700 to-blue-900"
            icon={<Shield size={18} />}
          >
            <div className="flex flex-col flex-1">
              <div className="mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[12px] text-gray-500 font-inter font-medium">
                  {statsLoading ? 'Loading…' : `${blockedRoads.length} road${blockedRoads.length !== 1 ? 's' : ''} blocked · ${officers.length} officer${officers.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="flex-1">
                {recentUpdates.length === 0 && !statsLoading ? (
                  <p className="text-[12px] text-gray-400 font-inter py-4 text-center">No road updates yet.</p>
                ) : recentUpdates.map(u => (
                  <RoadUpdateRow key={u.id} roadName={u.road_name} status={u.status} severity={u.severity} />
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate('/police')}
                  className="flex-1 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[13px] font-inter font-semibold transition-colors"
                >
                  Traffic Updates
                </button>
                <button
                  onClick={() => navigate('/police')}
                  className="flex-1 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[13px] font-inter font-semibold transition-colors"
                >
                  Officers
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Quick Stats */}
        {/* <SectionCard
          title="Quick Stats"
          subtitle="System overview"
          accent="bg-gradient-to-r from-purple-600 to-purple-700"
          icon={<Activity size={18} />}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Ambulances', value: statsLoading ? '…' : String(totalAmbs),        icon: <Truck size={16} />,       bg: 'bg-blue-50', text: 'text-blue-700' },
              { label: 'Active Incidents', value: statsLoading ? '…' : String(activeIncs),       icon: <AlertTriangle size={16} />, bg: 'bg-orange-50', text: 'text-orange-700' },
              { label: 'Officers On Duty', value: statsLoading ? '…' : String(onDutyOfficers.length), icon: <Shield size={16} />, bg: 'bg-blue-50', text: 'text-blue-700' },
              { label: 'Roads Blocked',    value: statsLoading ? '…' : String(blockedRoads.length), icon: <Navigation size={16} />, bg: 'bg-red-50', text: 'text-red-700' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3`}>
                <span className={s.text}>{s.icon}</span>
                <div>
                  <p className={`font-poppins font-bold text-xl ${s.text}`}>{s.value}</p>
                  <p className="text-[11px] text-gray-500 font-inter">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard> */}

      </main>
    </div>
  );
}
