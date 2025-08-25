import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],
    exclude: [
      ...configDefaults.exclude,
      'tests/**',            // exclude Playwright/i18n suites
      'e2e/**',
    ],
    environment: 'jsdom',
    css: false,
  },
});
