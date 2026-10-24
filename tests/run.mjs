/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Runs the tests. `npm test` runs the quick ones; `npm run test:campaign` the long campaign; or name tests:
// node tests/run.mjs startup bosses
import { browser } from './lib/harness.mjs';

const ALL = ['startup', 'radio', 'bosses', 'campaign'];
const args = process.argv.slice(2),
  mods = [];
for (const n of ALL) mods.push({ id: n, ...(await import(`./${n}.test.mjs`)) });
const pick = args.length ? mods.filter(m => args.includes(m.id)) : mods.filter(m => !m.long);
const b = await browser();
let failed = 0;
for (const m of pick) {
  const t0 = Date.now();
  try {
    const note = await m.run(b);
    console.log(`  pass  ${m.name}  (${Math.round((Date.now() - t0) / 1000)} s)  ${note || ''}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${m.name}  (${Math.round((Date.now() - t0) / 1000)} s)\n        ${e.message}`);
  }
}
await b.close();
console.log(failed ? `\n${failed} of ${pick.length} failed` : `\nall ${pick.length} passed`);
process.exit(failed ? 1 : 0);
