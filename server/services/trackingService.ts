import { DeliveryTracking } from "../models/DeliveryTracking";
import { isMongo } from "../db";

// Memory store fallback for tracking when isMongo is false
const localTrackingStore = new Map<string, {
  orderId: string;
  deliveryPartnerId: string;
  currentLocation: { lat: number; lng: number };
  status: string;
  updatedAt: string;
  speed?: number;
}>();

// Starting hub: Gajularamaram, Hyderabad, India
const H_LAT = 17.5147;
const H_LNG = 78.4116;

/**
 * Generate a deterministic customer coordinate in Hyderabad based on order ID
 * so that it is stable and remains within 3-8 km of Gajularamaram.
 */
export function getCustomerCoordinates(orderId: string): { lat: number; lng: number } {
  // Simple hashing to get deterministic offsets
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = orderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Hyderabad latitude ranges around 17.45 - 17.54, longitude around 78.35 - 78.48
  const latOffset = ((Math.abs(hash) % 100) / 1000) - 0.05; // -0.05 to +0.05
  const lngOffset = (((Math.abs(hash) >> 8) % 100) / 1000) - 0.05; // -0.05 to +0.05
  
  // Center around Gajularamaram but add a realistic distance
  const baseLat = H_LAT + (latOffset * 0.4) - 0.01;
  const baseLng = H_LNG + (lngOffset * 0.4) + 0.015;

  return { lat: baseLat, lng: baseLng };
}

export class TrackingService {
  /**
   * Get tracking info for an order.
   * If it doesn't exist, initializes it.
   */
  static async getTracking(orderId: string, deliveryPartnerId = "Suresh Kumar"): Promise<any> {
    const customerCoords = getCustomerCoordinates(orderId);
    
    if (isMongo) {
      try {
        let tracking = await DeliveryTracking.findOne({ orderId });
        if (!tracking) {
          tracking = await DeliveryTracking.create({
            orderId,
            deliveryPartnerId,
            currentLocation: {
              lat: H_LAT,
              lng: H_LNG
            },
            status: "accepted",
            updatedAt: new Date()
          });
        }
        return {
          orderId: tracking.orderId,
          deliveryPartnerId: tracking.deliveryPartnerId,
          currentLocation: tracking.currentLocation,
          status: tracking.status,
          updatedAt: tracking.updatedAt.toISOString(),
          customerLocation: customerCoords,
          driverDetails: {
            name: "Suresh Kumar",
            phone: "+91 98881 23456",
            vehicle: "Eco Hero Electric (TS-08-EV-4412)"
          }
        };
      } catch (err) {
        console.error("Error fetching DeliveryTracking from Mongo:", err);
      }
    }

    // Local in-memory fallback
    let tracking = localTrackingStore.get(orderId);
    if (!tracking) {
      tracking = {
        orderId,
        deliveryPartnerId,
        currentLocation: { lat: H_LAT, lng: H_LNG },
        status: "accepted",
        updatedAt: new Date().toISOString()
      };
      localTrackingStore.set(orderId, tracking);
    }

    return {
      ...tracking,
      customerLocation: customerCoords,
      driverDetails: {
        name: "Suresh Kumar",
        phone: "+91 98881 23456",
        vehicle: "Eco Hero Electric (TS-08-EV-4412)"
      }
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
    speed?: number
  ): Promise<any> {
    const updatedAtStr = new Date().toISOString();

    if (isMongo) {
      try {
        const tracking = await DeliveryTracking.findOneAndUpdate(
          { orderId },
          {
            $set: {
              "currentLocation.lat": lat,
              "currentLocation.lng": lng,
              ...(status ? { status } : {}),
              updatedAt: new Date()
            }
          },
          { upsert: true, new: true }
        );

        return {
          orderId: tracking.orderId,
          deliveryPartnerId: tracking.deliveryPartnerId,
          currentLocation: tracking.currentLocation,
          status: tracking.status,
          updatedAt: tracking.updatedAt.toISOString(),
          speed
        };
      } catch (err) {
        console.error("Error updating DeliveryTracking in Mongo:", err);
      }
    }

    // Local fallback
    let tracking = localTrackingStore.get(orderId);
    if (!tracking) {
      tracking = {
        orderId,
        deliveryPartnerId: "Suresh Kumar",
        currentLocation: { lat, lng },
        status: status || "accepted",
        updatedAt: updatedAtStr,
        speed
      };
    } else {
      tracking.currentLocation = { lat, lng };
      if (status) tracking.status = status;
      tracking.updatedAt = updatedAtStr;
      if (speed !== undefined) tracking.speed = speed;
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
}
