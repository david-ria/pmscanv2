import React from 'react';
import type { LocationData } from '@/types/PMScan';
import { initializeMap } from '@/lib/mapbox/mapInitializer';

type MapboxMapCoreProps = {
  thresholds?: unknown;
  currentLocation?: LocationData | null;
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

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!containerRef.current) return;

      const handleLoad = () => !cancelled && onLoad?.();
      const handleError = (msg: string) => !cancelled && onError?.(msg);

      mapRef.current = await initializeMap(
        containerRef.current,
        currentLocation,
        thresholds as any,
        handleLoad,
        handleError
      );
    };

    const id = requestAnimationFrame(run);

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      try {
        mapRef.current?.remove?.();
      } catch {}
      mapRef.current = null;
    };
    // mount only
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
