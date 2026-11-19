/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A test tool, not part of the game: the ordinary dead in a line-up, one of each outfit the game dresses them in (and a
// row of everyday heads), standing still on open ground, close up, through the test build's own renderer.
//   node tools/proto/lineup.mjs [out.png] [--back] [--gear] [--zoom 4]
import { browser, openGame } from '../../tests/lib/harness.mjs';
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/lineup.png',
  BACK = process.argv.includes('--back'),
  GEAR = process.argv.includes('--gear'), // riot shields and elites instead
  ZOOM = +arg('--zoom', 3.4);
const b = await browser();
try {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await pg.setViewportSize({ width: 1600, height: 900 });
  await pg.addStyleTag({ content: 'body > *:not(#gl){visibility:hidden!important} #gl{visibility:visible!important}' });
  for (let i = 0; i < 40 && !(await ev('fig3dOn()')); i++) await pg.waitForTimeout(250);
  await ev(`(() => { initAudio(); GS.meta.tutDone = true; begin(); __god();
    for (let i = 0; i < 30; i++) { update(1 / 60); tickWorld(1 / 60); }
    let spot = null; for (let t = 0; t < 60000 && !spot; t++) { const x = 600 + Math.random() * (WW - 1200), y = 600 + Math.random() * (WH - 1200); let ok = true;
      for (let dx = -360; dx <= 360 && ok; dx += 30) for (let dy = -150; dy <= 150 && ok; dy += 30) if (blockPt(x + dx, y + dy)) ok = false; if (ok) spot = [x, y]; }
    spot = spot || [GS.P.x, GS.P.y];
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.queue.length = 0;
    window.__Z = ${ZOOM}; resize();
    // a row of the uniforms and everyday clothes (outfit v, head hv as the game pairs them), then a row of heads
    const heads = [[0,0],[1,1],[2,2],[12,17],[12,16],[13,8],[14,12],[15,10],[16,13],[17,15],[18,11],[18,14],[0,9],[2,4],[13,1]];
    const rows = [[...Array(12)].map((_, i) => [i, i]), [...Array(7)].map((_, i) => [12 + i, 12 + i]).concat([[0, 9], [2, 14], [13, 15], [1, 11], [0, 16]]), heads.slice(3, 15)];
    let id = 1;
    if (${GEAR}) { const G = [['riot'], ['riot'], ['riot'], ['runner'], ['armored'], ['bloater'], ['screamer'], ['runner']];
      G.forEach(([g], i) => { const e = makeEnemy('skitter', spot[0] + (i - 3.5) * 66, spot[1]); e.emerge = 1; e.kind = null; e.trait = null; e.shield = null; e.v = i; e.hv = i;
        if (g === 'riot') { e.elite = false; e.shield = { hp: 6, max: 6 }; } else { makeElite(e); setTrait(e, g); }
        e.vx = e.vy = 0; e.a = ${BACK ? '-Math.PI / 2' : 'Math.PI / 2'}; e.id = id++; e.pose = 0; e.hunch = 0; e.flash = 0; e.aw = 0; });
      rows.length = 0; }
    rows.forEach((R, j) => R.forEach(([v, hv], i) => {
      const e = makeEnemy('skitter', spot[0] + (i - (R.length - 1) / 2) * 50, spot[1] + (j - 1) * 96);
      e.emerge = 1; e.trait = null; e.elite = false; e.shield = null; e.kind = null; e.v = v; e.hv = hv; e.pc = undefined; e._lk = null;
      e.vx = e.vy = 0; e.a = ${BACK ? '-Math.PI / 2' : 'Math.PI / 2'}; e.id = id++; e.pose = 0; e.hunch = 0; e.flash = 0; e.aw = 0;
    }));
    GS.P.x = spot[0] + 9000; GS.P.y = spot[1];
    cam.x = spot[0] - viewW / 2; cam.y = spot[1] - viewH / 2 - 20; render(); return 1; })()`);
  await pg.screenshot({ path: OUT });
  if (errs.length) console.log('page errors:', errs.join(' | ').slice(0, 1500));
  console.log('wrote', OUT);
} finally {
  await b.close();
}
