import React, { useState } from "react";

interface LogoProps {
  className?: string;
  size?: number | string;
}

// 🏢 JANUZEN Global / Enterprise Corporate Logo
export function JanuzenLogo({ className = "", size = 40 }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <img
        src="/logo.png"
        alt="JANUZEN Global Logo"
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`inline-block object-contain transition-transform duration-300 ${className}`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Purely clean elegant modern text-based fallback
  return (
    <div
      style={{ width: size, height: size, fontSize: typeof size === "number" ? size * 0.45 : "16px" }}
      className={`inline-flex items-center justify-center font-serif font-extrabold bg-[#F5B041] text-[#050C15] rounded-xl shadow-inner select-none ${className}`}
    >
      JZ
    </div>
  );
}

// 🏥 NUTHAN MEDICALS Logo
export function NuthanMedicalsLogo({ className = "", size = 40 }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <img
        src="/nuthan_medicals.png"
        alt="Nuthan Medicals Logo"
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`inline-block object-contain transition-transform duration-300 ${className}`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Purely clean elegant modern text-based fallback
  return (
    <div
      style={{ width: size, height: size, fontSize: typeof size === "number" ? size * 0.45 : "16px" }}
      className={`inline-flex items-center justify-center font-medium bg-[#14b8a6] text-white rounded-xl shadow-inner select-none ${className}`}
    >
      NM
    </div>
  );
}

// 🖋️ JA STATIONERY Logo
export function JaStationeryLogo({ className = "", size = 40 }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <img
        src="/ja_stationery.png"
        alt="JA Stationery Logo"
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`inline-block object-contain transition-transform duration-300 ${className}`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Purely clean elegant modern text-based fallback
  return (
    <div
      style={{ width: size, height: size, fontSize: typeof size === "number" ? size * 0.45 : "16px" }}
      className={`inline-flex items-center justify-center font-serif font-bold bg-[#f59e0b] text-white rounded-xl shadow-inner select-none ${className}`}
    >
      JS
    </div>
  );
}

