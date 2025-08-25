const { FlatCompat } = require('@eslint/eslintrc');
const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  // Load your existing eslintrc-based config
  ...compat.extends('./.eslintrc.json'),

  // CI-only overrides: target TS/TSX in src & supabase, soften 'any' to warn
  {
    files: ['src/**/*.{ts,tsx}', 'supabase/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
