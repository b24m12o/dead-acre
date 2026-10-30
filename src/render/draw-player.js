/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, angDiff, clamp, d2, lerp } from '../core/util.js';
import { GUNS, HEROES } from '../game/arsenal.js';
import { lineQ, quad, setH } from './sprites.js';
import { R } from './atlas.js';
import { lamps } from '../world/map.js';
import { ik2 } from '../actors/legs.js';
import { HPV } from '../ui/hangar.js';
import { OUTFITS } from '../game/challenges.js';
export const E1 = 1.6,
  NIGHT = { sun: [0.33, 0.39, 0.58], sky: [0.25, 0.28, 0.4] };
export function lampHot(x, y) {
  let h = 0;
  for (const L of lamps) {
    if (L.down) continue;
    const R0 = L.lantern ? 110 : 170,
      dd = d2(L.hx, L.hy, x, y);
    if (dd > R0 * R0) continue;
    const k = lampK(L);
    if (k < 0.05) continue;
    const f = 1 - Math.sqrt(dd) / R0;
    h = Math.max(h, f * f * k);
  }
  return h;
}
export function lampK(L) {
  if (GS.ev === 'blackout' || L.down) return 0;
  if (L.off) return GS.time - L.off < 0.5 ? (Math.sin(GS.time * 70 + L.ph) > 0 ? 0.8 : 0.05) : 0;
  if (L.on && GS.time - L.on < 0.7) return Math.sin(GS.time * 55 + L.ph) > -0.2 ? 1 : 0.1;
  if (!L.broken) return 1;
  const n = Math.sin(GS.time * 13 + L.ph) * Math.sin(GS.time * 5.3 + L.ph * 2) + Math.sin(GS.time * 0.7 + L.ph) * 0.6;
  return n > 0.1 ? 1 : n > -0.2 ? 0.4 : 0.06;
}

