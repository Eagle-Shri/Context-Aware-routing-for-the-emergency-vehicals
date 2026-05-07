import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, Plus, Check, Bed, Shield, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { FormField, SelectField } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';
import LocationSearch from '../components/LocationSearch';
import { createHospital, getHospitals, getStations, createStation, deleteStation } from '../services/api';

const STATION_TYPES = [
  { value: 'hospital',         label: 'Hospital'         },
  { value: 'dispatch_station', label: 'Dispatch Station' },
  { value: 'trauma_center',    label: 'Trauma Center'    },
  { value: 'clinic',           label: 'Clinic'           },
];

export default function AdminStation() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('hospital');

  const [hospName, setHospName]         = useState('');
  const [hospType, setHospType]         = useState('');
  const [hospLocation, setHospLocation] = useState(null);
  const [beds, setBeds]                 = useState('');
  const [phone, setPhone]               = useState('');
  const [address, setAddress]           = useState('');
  const [hospStatus, setHospStatus]     = useState('idle');
  const [hospMsg, setHospMsg]           = useState('');
  const [hospitals, setHospitals]       = useState([]);
  const [loadingHosp, setLoadingHosp]   = useState(true);

  const [stationName, setStationName]             = useState('');
  const [stationZone, setStationZone]             = useState('');
  const [stationLocation, setStationLocation]     = useState(null);
  const [stationPhone, setStationPhone]           = useState('');
  const [stationStatus, setStationStatus]         = useState('idle');
  const [stationMsg, setStationMsg]               = useState('');
  const [stations, setStations]                   = useState([]);
  const [loadingStations, setLoadingStations]     = useState(true);
  const [deletingId, setDeletingId]               = useState(null);

  async function fetchHospitals() {
    try {
      const res = await getHospitals();
      setHospitals(res.data || []);
    } catch {
      setHospitals([]);
    } finally {
      setLoadingHosp(false);
    }
  }

  async function fetchStations() {
    try {
      const res = await getStations();
      setStations(res.data || []);
    } catch {
      setStations([]);
    } finally {
      setLoadingStations(false);
    }
  }

  useEffect(() => {
    fetchHospitals();
    fetchStations();
  }, []);

  async function handleHospSubmit(e) {
    e.preventDefault();
    if (!hospLocation) {
      setHospStatus('error');
      setHospMsg('Please select a location from the search results.');
      return;
    }
    setHospStatus('loading');
    try {
      await createHospital({
        name: hospName,
        latitude: hospLocation.lat,
        longitude: hospLocation.lng,
        capacity: beds ? Number(beds) : 0,
        phone: phone || '',
        address: address || hospType || '',
      });
      setHospStatus('success');
      setHospMsg(`"${hospName}" registered successfully.`);
      setHospName(''); setHospType(''); setHospLocation(null); setBeds(''); setPhone(''); setAddress('');
      fetchHospitals();
    } catch (err) {
      setHospStatus('error');
      setHospMsg(err instanceof Error ? err.message : 'Failed to register hospital.');
    }
  }

  async function handleStationSubmit(e) {
    e.preventDefault();
    if (!stationLocation) {
      setStationStatus('error');
      setStationMsg('Please select a location from the search results.');
      return;
    }
    setStationStatus('loading');
    try {
      await createStation({
        name: stationName,
        zone: stationZone || null,
        latitude: stationLocation.lat,
        longitude: stationLocation.lng,
        phone: stationPhone || null,
      });
      setStationStatus('success');
      setStationMsg(`Police station "${stationName}" added. It will appear on the live map.`);
      setStationName(''); setStationZone(''); setStationLocation(null); setStationPhone('');
      fetchStations();
    } catch (err) {
      setStationStatus('error');
      setStationMsg(err instanceof Error ? err.message : 'Failed to register station.');
    }
  }

  async function handleDeleteStation(id) {
    setDeletingId(id);
    try {
      await deleteStation(id);
      fetchStations();
    } catch {
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Navbar />

      <div className="bg-gradient-to-r from-emerald-700 to-green-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-emerald-200 hover:text-white text-[12px] font-inter mb-3 transition-colors">
            <ChevronLeft size={14} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-poppins font-bold text-2xl">Manage Facilities</h1>
              <p className="text-emerald-200 font-inter text-sm">Register hospitals and police stations — all visible on the live map</p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            {[
              { key: 'hospital', label: '🏥 Hospitals' },
              { key: 'station',  label: '🚔 Police Stations' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-inter font-semibold transition-colors ${activeTab === t.key ? 'bg-white text-emerald-700' : 'bg-white/15 text-white hover:bg-white/25'}`}
              >{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-5 gap-6">

        {activeTab === 'hospital' ? (
          <>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Plus size={16} className="text-emerald-600" />
                  <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Add Hospital / Facility</h2>
                </div>
                <form onSubmit={handleHospSubmit} className="flex flex-col gap-3.5">
                  <FormField label="Name" value={hospName} onChange={setHospName} placeholder="e.g. Victoria Hospital" required />
                  <SelectField label="Type" value={hospType} onChange={setHospType} options={STATION_TYPES} required />
                  <LocationSearch
                    label="Hospital Location"
                    value={hospLocation}
                    onChange={setHospLocation}
                    placeholder="Search hospital location by name"
                    required
                  />
                  <FormField label="Bed Capacity (0 if N/A)" type="number" value={beds} onChange={setBeds} placeholder="e.g. 320" step="1" />
                  <FormField label="Phone"   type="tel"   value={phone}   onChange={setPhone}   placeholder="+91 80 2234 5678" />
                  <FormField label="Address" value={address} onChange={setAddress} placeholder="Street address (optional)" />
                  <button
                    type="submit"
                    disabled={hospStatus === 'loading'}
                    className="mt-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-inter font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {hospStatus === 'loading'
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                      : <><Check size={14} />Register Facility</>}
                  </button>
                  <StatusBadge status={hospStatus} message={hospMsg} />
                </form>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Registered Hospitals</h2>
                  <span className="text-[11px] text-gray-400 font-inter">{hospitals.length} total</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {loadingHosp ? (
                    <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">Loading…</div>
                  ) : hospitals.length === 0 ? (
                    <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">No hospitals registered yet.</div>
                  ) : hospitals.map(h => (
                    <div key={h.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-emerald-50 border border-emerald-100">🏥</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-inter font-semibold text-[13px] text-gray-900">{h.name}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${h.available > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {h.available > 0 ? 'Available' : 'Full'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-inter">
                          {parseFloat(h.latitude)?.toFixed(4)}, {parseFloat(h.longitude)?.toFixed(4)}
                          {h.phone ? ` · ${h.phone}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {h.capacity > 0 && (
                          <div className="flex items-center gap-1 justify-end">
                            <Bed size={10} className="text-gray-400" />
                            <span className="text-[12px] font-semibold text-gray-700 font-inter">{h.available}/{h.capacity}</span>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 font-inter mt-0.5">#{h.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={16} className="text-blue-600" />
                  <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Add Police Station</h2>
                </div>
                <form onSubmit={handleStationSubmit} className="flex flex-col gap-3.5">
                  <FormField label="Station Name" value={stationName} onChange={setStationName} placeholder="e.g. Koramangala Police Station" required />
                  <FormField label="Zone / Area (opt.)" value={stationZone} onChange={setStationZone} placeholder="e.g. South Bengaluru" />
                  <LocationSearch
                    label="Station Location"
                    value={stationLocation}
                    onChange={setStationLocation}
                    placeholder="Search station location by name"
                    required
                  />
                  <FormField label="Phone (opt.)" type="tel" value={stationPhone} onChange={setStationPhone} placeholder="+91 80 2345 6789" />
                  <button
                    type="submit"
                    disabled={stationStatus === 'loading'}
                    className="mt-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-inter font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {stationStatus === 'loading'
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                      : <><Check size={14} />Register Police Station</>}
                  </button>
                  <StatusBadge status={stationStatus} message={stationMsg} />
                </form>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Registered Police Stations</h2>
                  <span className="text-[11px] text-gray-400 font-inter">{stations.length} total</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {loadingStations ? (
                    <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">Loading…</div>
                  ) : stations.length === 0 ? (
                    <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">No stations registered yet.</div>
                  ) : stations.map(s => (
                    <div key={s.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-blue-50 border border-blue-100">🚔</div>
                      <div className="flex-1 min-w-0">
                        <span className="font-inter font-semibold text-[13px] text-gray-900">{s.name}</span>
                        <p className="text-[11px] text-gray-400 font-inter truncate">
                          {s.zone ? `${s.zone} · ` : ''}{parseFloat(s.latitude)?.toFixed(4)}, {parseFloat(s.longitude)?.toFixed(4)}
                          {s.phone ? ` · ${s.phone}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteStation(s.id)}
                        disabled={deletingId === s.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 transition-colors disabled:opacity-50"
                      >
                        {deletingId === s.id
                          ? <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          : <Trash2 size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
