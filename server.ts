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
const ADMIN_SECRET_KEY = "JANUZEN_ADMIN_CONFIDENTIAL";

// In-memory file upload middleware
const filterMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB weight limit
});

async function startServer() {
  const app = express();
  app.use(express.json());

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
    const { name, email, password, phone, address, role, adminKey } = req.body;
    
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
        role: resolvedRole
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
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || !items.length || !shippingAddress) {
      return res.status(400).json({ error: "Empty shopping basket or shipping forms missing." });
    }

    try {
      const orderItems: any[] = [];
      let subtotal = 0;

      // Validate elements stock, decrease values
      for (const item of items) {
        const prod = await dbClient.getProductById(item.productId);
        if (!prod) {
          return res.status(400).json({ error: `Product variant with id [${item.productId}] could not be retrieved.` });
        }
        if (prod.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for product [${prod.name}]. Currently only ${prod.stock} items left.` });
        }

        // Decrement inventory stock securely
        await dbClient.updateProduct(prod.id, { stock: prod.stock - item.quantity });
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

      // Taxes & Deliver pricing calculations
      const tax = Math.round((subtotal * 0.05) * 100) / 100; // 5% tax scale
      const shipping = subtotal > 35 ? 0 : 4.99; // Free shipping on baskets over $35
      const total = Math.round((subtotal + tax + shipping) * 100) / 100;

      // Formatting date
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const randCode = Math.floor(1000 + Math.random() * 9000);
      const orderIdCode = `JAN-${yyyy}${mm}${dd}-${randCode}`;

      const newOrder: Order = {
        id: "o_" + Date.now(),
        orderId: orderIdCode,
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        items: orderItems,
        shippingAddress,
        totals: {
          subtotal,
          shipping,
          tax,
          total
        },
        status: "Pending",
        paymentMethod: paymentMethod || "Cash on Delivery",
        createdAt: new Date().toISOString()
      };

      await dbClient.createOrder(newOrder);

      // Nodemailer Simulator Console Logging
      console.log(`[EMAIL DISPATCH] TO: ${req.user.email} | SUBJECT: JANUZEN Order Confirmed | CONTENT: Rest easy, your purchase ${orderIdCode} has been placed. Deep thank you for supporting Nuthan Medicals & JA Stationery! Grand Total: $${total}`);

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
    const { status } = req.body;
    if (!["Pending", "Dispatched", "Delivered", "Cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid order status code provided" });
    }

    try {
      const updatedOrder = await dbClient.updateOrderStatus(req.params.id, status);
      if (!updatedOrder) {
        return res.status(404).json({ error: "Order details could not be retrieved" });
      }

      // Nodemailer Simulator Console Logging
      console.log(`[EMAIL DISPATCH] TO: ${updatedOrder.userEmail} | SUBJECT: JANUZEN Order Status Update | CONTENT: Your purchase status has updated to: [${status}] for order ID ${updatedOrder.orderId}.`);

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
    console.log(`-----------------------------------------------------------`);
    console.log(`🔐 Administrator Seed Details:`);
    console.log(`   Email:    admin@januzen.com`);
    console.log(`   Password: admin123`);
    console.log(`   Admin Key: ${ADMIN_SECRET_KEY}`);
    console.log(`-----------------------------------------------------------`);
    console.log(`🛍️ Customer Seed Details:`);
    console.log(`   Email:    satyajeeth.ophir@gmail.com`);
    console.log(`   Password: user123`);
    console.log(`===========================================================`);
  });
}

// Initialise DB sync before booting up Express
connectAndSeedDB().then(() => {
  startServer();
});
