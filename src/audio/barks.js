/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Your backups talk: short call-outs in their own voice, from where they stand. They keep it short and don't talk
// over each other or over Channel 9, and the same thing isn't said twice in a row. The words show for a moment
// under their name. Lines and voices: bark-lines.js.
import { GS } from '../core/gs.js';
import { pick, rand } from '../core/util.js';
import { AC, BUD_F, spat } from './audio.js';
import { BARK_LINES, BARK_VOICES } from './bark-lines.js';

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
export function bark(s, kind, delay = 0) {
  const R = RULE[kind],
    L = BARK_LINES[kind];
  if (!s || !R || !L || !s.nm || GS.state !== 'play') return true;
  if (s.down > 0 && kind !== 'down') return true;
  const code = voiceOf(s);
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
