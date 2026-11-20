/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A BVH motion-capture file read: its joints (name, parent, offset, channels) and its frames; posed, each joint's place
// and turn in the world at a frame (3×3 rows, the file's own axes: y up)
import { readFileSync } from 'node:fs';

export function readBVH(path) {
  const tx = readFileSync(path, 'utf8').split(/\r?\n/),
    joints = [],
    stack = [];
  let i = 0,
    last = null;
  for (; i < tx.length; i++) {
    const l = tx[i].trim(),
      w = l.split(/\s+/);
    if (w[0] === 'ROOT' || w[0] === 'JOINT') {
      last = { name: w[1], parent: stack.length ? stack[stack.length - 1] : -1, off: [0, 0, 0], ch: [], end: null };
      joints.push(last);
    } else if (w[0] === 'End') last = { endOf: joints.length - 1 };
    else if (w[0] === '{') stack.push(last && last.endOf === undefined ? joints.length - 1 : -2);
    else if (w[0] === '}') stack.pop();
    else if (w[0] === 'OFFSET') {
      const o = w.slice(1, 4).map(Number);
      if (last.endOf !== undefined) joints[last.endOf].end = o;
      else last.off = o;
    } else if (w[0] === 'CHANNELS') last.ch = w.slice(2);
    else if (w[0] === 'MOTION') break;
  }
  // (a '{' for an End Site pushes -2, popped with it)
  const n = +tx[i + 1].split(':')[1],
    dt = +tx[i + 2].split(':')[1],
    frames = [];
  for (let f = 0; f < n; f++) frames.push(tx[i + 3 + f].trim().split(/\s+/).map(Number));
  return { joints, frames, dt };
}
const rot = (ax, a) => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return ax === 'X'
    ? [1, 0, 0, 0, c, -s, 0, s, c]
    : ax === 'Y'
      ? [c, 0, s, 0, 1, 0, -s, 0, c]
      : [c, -s, 0, s, c, 0, 0, 0, 1];
};
export const mm = (a, b) => {
  const o = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) o.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]);
  return o;
};
export const mv = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
// every joint's world place and turn at frame f (null f: the rest pose, every turn zero)
export function poseBVH(B, f) {
  const F = f === null ? null : B.frames[f],
    P = [],
    R = [];
  let k = 0;
  B.joints.forEach((j, idx) => {
    let r = [1, 0, 0, 0, 1, 0, 0, 0, 1],
      t = j.off;
    for (const c of j.ch) {
      const v = F ? F[k] : 0;
      k++;
      if (c.endsWith('position')) {
        if (F) t = t === j.off ? [...j.off] : t;
        if (F) t['XYZ'.indexOf(c[0])] += v;
      } else r = mm(r, rot(c[0], (v * Math.PI) / 180));
    }
    if (j.parent < 0) {
      P[idx] = t;
      R[idx] = r;
    } else {
      const pr = R[j.parent],
        d = mv(pr, t);
      P[idx] = [P[j.parent][0] + d[0], P[j.parent][1] + d[1], P[j.parent][2] + d[2]];
      R[idx] = mm(pr, r);
    }
  });
  return { P, R };
}
