// JANUZEN PWA Service Worker (Standard Open-Standards Web Push API)
const CACHE_VERSION = "v2.1.0";
const CACHE_NAME = `januzen-cache-${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/appicon.png",
  "/logo.png"
];

// Install Service Worker
self.addEventListener("install", (event) => {
  console.log(`⬇️ [SW] Installing Service Worker version ${CACHE_VERSION}...`);
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => {})),
      self.skipWaiting()
    ])
  );
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
  console.log(`⚡ [SW] Activating Service Worker version ${CACHE_VERSION} and claiming clients...`);
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log(`🧹 [SW CLEANUP] Deleting outdated cache storage: ${cache}`);
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
});

// Handle messages from client tabs
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// --- STANDARD WEB PUSH EVENT HANDLER (VAPID) ---
self.addEventListener("push", (event) => {
  console.log("📨 [SW PUSH] Push event received in background Service Worker!");

  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: "JANUZEN Alert", body: event.data.text() };
    }
  }

  const rawTitle = payload.title || "JANUZEN Notification";
  const title = rawTitle.startsWith("JANUZEN") ? rawTitle : `JANUZEN | ${rawTitle}`;
  const body = payload.body || "You have a new update from Januzen.";
  
  const origin = self.location.origin;
  const resolveUrl = (path) => (!path ? "/appicon.png" : path.startsWith("http") || path.startsWith("data:") ? path : `${origin}${path.startsWith("/") ? "" : "/"}${path}`);
  const icon = resolveUrl(payload.icon || "/appicon.png");
  const badge = resolveUrl(payload.badge || "/logo.png");
  const image = payload.image ? resolveUrl(payload.image) : undefined;
  
  const url = payload.url || "/";
  const type = payload.type || payload.category || "general";
  
  // Deterministic tag prevents OS-level notification stacking (collapses duplicates automatically)
  const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 30);
  const tag = (payload.tag && String(payload.tag).trim()) || `januzen-${type}-${cleanTitle || Date.now()}`;
  const requireInteraction = payload.requireInteraction || type === "otp" || type === "order" || type === "security";

  let actions = payload.actions;
  if (!actions || actions.length === 0) {
    if (type === "order" || type.startsWith("order_")) {
      actions = [
        { action: "view", title: "📦 View Order" },
        { action: "dismiss", title: "✖ Dismiss" }
      ];
    } else if (type === "otp" || type === "security") {
      actions = [
        { action: "verify", title: "🔑 Verify Now" },
        { action: "dismiss", title: "✖ Dismiss" }
      ];
    } else if (type === "chat" || type === "chat_message") {
      actions = [
        { action: "reply", title: "💬 Open Chat" },
        { action: "dismiss", title: "✖ Dismiss" }
      ];
    } else if (type === "promotional_offer" || type === "offer") {
      actions = [
        { action: "shop", title: "🛍️ Shop Offer" },
        { action: "dismiss", title: "✖ Dismiss" }
      ];
    } else {
      actions = [
        { action: "view", title: "👀 View" },
        { action: "dismiss", title: "✖ Dismiss" }
      ];
    }
  }

  const options = {
    body,
    icon,
    badge,
    image,
    vibrate: [200, 100, 200, 100, 200],
    tag,
    renotify: true,
    requireInteraction,
    data: {
      url,
      type,
      category: payload.category || type,
      timestamp: Date.now()
    },
    actions
  };

  const displayNotification = (targetTitle, targetOptions) => {
    return self.registration.showNotification(targetTitle, targetOptions).catch((err) => {
      console.warn("⚠️ [SW PUSH] Advanced notification display failed (likely iOS/OEM constraint). Falling back to basic OS alert:", err);
      return self.registration.showNotification(targetTitle, {
        body: targetOptions.body,
        icon: resolveUrl("/appicon.png"),
        tag: targetOptions.tag,
        data: targetOptions.data
      });
    });
  };

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if any open PWA tab is actively visible and focused
      const activeVisibleClient = clientList.find((client) => client.visibilityState === "visible");
      if (activeVisibleClient) {
        console.log("[SW PUSH] PWA is active and visible in foreground. Dispatching directly to in-app toast without duplicate OS banner.");
        activeVisibleClient.postMessage({
          type: "PUSH_RECEIVED",
          data: { title, body, url, type, image, actions }
        });
        return Promise.resolve();
      } else {
        console.log("[SW PUSH] PWA is minimized/closed/locked. Displaying OS-level system push notification.");
        return displayNotification(title, options);
      }
    }).catch((err) => {
      console.error("❌ [SW PUSH] Client match failed, invoking fallback OS notification:", err);
      return displayNotification(title, options);
    })
  );
});

// --- SELF-HEALING WEB PUSH: HANDLE OS / BROWSER TOKEN ROTATION ---
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("🔄 [SW PUSH] Push subscription change detected by OS/Browser. Automatically re-subscribing...");
  event.waitUntil(
    fetch("/api/push/vapid-public-key")
      .then((res) => res.json())
      .then(({ publicKey }) => {
        if (!publicKey) throw new Error("Missing VAPID public key from backend");
        const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = self.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray
        });
      })
      .then((newSubscription) => {
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: newSubscription,
            deviceInfo: "Android PWA Service Worker (Self-Healed Token)"
          })
        });
      })
      .then((res) => {
        if (res.ok) {
          console.log("✅ [SW PUSH] Rotated push subscription automatically synced to backend database!");
        } else {
          console.error("❌ [SW PUSH] Failed to sync rotated subscription with backend database.");
        }
      })
      .catch((err) => {
        console.error("❌ [SW PUSH] Error in pushsubscriptionchange handler:", err);
      })
  );
});

// Fetch handler: Network-First for HTML/Navigation, Cache-First for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Only handle HTTP and HTTPS schemes (ignore chrome-extension:, devtools:, data:, etc.)
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Do not intercept API calls or SSE streams
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 1. Navigation requests (HTML / SPA routes): Network-First with offline fallback
  if (
    event.request.mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    event.request.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", cacheCopy));
          }
          return networkResponse;
        })
        .catch(() => {
          console.log("📴 [SW] Offline navigation fallback serving /index.html from cache");
          return caches.match("/index.html") || caches.match("/");
        })
    );
    return;
  }

  // 2. Static Assets & Images: Cache-First, dynamically cache new version assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          event.request.method === "GET" &&
          url.protocol.startsWith("http") &&
          networkResponse.status === 200 &&
          (url.pathname.endsWith(".png") || url.pathname.endsWith(".jpg") || url.pathname.endsWith(".jpeg") ||
           url.pathname.endsWith(".svg") || url.pathname.endsWith(".ico") || url.pathname.endsWith(".js") ||
           url.pathname.endsWith(".css") || url.pathname.endsWith(".woff") || url.pathname.endsWith(".woff2") ||
           url.pathname.endsWith(".json"))
        ) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      return new Response("Resource unavailable offline", { status: 503, statusText: "Service Unavailable" });
    })
  );
});

// Handle notification click to open or focus the app (supports action buttons and deep linking)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  if (action === "dismiss" || action === "Dismiss" || action === "✖ Dismiss") {
    return;
  }

  const data = event.notification.data || {};
  let targetUrl = data.url || "/";

  if (action === "verify" || action === "🔑 Verify Now" || data.type === "otp" || data.type === "security") {
    targetUrl = "/profile?tab=security";
  } else if (action === "reply" || action === "💬 Open Chat" || data.type === "chat") {
    targetUrl = "/profile?tab=support";
  } else if (action === "view" || action === "📦 View Order" || data.type === "order") {
    targetUrl = "/orders";
  }

  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "NAVIGATE_TO", url: targetUrl });
          if ("navigate" in client && client.url !== fullUrl) {
            try {
              client.navigate(fullUrl);
            } catch (e) {}
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});
