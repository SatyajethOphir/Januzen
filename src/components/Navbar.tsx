import React from "react";
import { ShoppingBag, User, LogOut, ShieldAlert, Activity, BookOpen, Menu, X, Settings } from "lucide-react";
import { User as UserType } from "../types";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  cartCount: number;
}

export default function Navbar({ currentView, onNavigate, currentUser, onLogout, cartCount }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
              <span className="block text-[9px] uppercase tracking-[#0.2em] text-gray-400 font-mono">Enterprise Group</span>
            </div>
          </div>

          {/* Desktop Navigation links */}
          <div className="hidden md:flex items-center space-x-1">
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
          <div className="hidden md:flex items-center space-x-4">
            {/* Cart Widget */}
            <button
              onClick={() => onNavigate("cart")}
              className="relative p-2 text-gray-300 hover:text-white transition-colors"
              title="Shopping Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-[#0F9B8E] rounded-full scale-75 animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

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

            {/* User Widget / Auth Control */}
            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 border-l border-gray-700">
                <div className="text-right">
                  <span className="block text-xs font-medium text-gray-200">{currentUser.name}</span>
                  <span className="block text-[10px] text-gray-400 capitalize bg-gray-800/60 px-1.5 py-0.5 rounded inline-block">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
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
          <div className="md:hidden flex items-center gap-3">
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
        <div className="md:hidden bg-[#0D1B2A] border-t border-[#1E293B]">
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

            {currentUser ? (
              <div className="pt-4 pb-2 border-t border-gray-800 px-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium text-white">{currentUser.name}</div>
                    <div className="text-sm font-medium text-gray-400 capitalize">{currentUser.role}</div>
                  </div>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm py-1 px-2 hover:bg-red-500/10 rounded"
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
