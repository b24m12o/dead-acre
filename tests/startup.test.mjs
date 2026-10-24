/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The CodePen way: a page from another site holding only the one script tag. The game must add its own
// markup and styles, load every asset from the pack and reach play, with no errors.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serve, check, ROOT } from './lib/harness.mjs';

export const name = 'startup from one script tag';
export async function run(b) {
  const pack = JSON.parse(readFileSync(join(ROOT, 'assets/pack.json'), 'utf8'));
  const guns = new Set(pack.gun.list.map(([n]) => n.replace(/\d+$/, ''))).size;
  writeFileSync(
    join(ROOT, 'build/pen.html'),
    '<!doctype html><html><head><meta charset="utf-8"></head><body>\n<script src="http://127.0.0.1:8781/dist/game.js"></script>\n</body></html>\n'
  );
  const cdn = await serve(ROOT, 8781),
    site = await serve(join(ROOT, 'build'), 8782);
  try {
    const pg = await b.newPage({ viewport: { width: 1280, height: 760 } }),
      errs = [];
    pg.on('pageerror', e => errs.push(String(e).slice(0, 300)));
    await pg.goto('http://127.0.0.1:8782/pen.html');
    await pg.waitForSelector('#menu:not([hidden])', { timeout: 300000 });
    await pg.click('#survBtn');
    await pg.waitForTimeout(800);
    await pg.click('#startBtn');
    let st = null;
    for (let i = 0; i < 120; i++) {
      await pg.waitForTimeout(1000);
      st = await pg.evaluate('typeof DA_STATUS === "function" ? DA_STATUS() : null');
      if (st && st.voices && st.guns >= guns && (await pg.evaluate('document.body.dataset.st')) === 'play') break;
    }
    check(st, 'DA_STATUS never appeared');
    check(st.pack === pack.v, `pack ${st.pack}, expected ${pack.v}`);
    check(parseInt(st.art) >= Object.keys(pack.bake.pos).length - 5, `art: ${st.art}`);
    check(st.voices === pack.vox.list.length, `voices ${st.voices} of ${pack.vox.list.length}`);
    check(st.guns === guns, `recorded sounds ${st.guns} of ${guns}`);
    check((await pg.evaluate('document.body.dataset.st')) === 'play', 'never reached play');
    check(!errs.length, 'page errors: ' + errs.join(' | '));
    await pg.close();
    return `pack ${st.pack}, ${st.art}, ${st.voices} voices, ${st.guns} sounds`;
  } finally {
    cdn.close();
    site.close();
  }
}
