import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function OTPPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Passed from RegisterPage via navigate state
  const { userId, role, email } = location.state || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Redirect if accessed directly without state
  if (!userId || !role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">⚠️ Invalid access.</p>
          <Link to="/register" className="text-blue-400 hover:text-white">Go to Register →</Link>
        </div>
      </div>
    );
  }

  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // only 1 digit per box
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, otp: otpStr }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'OTP verification failed.');
        return;
      }

      login(data.user, data.token);
      setSuccess('✅ Email verified! Redirecting...');

      setTimeout(() => {
        if (role === 'driver') navigate('/driver');
        else if (role === 'police') navigate('/police');
      }, 1500);
    } catch (err) {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to resend OTP.');
      } else {
        setSuccess('New OTP sent! Check your email.');
        setCountdown(60);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mb-4">
            <span className="text-3xl">✉️</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Verify Your Email</h1>
          <p className="text-blue-300 text-sm mt-2">
            We've sent a 6-digit code to <span className="text-white font-semibold">{email}</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleVerify}>
            {/* OTP Boxes */}
            <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white/10 text-white focus:outline-none transition-all duration-200 ${
                    digit
                      ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                      : 'border-white/20 focus:border-blue-400'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/40 text-red-200 text-sm rounded-xl px-4 py-3 mb-4">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/20 border border-green-400/40 text-green-200 text-sm rounded-xl px-4 py-3 mb-4">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/60 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            >
              {loading ? 'Verifying...' : 'Verify & Activate Account'}
            </button>
          </form>

          {/* Resend OTP */}
          <div className="text-center mt-5">
            <p className="text-blue-300 text-sm">Didn't receive the code?</p>
            {countdown > 0 ? (
              <p className="text-blue-400/70 text-sm mt-1">Resend in {countdown}s</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-blue-400 hover:text-white text-sm font-semibold mt-1 transition-colors"
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>
            )}
          </div>

          <p className="text-center text-blue-300/60 text-xs mt-5">
            <Link to="/register" className="hover:text-blue-300 transition-colors">← Back to Registration</Link>
          </p>
        </div>

        <p className="text-center text-blue-400/50 text-xs mt-4">
          OTP expires in 10 minutes • Check spam if you don't see the email
        </p>
      </div>
    </div>
  );
}
