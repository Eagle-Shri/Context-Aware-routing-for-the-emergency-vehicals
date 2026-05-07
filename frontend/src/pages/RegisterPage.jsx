import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Format hints shown below inputs
const HINTS = {
  police: {
    badge_number: 'Format: POL-XXXX (e.g., POL-1234)',
    zone: 'e.g., North Zone, South Zone',
  },
  driver: {
    license_number: 'e.g., DL1234567890 (8–16 alphanumeric)',
    vehicle_plate: 'Format: KA-01-AB-1234',
  },
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('driver');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    // Driver fields
    license_number: '',
    vehicle_plate: '',
    // Police fields
    badge_number: '',
    zone: '',
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: '' }));
    setError('');
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = role === 'police' ? '/api/auth/register/police' : '/api/auth/register/driver';
      const payload =
        role === 'police'
          ? { name: form.name, email: form.email, password: form.password, phone: form.phone, badge_number: form.badge_number, zone: form.zone }
          : { name: form.name, email: form.email, password: form.password, phone: form.phone, license_number: form.license_number, vehicle_plate: form.vehicle_plate };

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field) setFieldErrors({ [data.field]: data.error });
        else setError(data.error || 'Registration failed.');
        return;
      }

      // Navigate to OTP verification, passing the userId and role
      navigate('/verify-otp', { state: { userId: data.userId, role, email: form.email } });
    } catch (err) {
      setError('Could not connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mb-4">
            <span className="text-3xl">🚑</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-blue-300 text-sm mt-1">Register to access SmartAmbulance System</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
          {/* Role Switch */}
          <div className="flex bg-white/10 rounded-xl p-1 mb-6">
            {['driver', 'police'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(''); setFieldErrors({}); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  role === r ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white'
                }`}
              >
                {r === 'driver' ? '🚑 Ambulance Driver' : '🚔 Police Officer'}
              </button>
            ))}
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Common Fields */}
            <Field label="Full Name" value={form.name} onChange={(v) => update('name', v)} placeholder="Your full name" required />
            <Field label="Email Address" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="you@example.com" required />
            <Field label="Phone Number" type="tel" value={form.phone} onChange={(v) => update('phone', v)} placeholder="+91 98765 43210" />

            {/* Role-specific Credential Fields */}
            {role === 'police' ? (
              <>
                <Field
                  label="Police Badge Number"
                  value={form.badge_number}
                  onChange={(v) => update('badge_number', v)}
                  placeholder="POL-1234"
                  required
                  hint={HINTS.police.badge_number}
                  error={fieldErrors.badge_number}
                />
                <Field
                  label="Zone / Jurisdiction"
                  value={form.zone}
                  onChange={(v) => update('zone', v)}
                  placeholder="e.g., North Zone"
                  hint={HINTS.police.zone}
                />
              </>
            ) : (
              <>
                <Field
                  label="Driver's License Number"
                  value={form.license_number}
                  onChange={(v) => update('license_number', v)}
                  placeholder="DL1234567890"
                  required
                  hint={HINTS.driver.license_number}
                  error={fieldErrors.license_number}
                />
                <Field
                  label="Ambulance Plate Number"
                  value={form.vehicle_plate}
                  onChange={(v) => update('vehicle_plate', v)}
                  placeholder="KA-01-AB-1234"
                  required
                  hint={HINTS.driver.vehicle_plate}
                  error={fieldErrors.vehicle_plate}
                />
              </>
            )}

            {/* Password */}
            <Field label="Password" type="password" value={form.password} onChange={(v) => update('password', v)} placeholder="Min. 6 characters" required />
            <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} placeholder="Repeat password" required />

            {error && (
              <div className="bg-red-500/20 border border-red-400/40 text-red-200 text-sm rounded-xl px-4 py-3">
                ⚠️ {error}
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-blue-500/10 border border-blue-400/30 text-blue-200 text-xs rounded-xl px-4 py-3">
              🔒 Your credentials will be verified. An OTP will be sent to your email to activate the account.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            >
              {loading ? 'Processing...' : 'Register & Send OTP →'}
            </button>
          </form>

          <p className="text-center text-blue-300 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-white font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Reusable field component
function Field({ label, type = 'text', value, onChange, placeholder, required, hint, error }) {
  return (
    <div>
      <label className="block text-blue-200 text-sm font-medium mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
          error ? 'border-red-400/70' : 'border-white/20'
        }`}
      />
      {hint && !error && <p className="text-blue-400/70 text-xs mt-1 ml-1">{hint}</p>}
      {error && <p className="text-red-400 text-xs mt-1 ml-1">⚠️ {error}</p>}
    </div>
  );
}
