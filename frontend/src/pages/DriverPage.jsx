import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, MapPin, Navigation, Activity, Clock, Play, Square,
  RotateCcw, ChevronLeft, Zap, CheckCircle, AlertCircle, RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { FormField } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';
import LocationSearch from '../components/LocationSearch';
import {
  updateAmbulanceLocation, getAmbulances, getAmbulanceById,
  updateAmbulanceStatus, clearAmbulanceDestination,
} from '../services/api';
import { socketService } from '../services/socket';
import { useTripContext } from '../context/TripContext';

const STATUS_COLORS = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  BUSY: 'bg-blue-100 text-blue-700 border-blue-200',
  IDLE: 'bg-gray-100 text-gray-500 border-gray-200',
};

function StatusPill({ status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border font-inter ${STATUS_COLORS[status] || STATUS_COLORS.IDLE}`}>
      {status}
    </span>
  );
}

function TripCard({ icon, label, value, sub, bg, border }) {
  return (
    <div className={`${bg} ${border} border rounded-xl p-3 flex items-start gap-2.5`}>
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 font-inter">{label}</p>
        <p className="text-[13px] font-semibold text-gray-900 font-inter truncate">{value || '—'}</p>
        {sub && <p className="text-[10px] text-gray-400 font-inter mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default function DriverPage() {
  const navigate = useNavigate();
  const tripCtx = useTripContext();

  // Ambulance ID input
  const [ambId, setAmbId] = useState('');
  const [ambData, setAmbData] = useState(null);
  const [ambLoading, setAmbLoading] = useState(false);
  const [ambError, setAmbError] = useState('');

  // Location update form
  const [location, setLocation] = useState(null);
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [msg, setMsg] = useState('');

  // Fleet list
  const [ambulances, setAmbulances] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(true);

  // Trip controls
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  // Socket for real-time updates
  useEffect(() => {
    const socket = socketService.connect();
    const handleStatusChange = (data) => {
      if (ambData && String(data.ambulance_id) === String(ambData.id)) {
        fetchAmbulance(ambData.id);
      }
      fetchFleet();
    };
    const handleRouteUpdate = (data) => {
      if (ambData && String(data.ambulance_id) === String(ambData.id)) {
        fetchAmbulance(ambData.id);
      }
    };
    socket.on('ambulance_status_changed', handleStatusChange);
    socket.on('route_updated', handleRouteUpdate);
    socket.on('ambulance_location_update', () => fetchFleet());
    socket.emit('subscribe_all');
    return () => {
      socket.off('ambulance_status_changed', handleStatusChange);
      socket.off('route_updated', handleRouteUpdate);
      socket.off('ambulance_location_update');
    };
  }, [ambData]);

  async function fetchFleet() {
    try {
      const res = await getAmbulances();
      setAmbulances(res.data || []);
    } catch {
      setAmbulances([]);
    } finally {
      setLoadingFleet(false);
    }
  }

  async function fetchAmbulance(id) {
    if (!id) return;
    setAmbLoading(true);
    setAmbError('');
    try {
      const res = await getAmbulanceById(id);
      if (!res.success || !res.data) throw new Error('Ambulance not found');
      setAmbData(res.data);
    } catch (err) {
      setAmbData(null);
      setAmbError(err.message || 'Ambulance not found');
    } finally {
      setAmbLoading(false);
    }
  }

  useEffect(() => {
    fetchFleet();
  }, []);

  // Fetch ambulance when ID changes (debounced)
  useEffect(() => {
    setAmbData(null);
    setAmbError('');
    if (!ambId) return;
    const t = setTimeout(() => fetchAmbulance(ambId), 500);
    return () => clearTimeout(t);
  }, [ambId]);

  // We now derive progress directly from the real Map TripContext
  // removing the fake local timer entirely so it stays perfectly in sync with the map
  const actualProgress = (tripCtx.trip && ambData && String(tripCtx.trip.ambId) === String(ambData.id))
    ? (tripCtx.trip.progress || 0)
    : 0;

  useEffect(() => {
    if (tripCtx.notification?.type === 'arrived' || tripCtx.trip?.status === 'active') {
      fetchFleet();
      if (ambData) fetchAmbulance(ambData.id);
    }
  }, [tripCtx.notification, tripCtx.trip?.status]);

  async function handleLocationUpdate(e) {
    e.preventDefault();
    setSubmitStatus('loading');
    setMsg('');
    try {
      if (!ambId) throw new Error('Please enter your Ambulance ID.');
      if (!location) throw new Error('Please select a location from search results.');
      await updateAmbulanceLocation(ambId, location.lat, location.lng);
      setSubmitStatus('success');
      setMsg('Location updated successfully.');
      setLocation(null);
      fetchFleet();
      if (ambData) fetchAmbulance(ambData.id);
    } catch (err) {
      setSubmitStatus('error');
      setMsg(err instanceof Error ? err.message : 'Failed to update location.');
    }
  }

  async function handleStartTrip() {
    if (!ambData) return;
    try {
      await updateAmbulanceStatus(ambData.id, 'ACTIVE');
      await fetchAmbulance(ambData.id);
      fetchFleet();
    } catch (err) {
      setMsg('Could not start trip: ' + err.message);
    }
  }

  async function handleEndTrip() {
    if (!ambData) return;
    try {
      await clearAmbulanceDestination(ambData.id);
      setProgress(0);
      await fetchAmbulance(ambData.id);
      fetchFleet();
    } catch (err) {
      setMsg('Could not end trip: ' + err.message);
    }
  }

  function handleReset() {
    setAmbId('');
    setAmbData(null);
    setAmbError('');
    setProgress(0);
    setSubmitStatus('idle');
    setMsg('');
    setLocation(null);
  }

  const hasTrip = ambData && ambData.destination;
  const tripStatus = !ambData ? 'idle'
    : ambData.status === 'ACTIVE' ? 'active'
      : ambData.status === 'IDLE' ? 'idle'
        : 'busy';

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Navbar />

      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-emerald-200 hover:text-white text-[12px] font-inter mb-3 transition-colors">
            <ChevronLeft size={14} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-poppins font-bold text-2xl">Driver Console</h1>
              <p className="text-emerald-200 font-inter text-sm">Manage your ambulance · Update location · Track trips</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── Trip Completed Banner ── */}
        {tripCtx.notification?.type === 'arrived' && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">✅</div>
              <div>
                <p className="text-[11px] font-inter font-semibold text-emerald-100 uppercase tracking-widest mb-0.5">Trip Completed</p>
                <p className="font-poppins font-bold text-lg leading-tight">{tripCtx.notification.ambName} has arrived</p>
                <p className="text-[12px] text-emerald-100 font-inter mt-0.5">Successfully reached {tripCtx.notification.dstName}</p>
              </div>
            </div>
            <button
              onClick={() => tripCtx.dismissNotification()}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Active Trip Banner from TripContext ── */}
        {tripCtx.trip?.status === 'active' && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0 animate-pulse">🚑</div>
                <div>
                  <p className="text-[11px] font-inter font-semibold text-blue-200 uppercase tracking-widest mb-0.5">Trip in Progress</p>
                  <p className="font-poppins font-bold text-lg leading-tight">{tripCtx.trip.ambName}</p>
                  <p className="text-[12px] text-blue-200 font-inter mt-0.5">
                    <span className="font-medium text-white">{tripCtx.trip.srcName}</span>
                    {' → '}
                    <span className="font-medium text-white">{tripCtx.trip.dstName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/map')}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-inter font-bold text-[13px] hover:bg-blue-50 transition-colors shadow-sm"
              >
                <Navigation size={14} /> Continue on Map
              </button>
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[11px] font-inter text-blue-200 mb-1.5">
                <span>Route Completion</span>
                <span className="font-bold text-white">{Math.round(tripCtx.trip.progress || 0)}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${tripCtx.trip.progress || 0}%` }}
                />
              </div>
            </div>
            {tripCtx.trip.routeState?.rerouted && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-orange-500/30 border border-orange-400/40 rounded-lg">
                <AlertTriangle size={12} className="text-orange-200 flex-shrink-0" />
                <p className="text-[11px] text-orange-100 font-inter font-medium">
                  {tripCtx.trip.routeState.rerouteMsg || 'Alternate route active — bypassing incident zone'}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 items-stretch">

          {/* ── Update Location ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
            <h2 className="font-poppins font-semibold text-gray-900 text-base mb-1">Update Location</h2>
            <p className="text-gray-400 font-inter text-sm mb-4">Report your current position to dispatch</p>
            <form onSubmit={handleLocationUpdate} className="flex flex-col gap-3 flex-1">
              <FormField
                label="Ambulance ID"
                type="number"
                value={ambId}
                onChange={setAmbId}
                placeholder="e.g. 1"
                required
              />
              <LocationSearch
                label="Current Location"
                value={location}
                onChange={setLocation}
                placeholder="Search your current location"
                required
              />
              <div className="flex-1" />
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={submitStatus === 'loading'}
                  className="mt-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-inter font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitStatus === 'loading' ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Updating…</>
                  ) : (
                    <><Zap size={14} />Update Location</>
                  )}
                </button>
                <button
                  type="button"
                  disabled={!ambId}
                  onClick={async () => {
                    try {
                      await updateAmbulanceStatus(ambId, 'IDLE');
                      fetchFleet();
                      if (ambData) fetchAmbulance(ambData.id);
                      setMsg('Driver marked as IDLE.');
                      setSubmitStatus('success');
                    } catch(e) {
                      setMsg('Failed to make driver IDLE.');
                      setSubmitStatus('error');
                    }
                  }}
                  className="py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 font-inter font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  Make Driver Idle
                </button>
              </div>
              <StatusBadge status={submitStatus} message={msg} />
            </form>
          </div>

          {/* ── Fleet Status ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-poppins font-semibold text-gray-900 text-base">Fleet Status</h2>
              <button onClick={fetchFleet} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                <RefreshCw size={11} />
              </button>
            </div>
            <p className="text-gray-400 font-inter text-sm mb-4">Live status of all ambulances</p>
            <div className="flex flex-col gap-2 flex-1">
              {loadingFleet ? (
                <div className="text-center py-6 text-gray-400 font-inter text-sm">Loading fleet…</div>
              ) : ambulances.length === 0 ? (
                <div className="text-center py-6 text-gray-400 font-inter text-sm">No ambulances registered.</div>
              ) : ambulances.map(amb => (
                <button
                  key={amb.id}
                  onClick={() => setAmbId(String(amb.id))}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left w-full ${String(ambId) === String(amb.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${amb.status === 'ACTIVE' ? 'bg-red-100 border border-red-200' : 'bg-gray-100 border border-gray-200'}`}>🚑</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-poppins font-semibold text-gray-900 text-[13px]">Unit #{amb.id}</span>
                      <StatusPill status={amb.status} />
                    </div>
                    <p className="text-[11px] text-gray-400 font-inter truncate">
                      {amb.driver_name}
                      {amb.destination ? ` → ${amb.destination}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-poppins font-bold text-gray-900 text-[12px]">{parseFloat(amb.latitude)?.toFixed(3)}</p>
                    <p className="text-[10px] text-gray-400 font-inter">{parseFloat(amb.longitude)?.toFixed(3)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
