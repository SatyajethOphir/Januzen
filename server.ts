import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import fs from "fs";
import { Product, User, Order, Message } from "./src/types";
import { dbClient, connectAndSeedDB, isMongo } from "./server/db";
import sitemapRouter from "./server/routes/sitemap";
import { generateInvoice, generateOfflineBill } from "./server/invoice";
import { sendInvoiceEmail, sendOfflineBillEmail, testSmtpConnection } from "./server/mailer";
import webpush from "web-push";

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "JANUZEN_JWT_SECRET_KEY";
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "phoenix123&";

// Initialize Web Push VAPID Details
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:team@januzen.in",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log("🚀 [WEBPUSH] VAPID details configured successfully.");
} else {
  console.warn("⚠️ [WEBPUSH] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing from environment. Push notifications will be disabled.");
}

interface SseConnection {
  userId: string;
  role: string;
  res: any;
}
const sseConnections = new Set<SseConnection>();

function sendRealtimeNotification(userId: string, notification: any) {
  for (const conn of sseConnections) {
    if (conn.userId === userId) {
      try {
        conn.res.write(`event: notification\n`);
        conn.res.write(`data: ${JSON.stringify(notification)}\n\n`);
      } catch (err) {
        console.error("Error writing SSE notification:", err);
      }
    }
  }
}

async function createAndSendNotification(userId: string, title: string, content: string) {
  const notif = {
    id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    userId,
    title: title.startsWith("JANUZEN") ? title : "JANUZEN | " + title,
    content,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  await dbClient.createNotification(notif);
  sendRealtimeNotification(userId, notif);
  return notif;
}


const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

interface SystemSettings {
  shippingCostPerKm: number;
  deliveryDistanceKms: number;
  gstPercentage: number;
}

let systemSettings: SystemSettings = {
  shippingCostPerKm: 15,
  deliveryDistanceKms: 10,
  gstPercentage: 5,
};

function loadSystemSettings() {
  try {
    const parentDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      systemSettings = { ...systemSettings, ...JSON.parse(data) };
      console.log("💾 Hydrated dynamic settings from settings.json:", systemSettings);
    } else {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(systemSettings, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Failed to load settings.json, defaults active:", err);
  }
}
loadSystemSettings();

function saveSystemSettings() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(systemSettings, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save settings.json:", err);
  }
}

// In-memory file upload middleware
const filterMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB weight limit
});

