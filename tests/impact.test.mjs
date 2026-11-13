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
      const e = makeEnemy('skitter', P.x + far, P.y); e.emerge = 1;
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
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `rifle ${o.hunter} s, buckshot ${o.shotClose} s up close, SMG none; bodies stay past 40 s`;
}
