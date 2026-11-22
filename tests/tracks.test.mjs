/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Tracks. Walk through blood and you leave bloody prints for a dozen steps; so does one of the dead walking through
// it; one dragging itself along leaves a smear behind it; out of standing water, a few wet prints that dry quickly.
import { openGame, check } from './lib/harness.mjs';

export const name = 'tracks: bloody prints (yours and the dead’s), crawlers’ smears, wet prints off a puddle';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    const hold = () => { GS.queue.length = 0; GS.queue.push('skitter'); GS.spawnT = 1e9; };
    hold();
    const P = GS.P, open = (x, y) => [-260, -200, -140, -80, -20, 40, 100, 160, 220, 280].every(d => !blockPt(x + d, y) && !blockPt(x + d, y + 40) && !blockPt(x + d, y - 40));
    let sx = null, sy = null;
    for (let t = 0; t < 4000 && sx === null; t++) {
      const x = 400 + Math.random() * (MW * TILE - 800), y = 300 + Math.random() * (MH * TILE - 600);
      if (open(x, y)) { sx = x; sy = y; }
    }
    out.spot = sx !== null;
    if (!out.spot) return out;
    const prints = () => GS.decals.filter(d => d.reg === R.fprint);
    const step = n => { for (let i = 0; i < n; i++) { hold(); P.hp = S.maxHp; update(1 / 60); tickWorld(1 / 60); } };
    // you walking on, at a walk (moved directly: whatever the street puts in your way here, you go on through it)
    const walkOn = n => { for (let i = 0; i < n; i++) { hold(); P.hp = S.maxHp; update(1 / 60); P.x += 2; P.vx = 120; P.vy = 0; tickWorld(1 / 60); } P.vx = 0; };
    cam.x = sx - viewW / 2; cam.y = sy - viewH / 2; GS.camX = cam.x; GS.camY = cam.y;
    // you, through a pool of blood
    for (let i = 0; i < 3; i++) for (let j = -1; j <= 1; j++) pool(sx - 20 + i * 20, sy + j * 22, 2, BLOOD, 200); // (a wide pool: across the way)
    P.x = sx - 200; P.y = sy;
    step(90); // (the first moments of a run you aren't walking yet)
    out.x0 = Math.round(P.x - sx);
    walkOn(200); step(10);
    out.x1 = Math.round(P.x - sx);
    const mine = prints().filter(d => d.tint[0] > 0.3);
    out.mine = mine.length;
    out.past = mine.filter(d => d.x > sx + 40).length; // (carried on past it)
    // one of the dead, through it
    GS.decals = GS.decals.filter(d => d.reg !== R.fprint);
    P.x = sx - 600; P.y = sy;
    const z = makeEnemy('skitter', sx + 160, sy); z.emerge = 1; z.aw = 0; z.a = Math.PI;
    const L = { x: sx - 300, y: sy, alarm: 1e9, flow: new Uint16Array(MW * MH) };
    dijk(L.flow, [Math.floor(sy / TILE) * MW + Math.floor((sx - 300) / TILE)], false);
    for (let i = 0; i < 540; i++) { z.lure = L; step(1); GS.enemies = GS.enemies.filter(o => o === z); cam.x = z.x - viewW / 2; cam.y = z.y - viewH / 2; }
    out.theirs = prints().filter(d => d.tint[0] > 0.3).length;
    // one crawling
    z.dead = true; GS.enemies.length = 0;
    const c = makeEnemy('skitter', sx + 160, sy); c.emerge = 1; c.aw = 0; c.crawl = true; c.sup = false; c.down = 0; c.fallA = Math.PI; c.lyG = 0; c.a = Math.PI;
    for (let i = 0; i < 360; i++) { c.lure = L; step(1); GS.enemies = GS.enemies.filter(o => o === c); cam.x = c.x - viewW / 2; cam.y = c.y - viewH / 2; }
    out.smears = GS.decals.filter(d => d.reg === R.smear).length;
    c.dead = true; GS.enemies.length = 0;
    // you, out of a puddle after rain
    GS.decals = GS.decals.filter(d => d.reg !== R.fprint && !d.blood);
    GS.RUN.wet = 1; GS.pud = 1;
    GS.puddles.push({ x: sx, y: sy, s: 1.4, a: 0, v: 0 });
    P.x = sx - 90; P.y = sy; P.bloodSteps = 0;
    cam.x = sx - viewW / 2; cam.y = sy - viewH / 2;
    walkOn(90);
    const wet = prints().filter(d => d.tint[0] < 0.1);
    out.wet = wet.length;
    out.wetLife = wet.length ? Math.max(...wet.map(d => d.max)) : 0;
    return out;
  })()`);
  await pg.close();
  check(o.spot, `no open stretch to set this up on: ${JSON.stringify(o)}`);
  check(
    o.mine >= 5 && o.past >= 3,
    `walking through blood you should leave bloody prints on past it: ${JSON.stringify(o)}`
  );
  check(o.theirs >= 3, `one of the dead walking through it should leave prints too: ${JSON.stringify(o)}`);
  check(o.smears >= 4, `one dragging itself along should leave a smear behind it: ${JSON.stringify(o)}`);
  check(o.wet >= 2 && o.wetLife < 15, `out of a puddle, a few wet prints that dry quickly: ${JSON.stringify(o)}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${o.mine} bloody prints of yours (${o.past} past the blood), ${o.theirs} of the dead's, ${o.smears} smears behind a crawler, ${o.wet} wet prints`;
}
