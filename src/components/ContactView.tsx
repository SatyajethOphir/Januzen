import React from "react";
import { Mail, Phone, MapPin, Clock, Send, ShieldAlert, CheckCircle, ChevronDown, ChevronUp, Map, Briefcase } from "lucide-react";

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
      a: "All orders over $35 enjoy immediate Free Secured Freight Delivery across Hyderabad and Telangana suburbs. Orders below $35 incur a minor freight charge of $4.99. Goods are dispatched from local unit hubs within 4 hours, targeting arrival within 24 hours."
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans space-y-20 pb-20">
      
      {/* 🌟 Editorial Header */}
      <section className="text-center max-w-xl mx-auto space-y-4">
        <span className="text-xs uppercase tracking-[#0.25em] font-extrabold text-[#D4820A] block font-mono">Customer Assistance</span>
        <h1 className="font-serif text-4xl sm:text-5xl font-light text-current">Connect <span className="italic">with Us</span></h1>
        <div className="w-12 h-[1.5px] bg-[#D4820A] mx-auto"></div>
        <p className="text-gray-500 text-sm leading-relaxed">
          Encountering stock issues, bulk corporate inquiries, or prescription uploads? Our divisions are ready to assist.
        </p>
      </section>

      {/* Division Cards Block */}
      <section className="space-y-8">
        {/* Headquarters Premium Highlight Box */}
        <div className="bg-card-theme border border-amber-500/10 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row items-stretch justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="space-y-3 flex-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#D4820A]">Registered Parent Registry</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-regular tracking-tight text-current">
              Januzen Global <span className="italic font-light">LLP Headquarters</span>
            </h2>
            <p className="text-gray-500 text-xs font-serif leading-relaxed max-w-xl">
              Overseeing global corporate audits, healthcare compliance dispatches, and premium paper logistics. Founded & authorized by <strong className="text-current text-[#D4820A]">Vinuthan Reddy Kongara</strong>.
            </p>
          </div>
          <div className="bg-black/5 p-5 rounded-xl border border-gray-200/40 text-xs font-mono space-y-2.5 shrink-0 md:w-96 flex flex-col justify-center">
            <div className="flex items-start gap-2.5">
              <Briefcase className="h-4 w-4 text-[#D4820A] shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] uppercase text-gray-400 font-bold">Corporate HQ Office</p>
                <p className="text-gray-500 font-serif text-xs">P.No- P-12, Mahadevpuram, Gajularamaram, Hyderabad, Telangana.</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pt-2 border-t border-gray-200/50">
              <Phone className="h-4 w-4 text-[#D4820A] shrink-0" />
              <div>
                <p className="text-[9px] uppercase text-gray-400 font-bold">Helpline Support</p>
                <p className="text-gray-500 font-serif text-xs">09666588553</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Nuthan Medicals Branch */}
          <div className="bg-card-theme border rounded-2xl p-8 space-y-6 shadow-sm border-t-4 border-t-[#0F9B8E]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#0F9B8E]">Healthcare Division</span>
                <h3 className="font-serif text-2xl font-bold text-current mt-1">Nuthan Medicals Branch</h3>
              </div>
              <span className="text-[9px] bg-teal-500/10 text-teal-800 border border-teal-200/40 px-2.5 py-1 rounded font-mono font-bold uppercase">Apothecary Hub</span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed font-serif">
              Supplying vital pharmaceutical substances, clinical heart-pressure devices, and emergency first-aid assemblies. Established June 6th, 2005.
            </p>

            <div className="space-y-3.5 text-xs text-gray-500 font-mono">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <span className="font-serif text-xs leading-normal">Phase-2, Pno 46 street no 5, Samskruthi Avenues Rd., Dwaraka Nagar, Gajularamaram, Hyderabad, Telangana 500117</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-teal-600 shrink-0" />
                <span>09666588553 (Helpline Support)</span>
              </div>
              <div className="flex items-center gap-3 font-medium text-teal-950 dark:text-teal-300 bg-[#0F9B8E]/15 py-1.5 px-3 rounded-lg border border-[#0F9B8E]/30 shadow-sm">
                <Mail className="h-4 w-4 text-teal-600 shrink-0" />
                <a href="mailto:team@januzen.in" className="hover:underline hover:text-teal-700 dark:hover:text-teal-200 transition-colors font-bold">team@januzen.in</a>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-teal-600 shrink-0" />
                <span>Everyday Delivery: 08:30 AM - 10:00 PM</span>
              </div>
            </div>
          </div>

          {/* Card 2: JA Stationery Branch */}
          <div className="bg-card-theme border rounded-2xl p-8 space-y-6 shadow-sm border-t-4 border-t-[#D4820A]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#D4820A]">Desktop Equipment</span>
                <h3 className="font-serif text-2xl font-bold text-current mt-1">JA Stationery Showroom</h3>
              </div>
              <span className="text-[9px] bg-amber-500/10 text-amber-800 border border-amber-200/40 px-2.5 py-1 rounded font-mono font-bold uppercase">Boutique</span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed font-serif">
              Fulfilling corporate copy paper bulk mandates, executive planning diaries, indexing cardboards, and fine painting materials. Started Sept 10th, 2024.
            </p>

            <div className="space-y-3.5 text-xs text-gray-500 font-mono">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-[#D4820A] shrink-0 mt-0.5" />
                <span className="font-serif text-xs leading-normal">Phase-2, Pno 46 street no 5, Samskruthi Avenues Rd., Dwaraka Nagar, Gajularamaram, Hyderabad, Telangana 500117</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[#D4820A] shrink-0" />
                <span>09666588553 (Corporate Order-Desk)</span>
              </div>
              <div className="flex items-center gap-3 font-medium text-amber-950 dark:text-amber-300 bg-[#D4820A]/15 py-1.5 px-3 rounded-lg border border-[#D4820A]/30 shadow-sm">
                <Mail className="h-4 w-4 text-[#D4820A] shrink-0" />
                <a href="mailto:team@januzen.in" className="hover:underline hover:text-amber-800 dark:hover:text-amber-200 transition-colors font-bold">team@januzen.in</a>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-[#D4820A] shrink-0" />
                <span>Office timing: 10:00 AM - 08:00 PM (Mon-Sat)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Form & Google Map Visual */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Interactive Contact Form */}
        <div className="lg:col-span-7 bg-card-theme p-8 border rounded-2xl shadow-sm space-y-5">
          <h2 className="font-serif text-xl font-bold text-current border-b border-gray-100 pb-3">Submit Message Dispatch</h2>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 p-4 rounded-xl text-xs font-mono font-medium animate-pulse flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-700 p-4 rounded-xl text-xs font-mono font-medium animate-pulse flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
              {error}
            </div>
          )}

          <form onSubmit={handleContactSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-mono">
            <div className="space-y-1.5">
              <label className="text-gray-400 uppercase tracking-widest font-bold">Your Name</label>
              <input
                type="text"
                required
                placeholder="Rohan Dey..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/5 border border-gray-200/60 p-3 rounded-lg text-sm text-current focus:outline-none focus:border-[#D4820A]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-400 uppercase tracking-widest font-bold">Your Email Address</label>
              <input
                type="email"
                required
                placeholder="rohan@corporate.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/5 border border-gray-200/60 p-3 rounded-lg text-sm text-current focus:outline-none focus:border-[#D4820A]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-400 uppercase tracking-widest font-bold">Subject Headline</label>
              <input
                type="text"
                required
                placeholder="Enquiry topic..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-black/5 border border-gray-200/60 p-3 rounded-lg text-sm text-current focus:outline-none focus:border-[#D4820A]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-400 uppercase tracking-widest font-bold">Concerned Division</label>
              <select
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                className="w-full bg-black/5 border border-gray-200/60 p-3 rounded-lg text-sm font-bold text-current focus:outline-none focus:border-[#D4820A] cursor-pointer"
              >
                <option value="general">Corporate HQ (General)</option>
                <option value="medicals">Nuthan Medicals (Pharmacy)</option>
                <option value="stationery">JA Stationery (Office Supplies)</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-gray-400 uppercase tracking-widest font-bold">Enquiry Message Body</label>
              <textarea
                required
                rows={5}
                placeholder="Specify bulk counts, prescription references or feedback reviews..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-black/5 border border-gray-200/60 p-3 rounded-lg text-sm text-current focus:outline-none focus:border-[#D4820A]"
              />
            </div>

            <div className="sm:col-span-2 pt-2 text-right">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#0D1B2A] hover:bg-slate-800 text-white font-mono font-bold text-[10px] uppercase tracking-widest py-3.5 px-8 rounded-lg inline-flex items-center gap-2.5 shadow cursor-pointer disabled:opacity-50 transition-colors"
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
              Palal Park View
            </div>
            
            <div className="absolute left-6 bottom-8 h-20 w-40 bg-sky-200 rounded-lg opacity-40 border border-sky-300 flex items-center justify-center text-[10px] sm:text-xs text-sky-800 font-bold">
              Samskruthi Blvd Lane
            </div>

            {/* Hub markers */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center select-none animate-bounce">
              <div className="bg-[#0D1B2A] text-white text-[9px] font-mono font-bold py-1 px-2 rounded-md shadow border border-amber-400">
                Joint Gajularamaram Facility
              </div>
              <div className="h-3 w-3 bg-amber-500 rounded-full border-2 border-white -mt-0.5" />
            </div>
          </div>

          <div className="relative z-10 p-4 bg-black/5 flex justify-between items-center bg-gradient-to-b from-[#0D1B2A]/90 to-transparent text-white font-serif">
            <div>
              <h4 className="text-[10px] font-bold font-sans uppercase tracking-[#0.2em] text-amber-400">LOCATIONS CODES MAP</h4>
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
      <section className="space-y-10">
        <div className="text-center max-w-md mx-auto space-y-2">
          <h2 className="font-serif text-3xl font-light text-current">Frequently Asked <span className="italic">Questions</span></h2>
          <p className="text-gray-400 text-xs font-mono">Explore vital disclosures regarding medical licenses, shipping budgets, and corporate wholesale accounts.</p>
        </div>

        <div className="max-w-3xl mx-auto divide-y divide-gray-200 border bg-card-theme rounded-2xl overflow-hidden shadow-sm">
          {faqs.map((faq, idx) => {
            const isOpen = !!faqOpen[idx];
            return (
              <div key={idx} className="transition-all">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left p-5 text-current hover:bg-black/5 transition-colors cursor-pointer"
                >
                  <span className="font-serif font-bold text-base leading-snug pr-4">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-500 leading-relaxed border-t border-gray-150 bg-black/5">
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
