import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, Navigation, X } from 'lucide-react';

const icons = {
  info: <Info className="w-5 h-5" />,
  success: <CheckCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  route: <Navigation className="w-5 h-5" />,
  incident: <AlertTriangle className="w-5 h-5" />,
};

const colors = {
  info: 'bg-blue-600 border-blue-500',
  success: 'bg-emerald-600 border-emerald-500',
  warning: 'bg-amber-600 border-amber-500',
  route: 'bg-sky-600 border-sky-500',
  incident: 'bg-red-600 border-red-500',
};

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl text-white max-w-sm w-full
        transition-all duration-300 ease-out
        ${colors[toast.type]}
        ${visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
    >
      <span className="flex-shrink-0 mt-0.5">{icons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight">{toast.title}</p>
        <p className="text-xs text-white/80 mt-0.5 leading-snug">{toast.message}</p>
      </div>
      <button
        onClick={() => {
          setLeaving(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
