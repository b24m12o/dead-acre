/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import js from '@eslint/js';
import globals from 'globals';

const rules = {
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
  'no-empty': ['warn', { allowEmptyCatch: true }],
  'no-cond-assign': ['error', 'except-parens'],
  'no-constant-condition': ['warn', { checkLoops: false }],
};
export default [
  { ignores: ['dist/', 'build/', 'assets/', 'node_modules/', 'tests/bot/', 'tests/lib/hooks.js'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser } },
    rules,
  },
  {
    files: ['tools/**/*.mjs', 'tests/**/*.mjs', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    rules,
  },
  { files: ['tests/lib/entry.js'], languageOptions: { sourceType: 'module', globals: { ...globals.browser } } },
];
