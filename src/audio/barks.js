/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Your backups talk: short call-outs in their own voice, from where they stand. They keep it short and don't talk
// over each other or over Channel 9, and the same thing isn't said twice in a row. The words show for a moment
// under their name. Lines and voices: bark-lines.js.
import { GS } from '../core/gs.js';
import { pick, rand } from '../core/util.js';
import { AC, BUD_F, spat } from './audio.js';
import { BARK_LINES, BARK_VOICES } from './bark-lines.js';
import { HERO_LINES, HERO_RULE } from './hero-lines.js';

// per line kind: [seconds before the same survivor says it again, seconds before anyone does, chance it is said,
// priority]. Priority 2 talks over a recent line. Nobody talks while Channel 9 is on the air: a line due then is
// dropped, and one already being said is cut short when a call comes in
const RULE = {
  contact: [14, 9, 0.7, 1],
  big: [10, 7, 0.8, 1],
  elite: [12, 10, 1, 1],
  reload: [8, 5, 0.55, 1],
  kill: [12, 7, 0.2, 0],
  hurt: [6, 2.5, 0.6, 1],
  down: [0, 0, 1, 2],
  up: [0, 0, 1, 2],
  behind: [10, 8, 1, 2],
  clear: [0, 0, 1, 1],
  idle: [0, 0, 1, 0],
  car: [6, 6, 1, 2],
  hear: [20, 20, 1, 1],
  horde: [30, 30, 1, 2],
  panic: [8, 5, 0.7, 1],
  boom: [10, 10, 0.8, 2],
  boss: [30, 30, 1, 1],
  join: [0, 0, 1, 1],
  found: [8, 8, 0.8, 0],
  chopper: [20, 20, 1, 2],
};
const buf = {},
  lastK = {},
  have = {},
  talking = [];
const onAir = () => GS.radioT > 0 || (GS.radioQ && GS.radioQ.length > 0);
// Channel 9 is coming on: whoever is talking stops (a quick fade, not a click)
export function hushBarks() {
  if (!AC) return;
  for (const { src, g } of talking.splice(0))
    try {
      g.gain.setTargetAtTime(0, AC.currentTime, 0.04);
      src.stop(AC.currentTime + 0.2);
    } catch (e) {}
  lastEnd = Math.min(lastEnd, GS.time);
}
let lastAt = -99,
  lastEnd = -99;
