import React from "react";
import { io, Socket } from "socket.io-client";
import { 
  MapPin, Navigation, Bike, Clock, X, Compass, CheckCircle2,
  Phone, ShieldCheck, Map as MapIcon, Loader2, RefreshCw, ChevronRight
} from "lucide-react";
import { Order } from "../types";

// Helper function to calculate distance using Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// Calculate ETA in minutes based on distance (assuming average speed 25 km/h in Hyderabad)
function getETA(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / 25) * 60 + 2)); // 2 mins buffer
}

interface PureLeafletMapProps {
  dLat: number;
  dLng: number;
  cLat: number;
  cLng: number;
  routeCoords: Array<[number, number]>;
  driverName?: string;
  customerName?: string;
  status?: string;
}

function PureLeafletMap({ dLat, dLng, cLat, cLng, routeCoords, driverName, customerName, status }: PureLeafletMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<{
    store?: any;
    customer?: any;
    driver?: any;
    routeLine?: any;
  }>({});

  React.useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let L: any = null;

    const initMap = async () => {
      try {
        L = await import("leaflet");
        if (!isMounted) return;

        // Create the map
        const map = L.map(containerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([dLat, dLng], 14);

        mapRef.current = map;

        // Add TileLayer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Store Icon
        const storeIconHtml = `
          <div class="relative flex items-center justify-center">
            <div class="relative h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md border-2 border-white font-mono text-[9px] font-black">
              JZ
            </div>
          </div>
        `;
        const storeIcon = L.divIcon({
          html: storeIconHtml,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const storeMarker = L.marker([17.5147, 78.4116], { icon: storeIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-1 font-sans">
              <p class="font-extrabold text-xs text-slate-950">JANUZEN Logistics Hub</p>
              <p class="text-[10px] text-gray-500">Gajularamaram, Hyderabad</p>
            </div>
          `);
        markersRef.current.store = storeMarker;

        // Customer Icon
        const customerIconHtml = `
          <div class="relative flex items-center justify-center">
            <div class="relative h-6 w-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
          </div>
        `;
        const customerIcon = L.divIcon({
          html: customerIconHtml,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const customerMarker = L.marker([cLat, cLng], { icon: customerIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-1 font-sans">
              <p class="font-extrabold text-xs text-slate-950">Your Delivery Address</p>
              <p class="text-[10px] text-gray-500">${customerName || "Customer"}</p>
            </div>
          `);
        markersRef.current.customer = customerMarker;

        // Driver Icon
        const driverIconHtml = `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-8 w-8 rounded-full bg-teal-400 opacity-75 animate-ping"></span>
            <div class="relative h-6 w-6 rounded-full bg-[#0F9B8E] text-white flex items-center justify-center shadow-md border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bike"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-2.5-3 3-3.5h3.5l1.5 3.5"/></svg>
            </div>
          </div>
        `;
        const driverIcon = L.divIcon({
          html: driverIconHtml,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const driverMarker = L.marker([dLat, dLng], { icon: driverIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-1 font-sans">
              <p class="font-extrabold text-xs text-indigo-950">${driverName || "Representative"}</p>
              <p class="text-[10px] text-indigo-600 font-semibold uppercase font-mono">In Transit EV Representative</p>
            </div>
          `);
        markersRef.current.driver = driverMarker;

        // Polyline
        if (routeCoords && routeCoords.length > 0) {
          const polyline = L.polyline(routeCoords, {
            color: "#0F9B8E",
            weight: 4,
            opacity: 0.8,
            dashArray: status === "accepted" ? "5, 10" : undefined
          }).addTo(map);
          markersRef.current.routeLine = polyline;
        }

        // Fit bounds
        const bounds = L.latLngBounds([[dLat, dLng], [cLat, cLng]]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

      } catch (error) {
        console.error("Error initializing leaflet map:", error);
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
  }, []);

  // Sync positions when they update
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      // Update customer marker
      if (markersRef.current.customer) {
        markersRef.current.customer.setLatLng([cLat, cLng]);
      }
      // Update driver marker
      if (markersRef.current.driver) {
        markersRef.current.driver.setLatLng([dLat, dLng]);
        // Re-center map to focus on driver
        map.setView([dLat, dLng], map.getZoom());
      }
      // Update route polyline
      if (markersRef.current.routeLine) {
        map.removeLayer(markersRef.current.routeLine);
      }
      if (routeCoords && routeCoords.length > 0) {
        const polyline = L.polyline(routeCoords, {
          color: "#0F9B8E",
          weight: 4,
          opacity: 0.8,
          dashArray: status === "accepted" ? "5, 10" : undefined
        }).addTo(map);
        markersRef.current.routeLine = polyline;
      }
    });
  }, [dLat, dLng, cLat, cLng, routeCoords, status]);

  return <div ref={containerRef} className="w-full h-full" />;
}

interface PersistentDeliveryWidgetProps {
  currentUser: any;
  onNavigate?: (view: string, params?: Record<string, any>) => void;
}

export default function PersistentDeliveryWidget({ currentUser, onNavigate }: PersistentDeliveryWidgetProps) {
  const [activeOrder, setActiveOrder] = React.useState<Order | null>(null);
  const [trackingData, setTrackingData] = React.useState<any>(null);
  const [mapOpen, setMapOpen] = React.useState(false);
  const [routeCoords, setRouteCoords] = React.useState<Array<[number, number]>>([]);
  const [routeLoading, setRouteLoading] = React.useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);

  const socketRef = React.useRef<any>(null);

  // Load the active order (placed, dispatched, out_for_delivery)
  const fetchActiveOrder = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data: Order[] = await res.json();
        const active = data.find(o => 
          ["placed", "dispatched", "out_for_delivery"].includes(String(o.status).toLowerCase())
        );
        setActiveOrder(active || null);
      }
    } catch (err) {
      console.error("Error fetching active order:", err);
    }
  }, [currentUser]);

  // Initial fetch of active order and setup intervals
  React.useEffect(() => {
    fetchActiveOrder();
    const orderInterval = setInterval(fetchActiveOrder, 5000);
    return () => clearInterval(orderInterval);
  }, [fetchActiveOrder]);

  // Fetch tracking data from REST API once active order is found
  const fetchTracking = React.useCallback(async (quiet = false) => {
    if (!activeOrder) return;
    if (!quiet) setIsManualRefreshing(true);
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/tracking`);
      if (res.ok) {
        const data = await res.json();
        setTrackingData(data);
      }
    } catch (err) {
      console.error("Error fetching tracking coordinates:", err);
    } finally {
      setIsManualRefreshing(false);
    }
  }, [activeOrder]);

  React.useEffect(() => {
    if (activeOrder) {
      fetchTracking(true);
    } else {
      setTrackingData(null);
    }
  }, [activeOrder, fetchTracking]);

  // Setup Socket.IO client for real-time streaming updates
  React.useEffect(() => {
    if (!activeOrder) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to Socket.IO Server
    const socket: Socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      // Join room for this specific active order
      socket.emit("join-order", activeOrder.id);
    });

    // Handle real-time coordinates received from representative
    socket.on("location-updated", (data) => {
      if (data.orderId === activeOrder.id) {
        setTrackingData(data);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeOrder]);

  // Continuously obtain customer's real GPS location if permission was granted
  React.useEffect(() => {
    if (!activeOrder) return;

    const permission = localStorage.getItem(`tracking_permission_${activeOrder.id}`);
    if (permission !== "granted") {
      console.log("Live customer tracking is disabled or permission denied for order:", activeOrder.id);
      return;
    }

    let watchId: number | null = null;
    let lastUploadTime = 0;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const now = Date.now();

          // Stream coordinates every 5-10 seconds
          if (now - lastUploadTime >= 5000) {
            lastUploadTime = now;
            console.log("Streaming customer's live GPS coordinates:", latitude, longitude);

            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit("customer-location-update", {
                orderId: activeOrder.id,
                lat: latitude,
                lng: longitude
              });
            } else {
              // Fallback to REST API
              fetch(`/api/orders/${activeOrder.id}/tracking/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lat: latitude, lng: longitude, isCustomer: true })
              }).catch(err => console.error("REST fallback customer tracking failed:", err));
            }
          }
        },
        (error) => {
          console.error("Error watching customer GPS:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeOrder]);

  // Fetch OSRM Routing between driver coordinates and customer coordinates
  React.useEffect(() => {
    if (!mapOpen || !trackingData?.currentLocation || !trackingData?.customerLocation) {
      setRouteCoords([]);
      return;
    }

    const fetchRoute = async () => {
      setRouteLoading(true);
      const startLat = trackingData.currentLocation.lat;
      const startLng = trackingData.currentLocation.lng;
      const endLat = trackingData.customerLocation.lat;
      const endLng = trackingData.customerLocation.lng;

      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            setRouteCoords(coords);
          } else {
            // Straight line fallback
            setRouteCoords([[startLat, startLng], [endLat, endLng]]);
          }
        } else {
          // Straight line fallback
          setRouteCoords([[startLat, startLng], [endLat, endLng]]);
        }
      } catch (err) {
        console.error("OSRM Route fetching failed, using fallback:", err);
        setRouteCoords([[startLat, startLng], [endLat, endLng]]);
      } finally {
        setRouteLoading(false);
      }
    };

    fetchRoute();
  }, [mapOpen, trackingData?.currentLocation, trackingData?.customerLocation]);

  if (!activeOrder || !trackingData) {
    return null;
  }

  // Calculate distances and times
  const dLat = trackingData.currentLocation?.lat || 17.5147;
  const dLng = trackingData.currentLocation?.lng || 78.4116;
  const cLat = trackingData.customerLocation?.lat || 17.4875;
  const cLng = trackingData.customerLocation?.lng || 78.3953;

  const distanceKm = getDistance(dLat, dLng, cLat, cLng);
  const etaMinutes = getETA(distanceKm);
  const isDriverMoving = trackingData.status === "out_for_delivery" || trackingData.status === "dispatched";

  return (
    <>
      {/* 📢 PERSISTENT BOTTOM FLOATING DRAWER (BLINKIT / SWIGGY STYLE) */}
      <div 
        id="persistent-delivery-tracking-pwa-bar"
        className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md w-auto z-40 bg-white border border-gray-150/80 rounded-2xl shadow-xl p-4 flex flex-col gap-3 transition-all transform duration-300 hover:scale-[1.01]"
      >
        <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-[10px] font-mono font-bold text-gray-400 tracking-wider uppercase">Active Live Shipment Delivery</p>
              <h4 className="text-xs font-mono font-bold text-[#0D1B2A]">{activeOrder.orderId}</h4>
            </div>
          </div>
          <span className="text-[9px] font-mono font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
            {activeOrder.status === "placed" ? "Accepted" : activeOrder.status === "dispatched" ? "Dispatched" : "Out for delivery"}
          </span>
        </div>

        {/* Core Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-50 border flex items-center justify-center text-indigo-600">
              {isDriverMoving ? (
                <Bike className="h-5 w-5 animate-bounce text-[#0F9B8E]" />
              ) : (
                <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ETA Handover</p>
              <h3 className="font-serif text-lg font-black text-gray-950 flex items-baseline gap-1">
                {etaMinutes} <span className="text-xs font-sans font-semibold text-gray-500">mins</span>
                <span className="text-xs font-sans font-semibold text-gray-400">({distanceKm.toFixed(1)} km)</span>
              </h3>
            </div>
          </div>

          <button
            onClick={() => setMapOpen(true)}
            style={{ cursor: "pointer" }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0F9B8E] hover:bg-[#0C7C72] text-white text-xs font-bold font-sans uppercase rounded-xl shadow-sm transition-all"
          >
            <MapIcon className="h-3.5 w-3.5" />
            Live Map
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Live Progress Bar indicator */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-gray-400 font-mono">
            <span>Dispatched from Gajularamaram</span>
            <span>Your Destination</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden relative border border-gray-50">
            <div 
              className="h-full bg-gradient-to-r from-[#0F9B8E] to-emerald-500 transition-all duration-1000"
              style={{
                width: 
                  activeOrder.status === "placed" ? "15%" :
                  activeOrder.status === "dispatched" ? "55%" : "85%"
              }}
            />
          </div>
        </div>

        {/* Courier Representative details */}
        <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
              SK
            </div>
            <div>
              <p className="text-[10px] text-gray-900 font-bold leading-none">{trackingData.driverDetails?.name || "Suresh Kumar"}</p>
              <p className="text-[9px] text-gray-400 mt-0.5 font-mono">{trackingData.driverDetails?.vehicle || "Eco Hero EV"}</p>
            </div>
          </div>
          <a
            href={`tel:${trackingData.driverDetails?.phone}`}
            className="p-1.5 bg-white border rounded-lg hover:bg-slate-100 flex items-center justify-center text-indigo-600"
            title="Call Representative"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* 🗺️ INTERACTIVE LIVE TRACKING MAP MODAL */}
      {mapOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col md:flex-row h-[85vh]">
            
            {/* Left: Map canvas area */}
            <div className="flex-grow relative h-[50vh] md:h-full bg-slate-50">
              <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
                <button
                  onClick={() => fetchTracking(false)}
                  disabled={isManualRefreshing}
                  style={{ cursor: "pointer" }}
                  className="bg-white/95 backdrop-blur-sm border shadow-md p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-black transition-all"
                >
                  <RefreshCw className={`h-4 w-4 ${isManualRefreshing ? "animate-spin text-indigo-600" : ""}`} />
                  Refresh Location
                </button>
              </div>

              {/* Pure Leaflet Map (Robust, React 19 Compatible) */}
              <PureLeafletMap 
                dLat={dLat}
                dLng={dLng}
                cLat={cLat}
                cLng={cLng}
                routeCoords={routeCoords}
                driverName={trackingData.driverDetails?.name}
                customerName={activeOrder.shippingAddress?.fullName || activeOrder.userName}
                status={trackingData.status}
              />

              {routeLoading && (
                <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px] z-30">
                  <div className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-mono font-bold">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    Plotting Active Route...
                  </div>
                </div>
              )}
            </div>

            {/* Right: Sidebar statistics and status */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-150 p-6 flex flex-col justify-between bg-white shrink-0">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-[#D4820A] font-mono font-bold">LIVE TELEMETRY</span>
                    <h2 className="font-serif text-xl font-bold text-[#0D1B2A] mt-0.5">Order Tracking</h2>
                  </div>
                  <button
                    onClick={() => setMapOpen(false)}
                    style={{ cursor: "pointer" }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-gray-500 hover:text-black transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Tracking Milestones progress */}
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-1">
                    <p className="text-[10px] text-indigo-700 font-mono font-bold uppercase tracking-wider">ESTIMATED HANDOFF TIME</p>
                    <p className="font-serif text-2xl font-black text-slate-950 flex items-baseline gap-1">
                      {etaMinutes} <span className="text-sm font-sans font-semibold text-slate-600">Minutes</span>
                    </p>
                    <p className="text-[10px] text-indigo-600 font-medium font-sans">
                      Remaining distance: <b>{distanceKm.toFixed(2)} km</b>
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Courier Progress Stages</p>
                    
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</div>
                        <div className="w-0.5 h-10 bg-emerald-500" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-gray-950">Shipment Placed</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">Successfully registered in dispatch manifest</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${
                          ["dispatched", "out_for_delivery"].includes(String(activeOrder.status).toLowerCase())
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 border border-gray-300 text-gray-400"
                        }`}>
                          {["dispatched", "out_for_delivery"].includes(String(activeOrder.status).toLowerCase()) ? "✓" : "2"}
                        </div>
                        <div className={`w-0.5 h-10 ${
                          ["dispatched", "out_for_delivery"].includes(String(activeOrder.status).toLowerCase())
                            ? "bg-emerald-500"
                            : "bg-gray-200"
                        }`} />
                      </div>
                      <div className="text-xs">
                        <p className={`font-bold ${
                          ["dispatched", "out_for_delivery"].includes(String(activeOrder.status).toLowerCase())
                            ? "text-gray-950"
                            : "text-gray-400"
                        }`}>Dispatched Cargo</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">Handed over to representative सुरेश कुमार</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${
                          String(activeOrder.status).toLowerCase() === "out_for_delivery"
                            ? "bg-indigo-600 text-white animate-pulse"
                            : "bg-gray-100 border border-gray-300 text-gray-400"
                        }`}>
                          {String(activeOrder.status).toLowerCase() === "out_for_delivery" ? "●" : "3"}
                        </div>
                      </div>
                      <div className="text-xs">
                        <p className={`font-bold ${
                          String(activeOrder.status).toLowerCase() === "out_for_delivery"
                            ? "text-indigo-950 font-extrabold"
                            : "text-gray-400"
                        }`}>In Transit & GPS Live</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">Courier is moving towards your destination</p>
                        {trackingData.speed !== undefined && trackingData.speed > 0 && (
                          <span className="inline-block mt-1 font-mono text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            ⚡ SPEED: {trackingData.speed} km/h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Handover Pin Code verification footer */}
              <div className="pt-4 border-t space-y-2 font-sans">
                <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Handover Verification</p>
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-teal-800 font-extrabold font-mono flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                      HANDOVER OTP
                    </p>
                    <p className="text-[9px] text-teal-600 mt-0.5 leading-snug">Give to courier officer Suresh to confirm parcel arrival.</p>
                  </div>
                  <span className="font-mono text-lg font-black text-teal-950 bg-white border border-teal-200 px-3 py-1 rounded shadow-sm">{activeOrder.deliveryOTP}</span>
                </div>
              </div>

            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
