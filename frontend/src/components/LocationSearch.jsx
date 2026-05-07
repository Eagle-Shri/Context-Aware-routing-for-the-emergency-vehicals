import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { geocodeLocation } from '../utils/geocode';

export default function LocationSearch({ label, value, onChange, placeholder, required }) {
  const [query, setQuery] = useState(value?.label || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    onChange(null);
    setError('');

    clearTimeout(debounceRef.current);
    if (val.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await geocodeLocation(val);
        setResults(found);
        setOpen(true);
      } catch (err) {
        setError(err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 600);
  }

  function handleSelect(item) {
    setQuery(item.label.split(',')[0]);
    onChange({ label: item.label, lat: item.lat, lng: item.lng });
    setResults([]);
    setOpen(false);
    setError('');
  }

  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder || 'Type a location name…'}
          required={required && !value}
          className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm font-inter text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
        {!loading && query.length >= 3 && (
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-500 font-inter">{error}</p>
      )}

      {value && (
        <p className="text-[10px] text-emerald-600 font-inter truncate">
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
            >
              <p className="text-[12px] font-semibold text-gray-900 font-inter truncate">{r.label.split(',')[0]}</p>
              <p className="text-[10px] text-gray-400 font-inter truncate">{r.label}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
