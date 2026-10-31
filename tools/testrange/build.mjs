/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The test range: a separate test build, never part of the game. It writes build/test-range.html: the one-file game
// page with the test build of the program (the game plus the hook the tests use to run code inside it), browser
// storage kept in memory only (nothing is saved, no profile is touched), and the panel from panel.js on top.
// Run `npm run build` first, then `node tools/testrange/build.mjs`.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, bundle } from '../lib/source.mjs';

const html = readFileSync(join(ROOT, 'build/dead-acre.html'), 'utf8'),
  k = html.lastIndexOf('<script>\n');
if (k < 0) throw new Error('build/dead-acre.html not found: run npm run build first');
const game = await bundle({ entry: 'tests/lib/entry.js' }),
  panel = readFileSync(join(ROOT, 'tools/testrange/panel.js'), 'utf8');
const memStore = `(() => { const m = new Map(), s = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } };
  Object.defineProperty(window, 'localStorage', { value: s, configurable: true }); })();`;
const boot = `(() => { const t = setInterval(() => { const mn = document.getElementById('menu'); if (window.__eval && mn && !mn.hidden) { clearInterval(t); window.__eval(${JSON.stringify(panel)}); } }, 200); })();`;
const out = html
  .slice(0, k)
  .replace('<title>Dead Acre</title>', '<title>Dead Acre · Test range</title>')
  .concat(`<script>\n${memStore}\n</script>\n<script>\n${game}</script>\n<script>\n${boot}\n</script>\n`);
writeFileSync(join(ROOT, 'build/test-range.html'), out);
console.log('build/test-range.html', out.length, 'bytes');
