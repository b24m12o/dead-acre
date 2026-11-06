/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The test range: a separate test build, never part of the game. It writes build/test-range.html: the one-file game
// page with the game and the test panel (entry.js) bundled into one script, no eval anywhere, and browser storage
// kept in memory only (nothing is saved, no profile is touched). It also writes build/test-range-web.html, which loads
// the sounds and pictures from assets/ instead of carrying them.
// Run `npm run build` first, then `node tools/testrange/build.mjs`.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, bundle } from '../lib/source.mjs';

const html = readFileSync(join(ROOT, 'build/dead-acre.html'), 'utf8'),
  k = html.lastIndexOf('<script>\n');
if (k < 0) throw new Error('build/dead-acre.html not found: run npm run build first');
const game = await bundle({ entry: 'tools/testrange/entry.js' });
const memStore = `(() => { const m = new Map(), s = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } };
  Object.defineProperty(window, 'localStorage', { value: s, configurable: true }); })();`;
const out = html
  .slice(0, k)
  .replace('<title>Dead Acre</title>', '<title>Dead Acre · Test range</title>')
  .concat(`<script>\n${memStore}\n</script>\n<script>\n${game}</script>\n`);
writeFileSync(join(ROOT, 'build/test-range.html'), out);
console.log('build/test-range.html', out.length, 'bytes');
// the same page without the sounds and pictures built in: it loads them from assets/ next to it, as dist/game.js
// does, for a host that serves the page and its files separately (and caps the size of one file)
const d0 = out.indexOf('<script>window.__DA_DATA = '),
  d1 = out.indexOf('</script>', d0) + '</script>'.length;
if (d0 < 0) throw new Error('the built-in data block was not found in build/dead-acre.html');
const web =
  out.slice(0, d0) + "<script>window.__DA_BASE = new URL('dist/', location.href).href;</script>" + out.slice(d1);
writeFileSync(join(ROOT, 'build/test-range-web.html'), web);
console.log('build/test-range-web.html', web.length, 'bytes (assets from assets/)');
