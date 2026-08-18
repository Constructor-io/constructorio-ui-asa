import { useCallback, useEffect, useRef } from 'react';

export interface UseViewportTrackingProps {
  /** Fired once, the first time the observed element becomes at least 50% visible. */
  onView: () => void;
  /** When false, no observer is attached (e.g. tracking context unavailable). */
  enabled?: boolean;
}

export interface UseViewportTrackingReturn {
  ref: (node: HTMLElement | null) => void;
}

/**
 * Fires `onView` once when the observed element scrolls into the viewport, modeling a
 * per-pod `assistant_search_result_view` impression. Unlike the PIA widget-level view
 * tracker, this fires a single impression per pod (not repeated enter/exit cycles).
 */
export default function useViewportTracking({
  onView,
  enabled = true,
}: UseViewportTrackingProps): UseViewportTrackingReturn {
  const onViewRef = useRef(onView);
  onViewRef.current = onView;
  const firedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (!node || !enabled || firedRef.current) return;
      if (typeof IntersectionObserver === 'undefined') return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !firedRef.current) {
            firedRef.current = true;
            onViewRef.current();
            observer.disconnect();
          }
        },
        { threshold: 0.5 },
      );
      observer.observe(node);
      cleanupRef.current = () => observer.disconnect();
    },
    [enabled],
  );

  useEffect(
    () => () => {
      if (cleanupRef.current) cleanupRef.current();
    },
    [],
  );

  return { ref };
}
