import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationCategory =
  | "otp"
  | "order_placed"
  | "order_accepted"
  | "order_packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "payment_successful"
  | "payment_failed"
  | "refund_initiated"
  | "refund_completed"
  | "admin_announcement"
  | "promotional_offer"
  | "stock_alert"
  | "chat_message"
  | "security_alert"
  | "general";

export interface INotificationLog {
  id: string;
  userId?: string; // specific user ID or "broadcast" / "group"
  category: NotificationCategory;
  title: string;
  message: string;
  url?: string;
  imageUrl?: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  status: "sent" | "partial" | "failed";
  sentAt: string;
}

export interface INotificationLogDocument extends INotificationLog, Document {}

const NotificationLogSchema = new Schema<INotificationLogDocument>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, index: true, default: "broadcast" },
  category: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  url: { type: String, default: "/" },
  imageUrl: { type: String },
  recipientCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  status: { type: String, enum: ["sent", "partial", "failed"], default: "sent" },
  sentAt: { type: String, required: true, index: true }
});

NotificationLogSchema.index({ sentAt: -1 });
NotificationLogSchema.index({ category: 1, sentAt: -1 });

export const NotificationLogModel: Model<INotificationLogDocument> =
  mongoose.models.NotificationLog || mongoose.model<INotificationLogDocument>("NotificationLog", NotificationLogSchema);
