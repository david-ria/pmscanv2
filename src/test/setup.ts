// src/test/setup.ts

// 1) Extend Vitest's expect() with Testing Library matchers
import '@testing-library/jest-dom/vitest';

// 2) Auto-cleanup React Testing Library after each test
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// 3) Light polyfills/stubs commonly needed in JSDOM

// ResizeObserver (used by various UI libs)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  (globalThis as any).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
}

// matchMedia (used by responsive components)
if (!('matchMedia' in window)) {
  (window as any).matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated but some libs still call these
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Canvas context (Recharts / Map renderers sometimes touch this)
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = vi.fn();
}

// URL.createObjectURL (occasionally used by downloads/exports)
if (!('createObjectURL' in URL)) {
  URL.createObjectURL = vi.fn();
}

// window.scrollTo (some tests call it)
if (!('scrollTo' in window)) {
  // @ts-expect-error allow mock on JSDOM window
  window.scrollTo = vi.fn();
}
