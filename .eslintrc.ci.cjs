module.exports = {
  extends: ['./.eslintrc.json'],
  files: ['src/**/*.{ts,tsx}', 'supabase/**/*.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
