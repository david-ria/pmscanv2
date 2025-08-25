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
    globals: true,                 // global expect/vi/it/describe
    setupFiles: ['src/test/setup.ts'],
    css: false,
  },
});
