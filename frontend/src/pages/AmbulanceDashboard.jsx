import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, AlertTriangle, CheckCircle, Clock, Navigation,
  Radio, TrendingUp, Truck, Zap, MapPin, Heart, Phone,
  ChevronRight, Play, Square, RotateCcw, Wifi
} from 'lucide-react';

// ─── Route Data ───────────────────────────────────────────────────────────────
// NYC: Station → Incident Scene → City Hospital
const ROUTE_WAYPOINTS = [
  [40.7128, -74.0060],  // AMB-04 base station
  [40.7145, -74.0035],
  [40.7160, -74.0010],
  [40.7182, -73.9985],
  [40.7210, -73.9970],
  [40.7240, -73.9955],  // incident scene approach
  [40.7265, -73.9942],  // ← incident (picked up patient)
  [40.7295, -73.9930],
  [40.7330, -73.9915],
  [40.7370, -73.9900],
  [40.7410, -73.9885],
  [40.7460, -73.9870],
  [40.7510, -73.9850],
  [40.7560, -73.9828],
  [40.7600, -73.9810],  // hospital approach
  [40.7614, -73.9776],  // ← hospital
];

const AMBULANCE_POS  = ROUTE_WAYPOINTS[0];
const INCIDENT_POS   = ROUTE_WAYPOINTS[6];
const HOSPITAL_POS   = ROUTE_WAYPOINTS[ROUTE_WAYPOINTS.length - 1];

const TOTAL_SEGMENTS = ROUTE_WAYPOINTS.length - 1;
const ETA_SECONDS    = 480; // 8 minutes total route

// ─── Activity Feed Seed Data ──────────────────────────────────────────────────
const SEED_EVENTS = [
  { id: 1, type: 'dispatch',   badge: 'DISPATCH',    color: 'blue',   time: '14:31',  msg: 'AMB-04 dispatched to Main St incident' },
  { id: 2, type: 'emergency',  badge: 'PRIORITY',    color: 'red',    time: '14:30',  msg: 'Code Red — multi-vehicle collision reported' },
  { id: 3, type: 'enroute',    badge: 'EN ROUTE',    color: 'orange', time: '14:28',  msg: 'AMB-02 en route to St. Luke\'s Hospital' },
  { id: 4, type: 'cleared',    badge: 'CLEARED',     color: 'green',  time: '14:25',  msg: 'AMB-01 cleared from Downtown Medical' },
  { id: 5, type: 'dispatch',   badge: 'DISPATCH',    color: 'blue',   time: '14:22',  msg: 'AMB-03 dispatched — chest pain, 5th Ave' },
  { id: 6, type: 'cleared',    badge: 'CLEARED',     color: 'green',  time: '14:18',  msg: 'Scene secure — AMB-01 returning to base' },
];

