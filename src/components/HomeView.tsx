import React from "react";
import { ArrowRight, ShieldCheck, Truck, Clock, Sparkles, Inbox, Activity, BookOpen } from "lucide-react";
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
    <div className="space-y-16 pb-16 font-sans">
      {/* 🌟 Grand Editorial Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0D1B2A] via-[#102A43] to-[#011627] text-white py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 z-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          
          <div className="md:w-3/5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-[#ffffff] rounded-full text-xs font-semibold tracking-wider font-mono">
              <Sparkles className="h-3 w-3 text-amber-400" />
              TWIN PILLARS OF PUBLIC EXCELLENCE
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
              A Legacy of Care <br/>
              & <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-amber-300">Precision Supplies</span>
            </h1>
            
            <p className="text-gray-300 text-lg sm:text-xl font-light leading-relaxed max-w-2xl">
              JANUZEN serves as the bedrock parent enterprise orchestrating specialized premium services. From life-preserving pharmaceuticals to professional desktop stationery supplies, we deliver verified trust.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => onNavigate("medicals")}
                className="group flex items-center gap-2 bg-[#0F9B8E] hover:bg-opacity-90 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-cyan-900/30 transition-all text-sm tracking-wide"
              >
                Explore Nuthan Medicals
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate("stationery")}
                className="group flex items-center gap-2 bg-[#D4820A] hover:bg-opacity-90 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-amber-900/30 transition-all text-sm tracking-wide"
              >
                Browse JA Stationery
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="md:w-2/5 flex justify-center relative">
            <div className="w-72 h-80 bg-gradient-to-tr from-[#0F9B8E] to-[#D4820A] rounded-2xl absolute -rotate-6 scale-95 blur-xl opacity-30 shadow-2xl animate-pulse"></div>
            <div className="w-72 h-80 bg-[#1E293B] border border-gray-700/60 rounded-2xl p-6 shadow-2xl relative z-10 flex flex-col justify-between">
              <div>
                <span className="font-serif text-xs text-amber-500 uppercase tracking-widest font-bold">Parent Enterprise</span>
                <h3 className="font-serif text-2xl font-bold mt-1 text-white border-b border-gray-700/80 pb-3">JANUZEN Group</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Nuthan Medicals</h4>
                    <p className="text-xs text-gray-400">Teal division dealing in clinical prescriptions and first aid essentials.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">JA Stationery</h4>
                    <p className="text-xs text-gray-400">Amber division offering fine office books and sketching utensils.</p>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 font-mono text-center pt-2">
                ESTABLISHED 2001 • BENGALURU
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 🏥 DIVISION SELECTORS (Two Business Units Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="font-serif text-3xl font-extrabold text-[#0D1B2A] tracking-tight">Two Specialized Divisions</h2>
          <p className="text-gray-500 text-sm mt-2">Connecting people with trusted everyday medical care and elegant professional office tools.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Card 1: Nuthan Medicals */}
          <div className="group bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
            <div className="p-8">
              <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-gray-900">Nuthan Medicals</h3>
              <p className="text-[#0F9B8E] text-xs font-semibold uppercase tracking-wider font-mono mt-1">Pharmacy & Medical Supplies</p>
              
              <p className="text-gray-600 mt-4 leading-relaxed text-sm">
                Dedicated helper supplying vital prescription medications, everyday diagnostic device monitors, sterile first-aid collections, and general cellular immunizations. Fully authorized and clinical-standard audited.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="text-xs font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded">Prescriptions</span>
                <span className="text-xs font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded">OTCs</span>
                <span className="text-xs font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded">Devices</span>
                <span className="text-xs font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded">First Aid</span>
              </div>
            </div>
            
            <div className="px-8 pb-8">
              <button
                onClick={() => onNavigate("medicals")}
                className="w-full py-3 px-4 bg-[#0F9B8E] hover:bg-[#0c7f74] text-white text-sm font-semibold tracking-wide rounded-xl flex items-center justify-center gap-2 group-hover:shadow-md transition-all pt-3 inline-block"
              >
                Enter Medicals Division Shop
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Card 2: JA Stationery */}
          <div className="group bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
            <div className="p-8">
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-gray-900">JA Stationery</h3>
              <p className="text-[#D4820A] text-xs font-semibold uppercase tracking-wider font-mono mt-1">Stationery & Office Supplies</p>
              
              <p className="text-gray-600 mt-4 leading-relaxed text-sm">
                Enriching offices and creative workshops with copy paper bundles, designer matte fountain ink pens, leather binder diaries, archiving documents wallets, and watercolor arts pigment assortments. Built for beautiful workflows.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="text-xs font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded">Office Paper</span>
                <span className="text-xs font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded">Instruments</span>
                <span className="text-xs font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded">Journals</span>
                <span className="text-xs font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded">Filing</span>
              </div>
            </div>

            <div className="px-8 pb-8">
              <button
                onClick={() => onNavigate("stationery")}
                className="w-full py-3 px-4 bg-[#D4820A] hover:bg-[#b56e07] text-white text-sm font-semibold tracking-wide rounded-xl flex items-center justify-center gap-2 group-hover:shadow-md transition-all pt-3 inline-block"
              >
                Enter Stationery Division Shop
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 🎯 TRUSTED STATS BAR */}
      <section className="bg-[#0D1B2A] text-white py-12 rounded-2xl max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_0.5px,transparent_0.5px)] opacity-5 [background-size:16px_16px]"></div>
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <span className="font-serif text-3xl sm:text-4xl font-extrabold text-teal-400">25+</span>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Years of Trust</p>
          </div>
          <div className="space-y-1">
            <span className="font-serif text-3xl sm:text-4xl font-extrabold text-amber-500">10k+</span>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Customers Served</p>
          </div>
          <div className="space-y-1">
            <span className="font-serif text-3xl sm:text-4xl font-extrabold text-teal-400">2</span>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Division Units</p>
          </div>
          <div className="space-y-1">
            <span className="font-serif text-3xl sm:text-4xl font-extrabold text-amber-500">100%</span>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Genuine Supplies</p>
          </div>
        </div>
      </section>

      {/* 🛍️ HANDPICKED FEATURED PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10 border-b border-gray-100 pb-5">
          <div>
            <h2 className="font-serif text-3xl font-extrabold text-[#0D1B2A]">Featured Discoveries</h2>
            <p className="text-gray-500 text-sm mt-1">High-demand items vetted by administrators for outstanding reliability.</p>
          </div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-[#0D1B2A] uppercase border border-[#0D1B2A]/10 px-3 py-1.5 rounded-md bg-white">
            Curated Stock
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-400 font-mono text-sm">
              Loading featured selections...
            </div>
          ) : (
            featuredProducts.slice(0, 4).map((product) => {
              const themeColor = product.shop === "medicals" ? "text-teal-600" : "text-amber-600";
              const shopBadge = product.shop === "medicals" ? "bg-teal-50 text-teal-800 border-teal-100" : "bg-amber-50 text-amber-800 border-amber-100";
              const btnTheme = product.shop === "medicals" ? "bg-[#0F9B8E] hover:bg-[#0c7f74]" : "bg-[#D4820A] hover:bg-[#b56e07]";

              return (
                <div key={product.id} className="group bg-white border border-gray-200/60 rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between">
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className={`absolute top-3 left-3 text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full border ${shopBadge}`}>
                      {product.shop === "medicals" ? "Nuthan Medicals" : "JA Stationery"}
                    </span>
                  </div>
                  
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-gray-400 uppercase font-mono tracking-widest block">{product.category}</span>
                      <h4
                        onClick={() => onNavigate("product-detail", { productId: product.id })}
                        className="font-serif text-base font-bold text-gray-900 mt-1 hover:text-blue-700 cursor-pointer line-clamp-1"
                        title={product.name}
                      >
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{product.description}</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-mono text-lg font-bold text-gray-900">${product.price.toFixed(2)}</span>
                      <button
                        onClick={() => onAddToBag(product)}
                        className={`text-white text-xs font-semibold tracking-wide py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${btnTheme}`}
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

      {/* 💬 TESTIMONIALS SECTION */}
      <section className="bg-slate-50 border-y border-gray-100 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="font-serif text-3xl font-extrabold text-[#0D1B2A]">Client Endorsements</h2>
            <p className="text-gray-500 text-sm mt-2">Connecting families, clinics, and corporates with persistent material supplies.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200/50 shadow-sm relative italic text-gray-600 text-sm leading-relaxed">
              <span className="text-4xl text-teal-300 font-serif absolute -top-3 left-4 opacity-50">“</span>
              <p className="relative z-10 pt-2">
                Nuthan Medicals is incredibly reliable. As a community nursing home admin, finding a catalog where we can order BP diagnostic devices alongside urgent OTC pain relief directly with immediate invoice tracking is a complete game changer.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 not-italic flex items-center gap-3">
                <div className="h-8 w-8 bg-teal-100 text-teal-800 rounded-full flex items-center justify-center font-bold text-xs">
                  Dr
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Dr. Ranjini Prasad</h4>
                  <p className="text-[10px] text-gray-400">Greenfields Elder Clinic Manager</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200/50 shadow-sm relative italic text-gray-600 text-sm leading-relaxed">
              <span className="text-4xl text-amber-300 font-serif absolute -top-3 left-4 opacity-50">“</span>
              <p className="relative z-10 pt-2">
                Our drafting studio relies heavily on A4 paper batches and fine writing highlighters. JA Stationery has always delivered crisp high-grade paper supplies and luxurious gel ink sets on time with perfect packaging.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 not-italic flex items-center gap-3">
                <div className="h-8 w-8 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center font-bold text-xs">
                  MK
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Madan Kumar</h4>
                  <p className="text-[10px] text-gray-400">Design Lead, Apex Architects</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200/50 shadow-sm relative italic text-gray-600 text-sm leading-relaxed">
              <span className="text-4xl text-teal-300 font-serif absolute -top-3 left-4 opacity-50">“</span>
              <p className="relative z-10 pt-2">
                Unified service billing makes tracking multiple division budgets seamless. I order medical face shields for field personnel and executive leather day-planners for directors in one consolidated invoice flow. Magnificent setup!
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 not-italic flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-xs">
                  SS
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Sujata Sharma</h4>
                  <p className="text-[10px] text-gray-400">Logistics Director, Titan Corp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📨 INTELLIGENT NEWSLETTER FORM */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#0D1B2A] to-[#102A43] text-white p-8 md:p-12 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-800">
          <div className="space-y-2 max-w-xl">
            <h3 className="font-serif text-2xl md:text-3xl font-extrabold tracking-tight">Stay Aware of Crucial Inventories</h3>
            <p className="text-gray-300 text-sm">
              Receive alerts directly to your inbox when heavy prescription antibiotic drugs or limited fine-art watercolor supply batches are replenished.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input
                type="email"
                required
                placeholder="Enter corporate email..."
                value={newsEmail}
                onChange={(e) => setNewsEmail(e.target.value)}
                className="w-full sm:w-64 bg-slate-900 text-white placeholder-gray-500 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-400 text-[#0D1B2A] font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Inbox className="h-4 w-4" />
              Subscribe
            </button>
          </form>
        </div>
        
        {successMsg && (
          <div className="mt-3 text-center text-teal-600 font-mono text-sm animate-pulse">{successMsg}</div>
        )}
        {errorMsg && (
          <div className="mt-3 text-center text-red-500 font-mono text-sm animate-pulse">{errorMsg}</div>
        )}
      </section>

      {/* 🏢 ENTERPRISE FOOTER */}
      <footer className="border-t border-gray-100 pt-16 mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[#0D1B2A] text-white font-serif font-extrabold text-xl tracking-wider">
                JZ
              </div>
              <span className="font-serif text-lg font-bold tracking-widest text-[#0D1B2A]">JANUZEN</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Consolidated enterprise portal coordinating pharmacy medical supply distributions and professional paper, writing and book stationery setups under verified corporate standards.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-900 mb-4">Nuthan Medicals Unit</h4>
            <ul className="space-y-2 text-xs text-gray-500">
              <li>📞 Emergency: +91 99887 76655</li>
              <li>📍 24/7 Ward: Rajajinagar Link Road, BLR</li>
              <li>🕒 Delivery: 08:30 AM - 10:00 PM Daily</li>
              <li>🏥 Pharmacy License: BLR-DL-55419</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-900 mb-4">JA Stationery Unit</h4>
            <ul className="space-y-2 text-xs text-gray-500">
              <li>📞 Bulk Desk: +91 94433 22110</li>
              <li>📍 Showroom: Commercial Street, BLR</li>
              <li>🕒 Operating: 10:00 AM - 08:00 PM (Mon-Sat)</li>
              <li>📁 GST Identity: 29AAACJ8501L1ZS</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-900 mb-4">Certified Assurances</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>WHO-GMP Audited Pharmacies</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Truck className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Free Safe Freight over $35</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-4 w-4 text-sky-500 shrink-0" />
                <span>Same-day Intra-city Dispatch</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 py-8 text-center text-[11px] text-gray-400 font-mono">
          © {new Date().getFullYear()} JANUZEN GROUP CO. — ALL CORRESPONDENCES SECURED. BENGALURU, INDIA.
        </div>
      </footer>
    </div>
  );
}
