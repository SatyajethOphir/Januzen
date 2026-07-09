import { DeliveryTracking } from "../models/DeliveryTracking";
import { DeliveryPartner } from "../models/DeliveryPartner";
import { isMongo, MongoOrder } from "../db";

// Starting hub: Gajularamaram, Hyderabad, India
const H_LAT = 17.5147;
const H_LNG = 78.4116;

// Local delivery partners list for memory fallback
const localDeliveryPartners = [
  {
    name: "Suresh Kumar",
    phone: "+91 98881 23456",
    vehicle: "Eco Hero Electric (TS-08-EV-4412)",
    zone: "Gajularamaram & West Hyd (Primary Representative on Standby)",
    status: "Active / On Duty",
    avatar: "SK"
  },
  {
    name: "Ramesh Patel",
    phone: "+91 98881 23457",
    vehicle: "Bajaj Pulsar 150 (TS-07-HD-9081)",
    zone: "Kukatpally & North Hyd",
    status: "Active / Out on Delivery",
    avatar: "RP"
  },
  {
    name: "Divya Reddy",
    phone: "+91 98881 23458",
    vehicle: "Ather 450X (TS-09-EV-1122)",
    zone: "Express Delivery & Central Hyd",
    status: "On Standby",
    avatar: "DR"
  }
];

async function ensureDeliveryPartnersSeeded() {
  if (isMongo) {
    try {
      const count = await DeliveryPartner.countDocuments();
      if (count === 0) {
        console.log("[SEED] Seeding default delivery partners into MongoDB...");
        await DeliveryPartner.insertMany(localDeliveryPartners);
      }
    } catch (err) {
      console.error("[SEED ERROR] Failed to seed default delivery partners:", err);
    }
  }
}

// Local Map-based fallback store for memory fallback
const localTrackingStore = new Map<string, {
  orderId: string;
  deliveryPartnerId: string;
  currentLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number };
  liveCustomerTrackingEnabled: boolean;
  eta: number;
  distance: number;
  routeCoords: Array<[number, number]>;
  status: string;
  speed?: number;
  updatedAt: string;
}>();

/**
 * Generate a deterministic customer coordinate in Hyderabad based on order ID
 * so that it is stable and remains within 3-8 km of Gajularamaram.
 */
export function getCustomerCoordinates(orderId: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = orderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const latOffset = ((Math.abs(hash) % 100) / 1000) - 0.05; // -0.05 to +0.05
  const lngOffset = (((Math.abs(hash) >> 8) % 100) / 1000) - 0.05; // -0.05 to +0.05
  
  const baseLat = H_LAT + (latOffset * 0.4) - 0.01;
  const baseLng = H_LNG + (lngOffset * 0.4) + 0.015;

  return { lat: baseLat, lng: baseLng };
}

/**
 * Geocodes an address string using Nominatim, falling back to deterministic coordinates.
 */
