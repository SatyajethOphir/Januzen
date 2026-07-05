// JANUZEN PWA Standard Web Push (VAPID) Client Service
// Strictly open-standards Web Push API without proprietary third-party dependencies

/**
 * Helper to convert VAPID base64 public key to Uint8Array required by PushManager
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push and Service Workers are supported in this environment
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Subscribe the current browser/device to standard Web Push notifications
 */
export async function subscribeToPush(userId?: string): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn("[WEB PUSH] Push notifications are not supported in this browser environment.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[WEB PUSH] Notification permission was denied by user.");
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const deviceInfo = navigator.userAgent || "Web PWA Client";

    // 1. Fetch VAPID Public Key from Backend
    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) {
      throw new Error(`Failed to fetch VAPID public key from backend: ${res.statusText}`);
    }
    const { publicKey } = await res.json();
    if (!publicKey) {
      console.warn("[WEB PUSH] VAPID public key is empty. Ensure backend is configured.");
      return false;
    }

    // 2. Check if already subscribed; if so, verify key match
    let subscription = await registration.pushManager.getSubscription();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    if (subscription) {
      let isKeyMatch = true; // Default to true if browser doesn't expose applicationServerKey
      if (subscription.options && subscription.options.applicationServerKey) {
        const existingKey = new Uint8Array(subscription.options.applicationServerKey);
        if (existingKey.length === applicationServerKey.length) {
          isKeyMatch = existingKey.every((byte, i) => byte === applicationServerKey[i]);
        } else {
          isKeyMatch = false;
        }
      }
      if (!isKeyMatch) {
        console.warn("🧹 [WEB PUSH] VAPID public key mismatch detected. Purging stale browser subscription and creating a fresh one...");
        try {
          const oldEndpoint = subscription.endpoint;
          await subscription.unsubscribe();
          await fetch("/api/push/unsubscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: oldEndpoint })
          }).catch(() => {});
        } catch (e) {
          console.error("⚠️ Failed to unsubscribe stale browser subscription:", e);
        }
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // 3. Register subscription with JANUZEN Backend
    const subscribeRes = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        userId,
        deviceInfo
      })
    });

    if (subscribeRes.ok) {
      console.log("✅ [WEB PUSH] Successfully subscribed device to JANUZEN push notifications!");
      return true;
    } else {
      const errText = await subscribeRes.text();
      console.error("[WEB PUSH] Backend failed to register subscription:", errText);
      return false;
    }
  } catch (err: any) {
    console.error("[WEB PUSH] Error subscribing to push notifications:", err.message || err);
    return false;
  }
}

/**
 * Unsubscribe current browser/device from Web Push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Notify backend to remove subscription
      await fetch("/api/push/unsubscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint })
      });
      console.log("🛑 [WEB PUSH] Unsubscribed from push notifications.");
      return true;
    }
    return false;
  } catch (err: any) {
    console.error("[WEB PUSH] Error unsubscribing:", err);
    return false;
  }
}

/**
 * Automatically check subscription state and refresh if expired or rotated
 */
export async function checkAndRefreshSubscription(currentUser?: any): Promise<void> {
  if (!isPushSupported()) return;
  if (Notification.permission !== "granted") return;

  try {
    const userId = currentUser?.id || (typeof currentUser === "string" ? currentUser : undefined);
    // Automatically verify VAPID key match, recreate if stale/purged, and synchronize with backend
    await subscribeToPush(userId);
  } catch (err: any) {
    console.error("[WEB PUSH] Error checking or refreshing push subscription:", err);
  }
}
