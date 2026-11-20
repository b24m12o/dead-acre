/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Real motion for the figures, from Quaternius' Universal Animation Library (CC0: free for any use, no credit
// needed; https://quaternius.com/packs/universalanimationlibrary.html). Reads its FBX (the Standard pack) and writes
// src/render/motion.js: for each loop we use, how its body moves over one stride, sampled at N points and measured in
// leg lengths so it fits any of our figures: each foot's track under the hips (along, across, up, its pitch: the roll
// from heel to toe), the hips' rise, sway and turn, and the chest's counter-swing; plus the stride's length and the part
// of it each foot is down. fig3d.js lays the figures' own planted steps over it (the feet still go wherever the body
// is going: these loops only walk forward).
//   npm i --no-save three@0.170.0   (only this tool needs it)
//   node tools/anim/ual.mjs path/to/UAL1_Standard.fbx
import { readFileSync, writeFileSync } from 'node:fs';
globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({ style: {} }) };
const THREE = await import(process.env.THREE ? process.env.THREE + '/build/three.module.js' : 'three');
const { FBXLoader } = await import(
  (process.env.THREE ? process.env.THREE + '/examples/jsm' : 'three/examples/jsm') + '/loaders/FBXLoader.js'
);

const buf = readFileSync(process.argv[2]);
const obj = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
const B = {};
obj.traverse(o => {
  if (o.isBone) B[o.name] = o;
});
const mixer = new THREE.AnimationMixer(obj);
// theirs (z up, facing -y, their right at -x) to ours (x forward, y to the right, z up)
const our = v => [-v.y, -v.x, v.z];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  nrm = a => {
    const l = Math.hypot(...a) || 1;
    return a.map(x => x / l);
  },
  cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// a frame (row-major 3×3, columns forward, right, up) from a right-pointing and an up-pointing vector
const frame = (r, u) => {
  r = nrm(r);
  u = nrm(
    sub(
      u,
      r.map(x => x * dot(u, r))
    )
  );
  const f = cross(r, u);
  return [f[0], r[0], u[0], f[1], r[1], u[1], f[2], r[2], u[2]];
};
const mT = m => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]],
  mm = (a, b) => {
    const o = [];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) o.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]);
    return o;
  };
// a rotation as axis × angle (blends well for the small turns of a stride)
const rotvec = m => {
  const c = Math.max(-1, Math.min(1, (m[0] + m[4] + m[8] - 1) / 2)),
    th = Math.acos(c);
  if (th < 1e-5) return [0, 0, 0];
  const k = th / (2 * Math.sin(th));
  return [(m[7] - m[5]) * k, (m[2] - m[6]) * k, (m[3] - m[1]) * k];
};
const JOINTS = [
  'pelvis',
  'spine_01',
  'spine_03',
  'neck_01',
  'thigh_r',
  'thigh_l',
  'foot_r',
  'foot_l',
  'ball_r',
  'ball_l',
  'upperarm_r',
  'upperarm_l',
  'lowerarm_r',
  'lowerarm_l',
  'hand_r',
  'hand_l',
];
function pose(name, t) {
  const clip = obj.animations.find(c => c.name === 'Armature|' + name);
  mixer.stopAllAction();
  mixer.clipAction(clip).play();
  mixer.setTime(t);
  obj.updateMatrixWorld(true);
  const P = {};
  for (const j of JOINTS) {
    const v = new THREE.Vector3();
    B[j].getWorldPosition(v);
    P[j] = our(v);
  }
  return { P, dur: clip.duration };
}
// their standing figure: its hips' height (a leg's length, near enough), and the rest of its feet and frames
const idle = pose('Idle_Loop', 0).P;
const H = (idle.thigh_r[2] + idle.thigh_l[2]) / 2;
const footPitch = (P, s) => {
  const d = sub(P['ball_' + s], P['foot_' + s]);
  return Math.atan2(-d[2], Math.hypot(d[0], d[1])); // + toes down
};
const pitch0 = (footPitch(idle, 'r') + footPitch(idle, 'l')) / 2,
  ankle0 = (idle.foot_r[2] + idle.foot_l[2]) / 2;
const pelvisF = P => frame(sub(P.thigh_r, P.thigh_l), sub(P.spine_01, P.pelvis)),
  chestF = P => frame(sub(P.upperarm_r, P.upperarm_l), sub(P.neck_01, P.spine_03));
