/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The dead feed. Each place has a few of the town's own lying dead; one of the walking dead that hasn't noticed you,
// coming by one, goes down on its knees at it and stays there, facing it. Head down, it doesn't see you standing in
// plain sight where it would on its feet; a shot, and it's up off its knees and coming.
import { openGame, check } from './lib/harness.mjs';

export const name = 'feed: the dead kneel at a body, blind to you, and get up for a shot';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    const hold = () => { GS.queue.length = 0; GS.queue.push('skitter'); GS.spawnT = 1e9; }; // (no others, and not the last few)
    hold();
    out.victims = victims.length;
    out.clear = victims.every(v => !blockPt(v.x, v.y));
    const v = victims.find(canKneel), P = GS.P;
    if (!v) return out;
    // you far off, out of its way; it a few metres from the body
    P.x = v.x + 900; P.y = v.y;
    for (let i = 0; i < 30 && blockPt(P.x, P.y); i++) P.y += 40;
    const e = makeEnemy('skitter', v.x - 60, v.y + 50); e.emerge = 1; e.aw = 0; if (e.run) { e.run = false; e.sp /= 2.5; } // (an ordinary walker: a runner doesn't stop to feed)
    const step = n => { for (let i = 0; i < n; i++) { hold(); P.hp = S.maxHp; update(1 / 60); tickWorld(1 / 60); GS.enemies = GS.enemies.filter(o => o === e); } };
    let t = 0;
    while (t < 60 * 20 && !(e.feed && e.feed.st === 'eat')) { step(1); t++; }
    out.eatAt = +(t / 60).toFixed(1);
    step(60 * 2);
    out.eating = !!(e.feed && e.feed.st === 'eat');
    out.still = Math.round(Math.hypot(e.vx, e.vy));
    out.atBody = e.feed ? Math.round(Math.hypot(e.x - e.feed.x, e.y - e.feed.y)) : -1;
    out.facing = e.feed ? +Math.abs(angDiff(e.a, e.feedA)).toFixed(2) : 9;
    // you in plain sight, in front of it, at half the distance it would see you from on its feet
    const sr = seenFrom(), fa = e.feedA;
    let seen = null;
    for (const da of out.eating ? [0, 0.3, -0.3, 0.6, -0.6] : []) {
      const x = e.x + Math.cos(fa + da) * sr * 0.6, y = e.y + Math.sin(fa + da) * sr * 0.6;
      if (!blockPt(x, y) && los(e.x, e.y, x, y)) { seen = [x, y]; break; }
    }
    out.inSight = !!seen;
    if (seen) { P.x = seen[0]; P.y = seen[1]; step(60 * 2); out.blind = !!(e.feed && e.feed.st === 'eat') && !(e.aw > 0); P.x += 600; for (let i = 0; i < 30 && blockPt(P.x, P.y); i++) P.y += 40; }
    // a shot: up off its knees, and coming
    e.aw = 0;
    makeNoise(P.x, P.y, 4000, false);
    step(20);
    out.up = !e.feed && e.riseT > 0;
    out.rise = +(e.riseT || 0).toFixed(2);
    step(60 * 2);
    out.coming = Math.round(Math.hypot(e.vx, e.vy));
    return out;
  })()`);
  await pg.close();
  check(
    o.victims >= 2 && o.clear,
    `a place should have a few of the town's dead, on open ground: ${JSON.stringify(o)}`
  );
  check(o.eatAt < 15 && o.eating, `one of the dead by a body should go down to feed at it: ${JSON.stringify(o)}`);
  check(
    o.still <= 2 && o.atBody < 18 && o.facing < 0.3,
    `feeding, it should kneel still at the body, facing it: ${JSON.stringify(o)}`
  );
  check(!o.inSight || o.blind, `head down, it shouldn't see you where it would on its feet: ${JSON.stringify(o)}`);
  check(o.up && o.coming > 5, `a shot should get it up off its knees and coming: ${JSON.stringify(o)}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${o.victims} dead; down to feed at ${o.eatAt} s, still and facing it (${o.facing}); ${o.inSight ? 'blind to you in plain sight; ' : ''}up for a shot (${o.rise} s getting up), then coming`;
}
