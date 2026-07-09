import React from "react";
import { io } from "socket.io-client";
import { 
  ArrowLeft, Bike, Clock, MapPin, Phone, RefreshCw, AlertCircle, 
  CheckCircle2, Compass, Activity, Package, ShieldCheck, ExternalLink,
  ChevronRight, Navigation, Sparkles, Heart
} from "lucide-react";
import { Order } from "../types";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "../utils/storage";

interface LiveTrackingViewProps {
  orderId?: string;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  currentUser?: any;
}

// Fixed Gajularamaram Hub Coordinates (Store Location)
const STORE_LAT = 17.5147;
const STORE_LNG = 78.4116;

/**
 * Calculates Haversine distance between two coordinates
 */
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Fallback ETA calculation based on distance
 */
function getFallbackETA(distanceKm: number): number {
  return Math.max(2, Math.round((distanceKm / 20) * 60 + 3));
}

export default function LiveTrackingView({ orderId, onNavigate, currentUser }: LiveTrackingViewProps) {
  const [ordersList, setOrdersList] = React.useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>(orderId || "");
  const [activeOrder, setActiveOrder] = React.useState<Order | null>(null);
  const [trackingData, setTrackingData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  // Map state
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<{
    store?: any;
    customer?: any;
    driver?: any;
    routeLine?: any;
  }>({});

  const [routeCoords, setRouteCoords] = React.useState<Array<[number, number]>>([]);
  const [routeLoading, setRouteLoading] = React.useState<boolean>(false);
  const [distanceKm, setDistanceKm] = React.useState<number>(0);
  const [etaMinutes, setEtaMinutes] = React.useState<number>(0);

  const socketRef = React.useRef<any>(null);

  // 1. Fetch available orders for lookup selection
  const fetchOrders = React.useCallback(async () => {
    try {
      const token = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
      if (!token) return;

      const isAdmin = currentUser?.isAdmin;
      const url = isAdmin ? "/api/admin/orders" : "/api/orders";
      
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data: Order[] = await res.json();
        // Sort active orders first (Dispatched, Out For Delivery, Placed), then completed
        const sorted = [...data].sort((a, b) => {
          const aActive = ["placed", "dispatched", "out_for_delivery"].includes(String(a.status).toLowerCase());
          const bActive = ["placed", "dispatched", "out_for_delivery"].includes(String(b.status).toLowerCase());
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setOrdersList(sorted);

        // If no selectedOrderId but we have active orders, auto-select the first active one
        if (!selectedOrderId && sorted.length > 0) {
          const firstActive = sorted.find(o => 
            ["placed", "dispatched", "out_for_delivery"].includes(String(o.status).toLowerCase())
          );
          if (firstActive) {
            setSelectedOrderId(firstActive.id);
          } else {
            setSelectedOrderId(sorted[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching order list for tracker:", err);
    }
  }, [currentUser, selectedOrderId]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 2. Load Selected Order and Tracking details
  const fetchTrackingDetails = React.useCallback(async (quiet = false) => {
    if (!selectedOrderId) {
      setLoading(false);
      return;
    }

    if (!quiet) {
      setLoading(true);
      setError("");
    } else {
      setRefreshing(true);
    }

    try {
      const token = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch tracking info
      const trackingRes = await fetch(`/api/orders/${selectedOrderId}/tracking`, { headers });
      if (!trackingRes.ok) {
        throw new Error("Unable to retrieve live telemetry status for this order.");
      }
      const trackPayload = await trackingRes.json();
      setTrackingData(trackPayload);

      // Fetch order metadata (find in ordersList or call API)
      let foundOrder = ordersList.find(o => o.id === selectedOrderId);
      if (!foundOrder) {
        // Fallback fetch all to find
        const isAdmin = currentUser?.isAdmin;
        const url = isAdmin ? "/api/admin/orders" : "/api/orders";
        const oRes = await fetch(url, { headers });
        if (oRes.ok) {
          const oData: Order[] = await oRes.json();
          foundOrder = oData.find(o => o.id === selectedOrderId);
        }
      }

      if (foundOrder) {
        setActiveOrder(foundOrder);
      } else {
        // Mock a minimal order object if not found
        setActiveOrder({
          id: selectedOrderId,
          orderId: trackPayload.orderId || `ORD-${selectedOrderId.substring(0, 8).toUpperCase()}`,
          status: trackPayload.status || "Dispatched",
          items: [],
          totals: { subtotal: 0, shipping: 0, tax: 0, total: trackPayload.distance * 12 || 120 },
          shippingAddress: { fullName: "Valued Customer", addressLine: "Hyderabad, India", city: "Hyderabad", postalCode: "500090", phone: "" },
          paymentMethod: "Online",
          createdAt: new Date().toISOString(),
          userName: "Customer",
          userEmail: ""
        } as any);
      }
    } catch (err: any) {
      console.error("Error loading live tracking:", err);
      setError(err.message || "Failed to initialize active telemetry stream.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedOrderId, ordersList, currentUser]);

  React.useEffect(() => {
    fetchTrackingDetails();
  }, [selectedOrderId, fetchTrackingDetails]);

  // 3. Socket.IO connection for live updates
  React.useEffect(() => {
    if (!selectedOrderId) return;

    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-order", selectedOrderId);
    });

    socket.on("location-updated", (data) => {
      if (data.orderId === selectedOrderId) {
        setTrackingData(data);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedOrderId]);

  // Customer periodic position update if permission is active
  React.useEffect(() => {
    if (!selectedOrderId || !activeOrder) return;
    
    // Check if order is already completed or cancelled to stop tracking immediately
    const normalizedStatus = String(activeOrder.status || "").toLowerCase();
    if (normalizedStatus === "delivered" || normalizedStatus === "cancelled") return;

    const hasPermission = localStorage.getItem(`tracking_permission_${selectedOrderId}`) === "granted";
    if (!hasPermission) return;

    const intervalId = setInterval(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            await fetch(`/api/orders/${selectedOrderId}/tracking/update`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat: latitude, lng: longitude, isCustomer: true })
            });
          } catch (err) {
            console.error("Error updating customer live position in tracker:", err);
          }
        },
        (err) => console.warn("Failed to watch active customer location in tracker:", err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [selectedOrderId, activeOrder]);

  // 4. Calculate OSRM route, ETA, and Distance dynamically when locations change
  React.useEffect(() => {
    if (!trackingData?.currentLocation || !trackingData?.customerLocation) {
      setRouteCoords([]);
      return;
    }

    const startLat = trackingData.currentLocation.lat;
    const startLng = trackingData.currentLocation.lng;
    const endLat = trackingData.customerLocation.lat;
    const endLng = trackingData.customerLocation.lng;

    const fetchRouteAndETA = async () => {
      setRouteLoading(true);
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            setRouteCoords(coords);
            setDistanceKm(parseFloat((route.distance / 1000).toFixed(2)));
            setEtaMinutes(Math.max(1, Math.round(route.duration / 60)));
            setRouteLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("OSRM Client router failed, using Haversine fallback:", err);
      }

      // Straight line fallback
      const dist = getHaversineDistance(startLat, startLng, endLat, endLng);
      setRouteCoords([[startLat, startLng], [endLat, endLng]]);
      setDistanceKm(parseFloat(dist.toFixed(2)));
      setEtaMinutes(getFallbackETA(dist));
      setRouteLoading(false);
    };

    fetchRouteAndETA();
  }, [trackingData?.currentLocation, trackingData?.customerLocation]);

  // 5. Leaflet Map initialization and synchronization
  React.useEffect(() => {
    if (!mapContainerRef.current || !trackingData) return;

    let isMounted = true;
    let L: any = null;

    const dLat = trackingData.currentLocation?.lat || STORE_LAT;
    const dLng = trackingData.currentLocation?.lng || STORE_LNG;
    const cLat = trackingData.customerLocation?.lat || STORE_LAT + 0.03;
    const cLng = trackingData.customerLocation?.lng || STORE_LNG + 0.02;

    const initMap = async () => {
      try {
        L = await import("leaflet");
        if (!isMounted) return;

        // Clean up previous map if exists
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        // Create leaflet map
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([dLat, dLng], 14);

        mapRef.current = map;

        // Base tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // A. STORE / HUB ICON & MARKER
        const storeIconHtml = `
          <div class="relative flex items-center justify-center">
            <div class="h-8 w-8 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-lg border-2 border-white font-mono text-[10px] font-black">
              JZ
            </div>
            <div class="absolute -bottom-1 bg-slate-950 text-[8px] font-sans font-bold px-1 py-0.2 rounded shadow text-white border border-white/25">Hub</div>
          </div>
        `;
        const storeIcon = L.divIcon({
          html: storeIconHtml,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        markersRef.current.store = L.marker([STORE_LAT, STORE_LNG], { icon: storeIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2 font-sans min-w-[150px]">
              <h4 class="font-extrabold text-xs text-slate-900">JANUZEN Logistics Hub</h4>
              <p class="text-[10px] text-gray-500 mt-0.5">Gajularamaram Main Hub</p>
              <div class="mt-1.5 text-[9px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-gray-700">Dispatch Base</div>
            </div>
          `);

        // B. CUSTOMER ICON & MARKER
        const customerIconHtml = `
          <div class="relative flex items-center justify-center">
            <div class="h-9 w-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl border-2 border-white animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
          </div>
        `;
        const customerIcon = L.divIcon({
          html: customerIconHtml,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        markersRef.current.customer = L.marker([cLat, cLng], { icon: customerIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2 font-sans min-w-[160px]">
              <h4 class="font-extrabold text-xs text-slate-900">Delivery Destination</h4>
              <p class="text-[10px] text-gray-600 mt-0.5">${activeOrder?.shippingAddress?.fullName || "Valued Customer"}</p>
              <p class="text-[9px] text-gray-400 font-mono mt-1">${activeOrder?.shippingAddress?.city || "Hyderabad"}</p>
            </div>
          `);

        // C. DRIVER / COURIER ICON & MARKER
        const driverIconHtml = `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-10 w-10 rounded-full bg-teal-400 opacity-60 animate-ping"></span>
            <div class="h-8 w-8 rounded-full bg-teal-700 text-white flex items-center justify-center shadow-xl border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bike"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-2.5-3 3-3.5h3.5l1.5 3.5"/></svg>
            </div>
          </div>
        `;
        const driverIcon = L.divIcon({
          html: driverIconHtml,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        markersRef.current.driver = L.marker([dLat, dLng], { icon: driverIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2.5 font-sans min-w-[180px] leading-relaxed">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span class="text-[10px] font-mono text-emerald-600 font-bold uppercase">Active Driver</span>
              </div>
              <h4 class="font-extrabold text-xs text-slate-900">${trackingData?.driverDetails?.name || "Suresh Kumar"}</h4>
              <p class="text-[10px] text-gray-500 font-mono">Order: ${activeOrder?.orderId || "Selected"}</p>
              <div class="mt-2 pt-1.5 border-t border-gray-100 flex justify-between items-center text-[9px] font-mono text-gray-400">
                <span>Speed: ${trackingData?.speed || 0} km/h</span>
                <span class="text-indigo-600 font-bold">${String(trackingData?.status || "Accepted").toUpperCase()}</span>
              </div>
            </div>
          `);

        // D. INITIAL POLYLINE
        if (routeCoords && routeCoords.length > 0) {
          markersRef.current.routeLine = L.polyline(routeCoords, {
            color: "#0F9B8E",
            weight: 5,
            opacity: 0.85,
            dashArray: trackingData.status === "accepted" ? "5, 10" : undefined
          }).addTo(map);
        }

        // E. AUTO FIT BOUNDS
        const bounds = L.latLngBounds([
          [STORE_LAT, STORE_LNG],
          [dLat, dLng],
          [cLat, cLng]
        ]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });

      } catch (err) {
        console.error("Leaflet initiation failed on Tracking View:", err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = {};
    };
  }, [trackingData === null, activeOrder?.id]);

  // 6. Smoothly move markers and update polyline when data changes
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !trackingData) return;

    import("leaflet").then((L) => {
      const dLat = trackingData.currentLocation?.lat || STORE_LAT;
      const dLng = trackingData.currentLocation?.lng || STORE_LNG;
      const cLat = trackingData.customerLocation?.lat || STORE_LAT + 0.03;
      const cLng = trackingData.customerLocation?.lng || STORE_LNG + 0.02;

      // Update customer position
      if (markersRef.current.customer) {
        markersRef.current.customer.setLatLng([cLat, cLng]);
      }

      // Smoothly update driver position
      if (markersRef.current.driver) {
        markersRef.current.driver.setLatLng([dLat, dLng]);
        
        // Dynamically update driver popup contents with latest telemetry
        const newPopupHtml = `
          <div class="p-2.5 font-sans min-w-[180px] leading-relaxed">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span class="text-[10px] font-mono text-emerald-600 font-bold uppercase">Active Driver</span>
            </div>
            <h4 class="font-extrabold text-xs text-slate-900">${trackingData?.driverDetails?.name || "Suresh Kumar"}</h4>
            <p class="text-[10px] text-gray-500 font-mono">Order: ${activeOrder?.orderId || "Selected"}</p>
            <div class="mt-2 pt-1.5 border-t border-gray-100 flex justify-between items-center text-[9px] font-mono text-gray-400">
              <span>Speed: ${trackingData?.speed || 0} km/h</span>
              <span class="text-indigo-600 font-bold">${String(trackingData?.status || "Accepted").toUpperCase()}</span>
            </div>
          </div>
        `;
        markersRef.current.driver.setPopupContent(newPopupHtml);
        
        // Follow the driver by auto centering slightly
        map.panTo([dLat, dLng], { animate: true, duration: 0.8 });
      }

      // Update Route Polyline
      if (markersRef.current.routeLine) {
        map.removeLayer(markersRef.current.routeLine);
      }
      if (routeCoords && routeCoords.length > 0) {
        markersRef.current.routeLine = L.polyline(routeCoords, {
          color: "#0F9B8E",
          weight: 5,
          opacity: 0.85,
          dashArray: trackingData.status === "accepted" ? "5, 10" : undefined
        }).addTo(map);
      }
    });
  }, [trackingData?.currentLocation?.lat, trackingData?.currentLocation?.lng, trackingData?.customerLocation?.lat, trackingData?.customerLocation?.lng, routeCoords]);

  // Recenter bounds manually to fit store, driver, customer
  const handleRecenterMap = () => {
    const map = mapRef.current;
    if (!map || !trackingData) return;
    import("leaflet").then((L) => {
      const dLat = trackingData.currentLocation?.lat || STORE_LAT;
      const dLng = trackingData.currentLocation?.lng || STORE_LNG;
      const cLat = trackingData.customerLocation?.lat || STORE_LAT + 0.03;
      const cLng = trackingData.customerLocation?.lng || STORE_LNG + 0.02;

      const bounds = L.latLngBounds([
        [STORE_LAT, STORE_LNG],
        [dLat, dLng],
        [cLat, cLng]
      ]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
    });
  };

  const getStatusLabelAndColor = (status: string) => {
    const s = String(status || "").toLowerCase();
    if (s === "delivered") return { label: "Delivered Successfully", color: "bg-emerald-500 text-white" };
    if (s === "cancelled") return { label: "Cancelled", color: "bg-red-500 text-white" };
    if (s === "out_for_delivery") return { label: "Out For Delivery", color: "bg-[#0F9B8E] text-white animate-pulse" };
    if (s === "dispatched") return { label: "Dispatched From Hub", color: "bg-indigo-600 text-white" };
    return { label: "Accepted & Preparing", color: "bg-amber-500 text-white" };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Professional Header Navigation */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate("orders")}
              style={{ cursor: "pointer" }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center justify-center border border-slate-800"
              title="Go Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#0F9B8E] uppercase">RADAR NETWORK LIVE</span>
              </div>
              <h1 className="font-serif text-lg font-black tracking-tight leading-none mt-1 text-white">JANUZEN Live Dispatch Telemetry</h1>
            </div>
          </div>

          {/* Quick Active Order Switcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold shrink-0 hidden md:inline">Track active:</span>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#0F9B8E] cursor-pointer w-full sm:w-56 font-mono font-bold shadow-sm"
            >
              {ordersList.length === 0 ? (
                <option value="">No dispatches found</option>
              ) : (
                ordersList.map(o => {
                  const statusLabel = o.status.toUpperCase();
                  const shortId = o.orderId;
                  const dateStr = new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <option key={o.id} value={o.id}>
                      {shortId} ({statusLabel} - {dateStr})
                    </option>
                  );
                })
              )}
            </select>
            
            <button
              onClick={() => fetchTrackingDetails(false)}
              disabled={refreshing || !selectedOrderId}
              style={{ cursor: "pointer" }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50 shrink-0"
              title="Force Telemetry Sync"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${refreshing ? "animate-spin text-[#0F9B8E]" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Loading and Error States block */}
        {loading ? (
          <div className="lg:col-span-3 bg-white border border-gray-150 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-16 w-16 rounded-full bg-teal-400/20 animate-ping"></span>
              <div className="h-12 w-12 rounded-full bg-[#0F9B8E] text-white flex items-center justify-center shadow-lg">
                <Bike className="h-6 w-6 animate-bounce" />
              </div>
            </div>
            <h3 className="font-serif text-lg font-black text-slate-900 mt-6">Connecting Real-time GPS Streams...</h3>
            <p className="text-gray-400 text-xs font-mono mt-1">Interfacing with secure tracking endpoints and joining telemetry room...</p>
          </div>
        ) : error || !activeOrder || !trackingData ? (
          <div className="lg:col-span-3 bg-white border border-gray-150 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm max-w-2xl mx-auto my-12">
            <AlertCircle className="h-12 w-12 text-amber-500 animate-pulse" />
            <h3 className="font-serif text-lg font-black text-slate-900 mt-4">Telemetry Stream Offline</h3>
            <p className="text-gray-500 text-xs font-mono mt-1.5 leading-relaxed max-w-md">
              {error || "Select an active dispatched order to track. Finished deliveries or unapproved orders do not broadcast real-time GPS telemetry."}
            </p>
            {ordersList.length > 0 && (
              <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-gray-150 w-full">
                <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-3">Select another shipment from your log:</p>
                <div className="flex flex-col gap-2">
                  {ordersList.slice(0, 3).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      style={{ cursor: "pointer" }}
                      className="text-left w-full p-2.5 bg-white border rounded-xl hover:border-[#0F9B8E] hover:shadow-xs transition-all flex justify-between items-center font-mono text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{o.orderId}</p>
                        <p className="text-[10px] text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                        {o.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => onNavigate("orders")}
              style={{ cursor: "pointer" }}
              className="mt-6 px-5 py-2.5 bg-slate-950 text-white font-mono font-bold uppercase text-xs rounded-xl hover:bg-black transition-all shadow-sm"
            >
              Return to Order History
            </button>
          </div>
        ) : (
          <>
            {/* Left Column: Uber Eats / Swiggy Style Tracking Controls & Stats (1/3 of space) */}
            <div className="lg:col-span-1 space-y-6 flex flex-col justify-start">
              
              {/* ETA & Distance Hero Card */}
              <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-800 px-3 py-1 rounded-bl-2xl font-mono text-[9px] font-bold tracking-wider flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </div>
                
                <div>
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Estimated Handover Time</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <h2 className="font-serif text-3xl font-black text-[#0D1B2A] tracking-tight">{etaMinutes}</h2>
                    <span className="text-sm font-semibold text-gray-600 font-sans">Minutes remaining</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-gray-150">
                  <div className="bg-slate-50 rounded-2xl p-3 border">
                    <span className="text-[9px] font-mono text-gray-400 uppercase block">Distance Left</span>
                    <span className="font-mono text-base font-black text-slate-850">{distanceKm.toFixed(2)} km</span>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 border">
                    <span className="text-[9px] font-mono text-gray-400 uppercase block">Rider Speed</span>
                    <span className="font-mono text-base font-black text-teal-700">
                      {trackingData.speed ? `${trackingData.speed} km/h` : "Idle 0 km/h"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Agent Information */}
              <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-sm space-y-4">
                <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Your Delivery Associate</h4>
                
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-full bg-slate-900 border flex items-center justify-center text-white font-mono text-sm font-bold relative">
                    SK
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-teal-500 rounded-full border-2 border-white flex items-center justify-center text-white" title="EV Certified Representative">
                      <Compass className="h-3 w-3 animate-spin" />
                    </div>
                  </div>
                  <div className="flex-grow">
                    <p className="font-serif text-sm font-bold text-gray-950 leading-tight">{trackingData.driverDetails?.name || "Suresh Kumar"}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{trackingData.driverDetails?.vehicle || "Eco Hero EV (TS-08-EV-4412)"}</p>
                    <span className="inline-flex mt-1 text-[9px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
                      EV Fleet Partner
                    </span>
                  </div>
                  
                  {trackingData.driverDetails?.phone && (
                    <a
                      href={`tel:${trackingData.driverDetails.phone}`}
                      className="h-10 w-10 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center transition-all shadow-xs"
                      title="Call Rider"
                    >
                      <Phone className="h-4.5 w-4.5" />
                    </a>
                  )}
                </div>

                {/* Handover OTP block */}
                {activeOrder.deliveryOTP && activeOrder.status !== "Delivered" && activeOrder.status !== "delivered" && (
                  <div className="bg-teal-50 border border-teal-200/60 rounded-2xl p-3.5 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-teal-800 font-mono font-black tracking-wider uppercase flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                        Handover Pin Code
                      </p>
                      <p className="text-[9px] text-teal-600 font-sans leading-snug">Give to driver Suresh upon receiving package.</p>
                    </div>
                    <span className="font-mono text-lg font-black text-teal-950 bg-white border border-teal-200 px-3 py-1 rounded-xl shadow-xs tracking-widest">{activeOrder.deliveryOTP}</span>
                  </div>
                )}
              </div>

              {/* Order Shipment Checklist / Stages Progress */}
              <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-sm space-y-4">
                <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Shipment Transit Milestones</h4>
                
                <div className="space-y-4">
                  {/* Stage 1 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-sm font-bold">✓</div>
                      <div className="w-0.5 h-8 bg-emerald-500" />
                    </div>
                    <div className="text-xs pt-0.5">
                      <p className="font-bold text-gray-950">Shipment Placed</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">Confirmed and catalogued in Januzen database</p>
                    </div>
                  </div>

                  {/* Stage 2 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                        ["dispatched", "out_for_delivery", "delivered"].includes(String(activeOrder.status).toLowerCase())
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 border border-gray-300 text-gray-400"
                      }`}>
                        {["dispatched", "out_for_delivery", "delivered"].includes(String(activeOrder.status).toLowerCase()) ? "✓" : "2"}
                      </div>
                      <div className={`w-0.5 h-8 ${
                        ["dispatched", "out_for_delivery", "delivered"].includes(String(activeOrder.status).toLowerCase())
                          ? "bg-emerald-500"
                          : "bg-gray-200"
                      }`} />
                    </div>
                    <div className="text-xs pt-0.5">
                      <p className={`font-bold ${
                        ["dispatched", "out_for_delivery", "delivered"].includes(String(activeOrder.status).toLowerCase())
                          ? "text-gray-950"
                          : "text-gray-400"
                      }`}>Cargo Handover Complete</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">Dispatched from Gajularamaram Main Distribution Hub</p>
                    </div>
                  </div>

                  {/* Stage 3 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                        ["out_for_delivery", "delivered"].includes(String(activeOrder.status).toLowerCase())
                          ? "bg-indigo-600 text-white animate-pulse"
                          : "bg-gray-100 border border-gray-300 text-gray-400"
                      }`}>
                        {String(activeOrder.status).toLowerCase() === "delivered" ? "✓" : "●"}
                      </div>
                      <div className={`w-0.5 h-8 ${
                        String(activeOrder.status).toLowerCase() === "delivered"
                          ? "bg-emerald-500"
                          : "bg-gray-200"
                      }`} />
                    </div>
                    <div className="text-xs pt-0.5">
                      <p className={`font-bold ${
                        ["out_for_delivery", "delivered"].includes(String(activeOrder.status).toLowerCase())
                          ? "text-indigo-950 font-extrabold"
                          : "text-gray-400"
                      }`}>Out For Delivery</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">Courier is moving live with active GPS coordinates</p>
                    </div>
                  </div>

                  {/* Stage 4 */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                        String(activeOrder.status).toLowerCase() === "delivered"
                          ? "bg-emerald-500 text-white shadow-md"
                          : "bg-gray-100 border border-gray-300 text-gray-400"
                      }`}>
                        {String(activeOrder.status).toLowerCase() === "delivered" ? "✓" : "4"}
                      </div>
                    </div>
                    <div className="text-xs pt-0.5">
                      <p className={`font-bold ${
                        String(activeOrder.status).toLowerCase() === "delivered"
                          ? "text-emerald-800"
                          : "text-gray-400"
                      }`}>Delivered Successfully</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">OTP verified. Shipment handed over cleanly</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Summary in shipment */}
              <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-sm space-y-4">
                <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Shipment Cargo List</h4>
                
                <div className="space-y-3.5 max-h-40 overflow-y-auto">
                  {activeOrder.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex-grow pr-3">
                        <p className="font-medium text-slate-900 leading-snug">{it.name}</p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">{it.shop === "medicals" ? "Nuthan Medicals" : "JA Stationery"}</p>
                      </div>
                      <span className="font-mono text-slate-500 shrink-0">x{it.quantity}</span>
                    </div>
                  ))}
                  {(!activeOrder.items || activeOrder.items.length === 0) && (
                    <p className="text-xs text-gray-400 font-mono italic">No items listed. Bulk transit parcel.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Massive Edge-to-Edge Map Canvas (2/3 of space) */}
            <div className="lg:col-span-2 flex flex-col gap-4 h-[60vh] lg:h-auto min-h-[450px]">
              
              {/* Map controls floating bar */}
              <div className="bg-white border border-gray-150 rounded-2xl p-3 shadow-xs flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-[#0F9B8E] animate-pulse" />
                  <span className="text-xs text-slate-800 font-medium">Tracking Order ID: <b className="font-mono">{activeOrder.orderId}</b></span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRecenterMap}
                    style={{ cursor: "pointer" }}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-[11px] font-mono font-bold uppercase rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    Recenter Bounds
                  </button>
                  <button
                    onClick={() => onNavigate("invoice", { orderId: activeOrder.id })}
                    style={{ cursor: "pointer" }}
                    className="px-3 py-1.5 border border-gray-200 hover:bg-slate-50 text-slate-600 text-[11px] font-mono font-bold uppercase rounded-lg flex items-center gap-1 transition-all"
                  >
                    Invoice
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Map container frame with full map widget inside */}
              <div className="flex-1 bg-slate-100 rounded-3xl overflow-hidden border border-gray-150 relative shadow-md">
                
                {/* Embedded OSM Canvas Div */}
                <div ref={mapContainerRef} className="w-full h-full z-10" />

                {/* Loading/Route overlays inside map frame */}
                {routeLoading && (
                  <div className="absolute top-4 right-4 bg-slate-950/85 backdrop-blur-md text-white px-3 py-2 rounded-xl flex items-center gap-2 text-[10px] font-mono font-bold border border-white/10 z-20 shadow-lg">
                    <Compass className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    Platting live road path...
                  </div>
                )}
                
                {/* Live GPS feed visual cue */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md text-slate-900 px-3 py-2 rounded-xl flex flex-col gap-0.5 text-[9px] font-mono border border-gray-100 z-20 shadow-md">
                  <div className="flex items-center gap-1.5 font-bold text-slate-850">
                    <span className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
                    GPS TRANSIT FEED ACTIVE
                  </div>
                  <span className="text-gray-400">Stream frequency: 3000ms</span>
                </div>
              </div>

              {/* Interactive Info Footer */}
              <div className="bg-amber-50 border border-amber-200/70 text-amber-900 text-xs px-4 py-3 rounded-2xl flex items-start gap-2.5 font-sans shadow-xs">
                <Sparkles className="h-4.5 w-4.5 text-amber-600 mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <p className="font-bold">Automated Routing & Route Re-Calculation Enabled</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Our system leverages the OpenStreetMap engine and OSRM protocols. Whenever the courier representative Suresh changes transit location, the route coordinates and Remaining distance auto-recalculates immediately in real time.
                  </p>
                </div>
              </div>

            </div>
          </>
        )}

      </main>

      {/* Decorative footer */}
      <footer className="mt-12 py-6 bg-slate-900 border-t border-slate-800 text-slate-400 text-center text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 JANUZEN Group. Integrated Logistics Telemetry Dashboard.</p>
          <div className="flex items-center gap-1">
            <span>Crafted for premium EV dispatches</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
          </div>
        </div>
      </footer>

    </div>
  );
}
