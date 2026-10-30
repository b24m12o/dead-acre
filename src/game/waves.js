/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, clamp, d2, rand, randi } from '../core/util.js';
import { viewH, viewW } from '../render/sprites.js';
import { TILE, WH, WW, isWall } from '../world/map.js';
import { cam } from './state.js';
import { FINAL_NIGHT, INF, TW } from './districts.js';
export const bossNight = w => w % 5 === 0;
export const lastNight = w => !GS.RUN.endless && w === FINAL_NIGHT;
export function buildWave(w) {
  const q = [];
  let n = Math.round(9 + Math.min(w, 8) * 5 + Math.max(0, w - 8) * 3);
  if (w > 5 && (w - 1) % 5 === 0) n = Math.round(n * 0.8); // the night after a boss is a lighter one
  const T = [['skitter', 6]];
  const Dn = GS.RUN.district;
  if (w >= 2) T.push(['hopper', 0.9], ['wasp', 1.2 * (INF(8) ? 1.8 : 1)]);
  if (w >= 3) T.push(['mini', Dn === 'cemetery' ? 2.2 : 1]);
  if (w >= 4) T.push(['beetle', 0.45 + 0.07 * w]);
  if (Dn === 'highway' && w >= 2) T.push(['hound', 0.5]);
  if (TW('horde')) n = Math.round(n * 1.4);
  if (bossNight(w)) n = Math.floor(n * (w >= 10 ? 0.3 : 0.38)); // the boss is staged by bossEntrance, not spawned from the queue
  if (w >= 3 && !bossNight(w))
    for (let i = 0; i < (1 + Math.floor(w / 5) + (INF(8) ? 1 : 0) + (Dn === 'cemetery' ? 1 : 0)) * 1; i++)
      q.push('flower');
  if (w >= 4 && !bossNight(w)) for (let i = 0; i < Math.floor((w - 1) / 3); i++) q.push('hound');
  if (w >= 4 && !bossNight(w))
    for (let i = 0; i < 1 + Math.floor((w - 4) / 3) + (Dn === 'town' && w >= 8 ? 1 : 0); i++) q.push('shield'); // riot police: one from night 4, more as the town falls
  if (w >= 6 && !bossNight(w))
    for (let i = 0; i < 1 + Math.floor((w - 6) / 3) + (Dn === 'cemetery' ? 1 : 0); i++) q.push('lurker'); // the dead that only look dead
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
  return q;
}
export function spawnPoint(minD = 480, edge = false) {
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
    if (x > cam.x - 30 && x < cam.x + viewW + 30 && y > cam.y - 30 && y < cam.y + viewH + 30 && k < 30) continue;
    return [x, y];
  }
  const a = rand(0, TAU);
  return [
    clamp(GS.P.x + Math.cos(a) * 600, 4 * TILE, WW - 4 * TILE),
    clamp(GS.P.y + Math.sin(a) * 600, 4 * TILE, WH - 4 * TILE),
  ];
}
export function underBoss(el) {
  const bb = $('bossBox');
  el.style.top = bb && !bb.hidden ? Math.max(innerHeight * 0.15, bb.getBoundingClientRect().bottom + 14) + 'px' : '';
} // never on top of the boss panel
export function banner(t, sub, red) {
  underBoss($('banner'));
  if (GS.streakT > 0 && GS.streakCur) {
    GS.streakQ.unshift(GS.streakCur);
    GS.streakT = 0;
    GS.streakCur = null;
    $('streak').classList.remove('show');
  }
  const b = $('banner');
  b.innerHTML = `${t}<small>${sub}</small>`;
  b.classList.toggle('red', !!red);
  b.classList.add('show');
  GS.bannerT = 2.2;
}

/* ---------- FX ---------- */
// particle kinds: 0 glow · 1 spark · 2 dust · 3 tinted chip · 4 rock chip · 5 leaf · 6 petal · 7 shell casing
