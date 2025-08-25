// Vitest globals + cleanup
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Attach @testing-library/jest-dom matchers to Vitest's expect
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

// Auto-cleanup after each test
afterEach(() => cleanup());

// Minimal shims some components often need
class MockIntersectionObserver {
  private _cb: IntersectionObserverCallback;
  root: Element | Document | null = null;
  rootMargin = '';
  thresholds = [0];

  constructor(cb: IntersectionObserverCallback) {
    this._cb = cb;
  }
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
// @ts-expect-error: test shim
globalThis.IntersectionObserver = MockIntersectionObserver;
