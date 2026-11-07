/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The fuel tanker going up on night 9: in its fireball you die, but a step back from the fire is a step back from
// death: at three quarters of the blast's reach you live, hurt, and at its very edge you barely feel it. The dead
// get the same falloff, but even at the edge a walker still goes down.
import { openGame, check } from './lib/harness.mjs';

export const name = 'blast: the tanker is deadly in its fire, survivable at its edge';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    for (const f of [0.3, 0.75, 0.97]) {
      initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.state = 'play'; GS.queue = []; GS.enemies.length = 0;
      GS.nightLive = false; GS.interT = 999; GS.wave = 9;
      const T = cars.find(c => c.tanker && !c.dead), R = carBlastR(T);
      GS.P.hp = S.maxHp; GS.P.inv = 0; GS.P.x = T.x; GS.P.y = T.y + R * f;
      const z = makeEnemy('skitter', T.x, T.y - R * f); GS.enemies.push(z); rebuildHash();
      damageCar(T, 1e6);
      out[f] = { lost: Math.round(S.maxHp - GS.P.hp), max: S.maxHp, zDead: z.hp <= 0 || z.dead, R };
    }
    return out;
  })()`);
  await pg.close();
  check(o[0.3].lost >= o[0.3].max, `in the fireball you should die: lost ${o[0.3].lost} of ${o[0.3].max}`);
  check(
    o[0.75].lost > 15 && o[0.75].lost < o[0.75].max * 0.8,
    `at three quarters out you should live, hurt: lost ${o[0.75].lost}`
  );
  check(o[0.97].lost < 35, `at the very edge it should barely touch you: lost ${o[0.97].lost}`);
  check(o[0.97].zDead, 'a walker at the edge of the blast lived');
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `reach ${o[0.3].R} px: you lose ${o[0.3].lost} / ${o[0.75].lost} / ${o[0.97].lost} at 30 / 75 / 97% out`;
}
