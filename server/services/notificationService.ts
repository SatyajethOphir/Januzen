import webpush from "web-push";
import { PushSubscriptionModel, IPushSubscription } from "../models/PushSubscription";
import { NotificationLogModel, NotificationCategory } from "../models/NotificationLog";
import { dbClient, isMongo } from "../db";

// Ensure VAPID keys are initialized
let vapidInitialized = false;

export function initWebPush(): { publicKey: string; privateKey: string } {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "VnLwDtbz3Rto617w5K1H8XyQzS-6yE62xXwF_pZ1rO4";
  const subject = process.env.VAPID_SUBJECT || "mailto:support@januzen.com";

  if (!vapidInitialized) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      vapidInitialized = true;
      console.log("✅ [WEB PUSH] VAPID details initialized successfully.");
    } catch (err: any) {
      console.error("❌ [WEB PUSH] Failed to initialize VAPID keys:", err.message);
    }
  }

  return { publicKey, privateKey };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  type?: string;
  category?: NotificationCategory;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
}

/**
 * Reusable Notification Service for JANUZEN Enterprise PWA
 */
export class NotificationService {
  /**
   * Save or update a user's push subscription in MongoDB
   */
  static async subscribe(
    endpoint: string,
    keys: { p256dh: string; auth: string },
    userId?: string,
    deviceInfo?: string,
    userAgent?: string
  ): Promise<any> {
    const now = new Date().toISOString();
    initWebPush();

    if (isMongo) {
      const sub = await PushSubscriptionModel.findOneAndUpdate(
        { endpoint },
        {
          endpoint,
          keys,
          ...(userId ? { userId } : {}),
          deviceInfo: deviceInfo || "Web Client",
          userAgent: userAgent || "",
          updatedAt: now,
          $setOnInsert: {
            id: "sub_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            createdAt: now
          }
        },
        { upsert: true, new: true }
      );
      return sub;
    } else {
      return await dbClient.saveSubscription({
        id: "sub_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        userId,
        endpoint,
        keys,
        deviceInfo: deviceInfo || "Web Client",
        createdAt: now,
        updatedAt: now
      });
    }
  }

  /**
   * Automatically update subscription when endpoint or keys rotate/change
   */
  static async updateSubscription(
    oldEndpoint: string,
    newEndpoint: string,
    newKeys?: { p256dh: string; auth: string },
    userId?: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    initWebPush();

    if (isMongo) {
      const existing = await PushSubscriptionModel.findOne({ endpoint: oldEndpoint });
      if (existing) {
        existing.endpoint = newEndpoint;
        if (newKeys) existing.keys = newKeys;
        if (userId) existing.userId = userId;
        existing.updatedAt = now;
        await existing.save();
        return true;
      }
      return false;
    } else {
      const db = (dbClient as any).loadLocalDB ? (dbClient as any).loadLocalDB() : null;
      if (db && db.pushSubscriptions) {
        const idx = db.pushSubscriptions.findIndex((s: any) => s.endpoint === oldEndpoint);
        if (idx > -1) {
          db.pushSubscriptions[idx].endpoint = newEndpoint;
          if (newKeys) db.pushSubscriptions[idx].keys = newKeys;
          if (userId) db.pushSubscriptions[idx].userId = userId;
          db.pushSubscriptions[idx].updatedAt = now;
          (dbClient as any).saveLocalDB(db);
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Automatically remove invalid or expired subscriptions (410 Gone / 404 Not Found)
   */
  static async removeSubscription(endpoint: string): Promise<void> {
    console.log(`🧹 [PUSH CLEANUP] Purging expired/invalid subscription: ${endpoint.substring(0, 30)}...`);
    if (isMongo) {
      await PushSubscriptionModel.deleteOne({ endpoint });
    } else {
      await dbClient.deleteSubscription(endpoint);
    }
  }

  /**
   * Get all subscriptions for a specific user ID
   */
  static async getSubscriptionsForUser(userId: string): Promise<any[]> {
    if (isMongo) {
      return await PushSubscriptionModel.find({ userId });
    } else {
      const subs = await dbClient.getAllSubscriptions();
      return subs.filter(s => String(s.userId) === String(userId));
    }
  }

  /**
   * Get all active subscriptions in the database
   */
  static async getAllSubscriptions(): Promise<any[]> {
    if (isMongo) {
      return await PushSubscriptionModel.find({});
    } else {
      return await dbClient.getAllSubscriptions();
    }
  }

  /**
   * Log notification dispatch history to database
   */
  static async logNotification(
    category: NotificationCategory,
    title: string,
    message: string,
    recipientCount: number,
    successCount: number,
    failureCount: number,
    url?: string,
    imageUrl?: string,
    userId?: string
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const status = failureCount === 0 && successCount > 0 ? "sent" : successCount > 0 ? "partial" : "failed";

      if (isMongo) {
        await NotificationLogModel.create({
          id: "notif_log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          userId: userId || "broadcast",
          category,
          title,
          message,
          url: url || "/",
          imageUrl,
          recipientCount,
          successCount,
          failureCount,
          status,
          sentAt: now
        });
      }
    } catch (e) {
      console.error("⚠️ [PUSH LOG] Failed to record notification log:", e);
    }
  }

  /**
   * Internal helper: Dispatch push payload to a list of subscriptions
   */
  private static async dispatchToSubscriptions(
    subs: any[],
    payload: PushPayload
  ): Promise<{ successCount: number; failCount: number }> {
    initWebPush();
    let successCount = 0;
    let failCount = 0;

    if (subs.length === 0) {
      return { successCount: 0, failCount: 0 };
    }

    const formattedTitle = payload.title.startsWith("JANUZEN") ? payload.title : `JANUZEN | ${payload.title}`;
    const defaultActions = payload.actions || [
      { action: "view", title: "👀 View" },
      { action: "dismiss", title: "✖ Dismiss" }
    ];

    const pushDataString = JSON.stringify({
      title: formattedTitle,
      body: payload.body,
      icon: payload.icon || "/appicon.png",
      badge: payload.badge || "/logo.png",
      image: payload.image,
      url: payload.url || "/",
      type: payload.type || payload.category || "general",
      category: payload.category || "general",
      actions: defaultActions,
      requireInteraction: payload.requireInteraction || false,
      timestamp: Date.now()
    });

    for (const sub of subs) {
      if (!sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
        continue;
      }

      // Execute send with retry logic for transient errors
      let attempt = 0;
      const maxRetries = 1;
      let delivered = false;

      while (attempt <= maxRetries && !delivered) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            pushDataString
          );
          successCount++;
          delivered = true;
        } catch (err: any) {
          const statusCode = err.statusCode || err.status;
          if (statusCode === 410 || statusCode === 404) {
            // Subscription expired or unsubscribed on client: remove immediately
            await this.removeSubscription(sub.endpoint);
            failCount++;
            break;
          } else if (attempt < maxRetries) {
            attempt++;
            await new Promise(res => setTimeout(res, 500 * attempt));
          } else {
            console.error(`❌ [WEB PUSH] Error delivering to ${sub.endpoint.substring(0, 25)}... status: ${statusCode}`, err.message);
            failCount++;
            break;
          }
        }
      }
    }

    return { successCount, failCount };
  }

