/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const LYB = { skitter: 1, wasp: 1, flower: 1, beetle: 1, mini: 1 }; // the people who fall as whole bodies
function lyThud(e) {
  const K = e.type === 'beetle' ? 1.9 : 1,
    a = e.fallA ?? 0,
    c = Math.cos(a),
    s = Math.sin(a);
  for (const t of [-32, -4, 26]) dust(e.x + c * t * K, e.y + s * t * K, 1, 16 * K, 0.42, 0.32);
  /* a little grit kicked up, not a cloud */ if (thr('thud', 45)) playS('dry', 0.1, 0.5, 0, 0);
} // the body slaps down along its whole length
const downEl = e => (((e.dT || DOWN_T) - e.down) * DOWN_T) / (e.dT || DOWN_T); // time since it went down, on the standard clock (each zombie gets up at its own pace)
const DOWN_T = 1.55,
  LY_SC = 0.62,
  LY_FOOT = 48 * LY_SC; // the body on the ground is drawn to the same scale as the zombie standing // how long a knocked-down zombie takes to get back up; how far its waist lies from its feet
const PANTS = [
  [0.27, 0.29, 0.36],
  [0.33, 0.4, 0.54],
  [0.48, 0.43, 0.33],
  [0.17, 0.17, 0.19],
  [0.35, 0.35, 0.36],
  [0.31, 0.33, 0.24],
];
function pantsOf(e) {
  // trousers that go with the outfit: uniforms keep theirs, everyone else wears what they had on
  if (e.pc === undefined) {
    const v = e.v;
    e.pc =
      e.type === 'beetle'
        ? [0.3, 0.27, 0.24]
        : e.type === 'wasp'
          ? [0.33, 0.34, 0.3]
          : e.type === 'flower'
            ? [0.2, 0.19, 0.21]
            : v === 3
              ? [0.15, 0.17, 0.25]
              : v === 5
                ? [0.5, 0.4, 0.24]
                : v === 4
                  ? [0.38, 0.6, 0.56]
                  : v === 11
                    ? [0.31, 0.35, 0.24]
                    : v === 18 || v === 9
                      ? [0.13, 0.12, 0.15]
                      : v === 15
                        ? 0
                        : PANTS[((e.id || 0) * 7 + 3) % PANTS.length];
  }
  return e.pc;
}
const supOK = e => e.type === 'skitter' && !e.crawl && !e.half && (e.v || 0) <= 18 && (e.hv || 0) <= 17; // ordinary walkers can end up on their backs
const lyS = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function lyState(e) {
  // g: how far the body has tipped over (0 upright, 1 flat); u: how flat the upper body still is; k: legs tucked under; pl: hands planted; s: how much of the lying drawing shows; imp: the bump of hitting the ground
  if (e.dying !== undefined) {
    const t = e.dying,
      g = Math.sin((Math.min(1, (t / 0.42) ** 2) * Math.PI) / 2);
    return {
      g,
      u: 1,
      k: 0,
      pl: 0,
      s: lyS(0.18, 0.5, g),
      imp: t > 0.42 && t < 0.62 ? Math.sin(((t - 0.42) / 0.2) * Math.PI) : 0,
    };
  }
  if (e.crawl || e.half) {
    const t = 0.32 - Math.max(0, e.cfall || 0),
      g = Math.sin((Math.min(1, (t / 0.3) ** 2) * Math.PI) / 2);
    return { g, u: 0.93, k: 0, pl: 0, s: lyS(0.18, 0.5, g), imp: 0, crawl: t >= 0.3 };
  } // legs gone, it drops and drags itself on
  const el = downEl(e),
    g = el < 0.3 ? Math.sin((Math.min(1, (el / 0.3) ** 2) * Math.PI) / 2) : 1;
  return {
    g,
    u: 1 - 0.68 * lyS(0.75, 1.13, el),
    k: 0.85 * lyS(0.82, 1.13, el),
    pl: lyS(0.6, 0.8, el),
    s: el < 0.3 ? lyS(0.18, 0.5, g) : 1 - lyS(1.1, 1.26, el),
    imp: el > 0.3 && el < 0.48 ? Math.sin(((el - 0.3) / 0.18) * Math.PI) : 0,
  };
}
function lyClear(x, y, a, len) {
  const c = Math.cos(a),
    s = Math.sin(a);
  for (const t of [0.35, 0.7, 1]) if (solidPt(x + c * len * t, y + s * len * t)) return false;
  return true;
}
function lyAngle(x, y, a, len) {
  for (const d of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 2, -2, Math.PI]) if (lyClear(x, y, a + d, len)) return a + d;
  return a;
} // a body falls where there is room for it, never into a wall
function lyMove(e, g) {
  // the waist travels out from the planted feet as the body tips over
  const K = e.type === 'beetle' ? 1.9 : 1,
    d = (g - (e.lyG || 0)) * LY_FOOT * K * 1.2;
  e.lyG = g;
  if (Math.abs(d) < 1e-4) return;
  const a = e.fallA ?? e.a + Math.PI,
    nx = e.x + Math.cos(a) * d,
    ny = e.y + Math.sin(a) * d;
  if (!solidPt(nx, ny)) {
    e.x = nx;
    e.y = ny;
  }
}
function armW(sx, sy, hx, hy, L, w1, w2, side, skin, sleeve, fl, hs, ls = 0, cx = sx, cy = sy) {
  const [ex, ey] = natElbow(sx, sy, hx, hy, L, cx, cy);
  armSeg(sx, sy, ex, ey, hx, hy, w1, w2, side, skin, sleeve, fl, hs, ls);
}
function drawBody(e, fl, _f, em, skin, shirt) {
  // a body going down, lying face down, or getting back up
  const st = lyState(e),
    brute = e.type === 'beetle',
    scream = e.type === 'flower',
    spit = e.type === 'wasp',
    K = brute ? 1.9 : 1,
    kem = K * em * LY_SC;
  const live0 = e.dying === undefined,
    el0 = live0 ? downEl(e) : 0;
  const sup = !!e.sup && supOK(e);
  if (live0 && !e.crawl && !sup && el0 > 1.06) {
    // kneeling up: the shins lie flat behind the knees, then fold away as one foot comes forward and it stands
    const r = lyS(1.24, 1.52, el0),
      sl = 22 * (1 - r),
      al = lyS(1.06, 1.16, el0),
      ba0 = el0 > 1.26 ? e.a : (e.fallA ?? e.a),
      /* the knees pivot with it as it turns */ c0 = Math.cos(ba0),
      s0 = Math.sin(ba0),
      km = K * em * LY_SC,
      pc0 = pantsOf(e),
      pt0 = pc0 ? [pc0[0] * 1.18, pc0[1] * 1.18, pc0[2] * 1.18] : [skin[0] * 1.1, skin[1] * 1.1, skin[2] * 1.1];
    if (sl > 1.5 && al > 0.01) {
      const sv = gA;
      gA *= al;
      setH(1);
      for (let i = 0; i < 2; i++) {
        const sd = i ? 1 : -1,
          back = i === (e.id || 0) % 2 ? sl : sl * (1 - lyS(1.18, 1.32, el0)),
          kx = -12 * km,
          ky = sd * 6.5 * km,
          ax = kx - back * km,
          P2k = (x, y) => [e.x + x * c0 - y * s0, e.y + x * s0 + y * c0],
          [x0, y0] = P2k(kx, ky),
          [x1, y1] = P2k(ax, ky * 1.1); // one leg steps up first
        if (back > 1.5) {
          lineQ(x0, y0, x1, y1, 10 * km, pt0[0], pt0[1], pt0[2], 1, 0, 0, 0, fl, R.z_lleg);
          quad(
            R.z_foot,
            x1 - c0 * 2 * km,
            y1 - s0 * 2 * km,
            ba0 + Math.PI,
            K * em * 0.8,
            K * em * 0.8 * sd,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            fl
          );
        }
      }
      gA = sv;
    }
  }
  const rising =
    live0 &&
    !e.crawl &&
    el0 >
      1.04; /* getting up: the kneeling figure comes in solid underneath first, then the body on the ground fades off it, so the street never shows through two half-drawn bodies */
  if (st.s < 0.995 || rising) {
    const sv = [gT, gA, gR, gG, gB];
    e.__std = true;
    e.__sa = rising ? lyS(1.04, 1.14, el0) : 1 - st.s;
    e.__ss = live0 && !e.crawl && el0 > 1 ? lerp(LY_SC * 1.04, 1, lyS(1.04, 1.55, el0)) : 1;
    /* it comes up at the size of the body on the ground and grows as it rises toward the camera, so there is no jump in size when the two drawings swap */ e.__kn =
      live0 && !e.crawl && el0 > 1 ? 1 - lyS(1.22, 1.55, el0) : 0;
    drawEnemy(e);
    e.__std = false;
    [gT, gA, gR, gG, gB] = sv;
  } // the upright figure: tipping over at first; kneeling, then rising toward the camera at the end
  if (st.s < 0.005) return;
  const ga0 = gA;
  gA *= st.s;
  const ba = st.crawl && e.dying === undefined ? e.a : (e.fallA ?? e.a + Math.PI),
    c = Math.cos(ba),
    s = Math.sin(ba),
    zz = e.dying !== undefined ? e.z || 0 : 0,
    g = st.g,
    u = st.u,
    bump = 1 + st.imp * 0.07;
  const P2 = (x, y) => [e.x + (x * c - y * s), e.y - zz + (x * s + y * c)];
  const W = (lx, ly) => P2(g * (lx > -6 ? -6 + (lx + 6) * u : lx) * kem, ly * kem * bump); // tipping squeezes the body toward the feet; rising squeezes the upper body toward the hips
  const Wg = (lx, ly) => P2(g * lx * kem, ly * kem); // things resting on the ground: planted hands
  const sp = e.splay ?? 0.6,
    pose = e.apose ?? 1,
    live = e.dying === undefined,
    el = live ? downEl(e) : 0;
  const tw = live
    ? el > 0.35 && el < 0.72
      ? Math.sin(time * 14 + e.id) * 1.4
      : 0
    : e.dying > 0.6 && e.dying < 2.2
      ? Math.sin(e.dying * 31 + e.id) * (2.2 - e.dying) * 0.8 * ((e.id || 0) % 3 === 0 ? 1 : 0)
      : 0; // the last twitches
  const HP = [
    [
      [56, -21],
      [56, 21],
    ],
    [
      [6, -20],
      [6, 20],
    ],
    [
      [56, -21],
      [7, 20],
    ],
    [
      [40, -36],
      [40, 36],
    ],
  ][pose & 3];
  const pc = pantsOf(e),
    pt = pc ? [pc[0] * 1.18, pc[1] * 1.18, pc[2] * 1.18] : [skin[0] * 1.1, skin[1] * 1.1, skin[2] * 1.1];
  const tc = brute || spit || scream ? [1, 1, 1] : e.tc || [1, 1, 1],
    v = e.v || 0;
  const sleeve = brute
    ? [0.3, 0.24, 0.2]
    : spit
      ? [0.4, 0.42, 0.34]
      : scream
        ? [0.36, 0.33, 0.38]
        : v === 16
          ? skin
          : [shirt[0] * tc[0], shirt[1] * tc[1], shirt[2] * tc[2]];
  const armSkin = scream ? [0.6, 0.57, 0.64] : brute ? [0.44, 0.4, 0.35] : skin;
  const cr = st.crawl && live,
    cph = time * 5.2 + (e.id || 0);
  const hT = i => {
    const a = HP[i],
      sd = i ? 1 : -1;
    if (cr) {
      const rc = Math.sin(cph + i * Math.PI);
      return Wg(44 + 15 * rc, sd * (21 - 3 * rc));
    }
    const px = sup ? -4 : 31,
      py = sup ? 21 : 20;
    return Wg(a[0] + (px - a[0]) * st.pl, a[1] + (sd * py - a[1]) * st.pl + sd * tw * (i ? 1 : -0.6));
  }; /* face down it plants its hands by its shoulders to push up; on its back, beside its hips to sit up */ // a crawler reaches out and hauls itself forward one hand at a time
  const kn = i => {
    const sd = i ? 1 : -1;
    return sup
      ? [-31 + 9 * st.k, sd * (6.5 + sp * 5) * (1 - st.k * 0.45)]
      : [-31 + 19 * st.k, sd * (6.5 + sp * 5) * (1 - st.k * 0.5)];
  }; /* on its back the knees come up instead: foreshortened from above, the feet drawn in toward the hips */ // the knee: halfway down the leg, sliding in under the hips as it gets its knees under it
  const fT = i => {
    const sd = i ? 1 : -1;
    if (sup && st.k > 0.01) {
      const q = kn(i);
      return W(-48 + 15 * st.k + (i === 1 ? tw * 0.8 : 0), q[1] * 1.1);
    }
    if (st.k > 0.01) {
      const q = kn(i);
      return W(q[0] - 22 + (i === 1 ? tw * 0.8 : 0), q[1] * 1.15 + sd * sp * 4 * (1 - st.k));
    }
    return W(-48 + (i === 1 ? tw * 0.8 : 0), sd * (6 + sp * 9));
  };
  e.lr = [hT(0), hT(1), fT(0), fT(1)];
  const LM = live ? null : e.limbs;
  const at = i => (LM ? [LM[i].x, LM[i].y] : e.lr[i]);
  setH(1);
  if (e.half) {
    const [wx, wy] = W(-3, 0),
      gw = cr ? 1 : 0.25;
    for (let i = 0; i < 3; i++) {
      const sw = Math.sin(time * 3 + i * 2 + (e.id || 0)) * 4 * gw,
        [gx, gy] = W(-18 - i * 5, (i - 1) * 5 + sw);
      lineQ(wx, wy, gx, gy, (5.2 - i * 0.9) * kem, 0.55 - i * 0.07, 0.14, 0.16, 1, 0, 0, 0, fl);
    }
    quad(R.drop, wx, wy, 0, 1.9 * kem, 1.9 * kem, 0.26, 0.02, 0.02, 1, 0, 0, 0, 0);
  } // cut through at the waist, its insides trailing
  else if (e.crawl)
    for (let i = 0; i < 2; i++) {
      const sd = i ? 1 : -1,
        [hx, hy] = W(-17, sd * 6),
        [fx, fy] = W(-31 - (i ? 2 : 0), sd * (7 + (cr ? Math.sin(cph + i) * 1.2 : 0)));
      lineQ(hx, hy, fx, fy, 11 * kem, pt[0], pt[1], pt[2], 1, 0, 0, 0, fl, R.z_lleg);
      quad(R.drop, fx, fy, 0, 1.35 * kem, 1.35 * kem, 0.22, 0.02, 0.02, 1, 0, 0, 0, 0);
    }
  // the stumps
  else if (st.k > 0.01 && live)
    for (let i = 0; i < 2; i++) {
      const sd = i ? 1 : -1,
        [hx, hy] = W(-17, sd * 6),
        [kx, ky] = W(...kn(i)),
        [fx, fy] = at(2 + i),
        ang = Math.atan2(ky - fy, kx - fx); // thigh to the knee (shortening as it comes upright), shin flat on the ground behind
      lineQ(hx, hy, kx, ky, 12.5 * kem, pt[0], pt[1], pt[2], 1, 0, 0, 0, fl, R.z_lleg);
      lineQ(kx, ky, fx, fy, 10 * kem, pt[0] * 0.95, pt[1] * 0.95, pt[2] * 0.95, 1, 0, 0, 0, fl, R.z_lleg);
      quad(
        R.z_foot,
        fx - Math.cos(ang) * 2 * kem,
        fy - Math.sin(ang) * 2 * kem,
        ang + Math.PI,
        kem,
        kem * sd,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        fl
      );
    }
  else
    for (let i = 0; i < 2; i++) {
      const sd = i ? 1 : -1,
        [hx, hy] = W(-17, sd * 6),
        [fx, fy] = at(2 + i),
        dx = hx - fx,
        dy = hy - fy,
        dl = Math.hypot(dx, dy) || 1,
        sx = dl / 38,
        ang = Math.atan2(dy, dx);
      quad(
        R.z_lleg,
        hx - (dx / dl) * 17 * sx,
        hy - (dy / dl) * 17 * sx,
        ang,
        sx,
        kem * 1.2,
        pt[0],
        pt[1],
        pt[2],
        1,
        0,
        0,
        0,
        fl
      );
      quad(
        R.z_foot,
        fx - (dx / dl) * 2 * kem,
        fy - (dy / dl) * 2 * kem,
        ang + Math.PI,
        kem * (sup ? 0.7 : 1),
        kem * sd,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        fl
      );
    } /* on its back the toes point at the sky: the boot is foreshortened */
  if (!e.half) {
    const [qx, qy] = W(-12, 0);
    quad(sup ? R.z_lhipu : R.z_lhip, qx, qy, ba, g * kem, kem * bump, pt[0], pt[1], pt[2], 1, 0, 0, 0, fl);
  }
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1,
      [sx2, sy2] = W(36, sd * 14.5);
    if (e.lost && e.lost[i]) {
      quad(R.drop, sx2, sy2, 0, 1.4, 1.4, 0.5, 0.03, 0.03, 1, 0, 0, 0, fl);
      continue;
    }
    const [hx, hy] =
      e.lurk === 'grab' && i === (e.sup ? 1 : 0) && P
        ? (() => {
            const dx = P.x - sx2,
              dy = P.y + 6 - sy2,
              dl = Math.hypot(dx, dy) || 1,
              k = Math.min(1, (34 * kem) / dl);
            return [sx2 + dx * k, sy2 + dy * k];
          })()
        : at(i);
    armW(
      sx2,
      sy2,
      hx,
      hy,
      17.5 * kem,
      10.2 * kem,
      7.6 * kem,
      sd,
      armSkin,
      sleeve,
      fl,
      (brute ? 1.6 : 0.95) * em * 0.8,
      brute || spit || scream ? 0 : sleeveLen(e),
      ...W(18, 0)
    );
  }
  const rise = 1 - u + st.k * 0.3;
  setH(2 + rise * 16); // rising lifts the chest off the ground: its shadow stretches and it comes a little closer
  const torso = R[brute ? 'z_ly19' : spit ? 'z_ly20' : scream ? 'z_ly21' : (sup ? 'z_lu' : 'z_ly') + v],
    tsc = brute ? kem / 1.7 : kem,
    [tx, ty] = W(21, 0);
  quad(
    torso,
    tx,
    ty,
    ba,
    g * u * tsc * (1 + rise * 0.06),
    tsc * bump * (1 + rise * 0.06),
    tc[0],
    tc[1],
    tc[2],
    1,
    0.8,
    0.8,
    0.8,
    fl
  );
  setH(2.6 + rise * 22);
  const [hx, hy] = W(49.5, tw * 0.15);
  if (e.lurk) {
    e.__lhx = hx;
    e.__lhy = hy;
  }
  if (live && (cr || e.half)) {
    e.__hx = hx;
    e.__hy = hy;
    e.__ht = time;
    e.__ha = ba;
    e.__hk = 0.8;
  } // a crawler's eyes are at the front of its lifted head
  if (!e.headless && sup)
    quad(
      R['z_headu' + (e.hv || 0)],
      hx,
      hy,
      ba + ((e.id || 0) % 2 ? 1 : -1) * 0.22 * (1 - st.pl) + (e.tilt || 0) * 0.4,
      em * 0.74 * (1 + rise * 0.08),
      em * 0.74 * (1 + rise * 0.08),
      1,
      1,
      1,
      1,
      0.3,
      0.3,
      0.3,
      fl
    );
  // face up: the face to the sky, lolling a little to one side
  else if (!e.headless) {
    const head = brute ? R.z_bhead : spit ? R.z_head_spit : scream ? R.z_shead : R['z_head' + (e.hv || 0)];
    quad(
      head,
      hx,
      hy,
      cr ? ba + Math.sin(cph * 0.5) * 0.18 : ba + ((e.id || 0) % 2 ? 1 : -1) * (1.15 - st.pl * 0.9) + (e.tilt || 0),
      em * 0.74 * (1 + rise * 0.08),
      em * 0.74 * (1 + rise * 0.08),
      1,
      1,
      1,
      1,
      0.3,
      0.3,
      0.3,
      fl
    );
  } // the face turned to one side on the ground, lifting as it pushes up
  else quad(R.drop, hx, hy, 0, 2.4, 2.4, 0.42, 0.02, 0.02, 1, 0, 0, 0, fl);
  gA = ga0;
}

/* ---------- wear & tear ---------- */
