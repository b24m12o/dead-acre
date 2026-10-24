/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Lints the game as one program (the files share one scope until they become modules) and reports
// each finding at its file and line in src/. Exit code 1 if there are errors.
import { Linter } from 'eslint';
import js from '@eslint/js';
import globals from 'globals';
import { joinSource, whereIs } from './lib/source.mjs';

const { script, map } = joinSource();
const linter = new Linter({ configType: 'flat' });
const config = [
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-cond-assign': ['error', 'except-parens'],
      'no-constant-condition': ['warn', { checkLoops: false }],
    },
  },
];
const msgs = linter.verify(script, config, { filename: 'game.js' });
let errors = 0,
  warnings = 0;
const byRule = {};
for (const m of msgs) {
  const w = whereIs(map, m.line);
  m.severity === 2 ? errors++ : warnings++;
  byRule[m.ruleId] = (byRule[m.ruleId] || 0) + 1;
  if (!process.argv.includes('--summary'))
    console.log(
      `${w.file}:${w.line}:${m.column}  ${m.severity === 2 ? 'error' : 'warn '}  ${m.message}  (${m.ruleId})`
    );
}
console.log(`\n${errors} errors, ${warnings} warnings`, byRule);
process.exit(errors ? 1 : 0);
