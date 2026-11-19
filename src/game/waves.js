/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { requeueStreak } from '../ui/callouts.js';
import { pitSpot } from './setpieces.js';
import { reachPt } from '../world/nav.js';
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, clamp, d2, rand, randi } from '../core/util.js';
import { viewH, viewW } from '../render/sprites.js';
import { TILE, WH, WW, isWall } from '../world/map.js';
import { cam } from './state.js';
import { FINAL_NIGHT, INF, TW } from './districts.js';
import { BOSS_J } from './route.js';
import { viaNight, viaStay } from './routes.js';
import { choiceNight } from './radio-choice.js';
import { GK } from '../core/scale.js';
export const bossNight = w =>
  !(GS.RUN && GS.RUN.hm) && (GS.RUN && GS.RUN.journey && !GS.RUN.practice ? !!BOSS_J[w] : w % 5 === 0); // Horde Mode has no bosses: the hordes are the bosses; the campaign has one at most of its stops (route.js)
// nights since the last boss (0 the night after one, up to 4): the dead come faster as the next one nears
export const sinceBoss = w => {
  if (!(GS.RUN && GS.RUN.journey && !GS.RUN.practice)) return (w - 1) % 5;
  let k = 0;
  for (let i = w - 1; i >= 1 && !bossNight(i) && k < 4; i--) k++;
  return k;
};
export const lastNight = w => !GS.RUN.endless && w === FINAL_NIGHT; // endless: Horde Mode's runs, which have no last night
export function buildWave(w) {
  const q = [];
  let n = Math.round((9 + Math.min(w, 8) * 5 + Math.max(0, w - 8) * 3) * (bossNight(w) ? 1 : 1.25)); // a boss's night keeps its count: the boss is the wall
  if (w > 1 && bossNight(w - 1))
    n = Math.round(n * 0.8); // the night after a boss is a lighter one
  else if (!bossNight(w)) n = Math.round(n * (1 + 0.07 * sinceBoss(w))); // and they build to the next: the night before one is the worst of its stretch
  const T = [['skitter', 6]];
  const Dn = GS.RUN.district;
  if (w >= 2) T.push(['hopper', 0.9], ['wasp', 1.2 * (INF(8) ? 1.8 : 1)]);
  if (w >= 3) T.push(['mini', Dn === 'cemetery' ? 2.2 : 1]);
  if (w >= 4) T.push(['beetle', 0.45 + 0.07 * w]);
  if (Dn === 'highway' && w >= 2) T.push(['hound', 0.5]);
  if (TW('horde')) n = Math.round(n * 1.4);
  const via = viaNight(w), // the way you came here: what followed you in, or how far ahead of them you got
    ch = choiceNight(w); // what you answered on the radio this morning
  if (via && via.brutes && w >= 2) T.push(['beetle', 1.4]); // a save from before the ways had their own mix
  if (via && via.mix) for (const m of via.mix) T.push(m.slice()); // what followed you in by the way you came
  if (via && via.add && !bossNight(w))
    for (const [t, c] of Object.entries(via.add)) for (let i = 0; i < (w < 5 ? Math.ceil(c / 2) : c); i++) q.push(t);
  const stay = viaStay(w); // and on the nights after it, a little of the same, to the end of that country
  if (stay && stay.mix) for (const m of stay.mix) T.push(m.slice());
  if (stay && stay.add && !bossNight(w))
    for (const [t, c] of Object.entries(stay.add)) for (let i = 0; i < c; i++) q.push(t);
  if (bossNight(w)) {
    GS.RUN.burstN = Math.max(4, Math.round(n * 0.09)); // what comes with it when it changes, at each of its two turns (arenaPhase)
    n = Math.floor(n * (w >= 10 ? 0.16 : 0.2)); // the boss is staged by bossEntrance, not spawned from the queue; a light trickle round it
    for (const t of T) if (t[0] === 'beetle') t[1] *= 0.35; // the brutes stay out of its way
  }
  if (w >= 3 && !bossNight(w))
    for (let i = 0; i < (1 + Math.floor(w / 5) + (INF(8) ? 1 : 0) + (Dn === 'cemetery' ? 1 : 0)) * 1; i++)
      q.push('flower');
  if (w >= 4 && !bossNight(w)) for (let i = 0; i < Math.floor((w - 1) / 3); i++) q.push('hound');
  if (w >= 4 && !bossNight(w))
    for (let i = 0; i < 1 + Math.floor((w - 4) / 3) + (Dn === 'town' && w >= 8 ? 1 : 0); i++) q.push('shield'); // riot police: one from night 4, more as the town falls
  if (w >= 6 && !bossNight(w))
    for (let i = 0; i < 1 + Math.floor((w - 6) / 3) + (Dn === 'cemetery' ? 1 : 0); i++) q.push('lurker'); // the dead that only look dead
  if (!bossNight(w)) {
    const sp = (k, from, per) => {
      if (w >= from) for (let i = 0; i < 1 + Math.floor((w - from) / per); i++) q.push(k);
    };
    sp('climb', 3, 3);
    sp('spore', 5, 4);
    sp('drag', 6, 4);
    sp('blind', 4, 4);
  } // the special infected: climbers from night 3, listeners from 4, spores from 5, draggers from 6, a few more as the nights go
  const tw = T.reduce((s, t) => s + t[1], 0);
  for (let i = 0; i < n; i++) {
    let r = Math.random() * tw;
    for (const [t, wt] of T) {
      r -= wt;
      if (r <= 0) {
        q.push(t);
        break;
      }
    }
  }
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  {
    const k = ((via && via.k) || 1) * ((ch && ch.k) || 1) * ((stay && stay.k) || 1),
      want = Math.round(q.length * k); // both of them: the whole night, specials and all, not only the ordinary dead
    while (q.length > want) q.splice(Math.floor(Math.random() * q.length), 1);
    while (q.length < want && q.length)
      q.splice(Math.floor(Math.random() * q.length), 0, q[Math.floor(Math.random() * q.length)]);
  }
  return q;
}
// a spot just out of sight, minD to maxD from you, that can walk to you: where the night's dead come from, so they are
// on you in seconds rather than wandering in from the far side of the map (and where a lost straggler comes back in)
// the distances at the old size of things, brought to life size here (core/scale.js)
export function spawnRing(minD = 560, maxD = 980) {
  return ringAt(minD * GK, maxD * GK);
}
export function spawnPoint(minD = 480, edge = false) {
  return pointAt(minD * GK, edge);
}
function ringAt(minD, maxD) {
  {
    const ps = pitSpot(minD);
    if (ps) return ps;
  } // at the quarry they come up out of the pit
  const P = GS.P;
  for (let k = 0; k < 48; k++) {
    const a = rand(0, TAU),
      r = rand(minD, maxD),
      x = P.x + Math.cos(a) * r,
      y = P.y + Math.sin(a) * r;
    if (x < 4 * TILE || y < 4 * TILE || x > WW - 4 * TILE || y > WH - 4 * TILE) continue;
    if (x > cam.x - 40 * GK && x < cam.x + viewW + 40 * GK && y > cam.y - 40 * GK && y < cam.y + viewH + 40 * GK)
      continue; // never in sight
    const tx = Math.floor(x / TILE),
      ty = Math.floor(y / TILE);
    let ok = true;
    for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1 && ok; i++) if (isWall(tx + i, ty + j)) ok = false;
    if (ok && reachPt(x, y)) return [x, y];
  }
  return pointAt(minD, false);
}
function pointAt(minD, edge) {
  {
    const ps = pitSpot(minD);
    if (ps) return ps;
  } // at the quarry they come up out of the pit
  for (let k = 0; k < 40; k++) {
    let x, y;
    if (edge) {
      const s = randi(0, 3);
      x = s === 0 ? 3 * TILE : s === 1 ? WW - 3 * TILE : rand(3 * TILE, WW - 3 * TILE);
      y = s === 2 ? 3 * TILE : s === 3 ? WH - 3 * TILE : rand(3 * TILE, WH - 3 * TILE);
    } else {
      x = rand(4 * TILE, WW - 4 * TILE);
      y = rand(4 * TILE, WH - 4 * TILE);
    }
    if (d2(x, y, GS.P.x, GS.P.y) < minD * minD) continue;
    let ok = true;
    const tx = Math.floor(x / TILE),
      ty = Math.floor(y / TILE);
    for (let j = -1; j <= 1 && ok; j++)
      for (let i = -1; i <= 1; i++)
        if (isWall(tx + i, ty + j)) {
          ok = false;
          break;
        }
    if (!ok && !edge) continue;
    if (!reachPt(x, y) && k < 36) continue; // nothing is born in a pocket it can't walk out of: the night would never end
    if (
      x > cam.x - 30 * GK &&
      x < cam.x + viewW + 30 * GK &&
      y > cam.y - 30 * GK &&
      y < cam.y + viewH + 30 * GK &&
      k < 30
    )
      continue;
    return [x, y];
  }
  const a = rand(0, TAU);
  return [
    clamp(GS.P.x + Math.cos(a) * 600 * GK, 4 * TILE, WW - 4 * TILE),
    clamp(GS.P.y + Math.sin(a) * 600 * GK, 4 * TILE, WH - 4 * TILE),
  ];
}
export function underBoss(el) {
  const bb = $('bossBox');
  el.style.top = bb && !bb.hidden ? Math.max(innerHeight * 0.15, bb.getBoundingClientRect().bottom + 14) + 'px' : '';
} // never on top of the boss panel
export function banner(t, sub, red, dur = 2.2) {
  underBoss($('banner'));
  if (GS.streakT > 0 && GS.streakCur) {
    requeueStreak();
    GS.streakT = 0;
    GS.streakCur = null;
    $('streak').classList.remove('show');
  }
  const b = $('banner');
  b.innerHTML = `${t}<small>${sub}</small>`;
  b.classList.toggle('red', !!red);
  b.classList.add('show');
  GS.bannerT = dur; // a longer one when it carries news: what the way here gave you, say
}

/* ---------- FX ---------- */
// particle kinds: 0 glow · 1 spark · 2 dust · 3 tinted chip · 4 rock chip · 5 leaf · 6 petal · 7 shell casing
