/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { clamp, rand, randi } from '../core/util.js';
import { opt, store } from '../core/settings.js';
import { viewW } from '../render/sprites.js';
import { loadMusic, mGtr, mtof, startMusic } from './music.js';
import { sightClear } from '../world/vision.js';
import { GK } from '../core/scale.js';
import { RD_MUS } from './radio.js';
/* =====================================================================
   Audio: effects + adaptive soundtrack
   ===================================================================== */
export let ambG = null,
  rainG = null; // (the rain's hiss on a stormy night: world/tick.js)
GS.ambOn = false; // the low night-wind bed: only out in the town, never over the menu
export let AC, master, sfxBus, sfxDuck, radBus, musBus, musLP, musDuck, musGate, revIn, dlyIn, noiseBuf;
let lastPlay;
export let MUSK;
export let MUS;
// Every sound is noted as it starts, so leaving a run can stop them all where they stand: the radio mid-sentence, a voice,
// a gunshot's tail, a held chord, the notes the band has already queued. Only the loops that run for good are left (the
// wind, the fire's crackle, the moan of the crowd, the chopper): they never call stop, and each fades by its own gain
const LIVE = new Set();
function track(n) {
  const go = n.start,
    end = n.stop;
  n.start = (...a) => {
    LIVE.add(n);
    return go.apply(n, a);
  };
  n.stop = (...a) => {
    n.fin = true;
    return end.apply(n, a);
  };
  n.addEventListener('ended', () => LIVE.delete(n));
  return n;
}
export function stopAllRun() {
  if (!AC) return 0;
  const t = AC.currentTime;
  let k = 0;
  for (const n of LIVE)
    if (n.fin || (n instanceof AudioBufferSourceNode && !n.loop)) {
      try {
        n.stop(t);
        k++;
      } catch (e) {
        /* already over */
      }
      LIVE.delete(n);
    }
  return k;
}
// Freezing the sound (the pause, a hidden tab) and waking it. A cut mid-sound clicks, and the compressors at the end of the
// chain hold the last few milliseconds of what was playing, which come out as a pop the moment it wakes. So the volume
// slides to nothing first and the freeze comes after; on waking it slides back up. A quit's own quiet (see cutRun) is left
// to run its course.
let asleep = false,
  quietTo = 0;
