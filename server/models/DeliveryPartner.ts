import mongoose from 'mongoose';

const DeliveryPartnerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  vehicle: { type: String, required: true },
  zone: { type: String, default: "" },
  status: { type: String, default: "On Standby" },
  avatar: { type: String, default: "DP" }
});

export const DeliveryPartner = mongoose.model('DeliveryPartner', DeliveryPartnerSchema);
