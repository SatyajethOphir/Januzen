import React from "react";
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

  // Sum calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = Math.round((subtotal * 0.05) * 100) / 100;
  const shipping = subtotal > 35 ? 0 : 4.99;
  const total = Math.round((subtotal + tax + shipping) * 100) / 100;

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
          paymentMethod
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
                placeholder="Chennai, Bengaluru, etc."
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
                placeholder="600001, 560001"
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
                <p className="text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 inline-block font-mono font-semibold mt-2">
                  🔒 SECURED CORRESPONDENCE ACTIVE
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
                    <span className="font-mono font-bold">${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoices totals check */}
            <div className="border-t border-gray-100 pt-4 space-y-2 font-mono text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Total Items value</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Regulatory Tax (5%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span>Shipping freight value</span>
                <span>{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between pt-2 text-sm text-[#0D1B2A] font-extrabold font-sans">
                <span>Adjusted Total Charge</span>
                <span className="font-mono text-lg font-black text-slate-950">${total.toFixed(2)}</span>
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
                    Complete Order & Pay
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
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
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
            <div className="flex justify-between items-baseline pt-2.5">
              <span className="text-gray-400">CGST Invoice Total</span>
              <span className="font-bold text-slate-900">${placedOrder.totals.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2.5">
              <span className="text-gray-400">Payment Protocol</span>
              <span className="font-bold text-slate-900">{placedOrder.paymentMethod}</span>
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

    </div>
  );
}
