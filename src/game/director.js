/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The night's director, after Left 4 Dead's: it watches how hard the night is on you and paces the dead to it. It never
// adds any of them or takes any away; it only decides when they come. While you hold, it builds; once the fight has got
// to you (hurt fast, crowded close, your people down, your own blood low) it lets that peak run a few seconds more, then
// holds the rest back for a breather, with something moving out in the dark to keep you listening. And when you are
// cruising, nothing near and nothing hurting, it brings the next special forward and quickens the rest.
// Its two hands: the queue still to come (held back in a breather, a special brought forward when you cruise), and the
// crowd already out, which is most of a night (the queue empties fast): in a breather the far ones, out of sight, close
// in at half pace; while you cruise they come on a little quicker. Those near you, or that see you, are never touched.
// It works inside the surges (surges.js), on the nights that have them: not on a boss's night, a horde's, or the tutorial.
import { GS } from '../core/gs.js';
import { TAU, clamp, d2, rand } from '../core/util.js';
import { S } from './state.js';
import { sfx } from '../audio/sfx.js';

export const DIR = {
  peak: 0.6, // the intensity that makes a peak
  calm: 0.35, // a breather ends once it has fallen below this (or at relaxMax)
  cruise: 0.12, // below this you are cruising
  near: 220, // "close": within this many px of you
  peakT: [3, 5], // a peak runs on this long
  relaxT: [4, 7], // then the breather, at least this long
  relaxMax: 9, // and never longer than this: a night must not stall
  cruiseT: 10, // cruising this long brings a special forward
  pullGap: 20, // at most one every this many seconds
  quick: 0.8, // and the rest come this much quicker while you cruise
  far: 450, // the crowd's pace is only ever changed this far from you, and out of sight
  slow: 0.7, // in a breather they close in at this pace
  hurry: 1.15, // and at this while you cruise
};
// the ordinary dead: anything else in the queue is a special, and a special is what a cruise brings forward
const PLAIN = new Set(['skitter', 'hopper', 'wasp', 'mini', 'beetle', 'hound', 'flower', 'hunt', 'queen']);
export function dirReset() {
  GS.dir = { I: 0, ph: 'build', t: 0, rx: 0, low: 0, pullT: -99, peaks: 0, pulls: 0, held: 0, far: false };
}
// how hard the night is on you right now, 0 to about 1
export function dirTarget() {
  const P = GS.P;
  if (!P) return 0;
  let near = 0;
  const R2 = DIR.near * DIR.near;
  for (const e of GS.enemies)
    if (!e.dead && !e.dormant && !e.lurk && (e.emerge === undefined || e.emerge >= 1) && d2(e.x, e.y, P.x, P.y) < R2)
      near++;
  const downs = GS.buddies.filter(b => b.down > 0).length,
    hp = P.hp / (S.maxHp || 100);
  return clamp(
    (GS.press || 0) * 1.6 + Math.min(10, near) / 10 + downs * 0.2 + (hp < 0.4 ? (0.4 - hp) * 1.0 : 0),
    0,
    1.2
  );
}
// each frame of a night: the intensity follows what happens to you (up fast, down slowly), and the phase follows it
export function dirTick(dt, SG) {
  if (!GS.dir) dirReset();
  const D = GS.dir;
  const tg = dirTarget();
  D.I += (tg - D.I) * Math.min(1, tg > D.I ? 3 * dt : dt / 5);
  if (!SG || !GS.nightLive || SG.horde) {
    if (D.ph !== 'build') {
      D.ph = 'build';
      D.t = 0;
    }
    return;
  } // only inside the surges, while there are still some to come (and not a surge's horde: that one comes all at once)
  if (D.ph === 'build') {
    D.low = D.I < DIR.cruise ? D.low + dt : 0;
    if (D.I >= DIR.peak) {
      D.ph = 'peak';
      D.t = rand(DIR.peakT[0], DIR.peakT[1]);
      D.peaks++;
    } else if (D.low >= DIR.cruiseT && GS.time - D.pullT >= DIR.pullGap && GS.queue.length) {
      const i = GS.queue.findIndex(t => !PLAIN.has(t));
      if (i > 0) GS.queue.unshift(GS.queue.splice(i, 1)[0]);
      if (i >= 0) {
        GS.spawnT = Math.min(GS.spawnT, 0.3);
        D.pulls++;
      }
      D.pullT = GS.time;
      D.low = 0;
    } // cruising: the next special, now
  } else if (D.ph === 'peak') {
    D.t -= dt;
    if (D.t <= 0) {
      D.ph = 'relax';
      D.t = rand(DIR.relaxT[0], DIR.relaxT[1]);
      D.rx = 0;
      D.far = false;
    }
  } else {
    D.t -= dt;
    D.rx += dt;
    D.held += dt;
    if (!D.far && D.rx > 3 && GS.P) {
      D.far = true;
      if (Math.random() < 0.6 && sfx.growl) {
        const a = rand(0, TAU);
        sfx.growl(GS.P.x + Math.cos(a) * 640, GS.P.y + Math.sin(a) * 640);
      }
    } // something out in the dark: it is not over
    if ((D.t <= 0 && D.I < DIR.calm) || D.rx >= DIR.relaxMax) {
      D.ph = 'build';
      D.low = 0;
    }
  }
}
// the queue waits while you get your breath
export const dirHold = SG => !!SG && !!GS.dir && GS.dir.ph === 'relax';
// a breather on: the far crowd keeps its slow pace (and the straggler rule doesn't take that for being stuck)
export const dirRelax = () => !!GS.dir && GS.dir.ph === 'relax' && !!GS.RUN.sg;
// the pace for one of the crowd, pd2 its distance from you squared
export function dirPace(e, pd2) {
  const D = GS.dir;
  if (!D || !GS.RUN.sg || GS.RUN.sg.horde || e.los || pd2 < DIR.far * DIR.far) return 1;
  if (D.ph === 'relax') return DIR.slow;
  return D.ph === 'build' && D.low > 4 ? DIR.hurry : 1;
}
// and the spawns come quicker while you cruise
export const dirRate = () => (GS.dir && GS.dir.ph === 'build' && GS.dir.low > 4 ? DIR.quick : 1);
