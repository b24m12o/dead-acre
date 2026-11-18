/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The night's director (director.js). Crowded close, it lets the peak run a few seconds, then holds the rest of the queue
// back for a breather, the far crowd closing in slower; the breather ends once things are calm, and never runs past
// its limit. Cruising, it brings the next special forward. Never on a boss's night, and it neither adds nor removes any.
import { openGame, check } from './lib/harness.mjs';

export const name = 'director: build, peak, a breather; a special forward when you cruise';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    const P = GS.P, out = {};
    const fr = (n, each) => { for (let i = 0; i < n; i++) { if (each) each(); update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } P.hp = S.maxHp; P.inv = 9; } };
    let spot = null;
    for (let t = 0; t < 40000 && !spot; t++) { const x = 500 + Math.random() * (WW - 1000), y = 500 + Math.random() * (WH - 1000), R = t < 25000 ? 200 : 140; let ok = true; // a crowded map: a little less room
      for (let dx = -R; dx <= R && ok; dx += 20) for (let dy = -R; dy <= R && ok; dy += 20) if (blockPt(x + dx, y + dy)) ok = false; if (ok) spot = [x, y]; }
    if (!spot) return { err: 'no open ground' };
    P.x = spot[0]; P.y = spot[1];
    // a night with surges: night 6
    GS.wave = 5; GS.RUN.nextSig = null; GS.RUN.viaN = null; GS.RUN.viaA = null;
    startWave();
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    out.sg = !!GS.RUN.sg; out.fresh = GS.dir && GS.dir.ph === 'build' && GS.dir.peaks === 0;
    const q0 = GS.queue.length + GS.enemies.length;
    // crowded close: eight of them round you that cannot reach you
    const crowd = [];
    const hold = () => { for (const [e, a] of crowd) { e.x = P.x + Math.cos(a) * 120; e.y = P.y + Math.sin(a) * 120; e.vx = e.vy = 0; e.dmg = 0; } };
    for (let i = 0; i < 8; i++) { const e = makeEnemy('skitter', P.x, P.y); e.emerge = 1; e.hp = e.maxHp = 1e6; crowd.push([e, (i / 8) * TAU]); }
    let peakAt = -1, relaxAt = -1;
    for (let i = 0; i < 60 * 12 && relaxAt < 0; i++) { fr(1, hold); if (peakAt < 0 && GS.dir.ph === 'peak') peakAt = i / 60; if (GS.dir.ph === 'relax') relaxAt = i / 60; }
    out.peakAt = peakAt; out.relaxAt = relaxAt; out.peaks = GS.dir.peaks;
    // in the breather: the queue waits
    const qa = GS.queue.length; fr(60 * 3, hold); out.held = qa > 0 && GS.queue.length === qa && GS.dir.ph === 'relax';
    // and the far crowd, out of sight, closes in slower; near you, or in sight, at its own
    out.slow = DIR.slow; out.paceFar = dirPace({ los: false }, 700 * 700); out.paceSeen = dirPace({ los: true }, 700 * 700); out.paceNear = dirPace({ los: false }, 200 * 200);
    // still crowded: the breather ends at its limit all the same
    let endAt = -1; for (let i = 0; i < 60 * 16 && endAt < 0; i++) { fr(1, hold); if (GS.dir.ph !== 'relax') endAt = i / 60; }
    out.limitEnd = endAt >= 0 && GS.dir.held <= DIR.relaxMax + 0.2;
    // calm: the crowd gone, the next breather ends as soon as it has run its time
    for (const [e] of crowd) e.dead = true; crowd.length = 0;
    GS.dir.ph = 'relax'; GS.dir.t = 2; GS.dir.rx = 0; GS.dir.I = 0;
    const clear = () => { for (const e of GS.enemies) e.dead = true; };
    let calmEnd = -1; for (let i = 0; i < 60 * 6 && calmEnd < 0; i++) { fr(1, clear); if (GS.dir.ph !== 'relax') calmEnd = i / 60; }
    out.calmEnd = calmEnd;
    // cruising: the next special comes to the front of the queue
    GS.queue = ['skitter', 'skitter', 'spore', 'skitter']; GS.dir.ph = 'build'; GS.dir.low = DIR.cruiseT; GS.dir.pullT = -99; GS.dir.I = 0;
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    const pu = GS.dir.pulls; dirTick(1 / 60, GS.RUN.sg);
    out.pulled = GS.queue[0] === 'spore' && GS.dir.pulls === pu + 1 && GS.queue.length === 4;
    out.quick = (GS.dir.low = 5, dirRate()) < 1;
    out.q0 = q0;
    // a boss's night: the director keeps out of it
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.nightDone = true;
    GS.wave = 7; startWave(); out.bossSg = !!GS.RUN.sg; out.bossPace = dirPace({ los: false }, 900 * 900); out.bossHold = dirHold(GS.RUN.sg);
    return out;
  })()`);
  await pg.close();
  check(!o.err, o.err);
  check(o.sg && o.fresh, `night 6 should have surges and a fresh director: ${JSON.stringify(o)}`);
  check(
    o.peakAt >= 0 && o.peakAt < 3 && o.relaxAt > o.peakAt + 2.5,
    `crowded close, a peak should come, run a few seconds, then a breather: peak at ${o.peakAt} s, breather at ${o.relaxAt} s`
  );
  check(o.held, 'in the breather the rest of the queue should wait');
  check(
    o.paceFar === o.slow && o.slow < 1 && o.paceSeen === 1 && o.paceNear === 1,
    `the far crowd out of sight slower, the rest at their own: ${o.paceFar} ${o.paceSeen} ${o.paceNear}`
  );
  check(o.limitEnd, 'a breather should end at its limit even if it is still crowded');
  check(o.calmEnd >= 1.5 && o.calmEnd < 2.6, `calm, a breather should end as its time runs out: ${o.calmEnd} s`);
  check(
    o.pulled && o.quick,
    'cruising, the next special should come to the front (and none added), and the rest come quicker'
  );
  check(!o.bossSg && o.bossPace === 1 && !o.bossHold, "on a boss's night the director keeps out of it");
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `peak at ${o.peakAt.toFixed(1)} s, breather at ${o.relaxAt.toFixed(1)} s; a special forward when cruising`;
}
