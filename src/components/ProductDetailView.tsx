import React from "react";
import { ChevronLeft, ShoppingBag, Truck, ShieldCheck, Heart, Share2, Plus, Minus, Tag } from "lucide-react";
import { Product } from "../types";

interface ProductDetailViewProps {
  productId: string;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  onAddToBag: (product: Product, quantity?: number) => void;
}

export default function ProductDetailView({ productId, onNavigate, onAddToBag }: ProductDetailViewProps) {
  const [product, setProduct] = React.useState<Product | null>(null);
  const [related, setRelated] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [quantity, setQuantity] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState<"overview" | "specs">("overview");

  React.useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${productId}`);
        if (res.ok) {
          const prodData = await res.json();
          setProduct(prodData);
          setQuantity(1);

          // After getting product, fetch related ones in the same shop and category
          const relRes = await fetch(`/api/products?shop=${prodData.shop}&category=${prodData.category}`);
          if (relRes.ok) {
            const relData = await relRes.json();
            const filteredRel = (relData.products || []).filter((p: Product) => p.id !== prodData.id).slice(0, 3);
            setRelated(filteredRel);
          }
        } else {
          setProduct(null);
        }
      } catch (err) {
        console.error("Failed to load product details ledger record:", err);
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      loadProduct();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="h-10 w-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-sm text-gray-400 font-mono">Retreiving warehouse product ledger detail...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900 font-serif">Product Not Found</h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">This item is either out of season, soft-deleted by admin, or has an invalid ledger identifier.</p>
        <button
          onClick={() => onNavigate("home")}
          className="px-4 py-2 bg-[#0D1B2A] text-white rounded text-xs font-semibold cursor-pointer"
        >
          Return Home
        </button>
      </div>
    );
  }

  const isMed = product.shop === "medicals";
  const btnColor = isMed ? "bg-[#0F9B8E] hover:bg-[#0c7f74]" : "bg-[#D4820A] hover:bg-[#b56e07]";
  const borderFocus = isMed ? "focus:border-teal-500" : "focus:border-amber-500";
  const badgeStyle = isMed ? "bg-teal-50 text-teal-800 border-teal-100" : "bg-amber-50 text-amber-800 border-amber-100";
  const isOutOfStock = product.stock === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Back button link */}
      <button
        onClick={() => onNavigate(product.shop)}
        className="flex items-center gap-2 text-xs font-bold text-[#0D1B2A] hover:opacity-80 transition-opacity mb-8 uppercase tracking-widest font-mono cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
        Return to {isMed ? "Nuthan Medicals" : "JA Stationery"} Shop
      </button>

      {/* Product Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
        
        {/* Product picture container */}
        <div className="relative rounded-xl overflow-hidden border border-gray-150 h-96 md:h-[450px]">
          <img
            src={product.image}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <span className={`absolute top-4 left-4 text-xs font-bold uppercase py-1 px-3 rounded-full border border-white/20 shadow backdrop-blur-md ${badgeStyle}`}>
            {isMed ? "Nuthan Medicals" : "JA Stationery"}
          </span>
        </div>

        {/* Informational specs and add to bag */}
        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs uppercase font-mono tracking-widest text-gray-400 block">{product.category}</span>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight leading-tight">
              {product.name}
            </h1>
            
            {/* Price section and active Stock badge */}
            <div className="flex items-center gap-4 py-2 border-y border-gray-100">
              <span className="font-mono text-2xl font-black text-slate-900">${product.price.toFixed(2)}</span>
              {isOutOfStock ? (
                <span className="bg-red-50 text-red-800 border border-red-200 text-xs font-bold px-3 py-1 rounded-full">
                  Currently Out of Stock
                </span>
              ) : product.stock < 5 ? (
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                  Only {product.stock} items remaining!
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
                  In Stock ({product.stock} available)
                </span>
              )}
            </div>

            <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>

            {/* Tags and Metadata badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              {product.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-slate-100/80 px-2.5 py-1 rounded-md font-medium border border-gray-150">
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-100">
            {/* Add to basket controls if in stock */}
            {!isOutOfStock && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-2 bg-slate-50 min-w-[120px]">
                  <button
                    onClick={() => setQuantity(q => Math.max(q - 1, 1))}
                    disabled={quantity <= 1}
                    className="p-1 text-gray-500 hover:text-black hover:bg-gray-200 rounded disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-sm font-bold text-gray-800 px-4">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(q + 1, product.stock))}
                    disabled={quantity >= product.stock}
                    className="p-1 text-gray-500 hover:text-black hover:bg-gray-200 rounded disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={() => onAddToBag(product, quantity)}
                  className={`flex-1 text-white text-sm font-bold tracking-wide py-3 px-6 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${btnColor}`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Add to Shopping Bag
                </button>
              </div>
            )}

            {/* Corporate Assurances */}
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 select-none">
              <div className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-teal-600" />
                <span>Secure Logistics Network</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#D4820A]" />
                <span>WHO-GMP Genuine Vouched</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tabs list (specs/description) */}
      <div className="mt-12 bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex gap-6 border-b border-gray-100 pb-3">
          <button
            onClick={() => setActiveTab("overview")}
            className={`font-serif text-base pb-3 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === "overview" ? "border-slate-900 text-slate-900" : "border-transparent text-gray-400"
            }`}
          >
            Product Overview
          </button>
          <button
            onClick={() => setActiveTab("specs")}
            className={`font-serif text-base pb-3 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === "specs" ? "border-slate-900 text-slate-900" : "border-transparent text-gray-400"
            }`}
          >
            Regulatory & Specifications
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-600 leading-relaxed">
          {activeTab === "overview" ? (
            <div className="space-y-4">
              <p>
                This {isMed ? "medical pharmaceutical formulation" : "high-end business school workstation accessory"} represents JANUZEN's commitment to materials absolute compliance. Every unit is selected from batch-audited lines, verified clean of structural discrepancies, and packaged in a clean dynamic humidity-shielded facility.
              </p>
              <p>
                Designed for both domestic household purposes or demanding professional workspace layouts, it ensures dependable durability and pristine operational capability in its domain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 bg-slate-50/50 rounded-lg">
                <span className="text-gray-400">Inventory SKU identifier</span>
                <p className="font-semibold text-gray-900">{product.id.toUpperCase()}-{product.shop.substring(0,3).toUpperCase()}</p>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-lg">
                <span className="text-gray-400">Associated Business Unit</span>
                <p className="font-semibold text-gray-900 capitalize">{product.shop} Division</p>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-lg">
                <span className="text-gray-400">Tax Compliance scale</span>
                <p className="font-semibold text-gray-900">5.0% CGST Registered</p>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-lg">
                <span className="text-gray-400">License Reference No.</span>
                <p className="font-semibold text-gray-900">JAN-BU-{isMed ? "MED-849PL" : "STT-244CL"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products Grid */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="font-serif text-2xl font-extrabold text-[#0D1B2A] mb-8 border-b border-gray-100 pb-3">Related Discoveries</h2>
          
          <div className="grid sm:grid-cols-3 gap-6">
            {related.map(p => (
              <div
                key={p.id}
                onClick={() => onNavigate("product-detail", { productId: p.id })}
                className="group bg-white border border-gray-100 hover:border-gray-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <img
                  src={p.image}
                  alt={p.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-36 object-cover group-hover:scale-102 transition-transform"
                />
                <div className="p-4">
                  <span className="text-[10px] font-mono font-bold text-gray-400 block uppercase">{p.category}</span>
                  <h3 className="font-serif text-sm font-bold text-gray-900 truncate mt-1">{p.name}</h3>
                  <span className="text-xs font-mono font-extrabold text-[#0D1B2A] block mt-2">${p.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
