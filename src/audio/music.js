/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { clamp, pick, randi } from '../core/util.js';
import { opt, store } from '../core/settings.js';
import { AC, MUS, MUSK, dlyIn, master, musBus, musGate, noise, radBus, revIn, sfxBus } from './audio.js';
import { syncOpts } from '../ui/settings-ui.js';
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const TEMPO = { none: 70, menu: 70, calm: 84, fight: 150, boss: 172 };
const BOSS_TEMPO = { abom: 1, roadkill: 1.1, grave: 0.74, chief: 0.94, pz: 0.88 }; // each boss gets its own take on the boss theme: Roadkill gallops, the Gravekeeper drags
function tempoOf(L) {
  if (L !== 'boss') return TEMPO[L];
  return TEMPO.boss * (BOSS_TEMPO[MUS.bt] || 1) * (1 + 0.04 * (MUS.bph || 0));
}
/* ---- the recorded band (tools/music/build.py): a real guitar through a modelled amp, a bass, a rock kit, strings,
   piano and glockenspiel, all CC0. They arrive with the asset pack; until then (or without it) the synth band plays ---- */
let MS = null, // name -> { b: buffer, o: where its attack starts, lp: [loop start, end] }
  MSP = null, // pitched instruments: prefix -> sorted notes
  msDone = false;
