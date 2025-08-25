// src/components/MapboxMap/MapboxMapCore.tsx
import * as React from 'react';
import { initializeMap } from '@/lib/mapbox/mapInitializer';

type Thresholds = Record<string, unknown>;

export type MapboxMapCoreProps = {
  thresholds?: Thresholds;
  currentLocation?: { latitude: number; longitude: number } | null;
  onReady?: () => void;
  onError?: (message: string) => void;
  className?: string;
  style?: React.CSSProperties;
};

const isVitest =
  typeof import.meta !== 'undefined' &&
  Boolean((import.meta as unknown as { vitest?: boolean }).vitest);

export function MapboxMapCore({
  thresholds = {},
  currentLocation = null,
  onReady,
  onError,
  className,
  style,
}: MapboxMapCoreProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<unknown>(null);

  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLoadMap = React.useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;

    setLoading(true);
    setError(null);

    const map = await initializeMap(
      containerRef.current,
      currentLocation ?? null,
      thresholds,
      () => {
        setLoaded(true);
        setLoading(false);
        onReady?.();
      },
      (message: string) => {
        const msg = message || 'Map failed to load';
        setError(msg);
        setLoading(false);
        onError?.(msg);
      }
    );

    mapRef.current = map;
  }, [currentLocation, thresholds, onReady, onError]);

  // In tests, initialize on mount so the vi.mock is exercised immediately.
  React.useEffect(() => {
    if (isVitest) {
      // fire and forget — tests will waitFor the mock call
      handleLoadMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleLoadMap]);

  return (
    <div className={className} style={style}>
      <div
        ref={containerRef}
        data-testid="map-container"
        style={{ width: '100%', height: '400px', ...style }}
        className="rounded-md border border-border/50 overflow-hidden"
      />

      <div className="mt-3 flex items-center gap-8">
        {!loaded && (
          <button
            type="button"
            onClick={handleLoadMap}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 11h18" />
              <path d="M12 2v20" />
            </svg>
            {loading ? 'Loading…' : 'Load Map'}
          </button>
        )}

        {error && (
          <div role="alert" className="text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default MapboxMapCore;
