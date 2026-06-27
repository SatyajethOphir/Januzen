import React from "react";

interface LogoProps {
  className?: string;
  size?: number | string;
}

// 🏢 JANUZEN Global / Enterprise Corporate Logo
export function JanuzenLogo({ className = "", size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id="januzenGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5B041" />
          <stop offset="100%" stopColor="#D4820A" />
        </linearGradient>
        <linearGradient id="januzenDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      {/* Outer Hexagon / Shield Frame */}
      <polygon
        points="50,5 90,28 90,72 50,95 10,72 10,28"
        fill="url(#januzenDarkGrad)"
        stroke="url(#januzenGoldGrad)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Inner interlocking crest representing J and Z */}
      <path
        d="M32 30 H68 L50 50 L32 70 H68"
        stroke="url(#januzenGoldGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Decorative center diamond dot */}
      <circle cx="50" cy="50" r="5" fill="#F5B041" />
    </svg>
  );
}

// 🏥 NUTHAN MEDICALS Logo
export function NuthanMedicalsLogo({ className = "", size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id="medicalTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      {/* Smooth Rounded Box Container */}
      <rect x="8" y="8" width="84" height="84" rx="20" fill="#0F172A" stroke="url(#medicalTealGrad)" strokeWidth="4" />
      {/* High Contrast Medical Cross with integrated leaf motif */}
      <path
        d="M50 22 V78 M22 50 H78"
        stroke="url(#medicalTealGrad)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Inner Healing Leaf design across center */}
      <path
        d="M38 62 C38 48 48 38 62 38 C62 52 52 62 38 62 Z"
        fill="#10B981"
        opacity="0.85"
      />
      {/* Elegant diagnostic circular pulse overlay */}
      <circle cx="50" cy="50" r="32" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.4" />
    </svg>
  );
}

// 🖋️ JA STATIONERY Logo
export function JaStationeryLogo({ className = "", size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id="stationeryAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      {/* Elegant Archival Shield Frame */}
      <path
        d="M50 8 C68 8 84 16 84 38 C84 65 65 84 50 92 C35 84 16 65 16 38 C16 16 32 8 50 8 Z"
        fill="#0F172A"
        stroke="url(#stationeryAmberGrad)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Stylized Fountain Pen Nib */}
      <path
        d="M50 24 L70 56 H60 V76 H40 V56 H30 L50 24 Z"
        fill="url(#stationeryAmberGrad)"
      />
      {/* Precision Ink Splitter line */}
      <line x1="50" y1="28" x2="50" y2="52" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
      {/* Nib Breather hole */}
      <circle cx="50" cy="52" r="3.5" fill="#0F172A" />
      {/* Book / Archival lines ornament */}
      <path d="M35 80 H65 M38 85 H62" stroke="url(#stationeryAmberGrad)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

