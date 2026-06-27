import React from "react";

interface LogoProps {
  className?: string;
  size?: number | string;
}

// 🏢 JANUZEN Global / Enterprise Corporate Logo
export function JanuzenLogo({ className = "", size = 40 }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="JANUZEN Global Logo"
      className={`inline-block object-contain transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// 🏥 NUTHAN MEDICALS Logo
export function NuthanMedicalsLogo({ className = "", size = 40 }: LogoProps) {
  return (
    <img
      src="/nuthan_medicals.png"
      alt="Nuthan Medicals Logo"
      className={`inline-block object-contain transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// 🖋️ JA STATIONERY Logo
export function JaStationeryLogo({ className = "", size = 40 }: LogoProps) {
  return (
    <img
      src="/ja_stationery.png"
      alt="JA Stationery Logo"
      className={`inline-block object-contain transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}


