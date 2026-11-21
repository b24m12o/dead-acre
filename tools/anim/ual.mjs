/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Real motion for the figures, from Quaternius' Universal Animation Library (CC0: free for any use, no credit
// needed; https://quaternius.com/packs/universalanimationlibrary.html). Reads its FBX (the Standard pack) and writes
// src/render/motion.js: for each loop we use, how its body moves over one stride, sampled at N points and measured in
// leg lengths so it fits any of our figures: each foot's track under the hips (along, across, up, its pitch: the roll
// from heel to toe), the hips' rise, sway and turn, and the chest's counter-swing; plus the stride's length and the part
// of it each foot is down. fig3d.js lays the figures' own planted steps over it (the feet still go wherever the body
// is going: these loops only walk forward).
//   npm i --no-save three@0.170.0   (only this tool needs it)
//   node tools/anim/ual.mjs path/to/UAL1_Standard.fbx [path/to/UAL2_Standard.fbx]
import { readFileSync, writeFileSync } from 'node:fs';
globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({ style: {} }) };
const THREE = await import(process.env.THREE ? process.env.THREE + '/build/three.module.js' : 'three');
const { FBXLoader } = await import(
  (process.env.THREE ? process.env.THREE + '/examples/jsm' : 'three/examples/jsm') + '/loaders/FBXLoader.js'
);

