import React, { Suspense } from "react";
import { gsap } from "gsap";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "./utils/storage";
import Navbar from "./components/Navbar";
import { Product, User, ProductOption } from "./types";
import type { CartItem } from "./components/CartView";
import OfficialLoader from "./components/OfficialLoader";
import { subscribeToPush, checkAndRefreshSubscription } from "./lib/push";
import { setupServiceWorkerVersionControl } from "./lib/versioning";

import HomeView from "./components/HomeView";
import ShopView from "./components/ShopView";
import ProductDetailView from "./components/ProductDetailView";
import CartView from "./components/CartView";
import CheckoutView from "./components/CheckoutView";
import AboutView from "./components/AboutView";
import ContactView from "./components/ContactView";
import LoginView from "./components/LoginView";
import AdminDashboardView from "./components/AdminDashboardView";
import OrdersHistoryView from "./components/OrdersHistoryView";
import ProfileView from "./components/ProfileView";
import DeliveryHubView from "./components/DeliveryHubView";
import SideCartDrawer from "./components/SideCartDrawer";
import Error404View from "./components/Error404View";
import InvoiceOnlineView from "./components/InvoiceOnlineView";

const syncServiceWorkerToken = (token: string | null) => {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.active) {
        if (token) {
          reg.active.postMessage({ type: "SET_TOKEN", token });
        } else {
          reg.active.postMessage({ type: "CLEAR_TOKEN" });
        }
      }
    }).catch(err => console.error("Error sending token to Service Worker:", err));
  }
};

interface NavState {
  page: "home" | "medicals" | "stationery" | "product-detail" | "cart" | "checkout" | "about" | "contact" | "login" | "admin" | "orders" | "profile" | "delivery" | "error" | string;
  params: Record<string, any>;
}

