// src/test/setup.ts

// 1) Extend Vitest's expect with Testing Library matchers
import { expect as viExpect, afterEach, vi } from 'vitest';
import matchers from '@testing-library/jest-dom/matchers';
viExpect.extend(matchers);
// ensure the global expect is Vitest's instance (not Chai's)
(globalThis as any).expect = viExpect;

// 2) Auto-cleanup React Testing Library after each test
import { cleanup } from '@testing-library/react';
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

// Optional: guard against tests accidentally using fake timers forever
afterEach(() => {
  try {
    vi.useRealTimers();
  } catch {
    /* ignore */
  }
});