// a library's FBX: its figure, its bones by name, and a player for its clips (both libraries share one skeleton)
let obj, mixer;
const B = {};
function load(path) {
  const buf = readFileSync(path);
  obj = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  obj.traverse(o => {
    if (o.isBone) B[o.name] = o;
  });
  mixer = new THREE.AnimationMixer(obj);
}
load(process.argv[2]);
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
  let down = (P, s) => Math.min(P['foot_' + s][2] - Z[s][0], P['ball_' + s][2] - Z[s][1]) < 0.03 * H;
  // (a dragged foot never leaves the ground: it's down while it's carried back under the hips, and swinging, dragged,
  // while it's brought forward)
  if (raw.every(P => down(P, 'r'))) {
    const idx = new Map(raw.map((P, i) => [P, i]));
    down = (P, s) => {
      const i = idx.get(P);
      return along(raw[(i + 1) % M], s) - along(raw[(i - 1 + M) % M], s) < 0;
    };
  }
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
  return { st: q(st), S: q(S), dur: q(dur), v: q(v / H), ph0: q(i0 / M), rows };
}
const OUT = {};
for (const [k, name] of [
  ['walk', 'Walk_Loop'],
  ['jog', 'Jog_Fwd_Loop'],
  ['sprint', 'Sprint_Loop'],
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
// ---- every bone, as recorded: for the figures that play the clips themselves (a fuller skeleton, fig3d.js) ----
// our bones, each against the recording's: [ours, theirs, the joint its end lies at]
const FKB = [
  ['pelvis', 'pelvis', 'spine_01'],
  ['spine1', 'spine_01', 'spine_02'],
  ['spine2', 'spine_02', 'spine_03'],
  ['chest', 'spine_03', 'neck_01'],
  ['neck', 'neck_01', 'Head'],
  ['head', 'Head', null],
  ['clavR', 'clavicle_r', 'upperarm_r'],
  ['uarmR', 'upperarm_r', 'lowerarm_r'],
  ['farmR', 'lowerarm_r', 'hand_r'],
  ['handR', 'hand_r', 'middle_01_r'],
  ['clavL', 'clavicle_l', 'upperarm_l'],
  ['uarmL', 'upperarm_l', 'lowerarm_l'],
  ['farmL', 'lowerarm_l', 'hand_l'],
  ['handL', 'hand_l', 'middle_01_l'],
  ['thighR', 'thigh_r', 'calf_r'],
  ['shinR', 'calf_r', 'foot_r'],
  ['footR', 'foot_r', 'ball_r'],
  ['toeR', 'ball_r', 'ball_leaf_r'],
  ['thighL', 'thigh_l', 'calf_l'],
  ['shinL', 'calf_l', 'foot_l'],
  ['footL', 'foot_l', 'ball_l'],
  ['toeL', 'ball_l', 'ball_leaf_l'],
];
const C = [0, -1, 0, -1, 0, 0, 0, 0, 1]; // theirs to ours (a mirror: the game's y runs down the screen)
const m4to3 = e => [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]]; // three.js's column-major 4×4 → our rows
function worldR(name) {
  const m = new THREE.Matrix4().extractRotation(B[name].matrixWorld);
  return mm(mm(C, m4to3(m.elements)), C); // (C is its own inverse)
}
function quat(m) {
  const t = m[0] + m[4] + m[8];
  let w, x, y, z;
  if (t > 0) {
    const S = Math.sqrt(t + 1) * 2;
    w = S / 4;
    x = (m[7] - m[5]) / S;
    y = (m[2] - m[6]) / S;
    z = (m[3] - m[1]) / S;
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const S = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    w = (m[7] - m[5]) / S;
    x = S / 4;
    y = (m[1] + m[3]) / S;
    z = (m[2] + m[6]) / S;
  } else if (m[4] > m[8]) {
    const S = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    w = (m[2] - m[6]) / S;
    x = (m[1] + m[3]) / S;
    y = S / 4;
    z = (m[5] + m[7]) / S;
  } else {
    const S = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
    w = (m[3] - m[1]) / S;
    x = (m[2] + m[6]) / S;
    y = (m[5] + m[7]) / S;
    z = S / 4;
  }
  return [x, y, z, w];
}
function posAt(name, t) {
  const clip = obj.animations.find(c => c.name === 'Armature|' + name);
  mixer.stopAllAction();
  mixer.clipAction(clip).play();
  mixer.setTime(t);
  obj.updateMatrixWorld(true);
  return clip.duration;
}
// the reference: their T-pose. Each bone's direction in it, and its world turn (the clips are kept as turns from it)
posAt('A_TPose', 0);
const wp = n => {
  const v = new THREE.Vector3();
  B[n].getWorldPosition(v);
  return our(v);
};
const RA = FKB.map(([, m]) => worldR(m)),
  DIRA = FKB.map(([, m, e]) => (e ? nrm(sub(wp(e), wp(m))) : [0, 0, 1]).map(q)),
  PELV0 = wp('pelvis'),
  HA = (wp('thigh_r')[2] + wp('thigh_l')[2]) / 2;
const FK = { bones: FKB.map(b => b[0]), dir: DIRA, clips: {} };
const FPS = 30;
function clipsOf(list) {
  for (const [k, name, loopK] of list) {
    const dur = posAt(name, 0),
      n = Math.max(2, Math.round(dur * FPS)),
      frames = [],
      root = [];
    for (let i = 0; i < n; i++) {
      posAt(name, (dur * i) / n);
      frames.push(FKB.flatMap(([, m], b) => quat(mm(worldR(m), mT(RA[b]))).map(q)));
      root.push(sub(wp('pelvis'), PELV0).map(x => q(x / HA)));
    }
    const c = { dur: q(dur), fps: FPS, frames, root };
    if (loopK && OUT[k]) {
      // where in it the right foot lands (the stride's start, as MOTION has it), and its speed, leg lengths a second
      c.ph0 = OUT[k].ph0;
      c.v = OUT[k].v;
    }
    FK.clips[k] = c;
  }
}
clipsOf([
  ['idle', 'Idle_Loop', 0],
  ['walk', 'Walk_Loop', 1],
  ['jog', 'Jog_Fwd_Loop', 1],
  ['sprint', 'Sprint_Loop', 1],
  ['crouch', 'Crouch_Fwd_Loop', 1],
  ['roll', 'Roll', 0],
  ['hit', 'Hit_Chest', 0],
  ['hithead', 'Hit_Head', 0],
  ['death', 'Death01', 0],
  ['push', 'Push_Loop', 0],
]);
// Library 2 (its Standard pack, also CC0), if given: the dead's own walk and stance, a zombie's scratch, a hit that
// knocks one back, getting up off the ground, and an overhand throw
if (process.argv[3]) {
  load(process.argv[3]);
  // (the same skeleton: its T-pose as Library 1's, or its turns would be against another rest)
  posAt('A_TPose', 0);
  const off = Math.max(...FKB.map(([, m], b) => Math.max(...worldR(m).map((x, i) => Math.abs(x - RA[b][i]))))),
    dp = Math.hypot(...sub(wp('pelvis'), PELV0));
  console.log('Library 2 T-pose against Library 1: turns within', off.toFixed(4), '; hips', dp.toFixed(4));
  OUT.shamble = loop('Zombie_Walk_Fwd_Loop');
  console.log(
    'shamble stance',
    OUT.shamble.st,
    'stride',
    OUT.shamble.S,
    'speed',
    OUT.shamble.v,
    'dur',
    OUT.shamble.dur
  );
  clipsOf([
    ['shamble', 'Zombie_Walk_Fwd_Loop', 1],
    ['zidle', 'Zombie_Idle_Loop', 0],
    ['scratch', 'Zombie_Scratch', 0],
    ['knock', 'Hit_Knockback', 0],
    ['getup', 'LayToIdle', 0],
    ['throw', 'OverhandThrow', 0],
  ]);
}
writeFileSync(
  new URL('../../src/render/motion.js', import.meta.url),
  `/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Written by tools/anim/ual.mjs from Quaternius' Universal Animation Libraries 1 and 2 (CC0). Each loop over one stride, from the
// right foot landing: N rows of [right foot: along, across, up, pitch; left foot: the same; the hips: along, across, up;
// their turn (axis × angle); the chest's turn on them; the right hand and the left from the chest], in leg lengths;
// st: the part of a stride a foot is down; S: a stride's length; v: speed, leg lengths a second
export const MOTION = ${JSON.stringify(OUT)};
// Every bone, for a fuller skeleton (its names in bones): each clip's frames, every bone's turn in the world against
// the T-pose, as a quaternion (x, y, z, w); root: the hips' place against the T-pose's, in leg lengths; dir: each
// bone's direction in the T-pose. ph0: where in a loop the right foot lands; v: its speed, leg lengths a second
export const FK = ${JSON.stringify(FK)};
`
);
console.log('wrote src/render/motion.js');
