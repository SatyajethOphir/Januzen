import React from "react";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "../utils/storage";
import { 
  Truck, Phone, ShieldCheck, MapPin, Loader2, RefreshCw, CheckCircle2, Navigation, User,
  ShieldAlert, LogIn, ArrowLeft, Bike, Compass
} from "lucide-react";
import { Order } from "../types";
import { io } from "socket.io-client";

interface DeliveryHubViewProps {
  currentUser?: any;
  onNavigate?: (view: string, params?: Record<string, any>) => void;
}

export default function DeliveryHubView({ currentUser, onNavigate }: DeliveryHubViewProps) {
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-gray-150 p-8 rounded-xl text-center space-y-5 shadow-sm">
        <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center">
          <ShieldAlert className="h-6 w-6 text-rose-600" />
        </div>
        <h3 className="font-serif text-xl font-bold text-slate-950">Administrative Authorization Needed</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          The delivery tracking and dispatch portal is restricted strictly to active administrators and authenticated logistics handlers of JANUZEN Global LLP.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
          {onNavigate && (
            <button
              onClick={() => onNavigate("home")}
              className="flex items-center justify-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Go Back Home
            </button>
          )}
          {onNavigate && !currentUser && (
            <button
              onClick={() => onNavigate("login", { redirectAfter: "delivery" })}
              className="flex items-center justify-center gap-2 bg-[#0F9B8E] hover:bg-[#0C7C72] text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer"
            >
              <LogIn className="h-4 w-4" /> Portal Access
            </button>
          )}
        </div>
      </div>
    );
  }

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [selectedDriverName, setSelectedDriverName] = React.useState("Suresh Kumar");
  const [otpInputs, setOtpInputs] = React.useState<Record<string, string>>({});
  const [otpErrors, setOtpErrors] = React.useState<Record<string, string>>({});
  
  // Real-time driver GPS trackers
  const [activeTrackers, setActiveTrackers] = React.useState<Record<string, {
    intervalId: any;
    lat: number;
    lng: number;
  }>>({});

  const socketRef = React.useRef<any>(null);

  React.useEffect(() => {
    socketRef.current = io();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const startTracking = async (orderId: string) => {
    if (activeTrackers[orderId]) {
      stopTracking(orderId);
    }

    if (!navigator.geolocation) {
      (window as any).showToast?.("Geolocation is not supported by your browser.", "error");
      return;
    }

    // Join room for the order in Socket.IO
    if (socketRef.current) {
      socketRef.current.emit("join-order", orderId);
    }

    const updateLocation = (lat: number, lng: number) => {
      const speed = Math.round(18 + Math.random() * 12);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("driver-location-update", {
          orderId,
          lat,
          lng,
          speed,
          status: "out_for_delivery"
        });
      } else {
        // REST Fallback
        fetch(`/api/orders/${orderId}/tracking/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat,
            lng,
            status: "out_for_delivery",
            speed
          })
        }).catch(err => console.error("Rider GPS update failed via REST:", err));
      }

      setActiveTrackers(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          lat,
          lng
        }
      }));
    };

    // Get immediate position first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.warn("Failed to get initial driver position:", err),
      { enableHighAccuracy: true }
    );

    // Watch position & stream every 3 seconds
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.error("Error watching representative location:", err),
        { enableHighAccuracy: true, timeout: 2500, maximumAge: 0 }
      );
    }, 3000);

    setActiveTrackers(prev => ({
      ...prev,
      [orderId]: {
        intervalId,
        lat: 17.5147,
        lng: 78.4116
      }
    }));

    (window as any).showToast?.("Started live GPS representative tracking!", "success");
  };

  const stopTracking = (orderId: string) => {
    const tracker = activeTrackers[orderId];
    if (tracker) {
      clearInterval(tracker.intervalId);
      setActiveTrackers(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
      (window as any).showToast?.("GPS representative tracking stopped.", "info");
    }
  };

  React.useEffect(() => {
    return () => {
      // Clean up all trackers on unmount
      Object.values(activeTrackers).forEach((t: any) => {
        clearInterval(t.intervalId);
      });
    };
  }, [activeTrackers]);

  // Delivery riders database
  const deliveryTeam = [
    {
      name: "Suresh Kumar",
      phone: "+91 98881 23456",
      zone: "Gajularamaram & West Hyd (Primary Representative on Standby)",
      vehicle: "Eco Hero Electric (TS-08-EV-4412)",
      status: "Active / On Duty",
      avatar: "SK"
    },
    {
      name: "Ramesh Patel",
      phone: "+91 98881 23457",
      zone: "Kukatpally & North Hyd",
      vehicle: "Bajaj Pulsar 150 (TS-07-HD-9081)",
      status: "Active / Out on Delivery",
      avatar: "RP"
    },
    {
      name: "Divya Reddy",
      phone: "+91 98881 23458",
      zone: "Express Delivery & Central Hyd",
      vehicle: "Ather 450X (TS-09-EV-1122)",
      status: "On Standby",
      avatar: "DR"
    }
  ];

  const loadAllOrders = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/orders-delivery");
      if (res.ok) {
        const data = await res.json();
        // sort descending
        const sorted = data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(sorted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAllOrders();
    // Auto refresh active dispatches every 4 seconds to maintain coordination
    const interval = setInterval(() => {
      loadAllOrders(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    setStatusMessage("");
    try {
      const res = await fetch(`/api/orders/${orderId}/status-driver`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: newStatus,
          note: `Delivery assigned to agent ${selectedDriverName}.`
        })
      });
      if (res.ok) {
        setStatusMessage(`Successfully set order status to: ${newStatus}`);
        loadAllOrders(true);
        setTimeout(() => setStatusMessage(""), 4000);
      } else {
        (window as any).showToast?.("Unable to adjust shipping state.", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVerifyOtp = async (orderId: string) => {
    const code = otpInputs[orderId];
    if (!code) return;
    setUpdatingId(orderId);
    setOtpErrors(prev => ({ ...prev, [orderId]: "" }));
    try {
      const res = await fetch(`/api/orders/${orderId}/verify-otp`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ otp: code })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`OTP confirmed successfully! Order marked as DELIVERED.`);
        // clear input
        setOtpInputs(prev => ({ ...prev, [orderId]: "" }));
        loadAllOrders(true);
        setTimeout(() => setStatusMessage(""), 5000);
      } else {
        setOtpErrors(prev => ({ ...prev, [orderId]: data.error || "Incorrect OTP." }));
      }
    } catch (err) {
      console.error(err);
      setOtpErrors(prev => ({ ...prev, [orderId]: "Failed to contact authorization servers." }));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleNavigateGoogleMaps = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/tracking`);
      if (res.ok) {
        const tracking = await res.json();
        if (tracking && tracking.customerLocation) {
          const { lat, lng } = tracking.customerLocation;
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
        } else {
          (window as any).showToast?.("No coordinates found for this delivery.", "warning");
        }
      } else {
        (window as any).showToast?.("Failed to retrieve coordinates.", "error");
      }
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Discrepancy opening navigation.", "error");
    }
  };

  // Filter orders that are not delivered/cancelled or have just been placed/dispatched
  const activeDispatches = orders.filter(o => o.status !== "Cancelled");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Visual Header */}
      <div className="bg-[#0D1B2A] text-white p-8 sm:p-10 rounded-3xl relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center p-8 select-none pointer-events-none">
          <Truck className="h-64 w-64 rotate-12" />
        </div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <span className="text-amber-400 font-mono text-xs uppercase tracking-widest font-black flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            ACTIVE JANUZEN LOGISTICS NETWORK
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight leading-none text-white">
            Delivery Representative Workspace
          </h1>
          <p className="text-slate-350 text-xs sm:text-sm font-sans leading-relaxed">
            Monitor dispatches originating from Gajularamaram, view active delivery team coordinates, and change fulfillment status in real-time.
          </p>
        </div>
      </div>

      {/* Row 1: Delivery Personnel Contact Directory */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#D4820A] font-bold">REPRESENTATIVE CONTACT ROSTER</span>
          <h2 className="font-serif text-2xl font-black text-[#0D1B2A] mt-1">Authorized Courier Officers</h2>
          <p className="text-xs text-gray-500 mt-1">Available for emergency dispatch calls, pharmaceutical shipping controls, and stationaries cargo logistics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {deliveryTeam.map((member, i) => (
            <div key={i} className="bg-white border border-gray-150 rounded-2xl p-5 hover:shadow-md transition-all space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#0D1B2A] text-white font-mono font-black text-xs flex items-center justify-center uppercase shadow-sm">
                  {member.avatar}
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-gray-900">{member.name}</h3>
                  <p className="text-[10px] text-gray-400 font-mono tracking-wider uppercase font-semibold">{member.vehicle}</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-gray-50 font-sans text-xs">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Navigation className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="line-clamp-1"><b>Coverage:</b> {member.zone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span><b>Phone:</b> <a href={`tel:${member.phone.replace(/\s+/g, "")}`} className="text-indigo-600 font-mono underline">{member.phone}</a></span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  member.status.includes("Standby") ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  ● {member.status}
                </span>
                <span className="text-[10px] text-gray-400">Nuthan Dispatch Staff</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Live Consignment Dispatches Panel */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#D4820A] font-bold">REAL-TIME SHIPMENT REGISTRY</span>
            <h2 className="font-serif text-2xl font-black text-[#0D1B2A] mt-1">Live Parcel Dispatch Board</h2>
            <p className="text-xs text-gray-500 mt-1 font-sans">
              Click status update buttons to notify clients and dynamically change shipment stages from placed state to delivered.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Driver Identity Simulator Selector */}
            <div className="bg-slate-100 p-2 rounded-xl flex items-center gap-2 border">
              <span className="text-[10px] font-mono font-bold text-gray-500">SIMULATE ACTIVE RIDER:</span>
              <select
                className="bg-white border rounded px-2 py-0.5 text-xs font-mono font-bold font-sans"
                value={selectedDriverName}
                onChange={(e) => setSelectedDriverName(e.target.value)}
              >
                {deliveryTeam.map((d, idx) => (
                  <option key={idx} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <button
              style={{ cursor: "pointer" }}
              onClick={() => loadAllOrders(false)}
              className="p-2 border bg-white hover:bg-slate-100 shadow-xs rounded-xl flex items-center justify-center text-gray-600 hover:text-black transition-all"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {statusMessage && (
          <p className="text-xs text-center font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 p-4 rounded-xl animate-pulse">
            ✓ {statusMessage}
          </p>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D1B2A] mx-auto" />
            <p className="text-xs text-gray-400 font-mono">Synchronizing consignment manifest...</p>
          </div>
        ) : activeDispatches.length === 0 ? (
          <div className="bg-white border p-12 text-center rounded-2xl space-y-3">
            <CheckCircle2 className="h-10 w-10 text-gray-400 mx-auto" />
            <h3 className="font-serif text-lg font-bold">No Consignment Deliveries Pending</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">There are currently no orders registered on the active dispatch map. Try placing a standard order to watch it update.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeDispatches.map((order) => {
              const isUpdating = updatingId === order.id;

              return (
                <div key={order.id} className="bg-white border border-gray-150 rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between">
                    
                    {/* Top Bar of Card */}
                    <div className="bg-slate-50 border-b border-gray-100 p-4 sm:px-6 flex justify-between items-baseline">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4820A] font-bold">CONSIGNMENT RECORD</span>
                        <h4 className="font-mono text-xs font-bold text-[#0D1B2A]">{order.orderId}</h4>
                      </div>
                      <span className={`text-[10px] font-mono font-bold uppercase rounded p-1 px-2 ${
                        order.status.toLowerCase() === "delivered" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : order.status.toLowerCase() === "cancelled"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-blue-50 text-blue-700 border border-blue-250 animate-pulse"
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Card Content body */}
                    <div className="p-5 sm:p-6 space-y-4">
                      
                      {/* Customer Particulars */}
                      <div className="space-y-1 text-xs">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-mono font-bold">CUSTOMER DETAILS</span>
                        <p className="font-bold text-gray-900">{order.userName}</p>
                        <p className="text-gray-500">{order.userEmail}</p>
                      </div>

                      {/* Package Shipping Address */}
                      <div className="space-y-1 text-xs">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-mono font-bold">DELIVERY ADDRESS</span>
                        <div className="text-gray-700 font-medium italic flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" />
                          <div>
                            {typeof order.shippingAddress === "object" && order.shippingAddress !== null ? (
                              <>
                                <p className="font-bold text-gray-900">{order.shippingAddress.fullName || order.userName}</p>
                                <p>{order.shippingAddress.addressLine}</p>
                                <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                                <p className="text-[11px] font-sans text-indigo-600 font-bold mt-0.5">📞 {order.shippingAddress.phone}</p>
                              </>
                            ) : (
                              <p>{String(order.shippingAddress || "Gajularamaram, Hyderabad, Telangana, India")}</p>
                            )}
                            <button
                              onClick={() => handleNavigateGoogleMaps(order.id)}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 hover:text-indigo-800 text-[10px] font-mono font-black uppercase rounded-lg cursor-pointer transition-all shadow-xs"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              Navigate with Google Maps
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Package Item Summary */}
                      <div className="space-y-1 text-xs">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-mono font-bold">CONSIGNMENT ITEMS</span>
                        <ul className="divide-y divide-gray-100 max-h-32 overflow-y-auto pr-1">
                          {order.items?.map((item: any, idx: number) => (
                            <li key={idx} className="py-1.5 flex justify-between text-gray-750 font-mono text-[11px]">
                              <span>{item.name} × {item.quantity}</span>
                              <span className="font-bold">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Invoice totals */}
                      <div className="pt-2 border-t border-dashed border-gray-100 flex justify-between items-baseline">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">NET INVOICED REVENUE</span>
                        <span className="font-mono text-base font-black text-emerald-700">₹{(order.totals?.total || 0).toFixed(2)}</span>
                      </div>

                      {/* 📡 REAL-TIME REPRESENTATIVE GPS TRACKING CONTROLLER */}
                      {order.status.toLowerCase() !== "delivered" && order.status.toLowerCase() !== "cancelled" && (
                        <div className="mt-4 p-4.5 bg-slate-50 border border-gray-200 rounded-2xl space-y-3.5">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] text-gray-900 font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                              <Compass className="h-4 w-4 text-[#0F9B8E] animate-spin" />
                              📡 LIVE GPS POSITION TRANSMISSION
                            </p>
                            <span className={`text-[9px] font-mono font-bold uppercase rounded px-2 py-0.5 ${
                              activeTrackers[order.id]
                                ? "bg-red-50 text-red-700 border border-red-200 animate-pulse"
                                : "bg-gray-100 text-gray-500 border border-gray-200"
                            }`}>
                              {activeTrackers[order.id] ? "● Broadcasting Live GPS" : "Transmitter Idle"}
                            </span>
                          </div>

                          {activeTrackers[order.id] ? (
                            <div className="space-y-2.5">
                              <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-100 text-[10px] leading-relaxed">
                                Real-time GPS stream activated! Driver device location is retrieved and updated securely every 3 seconds to generate dynamic route & ETAs.
                              </div>
                              <div className="flex justify-between items-baseline text-[10px] font-mono text-gray-500 pt-1">
                                <span>LAT: {activeTrackers[order.id].lat.toFixed(5)}</span>
                                <span>LNG: {activeTrackers[order.id].lng.toFixed(5)}</span>
                              </div>
                              <button
                                onClick={() => stopTracking(order.id)}
                                style={{ cursor: "pointer" }}
                                className="w-full py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-mono font-bold uppercase text-[10px] rounded-xl transition-all"
                              >
                                Stop GPS Transmission
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                                Obtain the representative's real GPS coordinates from this device to dynamically generate routing coordinates, update ETA, and remaining distance.
                              </p>
                              <button
                                onClick={() => startTracking(order.id)}
                                style={{ cursor: "pointer" }}
                                className="w-full py-2 bg-slate-900 hover:bg-black text-white font-mono font-bold uppercase text-[10px] rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                              >
                                <Bike className="h-4 w-4 text-emerald-400" />
                                Start Representative GPS Tracking
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {order.status.toLowerCase() !== "delivered" && order.status.toLowerCase() !== "cancelled" && (
                        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-155 rounded-xl space-y-2">
                          <p className="text-[10px] text-indigo-800 font-mono font-black uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                            CUSTOMER HANDOVER OTP VERIFICATION
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Enter Customer OTP"
                              className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-xs font-mono font-bold tracking-widest text-center flex-grow focus:outline-indigo-500 focus:border-indigo-500"
                              value={otpInputs[order.id] || ""}
                              onChange={(e) => setOtpInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                            />
                            <button
                              onClick={() => handleVerifyOtp(order.id)}
                              disabled={isUpdating || !otpInputs[order.id]}
                              style={{ cursor: "pointer" }}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-mono font-bold uppercase text-[10px] rounded-lg tracking-wider transition-all shadow-xs shrink-0"
                            >
                              Verify & Deliver
                            </button>
                          </div>
                          {otpErrors[order.id] && (
                            <p className="text-[10px] text-red-650 font-mono font-bold">{otpErrors[order.id]}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status Mutation Action Buttons */}
                    <div className="bg-slate-50 border-t border-gray-100 p-4 flex flex-wrap gap-2 justify-end">
                      
                      <button
                        style={{ cursor: "pointer" }}
                        onClick={() => handleUpdateStatus(order.id, "dispatched")}
                        disabled={isUpdating || order.status.toLowerCase() === "dispatched"}
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-mono font-black uppercase text-[10px] rounded-lg tracking-wider"
                      >
                        Dispatch Cargo
                      </button>

                      <button
                        style={{ cursor: "pointer" }}
                        onClick={() => handleUpdateStatus(order.id, "out_for_delivery")}
                        disabled={isUpdating || order.status.toLowerCase() === "out_for_delivery"}
                        className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-mono font-black uppercase text-[10px] rounded-lg tracking-wider"
                      >
                        Out For Delivery
                      </button>

                      <button
                        style={{ cursor: "pointer" }}
                        onClick={() => handleUpdateStatus(order.id, "delivered")}
                        disabled={isUpdating || order.status.toLowerCase() === "delivered"}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-mono font-black uppercase text-[10px] rounded-lg tracking-wider"
                      >
                        Mark Completed
                      </button>

                    </div>

                  </div>
                );
              })}
          </div>
        )}
      </div>

    </div>
  );
}
