import React from "react";
import { User as UserIcon, Lock, ShieldCheck, Mail, Phone, Book, KeyRound, Check } from "lucide-react";
import { User } from "../types";

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  navigationParams: Record<string, any>;
}

export default function LoginView({ onLoginSuccess, onNavigate, navigationParams }: LoginViewProps) {
  const [activeTab, setActiveTab] = React.useState<"login" | "register">("login");
  const [isAdminMode, setIsAdminMode] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  // Input states
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [adminKey, setAdminKey] = React.useState(""); // Password code matching "JANUZEN_ADMIN_CONFIDENTIAL"

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const endpoint = activeTab === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload: Record<string, any> = { email, password };

      if (activeTab === "register") {
        payload.name = name;
        payload.phone = phone;
        payload.address = address;
        if (isAdminMode) {
          payload.role = "admin";
          payload.adminKey = adminKey;
        } else {
          payload.role = "customer";
        }
      } else {
        // If logging in, the backend handles any role logged in email.
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        if (rememberMe) {
          localStorage.setItem("januzen_token", data.token);
          localStorage.setItem("januzen_user", JSON.stringify(data.user));
        } else {
          sessionStorage.setItem("januzen_token", data.token);
          sessionStorage.setItem("januzen_user", JSON.stringify(data.user));
        }

        onLoginSuccess(data.user, data.token);

        // Redirect logic support
        if (navigationParams.redirectAfter) {
          onNavigate(navigationParams.redirectAfter);
        } else {
          onNavigate(data.user.role === "admin" ? "admin" : "home");
        }
      } else {
        setErrorMessage(data.error || "Authentication failed. Double check credentials.");
      }
    } catch (err) {
      setErrorMessage("Could not establish connection with backend system ledger.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTab = (tab: "login" | "register") => {
    setActiveTab(tab);
    setErrorMessage("");
    setEmail("");
    setPassword("");
    setAdminKey("");
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
        
        {/* Central Logo Indicator banner */}
        <div className="bg-[#0D1B2A] text-white p-6 text-center space-y-2 border-b border-gray-800">
          <div className="mx-auto h-12 w-12 bg-white rounded-xl flex items-center justify-center text-[#0D1B2A] font-serif font-black text-2xl shadow">
            JZ
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold tracking-widest uppercase">JANUZEN Group</h2>
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-[0.2em] block">Central Security Ledger</span>
          </div>
        </div>

        {/* Auth Toggle tabs headers selector */}
        <div className="flex border-b border-gray-150">
          <button
            onClick={() => toggleTab("login")}
            className={`flex-1 py-3 text-xs uppercase tracking-wider font-bold transition-colors ${
              activeTab === "login" 
                ? "bg-white text-slate-900 border-b-2 border-slate-900" 
                : "bg-slate-50 text-gray-400 hover:bg-slate-100/50"
            }`}
          >
            Sign-In
          </button>
          <button
            onClick={() => toggleTab("register")}
            className={`flex-1 py-3 text-xs uppercase tracking-wider font-bold transition-colors ${
              activeTab === "register" 
                ? "bg-white text-slate-900 border-b-2 border-slate-900" 
                : "bg-slate-50 text-gray-400 hover:bg-slate-100/50"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Tab contents forms container */}
        <div className="p-6 space-y-5">
          
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-mono font-semibold animate-pulse leading-normal">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Admin Mode Trigger toggle badge specifically for registrations */}
          {activeTab === "register" && (
            <div className="flex items-center justify-between bg-slate-50 border border-gray-150 p-2.5 rounded-xl">
              <span className="text-xs text-gray-600 font-mono font-medium">Join as Administrative Suite?</span>
              <button
                type="button"
                onClick={() => { setIsAdminMode(!isAdminMode); setAdminKey(""); }}
                className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md tracking-wider border transition-colors ${
                  isAdminMode 
                    ? "bg-[#D4820A] text-white border-amber-600 shadow-sm" 
                    : "bg-white text-gray-500 border-gray-200"
                }`}
              >
                {isAdminMode ? "Admin Active" : "Customer Mode"}
              </button>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs font-mono">
            {/* Name parameters (Registration specific) */}
            {activeTab === "register" && (
              <div className="space-y-1">
                <label className="text-gray-400 uppercase tracking-widest font-bold block">Consignee Full Year Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Satyajeeth Ophir..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 pl-8 pr-3 py-2 text-sm text-gray-800 rounded-lg focus:outline-none focus:border-slate-850"
                  />
                  <UserIcon className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1">
              <label className="text-gray-400 uppercase tracking-widest font-bold block">Account Portal Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@januzen.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 pl-8 pr-3 py-2 text-sm text-gray-800 rounded-lg focus:outline-none focus:border-slate-850"
                />
                <Mail className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <label className="text-gray-400 uppercase tracking-widest font-bold block">Confidential Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Minimum characters..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 pl-8 pr-3 py-2 text-sm text-gray-800 rounded-lg focus:outline-none focus:border-slate-850"
                />
                <Lock className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Additional parameters (Registration specifics) */}
            {activeTab === "register" && (
              <>
                {/* Telephone */}
                <div className="space-y-1">
                  <label className="text-gray-400 uppercase tracking-widest font-bold block">Direct Mobile Phone</label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="+91 94433 2XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 pl-8 pr-3 py-2 text-sm text-gray-800 rounded-lg focus:outline-none focus:border-slate-850"
                    />
                    <Phone className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Shipping address */}
                <div className="space-y-1">
                  <label className="text-gray-400 uppercase tracking-widest font-bold block">Main Billing Address</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Street name, landmark..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 pl-8 pr-3 py-2 text-sm text-gray-800 rounded-lg focus:outline-none focus:border-slate-850"
                    />
                    <Book className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Secret Admin Verification Key */}
                {isAdminMode && (
                  <div className="space-y-1">
                    <label className="text-[#D4820A] uppercase tracking-widest font-bold block">Administrative Code Key</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="JANUZEN_ADMIN_CONFIDENTIAL"
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        className="w-full bg-orange-50 border border-amber-300 pl-8 pr-3 py-2 text-sm text-[#D4820A] rounded-lg focus:outline-none focus:border-amber-600"
                      />
                      <KeyRound className="h-4 w-4 text-[#D4820A] absolute left-2.5 top-2.5" />
                    </div>
                    <span className="block text-[9px] text-[#D4820A] mt-1 font-sans">
                      * Supply `JANUZEN_ADMIN_CONFIDENTIAL` secret value to bypass access blockades.
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Remember Me controls */}
            <div className="flex items-center justify-between py-1 border-t border-gray-50 pt-3 select-none">
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-500 font-medium font-sans">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-[#0D1B2A] focus:ring-[#0D1B2A] cursor-pointer"
                />
                Remember Me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow cursor-pointer transition-colors ${
                loading ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Verifying Credentials..." : activeTab === "login" ? "Access central lobby" : "Provision Profile Account"}
            </button>
          </form>

          {/* Seed accounts reminders specifically for AI Studio environment visibility */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl space-y-1 text-slate-600 text-[11px] leading-normal font-sans">
            <span className="font-extrabold text-[#0D1B2A] uppercase tracking-wider block font-mono text-[9px]">🔍 Sandboxed Seed accounts:</span>
            <div className="space-y-1 leading-normal font-mono text-[10px]">
              <div>• Admin email: <span className="font-bold text-teal-700">admin@januzen.com</span> (Pwd: <span className="font-bold text-teal-700">admin123</span>)</div>
              <div>• Customer email: <span className="font-bold text-amber-700">satyajeeth.ophir@gmail.com</span> (Pwd: <span className="font-bold text-amber-700">user123</span>)</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
