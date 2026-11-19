/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A heavy round that kills makes the game catch its breath for a few frames; the light guns that kill in a stream
// don't. A load of buckshot that drops several at once counts once, and nothing freezes with screen shake off. The
// dead you drop stay on the street for a good while, not a few seconds.
import { openGame, check } from './lib/harness.mjs';

export const name = 'impact: heavy kills freeze a beat, the dead stay down';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.state = 'play'; GS.queue = []; GS.enemies.length = 0;
    GS.nightLive = false; GS.interT = 999; GS.wave = 6;
    const P = GS.P, shake0 = opt.shake;
    opt.shake = true;
    const kill = (gun, far = 400) => {
      const e = makeEnemy('skitter', P.x + far * GK, P.y); e.emerge = 1;
      GS.HITB = { gun };
      try { killEnemy(e, 5, 'bolt', 1, 0, false); } finally { GS.HITB = null; }
      return e;
    };
    const out = {};
    GS.time = 100; GS.hitstop = 0; kill('hunter'); out.hunter = GS.hitstop;
    GS.time = 101; GS.hitstop = 0; kill('smg'); out.smg = GS.hitstop;
    GS.time = 102; GS.hitstop = 0; kill('shotgun', 100); out.shotClose = GS.hitstop;
    GS.time = 103; GS.hitstop = 0; kill('shotgun', 400); out.shotFar = GS.hitstop;
    GS.time = 104; GS.hitstop = 0; kill('shotgun', 90); GS.hitstop = 0; kill('shotgun', 95); out.second = GS.hitstop; // the same frame
    GS.time = 105; opt.shake = false; GS.hitstop = 0; kill('hunter'); out.noShake = GS.hitstop;
    opt.shake = shake0;
    GS.corpses = []; const e = kill('pistol');
    for (let i = 0; i < 60 * 40; i++) tickWorld(1 / 60);
    out.stillDown = GS.corpses.includes(e);
    for (let i = 0; i < 60 * 8; i++) tickWorld(1 / 60);
    out.goneLater = !GS.corpses.includes(e);
    // a heavy round throws the body into the ones behind it: they go down too. A pistol's doesn't
    for (let t = 0; t < 30000; t++) {
      const x = 400 + Math.random() * (WW - 800), y = 400 + Math.random() * (WH - 800);
      let ok = true;
      for (let dx = -40; dx <= 260 && ok; dx += 20) for (let dy = -60; dy <= 60 && ok; dy += 20) if (blockPt(x + dx, y + dy)) ok = false;
      if (ok) { GS.P.x = x; GS.P.y = y; break; }
    } // clear ground for the row to stand on and the body to fly across
    const row = (gun, dmg) => {
      for (const o of GS.enemies) o.dead = true; GS.enemies.length = 0; GS.corpses = []; GS.time += 5;
      const v = makeEnemy('skitter', P.x + 120 * GK, P.y); v.emerge = 1; v.hp = 1; v.maxHp = 200; v.vx = v.vy = 0; v.crawl = v.half = false;
      const behind = [-14, 0, 14].map(dy => { const o = makeEnemy('skitter', P.x + 150 * GK, P.y + dy * GK); o.emerge = 1; o.hp = o.maxHp = 400; o.run = false; return o; });
      GS.HITB = { gun };
      try { killEnemy(v, dmg, 'bolt', 1, 0, false); } finally { GS.HITB = null; }
      let down = 0;
      for (let i = 0; i < 40; i++) { update(1 / 60); tickWorld(1 / 60); for (const o of behind) { o.x = P.x + 150 * GK; if (o.down > 0 && !o.cnt) { o.cnt = 1; down++; } } }
      return down;
    };
    out.heavy = row('hunter', 90); out.light = row('pistol', 12);
    return out;
  })()`);
  await pg.close();
  check(o.hunter >= 0.04, `a hunting rifle kill should freeze about 0.045 s: ${o.hunter}`);
  check(o.smg === 0, `an SMG body kill should not freeze: ${o.smg}`);
  check(
    o.shotClose >= 0.025 && o.shotFar === 0,
    `buckshot freezes up close only: ${o.shotClose} close, ${o.shotFar} far`
  );
  check(o.second === 0, `two kills in one frame should freeze once: the second set ${o.second}`);
  check(o.noShake === 0, `with screen shake off nothing should freeze: ${o.noShake}`);
  check(o.stillDown, 'a body should still be on the ground 40 s after it fell');
  check(o.goneLater, 'a body should be cleared away in the end');
  check(
    o.heavy >= 1 && o.light === 0,
    `a heavy kill should knock down the ones behind it and a pistol kill none: ${o.heavy} / ${o.light}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `rifle ${o.hunter} s, buckshot ${o.shotClose} s up close, SMG none; bodies stay past 40 s; a heavy kill bowls over ${o.heavy}`;
}
