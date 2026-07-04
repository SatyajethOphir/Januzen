import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface IPushSubscription {
  id: string;
  userId?: string;
  endpoint: string;
  keys: IPushSubscriptionKeys;
  deviceInfo?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPushSubscriptionDocument extends IPushSubscription, Document {}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDocument>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, index: true },
  endpoint: { type: String, required: true, unique: true, index: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  deviceInfo: { type: String, default: "Web Client" },
  userAgent: { type: String },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
});

// Ensure index on endpoint and userId for fast querying and deduplication
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
PushSubscriptionSchema.index({ userId: 1 });

export const PushSubscriptionModel: Model<IPushSubscriptionDocument> =
  mongoose.models.PushSubscription || mongoose.model<IPushSubscriptionDocument>("PushSubscription", PushSubscriptionSchema);
