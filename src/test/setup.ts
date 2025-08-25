// Add @testing-library/jest-dom matchers to Vitest's expect
import '@testing-library/jest-dom/vitest';

// Optional: auto-cleanup between tests
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());

// Optional: small DOM/JS shims used by components
class MockIntersectionObserver {
  private _cb: IntersectionObserverCallback;
  root: Element | Document | null = null;
  rootMargin = '';
  thresholds = [0];
  constructor(cb: IntersectionObserverCallback) { this._cb = cb; }
  observe = (target: Element) => {
    this._cb(
      [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  };
  unobserve = () => {};
  disconnect = () => {};
  takeRecords = () => [];
}
// @ts-expect-error test shim
globalThis.IntersectionObserver = MockIntersectionObserver;
