/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// More recorded motion, from the Carnegie Mellon University Graphics Lab Motion Capture Database (mocap.cs.cmu.edu:
// free for research and commercial projects; BVH conversion by B. Hahne, cgspeed.com, with no restrictions added),
// for what Quaternius' library lacks: the dead's own walks (a zombie's shamble), a limp, a hurt leg, a drunk's
// stagger, walking backward and sideways, a quick backpedal and a sideways shuffle. Each a stretch of steady going cut
// from a longer take, made a loop over a whole number of strides, turned to face forward and stood in place (its
// travel kept as a speed and a direction), its bones as the 22 of fig3d.js's fuller skeleton. Writes src/render/motion-cmu.js.
//   node tools/anim/cmu.mjs path/to/cmu-bvh/data && npx prettier --write src/render/motion-cmu.js
import { writeFileSync } from 'node:fs';
import { FK } from '../../src/render/motion.js';
import { mm, poseBVH, readBVH } from './bvh.mjs';

const DATA = process.argv[2];
// ours, theirs (and the joint its end lies at, null: its own end)
const MAP = [
  ['pelvis', 'Hips', 'LowerBack'],
  ['spine1', 'LowerBack', 'Spine'],
  ['spine2', 'Spine', 'Spine1'],
  ['chest', 'Spine1', 'Neck'],
  ['neck', 'Neck1', 'Head'],
  ['head', 'Head', null],
  ['clavR', 'RightShoulder', 'RightArm'],
  ['uarmR', 'RightArm', 'RightForeArm'],
  ['farmR', 'RightForeArm', 'RightHand'],
  ['handR', 'RightHand', 'RightFingerBase'],
  ['clavL', 'LeftShoulder', 'LeftArm'],
  ['uarmL', 'LeftArm', 'LeftForeArm'],
  ['farmL', 'LeftForeArm', 'LeftHand'],
  ['handL', 'LeftHand', 'LeftFingerBase'],
  ['thighR', 'RightUpLeg', 'RightLeg'],
  ['shinR', 'RightLeg', 'RightFoot'],
  ['footR', 'RightFoot', 'RightToeBase'],
  ['toeR', 'RightToeBase', null],
  ['thighL', 'LeftUpLeg', 'LeftLeg'],
  ['shinL', 'LeftLeg', 'LeftFoot'],
  ['footL', 'LeftFoot', 'LeftToeBase'],
  ['toeL', 'LeftToeBase', null],
];
// the clips: [ours, file, from, to (seconds: a steady stretch of it), mirrored (its left for its right)]
const CLIPS = [
  ['zwalk', '104/104_41.bvh', 3.0, 11.4], // ZombieWalk
  ['zwalk2', '120/120_22.bvh', 5.4, 9.8], // Zombie
  ['walk', '069/69_01.bvh', 1.4, 3.8], // walk forward
  ['back', '069/69_34.bvh', 1.1, 3.8], // walk backwards
  ['side', '069/69_42.bvh', 0.9, 4.2], // walk sideways
  ['sideM', '069/69_42.bvh', 0.9, 4.2, 1], // the same, to the other side
  ['limp', '091/91_16.bvh', 3.1, 7.0], // Limp
  ['hurt', '091/91_24.bvh', 6.8, 15.6], // HurtLegWalk
  ['drunk', '091/91_09.bvh', 4.2, 14.8], // DrunkWalk
  ['bpedal', '006/06_06.bvh', 0.3, 3.0], // basketball: backward dribble (a quick backpedal)
  ['shuf', '006/06_08.bvh', 0.5, 2.7], // basketball: sideways dribble (a shuffle)
  ['shufM', '006/06_08.bvh', 0.5, 2.7, 1],
];
// a bone's other-side twin (mirrored clips take it)
const TWIN = [0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 6, 7, 8, 9, 18, 19, 20, 21, 14, 15, 16, 17];
// the shortest turn taking a to b (both unit)
function rotTo(a, b) {
  const v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    k = 1 / (1 + c);
  return [
    v[0] * v[0] * k + c,
    v[0] * v[1] * k - v[2],
    v[0] * v[2] * k + v[1],
    v[1] * v[0] * k + v[2],
    v[1] * v[1] * k + c,
    v[1] * v[2] * k - v[0],
    v[2] * v[0] * k - v[1],
    v[2] * v[1] * k + v[0],
    v[2] * v[2] * k + c,
  ];
}
const C = [0, 0, 1, -1, 0, 0, 0, 1, 0]; // theirs (y up, facing +z, its left +x) to ours (x forward, y right, z up)
const CT = [0, -1, 0, 0, 0, 1, 1, 0, 0];
const our = v => [v[2], -v[0], v[1]];
const Rz = a => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
const q3 = x => Math.round(x * 1000) / 1000;
function quat(m) {
  const t = m[0] + m[4] + m[8];
  let w, x, y, z;
  if (t > 0) {
    const S = Math.sqrt(t + 1) * 2;
    [w, x, y, z] = [S / 4, (m[7] - m[5]) / S, (m[2] - m[6]) / S, (m[3] - m[1]) / S];
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const S = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    [w, x, y, z] = [(m[7] - m[5]) / S, S / 4, (m[1] + m[3]) / S, (m[2] + m[6]) / S];
  } else if (m[4] > m[8]) {
    const S = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    [w, x, y, z] = [(m[2] - m[6]) / S, (m[1] + m[3]) / S, S / 4, (m[5] + m[7]) / S];
  } else {
    const S = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
    [w, x, y, z] = [(m[3] - m[1]) / S, (m[2] + m[6]) / S, (m[5] + m[7]) / S, S / 4];
  }
  return w < 0 ? [-x, -y, -z, -w] : [x, y, z, w];
}
const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
const OUT = {};
for (const [key, file, a0, a1, mir] of CLIPS) {
  const B = readBVH(DATA + '/' + file),
    J = n => B.joints.findIndex(j => j.name === n),
    idx = MAP.map(([, m, e]) => [J(m), e ? J(e) : -1]),
    rest = poseBVH(B, null),
    H = rest.P[J('Hips')][1] - Math.min(rest.P[J('RightFoot')][1], rest.P[J('LeftFoot')][1]); // a leg's length, about
  // each bone's rest direction here; its turns taken onto motion.js's rest (FK.dir), so that both blend as one
  // (some of CMU's joints sit on top of the next: the hips on the lower back, the upper spine on the neck, a hand on its
  // finger base. A bone's direction is then taken on down the chain, to the first joint that isn't where it is)
  const kids = j => B.joints.map((q, i) => (q.parent === j ? i : -1)).filter(i => i >= 0),
    DIR = idx.map(([j, e], b) => {
      let d = e >= 0 ? our(rest.P[e].map((x, i) => x - rest.P[j][i])) : b === 5 ? [0, 0, 1] : our(B.joints[j].end);
      for (let at = e, n = 0; Math.hypot(...d) < 1e-6 && at >= 0 && n < 4; n++) {
        const c = kids(at);
        if (c.length) {
          at = c[0];
          d = our(rest.P[at].map((x, i) => x - rest.P[j][i]));
        } else {
          d = our(B.joints[at].end || [0, 0, 0]);
          at = -1;
        }
      }
      const l = Math.hypot(...d);
      if (!(l > 1e-6)) throw new Error(`${key}: bone ${b} has no direction`);
      return d.map(x => x / l);
    }),
    REB = DIR.map((d, b) =>
      rotTo(
        FK.dir[b].map(x => x / Math.hypot(...FK.dir[b])),
        d
      )
    );
  // standing, the hips' height over the lowest of the feet and toes
  const low = p => Math.min(...['RightFoot', 'LeftFoot', 'RightToeBase', 'LeftToeBase'].map(n => p.P[J(n)][1])),
    H0 = rest.P[J('Hips')][1] - low(rest);
  // every frame from a0 to a1 (the whole take when not given, less its first second and last)
  const n = B.frames.length,
    f0 = Math.max(1, Math.round((a0 ?? 1) / B.dt)),
    f1 = Math.min(n - 1, Math.round((a1 ?? n * B.dt - 1) / B.dt)),
    S = [];
  for (let f = f0; f <= f1; f++) {
    const p = poseBVH(B, f),
      hip = our(p.P[J('Hips')]),
      Rh = mm(mm(C, p.R[J('Hips')]), CT),
      face = Math.atan2(Rh[3], Rh[0]);
    S.push({ p, hip, face, low: low(p) });
  }
  const ground = Math.min(...S.map(q => q.low));
  // its heading, smoothed over a stride or so; its path likewise
  const W = Math.round(0.6 / B.dt),
    sm = (i, g) => {
      let a = 0,
        k = 0;
      for (let j = Math.max(0, i - W); j <= Math.min(S.length - 1, i + W); j++) {
        a += g(S[j]);
        k++;
      }
      return a / k;
    };
  S.forEach((s, i) => {
    let sx = 0,
      sy = 0;
    for (let j = Math.max(0, i - W); j <= Math.min(S.length - 1, i + W); j++) {
      sx += Math.cos(S[j].face);
      sy += Math.sin(S[j].face);
    }
    s.h = Math.atan2(sy, sx);
    s.cx = sm(i, q => q.hip[0]);
    s.cy = sm(i, q => q.hip[1]);
  });
  // the right foot's landings: near the ground and still (against the body's own going)
  const RF = J('RightFoot'),
    fp = i => S[Math.max(0, Math.min(S.length - 1, i))].p.P[RF],
    fv = i => Math.hypot(fp(i + 3)[0] - fp(i - 3)[0], fp(i + 3)[2] - fp(i - 3)[2]) / (6 * B.dt) / H,
    hv =
      (S.length > 1 ? Math.hypot(S[S.length - 1].cx - S[0].cx, S[S.length - 1].cy - S[0].cy) / (S.length * B.dt) : 0) /
      H,
    down = S.map((s, i) => fv(i) < Math.max(0.12, 0.45 * hv) && fp(i)[1] < ground + 0.12 * H);
  // (a moment's flicker either way is no step)
  for (let i = 2; i < S.length - 2; i++)
    if (down[i - 2] === down[i + 2] && down[i] !== down[i - 2]) down[i] = down[i - 2];
  const lands = [];
  for (let i = 1; i < S.length; i++) if (down[i] && !down[i - 1]) lands.push(i);
  // a whole number of strides, the most that fit
  const i0 = lands[0],
    i1 = lands[lands.length - 1];
  if (lands.length < 2) {
    console.log(key, 'no strides found');
    continue;
  }
  let st = 0;
  for (let i = i0; i < i1; i++) st += down[i] ? 1 : 0;
  st /= i1 - i0;
  // its going: speed and direction against its heading
  const dx = S[i1].cx - S[i0].cx,
    dy = S[i1].cy - S[i0].cy,
    T = (i1 - i0) * B.dt,
    hm = S[Math.round((i0 + i1) / 2)].h,
    go = Math.atan2(dy, dx) - hm;
  // 30 frames a second of it, turned to face forward, stood in place
  const N = Math.max(2, Math.round(T * 30)),
    frames = [],
    root = [],
    one = i => {
      const s = S[Math.max(0, i)],
        Ru = Rz(-s.h),
        Q = [],
        d = [s.hip[0] - s.cx, s.hip[1] - s.cy],
        c = Math.cos(-s.h),
        sn = Math.sin(-s.h);
      for (let b = 0; b < 22; b++) {
        const src = mir ? TWIN[b] : b;
        let m = mm(mm(Ru, mm(mm(C, s.p.R[idx[src][0]]), CT)), REB[src]);
        if (mir) m = [m[0], -m[1], m[2], -m[3], m[4], -m[5], m[6], -m[7], m[8]];
        Q.push(...quat(m));
      }
      const r = [(c * d[0] - sn * d[1]) / H, (sn * d[0] + c * d[1]) / H, (s.hip[2] - ground - H0) / H];
      if (mir) r[1] = -r[1];
      return { Q, r };
    };
  // its seam: over the last fifth of a second, eased toward what came just before its first frame
  const K = Math.round(0.2 / B.dt);
  for (let k = 0; k < N; k++) {
    const i = i0 + Math.round(((i1 - i0) * k) / N),
      a = one(i),
      u = (i - (i1 - K)) / K;
    if (u > 0 && i0 - (i1 - i) >= 0) {
      const b = one(i0 - (i1 - i)),
        w = u * u * (3 - 2 * u);
      for (let q = 0; q < 22; q++) {
        let dd = 0;
        for (let j = 0; j < 4; j++) dd += a.Q[q * 4 + j] * b.Q[q * 4 + j];
        const sg = dd < 0 ? -1 : 1;
        for (let j = 0; j < 4; j++) a.Q[q * 4 + j] += (b.Q[q * 4 + j] * sg - a.Q[q * 4 + j]) * w;
        const l = Math.hypot(...a.Q.slice(q * 4, q * 4 + 4));
        for (let j = 0; j < 4; j++) a.Q[q * 4 + j] /= l;
      }
      for (let j = 0; j < 3; j++) a.r[j] += (b.r[j] - a.r[j]) * w;
    }
    frames.push(a.Q.map(q3));
    root.push(a.r.map(q3));
  }
  // its seam: the last tenth of a second eased into the first frame
  OUT[key] = {
    src: 'cmu',
    dur: q3(T),
    fps: N / T,
    frames,
    root,
    ph0: mir ? 0.5 : 0, // (strides: mirrored, its right foot lands half a stride in)
    ns: lands.length - 1,
    st: q3(st),
    v: q3(Math.hypot(dx, dy) / T / H),
    go: q3(ang(mir ? -go : go)),
  };
  console.log(
    key,
    'strides',
    lands.length - 1,
    'over',
    T.toFixed(2),
    's; speed',
    OUT[key].v,
    'legs/s; going',
    ((OUT[key].go * 180) / Math.PI).toFixed(0),
    '°; down',
    OUT[key].st
  );
}
writeFileSync(
  new URL('../../src/render/motion-cmu.js', import.meta.url),
  `/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Written by tools/anim/cmu.mjs from the CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu). The data used in
// this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.
// As motion.js's FK: each clip's frames (the 22 bones' turns, against FK's rest, quaternions), root (the hips about
// their path, in leg lengths), dur, ns (the strides in it), ph0 (where in a stride it starts), v (leg lengths a second), st (the part of a stride a foot is down), go (its
// direction of going against where it faces, radians: 0 forward, + to the right)
export const FKC = ${JSON.stringify(OUT)};
`
);
console.log('wrote src/render/motion-cmu.js');
