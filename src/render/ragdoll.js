/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The dead fall as bodies fall. At the moment of death a figure's joints become weights on stiff links: its hips and
// chest each a rigid block with a spine between that gives a little, its head on its neck, its knees bending only the
// way knees bend. It falls under its own weight from the pose it died in, toppled the way the game threw it (harder
// for buckshot or a blast), comes down on the street, slumps against a wall or a car it meets, and lies as it landed.
// The game still decides where the body goes (it slides it, piles it, paints it into the ground): the hips are kept
// to that place and the rest of it follows. Still, its pose is kept for as long as it lies there. A zombie knocked
// off its feet goes down the same way (and lies as it fell until it gets up: fig3d.js's knockPose).
import { GS } from '../core/gs.js';
import { PER_M } from '../core/scale.js';
import { blockPt } from '../world/nav.js';
import { supOK } from './draw-bodies.js';

// the weights: each bone's joint (the 22, fig3d.js's skeleton), then the ends of the head, the hands and the toes
const NP = 27,
  PAR = [-1, 0, 1, 2, 3, 4, 3, 6, 7, 8, 3, 10, 11, 12, 0, 14, 15, 16, 0, 18, 19, 20],
  END = [1, 2, 3, 4, 5, 22, 7, 8, 9, 23, 11, 12, 13, 24, 15, 16, 17, 25, 19, 20, 21, 26],
  G = 9.8 * PER_M;
// the links: [a, b, stiffness, no nearer than (a part of the length; 0: keep the length)]
const LINKS = (() => {
  const L = [];
  for (let b = 0; b < 22; b++) L.push([b, END[b], 1, 0]);
  for (let b = 0; b < 22; b++) if (PAR[b] >= 0 && END[PAR[b]] !== b) L.push([PAR[b], b, 1, 0]);
  // the hips a block, the chest a block (shoulders and all), the feet rigid
  for (const [a, b] of [
    [1, 14],
    [1, 18],
    [14, 18],
    [2, 14],
    [2, 18],
    [3, 7],
    [3, 11],
    [7, 11],
    [4, 7],
    [4, 11],
    [2, 7],
    [2, 11],
    [6, 11],
    [10, 7],
    [16, 25],
    [20, 26],
  ])
    L.push([a, b, 1, 0]);
  // the spine giving a little between them; the head held up some by the neck; the ankles and wrists stiffish
  for (const [a, b, s] of [
    [0, 3, 0.3],
    [14, 7, 0.15],
    [18, 11, 0.15],
    [22, 3, 0.5],
    [22, 7, 0.3],
    [22, 11, 0.3],
    [15, 17, 0.6],
    [19, 21, 0.6],
    [8, 23, 0.5],
    [12, 24, 0.5],
  ])
    L.push([a, b, s, 0]);
  // a knee or an elbow folds only so far
  for (const [a, b, m] of [
    [14, 16, 0.42],
    [18, 20, 0.42],
    [7, 9, 0.3],
    [11, 13, 0.3],
  ])
    L.push([a, b, 1, m]);
  return L;
})();
// how thick the body is at each weight (its legs' length the measure): the head, the trunk, the limbs
const RAD = Array.from({ length: NP }, (_, i) =>
  i === 5 || i === 22
    ? 0.1
    : i <= 4 || i === 6 || i === 10 || i === 7 || i === 11 || i === 14 || i === 18
      ? 0.075
      : 0.04
);

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  nrm = a => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  mv = (M, v) => [
    M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
    M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
    M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
  ],
  mm = (A, B) => {
    const O = new Array(9);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) O[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
    return O;
  };
