import React from "react";
import { ShoppingBag, User, LogOut, ShieldAlert, Activity, BookOpen, Menu, X, Settings, Palette, Bell } from "lucide-react";
import { User as UserType } from "../types";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  cartCount: number;
  theme?: "light" | "dark" | "emerald" | "amber" | "device";
  onThemeChange?: (theme: "light" | "dark" | "emerald" | "amber" | "device") => void;
}

export default function Navbar({ currentView, onNavigate, currentUser, onLogout, cartCount, theme = "light", onThemeChange }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [notifOpen, setNotifOpen] = React.useState(false);

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
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#0D1B2A] text-white border-b border-[#1E293B] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onNavigate("home"); setMobileMenuOpen(false); }}>
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[#ffffff] text-[#0D1B2A] font-serif font-extrabold text-xl tracking-wider shadow">
              JZ
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-widest text-[#ffffff]">JANUZEN</span>
              <span className="block text-[9px] uppercase tracking-[#0.2em] text-gray-400 font-mono">Global LLP</span>
            </div>
          </div>

          {/* Desktop Navigation links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className={`px-3 py-2 rounded-md text-sm font-medium tracking-wide transition-all ${
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
          <div className="hidden lg:flex items-center space-x-4">
            {/* Cart Widget */}
            <button
              onClick={() => onNavigate("cart")}
              className="relative p-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Shopping Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-[#0F9B8E] rounded-full scale-75 animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Notifications Alert Bell Widget */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title="Notifications Alert Panel"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 text-[9px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-rose-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white text-slate-800 border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-3 bg-[#0D1B2A] text-white flex justify-between items-center">
                      <span className="font-serif font-bold text-xs tracking-wide">Notifications Box</span>
                      {unreadCount > 0 && (
                        <span className="bg-rose-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400 font-sans">
                          No pending notifications in your inbox.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className={`p-3 text-xs leading-relaxed transition-colors ${notif.isRead ? "bg-slate-50/50" : "bg-emerald-50/30"}`}>
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-serif font-bold text-slate-900 block">{notif.title}</span>
                              <span className="text-[9px] text-gray-400 shrink-0 font-mono">
                                {new Date(notif.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <p className="text-slate-600 font-sans mt-1 whitespace-pre-wrap">{notif.content}</p>
                            {!notif.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notif.id)}
                                className="mt-1.5 text-[10px] text-[#0F9B8E] hover:text-[#0C7C72] font-bold font-mono tracking-wide flex items-center gap-0.5 cursor-pointer"
                              >
                                Mark as Read
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Admin Dashboard shortcut if admin is logged in */}
            {currentUser && currentUser.role === "admin" && (
              <button
                onClick={() => onNavigate("admin")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4820A] text-white rounded text-xs font-medium tracking-wide hover:bg-opacity-90 transition-all border border-[#ffffff]/10 cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" />
                Admin Suite
              </button>
            )}

            {/* My Orders shortcut if any user is logged in */}
            {currentUser && (
              <button
                onClick={() => onNavigate("orders")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium tracking-wide transition-all border border-[#ffffff]/10 cursor-pointer ${
                  currentView === "orders" 
                    ? "bg-[#1E293B] text-white" 
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                My Orders
              </button>
            )}

            {/* Theme Thematic Modes dropdown selection */}
            <div className="relative group">
              <button 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#2D3748] text-white rounded text-xs font-mono font-bold tracking-wide transition-all border border-[#ffffff]/10 cursor-pointer"
                title="Swith Januzen Theme Mode"
              >
                <Palette className="h-3.5 w-3.5 text-amber-400" />
                Mode: <span className="capitalize text-teal-400 font-bold">{theme}</span>
              </button>
              
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#0D1B2A] border border-[#1e293b] rounded-lg shadow-2xl py-1 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
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
                <button
                  onClick={() => onThemeChange?.("emerald")}
                  className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[#1E293B] cursor-pointer transition-colors ${theme === "emerald" ? "text-amber-400 bg-slate-800" : "text-gray-300"}`}
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                  Clinical Emerald
                </button>
                <button
                  onClick={() => onThemeChange?.("amber")}
                  className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[#1E293B] cursor-pointer transition-colors ${theme === "amber" ? "text-amber-400 bg-slate-800" : "text-gray-300"}`}
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Warm Amber
                </button>
                <button
                  onClick={() => onThemeChange?.("device")}
                  className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[#1E293B] cursor-pointer transition-colors ${theme === "device" ? "text-teal-400 bg-slate-800" : "text-gray-300"}`}
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  Device Theme
                </button>
              </div>
            </div>

            {/* User Widget / Auth Control */}
            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 border-l border-gray-700">
                <button
                  onClick={() => onNavigate("profile")}
                  className="flex items-center gap-2 group text-left cursor-pointer"
                  title="View Secure Profile Parameters"
                >
                  {currentUser.image ? (
                    <img
                      src={currentUser.image}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full border border-gray-600 object-cover group-hover:border-[#0F9B8E] transition-colors"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-serif text-xs font-bold group-hover:bg-teal-500 transition-colors">
                      {currentUser.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="text-right">
                    <span className="block text-xs font-medium text-gray-200 group-hover:text-teal-300 transition-colors">{currentUser.name}</span>
                    <span className="block text-[10px] text-gray-400 capitalize bg-gray-800/60 px-1.5 py-0.5 rounded inline-block">
                      {currentUser.role}
                    </span>
                  </div>
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded hover:bg-red-500/10 cursor-pointer"
                  title="Logout Session"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate("login")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium tracking-wide border border-gray-600 rounded-md hover:text-white hover:bg-gray-800 transition-all"
              >
                <User className="h-4 w-4" />
                Portal Access
              </button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="lg:hidden flex items-center gap-3">
            <button
              onClick={() => onNavigate("cart")}
              className="relative p-2 text-gray-300"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-[#0F9B8E] rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
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
                <span className="px-3 text-[10px] font-mono tracking-widest text-[#0F9B8E] block uppercase font-bold">
                  Alert Notifications ({unreadCount} unread)
                </span>
                <div className="max-h-48 overflow-y-auto px-1 divide-y divide-gray-800/50">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-500 italic">No alerts.</p>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-3 text-xs bg-slate-900/40 my-1 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className={`${notif.isRead ? "text-gray-400" : "text-amber-400 font-bold"} block`}>
                            {notif.title}
                          </span>
                          {!notif.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-[9px] bg-teal-900 border border-teal-700 hover:bg-teal-800 text-teal-300 px-1 rounded uppercase tracking-wider font-bold"
                            >
                              read
                            </button>
                          )}
                        </div>
                        <p className="text-gray-400 font-sans mt-1 text-[11px] leading-relaxed whitespace-pre-wrap">{notif.content}</p>
                      </div>
                    ))
                  )}
                </div>
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
                <button
                  onClick={() => { onThemeChange?.("emerald"); setMobileMenuOpen(false); }}
                  className={`py-1.5 px-3 rounded text-center text-xs font-medium border h-9 flex items-center justify-center cursor-pointer ${theme === "emerald" ? "bg-[#0F9B8E] text-white border-[#0F9B8E] font-bold" : "text-gray-300 border-gray-700 hover:bg-[#1E293B]/60"}`}
                >
                  🧪 Emerald
                </button>
                <button
                  onClick={() => { onThemeChange?.("amber"); setMobileMenuOpen(false); }}
                  className={`py-1.5 px-3 rounded text-center text-xs font-medium border h-9 flex items-center justify-center cursor-pointer ${theme === "amber" ? "bg-[#D4820A] text-white border-[#D4820A] font-bold" : "text-gray-300 border-gray-700 hover:bg-[#1E293B]/60"}`}
                >
                  ✍️ Amber
                </button>
                <button
                  onClick={() => { onThemeChange?.("device"); setMobileMenuOpen(false); }}
                  className={`col-span-2 py-1.5 px-3 rounded text-center text-xs font-medium border h-9 flex items-center justify-center cursor-pointer ${theme === "device" ? "bg-slate-600 text-white border-slate-600 font-bold" : "text-gray-300 border-gray-700 hover:bg-[#1E293B]/60"}`}
                >
                  🖥️ Device Preference
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
  );
}
