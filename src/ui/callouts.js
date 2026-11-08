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
// The queue of callouts waiting their turn behind a banner or each other. Each entry: [title, sub, valid, night,
// dawn?, urgent, queued-at]. Up to six wait; when it's full the oldest ordinary one goes, never an urgent one. An
// ordinary one that has waited 12 s is old news and goes too, as does one whose night has turned to dawn (or the
// dawn to night), or whose own check (valid) no longer holds (tick.js)
const QMAX = 6;
function enqueue(entry, front) {
  if (GS.streakQ.some(q => q[0] === entry[0])) return;
  if (front) GS.streakQ.unshift(entry);
  else GS.streakQ.push(entry);
  while (GS.streakQ.length > QMAX) {
    const i = GS.streakQ.findIndex(q => !q[5]);
    GS.streakQ.splice(i < 0 ? GS.streakQ.length - 1 : i, 1);
  }
}
// the callout on screen, cut off by a banner, a card screen or something urgent: it comes back only if it had barely
// been seen (under 1.2 s); a line already read is not said twice
export function requeueStreak() {
  const c = GS.streakCur;
  if (c && (GS.streakDur || 0) - GS.streakT < 1.2) enqueue(c, true);
}
// a line that no longer needs saying (another one says it better)
export function dropStreak(re) {
  GS.streakQ = GS.streakQ.filter(q => !re.test(q[0]));
  if (GS.streakCur && re.test(GS.streakCur[0]) && GS.streakT > 0) GS.streakT = Math.min(GS.streakT, 0.05);
}
export function showStreak(t, sub, urgent = STREAK_URGENT[t], valid = null) {
  if (urgent && GS.state === 'play' && GS.streakT > 0.25 && GS.streakCur && !STREAK_URGENT[GS.streakCur[0]]) {
    requeueStreak();
    GS.streakT = 0;
  } // urgent news cuts in front
  const entry = [t, sub, valid, GS.wave, !!GS.nightDone, !!urgent, GS.time];
  if (GS.state !== 'play' || GS.streakT > 0.25 || GS.bannerT > -0.45) {
    if (!GS.streakCur || GS.streakCur[0] !== t || GS.streakT <= 0) enqueue(entry, !!urgent);
    return;
  }
  GS.streakCur = entry;
  const el = $('streak');
  HUDR.t = -1;
  placeStreak();
  el.innerHTML = `${t}<small>${sub}</small>`;
  el.classList.add('show');
  GS.streakT = GS.streakDur = clamp(1.3 + (String(t).length + String(sub || '').length) * 0.04, 1.6, 4.5);
} // long lines stay up long enough to read
export function hideCallouts() {
  if (GS.streakT > 0 && GS.streakCur) requeueStreak();
  GS.streakT = 0;
  GS.streakCur = null;
  $('streak').classList.remove('show');
  GS.bannerT = -1;
  $('banner').classList.remove('show');
}

/* ---------- Enemies ---------- */
