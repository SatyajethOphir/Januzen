// JANUZEN PWA Automatic Cache & Client Data Versioning System
// Guarantees zero-manual-intervention updates across deployments while preserving essential user data.

export const CURRENT_APP_VERSION = "v2.1.0";
export const CURRENT_CACHE_NAME = `januzen-cache-${CURRENT_APP_VERSION}`;

// Allowlist of essential storage keys to preserve during version migrations
export const ESSENTIAL_STORAGE_KEYS = [
  "januzen_token",
  "januzen_user",
  "januzen_theme",
  "januzen_cart",
  "januzen_wishlist",
  "januzen_notif_banner_dismissed",
  "januzen_push_asked",
  "januzen_app_version"
];

/**
 * Checks if a new deployment/version is available and automatically migrates caches and client storage.
 * Safe to call on app boot, tab focus, or routing.
 */
export async function checkAppVersionAndMigrate(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  let versionChanged = false;
  const storedVersion = localStorage.getItem("januzen_app_version");

  // 1. Check local storage version stamp
  if (storedVersion !== CURRENT_APP_VERSION) {
    console.log(`🔄 [PWA VERSIONING] App version change detected: "${storedVersion || 'initial'}" -> "${CURRENT_APP_VERSION}"`);
    versionChanged = true;
  }

  // 2. Optionally check backend deployment endpoint (non-blocking)
  try {
    const res = await fetch(`/api/version?t=${Date.now()}`, { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      if (data.version && data.version !== storedVersion && data.version !== CURRENT_APP_VERSION) {
        console.log(`🔄 [PWA VERSIONING] Backend server reports new deployment version: "${data.version}"`);
        versionChanged = true;
      }
    }
  } catch (e) {
    // Network or offline error; fallback gracefully to local version check
  }

  if (versionChanged || !storedVersion) {
    await performDataAndCacheMigration();
  } else {
    // Routine silent cleanup of stale caches and expired JWTs even on matching versions
    await performRoutineCleanup();
  }

  return versionChanged;
}

/**
 * Executes full client data and Cache Storage migration.
 */
async function performDataAndCacheMigration(): Promise<void> {
  console.log(`🚀 [PWA VERSIONING] Executing client data & Cache Storage migration for ${CURRENT_APP_VERSION}...`);

  // 1. Remove outdated/disposable localStorage & sessionStorage keys
  cleanupStorage(localStorage, "localStorage");
  cleanupStorage(sessionStorage, "sessionStorage");

  // 2. Validate JWT token expiration (Preserve active sessions unless actually expired or invalid)
  validateAndPreserveSession();

  // 3. Automatically recreate/update required localStorage values for the new version
  try {
    localStorage.setItem("januzen_app_version", CURRENT_APP_VERSION);
    if (!localStorage.getItem("januzen_theme")) {
      localStorage.setItem("januzen_theme", "light");
    }
    if (!localStorage.getItem("januzen_cart")) {
      localStorage.setItem("januzen_cart", "[]");
    }
  } catch (e) {
    console.error("⚠️ [PWA VERSIONING] Error initializing default storage values:", e);
  }

  // 4. Delete all old Cache Storage entries created by previous Service Worker versions
  if ("caches" in window) {
    try {
      const cacheNames = await window.caches.keys();
      for (const name of cacheNames) {
        if (name !== CURRENT_CACHE_NAME) {
          console.log(`🗑️ [PWA CACHE] Deleting outdated cache entry: "${name}"`);
          await window.caches.delete(name);
        }
      }
    } catch (e) {
      console.error("⚠️ [PWA CACHE] Failed to purge old cache storage:", e);
    }
  }

  // 5. Force Service Worker update & instruct waiting workers to skipWaiting immediately
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        reg.update().catch(() => {});
        if (reg.waiting) {
          console.log("⚡ [PWA SW] Instructing waiting Service Worker to skipWaiting immediately...");
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }
    } catch (e) {
      console.error("⚠️ [PWA SW] Error updating Service Worker registrations:", e);
    }
  }

  console.log(`✅ [PWA VERSIONING] Migration to ${CURRENT_APP_VERSION} completed successfully!`);
}

/**
 * Removes any storage keys not present in ESSENTIAL_STORAGE_KEYS allowlist.
 */
function cleanupStorage(storage: Storage, storageName: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && !ESSENTIAL_STORAGE_KEYS.includes(key)) {
        // Do not delete active reload flags for current version
        if (key === `januzen_sw_reloaded_${CURRENT_APP_VERSION}`) continue;
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      console.log(`🧹 [PWA ${storageName}] Removing outdated/disposable key: "${key}"`);
      storage.removeItem(key);
    }
  } catch (e) {
    console.warn(`⚠️ [PWA ${storageName}] Storage cleanup encountered a minor issue:`, e);
  }
}

/**
 * Validates stored JWT tokens. Preserves valid sessions and only requires re-authentication if expired or malformed.
 */
function validateAndPreserveSession(): void {
  try {
    const token = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!token) return;

    const parts = token.split(".");
    if (parts.length !== 3) {
      console.warn("🧹 [PWA SESSION] Malformed JWT token structure detected. Purging session.");
      clearAuthTokens();
      return;
    }

    // Safely decode base64url payload with UTF-8 support
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);

    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      console.warn("⏰ [PWA SESSION] Active user JWT has expired. Requiring re-authentication.");
      clearAuthTokens();
    } else {
      console.log("🔐 [PWA SESSION] Active user session JWT validated and preserved.");
    }
  } catch (e) {
    console.warn("⚠️ [PWA SESSION] Failed to validate JWT token, clearing session:", e);
    clearAuthTokens();
  }
}

function clearAuthTokens(): void {
  try {
    localStorage.removeItem("januzen_token");
    localStorage.removeItem("januzen_user");
    sessionStorage.removeItem("januzen_token");
    sessionStorage.removeItem("januzen_user");
  } catch (e) {}
}

/**
 * Silent routine check to clean old caches or expired tokens without full migration logs.
 */
async function performRoutineCleanup(): Promise<void> {
  validateAndPreserveSession();
  if ("caches" in window) {
    try {
      const cacheNames = await window.caches.keys();
      for (const name of cacheNames) {
        if (name !== CURRENT_CACHE_NAME && name.startsWith("januzen-")) {
          await window.caches.delete(name);
        }
      }
    } catch (e) {}
  }
}

/**
 * Hooks into Service Worker lifecycle events to automatically refresh the app when a new version takes control.
 */
export function setupServiceWorkerVersionControl(onUpdateDetected?: () => void): () => void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return () => {};
  }

  const handleControllerChange = () => {
    console.log("🔄 [PWA SW] New Service Worker controller took over!");

    const reloadKey = `januzen_sw_reloaded_${CURRENT_APP_VERSION}`;
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, "true");
      console.log("♻️ [PWA SW] Refreshing application once to serve newest deployed version assets...");
      if (onUpdateDetected) onUpdateDetected();
      setTimeout(() => {
        window.location.reload();
      }, 150);
    }
  };

  navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

  // Periodically check for waiting service workers (every 20 mins) and instruct them to skipWaiting
  const checkInterval = setInterval(() => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        if (reg.waiting) {
          console.log("⚡ [PWA SW] Found waiting Service Worker during routine check. Commanding skipWaiting...");
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        reg.update().catch(() => {});
      }
    }).catch(() => {});
  }, 60000 * 20);

  return () => {
    navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    clearInterval(checkInterval);
  };
}
