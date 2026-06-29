import React, { useEffect, useState } from "react";
import { ArrowLeft, Download, Printer, CheckCircle, Clock } from "lucide-react";
import { Order } from "../types";

interface InvoiceOnlineViewProps {
  orderId: string;
  onNavigate: (page: string, params?: any) => void;
  currentUser: any;
}

export default function InvoiceOnlineView({ orderId, onNavigate, currentUser }: InvoiceOnlineViewProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!token) {
      setError("Please log in to view this invoice.");
      setLoading(false);
      return;
    }

    // Fetch the order details
    fetch(`/api/orders`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch order history");
        return res.json();
      })
      .then((orders: Order[]) => {
        // Find by id or orderId
        const found = orders.find((o) => o.id === orderId || o.orderId === orderId);
        if (!found) {
          setError("Invoice not found or you are not authorized to view it.");
        } else {
          setOrder(found);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Error loading invoice data.");
        setLoading(false);
      });
  }, [orderId]);

  const handleDownloadPDF = async () => {
    const token = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!token || !order) return;

    try {
      const response = await fetch(`/api/orders/${order.id}/invoice/download?token=${token}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${order.orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Error generating dynamic PDF invoice.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 py-12">
        <div className="w-10 h-10 border-4 border-[#0F6E56] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-mono text-slate-500 tracking-widest uppercase">Fetching Invoice Records...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 px-4 py-12 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 border border-red-100">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-slate-800 font-sans tracking-tight mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">{error || "This invoice is protected."}</p>
        <button
          onClick={() => onNavigate("home")}
          className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold font-mono tracking-wider uppercase transition-colors"
        >
          Return to Portal
        </button>
      </div>
    );
  }

  const isPaid = order.paymentMethod !== "Cash on Delivery" || order.status.toLowerCase() === "delivered";
  const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const subtotal = order.totals.subtotal;
  const discount = order.totals.discount || 0;
  const tax = order.totals.tax;
  const shipping = order.totals.shipping;
  const total = order.totals.total;

  const [layout, setLayout] = useState<"standard" | "thermal">("thermal");

  // Safe parsing of shippingAddress to handle both object and string formats
  const sa = order.shippingAddress;
  const isAddressObject = sa && typeof sa === "object";
  const addressPhone = isAddressObject ? ((sa as any).phone || "N/A") : "N/A";
  const addressFullName = isAddressObject ? ((sa as any).fullName || order.userName) : order.userName;
  const addressLine = isAddressObject ? ((sa as any).addressLine || "") : String(sa || "");
  const addressCity = isAddressObject ? ((sa as any).city || "") : "";
  const addressPostalCode = isAddressObject ? ((sa as any).postalCode || "") : "";

  // Render online invoice
  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8">
      {/* Page controls */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <button
          onClick={() => onNavigate("orders")}
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-slate-600 hover:text-[#0F6E56] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> BACK TO ORDERS
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
            <button
              onClick={() => setLayout("thermal")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer ${
                layout === "thermal"
                  ? "bg-[#0F6E56] text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              📟 POS THERMAL SLIP
            </button>
            <button
              onClick={() => setLayout("standard")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer ${
                layout === "standard"
                  ? "bg-[#0F6E56] text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              📄 STANDARD SHEET
            </button>
          </div>
          
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold font-mono transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="h-4 w-4" /> PRINT
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F6E56] hover:bg-[#0b513f] text-white rounded-lg text-xs font-bold font-mono transition-colors shadow-sm cursor-pointer"
          >
            <Download className="h-4 w-4" /> DOWNLOAD PDF
          </button>
        </div>
      </div>

      {layout === "thermal" ? (
        /* Thermal POS Receipt Layout (Size of billing machines, optimized for 3-inch/80mm print) */
        <div id="invoice-sheet" className="max-w-[360px] mx-auto bg-white border border-dashed border-slate-300 rounded-lg shadow-lg p-5 sm:p-6 font-mono text-xs text-slate-800 print:border-none print:shadow-none print:p-0">
          
          {/* Receipt Header */}
          <div className="text-center space-y-1.5 pb-4 border-b border-dashed border-slate-300">
            <div className="mx-auto h-10 w-10 bg-[#0F6E56] text-white flex items-center justify-center font-bold font-serif text-lg rounded-lg shadow-sm">
              JZ
            </div>
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">JANUZEN GLOBAL LLP</h2>
            <p className="text-[10px] text-[#0F6E56] font-bold tracking-wider uppercase">Nuthan Medicals & JA Stationery</p>
            <p className="text-[9px] text-slate-500">Gajularamaram, Hyderabad,</p>
            <p className="text-[9px] text-slate-500">Telangana - 500055</p>
            <p className="text-[9px] text-slate-500">Email: team@januzen.in | Phone: +91-9666588553</p>
            <p className="text-[9px] text-slate-400">GSTIN: Pending Registration</p>
          </div>

          {/* Receipt Metadata */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
            <p><span className="text-slate-400">DATE:</span> {dateStr}</p>
            <p><span className="text-slate-400">RECEIPT #:</span> {order.orderId}</p>
            <p><span className="text-slate-400">INVOICE:</span> {(order as any).invoiceId || `INV-${order.orderId}`}</p>
            <p><span className="text-slate-400">CUST:</span> {order.userName}</p>
            <p><span className="text-slate-400">PHONE:</span> {addressPhone}</p>
          </div>

          {/* Delivery Address */}
          <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
            <span className="text-slate-400 block uppercase font-bold">SHIP TO:</span>
            <p className="font-bold text-slate-700">{addressFullName}</p>
            <p className="text-slate-600">{addressLine}</p>
            {addressCity && <p className="text-slate-600">{addressCity} {addressPostalCode ? `- ${addressPostalCode}` : ""}</p>}
          </div>

          {/* Items Table */}
          <div className="py-4 border-b border-dashed border-slate-300">
            <div className="flex justify-between font-bold text-[10px] text-slate-400 pb-1 uppercase border-b border-dotted border-slate-200">
              <span>Item Description</span>
              <span className="text-right">Total</span>
            </div>
            
            <div className="divide-y divide-dashed divide-slate-100 space-y-2.5 pt-2">
              {order.items.map((item: any, index: number) => {
                const itemAmount = item.price * item.quantity;
                return (
                  <div key={item.productId || index} className="text-[11px] pt-2 first:pt-0">
                    <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {item.shop === "medicals" ? "Nuthan Meds" : "JA Stationery"} • {item.selectedOption?.name || "Standard"}
                    </p>
                    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                      <span>{item.quantity} x ₹{Number(item.price).toFixed(2)}</span>
                      <span className="font-bold text-slate-950">₹{itemAmount.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>SUBTOTAL:</span>
              <span>₹{Number(subtotal).toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span>DISCOUNT:</span>
                <span>-₹{Number(discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>SHIPPING:</span>
              <span>{shipping === 0 ? "FREE" : `₹${Number(shipping).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>TAX/GST (5%):</span>
              <span>₹{Number(tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-dotted border-slate-300">
              <span>TOTAL AMT:</span>
              <span className="text-[#0F6E56]">₹{Number(total).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="py-3 text-center space-y-1">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest block">PAYMENT MODE</span>
            <p className="font-bold text-slate-800 uppercase text-[10px]">{order.paymentMethod}</p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
              <span className="text-[9px] font-bold tracking-wider uppercase text-slate-700">
                {isPaid ? "PAID / POST-CONFIRMED" : "COD / UNPAID"}
              </span>
            </div>
          </div>

          {/* Thermal Receipt QR & Verification */}
          <div className="py-4 bg-slate-50/50 border-t border-b border-dashed border-slate-300 flex flex-col items-center space-y-1.5">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + "/?page=invoice&orderId=" + order.orderId)}`}
              alt="POS Receipt Verification"
              className="w-20 h-20 bg-white p-1 border border-slate-200 rounded shadow-xs"
              referrerPolicy="no-referrer"
            />
            <span className="text-[8px] text-slate-400 tracking-wider uppercase">Scan Receipt to Verify</span>
          </div>

          {/* Receipt Footer message */}
          <div className="text-center pt-4 space-y-1 text-[9px] text-slate-400">
            <p className="font-bold text-slate-600">Thank you for visiting JANUZEN!</p>
            <p>Save Paper, Go Digital.</p>
            <p className="text-[7px] tracking-tight">JANUZEN POS v2.6 • SYSTEM INVOICE SECURE</p>
          </div>

        </div>
      ) : (
        /* Main Premium Invoice Container (Standard Layout) */
        <div id="invoice-sheet" className="max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
          {/* Decorative Top Accent Bar */}
          <div className="h-2 bg-[#0F6E56] w-full" />

          {/* Invoice Header Section */}
          <div className="p-8 sm:p-10 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {/* Premium minimal company badge */}
                <div className="h-12 w-12 bg-[#0F6E56] text-white flex items-center justify-center font-bold font-serif text-2xl rounded-xl shadow-md shadow-[#0F6E56]/10">
                  JZ
                </div>
                <div>
                  <h1 className="text-xl font-extrabold font-sans text-slate-900 tracking-tight">JANUZEN</h1>
                  <p className="text-[10px] font-mono text-[#0F6E56] font-bold tracking-wider uppercase">Global Enterprise LLP</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-mono space-y-1">
                <p className="font-bold text-slate-700">Gajularamaram, Hyderabad,</p>
                <p>Telangana - 500055</p>
                <p>Email: team@januzen.in | Phone: +91-9666588553</p>
                <p className="text-[10px] text-slate-400">GSTIN: 29AAAFJ0427R1Z5 (Pending Registration)</p>
              </div>
            </div>

            <div className="md:text-right space-y-3 font-mono">
              <div>
                <span className="inline-block px-3 py-1 bg-emerald-50 text-[#0F6E56] text-[10px] font-bold uppercase rounded-full border border-emerald-100">
                  OFFICIAL TAX INVOICE
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-slate-400">INVOICE NUMBER</p>
                <p className="text-slate-900 font-bold text-sm tracking-wide">{(order as any).invoiceId || `INV-${order.orderId}`}</p>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-slate-400">ORDER NUMBER</p>
                <p className="text-slate-700 font-bold">{order.orderId}</p>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-slate-400">INVOICE DATE</p>
                <p className="text-slate-700">{dateStr}</p>
              </div>
            </div>
          </div>

        {/* Customer & Address details row */}
        <div className="p-8 sm:p-10 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-8 font-mono text-xs">
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">BILL TO CUSTOMER</h3>
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-sm font-sans">{order.userName}</p>
              <p className="text-slate-600">{order.userEmail}</p>
              <p className="text-slate-500">Phone: {addressPhone}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">DELIVERY ADDRESS</h3>
            <div className="space-y-1 text-slate-600">
              <p className="font-bold text-slate-800">{addressFullName}</p>
              <p>{addressLine}</p>
              {addressCity && <p>{addressCity} {addressPostalCode ? `- ${addressPostalCode}` : ""}</p>}
            </div>
          </div>
        </div>

        {/* Table of products */}
        <div className="p-8 sm:p-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 pr-4">#</th>
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 pl-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item: any, index: number) => {
                  const itemBrand = item.brand || "JANUZEN";
                  const itemAmount = item.price * item.quantity;
                  return (
                    <tr key={item.productId || index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pr-4 font-bold text-slate-400">{index + 1}</td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 text-sm font-sans block">{item.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest block mt-0.5">
                          {item.shop === "medicals" ? "Nuthan Medicals" : "JA Stationery"} • {item.selectedOption?.name || "Standard Unit"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-bold">{itemBrand}</td>
                      <td className="py-4 px-4 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-4 px-4 text-right text-slate-600">₹{Number(item.price).toFixed(2)}</td>
                      <td className="py-4 pl-4 text-right font-bold text-slate-900">₹{itemAmount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Metadata layout */}
        <div className="p-8 sm:p-10 bg-slate-50/70 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Payment info & Validation QR Code */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-1.5 font-mono text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PAYMENT INFORMATION</span>
                <p className="text-slate-700 font-bold">{order.paymentMethod}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {isPaid ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs text-emerald-700 font-bold uppercase">PAID / CONFIRMED</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-amber-700 font-bold uppercase">UNPAID (CASH ON DELIVERY)</span>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic QR Code linking back to this online invoice */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + "/?page=invoice&orderId=" + order.orderId)}`}
                  alt="Invoice QR Code Verification"
                  className="w-24 h-24 bg-white p-1 border border-slate-200 rounded-lg shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block mt-1">Scan to Verify Invoice</span>
              </div>
            </div>

            <div className="p-3 bg-[#0F6E56]/5 border border-[#0F6E56]/10 rounded-xl">
              <p className="text-[10px] font-mono text-[#0F6E56] font-bold tracking-wider uppercase mb-1">🌿 Paperless Billing Commitment</p>
              <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
                This digital billing receipt has been dynamically rendered under JANUZEN's corporate ecological paper-reduction program.
              </p>
            </div>
          </div>

          {/* Detailed Invoice Pricing Totals */}
          <div className="font-mono text-xs space-y-3">
            <div className="flex justify-between text-slate-500">
              <span>Item Subtotal:</span>
              <span>₹{Number(subtotal).toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span>Discounts Applied:</span>
                <span>-₹{Number(discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Delivery & Shipping cost:</span>
              <span>{shipping === 0 ? "FREE" : `₹${Number(shipping).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-slate-500 border-b border-slate-200 pb-3">
              <span>Taxes & GST (5%):</span>
              <span>₹{Number(tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
              <span>GRAND TOTAL:</span>
              <span className="text-lg font-sans text-[#0F6E56] font-extrabold">₹{Number(total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Company Footer */}
        <div className="p-6 bg-slate-900 border-t border-slate-800 text-center font-mono text-[10px] text-slate-400 space-y-1">
          <p className="font-bold text-amber-400">Thank you for your business! We appreciate your support.</p>
          <p>For any queries or corporate bulk desk dispatch logistics, contact team@januzen.in or call +91-9666588553.</p>
          <p className="text-slate-600 text-[8px] tracking-widest uppercase mt-2">JANUZEN Global LLP © 2026 • Secure Paperless Billing System</p>
        </div>
        </div>
      )}
    </div>
  );
}
