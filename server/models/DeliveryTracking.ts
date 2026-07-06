import mongoose from 'mongoose';

const DeliveryTrackingSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  deliveryPartnerId: { type: String, required: true },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  status: { type: String, enum: ['accepted', 'on_the_way', 'arrived', 'delivered', 'cancelled'], default: 'accepted' },
  updatedAt: { type: Date, default: Date.now }
});

export const DeliveryTracking = mongoose.model('DeliveryTracking', DeliveryTrackingSchema);
