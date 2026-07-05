import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { checkAppVersionAndMigrate } from './lib/versioning';

// Register Service Worker and run PWA versioning check on app boot
if (typeof window !== "undefined") {
  checkAppVersionAndMigrate();
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js")
        .then((reg) => {
          console.log("✅ [PWA] Service Worker registered with scope:", reg.scope);
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.error("❌ [PWA] Service Worker registration failed:", err);
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
