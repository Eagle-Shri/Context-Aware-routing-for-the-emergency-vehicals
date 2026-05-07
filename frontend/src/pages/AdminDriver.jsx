import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronLeft, UserPlus, Check, Mail, Phone, BookOpen } from 'lucide-react';
import Navbar from '../components/Navbar';
import { FormField } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';
import { createDriver, getDrivers, deleteDriver } from '../services/api';

const STATUS_COLORS = {
  IDLE:   'bg-gray-50 text-gray-500 border-gray-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BUSY:   'bg-blue-50 text-blue-700 border-blue-200',
};

export default function AdminDriver() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [status, setStatus] = useState('idle');
  const [msg, setMsg] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  async function fetchDrivers() {
    try {
      const res = await getDrivers();
      setDrivers(res.data || []);
    } catch {
      setDrivers([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!name.trim()) {
      setStatus('error');
      setMsg('Driver name is required.');
      return;
    }
    
    setStatus('loading');
    try {
      await createDriver({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        license_number: licenseNumber.trim() || null,
        ambulance_id: null
      });
      setStatus('success');
      setMsg(`Driver "${name}" registered successfully.`);
      setName('');
      setEmail('');
      setPhone('');
      setLicenseNumber('');
      fetchDrivers();
    } catch (err) {
      setStatus('error');
      setMsg(err instanceof Error ? err.message : 'Failed to register driver.');
    }
  }

  async function handleDelete(driverId, driverName) {
    if (window.confirm(`Delete driver "${driverName}"?`)) {
      try {
        await deleteDriver(driverId);
        setMsg(`Driver "${driverName}" deleted.`);
        fetchDrivers();
      } catch (err) {
        setMsg('Failed to delete driver: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Navbar />

      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-[12px] font-inter mb-3 transition-colors">
            <ChevronLeft size={14} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-poppins font-bold text-2xl">Manage Ambulance Drivers</h1>
              <p className="text-blue-200 font-inter text-sm">Register and manage ambulance drivers</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-5 gap-6">

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={16} className="text-blue-600" />
              <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Add New Driver</h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <FormField 
                label="Driver Name *" 
                value={name} 
                onChange={setName} 
                placeholder="e.g. Rajesh Kumar" 
                required 
              />
              <FormField 
                label="Email Address" 
                value={email} 
                onChange={setEmail} 
                placeholder="e.g. rajesh@example.com" 
                type="email"
              />
              <FormField 
                label="Phone Number" 
                value={phone} 
                onChange={setPhone} 
                placeholder="e.g. 9876543210" 
                type="tel"
              />
              <FormField 
                label="License Number" 
                value={licenseNumber} 
                onChange={setLicenseNumber} 
                placeholder="e.g. DL2024001" 
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="mt-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-inter font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {status === 'loading'
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Registering…</>
                  : <><Check size={14} />Register Driver</>}
              </button>
              <StatusBadge status={status} message={msg} />
            </form>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-poppins font-semibold text-gray-900 text-[15px]">Registered Drivers</h2>
              <span className="text-[11px] text-gray-400 font-inter">{drivers.length} total</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {loadingList ? (
                <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">Loading…</div>
              ) : drivers.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 font-inter text-sm">No drivers registered yet.</div>
              ) : drivers.map(driver => (
                <div key={driver.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-poppins font-bold text-sm flex-shrink-0 mt-0.5">
                      {(driver.name || 'D').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-inter font-semibold text-[13px] text-gray-900">{driver.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[driver.status] || STATUS_COLORS.IDLE}`}>
                          {driver.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {driver.email && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-inter">
                            <Mail size={12} />
                            <span className="truncate">{driver.email}</span>
                          </div>
                        )}
                        {driver.phone && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-inter">
                            <Phone size={12} />
                            <span>{driver.phone}</span>
                          </div>
                        )}
                        {driver.license_number && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-inter">
                            <BookOpen size={12} />
                            <span>{driver.license_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] font-semibold text-gray-600 font-inter">Driver #{driver.id}</p>
                      <p className="text-[10px] text-gray-400 font-inter">
                        {driver.created_at ? new Date(driver.created_at).toLocaleDateString() : ''}
                      </p>
                      <button
                        onClick={() => handleDelete(driver.id, driver.name)}
                        className="text-[10px] text-red-500 hover:text-red-700 font-inter font-semibold mt-1"
                      >
                        Delete
                      </button>
                    </div>
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
