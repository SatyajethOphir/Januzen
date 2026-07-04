import mongoose, { Schema } from "mongoose";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { User, Product, Order, Message, Coupon, Review, Notification, WishlistItem, Session, CouponUsage, AuditLog, PushSubscription, Advertisement, PaymentRecord } from "../src/types";

// Check if MongoDB URI is available
export const MONGODB_URI = process.env.MONGODB_URI || "";
export let isMongo = !!MONGODB_URI;

// Databases Paths for fallback
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "database.json");

interface DBStructure {
  users: User[];
  passwords: Record<string, string>; // userId -> hashed_password
  products: Product[];
  orders: Order[];
  messages: Message[];
  newsletter: string[];
  coupons: Coupon[];
  marquee: string;
  marqueeSpeed?: number;
  reviews?: Review[];
  notifications?: Notification[];
  wishlist?: WishlistItem[];
  sessions?: Session[];
  couponUsages?: CouponUsage[];
  auditLogs?: AuditLog[];
  pushSubscriptions?: PushSubscription[];
  advertisements?: Advertisement[];
  paymentRecords?: PaymentRecord[];
}

// Default Seed Data
const INITIAL_PRODUCTS: Product[] = [
  {
    id: "m1",
    name: "Amoxicillin 500mg Capsules",
    description: "Broad-spectrum antibiotic used to treat bacterial infections. Prescription required. Store below 25°C in a dry place.",
    price: 450.00,
    category: "Prescriptions",
    shop: "medicals",
    stock: 45,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop",
    tags: ["Antibiotic", "Infection", "Essential Handhelds"],
    featured: true,
    isActive: true
  },
  {
    id: "m2",
    name: "Metformin 850mg Tablets",
    description: "Oral anti-diabetic drug indicated for type-2 diabetes mellitus management. Aids in blood sugar regulation.",
    price: 240.00,
    category: "Prescriptions",
    shop: "medicals",
    stock: 60,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop",
    tags: ["Diabetes", "Sugar Control", "Maintenance"],
    featured: false,
    isActive: true
  },
  {
    id: "m3",
    name: "Ibuprofen 400mg Rapid Relief",
    description: "Anti-inflammatory and pain reliever. Effective against headaches, muscle pain, fever, and dental discomfort.",
    price: 95.00,
    category: "Over-the-Counter",
    shop: "medicals",
    stock: 120,
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop",
    tags: ["Fast Pain Relief", "Fever reducer", "Anti-inflammatory"],
    featured: true,
    isActive: true
  },
  {
    id: "m4",
    name: "Cetirizine 10mg Allergy Shield",
    description: "24-hour non-drowsy antihistamine for quick relief from running nose, sneezing, itchy eyes, and seasonal pollen allergies.",
    price: 120.00,
    category: "Over-the-Counter",
    shop: "medicals",
    stock: 80,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop",
    tags: ["Histamine Blocker", "Allergies", "Seasonal Relief"],
    featured: false,
    isActive: true
  },
  {
    id: "m5",
    name: "Digital Upper Arm Blood Pressure Monitor",
    description: "Fully automatic, clinical accuracy blood pressure monitor with dynamic cuff size 22-42cm, heart rate tracker, and 90 records memory.",
    price: 2999.00,
    category: "Medical Devices",
    shop: "medicals",
    stock: 15,
    image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop",
    tags: ["Cardio Health", "Home Monitor", "Accurate Diagnostics"],
    featured: true,
    isActive: true
  },
  {
    id: "m6",
    name: "Fingertip Pulse Oximeter",
    description: "Dual-color OLED reader checking oxygen saturation level (SpO2) and pulse rate quickly and accurately. Perfect for home wellness care.",
    price: 1499.00,
    category: "Medical Devices",
    shop: "medicals",
    stock: 3,
    image: "https://images.unsplash.com/photo-1628151015664-7a7442749ec3?w=600&auto=format&fit=crop",
    tags: ["Oxygen Tracker", "Compact Health", "Pulse Reader"],
    featured: false,
    isActive: true
  },
  {
    id: "m7",
    name: "Premium Multi-size Adhesive Bandages Pack",
    description: "Assorted flexible, waterproof fabric bandages with sterile non-stick wound pads to protect cuts and minor abrasions.",
    price: 60.00,
    category: "First Aid",
    shop: "medicals",
    stock: 140,
    image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop",
    tags: ["Waterproof Protection", "Sterile Cuts", "Wound Care"],
    featured: false,
    isActive: true
  },
  {
    id: "m8",
    name: "Complete Emergency First Aid Kit",
    description: "Compact nylon zip container featuring 120 pieces premium sterile and antiseptic components for minor household and driving emergency management.",
    price: 1650.00,
    category: "First Aid",
    shop: "medicals",
    stock: 22,
    image: "https://images.unsplash.com/photo-1607613009820-a2debfb1f7d5?w=600&auto=format&fit=crop",
    tags: ["Survival", "Home Emergency", "Comprehensive Kit"],
    featured: true,
    isActive: true
  },
  {
    id: "m9",
    name: "Multivitamin A-Z Daily Immune Boost",
    description: "Premium micronutrient support formulated with Vitamin C, D3, Zinc, Ginseng, and iron to improve persistent cell energy and robust daily immunity.",
    price: 720.00,
    category: "Wellness & Vitamins",
    shop: "medicals",
    stock: 95,
    image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop",
    tags: ["Immunity Booster", "Zinc Minerals", "Daily Wellness"],
    featured: true,
    isActive: true
  },
  {
    id: "m10",
    name: "High Pure Omega-3 Fish Oil 1000mg",
    description: "Triple-strength softgels packed with EPA and DHA values supporting natural cardiovascular rhythms, mental clarity, and visual precision.",
    price: 890.00,
    category: "Wellness & Vitamins",
    shop: "medicals",
    stock: 65,
    image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop",
    tags: ["Heart Helper", "Brain Booster", "Omega Fatty Acids"],
    featured: false,
    isActive: true
  },
  {
    id: "s1",
    name: "Double A A4 Copy Paper 80gsm",
    description: "Premium smooth copy sheets engineered for high-speed printer execution. Smear-resistant, high brightness level, superb opacity.",
    price: 320.00,
    category: "Office Paper",
    shop: "stationery",
    stock: 250,
    image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop",
    tags: ["Printer Grade", "A4 Premium", "Anti-jam Fibres"],
    featured: true,
    isActive: true
  },
  {
    id: "s2",
    name: "Luxurious Matte Black Fountain Pen",
    description: "Full metal chassis, classic nib, and ink converter kit. Elegantly weighted barrel ensuring fatigue-free journaling cycles.",
    price: 1850.00,
    category: "Writing Instruments",
    shop: "stationery",
    stock: 18,
    image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop",
    tags: ["Luxury Writing", "Elegance Pen", "Refillable Nib"],
    featured: true,
    isActive: true
  },
  {
    id: "s3",
    name: "Retractable Gel Ink Pens (12 Color Set)",
    description: "Vibrant gel dye colors, 0.5mm extra fine tips, smearless fast drying fluid ink. Soft cushioned visual grip sections.",
    price: 450.00,
    category: "Writing Instruments",
    shop: "stationery",
    stock: 90,
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop",
    tags: ["Smear Free", "Fine point", "Journaling Colors"],
    featured: false,
    isActive: true
  },
  {
    id: "s4",
    name: "Classic Hardcover Dot Grid Journal",
    description: "Thick 120gsm inkproof paper, expandible back folder, flat ribbon marker, elastic binding strap. Sturdy elegant leatherette.",
    price: 699.00,
    category: "Notebooks & Diaries",
    shop: "stationery",
    stock: 75,
    image: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop",
    tags: ["Dot Grid", "Journaling Ink", "Threadbound Flat"],
    featured: true,
    isActive: true
  },
  {
    id: "s5",
    name: "Leatherbound Executive Weekly Planner",
    description: "Premium diary detailing weekly slots, monthly goal spreads, project logs, and reference tracking, with luxury gold-edged sheets.",
    price: 1249.00,
    category: "Notebooks & Diaries",
    shop: "stationery",
    stock: 40,
    image: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop",
    tags: ["Executive", "Agenda", "Organized Life"],
    featured: false,
    isActive: true
  },
  {
    id: "s6",
    name: "Expanding Document Accordion Wallet",
    description: "13 tab separate internal pockets, colored divider bookmarks, elastic file clasp. Safe heavy-duty poly construction.",
    price: 349.00,
    category: "Organizers & Files",
    shop: "stationery",
    stock: 80,
    image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&auto=format&fit=crop",
    tags: ["Tax Folder", "Filing Systems", "Accordion Poly"],
    featured: false,
    isActive: true
  },
  {
    id: "s7",
    name: "All-in-one Wire Mesh Desk Organizer Suite",
    description: "Includes letter sorting slots, pencil cups, paper clip bowls, dynamic memo box, and utility drawers in durable black finish.",
    price: 850.00,
    category: "Organizers & Files",
    shop: "stationery",
    stock: 2,
    image: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop",
    tags: ["Tidy Desk", "Workspace Mesh", "Pencil Sorting"],
    featured: true,
    isActive: true
  },
  {
    id: "s8",
    name: "Premium Professional Watercolor Paint Set",
    description: "36 deeply saturated half pans, metal palette case, blending brush, luxury canvas mixing zones. Pure intense organic pigments.",
    price: 2200.00,
    category: "Art Supplies",
    shop: "stationery",
    stock: 15,
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop",
    tags: ["Artist Grade", "Watercolors", "Travel Paint Case"],
    featured: true,
    isActive: true
  }
];

