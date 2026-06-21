import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Product, User, Order, Message } from "./src/types";
import { dbClient, connectAndSeedDB, isMongo } from "./server/db";

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "JANUZEN_JWT_SECRET_KEY";
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "phoenix123&";

// In-memory file upload middleware
const filterMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB weight limit
});

async function startServer() {
  const app = express();
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

  // Upload asset image to Cloudinary (Protected for Admins)
  app.post("/api/upload", authenticateAdmin, filterMulter.single("file"), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Please provide a file to upload." });
    }

    const hasCloudinary = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (!hasCloudinary) {
      return res.status(400).json({
        error: "Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing or incomplete in your .env configuration."
      });
    }

    try {
      // Lazy config just before uploading
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      const uploadToCloudinary = (buffer: Buffer) => {
        return new Promise<any>((resolve, reject) => {
          const writeStream = cloudinary.uploader.upload_stream(
            {
              folder: "januzen_products",
              resource_type: "auto"
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          writeStream.end(buffer);
        });
      };

      const uploadResult = await uploadToCloudinary(req.file.buffer);

      res.status(200).json({
        message: "Image uploaded successfully!",
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id
      });
    } catch (err: any) {
      console.error("Cloudinary connection execution error:", err);
      res.status(500).json({
        error: "Failed to upload image to Cloudinary.",
        details: err?.message || String(err)
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

  // Admin CRUD: Create product
  app.post("/api/admin/products", authenticateAdmin, async (req, res) => {
    const { name, description, price, category, shop, stock, image, tags, featured } = req.body;

    if (!name || !description || !price || !category || !shop || stock === undefined) {
      return res.status(400).json({ error: "Missing required core product fields" });
    }

    try {
      const newProduct: Product = {
        id: "p_" + Date.now(),
        name,
        description,
        price: parseFloat(price),
        category,
        shop: shop as "medicals" | "stationery",
        stock: parseInt(stock, 10),
        image: image || "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop",
        tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(",").map(t => t.trim()) : []),
        featured: !!featured,
        isActive: true
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

      const { name, description, price, category, shop, stock, image, tags, featured } = req.body;

      const updates: Partial<Product> = {
        name: name !== undefined ? name : current.name,
        description: description !== undefined ? description : current.description,
        price: price !== undefined ? parseFloat(price) : current.price,
        category: category !== undefined ? category : current.category,
        shop: shop !== undefined ? shop : current.shop,
        stock: stock !== undefined ? parseInt(stock, 10) : current.stock,
        image: image !== undefined ? image : current.image,
        tags: tags !== undefined ? (Array.isArray(tags) ? tags : String(tags).split(",").map(t => t.trim())) : current.tags,
        featured: featured !== undefined ? !!featured : current.featured
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

        subtotal += prod.price * item.quantity;
        
        orderItems.push({
          productId: prod.id,
          name: prod.name,
          price: prod.price,
          quantity: item.quantity,
          image: prod.image,
          shop: prod.shop
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
      const tax = Math.round((postDiscountSubtotal * 0.05) * 100) / 100; // 5% GST scale in India
      const shipping = subtotal >= 1000 ? 0 : 150; // Free shipping above ₹1000, else ₹150
      const total = Math.round((postDiscountSubtotal + tax + shipping) * 100) / 100;

      // Formatting date
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const randCode = Math.floor(1000 + Math.random() * 9000);
      const orderIdCode = `JAN-${yyyy}${mm}${dd}-${randCode}`;

      const newOrder: any = {
        id: "o_" + Date.now(),
        orderId: orderIdCode,
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        items: orderItems,
        shippingAddress,
        totals: {
          subtotal,
          discount,
          shipping,
          tax,
          total
        },
        status: "placed",
        paymentMethod: paymentMethod || "Cash on Delivery",
        createdAt: new Date().toISOString()
      };

      await dbClient.createOrder(newOrder);

      // Nodemailer Simulator Console Logging
      console.log(`[EMAIL DISPATCH] TO: ${req.user.email} | SUBJECT: JANUZEN Order Confirmed | CONTENT: Rest easy, your purchase ${orderIdCode} has been placed. Deep thank you for supporting Nuthan Medicals & JA Stationery! Grand Total: ₹${total}`);

      res.status(201).json({
        message: "Order placed successfully!",
        order: newOrder
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error during order checkout." });
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
      await dbClient.createNotification({
        id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        userId: updatedOrder.userId,
        title: `Order Status Update: ${status}`,
        content: note || `Hi ${updatedOrder.userName}, your corporate purchase status has been updated to "${status}" for order ${updatedOrder.orderId}.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

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
        const notif = {
          id: "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          userId: customer.id,
          title: titleText,
          content,
          isRead: false,
          createdAt: new Date().toISOString()
        };
        await dbClient.createNotification(notif);
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
      res.json({ marquee: text });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch marquee text." });
    }
  });

  app.put("/api/admin/marquee", authenticateAdmin, async (req, res) => {
    const { text } = req.body;
    if (text === undefined) {
      return res.status(400).json({ error: "Marquee text missing from payload." });
    }
    try {
      const updated = await dbClient.updateMarquee(text);
      res.json({ message: "Marquee content updated successfully", marquee: updated });
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
  });
}

// Initialise DB sync before booting up Express
connectAndSeedDB().then(() => {
  startServer();
});
