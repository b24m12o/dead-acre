/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
/* eslint-disable no-undef */ // runs inside the test build, where the game's own names are in scope
// PROTOTYPE, not part of the game: the Abomination climbing out of a hole in the street, as a hand-timed clip on the
// rig in abom3d-page.js. Its blades come up first and stab into the asphalt beyond the rim; its head breaks the
// surface; it hauls itself up on its arms; its legs come over the rim one by one and grip; it stands, the tail slides
// out after it, it roars. ABOM3D.clip(t) sets ABOM3D.pose for time t (seconds); ABOM3D.events(t0, t1) fires what
// happens in between (dust, debris, the street breaking).
(() => {
  const { A, rot, xf, ik } = window.ABOM3D;
  const C = (window.ABOM3D.C = {});
  // a smooth path through keys [t, value]: Catmull-Rom, held flat at the ends
  const track = keys => t => {
    if (t <= keys[0][0]) return keys[0][1];
    const n = keys.length;
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (keys[i + 1][0] < t) i++;
    const [t1, p1] = keys[i],
      [t2, p2] = keys[i + 1],
      p0 = i > 0 ? keys[i - 1][1] : p1,
      p3 = i + 2 < n ? keys[i + 2][1] : p2,
      u = (t - t1) / (t2 - t1),
      u2 = u * u,
      u3 = u2 * u;
    return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  };
  const sm = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  // the body's way out: forward of the hole's middle (u), height (z), nose up (pitch)
  const U = track([
      [0, -34],
      [1.0, -32],
      [1.7, -20],
      [2.5, 0],
      [3.3, 34],
      [4.0, 56],
      [4.7, 60],
      [6, 62],
    ]),
    Z = track([
      [0, -150],
      [0.9, -128],
      [1.7, -72],
      [2.5, -26],
      [3.3, 8],
      [4.0, 27],
      [4.7, 30],
      [5.2, 31],
      [6, 30],
    ]),
    PITCH = track([
      [0, 1.05],
      [1.0, 1.0],
      [1.7, 0.82],
      [2.5, 0.5],
      [3.3, 0.16],
      [4.0, 0.02],
      [4.45, 0.0],
      [4.75, 0.2],
      [5.2, 0.24],
      [5.7, 0.04],
      [6.5, 0.0],
    ]),
    ROLL = track([
      [0, 0],
      [1.9, 0.08],
      [2.5, -0.1],
      [3.1, 0.07],
      [3.7, -0.04],
      [4.3, 0],
    ]),
    HPITCH = track([
      [0, 0.1],
      [1.4, 0.35],
      [2.2, 0.15],
      [3.3, -0.05],
      [4.4, 0.0],
      [4.8, 0.5],
      [5.3, 0.55],
      [5.8, 0.08],
    ]),
    HYAW = track([
      [0, 0],
      [1.8, -0.25],
      [2.6, 0.2],
      [3.4, -0.1],
      [4.2, 0.0],
      [6.0, 0.15],
    ]);
  C.HOLE_R = 66;
  // the legs: where each one's hip is on the body, where it stands at rest, when it comes over the rim to grip, when it
  // steps to its stance
  const LEGS = [
    { hip: [22, -42, -4], rest: [56, -100], grip: 2.05, stand: 3.55 },
    { hip: [22, 42, -4], rest: [56, 100], grip: 2.3, stand: 3.75 },
    { hip: [-38, -42, -4], rest: [-66, -98], grip: 2.85, stand: 3.95 },
    { hip: [-38, 42, -4], rest: [-66, 98], grip: 3.1, stand: 4.15 },
  ];
  const ARMS = [
    { sh: [40, -52, 6], slam: 1.0 },
    { sh: [40, 52, 6], slam: 1.22 },
  ];
  C.setup = (hx, hy, yaw) => {
    C.H = [hx, hy];
    C.yaw = yaw;
    C.f = [Math.cos(yaw), Math.sin(yaw), 0];
    C.s = [-Math.sin(yaw), Math.cos(yaw), 0];
    C.hist = [];
    C.fired = new Set();
  };
  const ground = (u, v, z = 0) => [C.H[0] + C.f[0] * u + C.s[0] * v, C.H[1] + C.f[1] * u + C.s[1] * v, z];
  const rootAt = t => {
    const R = rot(C.yaw, PITCH(t), ROLL(t)),
      P = ground(U(t), 0, Z(t));
    return [R, P];
  };
  // a foot or hand going from a to b over dt seconds: up in an arc, down at the end
  const arc = (a, b, k, lift) => {
    const e = sm(k),
      p = A.lerp(a, b, e);
    p[2] += Math.sin(Math.PI * Math.min(1, k)) * lift;
    return p;
  };
  C.clip = t => {
    const [R, P] = rootAt(t);
    // the tail follows the way the body went: a trail of where its root has been
    const tb = xf(R, P, [-80, 0, 2]);
    const last = C.hist[C.hist.length - 1];
    if (!last || A.len(A.sub(tb, last)) > 1.5) C.hist.push(tb);
    // legs
    const legs = LEGS.map(L => {
      const hip = xf(R, P, L.hip),
        hang = xf(R, P, [L.rest[0] * 0.55, L.rest[1] * 0.4, -46]), // down in the hole: hanging under it, following
        rim = (() => {
          // over the rim, out the way its hip is from the middle of the hole
          const hg = xf(...rootAt(L.grip), L.hip),
            dx = hg[0] - C.H[0] + C.f[0] * 20,
            dy = hg[1] - C.H[1] + C.f[1] * 20,
            l = Math.hypot(dx, dy) || 1;
          return [C.H[0] + (dx / l) * (C.HOLE_R + 24), C.H[1] + (dy / l) * (C.HOLE_R + 24), 0];
        })(),
        [RF, PF] = rootAt(Math.max(t, L.stand + 0.45)),
        stance = (() => {
          const g = xf(RF, PF, [L.rest[0], L.rest[1], 0]);
          return [g[0], g[1], 0];
        })();
      let foot;
      if (t < L.grip) foot = hang;
      else if (t < L.grip + 0.45)
        foot = arc(xf(...rootAt(L.grip), [L.rest[0] * 0.55, L.rest[1] * 0.4, -46]), rim, (t - L.grip) / 0.45, 40);
      else if (t < L.stand) foot = rim;
      else foot = arc(rim, stance, (t - L.stand) / 0.45, 26);
      const out = L.hip[1] < 0 ? -1 : 1,
        pole = A.nrm(A.add(A.mul(R[1], out * 0.7), [0, 0, 1])),
        [knee, f2] = ik(hip, foot, 58, 62, pole);
      return [hip, knee, f2];
    });
    // arms: up out of the hole first, the blades driven into the street beyond the rim; then, out, up at the ready
    const arms = ARMS.map(Ar => {
      const sh = xf(R, P, Ar.sh),
        side = Ar.sh[1] < 0 ? -1 : 1,
        under = xf(R, P, [92, side * 34, -10]),
        stab = ground(C.HOLE_R + 62, side * 58, 0),
        ready = xf(R, P, [104, side * 66, 30]);
      let hand, bdir;
      const rdy = sm((t - 3.7) / 0.6);
      if (t < Ar.slam - 0.5) {
        hand = under;
        bdir = A.nrm(A.add(R[0], [0, 0, 0.6]));
      } else if (t < Ar.slam) {
        const k = (t - (Ar.slam - 0.5)) / 0.5;
        hand = arc(xf(...rootAt(Ar.slam - 0.5), [92, side * 34, -10]), A.add(stab, [0, 0, 6]), k, 70);
        bdir = A.nrm(A.lerp([0, 0, 1], A.add(A.mul(C.f, 0.35), [0, 0, -1]), sm(k)));
      } else {
        hand = A.lerp(A.add(stab, [0, 0, 6]), ready, rdy);
        bdir = A.nrm(
          A.lerp(A.add(A.mul(C.f, 0.35), [0, 0, -1]), A.add(A.add(R[0], A.mul(R[1], side * 0.25)), [0, 0, 0.35]), rdy)
        );
      }
      const pole = A.nrm(A.add(A.mul(R[1], side * 0.8), [0, 0, 0.9])),
        [elbow, h2] = ik(sh, hand, 60, 60, pole);
      return [sh, elbow, h2, A.add(h2, A.mul(bdir, 54))];
    });
    // the tail: back along the trail, then on down the way it came up
    const tail = [];
    {
      let need = 0,
        idx = C.hist.length - 1,
        cur = C.hist[idx] || tb;
      tail.push(cur);
      const back = A.mul(R[0], -1);
      for (let k = 1; k < 6; k++) {
        need = 24;
        while (need > 0 && idx > 0) {
          const nx = C.hist[idx - 1],
            seg = A.len(A.sub(nx, cur));
          if (seg >= need) {
            cur = A.add(cur, A.mul(A.nrm(A.sub(nx, cur)), need));
            need = 0;
          } else {
            need -= seg;
            cur = nx;
            idx--;
          }
        }
        if (need > 0) cur = A.add(cur, A.mul(A.nrm(A.add(back, [0, 0, -1.4])), need));
        const sway = Math.sin(t * 1.6 - k * 0.7) * k * 2.2 * sm((t - 3.5) / 1);
        tail.push(A.add(cur, A.mul(C.s, sway)));
      }
    }
    // the head on its neck, looking up as it breaks the surface, thrown up at the roar
    const HR = rot(C.yaw + HYAW(t), PITCH(t) + HPITCH(t), ROLL(t)),
      neckA = xf(R, P, [30, 0, 6]),
      headP = xf(R, P, [70, 0, 10]),
      neckB = xf(HR, headP, [-14, 0, -2]);
    const breathe = 1 + Math.sin(t * 2.2) * 0.012;
    window.ABOM3D.pose = {
      bodyR: R.map(v => A.mul(v, 1 / breathe)),
      bodyP: P,
      headR: HR,
      headP,
      neck: [neckA, neckB],
      legs,
      arms,
      tail,
      hole: [C.H[0], C.H[1], C.HOLE_R, 150],
      eye: [P[0], P[1] + 40, 760],
      top: 130,
    };
    window.ABOM3D.parts = { R, P, arms, legs, headP };
  };
  // what happens along the way: the street splitting, the blades going in, each grip, it hauling out, the roar
  C.events = (t0, t1, fx) => {
    const once = (key, at, fn) => {
      if (at > t0 && at <= t1 && !C.fired.has(key)) {
        C.fired.add(key);
        fn();
      }
    };
    for (let k = 0; k < 6; k++) once('crack' + k, 0.05 + k * 0.14, () => fx.crack(k / 5));
    once('burst', 0.65, () => fx.burst());
    for (const [i, Ar] of ARMS.entries()) once('slam' + i, Ar.slam, () => fx.stab(window.ABOM3D.pose.arms[i][3]));
    for (const [i, L] of LEGS.entries()) {
      once('grip' + i, L.grip + 0.45, () => fx.grip(window.ABOM3D.pose.legs[i][2]));
      once('step' + i, L.stand + 0.45, () => fx.step(window.ABOM3D.pose.legs[i][2]));
    }
    once('haul', 2.5, () => fx.haul());
    once('roar', 4.75, () => fx.roar());
  };
  return 'ok';
})();
