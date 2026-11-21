/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// No pose jumps. A figure's pose is worked out afresh each frame from what it's doing, and when what it's doing
// changes (a lunge starts, a stagger ends, a gun is swapped, a reload begins) the new pose can be a long way from the
// last. When a joint turns further in a frame than it ever does in motion, the jump is taken out and given back over a fifth of
// a second: each joint's turn (against its parent) held where it was and eased into the new one, the skeleton put
// back together from the hips out, so every bone keeps its length. The hero is watched in his arms only (his trunk
// turns with the aim at once, as it should), and his gun stays in his hand while they ease.
import { GS } from '../core/gs.js';

const T = 0.2; // how long a jump takes to ease out
// rotation of a row (its 3×3 without the bone's scale), and the joint the row carries (where rest[b] lands)
function rot(D, q, k) {
  return [
    D[q] / k[0],
    D[q + 1] / k[1],
    D[q + 2] / k[2],
    D[q + 4] / k[0],
    D[q + 5] / k[1],
    D[q + 6] / k[2],
    D[q + 8] / k[0],
    D[q + 9] / k[1],
    D[q + 10] / k[2],
  ];
}
const mTm = (A, B) => {
    // Aᵀ·B
    const O = new Array(9);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) O[i * 3 + j] = A[i] * B[j] + A[3 + i] * B[3 + j] + A[6 + i] * B[6 + j];
    return O;
  },
  mm = (A, B) => {
    const O = new Array(9);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) O[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
    return O;
  },
  mv = (M, v) => [
    M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
    M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
    M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
  ],
  mTv = (M, v) => [
    M[0] * v[0] + M[3] * v[1] + M[6] * v[2],
    M[1] * v[0] + M[4] * v[1] + M[7] * v[2],
    M[2] * v[0] + M[5] * v[1] + M[8] * v[2],
  ];
// the angle of a turn
const angleOf = R => Math.acos(Math.max(-1, Math.min(1, (R[0] + R[4] + R[8] - 1) / 2)));
// a turn as an axis times its angle, and back
function logR(R) {
  const a = angleOf(R);
  if (a < 1e-5) return [0, 0, 0];
  const s = a / (2 * Math.sin(a));
  if (a > Math.PI - 1e-3) {
    // (a half turn: its axis from the diagonal)
    const x = Math.sqrt(Math.max(0, (R[0] + 1) / 2)),
      y = Math.sqrt(Math.max(0, (R[4] + 1) / 2)) * (R[1] < 0 ? -1 : 1),
      z = Math.sqrt(Math.max(0, (R[8] + 1) / 2)) * (R[2] < 0 ? -1 : 1);
    return [x * a, y * a, z * a];
  }
  return [(R[7] - R[5]) * s, (R[2] - R[6]) * s, (R[3] - R[1]) * s];
}
function expR(v) {
  const a = Math.hypot(v[0], v[1], v[2]);
  if (a < 1e-6) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const x = v[0] / a,
    y = v[1] / a,
    z = v[2] / a,
    c = Math.cos(a),
    s = Math.sin(a),
    C = 1 - c;
  return [
    c + x * x * C,
    x * y * C - z * s,
    x * z * C + y * s,
    y * x * C + z * s,
    c + y * y * C,
    y * z * C - x * s,
    z * x * C - y * s,
    z * y * C + x * s,
    c + z * z * C,
  ];
}

