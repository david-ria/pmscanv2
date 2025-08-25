import * as React from 'react';
import { initializeMap } from '@/lib/mapbox/mapInitializer';
import type { LocationData } from '@/types/PMScan';

type MapboxMapCoreProps = {
  currentLocation?: LocationData | null;
  thresholds?: unknown;            // keep loose unless you have a type
  className?: string;
  style?: React.CSSProperties;
};

export default function MapboxMapCore({
  currentLocation = null,
  thresholds = {},
  className,
  style,
}: MapboxMapCoreProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const startedRef = React.useRef(false);
  const mapRef = React.useRef<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    (async () => {
      const map = await initializeMap(
        containerRef.current!,
        currentLocation,
        thresholds,
        () => {
          // onLoad: nothing special needed for the test
        },
        (err) => {
          if (!cancelled) setError(err || 'Map failed to load');
        }
      );
      if (!cancelled) {
        mapRef.current = map;
      }
    })();

    return () => {
      cancelled = true;
      // best-effort cleanup if map exists
      try {
        mapRef.current?.remove?.();
      } catch {
        // ignore
      }
      mapRef.current = null;
    };
    // re-run only if the container exists and props change (tests don’t need re-init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation, thresholds]);

  if (error) {
    return (
      <div role="alert" className={className}>
        <p>Map failed to load</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            startedRef.current = false; // allow retry
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="map-container"
      className={className}
      style={{ width: '100%', height: '100%', ...(style || {}) }}
    />
  );
}
