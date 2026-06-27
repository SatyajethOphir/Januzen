import React from "react";
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight, ArrowLeft } from "lucide-react";
import { Product, ProductOption } from "../types";
import { CartItemSkeleton } from "./SkeletonLoader";
import ImageWithLoader from "./ImageWithLoader";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedOption?: ProductOption;
}

interface CartViewProps {
  cartItems: CartItem[];
  onUpdateQty: (productId: string, quantity: number, optionName?: string) => void;
  onRemoveItem: (productId: string, optionName?: string) => void;
  onNavigate: (view: string, params?: Record<string, any>) => void;
}

export default function CartView({ cartItems, onUpdateQty, onRemoveItem, onNavigate }: CartViewProps) {
  const [cartLoading, setCartLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setCartLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);
  
  const subtotal = cartItems.reduce((sum, item) => sum + (item.selectedOption ? item.selectedOption.price : item.product.price) * item.quantity, 0);
  const tax = Math.round((subtotal * 0.05) * 100) / 100; // 5% GST scale in India
  const shipping = subtotal >= 1000 || subtotal === 0 ? 0 : 150; // Free shipping above ₹1000, else ₹150
  const total = Math.round((subtotal + tax + shipping) * 100) / 100; // Standard rounding

  const emptyCart = cartItems.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      <h1 className="font-serif text-3xl font-extrabold text-[#0D1B2A] mb-8 border-b border-gray-100 pb-3">
        Shopping Bag
      </h1>

      {emptyCart ? (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl bg-white space-y-6">
          <div className="h-14 w-14 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-gray-900">Your shopping bag is empty</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">Load medications or office stationery supplies into your basket, and they will display here.</p>
          </div>
          <button
            onClick={() => onNavigate("home")}
            className="px-5 py-2.5 bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs tracking-wide rounded-lg transition-colors cursor-pointer"
          >
            Explore Divisions
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main items listing table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-sm">
              <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-xs font-bold text-gray-400 font-mono uppercase bg-slate-100">
                <span className="col-span-6">Supplies Details</span>
                <span className="col-span-2 text-center">Unit Price</span>
                <span className="col-span-2 text-center">Quantity</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>

              <div className="divide-y divide-gray-100">
                {cartLoading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(Math.max(cartItems.length, 1))].map((_, i) => (
                      <CartItemSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="animate-fade-in-up divide-y divide-gray-100">
                    {cartItems.map((item) => {
                      const p = item.product;
                      const itemPrice = item.selectedOption ? item.selectedOption.price : p.price;
                      const itemSub = itemPrice * item.quantity;
                      const itemColor = p.shop === "medicals" ? "text-teal-600 font-bold" : "text-amber-600 font-bold";

                      return (
                        <div key={`${p.id}-${item.selectedOption?.name || "default"}`} className="grid grid-cols-1 sm:grid-cols-12 gap-4 px-6 py-5 items-center">
                          
                          {/* Product details thumbnail & info */}
                          <div className="col-span-1 sm:col-span-6 flex gap-4">
                            <ImageWithLoader
                              src={p.image}
                              alt={p.name}
                              className="h-16 w-16 rounded-lg"
                              containerClassName="h-16 w-16 shrink-0 border border-gray-150"
                            />
                            <div>
                              <span className={`${itemColor} text-[10px] uppercase font-mono tracking-widest block`}>
                                {p.shop === "medicals" ? "Nuthan Medicals" : "JA Stationery"}
                              </span>
                              <h4
                                onClick={() => onNavigate("product-detail", { productId: p.id })}
                                className="font-serif text-sm font-bold text-gray-900 cursor-pointer hover:text-blue-700 line-clamp-1 mt-0.5"
                              >
                                {p.name}
                              </h4>
                              {item.selectedOption && (
                                <p className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 font-sans mt-1 inline-block font-semibold">
                                  Unit: {item.selectedOption.name}
                                </p>
                              )}
                              <button
                                onClick={() => onRemoveItem(p.id, item.selectedOption?.name)}
                                className="text-[11px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 mt-1.5 cursor-pointer font-medium"
                              >
                                <Trash2 className="h-3 w-3" />
                                Remove item
                              </button>
                            </div>
                          </div>

                          {/* Unit pricing detail */}
                          <div className="col-span-1 sm:col-span-2 text-center sm:block flex justify-between items-center bg-slate-50/50 sm:bg-transparent p-2 sm:p-0 rounded">
                            <span className="sm:hidden text-xs text-gray-400 uppercase font-mono">Price:</span>
                            <span className="font-mono text-sm font-bold text-gray-700">₹{itemPrice.toFixed(2)}</span>
                          </div>

                          {/* Quantity stepper controller */}
                          <div className="col-span-1 sm:col-span-2 flex justify-between sm:justify-center items-center bg-slate-50/50 sm:bg-transparent p-2 sm:p-0 rounded">
                            <span className="sm:hidden text-xs text-gray-400 uppercase font-mono">Qty:</span>
                            <div className="flex items-center gap-2 border border-gray-250 bg-white rounded-lg px-2 py-1">
                              <button
                                onClick={() => onUpdateQty(p.id, item.quantity - 1, item.selectedOption?.name)}
                                disabled={item.quantity <= 1}
                                className="text-gray-400 hover:text-black hover:bg-slate-100 rounded p-0.5 disabled:opacity-40 cursor-pointer"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="font-mono text-xs font-bold text-slate-800 px-1">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateQty(p.id, item.quantity + 1, item.selectedOption?.name)}
                                disabled={item.quantity >= p.stock}
                                className="text-gray-400 hover:text-black hover:bg-slate-100 rounded p-0.5 disabled:opacity-40 cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Total Item subtotal column */}
                          <div className="col-span-1 sm:col-span-2 text-right sm:block flex justify-between items-center bg-slate-50/50 sm:bg-transparent p-2 sm:p-0 rounded">
                            <span className="sm:hidden text-xs text-gray-400 uppercase font-mono">Subtotal:</span>
                            <span className="font-mono text-sm font-extrabold text-gray-900">₹{itemSub.toFixed(2)}</span>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate("home")}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black font-semibold uppercase tracking-widest font-mono cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </button>
          </div>

          {/* Cart summary widgets sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-150 rounded-xl p-6 space-y-6 shadow-sm">
              <h3 className="font-serif text-lg font-extrabold text-[#0D1B2A] border-b border-gray-100 pb-3">Order Summary</h3>

              <div className="space-y-3 font-mono text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Basket Subtotal</span>
                  <span className="font-bold text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST & Utilities (5%)</span>
                  <span className="font-bold text-gray-900">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Freight</span>
                  <span className="font-bold text-gray-900">
                    {shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`}
                  </span>
                </div>
                
                {shipping > 0 && (
                  <div className="bg-[#0F9B8E]/5 border border-[#0F9B8E]/10 p-2.5 rounded text-[11px] font-sans text-[#0c7f74] leading-normal font-medium">
                    Add <span className="font-bold">₹{(1000 - subtotal).toFixed(2)}</span> more in supplies to unlock **FREE SECURED FREIGHT SHIPPING**!
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-baseline">
                <span className="text-sm font-bold text-[#0D1B2A]">Invoice Total</span>
                <span className="font-mono text-xl font-black text-slate-950">₹{total.toFixed(2)}</span>
              </div>

              <button
                onClick={() => onNavigate("checkout")}
                className="w-full py-3 px-4 bg-[#0D1B2A] hover:bg-slate-800 text-white text-xs font-bold tracking-widest uppercase rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="text-center text-[10px] text-gray-400 font-mono pt-1">
                ✔️ SECURE CORRESPONDENCES ENCRYPTED
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