const LIVE_EVENTS = [
  { type: 'dispatch',  badge: 'DISPATCH',  color: 'blue',   msg: 'AMB-07 dispatched — traffic collision E 42nd' },
  { type: 'emergency', badge: 'PRIORITY',  color: 'red',    msg: 'Code Red — cardiac arrest, Park Ave' },
  { type: 'enroute',   badge: 'EN ROUTE',  color: 'orange', msg: 'AMB-05 en route — ETA 4 min to Bellevue' },
  { type: 'cleared',   badge: 'CLEARED',   color: 'green',  msg: 'AMB-06 cleared — patient transferred' },
  { type: 'dispatch',  badge: 'DISPATCH',  color: 'blue',   msg: 'AMB-09 dispatched — unconscious patient' },
  { type: 'emergency', badge: 'PRIORITY',  color: 'red',    msg: 'Mass casualty alert — Broadway & 34th' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function interpolateRoute(waypoints, progress) {
  const segProgress = progress * (waypoints.length - 1);
  const segIdx = Math.min(Math.floor(segProgress), waypoints.length - 2);
  const t = segProgress - segIdx;
  const [lat1, lng1] = waypoints[segIdx];
  const [lat2, lng2] = waypoints[segIdx + 1];
  return [lerp(lat1, lat2, t), lerp(lng1, lng2, t)];
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getPhase(progress) {
  if (progress < 0.42) return { label: 'To Scene', color: '#f59e0b', icon: 'en-route' };
  if (progress < 0.46) return { label: 'On Scene',  color: '#ef4444', icon: 'on-scene' };
  return { label: 'To Hospital', color: '#22c55e', icon: 'to-hospital' };
}

// ─── Map Icons ────────────────────────────────────────────────────────────────
function makeAmbulanceIcon(angle = 0) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <g transform="rotate(${angle}, 20, 20)">
        <circle cx="20" cy="20" r="18" fill="#ef4444" opacity="0.2"/>
        <circle cx="20" cy="20" r="14" fill="#ef4444"/>
        <text x="20" y="25" text-anchor="middle" font-size="16" fill="white">🚑</text>
      </g>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function makeIncidentIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="#f59e0b" opacity="0.25"/>
      <circle cx="18" cy="18" r="12" fill="#f59e0b"/>
      <text x="18" y="23" text-anchor="middle" font-size="15" fill="white">⚠️</text>
    </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
}

function makeHospitalIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="#22c55e" opacity="0.25"/>
      <circle cx="18" cy="18" r="12" fill="#22c55e"/>
      <text x="18" y="23" text-anchor="middle" font-size="15" fill="white">🏥</text>
    </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
}

function makeBaseIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="13" fill="#6366f1" opacity="0.25"/>
      <circle cx="15" cy="15" r="10" fill="#6366f1"/>
      <text x="15" y="20" text-anchor="middle" font-size="13" fill="white">🏠</text>
    </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [30, 30], iconAnchor: [15, 15] });
}

// ─── Sub-Components ───────────────────────────────────────────────────────────
function Badge({ color, label }) {
  const colors = {
    blue:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    red:    'bg-red-500/20 text-red-400 border-red-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border font-inter tracking-wider ${colors[color] || colors.blue}`}>
      {label}
    </span>
  );
}

function StatCard({ icon, value, label, sub, accent }) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-xl p-3 flex items-center gap-3 hover:bg-white/8 transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold font-poppins text-white leading-none">{value}</div>
        <div className="text-[11px] text-slate-400 font-inter mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-slate-500 font-inter">{sub}</div>}
      </div>
    </div>
  );
}

