// Extend Vitest's expect with Testing Library matchers
import '@testing-library/jest-dom/vitest';

// If you need DOM polyfills later, add them here, e.g.:
// import 'whatwg-fetch';
// (optionally) add a ResizeObserver polyfill if something needs it:
// class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
// (globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? ResizeObserver;
