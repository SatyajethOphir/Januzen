import React from "react";
import { 
  User, Phone, Bike, MapPin, Compass, ShieldCheck, 
  Trash2, Edit, Plus, X, Loader2, Save, RefreshCw, PhoneCall
} from "lucide-react";

export default function DeliveryTeamPanel() {
  const [partners, setPartners] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingPartner, setEditingPartner] = React.useState<any | null>(null);
  const [isAddingNew, setIsAddingNew] = React.useState(false);

  // Form states
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [vehicle, setVehicle] = React.useState("");
  const [zone, setZone] = React.useState("");
  const [status, setStatus] = React.useState("On Standby");
  const [avatar, setAvatar] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/delivery-partners");
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
      }
    } catch (err) {
      console.error("Error loading delivery partners in panel:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPartners();
  }, []);

  const handleEditClick = (partner: any) => {
    setEditingPartner(partner);
    setIsAddingNew(false);
    setName(partner.name);
    setPhone(partner.phone);
    setVehicle(partner.vehicle);
    setZone(partner.zone || "");
    setStatus(partner.status || "On Standby");
    setAvatar(partner.avatar || "");
    setError("");
    setSuccess("");
  };

  const handleAddNewClick = () => {
    setEditingPartner(null);
    setIsAddingNew(true);
    setName("");
    setPhone("");
    setVehicle("");
    setZone("");
    setStatus("On Standby");
    setAvatar("");
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setEditingPartner(null);
    setIsAddingNew(false);
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Mobile/Phone number is required.");
      return;
    }
    if (!vehicle.trim()) {
      setError("Vehicle details are required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/delivery-partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          vehicle: vehicle.trim(),
          zone: zone.trim() || "Hyderabad, Telangana",
          status,
          avatar: avatar.trim() || name.trim().substring(0, 2).toUpperCase()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(`Successfully saved details for ${name.trim()}`);
        fetchPartners();
        setEditingPartner(null);
        setIsAddingNew(false);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update delivery partner.");
      }
    } catch (err) {
      setError("Server connection issue. Please check network logs.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (partnerName: string) => {
    if (!window.confirm(`Are you sure you want to delete courier officer ${partnerName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/delivery-partners/${encodeURIComponent(partnerName)}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setSuccess(`Successfully deleted partner ${partnerName}`);
        fetchPartners();
      } else {
        setError("Failed to delete courier partner.");
      }
    } catch (err) {
      setError("Failed to reach logistics network server.");
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Subtitle and Actions */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-xl font-black text-gray-900">Manage Logistics Fleet & Dispatch</h2>
          <p className="text-xs text-gray-500 mt-1">Configure duty status, live calling numbers, and vehicle registers for delivery partners.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPartners}
            className="p-2 border bg-white hover:bg-slate-50 text-gray-600 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs"
            title="Refresh List"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleAddNewClick}
            className="bg-[#0F9B8E] hover:bg-[#0C7C72] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" /> Register Fleet Officer
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <X className="h-4.5 w-4.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Panel Content Area */}
      {loading ? (
        <div className="py-20 text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#0F9B8E] mx-auto" />
          <p className="text-xs text-gray-400 font-mono">Querying live dispatch roster...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Fleet List (2 Columns wide on large screens if form is open, otherwise 3 Columns wide) */}
          <div className={`${(editingPartner || isAddingNew) ? "lg:col-span-2" : "lg:col-span-3"} space-y-4`}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {partners.map((partner, i) => (
                <div key={i} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs relative flex flex-col justify-between hover:shadow-md transition-all space-y-4">
                  
                  {/* Partner Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center uppercase shadow-sm border border-slate-700">
                        {partner.avatar || partner.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-serif text-base font-bold text-gray-900 leading-tight">{partner.name}</h3>
                        <p className="text-[10px] text-[#D4820A] font-mono tracking-wider font-semibold uppercase mt-0.5">{partner.vehicle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditClick(partner)}
                        className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-100 transition-all"
                        title="Edit Officer Details"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(partner.name)}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 hover:border-rose-200 rounded-lg border border-transparent transition-all"
                        title="Deregister"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Partner Contact Details */}
                  <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span><b>Phone:</b> <a href={`tel:${partner.phone.replace(/\s+/g, "")}`} className="text-indigo-600 font-mono underline hover:text-indigo-800 inline-flex items-center gap-1 font-bold">{partner.phone} <PhoneCall className="h-3 w-3" /></a></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="line-clamp-1"><b>Coverage:</b> {partner.zone}</span>
                    </div>
                  </div>

                  {/* Partner Status Footer */}
                  <div className="flex justify-between items-center pt-2">
                    <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                      partner.status?.toLowerCase().includes("standby") 
                        ? "bg-amber-50 text-amber-800 border border-amber-200" 
                        : partner.status?.toLowerCase().includes("out") 
                        ? "bg-blue-50 text-blue-800 border border-blue-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}>
                      ● {partner.status || "On Standby"}
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono">Fulfillment Staff</span>
                  </div>

                </div>
              ))}
            </div>
            
            {partners.length === 0 && (
              <div className="bg-slate-50 border border-gray-150 p-10 text-center rounded-2xl space-y-2">
                <User className="h-8 w-8 text-gray-400 mx-auto" />
                <h3 className="font-serif text-base font-bold text-gray-800">No Custom Partners Registered</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">Click "Register Fleet Officer" to configure custom delivery people.</p>
              </div>
            )}
          </div>

          {/* Right Column: Add / Edit Form Sidepanel */}
          {(editingPartner || isAddingNew) && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-right duration-200">
              <div className="flex justify-between items-center pb-3 border-b">
                <h3 className="font-serif text-base font-bold text-gray-900 flex items-center gap-2">
                  <Bike className="h-5 w-5 text-[#0F9B8E]" />
                  {isAddingNew ? "Register New Courier Officer" : "Change Courier Officer Details"}
                </h3>
                <button
                  onClick={handleCancel}
                  className="p-1 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-black transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase">Officer Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    disabled={!isAddingNew} // Primary key/unique identifier on update path
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Satish Chandra"
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-1 focus:ring-[#0F9B8E] outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  {!isAddingNew && (
                    <p className="text-[9px] text-gray-400 font-mono">Registered officer identities cannot be renamed. To rename, register a new profile.</p>
                  )}
                </div>

                {/* Mobile Phone Number */}
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase">Mobile Number (Dynamic Dialing)</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 94440 98765"
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-1 focus:ring-[#0F9B8E] outline-none"
                  />
                  <p className="text-[9px] text-gray-400 leading-normal">Enter the active phone number. Customers can dial this number directly with one tap.</p>
                </div>

                {/* Vehicle Details */}
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase">Vehicle Register details</label>
                  <input
                    type="text"
                    required
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="e.g. Ather 450X (TS-09-EV-9988)"
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-1 focus:ring-[#0F9B8E] outline-none"
                  />
                </div>

                {/* Coverage Zone */}
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase">Fulfillment Zone / Hub Location</label>
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="e.g. Kukatpally & West Hyd"
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-1 focus:ring-[#0F9B8E] outline-none"
                  />
                </div>

                {/* Status Selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase">Active Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-1 focus:ring-[#0F9B8E] outline-none bg-white font-sans"
                  >
                    <option value="Active / On Duty">Active / On Duty</option>
                    <option value="On Standby">On Standby</option>
                    <option value="Active / Out on Delivery">Active / Out on Delivery</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>

                {/* Avatar Initials */}
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase">Visual Avatar Initials (Optional)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="e.g. SC"
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-1 focus:ring-[#0F9B8E] outline-none font-mono"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-grow bg-[#0F9B8E] hover:bg-[#0C7C72] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4.5 w-4.5" /> Save Roster
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2.5 border hover:bg-slate-50 text-gray-600 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