function voiceOf(s) {
  if (s.vo) return s.vo;
  const g = BUD_F && BUD_F.has(s.nm) ? 'F' : 'M',
    n = BARK_VOICES[g].length,
    used = GS.buddies.filter(b => b !== s && b.vo).map(b => b.vo),
    free = [...Array(n).keys()].map(i => `b${g}${i}`).filter(c => !used.includes(c));
  return (s.vo = pick(free.length ? free : [...Array(n).keys()].map(i => `b${g}${i}`)));
}
function clip(code, text) {
  const v = GS.VOX.find(r => r[4] === code && r[1] === text);
  if (!v || !AC) return null;
  if (!buf[v[0]]) {
    const b = typeof v[3] === 'string' ? Uint8Array.from(atob(v[3]), c => c.charCodeAt(0)).buffer : v[3].slice(0);
    buf[v[0]] = AC.decodeAudioData(b).catch(() => null);
  }
  return { p: buf[v[0]], dur: v[2] };
}
// say a line of this kind, if it is the moment for it. Returns false when the voices aren't here (no asset pack
// reachable), so a caller can fall back to the old recorded call-out
// the Deputy and the Gunslinger at your side speak in their own voices, with their own lines from when they were the
// one you played (hero-lines.js): a moment of a buddy's, said as they'd say it
// (their 'quiet' lines are what they say over one they've just put down; 'heal', being patched or picked up; 'grab',
// with hands on them; 'clear', the end of it)
const HV_KIND = {
  reload: 'reload',
  kill: ['streak', 'quiet'],
  hurt: 'hurt',
  down: 'low',
  clear: 'clear',
  horde: 'horde',
  boss: 'boss',
  big: 'boss',
  up: 'heal',
  join: 'heal',
  panic: 'grab',
  chopper: 'clear',
};
export function bark(s, kind, delay = 0) {
  const R = RULE[kind],
    hv = s && s.hv,
    hk = hv && HV_KIND[kind],
    L = hv ? HERO_LINES[hv] && HERO_LINES[hv][Array.isArray(hk) ? pick(hk) : hk] : BARK_LINES[kind];
  if (!s || !R || !L || !s.nm || GS.state !== 'play') return true;
  if (s.down > 0 && kind !== 'down') return true;
  const code = hv ? 'P' + hv : voiceOf(s);
  if (!have[code]) {
    if (!GS.VOX.some(r => r[4] === code)) return false; // the voice bundle hasn't arrived (or can't)
    have[code] = true;
  }
  const t = GS.time,
    [own, any, ch, pri] = R;
  s.bk = s.bk || {};
  if (t - (s.bk[kind] ?? -99) < own || t - (lastK[kind] ?? -99) < any || Math.random() > ch) return true;
  if (onAir()) return true;
  if (pri < 2 && (t < lastEnd + 0.4 || t - lastAt < 1.5)) return true;
  const last = s.bk[kind + '#'],
    text = pick(L.length > 1 ? L.filter(x => x !== last) : L),
    c = clip(code, text);
  if (!c) return false;
  s.bk[kind] = lastK[kind] = lastAt = t;
  s.bk[kind + '#'] = text;
  lastEnd = t + delay + c.dur;
  s.say = { txt: text, t: GS.time + delay, end: GS.time + delay + c.dur + 1.1 }; // the caption shows even when the voice can't be heard
  c.p.then(b => {
    if (!b || !AC || GS.state === 'menu' || onAir()) return;
    const src = AC.createBufferSource(),
      g = AC.createGain(),
      out = spat(s.x, s.y);
    if (!out) return;
    src.buffer = b;
    src.playbackRate.value = rand(0.98, 1.03);
    g.gain.value = 0.26; // about the level of the old recorded call-outs, a touch more present
    src.connect(g);
    g.connect(out);
    src.start(AC.currentTime + delay);
    talking.push({ src, g });
    src.onended = () => {
      const i = talking.findIndex(q => q.src === src);
      if (i >= 0) talking.splice(i, 1);
    };
  });
  return true;
}
// You talk too (hero-lines.js): a few words now and then, in your own voice, never over Channel 9 or over one of
// your people. The words show over your head for a moment, as theirs do. Returns true if it was said
let heroAt = -99;
export function heroSay(kind, delay = 0) {
  const P = GS.P,
    id = GS.RUN && GS.RUN.hero,
    L = HERO_LINES[id] && HERO_LINES[id][kind],
    R = HERO_RULE[kind];
  if (!P || !L || !R || GS.state !== 'play' || !(P.hp > 0) || P.ride || GS.RUN.practice) return false;
  const code = 'P' + id;
  if (!have[code]) {
    if (!GS.VOX.some(r => r[4] === code)) return false; // the voice bundle hasn't arrived (or can't)
    have[code] = true;
  }
  const t = GS.time,
    [own, ch, pri] = R;
  P.hk = P.hk || {};
  if (t - (P.hk[kind] ?? -99) < own || onAir()) return false;
  if (pri < 2 && (t < lastEnd + 0.5 || t - heroAt < 6)) return false;
  if (Math.random() > ch) {
    P.hk[kind] = t - own * 0.5; // not this time: and not again straight away
    return false;
  }
  const last = P.hk[kind + '#'],
    text = pick(L.length > 1 ? L.filter(x => x !== last) : L),
    c = clip(code, text);
  if (!c) return false;
  P.hk[kind] = heroAt = t;
  P.hk[kind + '#'] = text;
  lastEnd = t + delay + c.dur;
  P.say = { txt: text, t: GS.time + delay, end: GS.time + delay + c.dur + 1.1 };
  if (GS.RUN.metrics) GS.RUN.metrics.heroLines = (GS.RUN.metrics.heroLines || 0) + 1;
  c.p.then(b => {
    if (!b || !AC || GS.state === 'menu' || onAir()) return;
    const src = AC.createBufferSource(),
      g = AC.createGain(),
      out = spat(P.x, P.y);
    if (!out) return;
    src.buffer = b;
    src.playbackRate.value = rand(0.99, 1.02);
    g.gain.value = 0.3; // you are nearer your own mouth than anyone else's
    src.connect(g);
    g.connect(out);
    src.start(AC.currentTime + delay);
    talking.push({ src, g });
    src.onended = () => {
      const i = talking.findIndex(q => q.src === src);
      if (i >= 0) talking.splice(i, 1);
    };
  });
  return true;
}
// somebody who is not one of yours says one given line (the driver in the garage: journey.js). The words always
// show over their head; the voice plays unless Channel 9 is on the air
// one of your people, in their own voice, saying a line that isn't a bark (threads.js)
export const budSay = (s, text, delay = 0) => s && text && npcSay(s, voiceOf(s), text, delay);
export function npcSay(s, code, text, delay = 0) {
  if (!s || !text) return;
  const c = clip(code, text),
    dur = c ? c.dur : 1.2 + text.length * 0.05;
  s.say = { txt: text, t: GS.time + delay, end: GS.time + delay + dur + 1.3 };
  lastEnd = Math.max(lastEnd, GS.time + delay + dur);
  if (!c) return;
  c.p.then(b => {
    if (!b || !AC || GS.state === 'menu' || onAir()) return;
    const src = AC.createBufferSource(),
      g = AC.createGain(),
      out = spat(s.x, s.y);
    if (!out) return;
    src.buffer = b;
    g.gain.value = 0.3;
    src.connect(g);
    g.connect(out);
    src.start(AC.currentTime + delay);
    talking.push({ src, g });
    src.onended = () => {
      const i = talking.findIndex(q => q.src === src);
      if (i >= 0) talking.splice(i, 1);
    };
  });
}
// one of your people on their feet, nearest to a point (for things they would see first)
export function nearestUp(x, y, max = 1e9) {
  let best = null,
    bd = max * max;
  for (const b of GS.buddies)
    if (!(b.down > 0)) {
      const d = (b.x - x) ** 2 + (b.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
  return best;
}
