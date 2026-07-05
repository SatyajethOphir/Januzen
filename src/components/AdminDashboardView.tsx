import React from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "../utils/storage";
import { 
  TrendingUp, Activity, BookOpen, AlertCircle, Eye, Trash2, Check, CreditCard, 
  Settings, Users, ShoppingBag, MessageSquare, PlusCircle, Search, Edit2, RotateCcw,
  Mail, Phone, MapPin, X, Loader2, Upload
} from "lucide-react";
import { Product, Order, Message, User } from "../types";
import PushAdvertisementsPanel from "./PushAdvertisementsPanel";

export default function AdminDashboardView({ onNavigate }: { onNavigate?: (page: string, params?: any) => void }) {
  const [activeTab, setActiveTab] = React.useState<"stats" | "products" | "orders" | "messages" | "users" | "coupons" | "marquee" | "storage" | "settings" | "offline-bill" | "advertisement">("stats");
  const [token, setToken] = React.useState<string | null>(null);

  // Offline Bill States
  const [offlineCustName, setOfflineCustName] = React.useState("");
  const [offlineCustPhone, setOfflineCustPhone] = React.useState("");
  const [offlineCustEmail, setOfflineCustEmail] = React.useState("");
  const [offlineShopDivision, setOfflineShopDivision] = React.useState<"medicals" | "stationery" | "mixed">("mixed");
  const [offlineItems, setOfflineItems] = React.useState<Array<{ name: string; quantity: number; unitPrice: number; isCustomItem: boolean }>>([]);
  
  const [offlineSearch, setOfflineSearch] = React.useState("");
  const [offlineSearchResults, setOfflineSearchResults] = React.useState<Product[]>([]);
  const [offlineSearchLoading, setOfflineSearchLoading] = React.useState(false);
  
  const [customItemName, setCustomItemName] = React.useState("");
  const [customItemQty, setCustomItemQty] = React.useState<number>(1);
  const [customItemPrice, setCustomItemPrice] = React.useState<string>("");
  
  const [offlineBillError, setOfflineBillError] = React.useState("");
  const [offlineBillSuccess, setOfflineBillSuccess] = React.useState("");
  const [offlineGenerating, setOfflineGenerating] = React.useState(false);
  const [testingSmtp, setTestingSmtp] = React.useState(false);
  const [smtpTestResult, setSmtpTestResult] = React.useState<{ success: boolean; details: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = React.useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive?: boolean }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Debounced Catalogue Search logic
  React.useEffect(() => {
    if (!offlineSearch.trim()) {
      setOfflineSearchResults([]);
      return;
    }
    
    setOfflineSearchLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(offlineSearch)}`)
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : (data.products || []);
          setOfflineSearchResults(list.slice(0, 8));
          setOfflineSearchLoading(false);
        })
        .catch((err) => {
          console.error("Error searching products:", err);
          setOfflineSearchLoading(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [offlineSearch]);

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) {
      setOfflineBillError("Please enter a custom item name.");
      return;
    }
    const qty = Number(customItemQty);
    if (isNaN(qty) || qty <= 0) {
      setOfflineBillError("Quantity must be a positive number.");
      return;
    }
    const price = Number(customItemPrice);
    if (isNaN(price) || price < 0) {
      setOfflineBillError("Unit price must be a non-negative number.");
      return;
    }

    setOfflineItems(prev => [
      ...prev,
      {
        name: customItemName.trim(),
        quantity: qty,
        unitPrice: price,
        isCustomItem: true
      }
    ]);

    // Reset fields
    setCustomItemName("");
    setCustomItemQty(1);
    setCustomItemPrice("");
    setOfflineBillError("");
  };

  const handleAddCatalogItem = (product: Product) => {
    const exists = offlineItems.find(it => it.name === product.name);
    if (exists) {
      setOfflineItems(prev => prev.map(it => it.name === product.name ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setOfflineItems(prev => [
        ...prev,
        {
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
          isCustomItem: false
        }
      ]);
    }
    setOfflineSearch("");
    setOfflineSearchResults([]);
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setOfflineItems(prev => prev.map((it, idx) => idx === index ? { ...it, quantity: newQty } : it));
  };

  const handleRemoveItem = (index: number) => {
    setOfflineItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleResetOfflineBill = () => {
    setOfflineCustName("");
    setOfflineCustPhone("");
    setOfflineCustEmail("");
    setOfflineShopDivision("mixed");
    setOfflineItems([]);
    setOfflineSearch("");
    setOfflineSearchResults([]);
    setCustomItemName("");
    setCustomItemQty(1);
    setCustomItemPrice("");
    setOfflineBillError("");
    setOfflineBillSuccess("");
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const response = await fetch("/api/admin/test-smtp", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      setSmtpTestResult({
        success: data.success,
        details: data.details || "No details returned."
      });
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        details: err.message || "Failed to call SMTP testing API."
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleOfflineBillGenerate = async (method: "download" | "print" | "whatsapp" | "email") => {
    if (offlineItems.length === 0) {
      setOfflineBillError("Please add at least one item first.");
      return;
    }

    if (method === "whatsapp" && !offlineCustPhone.trim()) {
      setOfflineBillError("Enter customer phone number for WhatsApp delivery.");
      return;
    }

    if (method === "email" && !offlineCustEmail.trim()) {
      setOfflineBillError("Enter customer email for email delivery.");
      return;
    }

    setOfflineBillError("");
    setOfflineBillSuccess("");
    setOfflineGenerating(true);

    try {
      const response = await fetch("/api/admin/offline-bill", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerName: offlineCustName.trim() || undefined,
          customerPhone: offlineCustPhone.trim() || undefined,
          customerEmail: offlineCustEmail.trim() || undefined,
          shopDivision: offlineShopDivision,
          items: offlineItems.map(it => ({
            name: it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            isCustomItem: it.isCustomItem
          })),
          deliveryMethod: method
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to process request");
      }

      // Read custom headers from response
      const billNumber = response.headers.get("X-Bill-Number") || `JZ-OFFLINE-${Date.now()}`;
      const totalStr = response.headers.get("X-Total") || "0.00";

      if (method === "email") {
        const result = await response.json();
        setOfflineBillSuccess(`Bill [${result.billNumber || billNumber}] generated — Rs. ${Number(result.total || totalStr).toFixed(2)}. Sent to ${offlineCustEmail}!`);
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (method === "download") {
          const a = document.createElement("a");
          a.href = url;
          a.download = `JANUZEN-Bill-${billNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setOfflineBillSuccess(`Bill [${billNumber}] successfully downloaded — Rs. ${Number(totalStr).toFixed(2)}`);
        } else if (method === "print") {
          const newWindow = window.open(url, "_blank");
          if (!newWindow) {
            setOfflineBillError("Pop-up blocked. Please allow pop-ups for this site to print.");
          } else {
            setOfflineBillSuccess(`Bill [${billNumber}] opened in a new tab for printing — Rs. ${Number(totalStr).toFixed(2)}`);
          }
        } else if (method === "whatsapp") {
          const a = document.createElement("a");
          a.href = url;
          a.download = `JANUZEN-Bill-${billNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();

          const waLink = response.headers.get("X-WhatsApp-Link");
          if (waLink) {
            const newWindow = window.open(waLink, "_blank");
            if (!newWindow) {
              setOfflineBillError("Pop-up blocked. Please allow pop-ups to open WhatsApp link.");
            }
          }
          setOfflineBillSuccess(`Bill [${billNumber}] generated and downloaded — Rs. ${Number(totalStr).toFixed(2)}. Opening WhatsApp chat...`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setOfflineBillError(err.message || "An error occurred while generating offline bill.");
    } finally {
      setOfflineGenerating(false);
    }
  };

  const offlineSubtotal = offlineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const offlineTax = Math.round((offlineSubtotal * 0.05) * 100) / 100;
  const offlineTotal = Math.round((offlineSubtotal + offlineTax) * 100) / 100;
  const isBelowMinimum = offlineTotal < 750;

  // States
  const [stats, setStats] = React.useState<any>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Dynamic Settings States managed by administrator
  const [shippingCostPerKm, setShippingCostPerKm] = React.useState(15);
  const [deliveryDistanceKms, setDeliveryDistanceKms] = React.useState(10);
  const [gstPercentage, setGstPercentage] = React.useState(5);
  const [settingsLoading, setSettingsLoading] = React.useState(false);
  const [settingsSuccess, setSettingsSuccess] = React.useState("");

  // Storage Guardrail & Purge states
  const [storageData, setStorageData] = React.useState<any>(null);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [retentionSweepResult, setRetentionSweepResult] = React.useState<any>(null);
  const [isRetentionLoading, setIsRetentionLoading] = React.useState(false);
  const [dryRunLoading, setDryRunLoading] = React.useState(false);
  const [dryRunTarget, setDryRunTarget] = React.useState<{ id: string; type: "user" | "product"; name: string } | null>(null);
  const [dryRunStats, setDryRunStats] = React.useState<any>(null);
  const [purgeExecuting, setPurgeExecuting] = React.useState(false);
  const [expectedMonthlySignins, setExpectedMonthlySignins] = React.useState<number>(1000);

  // Coupon and Marquee states
  const [coupons, setCoupons] = React.useState<any[]>([]);
  const [marqueeText, setMarqueeText] = React.useState("");
  const [marqueeSavedMsg, setMarqueeSavedMsg] = React.useState("");
  const [marqueeSpeed, setMarqueeSpeed] = React.useState<number>(30);

  // Coupon Form state
  const [newCouponCode, setNewCouponCode] = React.useState("");
  const [newCouponType, setNewCouponType] = React.useState<"percentage" | "fixed">("percentage");
  const [newCouponValue, setNewCouponValue] = React.useState("");
  const [newMinBasketValue, setNewMinBasketValue] = React.useState("");

  // Draft Changes engine states
  interface DraftChange {
    id: string;
    type: "add_product" | "edit_product" | "delete_product" | "add_coupon" | "delete_coupon" | "delete_user" | "update_marquee" | "update_settings" | "update_order_status" | "mark_message_read" | "delete_message";
    description: string;
    payload: any;
  }
  const [draftChanges, setDraftChanges] = React.useState<DraftChange[]>([]);
  const [isSubmittingDrafts, setIsSubmittingDrafts] = React.useState(false);
  const [draftSubmitProgress, setDraftSubmitProgress] = React.useState("");

  const draftChangesRef = React.useRef<DraftChange[]>([]);
  React.useEffect(() => {
    draftChangesRef.current = draftChanges;
  }, [draftChanges]);

  const addDraftChange = (change: Omit<DraftChange, "id">) => {
    const newChange: DraftChange = {
      ...change,
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setDraftChanges(prev => [...prev, newChange]);
  };

  const handleRemoveDraftChange = (id: string) => {
    setDraftChanges(prev => prev.filter(c => c.id !== id));
  };

  const handleDiscardAllDrafts = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Discard Draft Changes",
      message: "Are you sure you want to discard all your unsaved local draft changes? This will reload the dashboard state from the master server.",
      isDestructive: true,
      onConfirm: () => {
        setDraftChanges([]);
        fetchAllData(token || "");
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        (window as any).showToast?.("Draft changes discarded.", "info");
      }
    });
  };

  const handleSubmitDraftChanges = async () => {
    if (draftChanges.length === 0) return;
    setIsSubmittingDrafts(true);
    setDraftSubmitProgress("Initializing bulk serialized dispatch...");
    
    try {
      const headers = { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      };

      for (let i = 0; i < draftChanges.length; i++) {
        const change = draftChanges[i];
        setDraftSubmitProgress(`Processing (${i + 1}/${draftChanges.length}): ${change.description}`);

        if (change.type === "add_product") {
          await fetch("/api/admin/products", {
            method: "POST",
            headers,
            body: JSON.stringify(change.payload)
          });
        } else if (change.type === "edit_product") {
          await fetch(`/api/admin/products/${change.payload.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(change.payload.data)
          });
        } else if (change.type === "delete_product") {
          await fetch(`/api/admin/products/${change.payload.id}`, {
            method: "DELETE",
            headers
          });
        } else if (change.type === "add_coupon") {
          await fetch("/api/admin/coupons", {
            method: "POST",
            headers,
            body: JSON.stringify(change.payload)
          });
        } else if (change.type === "delete_coupon") {
          await fetch(`/api/admin/coupons/${change.payload.id}`, {
            method: "DELETE",
            headers
          });
        } else if (change.type === "delete_user") {
          await fetch(`/api/admin/purge-user/${change.payload.id}/execute`, {
            method: "POST",
            headers
          });
        } else if (change.type === "update_marquee") {
          await fetch("/api/admin/marquee", {
            method: "PUT",
            headers,
            body: JSON.stringify(change.payload)
          });
        } else if (change.type === "update_settings") {
          await fetch("/api/admin/settings", {
            method: "PUT",
            headers,
            body: JSON.stringify(change.payload)
          });
        } else if (change.type === "update_order_status") {
          await fetch(`/api/admin/orders/${change.payload.id}/status`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ status: change.payload.status })
          });
        } else if (change.type === "mark_message_read") {
          await fetch(`/api/admin/messages/${change.payload.id}/read`, {
            method: "PUT",
            headers
          });
        } else if (change.type === "delete_message") {
          await fetch(`/api/admin/messages/${change.payload.id}`, {
            method: "DELETE",
            headers
          });
        }
      }

      setDraftSubmitProgress("Syncing final updated database parameters...");
      setDraftChanges([]);
      await fetchAllData(token || "");
      (window as any).showToast?.("All pending changes have been successfully committed and published to the database!", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("An error occurred while publishing some changes. Please refresh to synchronize current database state.", "error");
    } finally {
      setIsSubmittingDrafts(false);
      setDraftSubmitProgress("");
    }
  };

  // Broadcast Notification Form State
  const [broadcastTitle, setBroadcastTitle] = React.useState("");
  const [broadcastMatter, setBroadcastMatter] = React.useState("");
  const [broadcastStatus, setBroadcastStatus] = React.useState("");

  // Product Inventory Search & Filter state
  const [prodSearch, setProdSearch] = React.useState("");
  const [prodShopFilter, setProdShopFilter] = React.useState("");

  // Product CRUD Form Modal State
  const formModalRef = React.useRef<HTMLDivElement>(null);
  const [showFormModal, setShowFormModal] = React.useState(false);

  useClickOutside(formModalRef, () => setShowFormModal(false), showFormModal);

  React.useEffect(() => {
    if (!showFormModal) return;
    formModalRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFormModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [showFormModal]);

  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [formPrice, setFormPrice] = React.useState("");
  const [formCategory, setFormCategory] = React.useState("");
  const [formShop, setFormShop] = React.useState<"medicals" | "stationery">("medicals");
  const [formStock, setFormStock] = React.useState("");
  const [formBrand, setFormBrand] = React.useState("");
  const [formPricePerPiece, setFormPricePerPiece] = React.useState("");
  const [formPiecesPerUnit, setFormPiecesPerUnit] = React.useState("");
  const [formTotalUnitsAvailable, setFormTotalUnitsAvailable] = React.useState("");
  const [formImage, setFormImage] = React.useState("");
  const [formTags, setFormTags] = React.useState("");
  const [formFeatured, setFormFeatured] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState("");

  // Load everything
  const fetchAllData = React.useCallback(async (userToken: string, skipSpinner = false) => {
    if (!skipSpinner) {
      setLoading(true);
    }
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

      // Load coupons
      const couponsRes = await fetch("/api/admin/coupons", { headers });
      if (couponsRes.ok) {
        const couponsData = await couponsRes.json();
        setCoupons(couponsData.coupons || []);
      }

      // Load marquee text (only on initial load or manual refresh, never during background interval to avoid losing typing drafts)
      if (!skipSpinner) {
        const marqueeRes = await fetch("/api/public/marquee");
        if (marqueeRes.ok) {
          const marqueeData = await marqueeRes.json();
          setMarqueeText(marqueeData.marquee || "");
          if (marqueeData.speed !== undefined) {
            setMarqueeSpeed(marqueeData.speed);
          }
        }
      }

      // Load storage usage info
      const storageRes = await fetch("/api/admin/storage-usage", { headers });
      if (storageRes.ok) {
        setStorageData(await storageRes.json());
      }

      // Load purge audit logs
      const auditRes = await fetch("/api/admin/audit-logs", { headers });
      if (auditRes.ok) {
        setAuditLogs(await auditRes.json());
      }

      // Load cost & GST system settings
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setShippingCostPerKm(settingsData.shippingCostPerKm || 15);
        setDeliveryDistanceKms(settingsData.deliveryDistanceKms || 10);
        setGstPercentage(settingsData.gstPercentage || 5);
      }

    } catch (err) {
      console.error("Critical: failed to fetch admin stats data grids:", err);
    } finally {
      if (!skipSpinner) {
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    const savedToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    setToken(savedToken);
    if (savedToken) {
      fetchAllData(savedToken, false);
      // Real-time auto-refresh admin stats, items, and orders data grids every 6 seconds, but pause if draft changes exist
      const interval = setInterval(() => {
        if (draftChangesRef.current.length > 0) {
          return; // pause background auto-refresh to prevent overwriting local drafts
        }
        fetchAllData(savedToken, true);
      }, 6000);
      return () => clearInterval(interval);
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
  const handleOrderStatusUpdate = (orderId: string, status: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    addDraftChange({
      type: "update_order_status",
      description: `📦 Update order status for #${orderId.substring(0, 8)} to "${status}"`,
      payload: { id: orderId, status }
    });
  };

  // --- MESSAGES READ/DELETE ---
  const handleMarkMessageRead = (msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRead: true } : m));
    addDraftChange({
      type: "mark_message_read",
      description: `✉️ Mark message as read (Ref: #${msgId.substring(0, 8)})`,
      payload: { id: msgId }
    });
  };

  const handleDeleteMessage = (msgId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Message Enquiry",
      message: "Are you sure you want to queue this message enquiry for deletion?",
      isDestructive: true,
      onConfirm: () => {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        addDraftChange({
          type: "delete_message",
          description: `🗑️ Delete message enquiry (Ref: #${msgId.substring(0, 8)})`,
          payload: { id: msgId }
        });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        (window as any).showToast?.("Message queued for deletion.", "info");
      }
    });
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
    setFormBrand("JANUZEN");
    setFormPricePerPiece("");
    setFormPiecesPerUnit("1");
    setFormTotalUnitsAvailable("");
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
    setFormBrand(p.brand || "JANUZEN");
    setFormPricePerPiece(String(p.pricePerPiece || p.price));
    setFormPiecesPerUnit(String(p.piecesPerUnit || 1));
    setFormTotalUnitsAvailable(String(p.totalUnitsAvailable || p.stock));
    setFormImage(p.image);
    setFormTags(p.tags.join(", "));
    setFormFeatured(p.featured);
    setIsUploading(false);
    setUploadError("");
    setShowFormModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedPieces = Number(formPiecesPerUnit) || 1;
    const resolvedUnits = Number(formTotalUnitsAvailable) || 0;
    const computedStock = resolvedPieces * resolvedUnits;
    const computedPrice = (Number(formPricePerPiece) || Number(formPrice)) * resolvedPieces;

    const payload = {
      name: formName,
      description: formDesc,
      price: computedPrice || Number(formPrice),
      category: formCategory,
      shop: formShop,
      stock: computedStock || Number(formStock),
      image: formImage || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600",
      tags: formTags.split(",").map(t => t.trim()).filter(Boolean),
      featured: formFeatured,
      isActive: true,
      brand: formBrand || "JANUZEN",
      pricePerPiece: Number(formPricePerPiece) || Number(formPrice),
      piecesPerUnit: resolvedPieces,
      totalUnitsAvailable: resolvedUnits
    };

    if (editingProduct) {
      const updatedProduct: Product = {
        ...editingProduct,
        ...payload
      };
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p));
      addDraftChange({
        type: "edit_product",
        description: `📝 Edit product: "${formName}"`,
        payload: { id: editingProduct.id, data: updatedProduct }
      });
    } else {
      const tempId = `temp-prod-${Date.now()}`;
      const newProduct: Product = {
        id: tempId,
        ...payload
      };
      setProducts(prev => [newProduct, ...prev]);
      addDraftChange({
        type: "add_product",
        description: `➕ Add new product: "${formName}" (${formShop})`,
        payload
      });
    }
    setShowFormModal(false);
  };

  const handleSoftDeleteProduct = (pid: string) => {
    const prod = products.find(p => p.id === pid);
    const prodName = prod ? prod.name : pid;
    setConfirmDialog({
      isOpen: true,
      title: "Soft Delete Product",
      message: `Are you sure you want to soft delete "${prodName}"? It will be marked inactive and hidden from shop displays.`,
      isDestructive: true,
      onConfirm: () => {
        setProducts(prev => prev.map(p => p.id === pid ? { ...p, isActive: false } : p));
        addDraftChange({
          type: "delete_product",
          description: `🗑️ Soft delete product: "${prodName}"`,
          payload: { id: pid }
        });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        (window as any).showToast?.(`"${prodName}" marked inactive.`, "info");
      }
    });
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode || !newCouponValue) {
      (window as any).showToast?.("Please fill in both Code and Value fields.", "error");
      return;
    }
    const code = newCouponCode.toUpperCase().trim();
    const discountValue = Number(newCouponValue);
    const minBasketValue = Number(newMinBasketValue || 0);

    const newCoupon = {
      id: `temp-coupon-${Date.now()}`,
      code,
      discountType: newCouponType,
      discountValue,
      minBasketValue,
      isActive: true
    };

    setCoupons(prev => [newCoupon, ...prev]);
    addDraftChange({
      type: "add_coupon",
      description: `🎟️ Create promotional coupon: "${code}" (${newCouponType}: ${discountValue})`,
      payload: {
        code,
        discountType: newCouponType,
        discountValue,
        minBasketValue,
        isActive: true
      }
    });

    setNewCouponCode("");
    setNewCouponValue("");
    setNewMinBasketValue("");
  };

  const handleDeleteCoupon = (cid: string) => {
    const couponObj = coupons.find(c => c.id === cid);
    const couponCode = couponObj ? couponObj.code : cid;
    setConfirmDialog({
      isOpen: true,
      title: "Delete Coupon Code",
      message: `Are you sure you want to delete coupon "${couponCode}"?`,
      isDestructive: true,
      onConfirm: () => {
        setCoupons(prev => prev.filter(c => c.id !== cid));
        addDraftChange({
          type: "delete_coupon",
          description: `🗑️ Delete coupon: "${couponCode}"`,
          payload: { id: cid }
        });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        (window as any).showToast?.(`Coupon "${couponCode}" deleted.`, "info");
      }
    });
  };

  const handleSaveMarqueeText = () => {
    addDraftChange({
      type: "update_marquee",
      description: `📢 Update marquee announcement: "${marqueeText}"`,
      payload: { text: marqueeText, speed: marqueeSpeed }
    });
    setMarqueeSavedMsg("Marquee draft saved in pending queue! Click 'Save & Submit All Changes' to publish.");
    setTimeout(() => setMarqueeSavedMsg(""), 4000);
  };

  const handleBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMatter) {
      (window as any).showToast?.("Please specify the notification main matter.", "error");
      return;
    }
    setBroadcastStatus("dispatching");
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: broadcastTitle.trim() || undefined,
          matter: broadcastMatter.trim()
        })
      });
      if (res.ok) {
        setBroadcastTitle("");
        setBroadcastMatter("");
        setBroadcastStatus("success");
        setTimeout(() => setBroadcastStatus(""), 4000);
        fetchAllData(token);
        (window as any).showToast?.("Broadcast sent successfully to all registered customers!", "success");
      } else {
        const errData = await res.json();
        (window as any).showToast?.(errData.error || "Failed to broadcast notifications.", "error");
        setBroadcastStatus("failed");
      }
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Network exception occurred sending notifications broadcast.", "error");
      setBroadcastStatus("failed");
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete User Record",
      message: `Are you sure you want to delete user "${userName}"? This will queue a complete cascade purge in your pending draft changes.`,
      isDestructive: true,
      onConfirm: () => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        addDraftChange({
          type: "delete_user",
          description: `👤 Cascade purge customer user: "${userName}"`,
          payload: { id: userId, name: userName }
        });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        (window as any).showToast?.(`User "${userName}" queued for deletion.`, "info");
      }
    });
  };

  const handleRunRetentionCleanSweep = async () => {
    setIsRetentionLoading(true);
    setRetentionSweepResult(null);
    try {
      const res = await fetch("/api/admin/run-retention", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRetentionSweepResult(data.purged);
        fetchAllData(token);
        (window as any).showToast?.("Manual storage retention sweep completed successfully!", "success");
      } else {
        (window as any).showToast?.("Manual storage retention sweep failed.", "error");
      }
    } catch (e) {
      console.error(e);
      (window as any).showToast?.("Error triggering storage retention clean sweep.", "error");
    } finally {
      setIsRetentionLoading(false);
    }
  };

  const handleAnalyzeDryRun = async (id: string, type: "user" | "product", name: string) => {
    setDryRunLoading(true);
    setDryRunTarget({ id, type, name });
    setDryRunStats(null);
    try {
      const endpoint = `/api/admin/purge-${type}/${id}/dry-run`;
      const res = await fetch(endpoint, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setDryRunStats(await res.json());
        (window as any).showToast?.("Cascade analysis simulation completed.", "success");
      } else {
        (window as any).showToast?.("Cascade analysis failed. Associated entity may not exist.", "error");
        setDryRunTarget(null);
      }
    } catch (e) {
      console.error(e);
      (window as any).showToast?.("Error preparing dry-run simulation analysis.", "error");
      setDryRunTarget(null);
    } finally {
      setDryRunLoading(false);
    }
  };

  const handleConfirmExecutePurge = async () => {
    if (!dryRunTarget) return;
    setPurgeExecuting(true);
    try {
      const endpoint = `/api/admin/purge-${dryRunTarget.type}/${dryRunTarget.id}/execute`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        (window as any).showToast?.(`Cascade Purge Completed! Permanent record scrub for ${dryRunTarget.type} "${dryRunTarget.name}" is logged.`, "success");
        setDryRunTarget(null);
        setDryRunStats(null);
        fetchAllData(token);
      } else {
        const data = await res.json();
        (window as any).showToast?.(data.error || "Failed to execute cascading purge.", "error");
      }
    } catch (e) {
      console.error(e);
      (window as any).showToast?.(`Critical error executing cascading database purge.`, "error");
    } finally {
      setPurgeExecuting(false);
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

      {/* ⚠️ Unsaved Draft Changes Header Alert Stripe */}
      {draftChanges.length > 0 && (
        <div className="bg-amber-50 border border-amber-250 rounded-2xl p-4 mb-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
          <div className="space-y-1 w-full">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-amber-700">UNCOMMITTED OFFLINE DRAFT CHANGES REGISTERED</span>
            </div>
            <p className="text-xs text-gray-700 font-sans leading-normal">
              You have <span className="font-bold text-amber-800">{draftChanges.length} pending modification(s)</span>. Background server syncing is paused. Save them to commit.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1.5 max-h-24 overflow-y-auto">
              {draftChanges.map((change) => (
                <span key={change.id} className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-200/50 px-2.5 py-1 rounded-md text-[10px] font-mono leading-none shadow-xs">
                  {change.description}
                  <button 
                    onClick={() => handleRemoveDraftChange(change.id)}
                    className="hover:bg-amber-200 text-amber-800 rounded p-0.5 cursor-pointer ml-1"
                    title="Discard individual edit"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5 w-full md:w-auto shrink-0 font-sans text-xs">
            <button
              onClick={handleDiscardAllDrafts}
              disabled={isSubmittingDrafts}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-gray-300 text-gray-700 font-bold rounded-xl cursor-pointer transition shadow-sm w-full md:w-auto text-center"
            >
              Discard All
            </button>
            <button
              onClick={handleSubmitDraftChanges}
              disabled={isSubmittingDrafts}
              className="px-5 py-2.5 bg-[#036666] hover:bg-[#024F4F] text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all w-full md:w-auto"
            >
              <Check className="h-4 w-4" />
              <span>Save & Submit All Changes ({draftChanges.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Submit Transaction Overlay Loader */}
      {isSubmittingDrafts && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-2xl max-w-md w-full text-center space-y-4 font-mono">
            <Loader2 className="h-10 w-10 animate-spin text-teal-600 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-gray-950">Bulk Committing Pending Drafts</h3>
            <p className="text-xs text-gray-500 bg-slate-50 p-3 rounded-xl border border-gray-150 break-words leading-relaxed">
              {draftSubmitProgress}
            </p>
            <p className="text-[10px] text-gray-400 font-sans">
              Please do not close this window while database transactions are executing.
            </p>
          </div>
        </div>
      )}
      
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
          {(["stats", "products", "orders", "messages", "users", "coupons", "marquee", "storage", "settings", "offline-bill", "advertisement"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all capitalize cursor-pointer ${
                activeTab === tab 
                  ? "bg-[#0D1B2A] text-white shadow-sm" 
                  : "text-gray-500 hover:text-black hover:bg-white/50"
              }`}
            >
              {tab === "stats" ? "Analytics Stats" : tab === "marquee" ? "Edit Marquee" : tab === "storage" ? "Storage Guardrails" : tab === "settings" ? "GST & Shipping" : tab === "offline-bill" ? "Offline Bill" : tab === "advertisement" ? "Push Ads" : tab}
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
                  <span className="font-serif text-3xl font-black text-[#0D1B2A] block mt-1">₹{stats.metrics.revenue.toFixed(2)}</span>
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
                          <span className="font-mono font-extrabold text-[#0D1B2A] block">₹{o.totals.total.toFixed(2)}</span>
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
                          <td className="p-4 font-mono font-bold font-bold">₹{p.price.toFixed(2)}</td>
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
                              <button
                                onClick={() => { setActiveTab("storage"); handleAnalyzeDryRun(p.id, "product", p.name); }}
                                className="p-1 px-2 bg-red-50 hover:bg-red-100 border border-red-150 text-red-650 rounded flex items-center gap-1 cursor-pointer font-bold"
                                title="Permanent Database Purge (Hard Delete)"
                              >
                                Purge
                              </button>
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
                  {orders.map((o) => {
                    const oSa = o.shippingAddress;
                    const isOAddressObject = oSa && typeof oSa === "object";
                    const oPhone = isOAddressObject ? ((oSa as any).phone || "N/A") : "N/A";
                    const oAddressLine = isOAddressObject ? ((oSa as any).addressLine || "") : String(oSa || "");
                    const oCity = isOAddressObject ? ((oSa as any).city || "") : "";
                    const oPostalCode = isOAddressObject ? ((oSa as any).postalCode || "") : "";
                    const fullAddressStr = isOAddressObject ? `${oAddressLine}${oCity ? `, ${oCity}` : ""}${oPostalCode ? ` - ${oPostalCode}` : ""}` : oAddressLine;

                    return (
                      <div key={o.id} className="py-4 grid grid-cols-1 md:grid-cols-4 gap-6 items-start text-xs font-mono">
                        
                        {/* Left: General Order details */}
                        <div className="space-y-1 sm:col-span-1">
                          <span className="text-[10px] font-bold text-gray-400">ORDER LOG</span>
                          <h4 className="text-sm font-black text-slate-900">{o.orderId}</h4>
                          <div className="text-gray-500 leading-normal font-sans pt-1 space-y-0.5">
                            <p>Customer: <span className="font-bold">{o.userName}</span></p>
                            <p>Email: <span className="font-semibold">{o.userEmail}</span></p>
                            <p>Phone: <span className="font-semibold">{oPhone}</span></p>
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
                          <p className="font-bold text-slate-850">Total Bill: ₹{o.totals.total.toFixed(2)}</p>
                          <p className="text-gray-500 font-sans text-[11px] mt-1 pr-2">
                            Address: {fullAddressStr}
                          </p>
                        </div>

                      {/* Far-Right: Status selection widgets */}
                      <div className="space-y-2 sm:col-span-1 text-right">
                        <span className="text-[10px] font-bold text-gray-400 block pb-1">COURIER DISPATCH CONTROL</span>
                        <div className="flex flex-col sm:items-end gap-1.5 font-sans">
                          <button
                            onClick={() => onNavigate?.("invoice", { orderId: o.id })}
                            className="w-full sm:w-36 p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold font-mono tracking-wider text-center cursor-pointer shadow-sm transition-colors mb-1"
                          >
                            📄 VIEW INVOICE
                          </button>
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
                    );
                  })}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-b-0">
              {/* Left Column: Broadcast Notification Form */}
              <div className="lg:col-span-1 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
                <h3 className="font-serif text-base font-bold text-[#0D1B2A] border-b border-gray-100 pb-2">
                  Unified Broadcast Center
                </h3>
                <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                  Send a dynamic broadcast alert to all registered customers simultaneously. The system automatically prefixes each individual alert with the customer's full name to personalize the announcement.
                </p>
                <form onSubmit={handleBroadcastNotification} className="space-y-4 text-xs font-mono">
                  <div className="space-y-1">
                    <label className="text-gray-400 uppercase font-bold tracking-widest block">Broadcast Subject Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Special Discount Voucher for You!"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 uppercase font-bold tracking-widest block">Message Matter</label>
                    <textarea
                      required
                      placeholder="Describe the matter of your broadcast... (e.g. We have stocked amoxicillin tablets, use code FIRST50 for immediate benefits!)"
                      rows={4}
                      value={broadcastMatter}
                      onChange={(e) => setBroadcastMatter(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-850 focus:outline-none focus:border-slate-850"
                    />
                  </div>

                  {broadcastStatus === "dispatching" && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg font-sans">
                      🚀 Dynamically stamping customers names & dispatching alerts...
                    </div>
                  )}

                  {broadcastStatus === "success" && (
                    <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg font-sans">
                      ✓ Broadcast successfully delivered to all active customer stores!
                    </div>
                  )}

                  {broadcastStatus === "failed" && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg font-sans">
                      ✗ Broadcast transmission failed. Please retry.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={broadcastStatus === "dispatching"}
                    className="w-full bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    Broadcast to All Customers
                  </button>
                </form>
              </div>

              {/* Right Column: User Directory */}
              <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-serif text-lg font-bold text-[#0D1B2A] border-b border-gray-100 pb-2">
                  Central User Directory Ledger
                </h3>
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {users.map((u) => (
                    <div key={u.id} className="py-3 flex justify-between items-center text-xs font-mono">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#0D1B2A] block text-sm">{u.name}</span>
                        <span className="text-gray-400 font-mono text-[10px] block">{u.email} • {u.phone || "No phone"}</span>
                        {u.address && <p className="text-[10px] text-gray-500 font-sans">{u.address}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-md ${
                          u.role === "admin" ? "bg-amber-500 text-white border border-amber-600" : "bg-slate-100 text-slate-800"
                        }`}>
                          {u.role || "customer"}
                        </span>
                        {u.role !== "admin" && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1 px-2 border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                            title="Delete user and all corresponding data (space-efficient)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: NEW COUPONS MANAGER */}
          {activeTab === "coupons" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Create Coupon Form */}
              <div className="lg:col-span-1 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
                <h3 className="font-serif text-lg font-bold text-[#0D1B2A] border-b border-gray-100 pb-2">
                  Generate Code Profile
                </h3>
                <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs font-mono">
                  <div className="space-y-1">
                    <label className="text-gray-400 uppercase font-bold tracking-widest block">Coupon Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. INAUGURAL50"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 uppercase focus:outline-none focus:border-slate-850"
                    />
                  </div>

                  <div className="space-y-1 block">
                    <label className="text-gray-400 uppercase font-bold tracking-widest block">Discount Type</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setNewCouponType("percentage")}
                        className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                          newCouponType === "percentage"
                            ? "bg-[#0D1B2A] text-white border-[#0D1B2A]"
                            : "bg-slate-50 border-gray-200 text-gray-700 hover:bg-slate-100"
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCouponType("fixed")}
                        className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                          newCouponType === "fixed"
                            ? "bg-[#0D1B2A] text-white border-[#0D1B2A]"
                            : "bg-slate-50 border-gray-200 text-gray-700 hover:bg-slate-100"
                        }`}
                      >
                        Fixed Amount (₹)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 uppercase font-bold tracking-widest block">
                      {newCouponType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder={newCouponType === "percentage" ? "10" : "150"}
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 uppercase font-bold tracking-widest block">Min Purchase Basket (₹)</label>
                    <input
                      type="number"
                      placeholder="0 for none"
                      value={newMinBasketValue}
                      onChange={(e) => setNewMinBasketValue(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg shadow transition-all"
                  >
                    Commit Coupon Code
                  </button>
                </form>
              </div>

              {/* Right Column: Listing Active/Inactive Coupons */}
              <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-serif text-lg font-bold text-[#0D1B2A] border-b border-gray-100 pb-2">
                  Active Coupons Registry
                </h3>
                {coupons.length === 0 ? (
                  <p className="text-sm text-gray-400 font-mono py-6 text-center">No promotional codes cataloged in database.</p>
                ) : (
                  <div className="divide-y divide-gray-100 overflow-y-auto max-h-[500px]">
                    {coupons.map((c) => (
                      <div key={c.id || c.code} className="py-4 flex justify-between items-center text-xs font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#D4820A]/10 text-[#D4820A] text-sm font-extrabold px-3 py-1 rounded-md border border-[#D4820A]/20">
                              {c.code}
                            </span>
                            <span className="px-1.5 py-0.5 text-[8px] bg-emerald-100 text-emerald-800 rounded font-black upper border border-emerald-200">
                              ACTIVE
                            </span>
                          </div>
                          <div className="text-gray-500 font-sans text-[11px] pt-1">
                            Provides <span className="font-bold text-gray-800">
                              {c.discountType === "percentage" ? `${c.discountValue}% Off` : `₹${c.discountValue} Off`}
                            </span> on baskets above <span className="font-bold text-gray-800">₹{c.minBasketValue || 0}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCoupon(c.id || c._id)}
                          className="p-1.5 border border-red-200 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer transition-colors"
                          title="Purge coupon"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: EDIT MARQUEE */}
          {activeTab === "marquee" && (
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-6">
              <h2 className="font-serif text-lg font-bold text-[#0D1B2A] border-b border-gray-100 pb-3">Scrolling Header Banner Marquee Settings</h2>
              
              <div className="space-y-4 font-mono text-xs">
                <div className="space-y-2">
                  <label className="text-gray-400 uppercase font-bold tracking-widest block">Broadcast Announcement Text</label>
                  <textarea
                    rows={4}
                    placeholder="Enter urgent updates, global holiday banners, or new coupon warnings here..."
                    value={marqueeText}
                    onChange={(e) => setMarqueeText(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl text-sm text-gray-850 focus:outline-none focus:border-slate-850"
                  />
                  <p className="text-[10px] text-gray-400">
                    * This updates the scrolling announcement bar fixed to the very top header area on all shop interfaces. Keep it punchy!
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-gray-400 uppercase font-bold tracking-widest block">Scrolling Duration / Speed (seconds)</label>
                  <div className="flex items-center gap-4 bg-slate-50 border border-gray-200 p-3 rounded-xl">
                    <input
                      type="range"
                      min={5}
                      max={120}
                      value={marqueeSpeed}
                      onChange={(e) => setMarqueeSpeed(Number(e.target.value))}
                      className="w-full accent-[#036666] cursor-pointer"
                    />
                    <span className="font-bold text-sm text-gray-700 w-24 shrink-0 text-right">{marqueeSpeed} seconds</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    * Controls how long a full scroll cycle takes. Lower values (e.g. 15s) make text scroll quickly; higher values (e.g. 60s) make it slide slowly and legibly.
                  </p>
                </div>

                {marqueeSavedMsg && (
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold text-center">
                    {marqueeSavedMsg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveMarqueeText}
                  className="w-full bg-[#036666] hover:bg-[#035252] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Settings className="h-4 w-4" />
                  Publish Banner Message
                </button>

                {/* Simulated Marquee Live Preview */}
                <div className="border border-gray-100 rounded-xl p-4 bg-slate-50 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Live Banner Simulation</span>
                  <div className="bg-black text-amber-300 py-1.5 px-4 rounded-md overflow-hidden relative flex">
                    <div className="flex w-max">
                      <div 
                        className="whitespace-nowrap inline-block font-semibold text-xs tracking-wide animate-marquee pr-6"
                        style={{ animationDuration: `${marqueeSpeed}s` }}
                      >
                        {marqueeText || "No active message logged — fallback placeholder marquee text"} ⚡
                      </div>
                      <div 
                        className="whitespace-nowrap inline-block font-semibold text-xs tracking-wide animate-marquee pr-6"
                        style={{ animationDuration: `${marqueeSpeed}s` }}
                      >
                        {marqueeText || "No active message logged — fallback placeholder marquee text"} ⚡
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: STORAGE OBSERVABILITY & DATABASE GUARDRAILS */}
          {activeTab === "storage" && (
            <div className="space-y-8">
              
              {/* Row 1: Cap Widget & Manual Sweeper */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 512MB Capacity Gauge Widget */}
                <div className="lg:col-span-2 bg-white border border-gray-150 p-6 rounded-2xl shadow-sm space-y-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#0D1B2A] font-bold">DATABASE CAP CAPACITY GAUGE</span>
                    <h3 className="font-serif text-lg font-black text-[#0D1B2A] mt-1">Live Free Tier 512MB Allocation Tracker</h3>
                  </div>

                  {storageData ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-baseline text-xs font-mono">
                        <div>
                          <span className="text-gray-400 block">CONSOLIDATED DISK USAGE</span>
                          <span className="text-base font-black text-slate-900 border-b-2 border-indigo-200">
                            {(storageData.totalSizeBytes / 1024).toFixed(2)} KB
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-450 block">MAX FREE TIER CAP</span>
                          <span className="text-gray-900 font-bold">512.00 MB / 524,288 KB</span>
                        </div>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full bg-slate-150 h-5.5 rounded-full overflow-hidden p-1 border border-gray-200">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300 flex items-center justify-end px-2"
                          style={{ width: `${Math.max(storageData.percentOfCap, 2.5)}%` }}
                        >
                          {storageData.percentOfCap > 5 && (
                            <span className="text-[9px] font-mono font-black text-white">{storageData.percentOfCap}%</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-2">
                        <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-gray-400 block text-[9px] uppercase">INDEX DISK ALLOC</span>
                          <span className="font-bold text-slate-800">{(storageData.indexSizeBytes / 1024).toFixed(2)} KB</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                          <span className="text-gray-400 block text-[9px] uppercase">PERSISTENT ENGINE</span>
                          <span className="font-bold text-[#0D1B2A]">{storageData.databaseMode}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-gray-400">Loading storage gauge metrics...</div>
                  )}
                </div>

                {/* Manual Cleanup block */}
                <div className="lg:col-span-1 bg-white border border-gray-150 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#D4820A] font-bold">LIFECYCLE RETENTION RULES</span>
                    <h3 className="font-serif text-base font-bold text-[#0D1B2A] mt-1">Manual Database Sweep Console</h3>
                    <p className="text-[11px] text-gray-550 leading-normal pt-1 font-sans">
                      Clears read notifications older than 30 days, unread elements older than 90 days, expired sessions, and promotional logs older than six months instantly.
                    </p>
                  </div>

                  {retentionSweepResult && (
                    <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl text-xs font-mono text-emerald-800 space-y-1">
                      <span className="font-bold block">✓ Sweep Successful!</span>
                      <p>• Notifications Purged: <span className="font-black">{retentionSweepResult.notificationPurged}</span></p>
                      <p>• Sessions Cleared: <span className="font-black">{retentionSweepResult.sessionPurged}</span></p>
                      <p>• Coupons Archivings: <span className="font-black">{retentionSweepResult.couponUsagePurged}</span></p>
                    </div>
                  )}

                  <button
                    onClick={handleRunRetentionCleanSweep}
                    disabled={isRetentionLoading}
                    className="w-full bg-[#0D1B2A] hover:bg-[#1B2A3D] text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow"
                  >
                    {isRetentionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Launch Retention Sweep
                  </button>
                </div>
              </div>

              {/* Cascade Purging Workspace Analysis Overlay Panel */}
              {dryRunTarget && (
                <div className="bg-amber-50/40 border border-amber-250 p-6 rounded-2xl shadow space-y-4 font-mono text-xs max-w-3xl mx-auto">
                  <div className="flex justify-between items-start border-b border-amber-200 pb-3">
                    <div>
                      <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded uppercase">CASCADE DRY-RUN TEST</span>
                      <h4 className="text-base font-serif font-black text-[#0D1B2A] mt-1 capitalize">
                        Targeting {dryRunTarget.type === "user" ? "Customer" : "Product SKU"}: "{dryRunTarget.name}"
                      </h4>
                      <p className="text-gray-400 text-[10px] mt-0.5 font-mono">DB Reference Ref ID: {dryRunTarget.id}</p>
                    </div>
                    <button 
                      onClick={() => { setDryRunTarget(null); setDryRunStats(null); }}
                      className="p-1 text-gray-400 hover:text-black hover:bg-slate-200 rounded-md cursor-pointer animate-pulse"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {dryRunLoading ? (
                    <div className="py-6 text-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto" />
                      <p className="text-[10px] text-gray-505">Querying dependency tables and child arrays...</p>
                    </div>
                  ) : dryRunStats ? (
                    <div className="space-y-4">
                      <div className="bg-white border border-amber-150 p-4 rounded-xl space-y-2.5">
                        <span className="block font-bold text-red-700">⚠️ DATA INTEGRITY IMPLICATIONS REPORT:</span>
                        
                        {dryRunTarget.type === "user" ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs leading-relaxed font-sans">
                            <div className="bg-slate-50 p-2.5 rounded border">
                              <span className="text-gray-450 block text-[9px] font-mono uppercase">User Docs</span>
                              <span className="font-mono font-bold text-slate-800">{dryRunStats.counts.users} deleted</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border">
                              <span className="text-gray-450 block text-[9px] font-mono uppercase">Order Records</span>
                              <span className="font-mono font-bold text-slate-800">{dryRunStats.counts.orders} deleted</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border">
                              <span className="text-gray-450 block text-[9px] font-mono uppercase">Product Reviews</span>
                              <span className="font-mono font-bold text-slate-800">{dryRunStats.counts.reviews} deleted</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border">
                              <span className="text-gray-450 block text-[9px] font-mono uppercase">Wishlist Indices</span>
                              <span className="font-mono font-bold text-slate-800">{dryRunStats.counts.wishlist} deleted</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border">
                              <span className="text-gray-450 block text-[9px] font-mono uppercase">Notifications</span>
                              <span className="font-mono font-bold text-slate-800">{dryRunStats.counts.notifications} deleted</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border">
                              <span className="text-gray-450 block text-[9px] font-mono uppercase">Active Cookies</span>
                              <span className="font-mono font-bold text-slate-800">{dryRunStats.counts.sessions} deleted</span>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs leading-relaxed font-sans">
                            <div className="bg-slate-50 p-2.5 rounded border">
                              <span className="text-gray-450 block text-[9px] font-mono uppercase">Root Product Doc</span>
                              <span className="font-mono font-bold text-slate-800">{dryRunStats.counts.products} deleted</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border">
                              <span className="text-gray-450 block text-[9px] font-mono uppercase">Product Reviews</span>
                              <span className="font-mono font-bold text-slate-800">{dryRunStats.counts.reviews} deleted</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border">
                              <span className="text-gray-450 block text-[9px] font-mono uppercase">Active Wishlists</span>
                              <span className="font-mono font-bold text-slate-800">{dryRunStats.counts.wishlist} deleted</span>
                            </div>
                          </div>
                        )}

                        <div className="bg-red-50 text-red-850 p-3 rounded-lg border border-red-150 text-xs font-sans mt-3 space-y-1">
                          <span className="font-extrabold block">PROMPT CONFIRMATION CHECK:</span>
                          <p>
                            "This will delete 1 {dryRunTarget.type}, {dryRunTarget.type === "user" ? `${dryRunStats.counts.reviews} reviews, and ${dryRunStats.counts.wishlist} wishlist items` : `${dryRunStats.counts.reviews} reviews, and ${dryRunStats.counts.wishlist} wishlist items`}. Are you sure?"
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end font-sans">
                        <button
                          onClick={() => { setDryRunTarget(null); setDryRunStats(null); }}
                          className="px-4 py-2 hover:bg-slate-200 border rounded-lg cursor-pointer font-bold"
                        >
                          Abort Action
                        </button>
                        <button
                          onClick={handleConfirmExecutePurge}
                          disabled={purgeExecuting}
                          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          {purgeExecuting && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                          Confirm Permanent Cascade Purge
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Row 2: Collection Breakdown & Predictive Upgrade Solver */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Collection Metrics */}
                <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-serif text-base font-bold text-[#0D1B2A] border-b border-gray-100 pb-2">
                    Storage Inventory Breakdown by Collection
                  </h3>
                  {storageData ? (
                    <div className="divide-y divide-gray-100 space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {storageData.breakdown.map((elm: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 text-xs font-mono">
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{elm.name}</span>
                            <span className={`text-[9px] font-bold uppercase rounded p-0.5 px-1 inline-block mt-0.5 ${
                              elm.growthPattern.includes("unbounded") ? "bg-red-50 text-red-700 border border-red-200" : "bg-[#F3F4F6] text-gray-500"
                            }`}>
                              {elm.growthPattern}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-800 block">{elm.count} records</span>
                            <span className="text-[10px] text-gray-400">{(elm.sizeBytes / 1024).toFixed(3)} KB</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Formulating growth lists...</p>
                  )}
                </div>

                {/* Growth Upgrader Predictive Solver slider */}
                <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#0D1B2A] border-b border-gray-100 pb-2">
                      Interactive Upgrade Timeline Projection Solver
                    </h3>
                    <p className="text-[11px] text-gray-500 leading-normal pt-1 font-sans">
                      Calculate exact lifespan predictions of your database before exceeding the 512MB threshold by planning monthly sign-ins and broad notifications.
                    </p>
                  </div>

                  <div className="space-y-4 font-mono text-xs pt-2">
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border">
                      <div className="flex justify-between items-center text-gray-750">
                        <span>Expected Monthly Sign-ins:</span>
                        <span className="font-black text-indigo-700 text-sm">{expectedMonthlySignins} / mo</span>
                      </div>
                      <input 
                        type="range"
                        min="50"
                        max="50000"
                        step="50"
                        value={expectedMonthlySignins}
                        onChange={(e) => setExpectedMonthlySignins(Number(e.target.value))}
                        className="w-full cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none accent-indigo-600"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400">
                        <span>50</span>
                        <span>25,000</span>
                        <span>50,000</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 shadow-inner font-sans text-xs">
                      <span className="font-bold block text-amber-300 font-mono tracking-wider text-[10px] uppercase">
                        PREDICTIVE DEPLOYMENT FORECASTING
                      </span>
                      {(() => {
                        const totalBytesUsed = storageData?.totalSizeBytes || 102400; // default 100KB fallback
                        const targetLimit = 536870912; // 512MB
                        const remainingBytes = Math.max(targetLimit - totalBytesUsed, 0);
                        const estimatedBytesPerSignin = 1120; // estimate size of session log + indexing
                        const estimatedMonthlyUsage = expectedMonthlySignins * estimatedBytesPerSignin;
                        const monthsRemaining = Math.max(Math.round(remainingBytes / estimatedMonthlyUsage * 10) / 10, 0.1);
                        
                        return (
                          <div className="space-y-2 font-mono leading-relaxed text-slate-300">
                            <p>• Estimated Monthly Growth: <span className="text-white font-black">{(estimatedMonthlyUsage / (1024 * 1024)).toFixed(2)} MB</span></p>
                            <p>• Unused Storage Capacity: <span className="text-white font-black">{(remainingBytes / (1024 * 1024)).toFixed(2)} MB</span></p>
                            
                            <div className="pt-2 border-t border-slate-800 text-center text-xs">
                              <span className="text-gray-400 block text-[9px] uppercase">Lifespan Before 512MB Upgrade:</span>
                              <span className="text-emerald-400 font-black text-2xl tracking-tight block mt-1">
                                {monthsRemaining > 1200 ? "99+ Years" : `${monthsRemaining} Months`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Purge Auditing Timelines */}
              <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-serif text-base font-bold text-[#0D1B2A] border-b border-gray-100 pb-2">
                  Permanent Purge Verification & Audit Register
                </h3>

                {auditLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 font-mono">No permanent delete operations have been audited yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-slate-50 font-bold uppercase border-b text-gray-500 text-[10px]">
                          <th className="p-3">Reference Log Id</th>
                          <th className="p-3">Target Kind</th>
                          <th className="p-3">Target Reference Id</th>
                          <th className="p-3">Operator Admin</th>
                          <th className="p-3">Records Scrubbed</th>
                          <th className="p-3 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {auditLogs.map((log: any) => (
                          <tr key={log.id}>
                            <td className="p-3 font-semibold text-slate-850">{log.id}</td>
                            <td className="p-3 capitalize">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.targetType === "user" ? "bg-purple-50 text-purple-700" : "bg-teal-50 text-teal-700"
                              }`}>
                                {log.targetType}
                              </span>
                            </td>
                            <td className="p-3 text-gray-500 break-all">{log.targetId}</td>
                            <td className="p-3 font-sans font-bold text-gray-750">{log.purgedBy}</td>
                            <td className="p-3">
                              <div className="space-y-0.5 text-[10px]">
                                {Object.entries(log.counts || {}).map(([collection, count]: any) => (
                                  count > 0 && (
                                    <span key={collection} className="inline-block mr-2 text-slate-600 bg-slate-100 px-1 py-0.2 rounded font-semibold text-[9px]">
                                      {collection}: {count}
                                    </span>
                                  )
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-right text-gray-400 text-[11px]">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 9: DYNAMIC SYSTEM CONFIGURATION (GST & SHIPPING) */}
          {activeTab === "settings" && (
            <div className="bg-white border border-gray-150 p-6 sm:p-8 rounded-2xl shadow-sm space-y-8">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#D4820A] font-bold">LEDGER SETTINGS PANEL</span>
                <h2 className="font-serif text-xl font-black text-[#0D1B2A] mt-1">GST & Shipping Rates Configuration</h2>
                <p className="text-xs text-gray-500 mt-1">Configure live variables that calculate order pricing, surcharge taxes, and shipping expenses globally.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* GST Rate Control */}
                <div className="border border-gray-150 p-5 rounded-xl space-y-3 bg-slate-50">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-gray-650">GST Percentage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono font-bold font-sans"
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                    Set the dynamic percentage of surcharge GST added in checkout payments. Under current drug regulatory protocols, standard medical supplies calculate at 5-12%.
                  </p>
                </div>

                {/* Shipping Rate per KM */}
                <div className="border border-gray-150 p-5 rounded-xl space-y-3 bg-slate-50">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-gray-650">Shipping Rate (₹ per KM)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono font-bold font-sans"
                    value={shippingCostPerKm}
                    onChange={(e) => setShippingCostPerKm(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                    Set the charge per unit distance inside Hyderabad municipal boundaries. Final shipping cost equals <b>Rate × Delivery KMs</b> (unless cart subtotal qualifies for free shipping).
                  </p>
                </div>

                {/* Default Delivery KMs */}
                <div className="border border-gray-150 p-5 rounded-xl space-y-3 bg-slate-50">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-gray-650">Service Range Distance (KM)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono font-bold font-sans"
                    value={deliveryDistanceKms}
                    onChange={(e) => setDeliveryDistanceKms(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                    The default radius of dispatches originating from Gajularamaram, Hyderabad. Adjust this to expand our physical delivery range.
                  </p>
                </div>
              </div>

              {/* Display of simulated results */}
              <div className="bg-slate-900 text-slate-300 p-5 rounded-xl font-mono text-xs space-y-2">
                <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">LIVE INVOICE PROJECTION SOLVER</span>
                <p className="text-white">• Base Delivery Cost: <span className="font-bold text-amber-300">₹{(deliveryDistanceKms * shippingCostPerKm).toFixed(2)}</span> (for orders &lt; ₹1000)</p>
                <p className="text-white">• GST Rate Surcharge: <span className="font-bold text-amber-300">{gstPercentage}%</span> of post-discount subtotal</p>
                <p className="text-gray-400 leading-normal text-[10px] pt-1 font-sans">
                  💡 Customers during checkout will instantly receive these exact rates. Let's save the settings to update the transaction engine immediately!
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSettingsSuccess("");
                    addDraftChange({
                      type: "update_settings",
                      description: `⚙️ Update GST & Shipping: GST (${gstPercentage}%), Rate (₹${shippingCostPerKm}/km), Range (${deliveryDistanceKms}km)`,
                      payload: { shippingCostPerKm, deliveryDistanceKms, gstPercentage }
                    });
                    setSettingsSuccess("System settings added to pending draft queue! Click 'Save & Submit All Changes' above to apply globally.");
                    setTimeout(() => setSettingsSuccess(""), 5000);
                  }}
                  className="px-6 py-2.5 bg-[#0D1B2A] text-white hover:bg-black font-bold uppercase text-xs rounded-xl flex items-center gap-2 tracking-widest cursor-pointer shadow"
                >
                  Save Settings & Update Ledger
                </button>
              </div>

              {settingsSuccess && (
                <p className="text-xs text-center font-mono font-black text-emerald-600 bg-emerald-50 border border-emerald-250 p-4 rounded-xl animate-pulse">
                  ✓ {settingsSuccess}
                </p>
              )}
            </div>
          )}

          {/* TAB 10: OFFLINE BILL GENERATOR */}
          {activeTab === "offline-bill" && (
            <div className="space-y-6">
              
              {/* Header card */}
              <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm">
                <span className="text-xs font-mono uppercase tracking-widest text-[#D4820A] font-bold">OFFLINE TRANSACTION TERMINAL</span>
                <h2 className="font-serif text-xl font-black text-[#0D1B2A] mt-1">Walk-in Customer Offline Bill Generator</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Generate official monochrome thermal receipts (80mm/58mm standard) for walk-in transactions instantly. Note: these records bypass database storage.
                </p>
              </div>

              {/* Grid Layout for Configuration vs Items list */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left column: customer info & add items (span 5) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Section 1: Customer & Shop Details */}
                  <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-sm font-bold font-serif text-gray-950 border-b border-gray-100 pb-2">Customer & Shop Details</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1">Customer Name (Optional)</label>
                        <input
                          type="text"
                          placeholder="Walk-in Customer"
                          value={offlineCustName}
                          onChange={(e) => setOfflineCustName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs font-sans focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1">Phone Number (For WhatsApp)</label>
                        <input
                          type="text"
                          placeholder="+91XXXXXXXXXX"
                          value={offlineCustPhone}
                          onChange={(e) => setOfflineCustPhone(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs font-sans focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1">Email Address (For Email)</label>
                        <input
                          type="email"
                          placeholder="customer@email.com"
                          value={offlineCustEmail}
                          onChange={(e) => setOfflineCustEmail(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs font-sans focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1">Shop Division</label>
                        <select
                          value={offlineShopDivision}
                          onChange={(e) => setOfflineShopDivision(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs font-sans focus:bg-white focus:outline-none cursor-pointer"
                        >
                          <option value="mixed">Mixed (Both Divisions)</option>
                          <option value="medicals">Nuthan Medicals</option>
                          <option value="stationery">JA Stationery</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SMTP Connection Diagnostic Card */}
                  <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h3 className="text-sm font-bold font-serif text-gray-950">SMTP Mail Diagnostics</h3>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-mono uppercase font-bold">SMTP STATUS</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Check if Hostinger mail credentials (`EMAIL_USER`, `EMAIL_PASS`, etc.) connect successfully from this server environment.
                    </p>
                    <button
                      type="button"
                      disabled={testingSmtp}
                      onClick={handleTestSmtp}
                      className="w-full py-1.5 px-3 bg-slate-900 text-white hover:bg-slate-800 font-bold uppercase text-[10px] tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {testingSmtp ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Testing SMTP...</span>
                        </>
                      ) : (
                        <span>Verify SMTP Connection</span>
                      )}
                    </button>
                    {smtpTestResult && (
                      <div className={`p-3 rounded-lg text-xs font-mono break-all ${smtpTestResult.success ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-rose-50 border border-rose-200 text-rose-800"}`}>
                        <p className="font-bold mb-1">{smtpTestResult.success ? "✅ Connection Succeeded" : "❌ Connection Failed"}</p>
                        <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{smtpTestResult.details}</p>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Add Items */}
                  <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-sm font-bold font-serif text-gray-950 border-b border-gray-100 pb-2">Add Items to Bill</h3>
                    
                    {/* Option A: Search Catalogue */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500">Option A: Search Catalogue</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Type product name to search..."
                          value={offlineSearch}
                          onChange={(e) => setOfflineSearch(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs pl-8 focus:bg-white focus:outline-none"
                        />
                        <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2" />
                      </div>

                      {/* Search Results list */}
                      {offlineSearchLoading && (
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 font-mono p-1">
                          <Loader2 className="h-3 w-3 animate-spin text-slate-500" /> Searching...
                        </div>
                      )}
                      
                      {offlineSearchResults.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm max-h-48 overflow-y-auto divide-y divide-gray-100 mt-1">
                          {offlineSearchResults.map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleAddCatalogItem(prod)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex justify-between items-center cursor-pointer transition-colors"
                            >
                              <div>
                                <span className="font-semibold text-gray-900">{prod.name}</span>
                                <span className="ml-2 text-[10px] text-slate-400 uppercase font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                  {prod.shop === "medicals" ? "Meds" : "Stat"}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-[#0F6E56]">₹{prod.price.toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-gray-100"></div>
                      <span className="flex-shrink mx-3 text-[10px] font-mono text-gray-400 uppercase">OR</span>
                      <div className="flex-grow border-t border-gray-100"></div>
                    </div>

                    {/* Option B: Custom Item */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500">Option B: Custom Line Item</label>
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          placeholder="Custom item description..."
                          value={customItemName}
                          onChange={(e) => setCustomItemName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-mono font-bold uppercase text-gray-400 mb-0.5">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="1"
                              value={customItemQty}
                              onChange={(e) => setCustomItemQty(parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono font-bold uppercase text-gray-400 mb-0.5">Price (₹)</label>
                            <input
                              type="text"
                              placeholder="0.00"
                              value={customItemPrice}
                              onChange={(e) => setCustomItemPrice(e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomItem}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Add Custom Item
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Right column: active items list & bill summary (span 7) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Bill Items List Table */}
                  <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <h3 className="text-sm font-bold font-serif text-gray-950">Active Bill Line Items</h3>
                      {offlineItems.length > 0 && (
                        <button
                          type="button"
                          onClick={handleResetOfflineBill}
                          className="text-[10px] text-red-500 font-mono hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" /> Clear Bill
                        </button>
                      )}
                    </div>

                    {offlineItems.length === 0 ? (
                      <div className="py-16 text-center text-xs text-gray-400 font-sans border-2 border-dashed border-gray-100 rounded-xl">
                        No items added to the bill yet. Use the left panel to search products or add custom items.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                              <tr className="bg-slate-50 font-mono font-bold uppercase text-[10px] tracking-wider text-gray-500 border-b border-gray-100">
                                <th className="py-2 px-3">Item Description</th>
                                <th className="py-2 px-3 text-center w-20">Qty</th>
                                <th className="py-2 px-3 text-right w-24">Unit Price</th>
                                <th className="py-2 px-3 text-right w-28">Line Total</th>
                                <th className="py-2 px-3 text-center w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {offlineItems.map((item, index) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3">
                                    <div className="font-semibold text-gray-900">{item.name}</div>
                                    <div className="text-[9px] text-gray-400 uppercase font-mono mt-0.5">
                                      {item.isCustomItem ? "Custom Line" : "Catalog Asset"}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQty(index, item.quantity - 1)}
                                        className="h-5 w-5 rounded border border-gray-200 bg-white hover:bg-slate-100 flex items-center justify-center text-xs cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className="font-mono font-semibold w-6 text-center text-xs">{item.quantity}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQty(index, item.quantity + 1)}
                                        className="h-5 w-5 rounded border border-gray-200 bg-white hover:bg-slate-100 flex items-center justify-center text-xs cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-650">
                                    ₹{item.unitPrice.toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                                    ₹{(item.unitPrice * item.quantity).toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(index)}
                                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Running totals panel */}
                        <div className="bg-slate-50 border border-gray-150 p-4 rounded-xl space-y-2">
                          <div className="flex justify-between text-xs text-gray-500 font-sans">
                            <span>Subtotal:</span>
                            <span className="font-mono font-bold">₹{offlineSubtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 font-sans">
                            <span>CGST & SGST (5%):</span>
                            <span className="font-mono font-bold">₹{offlineTax.toFixed(2)}</span>
                          </div>
                          <div className="border-t border-gray-200/60 pt-2 flex justify-between text-sm font-bold text-gray-900 font-serif">
                            <span>TOTAL DUE:</span>
                            <span className="font-mono text-[#0F6E56]">₹{offlineTotal.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Minimum ₹750 Warning banner */}
                        {isBelowMinimum && (
                          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed font-sans">
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Notice:</span> Total bill amount (₹{offlineTotal.toFixed(2)}) is below the recommended ₹750 threshold for home delivery invoices. However, walk-in cash bills can still be finalized and generated successfully.
                            </div>
                          </div>
                        )}
                        
                        {/* Status errors or successes */}
                        {offlineBillError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-sans">
                            ⚠️ {offlineBillError}
                          </div>
                        )}

                        {offlineBillSuccess && (
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2 font-sans">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Check className="h-4 w-4 text-emerald-600" />
                              <span>Success! Receipt Action Complete</span>
                            </div>
                            <p className="leading-relaxed">{offlineBillSuccess}</p>
                            <button
                              type="button"
                              onClick={handleResetOfflineBill}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[10px] tracking-wider rounded-md cursor-pointer transition-colors"
                            >
                              + Start New Bill
                            </button>
                          </div>
                        )}

                        {/* Delivery Control Buttons */}
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                            Select Deliverable Method & Generate
                          </p>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* Download */}
                            <button
                              type="button"
                              disabled={offlineGenerating}
                              onClick={() => handleOfflineBillGenerate("download")}
                              className="py-2.5 px-3 bg-slate-900 text-white hover:bg-black font-bold uppercase text-[10px] tracking-widest rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Upload className="h-4 w-4 rotate-180" />
                              <span>Download</span>
                            </button>

                            {/* Print */}
                            <button
                              type="button"
                              disabled={offlineGenerating}
                              onClick={() => handleOfflineBillGenerate("print")}
                              className="py-2.5 px-3 bg-[#0D1B2A] text-white hover:bg-[#1a2e40] font-bold uppercase text-[10px] tracking-widest rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Activity className="h-4 w-4" />
                              <span>Print</span>
                            </button>

                            {/* WhatsApp */}
                            <button
                              type="button"
                              disabled={offlineGenerating}
                              onClick={() => handleOfflineBillGenerate("whatsapp")}
                              className="py-2.5 px-3 bg-[#25D366] text-white hover:bg-[#20ba59] font-bold uppercase text-[10px] tracking-widest rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Phone className="h-4 w-4" />
                              <span>WhatsApp</span>
                            </button>

                            {/* Email */}
                            <button
                              type="button"
                              disabled={offlineGenerating}
                              onClick={() => handleOfflineBillGenerate("email")}
                              className="py-2.5 px-3 bg-[#0F6E56] text-white hover:bg-[#0c5946] font-bold uppercase text-[10px] tracking-widest rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Mail className="h-4 w-4" />
                              <span>Email</span>
                            </button>
                          </div>
                          
                          {offlineGenerating && (
                            <div className="text-center text-xs text-gray-500 font-mono mt-3 flex items-center justify-center gap-1.5">
                              <Loader2 className="h-4 w-4 animate-spin text-[#0D1B2A]" /> Processing dispatch request...
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 11: PUSH NOTIFICATION ADVERTISEMENTS */}
          {activeTab === "advertisement" && (
            <PushAdvertisementsPanel token={token} />
          )}

        </div>
      )}

      {/* --- ADD / EDIT PRODUCT FORM MODAL --- */}
      {showFormModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowFormModal(false)}
            onTouchStart={() => setShowFormModal(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none select-none">
            <div ref={formModalRef} tabIndex={-1} className="pointer-events-auto outline-none bg-white rounded-2xl shadow-xl border border-gray-150 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            
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
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Brand</label>
                <input
                  type="text"
                  required
                  placeholder="JANUZEN"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Price Per Piece (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="10.00"
                  value={formPricePerPiece}
                  onChange={(e) => setFormPricePerPiece(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Pieces Per Unit / Pack</label>
                <input
                  type="number"
                  required
                  placeholder="10"
                  value={formPiecesPerUnit}
                  onChange={(e) => setFormPiecesPerUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 uppercase font-bold tracking-widest block">Total Units Available</label>
                <input
                  type="number"
                  required
                  placeholder="15"
                  value={formTotalUnitsAvailable}
                  onChange={(e) => setFormTotalUnitsAvailable(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-850"
                />
              </div>

              {/* Automatic Live Calculations Display */}
              <div className="sm:col-span-2 bg-emerald-50/50 border border-emerald-150 p-3.5 rounded-xl space-y-1 font-sans text-xs">
                <p className="font-bold text-[#0F6E56] uppercase tracking-wider text-[10px] mb-1">⚡ Dynamic Inventory Matrix (Auto-Calculated)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block">Total Pieces Available:</span>
                    <span className="font-mono font-black text-sm text-slate-800">
                      {(Number(formPiecesPerUnit) || 1) * (Number(formTotalUnitsAvailable) || 0)} pieces
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Unit Retail Price:</span>
                    <span className="font-mono font-black text-sm text-[#0F6E56]">
                      ₹{((Number(formPricePerPiece) || 0) * (Number(formPiecesPerUnit) || 1)).toFixed(2)}
                    </span>
                  </div>
                </div>
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
        </>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${confirmDialog.isDestructive ? 'bg-red-50 dark:bg-red-950/50 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
                {confirmDialog.isDestructive ? '⚠️' : 'ℹ️'}
              </div>
              <h3 className="font-sans font-bold text-lg text-slate-900 dark:text-white">
                {confirmDialog.title}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-3 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer transition-colors shadow-sm ${
                  confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0D1B2A] hover:bg-slate-800'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
