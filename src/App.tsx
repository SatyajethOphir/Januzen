import React from "react";
import { gsap } from "gsap";
import Navbar from "./components/Navbar";
import HomeView from "./components/HomeView";
import ShopView from "./components/ShopView";
import ProductDetailView from "./components/ProductDetailView";
import CartView, { CartItem } from "./components/CartView";
import CheckoutView from "./components/CheckoutView";
import AboutView from "./components/AboutView";
import ContactView from "./components/ContactView";
import LoginView from "./components/LoginView";
import AdminDashboardView from "./components/AdminDashboardView";
import OrdersHistoryView from "./components/OrdersHistoryView";
import ProfileView from "./components/ProfileView";
import { Product, User } from "./types";

interface NavState {
  page: "home" | "medicals" | "stationery" | "product-detail" | "cart" | "checkout" | "about" | "contact" | "login" | "admin" | "orders" | "profile";
  params: Record<string, any>;
}

export default function App() {
  const [nav, setNav] = React.useState<NavState>({ page: "home", params: {} });
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [featuredProducts, setFeaturedProducts] = React.useState<Product[]>([]);
  const [toast, setToast] = React.useState<string | null>(null);
  const [wishlistProductIds, setWishlistProductIds] = React.useState<string[]>([]);
  
  // Theme state: light, dark, emerald (clinical), amber (stationery), device
  const [theme, setTheme] = React.useState<"light" | "dark" | "emerald" | "amber" | "device">(() => {
    return (localStorage.getItem("januzen_theme") as any) || "light";
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
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        setResolvedTheme(mediaQuery.matches ? "dark" : "light");
      };
      handleChange();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  // Load User auth token on mount
  React.useEffect(() => {
    async function verifySession() {
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
            // Clean expired values
            localStorage.removeItem("januzen_token");
            localStorage.removeItem("januzen_user");
          }
        } catch (err) {
          console.error("Session verification failed. Network disconnected:", err);
        }
      }
    }

    async function loadFeatured() {
      try {
        const res = await fetch("/api/products?featured=true");
        if (res.ok) {
          const data = await res.json();
          setFeaturedProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load featured products index:", err);
      }
    }

    verifySession();
    loadFeatured();
  }, [nav.page]); // Refresh values on navigate tabs to capture additions

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
        descContent = "Home of Januzen Global LLP. Managing two trusted entities: Nuthan Medicals (healthcare, surgical kits, tablets) and JA Stationery (registers, planners, luxury diaries). Founded by Vinuthan Reddy Kogara.";
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
    setNav({ page: pageName as any, params });
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      {/* 🌟 Header Menu */}
      <Navbar
        currentView={nav.page}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
        cartCount={cartTotalCount}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      {/* Main visual view renders */}
      <main className="flex-grow gsap-page-container">
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
