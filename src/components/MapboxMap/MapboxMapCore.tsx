import * as React from 'react';
import type { LocationData } from '@/types/PMScan';
// Import the whole module so we can support both named and default exports in tests
import * as MapInitializer from '@/lib/mapbox/mapInitializer';
import { cn } from '@/lib/utils';

export interface MapboxMapCoreProps {
  currentLocation?: LocationData | null;
  className?: string;
  thresholds?: unknown;
}

type InitFn = (
  container: HTMLDivElement,
  currentLocation: LocationData | null,
  thresholds: unknown,
  onLoad: () => void,
  onError: (err: string) => void
) => Promise<any | null>;

/** Resolve initializeMap whether tests mock it as a named or default export */
function getInitializeMap(): InitFn {
  const maybeNamed = (MapInitializer as any).initializeMap;
  const maybeDefault = (MapInitializer as any).default;
  const fn: unknown = maybeNamed ?? maybeDefault;
  if (typeof fn !== 'function') {
    throw new Error(
      'initializeMap not found. Ensure "@/lib/mapbox/mapInitializer" exports a function (named or default).'
    );
  }
  return fn as InitFn;
}

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
    if (!containerRef.current || mapRef.current) return;

    const initializeMap = getInitializeMap();

    setIsLoading(true);
    setError(null);

    const onLoad = () => {
      setIsLoading(false);
      setError(null);
    };

    const onError = (err: string) => {
      setIsLoading(false);
      // Tests assert on this exact message when things go wrong:
      setError(err || 'Map failed to load');
    };

    const map = await initializeMap(
      containerRef.current,
      currentLocation ?? null,
      thresholds,
      onLoad,
      onError
    );

    mapRef.current = map;
  }, [currentLocation, thresholds]);

  // Auto-initialize on mount (the test waits for initializeMap to be called)
  React.useEffect(() => {
    handleLoadMap();
  }, [handleLoadMap]);

  // Cleanup on unmount (if map exposes remove())
  React.useEffect(() => {
    return () => {
      try {
        if (mapRef.current && typeof mapRef.current.remove === 'function') {
          mapRef.current.remove();
        }
      } catch {
        /* noop */
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
          {/* minimal icon that matches snapshots in tests */}
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
          {/* tests look for exactly this text when failing */}
          {error}
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