const P0inv = mT(pelvisF(idle)),
  C0inv = mT(mm(mT(pelvisF(idle)), chestF(idle)));
const N = 48,
  q = x => Math.round(x * 1000) / 1000;
function loop(name) {
  const dur = pose(name, 0).dur,
    M = 240,
    raw = [];
  for (let i = 0; i < M; i++) raw.push(pose(name, (dur * i) / M).P);
  // each foot's track under the hips
  const along = (P, s) => P['foot_' + s][0] - P.pelvis[0];
  // when each foot is down: its heel or its toes within a little of their lowest (rolling up on to the toes it's still
  // down)
  const zmin = (s, j) => Math.min(...raw.map(P => P[j + '_' + s][2]));
  const Z = { r: [zmin('r', 'foot'), zmin('r', 'ball')], l: [zmin('l', 'foot'), zmin('l', 'ball')] };
  const down = (P, s) => Math.min(P['foot_' + s][2] - Z[s][0], P['ball_' + s][2] - Z[s][1]) < 0.03 * H;
  // the right foot's time on the ground: the longest run of it (round the loop's end too); the stride starts as it lands
  let best = 0,
    i0 = 0;
  for (let i = 0; i < M; i++) {
    if (!down(raw[i], 'r') || down(raw[(i - 1 + M) % M], 'r')) continue;
    let n = 0;
    while (n < M && down(raw[(i + n) % M], 'r')) n++;
    if (n > best) {
      best = n;
      i0 = i;
    }
  }
  const at = i => raw[(i0 + i) % M];
  const st = best / M;
  if (!best) return null;
  // the ground a stride covers: what the planted foot is carried back while it's down, at that rate the whole stride
  const v = (along(at(0), 'r') - along(at(best - 1), 'r')) / (((best - 1) * dur) / M), // metres a second, theirs
    S = (v * dur) / H; // a stride's length, in leg lengths
  const mz = raw.reduce((a, P) => a + P.pelvis[2], 0) / M,
    my = raw.reduce((a, P) => a + P.pelvis[1], 0) / M,
    mx = raw.reduce((a, P) => a + P.pelvis[0], 0) / M;
  const rows = [];
  for (let k = 0; k < N; k++) {
    const P = at(Math.round((k * M) / N)),
      Fp = pelvisF(P),
      Fc = chestF(P),
      foot = s => [
        q((P['foot_' + s][0] - P.pelvis[0]) / H),
        q((P['foot_' + s][1] - P.pelvis[1]) / H),
        q((P['foot_' + s][2] - ankle0) / H),
        q(footPitch(P, s) - pitch0),
      ];
    rows.push([
      ...foot('r'),
      ...foot('l'),
      q((P.pelvis[0] - mx) / H),
      q((P.pelvis[1] - my) / H),
      q((P.pelvis[2] - mz) / H),
      ...rotvec(mm(Fp, P0inv)).map(q), // the hips' turn against standing
      ...rotvec(mm(mm(mT(Fp), Fc), C0inv)).map(q), // the chest's against the hips
      ...sub(P.hand_r, P.spine_03).map(x => q(x / H)), // the hands from the chest (for the unarmed)
      ...sub(P.hand_l, P.spine_03).map(x => q(x / H)),
    ]);
  }
  return { st: q(st), S: q(S), dur: q(dur), v: q(v / H), rows };
}
const OUT = {};
for (const [k, name] of [
  ['walk', 'Walk_Loop'],
  ['jog', 'Jog_Fwd_Loop'],
  ['crouch', 'Crouch_Fwd_Loop'],
]) {
  OUT[k] = loop(name);
  console.log(
    k,
    'stance',
    OUT[k].st,
    'stride',
    OUT[k].S,
    'leg lengths;',
    OUT[k].v,
    'leg lengths a second;',
    OUT[k].dur,
    's'
  );
}
writeFileSync(
  new URL('../../src/render/motion.js', import.meta.url),
  `/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Written by tools/anim/ual.mjs from Quaternius' Universal Animation Library (CC0). Each loop over one stride, from the
// right foot landing: N rows of [right foot: along, across, up, pitch; left foot: the same; the hips: along, across, up;
// their turn (axis × angle); the chest's turn on them; the right hand and the left from the chest], in leg lengths;
// st: the part of a stride a foot is down; S: a stride's length; v: speed, leg lengths a second
export const MOTION = ${JSON.stringify(OUT)};
`
);
console.log('wrote src/render/motion.js');
