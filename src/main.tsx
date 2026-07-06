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
        .then((registration) => {
          registration.update().catch(() => {});

          // If a new SW is waiting, activate it immediately
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          // Listen for future updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New version available — activate immediately
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });

          // Reload the page when a new SW takes control
          // (ensures the page is controlled by the latest SW)
          let refreshing = false;
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (refreshing) return;
            refreshing = true;
            // Only reload if the SW changed — not on first load
            if (document.visibilityState === "hidden") {
              window.location.reload();
            }
          });
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