// figure e's rows in D (at o) eased out of a jump. MM: its model (rest joints, bones' parents); hero: watch only the
// arms (and keep his gun in his hand)
export function inert(e, D, o, MM, hero) {
  const r = MM.rest,
    nb = r.length,
    par = MM.bones.map(b => b[1]),
    k = [Math.hypot(D[o], D[o + 4], D[o + 8]), 0, Math.hypot(D[o + 2], D[o + 6], D[o + 10])];
  k[1] = k[0];
  if (!(k[0] > 0) || !(k[2] > 0)) return;
  // this frame's turns: each bone's against its parent (the hips' against the world)
  const R = [],
    loc = [];
  for (let b = 0; b < nb; b++) {
    R[b] = rot(D, o + b * 12, k);
    loc[b] = b ? mTm(R[par[b]], R[b]) : R[b];
  }
  const S = e._in,
    t = GS.time,
    fresh = !S || t - S.t > 0.1 || t < S.t || S.nb !== nb;
  if (fresh) {
    e._in = { t, nb, last: loc, off: null, t0: 0 };
    return;
  }
  const dt = t - S.t;
  S.t = t;
  if (dt <= 0) return;
  // a jump: a joint turned further this frame than a body turns. The hero's arms move steadily (a swapped gun or a
  // reload starting jumps them up to two radians); the dead swing theirs hard (a shamble's arms, sped to its legs,
  // can turn three quarters of a radian a frame), so only a real break in theirs counts
  const lim = hero ? Math.max(0.6, 24 * dt) : Math.max(1.0, 40 * dt);
  let jump = false;
  for (let b = 0; b < nb && !jump; b++) {
    if (hero && !(b >= 6 && b <= 13)) continue;
    if (angleOf(mTm(S.last[b], loc[b])) > lim) jump = true;
  }
  if (jump) {
    // from here, what it was showing: each joint's turn from the new one back to where it was (the hips' left be:
    // where the body faces is the game's)
    S.off = [];
    for (let b = 0; b < nb; b++) {
      const shown = S.cur ? S.cur[b] : S.last[b];
      S.off[b] = b ? logR(mm(shown, mTm(loc[b], [1, 0, 0, 0, 1, 0, 0, 0, 1]))) : [0, 0, 0];
    }
    S.t0 = t;
  }
  S.last = loc;
  S.cur = null;
  if (!S.off) return;
  const u = (t - S.t0) / T;
  if (u >= 1) {
    S.off = null;
    return;
  }
  const f = (1 - u) * (1 - u) * (1 + 2 * u); // (eased out: smooth at both ends)
  // the skeleton put back together, hips out: each joint's turn the new one turned back toward the old by f
  const Rw = [],
    J = [],
    cur = [],
    hand = hero ? { R: R[9], J: null } : null;
  for (let b = 0; b < nb; b++) {
    const q = o + b * 12,
      L = b ? mm(expR(S.off[b].map(x => x * f)), loc[b]) : loc[b];
    cur[b] = L;
    Rw[b] = b ? mm(Rw[par[b]], L) : L;
    if (b === 0)
      J[0] = [D[q + 3] + rowJ(D, q, r[0])[0], D[q + 7] + rowJ(D, q, r[0])[1], D[q + 11] + rowJ(D, q, r[0])[2]];
    else {
      const d = mv(Rw[par[b]], [
        (r[b][0] - r[par[b]][0]) * k[0],
        (r[b][1] - r[par[b]][1]) * k[1],
        (r[b][2] - r[par[b]][2]) * k[2],
      ]);
      J[b] = [J[par[b]][0] + d[0], J[par[b]][1] + d[1], J[par[b]][2] + d[2]];
    }
    if (hero && b === 9)
      hand.J = [D[q + 3] + rowJ(D, q, r[9])[0], D[q + 7] + rowJ(D, q, r[9])[1], D[q + 11] + rowJ(D, q, r[9])[2]];
    // the row: the turn scaled as the bone is, and placed so rest[b] lands on its joint
    const M = Rw[b],
      j0 = [
        M[0] * k[0] * r[b][0] + M[1] * k[1] * r[b][1] + M[2] * k[2] * r[b][2],
        M[3] * k[0] * r[b][0] + M[4] * k[1] * r[b][1] + M[5] * k[2] * r[b][2],
        M[6] * k[0] * r[b][0] + M[7] * k[1] * r[b][1] + M[8] * k[2] * r[b][2],
      ];
    for (let i = 0; i < 3; i++) {
      D[q + i * 4] = M[i * 3] * k[0];
      D[q + i * 4 + 1] = M[i * 3 + 1] * k[1];
      D[q + i * 4 + 2] = M[i * 3 + 2] * k[2];
      D[q + i * 4 + 3] = J[b][i] - j0[i];
    }
  }
  S.cur = cur;
  // the gun with the hand it's in
  if (hero && e._grip && e._gunR && hand.J) {
    const g = mTv(hand.R, [e._grip[0] - hand.J[0], e._grip[1] - hand.J[1], e._grip[2] - hand.J[2]]),
      gR = mTm(hand.R, e._gunR),
      p = mv(Rw[9], g);
    e._grip = [J[9][0] + p[0], J[9][1] + p[1], J[9][2] + p[2]];
    e._gunR = mm(Rw[9], gR);
  }
}
// where a row puts rest point v, less its translation (row q of D, scaled)
const rowJ = (D, q, v) => [
  D[q] * v[0] + D[q + 1] * v[1] + D[q + 2] * v[2],
  D[q + 4] * v[0] + D[q + 5] * v[1] + D[q + 6] * v[2],
  D[q + 8] * v[0] + D[q + 9] * v[1] + D[q + 10] * v[2],
];
