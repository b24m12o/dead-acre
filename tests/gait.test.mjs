/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Each of the dead walks its own way (its cadence, how far it rolls, now and then one bent forward), a foot goes
// wrong now and then, a crawler drags a smear behind it; and a heavy hit (buckshot up close, a hunting rifle) takes
// more off them: the head on a head shot nearly always, an arm as often as not.
import { openGame, check } from './lib/harness.mjs';

export const name = 'gait: each walks its own way, stumbles, crawlers smear; heavy hits take more off';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play'; GS.dir = null;
    const P = GS.P, out = {};
    GS.wave = 2; GS.RUN.nextSig = null; GS.horde = null; startWave(); for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.queue.length = 0;
    const fr = n => { for (let i = 0; i < n; i++) { update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.luOpenT = 0; choose(0); } P.hp = S.maxHp; P.inv = 9; } };
    // a crowd's ways of walking
    const zs = []; for (let i = 0; i < 40; i++) { const e = makeEnemy('skitter', P.x + 2000, P.y); zs.push(e); }
    const cads = zs.map(e => e.cad), sw = zs.map(e => e.swK);
    out.cad = [Math.min(...cads), Math.max(...cads)].map(v => +v.toFixed(2)); out.sw = [Math.min(...sw), Math.max(...sw)].map(v => +v.toFixed(2)); out.hunched = zs.filter(e => e.hunch > 0).length;
    for (const e of zs) e.dead = true; GS.enemies.length = 0;
    // walking for a minute: a foot goes wrong now and then
    const walkers = []; for (let i = 0; i < 8; i++) { const e = makeEnemy('skitter', P.x + 400, P.y - 200 + i * 50); e.emerge = 1; e.aw = 9; e.dmg = 0; e.hp = e.maxHp = 1e6; e.run = false; walkers.push(e); }
    let stumbles = 0; const was = new Map();
    for (let i = 0; i < 60 * 40; i++) { for (const e of walkers) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < 200) { e.x = P.x + 400; e.y = P.y + (e.id % 8) * 40 - 160; } const w = e.wbT > 0.35; if (w && !was.get(e)) stumbles++; was.set(e, w); } fr(1); }
    out.stumbles = stumbles;
    for (const e of walkers) e.dead = true; GS.enemies.length = 0;
    // a crawler's smear
    const c = makeEnemy('skitter', P.x + 300, P.y); c.emerge = 1; c.aw = 9; c.crawl = true; c.dmg = 0; c.hp = c.maxHp = c.hp > 0 ? 1e6 : 1e6;
    const pool0 = pool; let smear = 0; pool = function () { smear++; return pool0.apply(this, arguments); };
    for (let i = 0; i < 60 * 4; i++) { if (Math.hypot(c.x - P.x, c.y - P.y) < 120) { c.x = P.x + 300; c.y = P.y; } fr(1); }
    pool = pool0; out.smear = smear; c.dead = true; GS.enemies.length = 0;
    // heavy hits: a hunting rifle's head shot, and buckshot up close
    let heads = 0, arms = 0, n = 0;
    for (let i = 0; i < 40; i++) { const e = makeEnemy('skitter', P.x + 100, P.y); e.emerge = 1; GS.HITB = { gun: 'hunter' }; killEnemy(e, e.maxHp * 0.6, 'bolt', 1, 0, true); n++; if (e.headless) heads++; if (e.lost && (e.lost[0] || e.lost[1])) arms++; }
    out.heads = +(heads / n).toFixed(2); out.arms = +(arms / n).toFixed(2);
    let lh = 0; for (let i = 0; i < 40; i++) { const e = makeEnemy('skitter', P.x + 100, P.y); e.emerge = 1; GS.HITB = { gun: 'pistol' }; killEnemy(e, e.maxHp * 0.6, 'bolt', 1, 0, true); if (e.headless) lh++; }
    out.lightHeads = +(lh / 40).toFixed(2);
    return out;
  })()`);
  await pg.close();
  check(o.cad[1] - o.cad[0] > 0.3 && o.sw[1] - o.sw[0] > 0.6, `a crowd's cadence ${o.cad} and sway ${o.sw}: too alike`);
  check(o.hunched >= 2 && o.hunched <= 20, `${o.hunched} of 40 bent forward`);
  check(o.stumbles >= 2, `eight walking for 40 s stumbled ${o.stumbles} times`);
  check(o.smear >= 3, `a crawler dragged itself 4 s and left ${o.smear} smears`);
  check(
    o.heads >= 0.8 && o.heads > o.lightHeads + 0.2,
    `heads off on a head shot: hunting rifle ${o.heads}, pistol ${o.lightHeads}`
  );
  check(o.arms >= 0.2, `arms off on a hunting rifle's kill: ${o.arms}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `cadence ${o.cad[0]}–${o.cad[1]}, sway ${o.sw[0]}–${o.sw[1]}, ${o.hunched}/40 hunched; ${o.stumbles} stumbles; ${o.smear} smears; heads ${o.heads} (pistol ${o.lightHeads}), arms ${o.arms}`;
}
