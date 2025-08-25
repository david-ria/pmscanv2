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
      'tests/**', // playwright / i18n suites
      'e2e/**',
    ],
    environment: 'jsdom',
    // make the Vitest expect available globally
    globals: true,
    // load jest-dom matchers and your custom setup
    setupFiles: ['@testing-library/jest-dom/vitest', 'src/test/setup.ts'],
    css: false,
  },
});
