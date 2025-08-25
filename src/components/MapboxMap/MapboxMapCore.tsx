import * as React from 'react';
import type { LocationData } from '@/types/PMScan';
import { initializeMap } from '@/lib/mapbox/mapInitializer';
import { cn } from '@/lib/utils';

export interface MapboxMapCoreProps {
  /** Optional initial location (lng/lat); if not provided the initializer decides. */
  currentLocation?: LocationData | null;
  /** Optional className for the outer wrapper */
  className?: string;
  /** Thresholds passed to map layers (tests don't rely on this; defaults to {}). */
  thresholds?: unknown;
}

/**
 * Minimal, test-friendly Mapbox map wrapper:
 * - Creates a container div and calls `initializeMap` on mount.
 * - Keeps a ref to the map instance so we don't double-init.
 * - Shows a "Load Map" action and the error text "Map failed to load" if init fails.
 */
export default function MapboxMapCore({
  currentLocation = null,
  thresholds = {},
  className,
}: MapboxMapCoreProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLoadMap = React.useCallback(async () => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // already initialized
    setIsLoading(true);
    setError(null);

    const onLoad = () => {
      setIsLoading(false);
      setError(null);
    };

    const onError = (err: string) => {
      // Tests assert on this exact copy:
      // "Map failed to load"
      setIsLoading(false);
      setError(err || 'Map failed to load');
    };

    const map = await initializeMap(
      containerRef.current,
      currentLocation ?? null,
      thresholds as any,
      onLoad,
      onError
    );

    mapRef.current = map;
  }, [currentLocation, thresholds]);

  // Auto-init on mount so tests can `waitFor` initializeMap to be called.
  React.useEffect(() => {
    handleLoadMap();
  }, [handleLoadMap]);

  // Cleanup on unmount if the map instance exposes remove()
  React.useEffect(() => {
    return () => {
      try {
        if (mapRef.current && typeof mapRef.current.remove === 'function') {
          mapRef.current.remove();
        }
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-sm font-medium">Map</h2>
        <button
          type="button"
          onClick={handleLoadMap}
          disabled={isLoading || !!mapRef.current}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
          aria-label="Load Map"
        >
          {/* simple icon to match snapshots */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M15 5.764v15" />
            <path d="M9 3.236v15" />
          </svg>
          Load Map
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border p-3 text-sm">
          {error /* e.g., "Map failed to load" */}
        </div>
      ) : (
        <div
          ref={containerRef}
          data-testid="map-container"
          className="h-[420px] w-full rounded-lg border"
        />
      )}
    </div>
  );
}
