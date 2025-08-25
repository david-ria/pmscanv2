// Vitest + Testing Library globals & matchers
import '@testing-library/jest-dom/vitest';

// (Optional) If you want automatic cleanup between tests, TL v14+ does it by default.
// If you’re on an older version, uncomment:
// import { cleanup } from '@testing-library/react';
// import { afterEach } from 'vitest';
// afterEach(() => cleanup());

// ---- Test environment shims/mocks ----

// Mock: IntersectionObserver (many components rely on visibility checks)
class MockIntersectionObserver {
  private _cb: IntersectionObserverCallback;

  root: Element | Document | null = null;
  rootMargin = '';
  thresholds = [0];

  constructor(cb: IntersectionObserverCallback) {
    this._cb = cb;
  }

  observe = (target: Element) => {
    // Immediately report target as intersecting to unblock components
    this._cb(
      [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  };

  unobserve = () => {};
  disconnect = () => {};
  takeRecords = () => [];
}

// Attach to global
(globalThis as any).IntersectionObserver = MockIntersectionObserver;
