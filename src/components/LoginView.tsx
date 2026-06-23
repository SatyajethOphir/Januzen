import React from "react";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "../utils/storage";
import { User as UserIcon, Lock, ShieldCheck, Mail, Phone, Book, KeyRound, Check, HelpCircle } from "lucide-react";
import { User } from "../types";
import { JanuzenLogo } from "./Logos";

const SECURITY_QUESTIONS = [
  "What was your childhood nickname?",
  "What is your favorite book?",
  "What was the name of your first school?",
  "What city were you born in?",
  "What is your favorite food?"
];

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  navigationParams: Record<string, any>;
}

export default function LoginView({ onLoginSuccess, onNavigate, navigationParams }: LoginViewProps) {
  const [activeTab, setActiveTab] = React.useState<"login" | "register" | "recover">("login");
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
  const [adminKey, setAdminKey] = React.useState(""); // Secret verification key for registering administrator accounts

  // Password Recovery States
  const [securityQuestion, setSecurityQuestion] = React.useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = React.useState("");
  const [recoveryStep, setRecoveryStep] = React.useState<1 | 2>(1);
  const [newPassword, setNewPassword] = React.useState("");
  const [retrievedQuestion, setRetrievedQuestion] = React.useState("");
  const [recoverySuccess, setRecoverySuccess] = React.useState("");

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setRecoverySuccess("");

    try {
      if (activeTab === "recover") {
        if (recoveryStep === 1) {
          // Retrieve Security Question for email
          const res = await fetch(`/api/auth/security-question?email=${encodeURIComponent(email)}`);
          const data = await res.json();
          if (res.ok) {
            setRetrievedQuestion(data.securityQuestion);
            setRecoveryStep(2);
          } else {
            setErrorMessage(data.error || "No registered accounts found with this email.");
          }
        } else {
          // Run recovery/reset
          const res = await fetch("/api/auth/recover-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, securityAnswer, newPassword })
          });
          const data = await res.json();
          if (res.ok) {
            setRecoverySuccess("✓ Passkey successfully recovered! Please sign in with your updated passkey below.");
            setActiveTab("login");
            setRecoveryStep(1);
            setSecurityAnswer("");
            setNewPassword("");
            setPassword("");
          } else {
            setErrorMessage(data.error || "Incorrect answer code. Passkey recovery verification failed.");
          }
        }
        setLoading(false);
        return;
      }

      const endpoint = activeTab === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload: Record<string, any> = { email, password };

      if (activeTab === "register") {
        payload.name = name;
        payload.phone = phone;
        payload.address = address;
        payload.securityQuestion = securityQuestion;
        payload.securityAnswer = securityAnswer;
        if (isAdminMode) {
          payload.role = "admin";
          payload.adminKey = adminKey;
        } else {
          payload.role = "customer";
        }
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

  const toggleTab = (tab: "login" | "register" | "recover") => {
    setActiveTab(tab);
    setErrorMessage("");
    setRecoverySuccess("");
    setEmail("");
    setPassword("");
    setAdminKey("");
    setSecurityAnswer("");
    setNewPassword("");
    setRecoveryStep(1);
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
        
        {/* Central Logo Indicator banner */}
        <div className="bg-[#0D1B2A] text-white p-6 text-center space-y-3 border-b border-gray-800">
          <div className="flex justify-center">
            <JanuzenLogo size={52} className="hover:scale-105" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold tracking-widest uppercase">JANUZEN Group</h2>
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-[0.2em] block">Central Security Ledger</span>
          </div>
        </div>

        {/* Auth Toggle tabs headers selector */}
        {activeTab !== "recover" && (
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
        )}

        {/* Tab contents forms container */}
        <div className="p-6 space-y-5">
          
          {recoverySuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-mono font-semibold leading-normal">
              {recoverySuccess}
            </div>
          )}

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

          {activeTab === "recover" ? (
            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs font-mono">
              <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 leading-normal mb-2">
                🔒 <strong>Self-service Password Reset:</strong> Provide your registered email address below, then verify the security question you set at registration to recover your passkey.
              </div>

              {/* Email field */}
              <div className="space-y-1">
                <label className="text-gray-400 uppercase tracking-widest font-bold block">Account Portal Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    disabled={recoveryStep === 2}
                    placeholder="name@januzen.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 pl-8 pr-3 py-2 text-sm text-gray-800 rounded-lg focus:outline-none focus:border-slate-850 disabled:opacity-60"
                  />
                  <Mail className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {recoveryStep === 2 && (
                <>
                  {/* Security Question displaying read-only */}
                  <div className="space-y-1 pt-1">
                    <label className="text-slate-500 uppercase tracking-widest font-bold block">Your Established Security Question</label>
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-800 leading-normal text-xs font-sans">
                      ❓ {retrievedQuestion}
                    </div>
                  </div>

                  {/* Security Answer input */}
                  <div className="space-y-1">
                    <label className="text-gray-400 uppercase tracking-widest font-bold block">Security Answer</label>
                    <input
                      type="text"
                      required
                      placeholder="Case-insensitive answer..."
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 px-3 py-2 text-sm text-gray-800 rounded-lg focus:outline-none focus:border-slate-850"
                    />
                  </div>

                  {/* New Password input */}
                  <div className="space-y-1">
                    <label className="text-gray-400 uppercase tracking-widest font-bold block">New confidential Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="At least 6 characters..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-gray-200 pl-8 pr-3 py-2 text-sm text-gray-800 rounded-lg focus:outline-none"
                      />
                      <Lock className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow cursor-pointer transition-colors"
              >
                {loading ? "Checking Database records..." : recoveryStep === 1 ? "Fetch Security Question" : "Reset Portal Passkey"}
              </button>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => toggleTab("login")}
                  className="text-slate-500 hover:text-slate-800 cursor-pointer text-xs underline font-sans"
                >
                  Back to Sign-In
                </button>

                {recoveryStep === 2 && (
                  <button
                    type="button"
                    onClick={() => { setRecoveryStep(1); setSecurityAnswer(""); setNewPassword(""); }}
                    className="text-amber-700 hover:text-amber-900 cursor-pointer text-xs underline font-sans"
                  >
                    Change Email
                  </button>
                )}
              </div>
            </form>
          ) : (
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

                  {/* Security question selection */}
                  <div className="space-y-1">
                    <label className="text-gray-400 uppercase tracking-widest font-bold block">Security Question (For Recovery)</label>
                    <select
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-250 px-2 py-2 text-xs text-gray-700 rounded-lg focus:outline-none focus:border-slate-850 font-sans cursor-pointer"
                    >
                      {SECURITY_QUESTIONS.map((q, i) => (
                        <option key={i} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>

                  {/* Security answer input */}
                  <div className="space-y-1">
                    <label className="text-gray-400 uppercase tracking-widest font-bold block">Security Answer</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Recovery question answer..."
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        className="w-full bg-slate-50 border border-gray-200 pl-8 pr-3 py-2 text-sm text-gray-800 rounded-lg focus:outline-none focus:border-slate-850"
                      />
                      <HelpCircle className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
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
                          placeholder="Enter administrative key..."
                          value={adminKey}
                          onChange={(e) => setAdminKey(e.target.value)}
                          className="w-full bg-orange-50 border border-amber-300 pl-8 pr-3 py-2 text-sm text-[#D4820A] rounded-lg focus:outline-none focus:border-amber-600"
                        />
                        <KeyRound className="h-4 w-4 text-[#D4820A] absolute left-2.5 top-2.5" />
                      </div>
                      <span className="block text-[9px] text-[#D4820A] mt-1 font-sans">
                        * Administrative verification key required for system director privileges.
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

              {activeTab === "login" && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => toggleTab("recover")}
                    className="text-xs text-[#D4820A] font-semibold tracking-wide hover:underline cursor-pointer bg-none border-none p-0 inline-flex items-center gap-1"
                  >
                    🔑 Forgot password? Recover account
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Sandboxed seed list removed for live launch */}

        </div>
      </div>
    </div>
  );
}
