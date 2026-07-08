import mongoose from 'mongoose';

const DeliveryTrackingSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  deliveryPartnerId: { type: String, required: true },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  customerLocation: {
    lat: Number,
    lng: Number
  },
  liveCustomerTrackingEnabled: { type: Boolean, default: false },
  eta: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  routeCoords: { type: [[Number]], default: [] },
  speed: { type: Number, default: 0 },
  status: { type: String, enum: ['accepted', 'on_the_way', 'arrived', 'delivered', 'cancelled', 'out_for_delivery'], default: 'accepted' },
  updatedAt: { type: Date, default: Date.now }
});

export const DeliveryTracking = mongoose.model('DeliveryTracking', DeliveryTrackingSchema);
