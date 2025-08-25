import { defineConfig, configDefaults } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    // enables @/… path imports in tests
    tsconfigPaths(),
  ],
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
    // Load jest-dom matchers *and* your custom setup.
    // Keeping both is fine (idempotent).
    setupFiles: ['@testing-library/jest-dom/vitest', 'src/test/setup.ts'],
    css: false,
    // optional, but handy if some tests rely on global `expect/test/vi`
    // globals: true,
  },
});
