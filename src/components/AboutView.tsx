import React from "react";
import { CircleCheck, ShieldCheck, Cpu, Library, Users, Award, Anchor, Milestone } from "lucide-react";

export default function AboutView() {
  const values = [
    {
      title: "Absolute Compliance Standards",
      desc: "All pharmaceutical batches meet WHO-GMP clinical protocols and stationery copy sheets conform to certified environmental FSC regulations.",
      icon: ShieldCheck,
      color: "text-teal-600 bg-teal-50"
    },
    {
      title: "Consolidated Trust",
      desc: "Operated securely for over two decades. JANUZEN bridges vital community physical requirements under a single unified credit invoice.",
      icon: Award,
      color: "text-amber-600 bg-amber-50"
    },
    {
      title: "Digital Logistics Mastery",
      desc: "Deploying deep barcode serialization and real-time inventory systems to coordinate intra-city fleet dispatch within hours.",
      icon: Cpu,
      color: "text-sky-600 bg-sky-50"
    },
    {
      title: "Sustainably Responsible",
      desc: "Actively sourcing natural wood fibers for JA Stationery and implementing safe capsule packaging recovery channels.",
      icon: Library,
      color: "text-[#0D1B2A] bg-slate-100"
    }
  ];

  const timeline = [
    {
      year: "2001",
      title: "Inception of Nuthan Medicals",
      desc: "Began as a singular prescription apothecary in Bengaluru, committed to dispensing genuine medications."
    },
    {
      year: "2010",
      title: "Emergence of JA Stationery Division",
      desc: "Acquired prime office stationery lines. Expanding inventory channels to copy paper supply and fine artist utensils."
    },
    {
      year: "2018",
      title: "Inauguration of JANUZEN Enterprise Portal",
      desc: "Consolidated both business divisions under a combined central management to coordinate global billing and logistics."
    },
    {
      year: "2026",
      title: "Next-Gen Supply Dispatch Systems",
      desc: "Achieved absolute supply records with over 10,000 corporate clients, hospitals, and schools served daily."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-16 pb-16">
      
      {/* 🌟 Editorial Header */}
      <section className="text-center max-w-2xl mx-auto space-y-4">
        <span className="text-xs uppercase tracking-[#0.25em] font-extrabold text-[#D4820A] block font-mono">Our Heritage & Values</span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#0D1B2A]">The JANUZEN Legacy</h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto">
          Providing specialized physical solutions in pharmacy healthcare and corporate workflows since 2001.
        </p>
      </section>

      {/* Corporate Story Block */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-white border border-gray-100 rounded-2xl p-6 sm:p-10 shadow-sm">
        <div className="space-y-6">
          <span className="font-serif text-xs text-teal-600 uppercase tracking-widest font-bold">JANUZEN ENTERPRISE CO.</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#0D1B2A] tracking-tight leading-tight">
            Bridging vital human needs under one verified parent banner
          </h2>
          
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              JANUZEN operates as a parent enterprise with two highly trusted divisions that touch everyday lives. **Nuthan Medicals** serves the clinical market by providing authenticated prescriptions, diagnostics tools, and emergency first aid gears. Simultaneously, **JA Stationery** powers offices and classrooms through high-opacity paper blocks, journals, files, and artist brushes.
            </p>
            <p>
              By unifying healthcare and workplace tools under one management group, we optimize warehousing efficiency, eliminate authentic stock discrepancies, and provide secure invoicing flows.
            </p>
          </div>
        </div>

        {/* Vision & Mission panels */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-teal-50/50 border border-teal-100 space-y-2">
            <h3 className="font-serif text-lg font-bold text-teal-900 flex items-center gap-2">
              <Anchor className="h-5 w-5 text-teal-600" />
              Our True Mission
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              To supply authentic, WHO-GMP clinical pharmaceuticals and high-performing workspace stationery items without delay. Making high-grade, premium inventory available in our central logistics pipeline.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-amber-50/50 border border-amber-100 space-y-2">
            <h3 className="font-serif text-lg font-bold text-amber-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Our Vision Forecast
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              To establish regional warehouse fulfillment campuses across India that streamline same-day shipping of essential commodities, minimizing administrative overheads for hospitals and corporate blocks alike.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values grid */}
      <section className="space-y-10">
        <div className="text-center max-w-md mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#0D1B2A]">Our Governing Principles</h2>
          <p className="text-gray-500 text-xs mt-1">Four pillars that define our daily operational activities from stock auditing to customer care.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v, i) => {
            const Icon = v.icon;
            return (
              <div key={i} className="bg-white border border-gray-150 p-6 rounded-xl hover:shadow-md transition-shadow duration-200">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 ${v.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-base font-bold text-gray-900">{v.title}</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Elegant Editorial Timeline */}
      <section className="space-y-10">
        <div className="text-center max-w-md mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#0D1B2A] flex justify-center items-center gap-2">
            <Milestone className="h-6 w-6 text-slate-800" />
            25 Years in Focus
          </h2>
          <p className="text-gray-500 text-xs mt-1">Tracing our history from a single local apothecary shop to an enterprise consortium.</p>
        </div>

        <div className="bg-white border border-gray-150 rounded-2xl p-6 sm:p-10 shadow-sm max-w-4xl mx-auto relative overflow-hidden">
          {/* Vertical layout line */}
          <div className="absolute left-8 sm:left-1/2 top-12 bottom-12 w-0.5 bg-slate-100 hidden sm:block" />

          <div className="space-y-12 relative z-10">
            {timeline.map((evt, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <div key={idx} className={`flex flex-col sm:flex-row items-stretch sm:justify-between relative ${isEven ? "" : "sm:flex-row-reverse"}`}>
                  
                  {/* Left block or spacing */}
                  <div className="w-full sm:w-[45%] pl-12 sm:pl-0 sm:text-right space-y-1">
                    {isEven ? (
                      <>
                        <span className="font-mono font-bold text-lg text-teal-600 block">{evt.year}</span>
                        <h4 className="font-serif text-base font-bold text-gray-900">{evt.title}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">{evt.desc}</p>
                      </>
                    ) : null}
                  </div>

                  {/* Node point */}
                  <div className="absolute left-6 sm:left-1/2 transform -translate-x-1/2 top-1.5 h-4 w-4 bg-[#0D1B2A] border-4 border-white rounded-full shadow" />

                  {/* Right block or spacing */}
                  <div className="w-full sm:w-[45%] pl-12 sm:pl-0 text-left space-y-1 mt-1 sm:mt-0">
                    {!isEven ? (
                      <>
                        <span className="font-mono font-bold text-lg text-amber-600 block">{evt.year}</span>
                        <h4 className="font-serif text-base font-bold text-gray-900">{evt.title}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">{evt.desc}</p>
                      </>
                    ) : null}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