async function startServer() {
  const app = express();

  // Force HTTPS in production
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, "https://" + req.headers.host + req.url);
    }
    next();
  });



  // Sitemap routing
  app.use("/", sitemapRouter);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Set up headers for CORS or static
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Authentication Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token is missing" });
    }

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(403).json({ error: "Access token is invalid or expired" });
    }
  };

  const authenticateAdmin = (req: any, res: any, next: any) => {
    authenticateToken(req, res, () => {
      if (req.user && req.user.role === "admin") {
        next();
      } else {
        res.status(403).json({ error: "Administrative privilege required" });
      }
    });
  };

  // --- API ROUTES ---

  // --- WEBPUSH & ADVERTISEMENT SYSTEM ROUTES ---

  // Public: subscribe to push notifications
  app.post("/api/push/subscribe", async (req, res) => {
    const { subscription, userId } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Invalid subscription object." });
    }
    try {
      const saved = await dbClient.saveSubscription({
        id: "sub_" + Date.now(),
        userId: userId || undefined,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        createdAt: new Date().toISOString()
      });
      res.status(201).json({ message: "Subscribed to push notifications.", subscription: saved });
    } catch (e: any) {
      console.error("[PUSH SUBSCRIBE] Error:", e);
      res.status(500).json({ error: "Failed to save push subscription." });
    }
  });

  // Public: Get VAPID Public Key for subscription on frontend
  app.get("/api/push/vapid-public-key", (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  // Admin: Send push advertisement to all active subscribers
  app.post("/api/admin/advertisement/send", authenticateAdmin, async (req, res) => {
    const { title, body, imageUrl, linkUrl } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required." });
    }

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return res.status(400).json({ error: "VAPID keys are not configured on the server. Unable to send push notifications." });
    }

    try {
      const subscriptions = await dbClient.getAllSubscriptions();
      const payload = JSON.stringify({
        title,
        body,
        image: imageUrl || undefined,
        url: linkUrl || "https://januzen.in"
      });

      let successCount = 0;
      let failCount = 0;

      // Send to all subscriptions — clean up dead subscriptions as they fail
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            payload
          );
          successCount++;
        } catch (sendErr: any) {
          failCount++;
          // 410 Gone / 404 means the subscription is no longer valid — remove it
          if (sendErr.statusCode === 410 || sendErr.statusCode === 404) {
            await dbClient.deleteSubscription(sub.endpoint);
          }
        }
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

      const ad = await dbClient.createAdvertisement({
        id: "ad_" + Date.now(),
        title,
        body,
        imageUrl,
        linkUrl,
        sentAt: now.toISOString(),
        status: "sent",
        recipientCount: successCount,
        expiresAt
      });

      res.status(201).json({
        message: `Advertisement sent to ${successCount} subscriber(s). ${failCount} delivery failure(s).`,
        advertisement: ad
      });
    } catch (e: any) {
      console.error("[AD SEND] Error:", e);
      res.status(500).json({ error: "Failed to send advertisement." });
    }
  });

  // Admin: Get history of active advertisements
  app.get("/api/admin/advertisement/history", authenticateAdmin, async (req, res) => {
    try {
      const ads = await dbClient.getActiveAdvertisements();
      res.json({ advertisements: ads });
    } catch (e: any) {
      console.error("[AD HISTORY] Error:", e);
      res.status(500).json({ error: "Failed to fetch advertisement history." });
    }
  });

  // Admin: Get subscriber count
  app.get("/api/admin/push/subscribers-count", authenticateAdmin, async (req, res) => {
    try {
      const subscriptions = await dbClient.getAllSubscriptions();
      res.json({ count: subscriptions.length });
    } catch (e: any) {
      console.error("[PUSH COUNT] Error:", e);
      res.status(500).json({ error: "Failed to get subscriber count." });
    }
  });

  // Auth: Register
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, phone, address, role, adminKey, securityQuestion, securityAnswer, image } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required fields" });
    }

    try {
      const existing = await dbClient.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "This email is already registered." });
      }

      let resolvedRole: "customer" | "admin" = "customer";
      if (role === "admin") {
        if (adminKey === ADMIN_SECRET_KEY) {
          resolvedRole = "admin";
        } else {
          return res.status(403).json({ error: "Invalid Admin secret key provided." });
        }
      }

      const salt = bcrypt.genSaltSync(12);
      const hash = bcrypt.hashSync(password, salt);
      
      const newUser: User = {
        id: "u_" + Date.now(),
        name,
        email: email.toLowerCase(),
        phone: phone || "",
        address: address || "",
        role: resolvedRole,
        image: image || "",
        securityQuestion: securityQuestion || "What was your childhood nickname?",
        securityAnswer: securityAnswer || "satya"
      };

      await dbClient.createUser(newUser, hash);

      const token = jwt.sign(
        { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Track the session write
      await dbClient.createSession(newUser.id, newUser.name, newUser.email, token);

      // Dynamic Nodemailer Simulator Alert log
      console.log(`[EMAIL DISPATCH] TO: ${email} | SUBJECT: Welcome to JANUZEN Enterprise | CONTENT: Thank you for registering, ${name}! Your account is active. Welcome to Nuthan Medicals & JA Stationery.`);

      res.status(201).json({
        message: "Registration successful. Welcome to JANUZEN!",
        token,
        user: newUser
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error during registration." });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required fields" });
    }

    try {
      const user = await dbClient.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      const hash = await dbClient.getUserPasswordHash(user.id);
      if (!hash || !bcrypt.compareSync(password, hash)) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Track the session write
      await dbClient.createSession(user.id, user.name, user.email, token);

      res.json({
        message: "Login successful.",
        token,
        user
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error during login." });
    }
  });

  // Auth: Profile
  app.get("/api/auth/profile", authenticateToken, async (req: any, res) => {
    try {
      const user = await dbClient.getUserByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({ error: "Profile not found." });
      }
      res.json({ user });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error retrieving profile." });
    }
  });

  // Auth: Update Profile
  app.put("/api/auth/profile", authenticateToken, async (req: any, res) => {
    const { name, phone, address, image, password } = req.body;
    try {
      const user = await dbClient.getUserByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({ error: "Profile not found." });
      }

      const updates: Partial<User> = {};
      if (name) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (address !== undefined) updates.address = address;
      if (image !== undefined) updates.image = image;

      let newPasswordHash: string | undefined;
      if (password) {
        const salt = bcrypt.genSaltSync(12);
        newPasswordHash = bcrypt.hashSync(password, salt);
      }

      const updatedUser = await dbClient.updateUser(user.id, updates, newPasswordHash);
      res.json({ message: "Profile updated successfully.", user: updatedUser });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error updating profile information." });
    }
  });

  // Auth: Get Security Question
  app.get("/api/auth/security-question", async (req, res) => {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required." });
    }
    try {
      const user = await dbClient.getUserByEmail(email as string);
      if (!user) {
        return res.status(404).json({ error: "No registered accounts found with this email." });
      }
      res.json({ 
        securityQuestion: user.securityQuestion || "What was your childhood nickname?" 
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Database retrieval error." });
    }
  });

  // Auth: Recover/Reset Password
  app.post("/api/auth/recover-password", async (req, res) => {
    const { email, securityAnswer, newPassword } = req.body;
    if (!email || !securityAnswer || !newPassword) {
      return res.status(400).json({ error: "Email, security answer, and new password are required." });
    }
    try {
      const user = await dbClient.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "Incorrect credentials or account not found." });
      }
      if (!user.securityAnswer || user.securityAnswer.toLowerCase().trim() !== securityAnswer.toLowerCase().trim()) {
        return res.status(400).json({ error: "Incorrect answer to security question." });
      }
      
      const salt = bcrypt.genSaltSync(12);
      const hash = bcrypt.hashSync(newPassword, salt);
      await dbClient.resetUserPassword(email, hash);
      
      console.log(`[EMAIL DISPATCH] TO: ${email} | SUBJECT: JANUZEN Account Password Reset | CONTENT: Your account password has been successfully reset. If this was not you, please contact client support.`);

      res.json({ message: "Password has been successfully recovered and updated." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal error resetting password." });
    }
  });

  // Upload asset image — tries Cloudinary first, falls back to GitHub
  // Cloudinary: primary storage (fast CDN, image transformations)
  // GitHub:     fallback storage (free, reliable, public raw URLs)
  app.post("/api/upload", authenticateAdmin, filterMulter.single("file"), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Please provide a file to upload." });
    }

    const hasCloudinary = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    const hasGitHub = !!(
      process.env.GITHUB_TOKEN &&
      process.env.GITHUB_OWNER &&
      process.env.GITHUB_REPO
    );

    // ── LAYER 1: Cloudinary (primary) ──────────────────────────────────────
    if (hasCloudinary) {
      try {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });

        const uploadToCloudinary = (buffer: Buffer): Promise<any> => {
          return new Promise((resolve, reject) => {
            const writeStream = cloudinary.uploader.upload_stream(
              { folder: "januzen_products", resource_type: "auto" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            writeStream.end(buffer);
          });
        };

        const result = await uploadToCloudinary(req.file.buffer);

        return res.status(200).json({
          message: "Image uploaded successfully!",
          url: result.secure_url,
          public_id: result.public_id,
          source: "cloudinary"
        });
      } catch (cloudinaryErr: any) {
        // Cloudinary failed — log and fall through to GitHub
        console.warn(
          "[UPLOAD] Cloudinary failed, attempting GitHub fallback:",
          cloudinaryErr.message
        );
      }
    } else {
      console.warn("[UPLOAD] Cloudinary credentials not configured, trying GitHub fallback.");
    }

    // ── LAYER 2: GitHub (fallback) ─────────────────────────────────────────
    if (!hasGitHub) {
      return res.status(500).json({
        error: hasCloudinary
          ? "Cloudinary upload failed and GitHub fallback is not configured. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables."
          : "No image storage configured. Please set Cloudinary or GitHub environment variables."
      });
    }

    try {
      const owner = process.env.GITHUB_OWNER!;
      const repo = process.env.GITHUB_REPO!;
      const branch = process.env.GITHUB_BRANCH || "main";

      // Build a unique, clean filename
      const timestamp = Date.now();
      const safeName = req.file.originalname
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9.\-_]/g, "")
        .toLowerCase();
      const fileName = `${timestamp}-${safeName}`;
      const filePath = `uploads/${fileName}`;

      // GitHub Contents API requires base64-encoded file content
      const base64Content = req.file.buffer.toString("base64");

      const githubResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "JANUZEN-Portal"
          },
          body: JSON.stringify({
            message: `chore: upload product image ${fileName}`,
            content: base64Content,
            branch
          })
        }
      );

      if (!githubResponse.ok) {
        const errBody = await githubResponse.json().catch(() => ({}));
        throw new Error(
          `GitHub API ${githubResponse.status}: ${(errBody as any).message || "Unknown error"}`
        );
      }

      const githubData = await githubResponse.json();

      // raw.githubusercontent.com serves files directly — no auth needed for public repos
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

      return res.status(200).json({
        message: "Image uploaded successfully via GitHub!",
        url: rawUrl,
        public_id: githubData.content?.sha || fileName,
        source: "github"
      });
    } catch (githubErr: any) {
      console.error("[UPLOAD] GitHub fallback failed:", githubErr.message);
      return res.status(500).json({
        error: "Image upload failed on both Cloudinary and GitHub.",
        details: githubErr.message
      });
    }
  });

  // Products: Filtered List
  app.get("/api/products", async (req, res) => {
    const { shop, category, priceMin, priceMax, search, sort, featured, page = "1", limit = "100" } = req.query;

    try {
      const filterArgs: any = {};
      if (shop) filterArgs.shop = shop as string;
      if (category) filterArgs.category = category as string;
      if (featured === "true") filterArgs.featured = true;
      if (search) filterArgs.search = search as string;

      let result = await dbClient.getProducts(filterArgs);

      // In-memory filter bounds representation if defined
      if (priceMin) {
        result = result.filter(p => p.price >= parseFloat(priceMin as string));
      }
      if (priceMax) {
        result = result.filter(p => p.price <= parseFloat(priceMax as string));
      }

      // Sort matching
      if (sort === "price-asc") {
        result.sort((a, b) => a.price - b.price);
      } else if (sort === "price-desc") {
        result.sort((a, b) => b.price - a.price);
      } else if (sort === "name-asc") {
        result.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sort === "name-desc") {
        result.sort((a, b) => b.name.localeCompare(a.name));
      }

      // Pagination
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const total = result.length;
      const pages = Math.ceil(total / limitNum);
      const offset = (pageNum - 1) * limitNum;
      const paginatedProducts = result.slice(offset, offset + limitNum);

      res.json({
        products: paginatedProducts,
        total,
        page: pageNum,
        pages,
        limit: limitNum
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error listing products." });
    }
  });

  // Get active distinct categories & ranges for a shop
  app.get("/api/meta/categories", async (req, res) => {
    const { shop } = req.query;
    try {
      const products = await dbClient.getProducts(shop ? { shop: shop as string } : {});
      const categories = Array.from(new Set(products.map(p => p.category)));
      res.json({ categories });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error fetching metadata." });
    }
  });

  // Products: Single Product
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await dbClient.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found or currently unavailable" });
      }
      res.json(product);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error retrieving product details." });
    }
  });

  // Admin Offline Bill Generator Route
  app.post("/api/admin/offline-bill", authenticateAdmin, async (req: any, res: any) => {
    try {
      const { customerName, customerPhone, customerEmail, shopDivision, items, deliveryMethod } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "At least one item is required to generate a bill." });
      }

      const subtotal = items.reduce((sum, item) => sum + (Number(item.unitPrice) * Number(item.quantity)), 0);
      const tax = Math.round((subtotal * 0.05) * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;
      const belowMinimum = total < 750;
      const billNumber = `JZ-OFFLINE-${Date.now()}`;

      const pdfBuffer = await generateOfflineBill({
        billNumber,
        customerName: customerName || "Walk-in Customer",
        customerPhone,
        shopDivision: shopDivision || "mixed",
        items: items.map(it => ({
          name: it.name,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice)
        })),
        totals: { subtotal, tax, total },
        belowMinimum
      });

      if (deliveryMethod === "email") {
        if (!customerEmail) {
          return res.status(400).json({ error: "Customer email is required for email delivery." });
        }
        await sendOfflineBillEmail({
          customerName: customerName || "Walk-in Customer",
          customerEmail,
          billNumber,
          total
        }, pdfBuffer);

        return res.json({
          message: `Bill sent to ${customerEmail} successfully.`,
          billNumber,
          belowMinimum,
          total
        });
      }

      // Default PDF headers for other delivery methods
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="JANUZEN-Bill-${billNumber}.pdf"`);
      res.setHeader("X-Bill-Number", billNumber);
      res.setHeader("X-Below-Minimum", belowMinimum.toString());
      res.setHeader("X-Total", total.toString());

      if (deliveryMethod === "whatsapp") {
        const cleanPhone = (customerPhone || "").replace(/[^0-9+]/g, "");
        res.setHeader("X-WhatsApp-Link", `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
          `Hi! Here is your bill from JANUZEN.\nBill No: ${billNumber}\nTotal: ₹${total}\nFor details: team@januzen.in`
        )}`);
      }

      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error("Error generating offline bill:", err);
      return res.status(500).json({ error: "Failed to generate offline bill: " + err.message });
    }
  });

  // Admin SMTP connection tester
  app.post("/api/admin/test-smtp", authenticateAdmin, async (req, res) => {
    try {
      const result = await testSmtpConnection();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, details: err.message || err });
    }
  });

  // Admin CRUD: Create product
  app.post("/api/admin/products", authenticateAdmin, async (req, res) => {
    const { name, description, price, category, shop, stock, image, tags, featured, brand, pricePerPiece, piecesPerUnit, totalUnitsAvailable } = req.body;

    if (!name || !description || !price || !category || !shop) {
      return res.status(400).json({ error: "Missing required core product fields" });
    }

    try {
      const resolvedPiecesPerUnit = piecesPerUnit !== undefined ? Math.max(1, parseInt(piecesPerUnit, 10)) : 1;
      const resolvedTotalUnits = totalUnitsAvailable !== undefined ? Math.max(0, parseInt(totalUnitsAvailable, 10)) : Math.max(0, parseInt(stock || "0", 10));
      const calculatedStock = resolvedPiecesPerUnit * resolvedTotalUnits;

      const newProduct: Product = {
        id: "p_" + Date.now(),
        name,
        description,
        price: parseFloat(price),
        category,
        shop: shop as "medicals" | "stationery",
        stock: calculatedStock,
        image: image || "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop",
        tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(",").map(t => t.trim()) : []),
        featured: !!featured,
        isActive: true,
        brand: brand || "JANUZEN",
        pricePerPiece: pricePerPiece !== undefined ? parseFloat(pricePerPiece) : parseFloat(price),
        piecesPerUnit: resolvedPiecesPerUnit,
        totalUnitsAvailable: resolvedTotalUnits
      };

      await dbClient.createProduct(newProduct);

      res.status(201).json({
        message: "Product added successfully",
        product: newProduct
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error creating product." });
    }
  });

  // Admin CRUD: Edit product
  app.put("/api/admin/products/:id", authenticateAdmin, async (req, res) => {
    try {
      const current = await dbClient.getProductById(req.params.id, true);
      if (!current) {
        return res.status(404).json({ error: "Product not found" });
      }

      const { name, description, price, category, shop, stock, image, tags, featured, brand, pricePerPiece, piecesPerUnit, totalUnitsAvailable } = req.body;

      const resolvedPiecesPerUnit = piecesPerUnit !== undefined ? Math.max(1, parseInt(piecesPerUnit, 10)) : (current.piecesPerUnit || 1);
      const resolvedTotalUnits = totalUnitsAvailable !== undefined ? Math.max(0, parseInt(totalUnitsAvailable, 10)) : (stock !== undefined ? Math.max(0, parseInt(stock, 10)) : (current.totalUnitsAvailable || current.stock));
      const calculatedStock = piecesPerUnit !== undefined || totalUnitsAvailable !== undefined ? (resolvedPiecesPerUnit * resolvedTotalUnits) : (stock !== undefined ? parseInt(stock, 10) : current.stock);

      const updates: Partial<Product> = {
        name: name !== undefined ? name : current.name,
        description: description !== undefined ? description : current.description,
        price: price !== undefined ? parseFloat(price) : current.price,
        category: category !== undefined ? category : current.category,
        shop: shop !== undefined ? shop : current.shop,
        stock: calculatedStock,
        image: image !== undefined ? image : current.image,
        tags: tags !== undefined ? (Array.isArray(tags) ? tags : String(tags).split(",").map(t => t.trim())) : current.tags,
        featured: featured !== undefined ? !!featured : current.featured,
        brand: brand !== undefined ? brand : (current.brand || "JANUZEN"),
        pricePerPiece: pricePerPiece !== undefined ? parseFloat(pricePerPiece) : (current.pricePerPiece || current.price),
        piecesPerUnit: resolvedPiecesPerUnit,
        totalUnitsAvailable: resolvedTotalUnits
      };

      const updated = await dbClient.updateProduct(req.params.id, updates);
      res.json({
        message: "Product updated successfully",
        product: updated
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error updating product." });
    }
  });

  // Admin CRUD: Delete product (soft delete as requested)
  app.delete("/api/admin/products/:id", authenticateAdmin, async (req, res) => {
    try {
      const current = await dbClient.getProductById(req.params.id, true);
      if (!current) {
        return res.status(404).json({ error: "Product not found" });
      }

      await dbClient.updateProduct(req.params.id, { isActive: false });

      res.json({
        message: "Product soft-deleted successfully",
        id: req.params.id
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error deleting product." });
    }
  });

  // --- ORDERS ---

  // Order Placement
  app.post("/api/orders", authenticateToken, async (req: any, res) => {
    const { items, shippingAddress, paymentMethod, couponCode } = req.body;

    if (!items || !items.length || !shippingAddress) {
      return res.status(400).json({ error: "Empty shopping basket or shipping forms missing." });
    }

    try {
      const orderItems: any[] = [];
      let subtotal = 0;

      // Validate elements stock
      for (const item of items) {
        const prod = await dbClient.getProductById(item.productId);
        if (!prod) {
          return res.status(400).json({ error: `Product variant with id [${item.productId}] could not be retrieved.` });
        }
        if (prod.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for product [${prod.name}]. Currently only ${prod.stock} items left.` });
        }

        let price = prod.price;
        let name = prod.name;
        if (item.selectedOption) {
          price = item.selectedOption.price;
          name = `${prod.name} (${item.selectedOption.name})`;
        }
        subtotal += price * item.quantity;
        
        orderItems.push({
          productId: prod.id,
          name: name,
          price: price,
          quantity: item.quantity,
          image: prod.image,
          shop: prod.shop,
          selectedOption: item.selectedOption
        });
      }

      // Compute Coupon discount
      let discount = 0;
      if (couponCode) {
        const coupons = await dbClient.getCoupons();
        const matched = coupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.isActive);
        if (matched) {
          if (subtotal >= matched.minBasketValue) {
            if (matched.discountType === "percentage") {
              discount = Math.round((subtotal * (matched.discountValue / 100)) * 100) / 100;
            } else {
              discount = Math.min(subtotal, matched.discountValue);
            }
          }
        }
      }

      const postDiscountSubtotal = Math.max(0, subtotal - discount);

      // Taxes & Deliver pricing calculations
      const shipping = subtotal >= 1000 ? 0 : (systemSettings.deliveryDistanceKms * systemSettings.shippingCostPerKm);
      const tax = Math.round((postDiscountSubtotal * (systemSettings.gstPercentage / 100)) * 100) / 100;
      const total = Math.round((postDiscountSubtotal + tax + shipping) * 100) / 100;

      // Formatting date
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const randCode = Math.floor(1000 + Math.random() * 9000);
      const orderIdCode = `JAN-${yyyy}${mm}${dd}-${randCode}`;

      const deliveryOTP = String(Math.floor(1000 + Math.random() * 9000));
      const invoiceIdCode = `INV-${yyyy}${mm}${dd}-${randCode}`;

      const newOrder: any = {
        id: "o_" + Date.now(),
        orderId: orderIdCode,
        invoiceId: invoiceIdCode,
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        items: orderItems,
        shippingAddress,
        deliveryOTP,
        totals: {
          subtotal,
          discount,
          shipping,
          tax,
          total
        },
        status: "placed",
        paymentMethod: paymentMethod || "Cash on Delivery",
        createdAt: new Date().toISOString(),
        stockAdjusted: true
      };

      // Deduct product stock immediately
      for (const item of orderItems) {
        const prod = await dbClient.getProductById(item.productId);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          const piecesPerUnit = prod.piecesPerUnit || 1;
          const newUnitsAvailable = Math.floor(newStock / piecesPerUnit);
          await dbClient.updateProduct(item.productId, {
            stock: newStock,
            totalUnitsAvailable: newUnitsAvailable
          });
        }
      }

      await dbClient.createOrder(newOrder);

      // Create a notification immediately for the user
      await createAndSendNotification(
        newOrder.userId,
        "Order Placed Successfully",
        `Hi ${newOrder.userName}, your order ${newOrder.orderId} has been placed successfully! Your delivery verification OTP is [${deliveryOTP}]. Total amount: ₹${total.toFixed(2)}. We will notify you when it's dispatched.`
      );

      // Generate and email invoice — wrapped in try/catch so invoice
      // failure never blocks the order confirmation response
      try {
        const invoiceBuffer = await generateInvoice(newOrder);
        await sendInvoiceEmail(newOrder, invoiceBuffer);
      } catch (invoiceErr) {
        console.error("[INVOICE] Failed to generate/send invoice:", invoiceErr);
        // Do NOT re-throw — order is already placed, don't fail the response
      }

      // Nodemailer Simulator Console Logging
      console.log(`[EMAIL DISPATCH] TO: ${req.user.email} | SUBJECT: JANUZEN Order Confirmed | CONTENT: Rest easy, your purchase ${orderIdCode} has been placed. Deep thank you for supporting Nuthan Medicals & JA Stationery! Grand Total: ₹${total}`);

      res.status(201).json({
        message: "Order placed successfully!",
        order: newOrder,
        shareLinks: {
          whatsapp: `https://wa.me/?text=${encodeURIComponent(
            `Hi! I just placed an order with JANUZEN Global LLP 🛍️\n\nOrder ID: ${orderIdCode}\nTotal: ₹${total}\n\nView products at: https://januzen.in`
          )}`,
          invoiceNote: "Invoice has been sent to your email address."
        }
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error during order checkout." });
    }
  });

  // Temporary Dev/Admin testing route for invoice PDF & mail dispatch
  app.get("/api/dev/test-invoice-email", async (req, res) => {
    try {
      const dummyOrder: any = {
        id: "o_test_" + Date.now(),
        orderId: `JAN-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: "u_test",
        userName: "JANUZEN QA Team",
        userEmail: "team@januzen.in",
        items: [
          {
            productId: "m1",
            name: "Amoxicillin 500mg Capsules",
            price: 450.00,
            quantity: 2,
            image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop",
            shop: "medicals"
          },
          {
            productId: "s1",
            name: "Premium Gel Pen Set",
            price: 150.00,
            quantity: 3,
            image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop",
            shop: "stationery"
          }
        ],
        shippingAddress: "JANUZEN Corporate Testing Lab, Gajularamaram, Hyderabad - 500055",
        deliveryOTP: "1234",
        totals: {
          subtotal: 1350.00,
          discount: 100.00,
          shipping: 0,
          tax: 62.50,
          total: 1312.50
        },
        status: "placed",
        paymentMethod: "Prepaid Test Gateway",
        createdAt: new Date().toISOString()
      };

      const buffer = await generateInvoice(dummyOrder);
      await sendInvoiceEmail(dummyOrder, buffer);

      res.json({
        success: true,
        message: "Invoice generated and mock email successfully dispatched to team@januzen.in!",
        orderId: dummyOrder.orderId
      });
    } catch (err: any) {
      console.error("Test email failure:", err);
      res.status(500).json({ error: err.message || "Failed to generate/dispatch test invoice email" });
    }
  });

  // Download Digital Invoice PDF
  app.get("/api/orders/:id/invoice/download", async (req: any, res) => {
    try {
      const { id } = req.params;
      const authHeader = req.headers["authorization"];
      const token = (authHeader && authHeader.split(" ")[1]) || (req.query.token as string);

      if (!token) {
        return res.status(401).json({ error: "Access token is missing" });
      }

      let decodedUser: any = null;
      try {
        decodedUser = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(403).json({ error: "Access token is invalid or expired" });
      }

      // Retrieve all orders to find by id or orderId
      const orders = await dbClient.getOrders();
      const order = orders.find((o: any) => o.id === id || o.orderId === id);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check ownership or if the user is an admin
      if (order.userId !== decodedUser.id && decodedUser.role !== "admin") {
        return res.status(403).json({ error: "You are not authorized to download this invoice." });
      }

      // Generate invoice buffer
      const buffer = await generateInvoice(order);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Invoice-${order.orderId}.pdf"`);
      res.send(buffer);
    } catch (err: any) {
      console.error("[INVOICE DOWNLOAD ERROR]:", err);
      res.status(500).json({ error: "Failed to generate dynamic invoice PDF" });
    }
  });

  // View Customer's own orders
  app.get("/api/orders", authenticateToken, async (req: any, res) => {
    try {
      const results = await dbClient.getOrders(req.user.id);
      res.json(results);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error retrieving orders." });
    }
  });

  // Admin get all orders
  app.get("/api/admin/orders", authenticateAdmin, async (req, res) => {
    try {
      const results = await dbClient.getOrders();
      res.json(results);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error gathering orders." });
    }
  });

  // Delivery agent helper - public list of all orders so delivery associates can process them
  app.get("/api/orders-delivery", async (req, res) => {
    try {
      const results = await dbClient.getOrders();
      res.json(results);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error gathering delivery orders." });
    }
  });

  // Admin update order status
  app.put("/api/admin/orders/:id/status", authenticateAdmin, async (req, res) => {
    const { status, note } = req.body;
    const allowedStatuses = [
      "placed", "confirmed", "processing", "dispatched", "out_for_delivery", 
      "delivered", "cancelled", "returned", "Pending", "Dispatched", "Delivered", "Cancelled"
    ];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid or missing order status code provided" });
    }

    try {
      const updatedOrder = await dbClient.updateOrderStatus(req.params.id, status, note);
      if (!updatedOrder) {
        return res.status(404).json({ error: "Order details could not be retrieved" });
      }

      // Generate custom personalized notification
      await createAndSendNotification(
        updatedOrder.userId,
        `Order Status Update: ${status}`,
        note || `Hi ${updatedOrder.userName}, your corporate purchase status has been updated to "${status}" for order ${updatedOrder.orderId}.`
      );

      // Nodemailer Simulator Console Logging
      console.log(`[EMAIL DISPATCH] TO: ${updatedOrder.userEmail} | SUBJECT: JANUZEN Order Status Update | CONTENT: Your purchase status has updated to: [${status}] for order ID ${updatedOrder.orderId}. Description: ${note || 'None'}`);

      res.json({
        message: `Status updated successfully to ${status}`,
        order: updatedOrder
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error updating order status." });
    }
  });

  // --- SYSTEM SETTINGS CONTROLS (GST & Shipping Control) ---
  
  // Public get settings
  app.get("/api/settings", async (req, res) => {
    res.json(systemSettings);
  });

  // Admin update settings
  app.put("/api/admin/settings", authenticateAdmin, async (req, res) => {
    const { shippingCostPerKm, deliveryDistanceKms, gstPercentage } = req.body;
    
    if (shippingCostPerKm !== undefined && typeof shippingCostPerKm === "number") {
      systemSettings.shippingCostPerKm = shippingCostPerKm;
    }
    if (deliveryDistanceKms !== undefined && typeof deliveryDistanceKms === "number") {
      systemSettings.deliveryDistanceKms = deliveryDistanceKms;
    }
    if (gstPercentage !== undefined && typeof gstPercentage === "number") {
      systemSettings.gstPercentage = gstPercentage;
    }

    saveSystemSettings();
    res.json({ message: "System configurations updated successfully", settings: systemSettings });
  });

  // Client request cancel order
  app.put("/api/orders/:id/cancel", authenticateToken, async (req: any, res) => {
    try {
      const orders = await dbClient.getOrders(req.user.id);
      const find = orders.find(o => o.id === req.params.id);
      if (!find) {
        return res.status(404).json({ error: "Order details could not be found." });
      }

      const normalizedStatus = find.status.toLowerCase();
      if (normalizedStatus === "delivered" || normalizedStatus === "dispatched" || normalizedStatus === "out_for_delivery" || normalizedStatus === "cancelled") {
        return res.status(400).json({ error: "Order cannot be cancelled at this stage of delivery. Please contact helpline." });
      }

      const updatedOrder = await dbClient.updateOrderStatus(req.params.id, "cancelled", "Cancelled by client auto-request.");
      if (!updatedOrder) {
        return res.status(404).json({ error: "Failed to apply cancellation status." });
      }

      await createAndSendNotification(
        updatedOrder.userId,
        "Order Cancelled",
        `Hi ${updatedOrder.userName}, your order ${updatedOrder.orderId} was successfully cancelled.`
      );

      res.json({ message: "Order cancelled successfully.", order: updatedOrder });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error applying cancellation." });
    }
  });

  // Delivery Agent update order status (Public/Driver Hub helper - no strict Admin token required so delivery associates can run it)
  app.put("/api/orders/:id/status-driver", async (req, res) => {
    const { status, note } = req.body;
    const allowed = ["dispatched", "out_for_delivery", "delivered", "cancelled"];
    if (!allowed.includes(status.toLowerCase())) {
      return res.status(400).json({ error: "Status must be: dispatched, out_for_delivery, delivered, or cancelled" });
    }
    try {
      const updatedOrder = await dbClient.updateOrderStatus(req.params.id, status, note || `Status updated by Delivery Assistant.`);
      if (!updatedOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      await createAndSendNotification(
        updatedOrder.userId,
        `Delivery Dispatch: ${status}`,
        `Your order ${updatedOrder.orderId} is now updated to: ${status}. Note: ${note || ""}`
      );
      res.json({ message: "Delivery stage updated", order: updatedOrder });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error updating delivery driver status." });
    }
  });

  // Verify Delivery OTP endpoint
  app.put("/api/orders/:id/verify-otp", async (req, res) => {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ error: "OTP confirmation is required." });
    }
    try {
      const orders = await dbClient.getOrders();
      const order = orders.find(o => o.id === req.params.id || o.orderId === req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order record not found." });
      }

      if (String(order.deliveryOTP) === String(otp).trim()) {
        const updatedOrder = await dbClient.updateOrderStatus(order.id, "delivered", `OTP confirm code matches. Delivered!`);
        if (!updatedOrder) {
          return res.status(500).json({ error: "Failed to update order status." });
        }

        await createAndSendNotification(
          updatedOrder.userId,
          `Delivery OTP Verified Successfully!`,
          `Your order ${updatedOrder.orderId} was safely handed over using OTP verification code ${otp}. Thank you!`
        );

        return res.json({ success: true, message: "OTP Verified! Order marked as Delivered.", order: updatedOrder });
      } else {
        return res.status(400).json({ error: "Incorrect OTP code! Please double-check with the customer." });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server discrepancy during OTP confirmation check." });
    }
  });

  // --- CONTACTS & NEWSLETTERS ---

  // Post message
  app.post("/api/messages", async (req, res) => {
    const { name, email, subject, shop, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Missing required contact form fields." });
    }

    try {
      const newMsg: Message = {
        id: "msg_" + Date.now(),
        name,
        email: email.toLowerCase(),
        subject,
        shop: shop || "general",
        message,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      await dbClient.createMessage(newMsg);

      // Nodemailer Administrator Alert log simulation
      console.log(`[ADMIN NOTIFICATION ALERTS] TO: admin@januzen.com | SUBJECT: New Inquiry on JANUZEN Portal | CONTENT: Recieved message from ${name} (<${email}>) relating to division ${shop || "General"}: Subject: ${subject}. Content: ${message}`);

      res.status(201).json({
        message: "Message dispatched and logged successfully! JANUZEN representatives are reviewing your dispatch.",
        messageDetails: newMsg
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error transmitting inquiry." });
    }
  });

  // Admin view all messages
  app.get("/api/admin/messages", authenticateAdmin, async (req, res) => {
    try {
      const messages = await dbClient.getMessages();
      res.json(messages);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error retrieving messages." });
    }
  });

  // Admin mark message read
  app.put("/api/admin/messages/:id/read", authenticateAdmin, async (req, res) => {
    try {
      const updated = await dbClient.markMessageRead(req.params.id);
      if (!updated) {
        return res.status(404).json({ error: "Inquiry ID is invalid" });
      }
      res.json({
        message: "Inquiry logged as read.",
        messageDetails: updated
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error marking message read." });
    }
  });

  // Admin delete message
  app.delete("/api/admin/messages/:id", authenticateAdmin, async (req, res) => {
    try {
      const success = await dbClient.deleteMessage(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Inquiry ID is invalid" });
      }
      res.json({ message: "Inquiry purged successfully." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error purging message." });
    }
  });

  // Newsletter email collection
  app.post("/api/newsletter", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required to join newsletter insights." });
    }

    try {
      const isNew = await dbClient.addNewsletter(email);
      if (!isNew) {
        return res.status(200).json({ message: "You are already in our premium list! Prepare for exclusive updates." });
      }

      res.status(201).json({
        message: "Subscription log successful! Deep gratitude."
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error registering feed subscription." });
    }
  });

  // Admin view newsletter list
  app.get("/api/admin/newsletter", authenticateAdmin, async (req, res) => {
    try {
      const list = await dbClient.getNewsletter();
      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error listing feed subscribers." });
    }
  });

  // Admin view all registered users list
  app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
      const users = await dbClient.getUsers();
      res.json(users);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error listing users." });
    }
  });

  // Admin delete a customer with all their corresponding storage
  app.delete("/api/admin/users/:id", authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "User ID is required." });
    }
    try {
      const users = await dbClient.getUsers();
      const targetUser = users.find(u => u.id === id);
      if (!targetUser) {
        return res.status(404).json({ error: "User profile not found." });
      }
      if (targetUser.role === "admin") {
        return res.status(403).json({ error: "Cannot delete an administrator account." });
      }

      const success = await dbClient.deleteUserWithData(id);
      if (!success) {
        return res.status(404).json({ error: "User not found or deletion failed." });
      }
      res.json({ message: "User profile, associated orders, reviews, and notifications permanently purged to save space." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error occurred when removing user." });
    }
  });

  // Fetch notifications for the authenticated user
  app.get("/api/notifications", authenticateToken, async (req: any, res) => {
    try {
      const list = await dbClient.getNotifications(req.user.id);
      res.json({ notifications: list });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error retrieving notifications." });
    }
  });

  // Mark specific notification as read
  app.put("/api/notifications/:id/read", authenticateToken, async (req: any, res) => {
    try {
      const success = await dbClient.markNotificationRead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Notification not found or update failed." });
      }
      res.json({ message: "Notification marked read." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // Real-time notifications stream (SSE)
  app.get("/api/updates/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Content-Encoding", "none");
    res.flushHeaders();

    const token = req.query.token as string;
    if (!token) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Unauthorized: Missing token" })}\n\n`);
      return res.end();
    }

    try {
      const decodedUser: any = jwt.verify(token, JWT_SECRET);
      const conn = {
        userId: decodedUser.id,
        role: decodedUser.role || "customer",
        res
      };

      sseConnections.add(conn);
      console.log(`📡 [SSE] Client connected: user ${decodedUser.name} (${decodedUser.id}), role: ${decodedUser.role || "customer"}. Total active: ${sseConnections.size}`);

      // Send initial connection success event
      res.write(`event: connected\ndata: ${JSON.stringify({ message: "Successfully connected to JANUZEN real-time alert stream" })}\n\n`);

      // Keep alive heartbeat (ping) every 25 seconds
      const pingInterval = setInterval(() => {
        res.write(`:\n\n`);
      }, 25000);

      req.on("close", () => {
        clearInterval(pingInterval);
        sseConnections.delete(conn);
        console.log(`🔌 [SSE] Client disconnected: user ${decodedUser.name} (${decodedUser.id}). Total active: ${sseConnections.size}`);
      });
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Unauthorized: Invalid token" })}\n\n`);
      return res.end();
    }
  });


  // Fetch Wishlist for active authenticated customer
  app.get("/api/wishlist", authenticateToken, async (req: any, res) => {
    try {
      const list = await dbClient.getWishlist(req.user.id);
      res.json({ wishlist: list });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error retrieving wishlist." });
    }
  });

  // Toggle Wishlist item status (add/remove)
  app.post("/api/wishlist/toggle", authenticateToken, async (req: any, res) => {
    const { productId, productType } = req.body;
    if (!productId || !productType) {
      return res.status(400).json({ error: "Missing product identifiers for wishlist modification." });
    }
    try {
      const result = await dbClient.toggleWishlistItem(req.user.id, productId, productType);
      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error editing wishlist record." });
    }
  });

  // Admin broadcast notification to all customers, automatically customized with the customer's name
  app.post("/api/admin/notifications/broadcast", authenticateAdmin, async (req, res) => {
    const { matter, title } = req.body;
    if (!matter) {
      return res.status(400).json({ error: "Notification body matter is required." });
    }
    try {
      const users = await dbClient.getUsers();
      const customers = users.filter(u => u.role === "customer" || u.role === undefined);
      const titleText = title || "Urgent Store Announcement";

      for (const customer of customers) {
        const content = `Dear ${customer.name},\n\n${matter}`;
        await createAndSendNotification(
          customer.id,
          titleText,
          content
        );
      }

      res.status(201).json({
        message: `Dynamic dispatch broadcast completed! Sent personalized alerts addressing ${customers.length} customer names.`,
        count: customers.length
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error broadcasting alerts." });
    }
  });

  // Fetch reviews for a product
  app.get("/api/products/:productId/reviews", async (req, res) => {
    try {
      const list = await dbClient.getReviews(req.params.productId);
      res.json({ reviews: list });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error retrieving reviews." });
    }
  });

  // Submit a review for a product
  app.post("/api/products/:productId/reviews", authenticateToken, async (req: any, res) => {
    const { rating, comment } = req.body;
    const { productId } = req.params;
    if (!rating || !comment) {
      return res.status(400).json({ error: "Rating and review comment text are required." });
    }
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5." });
    }
    try {
      const fullUser = await dbClient.getUserByEmail(req.user.email);
      const review = {
        id: "rev_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        productId,
        userId: req.user.id,
        userName: fullUser?.name || req.user.email,
        userImage: fullUser?.image || "",
        rating: ratingNum,
        comment,
        createdAt: new Date().toISOString()
      };
      const created = await dbClient.createReview(review);
      res.status(201).json({ message: "Review submitted successfully!", review: created });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error posting review." });
    }
  });

  // --- MARQUEE TEXT ENDPOINTS ---
  app.get("/api/public/marquee", async (req, res) => {
    try {
      const text = await dbClient.getMarquee();
      const speed = await dbClient.getMarqueeSpeed();
      res.json({ marquee: text, speed });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch marquee text." });
    }
  });

  app.put("/api/admin/marquee", authenticateAdmin, async (req, res) => {
    const { text, speed } = req.body;
    if (text === undefined) {
      return res.status(400).json({ error: "Marquee text missing from payload." });
    }
    try {
      const updated = await dbClient.updateMarquee(text);
      let updatedSpeed = 30;
      if (speed !== undefined) {
        updatedSpeed = await dbClient.updateMarqueeSpeed(Number(speed));
      } else {
        updatedSpeed = await dbClient.getMarqueeSpeed();
      }
      res.json({ message: "Marquee content updated successfully", marquee: updated, speed: updatedSpeed });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update marquee text." });
    }
  });

  // --- COUPON ENDPOINTS ---
  app.get("/api/admin/coupons", authenticateAdmin, async (req, res) => {
    try {
      const coupons = await dbClient.getCoupons();
      res.json({ coupons });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch coupons list." });
    }
  });

  // Public/Customer active list for reference (only active ones)
  app.get("/api/public/coupons", async (req, res) => {
    try {
      const coupons = await dbClient.getCoupons();
      res.json({ coupons: coupons.filter(c => c.isActive) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch active coupons." });
    }
  });

  app.post("/api/admin/coupons", authenticateAdmin, async (req, res) => {
    const { code, discountType, discountValue, minBasketValue } = req.body;
    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ error: "Missing required coupon fields (code, discountType, discountValue)." });
    }
    try {
      const newCoupon = {
        id: "c_" + Date.now(),
        code: code.toUpperCase().trim(),
        discountType: discountType as "percentage" | "fixed",
        discountValue: parseFloat(discountValue),
        minBasketValue: minBasketValue ? parseFloat(minBasketValue) : 0,
        isActive: true
      };
      const created = await dbClient.createCoupon(newCoupon);
      res.status(201).json({ message: "Coupon created successfully", coupon: created });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create new coupon." });
    }
  });

  app.put("/api/admin/coupons/:id", authenticateAdmin, async (req, res) => {
    try {
      const updated = await dbClient.updateCoupon(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Coupon not found" });
      }
      res.json({ message: "Coupon updated successfully", coupon: updated });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update coupon." });
    }
  });

  app.delete("/api/admin/coupons/:id", authenticateAdmin, async (req, res) => {
    try {
      const success = await dbClient.deleteCoupon(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Coupon not found" });
      }
      res.json({ message: "Coupon eliminated successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete coupon." });
    }
  });

  app.post("/api/public/coupons/validate", async (req, res) => {
    const { code, basketValue } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Coupon code is required for validation." });
    }
    try {
      const coupons = await dbClient.getCoupons();
      const match = coupons.find(c => c.code.toUpperCase() === code.toUpperCase().trim() && c.isActive);
      if (!match) {
        return res.status(404).json({ valid: false, message: "Invalid or inactive coupon code." });
      }
      const val = parseFloat(basketValue || "0");
      if (val < match.minBasketValue) {
        return res.status(400).json({
          valid: false,
          message: `Minimum basket value of ₹${match.minBasketValue} is required to use this coupon.`
        });
      }
      let discountAmount = 0;
      if (match.discountType === "percentage") {
        discountAmount = Math.round((val * (match.discountValue / 100)) * 100) / 100;
      } else {
        discountAmount = Math.min(val, match.discountValue);
      }
      res.json({
        valid: true,
        discountAmount,
        discountType: match.discountType,
        discountValue: match.discountValue,
        message: `Success! Coupon applied. You save ₹${discountAmount}.`
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Coupon validation execution error." });
    }
  });

  // Admin Multi-dashboard panel stats calculation
  app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
    try {
      const orders = await dbClient.getOrders();
      const users = await dbClient.getUsers();
      const products = await dbClient.getProducts({ includeInactive: false });
      const messages = await dbClient.getMessages();
      
      const relevantOrders = orders.filter(o => o.status !== "Cancelled");
      const totalRevenue = relevantOrders.reduce((sum, order) => sum + order.totals.subtotal, 0);
      
      const countUsers = users.length;
      const countOrders = orders.length;
      const countProducts = products.length;

      // Low stock warnings (stock < 5)
      const lowStockAlerts = products.filter(p => p.stock < 5).map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        image: p.image,
        shop: p.shop
      }));

      // Count unread incoming messages queries
      const unreadMessagesCount = messages.filter(m => !m.isRead).length;

      // Retrieve last 5 orders
      const recentOrders = orders.slice(0, 5);

      res.json({
        metrics: {
          totalProducts: countProducts,
          totalOrders: countOrders,
          totalUsers: countUsers,
          revenue: Math.round(totalRevenue * 100) / 100,
          unreadMessages: unreadMessagesCount,
          lowStockCount: lowStockAlerts.length
        },
        lowStockAlerts,
        recentOrders
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error aggregating metrics." });
    }
  });

  // Admin Storage Usage Breakdown & Obeservability
  app.get("/api/admin/storage-usage", authenticateAdmin, async (req, res) => {
    try {
      const stats = await dbClient.getStorageUsage();
      res.json(stats);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to gather storage breakdown info." });
    }
  });

  // Manual Trigger for Storage Retention Rules
  app.post("/api/admin/run-retention", authenticateAdmin, async (req, res) => {
    try {
      const purged = await dbClient.runStorageRetention();
      res.json({
        message: "Manual storage retention sweep completed successfully.",
        purged
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Retention engine encountered an error." });
    }
  });

  // Retrieve Cascade Purge Audit Trails
  app.get("/api/admin/audit-logs", authenticateAdmin, async (req, res) => {
    try {
      const logs = await dbClient.getAuditLogs();
      res.json(logs);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load purge audit logs." });
    }
  });

  // User Cascade Delete Dry-run Analysis
  app.get("/api/admin/purge-user/:id/dry-run", authenticateAdmin, async (req, res) => {
    try {
      const result = await dbClient.purgeUser(req.params.id, { dryRun: true });
      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Dry-run analysis failed." });
    }
  });

  // Execute User Cascade Delete Purge
  app.post("/api/admin/purge-user/:id/execute", authenticateAdmin, async (req, res: any) => {
    try {
      const purgingAdmin = (req as any).user?.name || "admin";
      const result = await dbClient.purgeUser(req.params.id, { dryRun: false, purgedBy: purgingAdmin });
      res.json({
        success: true,
        message: "User and all associated accounts/event arrays purged successfully.",
        result
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Permanent cascade user deletion failed." });
    }
  });

  // Product Cascade Delete Dry-run Analysis
  app.get("/api/admin/purge-product/:id/dry-run", authenticateAdmin, async (req, res) => {
    try {
      const result = await dbClient.purgeProduct(req.params.id, { dryRun: true });
      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Product dry-run analysis failed." });
    }
  });

  // Execute Product Cascade Delete Purge
  app.post("/api/admin/purge-product/:id/execute", authenticateAdmin, async (req, res: any) => {
    try {
      const purgingAdmin = (req as any).user?.name || "admin";
      const result = await dbClient.purgeProduct(req.params.id, { dryRun: false, purgedBy: purgingAdmin });
      res.json({
        success: true,
        message: "Product and matching review/wishlist indices purged successfully.",
        result
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Permanent cascade product deletion failed." });
    }
  });

  // Seed / Reset Database Trigger specifically for Dev panel
  app.post("/api/dev/reset-seed", async (req, res) => {
    try {
      await dbClient.resetDB();
      res.json({ message: "Database reset to pristine initial seeded values." });
    } catch (e) {
      res.status(500).json({ error: "Failed to reset seed database." });
    }
  });

  // --- VITE DEV AND PROD MIDDLEWARE ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`===========================================================`);
    console.log(`🚀 JANUZEN Full-Stack Server running on container port ${PORT}`);
    console.log(`===========================================================`);
    console.log(`🔌 Database Mode: ${isMongo ? "MongoDB Connected Cluster" : "Local JSON Offline Database"}`);
    console.log(`===========================================================`);

    // Run custom storage retention sweep immediately on boot to prune old MongoDB notifications and sessions
    dbClient.runStorageRetention()
      .then(purged => {
        console.log(`⏱️ Initial Storage Retention Sweep Completed: Purged ${purged.notificationPurged} Notifications, ${purged.sessionPurged} Sessions`);
      })
      .catch(err => {
        console.error("⚠️ Failed to execute initial database storage sweep:", err);
      });

    // Set a recurring interval to clean old database entries every 6 hours
    setInterval(() => {
      console.log("⏱️ Executing scheduled database storage retention sweep...");
      dbClient.runStorageRetention()
        .then(purged => {
          console.log(`⏱️ Purged ${purged.notificationPurged} Notifications, ${purged.sessionPurged} Sessions`);
        })
        .catch(err => {
          console.error("⚠️ Failure during scheduled database retention sweep:", err);
        });
    }, 6 * 60 * 60 * 1000);
  });
}

// Initialise DB sync before booting up Express
connectAndSeedDB().then(() => {
  startServer();
});
