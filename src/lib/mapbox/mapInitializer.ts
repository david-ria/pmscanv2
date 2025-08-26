// src/lib/mapbox/mapInitializer.ts
import type { LocationData } from '@/types/PMScan';

// Simple mock initializer for testing/development
// TODO: Replace with actual mapbox initialization when ready
async function legacyInitializeMap(
  container: HTMLDivElement,
  location: LocationData | null,
  thresholds: unknown,
  onLoad: () => void,
  onError: (err: string) => void
) {
  try {
    // Mock map instance
    const mockMap = {
      remove: () => {},
      on: () => {},
      off: () => {},
      addControl: () => {},
    };
    
    // Simulate async loading
    setTimeout(() => {
      onLoad();
    }, 100);
    
    return mockMap;
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Map failed to load');
    return null;
  }
}

export interface MapInstanceLike {
  remove(): void;
  on?(event: string, cb: (...args: unknown[]) => void): void;
  off?(event: string, cb: (...args: unknown[]) => void): void;
}

export interface InitializeMapOptions {
  currentLocation?: LocationData | null;
  thresholds?: unknown;
}

/**
 * Adapter around the legacy initializer so tests can vi.mock this module:
 * - Path matches tests: "@/lib/mapbox/mapInitializer"
 * - Exposes both default and named `initializeMap`
 * - Returns a Promise that resolves on onLoad / rejects on onError
 */
export function initializeMap(
  container: HTMLElement,
  options: InitializeMapOptions = {}
): Promise<MapInstanceLike> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const map = legacyInitializeMap(
      container as HTMLDivElement,
      options.currentLocation ?? null,
      options.thresholds as unknown,
      () => {
        if (!settled) {
          settled = true;
          resolve(map as unknown as MapInstanceLike);
        }
      },
      (err: string) => {
        if (!settled) {
          settled = true;
          reject(new Error(err || 'Map failed to load'));
        }
      }
    );

    // If the legacy initializer returned null synchronously, fail fast.
    if (map == null && !settled) {
      settled = true;
      reject(new Error('Map failed to initialize'));
    }
  });
}

// Default export for tests that mock the default
export default initializeMap;