// the turn whose columns are the frame (d, s): d first, s squared off against it
function frame(d, s) {
  const e1 = nrm(d),
    e2 = nrm(
      sub(
        s,
        e1.map(x => x * dot(s, e1))
      )
    ),
    e3 = cross(e1, e2);
  return [e1[0], e2[0], e3[0], e1[1], e2[1], e3[1], e1[2], e2[2], e3[2]];
}
// the turn taking the frame (d0, s0) to (d, s)
const turnFrames = (d0, s0, d, s) => {
  const F = frame(d, s),
    F0 = frame(d0, s0);
  return mm(F, [F0[0], F0[3], F0[6], F0[1], F0[4], F0[7], F0[2], F0[5], F0[8]]);
};
// the least turn taking a onto b
function rotTo(a, b) {
  a = nrm(a);
  b = nrm(b);
  const v = cross(a, b),
    c = dot(a, b);
  if (c < -0.9999) return [1, 0, 0, 0, -1, 0, 0, 0, -1];
  const k = 1 / (1 + c);
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
const row = (D, q) => [D[q], D[q + 1], D[q + 2], D[q + 4], D[q + 5], D[q + 6], D[q + 8], D[q + 9], D[q + 10]],
  rowT = (D, q) => [D[q + 3], D[q + 7], D[q + 11]];

// the body, as it stood when it died (the figure's rows in D, at o): its weights, how long its links are, and how it
// starts to go over
function start(e, D, o, MM, knock) {
  const r = MM.rest,
    P = new Float32Array(NP * 3);
  for (let b = 0; b < 22; b++) {
    const M = row(D, o + b * 12),
      t = rowT(D, o + b * 12),
      p = mv(M, r[b]);
    P.set([p[0] + t[0], p[1] + t[1], p[2] + t[2]], b * 3);
    if (END[b] >= 22) {
      const q = mv(M, MM.ends[b]);
      P.set([q[0] + t[0], q[1] + t[1], q[2] + t[2]], END[b] * 3);
    }
  }
  const at = i => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]],
    len = LINKS.map(([a, b]) => Math.hypot(...sub(at(a), at(b)))),
    leg = len[14] + len[15]; // (thigh and shin)
  // how it goes over: the trunk toppled toward where the game laid its head (thrown hard, the whole of it lifted and
  // flung); the knees given a nudge so they fold, not lock; a headless one just drops
  const rv = Math.hypot(e.rvx || 0, e.rvy || 0),
    fa = e.fallA ?? (e.a || 0) + Math.PI,
    u = [Math.cos(fa), Math.sin(fa)],
    thrown = rv > 135,
    // (knocked down, the game doesn't throw the body as it throws the dead: a shove over hard enough to go flat)
    vt = knock
      ? 2.8 * PER_M
      : e.headless
        ? 0.2 * PER_M
        : (1.1 + Math.min(3, rv / (5 * PER_M)) * (thrown ? 1.6 : 0.6)) * PER_M,
    lift = thrown ? 1.6 * PER_M + (e.vz || 0) * 0.5 : 0,
    hip = P[2],
    top = Math.max(P[5 * 3 + 2] - hip, 1),
    fw = [Math.cos(e.a || 0), Math.sin(e.a || 0)],
    V = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) {
    const h = Math.max(0, (P[i * 3 + 2] - hip) / top); // up the trunk, the more it's pushed over
    V[i * 3] = u[0] * vt * h;
    V[i * 3 + 1] = u[1] * vt * h;
    V[i * 3 + 2] = lift * (0.6 + 0.4 * h);
  }
  for (const kn of [15, 19]) {
    V[kn * 3] += fw[0] * 0.5 * PER_M;
    V[kn * 3 + 1] += fw[1] * 0.5 * PER_M;
  }
  const Q = new Float32Array(NP * 3),
    h0 = 1 / 60;
  for (let i = 0; i < NP * 3; i++) Q[i] = P[i] - V[i] * h0;
  return { P, Q, len, leg, t: GS.time, t0: GS.time, still: 0, frozen: null, h0, MM, damp: 0.998 };
}

// a knee bends forward, toward the toes: one found bent the wrong way is brought back to straight (moved, not
// flung: its last place moved with it, so the fix gives it no speed). A leg near straight, or a foot pointed along
// the leg, says too little about which way is forward: left as it is
function knees(P, Q) {
  for (const [h, k, a, t] of [
    [14, 15, 16, 17],
    [18, 19, 20, 21],
  ]) {
    const at = i => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]],
      H = at(h),
      A = at(a),
      ax = nrm(sub(A, H)),
      m = [(H[0] + A[0]) / 2, (H[1] + A[1]) / 2, (H[2] + A[2]) / 2],
      v = sub(at(k), m),
      f = sub(at(t), A),
      fq = sub(
        f,
        ax.map(x => x * dot(f, ax))
      );
    if (Math.hypot(...fq) < 0.3 * Math.hypot(...f)) continue;
    const fp = nrm(fq),
      vp = dot(v, fp);
    if (vp < -0.02 * Math.hypot(...sub(A, H)))
      for (let j = 0; j < 3; j++) {
        P[k * 3 + j] -= vp * fp[j];
        Q[k * 3 + j] -= vp * fp[j];
      }
  }
}

