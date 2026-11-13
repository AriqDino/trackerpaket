import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { FirebaseProvider } from './context/FirebaseAuthContext.tsx';
import './index.css';

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('mpt:pwa-update-ready'));
    void updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // Cek pembaruan SW setiap 1 jam saat aplikasi terbuka
    setInterval(() => {
      void registration.update();
    }, 60 * 60 * 1000);
  },
});

if ('serviceWorker' in navigator) {
  let refreshing = false;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !refreshing) {
      refreshing = true;
      window.dispatchEvent(new CustomEvent('mpt:pwa-update-ready'));
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <FirebaseProvider>
    <App />
  </FirebaseProvider>
);
