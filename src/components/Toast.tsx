import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastHandler: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'success') {
  toastHandler?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastHandler = (message, type) => {
      const id = Math.random().toString(36).slice(2);
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    return () => { toastHandler = null; };
  }, []);

  const icons: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' };
  const colors: Record<ToastType, string> = { success: '#22d3a5', error: '#ef4444', info: '#6378ff' };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ color: colors[t.type], fontSize: 14, fontWeight: 700 }}>{icons[t.type]}</span>
          <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
