export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  address?: string;
  image?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  shop: 'medicals' | 'stationery';
  stock: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  image: string;
  tags: string[];
  featured: boolean;
  isActive: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  shop: 'medicals' | 'stationery';
}

export interface ShippingAddress {
  fullName: string;
  addressLine: string;
  city: string;
  postalCode: string;
  phone: string;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface OrderStatusLog {
  status: string;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  totals: OrderTotals;
  status: 'Pending' | 'Dispatched' | 'Delivered' | 'Cancelled' | 'placed' | 'confirmed' | 'processing' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
  statusHistory?: OrderStatusLog[];
  paymentMethod: string;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  productType: 'medicals' | 'stationery';
  addedAt: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  shop: 'medicals' | 'stationery' | 'general';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minBasketValue: number;
  isActive: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userImage?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

