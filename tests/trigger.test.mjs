/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Mashing the mouse must never beat holding it. Every gun, clicked at random (quick taps, short pauses, long ones),
// must never fire two shots closer together than its rate allows: the time the trigger spends up can't be banked
// into a second shot the very next frame. And holding the trigger down still fires at the full rate.
import { openGame, check } from './lib/harness.mjs';

export const name = 'trigger: mashing never fires faster than holding';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => { initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.state = 'play';
    GS.queue = []; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const out = {};
    for (const g of Object.keys(GUNS)) {
      if (!GUNS[g].rate) continue;
      giveGun(g); GS.P.gun = g; GS.P.swap = 0; GS.P.fireCd = 0;
      const period = 1 / (GUNS[g].rate * S.rate), step = (down, n) => { let shots = 0, gap = 9, last = -1e9; for (let i = 0; i < n; i++) {
        GS.P.mag[g] = 99; GS.P.reload = 0; mouse.x = 700; mouse.y = 300; mouse.down = typeof down === 'function' ? down(i) : down;
        const m0 = GS.P.mag[g]; update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') GS.state = 'play';
        if (GS.P.mag[g] < m0) { shots++; gap = Math.min(gap, (i - last) / 60); last = i; } } return { shots, gap }; };
      let d = false, flip = 0;
      const mash = step(() => { if (--flip <= 0) { d = !d; flip = d ? 1 + Math.floor(rnd() * 4) : 1 + Math.floor(rnd() * 50); } return d; }, 60 * 20);
      step(false, 30);
      const hold = step(true, 60 * 4);
      out[g] = { gap: mash.gap / period, hold: hold.shots / 4 / (1 / period) };
    }
    mouse.down = false;
    return out;
  })()`);
  await pg.close();
  const fast = Object.entries(o).filter(([, v]) => v.gap < 0.85),
    slow = Object.entries(o).filter(([, v]) => v.hold < 0.9);
  check(
    !fast.length,
    'mashing fired too fast: ' + fast.map(([g, v]) => `${g} ${v.gap.toFixed(2)}× its period`).join(', ')
  );
  check(!slow.length, 'holding fires slow: ' + slow.map(([g, v]) => `${g} ${v.hold.toFixed(2)}× its rate`).join(', '));
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${Object.keys(o).length} guns, closest mashed shots ${Math.min(...Object.values(o).map(v => v.gap)).toFixed(2)}× the period`;
}
