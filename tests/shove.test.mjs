/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The shove: the dead in front of you are thrown back and the ordinary ones go down; those behind you aren't
// touched. A second shove has to wait its turn. It doesn't spoil a reload, it tears you free of a grab, and an
// armoured elite barely gives.
import { openGame, check } from './lib/harness.mjs';

export const name = 'shove: throws back what is in front, frees you, waits its turn';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.state = 'play'; GS.queue = []; GS.enemies.length = 0;
    GS.nightLive = false; GS.interT = 999; GS.wave = 6;
    const P = GS.P, out = {};
    const fr = n => { for (let i = 0; i < n; i++) { update(1 / 60); tickWorld(1 / 60); P.hp = S.maxHp; if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    // somewhere open: ten metres of clear ground on every side
    for (let t = 0; t < 400; t++) {
      const x = 400 + Math.random() * (WW - 800), y = 400 + Math.random() * (WH - 800);
      let ok = true;
      for (let a = 0; a < 6.28 && ok; a += 0.4) for (const d of [40, 90, 160]) if (blockPt(x + Math.cos(a) * d, y + Math.sin(a) * d)) { ok = false; break; }
      if (ok) { P.x = x; P.y = y; break; }
    }
    P.vx = P.vy = 0; P.aimA = 0; P.dashT = 0; P.shoveCd = 0;
    const at = (a, d, t = 'skitter') => { const e = makeEnemy(t, P.x + Math.cos(a) * d, P.y + Math.sin(a) * d); e.emerge = 1; e.hp = e.maxHp = 500; return e; };
    const front = [-0.5, -0.25, 0, 0.25, 0.5].map((a, i) => at(a, 42 + i * 4)),
      back = [Math.PI - 0.3, Math.PI + 0.3].map(a => at(a, 45));
    const d0 = front.map(e => Math.hypot(e.x - P.x, e.y - P.y));
    out.caught = tryShove();
    out.backTouched = back.filter(e => Math.hypot(e.kx || 0, e.ky || 0) > 1 || e.down > 0).length;
    out.again = tryShove();
    fr(24);
    out.down = front.filter(e => e.down > 0).length;
    out.gained = Math.min(...front.map((e, i) => Math.hypot(e.x - P.x, e.y - P.y) - d0[i]));
    for (const e of GS.enemies) e.dead = true;
    GS.enemies.length = 0;
    // mid-reload: the reload runs on to its end on time
    giveGun('rifle'); switchGun('rifle'); fr(30); P.mag.rifle = 0; P.shoveCd = 0; startReload();
    const r0 = P.reload; let n = 0;
    tryShove();
    out.reloadKept = P.reload === r0 && r0 > 0;
    while (P.reload > 0 && n < 600) { fr(1); n++; }
    out.reloadFrames = n; out.reloadExpect = Math.round(r0 * 60);
    out.loaded = P.mag.rifle > 0;
    // grabbed: the shove tears you free
    P.shoveCd = 0;
    P.aimA = 0;
    const g = at(0.1, 30); P.held = g;
    tryShove();
    out.freed = !P.held;
    for (const e of GS.enemies) e.dead = true;
    GS.enemies.length = 0;
    // armour: it gives less than a third as much
    P.shoveCd = 0;
    P.aimA = 0; // the frames above turned you to the mouse
    const plain = at(-0.3, 50), arm = at(0.3, 50); arm.trait = 'armored';
    tryShove();
    out.armK = Math.hypot(arm.kx, arm.ky) / Math.max(1, Math.hypot(plain.kx, plain.ky));
    return out;
  })()`);
  await pg.close();
  check(o.caught === 5, `all five in front should be caught: ${o.caught}`);
  check(
    o.gained >= 60,
    `each of the five should end up at least 60 px further away in 0.4 s: the least gained ${Math.round(o.gained)} px`
  );
  check(o.down >= 3, `at least three of the five should be knocked down: ${o.down}`);
  check(o.backTouched === 0, `the two behind should not be touched: ${o.backTouched} were`);
  check(o.again === -1, `a second shove inside 1.2 s should do nothing: it caught ${o.again}`);
  check(
    o.reloadKept && o.loaded && Math.abs(o.reloadFrames - o.reloadExpect) <= 2,
    `a shove mid-reload should leave the reload to finish on time: ${o.reloadFrames} frames for ${o.reloadExpect}`
  );
  check(o.freed, 'a shove while grabbed should free you');
  check(o.armK < 1 / 3, `an armoured elite should be pushed less than a third as far: ${o.armK.toFixed(2)}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `5 caught, ${o.down} down, at least ${Math.round(o.gained)} px back; armour ${o.armK.toFixed(2)}×; reload untouched; grab broken`;
}
