// JANUZEN PWA Service Worker
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
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
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
  let payload = { title: "JANUZEN Alert", body: "New update on your JANUZEN account." };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  // Ensure title has "PJ" prefix for mobile drawer
  const title = payload.title.startsWith("PJ") ? payload.title : `PJ | ${payload.title}`;

  const options = {
    body: payload.body,
    icon: payload.icon || "/appicon.png",
    badge: "/logo.png",
    image: payload.image || payload.imageUrl || undefined,
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "2",
      url: payload.url || payload.linkUrl || "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
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
            // Show notification with "PJ" in the notification draw on top!
            const title = notif.title.startsWith("PJ") ? notif.title : `PJ | ${notif.title}`;
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

// Handle notification click to open or focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
