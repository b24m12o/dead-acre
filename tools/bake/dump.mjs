/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Step 1 of rebuilding the 3D pictures: opens the one-file build in a software-rendering browser with the live
// bake on, so every part is drawn from its shapes (src/render/shapes/), and saves each picture and its
// height field to build/bake/ (one JSON file per part, plus key.txt, the hash the game checks pictures against).
// Run after npm run build: node tools/bake/dump.mjs, then python3 tools/bake/pack.py
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { browser, testPage, ROOT } from '../../tests/lib/harness.mjs';

const OUT = join(ROOT, 'build/bake');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const b = await browser();
const pg = await b.newPage();
pg.setDefaultTimeout(1800000);
await pg.addInitScript('window.__liveBake = true;');
await pg.goto('file://' + (await testPage()));
await pg.waitForSelector('#menu:not([hidden])', { timeout: 1800000 });
const ev = c => pg.evaluate(c => globalThis.__eval(c), c);
const names = await ev('Object.keys(BAKE.pre)');
for (const n of names) {
  const r = await ev(`(() => {
    const q = BAKE.pre[${JSON.stringify(n)}], b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
    const h = new Uint16Array(q.hz.length); for (let i = 0; i < h.length; i++) h[i] = Math.round(Math.min(1, Math.max(0, q.hz[i])) * 65535);
    return [q.img.width, q.img.height, b64(new Uint8Array(q.img.data.buffer)), b64(new Uint8Array(h.buffer))];
  })()`);
  writeFileSync(join(OUT, n + '.json'), JSON.stringify(r));
}
writeFileSync(join(OUT, 'key.txt'), await ev('bakeKey()'));
console.log(names.length, 'parts', await ev('JSON.stringify(BAKE.diag)'));
await b.close();
