// Register jest-dom matchers with Vitest's expect
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';
expect.extend(matchers);

// (Optional) auto-cleanup after each test
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(() => cleanup());

// ---- Test environment shims/mocks ----

// Mock: IntersectionObserver (used by various components)
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

(globalThis as any).IntersectionObserver = MockIntersectionObserver;
