import React from "react";
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from "../utils/storage";
import { ChevronLeft, ShoppingBag, Truck, ShieldCheck, Heart, Share2, Plus, Minus, Tag, Star, Check } from "lucide-react";
import { Product, ProductOption } from "../types";
import { getProductOptions } from "../utils/productOptions";

interface ProductDetailViewProps {
  productId: string;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  onAddToBag: (product: Product, quantity?: number, selectedOption?: ProductOption) => void;
  wishlistProductIds?: string[];
  onToggleWishlist?: (productId: string, productType: 'medicals' | 'stationery') => void;
}

export default function ProductDetailView({ 
  productId, 
  onNavigate, 
  onAddToBag,
  wishlistProductIds = [],
  onToggleWishlist
}: ProductDetailViewProps) {
  const [product, setProduct] = React.useState<Product | null>(null);
  const [related, setRelated] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [quantity, setQuantity] = React.useState(1);
  const [copied, setCopied] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState<ProductOption | null>(null);
  const [activeTab, setActiveTab] = React.useState<"overview" | "specs" | "reviews">("overview");

  const [reviews, setReviews] = React.useState<any[]>([]);
  const [reviewRating, setReviewRating] = React.useState(5);
  const [reviewComment, setReviewComment] = React.useState("");
  const [reviewSubmitting, setReviewSubmitting] = React.useState(false);

  const loadReviews = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (e) {
      console.error("Failed to load product reviews:", e);
    }
  }, [productId]);

  React.useEffect(() => {
    if (productId) {
      loadReviews();
    }
  }, [productId, loadReviews]);

  const loggedInUser = React.useMemo(() => {
    try {
      const uStr = localStorage.getItem("januzen_user") || sessionStorage.getItem("januzen_user");
      return uStr ? JSON.parse(uStr) : null;
    } catch {
      return null;
    }
  }, []);

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      (window as any).showToast?.("Please enter a review comment.", "error");
      return;
    }
    const jwtToken = localStorage.getItem("januzen_token") || sessionStorage.getItem("januzen_token");
    if (!jwtToken) {
      (window as any).showToast?.("You must be signed in to post a product review!", "error");
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReviewComment("");
        setReviewRating(5);
        setReviews(prev => [data.review, ...prev]);
        (window as any).showToast?.("Review submitted successfully! Thank you. ❤️", "success");
      } else {
        const data = await res.json();
        (window as any).showToast?.(data.error || "Failed to submit review.", "error");
      }
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Network discrepancy occurred trying to register your review.", "error");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const options = product ? getProductOptions(product) : [];

  React.useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${productId}`);
        if (res.ok) {
          const prodData = await res.json();
          setProduct(prodData);
          setQuantity(1);
          
          const opts = getProductOptions(prodData);
          if (opts.length > 0) {
            setSelectedOption(opts[1] || opts[0]);
          } else {
            setSelectedOption(null);
          }

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
  const badgeStyle = isMed 
    ? "bg-slate-900/95 text-teal-300 border-teal-800/60" 
    : "bg-slate-900/95 text-amber-300 border-amber-800/60";
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
              <span className="font-mono text-2xl font-black text-slate-900">
                ₹{((selectedOption ? selectedOption.price : product.price) * quantity).toFixed(2)}
              </span>
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

            {/* Unit/Option Selection */}
            {options.length > 0 && (
              <div className="space-y-2.5 pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Select Unit / Packaging Option:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {options.map((opt) => {
                    const isSelected = selectedOption?.name === opt.name;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setSelectedOption(opt)}
                        className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-slate-50 border-slate-950 ring-2 ring-slate-950/10 shadow-sm"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="font-sans text-xs font-bold text-slate-900 leading-snug">
                          {opt.name}
                        </span>
                        <span className="font-mono text-sm font-black text-[#0D1B2A] mt-1">
                          ₹{opt.price.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
            {/* Wishlist, Share, and add to basket controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {!isOutOfStock ? (
                <>
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
                      onClick={() => setQuantity(q => Math.min(q + 1, product.stockQuantity ?? product.stock))}
                      disabled={quantity >= (product.stockQuantity ?? product.stock)}
                      className="p-1 text-gray-500 hover:text-black hover:bg-gray-200 rounded disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => onAddToBag(product, quantity, selectedOption || undefined)}
                    className={`flex-1 text-white text-sm font-bold tracking-wide py-3 px-6 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${btnColor}`}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Shopping Bag
                  </button>
                </>
              ) : (
                <div className="flex-1 bg-red-50 text-red-700 border border-red-200 py-3 px-4 rounded-lg text-xs font-mono font-bold text-center">
                  ⚠️ Bespoke item is temporarily completely vacant.
                </div>
              )}

              {/* Wishlist and Share button triggers side-by-side */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleWishlist) onToggleWishlist(product.id, product.shop);
                  }}
                  className="p-3 bg-white hover:bg-red-50 text-slate-700 hover:text-red-100 rounded-lg border border-gray-250 flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
                  title={wishlistProductIds.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart className={`h-5 w-5 transition-colors ${wishlistProductIds.includes(product.id) ? "fill-red-600 stroke-red-600 text-red-600" : "text-slate-500"}`} />
                </button>

                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${product.id}`;
                    navigator.clipboard.writeText(shareUrl).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  className="p-3 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-600 rounded-lg border border-gray-250 flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
                  title="Copy product link"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-teal-600" />
                  ) : (
                    <Share2 className="h-5 w-5 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

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
        <div className="flex gap-6 border-b border-gray-100 pb-3 overflow-x-auto">
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
          <button
            onClick={() => setActiveTab("reviews")}
            className={`font-serif text-base pb-3 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === "reviews" ? "border-slate-900 text-slate-900" : "border-transparent text-gray-400"
            }`}
          >
            Customer Reviews ({reviews.length})
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-600 leading-relaxed">
          {activeTab === "overview" && (
            <div className="space-y-4 font-sans text-gray-600">
              <p>
                This {isMed ? "medical pharmaceutical formulation" : "high-end business school workstation accessory"} represents JANUZEN's commitment to materials absolute compliance. Every unit is selected from batch-audited lines, verified clean of structural discrepancies, and packaged in a clean dynamic humidity-shielded facility.
              </p>
              <p>
                Designed for both domestic household purposes or demanding professional workspace layouts, it ensures dependable durability and pristine operational capability in its domain.
              </p>
            </div>
          )}

          {activeTab === "specs" && (
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

          {activeTab === "reviews" && (
            <div className="space-y-8 font-sans">
              {/* Product Review Entry */}
              <div className="bg-slate-50 border border-gray-150/60 rounded-xl p-5">
                {loggedInUser ? (
                  <form onSubmit={handlePostReview} className="space-y-4">
                    <div>
                      <h4 className="font-serif text-[#0D1B2A] font-bold text-sm">Write an Honest Evaluation</h4>
                      <p className="text-[11px] text-gray-400">Your review will be instantly synchronized onto this product's catalogue page.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">Set Rating Score:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setReviewRating(index)}
                            className="p-1 cursor-pointer transition-transform hover:scale-110"
                          >
                            <Star
                              className={`h-5 w-5 ${
                                index <= reviewRating ? "text-amber-400 fill-amber-400" : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-gray-800">
                        {reviewRating === 5 && "5/5 - Outstanding!"}
                        {reviewRating === 4 && "4/5 - Great Experiences"}
                        {reviewRating === 3 && "3/5 - Good / Average"}
                        {reviewRating === 2 && "2/5 - Fairly Disappointing"}
                        {reviewRating === 1 && "1/5 - Unsatisfactory/Poor"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <textarea
                        required
                        placeholder="Share your personal experience with the features, materials quality, delivery state, as well as general logistics speed..."
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-xs font-sans text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#0D1B2A]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="inline-flex items-center gap-2 bg-[#0D1B2A] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      {reviewSubmitting ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-xs text-gray-500 font-serif font-bold">Want to evaluate this catalogue option?</p>
                    <p className="text-[11px] text-gray-400 font-sans">You must access your account to post reviews.</p>
                    <button
                      onClick={() => onNavigate("login")}
                      className="px-4 py-2 border border-[#0D1B2A] text-[#0D1B2A] hover:bg-slate-50 text-xs font-bold font-mono tracking-wider uppercase rounded-md cursor-pointer mt-1"
                    >
                      Authenticate Account
                    </button>
                  </div>
                )}
              </div>

              {/* Reviews List Rendering */}
              <div className="space-y-4">
                <h4 className="font-serif text-[#0D1B2A] font-bold text-base border-b border-gray-100 pb-2">Verified Customer Experiences</h4>
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="font-serif text-sm italic">No reviews logged for this product.</p>
                    <p className="text-[11px] mt-1 font-sans">Be the first to evaluate this supply item!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="p-4 border border-gray-100 rounded-xl bg-white space-y-2.5 shadow-xs">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            {rev.userImage ? (
                              <img
                                src={rev.userImage}
                                alt={rev.userName}
                                referrerPolicy="no-referrer"
                                className="h-7 w-7 rounded-full border border-gray-200 object-cover"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-slate-200 text-[#0f1b2a] flex items-center justify-center font-bold font-mono text-[10px]">
                                {rev.userName.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="font-serif font-bold text-xs text-gray-900 block">{rev.userName}</span>
                              <span className="text-[9px] text-gray-400 font-mono block">
                                {new Date(rev.createdAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
                              </span>
                            </div>
                          </div>
                          
                          {/* Star Score representation */}
                          <div className="flex gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((sIndex) => (
                              <Star
                                key={sIndex}
                                className={`h-3 w-3 ${
                                  sIndex <= rev.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 font-sans leading-relaxed pl-1 whitespace-pre-wrap">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
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
                  <span className="text-xs font-mono font-extrabold text-[#0D1B2A] block mt-2">₹{p.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
