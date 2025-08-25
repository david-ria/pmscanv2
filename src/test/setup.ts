// src/test/setup.ts

// 1) Add Testing Library matchers to Vitest's expect
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect, afterEach, vi } from 'vitest';
expect.extend(matchers);

// (optional) also keep the convenience import; harmless if present
// import '@testing-library/jest-dom/vitest';

// 2) Auto-cleanup RTL between tests
import { cleanup } from '@testing-library/react';
afterEach(() => {
  cleanup();
});

// 3) Light JSDOM polyfills/stubs

// ResizeObserver (commonly needed by UI libs)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  (globalThis as any).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
}

// matchMedia (used by responsive components)
if (!('matchMedia' in window)) {
  (window as any).matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated but some libs call it
    removeListener: vi.fn(), // deprecated but some libs call it
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
