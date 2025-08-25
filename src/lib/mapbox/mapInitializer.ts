// src/lib/mapbox/mapInitializer.ts
import type { LocationData } from '@/types/PMScan';

// Use your existing full initializer implementation
import { initializeMap as legacyInitializeMap } from './apInitializer';

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
