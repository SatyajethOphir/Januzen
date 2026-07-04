import React from "react";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "../utils/storage";
import { 
  ShoppingBag, Clock, Truck, CheckCircle, AlertTriangle, ArrowLeft, 
  Calendar, CreditCard, MapPin, Sparkles, RefreshCw 
} from "lucide-react";
import { Order } from "../types";
import { OrderHistorySkeleton } from "./SkeletonLoader";

interface OrdersHistoryViewProps {
  onNavigate: (view: string, params?: Record<string, any>) => void;
  currentUser: any;
}

export default function OrdersHistoryView({ onNavigate, currentUser }: OrdersHistoryViewProps) {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const fetchUserOrders = React.useCallback(async (skipSpinner = false) => {
    if (!skipSpinner) {
      setLoading(true);
      setError("");
    }
    const token = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!token) {
      setError("Please log in to view your orders.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: Order, b: Order) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setOrders(sorted);
      } else if (!skipSpinner) {
        setError("Failed to retrieve order history from JANUZEN servers.");
      }
    } catch (err) {
      console.error(err);
      if (!skipSpinner) {
        setError("Network error. Please try again later.");
      }
    } finally {
      if (!skipSpinner) {
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    fetchUserOrders(false);
    // Real-time auto-refresh customer panel every 4 seconds to listen for admin changes
    const interval = setInterval(() => {
      fetchUserOrders(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchUserOrders]);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    setActionSuccess(null);
    const token = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setActionSuccess(`Order cancelled successfully.`);
        fetchUserOrders(true);
        setTimeout(() => setActionSuccess(null), 5000);
      } else {
        const errData = await res.json();
        setActionError(errData.error || "Failed to cancel order.");
        setTimeout(() => setActionError(null), 6000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadPDF = async (order: Order) => {
    setDownloadingId(order.id);
    try {
      const token = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
      const response = await fetch(`/api/orders/${order.id}/invoice/download?token=${token}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `JANUZEN-Invoice-${order.orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF Download Error:", err);
      alert("Error downloading PDF invoice. Please check your network or try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusStyle = (status: string) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "placed":
      case "pending":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
          label: "In Preparation",
          text: "Your order is confirmed! We are currently picking and packing your items at JANUZEN Hub."
        };
      case "dispatched":
        return {
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          icon: Truck,
          label: "Dispatched",
          text: "Your package is now hand-sorted and dispatched to the courier terminal."
        };
      case "out_for_delivery":
      case "outfordelivery":
        return {
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: Truck,
          label: "Out For Delivery",
          text: "Active in-transit: A JANUZEN courier representative is carrying your parcel and heading towards your destination now."
        };
      case "delivered":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle,
          label: "Delivered",
          text: "Fulfillment complete: Package successfully handed over. Thank you for choosing JANUZEN!"
        };
      case "cancelled":
        return {
          bg: "bg-red-50 text-red-700 border-red-200",
          icon: AlertTriangle,
          label: "Cancelled",
          text: "This transaction has been cancelled by administration or customer request."
        };
      default:
        return {
          bg: "bg-gray-50 text-gray-700 border-gray-200",
          icon: Clock,
          label: "Processing",
          text: "Preparing your shipment."
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onNavigate("home")} 
              className="p-1.5 hover:bg-slate-100 rounded-lg text-gray-500 hover:text-black transition-all cursor-pointer mr-1"
              title="Return Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-xs uppercase tracking-[#0.2em] text-[#D4820A] font-bold font-mono">Personal Client Area</span>
          </div>
          <h1 className="font-serif text-3xl font-black text-gray-950 flex items-center gap-2 pl-1">
            <ShoppingBag className="h-7 w-7 text-[#0D1B2A]" />
            Your Order History
          </h1>
          <p className="text-xs text-gray-500 pl-1">
            Monitor and review the fulfillment stages of your prescription medicine & stationery packages.
          </p>
        </div>

        <button
          onClick={fetchUserOrders}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-gray-200 text-xs font-bold font-mono px-4 py-2.5 rounded-lg text-gray-700 cursor-pointer shadow-sm transition-all"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh Registry
        </button>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <OrderHistorySkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="max-w-md mx-auto bg-white border border-red-150 rounded-xl p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-gray-900">Database Connection Hiccup</h3>
          <p className="text-xs text-gray-500">{error}</p>
          <button 
            onClick={() => onNavigate("login")}
            className="px-5 py-2.5 bg-[#0D1B2A] text-white text-xs font-bold uppercase rounded-lg cursor-pointer hover:opacity-95"
          >
            Access Portal
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="max-w-lg mx-auto bg-white border border-gray-150 rounded-xl p-10 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 border border-dashed border-gray-200 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-gray-900">No Orders Registered Yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              You haven't purchased any items recently. Browse our clinical healthcare items or premium workstation papers to place your first request!
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => onNavigate("medicals")}
              className="px-4 py-2.5 bg-[#0F9B8E] text-white text-xs font-bold uppercase tracking-wide rounded-lg cursor-pointer hover:bg-opacity-95 transition-all shadow-sm"
            >
              Nuthan Medicals
            </button>
            <button
              onClick={() => onNavigate("stationery")}
              className="px-4 py-2.5 bg-[#0D1B2A] text-white text-xs font-bold uppercase tracking-wide rounded-lg cursor-pointer hover:bg-opacity-95 transition-all shadow-sm"
            >
              JA Stationery
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const statusConfig = getStatusStyle(order.status);
            const StatusIcon = statusConfig.icon;
            const dateStr = new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div 
                key={order.id} 
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                {/* Order Top Banner */}
                <div className="bg-slate-50 px-6 py-4 border-b border-gray-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase font-mono tracking-widest">ORDER UNIQUE KEY</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-950">{order.orderId}</span>
                      <span className="text-xs text-gray-300">|</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-2.5">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border ${statusConfig.bg}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusConfig.label}
                    </div>
                  </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-150">
                  
                  {/* Left block: Purchase list items (2 cols) */}
                  <div className="lg:col-span-2 p-6 space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2">
                      Items In Shipment
                    </h3>
                    <div className="space-y-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-4">
                          <img 
                            src={item.image} 
                            referrerPolicy="no-referrer"
                            alt={item.name} 
                            className="h-14 w-14 object-cover rounded-lg border border-gray-200 bg-slate-50 flex-shrink-0"
                          />
                          <div className="flex-grow space-y-1">
                            <h4 className="font-serif text-sm font-bold text-gray-900 leading-snug">{item.name}</h4>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono">
                              <span className={`px-2 py-0.5 rounded uppercase font-bold text-[9px] ${
                                item.shop === "medicals" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-slate-100 text-gray-700"
                              }`}>
                                {item.shop === "medicals" ? "Nuthan Medicals" : "JA Stationery"}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="text-gray-500">Qty: {item.quantity}</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-gray-500">₹{item.price.toFixed(2)} each</span>
                            </div>
                          </div>
                          <div className="text-right pl-2">
                            <p className="font-mono text-xs font-bold text-gray-950">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Shipping description status updates */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-gray-150/70 space-y-2 mt-4">
                      <p className="text-[10px] uppercase font-bold text-[#D4820A] tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Live Status Insight
                      </p>
                      <p className="text-xs text-gray-600 leading-normal">
                        {statusConfig.text}
                      </p>
                      {order.deliveryOTP && order.status !== "delivered" && order.status !== "Delivered" && order.status !== "Cancelled" && (
                        <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-teal-800 uppercase font-mono font-black tracking-wider">🔑 Delivery Handover OTP</p>
                            <p className="text-xs text-teal-600 font-medium leading-normal mt-0.5">Give this secure code to your delivery agent to confirm receipt.</p>
                          </div>
                          <span className="font-mono text-xl font-black text-teal-950 tracking-wider bg-white px-3 py-1 rounded border border-teal-200 shadow-sm ml-2">{order.deliveryOTP}</span>
                        </div>
                      )}
                    </div>

                    {/* Visual Progress Stepper Tracker */}
                    <div className="bg-slate-50 rounded-lg p-5 border border-gray-150/70 space-y-4 mt-4">
                      <p className="text-[10px] uppercase font-bold text-[#0D1B2A] tracking-wider font-mono">📦 Shipment Transit Milestones</p>
                      
                      <div className="relative flex justify-between items-center w-full mt-4 px-2">
                        {/* Connecting Line */}
                        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-gray-200 -z-0 rounded"></div>
                        <div 
                          className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 transition-all duration-500 rounded -z-0"
                          style={{
                            width: 
                              order.status.toLowerCase() === "placed" ? "10%" :
                              order.status.toLowerCase() === "dispatched" ? "45%" :
                              order.status.toLowerCase() === "out_for_delivery" ? "80%" :
                              order.status.toLowerCase() === "delivered" ? "95%" : "0%"
                          }}
                        ></div>

                        {/* Milestone 1: Placed */}
                        <div className="flex flex-col items-center relative z-10">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${
                            ["placed", "dispatched", "out_for_delivery", "delivered"].includes(order.status.toLowerCase())
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 border-2 border-indigo-600"
                              : "bg-white border-2 border-gray-250 text-gray-400"
                          }`}>
                            1
                          </div>
                          <span className="text-[9px] font-mono font-extrabold mt-1.5 uppercase text-gray-700 tracking-wider">Placed</span>
                        </div>

                        {/* Milestone 2: Dispatched */}
                        <div className="flex flex-col items-center relative z-10">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${
                            ["dispatched", "out_for_delivery", "delivered"].includes(order.status.toLowerCase())
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 border-2 border-indigo-600"
                              : "bg-white border-2 border-gray-250 text-gray-400"
                          }`}>
                            2
                          </div>
                          <span className="text-[9px] font-mono font-extrabold mt-1.5 uppercase text-gray-700 tracking-wider">Dispatched</span>
                        </div>

                        {/* Milestone 3: Out For Delivery */}
                        <div className="flex flex-col items-center relative z-10">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${
                            ["out_for_delivery", "delivered"].includes(order.status.toLowerCase())
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 border-2 border-indigo-600"
                              : "bg-white border-2 border-gray-250 text-gray-400"
                          }`}>
                            3
                          </div>
                          <span className="text-[9px] font-mono font-extrabold mt-1.5 uppercase text-gray-700 tracking-wider">In Transit</span>
                        </div>

                        {/* Milestone 4: Delivered */}
                        <div className="flex flex-col items-center relative z-10">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 ${
                            order.status.toLowerCase() === "delivered"
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-200 border-2 border-emerald-600"
                              : "bg-white border-2 border-gray-250 text-gray-400"
                          }`}>
                            ✓
                          </div>
                          <span className="text-[9px] font-mono font-extrabold mt-1.5 uppercase text-gray-700 tracking-wider">Delivered</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right block: Dest, totals, payment details */}
                  <div className="p-6 space-y-6 bg-[#FAFBFC] lg:bg-transparent">
                    {/* Shipping Address */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        Shipping Destination
                      </h4>
                      <div className="text-xs text-slate-700 font-sans leading-normal bg-white p-3 rounded-lg border border-gray-200/60 shadow-xs">
                        <p className="font-bold text-gray-950">{order.userName}</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">{order.userEmail}</p>
                        <div className="mt-2 text-gray-600 border-t border-gray-100 pt-2 break-words font-mono text-[11px] space-y-1">
                          {typeof order.shippingAddress === "object" && order.shippingAddress !== null ? (
                            <>
                              <p className="font-semibold text-gray-900">Deliver To: {order.shippingAddress.fullName}</p>
                              <p>{order.shippingAddress.addressLine}</p>
                              <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                              <p className="text-gray-500 font-sans mt-1">📞 {order.shippingAddress.phone}</p>
                            </>
                          ) : (
                            <p>{String(order.shippingAddress)}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payment details */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-gray-400" />
                        Billing Method
                      </h4>
                      <p className="text-xs font-mono font-bold text-gray-700 pl-4">
                        💳 {order.paymentMethod || "Cash on Delivery"}
                      </p>
                    </div>

                    {/* Invoice Calculations */}
                    <div className="space-y-2 pt-2 border-t border-gray-150">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">
                        Invoice Calculations
                      </h4>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between text-gray-500">
                          <span>Subtotal:</span>
                          <span>₹{(order.totals?.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Shipping:</span>
                          <span>
                            {order.totals?.shipping === 0 ? "FREE" : `₹${(order.totals?.shipping || 0).toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Surcharge Tax (5%):</span>
                          <span>₹{(order.totals?.tax || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[#0D1B2A] font-bold text-sm border-t border-dashed border-gray-200 pt-2 mt-1 font-sans">
                          <span>Grand Total Due:</span>
                          <span className="font-mono text-base font-black text-[#0D1B2A]">
                            ₹{(order.totals?.total || 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={() => onNavigate("invoice", { orderId: order.id })}
                            style={{ cursor: "pointer" }}
                            className="w-full py-2 px-2 border border-emerald-200 hover:border-[#0F6E56]/30 bg-emerald-50 hover:bg-[#0F6E56]/10 text-[#0F6E56] text-xs font-mono font-bold uppercase rounded-lg transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            📄 View Invoice
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(order)}
                            disabled={downloadingId === order.id}
                            style={{ cursor: "pointer" }}
                            className="w-full py-2 px-2 border border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-mono font-bold uppercase rounded-lg transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {downloadingId === order.id ? "⌛ Downloading..." : "📥 Download PDF"}
                          </button>
                        </div>

                        <div className="pt-1.5">
                          <a
                            href={`https://wa.me/919666588553?text=Hello%20JANUZEN%20Support,%20I%20need%20assistance%20with%20my%20order%20%23${order.orderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-1.5 px-3 border border-emerald-300 bg-[#E6F4EA] hover:bg-[#CEEAD6] text-[#0F6E56] text-[11px] font-sans font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                          >
                            💬 WhatsApp Support & Manual Order Help
                          </a>
                        </div>

                        {/* Customer Cancel action button */}
                        {order.status !== "Delivered" && order.status !== "Cancelled" && order.status !== "Dispatched" && order.status !== "out_for_delivery" && (
                          <div className="pt-2">
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={cancellingId === order.id}
                              style={{ cursor: "pointer" }}
                              className="w-full py-2 px-3 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-mono font-bold uppercase rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5"
                            >
                              {cancellingId === order.id ? (
                                <>
                                  <span className="animate-spin h-3.5 w-3.5 border-2 border-red-700 border-t-transparent rounded-full"></span>
                                  Cancelling...
                                </>
                              ) : "Cancel This Order"}
                            </button>
                          </div>
                        )}
                        {actionSuccess && (
                          <p className="text-[10px] text-center text-emerald-600 font-mono font-bold mt-1 bg-emerald-50 py-1 rounded">
                            {actionSuccess}
                          </p>
                        )}
                        {actionError && (
                          <div className="text-[10px] text-center text-red-650 font-mono font-bold mt-1 bg-red-50 py-1 rounded px-1 max-w-full overflow-hidden text-ellipsis">
                            {actionError}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
