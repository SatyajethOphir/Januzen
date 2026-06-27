import React from "react";

// Helper Base Shimmer Box to keep layouts unified and highly scannable
function ShimmerBase({ className = "" }: { className?: string; key?: any }) {
  return (
    <div
      className={`relative overflow-hidden bg-slate-200 dark:bg-slate-800 rounded ${className}`}
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent"
        style={{
          backgroundSize: "200% 100%",
          animation: "shimmer-effect 1.6s infinite linear",
        }}
      />
    </div>
  );
}

// 🛒 1. Product / Menu Card Skeleton
export function ProductCardSkeleton() {
  return (
    <div className="bg-card-theme border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 space-y-4 shadow-sm flex flex-col justify-between h-[410px]">
      <div className="space-y-3">
        {/* Aspect Ratio Image Shimmer */}
        <ShimmerBase className="aspect-square w-full rounded-xl" />
        
        {/* Category & Brand labels */}
        <div className="flex justify-between items-center pt-1">
          <ShimmerBase className="h-4 w-1/3 rounded-full" />
          <ShimmerBase className="h-4 w-1/4 rounded-full" />
        </div>

        {/* Product Title */}
        <ShimmerBase className="h-5 w-4/5 rounded-md" />
        
        {/* Product Meta description lines */}
        <div className="space-y-1.5">
          <ShimmerBase className="h-3 w-full rounded" />
          <ShimmerBase className="h-3 w-5/6 rounded" />
        </div>
      </div>

      {/* Price & Action Button Row */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-800">
        <div className="space-y-1">
          <ShimmerBase className="h-3 w-8" />
          <ShimmerBase className="h-5 w-16" />
        </div>
        <ShimmerBase className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

// 💬 2. Testimonial Card Skeleton
export function TestimonialSkeleton() {
  return (
    <div className="bg-slate-50/50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl space-y-4">
      {/* Star rating indicators */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <ShimmerBase key={i} className="h-3 w-3 rounded-full" />
        ))}
      </div>

      {/* Testimonial text block */}
      <div className="space-y-2">
        <ShimmerBase className="h-4 w-full" />
        <ShimmerBase className="h-4 w-11/12" />
        <ShimmerBase className="h-4 w-4/5" />
      </div>

      {/* User profile row */}
      <div className="flex items-center gap-3 pt-3">
        <ShimmerBase className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <ShimmerBase className="h-4 w-1/3" />
          <ShimmerBase className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ⭐ 3. Featured Item Banner/Card Skeleton
export function FeaturedItemSkeleton() {
  return (
    <div className="bg-slate-950 rounded-3xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center min-h-[380px]">
      {/* Content details block */}
      <div className="space-y-6">
        <div className="space-y-3">
          <ShimmerBase className="h-4 w-28 rounded-full" />
          <ShimmerBase className="h-10 w-5/6 rounded-lg" />
          <ShimmerBase className="h-10 w-2/3 rounded-lg" />
        </div>
        <div className="space-y-2">
          <ShimmerBase className="h-3.5 w-full" />
          <ShimmerBase className="h-3.5 w-11/12" />
          <ShimmerBase className="h-3.5 w-4/5" />
        </div>
        <div className="flex gap-4">
          <ShimmerBase className="h-11 w-32 rounded-xl" />
          <ShimmerBase className="h-11 w-28 rounded-xl" />
        </div>
      </div>
      {/* Visual illustration slot */}
      <ShimmerBase className="aspect-video md:aspect-square w-full max-w-md mx-auto rounded-2xl" />
    </div>
  );
}

// 🏷️ 4. Category Tag/Bubble Skeleton
export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center space-y-2.5">
      <ShimmerBase className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl" />
      <ShimmerBase className="h-3.5 w-14 rounded" />
    </div>
  );
}

// 📰 5. Blog / News Card Skeleton
export function BlogCardSkeleton() {
  return (
    <div className="bg-card-theme border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs flex flex-col h-[420px]">
      <ShimmerBase className="h-48 w-full rounded-t-2xl" />
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <ShimmerBase className="h-3 w-16" />
            <ShimmerBase className="h-3 w-20" />
          </div>
          <ShimmerBase className="h-5 w-11/12 rounded" />
          <ShimmerBase className="h-5 w-4/5 rounded" />
          <div className="space-y-1.5 pt-1">
            <ShimmerBase className="h-3 w-full" />
            <ShimmerBase className="h-3 w-11/12" />
          </div>
        </div>
        <ShimmerBase className="h-4 w-24 rounded pt-2" />
      </div>
    </div>
  );
}

// 👥 6. Team Member Profile Skeleton
export function TeamMemberSkeleton() {
  return (
    <div className="text-center space-y-4">
      <ShimmerBase className="h-40 w-40 rounded-full mx-auto" />
      <div className="space-y-1.5">
        <ShimmerBase className="h-5 w-28 rounded mx-auto" />
        <ShimmerBase className="h-3 w-20 rounded mx-auto" />
      </div>
    </div>
  );
}

// 🖼️ 7. Gallery Grid Item Skeleton
export function GallerySkeleton() {
  return (
    <div className="relative group rounded-2xl overflow-hidden aspect-square">
      <ShimmerBase className="w-full h-full" />
    </div>
  );
}

// ❓ 8. FAQ Accordion Item Skeleton
export function FAQSkeleton() {
  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-card-theme">
      <div className="flex justify-between items-center">
        <ShimmerBase className="h-5 w-3/4 rounded" />
        <ShimmerBase className="h-5 w-5 rounded-full" />
      </div>
      <div className="space-y-1.5 pt-1">
        <ShimmerBase className="h-3 w-full" />
        <ShimmerBase className="h-3 w-5/6" />
      </div>
    </div>
  );
}