  /**
   * 1. Send push notification to a specific authenticated user
   */
  static async sendToUser(
    userId: string,
    payload: PushPayload
  ): Promise<{ successCount: number; failCount: number }> {
    const subs = await this.getSubscriptionsForUser(userId);
    const result = await this.dispatchToSubscriptions(subs, payload);

    await this.logNotification(
      payload.category || "general",
      payload.title,
      payload.body,
      subs.length,
      result.successCount,
      result.failCount,
      payload.url,
      payload.image,
      userId
    );

    return result;
  }

  /**
   * 2. Send push notification to multiple specific users
   */
  static async sendToMultipleUsers(
    userIds: string[],
    payload: PushPayload
  ): Promise<{ successCount: number; failCount: number }> {
    let allSubs: any[] = [];
    if (isMongo) {
      allSubs = await PushSubscriptionModel.find({ userId: { $in: userIds } });
    } else {
      const subs = await dbClient.getAllSubscriptions();
      allSubs = subs.filter(s => s.userId && userIds.includes(String(s.userId)));
    }

    const result = await this.dispatchToSubscriptions(allSubs, payload);

    await this.logNotification(
      payload.category || "general",
      payload.title,
      payload.body,
      allSubs.length,
      result.successCount,
      result.failCount,
      payload.url,
      payload.image,
      `multiple (${userIds.length})`
    );

    return result;
  }

  /**
   * 3. Send broadcast push notification to all subscribed users
   */
  static async sendToAllUsers(
    payload: PushPayload
  ): Promise<{ successCount: number; failCount: number }> {
    const subs = await this.getAllSubscriptions();
    const result = await this.dispatchToSubscriptions(subs, payload);

    await this.logNotification(
      payload.category || "general",
      payload.title,
      payload.body,
      subs.length,
      result.successCount,
      result.failCount,
      payload.url,
      payload.image,
      "broadcast"
    );

    return result;
  }

