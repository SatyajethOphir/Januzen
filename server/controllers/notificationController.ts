import { Request, Response } from "express";
import { NotificationService, initWebPush, PushPayload } from "../services/notificationService";
import { NotificationLogModel } from "../models/NotificationLog";
import { isMongo } from "../db";

export class NotificationController {
  /**
   * GET /api/push/vapid-public-key
   * Returns the VAPID public key for frontend subscription
   */
  static getVapidPublicKey(req: Request, res: Response): void {
    const { publicKey } = initWebPush();
    res.json({ publicKey });
  }

  /**
   * POST /api/push/subscribe
   * Register or update a user's push subscription
   */
  static async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const { subscription, userId, deviceInfo } = req.body;
      const endpoint = subscription?.endpoint || req.body.endpoint;
      const keys = subscription?.keys || req.body.keys;

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        res.status(400).json({ error: "Invalid push subscription object. Endpoint and p256dh/auth keys are required." });
        return;
      }

      const userAgent = req.headers["user-agent"] || "Unknown Browser";
      const saved = await NotificationService.subscribe(
        endpoint,
        keys,
        userId || undefined,
        deviceInfo || userAgent,
        userAgent
      );

      res.status(201).json({
        message: "Successfully subscribed to web push notifications.",
        subscription: saved
      });
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error in subscribe:", err);
      res.status(500).json({ error: "Failed to save push subscription." });
    }
  }

  /**
   * POST /api/push/refresh-token
   * Update an existing subscription endpoint or keys when rotated by browser
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { oldEndpoint, oldToken, newEndpoint, newToken, newKeys, userId } = req.body;
      const old = oldEndpoint || oldToken;
      const next = newEndpoint || newToken;

      if (!old || !next) {
        res.status(400).json({ error: "oldEndpoint and newEndpoint are required for token refresh." });
        return;
      }

      const updated = await NotificationService.updateSubscription(old, next, newKeys, userId);
      res.json({ message: "Subscription token refreshed successfully.", success: updated });
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error in refreshToken:", err);
      res.status(500).json({ error: "Failed to refresh subscription token." });
    }
  }

  /**
   * DELETE /api/push/unsubscribe
   * Remove a push subscription when user disables notifications or logs out
   */
  static async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const endpoint = req.body.endpoint || req.query.endpoint as string;
      if (!endpoint) {
        res.status(400).json({ error: "Endpoint parameter is required to unsubscribe." });
        return;
      }

      await NotificationService.removeSubscription(endpoint);
      res.json({ message: "Unsubscribed successfully." });
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error in unsubscribe:", err);
      res.status(500).json({ error: "Failed to unsubscribe." });
    }
  }

  /**
   * GET /api/push/subscriptions
   * Get active subscriptions for a user
   */
  static async getUserSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: "userId query parameter is required." });
        return;
      }
      const subs = await NotificationService.getSubscriptionsForUser(userId);
      res.json({ count: subs.length, subscriptions: subs });
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error getting user subscriptions:", err);
      res.status(500).json({ error: "Failed to retrieve subscriptions." });
    }
  }

  // --- ADMIN & SYSTEM NOTIFICATION DISPATCH METHODS ---

  /**
   * POST /api/admin/push/send-user
   */
  static async adminSendToUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId, title, body, url, imageUrl, type, category, actions } = req.body;
      if (!userId || !title || !body) {
        res.status(400).json({ error: "userId, title, and body are required." });
        return;
      }

      const payload: PushPayload = {
        title,
        body,
        url: url || "/",
        image: imageUrl,
        type: type || category || "general",
        category: category || "general",
        actions
      };

      const result = await NotificationService.sendToUser(userId, payload);
      res.json({ message: `Dispatched to user ${userId}`, result });
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error in adminSendToUser:", err);
      res.status(500).json({ error: "Failed to dispatch push to user." });
    }
  }

  /**
   * POST /api/admin/push/send-multiple
   */
  static async adminSendToMultiple(req: Request, res: Response): Promise<void> {
    try {
      const { userIds, title, body, url, imageUrl, type, category } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
        res.status(400).json({ error: "userIds array, title, and body are required." });
        return;
      }

      const payload: PushPayload = {
        title,
        body,
        url: url || "/",
        image: imageUrl,
        type: type || category || "general",
        category: category || "general"
      };

      const result = await NotificationService.sendToMultipleUsers(userIds, payload);
      res.json({ message: `Dispatched to ${userIds.length} users`, result });
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error in adminSendToMultiple:", err);
      res.status(500).json({ error: "Failed to dispatch push to multiple users." });
    }
  }

  /**
   * POST /api/admin/push/send-broadcast
   */
  static async adminSendBroadcast(req: Request, res: Response): Promise<void> {
    try {
      const { title, body, url, imageUrl, type, category } = req.body;
      if (!title || !body) {
        res.status(400).json({ error: "title and body are required." });
        return;
      }

      const payload: PushPayload = {
        title,
        body,
        url: url || "/",
        image: imageUrl,
        type: type || category || "admin_announcement",
        category: category || "admin_announcement"
      };

      const result = await NotificationService.sendToAllUsers(payload);
      res.json({ message: "Broadcast dispatched to all subscribed devices", result });
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error in adminSendBroadcast:", err);
      res.status(500).json({ error: "Failed to broadcast push notification." });
    }
  }

  /**
   * POST /api/admin/push/send-order
   */
  static async adminSendOrderNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, orderId, status, details } = req.body;
      if (!userId || !orderId || !status) {
        res.status(400).json({ error: "userId, orderId, and status are required." });
        return;
      }

      const result = await NotificationService.sendOrderNotification(userId, orderId, status, details);
      res.json({ message: `Order status notification (${status}) dispatched`, result });
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error in adminSendOrderNotification:", err);
      res.status(500).json({ error: "Failed to send order notification." });
    }
  }

  /**
   * POST /api/admin/push/send-otp
   */
  static async adminSendOTPNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, otpCode, purpose } = req.body;
      if (!userId || !otpCode) {
        res.status(400).json({ error: "userId and otpCode are required." });
        return;
      }

      const result = await NotificationService.sendOTPNotification(userId, otpCode, purpose);
      res.json({ message: "High-urgency OTP verification notification dispatched", result });
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error in adminSendOTPNotification:", err);
      res.status(500).json({ error: "Failed to send OTP notification." });
    }
  }

  /**
   * POST /api/admin/push/send-promotion
   */
  static async adminSendPromotion(req: Request, res: Response): Promise<void> {
    try {
      const { title, body, offerUrl, imageUrl } = req.body;
      if (!title || !body) {
        res.status(400).json({ error: "title and body are required for promotion broadcast." });
        return;
      }

      const result = await NotificationService.sendPromotionNotification(title, body, offerUrl, imageUrl);
      res.json({ message: "Promotional offer broadcast dispatched", result });
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error in adminSendPromotion:", err);
      res.status(500).json({ error: "Failed to send promotional broadcast." });
    }
  }

  /**
   * GET /api/admin/push/logs
   */
  static async adminGetLogs(req: Request, res: Response): Promise<void> {
    try {
      if (isMongo) {
        const logs = await NotificationLogModel.find({}).sort({ sentAt: -1 }).limit(100);
        res.json({ count: logs.length, logs });
      } else {
        res.json({ count: 0, logs: [], message: "Notification logs are stored in MongoDB when connected." });
      }
    } catch (err: any) {
      console.error("[PUSH CONTROLLER] Error getting logs:", err);
      res.status(500).json({ error: "Failed to retrieve notification logs." });
    }
  }
}
