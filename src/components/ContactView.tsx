import React from "react";
import { Mail, Phone, MapPin, Clock, Send, ShieldAlert, CheckCircle, ChevronDown, ChevronUp, Map } from "lucide-react";

export default function ContactView() {
  // Form Submission states
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [shop, setShop] = React.useState("general");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState("");
  const [error, setError] = React.useState("");

  // FAQ Accordion states
  const [faqOpen, setFaqOpen] = React.useState<Record<number, boolean>>({
    0: true, // open first by default
  });

  const faqs = [
    {
      q: "Do you require a physical doctor's prescription for Nuthan Medicals items?",
      a: "Yes, for any item listed under the 'Prescriptions' category, we require a valid physical or digital scan of a doctor's prescription with standard registration details prior to intra-city dispatching. Over-the-counter and emergency first-aid items can be purchased freely."
    },
    {
      q: "What is your shipping fee grid and delivery timeline framework?",
      a: "All orders over $35 enjoy immediate Free Secured Freight Delivery across Bengaluru and Chennai metros. Orders below $35 incur a minor freight charge of $4.99. Goods are dispatched from local unit hubs within 4 hours, targeting arrival within 24 hours."
    },
    {
      q: "Do you support commercial wholesale pricing accounts for offices, clinics, or schools?",
      a: "Absolutely. Corporate clients can enquire about bulk contract accounts. By setting up bulk accounts, you unlock custom terms, monthly billing credit lines, and direct accounts coordinators. Use this contact form or reach our central corporate sales desk."
    },
    {
      q: "What is your policy regarding product returns, damages, or clinical recall campaigns?",
      a: "Prescription medications cannot be returned once unsealed, due to biological compliance protocols. For devices, notebooks, or unopened stationery files, we extend a complete 14-day hassle-free return window from invoice date."
    }
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess("");
    setError("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, shop, message })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || "Message dispatched successfully.");
        setName("");
        setEmail("");
        setSubject("");
        setShop("general");
        setMessage("");
      } else {
        setError(data.error || "Form submission failed.");
      }
    } catch (err) {
      setError("Failed to connect to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFaq = (idx: number) => {
    setFaqOpen(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-16 pb-16">
      
      {/* 🌟 Editorial Header */}
      <section className="text-center max-w-xl mx-auto space-y-4">
        <span className="text-xs uppercase tracking-[#0.25em] font-extrabold text-[#0F9B8E] block font-mono">Customer Assistance</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#0D1B2A]">Connect with Us</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Encountering stock issues, bulk corporate inquiries, or prescription uploads? Our divisions are ready to assist.
        </p>
      </section>

      {/* Division Cards Block */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card 1: Nuthan Medicals Branch */}
        <div className="bg-white border border-teal-100 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm border-t-4 border-t-[#0F9B8E]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-teal-600">Healthcare Division</span>
              <h3 className="font-serif text-xl font-bold text-[#0D1B2A] mt-1">Nuthan Medicals Branch</h3>
            </div>
            <span className="text-[10px] bg-teal-50 text-teal-800 border-teal-100 border px-2.5 py-1 rounded font-mono font-bold uppercase">Apothecary Hub</span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Supplying vital pharmaceutical substances, clinical heart-pressure devices, and emergency first-aid assemblies under drug license ref: BLR-DL-55419.
          </p>

          <div className="space-y-3.5 text-xs text-gray-600">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
              <span>Flat 4, Rajajinagar Link Road near Central Hospital, Bengaluru, KA 560010</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-teal-600 shrink-0" />
              <span>+91 99887 76655 (24/7 Ward Support)</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-teal-600 shrink-0" />
              <span>nuthan.medicals@januzen.com</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-teal-600 shrink-0" />
              <span>Everyday Delivery: 08:30 AM - 10:00 PM</span>
            </div>
          </div>
        </div>

        {/* Card 2: JA Stationery Branch */}
        <div className="bg-white border border-amber-100 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm border-t-4 border-t-[#D4820A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D4820A]">Desktop Equipment</span>
              <h3 className="font-serif text-xl font-bold text-[#0D1B2A] mt-1">JA Stationery Showroom</h3>
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-100 px-2.5 py-1 rounded font-mono font-bold uppercase">Boutique</span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Fulfilling corporate copy paper bulk mandates, executive planning diaries, indexing cardboards and fine painting materials.
          </p>

          <div className="space-y-3.5 text-xs text-gray-600">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-[#D4820A] shrink-0 mt-0.5" />
              <span>Block B, Commercial Street Plaza next to Metro Gates, Chennai, TN 600001</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-[#D4820A] shrink-0" />
              <span>+91 94433 22110 (Corporate Desk)</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[#D4820A] shrink-0" />
              <span>ja.stationery@januzen.com</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-[#D4820A] shrink-0" />
              <span>Office timing: 10:00 AM - 08:00 PM (Mon-Sat)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Form & Google Map Visual */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Interactive Contact Form */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 border border-gray-150 rounded-2xl shadow-sm space-y-5">
          <h2 className="font-serif text-xl font-bold text-[#0D1B2A] border-b border-gray-100 pb-3">Submit message dispatch</h2>

          {success && (
            <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-4 rounded-xl text-xs font-mono font-medium animate-pulse flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-mono font-medium animate-pulse flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
              {error}
            </div>
          )}

          <form onSubmit={handleContactSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1.5">
              <label className="text-gray-500 uppercase tracking-widest font-bold">Your Noble Name</label>
              <input
                type="text"
                required
                placeholder="Rohan Dey..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-500 uppercase tracking-widest font-bold">Inbox Email address</label>
              <input
                type="email"
                required
                placeholder="rohan@corporate.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-500 uppercase tracking-widest font-bold">Subject Headline</label>
              <input
                type="text"
                required
                placeholder="Enquiry topic..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-500 uppercase tracking-widest font-bold">Concerned Division</label>
              <select
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:border-slate-800 cursor-pointer"
              >
                <option value="general">Corporate HQ (General)</option>
                <option value="medicals">Nuthan Medicals (Pharmacy)</option>
                <option value="stationery">JA Stationery (Office Supplies)</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-gray-500 uppercase tracking-widest font-bold">Enquiry Message body</label>
              <textarea
                required
                rows={5}
                placeholder="Specify bulk counts, prescription references or feedback reviews..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              />
            </div>

            <div className="sm:col-span-2 pt-2 text-right">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-lg inline-flex items-center gap-2 shadow cursor-pointer disabled:opacity-50 transition-colors"
              >
                {submitting ? "Transmitting inbox..." : "Dispatch Message"}
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* High Fidelity Mock Google Map Vector */}
        <div className="lg:col-span-5 bg-slate-100 border border-gray-200 rounded-2xl overflow-hidden shadow-sm h-96 relative flex flex-col justify-between">
          {/* Mock Map Vector graphics */}
          <div className="absolute inset-0 z-0 bg-[#e5e9f0]">
            {/* Mock roads grids */}
            <div className="absolute top-1/4 left-0 right-0 h-4 bg-white -rotate-6" />
            <div className="absolute top-2/3 left-0 right-0 h-5 bg-white rotate-2" />
            <div className="absolute left-1/3 top-0 bottom-0 w-4 bg-white rotate-12" />
            <div className="absolute left-2/3 top-0 bottom-0 w-6 bg-white -rotate-12" />
            
            {/* Rivers or parks layout mockup */}
            <div className="absolute right-4 top-10 h-28 w-32 rounded-full bg-emerald-100 opacity-60 flex items-center justify-center border border-emerald-200 font-sans text-[10px] text-emerald-800 font-bold">
              Rajajinagar Park
            </div>
            
            <div className="absolute left-6 bottom-8 h-20 w-40 bg-sky-200 rounded-lg opacity-40 border border-sky-300 flex items-center justify-center text-[10px] sm:text-xs text-sky-800 font-bold">
              Cauvery River Delta line
            </div>

            {/* Hub markers */}
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center select-none animate-bounce">
              <div className="bg-teal-600 text-white text-[9px] font-bold py-1 px-2 rounded-md shadow border border-white">
                Nuthan Apothecary
              </div>
              <div className="h-3 w-3 bg-teal-600 rounded-full border-2 border-white -mt-0.5" />
            </div>

            <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 z-10 flex flex-col items-center select-none animate-bounce">
              <div className="bg-amber-600 text-white text-[9px] font-bold py-1 px-2 rounded-md shadow border border-white">
                JA Stationery Showroom
              </div>
              <div className="h-3 w-3 bg-amber-600 rounded-full border-2 border-white -mt-0.5" />
            </div>
          </div>

          <div className="relative z-10 p-4 bg-black/5 flex justify-between items-center bg-gradient-to-b from-[#0D1B2A]/90 to-transparent text-white font-serif p-4">
            <div>
              <h4 className="text-xs font-bold font-sans uppercase tracking-[#0.2em] text-amber-400">LOCATIONS CODES MAP</h4>
              <p className="text-sm font-black text-white mt-0.5">Dual-HQ Warehouse Grid</p>
            </div>
            <Map className="h-5 w-5 text-gray-200" />
          </div>

          <div className="relative z-10 bg-[#0D1B2A] text-gray-300 p-4 font-mono text-[10px] border-t border-slate-700/85">
            🛰️ SATELLITE RADAR VERIFIED DISPATCH ROUTES
          </div>
        </div>
      </section>

      {/* Structured FAQ Accordion */}
      <section className="space-y-8">
        <div className="text-center max-w-md mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#0D1B2A]">Frequently Enquired Questions</h2>
          <p className="text-gray-500 text-xs mt-1">Explore vital disclosures regarding medical licenses, shipping budgets, and corporate wholesale accounts.</p>
        </div>

        <div className="max-w-3xl mx-auto divide-y divide-gray-100 border border-gray-150 bg-white rounded-2xl overflow-hidden shadow-sm">
          {faqs.map((faq, idx) => {
            const isOpen = !!faqOpen[idx];
            return (
              <div key={idx} className="transition-all">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left p-5 text-[#0D1B2A] hover:bg-slate-50/50 transition-colors cursor-pointer"
                >
                  <span className="font-serif font-bold text-sm sm:text-base leading-snug pr-4">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-550 leading-relaxed border-t border-gray-50 bg-slate-50/20">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
