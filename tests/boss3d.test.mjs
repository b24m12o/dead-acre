/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The Abomination drawn live in 3D (render/boss3d.js): it draws when the setting is on and the picture stands in when
// it's off; its pose follows the fight (feet on the street where its legs plant them, the body at its height, up in a
// leap, down when it dies), with nothing broken in it.
import { openGame, check } from './lib/harness.mjs';

export const name = 'boss3d: the Abomination in 3D, posed by its fight';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  // its shader builds in the background from load: wait for it (the pictures stand in till then)
  let ready = false;
  for (let i = 0; i < 120 && !ready; i++) {
    ready = await ev('boss3dOn()');
    if (!ready) await pg.waitForTimeout(250);
  }
  check(ready, 'the 3D shader should build in the background within 30 s');
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; GS.meta.bossSeen = {}; __god();
    startPractice('abom');
    const step = n => { for (let i = 0; i < n; i++) { if (GS.state === 'cine') cineSkip(); update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); } };
    for (let i = 0; i < 400 && !GS.boss; i++) step(1);
    const e = GS.boss, out = { boss: !!e };
    if (!e) return out;
    step(30); render();
    const ok = p => p && p.every(v => Number.isFinite(v));
    const P = e.pose3, flat = P && [P.bodyP, P.headP, ...P.neck, ...P.legs.flat(), ...P.arms.flat(), ...P.tail];
    out.drew = !!P;
    out.finite = !!flat && flat.every(ok);
    out.bodyZ = P && Math.round(P.bodyP[2]);
    out.feet = P && P.legs.map(l => Math.round(l[2][2]));
    out.footOff = P && Math.max(...P.legs.map((l, i) => e.legs ? Math.hypot(l[2][0] - e.legs[i].fx, l[2][1] - e.legs[i].fy) : 0));
    // a leap: up in the air
    e.st = 'leap'; e.stT = 0.4; e.ldur = 0.8; e.z = 170; e.p3F = -1; render(); out.leapZ = Math.round(e.pose3.bodyP[2]);
    e.st = 'move'; e.z = 0;
    // off: the picture
    opt.b3d = false; out.offDraws = drawBoss3D(e); opt.b3d = true; out.onDraws = drawBoss3D(e);
    // dead: down on the street
    e.hp = 1; hurtEnemy(e, 50, false, 1, 0, 1, 'bolt', e.x, e.y);
    for (let i = 0; i < 90; i++) { tickWorld(1 / 60); GS.time += 1 / 60; }
    e.p3F = -1; render(); out.deadZ = e.pose3 ? Math.round(e.pose3.bodyP[2]) : null;
    return out;
  })()`);
  await pg.close();
  check(o.boss && o.drew, 'the Abomination should be drawn in 3D: ' + JSON.stringify(o));
  check(o.finite, 'nothing in its pose should be broken (NaN or infinite)');
  check(o.bodyZ >= 22 && o.bodyZ <= 40, `standing, its body should be at its height: ${o.bodyZ}`);
  check(
    o.feet.every(z => z >= 0 && z <= 30) && o.footOff < 2,
    `its feet where its legs plant them: ${o.feet}, ${o.footOff} px off`
  );
  check(o.leapZ > 150, `in a leap it should be up in the air: ${o.leapZ}`);
  check(!o.offDraws && o.onDraws, `the setting should switch it: off ${o.offDraws}, on ${o.onDraws}`);
  check(o.deadZ !== null && o.deadZ < 16, `dead, it should be down on the street: ${o.deadZ}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `body ${o.bodyZ} up, feet planted, ${o.leapZ} up in a leap, ${o.deadZ} dead; the setting switches it`;
}
