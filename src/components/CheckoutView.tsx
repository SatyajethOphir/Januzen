import React from "react";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "../utils/storage";
import { CheckCircle, Truck, ShoppingBag, ArrowRight, ArrowLeft, Loader2, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { CartItem } from "./CartView";
import { User, ShippingAddress, Order } from "../types";

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

  // Razorpay Overlay States
  const [showRazorpay, setShowRazorpay] = React.useState(false);
  const [razorpayMethod, setRazorpayMethod] = React.useState<"card" | "upi" | "netbanking">("card");
  const [razorpayCardNo, setRazorpayCardNo] = React.useState("");
  const [razorpayExpiry, setRazorpayExpiry] = React.useState("");
  const [razorpayCvv, setRazorpayCvv] = React.useState("");
  const [razorpayUpiId, setRazorpayUpiId] = React.useState("");
  const [razorpayBank, setRazorpayBank] = React.useState("State Bank of India");
  const [razorpayStage, setRazorpayStage] = React.useState<"input" | "processing" | "success" >("input");

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
    return () => { active = false; };
  }, []);

  // Sum calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
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
      setShowRazorpay(true);
      setRazorpayStage("input");
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
      quantity: item.quantity
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

  const executeRazorpaySuccess = async (billingPayload: string) => {
    setShowRazorpay(false);
    await executeSubmission("Razorpay Gateway (" + billingPayload + ")");
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
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:border-slate-800 cursor-pointer"
              >
                <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                <option value="Credit Card / Netbanking">Credit Card / Gateway (Simulated)</option>
              </select>
            </div>

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
                    {paymentMethod === "Cash on Delivery" ? "Complete Order (COD)" : "Pay with Razorpay Secure"}
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

          <p className="text-[10px] text-gray-400 leading-normal max-w-xs mx-auto italic">
            📧 An order confirmation and transaction bill details have been broadcasted to <span className="font-semibold text-[#0D1B2A]">{currentUser.email}</span>. A representative will contact you via mobile code {phone}.
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

      {/* 💳 INTERACTIVE SIMULATED RAZORPAY GATEWAY OVERLAY MODAL */}
      {showRazorpay && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col shrink-0">
            {/* Razorpay Banner Header */}
            <div className="bg-[#0b1b36] text-white p-5 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 h-8 w-8 rounded-lg flex items-center justify-center font-black font-serif italic text-white text-base">
                  R
                </div>
                <div>
                  <h3 className="font-sans font-black tracking-wide text-xs flex items-center gap-1.5 uppercase text-white">
                    Razorpay <span className="text-[8px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300 font-mono tracking-widest font-bold">Secure Gateway</span>
                  </h3>
                  <p className="text-[10px] text-slate-300 font-mono">Merchant: JANUZEN LLP</p>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-[8px] uppercase text-slate-400 font-mono font-extrabold tracking-wider">INR Billing Net</span>
                <span className="block text-sm font-black font-mono text-emerald-400">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Stage content */}
            {razorpayStage === "input" && (
              <div className="p-5 space-y-4">
                {/* Method selector */}
                <span className="text-[10px] font-bold text-gray-400 tracking-wider font-mono uppercase block">Debit Payment Protocol</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRazorpayMethod("card")}
                    className={`py-2 text-center rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 p-1 ${
                      razorpayMethod === "card"
                        ? "bg-blue-50/50 border-blue-600 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    Debit/Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setRazorpayMethod("upi")}
                    className={`py-2 text-center rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 p-1 ${
                      razorpayMethod === "upi"
                        ? "bg-blue-50/50 border-blue-600 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4 text-emerald-500" />
                    UPI / QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setRazorpayMethod("netbanking")}
                    className={`py-2 text-center rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 p-1 ${
                      razorpayMethod === "netbanking"
                        ? "bg-blue-50/50 border-blue-600 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                    Netbanking
                  </button>
                </div>

                {/* Card input details */}
                {razorpayMethod === "card" && (
                  <div className="space-y-3.5 text-xs font-sans">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold block uppercase tracking-wide text-[9px]">Card Number</label>
                      <input
                        type="text"
                        placeholder="4111 2222 3333 4444"
                        value={razorpayCardNo}
                        onChange={(e) => setRazorpayCardNo(e.target.value.replace(/\D/g, "").slice(0, 16))}
                        className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-blue-600 font-mono tracking-widest text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
                      <div className="space-y-1">
                        <label className="text-slate-500 font-bold block uppercase tracking-wide text-[9px]">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          placeholder="12/28"
                          value={razorpayExpiry}
                          onChange={(e) => setRazorpayExpiry(e.target.value.slice(0, 5))}
                          className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-blue-600 font-mono text-center text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-500 font-bold block uppercase tracking-wide text-[9px]">CVV Security Code</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={razorpayCvv}
                          onChange={(e) => setRazorpayCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                          className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-blue-600 font-mono text-center text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* UPI details */}
                {razorpayMethod === "upi" && (
                  <div className="space-y-2 text-xs font-sans animate-fade-in">
                    <label className="text-slate-500 font-bold block uppercase tracking-wide text-[9px]">UPI Virtual Payment Address</label>
                    <input
                      type="text"
                      placeholder="e.g. reddyvinuthan@okaxis"
                      value={razorpayUpiId}
                      onChange={(e) => setRazorpayUpiId(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-blue-600 font-mono text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400">Securely routing your billing request to your default BHIM Pay, PhonePe, or Google Pay handles.</p>
                  </div>
                )}

                {/* Netbanking details */}
                {razorpayMethod === "netbanking" && (
                  <div className="space-y-2 text-xs font-sans animate-fade-in">
                    <label className="text-slate-500 font-bold block uppercase tracking-wide text-[9px]">Select Your Indian Bank Institution</label>
                    <select
                      value={razorpayBank}
                      onChange={(e) => setRazorpayBank(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-blue-600 text-slate-800 font-bold cursor-pointer"
                    >
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="HDFC Bank Limited">HDFC Bank Limited</option>
                      <option value="ICICI Bank Limited">ICICI Bank Limited</option>
                      <option value="Axis Bank Limited">Axis Bank Limited</option>
                      <option value="Andhra Bank">Andhra Bank</option>
                    </select>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRazorpay(false)}
                    className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRazorpayStage("processing");
                      setTimeout(() => {
                        setRazorpayStage("success");
                        setTimeout(() => {
                          const payloadString =
                            razorpayMethod === "card"
                              ? `Cards (ending in ${razorpayCardNo.slice(-4) || "4111"})`
                              : razorpayMethod === "upi"
                              ? `UPI (${razorpayUpiId || "vinuthan@upi"})`
                              : `Netbanking (${razorpayBank})`;
                          executeRazorpaySuccess(payloadString);
                        }, 1200);
                      }, 2000);
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-extrabold cursor-pointer shadow-md transition-all uppercase tracking-wide"
                  >
                    Resolve ₹{total.toFixed(2)}
                  </button>
                </div>
              </div>
            )}

            {razorpayStage === "processing" && (
              <div className="p-10 text-center space-y-4">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Validating Handshake Protocol</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Interacting with Indian bank secure nodal networks...</p>
                </div>
              </div>
            )}

            {razorpayStage === "success" && (
              <div className="p-10 text-center space-y-4">
                <div className="h-12 w-12 bg-emerald-50 text-emerald-500 rounded-full border border-emerald-100 flex items-center justify-center mx-auto animate-bounce">
                  <span className="text-xl">✓</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Payment Confirmed Securely!</h4>
                  <p className="text-[11px] text-emerald-600 font-semibold font-mono bg-emerald-50 inline-block px-2.5 py-0.5 rounded border border-emerald-100 mt-2">
                    AUTH ID: RZP-{Math.floor(100000 + Math.random() * 900000)}
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
