/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Hit reactions. Each hit on one of the dead knocks its trunk, head and arms back as the recorded hits do (Quaternius'
// Hit_Chest, and now and then Hit_Head: the head snapped back), away from where the shot came from (front, side or
// back), as hard as the hit was. Over whatever the body is doing: walking, standing, swiping. Each hit kicks a spring
// (as the hero's recoil does), so a burst drives it back and back, not snapping to the recording's start each time;
// it rebounds a little and settles in about a third of a second.
import { GS } from '../core/gs.js';
import { FK } from './motion.js';

// each recording's hit, a bone at a time: its first frame (the hit at its height) against its last (standing again),
// as an axis times an angle in the recording's own frame (it faces +x, so these are bends back about -y). The hips
// are left be: the legs hang from them
let HIT = null;
const qmul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ],
  qlog = q => {
    const s = Math.hypot(q[0], q[1], q[2]);
    if (s < 1e-9) return [0, 0, 0];
    let a = 2 * Math.atan2(s, q[3]);
    if (a > Math.PI) a -= 2 * Math.PI;
    return [(q[0] / s) * a, (q[1] / s) * a, (q[2] / s) * a];
  };
function hits() {
  if (HIT) return HIT;
  HIT = {};
  for (const k of ['hit', 'hithead']) {
    const c = FK.clips[k];
    if (!c) continue;
    const A = c.frames[0],
      B = c.frames[c.frames.length - 1];
    HIT[k] = [];
    for (let b = 1; b < 14; b++) {
      const qb = [-B[b * 4], -B[b * 4 + 1], -B[b * 4 + 2], B[b * 4 + 3]];
      HIT[k][b] = qlog(qmul([A[b * 4], A[b * 4 + 1], A[b * 4 + 2], A[b * 4 + 3]], qb));
    }
  }
  return HIT;
}
// a turn from an axis times an angle
function expR(v, O) {
  const a = Math.hypot(v[0], v[1], v[2]);
  if (a < 1e-6) {
    O.fill(0);
    O[0] = O[4] = O[8] = 1;
    return O;
  }
  const x = v[0] / a,
    y = v[1] / a,
    z = v[2] / a,
    c = Math.cos(a),
    s = Math.sin(a),
    C = 1 - c;
  O[0] = c + x * x * C;
  O[1] = x * y * C - z * s;
  O[2] = x * z * C + y * s;
  O[3] = y * x * C + z * s;
  O[4] = c + y * y * C;
  O[5] = y * z * C - x * s;
  O[6] = z * x * C - y * s;
  O[7] = z * y * C + x * s;
  O[8] = c + z * z * C;
  return O;
}
const W = Array.from({ length: 14 }, () => new Float64Array(9)),
  HB = Array.from({ length: 14 }, () => new Float64Array(9)),
  T = new Float64Array(9),
  J = Array.from({ length: 14 }, () => new Float64Array(3)),
  J2 = Array.from({ length: 14 }, () => new Float64Array(3)),
  v = [0, 0, 0];

