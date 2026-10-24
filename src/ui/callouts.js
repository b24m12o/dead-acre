/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
let streakQ = [],
  streakCur = null;
const STREAK_URGENT = { 'Man down': 1, "They didn't make it": 1, Pinned: 1, Choked: 1 };
const HUDR = { t: -1, boss: null };
function hudDomRects() {
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
function placeStreak() {
  const el = $('streak'),
    r = hudDomRects().boss,
    top = r
      ? Math.max(innerHeight * 0.19, r.bottom + 14 + ($('banner').classList.contains('show') ? 110 : 0)) + 'px'
      : '';
  if (el.style.top !== top) el.style.top = top;
} // follows the boss panel as it appears, grows or moves, so the two never overlap
function showStreak(t, sub, urgent = STREAK_URGENT[t], valid = null) {
  if (urgent && state === 'play' && streakT > 0.25 && streakCur && !STREAK_URGENT[streakCur[0]]) {
    streakQ.unshift(streakCur);
    streakT = 0;
  } // urgent news cuts in front
  if (state !== 'play' || streakT > 0.25 || bannerT > -0.45) {
    if (!streakQ.some(q => q[0] === t) && (!streakCur || streakCur[0] !== t || streakT <= 0))
      streakQ.push([t, sub, valid]);
    if (streakQ.length > 4) streakQ.shift();
    return;
  }
  streakCur = [t, sub, valid];
  const el = $('streak');
  HUDR.t = -1;
  placeStreak();
  el.innerHTML = `${t}<small>${sub}</small>`;
  el.classList.add('show');
  streakT = clamp(1.3 + (String(t).length + String(sub || '').length) * 0.04, 1.6, 4.5);
} // long lines stay up long enough to read
function hideCallouts() {
  if (streakT > 0 && streakCur) streakQ.unshift(streakCur);
  streakT = 0;
  streakCur = null;
  $('streak').classList.remove('show');
  bannerT = -1;
  $('banner').classList.remove('show');
}

/* ---------- Enemies ---------- */
