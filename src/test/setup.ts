// Make @testing-library/jest-dom matchers (e.g. toBeInTheDocument) available
import { expect, afterEach, vi } from 'vitest';
import matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);

// Clean up the DOM and restore mocks between tests
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// JSDOM polyfills commonly required by libs
// TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util';
if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;

// ResizeObserver (silence errors in JSDOM)
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  // @ts-expect-error - test polyfill
  globalThis.ResizeObserver = RO;
}
