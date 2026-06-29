import React, { useEffect } from "react";
import { gsap } from "gsap";
import { CircleCheck, ShieldCheck, Cpu, Library, Users, Award, Anchor, Milestone } from "lucide-react";

export default function AboutView() {
  const values = [
    {
      title: "Absolute Compliance Standards",
      desc: "All pharmaceutical batches meet WHO-GMP clinical protocols and stationery copy sheets conform to certified environmental FSC regulations.",
      icon: ShieldCheck,
      color: "text-teal-600 bg-teal-500/10"
    },
    {
      title: "Consolidated Trust",
      desc: "Operated securely for over two decades. Januzen Global LLP bridges vital community physical requirements under a single unified credit invoice.",
      icon: Award,
      color: "text-amber-600 bg-amber-500/10"
    },
    {
      title: "Digital Logistics Mastery",
      desc: "Deploying deep barcode serialization and real-time inventory systems to coordinate intra-city fleet dispatch within hours.",
      icon: Cpu,
      color: "text-sky-600 bg-sky-500/10"
    },
    {
      title: "Sustainably Responsible",
      desc: "Actively sourcing natural wood fibers for JA Stationery and implementing safe capsule packaging recovery channels.",
      icon: Library,
      color: "text-slate-900 bg-slate-500/10"
    }
  ];

  const timeline = [
    {
      year: "2005",
      title: "Nuthan Medicals",
      desc: "Founded by Vinuthan Reddy Kongara, launching Nuthan Medicals on June 6th to deliver critical clinical diagnostics and pharmaceutical care."
    },
    {
      year: "2024",
      title: "Inception of JA Stationery",
      desc: "Launching JA Stationery on September 10th, 2024 under the trusted Januzen umbrella to offer premium leather diaries and archival desk essentials."
    }
  ];

  useEffect(() => {
    const tl = gsap.timeline();
    
    tl.fromTo(
      ".gsap-about-header",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
    );

    tl.fromTo(
      ".gsap-about-story",
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" },
      "-=0.5"
    );

    tl.fromTo(
      ".gsap-about-panel",
      { opacity: 0, x: 30 },
      { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" },
      "-=0.8"
    );

    gsap.fromTo(
      ".gsap-about-value-card",
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.15, ease: "back.out(1.2)", delay: 0.4 }
    );

    gsap.fromTo(
      ".gsap-about-timeline-item",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.25, ease: "power2.out", delay: 0.6 }
    );
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans space-y-20 pb-20">
      
      {/* 🌟 Editorial Header */}
      <section className="text-center max-w-2xl mx-auto space-y-4 gsap-about-header">
        <span className="text-xs uppercase tracking-[0.25em] font-extrabold text-[#D4820A] block font-mono">Our Heritage & Values</span>
        <h1 className="font-serif text-4xl sm:text-5xl font-light text-current">The JANUZEN <span className="italic">Legacy</span></h1>
        <div className="w-12 h-[1.5px] bg-[#D4820A] mx-auto"></div>
        <p className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto">
          Providing specialized physical solutions in pharmacy healthcare and corporate workflows since 2005.
        </p>
      </section>

      {/* Corporate Story Block */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-card-theme border rounded-2xl p-8 sm:p-12 shadow-sm transition-all">
        <div className="space-y-6 gsap-about-story">
          <span className="font-mono text-xs text-teal-600 uppercase tracking-widest font-bold">JANUZEN GLOBAL LLP</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-current tracking-tight leading-tight">
            Bridging vital human needs under one <span className="italic">verified parent banner</span>
          </h2>
          
          <div className="space-y-4 text-sm text-gray-500 leading-relaxed font-serif">
            <p>
              <strong>Januzen Global LLP</strong>, founded by <strong>Vinuthan Reddy Kongara</strong>, operates as a parent company with two highly trusted divisions that touch everyday lives. **Nuthan Medicals** (established June 6th, 2005) serves the clinical market by providing authenticated prescriptions and diagnostic tools. Simultaneously, **JA Stationery** (established September 10th, 2024) powers offices and classrooms through premium paper, diaries, and writing tools.
            </p>
            <p>
              Both divisions operate securely out of our central facility, consolidating healthcare logistics and workspace inventories under one efficient administrative portal for hassle-free invoicing and genuine stock telemetry.
            </p>
          </div>
        </div>

        {/* Vision & Mission panels */}
        <div className="space-y-6 gsap-about-panel">
          <div className="p-8 rounded-xl bg-teal-500/5 border border-teal-200/40 space-y-2">
            <h3 className="font-serif text-xl font-bold text-[#0F9B8E] flex items-center gap-2.5">
              <Anchor className="h-5 w-5 text-teal-600" />
              Our True Mission
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              To supply authentic, WHO-GMP clinical pharmaceuticals and high-performing workspace stationery items without delay. Making high-grade, premium inventory available in our central logistics pipeline.
            </p>
          </div>

          <div className="p-8 rounded-xl bg-amber-500/5 border border-amber-200/40 space-y-2">
            <h3 className="font-serif text-xl font-bold text-[#D4820A] flex items-center gap-2.5">
              <Users className="h-5 w-5 text-amber-600" />
              Our Vision Forecast
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              To establish regional warehouse fulfillment campuses across India that streamline same-day shipping of essential commodities, minimizing administrative overheads for hospitals and corporate blocks alike.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values grid */}
      <section className="space-y-12">
        <div className="text-center max-w-md mx-auto space-y-2">
          <h2 className="font-serif text-3xl font-light">Our Governing <span className="italic">Principles</span></h2>
          <p className="text-gray-400 text-xs font-mono">Four pillars that define our daily operational activities from stock auditing to customer care.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v, i) => {
            const Icon = v.icon;
            return (
              <div key={i} className="bg-card-theme border p-6 rounded-xl hover:shadow-lg transition-all duration-300 gsap-about-value-card">
                <div className={`h-11 w-11 rounded-lg flex items-center justify-center mb-4 ${v.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-current">{v.title}</h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Elegant Editorial Timeline */}
      <section className="space-y-12 pb-8">
        <div className="text-center max-w-md mx-auto space-y-2">
          <h2 className="font-serif text-3xl font-light text-current flex justify-center items-center gap-3">
            <Milestone className="h-6 w-6 text-amber-500" />
            25 Years <span className="italic">in Focus</span>
          </h2>
          <p className="text-gray-400 text-xs font-mono">Tracing our history from a local apothecary shop to a global partnership.</p>
        </div>

        <div className="bg-card-theme border rounded-2xl p-8 sm:p-12 shadow-sm max-w-4xl mx-auto relative overflow-hidden">
          {/* Vertical layout line */}
          <div className="absolute left-8 sm:left-1/2 top-12 bottom-12 w-[1px] bg-gray-200 hidden sm:block" />

          <div className="space-y-12 relative z-10">
            {timeline.map((evt, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <div key={idx} className={`flex flex-col sm:flex-row items-stretch sm:justify-between relative gsap-about-timeline-item ${isEven ? "" : "sm:flex-row-reverse"}`}>
                  
                  {/* Content Block */}
                  <div className={`w-full sm:w-[45%] pl-12 sm:pl-0 space-y-1 ${isEven ? "sm:text-right" : "sm:text-left"}`}>
                    <span className={`font-mono font-bold text-lg block ${isEven ? "text-teal-600" : "text-amber-600"}`}>{evt.year}</span>
                    <h4 className="font-serif text-lg font-bold text-current">{evt.title}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-serif">{evt.desc}</p>
                  </div>

                  {/* Node marker point */}
                  <div className="absolute left-6 sm:left-1/2 transform -translate-x-1/2 top-1.5 h-4 w-4 bg-[#0D1B2A] border-4 border-white rounded-full shadow" />

                  {/* Responsive desk spacing placeholder */}
                  <div className="hidden sm:block w-[45%]" />

                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
