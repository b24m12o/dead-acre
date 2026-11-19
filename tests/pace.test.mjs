/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The night's pace: the dead come in just out of sight (not from the far side of the map), the last few hanging back
// out of sight come round, and no two runs open the same way (the first nights' trouble drawn at random, Hale on
// either night at the gas station).
import { openGame, check } from './lib/harness.mjs';
import { GK } from '../src/core/scale.js';

export const name = 'pace: they come in just out of sight, and no two runs open the same';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.state = 'play';
    const P = GS.P, out = {};
    updateCamera(1);
    // where the night's dead come from
    let seen = 0, near = 0, far = 0, stuck = 0;
    for (let i = 0; i < 200; i++) {
      const [x, y] = spawnRing(), d = Math.hypot(x - P.x, y - P.y);
      if (x > cam.x && x < cam.x + viewW && y > cam.y && y < cam.y + viewH) seen++;
      if (d < 540 * GK) near++;
      if (d > 1000 * GK) far++;
      if (!reachPt(x, y)) stuck++;
    }
    Object.assign(out, { seen, near, far, stuck });
    // the first nights: drawn, not fixed
    const sigs = new Set();
    for (let i = 0; i < 40; i++) { GS.RUN.sigUsed = []; sigs.add(planSig(2)); }
    out.sigs = [...sigs];
    // Hale: either night at the gas station
    const hale = new Set();
    for (let i = 0; i < 24; i++) { begin(); hale.add(GS.RUN.jobN[1]); }
    out.hale = [...hale].sort();
    // one of the last few, out of sight and hanging back: it comes round within a few seconds
    GS.RUN.tut = null; GS.state = 'play'; GS.wave = 6; GS.RUN.nextSig = { w: 6, s: null }; GS.RUN.viaN = null; GS.RUN.viaA = null; // a plain night (a random one may be a horde)
    startWave();
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.queue.length = 0; GS.dir = null;
    const [sx, sy] = spawnRing(1250, 1450);
    const e = makeEnemy('hopper', sx, sy); e.emerge = 1; e.hp = e.maxHp = 1e6; e.dmg = 0; GS.enemies.push(e);
    let at = -1;
    for (let i = 0; i < 60 * 12 && at < 0; i++) {
      e.x = sx; e.y = sy; e.vx = e.vy = 0; e.lastPD = 1e9; // hanging back: not stuck, just not coming
      update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60);
      if (GS.state === 'cine') cineSkip();
      if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } P.hp = S.maxHp; P.inv = 9;
      if (Math.hypot(e.x - P.x, e.y - P.y) < 700 * GK) at = i / 60;
    }
    out.st = GS.state + ' ' + e.st + ' ' + (e.dead ? 'dead' : 'alive'); out.back = at; out.backD = Math.round(Math.hypot(e.x - P.x, e.y - P.y));
    return out;
  })()`);
  await pg.close();
  check(!o.seen, `a spawn came up in sight of you: ${o.seen} of 200`);
  check(
    !o.near && !o.far,
    `spawns should be ${Math.round(560 * GK)}-${Math.round(980 * GK)} px from you: ${o.near} nearer, ${o.far} farther`
  );
  check(!o.stuck, `a spawn where it can't walk out: ${o.stuck}`);
  check(o.sigs.length >= 3, 'night 2 should not always bring the same trouble: ' + o.sigs.join(', '));
  check(
    o.hale.length === 2 && o.hale[0] === 6 && o.hale[1] === 7,
    'Hale should be found on night 6 or 7: ' + o.hale.join(', ')
  );
  check(
    o.back > 0 && o.back < 6,
    `one of the last few hanging back out of sight should come round soon: ${o.back} s (${o.st})`
  );
  check(o.backD < 700 * GK, `and come round near you: ${o.backD} px`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `spawns ${Math.round(560 * GK)}-${Math.round(980 * GK)} px off, none in sight; night 2: ${o.sigs.join(', ')}; Hale on 6 or 7; a straggler back after ${o.back.toFixed(1)} s, ${o.backD} px off`;
}
