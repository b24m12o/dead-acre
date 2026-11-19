/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A test tool, not part of the game: the street with a metre grid laid over it (fine lines every metre, heavy every
// five), to check how big everything is drawn against life. It picks the spots with the most street furniture, puts a
// person (the hero) and a few of the dead among it, and films each close up.
//   node tools/proto/ruler.mjs [outdir] [--zoom 4] [--n 3] [--district town|highway|cemetery] [--drop]
// --drop: a supply box and a weapon case come down by the hero first, and lie there with their parachutes
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { browser, openGame } from '../../tests/lib/harness.mjs';
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/ruler',
  ZOOM = +arg('--zoom', 4),
  N = +arg('--n', 3),
  DIST = arg('--district', null),
  DROP = process.argv.includes('--drop');
mkdirSync(OUT, { recursive: true });
const b = await browser();
try {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await pg.setViewportSize({ width: 1600, height: 900 });
  await pg.addStyleTag({ content: 'body > *:not(#gl){visibility:hidden!important} #gl{visibility:visible!important}' });
  for (let i = 0; i < 40 && !(await ev('fig3dOn()')); i++) await pg.waitForTimeout(250);
  const spots = JSON.parse(
    await ev(`(() => { ${DIST ? `GS.RUN.district = '${DIST}';` : ''} initAudio(); GS.meta.tutDone = true; begin(); __god(); window.__Z = ${ZOOM}; resize();
    for (let i = 0; i < 30; i++) { update(1 / 60); tickWorld(1 / 60); }
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.queue.length = 0;
    // the busiest corners: most props, cars, doors and lamps within a screen
    const things = [...GS.decor.map(d => [d.x, d.y]), ...cars.map(c => [c.x, c.y]), ...lamps.map(L => [L.bx, L.by]), ...(GS.doors || []).map(d => [d.x, d.y]), ...fires.map(f => [f.x, f.y])];
    const sc = things.map(([x, y]) => [x, y, things.filter(([u, v]) => Math.abs(u - x) < viewW * 0.4 && Math.abs(v - y) < viewH * 0.4).length]).sort((a, b) => b[2] - a[2]);
    const out = []; for (const s of sc) if (out.length < ${N} && out.every(o => Math.hypot(o[0] - s[0], o[1] - s[1]) > viewW)) out.push(s);
    return JSON.stringify(out); })()`)
  );
  for (const [i, [x, y]] of spots.entries()) {
    const info = JSON.parse(
      await ev(`(() => { for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
      const P = GS.P; let px = ${x} + 30, py = ${y} + 30; for (let t = 0; t < 400 && blockPt(px, py); t++) { px = ${x} + (Math.random() - 0.5) * 200; py = ${y} + (Math.random() - 0.5) * 120; }
      P.x = px; P.y = py; P.vx = P.vy = 0; P.aimA = Math.PI / 2;
      for (let k = 0; k < 3; k++) { let ex = px + 40 + k * 26, ey = py + 10 - k * 14; if (blockPt(ex, ey)) continue; const e = makeEnemy('skitter', ex, ey); e.emerge = 1; e.trait = null; e.elite = false; e.kind = null; e.shield = null; e.vx = e.vy = 0; e.a = Math.PI; e.aw = 0; }
      if (${DROP}) { GS.crates.length = 0; GS.chutesDown.length = 0;
        for (const [g, dx] of [[null, -70], ['shotgun', 90]]) { const c = dropCrate(g, g ? 'smg' : null); if (!c) continue; c.x = px + dx; c.y = py - 60; }
        for (let t = 0; t < 60 * 9; t++) { P.x = px; P.y = py; P.hp = S.maxHp; update(1 / 60); tickWorld(1 / 60); for (const e of GS.enemies) if (!e.__keep) e.dead = true; if (GS.state !== 'play') GS.state = 'play'; }
        P.x = px; P.y = py; }
      cam.x = ${x} - viewW / 2; cam.y = ${y} - viewH / 2; render();
      return JSON.stringify({ cx: cam.x, cy: cam.y, z: VW / viewW }); })()`)
    );
    const f = join(OUT, `spot${i}.png`);
    await pg.screenshot({ path: f });
    // the grid: a metre is 20 units
    execFileSync('python3', [
      '-c',
      `
from PIL import Image, ImageDraw
im = Image.open('${f}').convert('RGB'); d = ImageDraw.Draw(im, 'RGBA'); z = ${info.z}; cx = ${info.cx}; cy = ${info.cy}
import math
x0 = math.floor(cx / 20) * 20
while (x0 - cx) * z < im.width:
    X = (x0 - cx) * z; heavy = round(x0 / 20) % 5 == 0
    d.line([(X, 0), (X, im.height)], fill=(255, 255, 255, 110 if heavy else 40), width=2 if heavy else 1); x0 += 20
y0 = math.floor(cy / 20) * 20
while (y0 - cy) * z < im.height:
    Y = (y0 - cy) * z; heavy = round(y0 / 20) % 5 == 0
    d.line([(0, Y), (im.width, Y)], fill=(255, 255, 255, 110 if heavy else 40), width=2 if heavy else 1); y0 += 20
d.rectangle([10, im.height - 40, 10 + 20 * z, im.height - 30], fill=(255, 255, 255, 230)); d.text((14 + 20 * z, im.height - 44), '1 m', fill=(255, 255, 255, 255))
im.save('${f}')`,
    ]);
  }
  writeFileSync(join(OUT, 'spots.json'), JSON.stringify(spots));
  if (errs.length) console.log('page errors:', errs.join(' | ').slice(0, 1500));
  console.log('wrote', spots.length, 'spots to', OUT);
} finally {
  await b.close();
}
