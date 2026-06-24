import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShoppingCart } from "lucide-react";
import { CartItem } from "./CartView";

interface SideCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQty: (productId: string, quantity: number, optionName?: string) => void;
  onRemoveItem: (productId: string, optionName?: string) => void;
  onNavigate: (view: string, params?: Record<string, any>) => void;
}

export default function SideCartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onNavigate
}: SideCartDrawerProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.selectedOption ? item.selectedOption.price : item.product.price) * item.quantity, 0);
  const tax = Math.round((subtotal * 0.05) * 100) / 100;
  const shipping = subtotal >= 1000 || subtotal === 0 ? 0 : 150;
  const total = Math.round((subtotal + tax + shipping) * 100) / 100;

  // Handles closing animations
  const handleClose = () => {
    const tl = gsap.timeline({
      onComplete: onClose
    });

    tl.to(containerRef.current, {
      x: "100%",
      duration: 0.35,
      ease: "power2.in"
    });
    tl.to(backdropRef.current, {
      opacity: 0,
      duration: 0.25,
      ease: "power1.in"
    }, "-=0.25");
  };

  useEffect(() => {
    if (isOpen) {
      // Set initial states
      gsap.set(backdropRef.current, { opacity: 0 });
      gsap.set(containerRef.current, { x: "100%" });

      // Animate entry of panel and backdrop
      const tl = gsap.timeline();
      tl.to(backdropRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out"
      });
      tl.to(containerRef.current, {
        x: "0%",
        duration: 0.45,
        ease: "power3.out"
      }, "-=0.2");

      // Animate items with stagger inside the drawer if there are items
      if (cartItems.length > 0 && itemsRef.current) {
        const itemRows = itemsRef.current.querySelectorAll(".cart-drawer-item");
        if (itemRows.length > 0) {
          gsap.fromTo(itemRows,
            { opacity: 0, y: 30, scale: 0.95 },
            { 
              opacity: 1, 
              y: 0, 
              scale: 1,
              stagger: 0.06, 
              duration: 0.4, 
              ease: "back.out(1.2)",
              delay: 0.15
            }
          );
        }
      } else if (emptyRef.current) {
        gsap.fromTo(emptyRef.current,
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out", delay: 0.2 }
        );
      }
    }
  }, [isOpen, cartItems.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden" id="side-cart-drawer">
      {/* Backdrop overlay */}
      <div 
        ref={backdropRef}
        onClick={handleClose}
        className="absolute inset-0 bg-[#050C16]/60 backdrop-blur-sm cursor-pointer"
      />

      {/* Side drawer panel */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-md h-full bg-white flex flex-col shadow-2xl border-l border-gray-150 z-10"
      >
        {/* Header section with elite hover trigger */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-[#0D1B2A] text-white">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-teal-400 group-hover:scale-110 transition-transform duration-200" />
            <h2 className="font-serif text-lg font-bold tracking-wide">Your Shopping Bag</h2>
            <span className="bg-teal-500 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ml-1">
              {cartItems.reduce((acc, curr) => acc + curr.quantity, 0)}
            </span>
          </div>

          <button 
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer transform hover:rotate-90 duration-300"
            title="Close Drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic drawer items container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200">
          {cartItems.length === 0 ? (
            <div ref={emptyRef} className="flex flex-col items-center justify-center h-full text-center py-12 space-y-4">
              <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center shadow-inner">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif text-base font-bold text-gray-950">Your basket is quite lonely!</h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Add select diagnostic tools, surgical equipment, or bespoke desk planners to check out.
                </p>
              </div>
              <button
                onClick={() => {
                  handleClose();
                  onNavigate("home");
                }}
                className="px-4 py-2 bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs tracking-wider uppercase rounded-lg transition-all transform active:scale-95 duration-200 scale-100 hover:scale-[1.03] shadow cursor-pointer flex items-center gap-2"
              >
                Browse Catalog
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div ref={itemsRef} className="space-y-3.5 pt-1">
              {cartItems.map((item) => {
                const p = item.product;
                const isMed = p.shop === "medicals";
                const badgeColor = isMed ? "text-teal-600 bg-teal-50 border-teal-100" : "text-amber-600 bg-amber-50 border-amber-100";
                const itemPrice = item.selectedOption ? item.selectedOption.price : p.price;

                return (
                  <div 
                    key={`${p.id}-${item.selectedOption?.name || "default"}`}
                    className="cart-drawer-item bg-white border border-gray-150 rounded-xl p-3 flex gap-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 transform scale-100 hover:scale-[1.01]"
                  >
                    {/* Thumbnail representation */}
                    <img
                      src={p.image}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 rounded-lg object-cover border border-gray-100 shrink-0 cursor-pointer"
                      onClick={() => {
                        handleClose();
                        onNavigate("product-detail", { productId: p.id });
                      }}
                    />

                    {/* Meta specifics */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className={`text-[9px] uppercase font-mono tracking-wider font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                            {isMed ? "Nuthan Medicals" : "JA Stationery"}
                          </span>
                          <button
                            onClick={() => onRemoveItem(p.id, item.selectedOption?.name)}
                            className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-all hover:bg-red-50/80 cursor-pointer transform hover:scale-110 active:scale-90"
                            title="Remove supplies"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <h4 
                          onClick={() => {
                            handleClose();
                            onNavigate("product-detail", { productId: p.id });
                          }}
                          className="font-serif text-[13px] font-bold text-gray-900 cursor-pointer hover:text-teal-600 transition-colors line-clamp-1 mt-1"
                        >
                          {p.name}
                        </h4>
                        {item.selectedOption && (
                          <span className="text-[10px] text-teal-700 bg-teal-50/80 px-1.5 py-0.5 rounded border border-teal-150 font-sans mt-1 inline-block font-bold">
                            Unit: {item.selectedOption.name}
                          </span>
                        )}
                      </div>

                      {/* Stepper inputs & prices */}
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-50">
                        <div className="flex items-center gap-2 border border-gray-200 bg-slate-50/55 rounded-md px-1.5 py-0.5">
                          <button
                            onClick={() => onUpdateQty(p.id, item.quantity - 1, item.selectedOption?.name)}
                            disabled={item.quantity <= 1}
                            className="text-gray-400 hover:text-black hover:bg-gray-200 rounded p-0.5 disabled:opacity-40 cursor-pointer transform active:scale-90 transition-transform"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono text-xs font-bold text-slate-800 px-1 min-w-[12px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQty(p.id, item.quantity + 1, item.selectedOption?.name)}
                            disabled={item.quantity >= p.stock}
                            className="text-gray-400 hover:text-black hover:bg-gray-200 rounded p-0.5 disabled:opacity-40 cursor-pointer transform active:scale-90 transition-transform"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-mono text-xs font-extrabold text-slate-900">
                          ₹{(itemPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invoice pricing summary & Checkout Actions Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-150 bg-slate-50 p-6 space-y-4">
            <div className="space-y-2 font-mono text-[11px] text-gray-500">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-gray-900">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax & Utilities (5%)</span>
                <span className="font-bold text-gray-900">₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Secure Shipping</span>
                <span className="font-bold text-gray-900">
                  {shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`}
                </span>
              </div>
              
              {shipping > 0 && (
                <div className="bg-[#0F9B8E]/5 border border-[#0F9B8E]/10 p-2 rounded text-[10px] font-sans text-[#0c7f74] font-medium leading-tight">
                  Add <span className="font-bold">₹{(1000 - subtotal).toFixed(2)}</span> more to unlock **FREE SECURED SHIPPING**!
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-between items-baseline">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Estimated Total</span>
              <span className="font-mono text-lg font-black text-slate-950">₹{total.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  handleClose();
                  onNavigate("cart");
                }}
                className="w-full py-2.5 px-3 bg-white hover:bg-gray-100 text-slate-900 border border-gray-250 text-xs font-bold uppercase tracking-wider rounded-lg text-center transition-all cursor-pointer transform active:scale-95 duration-150"
              >
                View Bag
              </button>
              
              <button
                onClick={() => {
                  handleClose();
                  onNavigate("checkout");
                }}
                className="w-full py-2.5 px-3 bg-[#0D1B2A] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer transform hover:scale-[1.02] active:scale-95 duration-150 group"
              >
                Checkout
                <ArrowRight className="h-3.5 w-3.5 text-teal-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="text-center text-[9px] text-gray-400 font-mono">
              🔒 SSL ENCRYPTED SECURE ROUTE
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