  /**
   * 4. Send Order Notification (Order Placed, Accepted, Packed, Out for Delivery, Delivered, Cancelled)
   */
  static async sendOrderNotification(
    userId: string,
    orderId: string,
    status: "placed" | "accepted" | "packed" | "out_for_delivery" | "delivered" | "cancelled",
    details?: string
  ): Promise<{ successCount: number; failCount: number }> {
    let title = "Order Update";
    let body = `Your order #${orderId.substring(0, 8)} status has been updated.`;
    let category: NotificationCategory = "order_placed";

    switch (status) {
      case "placed":
        title = "📦 Order Placed Successfully!";
        body = `We have received your order #${orderId.substring(0, 8)}. Preparing your items!`;
        category = "order_placed";
        break;
      case "accepted":
        title = "✅ Order Accepted!";
        body = `Your order #${orderId.substring(0, 8)} has been confirmed and is being processed.`;
        category = "order_accepted";
        break;
      case "packed":
        title = "🎒 Order Packed & Ready!";
        body = `Your order #${orderId.substring(0, 8)} is securely packed and waiting for dispatch.`;
        category = "order_packed";
        break;
      case "out_for_delivery":
        title = "🚚 Out for Delivery!";
        body = `Our courier is on the way with your order #${orderId.substring(0, 8)}! Keep your phone handy.`;
        category = "out_for_delivery";
        break;
      case "delivered":
        title = "🎉 Order Delivered!";
        body = `Your order #${orderId.substring(0, 8)} has arrived. Thank you for shopping with Januzen!`;
        category = "delivered";
        break;
      case "cancelled":
        title = "❌ Order Cancelled";
        body = `Your order #${orderId.substring(0, 8)} was cancelled. ${details || "If you paid online, refund is initiated."}`;
        category = "cancelled";
        break;
    }

    if (details && status !== "cancelled") {
      body += ` ${details}`;
    }

    return await this.sendToUser(userId, {
      title,
      body,
      url: "/orders",
      type: "order",
      category,
      requireInteraction: status === "out_for_delivery" || status === "delivered",
      actions: [
        { action: "view", title: "📦 View Order" },
        { action: "dismiss", title: "✖ Dismiss" }
      ]
    });
  }

  /**
   * 5. Send OTP Notification (Registration, Login, Password Reset, High Security)
   */
  static async sendOTPNotification(
    userId: string,
    otpCode: string,
    purpose: string = "account verification"
  ): Promise<{ successCount: number; failCount: number }> {
    const title = "🔑 Januzen Security Verification";
    const body = `Your OTP for ${purpose} is: ${otpCode}. Do not share this code with anyone. Valid for 10 minutes.`;

    return await this.sendToUser(userId, {
      title,
      body,
      url: "/profile?tab=security",
      type: "otp",
      category: "otp",
      requireInteraction: true,
      actions: [
        { action: "verify", title: "🔑 Verify Now" },
        { action: "dismiss", title: "✖ Dismiss" }
      ]
    });
  }

  /**
   * 6. Send Promotional Broadcast Notification
   */
  static async sendPromotionNotification(
    title: string,
    body: string,
    offerUrl?: string,
    imageUrl?: string
  ): Promise<{ successCount: number; failCount: number }> {
    return await this.sendToAllUsers({
      title: title.startsWith("JANUZEN") ? title : `🎁 ${title}`,
      body,
      url: offerUrl || "/shop",
      image: imageUrl,
      type: "promotional_offer",
      category: "promotional_offer",
      actions: [
        { action: "view", title: "🛍️ Shop Offer" },
        { action: "dismiss", title: "✖ Dismiss" }
      ]
    });
  }

  /**
   * 7. Send Payment & Refund Alerts
   */
  static async sendPaymentNotification(
    userId: string,
    type: "payment_successful" | "payment_failed" | "refund_initiated" | "refund_completed",
    amount: number,
    orderId?: string
  ): Promise<{ successCount: number; failCount: number }> {
    let title = "Payment Update";
    let body = "";
    let url = "/orders";

    if (type === "payment_successful") {
      title = "💳 Payment Successful";
      body = `We received ₹${amount} for order #${orderId?.substring(0, 8) || ""}. Thank you!`;
    } else if (type === "payment_failed") {
      title = "⚠️ Payment Failed";
      body = `Your transaction of ₹${amount} failed or was declined. Please retry or choose another payment method.`;
    } else if (type === "refund_initiated") {
      title = "💸 Refund Initiated";
      body = `A refund of ₹${amount} has been initiated to your original payment method. It will reflect in 3-5 business days.`;
    } else if (type === "refund_completed") {
      title = "✅ Refund Processed";
      body = `Your refund of ₹${amount} has been successfully credited to your account.`;
    }

    return await this.sendToUser(userId, {
      title,
      body,
      url,
      type: "payment",
      category: type,
      requireInteraction: type === "payment_failed" || type === "refund_completed"
    });
  }

  /**
   * 8. Send Chat / Support Message Alert
   */
  static async sendChatNotification(
    userId: string,
    senderName: string,
    messageSnippet: string
  ): Promise<{ successCount: number; failCount: number }> {
    return await this.sendToUser(userId, {
      title: `💬 New message from ${senderName}`,
      body: messageSnippet,
      url: "/profile?tab=support",
      type: "chat",
      category: "chat_message",
      actions: [
        { action: "reply", title: "💬 Reply Now" },
        { action: "dismiss", title: "✖ Dismiss" }
      ]
    });
  }
}
