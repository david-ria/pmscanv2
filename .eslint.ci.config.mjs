import base from './eslint.config.js';

export default [
  // your project’s base flat config
  ...base,

  // CI-only overrides: target TS/TSX in src & supabase and soften 'any'
  {
    files: ['src/**/*.{ts,tsx}', 'supabase/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
