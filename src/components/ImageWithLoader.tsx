import React, { useState, useEffect, useRef } from "react";

interface ImageWithLoaderProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  placeholderColor?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export default function ImageWithLoader({
  src,
  alt,
  className = "",
  containerClassName = "",
  placeholderColor = "bg-slate-150 dark:bg-slate-800",
  ...props
}: ImageWithLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Elegant Intersection Observer for ultra-smooth dynamic lazy loading
    if (typeof window !== "undefined" && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: "150px" } // Load slightly before it enters the viewport
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => {
        observer.disconnect();
      };
    } else {
      setIsInView(true);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ isolation: "isolate" }}
    >
      {/* Animated shimmer placeholder behind/over loading image */}
      {!isLoaded && (
        <div
          className={`absolute inset-0 z-10 animate-pulse ${placeholderColor} flex items-center justify-center`}
        >
          {/* Subtle blurred loader backdrop to prevent flickering */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" 
               style={{
                 backgroundSize: "200% 100%",
                 animation: "shimmer 1.8s infinite linear"
               }}
          />
        </div>
      )}

      {/* Actual image loaded dynamically when in viewport */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-700 ease-out ${
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
          } ${className}`}
          style={{
            transitionProperty: "opacity, transform",
            transformOrigin: "center"
          }}
          referrerPolicy="no-referrer"
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
}
