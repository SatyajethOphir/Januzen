// Helper to convert VAPID key format
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId?: string): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[PUSH] Push notifications are not supported in this browser.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[PUSH] Notification permission denied.");
      return false;
    }

    const registration = await navigator.serviceWorker.ready;

    // Fetch the VAPID Public Key from backend
    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) {
      throw new Error(`Failed to fetch VAPID public key: ${res.statusText}`);
    }
    const { publicKey } = await res.json();
    if (!publicKey) {
      console.warn("[PUSH] VAPID public key is empty. Server may not be configured.");
      return false;
    }

    // Subscribe user with PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    // Send subscription to server
    const subscribeRes = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, userId })
    });

    if (subscribeRes.ok) {
      console.log("✅ [PUSH] Successfully registered client with Push Service!");
      return true;
    } else {
      console.error("[PUSH] Server failed to register subscription.");
      return false;
    }
  } catch (err) {
    console.error("[PUSH] Error subscribing to push notifications:", err);
    return false;
  }
}
