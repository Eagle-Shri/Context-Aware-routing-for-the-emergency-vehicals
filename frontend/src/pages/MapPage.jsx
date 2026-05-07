import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronLeft, RefreshCw, Navigation, RotateCcw, Loader2, Truck, AlertTriangle, Trash2, Check, Plus, Building2 } from 'lucide-react';
import LocationSearch from '../components/LocationSearch';
import {
  getAmbulances, getActiveIncidents, getHospitals, getPoliceUpdates, getStations,
  calculateRoute, getNaiveRoute, dispatchAmbulance, clearAmbulanceDestination, deleteIncident, resolveIncident,
} from '../services/api';
import { socketService } from '../services/socket';
import { useTripContext } from '../context/TripContext';

const BLURU = [12.9716, 77.5946];

const makeIcon = (emoji, bg, size = 38) => L.divIcon({
  html: `<div style="width:${size}px;height:${size}px;background:${bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.42)}px;box-shadow:0 3px 12px rgba(0,0,0,.32)">${emoji}</div>`,
  className: '',
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

function Badge({ color, label }) {
  const c = {
    blue:   'bg-blue-100 text-blue-700 border-blue-200',
    green:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    red:    'bg-red-100 text-red-700 border-red-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    gray:   'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border font-inter tracking-wider ${c[color] || c.blue}`}>
      {label}
    </span>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[10px] text-gray-400 font-semibold font-inter uppercase tracking-widest mb-2">{children}</p>;
}

function StatusPill({ status }) {
  const c =
    status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    status === 'BUSY'   ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-gray-100 text-gray-500 border-gray-200';
  return <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border font-inter ${c}`}>{status}</span>;
}

export default function MapPage() {
  const navigate = useNavigate();
  const tripCtx = useTripContext();

  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef({ ambulances: {}, incidents: {}, hospitals: {}, stations: {}, policeUpdates: {}, routes: {} });

  const [ambulances, setAmbulances]       = useState([]);
  const [incidents, setIncidents]         = useState([]);
  const [hospitals, setHospitals]         = useState([]);
  const [policeUpdates, setPoliceUpdates] = useState([]);
  const [stations, setStations]           = useState([]);
  const [mapReady, setMapReady]           = useState(false);
  const [lastUpdate, setLastUpdate]       = useState(null);
  const [feedItems, setFeedItems]         = useState([]);
  const [loading, setLoading]             = useState(true);

  const [routeSrc, setRouteSrc]           = useState(null);
  const [routeDst, setRouteDst]           = useState(null);
  const [selectedAmbId, setSelectedAmbId] = useState('');
  const [selectedAmbName, setSelectedAmbName] = useState('');
  const [routeStatus, setRouteStatus]     = useState('idle');
  const [routeInfo, setRouteInfo]         = useState(null);
  const [rerouted, setRerouted]           = useState(false);
  const [rerouteMsg, setRerouteMsg]       = useState('');

  const routePolyRef       = useRef(null);
  const originalRoutePolyRef = useRef(null);
  const coveredPolyRef  = useRef(null);
  const routeAmbRef     = useRef(null);
  const routeSrcMarker  = useRef(null);
  const routeDstMarker  = useRef(null);
  const routeCoordsRef  = useRef([]);
  const routeStepRef    = useRef(0);
  const routeTimerRef   = useRef(null);
  const routeSrcRef     = useRef(null);
  const routeDstRef     = useRef(null);
  const selectedAmbIdRef = useRef('');
  const routeStatusRef  = useRef('idle');
  const totalStepsRef   = useRef(0);
  const feedCounterRef  = useRef(0);
  const incidentsRef    = useRef([]);
  const reroutingRef    = useRef(false);
  const reroutedRef     = useRef(false);
  const rerouteMsgRef   = useRef('');
  const routeInfoRef    = useRef(null);
  const originalRouteCoordsRef = useRef(null);
  const resumedRef      = useRef(false);
  const [deletingIncidentId, setDeletingIncidentId] = useState(null);

  // Keep refs in sync
  useEffect(() => { routeSrcRef.current = routeSrc; }, [routeSrc]);
  useEffect(() => { routeDstRef.current = routeDst; }, [routeDst]);
  useEffect(() => { selectedAmbIdRef.current = selectedAmbId; }, [selectedAmbId]);
  useEffect(() => { routeStatusRef.current = routeStatus; }, [routeStatus]);
  useEffect(() => { incidentsRef.current = incidents; }, [incidents]);

  // ── Re-check route whenever incidents change (catches newly added incidents) ──
  useEffect(() => {
    if (!incidents.length) return;
    if (routeStatusRef.current !== 'moving') return;
    if (reroutingRef.current) return;
    const step   = routeStepRef.current;
    const coords = routeCoordsRef.current;
    if (!coords.length || !routeDstRef.current) return;
    const hit = scanRouteAhead(step, coords, incidents);
    if (hit) doReroute(hit.currentPos, hit.count);
  }, [incidents]);
  useEffect(() => { reroutedRef.current = rerouted; }, [rerouted]);
  useEffect(() => { rerouteMsgRef.current = rerouteMsg; }, [rerouteMsg]);
  useEffect(() => { routeInfoRef.current = routeInfo; }, [routeInfo]);

  async function fetchAll() {
    try {
      const [ambRes, incRes, hospRes, policeRes, stRes] = await Promise.allSettled([
        getAmbulances(), getActiveIncidents(), getHospitals(), getPoliceUpdates(), getStations(),
      ]);
      if (ambRes.status    === 'fulfilled') setAmbulances(ambRes.value?.data    || []);
      if (incRes.status    === 'fulfilled') setIncidents(incRes.value?.data     || []);
      if (hospRes.status   === 'fulfilled') setHospitals(hospRes.value?.data    || []);
      if (policeRes.status === 'fulfilled') setPoliceUpdates(policeRes.value?.data || []);
      if (stRes.status     === 'fulfilled') setStations(stRes.value?.data       || []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('[MapPage] fetchAll error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  // On arrived → clear destination + notify trip complete
  useEffect(() => {
    if (routeStatus !== 'arrived') return;
    const ambId = selectedAmbIdRef.current;
    if (ambId) {
      clearAmbulanceDestination(ambId)
        .then(() => fetchAll())
        .catch(() => {});
      tripCtx.endTrip();
    }
  }, [routeStatus]);

  // ── Resume active trip when map remounts after navigation ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (resumedRef.current) return;
    const rs = tripCtx.trip?.routeState;
    if (!rs?.coords?.length) return;
    if (tripCtx.trip?.status !== 'active') return;
    resumedRef.current = true;

    const { coords, step, originalCoords, src, dst, routeInfo, rerouteMsg: savedMsg, rerouted: wasRerouted } = rs;
    const resumeStep = Math.min(step || 0, coords.length - 2);
    const distKm = routeInfo?.distKm || '?';
    const durMin  = routeInfo?.durMin  || '?';

    // Restore UI state
    if (src) setRouteSrc(src);
    if (dst) setRouteDst(dst);
    if (routeInfo) setRouteInfo(routeInfo);
    if (wasRerouted) { setRerouted(true); setRerouteMsg(savedMsg || ''); }
    if (tripCtx.trip.ambId) {
      setSelectedAmbId(tripCtx.trip.ambId);
      setSelectedAmbName(tripCtx.trip.ambName || '');
    }

    const map = mapRef.current;
    // Place src / dst markers
    if (src) {
      routeSrcMarker.current = L.marker([src.lat, src.lng], { icon: makeIcon('📍', '#22c55e', 34) })
        .bindTooltip(`<b>Start</b><br/>${src.label?.split(',')[0] || 'Source'}`, { direction: 'top' })
        .addTo(map);
    }
    if (dst) {
      routeDstMarker.current = L.marker([dst.lat, dst.lng], { icon: makeIcon('🏁', '#8b5cf6', 34) })
        .bindTooltip(`<b>Destination</b><br/>${dst.label?.split(',')[0] || 'Destination'}`, { direction: 'top' })
        .addTo(map);
    }
    // Draw original blocked route
    if (originalCoords?.length >= 2) drawOriginalRoute(originalCoords);

    // Draw remaining bypass / route polyline from resume point
    const remainingCoords = coords.slice(resumeStep);
    routeCoordsRef.current  = coords;
    routeStepRef.current    = resumeStep;
    totalStepsRef.current   = coords.length - 1;

    routePolyRef.current = L.polyline(remainingCoords, {
      color: wasRerouted ? '#f97316' : '#3b82f6',
      weight: 5, opacity: 0.82, lineCap: 'round', lineJoin: 'round',
      ...(wasRerouted ? { dashArray: '12 6' } : {}),
    }).addTo(map);
    coveredPolyRef.current = L.polyline(coords.slice(0, resumeStep + 1), {
      color: '#ef4444', weight: 5, opacity: 0.9, lineCap: 'round',
    }).addTo(map);

    routeAmbRef.current = L.marker(coords[resumeStep], { icon: makeIcon('🚑', '#ef4444', 46), zIndexOffset: 2000 })
      .bindTooltip(`<b>🚑 Trip Resumed</b><br/>${distKm} km · ~${durMin} min`, { permanent: false, direction: 'top' })
      .addTo(map);

    map.fitBounds(routePolyRef.current.getBounds(), { padding: [60, 60] });
    setRouteStatus('moving');

    const totalSteps = coords.length - 1;
    const intervalMs = totalSteps > 0 ? Math.max(80, Math.min(600, (Number(durMin) * 60 * 1000) / totalSteps / 6)) : 200;

    routeTimerRef.current = setInterval(() => {
      const s = routeStepRef.current;
      if (s >= routeCoordsRef.current.length - 1) {
        clearInterval(routeTimerRef.current); routeTimerRef.current = null;
        tripCtx.updateProgress(100);
        setRouteStatus('arrived');
        return;
      }
      const next = s + 1;
      routeStepRef.current = next;
      const live = routeCoordsRef.current;
      routeAmbRef.current?.setLatLng(live[next]);
      coveredPolyRef.current?.setLatLngs(live.slice(0, next + 1));
      const pct = Math.min(99, Math.round((next / totalStepsRef.current) * 100));
      tripCtx.updateProgress(pct);

      if (next % 15 === 0) {
        tripCtx.saveRouteState({
          coords: live, step: next,
          originalCoords: originalRouteCoordsRef.current,
          src: routeSrcRef.current, dst: routeDstRef.current,
          routeInfo: routeInfoRef.current,
          rerouteMsg: rerouteMsgRef.current, rerouted: reroutedRef.current,
        });
      }
      if (next % 6 === 0 && !reroutingRef.current && routeDstRef.current) {
        const hit = scanRouteAhead(next, live, incidentsRef.current);
        if (hit) doReroute(hit.currentPos, hit.count);
      }
    }, intervalMs);
  }, [mapReady]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: BLURU, zoom: 12, zoomControl: false, attributionControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap',
    }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Ambulance markers + stored routes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const markers = markersRef.current;
    const addedAmbIds = new Set();
    ambulances.forEach(amb => {
      const lat = parseFloat(amb.latitude);
      const lng = parseFloat(amb.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      addedAmbIds.add(amb.id);

      // ── Do not render global marker/route if this is the actively animated ambulance ──
      const isActivelyAnimated = String(amb.id) === String(selectedAmbIdRef.current) && ['moving', 'calculating', 'rerouting'].includes(routeStatusRef.current);
      
      if (isActivelyAnimated) {
        if (markers.ambulances[amb.id]) { map.removeLayer(markers.ambulances[amb.id]); delete markers.ambulances[amb.id]; }
        if (markers.routes[amb.id]) { map.removeLayer(markers.routes[amb.id]); delete markers.routes[amb.id]; }
        return;
      }

      const bg = amb.status === 'ACTIVE' ? '#ef4444' : amb.status === 'BUSY' ? '#3b82f6' : '#6b7280';
      const tooltip = `<b>🚑 ${amb.driver_name}</b><br/>Status: <b>${amb.status}</b>${amb.destination ? `<br/>→ ${amb.destination}` : ''}`;
      if (markers.ambulances[amb.id]) {
        markers.ambulances[amb.id].setLatLng([lat, lng]);
        markers.ambulances[amb.id].getElement()?.querySelector('div')?.setAttribute('style',
          `width:42px;height:42px;background:${bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 12px rgba(0,0,0,.32)`);
        markers.ambulances[amb.id].setTooltipContent(tooltip);
      } else {
        const m = L.marker([lat, lng], { icon: makeIcon('🚑', bg, 42), zIndexOffset: 1000 })
          .bindTooltip(tooltip, { direction: 'top' })
          .addTo(map);
        markers.ambulances[amb.id] = m;
      }
      if (amb.current_route) {
        try {
          const route = typeof amb.current_route === 'string' ? JSON.parse(amb.current_route) : amb.current_route;
          if (route.geometry?.coordinates) {
            const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            if (markers.routes[amb.id]) map.removeLayer(markers.routes[amb.id]);
            markers.routes[amb.id] = L.polyline(coords, { color: '#ef4444', weight: 4, dashArray: '10 5', lineCap: 'round' }).addTo(map);
          }
        } catch {}
      }
    });
    Object.keys(markers.ambulances).forEach(id => {
      if (!addedAmbIds.has(Number(id))) {
        map.removeLayer(markers.ambulances[id]);
        delete markers.ambulances[id];
        if (markers.routes[id]) { map.removeLayer(markers.routes[id]); delete markers.routes[id]; }
      }
    });
  }, [ambulances, mapReady]);

  // Incident markers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const markers = markersRef.current;
    const addedIds = new Set();
    incidents.forEach(inc => {
      const lat = parseFloat(inc.latitude);
      const lng = parseFloat(inc.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      addedIds.add(inc.id);
      const sevColor = inc.severity === 'high' ? '#ef4444' : inc.severity === 'medium' ? '#f97316' : '#f59e0b';
      if (!markers.incidents[inc.id]) {
        const circle = L.circle([lat, lng], { radius: parseFloat(inc.impact_radius) || 300, color: sevColor, fillColor: sevColor, fillOpacity: 0.1, weight: 2, dashArray: '6 4' }).addTo(map);
        const m = L.marker([lat, lng], { icon: makeIcon('⚠️', sevColor, 32) })
          .bindTooltip(`<b>⚠️ ${inc.type?.toUpperCase()}</b><br/>Severity: ${inc.severity}<br/>${inc.description || ''}`, { direction: 'top' })
          .addTo(map);
        markers.incidents[inc.id] = { marker: m, circle };
      }
    });
    Object.keys(markers.incidents).forEach(id => {
      if (!addedIds.has(Number(id))) {
        map.removeLayer(markers.incidents[id].marker);
        map.removeLayer(markers.incidents[id].circle);
        delete markers.incidents[id];
      }
    });
  }, [incidents, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const markers = markersRef.current;
    const addedIds = new Set();
    hospitals.forEach(h => {
      const lat = parseFloat(h.latitude);
      const lng = parseFloat(h.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      addedIds.add(h.id);
      if (!markers.hospitals[h.id]) {
        markers.hospitals[h.id] = L.marker([lat, lng], { icon: makeIcon('🏥', '#10b981', 36) })
          .bindTooltip(`<b>🏥 ${h.name}</b><br/>Beds: ${h.available}/${h.capacity}`, { direction: 'top' })
          .addTo(map);
      }
    });
    Object.keys(markers.hospitals).forEach(id => {
      if (!addedIds.has(Number(id))) { map.removeLayer(markers.hospitals[id]); delete markers.hospitals[id]; }
    });
  }, [hospitals, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const markers = markersRef.current;
    const addedIds = new Set();
    stations.forEach(s => {
      const lat = parseFloat(s.latitude);
      const lng = parseFloat(s.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      addedIds.add(s.id);
      if (!markers.stations[s.id]) {
        markers.stations[s.id] = L.marker([lat, lng], { icon: makeIcon('🚔', '#1d4ed8', 36) })
          .bindTooltip(`<b>🚔 ${s.name}</b>${s.zone ? `<br/>${s.zone}` : ''}${s.phone ? `<br/>${s.phone}` : ''}`, { direction: 'top' })
          .addTo(map);
      }
    });
    Object.keys(markers.stations).forEach(id => {
      if (!addedIds.has(Number(id))) { map.removeLayer(markers.stations[id]); delete markers.stations[id]; }
    });
  }, [stations, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const markers = markersRef.current;
    const addedIds = new Set();
    policeUpdates.filter(p => p.status === 'blocked').forEach(p => {
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      addedIds.add(p.id);
      if (!markers.policeUpdates[p.id]) {
        const circle = L.circle([lat, lng], { radius: parseFloat(p.impact_radius) || 500, color: '#dc2626', fillColor: '#fca5a5', fillOpacity: 0.2, weight: 2, dashArray: '8 4' }).addTo(map);
        const m = L.marker([lat, lng], { icon: makeIcon('🚧', '#dc2626', 32) })
          .bindTooltip(`<b>🚧 ROAD BLOCKED</b><br/>${p.road_name}<br/>Severity: ${p.severity}`, { direction: 'top' })
          .addTo(map);
        markers.policeUpdates[p.id] = { marker: m, circle };
      }
    });
    Object.keys(markers.policeUpdates).forEach(id => {
      if (!addedIds.has(Number(id))) {
        map.removeLayer(markers.policeUpdates[id].marker);
        map.removeLayer(markers.policeUpdates[id].circle);
        delete markers.policeUpdates[id];
      }
    });
  }, [policeUpdates, mapReady]);

  function stopAnimation() {
    if (routeTimerRef.current) { clearInterval(routeTimerRef.current); routeTimerRef.current = null; }
  }

  function clearRouteLayer() {
    stopAnimation();
    const map = mapRef.current;
    if (!map) return;
    if (routePolyRef.current)       { map.removeLayer(routePolyRef.current);       routePolyRef.current = null; }
    if (originalRoutePolyRef.current) { map.removeLayer(originalRoutePolyRef.current); originalRoutePolyRef.current = null; }
    if (coveredPolyRef.current)     { map.removeLayer(coveredPolyRef.current);     coveredPolyRef.current = null; }
    if (routeAmbRef.current)        { map.removeLayer(routeAmbRef.current);        routeAmbRef.current = null; }
    if (routeSrcMarker.current)     { map.removeLayer(routeSrcMarker.current);     routeSrcMarker.current = null; }
    if (routeDstMarker.current)     { map.removeLayer(routeDstMarker.current);     routeDstMarker.current = null; }
  }

  function drawOriginalRoute(coords) {
    if (!mapRef.current || !coords || coords.length < 2) return;
    const map = mapRef.current;
    originalRouteCoordsRef.current = coords;
    if (originalRoutePolyRef.current) map.removeLayer(originalRoutePolyRef.current);
    originalRoutePolyRef.current = L.polyline(coords, {
      color: '#94a3b8', weight: 4, opacity: 0.55, lineCap: 'round', lineJoin: 'round',
      dashArray: '8 5',
    }).addTo(map);
    originalRoutePolyRef.current.bindTooltip('Original (blocked) route', { sticky: true, direction: 'top' });
  }

  // ── Scan the route AHEAD for ALL incident zones (up to LOOK_AHEAD waypoints) ──
  function scanRouteAhead(fromStep, coords, incidentList) {
    if (!coords?.length || !incidentList?.length) return null;
    const LOOK_AHEAD = 150;
    const end = Math.min(fromStep + LOOK_AHEAD, coords.length - 1);
    const hitIncidents = new Set();

    for (let i = fromStep; i <= end; i++) {
      const [chkLat, chkLng] = coords[i];
      for (const inc of incidentList) {
        if (hitIncidents.has(inc.id)) continue;
        const iLat = parseFloat(inc.latitude);
        const iLng = parseFloat(inc.longitude);
        if (isNaN(iLat) || isNaN(iLng)) continue;
        const R = 6371;
        const dLat = ((iLat - chkLat) * Math.PI) / 180;
        const dLon = ((iLng - chkLng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos((chkLat * Math.PI) / 180) * Math.cos((iLat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (dist <= (parseFloat(inc.impact_radius) || 300) / 1000) {
          hitIncidents.add(inc.id);
        }
      }
    }

    if (hitIncidents.size === 0) return null;
    return { count: hitIncidents.size, currentPos: coords[fromStep] };
  }

  // ── Trigger a reroute from current position to destination ──
  // The backend receives the current position and recalculates, avoiding ALL
  // active incidents and blocked roads in a single optimised call.
  function doReroute(currentPos, incidentCount = 1) {
    if (reroutingRef.current || !routeDstRef.current) return;
    reroutingRef.current = true;
    const [curLat, curLng] = currentPos;
    const dst = routeDstRef.current;
    const plural = incidentCount > 1 ? `${incidentCount} incidents` : 'an incident';
    setRerouteMsg(`⚠️ Detected ${plural} on route ahead — recalculating…`);
    setRerouted(true);
    calculateRoute(curLat, curLng, dst.lat, dst.lng)
      .then(res => {
        const nr = res.data;
        if (nr?.geometry?.coordinates) {
          const nc = nr.geometry.coordinates.map(([lo, la]) => [la, lo]);
          const nd = nr.distance ? (nr.distance / 1000).toFixed(1) : '?';
          const nt = nr.duration ? Math.round(nr.duration / 60) : '?';
          const av = nr.avoided_count || 0;
          setRerouteMsg(`Route updated — ${av > 0 ? `${av} zone${av > 1 ? 's' : ''} bypassed` : 'alternative path selected'}`);
          setRouteInfo(prev => ({ ...prev, distKm: nd, durMin: nt, rerouted: true, avoided: av }));
          applyReroutedCoords(nc, nd, nt);
        }
      })
      .catch(err => console.error('[Reroute]', err))
      .finally(() => { reroutingRef.current = false; });
  }

  function startAnimation(coords, distKm, durationMin, isRerouted = false) {
    if (!mapRef.current) return;
    const map = mapRef.current;
    stopAnimation();
    routeCoordsRef.current = coords;
    routeStepRef.current   = 0;
    totalStepsRef.current  = coords.length - 1;

    if (routePolyRef.current)   map.removeLayer(routePolyRef.current);
    if (coveredPolyRef.current) map.removeLayer(coveredPolyRef.current);

    // Show orange-dashed path when already rerouted at dispatch time
    routePolyRef.current = L.polyline(coords, {
      color: isRerouted ? '#f97316' : '#3b82f6',
      weight: 5, opacity: 0.82, lineCap: 'round', lineJoin: 'round',
      ...(isRerouted ? { dashArray: '12 6' } : {}),
    }).addTo(map);
    coveredPolyRef.current = L.polyline([coords[0]], {
      color: '#ef4444', weight: 5, opacity: 0.9, lineCap: 'round',
    }).addTo(map);

    if (!routeAmbRef.current) {
      routeAmbRef.current = L.marker(coords[0], { icon: makeIcon('🚑', '#ef4444', 46), zIndexOffset: 2000 })
        .bindTooltip(`<b>🚑 ${isRerouted ? '⚠️ Alternate Route' : 'En Route'}</b><br/>${distKm} km · ~${durationMin} min`, { permanent: false, direction: 'top' })
        .addTo(map);
    } else {
      routeAmbRef.current.setLatLng(coords[0]);
    }

    map.fitBounds(routePolyRef.current.getBounds(), { padding: [60, 60] });
    setRouteStatus('moving');

    const totalSteps = coords.length - 1;
    const intervalMs = totalSteps > 0 ? Math.max(80, Math.min(600, (durationMin * 60 * 1000) / totalSteps / 6)) : 300;

    routeTimerRef.current = setInterval(() => {
      const step = routeStepRef.current;
      if (step >= routeCoordsRef.current.length - 1) {
        clearInterval(routeTimerRef.current);
        routeTimerRef.current = null;
        tripCtx.updateProgress(100);
        setRouteStatus('arrived');
        return;
      }
      const next = step + 1;
      routeStepRef.current = next;
      const currentCoords = routeCoordsRef.current;
      routeAmbRef.current?.setLatLng(currentCoords[next]);
      coveredPolyRef.current?.setLatLngs(currentCoords.slice(0, next + 1));
      const pct = Math.min(99, Math.round((next / totalStepsRef.current) * 100));
      tripCtx.updateProgress(pct);

      // Persist route state every 15 steps so navigation away & back can resume
      if (next % 15 === 0) {
        tripCtx.saveRouteState({
          coords: routeCoordsRef.current, step: next,
          originalCoords: originalRouteCoordsRef.current,
          src: routeSrcRef.current, dst: routeDstRef.current,
          routeInfo: routeInfoRef.current,
          rerouteMsg: rerouteMsgRef.current, rerouted: reroutedRef.current,
        });
      }

      // ── Look-ahead geofence: scan next 150 waypoints for incident zones ──
      if (next % 6 === 0 && !reroutingRef.current && routeDstRef.current) {
        const hit = scanRouteAhead(next, routeCoordsRef.current, incidentsRef.current);
        if (hit) doReroute(hit.currentPos, hit.count);
      }
    }, intervalMs);
  }

  // Reroute the CURRENTLY ANIMATED ambulance with a new route from the server
  function applyReroutedCoords(newCoords, newDistKm, newDurMin) {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Get current animated position
    const currentStep = routeStepRef.current;
    const currentCoords = routeCoordsRef.current;
    const currentPos = currentCoords[currentStep] || newCoords[0];

    stopAnimation();

    // Find the closest point in the new route to currentPos
    let closestIdx = 0;
    let minDist = Infinity;
    newCoords.forEach(([lat, lng], idx) => {
      const d = Math.abs(lat - currentPos[0]) + Math.abs(lng - currentPos[1]);
      if (d < minDist) { minDist = d; closestIdx = idx; }
    });

    const remainingCoords = newCoords.slice(closestIdx);
    if (remainingCoords.length < 2) return;

    // ── Save OLD (blocked) coords BEFORE overwriting refs ──
    const oldRemainingCoords = currentCoords.slice(currentStep);
    if (routePolyRef.current) {
      map.removeLayer(routePolyRef.current);
      routePolyRef.current = null;
    }
    if (coveredPolyRef.current) { map.removeLayer(coveredPolyRef.current); coveredPolyRef.current = null; }
    // Draw the original blocked path in gray-dashed below the new route
    drawOriginalRoute(oldRemainingCoords);

    // Combine covered coordinates with the new rerouted coordinates to represent the FULL trip
    const coveredCoords = currentCoords.slice(0, currentStep);
    const newFullCoords = [...coveredCoords, ...remainingCoords];

    routeCoordsRef.current = newFullCoords;
    routeStepRef.current   = currentStep;
    totalStepsRef.current  = newFullCoords.length - 1;

    routePolyRef.current = L.polyline(newFullCoords, {
      color: '#f97316', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round',
      dashArray: '12 6',
    }).addTo(map);
    coveredPolyRef.current = L.polyline(newFullCoords.slice(0, currentStep + 1), {
      color: '#ef4444', weight: 5, opacity: 0.9, lineCap: 'round',
    }).addTo(map);

    routeAmbRef.current?.setLatLng(newFullCoords[currentStep]);
    map.fitBounds(routePolyRef.current.getBounds(), { padding: [60, 60] });

    const intervalMs = Math.max(80, Math.min(600, (newDurMin * 60 * 1000) / Math.max(1, remainingCoords.length - 1) / 6));
    const rerouteTotal = newFullCoords.length - 1;
    routeTimerRef.current = setInterval(() => {
      const step = routeStepRef.current;
      if (step >= routeCoordsRef.current.length - 1) {
        clearInterval(routeTimerRef.current);
        routeTimerRef.current = null;
        tripCtx.updateProgress(100);
        setRouteStatus('arrived');
        return;
      }
      const next = step + 1;
      routeStepRef.current = next;
      const liveCoords = routeCoordsRef.current;
      routeAmbRef.current?.setLatLng(liveCoords[next]);
      coveredPolyRef.current?.setLatLngs(liveCoords.slice(0, next + 1));
      const pct = Math.min(99, Math.round((next / rerouteTotal) * 100));
      tripCtx.updateProgress(pct);

      // Persist state every 15 steps
      if (next % 15 === 0) {
        tripCtx.saveRouteState({
          coords: liveCoords, step: next,
          originalCoords: originalRouteCoordsRef.current,
          src: routeSrcRef.current, dst: routeDstRef.current,
          routeInfo: routeInfoRef.current,
          rerouteMsg: rerouteMsgRef.current, rerouted: reroutedRef.current,
        });
      }

      // ── Look-ahead geofence on rerouted path too ──
      if (next % 6 === 0 && !reroutingRef.current && routeDstRef.current) {
        const hit = scanRouteAhead(next, liveCoords, incidentsRef.current);
        if (hit) doReroute(hit.currentPos, hit.count);
      }
    }, intervalMs);
  }

  const handleCalculateRoute = useCallback(async (src, dst, ambId, isReroute = false) => {
    if (!src || !dst) return;
    if (!mapRef.current) return;
    setRouteStatus('calculating');
    if (!isReroute) setRerouted(false);

    try {
      let data;

      if (ambId && !isReroute) {
        const ambName = ambulances.find(a => String(a.id) === String(ambId))?.driver_name || `Unit #${ambId}`;
        const res = await dispatchAmbulance(ambId, {
          destination: dst.label?.split(',')[0] || 'Destination',
          dest_lat: dst.lat,
          dest_lng: dst.lng,
          source_name: src.label?.split(',')[0] || 'Source',
          src_lat: src.lat,
          src_lng: src.lng,
        });
        data = res.data?.route;
        // Start global trip tracking
        tripCtx.startTrip({
          ambId: String(ambId),
          ambName,
          srcName: src.label?.split(',')[0] || 'Source',
          dstName: dst.label?.split(',')[0] || 'Destination',
        });
        fetchAll();
      } else {
        const res = await calculateRoute(src.lat, src.lng, dst.lat, dst.lng);
        data = res.data;
      }

      if (!data?.geometry?.coordinates) throw new Error('No route returned. Try different locations.');

      const coords  = data.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const distKm  = data.distance ? (data.distance / 1000).toFixed(1) : '?';
      const durMin  = data.duration ? Math.round(data.duration / 60) : '?';

      setRouteInfo({ distKm, durMin, coords, rerouted: data.rerouted, avoided: data.avoided_count || 0 });

      const map = mapRef.current;
      if (routeSrcMarker.current) map.removeLayer(routeSrcMarker.current);
      if (routeDstMarker.current) map.removeLayer(routeDstMarker.current);
      routeSrcMarker.current = L.marker([src.lat, src.lng], { icon: makeIcon('📍', '#22c55e', 34) })
        .bindTooltip(`<b>Start</b><br/>${src.label?.split(',')[0] || 'Source'}`, { direction: 'top' })
        .addTo(map);
      routeDstMarker.current = L.marker([dst.lat, dst.lng], { icon: makeIcon('🏁', '#8b5cf6', 34) })
        .bindTooltip(`<b>Destination</b><br/>${dst.label?.split(',')[0] || 'Destination'}`, { direction: 'top' })
        .addTo(map);

      const isRerouted = data.rerouted && (data.avoided_count || 0) > 0;
      if (isRerouted) {
        setRerouted(true);
        setRerouteMsg(`⚠️ Alternate route — bypasses ${data.avoided_count} incident zone${data.avoided_count > 1 ? 's' : ''}`);
        // Fetch and show the original (blocked) route in gray alongside the bypass
        try {
          const naiveRes = await getNaiveRoute(src.lat, src.lng, dst.lat, dst.lng);
          if (naiveRes?.data?.geometry?.coordinates) {
            const origCoords = naiveRes.data.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            drawOriginalRoute(origCoords);
          }
        } catch { /* non-critical, ignore */ }
      } else if (data.rerouted && data.conflicts?.length > 0) {
        setRerouted(true);
        setRerouteMsg(`⚠️ Route passes through incident zone — no safe bypass found`);
      }

      startAnimation(coords, distKm, durMin, isRerouted);

      // Save initial route state for navigation persistence
      if (ambId) {
        tripCtx.saveRouteState({
          coords, step: 0,
          originalCoords: isRerouted ? originalRouteCoordsRef.current : null,
          src, dst,
          routeInfo: { distKm, durMin, rerouted: data.rerouted, avoided: data.avoided_count || 0 },
          rerouteMsg: isRerouted ? `⚠️ Alternate route — bypasses ${data.avoided_count} incident zone${data.avoided_count > 1 ? 's' : ''}` : '',
          rerouted: isRerouted,
        });
      }
    } catch (err) {
      console.error('[Route]', err);
      setRouteStatus('error_' + (err.message || 'Failed'));
    }
  }, [ambulances]);

  // Socket handlers
  useEffect(() => {
    const socket = socketService.connect();

    const handlePoliceUpdate = (data) => {
      const update = data.update || data;
      const isBlocked = update.status === 'blocked';
      setFeedItems(prev => [{
        id: ++feedCounterRef.current,
        badge: isBlocked ? 'BLOCKED' : 'ROAD OPEN',
        color: isBlocked ? 'red' : 'green',
        msg: `${update.road_name || 'Road'} — ${update.status?.toUpperCase()} (${update.severity || ''})`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }, ...prev.slice(0, 19)]);
      fetchAll();
      // If a route is active and there's a road block, trigger local reroute preview
      if (isBlocked && routeSrcRef.current && routeDstRef.current &&
          routeStatusRef.current !== 'idle' && routeStatusRef.current !== 'arrived') {
        setRerouteMsg(`Road block on ${update.road_name || 'a road'} — recalculating…`);
        setRerouted(true);
      }
    };

    const handleRouteUpdate = (data) => {
      const ambId = String(data.ambulance_id);
      const avoided = data.avoided_count || 0;
      const isCurrent = ambId === selectedAmbIdRef.current;
      const msg = `Ambulance #${ambId} rerouted${avoided ? ` (avoided ${avoided} zone${avoided > 1 ? 's' : ''})` : ''}`;

      setFeedItems(prev => [{
        id: ++feedCounterRef.current, badge: 'REROUTED', color: 'orange', msg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }, ...prev.slice(0, 19)]);

      // If this is our currently dispatched ambulance and it's moving, update the animation
      if (isCurrent && data.route && routeStatusRef.current === 'moving') {
        const currentPos = routeCoordsRef.current[routeStepRef.current];
        if (currentPos) {
          doReroute(currentPos, avoided);
        }
      }
      fetchAll();
    };

    const handleStatusChange = (data) => {
      setFeedItems(prev => [{
        id: ++feedCounterRef.current,
        badge: data.status === 'ACTIVE' ? 'DISPATCHED' : data.status === 'IDLE' ? 'ARRIVED' : data.status,
        color: data.status === 'ACTIVE' ? 'green' : data.status === 'IDLE' ? 'gray' : 'blue',
        msg: `Ambulance #${data.ambulance_id} → ${data.status}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }, ...prev.slice(0, 19)]);
      fetchAll();
    };

    const handleIncidentAdded = (data) => {
      const inc = data.incident || data;
      setFeedItems(prev => [{
        id: ++feedCounterRef.current,
        badge: 'INCIDENT',
        color: inc.severity === 'high' ? 'red' : 'orange',
        msg: `${inc.type?.toUpperCase()} reported — ${inc.severity} severity`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }, ...prev.slice(0, 19)]);
      fetchAll();
    };

    const handleIncidentResolved = (data) => {
      setFeedItems(prev => [{
        id: ++feedCounterRef.current,
        badge: 'RESOLVED',
        color: 'green',
        msg: `Incident #${data.incident_id} resolved — routes recalculating`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }, ...prev.slice(0, 19)]);
      fetchAll();
    };

    const handleIncidentDeleted = (data) => {
      setFeedItems(prev => [{
        id: ++feedCounterRef.current,
        badge: 'REMOVED',
        color: 'gray',
        msg: `Incident #${data.incident_id} removed — routes recalculating`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }, ...prev.slice(0, 19)]);
      fetchAll();
    };

    socket.on('police_update',             handlePoliceUpdate);
    socket.on('police_update_cleared',     handlePoliceUpdate);
    socket.on('route_updated',             handleRouteUpdate);
    socket.on('incident_added',            handleIncidentAdded);
    socket.on('incident_resolved',         handleIncidentResolved);
    socket.on('incident_deleted',          handleIncidentDeleted);
    socket.on('ambulance_status_changed',  handleStatusChange);
    socket.on('ambulance_location_update', () => fetchAll());
    socket.on('station_added',             () => fetchAll());
    socket.emit('subscribe_all');

    return () => {
      socket.off('police_update',            handlePoliceUpdate);
      socket.off('police_update_cleared',    handlePoliceUpdate);
      socket.off('route_updated',            handleRouteUpdate);
      socket.off('incident_added',           handleIncidentAdded);
      socket.off('incident_resolved',        handleIncidentResolved);
      socket.off('incident_deleted',         handleIncidentDeleted);
      socket.off('ambulance_status_changed', handleStatusChange);
      socket.off('ambulance_location_update');
      socket.off('station_added');
    };
  }, []);

  function handleReset() {
    clearRouteLayer();
    setRouteSrc(null);
    setRouteDst(null);
    setSelectedAmbId('');
    setSelectedAmbName('');
    setRouteStatus('idle');
    setRouteInfo(null);
    setRerouted(false);
    setRerouteMsg('');
    tripCtx.clearTrip();
  }

  const activeAmbs   = ambulances.filter(a => a.status !== 'IDLE');
  const blockedRoads = policeUpdates.filter(p => p.status === 'blocked');

  const routeStatusLabel = () => {
    if (routeStatus === 'calculating') return { text: 'Calculating route…', color: 'text-blue-600' };
    if (routeStatus === 'rerouting')   return { text: '🔄 Rerouting around road blocks…', color: 'text-orange-600' };
    if (routeStatus === 'moving')      return {
      text: `🚑 En Route — ${routeInfo?.distKm} km · ~${routeInfo?.durMin} min${routeInfo?.rerouted ? ' (alternate route)' : ''}`,
      color: 'text-emerald-600'
    };
    if (routeStatus === 'arrived')     return { text: '✅ Arrived at destination', color: 'text-emerald-700' };
    if (routeStatus?.startsWith('error_')) return { text: routeStatus.replace('error_', '⚠️ '), color: 'text-red-500' };
    return null;
  };

  const statusInfo = routeStatusLabel();

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-100 font-inter">

      {/* ── Sidebar ── */}
      <aside className="w-[310px] flex-shrink-0 flex flex-col bg-white border-r border-gray-200 shadow-sm overflow-y-auto overflow-x-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-gray-50">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 text-[11px] font-inter font-medium mb-2 transition-colors group"
          >
            <ChevronLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-poppins font-bold text-gray-900 text-[14px] leading-none">Live Map</h1>
              <p className="text-[10px] text-gray-400 font-inter mt-0.5">Emergency Routing — Bengaluru</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchAll} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors" title="Refresh">
                <RefreshCw size={12} />
              </button>
              <div className="flex items-center gap-1.5 bg-red-100 border border-red-200 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-bold text-red-600 tracking-widest font-inter">LIVE</span>
              </div>
            </div>
          </div>
          {/* Report Incident shortcut */}
          <button
            onClick={() => navigate('/police')}
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-inter font-semibold text-[11px] transition-colors shadow-sm"
          >
            <Plus size={12} />
            Report Incident / Road Block
          </button>
        </div>

        {/* Route Planner */}
        <div className="px-4 py-3 border-b border-blue-100 bg-blue-50/60 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Route Planner</SectionLabel>
            {routeStatus !== 'idle' && (
              <button onClick={handleReset} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 font-inter -mt-2">
                <RotateCcw size={10} /> Reset
              </button>
            )}
          </div>

          {/* Ambulance selector */}
          <div className="mb-2">
            <p className="text-[10px] text-gray-500 font-inter font-medium mb-1 flex items-center gap-1">
              <Truck size={10} /> Assign Ambulance (optional)
            </p>
            <select
              value={selectedAmbId}
              onChange={e => {
                setSelectedAmbId(e.target.value);
                const found = ambulances.find(a => String(a.id) === e.target.value);
                setSelectedAmbName(found?.driver_name || '');
              }}
              className="w-full text-[12px] font-inter bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:border-blue-400"
            >
              <option value="">— No assignment (preview only) —</option>
              {ambulances.map(a => (
                <option key={a.id} value={a.id} disabled={a.status === 'ACTIVE'}>
                  #{a.id} {a.driver_name} ({a.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <LocationSearch label="From (source)" value={routeSrc} onChange={setRouteSrc} placeholder="Search start location…" />
            <div>
              <p className="text-[10px] text-gray-500 font-inter font-medium mb-1 flex items-center gap-1">
                <Building2 size={10} /> To (destination hospital)
              </p>
              <select
                value={routeDst ? `${routeDst.lat},${routeDst.lng}` : ''}
                onChange={e => {
                  if (!e.target.value) { setRouteDst(null); return; }
                  const hosp = hospitals.find(h => `${parseFloat(h.latitude)},${parseFloat(h.longitude)}` === e.target.value);
                  if (hosp) setRouteDst({ lat: parseFloat(hosp.latitude), lng: parseFloat(hosp.longitude), label: hosp.name });
                }}
                className="w-full text-[12px] font-inter bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:border-blue-400"
              >
                <option value="">— Select destination hospital —</option>
                {hospitals.map(h => (
                  <option key={h.id} value={`${parseFloat(h.latitude)},${parseFloat(h.longitude)}`}>
                    🏥 {h.name}
                  </option>
                ))}
              </select>
              {routeDst && (
                <p className="text-[10px] text-emerald-600 font-inter mt-0.5 truncate">
                  📍 {routeDst.label}
                </p>
              )}
            </div>
          </div>

          {statusInfo && (
            <p className={`text-[11px] font-inter font-medium mt-2 ${statusInfo.color}`}>{statusInfo.text}</p>
          )}

          {rerouted && (
            <div className="mt-1.5 flex items-start gap-1.5 px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle size={11} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-orange-700 font-inter font-semibold leading-snug">
                {rerouteMsg || 'Route recalculated — road block detected'}
              </p>
            </div>
          )}

          {routeInfo && routeStatus === 'arrived' && (
            <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-[11px] text-emerald-700 font-inter font-semibold">✅ Ambulance reached destination — status set IDLE</p>
            </div>
          )}

          <button
            onClick={() => handleCalculateRoute(routeSrc, routeDst, selectedAmbId || null)}
            disabled={!routeSrc || !routeDst || routeStatus === 'calculating' || routeStatus === 'rerouting'}
            className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-inter font-semibold text-[12px] transition-colors"
          >
            {(routeStatus === 'calculating' || routeStatus === 'rerouting')
              ? <><Loader2 size={12} className="animate-spin" />Calculating…</>
              : <><Navigation size={12} />{selectedAmbId ? 'Calculate & Dispatch' : 'Calculate Route'}</>}
          </button>
        </div>

        {/* Overview stats */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <SectionLabel>Overview</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Ambulances', value: ambulances.length, color: 'text-gray-900', bg: 'bg-gray-50' },
              { label: 'En Route',   value: activeAmbs.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Blocked',    value: blockedRoads.length, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center border border-gray-100`}>
                <p className={`font-poppins font-bold text-lg ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-400 font-inter">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ambulances list */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <SectionLabel>Ambulances ({ambulances.length})</SectionLabel>
          {loading ? (
            <p className="text-[12px] text-gray-400 font-inter py-2">Loading…</p>
          ) : ambulances.length === 0 ? (
            <p className="text-[12px] text-gray-400 font-inter py-2">No ambulances registered.</p>
          ) : ambulances.map(amb => (
            <div key={amb.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${amb.status === 'ACTIVE' ? 'bg-red-100 border border-red-200' : 'bg-gray-100 border border-gray-200'}`}>🚑</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-inter font-semibold text-[12px] text-gray-900 truncate">{amb.driver_name}</span>
                  <StatusPill status={amb.status} />
                </div>
                {amb.destination && <p className="text-[10px] text-blue-500 font-inter truncate">→ {amb.destination}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Police Stations */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <SectionLabel>Traffic Police Stations ({stations.length})</SectionLabel>
          {stations.length === 0 ? (
            <p className="text-[12px] text-gray-400 font-inter py-1">No stations. Add via Admin → Facilities.</p>
          ) : stations.map(s => (
            <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm flex-shrink-0">🚔</span>
              <div className="min-w-0">
                <p className="text-[12px] font-inter font-semibold text-gray-900 truncate">{s.name}</p>
                {s.zone && <p className="text-[10px] text-gray-400 font-inter">{s.zone}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Road Blocks */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <SectionLabel>Road Blocks ({blockedRoads.length})</SectionLabel>
          {blockedRoads.length === 0 ? (
            <p className="text-[12px] text-gray-400 font-inter py-1">All roads clear.</p>
          ) : blockedRoads.map(p => (
            <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm flex-shrink-0">🚧</span>
              <div className="min-w-0">
                <p className="text-[12px] font-inter font-semibold text-gray-900 truncate">{p.road_name}</p>
                <p className="text-[10px] text-red-500 font-inter">{p.severity} severity · {p.impact_radius}m radius</p>
              </div>
            </div>
          ))}
        </div>

        {/* Active Incidents */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <SectionLabel>Active Incidents ({incidents.length})</SectionLabel>
          {incidents.length === 0 ? (
            <p className="text-[12px] text-gray-400 font-inter py-1">No active incidents.</p>
          ) : incidents.map(inc => (
            <div key={inc.id} className="flex items-start gap-2 py-1.5 px-1.5 hover:bg-gray-50 rounded border-b border-gray-50 last:border-0 group">
              <span className="text-sm flex-shrink-0 mt-0.5">⚠️</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-inter font-semibold text-gray-900 capitalize truncate">{inc.type}</p>
                <p className={`text-[10px] font-inter ${inc.severity === 'high' ? 'text-red-500' : 'text-orange-500'}`}>{inc.severity} severity</p>
              </div>
              <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={async () => {
                    try {
                      await resolveIncident(inc.id);
                      fetchAll();
                    } catch (err) {
                      console.error('Error resolving incident:', err);
                    }
                  }}
                  title="Mark as resolved"
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={async () => {
                    setDeletingIncidentId(inc.id);
                    try {
                      await deleteIncident(inc.id);
                      fetchAll();
                    } catch (err) {
                      console.error('Error deleting incident:', err);
                    } finally {
                      setDeletingIncidentId(null);
                    }
                  }}
                  disabled={deletingIncidentId === inc.id}
                  title="Delete incident"
                  className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Live Activity Feed */}
        <div className="px-4 py-3 flex-1">
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Live Activity</SectionLabel>
            <div className="flex items-center gap-1 -mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] text-red-500 font-bold tracking-widest font-inter">LIVE</span>
            </div>
          </div>
          {feedItems.length === 0 ? (
            <p className="text-[11px] text-gray-400 font-inter">Waiting for real-time events…</p>
          ) : feedItems.map(evt => (
            <div key={evt.id} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
              <div className="pt-0.5 flex-shrink-0">
                <Badge color={evt.color} label={evt.badge} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-gray-700 font-inter leading-snug">{evt.msg}</p>
                <p className="text-[9px] text-gray-400 font-inter mt-0.5">{evt.time}</p>
              </div>
            </div>
          ))}
        </div>

        {lastUpdate && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <p className="text-[10px] text-gray-400 font-inter">
              Last sync: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        )}
      </aside>

      {/* ── Map Area ── */}
      <main className="flex-1 relative overflow-hidden">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm shadow-md border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap max-w-[520px]">
            <span className="text-[10px] font-semibold text-gray-400 font-inter uppercase tracking-wider">Legend</span>
            <span className="w-px h-3 bg-gray-200" />
            {[
              ['🚑','Ambulance'], ['🚔','Police Stn'], ['🏥','Hospital'],
              ['⚠️','Incident'], ['🚧','Blocked'], ['📍','Start'], ['🏁','End'],
            ].map(([icon, label]) => (
              <span key={label} className="text-[11px] text-gray-600 font-inter flex items-center gap-0.5">
                <span>{icon}</span><span className="hidden sm:inline">{label}</span>
              </span>
            ))}
          </div>
        </div>

        {!mapReady && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 font-inter text-sm">Loading map…</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