export const MSN = () => (MS ? Object.keys(MS).length : 0);
export function loadMusic() {
  if (!AC || !GS.MUSHD || msDone) return;
  msDone = true;
  const ms = {},
    list = GS.MUSHD;
  let left = list.length;
  for (const [nm, data, ...x] of list) {
    const b = typeof data === 'string' ? Uint8Array.from(atob(data), c => c.charCodeAt(0)).buffer : data.slice(0);
    AC.decodeAudioData(b)
      .then(buf => {
        // find the attack: the decoder may add a little silence of its own in front
        let pk = 0,
          i = 0;
        const n = Math.min(buf.length, Math.floor(buf.sampleRate * 0.2)),
          chs = [...Array(buf.numberOfChannels).keys()].map(c => buf.getChannelData(c));
        for (const d of chs) for (let k = 0; k < buf.length; k++) pk = Math.max(pk, Math.abs(d[k]));
        const th = pk * 0.03;
        if (!x.length) for (; i < n; i++) if (chs.some(d => Math.abs(d[i]) > th)) break;
        ms[nm] = { b: buf, o: x.length ? 0 : Math.max(0, i / buf.sampleRate - 0.004), lp: x.length ? x : null };
      })
      .catch(() => {})
      .finally(() => {
        if (--left) return;
        MSP = {};
        for (const nm in ms) {
          const m = /^(go|gp|l|b|p|n|e)(\d+)$/.exec(nm);
          if (m) (MSP[m[1]] = MSP[m[1]] || []).push(+m[2]);
        }
        for (const k in MSP) MSP[k].sort((a, b) => a - b);
        if (ms.go40 && ms.k0 && ms.s0) MS = ms; // the band plays only once its core is in
      });
  }
}
const take = k => {
  const v = [];
  for (let i = 0; MS[k + i]; i++) v.push(k + i);
  return v.length ? v[randi(0, v.length - 1)] : null;
}; // one of a drum's takes, so no two hits sound the same
function nearest(pre, m) {
  const v = MSP[pre];
  if (!v) return null;
  let best = v[0];
  for (const k of v) if (Math.abs(k - m) < Math.abs(best - m)) best = k;
  return best;
}
// plays a sample at time t. dur: hold for that long, then release over rel (0: let it ring out). Returns its gain
function sp(nm, t, vol, { rate = 1, dur = 0, rel = 0.08, rev = 0, dly = 0, att = 0, loop = false, det = 0 } = {}) {
  const s = MS[nm];
  if (!s) return null;
  const src = AC.createBufferSource(),
    g = AC.createGain();
  src.buffer = s.b;
  src.playbackRate.value = rate;
  if (loop && s.lp) {
    src.loop = true;
    src.loopStart = s.lp[0];
    src.loopEnd = s.lp[1];
  }
  if (att) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
  } else g.gain.setValueAtTime(vol, t);
  let end = t + (s.b.duration - s.o) / rate;
  if (dur) {
    const h = Math.max(t + att + 0.005, t + dur);
    g.gain.setValueAtTime(vol, h);
    g.gain.exponentialRampToValueAtTime(0.0001, h + rel);
    end = loop ? h + rel : Math.min(end, h + rel);
  }
  if (det) {
    const lfo = AC.createOscillator(),
      lg = AC.createGain();
    lfo.frequency.value = 5.4;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(det, t + Math.min(0.5, dur * 0.6)); // the vibrato comes in once the note has spoken
    lfo.connect(lg);
    lg.connect(src.detune);
    lfo.start(t);
    lfo.stop(end + 0.05);
  }
  src.connect(g);
  g.connect(musBus);
  for (const [bus, k] of [
    [revIn, rev],
    [dlyIn, dly],
  ])
    if (k) {
      const r = AC.createGain();
      r.gain.value = k;
      g.connect(r);
      r.connect(bus);
    }
  src.start(t, s.o);
  src.stop(end + 0.05);
  return g;
}
// a pitched sample: the nearest recorded note, played faster or slower to land on m
function spN(pre, m, t, vol, o = {}) {
  const k = nearest(pre, m);
  return k == null ? null : sp(pre + k, t, vol, { ...o, rate: Math.pow(2, (m - k) / 12) });
}
const hum = () => (Math.random() - 0.5) * 0.006; // a drummer is never quite on the grid
let gtrIn = null;
function ensureGtr() {
  if (gtrIn) return;
  gtrIn = AC.createGain();
  gtrIn.gain.value = 1;
  const hp = AC.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 70;
  const ws = AC.createWaveShaper(),
    n = 1024,
    cv = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    cv[i] = Math.tanh(x * 26) * 0.9;
  }
  ws.curve = cv;
  ws.oversample = '2x';
  const cab = AC.createBiquadFilter();
  cab.type = 'lowpass';
  cab.frequency.value = 3600;
  cab.Q.value = 0.8;
  const mid = AC.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 750;
  mid.gain.value = -5;
  mid.Q.value = 1;
  const post = AC.createGain();
  post.gain.value = 0.16;
  gtrIn.connect(hp);
  hp.connect(ws);
  ws.connect(cab);
  cab.connect(mid);
  mid.connect(post);
  post.connect(musBus);
  const send = AC.createGain();
  send.gain.value = 0.25;
  post.connect(send);
  send.connect(revIn);
}
export function mGtr(fret, t, dur, palm, vol = 1) {
  if (MS) {
    const root = 40 + fret;
    if (palm) spN('gp', root, t, 0.34 * vol, { dur: Math.min(dur, 0.4), rel: 0.05 });
    else spN('go', root, t, 0.3 * vol, { dur, rel: 0.12, rev: 0.12 });
    spN('b', root - 12, t, 0.3 * vol, { dur: palm ? dur * 0.9 : dur, rel: palm ? 0.04 : 0.1 }); // the bass locks to the guitar
    return;
  }
  ensureGtr();
  const root = 40 + fret,
    g = AC.createGain(),
    f = AC.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(palm ? 900 : 5000, t);
  if (!palm) f.frequency.exponentialRampToValueAtTime(2200, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.5 * vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(palm ? 0.02 : 0.15, t + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06);
  f.connect(g);
  g.connect(gtrIn);
  for (const [iv, det] of palm
    ? [
        [0, -6],
        [7, 5],
      ]
    : [
        [0, -8],
        [0, 8],
        [7, 4],
        [12, -4],
      ]) {
    const o = AC.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = mtof(root + iv);
    o.detune.value = det;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
  // bass doubles the root an octave down
  const b = AC.createOscillator(),
    bf = AC.createBiquadFilter(),
    bg = AC.createGain();
  b.type = 'sawtooth';
  b.frequency.value = mtof(root - 12);
  bf.type = 'lowpass';
  bf.frequency.value = palm ? 380 : 520;
  vEnv(bg, t, 0.004, 0.16 * vol, 0.05, 0.7, 0.05, t + dur);
  b.connect(bf);
  bf.connect(bg);
  bg.connect(musBus);
  b.start(t);
  b.stop(t + dur + 0.2);
}
function vEnv(g, t, a, peak, d, sus, rel, end) {
  if (end < t + a + 0.01) end = t + a + 0.01;
  const dEnd = Math.min(t + a + d, end - 0.005);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.linearRampToValueAtTime(peak * sus, dEnd);
  g.gain.setValueAtTime(peak * sus, end);
  g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
}
function mPad(notes, t, dur, vol) {
  if (MS) {
    for (const m of notes) spN('p', m, t, vol * 5.4, { dur, att: 1.6, rel: 1.8, rev: 0.45, loop: true });
    return;
  } // a string section, swelling in and out
  for (const m of notes)
    for (const det of [-9, 9]) {
      const o = AC.createOscillator(),
        f = AC.createBiquadFilter(),
        g = AC.createGain();
      o.type = 'sawtooth';
      o.frequency.value = mtof(m);
      o.detune.value = det;
      f.type = 'lowpass';
      f.frequency.setValueAtTime(300, t);
      f.frequency.linearRampToValueAtTime(900, t + dur * 0.5);
      f.frequency.linearRampToValueAtTime(350, t + dur);
      vEnv(g, t, 1.2, vol, 0.3, 0.85, 1.4, t + dur);
      o.connect(f);
      f.connect(g);
      g.connect(musBus);
      g.connect(revIn);
      o.start(t);
      o.stop(t + dur + 1.6);
    }
}
function mBell(m, t, vol) {
  if (MS) {
    if (m >= 76) spN('e', m, t, vol * 4.2, { rev: 0.4, dly: 0.5 });
    else spN('n', m, t, vol * 4.6, { rev: 0.45, dly: 0.4 });
    return;
  } // a glockenspiel, or the top of the piano below its range
  const o = AC.createOscillator(),
    o2 = AC.createOscillator(),
    g = AC.createGain();
  o.type = 'sine';
  o2.type = 'sine';
  o.frequency.value = mtof(m);
  o2.frequency.value = mtof(m) * 2.76;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  o.connect(g);
  o2.connect(g);
  g.connect(musBus);
  g.connect(revIn);
  g.connect(dlyIn);
  o.start(t);
  o2.start(t);
  o.stop(t + 2.3);
  o2.stop(t + 2.3);
}
function mKick(t, vol) {
  if (MS) {
    sp(take(vol > 0.5 ? 'k' : 'kq'), t + hum() * 0.5, vol * 1.05 * (0.94 + Math.random() * 0.12));
    return;
  }
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(170, t);
  o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(g);
  g.connect(musBus);
  o.start(t);
  o.stop(t + 0.3);
  noise(0.012, vol * 0.5, 4000, 2000, 'highpass', 0, musBus, t);
}
function mSnare(t, vol) {
  if (MS) {
    sp(take(vol >= 0.38 ? 's' : vol >= 0.26 ? 'sc' : 'scq'), t + hum(), vol * 1.25 * (0.92 + Math.random() * 0.16), {
      rev: 0.16,
    });
    return;
  } // the backbeat is a rimshot; fills and ghost notes are softer hits on the head
  noise(0.2, vol, 2200, 900, 'bandpass', 0, musBus, t);
  noise(0.25, vol * 0.5, 5000, 3000, 'highpass', 0, revIn, t);
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(200, t);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
  g.gain.setValueAtTime(vol * 0.8, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g);
  g.connect(musBus);
  g.connect(revIn);
  o.start(t);
  o.stop(t + 0.14);
}
function mHat(t, vol, open) {
  if (MS) {
    sp(
      take(open ? 'ho' : vol > 0.06 ? 'h' : 'hq'),
      t + hum(),
      vol * (open ? 3.4 : 4.4) * (0.85 + Math.random() * 0.3),
      {
        dur: open ? 0.5 : 0,
        rel: 0.2,
      }
    );
    return;
  }
  noise(open ? 0.16 : 0.035, vol, 9000, 7000, 'highpass', 0, musBus, t);
}
function mCrash(t, vol) {
  if (MS) {
    sp(take('c'), t, vol * 3.6, { rev: 0.2 });
    return;
  }
  noise(1.6, vol, 7000, 3500, 'highpass', 0, musBus, t);
  noise(1.6, vol * 0.6, 6000, 3000, 'highpass', 0, revIn, t);
}
export function startMusic() {
  if (!AC || MUS.timer) return;
  MUS.nextT = AC.currentTime + 0.15;
  MUS.timer = setInterval(scheduleMusic, 25);
}
function scheduleMusic() {
  if (!AC) return;
  if (AC.currentTime > MUS.nextT + 1) MUS.nextT = AC.currentTime + 0.05;
  for (let guard = 0; MUS.nextT < AC.currentTime + 0.14 && guard < 12; guard++) {
    // capped: a slow device must never get stuck catching up
    if (AC.currentTime > MUS.nextT + 0.5) MUS.nextT = AC.currentTime + 0.05;
    const bossIn = MUS.want === 'boss' && MUS.step % 4 === 0,
      calmOut = MUS.level === 'calm' && MUS.step % 8 === 0;
    if (
      MUS.want !== MUS.level &&
      (MUS.step % 16 === 0 || bossIn || calmOut || MUS.level === 'none' || MUS.want === 'none')
    ) {
      MUS.step = 0;
      MUS.loop = 0;
      MUS.sec = null;
      if (MUS.want === 'boss') {
        MUS.bph = 0;
        MUS.phJump = null;
      }
      if (musGate) {
        const g = musGate.gain,
          t0 = Math.max(AC.currentTime, MUS.nextT);
        g.cancelScheduledValues(t0);
        if (MUS.want === 'none') g.setTargetAtTime(0, t0, 0.03);
        else {
          const lv = MUS.want === 'boss' ? 0.75 : 1;
          if (MUS.level === 'none') g.setValueAtTime(lv, t0);
          else g.setTargetAtTime(lv, t0, 0.4);
        } // the boss song sits a little under the fight so your guns stay on top
      } // a stop is a real stop: pads and ringing chords are cut too
      MUS.level = MUS.want;
      MUS.fresh = true;
    } else if (MUS.level === 'boss' && MUS.phJump != null && MUS.step % 16 === 0) {
      const n = (SONGS['boss_' + MUS.bt] || SONGS.boss).length * 2;
      MUS.pos.boss = Math.floor(MUS.pos.boss / n) * n + MUS.phJump * 4;
      MUS.bph = MUS.phJump;
      MUS.phJump = null;
      MUS.step = 0;
      MUS.sec = null;
      MUS.fresh = MUS.sting = true;
    }
    playStep(MUS.step, MUS.nextT);
    const spb = 60 / tempoOf(MUS.level) / 4;
    MUS.nextT += spb;
    if (MUS.delay && MUS.spb !== spb) {
      MUS.spb = spb;
      MUS.delay.delayTime.cancelScheduledValues(AC.currentTime);
      MUS.delay.delayTime.setTargetAtTime(spb * 3, AC.currentTime, 0.2);
    } // only when the tempo actually changes
    MUS.step = (MUS.step + 1) % 64;
    if (MUS.step === 0) MUS.loop++;
  }
}
// ---- the soundtrack: songs built from sections, each section 4 bars of 16ths ----
// riff tokens: pN palm-muted chug on fret N, oN open power chord, . rest (open chords ring through rests)
const RF = s => {
  const a = s
    .trim()
    .split(/\s+/)
    .map(t => (t === '.' ? '' : t));
  while (a.length < 64) a.push('');
  return a;
};
let RIFFS;
// songs: [riff, drums, key shift, lead?] — played in order, then loop with fresh solos
let SONGS;
let SCALE; // E natural minor with a phrygian lean below
let scaleNote;
function makeLead(kind) {
  // 64 steps of midi (0 = rest, -1 = hold)
  const L = new Array(64).fill(0);
  if (kind === 'hook') {
    const mot = [
      [0, 4],
      [2, 2],
      [3, 2],
      [4, 4],
      [3, 2],
      [2, 2],
    ];
    const offs = [0, 0, 2, -1];
    for (let b = 0; b < 4; b++) {
      let st = b * 16;
      for (const [d, len] of mot) {
        if (st >= (b + 1) * 16) break;
        L[st] = scaleNote(d + offs[b]);
        for (let k = 1; k < len; k++) L[st + k] = -1;
        st += len;
      }
    }
  } else if (kind === 'solo' || kind === 'boss') {
    let d = randi(2, 6);
    for (let st = 0; st < 64; ) {
      const len = pick(kind === 'boss' ? [1, 2, 2, 4] : [1, 1, 2, 2, 3, 4]);
      if (Math.random() < 0.12) {
        st += len;
        continue;
      }
      d += pick([-2, -1, -1, 1, 1, 2, 3, -3]);
      d = clamp(d, 0, 12);
      L[st] = scaleNote(d, kind === 'boss' ? 65 : 64) + (kind === 'boss' && Math.random() < 0.2 ? 1 : 0);
      for (let k = 1; k < len && st + k < 64; k++) L[st + k] = -1;
      st += len;
    }
    for (let k = 56; k < 64; k++) L[k] = k === 56 ? scaleNote(7) : -1;
  } else if (kind === 'arp') {
    const ch = [
      [0, 2, 4, 7],
      [5, 7, 9, 12],
      [3, 5, 7, 10],
      [1, 3, 5, 8],
    ];
    for (let st = 0; st < 64; st += 2) {
      const c = ch[st >> 4];
      L[st] = scaleNote(c[(st >> 1) % 4], 52);
    }
  } else if (kind === 'bells') {
    for (const st of [8, 24, 30, 40, 56]) L[st] = scaleNote(pick([0, 2, 4, 7, 9]), 76);
  } else if (kind === 'siren') {
    for (let b = 0; b < 4; b++) {
      L[b * 16] = scaleNote(4, 76);
      for (let i = 1; i < 8; i++) L[b * 16 + i] = -1;
      L[b * 16 + 8] = scaleNote(b % 2 ? 6 : 7, 76);
      for (let i = 9; i < 16; i++) L[b * 16 + i] = -1;
    }
  } // two held notes, rising and falling like a fire siren
  else if (kind === 'build') {
    for (let st = 32; st < 64; st += 2) L[st] = scaleNote(Math.floor((st - 32) / 4), 64);
  }
  return L;
}
function mTom(t, vol, low) {
  if (MS) sp(take(low ? 'tl' : 't'), t + hum(), vol, { rev: 0.2 });
  else mSnare(t, vol * 0.6);
}
function mLead2(m, t, dur, vol) {
  if (MS) {
    spN('l', m, t, vol * 2.6, { dur, rel: 0.12, rev: 0.22, dly: 0.18, det: dur > 0.25 ? 16 : 0 });
    return;
  } // the lead guitar, singing: vibrato on the held notes
  // sustained, vibrato-ed lead through the amp
  ensureGtr();
  const o = AC.createOscillator(),
    o2 = AC.createOscillator(),
    g = AC.createGain(),
    lfo = AC.createOscillator(),
    lg = AC.createGain();
  o.type = 'sawtooth';
  o2.type = 'square';
  o.frequency.value = mtof(m);
  o2.frequency.value = mtof(m) * 1.0015;
  lfo.frequency.value = 5.6;
  lg.gain.value = dur > 0.25 ? 7 : 0;
  lfo.connect(lg);
  lg.connect(o.detune);
  lg.connect(o2.detune);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.setValueAtTime(vol * 0.8, t + dur * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
  o.connect(g);
  o2.connect(g);
  g.connect(gtrIn);
  for (const x of [o, o2, lfo]) {
    x.start(t);
    x.stop(t + dur + 0.12);
  }
}
function mPluck(m, t, vol) {
  if (MS) {
    spN('n', m, t, vol * 4.4, { rev: 0.45, dly: 0.35 });
    return;
  } // a piano, far off down the street
  const o = AC.createOscillator(),
    f = AC.createBiquadFilter(),
    g = AC.createGain();
  o.type = 'triangle';
  o.frequency.value = mtof(m);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(2400, t);
  f.frequency.exponentialRampToValueAtTime(500, t + 0.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  o.connect(f);
  f.connect(g);
  g.connect(musBus);
  g.connect(revIn);
  g.connect(dlyIn);
  o.start(t);
  o.stop(t + 1.5);
}
function nextSection(L) {
  const song = (L === 'boss' && SONGS['boss_' + MUS.bt]) || SONGS[L];
  if (!song) {
    MUS.sec = null;
    return;
  }
  // every part plays twice (the repeat gets its lead line), and each pass through the song shifts key
  const n = song.length * 2,
    k = MUS.pos[L] % n,
    cyc = Math.floor(MUS.pos[L] / n),
    i = k >> 1,
    rep = k & 1;
  MUS.pos[L]++;
  let [riff, drums, key, lead] = song[i];
  if (!rep && lead && lead !== 'bells' && lead !== 'arp' && L !== 'boss') lead = null;
  if (rep && !lead && L === 'fight' && Math.random() < 0.35) lead = 'solo';
  key += [0, 2, -2, 3][cyc % 4];
  MUS.sec = { L, riff: RIFFS[riff], drums, key, first: k === 0 };
  MUS.lead = lead ? makeLead(lead) : null;
  MUS.leadKind = lead;
}
function playStep(st, t) {
  const L = MUS.level,
    s = st & 15,
    bar = st >> 4,
    spb = 60 / tempoOf(L) / 4;
  if (L === 'none') return;
  if (L === 'menu') {
    if (st === 0)
      mPad(
        [28, 40, 47, 52].map(n => n + [0, 0, 5, 3][MUS.loop % 4]),
        t,
        spb * 64 * 0.98,
        0.03
      );
    if (s === 0 || s === 3) mKick(t, s ? 0.25 : 0.38);
    const bells = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 76, 0, 0, 0, 0, 0, 0, 0, 79, 0, 0, 0, 0, 0, 78, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 0, 0, 0, 0, 0, 0, 0, 71, 0, 0, 0, 0, 0, 0, 0,
    ];
    if (bells[st] && MUS.loop % 2 === 1) mBell(bells[st] + [0, 0, 5, 3][MUS.loop % 4], t, 0.05);
    if (MUS.loop % 2 === 0 && s === 0) {
      const f = [0, 1, 0, 6][bar] + [0, 0, 5, 3][MUS.loop % 4];
      if (MS)
        for (const [iv, d] of [
          [0, 0],
          [7, 0.03],
          [12, 0.06],
          [15, 0.09],
        ])
          mPluck(52 + f + iv, t + d, 0.03);
      else mGtr(f, t, spb * 15, false, 0.35);
    } // a slow piano chord a bar: the quiet before
    return;
  }
  if (st === 0 || !MUS.sec || MUS.sec.L !== L) nextSection(L);
  const S2 = MUS.sec,
    riff = S2.riff,
    tok = riff[st],
    K = S2.key,
    sparse =
      L === 'fight' && (st % 16 === 0 ? (MUS.sparse = (MUS.heat || 0) < (MUS.sparse ? 0.35 : 0.25)) : MUS.sparse),
    D = sparse && S2.drums !== 'none' ? 'half' : S2.drums; // quiet street: half-time groove, no leads
  if (tok) {
    let n = 1;
    while (n < 16 && st + n < 64 && !riff[st + n]) n++;
    const palm = tok[0] === 'p';
    mGtr(+tok.slice(1) + K, t, palm ? spb * 0.85 : spb * n * 0.97, palm, L === 'calm' ? 0.75 : 1);
    if (L === 'fight' && !sparse && (MUS.heat || 0) > 0.7)
      mGtr(+tok.slice(1) + K + 12, t, palm ? spb * 0.8 : spb * n * 0.95, palm, 0.3);
  } // the thick of it: a second guitar an octave up joins in
  if (s === 0) MUS.leadOn = !(L === 'fight' && (MUS.heat || 0) < (MUS.leadOn ? 0.35 : 0.45)); // decided once a bar, with a little hysteresis
  if (MUS.lead && MUS.leadOn !== false) {
    const m = MUS.lead[st];
    if (m > 0) {
      let n = 1;
      while (st + n < 64 && MUS.lead[st + n] === -1) n++;
      const k2 = MUS.leadKind;
      if (k2 === 'arp') mPluck(m + K, t, 0.06);
      else if (k2 === 'bells') mBell(m + K, t, 0.05);
      else mLead2(m + K, t, spb * n * 0.95, k2 === 'build' ? 0.07 : 0.1);
    }
  }
  if (st === 0 && D !== 'none' && (S2.first || MUS.fresh || D === 'open' || D === 'blast' || Math.random() < 0.5)) {
    mCrash(t, L === 'calm' ? 0.07 : 0.13);
    MUS.fresh = false;
  }
  const fill = (bar === 3 || MUS.want !== L) && s >= 12 && D !== 'none' && D !== 'calm';
  switch (D) {
    case 'std':
      if ((tok && tok[0] === 'p') || s === 0 || s === 8) mKick(t, 0.6);
      if (s === 4 || s === 12) mSnare(t, 0.4);
      if (s % 2 === 0) mHat(t, 0.07, s === 14);
      break;
    case 'gallop':
      if (s % 4 !== 1) mKick(t, s % 4 ? 0.45 : 0.62);
      if (s === 4 || s === 12) mSnare(t, 0.42);
      if (s % 4 === 0) mHat(t, 0.08, s === 12);
      break;
    case 'thrash':
      if (s % 2 === 0) mKick(t, 0.55);
      if (s % 4 === 2) mSnare(t, 0.36);
      mHat(t, 0.05);
      break;
    case 'open':
      if (s === 0 || s === 6 || s === 10) mKick(t, 0.62);
      if (s === 4 || s === 12) mSnare(t, 0.45);
      if (s % 2 === 0) mHat(t, 0.08, true);
      break;
    case 'half':
      if (tok && tok[0] === 'p') mKick(t, 0.66);
      if (s === 8) mSnare(t, 0.5);
      if (s % 4 === 0) mHat(t, 0.06, true);
      if (s === 0 && bar === 0 && st !== 0) mCrash(t, 0.1);
      break;
    case 'boss':
      mKick(t, s % 2 ? 0.45 : 0.6);
      if (s === 4 || s === 12) mSnare(t, 0.45);
      if (s % 2 === 0) mHat(t, 0.06);
      break;
    case 'blast':
      mKick(t, 0.5);
      if (s % 2 === 1) mSnare(t, 0.32);
      if (s % 4 === 0) mCrash(t, 0.03);
      break;
    case 'doom':
      if (s === 0 || s === 3) mKick(t, 0.7);
      if (s === 8) mSnare(t, 0.55);
      if (s % 4 === 0) mHat(t, 0.05, true);
      break;
    case 'heart':
      if (s === 0 || s === 3 || s === 8 || s === 11) mKick(t, s % 8 ? 0.42 : 0.7);
      if (s === 12) mSnare(t, 0.3);
      if (s % 4 === 2) mHat(t, 0.04);
      break; // lub-dub
    case 'march':
      if (s % 4 === 0) mKick(t, 0.62);
      if (s === 4 || s === 12 || s === 14 || s === 15) mSnare(t, s > 12 ? 0.28 : 0.45);
      if (s % 2 === 0) mHat(t, 0.06);
      break;
    case 'calm':
      if (s === 0 || s === 10) mKick(t, 0.5);
      if (s === 8) mSnare(t, 0.3);
      if (s % 4 === 0) mHat(t, 0.05, s === 12);
      break;
  }
  if (fill) {
    const v = 0.22 + (s - 12) * 0.06;
    if (MS && bar === 3 && MUS.loop % 2 === 1 && s < 15) mTom(t, 0.5 + v, s > 13);
    else mSnare(t, v);
  } // every other turnaround rolls round the toms
  if (L === 'fight' && !sparse && (MUS.heat || 0) > 0.82 && s % 2 === 1 && D !== 'blast' && D !== 'none')
    mHat(t, 0.035); // and the hats double up
  if (st === 0 && MUS.sting) {
    MUS.sting = false;
    mGtr(K, t, spb * 6, false, 0.55);
    mGtr(1 + K, t + spb * 2, spb * 6, false, 0.55);
  }
  if (L === 'calm' && st === 0)
    mPad(
      [40, 47, 52].map(n => n + K),
      t,
      spb * 64 * 0.98,
      0.025
    );
  if (L === 'boss' && st === 0)
    mPad(
      [28, 35, 40].map(n => n + K),
      t,
      spb * 64 * 0.98,
      0.03
    );
}
export function applyVol() {
  if (!AC) return;
  master.gain.setTargetAtTime(GS.muted ? 0 : GS.meta.vol.master, AC.currentTime, 0.05);
  sfxBus.gain.setTargetAtTime(GS.meta.vol.sfx, AC.currentTime, 0.05);
  if (radBus) radBus.gain.setTargetAtTime(GS.meta.vol.sfx, AC.currentTime, 0.05);
  musBus.gain.setTargetAtTime(opt.music ? GS.meta.vol.music * MUSK : 0, AC.currentTime, 0.1);
}
export function setMuted(m) {
  GS.muted = m;
  store.set('rr_muted', m ? '1' : '0');
  applyVol();
  {
    const mc = $('muteChip');
    if (mc) mc.hidden = !m;
  }
  $('muteBtn').classList.toggle('on', !m);
  $('muteBtn').setAttribute('aria-pressed', !m ? 'true' : 'false');
}
export function setMusic(on) {
  opt.music = on;
  store.set('rr_music', on ? '1' : '0');
  applyVol();
  syncOpts();
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  RIFFS = {
    // fight
    f_main: RF(
      `p0 p0 p0 p0 p0 p0 o3 . p0 p0 p0 p0 o5 . o3 .  p0 p0 p0 p0 p0 p0 o3 . p0 p0 p0 p0 o6 . o5 .  p0 p0 o7 . p0 p0 o6 . p0 p0 o5 . p0 o3 o1 .  o0 . . . . . . . p0 p0 p0 p0 o1 . o3 .`
    ),
    f_gallop: RF(
      `p0 . p0 p0 p0 . p0 p0 o5 . o3 . p0 . p0 p0  p0 . p0 p0 p0 . p0 p0 o6 . o5 . o3 . o1 .  p0 . p0 p0 p0 . p0 p0 o5 . o3 . p0 . p0 p0  o8 . . . o7 . . . o6 . o5 . o3 . o1 .`
    ),
    f_thrash: RF(
      `p0 p0 p0 p0 o1 o1 p0 p0 o3 o3 p0 p0 o2 o2 o1 .  p0 p0 p0 p0 o1 o1 p0 p0 o5 o5 p0 p0 o3 o3 o1 .  p0 p0 p0 p0 o1 o1 p0 p0 o3 o3 p0 p0 o2 o2 o1 .  o6 o6 o5 o5 o3 o3 o1 o1 o0 . . . p0 p0 p0 p0`
    ),
    f_chorus: RF(
      `o0 . . . . . . . o5 . . . . . . .  o3 . . . . . . . o6 . . . o7 . . .  o0 . . . . . . . o5 . . . . . . .  o8 . . . . . o7 . . . o5 . o3 . o1 .`
    ),
    f_break: RF(
      `p0 . . p0 . . p0 . p0 . . . o1 . . .  p0 . . p0 . . p0 . p0 . . . o6 . o5 .  p0 . . p0 . . p0 . p0 . . . o1 . . .  p0 p0 . p0 p0 . p0 p0 o7 . . . o8 . . .`
    ),
    f_solo: RF(
      `p0 p0 p0 p0 p0 p0 p0 p0 o5 . . . o3 . . .  p0 p0 p0 p0 p0 p0 p0 p0 o6 . . . o5 . . .  p0 p0 p0 p0 p0 p0 p0 p0 o8 . . . o7 . . .  p0 p0 p0 p0 o5 . o6 . o7 . o8 . o10 . . .`
    ),
    // boss
    b_main: RF(
      `p0 p0 p0 p0 p1 p1 p1 p1 p0 p0 p0 p0 p4 p4 p3 p3  p0 p0 p0 p0 p1 p1 p1 p1 p0 p0 p0 p0 p6 p6 p5 p5  o0 . . . o1 . . . o6 . . . o5 . . .  o0 . . . o1 . . . o3 . o4 . o6 . o7 .`
    ),
    b_doom: RF(
      `o0 . . . . . . . . . . . o1 . . .  o0 . . . . . . . o6 . . . o5 . . .  o0 . . . . . . . . . . . o1 . . .  o3 . . . o4 . . . o6 . . . o7 . . .`
    ),
    b_gallop: RF(
      `p0 . p0 p0 o1 . p0 p0 p0 . p0 p0 o3 . o1 .  p0 . p0 p0 o1 . p0 p0 p0 . p0 p0 o6 . o5 .  p0 . p0 p0 o1 . p0 p0 p0 . p0 p0 o3 . o1 .  o8 . o7 . o6 . o5 . o3 . o1 . o0 . . .`
    ),
    b_dirge: RF(
      `o0 . . . . . . . . . . . . . . .  o1 . . . . . . . o0 . . . . . . .  o0 . . . . . . . . . . . o5 . . .  o4 . . . o3 . . . o1 . . . o0 . . .`
    ),
    b_march: RF(
      `p0 . p0 . p0 . p0 . o3 . . . o1 . . .  p0 . p0 . p0 . p0 . o5 . . . o3 . . .  p0 . p0 . p0 . p0 . o6 . . . o5 . . .  o7 . o6 . o5 . o3 . o1 . . . p0 p0 p0 p0`
    ),
    b_pulse: RF(
      `p0 . p0 . . . . . . . . . o1 . . .  p0 . p0 . . . . . . . . . o6 . . .  p0 . p0 . . . . . . . . . o1 . o0 .  p0 . p0 . . . . . o6 . . . o5 . o1 .`
    ),
    b_blast: RF(
      `p0 p0 p0 p0 p0 p0 p0 p0 p1 p1 p1 p1 p1 p1 p1 p1  p0 p0 p0 p0 p0 p0 p0 p0 p6 p6 p6 p6 p5 p5 p5 p5  p0 p0 p0 p0 p0 p0 p0 p0 p1 p1 p1 p1 p1 p1 p1 p1  p3 p3 p3 p3 p4 p4 p4 p4 p6 p6 p6 p6 p7 p7 p7 p7`
    ),
    // calm / dread between waves
    c_low: RF(
      `o0 . . . . . . . o1 . . . o0 . . .  o3 . . . . . . . o1 . . . . . . .  o0 . . . . . . . o6 . . . o5 . . .  o3 . . . . . . . o1 . . . p0 p0 p0 p0`
    ),
    c_still: RF(
      `o0 . . . . . . . . . . . . . . .  . . . . . . . . . . . . . . . .  o5 . . . . . . . . . . . . . . .  o3 . . . . . . . o1 . . . . . . .`
    ),
    none: RF(``),
  };
  SONGS = {
    fight: [
      ['f_main', 'std', 0],
      ['f_main', 'std', 0, 'hook'],
      ['f_gallop', 'gallop', 0],
      ['f_chorus', 'open', 0, 'hook'],
      ['f_thrash', 'thrash', 0],
      ['f_thrash', 'thrash', 5],
      ['f_chorus', 'open', 5, 'hook'],
      ['f_break', 'half', 0],
      ['f_break', 'half', 0, 'build'],
      ['f_solo', 'std', 0, 'solo'],
      ['f_solo', 'gallop', 3, 'solo'],
      ['f_chorus', 'open', 0, 'hook'],
      ['f_gallop', 'gallop', -2],
      ['f_main', 'thrash', 0],
    ],
    boss: [
      ['b_doom', 'doom', 0],
      ['b_main', 'boss', 0],
      ['b_main', 'boss', 0, 'boss'],
      ['b_blast', 'blast', 0],
      ['b_blast', 'blast', 1],
      ['b_doom', 'doom', 0, 'boss'],
      ['b_main', 'boss', 3, 'boss'],
      ['b_blast', 'blast', 0, 'solo'],
    ],
    boss_roadkill: [
      ['b_gallop', 'gallop', 0],
      ['b_gallop', 'gallop', 0, 'boss'],
      ['b_blast', 'blast', 0],
      ['b_main', 'boss', 2, 'boss'],
      ['b_gallop', 'thrash', 2, 'solo'],
      ['b_blast', 'blast', 3, 'solo'],
    ],
    boss_grave: [
      ['b_dirge', 'doom', 0, 'bells'],
      ['b_doom', 'doom', 0, 'bells'],
      ['b_dirge', 'half', -2, 'bells'],
      ['b_main', 'boss', 0, 'boss'],
      ['b_doom', 'doom', -2, 'boss'],
      ['b_blast', 'blast', 0, 'bells'],
    ],
    boss_chief: [
      ['b_march', 'march', 0],
      ['b_march', 'march', 0, 'siren'],
      ['b_main', 'boss', 0, 'boss'],
      ['b_blast', 'blast', 0],
      ['b_march', 'thrash', 3, 'siren'],
      ['b_blast', 'blast', 3, 'solo'],
    ],
    boss_pz: [
      ['b_pulse', 'heart', 1],
      ['b_pulse', 'heart', 1, 'boss'],
      ['b_doom', 'doom', 1, 'boss'],
      ['b_blast', 'blast', 1],
      ['b_pulse', 'blast', 1, 'solo'],
      ['b_main', 'boss', 6, 'boss'],
    ],
    calm: [
      ['c_still', 'none', 0, 'bells'],
      ['c_low', 'calm', 0],
      ['c_still', 'none', 5, 'arp'],
      ['c_low', 'calm', 0, 'arp'],
      ['c_still', 'none', 3, 'bells'],
      ['c_low', 'calm', -2, 'arp'],
    ],
  };
  MUS.pos = { fight: 0, boss: 0, calm: 0 };
  MUS.sec = null;
  MUS.lead = null;
  SCALE = [0, 2, 3, 5, 7, 8, 10];
  scaleNote = (deg, base = 64) => base + SCALE[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);
}