export async function geocodeAddress(addressStr: string, orderId: string): Promise<{ lat: number; lng: number }> {
  try {
    const cleanAddress = addressStr.replace(/[#\r\n]/g, " ").trim();
    const query = encodeURIComponent(`${cleanAddress}, Hyderabad, Telangana, India`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`, {
      headers: { "User-Agent": "JANUZEN-Courier-Service-Agent" }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        // Ensure within reasonable Hyderabad bounds
        if (lat > 17.0 && lat < 18.0 && lng > 78.0 && lng < 79.0) {
          return { lat, lng };
        }
      }
    }
  } catch (err) {
    console.warn("Nominatim geocoding failed, using deterministic fallback:", err);
  }
  return getCustomerCoordinates(orderId);
}

/**
 * Calculates straight line distance between two coordinates
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

/**
 * Query OSRM routing engine, falling back to Haversine straight line.
 */
export async function calculateOSRMRoute(
  startLat: number, startLng: number,
  endLat: number, endLng: number
): Promise<{ routeCoords: Array<[number, number]>; durationMins: number; distanceKm: number }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const routeCoords = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
        const durationMins = Math.max(1, Math.round(route.duration / 60));
        const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
        return { routeCoords, durationMins, distanceKm };
      }
    }
  } catch (err) {
    console.error("OSRM routing failed, using fallback:", err);
  }

  const dist = getDistance(startLat, startLng, endLat, endLng);
  const eta = Math.max(1, Math.round((dist / 25) * 60 + 2));
  return {
    routeCoords: [[startLat, startLng], [endLat, endLng]],
    durationMins: eta,
    distanceKm: parseFloat(dist.toFixed(2))
  };
}

export class TrackingService {
  /**
   * Get tracking info for an order.
   * If it doesn't exist, initializes it.
   */
  static async getTracking(orderId: string, deliveryPartnerId = "Suresh Kumar"): Promise<any> {
    // 1. Load order details to find shipping address
    let shippingAddressStr = "";
    let customerName = "Customer";
    try {
      if (isMongo) {
        const order = await MongoOrder.findOne({ id: orderId });
        if (order) {
          customerName = order.shippingAddress?.fullName || order.userName || "Customer";
          if (order.shippingAddress) {
            shippingAddressStr = `${order.shippingAddress.addressLine}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}`;
          }
        }
      }
    } catch (err) {
      console.error("Error fetching order in tracking system:", err);
    }

    await ensureDeliveryPartnersSeeded();

    if (isMongo) {
      try {
        let tracking = await DeliveryTracking.findOne({ orderId });
        if (!tracking) {
          // Initialize customer coordinates (geocode saved address)
          const customerCoords = await geocodeAddress(shippingAddressStr || orderId, orderId);
          
          // Calculate initial route and ETA
          const routeData = await calculateOSRMRoute(H_LAT, H_LNG, customerCoords.lat, customerCoords.lng);

          tracking = await DeliveryTracking.create({
            orderId,
            deliveryPartnerId,
            currentLocation: { lat: H_LAT, lng: H_LNG },
            customerLocation: customerCoords,
            liveCustomerTrackingEnabled: false,
            eta: routeData.durationMins,
            distance: routeData.distanceKm,
            routeCoords: routeData.routeCoords,
            status: "accepted",
            updatedAt: new Date()
          });
        }

        // Dynamically find driver details
        const driverName = tracking.deliveryPartnerId || deliveryPartnerId;
        const partner = await (DeliveryPartner as any).findOne({ name: driverName });
        const driverDetails = partner ? {
          name: partner.name,
          phone: partner.phone,
          vehicle: partner.vehicle,
          zone: partner.zone,
          status: partner.status
        } : {
          name: "Suresh Kumar",
          phone: "+91 98881 23456",
          vehicle: "Eco Hero Electric (TS-08-EV-4412)",
          zone: "Gajularamaram",
          status: "Active / On Duty"
        };

        return {
          orderId: tracking.orderId,
          deliveryPartnerId: tracking.deliveryPartnerId,
          currentLocation: tracking.currentLocation,
          customerLocation: tracking.customerLocation,
          liveCustomerTrackingEnabled: tracking.liveCustomerTrackingEnabled || false,
          eta: tracking.eta || 0,
          distance: tracking.distance || 0,
          routeCoords: tracking.routeCoords || [],
          status: tracking.status,
          updatedAt: tracking.updatedAt.toISOString(),
          driverDetails
        };
      } catch (err) {
        console.error("Error fetching DeliveryTracking from Mongo:", err);
      }
    }

    // Local in-memory fallback
    let tracking = localTrackingStore.get(orderId);
    if (!tracking) {
      const customerCoords = getCustomerCoordinates(orderId);
      const routeData = await calculateOSRMRoute(H_LAT, H_LNG, customerCoords.lat, customerCoords.lng);
      
      tracking = {
        orderId,
        deliveryPartnerId,
        currentLocation: { lat: H_LAT, lng: H_LNG },
        customerLocation: customerCoords,
        liveCustomerTrackingEnabled: false,
        eta: routeData.durationMins,
        distance: routeData.distanceKm,
        routeCoords: routeData.routeCoords,
        status: "accepted",
        updatedAt: new Date().toISOString()
      };
      localTrackingStore.set(orderId, tracking);
    }

    const driverName = tracking.deliveryPartnerId || deliveryPartnerId;
    const partnerDetails = localDeliveryPartners.find(p => p.name === driverName);
    const driverDetails = partnerDetails ? {
      name: partnerDetails.name,
      phone: partnerDetails.phone,
      vehicle: partnerDetails.vehicle,
      zone: partnerDetails.zone,
      status: partnerDetails.status
    } : {
      name: "Suresh Kumar",
      phone: "+91 98881 23456",
      vehicle: "Eco Hero Electric (TS-08-EV-4412)",
      zone: "Gajularamaram",
      status: "Active / On Duty"
    };

    return {
      ...tracking,
      driverDetails
    };
  }

  /**
   * Update tracking coordinates, status, or speed.
   */
  static async updateTracking(
    orderId: string,
    lat: number,
    lng: number,
    status?: string,
    speed?: number,
    isCustomer = false
  ): Promise<any> {
    const updatedAtDate = new Date();

    if (isMongo) {
      try {
        const tracking = await DeliveryTracking.findOne({ orderId });
        if (!tracking) {
          // If tracking doesn't exist, retrieve it (which handles creation)
          await this.getTracking(orderId);
        }

        const updateFields: any = { updatedAt: updatedAtDate };
        if (status) updateFields.status = status;
        if (speed !== undefined) updateFields.speed = speed;

        let startLat = H_LAT;
        let startLng = H_LNG;
        let destLat = H_LAT;
        let destLng = H_LNG;

        if (tracking) {
          startLat = tracking.currentLocation.lat;
          startLng = tracking.currentLocation.lng;
          destLat = tracking.customerLocation.lat;
          destLng = tracking.customerLocation.lng;
        }

        if (isCustomer) {
          updateFields.customerLocation = { lat, lng };
          updateFields.liveCustomerTrackingEnabled = true;
          destLat = lat;
          destLng = lng;
        } else {
          updateFields.currentLocation = { lat, lng };
          startLat = lat;
          startLng = lng;
        }

        // Recalculate route with new coordinates
        const routeData = await calculateOSRMRoute(startLat, startLng, destLat, destLng);
        updateFields.eta = routeData.durationMins;
        updateFields.distance = routeData.distanceKm;
        updateFields.routeCoords = routeData.routeCoords;

        const updated = await DeliveryTracking.findOneAndUpdate(
          { orderId },
          { $set: updateFields },
          { upsert: true, new: true }
        );

        return {
          orderId: updated.orderId,
          deliveryPartnerId: updated.deliveryPartnerId,
          currentLocation: updated.currentLocation,
          customerLocation: updated.customerLocation,
          liveCustomerTrackingEnabled: updated.liveCustomerTrackingEnabled,
          eta: updated.eta,
          distance: updated.distance,
          routeCoords: updated.routeCoords,
          status: updated.status,
          updatedAt: updated.updatedAt.toISOString(),
          speed: updated.speed
        };
      } catch (err) {
        console.error("Error updating DeliveryTracking in Mongo:", err);
      }
    }

    // Local fallback
    let tracking = localTrackingStore.get(orderId);
    if (!tracking) {
      // Create new
      const customerCoords = isCustomer ? { lat, lng } : getCustomerCoordinates(orderId);
      const driverCoords = isCustomer ? { lat: H_LAT, lng: H_LNG } : { lat, lng };
      const routeData = await calculateOSRMRoute(driverCoords.lat, driverCoords.lng, customerCoords.lat, customerCoords.lng);

      tracking = {
        orderId,
        deliveryPartnerId: "Suresh Kumar",
        currentLocation: driverCoords,
        customerLocation: customerCoords,
        liveCustomerTrackingEnabled: isCustomer,
        eta: routeData.durationMins,
        distance: routeData.distanceKm,
        routeCoords: routeData.routeCoords,
        status: status || "accepted",
        updatedAt: updatedAtDate.toISOString(),
        speed
      };
    } else {
      if (isCustomer) {
        tracking.customerLocation = { lat, lng };
        tracking.liveCustomerTrackingEnabled = true;
      } else {
        tracking.currentLocation = { lat, lng };
      }
      if (status) tracking.status = status;
      tracking.updatedAt = updatedAtDate.toISOString();
      if (speed !== undefined) tracking.speed = speed;

      // Recalculate route
      const routeData = await calculateOSRMRoute(
        tracking.currentLocation.lat, tracking.currentLocation.lng,
        tracking.customerLocation.lat, tracking.customerLocation.lng
      );
      tracking.eta = routeData.durationMins;
      tracking.distance = routeData.distanceKm;
      tracking.routeCoords = routeData.routeCoords;
    }

    localTrackingStore.set(orderId, tracking);
    return tracking;
  }

  /**
   * Delete tracking details when order is completed or cancelled.
   */
  static async deleteTracking(orderId: string): Promise<boolean> {
    if (isMongo) {
      try {
        await DeliveryTracking.deleteOne({ orderId });
        return true;
      } catch (err) {
        console.error("Error deleting DeliveryTracking in Mongo:", err);
      }
    }

    return localTrackingStore.delete(orderId);
  }

  /**
   * Fetch all delivery partners
   */
  static async getDeliveryPartners(): Promise<any[]> {
    await ensureDeliveryPartnersSeeded();
    if (isMongo) {
      try {
        return await (DeliveryPartner as any).find({});
      } catch (err) {
        console.error("Error fetching delivery partners:", err);
      }
    }
    return localDeliveryPartners;
  }

  /**
   * Add or update delivery partner details
   */
  static async updateDeliveryPartner(name: string, updateData: { phone?: string; vehicle?: string; zone?: string; status?: string; avatar?: string }): Promise<any> {
    await ensureDeliveryPartnersSeeded();
    if (isMongo) {
      try {
        const updated = await (DeliveryPartner as any).findOneAndUpdate(
          { name },
          { $set: updateData },
          { new: true, upsert: true }
        );
        return updated;
      } catch (err) {
        console.error("Error updating delivery partner:", err);
      }
    }
    
    let partner = localDeliveryPartners.find(p => p.name === name);
    if (partner) {
      if (updateData.phone !== undefined) partner.phone = updateData.phone;
      if (updateData.vehicle !== undefined) partner.vehicle = updateData.vehicle;
      if (updateData.zone !== undefined) partner.zone = updateData.zone;
      if (updateData.status !== undefined) partner.status = updateData.status;
      if (updateData.avatar !== undefined) partner.avatar = updateData.avatar;
      return partner;
    } else {
      const newPartner = {
        name,
        phone: updateData.phone || "+91 98881 23456",
        vehicle: updateData.vehicle || "Eco Hero Electric (TS-08-EV-4412)",
        zone: updateData.zone || "Hyderabad",
        status: updateData.status || "On Standby",
        avatar: updateData.avatar || name.substring(0, 2).toUpperCase()
      };
      localDeliveryPartners.push(newPartner);
      return newPartner;
    }
  }

  /**
   * Delete a delivery partner
   */
  static async deleteDeliveryPartner(name: string): Promise<boolean> {
    if (isMongo) {
      try {
        await DeliveryPartner.deleteOne({ name });
        return true;
      } catch (err) {
        console.error("Error deleting delivery partner:", err);
      }
    }
    const index = localDeliveryPartners.findIndex(p => p.name === name);
    if (index !== -1) {
      localDeliveryPartners.splice(index, 1);
      return true;
    }
    return false;
  }
}
