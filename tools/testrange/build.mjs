/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The test range: a separate test build, never part of the game. It writes build/test-range.html: the one-file game
// page with the game and the test panel (entry.js) bundled into one script, no eval anywhere, and browser storage
// kept in memory only (nothing is saved, no profile is touched).
// Run `npm run build` first, then `node tools/testrange/build.mjs`.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, bundle } from '../lib/source.mjs';

const html = readFileSync(join(ROOT, 'build/dead-acre.html'), 'utf8'),
  k = html.lastIndexOf('<script>\n');
if (k < 0) throw new Error('build/dead-acre.html not found: run npm run build first');
const game = await bundle({ entry: 'tools/testrange/entry.js' });
const memStore = `(() => { const m = new Map(), s = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } };
  Object.defineProperty(window, 'localStorage', { value: s, configurable: true }); })();`;
// the alternative sounds to choose between (tools/sounds/candidates.py), for the sound board only
const CD = join(ROOT, 'tools/testrange/cands'),
  cands = Object.fromEntries(
    readdirSync(CD)
      .filter(f => f.endsWith('.mp3'))
      .map(f => [f.replace('.mp3', ''), readFileSync(join(CD, f)).toString('base64')])
  );
const out = html
  .slice(0, k)
  .replace('<title>Dead Acre</title>', '<title>Dead Acre · Test range</title>')
  .concat(
    `<script>\n${memStore}\nwindow.__TR_CANDS = ${JSON.stringify(cands)};\n</script>\n<script>\n${game}</script>\n`
  );
writeFileSync(join(ROOT, 'build/test-range.html'), out);
console.log('build/test-range.html', out.length, 'bytes');
