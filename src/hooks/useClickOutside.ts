import { useEffect, RefObject } from "react";

/**
 * useClickOutside — fires callback when user clicks/taps outside the referenced element
 * Works for both mouse (desktop) and touch (mobile) events
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useClickOutside(ref, () => setIsOpen(false));
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  callback: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    function handleEvent(event: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleEvent);
    document.addEventListener("touchstart", handleEvent, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleEvent);
      document.removeEventListener("touchstart", handleEvent);
    };
  }, [ref, callback, enabled]);
}
