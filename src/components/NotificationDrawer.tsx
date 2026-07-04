import React, { useEffect, useState } from "react";
import {
  Bell,
  X,
  CheckCircle2,
  BellOff,
  CheckCheck,
  Clock,
  ExternalLink,
  Smartphone,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { Notification } from "../types";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  notifPermission: string;
  onRequestPermission: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  notifPermission,
  onRequestPermission
}) => {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [testing, setTesting] = useState(false);

  const handleTestUnifiedNotification = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
      if (!token) {
        alert("Please log in to trigger a test notification.");
        return;
      }
      const res = await fetch("/api/notifications/test-unified", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          type: "order_confirmed",
          title: "JANUZEN | Unified Notification Center Test",
          message: "Your order #TEST-ORD-9999 has been verified and processed by the JANUZEN Unified Notification Engine. An email receipt and real-time dashboard alert have been dispatched!",
          channel: "all"
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to trigger test notification");
      }
    } catch (e) {
      console.error("Test notification error:", e);
    } finally {
      setTesting(false);
    }
  };

  // Prevent background scrolling when drawer is open and handle Esc key
  useEffect(() => {
    if (!isOpen) return;

    // Handle Esc key to close drawer
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Optional: lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (isNaN(diffInSeconds)) return dateString;

      if (diffInSeconds < 60) return "Just now";
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications Drawer"
    >
      {/* Animated Backdrop - Clicking here closes the drawer */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity animate-fade-in cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel - Clicking inside does NOT close */}
      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
        
        {/* Drawer Header (GitHub / Slack UX Style) */}
        <div className="p-4 sm:p-5 bg-[#0D1B2A] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative bg-slate-800/80 p-2 rounded-xl border border-slate-700">
              <Bell className="h-5 w-5 text-emerald-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-rose-500 rounded-full border-2 border-[#0D1B2A] animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-black text-base tracking-wide">Notifications</h2>
                {unreadCount > 0 ? (
                  <span className="bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                    All caught up
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">Real-time alerts & order updates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close notifications drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs / Filter Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === "unread"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="bg-rose-100 text-rose-700 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Stream
          </span>
        </div>

        {/* Optional Push Permission Banner */}
        {notifPermission !== "granted" && (
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-start gap-3 shrink-0">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shrink-0 shadow-sm mt-0.5">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="flex-1 text-xs">
              <strong className="font-bold text-slate-900 block flex items-center gap-1">
                Enable Native Lock-Screen Alerts <Sparkles className="h-3 w-3 text-amber-500 inline" />
              </strong>
              <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5">
                Never miss dispatch confirmations or OTPs! Add JANUZEN to Home Screen (PWA) or allow device notifications.
              </p>
              {typeof window !== "undefined" && "Notification" in window ? (
                <button
                  type="button"
                  onClick={onRequestPermission}
                  className="mt-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer uppercase tracking-wider font-mono inline-block"
                >
                  Enable Device Alerts
                </button>
              ) : (
                <span className="mt-1.5 inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                  📱 Tap Share ➜ "Add to Home Screen"
                </span>
              )}
            </div>
          </div>
        )}

        {/* Notifications List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-slate-50/30">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="h-14 w-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-200">
                {filter === "unread" ? <CheckCircle2 className="h-7 w-7 text-emerald-500" /> : <BellOff className="h-7 w-7" />}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {filter === "unread" ? "No unread notifications!" : "Your inbox is empty"}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  {filter === "unread"
                    ? "You've read all your recent updates and alerts."
                    : "We'll notify you here when your orders dispatch or new promotions arrive."}
                </p>
              </div>
              {filter === "unread" && notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold underline cursor-pointer pt-1"
                >
                  View all {notifications.length} notifications
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 transition-colors relative group ${
                  !notif.isRead ? "bg-emerald-50/40 hover:bg-emerald-50/60" : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Indicator */}
                  <div className="mt-1 shrink-0">
                    {!notif.isRead ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 block ring-4 ring-emerald-100" title="Unread" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-300 block" title="Read" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`font-serif text-xs sm:text-sm leading-snug ${!notif.isRead ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 inline" />
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-sans mt-1.5 leading-relaxed whitespace-pre-wrap break-words">
                      {notif.content}
                    </p>

                    {/* Action Bar inside Notification */}
                    <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-slate-100/80">
                      {notif.linkUrl ? (
                        <a
                          href={notif.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 font-mono transition-colors"
                        >
                          <span>View Details</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span />
                      )}

                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => onMarkAsRead(notif.id)}
                          className="text-[10px] font-mono font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100/60 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <CheckCheck className="h-3 w-3" /> Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Test Unified Engine Action Bar */}
        <div className="p-2.5 bg-emerald-50/80 border-t border-emerald-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[#0F6E56] font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Unified Notification Center</span>
          </div>
          <button
            type="button"
            onClick={handleTestUnifiedNotification}
            disabled={testing}
            style={{ cursor: "pointer" }}
            className="text-[11px] font-mono font-bold uppercase tracking-wider bg-[#0F6E56] hover:bg-[#0A4D3C] text-white px-3 py-1 rounded-md shadow-xs transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            {testing ? "⚡ Dispatching..." : "⚡ Test Alert"}
          </button>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-[10px] text-slate-500 font-mono flex items-center justify-between px-4 shrink-0">
          <span>JANUZEN Production Notification Engine</span>
          <span>&bull;</span>
          <span className="text-slate-600 font-bold">Esc to close</span>
        </div>

      </div>
    </div>
  );
};
