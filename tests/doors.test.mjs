/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Doors: every house still standing has one in each doorway. It opens for you and shuts behind you; the dead are
// held at it until they break it down; it can't shut on one of them standing in it; and once broken it stays broken.
import { openGame, check } from './lib/harness.mjs';

export const name = 'doors: open for you, shut behind you, and the dead have to break them down';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = [];
    // the motel: its rooms always stand whole (Dead Acre's own houses are ruins, and a town of them can have no door at all)
    GS.RUN.journey = true; GS.RUN.layout = 'motel'; GS.RUN.district = 'highway'; GS.RUN.stop = STOPS.findIndex(s => s.id === 'motel');
    newRun(); GS.state = 'play';
    const quiet = () => { GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999; GS.obj = null; };
    quiet();
    const P = GS.P;
    const fr = n => { for (let i = 0; i < n; i++) { update(1 / 60); tickWorld(1 / 60); P.hp = S.maxHp; if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    const wallAt = (x, y) => !!grid[Math.floor(y / TILE) * MW + Math.floor(x / TILE)];
    out.n = GS.doors.length;
    // every door sits in a gap: open ground under it, wall at both ends, open on both sides
    out.bad = GS.doors.filter(d => {
      const ax = -d.ny, ay = d.nx, h = (d.w * TILE) / 2 + 8;
      return wallAt(d.x, d.y) || !wallAt(d.x + ax * h, d.y + ay * h) || !wallAt(d.x - ax * h, d.y - ay * h) || wallAt(d.x + d.nx * TILE, d.y + d.ny * TILE) || wallAt(d.x - d.nx * TILE, d.y - d.ny * TILE);
    }).length;
    // one with room inside and out
    const d = GS.doors.find(d => d.w === 1 && [60, 100].every(k => !wallAt(d.x - d.nx * k, d.y - d.ny * k)) && [60, 100, 140].every(k => !wallAt(d.x + d.nx * k, d.y + d.ny * k))) || GS.doors[0];
    if (!d) return out;
    const side = e => (e.x - d.x) * d.nx + (e.y - d.y) * d.ny; // + outside, - inside
    // it opens for you and shuts behind you
    P.x = d.x + d.nx * 30; P.y = d.y + d.ny * 30; P.vx = P.vy = 0; fr(30);
    out.opened = d.open;
    P.x = d.x - d.nx * 100; P.y = d.y - d.ny * 100; fr(40);
    out.shut = d.open;
    // one of them outside: held until it breaks the door down, then in
    GS.nightLive = true;
    const w = makeEnemy('skitter', d.x + d.nx * 110, d.y + d.ny * 110); w.emerge = 1; w.aw = 99; w.hp = w.maxHp = 9999; w.run = false; GS.enemies.push(w);
    let held = 0, brokeAt = -1, inAt = -1, minSide = 1e9;
    for (let i = 0; i < 60 * 20 && inAt < 0; i++) {
      fr(1); w.aw = 99;
      if (Math.abs(side(w)) < 40 && side(w) > 0 && !d.broken) held++;
      minSide = Math.min(minSide, d.broken ? 1e9 : side(w));
      if (d.broken && brokeAt < 0) brokeAt = i / 60;
      if (side(w) < -12) inAt = i / 60;
    }
    out.held = held / 60; out.brokeAt = brokeAt; out.inAt = inAt; out.minSide = minSide === 1e9 ? null : Math.round(minSide);
    out.staysBroken = (fr(60), d.broken);
    w.dead = true; GS.enemies.length = 0;
    // it can't shut on one of them standing in it
    const d2_ = GS.doors.find(q => q !== d && !q.broken && q.w === 1 && !wallAt(q.x - q.nx * 100, q.y - q.ny * 100) && !wallAt(q.x + q.nx * 40, q.y + q.ny * 40));
    if (d2_) {
      P.x = d2_.x + d2_.nx * 30; P.y = d2_.y + d2_.ny * 30; fr(30);
      const z = makeEnemy('skitter', d2_.x, d2_.y); z.emerge = 1; z.aw = 0; z.sp = 0; z.hp = z.maxHp = 9999; z.dmg = 0; GS.enemies.push(z);
      P.x = d2_.x - d2_.nx * 100; P.y = d2_.y - d2_.ny * 100;
      for (let i = 0; i < 60; i++) { fr(1); z.x = d2_.x; z.y = d2_.y; }
      out.jammed = d2_.open;
      z.dead = true; GS.enemies.length = 0; fr(40);
      out.unjammed = d2_.open;
    }
    // a new place: new doors, all whole
    GS.RUN.journey = true; GS.RUN.layout = 'clinic'; GS.RUN.district = 'town'; GS.RUN.stop = STOPS.findIndex(s => s.id === 'clinic');
    newRun(); out.motel = [GS.doors.length, GS.doors.filter(q => q.broken).length];
    return out;
  })()`);
  await pg.close();
  check(
    o.n >= 3 && o.bad === 0,
    `the motel should have doors, each in a proper doorway: ${o.n} doors, ${o.bad} misplaced`
  );
  check(o.opened > 0.9 && o.shut === 0, `a door should open for you and shut behind you: ${o.opened} then ${o.shut}`);
  check(
    o.held >= 1.5 && o.brokeAt > 0 && o.inAt > o.brokeAt && (o.minSide === null || o.minSide > 0),
    `the dead should be held at a door until they break it: held ${o.held.toFixed(1)} s, broke at ${o.brokeAt.toFixed?.(1)}, in at ${o.inAt.toFixed?.(1)}, nearest it got while the door stood ${o.minSide}`
  );
  check(o.staysBroken, 'a broken door should stay broken');
  check(
    o.jammed === undefined || (o.jammed > 0.9 && o.unjammed === 0),
    `a door should not shut on one standing in it, and shut once it is clear: ${o.jammed} then ${o.unjammed}`
  );
  check(o.motel[0] >= 3 && o.motel[1] === 0, `a new place should have its own doors, all whole: ${o.motel}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${o.n} doors at the motel; one walker held ${o.held.toFixed(1)} s, through at ${o.inAt.toFixed(1)} s`;
}
