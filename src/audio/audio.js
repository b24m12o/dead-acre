/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
/* =====================================================================
   Audio: effects + adaptive soundtrack
   ===================================================================== */
let ambG = null,
  ambOn = false; // the low night-wind bed: only out in the town, never over the menu
let AC = null,
  master = null,
  sfxBus = null,
  sfxDuck = null,
  radBus = null,
  radDuckEnd = 0,
  musBus = null,
  musLP = null,
  musDuck = null,
  musGate = null,
  revIn = null,
  dlyIn = null,
  noiseBuf = null,
  muted = store.get('rr_muted') === '1';
const lastPlay = {};
const MUSK = 0.95;
const MUS = { level: 'menu', want: 'menu', step: 0, nextT: 0, timer: null, loop: 0, delay: null };
function initAudio() {
  if (AC) {
    if (AC.state === 'suspended' && state !== 'pause' && !document.hidden) AC.resume();
    return;
  }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
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
    master.gain.value = muted ? 0 : meta.vol.master;
    master.connect(comp);
    sfxDuck = AC.createGain();
    sfxDuck.connect(master);
    sfxBus = AC.createGain();
    sfxBus.gain.value = meta.vol.sfx;
    sfxBus.connect(sfxDuck);
    radBus = AC.createGain();
    radBus.gain.value = meta.vol.sfx;
    radBus.connect(
      master
    ); /* the radio has its own channel, so the game can step back under a voice without pulling the voice down too */
    musBus = AC.createGain();
    musBus.gain.value = opt.music ? meta.vol.music * MUSK : 0;
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
    ambOn = false;
    src.connect(wf);
    wf.connect(wg);
    wg.connect(sfxBus);
    src.start();
    loadGunSounds();
    startMusic();
  } catch (err) {
    AC = null;
  }
}
const GUNWAV = {}; // the old compressed gun sounds are gone: the recorded set (GUNHD) always ships with the game now
const GUNVAR = { pistol: 3, rifle: 2, smg: 3, shotgun: 2, auto: 2, hunter: 2, lmg: 3 };
// recorded sounds, all CC0: full-quality guns (The Free Firearm Sound Library: 2-4 stereo takes per gun near and at mid distance, each gun's own reload, bolt, lever, pump and dry fire), zombie voices (80 CC0 creature SFX, pitched down), impacts and footsteps (Kenney Impact Sounds), ricochets (Warfork), your backups' call-outs (Kenney Voiceover Pack). Names ending in a digit are takes of one sound
let GUNHD = null; // filled in by the build (one-file version) or loaded from assets/
// the built-in gun samples (now empty: the recorded set in GUNHD replaced them): decoded once, leading silence trimmed
const SB = {};
let sfxRev = null;
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
  for (const [k, b64] of Object.entries(GUNWAV)) {
    const bin = atob(b64),
      u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    AC.decodeAudioData(u.buffer)
      .then(buf => {
        const d = buf.getChannelData(0);
        let st = 0,
          pk = 0;
        for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
        while (st < d.length && Math.abs(d[st]) < pk * 0.03) st++;
        st = Math.max(0, st - Math.floor(buf.sampleRate * 0.002));
        const out = AC.createBuffer(1, d.length - st, buf.sampleRate);
        out.copyToChannel(d.subarray(st), 0);
        SB[k] = out;
      })
      .catch(() => {});
  }
  gunHD();
}
const SBV = {};
let gunHDdone = false;
const BUD_F = new Set(['Rhonda', 'Ellie', 'Jess', 'Carmen', 'Priya', 'Nadia', 'Trish', 'Maria', 'Dr. Hale']),
  budKey = (b, k) =>
    'bud' + k + (BUD_F.has(b.nm) ? 'F' : 'M'); /* your people's call-outs, in a voice that fits the name */