// 🧺 9. Cart Row Item Skeleton
export function CartItemSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-800">
      <ShimmerBase className="h-16 w-16 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-start">
          <ShimmerBase className="h-4 w-1/2 rounded" />
          <ShimmerBase className="h-4 w-16 rounded" />
        </div>
        <ShimmerBase className="h-3.5 w-1/4 rounded" />
        <div className="flex justify-between items-center pt-1">
          <div className="flex gap-2">
            <ShimmerBase className="h-7 w-7 rounded-lg" />
            <ShimmerBase className="h-7 w-10 rounded-lg" />
            <ShimmerBase className="h-7 w-7 rounded-lg" />
          </div>
          <ShimmerBase className="h-4 w-12 rounded" />
        </div>
      </div>
    </div>
  );
}

// 📦 10. Order History Card Skeleton
export function OrderHistorySkeleton() {
  return (
    <div className="bg-card-theme border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-50 dark:border-slate-800 gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShimmerBase className="h-4 w-28 rounded" />
            <ShimmerBase className="h-4 w-16 rounded-full" />
          </div>
          <ShimmerBase className="h-3 w-36 rounded" />
        </div>
        <div className="space-y-1 sm:text-right">
          <ShimmerBase className="h-3 w-16 rounded sm:ml-auto" />
          <ShimmerBase className="h-5 w-24 rounded" />
        </div>
      </div>

      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 items-center">
            <ShimmerBase className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <ShimmerBase className="h-4 w-2/3 rounded" />
              <ShimmerBase className="h-3 w-1/4 rounded" />
            </div>
            <ShimmerBase className="h-4 w-12 rounded" />
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-3">
        <ShimmerBase className="h-9 w-full sm:w-36 rounded-lg" />
        <ShimmerBase className="h-9 w-full sm:w-36 rounded-lg" />
      </div>
    </div>
  );
}

// 🔍 11. Search Result Row / Item Skeleton
export function SearchResultSkeleton() {
  return (
    <div className="flex gap-4 p-3 rounded-xl border border-transparent hover:bg-slate-50 dark:hover:bg-slate-850">
      <ShimmerBase className="h-12 w-12 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <ShimmerBase className="h-4 w-2/5 rounded" />
          <ShimmerBase className="h-4 w-12 rounded" />
        </div>
        <ShimmerBase className="h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}

// 💡 12. Recommendation Sidebar / Item Skeleton
export function RecommendationSkeleton() {
  return (
    <div className="flex gap-3 p-2 items-center">
      <ShimmerBase className="h-14 w-14 rounded-xl shrink-0" />
      <div className="flex-1 space-y-1.5">
        <ShimmerBase className="h-3.5 w-4/5 rounded" />
        <ShimmerBase className="h-3 w-1/3 rounded" />
        <ShimmerBase className="h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}