export const quietUntil = t => (quietTo = t);
export function sleepAudio() {
  if (!AC || !master || AC.state !== 'running') return;
  const t = AC.currentTime,
    g = master.gain;
  asleep = true;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(0, t + 0.03);
  setTimeout(() => {
    if (asleep && AC.state === 'running') AC.suspend();
  }, 60);
}
export function wakeAudio() {
  asleep = false;
  if (!AC || !master) return;
  if (AC.state === 'suspended') AC.resume();
  const t = AC.currentTime;
  if (t < quietTo) return;
  const g = master.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(GS.muted ? 0 : GS.meta.vol.master, t + 0.06);
}
export function initAudio() {
  if (AC) {
    if (AC.state === 'suspended' && GS.state !== 'pause' && !document.hidden) wakeAudio();
    return;
  }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    for (const k of ['createBufferSource', 'createOscillator', 'createConstantSource'])
      if (AC[k]) {
        const make = AC[k].bind(AC);
        AC[k] = (...a) => track(make(...a));
      }
    const comp = AC.createDynamicsCompressor();
    comp.threshold.value = -15;
    comp.knee.value = 8;
    comp.ratio.value = 3;
    comp.attack.value = 0.005;
    comp.release.value = 0.12;
    const lim = AC.createDynamicsCompressor();
    lim.threshold.value = -1.5;
    lim.knee.value = 0;
    lim.ratio.value = 20;
    lim.attack.value = 0.001;
    lim.release.value = 0.06;
    comp.connect(lim);
    lim.connect(AC.destination); // glue, then a hard ceiling so stacked booms never clip
    master = AC.createGain();
    master.gain.value = GS.muted ? 0 : GS.meta.vol.master;
    master.connect(comp);
    sfxDuck = AC.createGain();
    sfxDuck.connect(master);
    sfxBus = AC.createGain();
    sfxBus.gain.value = GS.meta.vol.sfx;
    sfxBus.connect(sfxDuck);
    radBus = AC.createGain();
    radBus.gain.value = GS.meta.vol.sfx;
    radBus.connect(
      master
    ); /* the radio has its own channel, so the game can step back under a voice without pulling the voice down too */
    musBus = AC.createGain();
    musBus.gain.value = opt.music ? GS.meta.vol.music * MUSK : 0;
    musLP = AC.createBiquadFilter();
    musLP.type = 'lowpass';
    musLP.frequency.value = 18000;
    musLP.Q.value = 0.5;
    musBus.connect(musLP);
    musDuck = AC.createGain();
    musGate = AC.createGain();
    musLP.connect(musGate);
    musGate.connect(musDuck);
    musDuck.connect(master);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const len = AC.sampleRate * 2.4,
      ir = AC.createBuffer(2, len, AC.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const dd = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = AC.createConvolver();
    conv.buffer = ir;
    revIn = AC.createGain();
    revIn.gain.value = 0.32;
    revIn.connect(conv);
    conv.connect(musBus);
    const dl = AC.createDelay(1.5);
    dl.delayTime.value = 0.4;
    const fb = AC.createGain();
    fb.gain.value = 0.32;
    const dlf = AC.createBiquadFilter();
    dlf.type = 'lowpass';
    dlf.frequency.value = 2400;
    dlyIn = AC.createGain();
    dlyIn.gain.value = 0.28;
    dlyIn.connect(dl);
    dl.connect(dlf);
    dlf.connect(fb);
    fb.connect(dl);
    dlf.connect(musBus);
    dlf.connect(revIn);
    MUS.delay = dl;
    const src = AC.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const wf = AC.createBiquadFilter();
    wf.type = 'lowpass';
    wf.frequency.value = 340;
    const wg = AC.createGain();
    wg.gain.value = 0;
    ambG = wg;
    GS.ambOn = false;
    src.connect(wf);
    wf.connect(wg);
    wg.connect(sfxBus);
    src.start();
    {
      // rain: a broad hiss on the roofs and the road, a little brighter where it hits the cars, slowly gusting
      const rs = AC.createBufferSource();
      rs.buffer = noiseBuf;
      rs.loop = true;
      rs.playbackRate.value = 0.93; // (out of step with the wind's copy of the noise)
      const hp = AC.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 700;
      const lp = AC.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7000;
      const gust = AC.createGain();
      gust.gain.value = 0.8;
      const lfo = AC.createOscillator(),
        lg = AC.createGain();
      lfo.frequency.value = 0.13;
      lg.gain.value = 0.2;
      lfo.connect(lg);
      lg.connect(gust.gain);
      rainG = AC.createGain();
      rainG.gain.value = 0;
      rs.connect(hp);
      hp.connect(lp);
      lp.connect(gust);
      gust.connect(rainG);
      rainG.connect(sfxBus);
      rs.start();
      lfo.start();
    }
    loadGunSounds();
    loadMusic();
    startMusic();
  } catch (err) {
    AC = null;
  }
}
// the recorded sounds: built into the one-file version, or loaded from assets/
GS.GUNHD = (window.__DA_DATA && window.__DA_DATA.gun) || null;
GS.MUSHD = (window.__DA_DATA && window.__DA_DATA.mus) || null; // the band's instruments (music.js)
let GUNVAR;
// recorded sounds, all CC0: full-quality guns (The Free Firearm Sound Library: 2-4 stereo takes per gun near and at mid distance, each gun's own reload, bolt, lever, pump and dry fire), zombie voices (80 CC0 creature SFX, pitched down), impacts and footsteps (Kenney Impact Sounds), ricochets (Warfork), your backups' call-outs (Kenney Voiceover Pack). Names ending in a digit are takes of one sound
let SB;
export let sfxRev;
function loadGunSounds() {
  const len = Math.floor(AC.sampleRate * 0.9),
    ir = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < AC.sampleRate * 0.012 ? 0 : 1);
    }
  }
  const cv = AC.createConvolver();
  cv.buffer = ir;
  const lp = AC.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3800;
  sfxRev = AC.createGain();
  sfxRev.gain.value = 0.5;
  sfxRev.connect(cv);
  cv.connect(lp);
  lp.connect(sfxBus);
  gunHD();
}
export let SBV;
let gunHDdone;
export let BUD_F, budKey; /* your people's call-outs, in a voice that fits the name */
export function playR(k, vol, x, y, rate = 1, delay = 0) {
  const v = SBV[k];
  if (!AC || !v) return false;
  const src = AC.createBufferSource(),
    g = AC.createGain();
  src.buffer = v[randi(0, v.length - 1)];
  src.playbackRate.value = rate * rand(0.93, 1.07);
  g.gain.value = vol;
  src.connect(g);
  g.connect(spat(x, y) || sfxBus);
  src.start(AC.currentTime + delay);
  return true;
} /* a recorded take from where it happened: panned, quieter with distance, muffled behind walls */
export let RLD, DRYS; /* each gun's own reload: out, in, then the slide, bolt or charging handle */
export function gunHD() {
  /* the full-quality set, when this build or the asset pack has it: stereo, and every take of a shot kept so no two shots sound the same. It takes over sound by sound as each one decodes */
  if (!AC || !GS.GUNHD || gunHDdone) return;
  gunHDdone = true;
  for (const [nm, data] of GS.GUNHD) {
    const base = nm.replace(/\d+$/, ''),
      b = typeof data === 'string' ? Uint8Array.from(atob(data), c => c.charCodeAt(0)).buffer : data.slice(0);
    AC.decodeAudioData(b)
      .then(buf => {
        (SBV[base] = SBV[base] || []).push(buf);
      })
      .catch(() => {});
  }
}
// sounds that fire fast enough to stack up (a belt-fed gun): only the last few of each ring on, the oldest fades
const VCAP = { lmg: 4, hit: 6 },
  VOICES = {};