// a step of the fall
function step(R, h, floor) {
  const { P, Q, len } = R;
  let mx = 0;
  for (let i = 0; i < NP; i++) {
    const j = i * 3;
    for (let c = 0; c < 3; c++) {
      const v = (P[j + c] - Q[j + c]) * R.damp;
      Q[j + c] = P[j + c];
      P[j + c] += v + (c === 2 ? -G * h * h : 0);
    }
    mx = Math.max(mx, Math.hypot(P[j] - Q[j], P[j + 1] - Q[j + 1], P[j + 2] - Q[j + 2]) / h);
  }
  for (let it = 0; it < 8; it++) {
    for (let n = 0; n < LINKS.length; n++) {
      const [a, b, s, m] = LINKS[n],
        ja = a * 3,
        jb = b * 3,
        dx = P[jb] - P[ja],
        dy = P[jb + 1] - P[ja + 1],
        dz = P[jb + 2] - P[ja + 2],
        d = Math.hypot(dx, dy, dz) || 1e-6,
        L = m ? m * (len[a] + len[a + 1]) : len[n]; // (a knee's or elbow's least: a part of its two bones' length)
      if (m && d >= L) continue;
      const k = ((d - L) / d) * 0.5 * s;
      P[ja] += dx * k;
      P[ja + 1] += dy * k;
      P[ja + 2] += dz * k;
      P[jb] -= dx * k;
      P[jb + 1] -= dy * k;
      P[jb + 2] -= dz * k;
    }
    // the street under it: what touches it stops sinking and drags
    for (let i = 0; i < NP; i++) {
      const j = i * 3,
        rz = floor + RAD[i] * R.leg;
      if (P[j + 2] < rz) {
        P[j + 2] = rz;
        Q[j] = P[j] - (P[j] - Q[j]) * 0.6;
        Q[j + 1] = P[j + 1] - (P[j + 1] - Q[j + 1]) * 0.6;
        if (Q[j + 2] < rz) Q[j + 2] = rz;
      }
    }
  }
  knees(P, Q);
  // a wall or a car in the way: it comes up against it and stops there
  for (let i = 0; i < NP; i++) {
    const j = i * 3;
    if (blockPt(P[j], P[j + 1]) && !blockPt(Q[j], Q[j + 1])) {
      P[j] = Q[j];
      P[j + 1] = Q[j + 1];
    }
  }
  return mx;
}