export default function App() {
  const [nav, setNav] = React.useState<NavState>({ page: "home", params: {} });
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [cart, setCart] = React.useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("januzen_cart");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [sideCartOpen, setSideCartOpen] = React.useState(false);
  const [featuredProducts, setFeaturedProducts] = React.useState<Product[]>([]);
  const [toasts, setToasts] = React.useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const [wishlistProductIds, setWishlistProductIds] = React.useState<string[]>([]);
  const [marquee, setMarquee] = React.useState<string>("");
  const [marqueeSpeed, setMarqueeSpeed] = React.useState<number>(30);

  React.useEffect(() => {
    try {
      localStorage.setItem("januzen_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart to localStorage:", e);
    }
  }, [cart]);
  
  // Custom secure elite loading managers
  const [sessionLoading, setSessionLoading] = React.useState(true);
  const [loaderFadeOut, setLoaderFadeOut] = React.useState(false);
  const [loadProgress, setLoadProgress] = React.useState(10);
  const [pageLoading, setPageLoading] = React.useState(false);
  
  // Theme state: light, dark
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("januzen_theme");
      return (saved === "dark" || saved === "light") ? saved : "light";
    } catch (e) {
      return "light";
    }
  });

  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light");

  // Deep Link product parsing on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get("product");
    const shop = params.get("shop");
    if (prodId) {
      setNav({ page: "product-detail", params: { productId: prodId } });
    } else if (shop === "medicals") {
      setNav({ page: "medicals", params: {} });
    } else if (shop === "stationery") {
      setNav({ page: "stationery", params: {} });
    }
  }, []);

  // Sync Wishlist Product IDs on Auth State shift
  React.useEffect(() => {
    if (currentUser) {
      const savedToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
      if (savedToken) {
        fetch("/api/wishlist", {
          headers: { "Authorization": `Bearer ${savedToken}` }
        })
        .then(res => res.json())
        .then(data => {
          if (data.wishlist) {
            setWishlistProductIds(data.wishlist.map((w: any) => w.productId));
          }
        })
        .catch(err => console.error("Error loading user wishlist:", err));
      }
    } else {
      setWishlistProductIds([]);
    }
  }, [currentUser]);

  const handleToggleWishlist = async (productId: string, productType: 'medicals' | 'stationery') => {
    if (!currentUser) {
      showToastMsg("⚠️ Please log in to edit your wishlist.");
      setNav({ page: "login", params: { redirectAfter: nav.page, redirectParams: nav.params } });
      return;
    }
    const savedToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!savedToken) return;

    try {
      const res = await fetch("/api/wishlist/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${savedToken}`
        },
        body: JSON.stringify({ productId, productType })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.added) {
          setWishlistProductIds(prev => [...prev, productId]);
          showToastMsg("Added to wishlist ❤️");
        } else {
          setWishlistProductIds(prev => prev.filter(id => id !== productId));
          showToastMsg("Removed from wishlist 🖤");
        }
      } else {
        showToastMsg(data.error || "Failed to edit wishlist.");
      }
    } catch (err) {
      console.error(err);
      showToastMsg("Error updating wishlist.");
    }
  };

  React.useEffect(() => {
    fetch("/api/public/marquee")
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.marquee) {
            setMarquee(data.marquee);
          }
          if (data.speed !== undefined) {
            setMarqueeSpeed(data.speed);
          }
        }
      })
      .catch(err => console.error("Failed to load marquee announcement:", err));
  }, []);

  React.useEffect(() => {
    setResolvedTheme(theme);
  }, [theme]);

  // Core master session and featured items loader on initial mount
  React.useEffect(() => {
    let completedCount = 0;
    
    const incrementProgressTo = (target: number) => {
      setLoadProgress(prev => {
        if (prev >= target) return prev;
        return target;
      });
    };

    const itemResolved = () => {
      completedCount++;
      if (completedCount === 1) {
        incrementProgressTo(70);
      } else if (completedCount >= 2) {
        incrementProgressTo(100);
        // Fluid exit transition
        setTimeout(() => {
          setLoaderFadeOut(true);
          setTimeout(() => {
            setSessionLoading(false);
          }, 650);
        }, 400);
      }
    };

    async function verifySession() {
      incrementProgressTo(25);
      const savedToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
      if (savedToken) {
        syncServiceWorkerToken(savedToken);
        try {
          const res = await fetch("/api/auth/profile", {
            headers: { "Authorization": `Bearer ${savedToken}` }
          });
          const data = await res.json();
          if (res.ok) {
            setCurrentUser(data.user);
            checkAndRefreshSubscription(data.user);
          } else {
            localStorage.removeItem("januzen_token");
            localStorage.removeItem("januzen_user");
          }
        } catch (err) {
          console.error("Session verification failed:", err);
        }
      }
      incrementProgressTo(45);
      itemResolved();
    }

    async function loadFeatured() {
      incrementProgressTo(55);
      try {
        const res = await fetch("/api/products?featured=true");
        if (res.ok) {
          const data = await res.json();
          setFeaturedProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load featured products index:", err);
      }
      incrementProgressTo(85);
      itemResolved();
    }

    verifySession();
    loadFeatured();
  }, []);

  // Parse URL search parameters on mount for direct invoice routing (e.g. from QR Codes)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get("page");
    const orderIdParam = params.get("orderId");
    if (pageParam === "invoice" && orderIdParam) {
      setNav({ page: "invoice", params: { orderId: orderIdParam } });
    }
  }, []);

  // Listen for Service Worker navigation requests and background/foreground push notifications
  React.useEffect(() => {
    const handleSwMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === "NAVIGATE_TO" && event.data.url) {
        let path = event.data.url;
        try {
          const u = new URL(event.data.url, window.location.origin);
          path = u.pathname + u.search;
        } catch (e) {}
        if (path.startsWith("/orders") || path.includes("orders")) {
          setNav({ page: "orders" });
        } else if (path.includes("tab=security") || path.includes("otp") || path.includes("security")) {
          setNav({ page: "profile", params: { tab: "security" } });
        } else if (path.includes("tab=support") || path.includes("chat") || path.includes("support")) {
          setNav({ page: "profile", params: { tab: "support" } });
        } else if (path.startsWith("/profile")) {
          setNav({ page: "profile" });
        } else if (path.startsWith("/admin") || path.includes("admin")) {
          setNav({ page: "admin" });
        } else if (path.startsWith("/delivery")) {
          setNav({ page: "delivery-hub" });
        } else if (path.includes("shop") || path.includes("medicals")) {
          setNav({ page: "medicals" });
        } else if (path.includes("stationery")) {
          setNav({ page: "stationery" });
        }
      } else if (event.data.type === "PUSH_RECEIVED" && event.data.data) {
        const d = event.data.data;
        const title = d.title ? (d.title.startsWith("JANUZEN") ? d.title : `JANUZEN | ${d.title}`) : "JANUZEN Alert";
        showToastMsg(`🔔 ${title}: ${d.body || ""}`);
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
    };
  }, []);

  // Lightweight background sync when switching pages of the portal (completely non-blocking)
  React.useEffect(() => {
    if (sessionLoading) return;

    async function syncData() {
      const savedToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
      if (savedToken) {
        try {
          const res = await fetch("/api/auth/profile", {
            headers: { "Authorization": `Bearer ${savedToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data.user);
          }
        } catch (e) {}
      }
      try {
        const res = await fetch("/api/products?featured=true");
        if (res.ok) {
          const data = await res.json();
          setFeaturedProducts(data.products || []);
        }
      } catch (e) {}
    }

    syncData();
  }, [nav.page]);

  // GSAP View Change Transition
  React.useEffect(() => {
    gsap.fromTo(
      ".gsap-page-container",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", clearProps: "all" }
    );
  }, [nav.page]);

  // Dynamic SEO Page Title & Metadata switcher
  React.useEffect(() => {
    let titleStr = "JANUZEN Global LLP | Premium Pharmaceuticals & Office Stationery";
    let descContent = "Official portal of JANUZEN Global LLP, hosting two premier divisions: Nuthan Medicals (clinical essentials & diagnostics) and JA Stationery (expert notebooks, diaries).";

    switch(nav.page) {
      case "home":
        titleStr = "JANUZEN Global LLP | Care Diagnostics & Premium Corporate Office Supplies";
        descContent = "Home of Januzen Global LLP. Managing two trusted entities: Nuthan Medicals (healthcare, surgical kits, tablets) and JA Stationery (registers, planners, luxury diaries). Founded by Vinuthan Reddy Kongara.";
        break;
      case "medicals":
        titleStr = "Nuthan Medicals | Authentic Clinical Pharmaceuticals & Diagnostics by JANUZEN";
        descContent = "Explore Nuthan Medicals. Certified pharmaceuticals, professional nebulizers, authentic surgical tools, clinical devices, and consumer health items.";
        break;
      case "stationery":
        titleStr = "JA Stationery | Curated Office Calendars, Leather Diaries & Writing Books";
        descContent = "Explore JA Stationery. Luxury leather business diaries, executive academic planners, customized corporate stationery notebooks, and high-caliber stationery items.";
        break;
      case "product-detail":
        titleStr = "Premium Catalog Item | JANUZEN Global LLP";
        descContent = "View details and pricing specifications for this authenticated product in the JANUZEN Global corporate inventory list.";
        break;
      case "cart":
        titleStr = "Shopping Bag | JANUZEN Global Supply Channel";
        descContent = "Review clinical health kits or elegant office planners before finalizing your order securely.";
        break;
      case "checkout":
        titleStr = "Secure Gateway Billing | JANUZEN Global LLP";
        descContent = "Submit your corporate address, tax identification inputs, and perform seamless UPI or Netbanking transactions safely.";
        break;
      case "about":
        titleStr = "Our Historic Footprint & Board of Trustees | JANUZEN Global LLP";
        descContent = "Trace JANUZEN Global's evolution from a single custom apothecary in 2005 to a global enterprise partnership serving multiple public divisions.";
        break;
      case "contact":
        titleStr = "Get In Touch with Nuthan Medicals & JA Stationery | Official LLP Helpdesk";
        descContent = "Contact the corporate office of Januzen Global LLP at team@januzen.in or direct phone desk inquiries. Address, locations, and live ticket support.";
        break;
      case "login":
        titleStr = "Secure Member Access | JANUZEN Corporate Portal";
        descContent = "Access customized bulk order tiering, check wishlist records, or track dispatch items inside JANUZEN client area.";
        break;
      case "admin":
        titleStr = "Admin Telemetry Dashboard | JANUZEN Internal Core";
        break;
      case "orders":
        titleStr = "Your Orders Telemetry | JANUZEN Global";
        break;
      case "profile":
        titleStr = "Your Commercial Profile Settings | JANUZEN Global";
        break;
    }

    document.title = titleStr;
    const metaDescriptionEl = document.querySelector('meta[name="description"]');
    if (metaDescriptionEl) {
      metaDescriptionEl.setAttribute("content", descContent);
    }
  }, [nav.page]);

  const handleNavigate = (pageName: string, params: Record<string, any> = {}) => {
    setPageLoading(true);
    setNav({ page: pageName as any, params });
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      setPageLoading(false);
    }, 450);
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "emerald" | "amber" | "device") => {
    setTheme(newTheme);
    localStorage.setItem("januzen_theme", newTheme);
  };

  const addToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  React.useEffect(() => {
    (window as any).showToast = addToast;
    return () => {
      delete (window as any).showToast;
    };
  }, [addToast]);

  const showToastMsg = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    let finalType = type;
    if (msg.includes("⚠️") || msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error") || msg.toLowerCase().includes("unable")) {
      finalType = "error";
    } else if (msg.toLowerCase().includes("success") || msg.toLowerCase().includes("welcome") || msg.includes("❤️") || msg.toLowerCase().includes("added") || msg.toLowerCase().includes("complete")) {
      finalType = "success";
    }
    addToast(msg, finalType);
  };

  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Check and refresh web push subscription on app boot (crucial for standalone Add-to-Home-Screen PWAs)
    checkAndRefreshSubscription(currentUser);

    // Setup PWA version controller (reloads app once when new SW activates)
    const cleanupSWControl = setupServiceWorkerVersionControl(() => {
      checkAndRefreshSubscription(currentUser);
    });

    return () => {
      cleanupSWControl();
    };
  }, [currentUser]);

  // --- CART MANAGEMENT ---
  const handleAddToBag = (product: Product, qty: number = 1, selectedOption?: ProductOption) => {
    if (product.stock === 0) {
      showToastMsg("⚠️ Item is currently out of stock!");
      return;
    }

    // Push notification opt-in prompt — triggered naturally on first add-to-cart
    if (typeof window !== "undefined" && !localStorage.getItem("januzen_push_asked")) {
      localStorage.setItem("januzen_push_asked", "true");
      subscribeToPush(currentUser?.id || undefined).catch((e) => {
        console.error("[PUSH] Subscription trigger failed:", e);
      });
    }

    setCart((prev) => {
      const index = prev.findIndex((item) => item.product.id === product.id && item.selectedOption?.name === selectedOption?.name);
      if (index > -1) {
        const currentQty = prev[index].quantity;
        const newQty = Math.min(currentQty + qty, product.stock);
        const updated = [...prev];
        updated[index] = { ...prev[index], quantity: newQty };
        
        if (newQty === currentQty) {
          showToastMsg(`Quantity is already capped at maximum stock level of ${product.stock}.`);
        } else {
          showToastMsg(`Updated bag: ${product.name} count. Qty: ${newQty}`);
        }
        return updated;
      } else {
        showToastMsg(`Added to bag: ${product.name}!`);
        return [...prev, { product, quantity: qty, selectedOption }];
      }
    });
    setSideCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, quantity: number, optionName?: string) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.product.id === productId && (!optionName || item.selectedOption?.name === optionName)) {
          const clamped = Math.max(1, Math.min(quantity, item.product.stock));
          return { ...item, quantity: clamped };
        }
        return item;
      });
    });
  };

  const handleRemoveCartItem = (productId: string, optionName?: string) => {
    setCart((prev) => {
      const filtered = prev.filter((item) => !(item.product.id === productId && (!optionName || item.selectedOption?.name === optionName)));
      showToastMsg("Removed item from shopping bag.");
      return filtered;
    });
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // --- AUTH MANAGEMENT ---
  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    syncServiceWorkerToken(token);
    showToastMsg(`Welcome back, ${user.name}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem("januzen_token");
    localStorage.removeItem("januzen_user");
    sessionStorage.removeItem("januzen_token");
    sessionStorage.removeItem("januzen_user");
    setCurrentUser(null);
    syncServiceWorkerToken(null);
    showToastMsg("Logged out of session. Safe travels!");
    handleNavigate("home");
  };

  const cartTotalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={`min-h-screen flex flex-col mode-${resolvedTheme} transition-colors duration-300 w-full`}>
      {sessionLoading && (
        <div 
          className={`fixed inset-0 z-50 transition-all duration-700 ease-in-out ${
            loaderFadeOut ? "opacity-0 pointer-events-none scale-102 blur-sm" : "opacity-100"
          }`}
        >
          <OfficialLoader fullScreen={true} progress={loadProgress} />
        </div>
      )}

      {/* 📢 Dynamic Scrolling Marquee Announcement Banner */}
      {marquee && (
        <div className="w-full bg-slate-900 text-amber-300 py-1.5 border-b border-slate-800 overflow-hidden relative z-50 flex items-center h-8 select-none">
          <div 
            className="animate-marquee flex w-max"
            style={{ animationDuration: `${marqueeSpeed}s` }}
          >
            <div className="font-mono text-[10px] font-bold tracking-wider flex items-center gap-6 whitespace-nowrap pr-6">
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
            </div>
            <div className="font-mono text-[10px] font-bold tracking-wider flex items-center gap-6 whitespace-nowrap pr-6" aria-hidden="true">
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
              <span>⚡ ANNOUNCEMENT: {marquee} ⚡</span>
              <span className="opacity-40">|</span>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Header Menu */}
      <Navbar
        currentView={nav.page}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
        cartCount={cartTotalCount}
        theme={theme}
        onThemeChange={handleThemeChange}
        onCartClick={() => setSideCartOpen(true)}
      />

      {/* 🔮 Side-Cart Slider Drawer (GSAP-powered entry and micro-animations) */}
      <SideCartDrawer
        isOpen={sideCartOpen}
        onClose={() => setSideCartOpen(false)}
        cartItems={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onNavigate={handleNavigate}
      />

      {/* Main visual view renders wrapped with complete brand Suspense or loading transitions */}
      <main className="relative flex-grow gsap-page-container">
        {pageLoading && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#050C16]/80 backdrop-blur-md transition-all duration-300">
            <div className="text-center space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#0F9B8E] border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute w-6 h-6 border-4 border-amber-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: "reverse" }}></div>
              </div>
              <p className="text-xs font-mono text-slate-300 tracking-[0.2em] uppercase animate-pulse">
                Accessing {nav.page} database...
              </p>
            </div>
          </div>
        )}

        <Suspense fallback={
          <OfficialLoader fullScreen={false} message="Streaming verified partner view modules..." />
        }>
          {!["home", "medicals", "stationery", "product-detail", "cart", "checkout", "about", "contact", "login", "admin", "profile", "orders", "delivery", "invoice"].includes(nav.page) && (
            <Error404View 
              onNavigate={handleNavigate} 
              searchedTerm={(nav.params && nav.params.query) || ""}
            />
          )}

          {nav.page === "home" && (
            <HomeView
              onNavigate={handleNavigate}
              featuredProducts={featuredProducts}
              onAddToBag={handleAddToBag}
              wishlistProductIds={wishlistProductIds}
              onToggleWishlist={handleToggleWishlist}
            />
          )}

          {nav.page === "medicals" && (
            <ShopView
              division="medicals"
              onNavigate={handleNavigate}
              onAddToBag={handleAddToBag}
              wishlistProductIds={wishlistProductIds}
              onToggleWishlist={handleToggleWishlist}
            />
          )}

          {nav.page === "stationery" && (
            <ShopView
              division="stationery"
              onNavigate={handleNavigate}
              onAddToBag={handleAddToBag}
              wishlistProductIds={wishlistProductIds}
              onToggleWishlist={handleToggleWishlist}
            />
          )}

          {nav.page === "product-detail" && (
            <ProductDetailView
              productId={nav.params.productId}
              onNavigate={handleNavigate}
              onAddToBag={handleAddToBag}
              wishlistProductIds={wishlistProductIds}
              onToggleWishlist={handleToggleWishlist}
            />
          )}

          {nav.page === "cart" && (
            <CartView
              cartItems={cart}
              onUpdateQty={handleUpdateCartQty}
              onRemoveItem={handleRemoveCartItem}
              onNavigate={handleNavigate}
            />
          )}

          {nav.page === "checkout" && (
            <CheckoutView
              cartItems={cart}
              currentUser={currentUser}
              onNavigate={handleNavigate}
              onClearCart={handleClearCart}
            />
          )}

          {nav.page === "about" && <AboutView />}

          {nav.page === "contact" && <ContactView />}

          {nav.page === "login" && (
            <LoginView
              onLoginSuccess={handleLoginSuccess}
              onNavigate={handleNavigate}
              navigationParams={nav.params}
            />
          )}

          {nav.page === "admin" && <AdminDashboardView onNavigate={handleNavigate} />}
          
          {nav.page === "profile" && (
            <ProfileView
              currentUser={currentUser}
              onNavigate={handleNavigate}
              onUpdateCurrentUser={(updatedUser) => setCurrentUser(updatedUser)}
              onAddToBag={handleAddToBag}
            />
          )}

          {nav.page === "orders" && (
            <OrdersHistoryView
              onNavigate={handleNavigate}
              currentUser={currentUser}
            />
          )}

          {nav.page === "delivery" && (
            <DeliveryHubView currentUser={currentUser} onNavigate={handleNavigate} />
          )}

          {nav.page === "invoice" && (
            <InvoiceOnlineView
              orderId={nav.params.orderId}
              onNavigate={handleNavigate}
              currentUser={currentUser}
            />
          )}
        </Suspense>
      </main>

      {/* 📢 CUSTOM TOAST NOTIFICATION CONTAINER (BOTTOM RIGHT) */}
      <style>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
        {toasts.map((t) => {
          let bgClass = "bg-slate-900 border-slate-700/80 text-white";
          let icon = "🎯";
          
          if (t.type === "success") {
            bgClass = "bg-[#064e3b] border-emerald-600/50 text-emerald-100 shadow-emerald-950/40";
            icon = "✅";
          } else if (t.type === "error") {
            bgClass = "bg-[#7f1d1d] border-red-600/50 text-red-100 shadow-red-950/40";
            icon = "❌";
          } else if (t.type === "info") {
            bgClass = "bg-[#0f172a] border-slate-700 text-slate-100";
            icon = "ℹ️";
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg leading-normal transition-all duration-300 ${bgClass}`}
              style={{
                animation: "toast-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              }}
            >
              <span className="text-sm shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 text-xs font-mono font-bold whitespace-pre-line leading-relaxed">
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Dismiss message"
              >
                <span className="text-[10px] font-sans">✕</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
