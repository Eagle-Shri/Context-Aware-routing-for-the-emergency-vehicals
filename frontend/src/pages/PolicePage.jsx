import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ChevronLeft, Plus, Filter, MapPin, Radio,
  Clock, X, Shield, UserPlus, Check, Trash2, Phone, Activity, Navigation
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { SelectField } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';
import LocationSearch from '../components/LocationSearch';
import {
  addIncident, getIncidents, resolveIncident,
  createPoliceUpdate, getPoliceUpdates, clearPoliceUpdate,
  getOfficers, createOfficer, deleteOfficer,
  getAmbulances,
} from '../services/api';

const INCIDENT_TYPES = [
  { value: 'traffic',      label: 'Traffic Jam'        },
  { value: 'accident',     label: 'Accident'           },
  { value: 'roadblock',    label: 'Road Closure'       },
  { value: 'signal',       label: 'Signal Failure'     },
  { value: 'vip',          label: 'VIP Movement'       },
  { value: 'waterlogging', label: 'Waterlogging'       },
  { value: 'breakdown',    label: 'Vehicle Breakdown'  },
  { value: 'rally',        label: 'Rally / Protest'    },
];

const ROAD_STATUS = [
  { value: 'blocked', label: 'Blocked' },
  { value: 'open',    label: 'Open'    },
];

const SEVERITY_OPTIONS = [
  { value: 'low',    label: 'Low'    },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High'   },
];

const RANK_OPTIONS = [
  { value: 'Traffic Constable',       label: 'Traffic Constable'        },
  { value: 'Traffic Head Constable',  label: 'Traffic Head Constable'   },
  { value: 'Traffic ASI',             label: 'Traffic ASI'              },
  { value: 'Traffic Sub-Inspector',   label: 'Traffic Sub-Inspector'    },
  { value: 'Traffic Inspector',       label: 'Traffic Inspector'        },
  { value: 'ACP Traffic',             label: 'ACP Traffic'              },
  { value: 'DCP Traffic',             label: 'DCP Traffic'              },
];

function Tab({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-inter font-semibold border-b-2 transition-colors ${
        active
          ? 'border-amber-500 text-amber-700 bg-amber-50/60'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
      )}
    </button>
  );
}

function SeverityBar({ severity }) {
  const numericSev = typeof severity === 'string'
    ? severity === 'high' ? 8 : severity === 'medium' ? 5 : 2
    : severity;
  const color = numericSev >= 8 ? 'bg-red-500' : numericSev >= 5 ? 'bg-orange-500' : 'bg-yellow-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${numericSev * 10}%` }} />
      </div>
      <span className="text-[12px] font-semibold font-inter text-gray-700 w-12">{severity}</span>
    </div>
  );
}

