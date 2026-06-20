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
    >
      <defs>
        <linearGradient id="jzGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF9E6" />
          <stop offset="50%" stopColor="#F5B041" />
          <stop offset="100%" stopColor="#D4820A" />
        </linearGradient>
        <linearGradient id="jzTealGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0B5A53" />
          <stop offset="50%" stopColor="#0F9B8E" />
          <stop offset="100%" stopColor="#3FE9D9" />
        </linearGradient>
      </defs>
      {/* Outer elegant nesting hexagon */}
      <polygon
        points="50,5 90,28 90,72 50,95 10,72 10,28"
        stroke="url(#jzGoldGrad)"
        strokeWidth="2.5"
        fill="#050C15"
        strokeLinejoin="round"
      />
      {/* Dynamic interlocking structure J-Z */}
      {/* The 'J' section */}
      <path
        d="M35,30 H55 V62 C55,68 49,72 42,72 C35,72 32,68 32,62"
        stroke="url(#jzTealGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The 'Z' section interlocking */}
      <path
        d="M45,35 H65 L38,65 H58"
        stroke="url(#jzGoldGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    >
      <defs>
        <linearGradient id="medTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3FE9D9" />
          <stop offset="60%" stopColor="#0F9B8E" />
          <stop offset="100%" stopColor="#08524C" />
        </linearGradient>
        <filter id="medGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Safe harbor shield shape representing medical compliance */}
      <path
        d="M50,10 C68,10 82,14 85,32 C85,58 68,80 50,90 C32,80 15,58 15,32 C18,14 32,10 50,10 Z"
        fill="#020C19"
        stroke="#0F9B8E"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Glowing medical cross with curved leaf accents */}
      <path
        d="M50,25 V75 M25,50 H75"
        stroke="url(#medTealGrad)"
        strokeWidth="10"
        strokeLinecap="round"
        filter="url(#medGlow)"
      />
      {/* Dynamic wrap around ribbon/leaves for health vitality */}
      <path
        d="M32,68 C40,75 60,75 68,68 C75,60 75,40 68,32"
        stroke="#3FE9D9"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
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
    >
      <defs>
        <linearGradient id="statGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2CC" />
          <stop offset="50%" stopColor="#D4820A" />
          <stop offset="100%" stopColor="#7E4A01" />
        </linearGradient>
      </defs>
      {/* Opened archival manuscript/journal fold background */}
      <path
        d="M20,20 C32,15 48,22 50,28 C52,22 68,15 80,20 V75 C68,70 52,77 50,71 C48,77 32,70 20,75 Z"
        fill="#0D1117"
        stroke="url(#statGoldGrad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Middle open binding strip */}
      <line x1="50" y1="23" x2="50" y2="73" stroke="#D4820A" strokeWidth="2" strokeDasharray="3,3" />
      
      {/* Exquisite golden calligraphy pen nib pointing down */}
      <path
        d="M50,30 L62,55 H54 V70 L50,74 L46,70 V55 H38 L50,30 Z"
        fill="url(#statGoldGrad)"
        stroke="#000000"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Precision nib slit */}
      <line x1="50" y1="36" x2="50" y2="60" stroke="#0D1117" strokeWidth="1.5" />
      {/* Breather hole */}
      <circle cx="50" cy="46" r="2" fill="#0D1117" />
    </svg>
  );
}