// Mongoose Mongodb Schema Rules
const UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, maxlength: 100 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Invalid email format"
    }
  },
  phone: { type: String, default: "", maxlength: 20 },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  address: { type: String, default: "", maxlength: 500 },
  passwordHash: { type: String, required: true },
  image: {
    type: String,
    default: "",
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        return /^(https?:\/\/|\/)/i.test(v) && !/base64|data:/i.test(v);
      },
      message: "User image must be a valid URL and cannot contain base64 binary stream."
    }
  },
  securityQuestion: { type: String, default: "", maxlength: 200 },
  securityAnswer: { type: String, default: "", maxlength: 200 },
});

const ProductSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 2000 },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, maxlength: 100, index: true },
  shop: { type: String, enum: ["medicals", "stationery"], required: true, index: true },
  stock: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, min: 0 },
  lowStockThreshold: { type: Number, default: 5, min: 0 },
  stockStatus: { type: String, enum: ["in_stock", "low_stock", "out_of_stock"] },
  brand: { type: String, default: "JANUZEN" },
  pricePerPiece: { type: Number, default: 0 },
  piecesPerUnit: { type: Number, default: 1 },
  totalUnitsAvailable: { type: Number, default: 0 },
  image: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^(https?:\/\/|\/)/i.test(v) && !/base64|data:/i.test(v);
      },
      message: "Product image must be a valid URL and cannot contain base64 binary stream."
    }
  },
  tags: [String],
  featured: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
});

const OrderSchema = new Schema({
  id: { type: String, required: true, unique: true },
  orderId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true, maxlength: 100 },
  userEmail: { type: String, required: true },
  items: { type: Schema.Types.Mixed, required: true },
  shippingAddress: { type: Schema.Types.Mixed, required: true },
  totals: { type: Schema.Types.Mixed, required: true },
  deliveryOTP: { type: String },
  status: {
    type: String,
    enum: ["Pending", "Dispatched", "Delivered", "Cancelled", "placed", "confirmed", "processing", "dispatched", "out_for_delivery", "delivered", "cancelled", "returned"],
    default: "Pending",
    index: true
  },
  statusHistory: { type: Schema.Types.Mixed, default: [] },
  paymentMethod: { type: String, default: "Cash on Delivery", maxlength: 100 },
  createdAt: { type: String, required: true, index: true },
});

const WishlistSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  productId: { type: String, required: true, index: true },
  productType: { type: String, enum: ["medicals", "stationery"], required: true },
  addedAt: { type: String, required: true }
});

const MessageSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true },
  subject: { type: String, required: true, maxlength: 200 },
  shop: { type: String, default: "general" },
  message: { type: String, required: true, maxlength: 2000 },
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: String, required: true, index: true },
});

const NewsletterSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
});

const ReviewSchema = new Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true, maxlength: 100 },
  userImage: { type: String, default: "" },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: String, required: true }
});

const NotificationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 150 },
  content: { type: String, required: true, maxlength: 1000 },
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

const SessionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

const CouponUsageSchema = new Schema({
  id: { type: String, required: true, unique: true },
  couponId: { type: String, required: true, index: true },
  couponCode: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  orderId: { type: String, required: true },
  redeemedAt: { type: Date, default: Date.now, index: { expires: 180 * 24 * 60 * 60 } } // auto-expires in 180 days
});

const AuditLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  targetId: { type: String, required: true },
  targetType: { type: String, enum: ["user", "product"], required: true },
  purgedBy: { type: String, required: true },
  timestamp: { type: String, required: true },
  counts: { type: Schema.Types.Mixed, required: true }
});

const PushSubscriptionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, index: true },
  endpoint: { type: String, required: true, unique: true, index: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  createdAt: { type: String, required: true }
});

const AdvertisementSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true, maxlength: 60 },
  body: { type: String, required: true, maxlength: 150 },
  imageUrl: { type: String },
  linkUrl: { type: String },
  sentAt: { type: String, required: true },
  scheduledFor: { type: String },
  status: { type: String, enum: ["sent", "scheduled", "failed"], required: true },
  recipientCount: { type: Number, default: 0 },
  expiresAt: { type: String, required: true, index: true }
});

const PaymentRecordSchema = new Schema({
  id: { type: String, required: true, unique: true },
  razorpayOrderId: { type: String, index: true },
  razorpayPaymentId: { type: String, index: true },
  razorpaySignature: { type: String },
  orderId: { type: String, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String },
  userEmail: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  paymentMethod: { type: String },
  status: { type: String, required: true, index: true },
  verificationStatus: { type: String, required: true },
  refundStatus: { type: String, default: "None" },
  timestamp: { type: String, required: true },
  failureReason: { type: String },
  webhookEvents: { type: Array, default: [] },
  retryCount: { type: Number, default: 0 },
  debitedButUnconfirmed: { type: Boolean, default: false }
});

// Create Mongoose models with any cast to prevent strict TypeScript query schema checking
export const MongoUser = (mongoose.models.User || mongoose.model("User", UserSchema)) as any;
export const MongoProduct = (mongoose.models.Product || mongoose.model("Product", ProductSchema)) as any;
export const MongoOrder = (mongoose.models.Order || mongoose.model("Order", OrderSchema)) as any;
export const MongoMessage = (mongoose.models.Message || mongoose.model("Message", MessageSchema)) as any;
export const MongoNewsletter = (mongoose.models.Newsletter || mongoose.model("Newsletter", NewsletterSchema)) as any;
export const MongoReview = (mongoose.models.Review || mongoose.model("Review", ReviewSchema)) as any;
export const MongoNotification = (mongoose.models.Notification || mongoose.model("Notification", NotificationSchema)) as any;
export const MongoWishlist = (mongoose.models.Wishlist || mongoose.model("Wishlist", WishlistSchema)) as any;
export const MongoSession = (mongoose.models.Session || mongoose.model("Session", SessionSchema)) as any;
export const MongoCouponUsage = (mongoose.models.CouponUsage || mongoose.model("CouponUsage", CouponUsageSchema)) as any;
export const MongoAuditLog = (mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema)) as any;
export const MongoPushSubscription = (mongoose.models.PushSubscription || mongoose.model("PushSubscription", PushSubscriptionSchema)) as any;
export const MongoAdvertisement = (mongoose.models.Advertisement || mongoose.model("Advertisement", AdvertisementSchema)) as any;
export const MongoPaymentRecord = (mongoose.models.PaymentRecord || mongoose.model("PaymentRecord", PaymentRecordSchema)) as any;

// Custom validation error shape to match Mongoose ValidationError structure
export class SchemaValidationError extends Error {
  errors: Record<string, { message: string }>;
  name = "ValidationError";
  constructor(errors: Record<string, string>) {
    super("Validation failed");
    this.errors = {};
    for (const [key, msg] of Object.entries(errors)) {
      this.errors[key] = { message: msg };
    }
  }
}

