import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const TripContext = createContext(null);

const STORAGE_KEY = 'ambulance_active_trip';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveToStorage(trip) {
  try {
    if (trip) localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function TripProvider({ children }) {
  const [trip, setTrip] = useState(() => loadFromStorage());
  const [notification, setNotification] = useState(null);
  const notifTimerRef = useRef(null);

  const startTrip = useCallback(({ ambId, ambName, srcName, dstName }) => {
    const t = { ambId: String(ambId), ambName, srcName, dstName, status: 'active', startedAt: Date.now(), progress: 0, routeState: null };
    setTrip(t);
    saveToStorage(t);
    setNotification(null);
  }, []);

  const saveRouteState = useCallback(({ coords, step, originalCoords, src, dst, routeInfo, rerouteMsg, rerouted }) => {
    setTrip(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        routeState: { coords, step, originalCoords: originalCoords || null, src, dst, routeInfo, rerouteMsg, rerouted, savedAt: Date.now() },
      };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const updateProgress = useCallback((pct) => {
    setTrip(prev => {
      if (!prev) return prev;
      if (pct < prev.progress && prev.progress < 100) return prev; // Prevent backward fluctuation
      const updated = { ...prev, progress: pct };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const endTrip = useCallback(() => {
    setTrip(prev => {
      if (!prev) return null;
      const completed = { ...prev, status: 'arrived', progress: 100, routeState: null };
      saveToStorage(completed);
      setNotification({ type: 'arrived', ambName: prev.ambName, dstName: prev.dstName, ambId: prev.ambId });
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
      notifTimerRef.current = setTimeout(() => {
        setNotification(null);
        setTrip(null);
        saveToStorage(null);
      }, 12000);
      return completed;
    });
  }, []);

  const dismissNotification = useCallback(() => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotification(null);
    setTrip(null);
    saveToStorage(null);
  }, []);

  const clearTrip = useCallback(() => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setTrip(null);
    saveToStorage(null);
    setNotification(null);
  }, []);

  useEffect(() => {
    function handleStorage(e) {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          try { setTrip(JSON.parse(e.newValue)); } catch {}
        } else {
          setTrip(null);
        }
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    };
  }, []);

  return (
    <TripContext.Provider value={{ trip, notification, startTrip, saveRouteState, updateProgress, endTrip, dismissNotification, clearTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTripContext() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTripContext must be inside TripProvider');
  return ctx;
}
