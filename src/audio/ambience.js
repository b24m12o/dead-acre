/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The world beyond the screen. Under the wind each place on the road has its own sound: the river under the bridge,
// the wind across the quarry pit, the motel's neon humming, the hospital's dead mains. And now and then, from far
// off, something happens that has nothing to do with you: a few shots, a siren winding down, a scream, the
// cemetery bell, a sign creaking. Quiet, wide, and never during a boss: it is the town being bigger than the street
// you are standing in.
import { GS } from '../core/gs.js';
import { TAU, pick, rand, randi } from '../core/util.js';
import { AC, FAR as FAR_MODE, noiseBuf, playS, sfxBus, spat } from './audio.js';
import { alarmNote } from '../game/noise.js';
import { sfx } from './sfx.js';
import { placeId } from '../world/places.js';

export const AMB = {
  gap: [20, 46], // seconds between far-off sounds
  first: [7, 14], // and before the first of a night
  fade: 1.6,
  far: [1100, 1700], // how far off they are placed, px
};
// what each place sounds like under the wind. noise: [filter, Hz, Q, gain]; hum: [[Hz, wave, gain]...] through a
// low-pass at lp; swell: how much the bed breathes
const BEDS = {
  bridge: { noise: ['bandpass', 620, 0.5, 0.045], swell: 0.25 }, // the river
  quarry: { noise: ['lowpass', 170, 0.7, 0.05], swell: 0.6 }, // wind across the pit, coming and going
  motel: {
    hum: [
      [100, 'sawtooth', 0.003],
      [200, 'sawtooth', 0.0015],
    ],
    lp: 700,
    swell: 0.15,
  }, // the neon
  hospital: {
    hum: [
      [60, 'sine', 0.009],
      [120, 'triangle', 0.0025],
    ],
    lp: 500,
    swell: 0.1,
  }, // mains hum from a building that should be dark
};
// far-off sounds by the ground you are on: [what, weight]
const FAR = {
  town: [
    ['shots', 3],
    ['siren', 1.2],
    ['scream', 1],
    ['dog', 1.2],
    ['alarm', 0.8],
  ],
  highway: [
    ['shots', 2.5],
    ['creak', 1.5],
    ['scream', 1],
    ['dog', 0.8],
    ['alarm', 1],
  ],
  cemetery: [
    ['bell', 2],
    ['shots', 1.5],
    ['scream', 1.5],
  ],
};
let bed = null; // { id, g, nodes }
GS.amb = { bed: null, n: 0, last: null, nextT: 0 };
export function resetAmbience() {
  dropBed();
  GS.amb = { bed: null, n: 0, last: null, nextT: 0 };
}
function dropBed() {
  if (!bed) return;
  const b = bed;
  bed = null;
  GS.amb.bed = null;
  if (!AC) return;
  b.g.gain.setTargetAtTime(0, AC.currentTime, AMB.fade / 3);
  setTimeout(() => {
    for (const n of b.nodes)
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    b.g.disconnect();
  }, AMB.fade * 1500);
}
function makeBed(id) {
  const B = BEDS[id],
    g = AC.createGain(),
    nodes = [];
  g.gain.value = 0;
  g.connect(sfxBus);
  if (B.noise) {
    const [type, hz, q, vol] = B.noise,
      src = AC.createBufferSource(),
      f = AC.createBiquadFilter(),
      v = AC.createGain();
    src.buffer = noiseBuf;
    src.loop = true;
    src.playbackRate.value = 0.8;
    f.type = type;
    f.frequency.value = hz;
    f.Q.value = q;
    v.gain.value = vol;
    src.connect(f);
    f.connect(v);
    v.connect(g);
    src.start();
    nodes.push(src);
  }
  if (B.hum) {
    const f = AC.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = B.lp;
    f.connect(g);
    for (const [hz, wave, vol] of B.hum) {
      const o = AC.createOscillator(),
        v = AC.createGain();
      o.type = wave;
      o.frequency.value = hz;
      v.gain.value = vol;
      o.connect(v);
      v.connect(f);
      o.start();
      nodes.push(o);
    }
  }
  g.gain.setTargetAtTime(1, AC.currentTime, AMB.fade);
  bed = { id, g, nodes, swell: B.swell || 0 };
  GS.amb.bed = id;
}
// somewhere off in a random direction, far enough to be quiet and to one side
function farPoint() {
  const a = rand(0, TAU),
    d = rand(AMB.far[0], AMB.far[1]);
  return [GS.P.x + Math.cos(a) * d, GS.P.y + Math.sin(a) * d];
}
export const FAR_OFF = {
  // somebody else's fight: a few shots from one gun, uneven, a long way off
  shots() {
    const gun = pick(['rifle_m', 'pistol_m', 'shotgun_m', 'auto_m']),
      n = gun === 'auto_m' ? randi(4, 7) : randi(2, 4),
      v = rand(0.09, 0.15); // (heard: they were 30 dB under the calm music)
    let t = 0;
    for (let i = 0; i < n; i++) {
      playS(gun, v * rand(0.8, 1.1), rand(0.86, 0.94), t, 0.7);
      t += gun === 'auto_m' ? rand(0.09, 0.14) : rand(0.35, 1.1);
    }
  },
  siren() {
    const [x, y] = farPoint();
    sfx.siren(x, y, 2, true);
  },
  scream() {
    playS('zscream', rand(0.05, 0.085), rand(0.82, 0.92), 0, 0.9);
  },
  bell() {
    const [x, y] = farPoint();
    sfx.bell(x, y);
    setTimeout(() => {
      if (GS.state !== 'play') return;
      FAR_MODE.on = true;
      try {
        sfx.bell(x, y);
      } finally {
        FAR_MODE.on = false;
      }
    }, 2300);
  },
  creak() {
    const [x, y] = farPoint();
    sfx.creak(x, y);
  },
  // a dog left behind somewhere, barking at something
  dog() {
    const [x, y] = farPoint();
    sfx.farDog(x, y);
  },
  // somebody else's car alarm, streets away: a few cycles of it, then it cuts out
  alarm() {
    const [x, y] = farPoint(),
      b = spat(x, y);
    if (!b) return;
    const v = rand(0.05, 0.075);
    let t = 0;
    for (let i = 0; i < randi(8, 14); i++) {
      alarmNote(640, 1180, 0.42, 'square', v, b, t);
      t += 0.46;
    }
  },
};
export function tickAmbience(dt) {
  if (!AC || !sfxBus) return;
  const out = GS.state !== 'menu' && GS.state !== 'over' && GS.state !== 'won' && !!GS.P && !!GS.RUN,
    id = out && !GS.P.ride && !GS.evac ? placeId() : null,
    want = id && BEDS[id] ? id : null;
  if ((bed ? bed.id : null) !== want) {
    dropBed();
    if (want) makeBed(want);
  }
  if (bed && bed.swell) {
    bed.t = (bed.t || 0) + dt;
    if (bed.t > 0.5) {
      bed.t = 0;
      const k = 1 + bed.swell * (Math.sin(GS.time * 0.23) * 0.6 + Math.sin(GS.time * 0.071 + 2) * 0.4);
      bed.g.gain.setTargetAtTime(Math.max(0.2, k), AC.currentTime, 1.2);
    }
  }
  // the far-off sounds: while you are on foot in a night or a dawn, not with a boss up, not in the thick of it
  if (GS.state !== 'play' || !out || GS.P.ride || GS.evac || (GS.boss && !GS.boss.dead) || !(GS.wave > 0)) {
    GS.amb.nextT = 0;
    return;
  }
  if (!GS.amb.nextT) GS.amb.nextT = GS.time + rand(AMB.first[0], AMB.first[1]);
  if (GS.time < GS.amb.nextT) return;
  GS.amb.nextT = GS.time + rand(AMB.gap[0], AMB.gap[1]);
  if (GS.crowd && GS.crowd.level > 0.7) return; // nobody would hear it over this
  const T = FAR[GS.RUN.district] || FAR.town,
    tw = T.reduce((s, t) => s + t[1], 0);
  let r = Math.random() * tw,
    what = T[0][0];
  for (const [k, w] of T) {
    r -= w;
    if (r <= 0) {
      what = k;
      break;
    }
  }
  if (what === GS.amb.last && T.length > 1) what = T[(T.findIndex(t => t[0] === what) + 1) % T.length][0]; // never the same twice running
  GS.amb.last = what;
  GS.amb.n++;
  FAR_MODE.on = true;
  try {
    FAR_OFF[what]();
  } finally {
    FAR_MODE.on = false;
  }
}
