import React from 'react';
import type { LocationData } from '@/types/PMScan';
import { initializeMap } from '@/lib/mapbox/mapInitializer';

// Keep props minimal for tests; extend in app as needed.
type MapboxMapCoreProps = {
  thresholds?: unknown;                  // typed more strictly in app
  currentLocation?: LocationData | null; // optional initial center
  className?: string;
  onLoad?: () => void;
  onError?: (msg: string) => void;
};

export default function MapboxMapCore({
  thresholds,
  currentLocation = null,
  className,
  onLoad,
  onError,
}: MapboxMapCoreProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any | null>(null);

  // Call initializeMap immediately after mount (no manual “Load Map” step),
  // which is what the unit test expects.
  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!containerRef.current) return;

      const handleLoad = () => {
        if (cancelled) return;
        onLoad?.();
      };

      const handleError = (msg: string) => {
        if (cancelled) return;
        onError?.(msg);
      };

      // initializeMap returns the map instance or null on failure
      mapRef.current = await initializeMap(
        containerRef.current,
        currentLocation,
        thresholds as any,
        handleLoad,
        handleError
      );
    };

    // defer to ensure ref is attached
    // (requestAnimationFrame is reliable in JSDOM, too)
    const id = requestAnimationFrame(run);

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      // Clean up map if library provides a remove() method
      try {
        mapRef.current?.remove?.();
      } catch {
        // ignore
      }
      mapRef.current = null;
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-testid="map-container"
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: 400 }}
    />
  );
}
