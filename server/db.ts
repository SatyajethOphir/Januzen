import mongoose, { Schema } from "mongoose";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { User, Product, Order, Message, Coupon, Review, Notification, WishlistItem } from "../src/types";

// Check if MongoDB URI is available
export const MONGODB_URI = process.env.MONGODB_URI || "";
export const isMongo = !!MONGODB_URI;

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
  reviews?: Review[];
  notifications?: Notification[];
  wishlist?: WishlistItem[];
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
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: "" },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  address: { type: String, default: "" },
  passwordHash: { type: String, required: true },
  image: { type: String, default: "" },
  securityQuestion: { type: String, default: "" },
  securityAnswer: { type: String, default: "" },
});

const ProductSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  shop: { type: String, enum: ["medicals", "stationery"], required: true },
  stock: { type: Number, required: true },
  stockQuantity: { type: Number },
  lowStockThreshold: { type: Number, default: 5 },
  stockStatus: { type: String, enum: ["in_stock", "low_stock", "out_of_stock"] },
  image: { type: String, required: true },
  tags: [String],
  featured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
});

const OrderSchema = new Schema({
  id: { type: String, required: true, unique: true },
  orderId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  items: { type: Schema.Types.Mixed, required: true },
  shippingAddress: { type: Schema.Types.Mixed, required: true },
  totals: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["Pending", "Dispatched", "Delivered", "Cancelled", "placed", "confirmed", "processing", "dispatched", "out_for_delivery", "delivered", "cancelled", "returned"], default: "Pending" },
  statusHistory: { type: Schema.Types.Mixed, default: [] },
  paymentMethod: { type: String, default: "Cash on Delivery" },
  createdAt: { type: String, required: true },
});

const WishlistSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  productType: { type: String, enum: ["medicals", "stationery"], required: true },
  addedAt: { type: String, required: true }
});

const MessageSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  shop: { type: String, default: "general" },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
});

const NewsletterSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
});

const ReviewSchema = new Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userImage: { type: String, default: "" },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  createdAt: { type: String, required: true }
});

const NotificationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: String, required: true }
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
        wishlist: []
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
      if (dirty) {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
      }
      localDBCache = parsed;
      return parsed;
    }
  } catch (error) {
    console.error("Critical: Failed to read/write JSON database file:", error);
    return { users: [], passwords: {}, products: [], orders: [], messages: [], newsletter: [], coupons: [], marquee: "" };
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
      await mongoose.connect(MONGODB_URI);
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
        { new: true }
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
      const doc = await MongoProduct.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean() as any;
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
        { $set: { status, statusHistory: history, stockAdjusted } },
        { new: true }
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
      const doc = await MongoMessage.findOneAndUpdate({ id }, { $set: { isRead: true } }, { new: true }).lean() as any;
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
      return MongoNotification.find({ $or: [{ userId }, { userId: "all" }] }).sort({ createdAt: -1 }).lean() as any;
    } else {
      const db = loadLocalDB();
      const list = db.notifications || [];
      return list.filter(n => n.userId === userId || n.userId === "all");
    }
  },

  createNotification: async (notif: Notification): Promise<Notification> => {
    if (isMongo) {
      const doc = await MongoNotification.create(notif);
      return doc.toObject() as any;
    } else {
      const db = loadLocalDB();
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift(notif);
      saveLocalDB(db);
      return notif;
    }
  },

  markNotificationRead: async (id: string): Promise<boolean> => {
    if (isMongo) {
      const res = await MongoNotification.updateOne({ id }, { $set: { isRead: true } });
      return res.modifiedCount > 0;
    } else {
      const db = loadLocalDB();
      if (!db.notifications) db.notifications = [];
      const item = db.notifications.find(n => n.id === id);
      if (item) {
        item.isRead = true;
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
    if (isMongo) {
      const res = await MongoUser.deleteOne({ id: userId });
      await MongoNotification.deleteMany({ userId });
      await MongoWishlist.deleteMany({ userId });
      await MongoReview.deleteMany({ userId });
      await MongoOrder.deleteMany({ userId });
      return res.deletedCount > 0;
    } else {
      const db = loadLocalDB();
      const len = db.users.length;
      db.users = db.users.filter(u => u.id !== userId);
      delete db.passwords[userId];
      if (db.notifications) {
        db.notifications = db.notifications.filter(n => n.userId !== userId);
      }
      if (db.wishlist) {
        db.wishlist = db.wishlist.filter(w => w.userId !== userId);
      }
      if (db.reviews) {
        db.reviews = db.reviews.filter(r => r.userId !== userId);
      }
      db.orders = db.orders.filter(o => o.userId !== userId);
      saveLocalDB(db);
      return db.users.length !== len;
    }
  }
};
