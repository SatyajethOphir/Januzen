// JANUZEN PWA Service Worker (Standard Open-Standards Web Push API)
const CACHE_NAME = "januzen-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/appicon.png",
  "/logo.png"
];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => {})),
      self.skipWaiting()
    ])
  );
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
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
  const tag = payload.tag || `januzen-${type}-${cleanTitle}`;
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

// Fetch handler with Cache-First strategy for static assets, network-first for APIs
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Do not intercept API calls or SSE streams
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache static assets dynamically
        if (
          event.request.method === "GET" && 
          networkResponse.status === 200 &&
          (url.pathname.endsWith(".png") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".jpg"))
        ) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback
      return caches.match("/index.html");
    })
  );
});

// Support standard push events from browser notifications framework
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { body: event.data.text() };
  }

  // Always show the OS notification regardless of focus state
  const options = {
    body: data.body || "",
    icon: data.icon || "/appicon.png",
    badge: "/logo.png",
    image: data.image || data.imageUrl || undefined,
    data: {
      url: data.url || data.linkUrl || "https://januzen.in",
      type: data.type || "general"
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: data.tag || "januzen-notification",
    renotify: true
  };

  const title = data.title ? (data.title.startsWith("JANUZEN") ? data.title : `JANUZEN | ${data.title}`) : "JANUZEN";

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Notify any open JANUZEN tabs so they can show an in-app toast too
      self.clients.matchAll({ type: "window" }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: "PUSH_RECEIVED",
            data: { title: data.title || "JANUZEN", body: data.body || "", url: data.url || "https://januzen.in" }
          });
        });
      })
    ])
  );
});

// --- BACKGROUND POLLING FOR INACTIVE CHANNELS ---
let jwtToken = null;
let lastSeenNotifIds = new Set();
let pollInterval = null;

// Listen to messages from the React app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_TOKEN") {
    jwtToken = event.data.token;
    console.log("🔑 [Service Worker] JWT Token synced successfully!");
    startBackgroundPoll();
  } else if (event.data && event.data.type === "CLEAR_TOKEN") {
    jwtToken = null;
    stopBackgroundPoll();
    console.log("🔑 [Service Worker] JWT Token cleared.");
  }
});

function startBackgroundPoll() {
  if (pollInterval) clearInterval(pollInterval);
  
  // Immediately poll once
  checkNewNotifications();
  
  // Set up interval (every 30 seconds)
  pollInterval = setInterval(() => {
    checkNewNotifications();
  }, 30000);
}

function stopBackgroundPoll() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

async function checkNewNotifications() {
  if (!jwtToken) return;
  try {
    const res = await fetch("/api/notifications", {
      headers: {
        "Authorization": `Bearer ${jwtToken}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      const notifications = data.notifications || [];
      
      // Limit to latest 4 notifications as per data optimization request
      const latestNotifs = notifications.slice(0, 4);
      
      let hasNew = false;
      for (const notif of latestNotifs) {
        if (!lastSeenNotifIds.has(notif.id)) {
          lastSeenNotifIds.add(notif.id);
          hasNew = true;
          
          // Check if user is actively viewing the app
          const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
          const isAppVisible = clientsList.some(client => client.visibilityState === "visible");
          
          if (!isAppVisible) {
            // Show notification with "JANUZEN" in the notification draw on top!
            const title = notif.title.startsWith("JANUZEN") ? notif.title : `JANUZEN | ${notif.title}`;
            const options = {
              body: notif.content,
              icon: "/appicon.png",
              badge: "/logo.png",
              vibrate: [100, 50, 100],
              tag: notif.id,
              requireInteraction: true,
              data: {
                dateOfArrival: Date.now(),
                url: "/"
              }
            };
            self.registration.showNotification(title, options);
          }
        }
      }
      
      // Sync list
      const currentIds = new Set(latestNotifs.map(n => n.id));
      for (const id of lastSeenNotifIds) {
        if (!currentIds.has(id)) {
          lastSeenNotifIds.delete(id);
        }
      }
    }
  } catch (err) {
    console.error("Error checking notifications in Service Worker background:", err);
  }
}

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
