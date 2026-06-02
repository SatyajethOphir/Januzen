import React from "react";
import { gsap } from "gsap";
import { 
  ArrowRight, ShieldCheck, Truck, Clock, Sparkles, Inbox, 
  Activity, BookOpen, Quote, HelpCircle, Star, ArrowUpRight 
} from "lucide-react";
import { Product } from "../types";

interface HomeViewProps {
  onNavigate: (view: string, params?: Record<string, any>) => void;
  featuredProducts: Product[];
  onAddToBag: (product: Product) => void;
}

export default function HomeView({ onNavigate, featuredProducts, onAddToBag }: HomeViewProps) {
  const [newsEmail, setNewsEmail] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");

  React.useEffect(() => {
    // Elegant entrance timeline for the premium brand launch
    const tl = gsap.timeline();
    
    tl.fromTo(
      ".gsap-hero-badge",
      { opacity: 0, y: -15 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );
    
    tl.fromTo(
      ".gsap-hero-title",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.9, cubicBezier: "0.16, 1, 0.3, 1" },
      "-=0.4"
    );

    tl.fromTo(
      ".gsap-hero-desc",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
      "-=0.5"
    );

    tl.fromTo(
      ".gsap-hero-btns",
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.2)" },
      "-=0.4"
    );

    tl.fromTo(
      ".gsap-hero-frame",
      { opacity: 0, x: 40, rotate: 3 },
      { opacity: 1, x: 0, rotate: 0, duration: 1, ease: "power3.out" },
      "-=0.8"
    );

    // Staggered divisions card block
    gsap.fromTo(
      ".gsap-division-card",
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.25, ease: "power3.out", scrollTrigger: ".gsap-division-card", delay: 0.2 }
    );

    // Staggered stats counters
    gsap.fromTo(
      ".gsap-stat-box",
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.6, stagger: 0.12, ease: "back.out(1.5)", delay: 0.5 }
    );

    // Featured product list staggered entrance
    gsap.fromTo(
      ".gsap-product-tile",
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power2.out", delay: 0.6 }
    );

    // Testimonial entries
    gsap.fromTo(
      ".gsap-testimonial-item",
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.7, stagger: 0.15, ease: "power3.out", delay: 0.7 }
    );
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsEmail) return;
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Subscribed successfully!");
        setNewsEmail("");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Subscription failed");
        setTimeout(() => setErrorMsg(""), 4000);
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend server.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  return (
    <div className="space-y-24 pb-24 font-sans selection:bg-[#D4820A] selection:text-white">
      {/* 🌟 Grand Architectural Hero Section */}
      <section className="relative overflow-hidden bg-[#0A0F1D] text-white py-24 lg:py-32 px-4 sm:px-6 lg:px-8 border-b border-gray-900">
        {/* Fine grid background representing structured premium layout */}
        <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] [background-size:32px_32px]"></div>
        
        {/* Soft atmospheric gradient glow spots */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
          {/* Hero Content Block */}
          <div className="lg:w-7/12 space-y-8 text-left">
            <div className="gsap-hero-badge inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 text-amber-200 rounded-full text-[10px] font-mono tracking-[0.2em] uppercase">
              <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
              Twin Pillars of Public Excellence
            </div>
            
            <h1 className="gsap-hero-title font-serif text-5xl sm:text-6xl lg:text-7xl font-extralight leading-[1.08] tracking-tight">
              A Legacy of <span className="italic font-normal">Sovereign Care</span> <br/>
              & <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-amber-300 to-amber-500 font-bold">Archival Integrity</span>
            </h1>
            
            <p className="gsap-hero-desc text-gray-300 text-lg sm:text-xl font-light leading-relaxed max-w-2xl font-serif">
              JANUZEN coordinates premium, refined services under an elite parent standard. From clinical, life-preserving healthcare supplies to beautiful drafting and workstation papers, we deliver verified trust.
            </p>

            <div className="gsap-hero-btns flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => onNavigate("medicals")}
                className="group flex items-center gap-2.5 bg-[#0F9B8E] hover:bg-[#0c7f74] text-white font-mono font-bold uppercase tracking-wider px-7 py-4 rounded-lg shadow-lg hover:shadow-[#0F9B8E]/20 transition-all text-xs cursor-pointer"
              >
                Nuthan Medicals
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate("stationery")}
                className="group flex items-center gap-2.5 bg-transparent border border-white/20 hover:border-amber-400 hover:text-amber-400 text-white font-mono font-bold uppercase tracking-wider px-7 py-4 rounded-lg transition-all text-xs cursor-pointer"
              >
                JA Stationery
                <ArrowUpRight className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Hero Graphic Frame (Interactive Brand Hub Preview) */}
          <div className="gsap-hero-frame lg:w-5/12 flex justify-center relative w-full max-w-sm lg:max-w-none">
            <div className="w-80 h-96 bg-gradient-to-tr from-[#0F9B8E]/30 to-[#D4820A]/30 rounded-2xl absolute -rotate-3 scale-95 blur-2xl opacity-40 shadow-2xl"></div>
            
            <div className="w-full bg-[#111625] border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 flex flex-col justify-between space-y-8 backdrop-blur-md">
              <div className="border-b border-white/5 pb-4">
                <span className="font-mono text-[9px] text-amber-500 uppercase tracking-[0.25em] font-extrabold block">Federated Standard</span>
                <h3 className="font-serif text-3xl font-regular mt-1 text-white tracking-wide">
                  JANUZEN <span className="text-gray-500 font-sans text-lg font-light">Suite</span>
                </h3>
              </div>

              <div className="space-y-6">
                {/* Division 1 Line */}
                <div 
                  onClick={() => onNavigate("medicals")}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-teal-500/20 transition-all group cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20 group-hover:scale-105 transition-transform">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-1.5 group-hover:text-teal-300">
                      Nuthan Medicals
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">WHO-GMP standard prescription medicines & devices.</p>
                  </div>
                </div>

                {/* Division 2 Line */}
                <div 
                  onClick={() => onNavigate("stationery")}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-amber-500/20 transition-all group cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-1.5 group-hover:text-amber-300">
                      JA Stationery
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">Fine premium writing instruments, archival files & papers.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 flex justify-between items-center text-[9px] font-mono text-gray-500 tracking-wide">
                <span>ESTABLISHED 2005</span>
                <span>•</span>
                <span>TELANGANA, IN</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌌 FLUID BRAND TICKER SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-30">
        <div className="bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-xl py-8 px-6 md:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 lg:divide-x divide-gray-200/80">
            {[
              { val: "21+", desc: "Years Audit Integrity", color: "text-teal-600" },
              { val: "10k+", desc: "Vetted Corporate Orders", color: "text-amber-600" },
              { val: "2", desc: "Specialist Corporate Divisions", color: "text-teal-600" },
              { val: "100%", desc: "Authorized Distribute Guarantee", color: "text-amber-600" },
            ].map((stat, i) => (
              <div key={i} className="gsap-stat-box text-center px-4">
                <span className={`font-serif text-3xl sm:text-4xl lg:text-5xl font-light ${stat.color}`}>{stat.val}</span>
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.15em] font-mono font-bold mt-2 leading-relaxed">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🏥 TWIN PILLARS: DIVISION SELECTORS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#D4820A] block uppercase">Exclusive Operations</span>
          <h2 className="font-serif text-4xl sm:text-5xl font-light text-current leading-tight">
            Our Two <span className="italic font-normal">Specialist Houses</span>
          </h2>
          <div className="w-12 h-[2px] bg-amber-500 mx-auto"></div>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            Governing healthcare distribution services and fine-bound workstation inventories with strict standards of original delivery.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Card 1: Nuthan Medicals */}
          <div className="gsap-division-card bg-card-theme border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div className="p-8 lg:p-12 space-y-6">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-teal-500/10 text-teal-600 items-center justify-center border border-teal-200">
                <Activity className="h-7 w-7" />
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-mono tracking-widest text-teal-600 uppercase font-bold block">Pharmacological Dispensary</span>
                <h3 className="font-serif text-3xl font-bold tracking-tight">Nuthan Medicals</h3>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed font-serif">
                A highly trusted distributor delivering prescription formulations, active OTC remedies, hospital-certified diagnostic monitoring devices, and sterile trauma kits. Audited to meet critical healthcare compliance rules.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {["Formulations", "Diagnostic Monitors", "WHO Certified", "Trauma kits"].map((tag) => (
                  <span key={tag} className="text-[10px] font-sans font-semibold border border-teal-100 bg-teal-50/50 text-teal-800 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="px-8 lg:px-12 pb-8 lg:pb-12">
              <button
                onClick={() => onNavigate("medicals")}
                className="w-full py-4 px-6 bg-[#0F9B8E] hover:bg-[#0c7f74] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-3 transition-colors cursor-pointer"
              >
                Enter Medicals Division
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Card 2: JA Stationery */}
          <div className="gsap-division-card bg-card-theme border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div className="p-8 lg:p-12 space-y-6">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-600 items-center justify-center border border-amber-200">
                <BookOpen className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono tracking-widest text-amber-600 uppercase font-bold block">Fine Writing & Archives</span>
                <h3 className="font-serif text-3xl font-bold tracking-tight">JA Stationery</h3>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed font-serif">
                Curating magnificent desktop and journaling supplies, pristine high-GSM drawing reams, leather archives, and brass-fitted calligraphic items. Built to supply corporate spaces, architects, and designers with refined materials.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {["Fine Stationery", "Drawing Reams", "Leather Notebooks", "Studio Pens"].map((tag) => (
                  <span key={tag} className="text-[10px] font-sans font-semibold border border-amber-100 bg-amber-50/50 text-amber-800 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="px-8 lg:px-12 pb-8 lg:pb-12">
              <button
                onClick={() => onNavigate("stationery")}
                className="w-full py-4 px-6 bg-[#D4820A] hover:bg-[#b56e07] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-3 transition-colors cursor-pointer"
              >
                Enter Stationery Division
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 🛍️ GALERIE DE COUTURE: THE CRAWLER DISCOVERY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-gray-200 pb-6">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold tracking-[0.15em] text-[#D4820A] uppercase block">Admin's Signature Choice</span>
            <h2 className="font-serif text-4xl font-light">Featured <span className="italic font-normal">Discoveries</span></h2>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-current uppercase border border-current/25 px-4 py-2 rounded-md bg-transparent">
            Curated Stock Catalogue
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-400 font-mono text-xs italic">
              Retrieving fine discoveries from the master store vault...
            </div>
          ) : (
            featuredProducts.slice(0, 4).map((product) => {
              const shopBadge = product.shop === "medicals" ? "bg-teal-50 text-teal-800 border-teal-100" : "bg-amber-50 text-amber-800 border-amber-100";
              const btnTheme = product.shop === "medicals" ? "bg-[#0F9B8E] hover:bg-[#0c7f74]" : "bg-[#D4820A] hover:bg-[#b56e07]";

              return (
                <div 
                  key={product.id} 
                  className="gsap-product-tile bg-card-theme border rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="relative overflow-hidden group/img">
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-56 object-cover group-hover/img:scale-105 transition-transform duration-500"
                    />
                    <span className={`absolute top-4 left-4 text-[9px] font-mono font-bold tracking-wider uppercase px-3 py-1 rounded-full border shadow-sm ${shopBadge}`}>
                      {product.shop === "medicals" ? "💊 Nuthan Med" : "🖋️ JA Stationery"}
                    </span>
                  </div>
                  
                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">{product.category}</span>
                      <h4
                        onClick={() => onNavigate("product-detail", { productId: product.id })}
                        className="font-serif text-lg font-bold text-current cursor-pointer hover:text-amber-500 hover:underline transition-all line-clamp-1"
                        title={product.name}
                      >
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-400 font-sans line-clamp-2 leading-relaxed">{product.description}</p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-mono text-base font-bold">₹{product.price.toFixed(2)}</span>
                      <button
                        onClick={() => onAddToBag(product)}
                        className={`text-white text-[10px] font-mono font-bold uppercase tracking-wider py-2 px-4 rounded-lg transition-colors cursor-pointer ${btnTheme}`}
                      >
                        Add to Bag
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 💬 TESTIMONIALS: JOURNAL FORMAT */}
      <section className="bg-gradient-to-b from-transparent to-black/5 py-24 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#D4820A] block uppercase">Client Testimonials</span>
            <h2 className="font-serif text-4xl font-light">The Voice of <span className="italic font-normal">Our Community</span></h2>
            <p className="text-gray-500 text-sm">Vouched for by doctors, clinic staff, corporate planners, and creative studios.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                text: "Nuthan Medicals is incredibly reliable. As a community elder home nurse, finding a portal where I can order professional diagnostics and urgent OTC comfort remedies with a single invoice is marvelous.",
                author: "Dr. Ranjini Prasad",
                role: "Greenfields Clinic Manager",
                avatar: "Dr",
                color: "bg-teal-50 border-teal-200 text-teal-800"
              },
              {
                text: "Our design workspace orders heavyweight A4 drawing reams and fine fountain ink batches constant. JA Stationery has always delivered crisp fine archival inventories with pristine packaging.",
                author: "Madan Kumar",
                role: "Lead Designer, Icon Architects",
                avatar: "MK",
                color: "bg-amber-50 border-amber-200 text-amber-800"
              },
              {
                text: "Consolidated enterprise accounting saves our operations countless steps. I buy face shields for store floor crew and executive planners for office corporate leads in a single purchase cycle.",
                author: "Sujata Sharma",
                role: "Operations Director, Titan Corp",
                avatar: "SS",
                color: "bg-slate-100 border-slate-200 text-slate-800"
              },
            ].map((t, idx) => (
              <div 
                key={idx} 
                className="gsap-testimonial-item bg-card-theme p-8 rounded-xl border border-gray-200/60 shadow-sm relative space-y-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="text-[#D4820A] fill-current opacity-30">
                    <Quote className="h-8 w-8 transform -scale-x-100" />
                  </div>
                  <p className="text-gray-600 text-sm font-serif leading-relaxed italic">
                    "{t.text}"
                  </p>
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs uppercase ${t.color}`}>
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-950">{t.author}</h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 📨 MASTER CORRESPONDENCE: NEWSLETTER REGISTER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0D1F34] text-white p-8 md:p-16 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-12 border border-blue-900/60 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="space-y-4 max-w-xl text-left">
            <span className="text-[10px] font-mono tracking-[0.25em] text-amber-300 uppercase block font-bold">Priority Correspondence List</span>
            <h3 className="font-serif text-3xl sm:text-4xl font-light tracking-tight leading-none text-white">
              Stay Informed of <span className="italic">Vital Inventories</span>
            </h3>
            <p className="text-gray-300 text-xs sm:text-sm font-light leading-relaxed">
              Register your workspace to receive instantaneous telemetry when scarce medical formulations or specialized fine studio papers are replenished.
            </p>
          </div>

          <div className="w-full lg:w-auto shrink-0 flex flex-col space-y-3">
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="Enter corporate email..."
                value={newsEmail}
                onChange={(e) => setNewsEmail(e.target.value)}
                className="w-full sm:w-72 bg-black/40 text-white placeholder-gray-500 border border-white/20 focus:border-amber-400 rounded-lg px-4 py-3.5 text-xs font-mono focus:outline-none transition-all"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md"
              >
                <Inbox className="h-4 w-4" />
                Register Desk
              </button>
            </form>
            
            {successMsg && (
              <p className="text-xs text-emerald-400 font-mono italic animate-pulse">{successMsg}</p>
            )}
            {errorMsg && (
              <p className="text-xs text-rose-450 font-mono italic animate-pulse">{errorMsg}</p>
            )}
          </div>
        </div>
      </section>

      {/* 🏢 CORPORATE DIRECTORY & GUARANTEES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-200/60 pt-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-left text-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[#0D1B2A] text-white font-serif font-bold text-xl">
                JZ
              </div>
              <span className="font-serif text-lg font-bold tracking-widest text-[#0D1B2A]">JANUZEN</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed font-serif">
              <strong>Januzen Global LLP</strong>, founded by <strong>Vinuthan Reddy Kogara</strong>, coordinates premier, verified physical standards in clinical healthcare and fine workstation archives.
            </p>
            <p className="text-[10px] text-gray-400 font-mono">
              HQ: P.No- P-12, Mahadevpuram, Gajularamaram, Telangana.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-current mb-4">Nuthan Medicals (Est. June 2005)</h4>
            <ul className="space-y-2.5 text-xs text-gray-500 font-serif">
              <li>📞 Helpline: 09666588553</li>
              <li>📍 Phase-2, Pno 46 street no 5, Samskruthi Avenues Rd., Dwaraka Nagar, Gajularamaram, Hyderabad, Telangana 500117</li>
              <li>🕒 Estd: June 6th, 2005</li>
              <li>🏥 Drug License: BLR-DL-55419</li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-current mb-4">JA Stationery (Est. Sept 2005)</h4>
            <ul className="space-y-2.5 text-xs text-gray-500 font-serif">
              <li>📞 Order Desk: 09666588553</li>
              <li>📍 Phase-2, Pno 46 street no 5, Samskruthi Avenues Rd., Dwaraka Nagar, Gajularamaram, Hyderabad, Telangana 500117</li>
              <li>🕒 Estd: Sept 10th, 2005</li>
              <li>📁 Corporate GSTIN: 29AAACJ8501L1ZS</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-current mb-4">Sovereign Assurances</h4>
            <div className="space-y-3 font-mono text-[10px] text-gray-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>WHO-GMP Audit Licensed</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-500" />
                <span>Free Insured Courier &gt;$35</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-500" />
                <span>Immediate 24H Dispatch</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 py-10 text-center text-[10px] text-gray-400 font-mono tracking-wide mt-12">
          © {new Date().getFullYear()} Januzen Global LLP — ALL CORRESPONDENCES SECURED UNDER CORPORATE REGISTRY. HYDERABAD, INDIA.
        </div>
      </section>
    </div>
  );
}