// the dead, on their feet: kicked by each hit since last frame, and their row (o in D) bent as their spring has it
export function flinch(e, D, o, MM) {
  const t = GS.time,
    S = e._hs || (e._hs = { x: 0, v: 0, t, psi: 0, head: 0, hk: 0 }),
    dt = Math.min(0.1, Math.max(0, t - S.t));
  S.t = t;
  // a hit since: how hard (all of this frame's together: a shotgun's pellets one blow), from where, chest or head
  if (e.hitAcc > 0) {
    const kick = Math.min(1.6, 0.45 + e.hitAcc * 2.2),
      from = Math.atan2(-(e.fdy || 0), -(e.fdx || 0));
    // (a hit from a new quarter turns the bend there quickly, but not in a frame, if it's still bent)
    S.psi = Math.abs(S.x) > 0.15 ? S.psi + angD(S.psi, from) * 0.5 : from;
    // (three in ten to the head; by its own count of hits, not the game's dice: drawing must not change what happens)
    // (where the round was seen to strike, when it was one of yours: actors/player-weapons.js)
    S.n = (S.n || 0) + 1;
    S.head = e.hitHd !== undefined ? e.hitHd : ((e.id || 0) * 7 + S.n * 3) % 10 < 3 ? 1 : 0;
    e.hitHd = undefined;
    S.v += 30 * kick; // (a quarter of its health: about twice the recording's bend, to read from above)
    e.hitAcc = 0;
  }
  if (dt > 0) {
    for (let left = dt; left > 1e-4; ) {
      const h = Math.min(left, 1 / 120),
        w = 14,
        z = 0.5;
      left -= h;
      S.v += (-w * w * S.x - 2 * z * w * S.v) * h;
      S.x += S.v * h;
    }
    S.hk += (S.head - S.hk) * Math.min(1, dt * 20);
  }
  const s = Math.max(-0.4, Math.min(1.8, S.x));
  if (Math.abs(s) < 0.01 || !MM || MM.rest.length < 14) return;
  const HT = hits();
  if (!HT.hit) return;
  const r = MM.rest,
    par = MM.bones.map(b => b[1]),
    c = Math.cos(S.psi),
    sn = Math.sin(S.psi);
  // each bone's turn and joint as posed (its row: the turn scaled by the build, placed so rest[b] lands on its joint)
  const k = [Math.hypot(D[o], D[o + 4], D[o + 8]), Math.hypot(D[o + 2], D[o + 6], D[o + 10])];
  if (!(k[0] > 0) || !(k[1] > 0)) return;
  for (let b = 0; b < 14; b++) {
    const q = o + b * 12,
      R = W[b],
      p = r[b];
    for (let i = 0; i < 3; i++) {
      R[i * 3] = D[q + i * 4] / k[0];
      R[i * 3 + 1] = D[q + i * 4 + 1] / k[0];
      R[i * 3 + 2] = D[q + i * 4 + 2] / k[1];
      J[b][i] = D[q + i * 4] * p[0] + D[q + i * 4 + 1] * p[1] + D[q + i * 4 + 2] * p[2] + D[q + i * 4 + 3];
    }
  }
  // bent: each bone turned in the world by its share of the recorded hit (turned to come from where the shot did),
  // its joint carried round by its parent's bend (where it was against its parent's joint, turned as that bone was),
  // the hips and legs left as they are
  J2[0].set(J[0]);
  for (let b = 1; b < 14; b++) {
    const A = HT.hit[b],
      B = HT.hithead ? HT.hithead[b] : A,
      hk = HT.hithead ? S.hk : 0;
    for (let i = 0; i < 3; i++) v[i] = (A[i] * (1 - hk) + B[i] * hk) * s;
    // (the recording's frame turned to face where the shot came from)
    const vx = v[0] * c - v[1] * sn,
      vy = v[0] * sn + v[1] * c;
    v[0] = vx;
    v[1] = vy;
    const H = expR(v, HB[b]),
      R = W[b];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) T[i * 3 + j] = H[i * 3] * R[j] + H[i * 3 + 1] * R[3 + j] + H[i * 3 + 2] * R[6 + j];
    R.set(T);
    const pb = par[b];
    if (pb > 0) {
      const Hp = HB[pb],
        d0 = J[b][0] - J[pb][0],
        d1 = J[b][1] - J[pb][1],
        d2 = J[b][2] - J[pb][2];
      for (let i = 0; i < 3; i++) J2[b][i] = J2[pb][i] + Hp[i * 3] * d0 + Hp[i * 3 + 1] * d1 + Hp[i * 3 + 2] * d2;
    } else J2[b].set(J[b]);
    const q = o + b * 12,
      p = r[b];
    for (let i = 0; i < 3; i++) {
      D[q + i * 4] = R[i * 3] * k[0];
      D[q + i * 4 + 1] = R[i * 3 + 1] * k[0];
      D[q + i * 4 + 2] = R[i * 3 + 2] * k[1];
      D[q + i * 4 + 3] = J2[b][i] - (R[i * 3] * k[0] * p[0] + R[i * 3 + 1] * k[0] * p[1] + R[i * 3 + 2] * k[1] * p[2]);
    }
  }
}
const angD = (a, b) => {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
};
