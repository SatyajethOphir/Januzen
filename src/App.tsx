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
  
  // Theme state: light, dark, emerald (clinical), amber (stationery), device
  const [theme, setTheme] = React.useState<"light" | "dark" | "emerald" | "amber" | "device">(() => {
    return (localStorage.getItem("januzen_theme") as any) || "light";
  });

  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark" | "emerald" | "amber">("light");

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
          />
        )}

        {nav.page === "medicals" && (
          <ShopView
            division="medicals"
            onNavigate={handleNavigate}
            onAddToBag={handleAddToBag}
          />
        )}

        {nav.page === "stationery" && (
          <ShopView
            division="stationery"
            onNavigate={handleNavigate}
            onAddToBag={handleAddToBag}
          />
        )}

        {nav.page === "product-detail" && (
          <ProductDetailView
            productId={nav.params.productId}
            onNavigate={handleNavigate}
            onAddToBag={handleAddToBag}
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
