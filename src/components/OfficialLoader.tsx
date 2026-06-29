import React, { useState, useEffect } from "react";
import { JanuzenLogo } from "./Logos";
import { gsap } from "gsap";

interface OfficialLoaderProps {
  fullScreen?: boolean;
  message?: string;
  progress?: number;
}

export default function OfficialLoader({ fullScreen = true, message, progress: propProgress }: OfficialLoaderProps) {
  const [progress, setProgress] = useState(propProgress !== undefined ? propProgress : 0);
  const [statusText, setStatusText] = useState("Initializing secure enterprise sessions...");

  const statusMessages = [
    "Establishing secure network routing...",
    "Querying pharmaceutical registry at Nuthan Medicals...",
    "Synchronizing JA Stationery ledger indexes...",
    "Confirming cryptographic compliance protocols...",
    "Initializing partner-level asset catalogs...",
    "Connecting to Januzen Global LLP...",
    "Telemetry active. Handshaking secure session..."
  ];

  // Sync state if a real progress is fed from parent
  useEffect(() => {
    if (propProgress !== undefined) {
      setProgress(propProgress);
    }
  }, [propProgress]);

  // If no progress prop is passed, fall back to smooth simulation
  useEffect(() => {
    if (propProgress !== undefined) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 12) + 4;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [propProgress]);

  useEffect(() => {
    const msgIndex = Math.min(
      Math.floor((progress / 100) * statusMessages.length),
      statusMessages.length - 1
    );
    setStatusText(statusMessages[msgIndex]);
  }, [progress]);

  // GSAP animation entrance sequence
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(
      ".gsap-loader-logo",
      { scale: 0.6, opacity: 0, rotate: -15 },
      { scale: 1, opacity: 1, rotate: 0, duration: 0.8, ease: "back.out(1.6)" }
    );
    tl.fromTo(
      ".gsap-loader-title",
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
      "-=0.4"
    );
    tl.fromTo(
      ".gsap-loader-progress-container",
      { scaleX: 0.8, opacity: 0 },
      { scaleX: 1, opacity: 1, duration: 0.5, ease: "power2.out" },
      "-=0.3"
    );
  }, []);

  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050C16] text-[#E0E6ED] px-6 select-none"
    : "w-full min-h-[400px] flex flex-col items-center justify-center p-8 text-[#E0E6ED] select-none";

  return (
    <div className={containerClasses} id="official-loader-screen">
      {/* Visual Elegant Glowing Backdrop */}
      {fullScreen && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>
      )}

      {/* Modern Static/Glow Brand Mark (Professional - Non Bounce) */}
      <div className="relative mb-8 flex items-center justify-center gsap-loader-logo">
        <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-2xl scale-125 animate-pulse"></div>
        <div className="relative p-5 bg-slate-900/75 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-md transition-transform duration-500 hover:scale-[1.02]">
          <JanuzenLogo size={64} className="transition-all" />
        </div>
      </div>

      {/* Branding Header Titles */}
      <div className="text-center space-y-2 max-w-sm z-10 gsap-loader-title">
        <h2 className="text-sm font-sans font-extrabold uppercase tracking-[0.25em] text-[#F5B041]">
          JANUZEN GLOBAL
        </h2>
        <p className="text-xs font-mono text-[#0F9B8E] uppercase tracking-wider font-semibold">
          Consolidated Logistical Portal
        </p>
      </div>

      {/* Progress metrics and animated loading bar */}
      <div className="w-full max-w-[280px] mt-8 space-y-3 z-10 gsap-loader-progress-container">
        <div className="w-full bg-[#0E1B2A] rounded-full h-[6px] overflow-hidden border border-slate-800 p-[1px]">
          <div
            className="bg-gradient-to-r from-[#0F9B8E] via-[#F5B041] to-[#e11d48] h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="animate-pulse">
            {message || statusText}
          </span>
          <span className="font-bold text-slate-300">{Math.min(progress, 100)}%</span>
        </div>
      </div>

      {/* Bottom Legal Consent Token */}
      {fullScreen && (
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-[10px] font-mono text-slate-500 tracking-wider">
            JANUZEN GLOBAL LLP © 2005 - 2026 • Encrypted Management Node
          </p>
        </div>
      )}
    </div>
  );
}
