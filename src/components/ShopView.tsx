import React from "react";
import { gsap } from "gsap";
import { Search, Filter, RotateCcw, AlertCircle, ShoppingBag, Grid, ChevronLeft, ChevronRight, Heart, Share2, Check } from "lucide-react";
import { Product } from "../types";

interface ShopViewProps {
  division: "medicals" | "stationery";
  onNavigate: (view: string, params?: Record<string, any>) => void;
  onAddToBag: (product: Product) => void;
  wishlistProductIds?: string[];
  onToggleWishlist?: (productId: string, productType: 'medicals' | 'stationery') => void;
}

export default function ShopView({ 
  division, 
  onNavigate, 
  onAddToBag, 
  wishlistProductIds = [], 
  onToggleWishlist 
}: ShopViewProps) {
  // Styles based on Division
  const themeTeal = "teal";
  const isMed = division === "medicals";
  
  const accentColor = isMed ? "text-teal-600" : "text-amber-600";
  const btnColor = isMed ? "bg-[#0F9B8E] hover:bg-[#0c7f74]" : "bg-[#D4820A] hover:bg-[#b56e07]";
  const borderFocus = isMed ? "focus:border-teal-500" : "focus:border-amber-500";
  const badgeStyle = isMed ? "bg-teal-50 text-teal-800 border-teal-100" : "bg-amber-50 text-amber-800 border-amber-100";
  const primaryLightBg = isMed ? "bg-teal-50/50" : "bg-amber-50/50";

  // Filter States
  const [products, setProducts] = React.useState<Product[]>([]);
  const [total, setTotal] = React.useState(0);
  const [categories, setCategories] = React.useState<string[]>([]);
  
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("");
  const [priceMax, setPriceMax] = React.useState<string>("");
  const [sort, setSort] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Load categories and products dynamically of active division
  React.useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch(`/api/meta/categories?shop=${division}`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
        }
      } catch (err) {
        console.error("Failed to load categories schema metadata info:", err);
      }
    }
    loadMeta();
    setSelectedCategory("");
    setSearch("");
    setPriceMax("");
    setSort("");
    setPage(1);
  }, [division]);

  // Load products when filters change
  const fetchProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("shop", division);
      if (search) params.append("search", search);
      if (selectedCategory) params.append("category", selectedCategory);
      if (priceMax) params.append("priceMax", priceMax);
      if (sort) params.append("sort", sort);
      params.append("page", String(page));
      params.append("limit", "8"); // Paginate size 8 inside grid

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      }
    } catch (err) {
      console.error("Failed to load division shop products index ledger:", err);
    } finally {
      setLoading(false);
    }
  }, [division, search, selectedCategory, priceMax, sort, page]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  React.useEffect(() => {
    if (!loading && products.length > 0) {
      gsap.fromTo(
        ".gsap-shop-card",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" }
      );
    }
  }, [products, loading]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setPriceMax("");
    setSort("");
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Division Heading Header */}
      <div className={`p-8 rounded-2xl mb-10 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        isMed 
          ? "bg-gradient-to-r from-[#0F9B8E] to-[#12B3A4]" 
          : "bg-gradient-to-r from-[#D4820A] to-[#F19C1D]"
      }`}>
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[#0.25em] font-bold font-mono text-white/80">JANUZEN division portal</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-black">{isMed ? "Nuthan Medicals Shop" : "JA Stationery Shop"}</h1>
          <p className="text-sm font-light text-white/95">
            {isMed 
              ? "Dispensing certified ethical drugs, diagnostic tools and sterile health aid accessories." 
              : "Source professional writing equipment, notebooks, binders and creative paint materials."}
          </p>
        </div>
        <div className="bg-white/15 px-4 py-2 rounded-xl border border-white/10 text-xs font-mono shrink-0">
          📍 SECURED DELIVERY NETWORK
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR FOR FILTERS */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200/80 rounded-xl p-5 space-y-6 shadow-sm">
            
            {/* Title / Clear option */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Refine Selection
              </span>
              <button
                onClick={handleResetFilters}
                className="text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1 text-xs cursor-pointer font-medium"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>

            {/* Keyword search bar */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-widest text-[#0D1B2A] block">Keyword Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Amoxicillin, journals, pens..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className={`w-full bg-slate-50 border border-gray-200 focus:outline-none focus:ring-1 ${borderFocus} rounded-lg pl-8 pr-3 py-2 text-sm text-gray-800`}
                />
                <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-3" />
              </div>
            </div>

            {/* Division categories list */}
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold uppercase tracking-widest text-[#0D1B2A] block">Categories</label>
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                <button
                  onClick={() => { setSelectedCategory(""); setPage(1); }}
                  className={`text-left text-xs py-1.5 px-3 rounded-lg transition-colors font-medium ${
                    selectedCategory === "" 
                      ? `${badgeStyle} font-bold` 
                      : "text-gray-600 hover:bg-slate-50"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setPage(1); }}
                    className={`text-left text-xs py-1.5 px-3 rounded-lg transition-colors font-medium truncate ${
                      selectedCategory === cat 
                        ? `${badgeStyle} font-bold` 
                        : "text-gray-600 hover:bg-slate-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Budget Limit */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-widest text-[#0D1B2A] block">Budget Maximizer</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono font-semibold">$0</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={priceMax || "100"}
                  onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-400 font-mono font-semibold">$100</span>
              </div>
              {priceMax && (
                <div className="text-xs text-right font-mono font-bold text-gray-600">
                  Maximum Limit: <span className="text-slate-900">${parseFloat(priceMax).toFixed(2)}</span>
                </div>
              )}
            </div>

          </div>
        </aside>

        {/* COMPREHENSIVE PRODUCT GRID */}
        <main className="lg:col-span-3 space-y-8">
          
          {/* Top Panel Filter details & Sort */}
          <div className="bg-white border border-gray-200/80 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-sm">
            <span className="text-gray-500 font-mono text-xs">
              Discovered <span className="font-extrabold text-gray-900">{total}</span> items in inventory catalog
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-400 font-medium font-mono">Sort Order:</span>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="bg-slate-50/60 border border-gray-200 py-1.5 px-3 rounded-lg text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="">Featured Defaults</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Alphabetical: A to Z</option>
                <option value="name-desc">Alphabetical: Z to A</option>
              </select>
            </div>
          </div>

          {/* Real inventory grid */}
          {loading ? (
            <div className="py-24 text-center">
              <div className={`mx-auto h-10 w-10 border-4 border-slate-200 border-t-current rounded-full animate-spin ${accentColor}`}></div>
              <p className="mt-4 text-sm text-gray-400 font-mono font-medium">Querying warehouse catalog ledgers...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-slate-50/40">
              <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 text-sm font-semibold">No products match current specifications</p>
              <p className="text-gray-400 text-xs mt-1">Try relaxing filters or search terms.</p>
              <button
                onClick={handleResetFilters}
                className={`mt-4 text-xs font-bold text-white px-4 py-2 rounded-lg ${btnColor}`}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((p) => {
                const isWishlisted = wishlistProductIds.includes(p.id);
                const isOutOfStock = (p.stockQuantity ?? p.stock) === 0;
                const isLowStock = !isOutOfStock && (p.stockQuantity ?? p.stock) <= (p.lowStockThreshold ?? 5);
                const stockVal = p.stockQuantity ?? p.stock;
                
                const isCopied = copiedId === p.id;
                const handleShareLink = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  const shareUrl = `${window.location.origin}${window.location.pathname}?product=${p.id}`;
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    setCopiedId(p.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  });
                };

                return (
                  <div
                    key={p.id}
                    className="gsap-shop-card group bg-white border border-gray-200/60 rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between relative group/tile"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-44 object-cover cursor-pointer group-hover:scale-[1.03] transition-transform duration-300"
                        onClick={() => onNavigate("product-detail", { productId: p.id })}
                      />
                      
                      {/* Integrated Heart Toggle & Share controls over image card */}
                      <div className="absolute top-3 right-3 flex gap-1.5 z-10 opacity-100 sm:opacity-0 sm:group-hover/tile:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleWishlist) onToggleWishlist(p.id, p.shop);
                          }}
                          className="h-7 w-7 bg-white/95 hover:bg-white text-slate-700 hover:text-red-600 rounded-full flex items-center justify-center shadow border border-gray-200 transition-all cursor-pointer"
                          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Heart className={`h-3.5 w-3.5 transition-colors ${isWishlisted ? "fill-red-600 stroke-red-600" : ""}`} />
                        </button>

                        <button
                          onClick={handleShareLink}
                          className="h-7 w-7 bg-white/95 hover:bg-white text-slate-700 hover:text-teal-600 rounded-full flex items-center justify-center shadow border border-gray-200 transition-all cursor-pointer"
                          title="Copy product link"
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-teal-600" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Inventory indicators */}
                      {isOutOfStock ? (
                        <span className="absolute top-3 left-3 text-[9px] font-extrabold uppercase bg-red-600 text-white px-2 py-0.5 rounded-full border border-red-500 shadow z-10">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="absolute top-3 left-3 text-[9px] font-extrabold uppercase bg-[#D4820A] text-white px-2 py-0.5 rounded-full border border-amber-500 shadow animate-pulse z-10">
                          Only {stockVal} left!
                        </span>
                      ) : null}

                      <span className={`absolute bottom-3 left-3 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badgeStyle} backdrop-blur-md z-10`}>
                        {p.category}
                      </span>
                    </div>

                    <div className="p-4 flex-grow flex flex-col justify-between">
                      <div>
                        <h3
                          onClick={() => onNavigate("product-detail", { productId: p.id })}
                          className="font-serif text-sm font-bold text-gray-900 hover:text-teal-600 cursor-pointer line-clamp-1"
                          title={p.name}
                        >
                          {p.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                          {p.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="font-mono text-base font-extrabold text-gray-950">₹{p.price.toFixed(2)}</span>
                        
                        <button
                          onClick={() => onAddToBag(p)}
                          disabled={isOutOfStock}
                          className={`text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                            isOutOfStock 
                              ? "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed" 
                              : btnColor
                          }`}
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          {isOutOfStock ? "Sold Out" : "Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {pages > 1 && (
            <div className={`border-t border-gray-150 pt-5 flex items-center justify-between p-4 rounded-xl ${primaryLightBg}`}>
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Page
              </button>
              
              <span className="text-xs font-mono font-bold text-gray-600">
                Page <span className="text-[#0D1B2A]">{page}</span> of {pages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(p + 1, pages))}
                disabled={page === pages}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next Page
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="border border-dashed border-gray-200 rounded-xl p-5 bg-slate-50 text-center">
            <p className="text-xs text-grat-500 italic">
              ⭐ Are you ordering corporate volumes or specialized medical clinic requisitions? Receive extra custom concessions by heading to our <span className="underline hover:text-blue-600 cursor-pointer font-bold" onClick={() => onNavigate("contact")}>Contact Enquiries page</span>.
            </p>
          </div>

        </main>
      </div>

    </div>
  );
}