export function playS(k, vol, rate = 1, delay = 0, rev = 0.25) {
  const k0 = k;
  if (!SBV[k] && /_m$/.test(k)) {
    k = k.slice(0, -2);
    vol *= 0.8;
  } /* no distant take: the near one, a little quieter */
  const hv = SBV[k];
  if (!hv && GUNVAR[k]) k = k + randi(0, GUNVAR[k] - 1);
  if (!AC || !(hv || SB[k])) return false;
  const t = AC.currentTime + delay,
    src = AC.createBufferSource(),
    g = AC.createGain();
  src.buffer = hv ? hv[randi(0, hv.length - 1)] : SB[k];
  if (hv) vol *= 1.33; // the stereo takes keep their natural dynamics, so they sit a little lower than the old squashed mono ones
  src.playbackRate.value = rate * rand(0.96, 1.04);
  g.gain.value = vol;
  src.connect(g);
  g.connect(sfxBus);
  if (rev && sfxRev) {
    const r = AC.createGain();
    r.gain.value = rev;
    g.connect(r);
    r.connect(sfxRev);
  }
  src.start(t);
  if (VCAP[k0]) {
    const L = (VOICES[k0] = VOICES[k0] || []);
    L.push([src, g]);
    while (L.length > VCAP[k0]) {
      const [os, og] = L.shift();
      try {
        og.gain.setTargetAtTime(0, AC.currentTime, 0.012);
        os.stop(AC.currentTime + 0.06);
      } catch {
        /* already ended */
      }
    } // the oldest of them fades out in a few ms: a heavy gun, not a wall of noise
  }
  return true;
}
// the music steps back for the big sounds: to `to` of itself, held `hold` s, back over `rel` (a blast goes deeper and
// longer the bigger it is, a boss's roar holds it down while it roars)
export function duck(to = 0.56, hold = 0.12, rel = 0.35) {
  if (!musDuck) return;
  const t = AC.currentTime;
  if (t < (GS.duckUntil || 0) && to >= (GS.duckTo || 1)) return; // (a deeper one is on: it isn't cut short)
  if (to >= 0.56 && !thr('duck', 150)) return;
  GS.duckUntil = t + hold;
  GS.duckTo = to;
  musDuck.gain.cancelScheduledValues(t);
  musDuck.gain.setTargetAtTime(t < GS.radDuckEnd ? RD_MUS * to : to, t, 0.01);
  musDuck.gain.setTargetAtTime(t + hold < GS.radDuckEnd ? RD_MUS : 1, t + hold, rel);
  if (t + hold < GS.radDuckEnd) musDuck.gain.setTargetAtTime(1, GS.radDuckEnd, 0.45);
}
export function stab(frets, dur) {
  // a muted power-chord stab from the soundtrack's guitar instead of an arcade chime
  if (!AC) return;
  if (opt.music && GS.meta.vol.music > 0.02 && typeof mGtr === 'function') {
    const K = MUS.sec ? MUS.sec.key || 0 : 0;
    frets.forEach((fr, i) => mGtr(fr + K, AC.currentTime + 0.01 + i * 0.13, dur, false, 0.55));
    return;
  } // in the key the band is playing in
  frets.forEach((fr, i) => {
    tone(mtof(40 + fr), dur, 'sawtooth', 0.05, 1, i * 0.13, 900);
    noise(0.06, 0.05, 2500, 900, 'bandpass', i * 0.13);
  });
}
// a throttle that lets a near one in over a far one: in a crowd every groan wants the one slot, and the first
// asked used to get it, a zombie across the map over one at your shoulder
const lastD = {};
export function thrNear(k, ms, x, y) {
  const d = GS.P && x !== undefined ? Math.hypot(x - GS.P.x, y - GS.P.y) : 0,
    n = performance.now();
  if (lastPlay[k] && n - lastPlay[k] < ms && !(d < (lastD[k] ?? 0) * 0.5 && n - lastPlay[k] > ms * 0.25)) return false;
  lastPlay[k] = n;
  lastD[k] = d;
  return true;
}
export function thr(k, ms) {
  const n = performance.now();
  if (lastPlay[k] && n - lastPlay[k] < ms) return false;
  lastPlay[k] = n;
  return true;
}
export function tone(f, dur, type, vol, slide = 1, delay = 0, filt = 0, bus) {
  if (!AC) return;
  const t = AC.currentTime + delay,
    o = AC.createOscillator(),
    g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  if (filt) {
    const fl = AC.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = filt;
    o.connect(fl);
    fl.connect(g);
  } else o.connect(g);
  g.connect(bus || sfxBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}
export function noise(dur, vol, f0, f1, type = 'lowpass', delay = 0, bus, when) {
  if (!AC) return;
  const t = when ?? AC.currentTime + delay,
    s = AC.createBufferSource();
  s.buffer = noiseBuf;
  s.playbackRate.value = rand(0.85, 1.15);
  const f = AC.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = AC.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(bus || sfxBus);
  s.start(t, rand(0, 1));
  s.stop(t + dur + 0.05);
}
// zombie voices come from where the zombie is: panned left or right, quieter with distance, muffled behind walls
// a sound in the world: louder near you, panned to its side, muffled behind a wall. The pan and the muffle are nine
// shared buses each way, so a sound costs one gain node, not three; in a big fight the far, quiet ones past a
// dozen-odd in a tenth of a second are dropped, so the near ones stay clear
let PB = null,
  SINK = null,
  spN = 0,
  spT = 0;
function panBuses() {
  if (PB && PB.ac === AC && PB.out === sfxBus) return PB;
  PB = { ac: AC, out: sfxBus, b: [[], []] };
  for (let occ = 0; occ < 2; occ++)
    for (let k = 0; k < 9; k++) {
      const pan = -0.9 + k * 0.225,
        inG = AC.createGain();
      let o = inG;
      if (occ) {
        const f = AC.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 520;
        o.connect(f);
        o = f;
      }
      if (AC.createStereoPanner) {
        const pn = AC.createStereoPanner();
        pn.pan.value = pan;
        o.connect(pn);
        o = pn;
      }
      o.connect(sfxBus);
      PB.b[occ].push(inG);
    }
  SINK = AC.createGain();
  SINK.gain.value = 0;
  return PB;
}
export const FAR = { on: false };
export function spat(x, y) {
  if (!AC || !GS.P || !Number.isFinite(x) || !Number.isFinite(y) || GS.state === 'menu' || !sfxBus) return undefined;
  const dx = x - GS.P.x,
    d = Math.hypot(dx, y - GS.P.y) / GK, // how far, against the old size of things (core/scale.js)
    B = panBuses(),
    now = AC.currentTime;
  if (now - spT > 0.1) {
    spT = now;
    spN = 0;
  }
  if (++spN > 14 && d > 350) return SINK;
  const g = AC.createGain();
  // nearer louder; and on fading past the edge of the screen (it used to stop at 0.15 there and stay, so the far ones
  // couldn't be told from the near ones just off screen). The town's own far-off life (ambience.js) is placed a
  // long way off on purpose and pitched to sound it: it keeps its side and its muffle, at a level of its own
  g.gain.value = FAR.on ? 0.6 : d < 900 ? clamp(1.25 - d / 900, 0.25, 1.1) : 0.25 * Math.exp(-(d - 900) / 900);
  const occ = d > 70 && opt.los && !sightClear(GS.P.x, GS.P.y, x, y) ? 1 : 0,
    k0 = Math.round((clamp(dx / ((viewW || 600) * 0.55), -0.9, 0.9) + 0.9) / 0.225),
    k = Number.isFinite(k0) ? k0 : 4; // (no screen yet, or a position gone bad: the middle, not an error)
  g.connect(B.b[occ][k]);
  return g;
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  AC = null;
  master = null;
  sfxBus = null;
  sfxDuck = null;
  radBus = null;
  GS.radDuckEnd = 0;
  musBus = null;
  musLP = null;
  musDuck = null;
  musGate = null;
  revIn = null;
  dlyIn = null;
  noiseBuf = null;
  GS.muted = store.get('rr_muted') === '1';
  lastPlay = {};
  MUSK = 0.95;
  MUS = { level: 'menu', want: 'menu', step: 0, nextT: 0, timer: null, loop: 0, delay: null };
  GUNVAR = { pistol: 3, rifle: 2, smg: 3, shotgun: 2, auto: 2, hunter: 2, lmg: 3 };
  SB = {};
  sfxRev = null;
  SBV = {};
  gunHDdone = false;
  BUD_F = new Set(['Rhonda', 'Ellie', 'Jess', 'Carmen', 'Priya', 'Nadia', 'Trish', 'Maria', 'Dr. Hale']);
  budKey = (b, k) => 'bud' + k + (BUD_F.has(b.nm) ? 'F' : 'M');
  RLD = {
    pistol: ['magOutP', 'magInP', 'slideP'],
    smg: ['magOutS', 'magInS', 'boltS'],
    rifle: ['magOutR', 'magInR', 'rack'],
    auto: ['magOutR', 'magInR', 'rack'],
    lmg: ['magOutK', 'magInK', 'rackK'],
    hunter: ['magOutH', 'magInH', 'bolt'],
  };
  DRYS = {
    pistol: 'dryP',
    smg: 'dryP',
    rifle: 'dryR',
    lmg: 'dryR',
    auto: 'dryS',
    shotgun: 'dryS',
    hunter: 'dryH',
    lever: 'dryL',
  };
}
