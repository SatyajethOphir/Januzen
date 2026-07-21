import React from "react";
import { gsap } from "gsap";
import { 
  ArrowRight, ShieldCheck, Truck, Clock, Sparkles, Inbox, 
  Activity, BookOpen, Quote, HelpCircle, Star, ArrowUpRight, Heart, Share2, Check
} from "lucide-react";
import { Product } from "../types";
import { JanuzenLogo, NuthanMedicalsLogo, JaStationeryLogo, ZenoraLogo } from "./Logos";
import { ProductCardSkeleton, TestimonialSkeleton } from "./SkeletonLoader";
import ImageWithLoader from "./ImageWithLoader";

interface HomeViewProps {
  onNavigate: (view: string, params?: Record<string, any>) => void;
  featuredProducts: Product[];
  onAddToBag: (product: Product) => void;
  wishlistProductIds?: string[];
  onToggleWishlist?: (productId: string, productType: 'medicals' | 'stationery' | 'zenora') => void;
}

export default function HomeView({ 
  onNavigate, 
  featuredProducts, 
  onAddToBag, 
  wishlistProductIds = [], 
  onToggleWishlist 
}: HomeViewProps) {
  const [newsEmail, setNewsEmail] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [testimonialsLoading, setTestimonialsLoading] = React.useState(true);

  const communityVoices = [
    {
      text: "The seamless transition to the Zenora sector for household and home essentials is exceptional. We get top-tier cleaning agents and kitchen essentials delivered on one clean corporate account.",
      author: "Nikhil",
      role: "Operations Director",
      avatar: "NK",
      color: "bg-indigo-50 dark:bg-indigo-950/45 border-indigo-200 dark:border-indigo-900/60 text-indigo-800 dark:text-indigo-300"
    },
    {
      text: "Nuthan Medicals continues to be our premier source for WHO-GMP medical diagnostics. The transparency and rapid dispatch keep our clinical teams operating at highest standards.",
      author: "Neel Akash",
      role: "Clinical Quality Lead",
      avatar: "NA",
      color: "bg-teal-50 dark:bg-teal-950/45 border-teal-200 dark:border-teal-900/60 text-teal-800 dark:text-teal-300"
    },
    {
      text: "I am deeply impressed by JA Stationery's premium drawing books and customized organizers. Their attention to paper quality and high-GSM feel is unmatched for professional design work.",
      author: "Manasa",
      role: "Lead Architect & Creative",
      avatar: "MS",
      color: "bg-amber-50 dark:bg-amber-950/45 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300"
    },
    {
      text: "Everyday home essentials from Zenora have streamlined our office pantry and hygiene supplies. From bio-friendly dishwashers to everyday utilities, the delivery is consistently flawless.",
      author: "Riya",
      role: "Procurement Manager",
      avatar: "RY",
      color: "bg-purple-50 dark:bg-purple-950/45 border-purple-200 dark:border-purple-900/60 text-purple-800 dark:text-purple-300"
    },
    {
      text: "Consolidated invoicing across Nuthan Medicals and JA Stationery simplifies our multi-department bookkeeping. One verified platform for diagnostics and workstation files is a marvel.",
      author: "Akhil",
      role: "Corporate Finance Controller",
      avatar: "AK",
      color: "bg-slate-100 dark:bg-slate-900/45 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300"
    },
    {
      text: "The sheer quality of the brass-fitted writing tools and executive academic diaries from JA Stationery makes them the perfect corporate gifts. Refined aesthetic combined with pure utility.",
      author: "Sunny",
      role: "Brand Strategist",
      avatar: "SN",
      color: "bg-yellow-50 dark:bg-yellow-950/45 border-yellow-200 dark:border-yellow-900/60 text-yellow-800 dark:text-yellow-300"
    },
    {
      text: "Zenora's kitchen and daily household items have outstanding durability. Combining this new sector with healthcare formulations makes Januzen Global our true single-source enterprise partner.",
      author: "Deepak",
      role: "Facilities Management Head",
      avatar: "DP",
      color: "bg-sky-50 dark:bg-sky-950/45 border-sky-200 dark:border-sky-900/60 text-sky-800 dark:text-sky-300"
    },
    {
      text: "As a medical practitioner, I rely heavily on rapid diagnostics. Nuthan Medicals' sterile trauma kits and diagnostics devices are of uncompromising international quality.",
      author: "Abhishek",
      role: "Chief Medical Director",
      avatar: "AB",
      color: "bg-emerald-50 dark:bg-emerald-950/45 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300"
    }
  ];

  // Elite GSAP interactive handlers for smooth micro-animations and section hovers
  const handleCard1Enter = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const logo = card.querySelector(".gsap-division-logo");
    const arrow = card.querySelector(".gsap-division-arrow");
    const tag = card.querySelector(".gsap-division-tag");
    
    gsap.to(card, { 
      y: -10, 
      scale: 1.01, 
      borderColor: "rgba(15, 155, 142, 0.5)", 
      boxShadow: "0 25px 40px -15px rgba(15, 155, 142, 0.18)", 
      duration: 0.4, 
      ease: "power2.out" 
    });
    if (logo) gsap.to(logo, { scale: 1.14, rotation: 10, duration: 0.45, ease: "back.out(1.8)" });
    if (arrow) gsap.to(arrow, { x: 6, duration: 0.3, ease: "power2.out" });
    if (tag) gsap.to(tag, { scale: 1.05, duration: 0.3, ease: "back.out(1.5)" });
  };

  const handleCard1Leave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const logo = card.querySelector(".gsap-division-logo");
    const arrow = card.querySelector(".gsap-division-arrow");
    const tag = card.querySelector(".gsap-division-tag");
    
    gsap.to(card, { 
      y: 0, 
      scale: 1, 
      borderColor: "rgba(20, 184, 166, 0.2)", 
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", 
      duration: 0.4, 
      ease: "power2.out" 
    });
    if (logo) gsap.to(logo, { scale: 1, rotation: 0, duration: 0.4, ease: "power2.out" });
    if (arrow) gsap.to(arrow, { x: 0, duration: 0.3, ease: "power2.out" });
    if (tag) gsap.to(tag, { scale: 1, duration: 0.3, ease: "power2.out" });
  };

  const handleCard2Enter = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const logo = card.querySelector(".gsap-division-logo");
    const arrow = card.querySelector(".gsap-division-arrow");
    const tag = card.querySelector(".gsap-division-tag");
    
    gsap.to(card, { 
      y: -10, 
      scale: 1.01, 
      borderColor: "rgba(212, 130, 10, 0.5)", 
      boxShadow: "0 25px 40px -15px rgba(212, 130, 10, 0.18)", 
      duration: 0.4, 
      ease: "power2.out" 
    });
    if (logo) gsap.to(logo, { scale: 1.14, rotation: -10, duration: 0.45, ease: "back.out(1.8)" });
    if (arrow) gsap.to(arrow, { x: 6, duration: 0.3, ease: "power2.out" });
    if (tag) gsap.to(tag, { scale: 1.05, duration: 0.3, ease: "back.out(1.5)" });
  };

  const handleCard2Leave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const logo = card.querySelector(".gsap-division-logo");
    const arrow = card.querySelector(".gsap-division-arrow");
    const tag = card.querySelector(".gsap-division-tag");
    
    gsap.to(card, { 
      y: 0, 
      scale: 1, 
      borderColor: "rgba(245, 158, 11, 0.2)", 
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", 
      duration: 0.4, 
      ease: "power2.out" 
    });
    if (logo) gsap.to(logo, { scale: 1, rotation: 0, duration: 0.4, ease: "power2.out" });
    if (arrow) gsap.to(arrow, { x: 0, duration: 0.3, ease: "power2.out" });
    if (tag) gsap.to(tag, { scale: 1, duration: 0.3, ease: "power2.out" });
  };

  const handleCard3Enter = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const logo = card.querySelector(".gsap-division-logo");
    const arrow = card.querySelector(".gsap-division-arrow");
    const tag = card.querySelector(".gsap-division-tag");
    
    gsap.to(card, { 
      y: -10, 
      scale: 1.01, 
      borderColor: "rgba(99, 102, 241, 0.5)", 
      boxShadow: "0 25px 40px -15px rgba(99, 102, 241, 0.18)", 
      duration: 0.4, 
      ease: "power2.out" 
    });
    if (logo) gsap.to(logo, { scale: 1.14, rotation: -10, duration: 0.45, ease: "back.out(1.8)" });
    if (arrow) gsap.to(arrow, { x: 6, duration: 0.3, ease: "power2.out" });
    if (tag) gsap.to(tag, { scale: 1.05, duration: 0.3, ease: "back.out(1.5)" });
  };

  const handleCard3Leave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const logo = card.querySelector(".gsap-division-logo");
    const arrow = card.querySelector(".gsap-division-arrow");
    const tag = card.querySelector(".gsap-division-tag");
    
    gsap.to(card, { 
      y: 0, 
      scale: 1, 
      borderColor: "rgba(99, 102, 241, 0.2)", 
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", 
      duration: 0.4, 
      ease: "power2.out" 
    });
    if (logo) gsap.to(logo, { scale: 1, rotation: 0, duration: 0.4, ease: "power2.out" });
    if (arrow) gsap.to(arrow, { x: 0, duration: 0.3, ease: "power2.out" });
    if (tag) gsap.to(tag, { scale: 1, duration: 0.3, ease: "power2.out" });
  };

  const handleStatEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget;
    const val = box.querySelector(".gsap-stat-val");
    gsap.to(box, { y: -6, duration: 0.3, ease: "power2.out" });
    if (val) gsap.to(val, { scale: 1.08, duration: 0.3, ease: "back.out(1.5)" });
  };

  const handleStatLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget;
    const val = box.querySelector(".gsap-stat-val");
    gsap.to(box, { y: 0, duration: 0.3, ease: "power2.out" });
    if (val) gsap.to(val, { scale: 1, duration: 0.3, ease: "power2.out" });
  };

  const handleProductCardEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const img = card.querySelector(".gsap-product-img img");
    const badge = card.querySelector(".gsap-product-badge");
    const btn = card.querySelector(".gsap-product-btn");
    
    gsap.to(card, { 
      y: -8, 
      borderColor: "rgba(212, 130, 10, 0.3)",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", 
      duration: 0.35, 
      ease: "power2.out" 
    });
    if (img) gsap.to(img, { scale: 1.06, duration: 0.4, ease: "power2.out" });
    if (badge) gsap.to(badge, { scale: 1.05, duration: 0.3, ease: "back.out(1.5)" });
    if (btn) gsap.to(btn, { scale: 1.03, duration: 0.25, ease: "power2.out" });
  };

  const handleProductCardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const img = card.querySelector(".gsap-product-img img");
    const badge = card.querySelector(".gsap-product-badge");
    const btn = card.querySelector(".gsap-product-btn");
    
    gsap.to(card, { 
      y: 0, 
      borderColor: "rgba(229, 231, 235, 0.8)",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)", 
      duration: 0.35, 
      ease: "power2.out" 
    });
    if (img) gsap.to(img, { scale: 1, duration: 0.4, ease: "power2.out" });
    if (badge) gsap.to(badge, { scale: 1, duration: 0.3, ease: "power2.out" });
    if (btn) gsap.to(btn, { scale: 1, duration: 0.25, ease: "power2.out" });
  };

  const handleActionBtnEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { scale: 1.15, rotation: 5, duration: 0.25, ease: "back.out(1.8)" });
  };

  const handleActionBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { scale: 1, rotation: 0, duration: 0.25, ease: "power2.out" });
  };

  React.useEffect(() => {
    const timer = setTimeout(() => setTestimonialsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

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
              Trusted Healthcare & Enterprise Essentials
            </div>
            
            <h1 className="gsap-hero-title font-serif text-5xl sm:text-6xl lg:text-7xl font-extralight leading-[1.08] tracking-tight">
              Building Trust Through <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-amber-300 to-amber-500 font-bold">Healthcare & Essential Services</span>
            </h1>
            
            <p className="gsap-hero-desc text-gray-300 text-lg sm:text-xl font-light leading-relaxed max-w-2xl font-serif">
              JANUZEN Global LLP is the parent organization behind trusted healthcare and stationery brands. Through Nuthan Medicals and JA Stationery, we deliver certified medical supplies, quality stationery products, and dependable enterprise solutions with integrity, precision, and long-term reliability.
            </p>

            <div className="gsap-hero-btns flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => onNavigate("medicals")}
                className="group flex items-center gap-2.5 bg-[#0F9B8E] hover:bg-[#0c7f74] text-white font-mono font-bold uppercase tracking-wider px-7 py-4 rounded-lg shadow-lg hover:shadow-[#0F9B8E]/20 transition-all text-xs cursor-pointer"
              >
                Explore Nuthan Medicals
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate("stationery")}
                className="group flex items-center gap-2.5 bg-transparent border border-white/20 hover:border-amber-400 hover:text-amber-400 text-white font-mono font-bold uppercase tracking-wider px-7 py-4 rounded-lg transition-all text-xs cursor-pointer"
              >
                Explore JA Stationery
                <ArrowUpRight className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate("zenora")}
                className="group flex items-center gap-2.5 bg-transparent border border-white/20 hover:border-indigo-400 hover:text-indigo-400 text-white font-mono font-bold uppercase tracking-wider px-7 py-4 rounded-lg transition-all text-xs cursor-pointer"
              >
                Explore Zenora
                <ArrowUpRight className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>

            <p className="text-xs text-gray-400 font-light tracking-wide italic pt-2">
              Serving communities with quality, transparency, and professional excellence.
            </p>
          </div>

          {/* Hero Graphic Frame (Interactive Brand Hub Preview) */}
          <div className="gsap-hero-frame lg:w-5/12 flex justify-center relative w-full max-w-lg lg:max-w-none">
            {/* Ambient Colorful Neon Glow Behind the Asset */}
            <div className="w-full h-full bg-gradient-to-tr from-[#0F9B8E]/40 via-amber-500/20 to-[#D4820A]/40 rounded-2xl absolute -rotate-2 scale-102 blur-2xl opacity-50 shadow-2xl"></div>
            
            <div className="w-full bg-[#111625]/90 border-2 border-amber-500/25 rounded-2xl p-6 md:p-8 shadow-2xl relative z-10 flex flex-col justify-between space-y-6 backdrop-blur-md overflow-hidden group">
              
              {/* Eye-catching Banner Header Accent */}
              <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-600 to-amber-500 text-black text-[9px] font-mono font-black py-1 px-3 rounded-bl-lg uppercase tracking-widest shadow-md">
                DIRECT INVENTORY LIVE
              </div>

              {/* The Majestic Generated Image Asset */}
              <div className="relative w-full h-48 md:h-56 rounded-xl overflow-hidden border border-white/15 shadow-inner">
                <ImageWithLoader 
                  src="/januzen_hero_centerpiece_1782099432421.jpg" 
                  alt="Januzen Global Sovereign Pieces" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-95 hover:brightness-105 animate-fade-in-up"
                  containerClassName="w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                  <div>
                    <span className="text-[9px] font-mono text-amber-300 uppercase tracking-widest font-black">Curated Collection</span>
                    <h4 className="text-white text-sm font-serif font-semibold">Januzen Master Suite</h4>
                  </div>
                  <span className="text-[9px] text-[#2DD4BF] font-mono bg-teal-950/80 border border-teal-500/30 px-2 py-0.5 rounded-full uppercase">
                    Authorized
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Division 1 Line */}
                <div 
                  onClick={() => onNavigate("medicals")}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-teal-500/30 hover:bg-teal-950/20 transition-all group cursor-pointer"
                >
                  <div className="h-10 w-10 text-teal-400 bg-teal-950/40 border border-teal-500/10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <NuthanMedicalsLogo size={28} />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 group-hover:text-teal-300">
                      Nuthan Medicals
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed font-serif">WHO-GMP prescription medicines & diagnostic devices.</p>
                  </div>
                </div>

                {/* Division 2 Line */}
                <div 
                  onClick={() => onNavigate("stationery")}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 hover:bg-amber-950/20 transition-all group cursor-pointer"
                >
                  <div className="h-10 w-10 text-amber-400 bg-amber-950/40 border border-amber-500/10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <JaStationeryLogo size={28} />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 group-hover:text-amber-300">
                      JA Stationery
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed font-serif">Fine premium writing instruments, archival planners & papers.</p>
                  </div>
                </div>

                {/* Division 3 Line */}
                <div 
                  onClick={() => onNavigate("zenora")}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-950/20 transition-all group cursor-pointer"
                >
                  <div className="h-10 w-10 text-indigo-400 bg-indigo-950/40 border border-indigo-500/10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ZenoraLogo size={28} />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 group-hover:text-indigo-300">
                      Zenora Essentials
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed font-serif">Everyday home, cleaning, kitchen & personal-use necessities.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 flex justify-between items-center text-[9px] font-mono text-gray-400 tracking-wide">
                <span>ESTABLISHED 2005</span>
                <span className="text-amber-500">* TRUSTED PORTAL *</span>
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
              { val: "3", desc: "Specialist Corporate Divisions", color: "text-teal-600" },
              { val: "100%", desc: "Authorized Distribute Guarantee", color: "text-amber-600" },
            ].map((stat, i) => (
              <div 
                key={i} 
                className="gsap-stat-box text-center px-4 cursor-pointer"
                onMouseEnter={handleStatEnter}
                onMouseLeave={handleStatLeave}
              >
                <span className={`gsap-stat-val inline-block font-serif text-3xl sm:text-4xl lg:text-5xl font-light ${stat.color}`}>{stat.val}</span>
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.15em] font-mono font-bold mt-2 leading-relaxed">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🏥 TRIPLE PILLARS: DIVISION SELECTORS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#D4820A] block uppercase">Exclusive Operations</span>
          <h2 className="font-serif text-4xl sm:text-5xl font-light text-current leading-tight">
            Our Three <span className="italic font-normal">Specialist Houses</span>
          </h2>
          <div className="w-12 h-[2px] bg-amber-500 mx-auto"></div>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            Governing healthcare distribution, fine-bound workstation inventories, and quality home essentials with strict standards of original delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card 1: Nuthan Medicals */}
          <div 
            className="gsap-division-card bg-card-theme border-2 border-teal-500/20 rounded-2xl overflow-hidden shadow-md transition-all duration-300 flex flex-col justify-between group relative"
            onMouseEnter={handleCard1Enter}
            onMouseLeave={handleCard1Leave}
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 to-[#0F9B8E]"></div>
            
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="gsap-division-logo inline-flex h-16 w-16 text-teal-600 bg-teal-50 rounded-2xl items-center justify-center p-2.5 border border-teal-100 shadow-sm transition-all duration-300">
                  <NuthanMedicalsLogo size={56} />
                </div>
                <span className="gsap-division-tag text-[9px] font-mono font-bold uppercase tracking-widest text-[#0F9B8E] bg-[#0F9B8E]/10 border border-[#0F9B8E]/20 px-2.5 py-1 rounded-full">
                  WHO-GMP Vetted
                </span>
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-mono tracking-widest text-teal-600 uppercase font-black block">Pharmacological Dispensary</span>
                <h3 className="font-serif text-2xl font-regular tracking-tight text-slate-900 transition-colors">Nuthan Medicals</h3>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed font-serif">
                A highly trusted distributor delivering prescription formulations, active OTC remedies, hospital-certified diagnostic monitoring devices, and sterile trauma kits. Audited to meet critical healthcare compliance rules.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {["Formulations", "Diagnostic Monitors", "WHO Certified", "Trauma kits"].map((tag) => (
                  <span key={tag} className="text-[10px] font-sans font-bold border border-teal-100 bg-teal-50/50 text-teal-800 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="px-8 pb-8">
              <button
                onClick={() => onNavigate("medicals")}
                className="w-full py-4 px-6 bg-[#0F9B8E] hover:bg-[#0c7f74] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-md hover:shadow-teal-500/25 active:scale-98"
              >
                Enter Medicals Division
                <ArrowRight className="gsap-division-arrow h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Card 2: JA Stationery */}
          <div 
            className="gsap-division-card bg-card-theme border-2 border-amber-500/20 rounded-2xl overflow-hidden shadow-md transition-all duration-300 flex flex-col justify-between group relative"
            onMouseEnter={handleCard2Enter}
            onMouseLeave={handleCard2Leave}
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-[#D4820A]"></div>
            
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="gsap-division-logo inline-flex h-16 w-16 text-amber-600 bg-amber-50 rounded-2xl items-center justify-center p-2.5 border border-amber-100 shadow-sm transition-all duration-300">
                  <JaStationeryLogo size={56} />
                </div>
                <span className="gsap-division-tag text-[9px] font-mono font-bold uppercase tracking-widest text-[#D4820A] bg-[#D4820A]/10 border border-[#D4820A]/20 px-2.5 py-1 rounded-full">
                  Archival Premium
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono tracking-widest text-amber-600 uppercase font-black block">Fine Writing & Archives</span>
                <h3 className="font-serif text-2xl font-regular tracking-tight text-slate-900 transition-colors">JA Stationery</h3>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed font-serif">
                Curating magnificent desktop and journaling supplies, pristine high-GSM drawing reams, leather archives, and brass-fitted calligraphic items. Built to supply corporate spaces, architects, and designers with refined materials.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {["Fine Stationery", "Drawing Reams", "Leather Notebooks", "Studio Pens"].map((tag) => (
                  <span key={tag} className="text-[10px] font-sans font-bold border border-amber-100 bg-amber-50/50 text-amber-800 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="px-8 pb-8">
              <button
                onClick={() => onNavigate("stationery")}
                className="w-full py-4 px-6 bg-[#D4820A] hover:bg-[#b56e07] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-md hover:shadow-amber-500/25 active:scale-98"
              >
                Enter Stationery Division
                <ArrowRight className="gsap-division-arrow h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Card 3: Zenora */}
          <div 
            className="gsap-division-card bg-card-theme border-2 border-indigo-500/20 rounded-2xl overflow-hidden shadow-md transition-all duration-300 flex flex-col justify-between group relative"
            onMouseEnter={handleCard3Enter}
            onMouseLeave={handleCard3Leave}
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-[#6366F1]"></div>
            
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="gsap-division-logo inline-flex h-16 w-16 text-indigo-600 bg-indigo-50 rounded-2xl items-center justify-center p-2.5 border border-indigo-100 shadow-sm transition-all duration-300">
                  <ZenoraLogo size={56} />
                </div>
                <span className="gsap-division-tag text-[9px] font-mono font-bold uppercase tracking-widest text-[#6366F1] bg-[#6366F1]/10 border border-[#6366F1]/20 px-2.5 py-1 rounded-full">
                  Everyday Quality
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono tracking-widest text-indigo-600 uppercase font-black block">Home & Household Essentials</span>
                <h3 className="font-serif text-2xl font-regular tracking-tight text-slate-900 transition-colors">Zenora</h3>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed font-serif">
                Offering high-caliber everyday items, bio-friendly cleaning agents, kitchen tools, and refined personal daily necessities. Designed to streamline your household chores and enhance modern living spaces.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {["Home Essentials", "Cleaning Supplies", "Kitchen Essentials", "Personal Care"].map((tag) => (
                  <span key={tag} className="text-[10px] font-sans font-bold border border-indigo-100 bg-indigo-50/50 text-indigo-800 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="px-8 pb-8">
              <button
                onClick={() => onNavigate("zenora")}
                className="w-full py-4 px-6 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-md hover:shadow-indigo-500/25 active:scale-98"
              >
                Enter Zenora Division
                <ArrowRight className="gsap-division-arrow h-4 w-4" />
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
            [...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          ) : (
            featuredProducts.slice(0, 4).map((product) => {
              const shopBadge = product.shop === "medicals" ? "bg-teal-50 text-teal-800 border-teal-100" : "bg-amber-50 text-amber-800 border-amber-100";
              const btnTheme = product.shop === "medicals" ? "bg-[#0F9B8E] hover:bg-[#0c7f74]" : "bg-[#D4820A] hover:bg-[#b56e07]";
              
              const isWishlisted = wishlistProductIds.includes(product.id);
              const isOutOfStock = (product.stockQuantity ?? product.stock) === 0;
              const isLowStock = !isOutOfStock && (product.stockQuantity ?? product.stock) <= (product.lowStockThreshold ?? 5);
              const stockVal = product.stockQuantity ?? product.stock;

              // Local copy sharing status tracking
              const isCopied = copiedId === product.id;
              const handleShareLink = (e: React.MouseEvent) => {
                e.stopPropagation();
                const shareUrl = `${window.location.origin}${window.location.pathname}?product=${product.id}`;
                navigator.clipboard.writeText(shareUrl).then(() => {
                  setCopiedId(product.id);
                  setTimeout(() => setCopiedId(null), 2000);
                });
              };

              return (
                <div 
                  key={product.id} 
                  className="gsap-product-tile bg-card-theme border rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative group/tile"
                  onMouseEnter={handleProductCardEnter}
                  onMouseLeave={handleProductCardLeave}
                >
                  <div className="relative overflow-hidden group/img">
                    <ImageWithLoader
                      src={product.image}
                      alt={product.name}
                      className="w-full h-56"
                      containerClassName="gsap-product-img w-full h-56"
                    />
                    <span className={`gsap-product-badge absolute top-4 left-4 text-[9px] font-mono font-bold tracking-wider uppercase px-3 py-1 rounded-full border shadow-sm ${shopBadge}`}>
                      {product.shop === "medicals" ? "💊 Nuthan Med" : "🖋️ JA Stationery"}
                    </span>

                    {/* Integrated Heart Toggle & Share controls over image card */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 opacity-100 sm:opacity-0 sm:group-hover/tile:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleWishlist) onToggleWishlist(product.id, product.shop);
                        }}
                        onMouseEnter={handleActionBtnEnter}
                        onMouseLeave={handleActionBtnLeave}
                        className="h-8 w-8 rounded-full flex items-center justify-center border transition-all cursor-pointer action-btn-override wishlist-btn-override bg-white/90 backdrop-blur-sm"
                        title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        <Heart className={`h-4.5 w-4.5 transition-colors ${isWishlisted ? "fill-red-600 stroke-red-600" : ""}`} />
                      </button>

                      <button
                        onClick={handleShareLink}
                        onMouseEnter={handleActionBtnEnter}
                        onMouseLeave={handleActionBtnLeave}
                        className="h-8 w-8 rounded-full flex items-center justify-center border transition-all cursor-pointer action-btn-override bg-white/90 backdrop-blur-sm"
                        title="Copy product link"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-teal-600" />
                        ) : (
                          <Share2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <span className="text-xs font-mono font-bold text-red-600 uppercase border border-red-300 px-3 py-1.5 rounded-md bg-white">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">{product.category}</span>
                        {isLowStock && (
                          <span className="text-[8px] font-mono font-bold uppercase text-amber-600 bg-amber-50 border border-amber-200 px-1.5 rounded">
                            Only {stockVal} Left
                          </span>
                        )}
                      </div>
                      <h4
                        onClick={() => onNavigate("product-detail", { productId: product.id })}
                        className="font-serif text-lg font-bold text-current cursor-pointer hover:text-teal-600 hover:underline transition-all line-clamp-1"
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
                        disabled={isOutOfStock}
                        className={`gsap-product-btn text-white text-[10px] font-mono font-bold uppercase tracking-wider py-2 px-4 rounded-lg transition-colors cursor-pointer ${
                          isOutOfStock 
                            ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed" 
                            : btnTheme
                        }`}
                      >
                        {isOutOfStock ? "Out of Stock" : "Add to Bag"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 💬 TESTIMONIALS: JOURNAL FORMAT WITH INFINITE SCROLL */}
      <section className="bg-gradient-to-b from-transparent to-black/5 py-24 border-y border-gray-200 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-[#D4820A] block uppercase">Our Voice Community</span>
            <h2 className="font-serif text-4xl font-light">Vouched for by <span className="italic font-normal">Our Members</span></h2>
            <p className="text-gray-500 text-sm">Real experiences shared by corporate partners and community members across our medical, stationery, and everyday divisions.</p>
          </div>
        </div>

        {/* Seamless Infinite Scrolling Track */}
        <div className="relative w-full overflow-hidden select-none py-4">
          {testimonialsLoading ? (
            <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-6 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <TestimonialSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="flex w-max gap-8 animate-fade-in-up">
              {/* Track 1 */}
              <div className="animate-testimonial-marquee flex gap-8 whitespace-normal shrink-0">
                {communityVoices.map((t, idx) => (
                  <div 
                    key={`track1-${idx}`} 
                    className="w-[360px] md:w-[400px] shrink-0 bg-card-theme p-8 rounded-xl border border-stone-200/80 dark:border-slate-800/80 shadow-md relative space-y-6 flex flex-col justify-between hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="space-y-4">
                      <div className="text-[#D4820A] fill-current opacity-30">
                        <Quote className="h-7 w-7 transform -scale-x-100" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm font-serif leading-relaxed italic">
                        "{t.text}"
                      </p>
                    </div>

                    <div className="pt-6 border-t border-stone-100 dark:border-slate-800 flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 border ${t.color}`}>
                        {t.avatar}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-950 dark:text-white">{t.author}</h4>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Track 2 (Identical Duplicate) */}
              <div className="animate-testimonial-marquee flex gap-8 whitespace-normal shrink-0" aria-hidden="true">
                {communityVoices.map((t, idx) => (
                  <div 
                    key={`track2-${idx}`} 
                    className="w-[360px] md:w-[400px] shrink-0 bg-card-theme p-8 rounded-xl border border-stone-200/80 dark:border-slate-800/80 shadow-md relative space-y-6 flex flex-col justify-between hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="space-y-4">
                      <div className="text-[#D4820A] fill-current opacity-30">
                        <Quote className="h-7 w-7 transform -scale-x-100" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm font-serif leading-relaxed italic">
                        "{t.text}"
                      </p>
                    </div>

                    <div className="pt-6 border-t border-stone-100 dark:border-slate-800 flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 border ${t.color}`}>
                        {t.avatar}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-950 dark:text-white">{t.author}</h4>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              <JanuzenLogo size={40} className="rounded-lg shadow-sm" />
              <span className="font-serif text-lg font-bold tracking-widest text-[#0D1B2A]">JANUZEN</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed font-serif">
              <strong>Januzen Global LLP</strong>, founded by <strong>Vinuthan Reddy Kongara</strong>, coordinates premier, verified physical standards in clinical healthcare and fine workstation archives.
            </p>
            <p className="text-[10px] text-gray-400 font-mono">
              HQ: P.No- P-12, Mahadevpuram, Gajularamaram, Hyderabad, Telangana.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-current mb-4">Nuthan Medicals (Est. June 2005)</h4>
            <ul className="space-y-2.5 text-xs text-gray-500 font-serif">
              <li>📞 Helpline: 09666588553</li>
              <li>📍 Phase-2, Pno 46 street no 5, Samskruthi Avenues Rd., Dwaraka Nagar, Gajularamaram, Hyderabad, Telangana 500117</li>
              <li>🕒 Estd: June 6th, 2005</li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-current mb-4">JA Stationery (Est. Sept 2024)</h4>
            <ul className="space-y-2.5 text-xs text-gray-500 font-serif">
              <li>📞 Order Desk: 09666588553</li>
              <li>📍 Phase-2, Pno 46 street no 5, Samskruthi Avenues Rd., Dwaraka Nagar, Gajularamaram, Hyderabad, Telangana 500117</li>
              <li>🕒 Estd: Sept 10th, 2024</li>
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
                <span>Free Insured Courier &gt;₹1000</span>
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