function playR(k, vol, x, y, rate = 1, delay = 0) {
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
const RLD = {
    pistol: ['magOutP', 'magInP', 'slideP'],
    smg: ['magOutS', 'magInS', 'boltS'],
    rifle: ['magOutR', 'magInR', 'rack'],
    auto: ['magOutR', 'magInR', 'rack'],
    lmg: ['magOutK', 'magInK', 'rackK'],
    hunter: ['magOutH', 'magInH', 'bolt'],
  },
  DRYS = {
    pistol: 'dryP',
    smg: 'dryP',
    rifle: 'dryR',
    lmg: 'dryR',
    auto: 'dryS',
    shotgun: 'dryS',
    hunter: 'dryH',
    lever: 'dryL',
  }; /* each gun's own reload: out, in, then the slide, bolt or charging handle */
function gunHD() {
  /* the full-quality set, when this build or the asset pack has it: stereo, and every take of a shot kept so no two shots sound the same. It takes over sound by sound as each one decodes */
  if (!AC || !GUNHD || gunHDdone) return;
  gunHDdone = true;
  for (const [nm, data] of GUNHD) {
    const base = nm.replace(/\d+$/, ''),
      b = typeof data === 'string' ? Uint8Array.from(atob(data), c => c.charCodeAt(0)).buffer : data.slice(0);
    AC.decodeAudioData(b)
      .then(buf => {
        (SBV[base] = SBV[base] || []).push(buf);
      })
      .catch(() => {});
  }
}
function playS(k, vol, rate = 1, delay = 0, rev = 0.25) {
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
  if (hv) vol *= 1.33;
  /* the stereo takes keep their natural dynamics, so they sit a little lower than the old squashed mono ones */ src.playbackRate.value =
    rate * rand(0.96, 1.04);
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
  return true;
}
function duck() {
  if (!musDuck || !thr('duck', 150)) return;
  const t = AC.currentTime;
  musDuck.gain.cancelScheduledValues(t);
  musDuck.gain.setTargetAtTime(t < radDuckEnd ? RD_MUS * 0.56 : 0.56, t, 0.01);
  musDuck.gain.setTargetAtTime(t + 0.12 < radDuckEnd ? RD_MUS : 1, t + 0.12, 0.35);
  if (t + 0.12 < radDuckEnd) musDuck.gain.setTargetAtTime(1, radDuckEnd, 0.45);
} // the music steps back for the big sounds
function stab(frets, dur) {
  // a muted power-chord stab from the soundtrack's guitar instead of an arcade chime
  if (!AC) return;
  if (opt.music && meta.vol.music > 0.02 && typeof mGtr === 'function') {
    const K = MUS.sec ? MUS.sec.key || 0 : 0;
    frets.forEach((fr, i) => mGtr(fr + K, AC.currentTime + 0.01 + i * 0.13, dur, false, 0.55));
    return;
  } // in the key the band is playing in
  frets.forEach((fr, i) => {
    tone(mtof(40 + fr), dur, 'sawtooth', 0.05, 1, i * 0.13, 900);
    noise(0.06, 0.05, 2500, 900, 'bandpass', i * 0.13);
  });
}
function thr(k, ms) {
  const n = performance.now();
  if (lastPlay[k] && n - lastPlay[k] < ms) return false;
  lastPlay[k] = n;
  return true;
}
function tone(f, dur, type, vol, slide = 1, delay = 0, filt = 0, bus) {
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
function noise(dur, vol, f0, f1, type = 'lowpass', delay = 0, bus, when) {
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
function spat(x, y) {
  if (!AC || !P || x === undefined || state === 'menu') return undefined;
  const dx = x - P.x,
    d = Math.hypot(dx, y - P.y),
    g = AC.createGain();
  g.gain.value = clamp(1.25 - d / 900, 0.15, 1.1);
  let out = g;
  if (opt.los && !sightClear(P.x, P.y, x, y)) {
    const f = AC.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 520;
    out.connect(f);
    out = f;
  }
  if (AC.createStereoPanner) {
    const pn = AC.createStereoPanner();
    pn.pan.value = clamp(dx / (viewW * 0.55), -0.9, 0.9);
    out.connect(pn);
    out = pn;
  }
  out.connect(sfxBus);
  return g;
}