function IncidentCard({ incident, onResolve }) {
  const [resolving, setResolving] = React.useState(false);
  const sev = incident.severity;
  const isHigh = sev === 'high' || Number(sev) >= 8;
  const isMed  = sev === 'medium' || (Number(sev) >= 5 && !isHigh);
  const sevColor = isHigh
    ? 'bg-red-50 border-red-200 text-red-700'
    : isMed
    ? 'bg-orange-50 border-orange-200 text-orange-700'
    : 'bg-yellow-50 border-yellow-200 text-yellow-700';
  const isResolved = incident.resolved === true || incident.status === 'Resolved';
  const statusColor = !isResolved
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-gray-100 text-gray-500 border-gray-200';
  const typeLabel = INCIDENT_TYPES.find(t => t.value === incident.type)?.label
    || (incident.type ? incident.type.charAt(0).toUpperCase() + incident.type.slice(1) : 'Unknown');
  const radius = incident.impact_radius || incident.radius || 0;
  const createdAt = incident.created_at
    ? new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  async function handleResolve() {
    setResolving(true);
    try {
      await resolveIncident(incident.id);
      onResolve?.();
    } catch (err) {
      console.error('Resolve failed:', err);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className={`p-4 rounded-xl border ${isResolved ? 'border-gray-100 bg-gray-50/50 opacity-60' : 'border-gray-100 bg-white'} shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sevColor}`}>{String(sev).toUpperCase()}</div>
          <span className="font-poppins font-semibold text-gray-900 text-[14px]">{typeLabel}</span>
          <span className="text-gray-400 font-inter text-[11px]">#{incident.id}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor}`}>
          {isResolved ? 'Resolved' : 'Active'}
        </span>
      </div>
      <SeverityBar severity={sev} />
      <div className="flex items-center gap-4 mt-2.5 text-[11px] text-gray-400 font-inter">
        <span className="flex items-center gap-1"><MapPin size={11} />{parseFloat(incident.latitude)?.toFixed(4)}, {parseFloat(incident.longitude)?.toFixed(4)}</span>
        {radius > 0 && <span className="flex items-center gap-1"><Radio size={11} />{radius}m</span>}
        {createdAt && <span className="flex items-center gap-1 ml-auto"><Clock size={11} />{createdAt}</span>}
      </div>
      {!isResolved && (
        <button
          onClick={handleResolve}
          disabled={resolving}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-inter font-semibold text-[12px] transition-colors disabled:opacity-50"
        >
          {resolving
            ? <><span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />Resolving…</>
            : <><Check size={12} />Mark Resolved — Remove from Map</>}
        </button>
      )}
    </div>
  );
}

function ActiveRoutesPanel({ ambulances }) {
  const active = ambulances.filter(a => a.status === 'ACTIVE' && a.destination);
  if (!active.length) return null;
  return (
    <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Navigation size={13} className="text-amber-600" />
        <p className="text-[11px] font-inter font-bold text-amber-800 uppercase tracking-wide">Active Ambulance Routes — Pick Incident Location from Route Below</p>
      </div>
      <div className="flex flex-col gap-2">
        {active.map(a => (
          <div key={a.id} className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 border border-amber-100">
            <span className="text-base">🚑</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-inter font-semibold text-gray-900 truncate">
                Unit #{a.id} · {a.driver_name}
              </p>
              <p className="text-[11px] text-amber-700 font-inter truncate">
                {a.source_name || 'Source'} → <span className="font-semibold">{a.destination}</span>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-gray-400 font-inter">{parseFloat(a.destination_lat)?.toFixed(3)}, {parseFloat(a.destination_lng)?.toFixed(3)}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-amber-600 font-inter mt-2">Search a location near the route above to report an incident there — ambulance will auto-reroute.</p>
    </div>
  );
}

function IncidentsTab({ ambulances }) {
  const [type, setType]         = useState('');
  const [severity, setSeverity] = useState(5);
  const [location, setLocation] = useState(null);
  const [radius, setRadius]     = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus]     = useState('idle');
  const [msg, setMsg]           = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter]     = useState('All');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]   = useState(true);

  async function fetchIncidents() {
    try { const res = await getIncidents(); setIncidents(res.data || []); }
    catch { setIncidents([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchIncidents(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!location) { setStatus('error'); setMsg('Please select a location.'); return; }
    setStatus('loading');
    try {
      await addIncident({ type, severity: Number(severity), latitude: location.lat, longitude: location.lng, radius: Number(radius) || 300, description });
      setStatus('success'); setMsg('Incident reported. Any ambulance on this route will auto-reroute.');
      setType(''); setSeverity(5); setLocation(null); setRadius(''); setDescription('');
      setShowForm(false); fetchIncidents();
    } catch (err) {
      setStatus('error'); setMsg(err instanceof Error ? err.message : 'Failed to report incident.');
    }
  }

  const filtered = filter === 'All' ? incidents : filter === 'Active' ? incidents.filter(i => !i.resolved) : incidents.filter(i => i.resolved);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-inter font-semibold text-sm transition-colors"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'Report Traffic Incident'}
        </button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-poppins font-semibold text-gray-900 text-base mb-1">Report Traffic Incident</h2>
          <p className="text-gray-400 font-inter text-sm mb-5">Select location on the active route — ambulance routes will auto-update</p>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <ActiveRoutesPanel ambulances={ambulances} />
            </div>
            <div className="sm:col-span-2">
              <SelectField label="Incident Type" value={type} onChange={setType} options={INCIDENT_TYPES} required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Severity (1–10): {severity}</label>
              <input type="range" min="1" max="10" value={severity} onChange={e => setSeverity(Number(e.target.value))} className="w-full accent-amber-500" />
              <div className="flex justify-between text-[10px] text-gray-400 font-inter mt-1"><span>Minor</span><span>Moderate</span><span>Critical</span></div>
            </div>
            <div className="sm:col-span-2">
              <LocationSearch label="Incident Location (search the road/area)" value={location} onChange={setLocation} placeholder="e.g. Silk Board Junction, Bengaluru" required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Impact Radius (meters)</label>
              <input type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="300" min="50" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Description (optional)</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description…" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={status === 'loading'} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-inter font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                {status === 'loading' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Reporting…</> : <><AlertTriangle size={14} />Submit &amp; Trigger Reroute</>}
              </button>
            </div>
            <div className="sm:col-span-2"><StatusBadge status={status} message={msg} /></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-poppins font-semibold text-gray-900 text-base">Traffic Incident Log</h2>
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-gray-400" />
            {['All','Active','Resolved'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-lg text-[11px] font-inter font-semibold transition-colors ${filter === f ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {loading ? <div className="text-center py-8 text-gray-400 font-inter text-sm">Loading…</div>
            : filtered.length === 0 ? <div className="text-center py-8 text-gray-400 font-inter text-sm">No incidents found.</div>
            : filtered.map(inc => <IncidentCard key={inc.id} incident={inc} onResolve={fetchIncidents} />)}
        </div>
      </div>
    </div>
  );
}

function TrafficUpdatesTab() {
  const [roadName, setRoadName]     = useState('');
  const [roadStatus, setRoadStatus] = useState('');
  const [severity, setSeverity]     = useState('');
  const [location, setLocation]     = useState(null);
  const [radius, setRadius]         = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus]         = useState('idle');
  const [msg, setMsg]               = useState('');
  const [updates, setUpdates]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [clearingId, setClearingId] = useState(null);

  async function fetchUpdates() {
    try { const res = await getPoliceUpdates(); setUpdates(res.data || []); }
    catch { setUpdates([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchUpdates(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!location) { setStatus('error'); setMsg('Please select a location.'); return; }
    setStatus('loading');
    try {
      await createPoliceUpdate({ road_name: roadName, status: roadStatus, severity, latitude: location.lat, longitude: location.lng, impact_radius: Number(radius) || 500, description });
      setStatus('success'); setMsg(`Traffic update for "${roadName}" submitted. Ambulances will reroute if affected.`);
      setRoadName(''); setRoadStatus(''); setSeverity(''); setLocation(null); setRadius(''); setDescription('');
      fetchUpdates();
    } catch (err) {
      setStatus('error'); setMsg(err instanceof Error ? err.message : 'Failed to submit update.');
    }
  }

  async function handleClear(id) {
    setClearingId(id);
    try { await clearPoliceUpdate(id); fetchUpdates(); }
    catch {} finally { setClearingId(null); }
  }

  const STATUS_COLORS = { blocked: 'bg-red-50 text-red-700 border-red-200', open: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-amber-600" />
            <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Report Traffic Update</h2>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Road / Junction Name *</label>
              <input type="text" value={roadName} onChange={e => setRoadName(e.target.value)} placeholder="e.g. Silk Board Junction" required className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
            </div>
            <SelectField label="Traffic Status" value={roadStatus} onChange={setRoadStatus} options={ROAD_STATUS} required />
            <SelectField label="Severity"       value={severity}   onChange={setSeverity}   options={SEVERITY_OPTIONS} required />
            <LocationSearch label="Road Location" value={location} onChange={setLocation} placeholder="Search road location in Bengaluru" required />
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Impact Radius (m)</label>
              <input type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="500" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Description (opt.)</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. VIP convoy, waterlogging, accident…" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
            </div>
            <button type="submit" disabled={status === 'loading'} className="mt-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-inter font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              {status === 'loading' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</> : <><Check size={14} />Submit Traffic Update</>}
            </button>
            <StatusBadge status={status} message={msg} />
          </form>
        </div>
      </div>
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Traffic Updates Log</h2>
            <span className="text-[11px] text-gray-400 font-inter">{updates.length} total</span>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">Loading…</div>
              : updates.length === 0 ? <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">No traffic updates yet.</div>
              : updates.map(u => (
              <div key={u.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-poppins font-bold text-sm flex-shrink-0">
                  {(u.road_name || 'R').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-inter font-semibold text-[13px] text-gray-900">{u.road_name}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[u.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {u.status?.charAt(0).toUpperCase() + u.status?.slice(1)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-inter truncate">Severity: {u.severity} · {u.impact_radius}m{u.description ? ` · ${u.description}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <MapPin size={10} className="text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-600 font-inter">{parseFloat(u.latitude)?.toFixed(3)}, {parseFloat(u.longitude)?.toFixed(3)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-inter mt-0.5">#{u.id}</p>
                  </div>
                  {u.status === 'blocked' && (
                    <button onClick={() => handleClear(u.id)} disabled={clearingId === u.id} title="Mark as Open" className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 transition-colors disabled:opacity-50">
                      {clearingId === u.id ? <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Check size={12} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OfficersTab() {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [badge, setBadge]         = useState('');
  const [rank, setRank]           = useState('Traffic Constable');
  const [stationName, setStationName] = useState('');
  const [phone, setPhone]         = useState('');
  const [status, setStatus]       = useState('idle');
  const [msg, setMsg]             = useState('');
  const [officers, setOfficers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  async function fetchOfficers() {
    try { const res = await getOfficers(); setOfficers(res.data || []); }
    catch { setOfficers([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchOfficers(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    try {
      await createOfficer({ name, email, badge_number: badge, rank, station_name: stationName, phone });
      setStatus('success'); setMsg(`Officer ${name} (${badge}) registered successfully.`);
      setName(''); setEmail(''); setBadge(''); setRank('Traffic Constable'); setStationName(''); setPhone('');
      fetchOfficers();
    } catch (err) {
      setStatus('error'); setMsg(err instanceof Error ? err.message : 'Failed to add officer.');
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try { await deleteOfficer(id); fetchOfficers(); }
    catch {} finally { setDeletingId(null); }
  }

  const RANK_COLORS = {
    'DCP Traffic': 'bg-red-100 text-red-700 border-red-200',
    'ACP Traffic': 'bg-orange-100 text-orange-700 border-orange-200',
    'Traffic Inspector': 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={16} className="text-amber-600" />
            <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Register Traffic Officer</h2>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Full Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rajesh Kumar" required className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. rajesh.kumar@trafficblr.in" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Badge Number *</label>
              <input type="text" value={badge} onChange={e => setBadge(e.target.value)} placeholder="e.g. TP-BLR-1042" required className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Rank</label>
              <select value={rank} onChange={e => setRank(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition">
                {RANK_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Station / Post</label>
              <input type="text" value={stationName} onChange={e => setStationName(e.target.value)} placeholder="e.g. Silk Board Traffic Post" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
            </div>
            <button type="submit" disabled={status === 'loading'} className="mt-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-inter font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              {status === 'loading' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Registering…</> : <><UserPlus size={14} />Register Officer</>}
            </button>
            <StatusBadge status={status} message={msg} />
          </form>
        </div>
      </div>
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Traffic Officers</h2>
            <span className="text-[11px] text-gray-400 font-inter">{officers.length} registered</span>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">Loading…</div>
              : officers.length === 0
              ? <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">No officers registered yet.</div>
              : officers.map(o => (
              <div key={o.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-poppins font-bold text-sm flex-shrink-0">
                  {(o.name || 'O').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-inter font-semibold text-[13px] text-gray-900">{o.name}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${RANK_COLORS[o.rank] || 'bg-amber-50 text-amber-700 border-amber-200'}`}>{o.rank}</span>
                    {o.badge_number && <span className="text-[11px] text-gray-400 font-inter">#{o.badge_number}</span>}
                    {o.station_name && <span className="text-[11px] text-gray-400 font-inter truncate">· {o.station_name}</span>}
                  </div>
                  {o.phone && (
                    <span className="text-[11px] text-gray-400 font-inter flex items-center gap-1 mt-0.5">
                      <Phone size={10} />{o.phone}
                    </span>
                  )}
                </div>
                <button onClick={() => handleDelete(o.id)} disabled={deletingId === o.id} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 transition-colors disabled:opacity-50 flex-shrink-0">
                  {deletingId === o.id ? <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PolicePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('incidents');
  const [incidents, setIncidents] = useState([]);
  const [updates, setUpdates]     = useState([]);
  const [officers, setOfficers]   = useState([]);
  const [ambulances, setAmbulances] = useState([]);

  useEffect(() => {
    Promise.allSettled([getIncidents(), getPoliceUpdates(), getOfficers(), getAmbulances()]).then(([incRes, updRes, offRes, ambRes]) => {
      if (incRes.status === 'fulfilled') setIncidents(incRes.value?.data || []);
      if (updRes.status === 'fulfilled') setUpdates(updRes.value?.data || []);
      if (offRes.status === 'fulfilled') setOfficers(offRes.value?.data || []);
      if (ambRes.status === 'fulfilled') setAmbulances(ambRes.value?.data || []);
    });
  }, []);

  const activeCount = incidents.filter(i => !i.resolved).length;
  const blockedCount = updates.filter(u => u.status === 'blocked').length;
  const activeAmbulances = ambulances.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Navbar />

      <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-amber-200 hover:text-white text-[12px] font-inter transition-colors">
              <ChevronLeft size={14} /> Back to Dashboard
            </button>
            <button onClick={() => navigate('/map')} className="flex items-center gap-1.5 text-amber-200 hover:text-white text-[12px] font-inter transition-colors border border-white/25 rounded-lg px-2.5 py-1 bg-white/10 hover:bg-white/20">
              <Navigation size={12} /> View Live Map
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-poppins font-bold text-2xl">Traffic Police Command Center</h1>
              <p className="text-amber-100 font-inter text-sm">Traffic Incidents · Road Updates · Officer Management — Bengaluru City</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Active Incidents',   value: activeCount,      color: 'text-white'       },
              { label: 'Blocked Roads',      value: blockedCount,     color: 'text-red-200'     },
              { label: 'Active Ambulances',  value: activeAmbulances, color: 'text-green-200'   },
              { label: 'Officers Registered',value: officers.length,  color: 'text-white'       },
            ].map(s => (
              <div key={s.label} className="bg-white/12 border border-white/15 rounded-xl p-3 text-center">
                <p className={`font-poppins font-bold text-2xl ${s.color}`}>{s.value}</p>
                <p className="text-amber-100 font-inter text-[11px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="flex border-b border-gray-200 bg-white -mx-6 px-6 sticky top-0 z-10">
          <Tab label="Traffic Incidents" active={tab === 'incidents'} onClick={() => setTab('incidents')} count={activeCount} />
          <Tab label="Traffic Updates"   active={tab === 'road'}      onClick={() => setTab('road')}      count={blockedCount} />
          <Tab label="Traffic Officers"  active={tab === 'officers'}  onClick={() => setTab('officers')}  count={officers.length} />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-7">
        {tab === 'incidents' && <IncidentsTab ambulances={ambulances} />}
        {tab === 'road'      && <TrafficUpdatesTab />}
        {tab === 'officers'  && <OfficersTab />}
      </main>
    </div>
  );
}