function FeedItem({ event }) {
  return (
    <div className="feed-item flex items-start gap-2.5 py-2.5 border-b border-white/5 last:border-0">
      <div className="pt-0.5 flex-shrink-0">
        <Badge color={event.color} label={event.badge} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-slate-300 font-inter leading-snug">{event.msg}</p>
        <p className="text-[10px] text-slate-500 font-inter mt-0.5">{event.time}</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AmbulanceDashboard() {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const ambMarkerRef    = useRef(null);
  const routeLineRef    = useRef(null);
  const coveredLineRef  = useRef(null);
  const animFrameRef    = useRef(null);
  const lastTimeRef     = useRef(null);

  const [isRunning, setIsRunning]   = useState(false);
  const [progress, setProgress]     = useState(0);          // 0..1
  const [etaSecs, setEtaSecs]       = useState(ETA_SECONDS);
  const [speed, setSpeed]           = useState(0);
  const [feedItems, setFeedItems]   = useState(SEED_EVENTS);
  const [nextEventId, setNextEventId] = useState(100);
  const [liveEventIdx, setLiveEventIdx] = useState(0);
  const [completed, setCompleted]   = useState(false);
  const [mapReady, setMapReady]     = useState(false);

  const progressRef = useRef(0);
  const isRunningRef = useRef(false);

  // ── Init Map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [40.7370, -73.9920],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© <a href="https://carto.com/">CARTO</a>')
      .addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Static markers
    L.marker(AMBULANCE_POS, { icon: makeBaseIcon() })
      .bindTooltip('Base Station', { permanent: false, direction: 'top' })
      .addTo(map);

    L.marker(INCIDENT_POS, { icon: makeIncidentIcon() })
      .bindTooltip('<b>🚨 Incident Scene</b><br/>Multi-vehicle collision', { permanent: false, direction: 'top' })
      .addTo(map);

    L.marker(HOSPITAL_POS, { icon: makeHospitalIcon() })
      .bindTooltip('<b>🏥 City General Hospital</b>', { permanent: false, direction: 'top' })
      .addTo(map);

    // Full route (dim)
    routeLineRef.current = L.polyline(ROUTE_WAYPOINTS, {
      color: '#334155',
      weight: 5,
      dashArray: '8 6',
      lineCap: 'round',
    }).addTo(map);

    // Covered route (bright)
    coveredLineRef.current = L.polyline([ROUTE_WAYPOINTS[0]], {
      color: '#ef4444',
      weight: 5,
      lineCap: 'round',
    }).addTo(map);

    // Ambulance marker
    ambMarkerRef.current = L.marker(AMBULANCE_POS, { icon: makeAmbulanceIcon(), zIndexOffset: 1000 })
      .bindTooltip('<b>AMB-04</b><br/>Unit Active', { permanent: false, direction: 'top' })
      .addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Animation Loop ───────────────────────────────────────────────────────────
  const animate = useCallback((timestamp) => {
    if (!isRunningRef.current) return;
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000; // seconds
    lastTimeRef.current = timestamp;

    const increment = delta / ETA_SECONDS;
    const newProgress = Math.min(progressRef.current + increment, 1);
    progressRef.current = newProgress;

    const pos = interpolateRoute(ROUTE_WAYPOINTS, newProgress);
    const remaining = Math.max(0, ETA_SECONDS * (1 - newProgress));
    const spd = Math.round(25 + Math.sin(newProgress * Math.PI * 6) * 15);

    // Update marker
    if (ambMarkerRef.current) {
      ambMarkerRef.current.setLatLng(pos);
    }

    // Update covered polyline
    if (coveredLineRef.current) {
      const covered = [];
      const segCount = Math.floor(newProgress * TOTAL_SEGMENTS);
      for (let i = 0; i <= segCount; i++) covered.push(ROUTE_WAYPOINTS[i]);
      if (segCount < TOTAL_SEGMENTS) covered.push(pos);
      coveredLineRef.current.setLatLngs(covered);
    }

    setProgress(newProgress);
    setEtaSecs(remaining);
    setSpeed(spd);

    if (newProgress >= 1) {
      isRunningRef.current = false;
      setIsRunning(false);
      setCompleted(true);
      return;
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const handleStart = useCallback(() => {
    if (completed) return;
    isRunningRef.current = true;
    lastTimeRef.current = null;
    setIsRunning(true);
    animFrameRef.current = requestAnimationFrame(animate);
  }, [animate, completed]);

  const handleStop = useCallback(() => {
    isRunningRef.current = false;
    lastTimeRef.current = null;
    cancelAnimationFrame(animFrameRef.current);
    setIsRunning(false);
    setSpeed(0);
  }, []);

  const handleReset = useCallback(() => {
    handleStop();
    progressRef.current = 0;
    setProgress(0);
    setEtaSecs(ETA_SECONDS);
    setSpeed(0);
    setCompleted(false);
    setFeedItems(SEED_EVENTS);

    if (ambMarkerRef.current) ambMarkerRef.current.setLatLng(AMBULANCE_POS);
    if (coveredLineRef.current) coveredLineRef.current.setLatLngs([ROUTE_WAYPOINTS[0]]);
    if (mapRef.current) mapRef.current.setView([40.7370, -73.9920], 13);
  }, [handleStop]);

  // ── Live Feed Injector ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
      const evtTemplate = LIVE_EVENTS[liveEventIdx % LIVE_EVENTS.length];
      const newEvt = { ...evtTemplate, id: nextEventId, time: timeStr };

      setFeedItems(prev => [newEvt, ...prev.slice(0, 19)]);
      setNextEventId(n => n + 1);
      setLiveEventIdx(i => i + 1);
    }, 4500);
    return () => clearInterval(interval);
  }, [isRunning, liveEventIdx, nextEventId]);

  const phase = getPhase(progress);
  const pct   = Math.round(progress * 100);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#0d1117] font-inter">

      {/* ── Left Panel (25%) ─────────────────────────────────────────────── */}
      <aside className="w-[25%] min-w-[260px] max-w-[340px] flex flex-col bg-[#111827] border-r border-white/8 overflow-hidden">

        {/* Header */}
        <div className="px-4 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40">
                <span className="text-base">🚑</span>
              </div>
              <div>
                <h1 className="font-poppins font-bold text-white text-sm leading-none">AmbulanceRoute</h1>
                <p className="text-[10px] text-slate-500 font-inter mt-0.5">Command Dashboard</p>
              </div>
            </div>
            {/* LIVE badge */}
            <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 rounded-full px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />
              <span className="text-[10px] font-semibold text-red-400 font-inter tracking-widest">LIVE</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-3 py-3 grid grid-cols-2 gap-2 flex-shrink-0 border-b border-white/8">
          <StatCard
            icon={<Truck size={16} className="text-blue-400" />}
            value="7"
            label="Active Units"
            sub="+2 standby"
            accent="bg-blue-500/15"
          />
          <StatCard
            icon={<Clock size={16} className="text-amber-400" />}
            value="6:24"
            label="Avg ETA"
            sub="↓ 12% today"
            accent="bg-amber-500/15"
          />
          <StatCard
            icon={<CheckCircle size={16} className="text-emerald-400" />}
            value="41"
            label="Dispatched"
            sub="This shift"
            accent="bg-emerald-500/15"
          />
          <StatCard
            icon={<TrendingUp size={16} className="text-purple-400" />}
            value="96%"
            label="Response Rate"
            sub="Target: 90%"
            accent="bg-purple-500/15"
          />
        </div>

        {/* Active Unit Panel */}
        <div className="px-3 py-3 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-poppins font-semibold text-white text-[13px]">Active Dispatch</h2>
            <Badge color={progress < 0.42 ? 'orange' : progress < 0.46 ? 'red' : 'green'} label={phase.label} />
          </div>

          {/* Unit info */}
          <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/8">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-600/30 flex items-center justify-center text-sm">🚑</div>
              <div>
                <p className="font-poppins font-semibold text-white text-[13px]">AMB-04</p>
                <p className="text-[10px] text-slate-400 font-inter">Paramedic Unit · NYC EMS</p>
              </div>
              <div className="ml-auto">
                <Wifi size={13} className="text-emerald-400" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-[11px] text-slate-400 font-inter">Speed</p>
                <p className="font-poppins font-bold text-white text-[15px]">{isRunning ? speed : 0}</p>
                <p className="text-[9px] text-slate-500 font-inter">km/h</p>
              </div>
              <div className="text-center border-x border-white/8">
                <p className="text-[11px] text-slate-400 font-inter">ETA</p>
                <p className="font-poppins font-bold text-amber-400 text-[15px]">{formatTime(etaSecs)}</p>
                <p className="text-[9px] text-slate-500 font-inter">remaining</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-slate-400 font-inter">Done</p>
                <p className="font-poppins font-bold text-white text-[15px]">{pct}%</p>
                <p className="text-[9px] text-slate-500 font-inter">route</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[10px] text-slate-400 font-inter">Base</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10px] text-slate-400 font-inter">Scene</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-400 font-inter">Hospital</span>
              </div>
            </div>
            <div className="relative h-2.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: progress < 0.42
                    ? 'linear-gradient(90deg, #6366f1, #f59e0b)'
                    : progress < 0.46
                    ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    : 'linear-gradient(90deg, #ef4444, #22c55e)',
                }}
              />
              {/* Scene marker */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400/60" style={{ left: '42%' }} />
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!isRunning && !completed && (
              <button
                onClick={handleStart}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[12px] font-semibold font-inter transition-colors shadow-lg shadow-emerald-900/30"
              >
                <Play size={13} />
                Start Route
              </button>
            )}
            {isRunning && (
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-[12px] font-semibold font-inter transition-colors shadow-lg shadow-red-900/30"
              >
                <Square size={13} />
                Stop
              </button>
            )}
            {completed && (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[12px] font-semibold font-inter">
                <CheckCircle size={13} />
                Completed
              </div>
            )}
            <button
              onClick={handleReset}
              title="Reset"
              className="w-9 flex items-center justify-center rounded-lg bg-white/6 hover:bg-white/12 border border-white/8 text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Route waypoints summary */}
        <div className="px-3 py-3 border-b border-white/8 flex-shrink-0">
          <h2 className="font-poppins font-semibold text-white text-[13px] mb-2.5">Route Plan</h2>
          <div className="space-y-1.5">
            {[
              { icon: '🏠', label: 'Base Station', sub: 'AMB-04 origin', color: 'text-indigo-400', done: progress > 0.01 },
              { icon: '⚠️', label: 'Incident Scene', sub: 'Main St · ETA ~3m', color: 'text-amber-400', done: progress > 0.44 },
              { icon: '🏥', label: 'City General', sub: 'Emergency wing', color: 'text-emerald-400', done: progress >= 1 },
            ].map((wp, i) => (
              <div key={i} className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${wp.done ? 'bg-white/8' : 'bg-white/3'}`}>
                <span className="text-base flex-shrink-0">{wp.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[12px] font-semibold font-inter ${wp.color}`}>{wp.label}</p>
                  <p className="text-[10px] text-slate-500 font-inter">{wp.sub}</p>
                </div>
                {wp.done && <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />}
                {!wp.done && <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="flex-1 px-3 py-3 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h2 className="font-poppins font-semibold text-white text-[13px]">Activity Feed</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />
              <span className="text-[10px] text-red-400 font-semibold font-inter tracking-widest">LIVE</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
            {feedItems.map(evt => (
              <FeedItem key={evt.id} event={evt} />
            ))}
          </div>
        </div>
      </aside>

      {/* ── Right Panel (75%) — Map ───────────────────────────────────────── */}
      <main className="flex-1 relative overflow-hidden">

        {/* Map container */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {/* Top overlay bar */}
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
          <div className="flex items-center justify-between px-5 py-3">
            {/* Left: Phase indicator */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md"
                style={{
                  background: `${phase.color}18`,
                  borderColor: `${phase.color}40`,
                }}
              >
                <span className="w-2 h-2 rounded-full live-dot" style={{ background: phase.color }} />
                <span className="text-[12px] font-semibold font-inter" style={{ color: phase.color }}>
                  {phase.label}
                </span>
              </div>
              <div className="bg-black/60 backdrop-blur-md border border-white/12 rounded-full px-3 py-1.5 flex items-center gap-2">
                <Clock size={12} className="text-amber-400" />
                <span className="font-poppins font-bold text-amber-400 text-[13px]">{formatTime(etaSecs)}</span>
                <span className="text-[10px] text-slate-400 font-inter">ETA</span>
              </div>
            </div>

            {/* Right: Mini stats */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="bg-black/60 backdrop-blur-md border border-white/12 rounded-full px-3 py-1.5 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Activity size={11} className="text-emerald-400" />
                  <span className="text-[11px] text-slate-300 font-inter">7 Units</span>
                </div>
                <div className="w-px h-3 bg-white/15" />
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={11} className="text-red-400" />
                  <span className="text-[11px] text-slate-300 font-inter">3 Incidents</span>
                </div>
                <div className="w-px h-3 bg-white/15" />
                <div className="flex items-center gap-1.5">
                  <Radio size={11} className="text-blue-400" />
                  <span className="text-[11px] text-slate-300 font-inter">Dispatch On</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom overlay — progress bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          <div className="mx-4 mb-4 bg-black/70 backdrop-blur-md border border-white/12 rounded-2xl p-3 pointer-events-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold font-inter text-white">AMB-04 Route Progress</span>
                <Badge color={completed ? 'green' : isRunning ? 'orange' : 'blue'} label={completed ? 'ARRIVED' : isRunning ? 'MOVING' : 'STANDBY'} />
              </div>
              <span className="font-poppins font-bold text-white text-[14px]">{pct}%</span>
            </div>
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #6366f1 0%, #f59e0b 42%, #ef4444 46%, #22c55e 100%)',
                }}
              />
              {/* Ambulance position dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-red-500 shadow-md transition-all duration-300"
                style={{ left: `calc(${pct}% - 6px)` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-inter">
              <span>🏠 Base Station</span>
              <span style={{ marginLeft: `${42}%`, transform: 'translateX(-50%)' }}>⚠️ Incident (42%)</span>
              <span>🏥 City General</span>
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {!mapReady && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1117]">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 font-inter text-sm">Initialising map…</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
