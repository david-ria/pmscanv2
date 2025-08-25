// vitest.unit.config.ts
import { defineConfig, configDefaults } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    // makes @/… and other tsconfig "paths" work in tests
    tsconfigPaths(),
  ],
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
    setupFiles: ['src/test/setup.ts'], // <- load the setup you just created
    css: false,
  },
});
