import React from "react";
import { 
  TrendingUp, Activity, BookOpen, AlertCircle, Eye, Trash2, Check, CreditCard, 
  Settings, Users, ShoppingBag, MessageSquare, PlusCircle, Search, Edit2, RotateCcw,
  Mail, Phone, MapPin, X, Loader2, Upload
} from "lucide-react";
import { Product, Order, Message, User } from "../types";

export default function AdminDashboardView() {
  const [activeTab, setActiveTab] = React.useState<"stats" | "products" | "orders" | "messages" | "users">("stats");
  const [token, setToken] = React.useState<string | null>(null);

  // States
  const [stats, setStats] = React.useState<any>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Product Inventory Search & Filter state
  const [prodSearch, setProdSearch] = React.useState("");
  const [prodShopFilter, setProdShopFilter] = React.useState("");

  // Product CRUD Form Modal State
  const [showFormModal, setShowFormModal] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [formPrice, setFormPrice] = React.useState("");
  const [formCategory, setFormCategory] = React.useState("");
  const [formShop, setFormShop] = React.useState<"medicals" | "stationery">("medicals");
  const [formStock, setFormStock] = React.useState("");
  const [formImage, setFormImage] = React.useState("");
  const [formTags, setFormTags] = React.useState("");
  const [formFeatured, setFormFeatured] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState("");

  // Load everything
  const fetchAllData = React.useCallback(async (userToken: string) => {
    setLoading(true);
    try {
      const headers = { "Authorization": `Bearer ${userToken}` };
      
      // Load stats
      const statsRes = await fetch("/api/admin/stats", { headers });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // Load products
      const prodRes = await fetch("/api/products?limit=200"); // load all including inactives
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }

      // Load orders
      const orderRes = await fetch("/api/admin/orders", { headers });
      if (orderRes.ok) {
        setOrders(await orderRes.json());
      }

      // Load messages
      const msgRes = await fetch("/api/admin/messages", { headers });
      if (msgRes.ok) {
        setMessages(await msgRes.json());
      }

      // Load users
      const userRes = await fetch("/api/admin/users", { headers });
      if (userRes.ok) {
        setUsers(await userRes.json());
      }

    } catch (err) {
      console.error("Critical: failed to fetch admin stats data grids:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const savedToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    setToken(savedToken);
    if (savedToken) {
      fetchAllData(savedToken);
    }
  }, [fetchAllData]);

  if (!token) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-gray-150 p-8 rounded-xl text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h3 className="font-serif text-lg font-bold">Unauthenticated Access block</h3>
        <p className="text-xs text-gray-500">Only authorized administrative staff can access stats dashboards.</p>
      </div>
    );
  }

  // --- ORDER MODIFICATION ---
  const handleOrderStatusUpdate = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAllData(token);
      }
    } catch (err) {
      alert("Failed to modify order status specifications.");
    }
  };

  // --- MESSAGES READ/DELETE ---
  const handleMarkMessageRead = async (msgId: string) => {
    try {
      const res = await fetch(`/api/admin/messages/${msgId}/read`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAllData(token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Are you sure you want to permanently purge this message enquiry?")) return;
    try {
      const res = await fetch(`/api/admin/messages/${msgId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAllData(token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- PRODUCT CRUD OPERATIONS ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image.");
      }

      setFormImage(data.url);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "An unexpected error occurred during image upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenAddForm = () => {
    setEditingProduct(null);
    setFormName("");
    setFormDesc("");
    setFormPrice("");
    setFormCategory("");
    setFormShop("medicals");
    setFormStock("");
    setFormImage("");
    setFormTags("");
    setFormFeatured(false);
    setIsUploading(false);
    setUploadError("");
    setShowFormModal(true);
  };

  const handleOpenEditForm = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormPrice(String(p.price));
    setFormCategory(p.category);
    setFormShop(p.shop);
    setFormStock(String(p.stock));
    setFormImage(p.image);
    setFormTags(p.tags.join(", "));
    setFormFeatured(p.featured);
    setIsUploading(false);
    setUploadError("");
    setShowFormModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formName,
      description: formDesc,
      price: formPrice,
      category: formCategory,
      shop: formShop,
      stock: formStock,
      image: formImage,
      tags: formTags.split(",").map(t => t.trim()),
      featured: formFeatured
    };

    try {
      const endpoint = editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowFormModal(false);
        fetchAllData(token);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Save operation failed.");
      }
    } catch (err) {
      alert("Failed to communicate with master warehouse registry database.");
    }
  };

  const handleSoftDeleteProduct = async (pid: string) => {
    if (!confirm("Are you sure you want to soft delete this item? It will be marked inactive and hidden from shop displays.")) return;
    try {
      const res = await fetch(`/api/admin/products/${pid}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAllData(token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter products locally for table rendering
  const filteredProducts = products.filter(p => {
    const textMatch = p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.category.toLowerCase().includes(prodSearch.toLowerCase());
    const shopMatch = prodShopFilter === "" || p.shop === prodShopFilter;
    return textMatch && shopMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Dashboard Top Navigation bar with summary icons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-150 pb-5">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#D4820A] font-bold">ADMINISTRATION CONTROL CABINET</span>
          <h1 className="font-serif text-3xl font-black text-gray-950 flex items-center gap-2">
            <Settings className="h-7 w-7 text-slate-800 animate-spin-slow" />
            JANUZEN Control Center
          </h1>
        </div>
        
        {/* Rapid selectors menu */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          {(["stats", "products", "orders", "messages", "users"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all capitalize cursor-pointer ${
                activeTab === tab 
                  ? "bg-[#0D1B2A] text-white shadow-sm" 
                  : "text-gray-500 hover:text-black hover:bg-white/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#0D1B2A] mx-auto" />
          <p className="mt-4 text-xs font-mono text-gray-400">Synchronizing master administrator files...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* TAB 1: LIVE STATISTS METRIKS */}
          {activeTab === "stats" && stats && (
            <div className="space-y-8">
              {/* Stat Counters Row */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-gray-200/80 p-5 rounded-2xl shadow-sm text-center">
                  <ShoppingBag className="h-6 w-6 text-[#0F9B8E] mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-mono uppercase font-bold block">Consolidated Sales</span>
                  <span className="font-serif text-3xl font-black text-slate-900 block mt-1">{stats.metrics.totalOrders}</span>
                </div>
                <div className="bg-white border border-gray-200/80 p-5 rounded-2xl shadow-sm text-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-mono uppercase font-bold block">Gross Revenue</span>
                  <span className="font-serif text-3xl font-black text-[#0D1B2A] block mt-1">${stats.metrics.revenue.toFixed(2)}</span>
                </div>
                <div className="bg-white border border-gray-200/80 p-5 rounded-2xl shadow-sm text-center">
                  <Users className="h-6 w-6 text-[#D4820A] mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-mono uppercase font-bold block">Users Registered</span>
                  <span className="font-serif text-3xl font-black text-slate-900 block mt-1">{stats.metrics.totalUsers}</span>
                </div>
                <div className="bg-white border border-gray-200/80 p-5 rounded-2xl shadow-sm text-center">
                  <AlertCircle className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-mono uppercase font-bold block">Low Stock Alerts</span>
                  <span className="font-serif text-3xl font-black text-orange-600 block mt-1">{stats.metrics.lowStockCount}</span>
                </div>
                <div className="bg-white border border-gray-200/80 p-5 rounded-2xl shadow-sm text-center col-span-2 lg:col-span-1">
                  <MessageSquare className="h-6 w-6 text-indigo-500 mx-auto mb-2" />
                  <span className="text-[10px] text-gray-400 font-mono uppercase font-bold block">Unread Enquiries</span>
                  <span className="font-serif text-3xl font-black text-indigo-600 block mt-1">{stats.metrics.unreadMessages}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual tables: Low stock alerts */}
                <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-serif text-lg font-extrabold text-[#0D1B2A] border-b border-gray-100 pb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Low Stock Restock Alerts (stock &lt; 5)
                  </h3>
                  {stats.lowStockAlerts.length === 0 ? (
                    <p className="text-xs text-gray-400 font-mono">Pristine stock levels. No warnings reported.</p>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                      {stats.lowStockAlerts.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center py-2.5 text-xs">
                          <div className="flex gap-2 items-center">
                            <img src={p.image} referrerPolicy="no-referrer" className="h-8 w-8 object-cover rounded border" />
                            <div>
                              <span className="font-bold text-gray-900 block">{p.name}</span>
                              <span className="text-[9px] uppercase font-mono text-gray-400">{p.shop} Division</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-red-50 border border-red-150 text-red-700 font-mono font-black rounded">
                            {p.stock} left
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Orders log */}
                <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-serif text-lg font-extrabold text-[#0D1B2A] border-b border-gray-100 pb-3 flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-emerald-600" />
                    Recent Live Store Dispatches
                  </h3>
                  <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {stats.recentOrders.map((o: any) => (
                      <div key={o.id} className="flex justify-between items-center py-3 text-xs">
                        <div>
                          <span className="font-mono font-bold text-slate-900 block">{o.orderId}</span>
                          <span className="text-gray-400 font-mono text-[10px] block">{o.userName} • {o.items.length} positions</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-extrabold text-[#0D1B2A] block">${o.totals.total.toFixed(2)}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            o.status === "Delivered" ? "bg-emerald-50 text-emerald-800 border border-emerald-250" : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}>
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCT CRUD WAREHOUSE LISTING */}
          {activeTab === "products" && (
            <div className="space-y-6">
              
              {/* Top controls */}
              <div className="bg-white border border-gray-150 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <input
                      type="text"
                      placeholder="Search inventory SKU or names..."
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                      className="bg-slate-50 border border-gray-200 text-xs py-2 pl-8 pr-3 rounded-lg focus:outline-none w-full sm:w-56"
                    />
                    <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  </div>

                  <select
                    value={prodShopFilter}
                    onChange={(e) => setProdShopFilter(e.target.value)}
                    className="bg-slate-50 border border-gray-200 text-xs py-2 px-3 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="">All Divisions</option>
                    <option value="medicals">Nuthan Medicals</option>
                    <option value="stationery">JA Stationery</option>
                  </select>
                </div>

                <button
                  onClick={handleOpenAddForm}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg flex items-center gap-1.5 shadow"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add New Product
                </button>
              </div>

              {/* Data Table */}
              <div className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-gray-500 font-mono font-bold uppercase tracking-wider border-b border-gray-150 bg-slate-100/80">
                        <th className="p-4">SKU / Item</th>
                        <th className="p-4">Division</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Price</th>
                        <th className="p-4 text-center">Warehouse Stock</th>
                        <th className="p-4 text-center">Displays Active?</th>
                        <th className="p-4 text-right">Settings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className={!p.isActive ? "bg-red-50/20 text-gray-400" : ""}>
                          
                          <td className="p-4">
                            <div className="flex gap-3 items-center">
                              <img src={p.image} referrerPolicy="no-referrer" className="h-10 w-10 object-cover rounded border" />
                              <div className="max-w-xs">
                                <span className="font-extrabold text-slate-850 block line-clamp-1">{p.name}</span>
                                <span className="text-[9px] text-gray-400 block font-mono font-bold uppercase">ID: {p.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 capitalize">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${
                              p.shop === "medicals" ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800"
                            }`}>
                              {p.shop}
                            </span>
                          </td>

                          <td className="p-4 text-slate-600 font-medium">{p.category}</td>
                          <td className="p-4 font-mono font-bold">${p.price.toFixed(2)}</td>
                          <td className="p-4 text-center font-mono font-bold">
                            <span className={p.stock < 5 ? "text-orange-600 animate-pulse bg-orange-50 px-2 py-0.5 rounded border border-orange-200" : "text-gray-950"}>
                              {p.stock} qty
                            </span>
                          </td>

                          <td className="p-4 text-center">
                            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${p.isActive ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`} />
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditForm(p)}
                                className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded text-gray-600 flex items-center gap-1 cursor-pointer font-bold"
                              >
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </button>
                              {p.isActive && (
                                <button
                                  onClick={() => handleSoftDeleteProduct(p.id)}
                                  className="p-1 px-2 border border-red-200 text-red-500 hover:bg-red-50 rounded flex items-center gap-1 cursor-pointer font-bold"
                                  title="Soft Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS DISPATCH */}
          {activeTab === "orders" && (
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm space-y-6 p-6">
              <h2 className="font-serif text-lg font-bold text-[#0D1B2A] border-b border-gray-100 pb-3">Logistics Dispatch Center</h2>

              {orders.length === 0 ? (
                <p className="text-sm text-gray-400 font-mono">No order logs recorded in server register.</p>
              ) : (
                <div className="divide-y divide-gray-100 space-y-4 max-h-[500px] overflow-y-auto">
                  {orders.map((o) => (
                    <div key={o.id} className="py-4 grid grid-cols-1 md:grid-cols-4 gap-6 items-start text-xs font-mono">
                      
                      {/* Left: General Order details */}
                      <div className="space-y-1 sm:col-span-1">
                        <span className="text-[10px] font-bold text-gray-400">ORDER LOG</span>
                        <h4 className="text-sm font-black text-slate-900">{o.orderId}</h4>
                        <div className="text-gray-500 leading-normal font-sans pt-1 space-y-0.5">
                          <p>Customer: <span className="font-bold">{o.userName}</span></p>
                          <p>Email: <span className="font-semibold">{o.userEmail}</span></p>
                          <p>Phone: <span className="font-semibold">{o.shippingAddress.phone}</span></p>
                        </div>
                      </div>

                      {/* Center: Cargo positions */}
                      <div className="space-y-1 sm:col-span-1">
                        <span className="text-[10px] font-bold text-gray-400">CARGO POSITIONS ({o.items.length})</span>
                        <div className="space-y-1.5 select-all leading-relaxed font-sans pt-1">
                          {o.items.map((it, idx) => (
                            <div key={idx} className="text-[11px] text-gray-600">
                              • {it.name} <span className="font-bold text-black">(x{it.quantity})</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right-Center: Pricing and Destination */}
                      <div className="space-y-1 sm:col-span-1 leading-relaxed">
                        <span className="text-[10px] font-bold text-gray-400">BILLING & ADDRESS</span>
                        <p className="font-bold text-slate-850">Total Bill: ${o.totals.total.toFixed(2)}</p>
                        <p className="text-gray-500 font-sans text-[11px] mt-1 pr-2">
                          Address: {o.shippingAddress.addressLine}, {o.shippingAddress.city} - {o.shippingAddress.postalCode}
                        </p>
                      </div>

                      {/* Far-Right: Status selection widgets */}
                      <div className="space-y-2 sm:col-span-1 text-right">
                        <span className="text-[10px] font-bold text-gray-400 block pb-1">COURIER DISPATCH CONTROL</span>
                        <div className="flex flex-col sm:items-end gap-1.5 font-sans">
                          <select
                            value={o.status}
                            onChange={(e) => handleOrderStatusUpdate(o.id, e.target.value)}
                            className={`p-1.5 border rounded text-xs font-bold focus:outline-none cursor-pointer w-full sm:w-36 text-center ${
                              o.status === "Delivered" ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
                              o.status === "Cancelled" ? "bg-red-50 text-red-800 border-red-300" :
                              o.status === "Dispatched" ? "bg-blue-50 text-blue-800 border-blue-300" :
                              "bg-purple-50 text-purple-800 border-purple-300"
                            }`}
                          >
                            <option value="Pending">Pending Audit</option>
                            <option value="Dispatched">Dispatched</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                          <span className="block text-[8px] font-mono text-gray-400 uppercase leading-normal">
                            * UPDATING TRIGGERS BROADCAST EMAIL
                          </span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ENQUIRIES INBOX */}
          {activeTab === "messages" && (
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="font-serif text-lg font-bold text-[#0D1B2A] border-b border-gray-100 pb-3">Enquiries Registry Inbox</h2>

              {messages.length === 0 ? (
                <p className="text-sm text-gray-400 font-mono">No customer enquiries received.</p>
              ) : (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto font-mono text-xs">
                  {messages.map((m) => (
                    <div key={m.id} className={`py-4 flex flex-col sm:flex-row justify-between items-start gap-4 ${!m.isRead ? "bg-indigo-50/15 p-3 rounded-lg" : ""}`}>
                      <div className="space-y-1 max-w-xl">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase ${
                            m.shop === "medicals" ? "bg-teal-50 text-teal-800 border border-teal-200" :
                            m.shop === "stationery" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                            "bg-slate-100 text-slate-800"
                          }`}>
                            {m.shop}
                          </span>
                          {!m.isRead && (
                            <span className="px-1.5 py-0.5 bg-indigo-600 text-white font-black rounded text-[8px] tracking-wider animate-pulse uppercase">NEW</span>
                          )}
                          <span className="text-[10px] text-gray-400">{new Date(m.createdAt).toLocaleString()}</span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 pt-1">{m.subject}</h4>
                        <p className="text-gray-500 font-medium font-sans leading-relaxed text-[11px] pt-1">{m.message}</p>
                        <div className="font-sans text-[10px] text-gray-450 pt-2 flex items-center gap-2">
                          <span className="font-semibold text-gray-800">Sender: {m.name}</span>
                          <span>•</span>
                          <span className="font-bold underline">{m.email}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0 sm:self-center font-sans">
                        {!m.isRead && (
                          <button
                            onClick={() => handleMarkMessageRead(m.id)}
                            className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          className="p-1 px-2 border border-red-200 text-red-500 hover:bg-red-50 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          Purge
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REGISTERED USERS LIST */}
          {activeTab === "users" && (
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#0D1B2A] border-b border-gray-100 pb-3">Central User Directory ledger</h2>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {users.map((u) => (
                  <div key={u.id} className="py-3 flex justify-between items-center text-xs font-mono">
                    <div>
                      <span className="font-bold text-[#0D1B2A] block">{u.name}</span>
                      <span className="text-gray-400 font-mono text-[10px] block">{u.email} • {u.phone || "No phone"}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                        u.role === "admin" ? "bg-amber-500 text-white border border-amber-600" : "bg-slate-100 text-slate-800"
                      }`}>
                        {u.role}
                      </span>
                      {u.address && <p className="text-[9px] text-gray-400 font-sans mt-0.5">{u.address}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* --- ADD / EDIT PRODUCT FORM MODAL --- */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-150 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">WAREHOUSE RECORD FORM</span>
                <h3 className="font-serif text-lg font-bold text-gray-950">
                  {editingProduct ? `Modify Product: ${editingProduct.name}` : "Log New Asset Item"}
                </h3>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1 text-gray-400 hover:text-black rounded hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Product Commercial name</label>
                <input
                  type="text"
                  required
                  placeholder="Ibuprofen 400mg, Gel Pens, Copy paper..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Resource Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize product features, storage terms, or pack contents..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="14.50"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Initial Warehouse Stock</label>
                <input
                  type="number"
                  required
                  placeholder="100"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Store Division</label>
                <select
                  value={formShop}
                  onChange={(e) => setFormShop(e.target.value as "medicals" | "stationery")}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:border-slate-850 cursor-pointer"
                >
                  <option value="medicals">Nuthan Medicals</option>
                  <option value="stationery">JA Stationery</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Category label</label>
                <input
                  type="text"
                  required
                  placeholder="First Aid, Prescriptions, Writing Instruments"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Product Image Source</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start bg-slate-50 p-3 rounded-lg border border-gray-200">
                  {/* Left option: Paste URL */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Option A: Link URL</span>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                    />
                  </div>

                  {/* Right option: Cloudinary upload */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Option B: Cloudinary Upload</span>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="hidden"
                        id="cloudinary-file-uploader"
                      />
                      <label
                        htmlFor="cloudinary-file-uploader"
                        className={`flex items-center justify-center gap-2 border border-dashed rounded-lg p-2.5 text-xs font-bold transition-all cursor-pointer ${
                          isUploading
                            ? "bg-slate-100 text-gray-400 border-gray-200"
                            : "bg-white text-gray-700 border-[#0D1B2A]/30 hover:border-[#0D1B2A] hover:bg-slate-50"
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <span className="animate-spin inline-block h-3 w-3 border-2 border-slate-500 border-t-transparent rounded-full"></span>
                            Uploading to Cloudinary...
                          </>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            Choose local image file
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {uploadError && (
                  <p className="text-red-500 text-[10px] bg-red-50 p-2 rounded border border-red-200 font-mono mt-1">
                    ⚠️ {uploadError}
                  </p>
                )}

                {formImage && (
                  <div className="mt-2 flex items-center gap-3 bg-white p-2 rounded border border-gray-200 w-fit">
                    <img
                      src={formImage}
                      referrerPolicy="no-referrer"
                      alt="Form Preview"
                      className="h-12 w-12 object-cover rounded border bg-slate-100"
                    />
                    <div className="text-[10px] font-sans">
                      <p className="text-gray-500 uppercase font-bold">Image Preview Active</p>
                      <button
                        type="button"
                        onClick={() => setFormImage("")}
                        className="text-red-500 hover:underline font-bold"
                      >
                        Clear Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Anti-aging, fine-point, waterproof"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                />
              </div>

              <div className="flex items-center gap-2 select-none py-2 sm:col-span-2">
                <input
                  type="checkbox"
                  id="formFeatured"
                  checked={formFeatured}
                  onChange={(e) => setFormFeatured(e.target.checked)}
                  className="rounded border-gray-300 text-[#0D1B2A] focus:ring-[#0D1B2A] cursor-pointer"
                />
                <label htmlFor="formFeatured" className="text-xs text-gray-650 cursor-pointer font-bold font-sans">
                  Promote to homepage (Featured Discoveries slot)?
                </label>
              </div>

              <div className="border-t border-gray-100 pt-5 text-right sm:col-span-2 space-x-2 font-sans">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-gray-250 text-gray-600 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0D1B2A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shadow"
                >
                  Update Records Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
