import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import toast from 'react-hot-toast';

// Runtime auto-update: when a new deployment is detected, DO NOT force an
// immediate reload — that was silently wiping out whatever the person was
// doing mid-action (e.g. filling the customer login form) with zero warning,
// since deploys during active development happen often. Instead, show a
// dismissible toast the person can act on when they're ready.
registerSW({
  immediate: true,
  onNeedRefresh() {
    toast(
      (tst) => (
        <span className="flex items-center gap-3">
          New version available
          <button
            className="px-3 py-1 rounded bg-primary-600 text-white text-sm font-medium"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <button
            className="text-secondary-500 text-sm"
            onClick={() => toast.dismiss(tst.id)}
          >
            Later
          </button>
        </span>
      ),
      { duration: Infinity, id: 'sw-update-available' }
    );
  },
  onOfflineReady() {},
});

// Clear old caches only once per detected app version, not on every single
// load (was previously running unconditionally on every page load).
if ('caches' in window) {
  const currentVersion = document.querySelector('meta[name="app-version"]')?.getAttribute('content') || 'dev';
  const clearedVersion = localStorage.getItem('ddms_caches_cleared_for');
  if (clearedVersion !== currentVersion) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
      localStorage.setItem('ddms_caches_cleared_for', currentVersion);
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);