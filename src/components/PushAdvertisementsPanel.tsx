import React from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { 
  Send, History, Smartphone, Bell, Eye, Users, 
  Loader2, ExternalLink, Calendar, ShieldAlert
} from "lucide-react";
import { Advertisement } from "../types";

export default function PushAdvertisementsPanel({ token }: { token: string | null }) {
  const confirmModalRef = React.useRef<HTMLDivElement>(null);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [subscriberCount, setSubscriberCount] = React.useState<number | null>(null);
  const [history, setHistory] = React.useState<Advertisement[]>([]);
  
  const [loadingCount, setLoadingCount] = React.useState(false);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  useClickOutside(confirmModalRef, () => setShowConfirmModal(false), showConfirmModal);

  React.useEffect(() => {
    if (!showConfirmModal) return;
    confirmModalRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowConfirmModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [showConfirmModal]);
  
  const [errorMsg, setErrorMsg] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");

  // Load subscribers count and ad history
  const fetchData = React.useCallback(async () => {
    if (!token) return;
    
    setLoadingCount(true);
    setLoadingHistory(true);
    setErrorMsg("");
    setSuccessMsg("");
    
    try {
      // 1. Subscriber Count
      const countRes = await fetch("/api/admin/push/subscribers-count", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (countRes.ok) {
        const countData = await countRes.json();
        setSubscriberCount(countData.count);
      }
      
      // 2. Advertisement History
      const historyRes = await fetch("/api/admin/advertisement/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.advertisements || []);
      }
    } catch (err: any) {
      console.error("Error fetching push data:", err);
      setErrorMsg("Failed to synchronize push database entries.");
    } finally {
      setLoadingCount(false);
      setLoadingHistory(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      setErrorMsg("Title and Body are required to send an advertisement.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setShowConfirmModal(true);
  };

  const executeSend = async () => {
    setShowConfirmModal(false);
    setSending(true);
    
    try {
      const res = await fetch("/api/admin/advertisement/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
          linkUrl: linkUrl.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Push notification broadcasted successfully!");
        // Reset form
        setTitle("");
        setBody("");
        setImageUrl("");
        setLinkUrl("");
        // Refresh subscriber count and history list
        fetchData();
      } else {
        setErrorMsg(data.error || "Failed to broadcast push advertisement.");
      }
    } catch (err: any) {
      setErrorMsg("A network error occurred while broadcasting.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm">
        <span className="text-xs font-mono uppercase tracking-widest text-[#D4820A] font-bold">PUSH MARKETING SYSTEM</span>
        <h2 className="font-serif text-xl font-black text-[#0D1B2A] mt-1">Push Notification Advertisement System</h2>
        <p className="text-xs text-gray-500 mt-1">
          Broadcast instant, rich marketing alerts to users even when their browsers are closed or tabs are inactive. Powered by standard W3C Web Push protocol.
        </p>
      </div>

      {subscriberCount === 0 && (
        <div className="bg-[#FFF9E6] border border-[#FFE0B2] p-5 rounded-2xl text-xs text-amber-900 font-sans space-y-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">📢</span>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-950 font-serif text-sm">Why did you not receive any notification on your mobile?</h4>
              <p className="text-amber-800 leading-relaxed">
                Currently, your database has <strong>0 Device Subscriptions</strong>. Because of standard browser safety and sandboxing policies, 
                <strong> push notifications are blocked inside iframes</strong> (like this AI Studio preview).
              </p>
            </div>
          </div>
          <div className="pl-7 space-y-2.5">
            <p className="text-amber-800 leading-relaxed font-semibold">
              To test this on your phone or desktop:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-amber-900/90 leading-relaxed">
              <li>
                Click the button below to **open the app in a new, standalone tab** (this bypasses iframe restrictions).
              </li>
              <li>
                In the top right, click the **Bell icon (Notifications Box)** and tap **"Enable Device Alerts"** (or simply add any product to your bag).
              </li>
              <li>
                When your mobile browser prompts you, tap **"Allow"** to authorize notifications on your device.
              </li>
              <li>
                Once done, refresh this page! The **Target Audience** count will increase from `0` to `1+`, and you can test-broadcast your push advertisements successfully.
              </li>
            </ol>
            <div className="pt-1">
              <a 
                href={window.location.origin} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1.5 bg-[#D4820A] hover:bg-[#B76E04] text-white font-bold uppercase text-[10px] tracking-widest px-4.5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Open App in New Tab ↗
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form / Compose & Live Preview (span 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Form Card */}
          <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-gray-950 flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <Smartphone className="h-5 w-5 text-indigo-600" />
              Compose Promotional Broadcast
            </h3>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-sans">
                ⚠️ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-250 rounded-xl text-xs text-emerald-800 font-sans">
                ✓ {successMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Notification Title (Max 60 characters)
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., 🔥 Weekend Flash Sale: Flat 20% Off!"
                  className="w-full text-xs border border-gray-250 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Message Body (Max 150 characters)
                </label>
                <textarea
                  maxLength={150}
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="e.g., Get flat discounts across all medical and stationery categories today. Limited time offer."
                  className="w-full text-xs border border-gray-250 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Banner Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="e.g., https://januzen.in/promo.jpg"
                    className="w-full text-xs border border-gray-250 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Redirect Destination URL
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="e.g., https://januzen.in/shop"
                    className="w-full text-xs border border-gray-250 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Broadcast Button */}
            <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-gray-150 px-3 py-2 rounded-xl text-xs">
                <Users className="h-4 w-4 text-slate-500" />
                <span className="font-sans text-gray-500">
                  Target Audience:{" "}
                  <strong className="text-[#0D1B2A]">
                    {loadingCount ? (
                      <Loader2 className="h-3 w-3 inline animate-spin text-indigo-600" />
                    ) : subscriberCount !== null ? (
                      `${subscriberCount} Device Subscription(s)`
                    ) : (
                      "0 Devices"
                    )}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                disabled={sending || loadingCount || !title.trim() || !body.trim()}
                onClick={handleSendBroadcast}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Send Marketing Push</span>
              </button>
            </div>
          </div>

          {/* Live Mobile Notification Mock Preview */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <h4 className="font-mono text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-emerald-400" />
                Real-Time Device Preview (iOS & Android)
              </h4>
              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded-md text-slate-400">
                W3C Rich Display
              </span>
            </div>

            {/* Simulated Notification Card */}
            <div className="max-w-md mx-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex gap-3">
              {/* App Icon */}
              <div className="h-9 w-9 bg-[#0D1B2A] rounded-xl flex items-center justify-center border border-slate-700 shrink-0 overflow-hidden shadow-inner">
                <img 
                  src="/appicon.png" 
                  alt="JANUZEN" 
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    const target = e.target as HTMLElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerText = "JZ";
                      parent.className += " font-serif font-black text-xs text-white";
                    }
                  }}
                />
              </div>

              {/* Notification Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-xs text-white truncate pr-2">
                    {title.trim() || "JANUZEN | Promotion Name"}
                  </span>
                  <span className="text-[9px] text-slate-500 font-sans shrink-0 whitespace-nowrap">
                    Just now
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed break-words">
                  {body.trim() || "Promotional marketing message body text will render exactly here when composed..."}
                </p>

                {/* Optional Banner Image Preview */}
                {imageUrl && (
                  <div className="mt-2.5 rounded-lg overflow-hidden border border-slate-800 max-h-36 bg-slate-900">
                    <img 
                      src={imageUrl} 
                      alt="Banner Preview" 
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                <div className="pt-1.5 flex items-center gap-1 text-[9px] text-indigo-400 font-mono">
                  <span>Redirects to:</span>
                  <span className="truncate max-w-xs">{linkUrl || "https://januzen.in"}</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Broadcast History logs (span 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
              <h3 className="font-serif text-base font-bold text-gray-950 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                Broadcast Log History
              </h3>
              <button
                onClick={fetchData}
                className="text-[10px] font-mono text-indigo-600 hover:underline cursor-pointer"
              >
                Sync Logs
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-[10px] text-gray-400 font-mono mt-2">Loading logs from server...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-xl space-y-2">
                <Bell className="h-8 w-8 text-slate-300 mx-auto animate-pulse" />
                <p className="text-xs font-serif font-black text-slate-400">No sent advertisements found</p>
                <p className="text-[10px] text-gray-400 max-w-[200px] mx-auto leading-relaxed">
                  Sent campaigns automatically expire and clear after 48 hours.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
                {history.map((ad) => {
                  const sentDate = new Date(ad.sentAt);
                  const expiryDate = new Date(ad.expiresAt);
                  const minutesLeft = Math.max(0, Math.round((expiryDate.getTime() - Date.now()) / (1000 * 60)));
                  const hoursLeft = Math.round((minutesLeft / 60) * 10) / 10;
                  
                  return (
                    <div 
                      key={ad.id} 
                      className="p-3.5 bg-slate-50 border border-gray-150 rounded-xl space-y-2 transition-all hover:border-indigo-200"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-serif font-bold text-xs text-gray-900 truncate">
                          {ad.title}
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-[#E8F5E9] text-[#2E7D32] px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <Users className="h-2.5 w-2.5" />
                          {ad.recipientCount}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-gray-650 leading-relaxed line-clamp-2">
                        {ad.body}
                      </p>

                      <div className="pt-2 border-t border-gray-200/60 flex flex-wrap gap-2 justify-between items-center text-[9px] font-mono text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {sentDate.toLocaleDateString()} {sentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        <span className="text-slate-500 font-bold">
                          {hoursLeft > 0 ? `Expires in ${hoursLeft} hrs` : "Expired"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowConfirmModal(false)}
            onTouchStart={() => setShowConfirmModal(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none animate-fade-in">
            <div ref={confirmModalRef} tabIndex={-1} className="pointer-events-auto outline-none bg-white rounded-2xl border border-gray-200 p-6 shadow-2xl max-w-md w-full space-y-4 font-sans text-slate-900">
            <div className="flex items-center gap-3 text-amber-600 border-b border-gray-100 pb-3">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 className="font-serif text-lg font-bold">Confirm Broadcast Campaign</h3>
            </div>
            
            <p className="text-xs text-gray-650 leading-relaxed">
              You are about to broadcast this promotional push advertisement immediately to all{" "}
              <strong className="text-gray-900">{subscriberCount ?? "0"}</strong> active device subscription(s). 
              This operation cannot be undone. Do you wish to continue?
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-gray-150 space-y-1">
              <div className="text-[10px] font-mono text-gray-400 font-bold uppercase">CAMPAIGN TITLE:</div>
              <div className="text-xs font-serif font-bold text-gray-950">{title}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-250 text-gray-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSend}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer shadow-sm transition-colors"
              >
                Yes, Send Broadcast
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