// Global rigid schema validator to run on both Mongo (pre-validation) and JSON fallback writes
export function validateModelData(modelName: string, data: any) {
  const errors: Record<string, string> = {};

  if (modelName === "User") {
    if (!data.id) errors.id = "User ID is required";
    if (!data.name) errors.name = "Name is required";
    else if (data.name.length > 100) errors.name = "Name exceeds limit of 100 characters";
    
    if (!data.email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Invalid email format";

    if (data.phone && data.phone.length > 20) errors.phone = "Phone number exceeds 20 characters";
    if (data.address && data.address.length > 500) errors.address = "Address exceeds 500 characters";
    if (data.role && !["customer", "admin"].includes(data.role)) errors.role = "Role is invalid";
    
    if (data.image) {
      if (!/^(https?:\/\/|\/)/i.test(data.image) || /base64|data:/i.test(data.image)) {
        errors.image = "User image must be a valid URL and cannot contain base64 binary stream.";
      }
    }
  }

  if (modelName === "Product") {
    if (!data.id) errors.id = "Product ID is required";
    if (!data.name) errors.name = "Product name is required";
    else if (data.name.length > 200) errors.name = "Product name exceeds 200 characters";

    if (!data.description) errors.description = "Product description is required";
    else if (data.description.length > 2000) errors.description = "Product description exceeds 2000 characters";

    if (data.price === undefined || data.price < 0) errors.price = "Price must be a positive number";
    if (!data.category) errors.category = "Category is required";
    else if (data.category.length > 100) errors.category = "Category exceeds 100 characters";

    if (!data.shop || !["medicals", "stationery"].includes(data.shop)) errors.shop = "Shop must be medicals or stationery";
    if (data.stock === undefined || data.stock < 0) errors.stock = "Stock must be a non-negative number";

    if (!data.image) errors.image = "Product image is required";
    else if (!/^(https?:\/\/|\/)/i.test(data.image) || /base64|data:/i.test(data.image)) {
      errors.image = "Product image must be a valid URL and cannot contain base64 binary stream.";
    }
  }

  if (modelName === "Order") {
    if (!data.id) errors.id = "Order ID is required";
    if (!data.orderId) errors.orderId = "Order display ID is required";
    if (!data.userId) errors.userId = "User ID is required";
    if (!data.userName) errors.userName = "User name is required";
    if (data.userName && data.userName.length > 100) errors.userName = "User name exceeds 100 characters";
    if (!data.userEmail) errors.userEmail = "User email is required";
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) errors.items = "Order items list is required";
    if (!data.shippingAddress) errors.shippingAddress = "Shipping address is required";
    if (!data.totals) errors.totals = "Totals calculation is required";
    if (data.status && !["Pending", "Dispatched", "Delivered", "Cancelled", "placed", "confirmed", "processing", "dispatched", "out_for_delivery", "delivered", "cancelled", "returned"].includes(data.status)) {
      errors.status = "Invalid order status value";
    }
  }

  if (modelName === "Review") {
    if (!data.id) errors.id = "Review ID is required";
    if (!data.productId) errors.productId = "Product ID is required";
    if (!data.userId) errors.userId = "User ID is required";
    if (!data.userName) errors.userName = "User name is required";
    else if (data.userName.length > 100) errors.userName = "User name exceeds 100 characters";
    if (data.rating === undefined || data.rating < 1 || data.rating > 5) errors.rating = "Rating must be an integer between 1 and 5";
    if (!data.comment) errors.comment = "Review comment is required";
    else if (data.comment.length > 1000) errors.comment = "Review comment exceeds 1000 characters";
  }

  if (modelName === "Notification") {
    if (!data.id) errors.id = "Notification ID is required";
    if (!data.userId) errors.userId = "User ID target is required";
    if (!data.title) errors.title = "Notification title is required";
    else if (data.title.length > 150) errors.title = "Notification title exceeds 150 characters";
    if (!data.content) errors.content = "Notification content is required";
    else if (data.content.length > 1000) errors.content = "Notification content exceeds 1000 characters";
    if (!data.expiresAt) errors.expiresAt = "Notification expiry time (expiresAt) is required";
  }

  if (modelName === "Session") {
    if (!data.id) errors.id = "Session ID is required";
    if (!data.userId) errors.userId = "User ID is required";
    if (!data.token) errors.token = "Token is required";
    if (!data.expiresAt) errors.expiresAt = "ExpiresAt is required";
  }

  if (modelName === "Coupon") {
    if (!data.code) errors.code = "Coupon code is required";
    if (data.discountType && !["percentage", "fixed"].includes(data.discountType)) errors.discountType = "Discount type is invalid";
    if (data.discountValue === undefined || data.discountValue < 0) errors.discountValue = "Discount value must be a positive number";
  }

  if (Object.keys(errors).length > 0) {
    throw new SchemaValidationError(errors);
  }
}

// JSON DB Fallback implementation
let localDBCache: DBStructure | null = null;

export function loadLocalDB(): DBStructure {
  if (localDBCache) return localDBCache;

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const db: DBStructure = {
        users: [],
        passwords: {},
        products: INITIAL_PRODUCTS,
        orders: [],
        messages: [],
        newsletter: [],
        coupons: [
          { id: "c1", code: "JANUZEN10", discountType: "percentage", discountValue: 10, minBasketValue: 500, isActive: true },
          { id: "c2", code: "FIRST50", discountType: "fixed", discountValue: 50, minBasketValue: 200, isActive: true },
          { id: "c3", code: "RUPEE100", discountType: "fixed", discountValue: 100, minBasketValue: 1000, isActive: true }
        ],
        marquee: "🇮🇳 Authorized Corporate Logistics & Pharmacy Dispatches. High-opacity copypaper and certified standard healthcare kits available. Enjoy Free Secure Freight Delivery on all basket orders above ₹1000!",
        reviews: [],
        notifications: [],
        wishlist: [],
        sessions: [],
        couponUsages: [],
        auditLogs: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
      localDBCache = db;
      return db;
    } else {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      let dirty = false;

      // Force-clear any previously generated test messages, reviews and notifications for pristine live deployment
      if (parsed.messages && parsed.messages.length > 0) {
        parsed.messages = [];
        dirty = true;
      }
      if (parsed.reviews && parsed.reviews.length > 0) {
        parsed.reviews = [];
        dirty = true;
      }
      if (parsed.notifications && parsed.notifications.length > 0) {
        parsed.notifications = [];
        dirty = true;
      }

      if (!parsed.wishlist) {
        parsed.wishlist = [];
        dirty = true;
      }
      if (!parsed.sessions) {
        parsed.sessions = [];
        dirty = true;
      }
      if (!parsed.couponUsages) {
        parsed.couponUsages = [];
        dirty = true;
      }
      if (!parsed.auditLogs) {
        parsed.auditLogs = [];
        dirty = true;
      }
      let productsDirty = false;
      parsed.products = (parsed.products || []).map((p: any) => {
        let updated = false;
        if (p.stockQuantity === undefined) { p.stockQuantity = p.stock; updated = true; }
        if (p.lowStockThreshold === undefined) { p.lowStockThreshold = 5; updated = true; }
        if (p.stockStatus === undefined) {
          const threshold = p.lowStockThreshold || 5;
          p.stockStatus = p.stock === 0 ? "out_of_stock" : (p.stock <= threshold ? "low_stock" : "in_stock");
          updated = true;
        }
        if (p.brand === undefined) { p.brand = "JANUZEN"; updated = true; }
        if (p.piecesPerUnit === undefined) { p.piecesPerUnit = 1; updated = true; }
        if (p.totalUnitsAvailable === undefined) { p.totalUnitsAvailable = p.stock; updated = true; }
        if (p.pricePerPiece === undefined) { p.pricePerPiece = p.price; updated = true; }
        if (updated) productsDirty = true;
        return p;
      });
      if (productsDirty) {
        dirty = true;
      }
      if (!parsed.reviews) {
        parsed.reviews = [];
        dirty = true;
      }
      if (!parsed.notifications) {
        parsed.notifications = [];
        dirty = true;
      }
      if (!parsed.coupons) {
        parsed.coupons = [
          { id: "c1", code: "JANUZEN10", discountType: "percentage", discountValue: 10, minBasketValue: 500, isActive: true },
          { id: "c2", code: "FIRST50", discountType: "fixed", discountValue: 50, minBasketValue: 200, isActive: true },
          { id: "c3", code: "RUPEE100", discountType: "fixed", discountValue: 100, minBasketValue: 1000, isActive: true }
        ];
        dirty = true;
      }
      if (parsed.marquee === undefined) {
        parsed.marquee = "🇮🇳 Authorized Corporate Logistics & Pharmacy Dispatches. High-opacity copypaper and certified standard healthcare kits available. Enjoy Free Secure Freight Delivery on all basket orders above ₹1000!";
        dirty = true;
      }
      if (parsed.marqueeSpeed === undefined) {
        parsed.marqueeSpeed = 30;
        dirty = true;
      }
      if (dirty) {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
      }
      localDBCache = parsed;
      return parsed;
    }
  } catch (error) {
    console.error("Critical: Failed to read/write JSON database file:", error);
    return { users: [], passwords: {}, products: [], orders: [], messages: [], newsletter: [], coupons: [], marquee: "", marqueeSpeed: 30, reviews: [], notifications: [], wishlist: [], sessions: [], couponUsages: [], auditLogs: [] };
  }
}

