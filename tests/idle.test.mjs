/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The dead doing their own thing. One pinned under a car stays where it's pinned, takes your ankle if you walk right by
// and is still pinned when you've rolled free; the last of the night, it drags itself out and comes. One away from you
// stands swaying, or goes and beats on a window; anything that has it notice you ends it.
import { openGame, check } from './lib/harness.mjs';

export const name = 'idle: pinned under a car; swaying, beating on a window, and given up when it notices you';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    const P = GS.P;
    let other = null;
    const hold = () => { GS.queue.length = 0; GS.queue.push('skitter'); GS.spawnT = 1e9; };
    const step = (n, keep) => { for (let i = 0; i < n; i++) { hold(); P.hp = S.maxHp; update(1 / 60); tickWorld(1 / 60); GS.enemies = GS.enemies.filter(keep); } };
    // pinned: by a car, you a way off
    let e = null;
    for (let t = 0; t < 80 && !e; t++) {
      const c = cars[Math.floor(Math.random() * cars.length)];
      if (c.truck || c.tanker || c.dead) continue;
      e = makePinned({ x: c.x + 500 * GK, y: c.y });
      if (!e) continue;
      // (a clear walk up to it, for the test)
      const a = e.pin.a, x = e.x + Math.cos(a) * 200, y = e.y + Math.sin(a) * 200;
      if (blockPt(x, y) || !los(x, y, e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20)) { e.dead = true; GS.enemies = GS.enemies.filter(q => q !== e); e = null; }
    }
    out.made = !!e;
    if (!e) return out;
    other = makeEnemy('skitter', e.x + 3000, e.y); other.emerge = 1; other.aw = 0; // (not the last of the night)
    const keep = q => q === e || q === other;
    const a = e.pin.a, px = e.x + Math.cos(a) * 200, py = e.y + Math.sin(a) * 200;
    P.x = px; P.y = py;
    step(120, keep); other.x = e.x + 3000;
    out.stays = Math.round(Math.hypot(e.x - e.pin.x, e.y - e.pin.y)); // (the bodies' push nudges it, and it's put back)
    out.lurk = e.lurk;
    // you walk right up to it
    for (let i = 0; i < 200 && !P.held; i++) { const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); if (d > 14) { P.x += dx / d * 1.5; P.y += dy / d * 1.5; } step(1, keep); other.x = e.x + 3000; }
    out.grabbed = P.held === e;
    out.reach = [Math.round(Math.hypot(e.x - P.x, e.y - P.y)), Math.round(e.r + (P.r || 0) + 10)]; // (how near you got, and its reach)
    // and roll free
    P.dashCd = 0; out.held0 = !!P.held; tryDash(); out.dashed = P.dashT > 0; step(60, keep); other.x = e.x + 3000;
    out.free = !P.held;
    out.stillPinned = !!e.pin && e.lurk === 'pin' && Math.hypot(e.x - e.pin.x, e.y - e.pin.y) < 6;
    // the last of the night: out from under, and coming
    P.x = px; P.y = py;
    other.dead = true; GS.queue.length = 0;
    for (let i = 0; i < 30; i++) { GS.spawnT = 1e9; P.hp = S.maxHp; update(1 / 60); tickWorld(1 / 60); GS.enemies = GS.enemies.filter(q => q === e); }
    out.unpinned = !e.pin && !e.lurk && e.crawl;
    const d0 = Math.hypot(e.x - P.x, e.y - P.y);
    for (let i = 0; i < 240; i++) { GS.spawnT = 1e9; P.hp = S.maxHp; update(1 / 60); tickWorld(1 / 60); GS.enemies = GS.enemies.filter(q => q === e); }
    out.came = Math.round(d0 - Math.hypot(e.x - P.x, e.y - P.y));
    e.dead = true; GS.enemies.length = 0;
    // idle: one far from you, left to itself, soon does something of its own
    victims.length = 0; // (none of the town's dead about to go and feed on instead)
    const rate = IDLE.rate; IDLE.rate = 50;
    const z = makeEnemy('skitter', P.x + 900, P.y); z.emerge = 1; z.aw = 0; if (z.run) { z.run = false; z.sp /= 2.5; }
    for (let t = 0; t < 30 && blockPt(z.x, z.y); t++) z.y += 40;
    const kz = q => q === z;
    let kinds = new Set();
    for (let i = 0; i < 60 * 8; i++) { step(1, kz); if (z.idle) kinds.add(z.idle.k); if (z.idle && z.idle.k === 'sway') break; }
    IDLE.rate = rate;
    out.idled = [...kinds];
    if (z.idle && z.idle.k === 'sway') { const x0 = z.x, y0 = z.y; step(60, kz); out.swayStill = Math.round(Math.hypot(z.x - x0, z.y - y0)); } // (how far it went in a second)
    // noticing you ends it
    z.aw = 9; step(2, kz);
    out.ended = !z.idle;
    // one sent to a window beats on it
    const road = (x, y) => ROAD[Math.floor(y / TILE) * MW + Math.floor(x / TILE)];
    const W = windows.filter(w => !w.cool && road(w.x, w.y + 80) && !blockPt(w.x, w.y - 4) && !blockPt(w.x, w.y + 40) && los(w.x, w.y + 40, w.x, w.y - 4));
    out.windows = W.length;
    // (up to three windows: the street can take one away from its window, as it should: a body to trip on, a job nearby)
    out.beats = 0;
    for (const w of W.slice(0, 3)) {
      z.aw = 0; z.down = 0; z.lure = null; z.x = w.x; z.y = w.y + 40; z.idle = { k: 'glass', t: 0, dur: 99, a: 0, beatT: 0.5, x: w.x, y: w.y - 4 };
      P.x = w.x + 900; P.y = w.y + 200;
      let beats = 0, was = 0;
      for (let i = 0; i < 60 * 9; i++) { step(1, kz); if ((z.lunge || 0) > was + 0.1) beats++; was = z.lunge || 0; } // (each time its swing starts over)
      out.beats = beats;
      out.atWindow = Math.round(Math.hypot(z.x - w.x, z.y - (w.y - 4)));
      if (beats >= 2 && out.atWindow < 22) break;
    }
    return out;
  })()`);
  await pg.close();
  check(o.made, `there should be a car to pin one under: ${JSON.stringify(o)}`);
  check(o.stays < 6 && o.lurk === 'pin', `pinned, it should stay where it is: ${JSON.stringify(o)}`);
  check(
    o.grabbed && o.free && o.stillPinned,
    `walking right by, it should take your ankle; rolled free, it's still pinned: ${JSON.stringify(o)}`
  );
  check(o.unpinned && o.came > 15, `the last of the night, it should drag itself out and come: ${JSON.stringify(o)}`);
  check(o.idled.length > 0, `one left to itself should do something of its own: ${JSON.stringify(o)}`);
  check(o.swayStill === undefined || o.swayStill < 8, `swaying, it should stand where it is: ${JSON.stringify(o)}`);
  check(o.ended, `noticing you should end it: ${JSON.stringify(o)}`);
  check(!o.windows || (o.beats >= 2 && o.atWindow < 22), `at a window it should beat on it: ${JSON.stringify(o)}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `pinned: stays, grabs, still pinned after a roll, out and coming (${o.came}) when last; idle: ${o.idled.join('/')}; ${o.beats ?? 0} beats on a window`;
}
