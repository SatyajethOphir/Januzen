import React from "react";
import { 
  ShoppingBag, Clock, Truck, CheckCircle, AlertTriangle, ArrowLeft, 
  Calendar, CreditCard, MapPin, Sparkles, RefreshCw 
} from "lucide-react";
import { Order } from "../types";

interface OrdersHistoryViewProps {
  onNavigate: (view: string, params?: Record<string, any>) => void;
  currentUser: any;
}

export default function OrdersHistoryView({ onNavigate, currentUser }: OrdersHistoryViewProps) {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fetchUserOrders = React.useCallback(async () => {
    setLoading(true);
    setError("");
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
        // Sort orders descending by date (newest first)
        const sorted = data.sort((a: Order, b: Order) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setOrders(sorted);
      } else {
        setError("Failed to retrieve order history from JANUZEN servers.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUserOrders();
  }, [fetchUserOrders]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Pending":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
          label: "In Preparation",
          text: "We are currently packing and preparing your items at JANUZEN."
        };
      case "Dispatched":
        return {
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          icon: Truck,
          label: "Dispatched",
          text: "Out for delivery with the JANUZEN same-day dispatch fleet."
        };
      case "Delivered":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle,
          label: "Delivered",
          text: "Successfully delivered. Thank you for your support!"
        };
      case "Cancelled":
        return {
          bg: "bg-red-50 text-red-700 border-red-200",
          icon: AlertTriangle,
          label: "Cancelled",
          text: "This transaction was cancelled by administration or customer."
        };
      default:
        return {
          bg: "bg-gray-50 text-gray-700 border-gray-200",
          icon: Clock,
          label: "Processing",
          text: ""
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
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <span className="animate-spin h-9 w-9 border-4 border-[#0D1B2A] border-t-transparent rounded-full"></span>
          <p className="text-xs font-mono font-bold text-gray-500">Retrieving secure purchase catalog...</p>
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
