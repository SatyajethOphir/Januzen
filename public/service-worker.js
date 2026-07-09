// JANUZEN PWA Service Worker (Standard Open-Standards Web Push API)
const CACHE_VERSION = "v3.1.0-prod";
const CACHE_NAME = `januzen-cache-${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.png"
];

// Force immediate takeover — never wait for tabs to close
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => {})),
      self.skipWaiting()
    ])
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Take control of all open pages immediately
      await clients.claim();
      // Clean up any old caches from previous versions
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })()
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
  // CRITICAL: wrap everything in event.waitUntil so Android doesn't
  // kill the service worker before the notification is shown
  event.waitUntil(
    (async () => {
      let title = "JANUZEN";
      let options = {
        body: "You have a new notification",
        icon: "/logo.png",
        badge: "/logo.png",
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: { url: "/", type: "general" }
      };

      if (event.data) {
        try {
          const data = event.data.json();
          const rawTitle = data.title || title;
          title = rawTitle.startsWith("JANUZEN") ? rawTitle : `JANUZEN | ${rawTitle}`;
          const type = data.type || data.category || "general";
          const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 30);

          let actions = data.actions;
          if (!actions || actions.length === 0) {
            if (type === "order" || String(type).startsWith("order_")) {
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
            } else {
              actions = [
                { action: "view", title: "👀 View" },
                { action: "dismiss", title: "✖ Dismiss" }
              ];
            }
          }

          options = {
            ...options,
            body: data.body || options.body,
            icon: data.icon || "/logo.png",
            badge: data.badge || "/logo.png",
            image: data.image || undefined,
            tag: data.tag || `januzen-${type}-${cleanTitle || Date.now()}`,
            renotify: true,
            requireInteraction: data.requireInteraction || type === "otp" || type === "order" || type === "security",
            actions,
            data: {
              url: data.url || "/",
              type,
              category: data.category || type,
              timestamp: Date.now()
            }
          };
        } catch (parseErr) {
          try {
            options.body = event.data.text();
          } catch {
            // Use defaults if all parsing fails
          }
        }
      }

      // Show the notification — this MUST be awaited inside waitUntil
      await self.registration.showNotification(title, options).catch((err) => {
        return self.registration.showNotification(title, {
          body: options.body,
          icon: "/logo.png",
          tag: options.tag,
          data: options.data
        });
      });

      // Notify any open JANUZEN windows so they can show an in-app toast
      // Do this AFTER showing the notification, not before
      try {
        const clientList = await clients.matchAll({
          type: "window",
          includeUncontrolled: true
        });
        clientList.forEach((client) => {
          client.postMessage({
            type: "PUSH_RECEIVED",
            data: { title, body: options.body, url: options.data?.url, type: options.data?.type, image: options.image, actions: options.actions }
          });
        });
      } catch {
        // Never let client messaging failure prevent notification from showing
      }
    })()
  );
});

// --- SELF-HEALING WEB PUSH: HANDLE OS / BROWSER TOKEN ROTATION ---
self.addEventListener("pushsubscriptionchange", (event) => {
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
        if (!res.ok) {
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
    targetUrl = "/live-tracking";
  }

  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      // Focus existing JANUZEN window if one is open
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          await client.focus();
          if ("navigate" in client && client.url !== fullUrl) {
            try {
              client.navigate(fullUrl);
            } catch (e) {
              client.postMessage({ type: "NAVIGATE_TO", url: targetUrl });
            }
          } else {
            client.postMessage({ type: "NAVIGATE_TO", url: targetUrl });
          }
          return;
        }
      }

      // No existing window — open a new one
      if (clients.openWindow) {
        await clients.openWindow(fullUrl);
      }
    })()
  );
});
