import { afterEach, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Attach jest-dom matchers to Vitest's expect
expect.extend(matchers);

// Clean up the DOM and restore mocks between tests
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
