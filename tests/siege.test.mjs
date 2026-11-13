/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The siege night's boards: the dead that reach a boarded window stop there and pound on it, it gives in the end
// and they climb through; you nail a battered board back by standing still beside it; you can't walk through one.
import { openGame, check } from './lib/harness.mjs';

export const name = 'siege: the boards hold, give, and nail back';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.state = 'play'; GS.RUN.jobN = [];
    GS.wave = 5; GS.RUN.nextSig = { w: 6, s: 'siege' };
    const P = GS.P, out = {};
    startWave();
    const O = GS.obj;
    if (!O || O.type !== 'siege') return { err: 'no siege: ' + (O && O.type) };
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    const fr = n => { for (let i = 0; i < n; i++) { update(1 / 60); tickWorld(1 / 60); P.hp = S.maxHp; for (const s of O.civ) s.hp = s.max; if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    const bar = O.bars.find(x => !x.door), far = O.bars.find(x => x !== bar && !x.door) || bar;
    P.x = far.x - far.nx * 60; P.y = far.y - far.ny * 60; // inside, by another window, still
    const zs = [0, 1, 2].map(k => { const e = makeEnemy('skitter', bar.x + bar.nx * (60 + k * 30), bar.y + bar.ny * (60 + k * 30)); e.emerge = 1; e.sg = true; e.hp = e.maxHp = 2000; e.aw = 9; e.dmg = 9; return e; });
    const hp0 = bar.hp;
    fr(60 * 4);
    out.inside4 = zs.filter(e => inHouse(O, e.x, e.y)).length;
    out.pounded = hp0 - bar.hp;
    bar.hp = 1;
    fr(60 * 6);
    out.broke = bar.broken;
    out.through = zs.some(e => e.sgIn || inHouse(O, e.x, e.y));
    for (const e of zs) e.dead = true; GS.enemies.length = 0;
    // nailing back: stand still beside it
    P.x = bar.x - bar.nx * 40; P.y = bar.y - bar.ny * 40; P.vx = P.vy = 0;
    fr(60 * 3);
    out.fixed = !bar.broken && bar.hp > bar.max * 0.35;
    // you can't walk out through a board
    P.x = bar.x - bar.nx * 40; P.y = bar.y - bar.ny * 40;
    const kx = bar.nx, ky = bar.ny;
    for (let i = 0; i < 90; i++) { keys.add(kx > 0 ? 'd' : kx < 0 ? 'a' : ky > 0 ? 's' : 'w'); fr(1); }
    keys.clear();
    out.out = (P.x - bar.x) * bar.nx + (P.y - bar.y) * bar.ny > 10;
    return out;
  })()`);
  await pg.close();
  check(!o.err, o.err);
  check(o.inside4 === 0, `in the first 4 s the board should hold them all outside: ${o.inside4} got in`);
  check(o.pounded > 20, `the board should take a beating: it lost ${Math.round(o.pounded)} hp in 4 s`);
  check(
    o.broke && o.through,
    `a board at its last should give and let them through: broke ${o.broke}, through ${o.through}`
  );
  check(o.fixed, 'standing still beside a broken board should nail it back up');
  check(!o.out, 'you should not walk out through a board');
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `held 4 s (−${Math.round(o.pounded)} hp), gave, nailed back, no walking through`;
}
