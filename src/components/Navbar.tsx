import React from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { gsap } from "gsap";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "../utils/storage";
import { ShoppingBag, User, LogOut, ShieldAlert, Activity, BookOpen, Menu, X, Settings, Palette, Bell } from "lucide-react";
import { User as UserType } from "../types";
import { JanuzenLogo, NuthanMedicalsLogo, JaStationeryLogo } from "./Logos";
import { subscribeToPush } from "../lib/push";
import { NotificationDrawer } from "./NotificationDrawer";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  cartCount: number;
  theme?: "light" | "dark" | "emerald" | "amber" | "device";
  onThemeChange?: (theme: "light" | "dark" | "emerald" | "amber" | "device") => void;
  onCartClick?: () => void;
}

export default function Navbar({ currentView, onNavigate, currentUser, onLogout, cartCount, theme = "light", onThemeChange, onCartClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = React.useState(false);

  // Notification Permission states for native push alerts
  const [notifPermission, setNotifPermission] = React.useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied";
    return Notification.permission;
  });

  const [showPermissionBanner, setShowPermissionBanner] = React.useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    return Notification.permission === "default" && localStorage.getItem("januzen_notif_banner_dismissed") !== "true";
  });

  const handleRequestPermission = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    Notification.requestPermission().then((permission) => {
      setNotifPermission(permission);
      setShowPermissionBanner(false);
      if (permission === "granted") {
        (window as any).showToast?.("Push notifications enabled successfully! 🔔", "success");
        // Also subscribe client immediately to web push server
        subscribeToPush(currentUser?.id || undefined).catch((e) => {
          console.error("[PUSH] Subscription failed in permission handler:", e);
        });
      } else {
        (window as any).showToast?.("Notifications permission was not granted.", "info");
      }
    });
  };

  const handleDismissBanner = () => {
    localStorage.setItem("januzen_notif_banner_dismissed", "true");
    setShowPermissionBanner(false);
  };

  const cartIconRef = React.useRef<HTMLButtonElement>(null);
  const cartIconRefMobile = React.useRef<HTMLButtonElement>(null);
  const mobileMenuRef = React.useRef<HTMLElement>(null);

  useClickOutside(mobileMenuRef, () => setMobileMenuOpen(false), mobileMenuOpen);

  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  // Cart Icon GSAP hover effects (elite-themed)
  const handleCartMouseEnter = (isMobile: boolean) => {
    const targetRef = isMobile ? cartIconRefMobile : cartIconRef;
    if (targetRef.current) {
      gsap.to(targetRef.current, {
        scale: 1.15,
        rotate: -8,
        duration: 0.3,
        ease: "back.out(1.7)"
      });
      const icon = targetRef.current.querySelector("svg");
      if (icon) {
        gsap.to(icon, {
          color: "#3FE9D9",
          duration: 0.2
        });
      }
    }
  };

  const handleCartMouseLeave = (isMobile: boolean) => {
    const targetRef = isMobile ? cartIconRefMobile : cartIconRef;
    if (targetRef.current) {
      gsap.to(targetRef.current, {
        scale: 1,
        rotate: 0,
        duration: 0.3,
        ease: "power2.out"
      });
      const icon = targetRef.current.querySelector("svg");
      if (icon) {
        gsap.to(icon, {
          color: "currentColor",
          duration: 0.2
        });
      }
    }
  };

  // Bounce and elastic effect when items increment
  React.useEffect(() => {
    if (cartCount > 0) {
      if (cartIconRef.current) {
        gsap.fromTo(cartIconRef.current,
          { scale: 0.8, rotate: -15 },
          { scale: 1.25, rotate: 0, duration: 0.45, ease: "elastic.out(1.1, 0.45)", clearProps: "scale,rotate" }
        );
      }
      if (cartIconRefMobile.current) {
        gsap.fromTo(cartIconRefMobile.current,
          { scale: 0.8, rotate: -15 },
          { scale: 1.25, rotate: 0, duration: 0.45, ease: "elastic.out(1.1, 0.45)", clearProps: "scale,rotate" }
        );
      }
    }
  }, [cartCount]);

  const fetchNotifications = React.useCallback(async () => {
    if (!currentUser) return;
    const jwtToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!jwtToken) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error("Failed to load user notifications:", e);
    }
  }, [currentUser]);

  React.useEffect(() => {
    fetchNotifications();

    if (!currentUser) return;

    const jwtToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!jwtToken) return;

    // Use absolute or relative URL for real-time alert stream
    const streamUrl = `/api/updates/stream?token=${encodeURIComponent(jwtToken)}`;

    const eventSource = new EventSource(streamUrl);

    eventSource.addEventListener("connected", (event) => {
      // Connected to SSE stream
    });

    eventSource.addEventListener("notification", (event) => {
      try {
        const notif = JSON.parse(event.data);

        // Prepend new notification in real-time
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notif.id)) return prev;
          return [notif, ...prev];
        });

        // Trigger native browser notification
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const title = notif.title.startsWith("JANUZEN") ? notif.title : `JANUZEN | ${notif.title}`;
          const options = {
            body: notif.content,
            icon: "/appicon.png",
            badge: "/logo.png",
            tag: notif.id,
            requireInteraction: true // Keep the notification visible for important details like OTPs
          };

          if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, options);
            }).catch(() => {
              new Notification(title, options);
            });
          } else {
            new Notification(title, options);
          }
        }

        // Trigger in-app toast
        (window as any).showToast?.(`🔔 ${notif.title}: ${notif.content}`, "info");

        // Synthesize double-chime high pitch frequencies (Web Audio API)
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          osc.start();

          osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
          osc.stop(audioCtx.currentTime + 0.4);
        } catch (soundErr) {
          // Silent fallback if audio context blocked/unsupported
        }
      } catch (err) {
        console.error("Error processing real-time notification payload:", err);
      }
    });

    eventSource.addEventListener("error", (event) => {
      // Stream reconnecting
    });

    // Clean up EventSource on unmount/re-login
    return () => {
      eventSource.close();
    };
  }, [currentUser, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    const jwtToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!jwtToken) return;
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications/${n.id}/read`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${jwtToken}` }
          })
        )
      );
      (window as any).showToast?.("All notifications marked as read! ✔️", "success");
    } catch (e) {
      console.error("Error marking all read:", e);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    const jwtToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!jwtToken) return;
    try {
      const res = await fetch(`/api/notifications/${notifId}/read`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { label: "Home", view: "home" },
    { label: "Nuthan Medicals", view: "medicals" },
    { label: "JA Stationery", view: "stationery" },
    { label: "About", view: "about" },
    { label: "Contact", view: "contact" },
    ...(currentUser?.role === "admin" ? [{ label: "Delivery Portal", view: "delivery" }] : []),
  ];

  return (
    <>
      {currentUser && showPermissionBanner && (
        <div className="bg-gradient-to-r from-teal-800 via-[#0F9B8E] to-emerald-800 text-white py-2.5 px-4 text-center relative z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-sans font-medium">
            <span className="animate-pulse">🔔</span>
            <span>Enable real-time push alerts on this device to instantly receive your order status updates, OTP verifications, and announcements!</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRequestPermission}
              className="bg-white text-[#0F9B8E] hover:bg-teal-50 px-3 py-0.5 sm:py-1 rounded text-[10px] font-bold tracking-wider uppercase shadow transition-all cursor-pointer font-sans"
            >
              Enable
            </button>
            <button
              onClick={handleDismissBanner}
              className="bg-teal-900/40 hover:bg-teal-900/60 border border-teal-500/30 text-white px-2.5 py-0.5 sm:py-1 rounded text-[10px] font-medium transition-all cursor-pointer font-sans"
            >
              Later
            </button>
          </div>
        </div>
      )}
      <nav ref={mobileMenuRef} className="sticky top-0 z-50 bg-[#0D1B2A] text-white border-b border-[#1E293B] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 xl:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center gap-2 xl:gap-3 cursor-pointer shrink-0" onClick={() => { onNavigate("home"); setMobileMenuOpen(false); }}>
            <JanuzenLogo size={36} className="hover:rotate-6 transition-transform" />
            <div className="flex flex-col">
              <span className="font-serif text-base sm:text-lg font-bold tracking-widest text-[#ffffff] leading-tight">JANUZEN</span>
              <span className="block text-[8px] uppercase tracking-[#0.2em] text-gray-400 font-mono">Global LLP</span>
            </div>

            {/* Division-specific indicator logo next to main company label (only on 2xl+ to avoid layout overlaps) */}
            {currentView === "medicals" && (
              <div className="hidden 2xl:flex items-center gap-2 border-l border-white/20 pl-3 ml-1 animate-fade-in">
                <NuthanMedicalsLogo size={28} />
                <div className="flex flex-col">
                  <span className="font-serif text-[11px] font-bold text-[#3FE9D9] uppercase tracking-wider leading-none">Nuthan</span>
                  <span className="text-[7px] text-[#3FE9D9]/85 font-mono tracking-widest uppercase">Medicals</span>
                </div>
              </div>
            )}
            {currentView === "stationery" && (
              <div className="hidden 2xl:flex items-center gap-2 border-l border-white/20 pl-3 ml-1 animate-fade-in">
                <JaStationeryLogo size={28} />
                <div className="flex flex-col">
                  <span className="font-serif text-[11px] font-bold text-[#F5B041] uppercase tracking-wider leading-none">JA</span>
                  <span className="text-[7px] text-[#F5B041]/85 font-mono tracking-widest uppercase">Stationery</span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Navigation links */}
          <div className="hidden lg:flex items-center shrink-0 space-x-0.5 xl:space-x-1 2xl:space-x-2">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className={`rounded-md font-medium tracking-wide transition-all px-1.5 py-1 text-[10px] xl:px-2 xl:py-1 xl:text-xs 2xl:px-3 2xl:py-2 2xl:text-sm ${
                    isActive
                      ? "text-white bg-[#1E293B]"
                      : "text-gray-300 hover:text-white hover:bg-[#1E293B]/50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Action Widgets */}
          <div className="hidden lg:flex items-center shrink-0 space-x-1 xl:space-x-1.5 2xl:space-x-3">
            {/* Cart Widget */}
            <button
              ref={cartIconRef}
              onClick={() => {
                if (onCartClick) {
                  onCartClick();
                } else {
                  onNavigate("cart");
                }
              }}
              onMouseEnter={() => handleCartMouseEnter(false)}
              onMouseLeave={() => handleCartMouseLeave(false)}
              className="relative p-1.5 xl:p-2 text-gray-300 hover:text-white transition-all cursor-pointer transform"
              title="Shopping Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-[#0F9B8E] rounded-full shadow-md select-none">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Notifications Alert Bell Widget */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotifDrawerOpen(true)}
                  className="relative p-1.5 xl:p-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title="Notifications Alert Panel"
                  aria-label="Open notifications drawer"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 text-[9px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-rose-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Admin Dashboard shortcut if admin is logged in */}
            {currentUser && currentUser.role === "admin" && (
              <button
                onClick={() => onNavigate("admin")}
                className="flex items-center gap-1 bg-[#D4820A] text-white rounded font-medium tracking-wide hover:bg-opacity-90 transition-all border border-[#ffffff]/10 cursor-pointer animate-pulse px-1.5 py-1 text-[10px] xl:px-2 xl:py-1 xl:text-xs"
                title="Admin Suite"
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xl:inline text-[10px] 2xl:text-xs">Admin</span>
              </button>
            )}

            {/* My Orders shortcut if any user is logged in */}
            {currentUser && (
              <button
                onClick={() => onNavigate("orders")}
                className={`flex items-center gap-1 rounded font-medium tracking-wide transition-all border border-[#ffffff]/10 cursor-pointer px-1.5 py-1 text-[10px] xl:px-2 xl:py-1 xl:text-xs ${
                  currentView === "orders" 
                    ? "bg-[#1E293B] text-white" 
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
                title="My Order History"
              >
                <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xl:inline text-[10px] 2xl:text-xs">Orders</span>
              </button>
            )}

            {/* Theme Thematic Modes dropdown selection */}
            <div className="relative group">
              <button 
                className="flex items-center gap-1 bg-[#1E293B] hover:bg-[#2D3748] text-white rounded font-mono font-bold tracking-wide transition-all border border-[#ffffff]/10 cursor-pointer px-1.5 py-1 text-[10px] xl:px-2 xl:py-1 xl:text-xs"
                title="Switch Januzen Theme Mode"
              >
                <Palette className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="hidden 2xl:inline text-[10px] text-slate-300">Theme: </span>
                <span className="capitalize text-teal-400 font-bold">{theme}</span>
              </button>
              
              {/* Seam-free pointer hover helper bridge (with padding instead of margins) to prevent dropdown from vanishing */}
              <div className="absolute right-0 top-full pt-2 w-48 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <div className="bg-[#0D1B2A] border border-[#1e293b] rounded-lg shadow-2xl py-1">
                  <div className="px-3 py-1 text-[9px] font-mono tracking-widest text-gray-400 uppercase border-b border-gray-800 mb-1">
                    Select Theme
                  </div>
                  <button
                    onClick={() => onThemeChange?.("light")}
                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[#1E293B] cursor-pointer transition-colors ${theme === "light" ? "text-amber-400 bg-slate-800" : "text-gray-300"}`}
                  >
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                    Light Workspace
                  </button>
                  <button
                    onClick={() => onThemeChange?.("dark")}
                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[#1E293B] cursor-pointer transition-colors ${theme === "dark" ? "text-amber-400 bg-slate-800" : "text-gray-300"}`}
                  >
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-600"></span>
                    Dark Obsidian
                  </button>
                </div>
              </div>
            </div>

            {/* User Widget / Auth Control */}
            {currentUser ? (
              <div className="flex items-center gap-1 pl-1.5 xl:pl-2 border-l border-gray-700">
                <button
                  onClick={() => onNavigate("profile")}
                  className="flex items-center gap-1 xl:gap-2 group text-left cursor-pointer"
                  title="View Secure Profile Parameters"
                >
                  {currentUser.image ? (
                    <img
                      src={currentUser.image}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 xl:h-8 xl:w-8 rounded-full border border-gray-600 object-cover group-hover:border-[#0F9B8E] transition-colors shrink-0"
                    />
                  ) : (
                    <div className="h-7 w-7 xl:h-8 xl:w-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-serif text-[10px] xl:text-xs font-bold group-hover:bg-teal-500 transition-colors shrink-0">
                      {currentUser.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden xl:block text-left max-w-[80px]">
                    <span className="block text-[10px] font-bold text-gray-200 group-hover:text-teal-300 transition-colors truncate">
                      {currentUser.name.split(" ")[0]}
                    </span>
                    <span className="block text-[8px] text-gray-400 capitalize bg-gray-800/60 px-1 py-0.25 rounded inline-block truncate max-w-[65px]">
                      {currentUser.role}
                    </span>
                  </div>
                </button>
                <button
                  onClick={onLogout}
                  className="p-1.5 xl:p-2 text-gray-400 hover:text-red-400 transition-colors rounded hover:bg-red-500/10 cursor-pointer shrink-0"
                  title="Logout Session"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate("login")}
                className="flex items-center gap-1.5 px-3 py-1.5 xl:px-4 xl:py-2 text-xs xl:text-sm font-medium tracking-wide border border-gray-600 rounded-md hover:text-white hover:bg-gray-800 transition-all shrink-0"
              >
                <User className="h-4 w-4 shrink-0" />
                Portal Access
              </button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="lg:hidden flex items-center gap-3">
            <button
              ref={cartIconRefMobile}
              onClick={() => {
                if (onCartClick) {
                  onCartClick();
                } else {
                  onNavigate("cart");
                }
              }}
              onMouseEnter={() => handleCartMouseEnter(true)}
              onMouseLeave={() => handleCartMouseLeave(true)}
              className="relative p-2 text-gray-300 pointer-events-auto transform"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold leading-none text-white bg-[#0F9B8E] rounded-full shadow-md select-none">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Notification Bell */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotifDrawerOpen(true)}
                  className="relative p-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title="Notifications Alert Panel"
                  aria-label="Open notifications drawer"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 text-[9px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-rose-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0D1B2A] border-t border-[#1E293B]">
          <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    onNavigate(item.view);
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium tracking-wide ${
                    isActive ? "text-white bg-[#1E293B]" : "text-gray-300 hover:text-white hover:bg-[#1E293B]/50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {currentUser && currentUser.role === "admin" && (
              <button
                onClick={() => {
                  onNavigate("admin");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded bg-[#D4820A] text-white text-base font-medium cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                Admin Suite
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => {
                  onNavigate("orders");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded text-base font-medium cursor-pointer ${
                  currentView === "orders" ? "text-white bg-[#1E293B]" : "text-gray-300 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                My Orders
              </button>
            )}

            {currentUser && (
              <div className="border-t border-gray-800 pt-3 mt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsNotifDrawerOpen(true);
                  }}
                  className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-base font-medium cursor-pointer text-gray-300 hover:text-white hover:bg-slate-800/40"
                >
                  <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#0F9B8E]" />
                    <span>Notifications</span>
                  </span>
                  {unreadCount > 0 ? (
                    <span className="bg-rose-500 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 font-mono">All read</span>
                  )}
                </button>
              </div>
            )}

            {/* Mobile theme modes */}
            <div className="pt-4 pb-2 border-t border-gray-800 px-3 space-y-2">
              <span className="text-[10px] font-mono tracking-widest text-gray-400 block uppercase">Thematic Theme Mode</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onThemeChange?.("light"); setMobileMenuOpen(false); }}
                  className={`py-1.5 px-3 rounded text-center text-xs font-medium border h-9 flex items-center justify-center cursor-pointer ${theme === "light" ? "bg-white text-black border-white font-bold" : "text-gray-300 border-gray-700 hover:bg-gray-800"}`}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => { onThemeChange?.("dark"); setMobileMenuOpen(false); }}
                  className={`py-1.5 px-3 rounded text-center text-xs font-medium border h-9 flex items-center justify-center cursor-pointer ${theme === "dark" ? "bg-white text-black border-white font-bold" : "text-gray-300 border-gray-700 hover:bg-gray-800"}`}
                >
                  🌙 Dark
                </button>
              </div>
            </div>

            {currentUser ? (
              <div className="pt-4 pb-2 border-t border-gray-800 px-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      onNavigate("profile");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 text-left group cursor-pointer"
                  >
                    {currentUser.image ? (
                      <img
                        src={currentUser.image}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 rounded-full border border-gray-600 object-cover group-hover:border-[#0F9B8E] transition-colors"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-serif text-xs font-bold group-hover:bg-teal-500 transition-colors">
                        {currentUser.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-teal-300 transition-colors">{currentUser.name}</div>
                      <div className="text-xs font-medium text-gray-400 capitalize">{currentUser.role}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm py-1 px-2 hover:bg-red-500/10 rounded cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-800 px-3">
                <button
                  onClick={() => {
                    onNavigate("login");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-600 rounded-md text-white hover:bg-gray-800 transition"
                >
                  <User className="h-4 w-4" />
                  Portal Access
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>

    {/* Slide-over Notification Drawer */}
    <NotificationDrawer
      isOpen={isNotifDrawerOpen}
      onClose={() => setIsNotifDrawerOpen(false)}
      notifications={notifications}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      notifPermission={notifPermission}
      onRequestPermission={handleRequestPermission}
    />
    </>
  );
}
