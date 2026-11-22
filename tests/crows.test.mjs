/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Crows give you away. Walk up on a flock on the ground and it goes up; the dead that haven't noticed you and are
// near enough to hear it come to where it went up (and a ring shows on the radar); one further off doesn't.
import { openGame, check } from './lib/harness.mjs';

export const name = 'crows: a flock you walk up puts the dead near it on their way to the spot';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    const hold = () => { GS.queue.length = 0; GS.queue.push('skitter'); GS.spawnT = 1e9; }; // (no others, and not the last few)
    hold();
    crows.length = 0;
    // a long open stretch: you, the flock 260 on, one of the dead 230 past it facing away, another 700 past it
    const P = GS.P, open = (x, y) => [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080].every(d => !blockPt(x + d, y) && !blockPt(x + d, y + 30) && !blockPt(x + d, y - 30));
    let sx = null, sy = null;
    for (let t = 0; t < 4000 && sx === null; t++) {
      const x = 200 + Math.random() * (MW * TILE - 1400), y = 200 + Math.random() * (MH * TILE - 400);
      if (open(x, y)) { sx = x; sy = y; }
    }
    out.spot = sx !== null;
    if (!out.spot) return out;
    P.x = sx; P.y = sy; P.vx = P.vy = 0;
    const fx = sx + 260, fy = sy;
    for (let i = 0; i < 5; i++) crows.push({ id: 99, x: fx + i * 9 - 18, y: fy + (i % 2) * 8, z: 0, tx: fx, ty: fy, a: 0, st: 'ground', v: 160, vz: 0, fl: 0, t: 0, peck: 0, hop: 0, k: 1, seed: i / 5 });
    const near = makeEnemy('skitter', fx + 230, fy), far = makeEnemy('skitter', fx + 700, fy);
    for (const e of [near, far]) { e.emerge = 1; e.aw = 0; e.a = 0; } // (made, they're in the street already)
    const step = n => { for (let i = 0; i < n; i++) { hold(); P.hp = S.maxHp; update(1 / 60); tickWorld(1 / 60); GS.enemies = GS.enemies.filter(o => o === near || o === far); } };
    step(30);
    out.before = [near.aw > 0, far.aw > 0, !!near.lure];
    const rings = GS.noiseRings.length;
    // you walk up on them
    let up = false;
    for (let i = 0; i < 120 && !up; i++) { P.x += 2; step(1); up = crows.some(c => c.st === 'up'); }
    out.up = up;
    out.nearLured = !!(near.lure && near.lure.crow);
    out.nearAw = near.aw > 0; // (ambling, it may have turned and seen you first: then it's coming anyway)
    out.farLured = !!(far.lure && far.lure.crow);
    out.ring = GS.noiseRings.length > rings || GS.noiseRings.some(r => r.r === CROW_HEARD);
    // the near one walks to the spot; you step back out of its way
    P.x = sx - 300;
    const d0 = Math.hypot(near.x - fx, near.y - fy);
    step(60 * 5);
    out.closed = Math.round(d0 - Math.hypot(near.x - fx, near.y - fy));
    out.farMoved = Math.round(Math.hypot(far.x - (fx + 700), far.y - fy));
    step(60 * 4);
    out.let = !(near.lure && near.lure.crow);
    return out;
  })()`);
  await pg.close();
  check(o.spot, `no open stretch to set this up on: ${JSON.stringify(o)}`);
  check(
    !o.before[0] && !o.before[1] && !o.before[2],
    `the dead shouldn't have noticed you before the crows go up: ${JSON.stringify(o)}`
  );
  check(o.up, `the flock should go up as you walk up on it: ${JSON.stringify(o)}`);
  check(
    o.nearLured && !o.farLured && o.ring,
    `the near one should hear it (a ring on the radar), not the far one: ${JSON.stringify(o)}`
  );
  check(o.closed > 60, `the near one should go to where the flock went up: ${JSON.stringify(o)}`);
  check(o.let || o.nearAw, `after a few seconds it should let it go: ${JSON.stringify(o)}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `the flock went up; the near one came ${o.closed} toward the spot and let it go, the far one didn't hear`;
}