export const HLOOK = { ranger: 0, breacher: 1, grenadier: 2 };
const HSTYLE = [
  { sleeve: [0.31, 0.31, 0.28], pants: [0.25, 0.25, 0.23], hand: 'h_glove', pack: 'h_pack' }, // a worn field jacket: greys and browns, so lamplight doesn't turn it lime
  { sleeve: [0.8, 0.72, 0.54], pants: [0.24, 0.31, 0.48], hand: 'h_glove2', pack: null },
  { sleeve: [0.66, 0.2, 0.16], pants: [0.16, 0.17, 0.22], hand: 'h_hand', pack: 'h_bag' },
];
const RLWELL = {
  pistol: [-1, 0],
  smg: [10, 0],
  rifle: [17, 0],
  auto: [18, 0],
  hunter: [20, 0],
  lmg: [21, 2],
  launcher: [20, 0],
}; // where a fresh magazine goes (gun-local)
const RLRACK = {
  pistol: [
    [7, 0],
    [-2, 0],
  ],
  smg: [
    [2, -2.5],
    [-4, -2.5],
  ],
  rifle: [
    [3, -2.5],
    [-4, -2.5],
  ],
  auto: [
    [4, -2.5],
    [-3, -2.5],
  ],
  hunter: [
    [9, 4],
    [2, 5.5],
  ],
  lmg: [
    [6, -3],
    [-2, -3],
  ],
  launcher: [
    [20, 0],
    [12, 0],
  ],
}; // charging handle / slide / bolt pull (gun-local)
const GHW = { pistol: 2.4, smg: 3.6, rifle: 3.4, auto: 3.6, hunter: 3, lmg: 4, shotgun: 3.2, lever: 3, launcher: 4.6 }; // half-width of each gun seen from above
const GPOSE = {
  pistol: {
    go: 30,
    hands: [
      [0, -1.8],
      [1.5, 1.8],
    ],
  },
  smg: {
    go: 10,
    hands: [
      [8, 1.5],
      [26, 0],
    ],
  },
  shotgun: {
    go: 1,
    hands: [
      [16, 1.5],
      [39, 0],
    ],
  },
  auto: {
    go: 1,
    hands: [
      [14, 1.5],
      [36, 0],
    ],
  },
  rifle: {
    go: 1,
    hands: [
      [14, 1.5],
      [41, 0],
    ],
  },
  hunter: {
    go: 0,
    hands: [
      [16, 1.5],
      [44, 0],
    ],
  },
  lmg: {
    go: -1,
    hands: [
      [16, 1.5],
      [46, 2],
    ],
  },
  lever: {
    go: 0,
    hands: [
      [16, 1.5],
      [42, 0],
    ],
  },
  launcher: {
    go: 1,
    hands: [
      [12, 1.5],
      [36, 0],
    ],
  },
};
export function drawRanger(p) {
  const fl = p.hurt > 0 ? 1 : 0,
    blink = p.inv > 0 && p.dashT <= 0 && Math.sin(GS.time * 40) < -0.3 ? 0.55 : 1;
  const pv = !p.npc && HPV.on && GS.state === 'menu',
    look = p.look ?? (HLOOK[(pv && HPV.hero) || GS.RUN.hero] || 0),
    st = HSTYLE[look],
    ot = p.npc ? p.tint || [1, 1, 1] : (OUTFITS[(pv && HPV.outfit) || GS.meta.outfit] || OUTFITS.std).tint;
  const dn = p.down > 0,
    amp = dn ? 0 : p.strideAmp,
    ph = p.stride * TAU,
    c = Math.cos(dn ? p.bodyA : p.moveA),
    s = Math.sin(dn ? p.bodyA : p.moveA); // down: sitting on the ground, legs out in front
  const bob = Math.abs(Math.sin(ph)) * amp * 1.2,
    breathe = 1 + Math.sin(GS.time * 2.4) * 0.012;
  const roll = p.dashT > 0 ? 1 : 0;
  GS.gA = blink * (GS.xray || 1);
  const ba = p.bodyA,
    bc = Math.cos(ba),
    bs = Math.sin(ba),
    lean = dn ? -7 : 3 * amp + roll * 4,
    lx = p.x + c * lean,
    ly = p.y + s * lean - bob;
  // During a dodge, two light afterimages trail the body opposite its travel vector.
  // Render-only (and disabled in shadow passes), so it adds feel without changing gameplay timing.
  if (!GS.SHMODE && p.dashT > 0.025 && !dn && !p.npc) {
    const ov = GS.gA;
    for (const [age, alpha] of [
      [0.032, 0.1],
      [0.018, 0.16],
    ]) {
      const dx = -(p.vx || 0) * age,
        dy = -(p.vy || 0) * age;
      GS.gA = blink * alpha;
      setH(20);
      quad(
        R['hb' + look],
        lx + dx,
        ly + dy,
        ba,
        breathe,
        breathe,
        ot[0] * 0.78,
        ot[1] * 0.84,
        Math.min(1, ot[2] * 1.16),
        1,
        0.35,
        0.48,
        0.8,
        0
      );
      setH(28);
      quad(R['hh' + look], lx + dx + bc * 2, ly + dy + bs * 2 - 1, ba, 1, 1, 0.78, 0.84, 1, 1, 0.35, 0.48, 0.8, 0);
    }
    GS.gA = ov;
  }
  // legs + boots
  for (const side of [-1, 1]) {
    const k = ph + (side > 0 ? Math.PI : 0),
      fwd = dn ? 17 : Math.sin(k) * 13 * amp,
      lat = side * (dn ? 6 : 7.5),
      lift = Math.max(0, Math.cos(k)) * amp;
    const fx = p.x + c * fwd - s * lat,
      fy = p.y + s * fwd + c * lat,
      hx = lx - bc * 2 - bs * side * 6,
      hy = ly - bs * 2 + bc * side * 6;
    setH(4 + lift * 4);
    lineQ(hx, hy, fx, fy, 8.6, st.pants[0], st.pants[1], st.pants[2], 1, 0, 0, 0, fl);
    setH(2 + lift * 6);
    quad(R.h_foot, fx, fy, p.moveA, 1 + lift * 0.1, 1 + lift * 0.1, 1, 1, 1, 1, 1, 1, 1, fl);
  }
  if (st.pack) {
    setH(22);
    quad(R[st.pack], lx - bc * 12, ly - bs * 12, ba, breathe, breathe, 1, 1, 1, 1, 1, 1, 1, fl);
  }
  if (look === 0 && p.ant && p.ant.bx !== undefined) {
    setH(30);
    lineQ(p.ant.bx, p.ant.by - bob, p.ant.x, p.ant.y - bob, 1.2, 0.08, 0.08, 0.08, 1, 0, 0, 0, fl);
    quad(
      R.pixel,
      p.ant.x,
      p.ant.y - bob,
      0,
      0.6,
      0.6,
      1,
      0.2,
      0.15,
      1,
      Math.sin(GS.time * 6) > 0 ? 3 : 0.5,
      0.4,
      0.3,
      0
    );
  }
  // weapon pose: swap lowers the gun, reload tilts it
  const gid = pv ? (HEROES[HPV.hero || GS.meta.hero] || HEROES.ranger).spec : p.gun || 'rifle',
    pose = GPOSE[gid],
    swap = p.swap > 0 ? Math.sin(Math.min(1, p.swap / 0.3) * Math.PI) : 0,
    rk = p.rk || 0,
    pis = gid === 'pistol';
  const idle = Math.max(0, 1 - amp * 3),
    ga = p.aimA + swap * 0.9 + rk * (pis ? -0.42 : 0.5) + Math.sin(GS.time * 1.1 + 0.5) * 0.022 * idle,
    gc = Math.cos(ga),
    gs = Math.sin(ga),
    GO = pose.go - p.recoil - swap * 8 - rk * (pis ? 7 : 4) + Math.sin(GS.time * 2.4) * 0.7 * idle;
  const gx = lx + Math.cos(p.aimA) * GO,
    gy = ly + Math.sin(p.aimA) * GO;
  const ghw = GHW[gid] || 3.4,
    hands = pose.hands.map(([u, v], i) => {
      v = pis ? v * 1.5 : i ? ghw * 0.95 : -ghw * 0.8;
      return [gx + gc * u - gs * v, gy + gs * u + gc * v];
    }); // each hand sits half beside the gun, wrapping the side nearest its arm, so fingers show at the edge
  // reload choreography for the support hand: strip, reach for the chest pouch, seat a fresh mag, rack; shotguns feed shell by shell
  const G2W = (u, v) => [gx + gc * u - gs * v, gy + gs * u + gc * v],
    mix = (A, B, t) => {
      t = clamp(t, 0, 1);
      t = t * t * (3 - 2 * t);
      return [lerp(A[0], B[0], t), lerp(A[1], B[1], t)];
    };
  const pouch = [lx + bc * 3 - bs * 11, ly + bs * 3 + bc * 11],
    GD = GUNS[gid] || {},
    MWL = RLWELL[gid] || [16, 0];
  let carry = null;
  if (p.reload > 0 && !p.npc) {
    const rt = clamp(1 - p.reload / (GD.perShell ? GD.reload : p.reloadMax || 1), 0, 1),
      grip = hands[1];
    if (GD.perShell) {
      const port = G2W(17, 4.5);
      let H;
      if (rt < 0.35) H = mix(port, pouch, rt / 0.35);
      else if (rt < 0.45) H = [pouch[0] + Math.sin(rt * 70) * 0.5, pouch[1]];
      else if (rt < 0.85) {
        H = mix(pouch, port, (rt - 0.45) / 0.4);
        carry = ['shell', H, 1];
      } else {
        H = mix(port, G2W(21, 2.5), (rt - 0.85) / 0.15);
        carry = ['shell', H, 0];
      }
      hands[1] = H;
    } else {
      const well = G2W(MWL[0], MWL[1] + 3.5),
        below = G2W(MWL[0], MWL[1] + 10),
        seat = G2W(MWL[0], MWL[1] + 2);
      let H;
      if (rt < 0.12) H = mix(grip, well, rt / 0.12);
      else if (rt < 0.4) H = mix(well, pouch, (rt - 0.12) / 0.28);
      else if (rt < 0.5) H = [pouch[0] + Math.sin(rt * 70) * 0.6, pouch[1]];
      else if (rt < 0.8) {
        H = mix(pouch, below, (rt - 0.5) / 0.3);
        carry = ['mag', H, 1];
      } else if (rt < 0.9) {
        H = mix(below, seat, (rt - 0.8) / 0.1);
        carry = ['mag', H, 0];
      } else H = mix(seat, grip, (rt - 0.9) / 0.1);
      hands[1] = H;
    }
  } else if (p.rackT > 0) {
    // charging handle, slide or bolt
    const k = 1 - p.rackT / 0.32,
      C = RLRACK[gid] || [
        [4, -2.5],
        [-3, -2.5],
      ],
      a0 = G2W(C[0][0], C[0][1]),
      a1 = G2W(C[1][0], C[1][1]);
    hands[1] =
      k < 0.3
        ? mix(hands[1], a0, k / 0.3)
        : k < 0.55
          ? mix(a0, a1, (k - 0.3) / 0.25)
          : mix(a1, hands[1], (k - 0.55) / 0.45);
  } else if (p.pumpT > 0 && p.pumpT < 0.24) {
    const k = Math.sin((1 - p.pumpT / 0.24) * Math.PI);
    hands[1] = G2W(pose.hands[1][0] - 10 * k, pose.hands[1][1]);
  }
  setH(25);
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1,
      shx = lx + bc * 1 - bs * side * 14.5,
      shy = ly + bs * 1 + bc * side * 14.5,
      [hx, hy] = hands[i];
    const [ex, ey] = ik2(shx, shy, hx, hy, 18, 20, side);
    lineQ(
      shx,
      shy,
      ex,
      ey,
      9.6,
      st.sleeve[0] * ot[0],
      st.sleeve[1] * ot[1],
      st.sleeve[2] * ot[2],
      1,
      1,
      1,
      1,
      fl,
      R.h_upper
    );
    quad(
      R.h_elbow,
      ex,
      ey,
      Math.atan2(ey - shy, ex - shx),
      1.12,
      1.12,
      st.sleeve[0] * 0.9 * ot[0],
      st.sleeve[1] * 0.9 * ot[1],
      st.sleeve[2] * 0.9 * ot[2],
      1,
      0,
      0,
      0,
      fl
    );
    lineQ(
      ex,
      ey,
      hx,
      hy,
      7,
      st.sleeve[0] * 0.92 * ot[0],
      st.sleeve[1] * 0.92 * ot[1],
      st.sleeve[2] * 0.92 * ot[2],
      1,
      1,
      1,
      1,
      fl,
      R.h_fore
    );
  }
  const bs2 = look === 1 ? 1.06 : 1;
  setH(24);
  quad(
    R['hb' + look],
    lx,
    ly,
    ba,
    (1 + roll * 0.06) * breathe * bs2,
    (1 - roll * 0.06) * breathe * bs2,
    ot[0],
    ot[1],
    ot[2],
    1,
    1,
    1,
    1,
    fl
  );
  if (p.stains && !p.npc)
    for (const st2 of p.stains)
      quad(
        R.drop,
        lx + st2.u * bc - st2.v * bs,
        ly + st2.u * bs + st2.v * bc,
        st2.r,
        st2.s * 1.5,
        st2.s,
        st2.c || 0.4,
        0.03,
        0.03,
        st2.a || 0.9,
        0,
        0,
        0,
        0
      ); // blood that builds up on you through the night
  {
    const ax = lx - bc * 7,
      ay = ly - bs * 7;
    p.sc = p.sc || [
      { x: ax, y: ay },
      { x: ax, y: ay },
    ];
    const flut = Math.sin(GS.time * 11 + p.x * 0.01) * (1.5 + amp * 3);
    let px2 = ax,
      py2 = ay;
    for (let i = 0; i < 2; i++) {
      const q = p.sc[i],
        tx2 = px2 - bc * 6 - bs * flut * (i + 1) * 0.3,
        ty2 = py2 - bs * 6 + bc * flut * (i + 1) * 0.3;
      q.x += (tx2 - q.x) * 0.3;
      q.y += (ty2 - q.y) * 0.3;
      const dl = Math.hypot(q.x - px2, q.y - py2) || 1;
      if (dl > 7) {
        q.x = px2 + ((q.x - px2) / dl) * 7;
        q.y = py2 + ((q.y - py2) / dl) * 7;
      }
      setH(23 - i * 2);
      lineQ(px2, py2, q.x, q.y, 3.8 - i * 1, 0.3 * ot[0], 0.08, 0.06, 1, 0, 0, 0, fl, R.pixel);
      px2 = q.x;
      py2 = q.y;
    }
  }
  const magSc = gid === 'lmg' ? 1.7 : pis ? 1.05 : 1.35;
  if (carry && !carry[2]) {
    setH(25.6);
    if (carry[0] === 'mag')
      quad(R.mag, carry[1][0], carry[1][1], ga + Math.PI / 2, magSc, magSc, 1, 1, 1, 1, 0, 0, 0, fl);
    else quad(R.shell, carry[1][0], carry[1][1], ga, 1.5, 1.5, 1, 1, 1, 1, 0, 0, 0, fl);
  }
  // seen from above the hands wrap the grip and handguard from below: draw them under the gun so fingers show at its edges; only a hand racking the charging handle or slide sits on top
  const handOver = p.rackT > 0 && !(p.reload > 0);
  setH(25.8);
  hands.forEach(([hx, hy], i) => {
    if (!(handOver && i === 1)) quad(R[st.hand], hx, hy, ga, 0.9, 0.9, 1, 1, 1, 1, 1, 1, 1, fl);
  });
  setH(26);
  const gsc = pis ? 0.86 : 1;
  quad(R[GUNS[gid].reg], gx, gy, ga, gsc, gsc, 1, 1, 1, 1, E1, E1, E1, fl);
  if (handOver) {
    setH(27);
    quad(R[st.hand], hands[1][0], hands[1][1], ga, 0.9, 0.9, 1, 1, 1, 1, 1, 1, 1, fl);
  }
  if (carry && carry[2]) {
    setH(27.5);
    const cx = carry[1][0] + gc * 3.2,
      cy = carry[1][1] + gs * 3.2;
    if (carry[0] === 'mag') quad(R.mag, cx, cy, ga + 0.3, magSc, magSc, 1, 1, 1, 1, 0, 0, 0, fl);
    else quad(R.shell, cx, cy, ga, 1.5, 1.5, 1, 1, 1, 1, 0, 0, 0, fl);
  }
  const ha = ba + angDiff(ba, p.aimA) * 0.6 + (p.rk || 0) * 0.32;
  setH(32);
  quad(R['hh' + look], lx + bc * 2, ly + bs * 2 - 1, ha, 0.9, 0.9, 1, 1, 1, 1, 1, 1, 1, fl);
  GS.gA = 1;
}

/* ---------- The dead ---------- */
