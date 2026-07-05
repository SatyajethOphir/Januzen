import React from "react";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "../utils/storage";
import { CheckCircle, Truck, ShoppingBag, ArrowRight, ArrowLeft, Loader2, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { CartItem } from "./CartView";
import { User, ShippingAddress, Order } from "../types";
import { RazorpayGatewayModal } from "./RazorpayGatewayModal";

interface CheckoutViewProps {
  cartItems: CartItem[];
  currentUser: User | null;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  onClearCart: () => void;
}

export default function CheckoutView({ cartItems, currentUser, onNavigate, onClearCart }: CheckoutViewProps) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [placedOrder, setPlacedOrder] = React.useState<Order | null>(null);
  const [shareLinks, setShareLinks] = React.useState<any>(null);

  // Form States
  const [fullName, setFullName] = React.useState(currentUser?.name || "");
  const [addressLine, setAddressLine] = React.useState(currentUser?.address || "");
  const [city, setCity] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [phone, setPhone] = React.useState(currentUser?.phone || "");
  const [paymentMethod, setPaymentMethod] = React.useState("Cash on Delivery");

  // Coupon states
  const [couponInput, setCouponInput] = React.useState("");
  const [discountAmount, setDiscountAmount] = React.useState(0);
  const [appliedCoupon, setAppliedCoupon] = React.useState<string | null>(null);
  const [couponError, setCouponError] = React.useState("");
  const [couponSuccess, setCouponSuccess] = React.useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = React.useState(false);
  const [availableCoupons, setAvailableCoupons] = React.useState<any[]>([]);

  // Razorpay Overlay States
  const [showRazorpay, setShowRazorpay] = React.useState(false);
  const [dismissedOnlineNotice, setDismissedOnlineNotice] = React.useState(false);

  // Dynamics configuration settings fetched from server
  const [shippingCostPerKm, setShippingCostPerKm] = React.useState(15);
  const [deliveryDistanceKms, setDeliveryDistanceKms] = React.useState(10);
  const [gstPercentage, setGstPercentage] = React.useState(5);

  React.useEffect(() => {
    let active = true;
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (active && data) {
          if (data.shippingCostPerKm) setShippingCostPerKm(data.shippingCostPerKm);
          if (data.deliveryDistanceKms) setDeliveryDistanceKms(data.deliveryDistanceKms);
          if (data.gstPercentage) setGstPercentage(data.gstPercentage);
        }
      })
      .catch(e => console.error("Error loading settings at checkout:", e));

    fetch("/api/public/coupons")
      .then(r => r.json())
      .then(data => {
        if (active && data && data.coupons) {
          setAvailableCoupons(data.coupons);
        }
      })
      .catch(e => console.error("Error loading coupons at checkout:", e));

    return () => { active = false; };
  }, []);

  // Sum calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.selectedOption ? item.selectedOption.price : item.product.price) * item.quantity, 0);
  const calculatedShipping = deliveryDistanceKms * shippingCostPerKm;
  const shipping = subtotal >= 1000 || subtotal === 0 ? 0 : calculatedShipping;
  const postDiscountSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = Math.round((postDiscountSubtotal * (gstPercentage / 100)) * 100) / 100;
  const total = Math.round((postDiscountSubtotal + tax + shipping) * 100) / 100;

  const handleValidateCoupon = async () => {
    if (!couponInput) {
      setCouponError("Please type a valid coupon code.");
      return;
    }
    setIsValidatingCoupon(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const res = await fetch("/api/public/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, basketValue: subtotal })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setDiscountAmount(data.discountAmount);
        setAppliedCoupon(couponInput.toUpperCase().trim());
        setCouponSuccess(data.message);
      } else {
        setCouponError(data.message || "Invalid or inactive discount coupon.");
        setDiscountAmount(0);
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error(err);
      setCouponError("Unable to validate coupon on host ledger.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponInput("");
    setDiscountAmount(0);
    setAppliedCoupon(null);
    setCouponError("");
    setCouponSuccess("");
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-gray-200 p-8 rounded-2xl text-center space-y-6 shadow-sm">
        <Lock className="h-10 w-10 text-[#D4820A] mx-auto animate-pulse" />
        <h2 className="font-serif text-2xl font-extrabold text-[#0D1B2A]">Secure Portal Verification</h2>
        <p className="text-xs text-gray-500 leading-normal">
          To orchestrate clinical drugs and corporate business supplies orders securely, users must authenticate their identity on the JANUZEN central ledger.
        </p>
        <button
          onClick={() => onNavigate("login", { redirectAfter: "checkout" })}
          className="w-full py-3 bg-[#0D1B2A] text-white hover:bg-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          Access Portal / Register Now
        </button>
      </div>
    );
  }

  if (cartItems.length === 0 && step !== 3) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-gray-100 p-8 rounded-xl text-center space-y-4">
        <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto" />
        <h3 className="font-serif text-lg font-bold">Shopping basket empty</h3>
        <p className="text-xs text-gray-500">Add medications or paper supplies into your bag before checking out.</p>
        <button onClick={() => onNavigate("home")} className="px-4 py-2 bg-[#0D1B2A] text-white rounded text-xs font-semibold cursor-pointer">
          Continue Browsing
        </button>
      </div>
    );
  }

  const handleShare = async () => {
    if (!placedOrder) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "JANUZEN Order Confirmed",
          text: `My order ${placedOrder.orderId} from JANUZEN Global LLP is confirmed! Total: ₹${placedOrder.totals.total}`,
          url: "https://januzen.in",
        });
      } catch (err) {
        // User cancelled share — not an error, do nothing
      }
    } else {
      const whatsappUrl = shareLinks?.whatsapp || `https://wa.me/?text=${encodeURIComponent(
        `Hi! I just placed an order with JANUZEN Global LLP 🛍️\n\nOrder ID: ${placedOrder.orderId}\nTotal: ₹${placedOrder.totals.total}\n\nView products at: https://januzen.in`
      )}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !addressLine || !city || !postalCode || !phone) {
      setErrorMessage("Please supply all shipping and contact details form fields.");
      return;
    }
    setErrorMessage("");
    setStep(2);
  };

  const handlePlaceOrder = async () => {
    if (paymentMethod !== "Cash on Delivery") {
      setDismissedOnlineNotice(false);
      (window as any).showToast?.("Online Payments are coming soon! Please use Cash on Delivery (COD) for now.", "info");
      return;
    }
    await executeSubmission("Cash on Delivery");
  };

  const executeSubmission = async (resolvedMethod: string) => {
    setLoading(true);
    setErrorMessage("");

    const shippingAddress: ShippingAddress = {
      fullName,
      addressLine,
      city,
      postalCode,
      phone
    };

    const orderedItems = cartItems.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      selectedOption: item.selectedOption
    }));

    try {
      const token = localStorage.getItem("januzen_token");
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          items: orderedItems,
          shippingAddress,
          paymentMethod: resolvedMethod,
          couponCode: appliedCoupon
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPlacedOrder(data.order);
        setShareLinks(data.shareLinks);
        onClearCart();
        setStep(3);
      } else {
        setErrorMessage(data.error || "Order placement failed. Check server stock levels.");
      }
    } catch (err) {
      setErrorMessage("Failed to establish server connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* 📌 Wizard step banner indicators */}
      <div className="flex items-center justify-between max-w-sm mx-auto mb-10 select-none">
        <div className="flex flex-col items-center gap-1">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
            step >= 1 ? "bg-[#0D1B2A] text-white border-[#0D1B2A]" : "bg-white text-gray-400 border-gray-200"
          }`}>1</div>
          <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-gray-500">Shipping</span>
        </div>
        <div className="h-0.5 w-16 bg-gray-200 flex-1 mx-3" />
        <div className="flex flex-col items-center gap-1">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
            step >= 2 ? "bg-[#0D1B2A] text-white border-[#0D1B2A]" : "bg-white text-gray-400 border-gray-200"
          }`}>2</div>
          <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-gray-500">Review</span>
        </div>
        <div className="h-0.5 w-16 bg-gray-200 flex-1 mx-3" />
        <div className="flex flex-col items-center gap-1">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
            step === 3 ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-400 border-gray-200"
          }`}>3</div>
          <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-gray-500">Receipt</span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-mono font-medium mb-6 animate-pulse">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* STEP 1: SHIPPING FORM DETAILS */}
      {step === 1 && (
        <form onSubmit={handleNextStep} className="bg-white border border-gray-150 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="font-serif text-xl font-bold text-[#0D1B2A] border-b border-gray-100 pb-3">Destination Shipping Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-gray-500 uppercase tracking-wider font-bold">Consignee Full Name</label>
              <input
                type="text"
                required
                placeholder="Receiver name..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-gray-500 uppercase tracking-wider font-bold">Courier Shipping Address</label>
              <input
                type="text"
                required
                placeholder="Suite, apartment, block, street address..."
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-500 uppercase tracking-wider font-bold">Metro City</label>
              <input
                type="text"
                required
                placeholder="Hyderabad, Secunderabad, etc."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-500 uppercase tracking-wider font-bold">PIN Postal Code</label>
              <input
                type="text"
                required
                placeholder="500117, 500090, etc."
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-500 uppercase tracking-wider font-bold">Verified Contact Phone</label>
              <input
                type="tel"
                required
                placeholder="+91 94433 2XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-500 uppercase tracking-wider font-bold">Payment Protocol</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const val = e.target.value;
                  setPaymentMethod(val);
                  if (val !== "Cash on Delivery") setDismissedOnlineNotice(false);
                }}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:border-slate-800 cursor-pointer"
              >
                <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                <option value="Online Payment">Online Payment (Credit Card / UPI / Netbanking)</option>
              </select>
            </div>

            {paymentMethod !== "Cash on Delivery" && !dismissedOnlineNotice && (
              <div className="mt-4 sm:col-span-2 p-5 rounded-xl border border-amber-200 bg-amber-50/95 dark:bg-amber-950/30 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-sm transition-all duration-300 animate-fadeIn font-sans">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span className="text-base">🚧</span>
                    <span className="tracking-wide">Online Payments Coming Soon</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedOnlineNotice(true)}
                    className="text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-100 p-1 text-xs font-bold cursor-pointer transition-colors"
                    title="Dismiss notice"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
                  <p>We are currently integrating our secure payment gateway.</p>
                  <p>For now, please use <strong className="font-semibold text-amber-950 dark:text-amber-100">Cash on Delivery (COD)</strong>.</p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 pt-0.5">Thank you for your patience.</p>
                </div>
                <div className="mt-4 flex items-center justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("Cash on Delivery");
                      setDismissedOnlineNotice(false);
                      (window as any).showToast?.("Switched to Cash on Delivery (COD).", "success");
                    }}
                    className="bg-amber-900 hover:bg-amber-950 dark:bg-amber-700 dark:hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 font-sans"
                  >
                    <span>Switch to Cash on Delivery (COD)</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="border-t border-gray-100 pt-6 flex justify-between items-center">
            <button
              type="button"
              onClick={() => onNavigate("cart")}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-black font-semibold font-mono uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to basket
            </button>
            <button
              type="submit"
              className="bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs tracking-wider uppercase py-3 px-6 rounded-lg flex items-center gap-2 cursor-pointer"
            >
              Review Order Summary
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: SUMMARY AND CONFIRMS */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-150 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-[#0D1B2A] border-b border-gray-100 pb-3">Review Purchase Details</h2>
            
            {/* Courier metrics summaries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-gray-400 uppercase tracking-widest font-mono block">Courier Consignee</span>
                <p className="font-bold text-slate-850">{fullName}</p>
                <p className="text-gray-500 font-medium leading-relaxed mt-1">
                  {addressLine}, {city} - {postalCode} <br />
                  Phone: {phone}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 uppercase tracking-widest font-mono block">Billing Code</span>
                <p className="font-bold text-slate-850">{paymentMethod}</p>
                <p className="text-[11px] text-[#0A5C36] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 inline-block font-mono font-semibold mt-2">
                  🔒 SECURED INDEPENDENT GATEWAY ACTIVE
                </p>
              </div>
            </div>

            {/* Baskets thumbnail summary */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <span className="text-gray-400 uppercase tracking-widest font-mono text-[10px] block">Baskets inventory check</span>
              <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {cartItems.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center py-2.5 text-xs text-slate-700">
                    <span className="truncate max-w-sm font-medium">{item.product.name} (x{item.quantity})</span>
                    <span className="font-mono font-bold">₹{(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Apply Promo Coupon input */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <span className="text-gray-400 uppercase tracking-widest font-mono text-[10px] block">Apply Promo Coupon</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. JANUZEN10"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  disabled={appliedCoupon !== null}
                  className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono text-gray-800 uppercase focus:outline-none focus:border-slate-800 flex-1 disabled:opacity-50"
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold font-mono text-[11px] px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleValidateCoupon}
                    disabled={isValidatingCoupon || !couponInput}
                    className="bg-[#0f9b8e] hover:bg-[#0c7f74] text-white font-bold font-mono text-[11px] px-4 py-2 rounded-lg cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isValidatingCoupon ? "Checking..." : "Apply"}
                  </button>
                )}
              </div>
              {couponError && <p className="text-[10px] text-red-500 font-mono mt-1">❌ {couponError}</p>}
              {couponSuccess && <p className="text-[10px] text-emerald-600 font-mono mt-1">✅ {couponSuccess}</p>}
              {appliedCoupon && !couponError && (
                <div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-[10px] text-emerald-700 font-mono flex justify-between">
                  <span>Activated Code:</span>
                  <span className="font-bold">{appliedCoupon}</span>
                </div>
              )}

              {availableCoupons.length > 0 && !appliedCoupon && (
                <div className="mt-2 bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                  <span className="text-[10px] text-slate-500 font-mono block mb-1.5 uppercase font-bold tracking-wider">Available Coupon Codes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableCoupons.map((c: any) => (
                      <button
                        key={c.id || c.code}
                        type="button"
                        onClick={async () => {
                          setCouponInput(c.code.toUpperCase());
                          setIsValidatingCoupon(true);
                          setCouponError("");
                          setCouponSuccess("");
                          try {
                            const res = await fetch("/api/public/coupons/validate", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ code: c.code, basketValue: subtotal })
                            });
                            const data = await res.json();
                            if (res.ok && data.valid) {
                              setDiscountAmount(data.discountAmount);
                              setAppliedCoupon(c.code.toUpperCase().trim());
                              setCouponSuccess(data.message);
                              setCouponInput(c.code.toUpperCase());
                            } else {
                              setCouponError(data.message || "Invalid or inactive discount coupon.");
                              setDiscountAmount(0);
                              setAppliedCoupon(null);
                            }
                          } catch (err) {
                            console.error(err);
                            setCouponError("Unable to validate coupon on host ledger.");
                          } finally {
                            setIsValidatingCoupon(false);
                          }
                        }}
                        className="bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-700 text-[10px] font-mono px-2 py-1 rounded cursor-pointer transition-colors shadow-sm text-left flex flex-col"
                      >
                        <span className="font-bold">{c.code}</span>
                        <span className="text-[8px] text-gray-400">
                          {c.discountType === "percentage" ? `${c.discountValue}% off` : `₹${c.discountValue} off`} (min. ₹{c.minBasketValue})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Invoices totals check */}
            <div className="border-t border-gray-100 pt-4 space-y-2 font-mono text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Total Items value</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Promo Discount Applied</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Regulatory SGST ({gstPercentage}%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span>Shipping freight value</span>
                <span>{shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between pt-2 text-sm text-[#0D1B2A] font-extrabold font-sans">
                <span>Adjusted Total Charge</span>
                <span className="font-mono text-lg font-black text-slate-950">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {paymentMethod !== "Cash on Delivery" && !dismissedOnlineNotice && (
              <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/95 dark:bg-amber-950/30 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-sm transition-all duration-300 animate-fadeIn font-sans">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span className="text-base">🚧</span>
                    <span className="tracking-wide">Online Payments Coming Soon</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedOnlineNotice(true)}
                    className="text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-100 p-1 text-xs font-bold cursor-pointer transition-colors"
                    title="Dismiss notice"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
                  <p>We are currently integrating our secure payment gateway.</p>
                  <p>For now, please use <strong className="font-semibold text-amber-950 dark:text-amber-100">Cash on Delivery (COD)</strong>.</p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 pt-0.5">Thank you for your patience.</p>
                </div>
                <div className="mt-4 flex items-center justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("Cash on Delivery");
                      setDismissedOnlineNotice(false);
                      (window as any).showToast?.("Switched to Cash on Delivery (COD).", "success");
                    }}
                    className="bg-amber-900 hover:bg-amber-950 dark:bg-amber-700 dark:hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 font-sans"
                  >
                    <span>Switch to Cash on Delivery (COD)</span>
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-6 flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-black font-semibold font-mono uppercase tracking-wider disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Change Delivery destination
              </button>
              
              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wider uppercase py-3 px-6 rounded-lg flex items-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executing Order Ledger...
                  </>
                ) : (
                  <>
                    {paymentMethod === "Cash on Delivery" ? "Complete Order (COD)" : "Complete Order (Online Payment)"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS OR CONFIRMED */}
      {step === 3 && placedOrder && (
        <div className="bg-white border border-gray-150 rounded-2xl p-8 space-y-6 shadow-md text-center max-w-xl mx-auto">
          <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow border border-emerald-100 animate-bounce">
            <CheckCircle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-black text-gray-900">Purchase Successfully Booked!</h2>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed animate-pulse">
              Order request completed. Your shipment has been lodged inside JANUZEN central courier logistics system.
            </p>
          </div>

          {/* Render receipt identifier */}
          <div className="bg-slate-50 border border-gray-150 p-4 rounded-xl space-y-1 max-w-sm mx-auto font-mono text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">LOGGED ORDER ID</span>
            <span className="text-base font-black text-[#0D1B2A] block selection:bg-slate-300">
              {placedOrder.orderId}
            </span>
          </div>

          <div className="pt-2 divide-y divide-gray-100 text-xs border-y border-gray-100 text-left space-y-2.5 px-4 font-mono">
            <div className="flex justify-between items-baseline pt-2.5 font-sans font-bold text-gray-800">
              <span>Original Basket Value</span>
              <span>₹{(placedOrder.totals.subtotal || subtotal).toFixed(2)}</span>
            </div>
            {placedOrder.totals.discount > 0 && (
              <div className="flex justify-between items-baseline pt-2.5 text-emerald-600 font-semibold font-sans">
                <span>Promo Coupon Save</span>
                <span>-₹{placedOrder.totals.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2.5">
              <span>GST Tax invoice ({gstPercentage}%)</span>
              <span>₹{(placedOrder.totals.tax || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2.5">
              <span>Logistics Freight Duty</span>
              <span>{(placedOrder.totals.shipping || 0) === 0 ? "FREE" : `₹${(placedOrder.totals.shipping || 0).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2.5 pb-2.5 text-slate-900 font-serif font-black text-sm">
              <span>Grand Consolidated Sum</span>
              <span className="font-mono font-black border-b border-double border-slate-700">₹{(placedOrder.totals.total || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2.5 pb-2.5 text-slate-500">
              <span>Payment Protocol</span>
              <span className="font-semibold">{placedOrder.paymentMethod}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2.5 pb-2.5">
              <span className="text-gray-400">Delivery Target ETA</span>
              <span className="font-bold text-emerald-600 font-sans">Same day / Next 24 hours</span>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3 max-w-sm mx-auto">
            <p className="text-xs font-semibold text-slate-700 leading-normal">
              🎁 Share your order details with contacts or save a log of it!
            </p>
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <span>📱</span> Share on WhatsApp
            </button>
            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 font-medium leading-normal">
              <span>📧</span> Invoice has been sent to {placedOrder.userEmail}
            </p>
          </div>

          <p className="text-[10px] text-gray-400 leading-normal max-w-xs mx-auto italic">
            A representative will contact you via mobile code {phone} to schedule delivery.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              onClick={() => onNavigate("orders")}
              className="flex-1 py-3 bg-[#0F9B8E] hover:bg-opacity-95 text-white font-bold text-xs tracking-wider uppercase rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Track Order Status
            </button>
            <button
              onClick={() => onNavigate("home")}
              className="flex-1 py-3 bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs tracking-wider uppercase rounded-xl border border-gray-200 shadow-sm transition-colors cursor-pointer"
            >
              Return to Catalog
            </button>
          </div>
        </div>
      )}

      {/* 💳 INTERACTIVE RAZORPAY GATEWAY MODAL & AUDIT SUITE */}
      <RazorpayGatewayModal
        isOpen={showRazorpay}
        onClose={() => setShowRazorpay(false)}
        total={total}
        cartItems={cartItems}
        shippingAddress={{
          fullName,
          addressLine,
          city,
          postalCode,
          phone
        }}
        appliedCoupon={appliedCoupon}
        onSuccess={(order, _paymentRecord) => {
          setShowRazorpay(false);
          setPlacedOrder(order);
          onClearCart();
          setStep(3);
        }}
      />

    </div>
  );
}
