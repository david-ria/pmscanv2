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
      'tests/**', // playwright/i18n suites
      'e2e/**',
    ],
    environment: 'jsdom',
    globals: true,                          // use global expect/vi/it/etc
    setupFiles: ['src/test/setup.ts'],      // single setup; we import jest-dom there
    css: false,
  },
});