export function saveLocalDB(db: DBStructure): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    localDBCache = db;
  } catch (e) {
    console.error("Critical: Failed to write JSON database file:", e);
  }
}

// Global Database initialization & seeding for MongoDB if active
export async function connectAndSeedDB() {
  if (isMongo) {
    console.log("🔌 Attempting to connect to MongoDB URI...");
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      console.log("✅ Successfully connected to MongoDB Database Cluster!");

      // Seed core credentials & starter products if they do not exist
      const userCount = await MongoUser.countDocuments();
      if (userCount === 0) {
        console.log("🌱 Database is empty. Seeding initial data rows into MongoDB...");
        
        // Save empty user collection initially for self-service registration
        await MongoUser.create([]);

        // Save Products
        await MongoProduct.create(INITIAL_PRODUCTS);

        console.log("🌱 Seed successfully inserted to MongoDB.");
      } else {
        console.log("📦 Found existing records inside MongoDB. Direct operational connections active.");
      }

      // Automatically prune and clear previous trial/test reviews, notifications, and contact inquiries for live release
      await MongoMessage.deleteMany({});
      await MongoReview.deleteMany({});
      await MongoNotification.deleteMany({});
    } catch (e) {
      console.error("❌ CRITICAL: Failed to connect to MongoDB cluster! Falling back to database.json file:", e);
      isMongo = false;
      loadLocalDB();
      console.log("📁 Offline DB initialized at path: " + DB_FILE);
    }
  } else {
    // Normal fallback initialization
    loadLocalDB();
    console.log("📁 Offline DB initialized at path: " + DB_FILE);
  }
}

