// Vitest + jest-dom matchers (toBeInTheDocument, etc.)
import '@testing-library/jest-dom/vitest';

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---- JSDOM polyfills commonly needed ----

// TextEncoder/TextDecoder for libs that expect them (e.g. whatwg-url)
import { TextEncoder, TextDecoder } from 'util';
if (!globalThis.TextEncoder) {
  // @ts-expect-error test env polyfill
  globalThis.TextEncoder = TextEncoder;
}
if (!globalThis.TextDecoder) {
  // @ts-expect-error test env polyfill
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// ResizeObserver — silence errors in jsdom
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error test env polyfill
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = RO;
