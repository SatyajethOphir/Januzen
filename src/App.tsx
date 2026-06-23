import React, { Suspense } from "react";
import { gsap } from "gsap";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "./utils/storage";
import Navbar from "./components/Navbar";
import { Product, User } from "./types";
import type { CartItem } from "./components/CartView";
import OfficialLoader from "./components/OfficialLoader";

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

interface NavState {
  page: "home" | "medicals" | "stationery" | "product-detail" | "cart" | "checkout" | "about" | "contact" | "login" | "admin" | "orders" | "profile" | "delivery";
  params: Record<string, any>;
}

export default function App() {
  const [nav, setNav] = React.useState<NavState>({ page: "home", params: {} });
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [sideCartOpen, setSideCartOpen] = React.useState(false);
  const [featuredProducts, setFeaturedProducts] = React.useState<Product[]>([]);
  const [toast, setToast] = React.useState<string | null>(null);
  const [wishlistProductIds, setWishlistProductIds] = React.useState<string[]>([]);
  
  // Custom secure elite loading managers
  const [sessionLoading, setSessionLoading] = React.useState(true);
  const [loaderFadeOut, setLoaderFadeOut] = React.useState(false);
  const [loadProgress, setLoadProgress] = React.useState(10);
  const [pageLoading, setPageLoading] = React.useState(false);
  
  // Theme state: light, dark, emerald (clinical), amber (stationery), device
  const [theme, setTheme] = React.useState<"light" | "dark" | "emerald" | "amber" | "device">(() => {
    try {
      return (localStorage.getItem("januzen_theme") as any) || "light";
    } catch (e) {
      return "light";
    }
  });

  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark" | "emerald" | "amber">("light");

  // Deep Link product parsing on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get("product");
    if (prodId) {
      setNav({ page: "product-detail", params: { productId: prodId } });
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
    if (theme === "device") {
      if (typeof window !== "undefined" && window.matchMedia) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
          setResolvedTheme(mediaQuery.matches ? "dark" : "light");
        };
        handleChange();
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
      } else {
        setResolvedTheme("light");
      }
    } else {
      setResolvedTheme(theme);
    }
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
        try {
          const res = await fetch("/api/auth/profile", {
            headers: { "Authorization": `Bearer ${savedToken}` }
          });
          const data = await res.json();
          if (res.ok) {
            setCurrentUser(data.user);
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

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- CART MANAGEMENT ---
  const handleAddToBag = (product: Product, qty: number = 1) => {
    if (product.stock === 0) {
      showToastMsg("⚠️ Item is currently out of stock!");
      return;
    }

    setCart((prev) => {
      const index = prev.findIndex((item) => item.product.id === product.id);
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
        return [...prev, { product, quantity: qty }];
      }
    });
    setSideCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, quantity: number) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.product.id === productId) {
          const clamped = Math.max(1, Math.min(quantity, item.product.stock));
          return { ...item, quantity: clamped };
        }
        return item;
      });
    });
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => {
      const filtered = prev.filter((item) => item.product.id !== productId);
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
    showToastMsg(`Welcome back, ${user.name}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem("januzen_token");
    localStorage.removeItem("januzen_user");
    sessionStorage.removeItem("januzen_token");
    sessionStorage.removeItem("januzen_user");
    setCurrentUser(null);
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

          {nav.page === "admin" && <AdminDashboardView />}
          
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

          {nav.page === "delivery" && <DeliveryHubView />}
        </Suspense>
      </main>

      {/* 📢 TOAST ALERT MESSAGE PANEL */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0D1B2A] text-white py-3 px-5 rounded-xl text-xs font-mono font-bold shadow-lg flex items-center gap-2 border border-slate-700/80 max-w-sm leading-normal animate-pulse">
          🎯 {toast}
        </div>
      )}
    </div>
  );
}
