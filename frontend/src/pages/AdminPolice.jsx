import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronLeft, UserPlus, Check, MapPin } from 'lucide-react';
import Navbar from '../components/Navbar';
import { SelectField } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';
import LocationSearch from '../components/LocationSearch';
import { createPoliceUpdate, getPoliceUpdates, clearPoliceUpdate } from '../services/api';

const ROAD_STATUS = [
  { value: 'blocked', label: 'Blocked' },
  { value: 'open',    label: 'Open'    },
];

const SEVERITY_OPTIONS = [
  { value: 'low',    label: 'Low'    },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High'   },
];

const STATUS_COLORS = {
  blocked: 'bg-red-50 text-red-700 border-red-200',
  open:    'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function AdminPolice() {
  const navigate = useNavigate();
  const [roadName, setRoadName]     = useState('');
  const [roadStatus, setRoadStatus] = useState('');
  const [severity, setSeverity]     = useState('');
  const [location, setLocation]     = useState(null);
  const [radius, setRadius]         = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus]         = useState('idle');
  const [msg, setMsg]               = useState('');
  const [updates, setUpdates]       = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [clearingId, setClearingId] = useState(null);

  async function fetchUpdates() {
    try {
      const res = await getPoliceUpdates();
      setUpdates(res.data || []);
    } catch {
      setUpdates([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchUpdates();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!location) {
      setStatus('error');
      setMsg('Please select a location from the search results.');
      return;
    }
    setStatus('loading');
    try {
      await createPoliceUpdate({
        road_name: roadName,
        status: roadStatus,
        severity,
        latitude: location.lat,
        longitude: location.lng,
        impact_radius: Number(radius) || 500,
        description,
      });
      setStatus('success');
      setMsg(`Road update for "${roadName}" submitted. Ambulances will be rerouted if affected.`);
      setRoadName(''); setRoadStatus(''); setSeverity(''); setLocation(null); setRadius(''); setDescription('');
      fetchUpdates();
    } catch (err) {
      setStatus('error');
      setMsg(err instanceof Error ? err.message : 'Failed to create road update.');
    }
  }

  async function handleClear(id) {
    setClearingId(id);
    try {
      await clearPoliceUpdate(id);
      fetchUpdates();
    } catch {
    } finally {
      setClearingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Navbar />

      <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-[12px] font-inter mb-3 transition-colors">
            <ChevronLeft size={14} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-poppins font-bold text-2xl">Road Status Updates</h1>
              <p className="text-slate-400 font-inter text-sm">Submit road blockages — ambulance paths recalculate automatically</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-5 gap-6">

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={16} className="text-slate-700" />
              <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Report Road Update</h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Road Name *</label>
                <input
                  type="text"
                  value={roadName}
                  onChange={e => setRoadName(e.target.value)}
                  placeholder="e.g. MG Road"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                />
              </div>
              <SelectField label="Road Status" value={roadStatus} onChange={setRoadStatus} options={ROAD_STATUS} required />
              <SelectField label="Severity"    value={severity}   onChange={setSeverity}   options={SEVERITY_OPTIONS} required />
              <LocationSearch
                label="Road Location"
                value={location}
                onChange={setLocation}
                placeholder="Search road location by name"
                required
              />
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Impact Radius (m)</label>
                <input
                  type="number"
                  value={radius}
                  onChange={e => setRadius(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Description (opt.)</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description…"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="mt-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white font-inter font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {status === 'loading'
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</>
                  : <><Check size={14} />Submit Road Update</>}
              </button>
              <StatusBadge status={status} message={msg} />
            </form>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Road Updates Log</h2>
              <span className="text-[11px] text-gray-400 font-inter">{updates.length} total</span>
            </div>
            <div className="divide-y divide-gray-50">
              {loadingList ? (
                <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">Loading…</div>
              ) : updates.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">No road updates yet.</div>
              ) : updates.map(u => (
                <div key={u.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-poppins font-bold text-sm flex-shrink-0">
                    {(u.road_name || 'R').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-inter font-semibold text-[13px] text-gray-900">{u.road_name}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[u.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {u.status?.charAt(0).toUpperCase() + u.status?.slice(1)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-inter truncate">
                      Severity: {u.severity} · {u.impact_radius}m
                      {u.description ? ` · ${u.description}` : ''}
                    </p>
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
                      <button
                        onClick={() => handleClear(u.id)}
                        disabled={clearingId === u.id}
                        title="Mark road as Open"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 transition-colors disabled:opacity-50"
                      >
                        {clearingId === u.id
                          ? <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          : <Check size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
