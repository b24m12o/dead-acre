/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A boss's entrance is a scene: the fight holds still (nobody walks, nothing hurts you), it comes out, its name, and
// the fight goes on. The first time it's the whole thing, after that only the moment it comes out; a key skips it,
// but a key held from before (moving) doesn't.
import { openGame, check } from './lib/harness.mjs';

export const name = 'entrance: a boss comes on in a scene that holds the fight still';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const step = n => `for (let i = 0; i < ${n}; i++) { update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); }`;
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; GS.meta.bossSeen = {};
    startPractice('abom');
    const P = GS.P, out = {};
    // a zombie near you, to see that it holds still
    const z = makeEnemy('skitter', P.x + 90, P.y); z.emerge = 1; GS.enemies.push(z);
    for (let i = 0; i < 300 && GS.state !== 'cine'; i++) { update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); }
    out.cine = GS.state === 'cine';
    out.bars = document.body.classList.contains('cine');
    const zx = z.x, hp = P.hp, cx = cam.x + cam.y, len = CINE.end - CINE.t;
    out.len = +len.toFixed(1);
    ${step(60)}
    out.camMoved = Math.abs(cam.x + cam.y - cx) > 40 * GK; // (the boss comes on nearer at life size: core/scale.js)
    // a held key repeating doesn't skip it
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', repeat: true }));
    out.heldSkip = GS.state !== 'cine';
    let t = 1, boss = null;
    for (let i = 0; i < 60 * 12 && GS.state === 'cine'; i++) { update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); t += 1 / 60; if (CINE.boss) boss = CINE.boss; }
    out.t = +t.toFixed(1);
    out.zStill = Math.hypot(z.x - zx, 0) < 1;
    out.hurt = P.hp < hp;
    out.boss = !!boss && !boss.dead && GS.enemies.includes(boss);
    out.back = GS.state === 'play' && !document.body.classList.contains('cine');
    out.card = $('cineCard').firstChild.textContent;
    // its crate is graded: quick and clean, 5 picks; slow and costly, 1
    boss.t0 = GS.time - 20; boss.took = 0; bossDown(boss, true); out.best = GS.RUN.bossPicks;
    boss.t0 = GS.time - 400; boss.took = S.maxHp; bossDown(boss, true); out.worst = GS.RUN.bossPicks;
    // the second time: short, and a key skips it
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.boss = null;
    bossEntrance('abom', true);
    for (let i = 0; i < 300 && GS.state !== 'cine'; i++) { update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); }
    out.len2 = +(CINE.end - CINE.t).toFixed(1);
    ${step(30)}
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX' }));
    out.skipped = GS.state === 'play';
    out.boss2 = GS.enemies.some(e => e.type === 'queen' && !e.dead);
    return out;
  })()`);
  await pg.close();
  check(o.cine && o.bars, 'the entrance should be a scene with its bars: ' + JSON.stringify(o));
  check(o.camMoved, 'the camera should go over to where it comes from');
  check(!o.heldSkip, 'a key held from before should not skip it');
  check(o.zStill && !o.hurt, `the fight should hold still: zombie still ${o.zStill}, you hurt ${o.hurt}`);
  check(o.boss && o.back, `it should come out, and the fight go on after: boss ${o.boss}, back ${o.back}`);
  check(o.card === 'Abomination', 'its name on the card: ' + o.card);
  check(
    o.best === 5 && o.worst === 1,
    `its crate: 5 picks for a quick clean kill, 1 for a slow costly one: ${o.best}, ${o.worst}`
  );
  check(o.len >= 3 && o.len <= 7, `the first time the whole thing (3-7 s): ${o.len} s`);
  check(o.len2 <= 2.2, `after that only the moment it comes out: ${o.len2} s`);
  check(o.skipped && o.boss2, `a key skips it, and it's still there: skipped ${o.skipped}, boss ${o.boss2}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `first ${o.len} s, then ${o.len2} s; the fight held still; skippable`;
}
