// src/test/setup.ts

// 1) Add Testing Library's jest-dom matchers to Vitest
import '@testing-library/jest-dom/vitest';

// 2) Auto-cleanup RTL after each test
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// 3) Lightweight polyfills used by components in JSDOM

// ResizeObserver (used by charts, UI libs, etc.)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  (globalThis as any).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
}

// matchMedia (used by responsive logic)
if (!('matchMedia' in window)) {
  (window as any).matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),       // deprecated, some libs still call these
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Ensure we don’t accidentally leave fake timers on between tests
afterEach(() => {
  try {
    vi.useRealTimers();
  } catch {
    /* ignore */
  }
});
