/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The daily run: one campaign a day, the same for everyone who plays it that day. The date (UTC) decides the hero,
// one or two twists and the two ways offered at every stop; nothing else in the game is seeded. Your best score
// for the day is kept, and a streak counts the days in a row on which a daily reached night 5. The first daily of a
// day to get that far pays 25% more scrap. A daily saved and continued the next day still counts for its own day.
// A hero or twist you haven't unlocked yet is yours for that run.
import { GS } from '../core/gs.js';
import { saveMeta } from '../core/settings.js';
import { HEROES } from './arsenal.js';
import { TWISTS } from './districts.js';

export const DAILY_NIGHT = 5, // the night a daily must reach for the streak and the bonus
  DAILY_BONUS = 1.25;
// the UTC date as YYYY-MM-DD
export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
export function dayBefore(key) {
  const d = new Date(key + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return dayKey(d);
}
// FNV-1a: a string to 32 bits
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// mulberry32: a small generator from a seed, the same numbers for the same seed
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// a generator for one purpose on one daily (its date and what it's for)
export const dailyRng = (date, what) => seeded(hashStr(`dead-acre:${date}:${what}`));
// what a date decides: the hero and one or two twists
export function dailySetup(date) {
  const r = dailyRng(date, 'setup'),
    heroes = Object.keys(HEROES),
    hero = heroes[Math.floor(r() * heroes.length)],
    pool = TWISTS.map(t => t.id),
    n = r() < 0.55 ? 1 : 2,
    tw = [];
  while (tw.length < n) {
    const t = pool[Math.floor(r() * pool.length)];
    if (!tw.includes(t)) tw.push(t);
  }
  return { date, hero, tw };
}
// the time until the next daily, as h:mm
export function dailyLeft(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    m = Math.max(0, Math.ceil((next - now.getTime()) / 60000));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}
const meta = () => (GS.meta.daily = GS.meta.daily || { date: '', best: 0, streak: 0, streakDay: '' });
// your record as it stands on `today`: the best is today's only; a streak broken by a missed day shows as none
export function dailyRecord(today = dayKey()) {
  const D = meta();
  return {
    best: D.date === today ? D.best : 0,
    streak: D.streakDay === today || D.streakDay === dayBefore(today) ? D.streak : 0,
    done: D.streakDay === today,
  };
}
// a daily reached night 5: the streak goes on (or starts again), and the first of the day pays the bonus
export function dailyReached() {
  const R = GS.RUN && GS.RUN.daily;
  if (!R || R.reached || GS.wave < DAILY_NIGHT) return;
  R.reached = true;
  const D = meta();
  if (D.streakDay === R.date) return; // the day already counted
  D.streak = D.streakDay === dayBefore(R.date) ? D.streak + 1 : 1;
  D.streakDay = R.date;
  R.bonus = true;
  saveMeta();
}
// the run is over: the best score for its day
export function dailyEnd() {
  const R = GS.RUN && GS.RUN.daily;
  if (!R) return;
  dailyReached();
  const D = meta();
  if (D.date && R.date < D.date) return; // an older day's run, finished after a newer daily: today's best stands
  if (D.date !== R.date) {
    D.date = R.date;
    D.best = 0;
  }
  D.best = Math.max(D.best, GS.score);
  saveMeta();
}
export const dailyK = () => (GS.RUN && GS.RUN.daily && GS.RUN.daily.bonus ? DAILY_BONUS : 1);
