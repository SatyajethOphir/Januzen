import React from "react";
import { 
  User as UserIcon, Mail, Phone, MapPin, Lock, Camera, Save, ArrowLeft, 
  Sparkles, ShieldCheck, Heart, Trash2, Eye, EyeOff, Upload, Image as ImageIcon
} from "lucide-react";
import { User } from "../types";

// Styled predefined avatar presets
const AVATAR_PRESETS = [
  { name: "Default Blue", url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" },
  { name: "Executive Teal", url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150" },
  { name: "Minimal Warm", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
  { name: "Elegant Editorial", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
  { name: "Soft Clinical", url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" },
  { name: "Creative Bold", url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150" }
];

interface ProfileViewProps {
  currentUser: User | null;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  onUpdateCurrentUser: (user: User) => void;
}

export default function ProfileView({ currentUser, onNavigate, onUpdateCurrentUser }: ProfileViewProps) {
  const [loading, setLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [uploadActive, setUploadActive] = React.useState(false);
  
  // Field States
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  // Sync state with current user prop on mount or update
  React.useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setPhone(currentUser.phone || "");
      setAddress(currentUser.address || "");
      setAvatarUrl(currentUser.image || "");
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center font-sans">
        <div id="no-auth-profile-card" className="bg-card-theme border border-gray-250 p-8 rounded-2xl shadow-xl space-y-6">
          <div className="mx-auto h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-serif font-black uppercase tracking-wider">Access Restricted</h2>
          <p className="text-slate-500 text-xs font-mono leading-relaxed">
            Please authenticate to view administrative profiles and secure customer ledgers.
          </p>
          <button
            onClick={() => onNavigate("login", { redirectAfter: "profile" })}
            className="w-full py-2.5 bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs font-mono uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
          >
            Authenticate Portal
          </button>
        </div>
      </div>
    );
  }

  // Handle local image file uploading and reading into Base64 format
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 2MB threshold. Please supply lighter, optimized files.");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        setSuccessMsg("Local image processed for secure client-side binary storage.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Unable to decode upload file stream.");
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (password && password !== confirmPassword) {
      setErrorMsg("Requested new password and verification string must match.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!token) {
      setErrorMsg("Session token expired. Please re-authenticate.");
      setLoading(false);
      return;
    }

    try {
      const payload: Record<string, any> = {
        name,
        phone,
        address,
        image: avatarUrl
      };

      if (password) {
        payload.password = password;
      }

      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("JANUZEN database records updated successfully.");
        onUpdateCurrentUser(data.user);
        // Save in storage as well for resilience
        const storedUser = localStorage.getItem("januzen_user");
        if (storedUser) {
          localStorage.setItem("januzen_user", JSON.stringify(data.user));
        } else {
          sessionStorage.setItem("januzen_user", JSON.stringify(data.user));
        }
        setPassword("");
        setConfirmPassword("");
      } else {
        setErrorMsg(data.error || "Profile updates refused by database system.");
      }
    } catch (err) {
      setErrorMsg("Unable to negotiate changes with the secure service.");
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans space-y-8">
      
      {/* Dynamic top banner */}
      <div id="profile-banner-back" className="flex items-center justify-between border-b border-gray-250 pb-5">
        <button 
          onClick={() => onNavigate("home")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit Ledger</span>
        </button>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
          User Account Security Workspace
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column: Profile card overview & Image setter */}
        <div className="space-y-6">
          <div id="profile-card-display" className="bg-card-theme border border-gray-250 rounded-2xl shadow p-6 text-center space-y-4">
            
            {/* Avatar block with camera trigger */}
            <div className="relative mx-auto w-28 h-28 rounded-full border-4 border-slate-100 overflow-hidden group shadow-md">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-[#0D1B2A] text-white flex items-center justify-center font-serif text-3xl font-extrabold uppercase">
                  {name.substring(0, 2) || "JZ"}
                </div>
              )}
              
              <label 
                htmlFor="avatar-file-upload" 
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer text-white text-[10px] font-mono"
              >
                <Camera className="h-5 w-5 text-white" />
                <span>Upload Avatar</span>
              </label>
              <input 
                id="avatar-file-upload"
                type="file"
                accept="image/*"
                onChange={handleLocalImageUpload}
                className="hidden" 
              />
            </div>

            <div>
              <h3 className="font-serif text-base font-bold tracking-normal">{name || "Awaiting Name Input"}</h3>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5 mt-1">
                {currentUser.role === "admin" ? "🛡️ System Director" : "🛒 Verified Client Consignee"}
              </p>
            </div>

            <div className="border-t border-gray-150 pt-3 text-left space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate font-mono">{currentUser.email}</span>
              </div>
              {phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate font-mono">{phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick presets drawer */}
          <div id="presets-drawer-card" className="bg-card-theme border border-gray-250 rounded-2xl shadow p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Avatar Presets
              </span>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                Don't have a local image? Pick from these custom designed portrait placeholders:
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatarUrl(preset.url)}
                  title={preset.name}
                  className={`relative h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    avatarUrl === preset.url ? "border-[#0F9B8E] ring-2 ring-[#0F9B8E]/20" : "border-slate-100 hover:border-[#0F9B8E]/40"
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-150">
              <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                Or enter image web URL directly:
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-slate-50/55 border border-gray-200 pl-7 pr-2 py-1.5 text-xs text-slate-600 rounded-lg focus:outline-none"
                />
                <ImageIcon className="h-3 w-3 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
            
          </div>

        </div>

        {/* Right column: Edit forms inside central card */}
        <div className="md:col-span-2">
          
          <form onSubmit={handleProfileSubmit} id="profile-editor-form" className="bg-card-theme border border-gray-250 rounded-2xl shadow p-6 sm:p-8 space-y-6">
            
            <div className="space-y-1 border-b border-gray-150 pb-4">
              <h2 className="font-serif text-lg font-black tracking-wide">Secure Profile Parameters</h2>
              <p className="text-slate-500 text-xs">
                Maintain and audit your general ledger registration data for fast standard dispatches.
              </p>
            </div>

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-mono font-semibold">
                ✓ {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-mono font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase tracking-widest font-bold block">Consignee Full name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="E.g. Satyajeeth Ophir"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-150 pl-8 pr-3 py-2 text-sm text-slate-800 rounded-lg focus:outline-none focus:border-slate-850"
                  />
                  <UserIcon className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Direct Phone */}
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase tracking-widest font-bold block">Direct Mobile Phone</label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="E.g. 09666588553"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-150 pl-8 pr-3 py-2 text-sm text-slate-800 rounded-lg focus:outline-none focus:border-slate-850"
                  />
                  <Phone className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Billing Address */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-slate-400 uppercase tracking-widest font-bold block">Primary Dispatch Address</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Phase-2, Pno 46 street no 5, Samskruthi Avenues Rd., Dwaraka Nagar..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-150 pl-8 pr-3 py-2 text-sm text-slate-800 rounded-lg focus:outline-none focus:border-slate-850 leading-relaxed"
                  />
                  <MapPin className="h-4 w-4 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

            </div>

            {/* Password security update box */}
            <div className="border-t border-gray-150 pt-5 space-y-4">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-800 font-serif">
                  Modify Portal Passkey (Optional)
                </span>
                <p className="text-[10px] text-slate-500">
                  Leave fields empty to retain password codes currently stored on JANUZEN clusters.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase tracking-widest font-bold block">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters recommended..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-150 pl-8 pr-8 py-2 text-sm text-slate-800 rounded-lg focus:outline-none focus:border-slate-850"
                    />
                    <Lock className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase tracking-widest font-bold block">Confirm new password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Match passwords..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-150 pl-8 pr-3 py-2 text-sm text-slate-800 rounded-lg focus:outline-none focus:border-slate-850"
                    />
                    <Lock className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

              </div>
            </div>

            {/* Submission triggers */}
            <div className="flex items-center justify-between border-t border-gray-150 pt-5">
              <span className="text-[10px] text-slate-400 font-mono">
                * Modifications write directly to verified user storage cluster.
              </span>
              <button
                type="submit"
                disabled={loading}
                className={`py-2.5 px-6 bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs font-mono uppercase tracking-widest rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-md ${
                  loading ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <span>Negogiating...</span>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Ledger Changes</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>

    </div>
  );
}