// the body's pose for this frame, written over the figure's rows in D (at o). False: it isn't one to fall this way
// (it was already on the ground, or first seen after it had fallen), and the figure's own pose stands. Knocked down
// before it died, the body it already is carries on
export function ragPose(e, D, o, MM) {
  if (e._rg === undefined)
    e._rg = e._rk
      ? e._rk
      : e.dying < 0.12 && !(e.down > 0) && !e.crawl && !e.half && !(e.z > 2)
        ? start(e, D, o, MM)
        : null;
  if (!e._rg) return false;
  advance(e, e._rg);
  pose(e._rg.P, D, o, MM, scaleOf(D, o));
  return true;
}
// knocked down: the fallen body's pose, into out (at oo), the figure's own (in D at o) its scale and, the moment it
// goes down, where it falls from. False: not one to fall this way
export function ragKnock(e, D, o, MM, out, oo) {
  if (e._rk === undefined)
    e._rk = e.down > 0 && !e.crawl && !e.half && !e.lurk && !(e.z > 2) ? start(e, D, o, MM, true) : null;
  if (!e._rk) return false;
  advance(e, e._rk);
  pose(e._rk.P, out, oo, MM, scaleOf(D, o));
  return true;
}
const scaleOf = (D, o) => {
  const k0 = Math.hypot(D[o], D[o + 4], D[o + 8]);
  return [k0, k0, Math.hypot(D[o + 2], D[o + 6], D[o + 10])];
};
function advance(e, R) {
  if (!R.frozen) {
    let dt = Math.min(0.1, GS.time - R.t);
    R.t = GS.time;
    while (dt > 1e-4) {
      const h = Math.min(dt, 1 / 60);
      dt -= h;
      const mx = step(R, h, 0);
      // the hips kept to where the game has the body (it slides it on): the whole of it moved, not stretched
      const g = Math.min(1, h * 10),
        dx = (e.x - R.P[0]) * g,
        dy = (e.y - R.P[1]) * g;
      for (let i = 0; i < NP; i++) {
        R.P[i * 3] += dx;
        R.P[i * 3 + 1] += dy;
        R.Q[i * 3] += dx;
        R.Q[i * 3 + 1] += dy;
      }
      R.still = mx < 0.5 * PER_M ? R.still + h : 0;
    }
    const age = GS.time - R.t0;
    R.damp = age > 0.7 ? 0.85 : 0.998; // (down a moment, what swing it has left dies away)
    if ((age > 0.8 && R.still > 0.15) || age > 2) {
      // at rest: kept as it lies, about its hips; and where its head points (and whether it lies face up) told to
      // the game, which lays the body's shadow and its pile by it, and gets a knocked-down one up by it
      const L = new Float32Array(NP * 3);
      for (let i = 0; i < NP; i++) {
        L[i * 3] = R.P[i * 3] - R.P[0];
        L[i * 3 + 1] = R.P[i * 3 + 1] - R.P[1];
        L[i * 3 + 2] = R.P[i * 3 + 2];
      }
      e.fallA = Math.atan2(R.P[5 * 3 + 1] - R.P[1], R.P[5 * 3] - R.P[0]);
      if (e.down > 0 && e.dying === undefined) e.sup = faceUp(R.P, R.MM) && supOK(e);
      R.frozen = { L, fa: e.fallA };
      R.Q = null;
    }
  }
  // lying still: where the game has it now, turned as it has turned it since (a running step shoves a body round)
  if (R.frozen) {
    const { L, fa } = R.frozen,
      a = (e.fallA ?? fa) - fa,
      c = Math.cos(a),
      s = Math.sin(a);
    for (let i = 0; i < NP; i++) {
      const x = L[i * 3],
        y = L[i * 3 + 1];
      R.P[i * 3] = e.x + c * x - s * y;
      R.P[i * 3 + 1] = e.y + s * x + c * y;
      R.P[i * 3 + 2] = L[i * 3 + 2];
    }
  }
}
// whether it lies face up: its chest's front (the rest's forward, +x, turned as the chest lies) facing the sky
function faceUp(P, MM) {
  const r = MM.rest,
    at = i => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]],
    T = turnFrames(sub(r[3], r[0]), sub(r[11], r[7]), sub(at(3), at(0)), sub(at(11), at(7)));
  return T[6] > 0;
}

// each bone turned to lie between its weights: the hips and the chest by two directions each (along and across),
// the clavicles along and up the spine, every limb bone swung from its parent's turn
function pose(P, D, o, MM, k) {
  const r = MM.rest,
    at = i => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]],
    rs = v => [v[0] * k[0], v[1] * k[1], v[2] * k[2]],
    restOf = i => (i < 22 ? r[i] : MM.ends[END.indexOf(i)]),
    Rb = [];
  for (let b = 0; b < 22; b++) {
    const d = sub(at(END[b]), at(b)),
      d0 = rs(sub(restOf(END[b]), r[b]));
    let T;
    if (b <= 1) T = turnFrames(d0, rs(sub(r[18], r[14])), d, sub(at(18), at(14)));
    else if (b === 6 || b === 10) T = turnFrames(d0, rs(sub(r[4], r[3])), d, sub(at(4), at(3)));
    else if (b <= 5) T = turnFrames(d0, rs(sub(r[11], r[7])), d, sub(at(11), at(7)));
    else {
      const Rp = Rb[PAR[b]];
      T = mm(rotTo(mv(Rp, d0), d), Rp);
    }
    Rb[b] = T;
    const M = [
        T[0] * k[0],
        T[1] * k[1],
        T[2] * k[2],
        T[3] * k[0],
        T[4] * k[1],
        T[5] * k[2],
        T[6] * k[0],
        T[7] * k[1],
        T[8] * k[2],
      ],
      J = at(b),
      j0 = mv(M, r[b]),
      q = o + b * 12;
    for (let i = 0; i < 3; i++) {
      D[q + i * 4] = M[i * 3];
      D[q + i * 4 + 1] = M[i * 3 + 1];
      D[q + i * 4 + 2] = M[i * 3 + 2];
      D[q + i * 4 + 3] = J[i] - j0[i];
    }
  }
}
