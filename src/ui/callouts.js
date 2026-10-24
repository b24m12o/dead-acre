/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { clamp } from '../core/util.js';
GS.streakQ = [];
GS.streakCur = null;
const STREAK_URGENT = { 'Man down': 1, "They didn't make it": 1, Pinned: 1, Choked: 1 };
const HUDR = { t: -1, boss: null };
export function hudDomRects() {
  const n = performance.now();
  if (n - HUDR.t < 220) return HUDR;
  HUDR.t = n;
  const bb = $('bossBox');
  HUDR.boss = bb && !bb.hidden ? bb.getBoundingClientRect() : null;
  for (const id of ['banner', 'streak']) {
    const el = $(id);
    HUDR[id] = el.classList.contains('show') ? el.getBoundingClientRect() : null;
  }
  return HUDR;
}
export function placeStreak() {
  const el = $('streak'),
    r = hudDomRects().boss,
    top = r
      ? Math.max(innerHeight * 0.19, r.bottom + 14 + ($('banner').classList.contains('show') ? 110 : 0)) + 'px'
      : '';
  if (el.style.top !== top) el.style.top = top;
} // follows the boss panel as it appears, grows or moves, so the two never overlap
export function showStreak(t, sub, urgent = STREAK_URGENT[t], valid = null) {
  if (urgent && GS.state === 'play' && GS.streakT > 0.25 && GS.streakCur && !STREAK_URGENT[GS.streakCur[0]]) {
    GS.streakQ.unshift(GS.streakCur);
    GS.streakT = 0;
  } // urgent news cuts in front
  if (GS.state !== 'play' || GS.streakT > 0.25 || GS.bannerT > -0.45) {
    if (!GS.streakQ.some(q => q[0] === t) && (!GS.streakCur || GS.streakCur[0] !== t || GS.streakT <= 0))
      GS.streakQ.push([t, sub, valid]);
    if (GS.streakQ.length > 4) GS.streakQ.shift();
    return;
  }
  GS.streakCur = [t, sub, valid];
  const el = $('streak');
  HUDR.t = -1;
  placeStreak();
  el.innerHTML = `${t}<small>${sub}</small>`;
  el.classList.add('show');
  GS.streakT = clamp(1.3 + (String(t).length + String(sub || '').length) * 0.04, 1.6, 4.5);
} // long lines stay up long enough to read
export function hideCallouts() {
  if (GS.streakT > 0 && GS.streakCur) GS.streakQ.unshift(GS.streakCur);
  GS.streakT = 0;
  GS.streakCur = null;
  $('streak').classList.remove('show');
  GS.bannerT = -1;
  $('banner').classList.remove('show');
}

/* ---------- Enemies ---------- */