// Database Abstraction API exposing async CRUD interfaces
export const dbClient = {
  // Reset / dev seeding
  resetDB: async (): Promise<void> => {
    if (isMongo) {
      await MongoUser.deleteMany({});
      await MongoProduct.deleteMany({});
      await MongoOrder.deleteMany({});
      await MongoMessage.deleteMany({});
      await MongoNewsletter.deleteMany({});
      // Call connectAndSeedDB to recreate
      await connectAndSeedDB();
    } else {
      if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
      }
      localDBCache = null;
      loadLocalDB();
    }
  },

  // Users Auth Methods
  getUsers: async (): Promise<User[]> => {
    if (isMongo) {
      return MongoUser.find().lean() as any;
    } else {
      return loadLocalDB().users;
    }
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    if (isMongo) {
      return MongoUser.findOne({ email: email.toLowerCase() }).lean() as any;
    } else {
      const uArr = loadLocalDB().users;
      return uArr.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
  },

  getUserById: async (id: string): Promise<User | null> => {
    if (isMongo) {
      return MongoUser.findOne({ id }).lean() as any;
    } else {
      const uArr = loadLocalDB().users;
      return uArr.find(u => u.id === id) || null;
    }
  },

  getUserPasswordHash: async (userId: string): Promise<string | null> => {
    if (isMongo) {
      const uDoc = await MongoUser.findOne({ id: userId }).select("passwordHash").lean() as any;
      return uDoc ? uDoc.passwordHash : null;
    } else {
      return loadLocalDB().passwords[userId] || null;
    }
  },

  createUser: async (user: User, passwordHash: string): Promise<User> => {
    if (isMongo) {
      const doc = await MongoUser.create({
        ...user,
        passwordHash
      });
      return doc.toObject() as any;
    } else {
      const db = loadLocalDB();
      db.users.push(user);
      db.passwords[user.id] = passwordHash;
      saveLocalDB(db);
      return user;
    }
  },

  updateUser: async (userId: string, updates: Partial<User>, newPasswordHash?: string): Promise<User | null> => {
    if (isMongo) {
      const updateData: any = { ...updates };
      if (newPasswordHash) {
        updateData.passwordHash = newPasswordHash;
      }
      const updated = await MongoUser.findOneAndUpdate(
        { id: userId },
        { $set: updateData },
        { returnDocument: 'after' }
      ).lean();
      return updated as any;
    } else {
      const db = loadLocalDB();
      const idx = db.users.findIndex(u => u.id === userId);
      if (idx === -1) return null;
      db.users[idx] = { ...db.users[idx], ...updates };
      if (newPasswordHash) {
        db.passwords[userId] = newPasswordHash;
      }
      saveLocalDB(db);
      return db.users[idx];
    }
  },

  resetUserPassword: async (email: string, newPasswordHash: string): Promise<boolean> => {
    if (isMongo) {
      const res = await MongoUser.updateOne(
        { email: email.toLowerCase() },
        { $set: { passwordHash: newPasswordHash } }
      );
      return res.modifiedCount > 0;
    } else {
      const db = loadLocalDB();
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return false;
      db.passwords[user.id] = newPasswordHash;
      saveLocalDB(db);
      return true;
    }
  },

  // Products Methods
  getProducts: async (filters: { shop?: string; category?: string; featured?: boolean; search?: string; includeInactive?: boolean }): Promise<Product[]> => {
    if (isMongo) {
      const mQuery: any = {};
      
      if (!filters.includeInactive) {
        mQuery.isActive = true;
      }
      if (filters.shop) {
        mQuery.shop = filters.shop;
      }
      if (filters.category) {
        mQuery.category = { $regex: new RegExp("^" + filters.category + "$", "i") };
      }
      if (filters.featured !== undefined) {
        mQuery.featured = filters.featured;
      }
      if (filters.search) {
        const keyword = { $regex: new RegExp(filters.search, "i") };
        mQuery.$or = [
          { name: keyword },
          { description: keyword },
          { category: keyword },
          { tags: keyword }
        ];
      }

      return MongoProduct.find(mQuery).lean() as any;
    } else {
      let items = loadLocalDB().products;
      if (!filters.includeInactive) {
        items = items.filter(p => p.isActive);
      }
      if (filters.shop) {
        items = items.filter(p => p.shop === filters.shop);
      }
      if (filters.category) {
        items = items.filter(p => p.category.toLowerCase() === filters.category!.toLowerCase());
      }
      if (filters.featured !== undefined) {
        items = items.filter(p => p.featured === filters.featured);
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        items = items.filter(
          p => p.name.toLowerCase().includes(query) || 
               p.description.toLowerCase().includes(query) ||
               p.tags.some(t => t.toLowerCase().includes(query)) ||
               p.category.toLowerCase().includes(query)
        );
      }
      return items;
    }
  },

  getProductById: async (id: string, includeInactive = false): Promise<Product | null> => {
    if (isMongo) {
      const query: any = { id };
      if (!includeInactive) query.isActive = true;
      return MongoProduct.findOne(query).lean() as any;
    } else {
      const item = loadLocalDB().products.find(p => p.id === id);
      if (!item) return null;
      if (!includeInactive && !item.isActive) return null;
      return item;
    }
  },

  createProduct: async (product: Product): Promise<Product> => {
    product.stockQuantity = product.stock;
    const thresh = product.lowStockThreshold !== undefined ? product.lowStockThreshold : 5;
    product.stockStatus = product.stock === 0 ? "out_of_stock" : (product.stock <= thresh ? "low_stock" : "in_stock");
    if (isMongo) {
      const doc = await MongoProduct.create(product);
      return doc.toObject() as any;
    } else {
      const db = loadLocalDB();
      db.products.push(product);
      saveLocalDB(db);
      return product;
    }
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product | null> => {
    if (updates.stock !== undefined) {
      updates.stockQuantity = updates.stock;
      const thresh = updates.lowStockThreshold !== undefined ? updates.lowStockThreshold : 5;
      updates.stockStatus = updates.stock === 0 ? "out_of_stock" : (updates.stock <= thresh ? "low_stock" : "in_stock");
    }
    if (isMongo) {
      const doc = await MongoProduct.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' }).lean() as any;
      return doc;
    } else {
      const db = loadLocalDB();
      const idx = db.products.findIndex(p => p.id === id);
      if (idx === -1) return null;
      db.products[idx] = { ...db.products[idx], ...updates };
      saveLocalDB(db);
      return db.products[idx];
    }
  },

  // Orders Methods
  getOrders: async (userId?: string): Promise<Order[]> => {
    if (isMongo) {
      const query = userId ? { userId } : {};
      return MongoOrder.find(query).sort({ createdAt: -1 }).lean() as any;
    } else {
      const orderList = loadLocalDB().orders;
      if (userId) {
        return orderList.filter(o => o.userId === userId);
      }
      return orderList;
    }
  },

  createOrder: async (order: Order): Promise<Order> => {
    if (!order.statusHistory || order.statusHistory.length === 0) {
      order.statusHistory = [
        {
          status: "placed",
          timestamp: new Date().toISOString(),
          note: "Order has been successfully placed."
        }
      ];
    }
    if (isMongo) {
      const doc = await MongoOrder.create(order);
      return doc.toObject() as any;
    } else {
      const db = loadLocalDB();
      db.orders.unshift(order);
      saveLocalDB(db);
      return order;
    }
  },

  updateOrderStatus: async (id: string, status: string, note?: string): Promise<Order | null> => {
    if (isMongo) {
      const orderDoc = await MongoOrder.findOne({ id });
      if (!orderDoc) return null;
      const order = orderDoc.toObject() as any;
      
      let stockAdjusted = order.stockAdjusted || false;
      const history = order.statusHistory || [];
      
      history.push({
        status,
        timestamp: new Date().toISOString(),
        note: note || `Order status updated to ${status}`
      });

      let hasStatusOverflow = false;
      if (history.length > 20) {
        hasStatusOverflow = true;
        console.warn(`⚠️ BUG WARNING: Order status history length exceeds 20 entries (${history.length}) for order ID: ${id}`);
      }

      // Stock adjustment logic
      if (status.toLowerCase() === "confirmed" && !stockAdjusted) {
        for (const item of order.items || []) {
          const p = await MongoProduct.findOne({ id: item.productId });
          if (p) {
            const newStock = Math.max(0, p.stock - item.quantity);
            await MongoProduct.updateOne({ id: item.productId }, { 
              $set: { 
                stock: newStock,
                stockQuantity: newStock,
                stockStatus: newStock === 0 ? "out_of_stock" : (newStock <= (p.lowStockThreshold || 5) ? "low_stock" : "in_stock")
              }
            });
          }
        }
        stockAdjusted = true;
      } else if (status.toLowerCase() === "cancelled" && stockAdjusted) {
        for (const item of order.items || []) {
          const p = await MongoProduct.findOne({ id: item.productId });
          if (p) {
            const newStock = p.stock + item.quantity;
            await MongoProduct.updateOne({ id: item.productId }, { 
              $set: { 
                stock: newStock,
                stockQuantity: newStock,
                stockStatus: newStock === 0 ? "out_of_stock" : (newStock <= (p.lowStockThreshold || 5) ? "low_stock" : "in_stock")
              }
            });
          }
        }
        stockAdjusted = false;
      }

      const doc = await MongoOrder.findOneAndUpdate(
        { id },
        { $set: { status, statusHistory: history, stockAdjusted, hasStatusOverflow } },
        { returnDocument: 'after' }
      ).lean() as any;
      return doc;
    } else {
      const db = loadLocalDB();
      const idx = db.orders.findIndex(o => o.id === id);
      if (idx === -1) return null;
      const order = db.orders[idx] as any;
      
      let stockAdjusted = order.stockAdjusted || false;
      const history = order.statusHistory || [];
      
      history.push({
        status,
        timestamp: new Date().toISOString(),
        note: note || `Order status updated to ${status}`
      });

      let hasStatusOverflow = false;
      if (history.length > 20) {
        hasStatusOverflow = true;
        console.warn(`⚠️ BUG WARNING: Order status history length exceeds 20 entries (${history.length}) for order ID: ${id}`);
      }

      // Stock adjustment logic
      if (status.toLowerCase() === "confirmed" && !stockAdjusted) {
        for (const item of order.items || []) {
          const pIdx = db.products.findIndex(p => p.id === item.productId);
          if (pIdx > -1) {
            const p = db.products[pIdx];
            const newStock = Math.max(0, p.stock - item.quantity);
            p.stock = newStock;
            p.stockQuantity = newStock;
            p.stockStatus = newStock === 0 ? "out_of_stock" : (newStock <= (p.lowStockThreshold || 5) ? "low_stock" : "in_stock");
          }
        }
        stockAdjusted = true;
      } else if (status.toLowerCase() === "cancelled" && stockAdjusted) {
        for (const item of order.items || []) {
          const pIdx = db.products.findIndex(p => p.id === item.productId);
          if (pIdx > -1) {
            const p = db.products[pIdx];
            const newStock = p.stock + item.quantity;
            p.stock = newStock;
            p.stockQuantity = newStock;
            p.stockStatus = newStock === 0 ? "out_of_stock" : (newStock <= (p.lowStockThreshold || 5) ? "low_stock" : "in_stock");
          }
        }
        stockAdjusted = false;
      }

      order.status = status as any;
      order.statusHistory = history;
      order.stockAdjusted = stockAdjusted;
      order.hasStatusOverflow = hasStatusOverflow;
      saveLocalDB(db);
      return order;
    }
  },

  // Messages Methods
  getMessages: async (): Promise<Message[]> => {
    if (isMongo) {
      return MongoMessage.find().sort({ createdAt: -1 }).lean() as any;
    } else {
      return loadLocalDB().messages;
    }
  },

  createMessage: async (msg: Message): Promise<Message> => {
    if (isMongo) {
      const doc = await MongoMessage.create(msg);
      return doc.toObject() as any;
    } else {
      const db = loadLocalDB();
      db.messages.unshift(msg);
      saveLocalDB(db);
      return msg;
    }
  },

  markMessageRead: async (id: string): Promise<Message | null> => {
    if (isMongo) {
      const doc = await MongoMessage.findOneAndUpdate({ id }, { $set: { isRead: true } }, { returnDocument: 'after' }).lean() as any;
      return doc;
    } else {
      const db = loadLocalDB();
      const idx = db.messages.findIndex(m => m.id === id);
      if (idx === -1) return null;
      db.messages[idx].isRead = true;
      saveLocalDB(db);
      return db.messages[idx];
    }
  },

  deleteMessage: async (id: string): Promise<boolean> => {
    if (isMongo) {
      const res = await MongoMessage.deleteOne({ id });
      return res.deletedCount > 0;
    } else {
      const db = loadLocalDB();
      const initialLength = db.messages.length;
      db.messages = db.messages.filter(m => m.id !== id);
      if (db.messages.length !== initialLength) {
        saveLocalDB(db);
        return true;
      }
      return false;
    }
  },

  // Newsletter Methods
  addNewsletter: async (email: string): Promise<boolean> => {
    const lowEmail = email.toLowerCase();
    if (isMongo) {
      try {
        await MongoNewsletter.create({ email: lowEmail });
        return true;
      } catch (err: any) {
        // duplicate key or other error
        if (err.code === 11000) return false; // already exists
        throw err;
      }
    } else {
      const db = loadLocalDB();
      if (db.newsletter.includes(lowEmail)) {
        return false;
      }
      db.newsletter.push(lowEmail);
      saveLocalDB(db);
      return true;
    }
  },

  getNewsletter: async (): Promise<string[]> => {
    if (isMongo) {
      const docs = await MongoNewsletter.find().lean() as any[];
      return docs.map(d => d.email);
    } else {
      return loadLocalDB().newsletter;
    }
  },

  decrementProductStock: async (productId: string, quantity: number): Promise<boolean> => {
    if (isMongo) {
      const res = await MongoProduct.updateOne(
        { id: productId, stock: { $geq: quantity } as any },
        { $inc: { stock: -quantity } }
      );
      return res.modifiedCount > 0;
    } else {
      const db = loadLocalDB();
      const p = db.products.find(prod => prod.id === productId);
      if (p && p.stock >= quantity) {
        p.stock -= quantity;
        saveLocalDB(db);
        return true;
      }
      return false;
    }
  },

  getCoupons: async (): Promise<Coupon[]> => {
    const db = loadLocalDB();
    return db.coupons || [];
  },

  createCoupon: async (coupon: Coupon): Promise<Coupon> => {
    const db = loadLocalDB();
    if (!db.coupons) db.coupons = [];
    db.coupons.push(coupon);
    saveLocalDB(db);
    return coupon;
  },

  updateCoupon: async (id: string, updates: Partial<Coupon>): Promise<Coupon | null> => {
    const db = loadLocalDB();
    if (!db.coupons) db.coupons = [];
    const idx = db.coupons.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.coupons[idx] = { ...db.coupons[idx], ...updates };
    saveLocalDB(db);
    return db.coupons[idx];
  },

  deleteCoupon: async (id: string): Promise<boolean> => {
    const db = loadLocalDB();
    if (!db.coupons) db.coupons = [];
    const initialLength = db.coupons.length;
    db.coupons = db.coupons.filter(c => c.id !== id);
    if (db.coupons.length !== initialLength) {
      saveLocalDB(db);
      return true;
    }
    return false;
  },

  getMarquee: async (): Promise<string> => {
    const db = loadLocalDB();
    return db.marquee || "";
  },

  updateMarquee: async (text: string): Promise<string> => {
    const db = loadLocalDB();
    db.marquee = text;
    saveLocalDB(db);
    return text;
  },

  getMarqueeSpeed: async (): Promise<number> => {
    const db = loadLocalDB();
    return db.marqueeSpeed !== undefined ? db.marqueeSpeed : 30;
  },

  updateMarqueeSpeed: async (speed: number): Promise<number> => {
    const db = loadLocalDB();
    db.marqueeSpeed = speed;
    saveLocalDB(db);
    return speed;
  },

  // Reviews Methods
  getReviews: async (productId?: string): Promise<Review[]> => {
    if (isMongo) {
      const q = productId ? { productId } : {};
      return MongoReview.find(q).sort({ createdAt: -1 }).lean() as any;
    } else {
      const db = loadLocalDB();
      const list = db.reviews || [];
      if (productId) {
        return list.filter(r => r.productId === productId);
      }
      return list;
    }
  },

  createReview: async (review: Review): Promise<Review> => {
    if (isMongo) {
      const doc = await MongoReview.create(review);
      return doc.toObject() as any;
    } else {
      const db = loadLocalDB();
      if (!db.reviews) db.reviews = [];
      db.reviews.unshift(review);
      saveLocalDB(db);
      return review;
    }
  },

  deleteReview: async (id: string): Promise<boolean> => {
    if (isMongo) {
      const res = await MongoReview.deleteOne({ id });
      return res.deletedCount > 0;
    } else {
      const db = loadLocalDB();
      if (!db.reviews) db.reviews = [];
      const len = db.reviews.length;
      db.reviews = db.reviews.filter(r => r.id !== id);
      if (db.reviews.length !== len) {
        saveLocalDB(db);
        return true;
      }
      return false;
    }
  },

  // Notifications Methods
  getNotifications: async (userId: string): Promise<Notification[]> => {
    if (isMongo) {
      return MongoNotification.find({ $or: [{ userId }, { userId: "all" }] })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean() as any;
    } else {
      const db = loadLocalDB();
      const list = db.notifications || [];
      return list
        .filter(n => n.userId === userId || n.userId === "all")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4);
    }
  },

  createNotification: async (notif: Notification): Promise<Notification> => {
    // 14 days default unread TTL for optimized MongoDB storage
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    const expiry = new Date(Date.now() + fourteenDays);
    notif.expiresAt = expiry.toISOString();

    validateModelData("Notification", notif);

    if (isMongo) {
      const doc = await MongoNotification.create({
        ...notif,
        expiresAt: expiry // convert to real Date object for Mongoose TTL index
      });

      // Optimize storage: Keep only the 4 most recent notifications for this specific customer
      if (notif.userId !== "all") {
        const userNotifs = await MongoNotification.find({ userId: notif.userId })
          .sort({ createdAt: -1 })
          .select("id")
          .lean();
        if (userNotifs.length > 4) {
          const idsToDelete = userNotifs.slice(4).map((n: any) => n.id);
          await MongoNotification.deleteMany({ id: { $in: idsToDelete } });
        }
      }

      return doc.toObject() as any;
    } else {
      const db = loadLocalDB();
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift(notif);

      // Optimize storage: Keep only the 4 most recent notifications for this specific customer
      if (notif.userId !== "all") {
        let count = 0;
        db.notifications = db.notifications.filter(n => {
          if (n.userId === notif.userId) {
            count++;
            return count <= 4;
          }
          return true;
        });
      }

      saveLocalDB(db);
      return notif;
    }
  },

  markNotificationRead: async (id: string): Promise<boolean> => {
    // 3 days read TTL for optimized MongoDB storage
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const expiry = new Date(Date.now() + threeDays);

    if (isMongo) {
      const res = await MongoNotification.updateOne({ id }, { $set: { isRead: true, expiresAt: expiry } });
      return res.modifiedCount > 0;
    } else {
      const db = loadLocalDB();
      if (!db.notifications) db.notifications = [];
      const item = db.notifications.find(n => n.id === id);
      if (item) {
        item.isRead = true;
        item.expiresAt = expiry.toISOString();
        saveLocalDB(db);
        return true;
      }
      return false;
    }
  },

  getWishlist: async (userId: string): Promise<WishlistItem[]> => {
    if (isMongo) {
      return MongoWishlist.find({ userId }).sort({ addedAt: -1 }).lean() as any;
    } else {
      const db = loadLocalDB();
      const list = db.wishlist || [];
      return list.filter(w => w.userId === userId);
    }
  },

  toggleWishlistItem: async (userId: string, productId: string, productType: 'medicals' | 'stationery'): Promise<{ added: boolean; item?: WishlistItem }> => {
    if (isMongo) {
      const existing = await MongoWishlist.findOne({ userId, productId });
      if (existing) {
        await MongoWishlist.deleteOne({ id: existing.id });
        return { added: false };
      } else {
        const item: WishlistItem = {
          id: "w_" + Math.random().toString(36).substring(2, 11),
          userId,
          productId,
          productType,
          addedAt: new Date().toISOString()
        };
        await MongoWishlist.create(item);
        return { added: true, item };
      }
    } else {
      const db = loadLocalDB();
      if (!db.wishlist) db.wishlist = [];
      const idx = db.wishlist.findIndex(w => w.userId === userId && w.productId === productId);
      if (idx > -1) {
        db.wishlist.splice(idx, 1);
        saveLocalDB(db);
        return { added: false };
      } else {
        const item: WishlistItem = {
          id: "w_" + Math.random().toString(36).substring(2, 11),
          userId,
          productId,
          productType,
          addedAt: new Date().toISOString()
        };
        db.wishlist.push(item);
        saveLocalDB(db);
        return { added: true, item };
      }
    }
  },

  deleteUserWithData: async (userId: string): Promise<boolean> => {
    const res = await dbClient.purgeUser(userId);
    return res && !res.dryRun && res.counts.users > 0;
  },

  purgeUser: async (userId: string, options?: { dryRun?: boolean; purgedBy?: string }): Promise<any> => {
    const dryRun = options?.dryRun ?? false;
    const purgedBy = options?.purgedBy ?? "system";

    // 1. Gather Counts
    let counts = {
      users: 0,
      notifications: 0,
      wishlist: 0,
      reviews: 0,
      orders: 0,
      sessions: 0
    };

    if (isMongo) {
      counts.users = await MongoUser.countDocuments({ id: userId });
      counts.notifications = await MongoNotification.countDocuments({ userId });
      counts.wishlist = await MongoWishlist.countDocuments({ userId });
      counts.reviews = await MongoReview.countDocuments({ userId });
      counts.orders = await MongoOrder.countDocuments({ userId });
      counts.sessions = await MongoSession.countDocuments({ userId });
    } else {
      const db = loadLocalDB();
      counts.users = db.users.filter(u => u.id === userId).length;
      counts.notifications = (db.notifications || []).filter(n => n.userId === userId).length;
      counts.wishlist = (db.wishlist || []).filter(w => w.userId === userId).length;
      counts.reviews = (db.reviews || []).filter(r => r.userId === userId).length;
      counts.orders = db.orders.filter(o => o.userId === userId).length;
      counts.sessions = (db.sessions || []).filter(s => s.userId === userId).length;
    }

    if (dryRun) {
      return {
        dryRun: true,
        targetId: userId,
        targetType: "user",
        counts
      };
    }

    // 2. Perform Cascade Deletion
    if (isMongo) {
      let session: any = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        
        await MongoUser.deleteOne({ id: userId }).session(session);
        await MongoNotification.deleteMany({ userId }).session(session);
        await MongoWishlist.deleteMany({ userId }).session(session);
        await MongoReview.deleteMany({ userId }).session(session);
        await MongoOrder.deleteMany({ userId }).session(session);
        await MongoSession.deleteMany({ userId }).session(session);

        await session.commitTransaction();
      } catch (err: any) {
        if (session) {
          try { await session.abortTransaction(); } catch {}
        }
        if (err.message && (err.message.includes("transaction") || err.message.includes("session") || err.message.includes("replica set"))) {
          console.warn("⚠️ Standalone MongoDB detected. Falling back to explicit ordered delete sequence with error logging...");
          try {
            await MongoUser.deleteOne({ id: userId });
            await MongoNotification.deleteMany({ userId });
            await MongoWishlist.deleteMany({ userId });
            await MongoReview.deleteMany({ userId });
            await MongoOrder.deleteMany({ userId });
            await MongoSession.deleteMany({ userId });
          } catch (fbErr) {
            console.error(`🔴 CRITICAL CASCADE PURGE FAILURE for user id ${userId}:`, fbErr);
            throw fbErr;
          }
        } else {
          console.error(`🔴 Transaction cascade abort for user id ${userId}:`, err);
          throw err;
        }
      } finally {
        if (session) {
          session.endSession();
        }
      }

      // Add audit log
      await MongoAuditLog.create({
        id: "audit-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        targetId: userId,
        targetType: "user",
        purgedBy,
        timestamp: new Date().toISOString(),
        counts
      });

    } else {
      // JSON DB Fallback path - Defined order with file-write locks (atomic load & save)
      try {
        const db = loadLocalDB();
        
        // Delete children first
        if (db.notifications) db.notifications = db.notifications.filter(n => n.userId !== userId);
        if (db.wishlist) db.wishlist = db.wishlist.filter(w => w.userId !== userId);
        if (db.reviews) db.reviews = db.reviews.filter(r => r.userId !== userId);
        db.orders = db.orders.filter(o => o.userId !== userId);
        if (db.sessions) db.sessions = db.sessions.filter(s => s.userId !== userId);
        
        // Parent last
        db.users = db.users.filter(u => u.id !== userId);
        delete db.passwords[userId];

        // Audit Log
        if (!db.auditLogs) db.auditLogs = [];
        db.auditLogs.push({
          id: "audit-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
          targetId: userId,
          targetType: "user",
          purgedBy,
          timestamp: new Date().toISOString(),
          counts
        });

        saveLocalDB(db);
      } catch (err) {
        console.error(`🔴 Fallback JSON CASCADE PURGE FAILURE for user id ${userId}:`, err);
        throw err;
      }
    }

    return {
      dryRun: false,
      targetId: userId,
      targetType: "user",
      counts
    };
  },

  purgeProduct: async (productId: string, options?: { dryRun?: boolean; purgedBy?: string }): Promise<any> => {
    const dryRun = options?.dryRun ?? false;
    const purgedBy = options?.purgedBy ?? "system";

    // 1. Gather Counts
    let counts = {
      products: 0,
      reviews: 0,
      wishlist: 0
    };

    if (isMongo) {
      counts.products = await MongoProduct.countDocuments({ id: productId });
      counts.reviews = await MongoReview.countDocuments({ productId });
      counts.wishlist = await MongoWishlist.countDocuments({ productId });
    } else {
      const db = loadLocalDB();
      counts.products = db.products.filter(p => p.id === productId).length;
      counts.reviews = (db.reviews || []).filter(r => r.productId === productId).length;
      counts.wishlist = (db.wishlist || []).filter(w => w.productId === productId).length;
    }

    if (dryRun) {
      return {
        dryRun: true,
        targetId: productId,
        targetType: "product",
        counts
      };
    }

    // 2. Perform Cascade Deletion
    if (isMongo) {
      let session: any = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        
        await MongoProduct.deleteOne({ id: productId }).session(session);
        await MongoReview.deleteMany({ productId }).session(session);
        await MongoWishlist.deleteMany({ productId }).session(session);

        await session.commitTransaction();
      } catch (err: any) {
        if (session) {
          try { await session.abortTransaction(); } catch {}
        }
        if (err.message && (err.message.includes("transaction") || err.message.includes("session") || err.message.includes("replica set"))) {
          console.warn("⚠️ Standalone MongoDB detected. Falling back to explicit ordered delete sequence for product...");
          try {
            await MongoProduct.deleteOne({ id: productId });
            await MongoReview.deleteMany({ productId });
            await MongoWishlist.deleteMany({ productId });
          } catch (fbErr) {
            console.error(`🔴 CRITICAL PRODUCT CASCADE PURGE FAILURE for product id ${productId}:`, fbErr);
            throw fbErr;
          }
        } else {
          console.error(`🔴 Transaction cascade abort for product id ${productId}:`, err);
          throw err;
        }
      } finally {
        if (session) {
          session.endSession();
        }
      }

      // Add audit log
      await MongoAuditLog.create({
        id: "audit-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        targetId: productId,
        targetType: "product",
        purgedBy,
        timestamp: new Date().toISOString(),
        counts
      });

    } else {
      try {
        const db = loadLocalDB();
        
        // Children first
        if (db.reviews) db.reviews = db.reviews.filter(r => r.productId !== productId);
        if (db.wishlist) db.wishlist = db.wishlist.filter(w => w.productId !== productId);
        
        // Parent last
        db.products = db.products.filter(p => p.id !== productId);

        // Audit Log
        if (!db.auditLogs) db.auditLogs = [];
        db.auditLogs.push({
          id: "audit-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
          targetId: productId,
          targetType: "product",
          purgedBy,
          timestamp: new Date().toISOString(),
          counts
        });

        saveLocalDB(db);
      } catch (err) {
        console.error(`🔴 Fallback JSON PRODUCT CASCADE PURGE FAILURE for product id ${productId}:`, err);
        throw err;
      }
    }

    return {
      dryRun: false,
      targetId: productId,
      targetType: "product",
      counts
    };
  },

  createSession: async (userId: string, userName: string, userEmail: string, token: string): Promise<any> => {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + sevenDays);
    const sessionDoc = {
      id: "sess-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
      userId,
      userName,
      userEmail,
      token,
      createdAt: new Date(),
      expiresAt: expiresAt
    };

    validateModelData("Session", sessionDoc);

    if (isMongo) {
      await MongoSession.create(sessionDoc);
    } else {
      const db = loadLocalDB();
      if (!db.sessions) db.sessions = [];
      db.sessions.push({
        ...sessionDoc,
        createdAt: sessionDoc.createdAt.toISOString() as any,
        expiresAt: sessionDoc.expiresAt.toISOString() as any
      });
      saveLocalDB(db);
    }
    return sessionDoc;
  },

  getAuditLogs: async (): Promise<any[]> => {
    if (isMongo) {
      return MongoAuditLog.find().sort({ timestamp: -1 }).lean() as any;
    } else {
      return (loadLocalDB().auditLogs || []).slice().reverse();
    }
  },

  getStorageUsage: async (): Promise<any> => {
    let totalSize = 0;
    let indexSize = 0;
    const breakdown = [];
    const dbCap = 536870912; // 512MB in bytes

    if (isMongo) {
      try {
        const dbStats = await mongoose.connection.db.command({ dbStats: 1 });
        totalSize = dbStats.dataSize || dbStats.storageSize || 0;
        indexSize = dbStats.indexSize || 0;
      } catch (e) {
        totalSize = 0;
      }

      const list = [
        { name: "Users", model: MongoUser },
        { name: "Products", model: MongoProduct },
        { name: "Orders", model: MongoOrder },
        { name: "Wishlist", model: MongoWishlist },
        { name: "Messages", model: MongoMessage },
        { name: "Newsletter", model: MongoNewsletter },
        { name: "Reviews", model: MongoReview },
        { name: "Notifications", model: MongoNotification },
        { name: "Sessions", model: MongoSession },
        { name: "CouponUsages", model: MongoCouponUsage },
        { name: "AuditLogs", model: MongoAuditLog }
      ];

      let calculatedTotal = 0;
      for (const col of list) {
        try {
          const count = await col.model.countDocuments();
          let size = count * 512; // 0.5KB standard estimate
          if (col.name === "Products" || col.name === "Orders") size = count * 1024; // 1KB estimate
          calculatedTotal += size;
          breakdown.push({
            name: col.name,
            count,
            sizeBytes: size,
            growthPattern: ["Notifications", "Sessions", "AuditLogs", "CouponUsages"].includes(col.name) 
              ? "Grows per event (unbounded)" 
              : "Grows per entity (stable)"
          });
        } catch (err) {
          breakdown.push({ name: col.name, count: 0, sizeBytes: 0, growthPattern: "unknown" });
        }
      }
      if (totalSize === 0) totalSize = calculatedTotal;
    } else {
      const fs = require("fs");
      if (fs.existsSync(DB_FILE)) {
        const statsFile = fs.statSync(DB_FILE);
        totalSize = statsFile.size;
      } else {
        totalSize = 0;
      }
      indexSize = 0;

      const db = loadLocalDB();
      const list = [
        { name: "Users", data: db.users || [] },
        { name: "Products", data: db.products || [] },
        { name: "Orders", data: db.orders || [] },
        { name: "Wishlist", data: db.wishlist || [] },
        { name: "Messages", data: db.messages || [] },
        { name: "Newsletter", data: db.newsletter || [] },
        { name: "Reviews", data: db.reviews || [] },
        { name: "Notifications", data: db.notifications || [] },
        { name: "Sessions", data: db.sessions || [] },
        { name: "CouponUsages", data: db.couponUsages || [] },
        { name: "AuditLogs", data: db.auditLogs || [] }
      ];

      for (const col of list) {
        const sizeBytes = Buffer.byteLength(JSON.stringify(col.data), "utf-8");
        breakdown.push({
          name: col.name,
          count: col.data.length,
          sizeBytes,
          growthPattern: ["Notifications", "Sessions", "AuditLogs", "CouponUsages"].includes(col.name) 
            ? "Grows per event (unbounded)" 
            : "Grows per entity (stable)"
        });
      }
    }

    const percentOfCap = Math.round((totalSize / dbCap) * 10000) / 100;
    return {
      databaseMode: isMongo ? "MongoDB Connected Cluster" : "Local JSON Offline Database",
      totalSizeBytes: totalSize,
      indexSizeBytes: indexSize,
      limitBytes: dbCap,
      percentOfCap,
      breakdown
    };
  },

  runStorageRetention: async (): Promise<{ notificationPurged: number, sessionPurged: number, couponUsagePurged: number }> => {
    let notificationPurged = 0;
    let sessionPurged = 0;
    let couponUsagePurged = 0;

    const now = new Date();

    if (isMongo) {
      const notifRes = await MongoNotification.deleteMany({ expiresAt: { $lte: now } });
      const sessRes = await MongoSession.deleteMany({ expiresAt: { $lte: now } });
      
      const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const couponRes = await MongoCouponUsage.deleteMany({ redeemedAt: { $lte: oneEightyDaysAgo } });

      notificationPurged = notifRes.deletedCount || 0;
      sessionPurged = sessRes.deletedCount || 0;
      couponUsagePurged = couponRes.deletedCount || 0;
    } else {
      const db = loadLocalDB();
      const initialNotifLen = (db.notifications || []).length;
      const initialSessLen = (db.sessions || []).length;
      const initialCouponLen = (db.couponUsages || []).length;

      db.notifications = (db.notifications || []).filter(n => {
        const expiry = n.expiresAt ? new Date(n.expiresAt) : null;
        return !expiry || expiry > now;
      });

      db.sessions = (db.sessions || []).filter(s => {
        const expiry = s.expiresAt ? new Date(s.expiresAt) : null;
        return !expiry || expiry > now;
      });

      const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      db.couponUsages = (db.couponUsages || []).filter(c => {
        const redeemed = c.redeemedAt ? new Date(c.redeemedAt) : null;
        return !redeemed || redeemed > oneEightyDaysAgo;
      });

      notificationPurged = initialNotifLen - db.notifications.length;
      sessionPurged = initialSessLen - db.sessions.length;
      couponUsagePurged = initialCouponLen - db.couponUsages.length;

      saveLocalDB(db);
    }

    try {
      await dbClient.deleteExpiredAdvertisements();
    } catch (e) {
      console.error("[RETENTION] Failed to clean expired advertisements:", e);
    }

    return {
      notificationPurged,
      sessionPurged,
      couponUsagePurged
    };
  },

  saveSubscription: async (sub: PushSubscription): Promise<PushSubscription> => {
    if (isMongo) {
      await MongoPushSubscription.findOneAndUpdate(
        { endpoint: sub.endpoint },
        sub,
        { upsert: true, new: true }
      );
      return sub;
    } else {
      const db = loadLocalDB();
      if (!db.pushSubscriptions) db.pushSubscriptions = [];
      const idx = db.pushSubscriptions.findIndex(s => s.endpoint === sub.endpoint);
      if (idx > -1) {
        db.pushSubscriptions[idx] = sub;
      } else {
        db.pushSubscriptions.push(sub);
      }
      saveLocalDB(db);
      return sub;
    }
  },

  getAllSubscriptions: async (): Promise<PushSubscription[]> => {
    if (isMongo) {
      return await MongoPushSubscription.find({});
    } else {
      const db = loadLocalDB();
      return db.pushSubscriptions || [];
    }
  },

  deleteSubscription: async (endpoint: string): Promise<boolean> => {
    if (isMongo) {
      const res = await MongoPushSubscription.deleteOne({ endpoint });
      return (res.deletedCount || 0) > 0;
    } else {
      const db = loadLocalDB();
      if (!db.pushSubscriptions) db.pushSubscriptions = [];
      const initialLen = db.pushSubscriptions.length;
      db.pushSubscriptions = db.pushSubscriptions.filter(s => s.endpoint !== endpoint);
      saveLocalDB(db);
      return initialLen > db.pushSubscriptions.length;
    }
  },

  createAdvertisement: async (ad: Advertisement): Promise<Advertisement> => {
    if (isMongo) {
      const newAd = new MongoAdvertisement(ad);
      await newAd.save();
      return ad;
    } else {
      const db = loadLocalDB();
      if (!db.advertisements) db.advertisements = [];
      db.advertisements.push(ad);
      saveLocalDB(db);
      return ad;
    }
  },

  getActiveAdvertisements: async (): Promise<Advertisement[]> => {
    if (isMongo) {
      return await MongoAdvertisement.find({}).sort({ sentAt: -1 });
    } else {
      const db = loadLocalDB();
      const ads = db.advertisements || [];
      return [...ads].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    }
  },

  deleteExpiredAdvertisements: async (): Promise<number> => {
    const now = new Date().toISOString();
    if (isMongo) {
      const res = await MongoAdvertisement.deleteMany({ expiresAt: { $lte: now } });
      return res.deletedCount || 0;
    } else {
      const db = loadLocalDB();
      if (!db.advertisements) db.advertisements = [];
      const initialLen = db.advertisements.length;
      db.advertisements = db.advertisements.filter(ad => ad.expiresAt > now);
      const deletedCount = initialLen - db.advertisements.length;
      if (deletedCount > 0) {
        saveLocalDB(db);
      }
      return deletedCount;
    }
  },

  createPaymentRecord: async (record: PaymentRecord): Promise<PaymentRecord> => {
    if (isMongo) {
      const newRec = new MongoPaymentRecord(record);
      await newRec.save();
      return record;
    } else {
      const db = loadLocalDB();
      if (!db.paymentRecords) db.paymentRecords = [];
      db.paymentRecords.push(record);
      saveLocalDB(db);
      return record;
    }
  },

  getPaymentRecordById: async (id: string): Promise<PaymentRecord | null> => {
    if (isMongo) {
      return await MongoPaymentRecord.findOne({ id }).lean() as any;
    } else {
      const db = loadLocalDB();
      const list = db.paymentRecords || [];
      return list.find(r => r.id === id) || null;
    }
  },

  getPaymentRecordByRazorpayOrderId: async (razorpayOrderId: string): Promise<PaymentRecord | null> => {
    if (isMongo) {
      return await MongoPaymentRecord.findOne({ razorpayOrderId }).lean() as any;
    } else {
      const db = loadLocalDB();
      const list = db.paymentRecords || [];
      return list.find(r => r.razorpayOrderId === razorpayOrderId) || null;
    }
  },

  getPaymentRecordsByUserId: async (userId: string): Promise<PaymentRecord[]> => {
    if (isMongo) {
      return await MongoPaymentRecord.find({ userId }).sort({ timestamp: -1 }).lean() as any;
    } else {
      const db = loadLocalDB();
      const list = db.paymentRecords || [];
      return list.filter(r => r.userId === userId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
  },

  updatePaymentRecord: async (id: string, updates: Partial<PaymentRecord>): Promise<PaymentRecord | null> => {
    if (isMongo) {
      return await MongoPaymentRecord.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean() as any;
    } else {
      const db = loadLocalDB();
      if (!db.paymentRecords) db.paymentRecords = [];
      const idx = db.paymentRecords.findIndex(r => r.id === id);
      if (idx === -1) return null;
      db.paymentRecords[idx] = { ...db.paymentRecords[idx], ...updates };
      saveLocalDB(db);
      return db.paymentRecords[idx];
    }
  }
};
