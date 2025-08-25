import { defineConfig, configDefaults } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Allow "@/..." imports to resolve to ./src
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  test: {
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],
    exclude: [
      ...configDefaults.exclude,
      'tests/**', // exclude Playwright/i18n suites
      'e2e/**',
    ],
    environment: 'jsdom',
    css: false,
    // Pull in Testing Library matchers & any polyfills you add in src/test/setup.ts
    setupFiles: ['src/test/setup.ts'],
  },
});
