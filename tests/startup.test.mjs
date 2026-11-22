/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// dist/game.js on its own: a page from another site holding only the one script tag. The game must add its own
// markup and styles, load every asset from the pack and reach play, with no errors. Then the same from jsDelivr by
// commit (stood in for here): the heavy files come from the commits that first had them (assets/at.json), and one
// whose old address fails comes from the release's own.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serve, check, ROOT } from './lib/harness.mjs';

export const name = 'startup from one script tag';
export async function run(b) {
  const pack = JSON.parse(readFileSync(join(ROOT, 'assets/pack.json'), 'utf8'));
  const guns = new Set(pack.gun.list.map(([n]) => n.replace(/\d+$/, ''))).size;
  writeFileSync(
    join(ROOT, 'build/embed.html'),
    '<!doctype html><html><head><meta charset="utf-8"></head><body>\n<script src="http://127.0.0.1:8781/dist/game.js"></script>\n</body></html>\n'
  );
  const cdn = await serve(ROOT, 8781),
    site = await serve(join(ROOT, 'build'), 8782);
  try {
    const pg = await b.newPage({ viewport: { width: 1280, height: 760 } }),
      errs = [];
    pg.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 600))); // (where it happened, not just what)
    await pg.goto('http://127.0.0.1:8782/embed.html');
    await pg.waitForSelector('#menu:not([hidden])', { timeout: 300000 });
    await pg.click('#survBtn');
    await pg.waitForTimeout(800);
    await pg.click('#startBtn');
    let st = null;
    for (let i = 0; i < 120; i++) {
      await pg.waitForTimeout(1000);
      st = await pg.evaluate('typeof DA_STATUS === "function" ? DA_STATUS() : null');
      if (
        st &&
        st.voices &&
        st.guns >= guns &&
        st.band >= pack.mus.list.length &&
        (await pg.evaluate('document.body.dataset.st')) === 'play'
      )
        break;
    }
    check(st, 'DA_STATUS never appeared');
    check(st.pack === pack.v, `pack ${st.pack}, expected ${pack.v}`);
    check(parseInt(st.art) >= Object.keys(pack.bake.pos).length - 5, `art: ${st.art}`);
    check(st.voices === pack.vox.list.length, `voices ${st.voices} of ${pack.vox.list.length}`);
    check(st.guns === guns, `recorded sounds ${st.guns} of ${guns}`);
    check(st.band === pack.mus.list.length, `band samples ${st.band} of ${pack.mus.list.length}`);
    check((await pg.evaluate('document.body.dataset.st')) === 'play', 'never reached play');
    check(!errs.length, 'page errors: ' + errs.join(' | '));
    await pg.close();
    const cdnNote = await byCommit(b, pack);
    return `${cdnNote}; pack ${st.pack}, ${st.art}, ${st.voices} voices, ${st.guns} sounds, ${st.band} band samples`;
  } finally {
    cdn.close();
    site.close();
  }
}

// every download in, in full (the sounds are unpacked once the player starts, which this page doesn't)
const allIn = st =>
  st &&
  st.download &&
  ['artA', 'artH', 'gun', 'vox', 'mus'].every(k => {
    const m = /^(\d+)\/(\d+) done$/.exec(st.download[k] || '');
    return m && m[1] === m[2];
  });
// the game served from jsDelivr by commit, the CDN stood in for by the files here
async function byCommit(b, pack) {
  const atF = join(ROOT, 'assets/at.json'),
    at = existsSync(atF) ? JSON.parse(readFileSync(atF, 'utf8')) : {},
    heavy = Object.keys(at);
  if (!heavy.length) return 'no assets/at.json';
  const REL = 'f'.repeat(40),
    gone = pack.gun.file, // its first commit "fails" here, so it must come from the release's own
    asked = [];
  const pg = await b.newPage({ viewport: { width: 1280, height: 760 } }),
    errs = [];
  pg.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 600))); // (where it happened, not just what)
  await pg.route('https://cdn.jsdelivr.net/**', async r => {
    const m = /\/gh\/b24m12o\/dead-acre@([0-9a-f]{40})\/(.*)$/.exec(new URL(r.request().url()).pathname);
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (!m) return r.fulfill({ status: 404, headers: cors });
    asked.push([m[1], m[2]]);
    const f = join(ROOT, m[2]);
    if ((m[1] !== REL && m[2] === 'assets/' + gone) || !existsSync(f)) return r.fulfill({ status: 404, headers: cors });
    return r.fulfill({ status: 200, headers: cors, body: readFileSync(f) });
  });
  await pg.setContent(
    `<!doctype html><html><head><meta charset="utf-8"></head><body><script src="https://cdn.jsdelivr.net/gh/b24m12o/dead-acre@${REL}/dist/game.js"></script></body></html>`
  );
  await pg.waitForSelector('#menu:not([hidden])', { timeout: 300000 });
  let st = null;
  for (let i = 0; i < 120; i++) {
    st = await pg.evaluate('typeof DA_STATUS === "function" ? DA_STATUS() : null');
    if (allIn(st)) break;
    await pg.waitForTimeout(1000);
  }
  await pg.close();
  const from = f => asked.filter(([, p]) => p === 'assets/' + f).map(([h]) => h);
  check(from('pack.json').join() === REL, 'pack.json not from the release: ' + from('pack.json'));
  for (const f of heavy) {
    if (f === gone) continue;
    if (!asked.some(([, p]) => p === 'assets/' + f)) continue; // not in this pack any more
    check(from(f).join() === at[f], `${f} from ${from(f)}, expected only ${at[f]}`);
  }
  if (at[gone]) check(from(gone).join() === at[gone] + ',' + REL, `${gone}: ${from(gone)}`);
  check(allIn(st) && st.voices === pack.vox.list.length, 'by commit: ' + JSON.stringify(st));
  check(parseInt(st.art) >= Object.keys(pack.bake.pos).length - 5, `by commit, art: ${st.art}`);
  check(!errs.length, 'by commit, page errors: ' + errs.join(' | '));
  return `${heavy.length} heavy files from their first commits`;
}
