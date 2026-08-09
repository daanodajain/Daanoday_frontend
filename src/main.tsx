import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Runtime auto-update: as soon as a new deployment is detected, activate it
// and reload immediately instead of leaving the old cached version running
// until every tab happens to close.
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);