/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Stages the game and the test range for a host that serves a page and its own files separately, caps the size of
// one file, and only serves files by well-known extensions: build/web/game (index.html, dist/, assets/) and
// build/web/test-range (the test range page that loads assets/, and assets/). The sound bundles are MP3 data, so
// they go out as .mp3, with pack.json changed to match. Run `npm run build` and `npm run testrange` first.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../lib/source.mjs';

const OUT = join(ROOT, 'build/web');
rmSync(OUT, { recursive: true, force: true });
const pack = JSON.parse(readFileSync(join(ROOT, 'assets/pack.json'), 'utf8')),
  ren = f => f.replace(/\.bin$/, '.mp3');
function assets(dir) {
  mkdirSync(join(dir, 'assets/fonts'), { recursive: true });
  for (const f of readdirSync(join(ROOT, 'assets')))
    if (/\.(bin|avif)$/.test(f)) cpSync(join(ROOT, 'assets', f), join(dir, 'assets', ren(f)));
  for (const f of readdirSync(join(ROOT, 'assets/fonts')))
    cpSync(join(ROOT, 'assets/fonts', f), join(dir, 'assets/fonts', f));
  const p = structuredClone(pack);
  for (const k of ['vox', 'gun', 'mus']) p[k].file = ren(p[k].file);
  writeFileSync(join(dir, 'assets/pack.json'), JSON.stringify(p));
}
const files = [];
function list(dir, base = '') {
  for (const e of readdirSync(join(dir, base), { withFileTypes: true }))
    if (e.isDirectory()) list(dir, join(base, e.name));
    else files.push(join(dir, base, e.name));
}
const game = join(OUT, 'game');
mkdirSync(join(game, 'dist'), { recursive: true });
writeFileSync(
  join(game, 'index.html'),
  readFileSync(join(ROOT, 'index.html'), 'utf8').replace(/^<!doctype html>/i, '<!DOCTYPE html>')
);
for (const f of ['game.js', 'style.css']) cpSync(join(ROOT, 'dist', f), join(game, 'dist', f));
assets(game);
const tr = join(OUT, 'test-range');
mkdirSync(tr, { recursive: true });
writeFileSync(
  join(tr, 'index.html'),
  '<!DOCTYPE html>\n' + readFileSync(join(ROOT, 'build/test-range-web.html'), 'utf8')
);
assets(tr);
list(OUT);
console.log('build/web:', files.length, 'files');
for (const f of files) console.log(' ', f.slice(OUT.length + 1));
