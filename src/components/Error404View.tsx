import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { 
  FileSearch, 
  ArrowLeft, 
  Home, 
  ShoppingBag, 
  ShieldAlert, 
  HelpCircle, 
  Terminal, 
  Sparkles,
  Command,
  Search,
  Activity,
  PenTool
} from "lucide-react";

interface Error404ViewProps {
  onNavigate: (page: string, params?: Record<string, any>) => void;
  searchedTerm?: string;
}

export default function Error404View({ onNavigate, searchedTerm = "" }: Error404ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const codeCardRef = useRef<HTMLDivElement>(null);
  const numbersRef = useRef<HTMLSpanElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState(searchedTerm);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);

  // Simulation logs for interactive database lookup
  const databaseIndex = [
    { keywords: ["medicals", "pharmacy", "medicine", "tablets", "labs", "health", "clinical", "diagnostics", "surgical", "pills"], page: "medicals" },
    { keywords: ["stationery", "notebook", "diary", "journal", "pencils", "pens", "books", "planners", "office", "paper"], page: "stationery" },
    { keywords: ["cart", "bag", "checkout", "purchase", "buy", "basket", "pay"], page: "cart" },
    { keywords: ["login", "register", "auth", "account", "signup", "signin"], page: "login" },
    { keywords: ["profile", "settings", "credentials", "address"], page: "profile" },
    { keywords: ["orders", "history", "purchases", "receipts"], page: "orders" },
    { keywords: ["delivery", "agent", "hub", "logistics", "tracking"], page: "delivery" },
    { keywords: ["about", "trustees", "history", "founders", "reddy"], page: "about" },
    { keywords: ["contact", "address", "phone", "email", "support", "helpdesk"], page: "contact" }
  ];

  useEffect(() => {
    // 1. Staggered grand entry animation with elastic effects
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.from(".animate-404-header", {
        opacity: 0,
        y: -40,
        filter: "blur(8px)",
        duration: 0.6,
        ease: "power3.out"
      });

      // Elastic zoom on numbers
      tl.fromTo(numbersRef.current,
        { scale: 0.4, rotate: -15, opacity: 0 },
        { scale: 1, rotate: 0, opacity: 1, duration: 0.8, ease: "elastic.out(1.1, 0.4)" },
        "-=0.3"
      );

      // Slide in coding diagnostic card
      tl.from(codeCardRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.95,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.4");

      // Stagger buttons below
      tl.from(".animate-404-btn", {
        opacity: 0,
        y: 20,
        stagger: 0.08,
        duration: 0.5,
        ease: "back.out(1.5)"
      }, "-=0.2");

      // Subtle float animation on code card
      gsap.to(codeCardRef.current, {
        y: "-=8",
        duration: 3,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const triggerSystemScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isScanning) return;

    setIsScanning(true);
    setScanLogs([]);

    const steps = [
      "⚡ INITIATING CONSORTIUM SECURE INDEX ACQUISITION...",
      "🔍 SECURING HANDSHAKE WITH JANUZEN PRIMARY TELEMETRY BACKEND...",
      "⚠️ TARGET RESOURCE NOT FOUND (FILE CODES: 404_INDEX_MISSING)",
      `🛠️ FALLBACK AUTO-ROUTER SEARCH QUERY INITIATED FOR: "${searchQuery}"`,
      "🌐 SCANNING NUTHAN MEDICALS DRUG CATALOG & LAB EQUIPMENT INDEX...",
      "🌐 SCANNING JA STATIONERY HANDCRAFTED EXECUTIVE DIARIES & PLANNERS...",
      "🧬 COMPILING CORRELATION COEFFICIENTS FOR COMPATIBLE CHANNELS..."
    ];

    let delay = 0;
    steps.forEach((log, index) => {
      setTimeout(() => {
        setScanLogs(prev => [...prev, log]);
        if (consoleRef.current) {
          // Smooth scroll to bottom
          consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
      }, delay);
      delay += 400 + Math.random() * 300;
    });

    // Final correlation calculation
    setTimeout(() => {
      const q = searchQuery.toLowerCase();
      let matchedPage = "home";
      let highestCount = 0;

      for (const entry of databaseIndex) {
        let count = 0;
        for (const kw of entry.keywords) {
          if (q.includes(kw) || kw.includes(q)) {
            count++;
          }
        }
        if (count > highestCount) {
          highestCount = count;
          matchedPage = entry.page;
        }
      }

      if (highestCount > 0) {
        setScanLogs(prev => [
          ...prev,
          `🏆 MATCH CONVERGENCE FOUND! [Route: "${matchedPage.toUpperCase()}"]`,
          "⚡ REDIRECTING ENVELOPE STRUCT SECURELY..."
        ]);
        setTimeout(() => {
          setIsScanning(false);
          onNavigate(matchedPage);
        }, 1200);
      } else {
        setScanLogs(prev => [
          ...prev,
          "❌ ZERO MATCHING CORPORATE DIRECTORIES FOUND FOR THOSE PARAMS.",
          "💡 SUGGESTED MITIGATION: Re-route to Consolidated Global Home."
        ]);
        setIsScanning(false);
      }
    }, delay);
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-[85vh] bg-gradient-to-b from-[#050C16] via-[#0B1528] to-[#040810] text-slate-100 flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden"
      id="error-404-view"
    >
      {/* Absolute Tech Background Grid Deco */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(15,155,142,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(15,155,142,0.15)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[20%] left-[15%] w-72 h-72 bg-[#0F9B8E]/5 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[15%] w-80 h-80 bg-amber-500/5 rounded-full blur-[90px] pointer-events-none"></div>

      <div className="max-w-4xl w-full text-center relative z-10 space-y-8 flex flex-col items-center">
        
        {/* Upper Tag */}
        <div className="animate-404-header flex items-center gap-2 px-3 py-1 bg-[#1E293B]/60 border border-slate-700/60 rounded-full text-xs font-mono text-teal-400 font-semibold tracking-wider select-none mb-1">
          <ShieldAlert className="h-3.5 w-3.5 text-teal-400 animate-pulse" />
          CONSORTIUM SECURITY DEFLECTION MODULE
        </div>

        {/* Big Giant 404 Visual Showcase */}
        <div className="select-none flex flex-col items-center justify-center relative">
          <span 
            ref={numbersRef}
            className="block text-9xl md:text-[12rem] font-black font-serif tracking-tighter bg-gradient-to-r from-teal-400 via-emerald-300 to-amber-300 bg-clip-text text-transparent filter drop-shadow-[0_10px_25px_rgba(15,155,142,0.2)] hover:scale-105 transition-transform duration-300"
          >
            404
          </span>
          <div className="absolute -bottom-2 font-mono text-[10px] uppercase text-emerald-400/50 tracking-[0.4em] font-extrabold">
            ROUTE PROTOCOL NOT EXPOSED
          </div>
        </div>

        {/* Explanation Header */}
        <div className="space-y-3 max-w-xl animate-404-header">
          <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-white tracking-normal">
            Resource Extinguished or Vaulted
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed font-sans">
            The searched gateway cannot be located within the active corporate directories of <strong className="text-teal-400 text-xs font-mono font-medium">JANUZEN Global LLP</strong>. It may have been archived, renamed during consolidated restructuring, or does not exist.
          </p>
        </div>

        {/* Premium Command Diagnostic Console card */}
        <div 
          ref={codeCardRef}
          className="w-full max-w-xl bg-[#0D1525]/90 border border-slate-700/70 rounded-2xl p-5 shadow-2.5xl text-left scale-100 hover:border-slate-600 transition-all duration-300"
          id="diagnostic-code-card"
        >
          {/* Deck top controls */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 block"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80 block"></span>
              <span className="text-slate-400 font-mono text-[10px] ml-2 font-bold flex items-center gap-1">
                <Terminal className="h-3 w-3 text-emerald-400" />
                januzen_resolver_fallback.sh
              </span>
            </div>
            <span className="text-slate-500 font-mono text-[9px] font-extrabold">STATUS: OFF-ROUTE</span>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-mono text-slate-400 leading-normal">
              <span className="text-red-400">$</span> cat /sys/devices/network/route/active_address<br />
              <span className="text-yellow-400 font-bold">⚠️ FATAL: EXECUTED LOOKUP RETURNED [REFUSED - NULL_STRICT_ROUTE]</span>
            </p>

            {/* Interactive searching panel */}
            <form onSubmit={triggerSystemScan} className="relative mt-2">
              <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:border-teal-500 transition-all">
                <Search className="h-4 w-4 text-teal-400 shrink-0 mr-2" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Need something? e.g. 'diaries', 'meds', 'orders', 'about'..."
                  className="bg-transparent border-0 outline-none w-full text-xs text-white placeholder-slate-500 font-mono"
                  disabled={isScanning}
                />
                <button
                  type="submit"
                  disabled={isScanning || !searchQuery.trim()}
                  className="px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black text-[10px] font-mono font-bold tracking-wider uppercase rounded-md transition-all scale-100 active:scale-95 disabled:opacity-40 select-none cursor-pointer"
                >
                  {isScanning ? "Scrutinizing..." : "Scrutinize Data"}
                </button>
              </div>
            </form>

            {/* Simulated Live Scan Logs */}
            {scanLogs.length > 0 && (
              <div 
                ref={consoleRef}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 h-32 overflow-y-auto font-mono text-[10px] text-teal-400/90 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800"
              >
                {scanLogs.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-emerald-500 shrink-0">➜</span>
                    <span className={log.includes("❌") ? "text-red-400" : log.includes("🏆") || log.includes("⚡") ? "text-amber-300 font-bold" : "text-emerald-300/90"}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick redirect hub navigation items */}
        <div className="w-full max-w-xl space-y-4 pt-2">
          <h4 className="text-xs font-mono font-bold text-slate-400 tracking-[0.2em] uppercase select-none">
            🚀 SAFE ACCESS CORRIDORS
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => onNavigate("home")}
              className="animate-404-btn flex flex-col items-center gap-2 p-3.5 bg-[#0F1D32]/60 hover:bg-[#152744] hover:border-teal-500/40 border border-slate-800 rounded-xl text-center transition-all cursor-pointer transform hover:-translate-y-1"
            >
              <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
                <Home className="h-4 w-4" />
              </div>
              <span className="text-xs font-serif font-bold text-white leading-none">Home Gateway</span>
              <span className="text-[9px] font-mono text-slate-500">Root Vault</span>
            </button>

            <button
              onClick={() => onNavigate("medicals")}
              className="animate-404-btn flex flex-col items-center gap-2 p-3.5 bg-[#0F1D32]/60 hover:bg-[#152744] hover:border-teal-500/40 border border-slate-800 rounded-xl text-center transition-all cursor-pointer transform hover:-translate-y-1"
            >
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-xs font-serif font-bold text-white leading-none">Nuthan Medicals</span>
              <span className="text-[9px] font-mono text-slate-500">Apothecary Division</span>
            </button>

            <button
              onClick={() => onNavigate("stationery")}
              className="animate-404-btn flex flex-col items-center gap-2 p-3.5 bg-[#0F1D32]/60 hover:bg-[#152744] hover:border-teal-500/40 border border-slate-800 rounded-xl text-center transition-all cursor-pointer transform hover:-translate-y-1"
            >
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <PenTool className="h-4 w-4" />
              </div>
              <span className="text-xs font-serif font-bold text-white leading-none">JA Stationery</span>
              <span className="text-[9px] font-mono text-slate-500">Craft Desk Division</span>
            </button>

            <button
              onClick={() => onNavigate("contact")}
              className="animate-404-btn flex flex-col items-center gap-2 p-3.5 bg-[#0F1D32]/60 hover:bg-[#152744] hover:border-teal-500/40 border border-slate-800 rounded-xl text-center transition-all cursor-pointer transform hover:-translate-y-1"
            >
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <HelpCircle className="h-4 w-4" />
              </div>
              <span className="text-xs font-serif font-bold text-white leading-none">Support Desk</span>
              <span className="text-[9px] font-mono text-slate-500">Submit Ticket</span>
            </button>
          </div>
        </div>

        {/* Back and help action buttons */}
        <div className="flex gap-4 pt-1 animate-404-header">
          <button
            onClick={() => window.history.back()}
            className="px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/85 border border-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer transform hover:scale-[1.03] active:scale-95 duration-150 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4 text-teal-400" />
            Recoil To Last View
          </button>
        </div>

      </div>
    </div>
  );
}
