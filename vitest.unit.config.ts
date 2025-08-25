// vitest.unit.config.ts
import { defineConfig, configDefaults } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],
    exclude: [
      ...configDefaults.exclude,
      'tests/**', // Playwright/i18n suites live here
      'e2e/**',
    ],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        pretendToBeVisual: true,
        url: 'http://localhost/',
      },
    },
    globals: true,                 // use global expect/vi/it/etc
    setupFiles: ['src/test/setup.ts'],
    css: false,

    // ergonomics
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
