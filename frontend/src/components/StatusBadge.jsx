import React from 'react';

export function StatusBadge({ status, message }) {
  if (status === 'idle') return null;
  const styles = {
    loading: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`mt-2 px-3 py-2 rounded-lg border text-xs font-medium ${styles[status]}`}>
      {message}
    </div>
  );
}
