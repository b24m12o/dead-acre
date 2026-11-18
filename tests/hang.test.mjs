/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Two things a player ran into: a night that hung (a horde night, "7 still walking", none of them anywhere near) and a
// jack-knifed truck you could walk through at its ends. A night's last few, none of them in sight for 8 s, come round
// just out of sight and come for you; and a car blocks where it is drawn, turned as it is.
import { openGame, check } from './lib/harness.mjs';

export const name = 'hang: a night never hangs on its last few, and a turned car blocks where it is drawn';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.state = 'play'; __god();
    const P = GS.P, out = {};
    const step = n => { for (let i = 0; i < n; i++) { if (GS.state === 'levelup') { GS.luOpenT = 0; choose(0); } if (GS.state === 'cine') cineSkip(); update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); } };
    // a turned car: walk into its end, past where its tiles' blockers reach
    const c = cars.find(c => c.truck) || cars[0];
    const a0 = c.a; c.a = 0.5; c.jx = c.jy = c.ja = 0;
    const L = (c.truck ? 118 : 78) / 2;
    const ex = c.x + Math.cos(c.a) * (L - 8), ey = c.y + Math.sin(c.a) * (L - 8); // just inside its far end
    P.x = ex; P.y = ey; P.vx = P.vy = 0; collide(P);
    const u = (P.x - c.x) * Math.cos(c.a) + (P.y - c.y) * Math.sin(c.a), v = -(P.x - c.x) * Math.sin(c.a) + (P.y - c.y) * Math.cos(c.a);
    out.outside = Math.abs(u) >= L - 4 || Math.abs(v) >= (c.truck ? 22 : 19) - 4;
    c.a = a0;
    // the survivor card, taken standing right by something solid: the one who joins you stands beside you in the open
    let spot = null;
    for (let t = 0; t < 20000 && !spot; t++) {
      const x = 300 + Math.random() * (WW - 600), y = 300 + Math.random() * (WH - 600);
      if (!blockPt(x, y) && reachPt(x, y) && blockPt(x - 40, y + 30)) spot = [x, y];
    }
    out.spot = !!spot;
    if (spot) {
      P.x = spot[0]; P.y = spot[1]; P.vx = P.vy = 0;
      const n0 = GS.buddies.length;
      UP.find(u => u.id === 'buddy').apply();
      const s = GS.buddies[n0];
      out.budOpen = !!s && !blockPt(s.x, s.y) && los(P.x, P.y, s.x, s.y) && Math.hypot(s.x - P.x, s.y - P.y) < 140;
      for (const b of GS.buddies) b.dead = true; GS.buddies.length = 0;
    }
    // a horde night down to its last 7, milling out of sight where their mass gathered
    GS.wave = 3; startWave(); step(30);
    GS.queue.length = 0;
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    const far = [];
    for (let i = 0; i < 7; i++) {
      const [x, y] = spawnRing(1300, 1500);
      const e = makeEnemy('skitter', x, y); e.emerge = 1; e.horde = true; e.lure = { x, y, horde: true }; e.aw = 0; GS.enemies.push(e); far.push(e);
    }
    GS.nightLive = true; GS.nightDone = false;
    let t = 0, near = 0;
    for (; t < 14 && near < 5; t += 0.5) {
      for (const e of far) if (!e.dead) { e.aw = 0; } // they don't know you're there
      step(30);
      near = far.filter(e => !e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 700).length;
    }
    out.t = t; out.near = near; out.aware = far.filter(e => !e.dead && e.aw > 0).length;
    return out;
  })()`);
  await pg.close();
  check(
    o.spot && o.budOpen,
    `a survivor from the card should join you in the open, not in what you stand by: ${o.spot}, ${o.budOpen}`
  );
  check(o.outside, 'walking into a turned car at its end should push you out of it');
  check(
    o.near >= 5 && o.t <= 11,
    `the last few, out of sight, should come round within ~10 s: ${o.near} near after ${o.t} s`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `a turned truck's end blocks; the last 7 came round after ${o.t} s`;
}
