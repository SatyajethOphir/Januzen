import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { NotificationController } from "../controllers/notificationController";

const JWT_SECRET = process.env.JWT_SECRET || "JANUZEN_JWT_SECRET_KEY";

// Admin authentication middleware for protected notification routes
export const authenticateAdminRoute = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required for administrative notification actions" });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.role === "admin") {
      (req as any).user = decoded;
      next();
    } else {
      res.status(403).json({ error: "Administrative privilege required to dispatch push broadcasts" });
    }
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired authorization token" });
  }
};

export const createNotificationRoutes = (customAdminAuth?: (req: Request, res: Response, next: NextFunction) => void): Router => {
  const router = Router();
  const adminAuth = customAdminAuth || authenticateAdminRoute;

  // --- PUBLIC PUSH SUBSCRIPTION ROUTES ---
  router.get("/vapid-public-key", NotificationController.getVapidPublicKey);
  router.post("/subscribe", NotificationController.subscribe);
  router.post("/refresh-token", NotificationController.refreshToken);
  router.delete("/unsubscribe", NotificationController.unsubscribe);
  router.get("/subscriptions", NotificationController.getUserSubscriptions);

  // --- ADMIN & SYSTEM DISPATCH ROUTES ---
  router.post("/admin/send-user", adminAuth, NotificationController.adminSendToUser);
  router.post("/admin/send-multiple", adminAuth, NotificationController.adminSendToMultiple);
  router.post("/admin/send-broadcast", adminAuth, NotificationController.adminSendBroadcast);
  router.post("/admin/send-order", adminAuth, NotificationController.adminSendOrderNotification);
  router.post("/admin/send-otp", adminAuth, NotificationController.adminSendOTPNotification);
  router.post("/admin/send-promotion", adminAuth, NotificationController.adminSendPromotion);
  router.get("/admin/logs", adminAuth, NotificationController.adminGetLogs);

  return router;
};

export default createNotificationRoutes;
