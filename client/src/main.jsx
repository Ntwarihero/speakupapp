import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/solid.css';
import 'leaflet/dist/leaflet.css';
import './i18n';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    registration.update();
    setInterval(() => registration.update(), 5 * 60 * 1000);
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
