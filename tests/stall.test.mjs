/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A night always ends: the last of the dead that can't reach you come round nearer, whatever they were doing. Here,
// one that was going for the siege house after the siege is over (it used to wander the map for good, and the
// lurkers playing dead waited on it), one stuck where it can't get out, and one just behind a wall from you.
import { openGame, check } from './lib/harness.mjs';

export const name = 'stall: the last stragglers come round, after a siege too';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    const P = GS.P, out = {};
    GS.wave = 5; GS.RUN.nextSig = null; GS.RUN.viaN = null; GS.RUN.viaA = null;
    startWave();
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.queue.length = 0;
    GS.dir = null; // no breathers: this is about the stragglers
    // the far corner from you, wedged where it can't move: it makes no way towards you
    const far = [P.x > WW / 2 ? 4 * TILE : WW - 4 * TILE, P.y > WH / 2 ? 4 * TILE : WH - 4 * TILE];
    const one = (sg) => { const e = makeEnemy('hopper', far[0], far[1]); e.emerge = 1; e.hp = e.maxHp = 1e6; e.dmg = 0; e.sg = sg; return e; };
    const watch = (e, secs) => { let at = -1; for (let i = 0; i < 60 * secs && at < 0; i++) { e.x = far[0]; e.y = far[1]; e.vx = e.vy = 0;
      if (GS.state === 'cine') cineSkip(); update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } P.hp = S.maxHp; P.inv = 9;
      if (Math.hypot(e.x - far[0], e.y - far[1]) > 50) at = i / 60; } return at; };
    // a plain one, stuck
    const a = one(undefined); out.plain = watch(a, 25); out.plainNear = Math.round(Math.hypot(a.x - P.x, a.y - P.y)); a.dead = true; GS.enemies.length = 0;
    // one of the siege's, the siege won and over
    GS.obj = { type: 'siege', done: true, civ: [], bars: [] };
    const s = one(true); out.siege = watch(s, 25); out.siegeNear = Math.round(Math.hypot(s.x - P.x, s.y - P.y));
    out.d0 = Math.round(Math.hypot(far[0] - P.x, far[1] - P.y));
    // one just round a wall from you, out of sight, that can't find its way: near, but no nearer
    s.dead = true; GS.enemies.length = 0; GS.obj = null;
    let pair = null;
    for (let t = 0; t < 60000 && !pair; t++) { const x = 400 + Math.random() * (WW - 800), y = 400 + Math.random() * (WH - 800), a = Math.random() * TAU, ex = x + Math.cos(a) * 230, ey = y + Math.sin(a) * 230;
      if (!blockPt(x, y) && !blockPt(ex, ey) && !los(x, y, ex, ey)) pair = [x, y, ex, ey]; }
    if (pair) { const [x, y, ex, ey] = pair; P.x = x; P.y = y; far[0] = ex; far[1] = ey; const w = one(undefined); out.walled = watch(w, 25); }
    out.live = GS.nightLive;
    return out;
  })()`);
  await pg.close();
  check(o.live, 'the night ended early: ' + JSON.stringify(o));
  check(o.plain > 0, `a stuck straggler never came round (${o.plain})`);
  check(o.siege > 0, `a siege straggler, the siege over, never came round (${o.siege}): the night would never end`);
  check(
    o.plainNear < o.d0 && o.siegeNear < o.d0,
    `they came round no nearer: ${o.plainNear}, ${o.siegeNear} px, from ${o.d0}`
  );
  check(o.walled > 0, `a straggler just behind a wall never came round (${o.walled})`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `a stuck one back after ${o.plain.toFixed(0)} s, a siege one after ${o.siege.toFixed(0)} s, one behind a wall after ${o.walled.toFixed(0)} s, ${o.plainNear} and ${o.siegeNear} px from you (stuck ${o.d0} px off)`;
}
