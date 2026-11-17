/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Small things about the flow of a night: the weapon wheel opens even with only a pistol; a round that pops a
// streetlamp's bulb ends there (it was up in the air: it can't go on and hit one on the ground); a breather between
// surges doesn't wait on a few unaware ones wandering far off; and a dawn with nothing in it doesn't make you wait.
import { openGame, check } from './lib/harness.mjs';

export const name = 'flow: the wheel with a pistol, a bulb stops the round, no waiting for nothing';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play'; GS.dir = null;
    const P = GS.P, out = {};
    const fr = n => { for (let i = 0; i < n; i++) { update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.luOpenT = 0; choose(0); } P.hp = S.maxHp; P.inv = 9; } };
    // the wheel, a pistol and nothing else
    P.owned = ['pistol']; equip('pistol', true); for (const k in TRAP) GS.RUN.traps && (GS.RUN.traps[k] = 0);
    WHEEL.held = 'kbm'; WHEEL.downT = performance.now() - 400; wheelTick(); out.wheel = WHEEL.open; WHEEL.held = null; WHEEL.open = false;
    // a round through a bulb, a zombie on the ground just past it
    GS.wave = 3; startWave(); for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.queue.length = 0;
    // a lamp with open ground either side of its bulb along some line, so nothing but the bulb is in the round's way
    let L = null, ux = 1, uy = 0;
    for (const l of lamps) {
      if (l.down || l.shot || l.lantern || L) continue;
      const [bx, by] = bulbAt(l);
      for (let k = 0; k < 16 && !L; k++) {
        const a = (k / 16) * TAU, cx = Math.cos(a), cy = Math.sin(a);
        let ok = true; for (let s = -70; s <= 60 && ok; s += 5) if (solidPt(bx + cx * s, by + cy * s)) ok = false;
        if (ok) { L = l; ux = cx; uy = cy; }
      }
    }
    if (L) {
      const [bx, by] = bulbAt(L), zx = bx + ux * 50, zy = by + uy * 50, z = makeEnemy('skitter', zx, zy); z.emerge = 1; z.hp = z.maxHp = 500; z.dmg = 0; z.aw = 0;
      GS.pbullets.push({ x: bx - ux * 60, y: by - uy * 60, sx: bx - ux * 60, sy: by - uy * 60, mz: 0, vx: ux * 1400, vy: uy * 1400, life: 0.3, dmg: 20, pierce: 3, crit: 0, fall: 1, ap: 0, gun: 'rifle', bounce: 0, hits: [], kb: 1 });
      for (let i = 0; i < 20; i++) { z.x = zx; z.y = zy; fr(1); }
      out.lamp = { shot: !!L.shot, zHp: Math.round(z.hp) };
      z.dead = true;
    }
    // a breather between surges, four unaware ones far off: the next surge doesn't wait the breather out
    GS.wave = 2; GS.RUN.nextSig = null; GS.horde = null; startWave(); for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    const SG = GS.RUN.sg;
    if (SG) {
      SG.i = 1; SG.lull = 18; SG.quiet = 0; const n0 = SG.n;
      const far = [];
      for (let i = 0; i < 4; i++) { const e = makeEnemy('skitter', P.x > WW / 2 ? 4 * TILE + i * 30 : WW - 4 * TILE - i * 30, P.y > WH / 2 ? 4 * TILE : WH - 4 * TILE); e.emerge = 1; e.aw = 0; e.dmg = 0; e.hp = e.maxHp = 1e6; far.push([e, e.x, e.y]); }
      let t = 0; for (; t < 60 * 20 && SG.lull > 0; t++) { for (const [e, x, y] of far) { e.x = x; e.y = y; e.aw = 0; e.vx = e.vy = 0; } fr(1); }
      out.lull = +(t / 60).toFixed(1);
      for (const [e] of far) e.dead = true;
    }
    // a dawn with nothing in it, then one with an unopened supply drop
    GS.enemies.length = 0; GS.queue.length = 0; GS.obj = null; GS.RUN.sg = null; GS.crates.length = 0; GS.boonDrops = [];
    nightCleared(); GS.RUN.trapDawn = 0; GS.interT = 11; fr(2); out.idle = +GS.interT.toFixed(1);
    GS.crates.push({ x: P.x + 900, y: P.y, open: false, dawn: true, t: 0, r: 20, land: 0 }); GS.interT = 11; fr(2); out.busy = +GS.interT.toFixed(1);
    return out;
  })()`);
  await pg.close();
  check(o.wheel, 'the weapon wheel would not open with only a pistol');
  check(o.lamp && o.lamp.shot && o.lamp.zHp === 500, 'a round through a bulb: ' + JSON.stringify(o.lamp));
  check(o.lull !== undefined && o.lull < 8, `a breather with four far-off unaware ones lasted ${o.lull} s (of 18)`);
  check(o.idle <= 6, `an empty dawn still counts down from ${o.idle}`);
  check(o.busy > 10, `a dawn with an unopened drop came down to ${o.busy}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `wheel with a pistol; the bulb stops the round (zombie untouched); a breather ends in ${o.lull} s with only far-off ones; an empty dawn ${o.idle} s, one with a drop ${o.busy} s`;
}
