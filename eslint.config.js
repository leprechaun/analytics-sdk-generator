const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['**/*.test.ts'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // typescript-eslint v8 promoted these from warn to error; keep them as warnings for now
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
);
