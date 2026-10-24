/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const ZSKIN = [
    [0.6, 0.66, 0.5],
    [0.66, 0.6, 0.5],
    [0.55, 0.61, 0.58],
    [0.52, 0.55, 0.57],
    [0.64, 0.6, 0.46],
  ],
  ZSHIRT = [
    [0.36, 0.44, 0.52],
    [0.24, 0.34, 0.38],
    [0.55, 0.54, 0.47],
    [0.2, 0.25, 0.4],
    [0.5, 0.76, 0.72],
    [0.58, 0.44, 0.26],
    [0.42, 0.42, 0.42],
    [0.3, 0.38, 0.5],
    [0.74, 0.72, 0.68],
    [0.12, 0.12, 0.14],
    [0.7, 0.68, 0.62],
    [0.3, 0.36, 0.25],
    [0.29, 0.3, 0.32],
    [0.34, 0.44, 0.56],
    [0.37, 0.17, 0.18],
    [0.61, 0.68, 0.77],
    [0.53, 0.56, 0.48],
    [0.48, 0.42, 0.34],
    [0.17, 0.15, 0.19],
  ];
const BLOOD = [0.31, 0.022, 0.02],
  BILE = [0.42, 0.38, 0.14];
let ZP = 'z_'; // which set of arm parts zArm draws with: painted (z_) or 3D-baked (zs_)
const LONGSL = { 0: 1, 1: 1, 2: 1, 3: 1, 5: 1, 7: 1, 8: 1, 9: 1, 11: 1, 12: 1, 13: 1, 14: 1, 17: 1, 18: 1 }; // outfits whose sleeves reach the wrist
function sleeveLen(e) {
  if (e.slv === undefined)
    e.slv =
      e.type === 'hopper'
        ? 0.42
        : (e.type === 'skitter' || e.type === 'mini') && LONGSL[e.v || 0]
          ? ((e.id || 0) * 13) % 4 === 0
            ? 0.45
            : 1
          : 0;
  return e.slv;
} // 1 down to the wrist, 0.45 rolled up or torn, 0 a bare forearm
function armSeg(shx, shy, ex, ey, hx, hy, w1, w2, side, skin, sleeve, fl, handSc, ls) {
  // shoulder to elbow to hand: a sleeve over the upper arm and, for long sleeves, over the forearm too
  lineQ(shx, shy, ex, ey, w1 * 1.05, sleeve[0], sleeve[1], sleeve[2], 1, 0, 0, 0, fl, R[ZP + 'upper']);
  if (ls > 0) {
    const k = ls * 0.84,
      mx = ex + (hx - ex) * k,
      my = ey + (hy - ey) * k;
    lineQ(
      mx - (hx - ex) * 0.06,
      my - (hy - ey) * 0.06,
      hx,
      hy,
      w2 * 0.95,
      skin[0],
      skin[1],
      skin[2],
      1,
      0,
      0,
      0,
      fl,
      R[ZP + 'fore']
    );
    quad(
      R[ZP + 'elbow'],
      ex,
      ey,
      Math.atan2(ey - shy, ex - shx),
      (w2 * 1.2) / 6.4,
      (w2 * 1.2) / 6.4,
      sleeve[0],
      sleeve[1],
      sleeve[2],
      1,
      0,
      0,
      0,
      fl
    );
    lineQ(
      ex,
      ey,
      mx,
      my,
      w2 * 1.28,
      sleeve[0] * 0.94,
      sleeve[1] * 0.94,
      sleeve[2] * 0.94,
      1,
      0,
      0,
      0,
      fl,
      R[ZP + 'upper']
    );
  } else {
    quad(
      R[ZP + 'elbow'],
      ex,
      ey,
      Math.atan2(ey - shy, ex - shx),
      w2 / 6.4,
      w2 / 6.4,
      skin[0],
      skin[1],
      skin[2],
      1,
      0,
      0,
      0,
      fl
    );
    lineQ(ex, ey, hx, hy, w2 * 1.1, skin[0], skin[1], skin[2], 1, 0, 0, 0, fl, R[ZP + 'fore']);
  }
  quad(
    R[ZP + 'hand'],
    hx,
    hy,
    Math.atan2(hy - ey, hx - ex),
    handSc,
    handSc * side,
    skin[0],
    skin[1],
    skin[2],
    1,
    1,
    1,
    1,
    fl
  );
}
function natElbow(sx, sy, hx, hy, L, cx, cy) {
  // a relaxed human elbow seen from above: a soft bend that always points away from the body; when the hand comes close the arm drops toward the ground (looks shorter) instead of folding into a sharp V
  const dx = hx - sx,
    dy = hy - sy,
    d = Math.hypot(dx, dy),
    mx = (sx + hx) / 2,
    my = (sy + hy) / 2;
  if (d < 1e-3) {
    const ox = sx - cx,
      oy = sy - cy,
      ol = Math.hypot(ox, oy) || 1;
    return [sx + (ox / ol) * L * 0.25, sy + (oy / ol) * L * 0.25];
  }
  const off = Math.min(Math.sqrt(Math.max(0, L * L - (d * d) / 4)) * 0.34, L * 0.32),
    px = (-dy / d) * off,
    py = (dx / d) * off;
  return (mx + px - cx) ** 2 + (my + py - cy) ** 2 >= (mx - px - cx) ** 2 + (my - py - cy) ** 2
    ? [mx + px, my + py]
    : [mx - px, my - py];
}
function zArm(W, sh, hand, L, w1, w2, side, skin, sleeve, fl, handSc, gone, ls = 0, nat = true) {
  const [shx, shy] = W(sh[0], sh[1]);
  if (gone) {
    const [tx, ty] = W(sh[0] + 3, sh[1] + side * 2);
    lineQ(shx, shy, tx, ty, w1, sleeve[0], sleeve[1], sleeve[2], 1, 0, 0, 0, fl, R[ZP + 'upper']);
    quad(R.drop, tx, ty, 0, 1.3, 1.3, 0.5, 0.03, 0.03, 1, 0, 0, 0, fl);
    return;
  }
  const [hx, hy] = W(hand[0], hand[1]),
    [ex, ey] = nat ? natElbow(shx, shy, hx, hy, L, ...W(-2, 0)) : ik2(shx, shy, hx, hy, L, L, -side);
  armSeg(shx, shy, ex, ey, hx, hy, w1, w2, side, skin, sleeve, fl, handSc, ls);
}
function drawEnemy(e) {
  const dead = e.dying !== undefined && !e.__std,
    fl =
      e.flash > 0 && !dead
        ? (e.big || e.type === 'queen' || e.type === 'beetle' ? 0.22 : 0.34) * Math.min(1, e.flash / 0.05)
        : 0; // a hit shows as a brief pale flare on the body, not a white cut-out
  const fall = dead ? (t => t * t)(Math.min(1, e.dying / 0.5)) : 0,
    fade = dead ? clamp(((e.keep || 0.55) - e.dying) / 1.5, 0, 1) : 1;
  const em =
    (e.emerge < 1 ? e.emerge * (2 - e.emerge) : 1) *
    (e.sc || 1) *
    (e.type === 'queen' ? 1 : 1.2) *
    (e.__std ? e.__ss || 1 : 1);
  if (e.elite) {
    if (e.trait === 'bloater') {
      gR = 0.94;
      gG = 0.98;
      gB = 0.7;
    } else if (e.trait === 'armored') {
      gR = 0.86;
      gG = 0.88;
      gB = 0.94;
    } else if (e.trait === 'screamer') {
      gR = 1.1;
      gG = 0.96;
      gB = 0.92;
    } else {
      gR = 1.04;
      gG = 0.86;
      gB = 0.8;
    }
  } // an elite has been dead longer and fed more: bigger, darker with old blood
  const sq = e.squash > 0 ? Math.sin((e.squash / 0.18) * Math.PI) * 0.14 : 0;
  gT = e.lurk === 'lie' ? 0.58 : 1 - fall * 0.42;
  gA = fade * (0.3 + 0.7 * (e.sv ?? 1)) * (e.__std ? e.__sa : 1);
  if (gA < 0.01) {
    gT = 1;
    gA = 1;
    gR = gG = gB = 1;
    return;
  }
  const sink = e.emerge < 1 ? 1 - e.emerge : 0;
  const ta = e.a + (dead ? 0 : Math.sin(time * 40) * e.wob * 0.08),
    c = Math.cos(ta),
    s = Math.sin(ta);
  const W = (lx, ly) => [e.x + (lx * c - ly * s) * em, e.y - e.z + (lx * s + ly * c) * em + sink * 6];
  const ph = (e.stride || 0) * TAU,
    mv = dead ? 0 : Math.min(1, Math.hypot(e.vx, e.vy) / 50);
  const v = e.v || 0,
    skin = ZSKIN[e.sk || 0],
    shirt = ZSHIRT[v];
  const humanoid =
    e.type === 'skitter' || e.type === 'wasp' || e.type === 'flower' || e.type === 'beetle' || e.type === 'hopper';
  if (dead && humanoid && e.type !== 'hopper') {
    drawBody(e, fl, fall, em, skin, shirt);
    gT = 1;
    gA = 1;
    gR = gG = gB = 1;
    return;
  }
  if (e.type === 'mini' && !e.__std) {
    drawBody(e, fl, 0, em, skin, shirt);
    gT = 1;
    gA = 1;
    gR = gG = gB = 1;
    return;
  } // half a body, dragging itself
  if (e.crawl && !dead && !e.__std) {
    drawBody(e, fl, 0, em, skin, shirt);
    gT = 1;
    gA = 1;
    gR = gG = gB = 1;
    return;
  }
  if (e.down > 0 && humanoid && e.type !== 'hopper' && !e.__std) {
    drawBody(e, fl, 0, em, skin, shirt);
    gT = 1;
    gA = 1;
    gR = gG = gB = 1;
    return;
  }
  switch (e.type) {
    case 'skitter':
    case 'wasp':
    case 'flower':
    case 'beetle':
    case 'hopper': {
      const brute = e.type === 'beetle',
        bloat = e.type === 'hopper',
        spit = e.type === 'wasp',
        scream = e.type === 'flower',
        run = e.run;
      const K = brute ? 1.9 : bloat ? 1.25 : 1,
        limp = e.limp && !run && !brute && !bloat,
        lurch = run ? 0 : Math.sin(ph) * (limp ? 0.14 : 0.09) * mv;
      const sway =
          (run ? 0.8 : limp ? 2.8 : 1.6) * Math.sin(ph) * mv * K +
          (e.wbT > 0 ? Math.sin(time * 9 + (e.id || 0)) * 3.4 * Math.min(1, e.wbT / 0.5) * K : 0),
        fk = e.flT > 0 && !dead ? e.flT / 0.16 : 0,
        fwx = (e.fdx || 0) * 4 * fk * em,
        fwy = (e.fdy || 0) * 4 * fk * em; // weight rolling from foot to foot; a hit knocks the upper body back
      const Wb = (lx, ly) => {
          const q = W(lx, ly + sway);
          return [q[0] + fwx, q[1] + fwy];
        },
        look = dead ? 0 : clamp(angDiff(ta, e.hl ?? ta), -0.9, 0.9);
      // feet
      setH(2);
      const stepL = (run ? 15 : 9) * K * mv,
        drag = run ? 1 : 0.55;
      for (const sd of [-1, 1]) {
        const bad = limp && sd > 0,
          f = Math.sin(ph + (sd > 0 ? Math.PI : 0)) * stepL * (bad ? 0.3 : sd > 0 ? drag : 1) - (bad ? 4 * mv : 0),
          [fx, fy] = W(f, sd * 7 * K + (bad ? 1.5 : 0));
        quad(R.z_foot, fx, fy, ta + sd * 0.12 + (bad ? 0.5 : 0), K * em, K * em, 1, 1, 1, 1, 1, 1, 1, fl);
        if (bad && mv > 0.3 && Math.random() < 0.02) dust(fx, fy, 1, 14, 0.5, 0.35);
      } // the bad foot drags behind, turned out, scuffing
      // arms (pose per type)
      const tw = dead ? 0 : Math.sin(time * 2.2 + e.id) * 3;
      let hands;
      if (brute) {
        const st = e.st,
          swing = Math.sin(ph) * 8 * mv;
        hands =
          st === 'rear'
            ? [
                [6, -46],
                [6, 46],
              ]
            : st === 'charge'
              ? [
                  [44, -16],
                  [44, 16],
                ]
              : st === 'stun'
                ? [
                    [-10, -34],
                    [-10, 34],
                  ]
                : [
                    [24 + swing, -34],
                    [24 - swing, 34],
                  ];
      } else if (bloat)
        hands = [
          [9 + tw + Math.sin(ph) * 3 * mv, -33],
          [9 - tw - Math.sin(ph) * 3 * mv, 33],
        ];
      // arms held out round the belly, swinging with the waddle
      else if (spit)
        hands =
          e.charging > 0
            ? [
                [2, -18],
                [2, 18],
              ]
            : [
                [10 + Math.sin(ph) * 4, -17],
                [10 - Math.sin(ph) * 4, 17],
              ];
      else if (scream) {
        const o = e.open || 0;
        hands = [
          [lerp(14, -10, o), lerp(-5, -28, o)],
          [lerp(14, -10, o), lerp(5, 28, o)],
        ];
      } else if (run)
        hands = [
          [Math.sin(ph) * 13, -14],
          [-Math.sin(ph) * 13, 14],
        ];
      else {
        const reach = e.st === 'crouch' ? 4 : 0,
          sw = Math.sin(ph),
          pose = e.st === 'crouch' ? 0 : e.pose || 0;
        if (pose === 1) {
          const r = [22 + reach + tw + sw * 3, 0],
            l = [6 + sw * 6 * mv, 0];
          hands = e.limp
            ? [
                [r[0], -11],
                [l[0], 19],
              ]
            : [
                [l[0], -19],
                [r[0], 11],
              ];
        } // one arm reaching, the other dead at the side
        else if (pose === 2)
          hands = [
            [8 + sw * 7 * mv + tw * 0.4, -18],
            [8 - sw * 7 * mv - tw * 0.4, 18],
          ];
        // arms hanging, swinging with the shamble
        else if (pose === 3)
          hands = [
            [24 + reach + tw, -10],
            [13 + reach - tw * 0.6 + sw * 2, 16],
          ];
        // one hand high and grasping, one low
        else
          hands = [
            [22 + reach + tw + sw * 3, -11.5],
            [20.5 + reach - tw - sw * 3, 11.5],
          ];
      } // reaching out at shoulder width, elbows a little soft
      if (!dead && e.trait === 'bloater')
        hands = [
          [11 + Math.sin(ph) * 3 * mv, -21],
          [11 - Math.sin(ph) * 3 * mv, 21],
        ]; // arms out round the swollen gut
      if (!dead && e.trait === 'screamer' && (e.scrPose || 0) > time) {
        const k3 = Math.sin(clamp((e.scrPose - time) / 0.9, 0, 1) * Math.PI);
        hands = hands.map(h => [lerp(h[0], -8, k3), lerp(h[1], (h[1] < 0 ? -1 : 1) * 27, k3)]);
      } // the scream: arms flung back and out, chest up
      if (e.shield && !dead)
        hands =
          e.st === 'bash'
            ? [
                [25, -6],
                [25, 6],
              ]
            : e.st === 'bashW'
              ? [
                  [9, -7],
                  [10, 6],
                ]
              : [
                  [16, -6],
                  [17, 5],
                ]; // both hands on the shield's grip
      if (e.__kn > 0) {
        const k2 = e.__kn * e.__kn * (3 - 2 * e.__kn);
        hands = hands.map(h => [
          lerp(h[0], e.sup ? -3 : 18, k2),
          lerp(h[1], (h[1] < 0 ? -1 : 1) * (e.sup ? 16 : 12.5), k2),
        ]);
      } // kneeling: the hands start where they were planted on the ground in front, and come up into the reach as it rises
      if (e.lunge > 0 && !scream && !spit) {
        const lk = Math.sin(clamp(1 - e.lunge / 0.42, 0, 1) * Math.PI);
        hands = hands.map(h => [h[0] + (brute ? 22 : 15) * lk, h[1] * (1 - 0.45 * lk)]);
      }
      const sh = brute ? 23 : bloat ? 20 : 12.5,
        L = brute ? 18 : bloat ? 12.5 : 12.5,
        w1 = brute ? 12 : bloat ? 13.5 : 7.4,
        w2 = brute ? 9 : bloat ? 10.5 : 5.5; // a person's arm tapers from the shoulder to a narrow wrist
      const tc = e.tc || [1, 1, 1],
        sleeve = brute
          ? [0.3, 0.24, 0.2]
          : bloat
            ? [0.27, 0.33, 0.39]
            : spit
              ? [0.4, 0.42, 0.34]
              : scream
                ? [0.36, 0.33, 0.38]
                : v === 16
                  ? skin
                  : [shirt[0] * tc[0], shirt[1] * tc[1], shirt[2] * tc[2]];
      const armSkin = scream ? [0.6, 0.57, 0.64] : brute ? [0.44, 0.4, 0.35] : skin;
      setH(16 * K);
      for (let i = 0; i < 2; i++) {
        const sd = i ? 1 : -1;
        zArm(
          Wb,
          [brute ? -2 : bloat ? -6 : 0, sd * sh],
          hands[i],
          L * em,
          w1 * em,
          w2 * em,
          sd,
          armSkin,
          sleeve,
          fl,
          (brute ? 1.6 : bloat ? 1.1 : 0.95) * em,
          e.lost && e.lost[i],
          sleeveLen(e)
        );
      }
      // torso + head
      setH(20 * K);
      if (brute) {
        const rear = e.st === 'rear' ? 1.06 + Math.sin(time * 40) * 0.02 : 1;
        quad(
          R.z_brute,
          e.x + fwx,
          e.y - e.z + fwy,
          ta + lurch + fk * 0.08 * (e.flS || 1) + (e.st === 'stun' ? Math.sin(time * 22) * 0.08 : 0),
          em * rear * (1 + sq * 0.4),
          em * rear,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          fl
        );
        const [hx, hy] = Wb(12, look * 2);
        e.__hx = hx;
        e.__hy = hy;
        e.__ht = time;
        e.__ha = ta + look * 0.8;
        setH(40);
        quad(
          R.z_bhead,
          hx + fwx * 0.5,
          hy + fwy * 0.5,
          ta + look * 0.8 + (dead ? 0 : Math.sin(time * 1.3 + e.id) * 0.08),
          em * 1.32,
          em * 1.32,
          1,
          1,
          1,
          1,
          e.st === 'rear' || e.st === 'charge' ? 3 : 1.6,
          e.st === 'rear' ? 1.4 : 1.2,
          1,
          fl
        );
        if (e.st === 'stun' && !SHMODE && Math.random() < 0.15)
          part({
            k: 8,
            x: e.x + Math.cos(ta) * 30,
            y: e.y + Math.sin(ta) * 30,
            z: 30,
            vz: 0,
            vx: rand(-10, 10),
            vy: rand(-10, 10),
            life: 1,
            max: 1,
            size: 0.6,
            drag: 1,
            c: BLOOD,
          }); // dazed: drool and blood, not cartoon stars
      } else if (bloat) {
        const sw = e.swell || 0,
          pu = 1 + Math.sin(time * (3 + sw * 20) + e.id) * (0.025 + sw * 0.05) + sw * 0.28 + sq;
        quad(
          R.z_bloat,
          e.x,
          e.y - e.z,
          ta + lurch * 0.5,
          em * pu,
          em * pu,
          1,
          1,
          1,
          1,
          1 + sw * 2,
          1 + sw * 1.5,
          1,
          fl
        );
        const [hx, hy] = W(-2 * pu + look * 0.5, look * 2.5);
        e.__hx = hx;
        e.__hy = hy;
        e.__ht = time;
        e.__ha = ta + look * 0.6;
        setH(38);
        quad(R.z_bhead, hx, hy, ta + look * 0.6, em * 0.98, em * 0.98, 0.92, 1.02, 0.9, 1, 1.4, 1.4, 1.4, fl); // the head sits on the shoulders, a bald swollen skull
      } else {
        const torso = spit ? R.z_torso_spit : scream ? R.z_scream : R['z_torso' + v];
        const hunch = scream ? 1 - (1 - (e.open || 0)) * 0.06 : spit && e.charging > 0 ? 1.08 : 1;
        const torsoA = ta + lurch;
        const kn = e.__std
          ? e.__kn || 0
          : 0; /* kneeling, the back is bent forward: from above the torso shows longer and sits ahead of the hips */
        const [tbx, tby] = Wb(3 * kn, 0);
        const gut = e.trait === 'bloater' ? 1.2 + Math.sin(time * 2.6 + e.id) * 0.025 : 1;
        quad(
          torso,
          tbx,
          tby,
          ta + lurch + fk * 0.14 * (e.flS || 1),
          em * hunch * (1 + sq) * (run ? 1.06 : 1) * (1 + 0.12 * kn) * gut,
          em * hunch * (1 - sq * 0.5) * 1.07 * (gut > 1 ? 1.12 : 1),
          spit || scream ? 1 : tc[0],
          spit || scream ? 1 : tc[1],
          spit || scream ? 1 : tc[2],
          1,
          1,
          1,
          1,
          fl
        );
        if (e.wounds)
          for (const w of e.wounds) {
            const [wx, wy] = W(w.x, w.y);
            quad(R.wound, wx, wy, torsoA + w.r, em, em, 1, 1, 1, 1, 0, 0, 0, fl);
          }
        if (!e.headless) {
          const head = spit ? R.z_head_spit : scream ? R.z_shead : R['z_head' + (e.hv || 0)];
          const tilt = dead ? 0 : Math.sin(time * 1.7 + e.id * 2.3) * 0.35 + (e.tilt || 0),
            hf = scream ? lerp(4, -2, e.open || 0) : run ? 7 : 4;
          const [hx0, hy0] = Wb(hf + 5 * kn - fk * 2, Math.sin(time * 1.1 + e.id) * 1.2 + look * 2.2),
            hx = hx0 + fwx * 0.6,
            hy = hy0 + fwy * 0.6;
          setH(30); /* the head snaps back further than the shoulders */
          const glowE = scream ? 1 + (e.open || 0) * 3 : spit && e.charging > 0 ? 3.2 : 1.5;
          e.__hx = hx;
          e.__hy = hy;
          e.__ht = time;
          e.__ha = ta + look * 0.85;
          quad(
            head,
            hx,
            hy,
            ta + tilt * 0.45 + look * 0.85 - fk * 0.3 * (e.flS || 1),
            em * 0.86 * (scream ? 1 + (e.open || 0) * 0.1 : 1),
            em * 0.86,
            1,
            1,
            1,
            1,
            glowE,
            glowE,
            glowE,
            fl
          ); /* from above a head is about a third as wide as the shoulders */
        } else {
          const [hx, hy] = W(4, 0);
          setH(30);
          quad(R.drop, hx, hy, 0, 2, 2, 0.45, 0.02, 0.02, 1, 0, 0, 0, fl);
        }
      }
      if (e.shield && !dead) {
        const sx0 = e.st === 'bash' ? 30 : e.st === 'bashW' ? 15 : 21,
          [sx, sy] = W(sx0, 0),
          sa = ta + (shieldUp(e) ? 0 : 0.7);
        setH(26 * K);
        const hk = 0.75 + 0.25 * clamp(e.shield.hp / e.shield.max, 0, 1);
        quad(R.riotshield, sx, sy, sa, em * 0.78, em * 0.78, hk, hk, hk, 1, 0, 0, 0, fl * 0.5);
      } // the shield, out in front of the chest; lowered and swung aside while it is dazed
      ZP = 'z_';
      break;
    }
    case 'mini': {
      // crawler: half a body dragging its guts
      const pull = Math.sin(ph),
        [bx, by] = W(-12, 0);
      setH(3);
      for (let i = 0; i < 3; i++) {
        const sw = dead ? 0 : Math.sin(time * 3 + i * 2 + e.id) * 4,
          [gx, gy] = W(-24 - i * 3, (i - 1) * 4 + sw);
        lineQ(bx, by, gx, gy, 3.2 - i * 0.6, 0.62 - i * 0.08, 0.16, 0.18, 1, 0, 0, 0, fl);
      }
      setH(6);
      for (let i = 0; i < 2; i++) {
        const sd = i ? 1 : -1,
          f = (i ? -pull : pull) * 9;
        zArm(W, [4, sd * 11], [22 + f, sd * 15], 11 * em, 4.8 * em, 3.8 * em, sd, skin, shirt, fl, em * 0.8, false);
      }
      setH(8);
      quad(R['z_torso' + v], e.x, e.y - e.z, ta + pull * 0.08, em * 0.72, em * 0.86, 1, 1, 1, 1, 1, 1, 1, fl);
      const [hx, hy] = W(10, 0);
      setH(12);
      quad(R['z_head' + (e.hv || 0)], hx, hy, ta + pull * 0.2, em * 0.84, em * 0.84, 1, 1, 1, 1, 1.5, 1.5, 1.5, fl);
      break;
    }
    case 'egg': {
      const jg = (e.wob || 0) * Math.sin(time * 55) * 0.05,
        sw = 1 + Math.sin(time * (e.hatch < 2 ? 9 : 3) + e.id) * (e.hatch < 2 ? 0.08 : 0.04) + jg,
        k = dead ? 0.6 : 1;
      /* a hit makes the sac quiver in place, nothing more */ setH(6);
      quad(
        R.ab_egg,
        e.x,
        e.y - e.z,
        e.a,
        1.5 * em * sw * (dead ? 1.3 : 1),
        1.5 * em * sw * k,
        dead ? 0.5 : 1,
        dead ? 0.55 : 1,
        dead ? 0.4 : 1,
        1,
        0.22,
        0.28,
        0.12,
        fl
      );
      break;
    }
    case 'hound': {
      const lunge = e.st === 'leap' ? 1 : e.st === 'crouch' ? -0.5 : 0,
        gal = Math.sin(ph);
      setH(4);
      for (const [hipX, front] of [
        [13, true],
        [-12, false],
      ])
        for (const sd of [-1, 1]) {
          // a gallop seen from above: the legs reach fore and aft under the body, the hind pair driving together, half a beat off the front pair; a lifted leg folds up and looks shorter
          const p = ph + (front ? 0 : Math.PI) + (sd > 0 ? (front ? 0.45 : 0.3) : 0),
            sw = Math.sin(p),
            lift = Math.max(0, Math.cos(p)) * Math.min(1, mv * 1.4),
            reach = (front ? 19 : 17) * mv;
          const f = sw * reach + lunge * (front ? 12 : -10),
            L = (front ? 20 : 19) * (1 - 0.35 * lift);
          const footX = hipX + Math.sign(f || (front ? 1 : -1)) * Math.min(Math.abs(f), L),
            footY = sd * (8.2 - lift * 2);
          const [hx, hy] = W(hipX, sd * 5.5),
            [fx, fy] = W(footX, footY),
            [kx, ky] = W(hipX + (footX - hipX) * 0.5 + (front ? -1.5 : 2.2) * (0.5 + lift), sd * (8.4 - lift)); // the elbow tucks back, the hock juts back
          lineQ(hx, hy, kx, ky, (front ? 3.8 : 4.8) * em, 0.3, 0.24, 0.19, 1, 0, 0, 0, fl);
          lineQ(kx, ky, fx, fy, 2.4 * em, 0.24, 0.19, 0.15, 1, 0, 0, 0, fl);
        }
      const [t0x, t0y] = W(-19, 0),
        [t1x, t1y] = W(-30, dead ? 3 : Math.sin(time * 9 + e.id) * 5);
      /* a dead dog's tail lies still */ lineQ(t0x, t0y, t1x, t1y, 3, 0.3, 0.24, 0.2, 1, 0, 0, 0, fl);
      setH(12);
      quad(
        R.z_hound,
        e.x,
        e.y - e.z,
        ta + gal * 0.05,
        em * (1 + lunge * 0.12 + sq + gal * 0.03 * mv),
        em * (1 - lunge * 0.06) * 0.86,
        /* a lean, deep-chested dog, not a sausage: the back flexes with each bound */ 1,
        1,
        1,
        1,
        1,
        1,
        1,
        fl
      );
      const [hx, hy] = W(22 + lunge * 4, 0);
      e.__hx = hx;
      e.__hy = hy;
      e.__ht = time;
      e.__ha = ta;
      e.__hk = 0.75;
      setH(16);
      quad(
        R.z_hhead,
        hx,
        hy,
        ta + (dead ? 0.15 : Math.sin(time * 4 + e.id) * 0.12),
        em,
        em,
        1,
        1,
        1,
        1,
        dead ? 1 : e.st === 'crouch' ? 3 : 1.6,
        dead ? 1 : e.st === 'crouch' ? 1.6 : 1.3,
        1,
        fl
      );
      break;
    }
    case 'queen': {
      if (e.giant) {
        drawGiant(e, fl, em, ta);
        break;
      }
      if (e.tint) {
        gR = e.tint[0];
        gG = e.tint[1];
        gB = e.tint[2];
      }
      const sv = e.a,
        svy = e.y,
        lift = e.z || 0;
      e.a = ta;
      e.y -= lift;
      const kz = 1 + lift / 420;
      drawLegs(e, em * kz, fl, dead ? Math.min(1, e.dying) : lift > 20 ? 0.7 : 0);
      const W2 = (lx, ly, k = em * kz) => toWorld(e, lx, ly, k);
      for (const sd of [-1, 1]) {
        const [shx, shy] = W2(40, sd * 52),
          reach = 104 + e.claw * 58,
          [tx, ty] = W2(reach, sd * (58 - e.claw * 40));
        const [kx, ky, cx, cy] = ik2(shx, shy, tx, ty, 58 * em * kz, 58 * em * kz, sd);
        setH(22);
        lineQ(shx, shy, kx, ky, 24 * em, 0.68, 0.62, 0.62, 1, 0, 0, 0, fl, R.ab_limb);
        quad(R.z_elbow, kx, ky, 0, 3 * em, 3 * em, 0.56, 0.5, 0.5, 1, 0, 0, 0, fl);
        lineQ(kx, ky, cx, cy, 20 * em, 0.56, 0.49, 0.49, 1, 0, 0, 0, fl, R.ab_limb);
        const fa = Math.atan2(cy - ky, cx - kx);
        setH(24);
        quad(
          R.ab_blade,
          cx + Math.cos(fa) * 22 * em,
          cy + Math.sin(fa) * 22 * em,
          fa + sd * 0.25,
          em * kz,
          em * kz * -sd,
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
      const pts = queenTail(e),
        hr = e.hoseR || 0,
        tailDraw = () => {
          // when it rears to hose, the tail comes up over its back: on top of the body, a little bigger for being closer to the camera
          for (let i = 0; i < pts.length - 1; i++) {
            const [ax, ay] = W2(pts[i][0], pts[i][1]),
              [bx, by] = W2(pts[i + 1][0], pts[i + 1][1]),
              up = 1 + hr * 0.18 * Math.sin(((i + 0.5) / (pts.length - 1)) * Math.PI);
            const lk = e.tailLimp > 0 ? 0.62 : 1;
            setH((26 + i * 4) * (e.tailLimp > 0 ? 0.4 : 1) + hr * 40);
            quad(
              R.ab_seg,
              (ax + bx) / 2,
              (ay + by) / 2,
              Math.atan2(by - ay, bx - ax),
              em * kz * (1 - i * 0.06) * up,
              em * kz * (1 - i * 0.06) * up,
              lk,
              lk * 0.95,
              lk * 0.9,
              1,
              lk,
              lk,
              lk,
              fl
            );
          }
          const tip = pts[pts.length - 1],
            [mx2, my2] = W2(tip[0], tip[1]),
            charge = e.tailT < 0.4 || hr > 0.3 ? 2.6 : 0.35,
            aim = hr > 0.3 && e.hoseNow !== undefined ? e.hoseNow : Math.atan2(P.y - my2, P.x - mx2);
          setH(50 + hr * 40);
          quad(
            R.ab_mouth,
            mx2,
            my2,
            aim,
            em * kz * (1 + hr * 0.15),
            em * kz * (1 + hr * 0.15),
            1,
            1,
            1,
            1,
            charge,
            charge,
            charge,
            fl
          );
        };
      if (hr < 0.5) tailDraw();
      {
        /* the head grows out of the front of the mass on a thick neck: drawn first, so the body's flesh laps over the back of it and it never floats */
        const tw = angDiff(e.a, e.face || e.a) * 0.4,
          [nx0, ny0] = W2(34, 0),
          [hx, hy] = W2(70 + Math.cos(tw) * 0, Math.sin(tw) * 10);
        setH(30);
        lineQ(nx0, ny0, hx, hy, 46 * em * kz, 0.58, 0.51, 0.51, 1, 0, 0, 0, fl, R.ab_limb);
        const rage = e.ph === 2 ? 2.6 + Math.sin(time * 12) * 0.6 : 1.6;
        setH(36);
        const hv =
          e.st === 'act' && e.act === 'volley' ? 1 + 0.1 * Math.sin(clamp(1 - e.stT / 0.45, 0, 1) * Math.PI) : 1;
        /* the head swells as it hacks up the bile */ quad(
          R.ab_head,
          hx,
          hy,
          e.a + tw,
          em * kz * hv,
          em * kz * hv,
          1,
          1,
          1,
          1,
          rage * (hv > 1 ? 1.4 : 1),
          rage,
          rage,
          fl
        );
      }
      setH(34);
      const br = 1 + Math.sin(time * 2.2) * 0.015 + sq * 0.2 + (e.st === 'crouch' ? 0.06 : 0);
      quad(R.ab_body, e.x, e.y, e.a, em * kz * br, em * kz * br, 1, 1, 1, 1, 1, 1, 1, fl);
      if (hr >= 0.5) tailDraw();
      e.a = sv;
      e.y = svy;
      break;
    }
  }
  if (e.elite && !(e.dying !== undefined) && !e.__std && !SHMODE && e.__ht === time && !(e.down > 0)) {
    const sv = gA;
    gR = gG = gB = 1;
    gT = 1;
    setH(46);
    for (let i = 0; i < 9; i++) {
      const t = time * (2.6 + i * 0.43) + i * 2.1 + e.id,
        r = (10 + 6 * Math.sin(time * 3.1 + i * 1.3)) * (e.sc || 1),
        fx = e.__hx + Math.cos(t) * r + Math.sin(time * 17 + i * 5) * 1.4,
        fy = e.__hy + Math.sin(t * 1.3) * r * 0.75 - 4;
      quad(R.pixel, fx, fy, t * 3, 0.55, 0.38, 0.05, 0.05, 0.04, 0.9 * sv, 0, 0, 0, 0);
    }
  } // flies: it has been dead the longest, and they follow it
  gT = 1;
  gA = 1;
  gR = gG = gB = 1;
}
/* the three humanoid bosses: one rig, dressed and armed per district */
const GIANT = {
  roadkill: {
    K: 2.7,
    sh: 56,
    L: 38,
    w1: 27,
    w2: 21,
    hand: 3.6,
    reach: 72,
    hx: 34,
    cap: 0.9,
    skin: [0.6, 0.48, 0.42],
    sleeve: [0.58, 0.46, 0.4],
    capC: [0.62, 0.5, 0.44],
    boot: [0.3, 0.26, 0.22],
    torso: 'rk_torso',
    head: 'rk_head',
    hs: 1.05,
  },
  grave: {
    K: 2.3,
    sh: 42,
    L: 44,
    w1: 16,
    w2: 12,
    hand: 2.8,
    reach: 66,
    hx: 24,
    cap: 0.72,
    skin: [0.6, 0.6, 0.56],
    sleeve: [0.3, 0.28, 0.21],
    capC: [0.36, 0.33, 0.26],
    boot: [0.18, 0.15, 0.13],
    torso: 'gk_torso',
    head: 'gk_head',
    hs: 1.05,
  },
  chief: {
    K: 2.5,
    sh: 50,
    L: 40,
    w1: 19,
    w2: 15,
    hand: 3.1,
    reach: 68,
    hx: 30,
    cap: 0.8,
    skin: [0.6, 0.58, 0.52],
    sleeve: [0.5, 0.44, 0.3],
    capC: [0.54, 0.47, 0.32],
    boot: [0.12, 0.11, 0.1],
    torso: 'cf_torso',
    head: 'cf_head',
    hs: 1.05,
  },
  pz: {
    K: 2.5,
    sh: 52,
    L: 36,
    w1: 21,
    w2: 16,
    hand: 3.2,
    reach: 62,
    hx: 30,
    cap: 0.82,
    skin: [0.68, 0.63, 0.58],
    sleeve: [0.52, 0.62, 0.63],
    capC: [0.55, 0.64, 0.65],
    boot: [0.66, 0.62, 0.58],
    torso: 'pz_torso',
    head: 'pz_head',
    hs: 1.05,
  },
};
function drawGiant(e, fl, em, ta) {
  const G = GIANT[e.btype] || GIANT.roadkill,
    bt = e.btype,
    lift = e.z || 0,
    E = em * (1 + lift / 420),
    dying = e.dying !== undefined,
    df = dying ? Math.min(1, e.dying / 0.9) : 0,
    fe = df * df;
  const c = Math.cos(ta),
    s = Math.sin(ta),
    ox = (e.rcx || 0) - c * 26 * fe * E,
    oy = (e.rcy || 0) - s * 26 * fe * E,
    y0 = e.y - lift + oy,
    x0 = e.x + ox;
  const W = (lx, ly) => [x0 + (lx * c - ly * s) * E, y0 + (lx * s + ly * c) * E];
  const mv = dying ? 0 : clamp(Math.hypot(e.vx, e.vy) / 110, 0, 1.4),
    ph = (e.stride || 0) * TAU,
    cl = e.claw || 0,
    wd = e.wind || 0,
    st = dying ? 'dead' : e.st,
    sq = e.squash > 0 ? Math.sin((e.squash / 0.18) * Math.PI) * 0.08 : 0;
  const slump = !dying && e.st === 'move' && e.recT > 0.25 && !(e.stunT > 0); // an opening you can see
  // legs and boots: a long stride you can see under the body
  if (!dying) {
    setH(3);
    const stepL = 13 * G.K * Math.min(1, mv) * (st === 'charge' || st === 'rush' || st === 'sprint' ? 1.5 : 1);
    for (const sd of [-1, 1]) {
      const f = Math.sin(ph + (sd > 0 ? Math.PI : 0)) * stepL,
        [hx, hy] = W(-6, sd * 10 * G.K),
        [fx, fy] = W(f - 2, sd * 11 * G.K);
      lineQ(
        hx,
        hy,
        fx,
        fy,
        9 * G.K * E,
        G.sleeve[0] * 0.55,
        G.sleeve[1] * 0.55,
        G.sleeve[2] * 0.55,
        1,
        0,
        0,
        0,
        fl,
        R.z_upper
      );
      quad(R.z_foot, fx, fy, ta + sd * 0.1, G.K * E, G.K * E, G.boot[0], G.boot[1], G.boot[2], 1, 0.5, 0.5, 0.5, fl);
    }
  }
  // arms: the pose says what is coming
  const sw = Math.sin(ph) * 9 * Math.min(1, mv);
  let hands;
  if (dying)
    hands = [
      [-10 - 30 * fe, -G.sh * (1.3 + 0.3 * fe)],
      [-10 - 30 * fe, G.sh * (1.3 + 0.3 * fe)],
    ];
  else if (st === 'rear' || st === 'roar')
    hands = [
      [6, -G.sh * 1.6],
      [6, G.sh * 1.6],
    ];
  // arms thrown wide
  else if (st === 'charge' || st === 'sprint')
    hands = [
      [G.reach * 1.1, -G.sh * 0.5],
      [G.reach * 1.1, G.sh * 0.5],
    ];
  else if (st === 'act' && e.act === 'stomp')
    hands = [
      [G.reach * 0.25, -G.sh * 1.4],
      [G.reach * 0.25, G.sh * 1.4],
    ];
  // arms up and out: the whole weight comes down
  else if (st === 'act' && e.act === 'pull') {
    const j = Math.sin(time * 18) * 5;
    hands = [
      [G.reach * 0.95 + j, -G.sh * 0.3],
      [G.reach * 0.95 + j, G.sh * 0.3],
    ];
  } // both fists on the sign post, heaving
  else if (st === 'act' && e.act === 'bolt')
    hands = [
      [-G.reach * 0.15, -G.sh * 1.15],
      [-G.reach * 0.15, G.sh * 1.15],
    ];
  // hunched, arms back: about to go
  else if (slump)
    hands = [
      [G.reach * 0.32, -G.sh * 1.08],
      [G.reach * 0.36, G.sh * 1.08],
    ];
  // spent: arms hanging, head down
  else if (e.stunT > 0)
    hands = [
      [G.reach * 0.2, -G.sh * 1.25 + Math.sin(time * 9) * 6],
      [G.reach * 0.05, G.sh * 1.2],
    ];
  else if (st === 'act' && e.act === 'signthrow')
    hands = [
      [-G.reach * 0.2, -G.sh * 0.9],
      [-G.reach * 0.55, G.sh * 1.2],
    ];
  // the sign drawn far back
  else if (st === 'act' && e.act === 'retch')
    hands = [
      [G.reach * 0.5, -G.sh * 0.8],
      [G.reach * 0.5, G.sh * 0.8],
    ];
  else if (st === 'act' && e.act === 'spear') {
    const f = clamp(1 - e.stT / 0.6, 0, 1);
    hands = [
      [lerp(-G.reach * 0.3, G.reach * 0.2, f), -G.sh * 0.3],
      [lerp(-G.reach * 0.1, G.reach * 0.5, f), G.sh * 0.2],
    ];
  } else if (st === 'inhale')
    hands = [
      [G.reach * 0.1, -G.sh * 1.4],
      [G.reach * 0.1, G.sh * 1.4],
    ];
  else
    hands = [
      [G.reach * 0.62 + sw, -G.sh * 1.02],
      [G.reach * 0.62 - sw, G.sh * 1.02],
    ];
  if (bt === 'grave' && !dying && !slump && st !== 'rear' && st !== 'roar')
    hands =
      st === 'gslam'
        ? [
            [G.reach * 0.1, -G.sh * 0.4],
            [G.reach * 0.2, G.sh * 0.3],
          ]
        : st === 'act' && e.act === 'hook'
          ? e.stT > 0.12
            ? [
                [G.reach * 0.05, -G.sh * 0.5],
                [G.reach * 0.25, G.sh * 0.55],
              ]
            : [
                [G.reach * 0.85, -G.sh * 0.15],
                [G.reach * 1.35, G.sh * 0.05],
              ]
          : [
              [G.reach * 0.8, -G.sh * 0.1],
              [G.reach * 1.25, G.sh * 0.75],
            ]; // both hands on the spade, carried at the ready: shaft across the front, blade ahead; raised high for the slam
  if (bt === 'chief' && !dying && !(slump && !(e.stuckT > 0)) && st !== 'rear' && st !== 'roar' && !(e.stunT > 0)) {
    // both hands on the axe: over the helmet for the chop, then down and stuck in the ground
    if (st === 'brace')
      hands = [
        [G.reach * 0.2, -G.sh * 0.5],
        [-G.reach * 0.25, G.sh * 0.6],
      ];
    else if (st === 'rush')
      hands = [
        [G.reach * 0.6, -G.sh * 0.4],
        [G.reach * 0.95, G.sh * 0.2],
      ];
    else if (st === 'chop') {
      const f = e.stT > 0.15 ? 0 : 1 - e.stT / 0.15;
      hands = [
        [lerp(G.reach * 0.3, G.reach * 0.7, f), -6],
        [lerp(-G.reach * 0.15, G.reach * 1.15, f), 6],
      ];
    } else if (e.stuckT > 0)
      hands = [
        [G.reach * 0.68, -8],
        [G.reach * 1.05, 6],
      ];
    else
      hands = [
        [G.reach * 0.35, -G.sh * 0.65],
        [G.reach * 0.8, G.sh * 0.5],
      ];
  }
  if (bt === 'pz' && !dying && st === 'move') hands[0] = [G.reach * 0.78 + Math.sin(time * 1.3) * 6, -G.sh * 0.72]; // one arm always reaching
  if (bt === 'pz' && st === 'pswing') {
    const a0 = e.spin || 0;
    hands[1] = [Math.cos(a0) * G.reach * 1.3, Math.sin(a0) * G.reach * 1.3];
  }
  if (!dying && wd > 0) hands[1] = [lerp(hands[1][0], -G.reach * 0.4, wd), lerp(hands[1][1], G.sh * 1.55, wd)]; // the wind-up: arm (or spade, or sign) drawn back
  if (!dying && cl > 0) {
    const a0 = lerp(1.15, -0.95, cl),
      r = G.reach * (bt === 'grave' || bt === 'chief' ? 1.2 : 1.32);
    hands[1] = [Math.cos(a0) * r, Math.sin(a0) * r];
    if (bt === 'grave' || bt === 'chief')
      hands[0] = [Math.cos(a0) * r * 0.45 - 8, Math.sin(a0) * r * 0.45 - G.sh * 0.3];
  }
  for (let i = 0; i < 2; i++) {
    const sy = i ? G.sh : -G.sh,
      dx = hands[i][0],
      dy = hands[i][1] - sy,
      d = Math.hypot(dx, dy),
      m = G.L * 2 * 0.74;
    if (d < m) {
      const k = d > 1 ? m / d : 0;
      hands[i] = d > 1 ? [dx * k, sy + dy * k] : [m, sy];
    }
  } /* seen from above an arm never folds into a stub: the hand stays most of an arm's length from the shoulder */
  const [h0x, h0y] = W(hands[0][0], hands[0][1]),
    [h1x, h1y] = W(hands[1][0], hands[1][1]);
  // what each one carries
  if (bt === 'roadkill' && !dying && e.sign) {
    // the STOP sign, dragged behind on the walk, swung in the haymaker
    const ram = st === 'charge',
      swing = cl > 0 || wd > 0 || ram || (st === 'act' && e.act === 'signthrow'),
      a =
        st === 'act' && e.act === 'signthrow'
          ? ta + Math.PI * 0.85
          : ram
            ? ta - 0.12
            : swing
              ? Math.atan2(h1y - y0, h1x - x0)
              : ta + 0.5 + Math.sin(time * 1.6 + (e.stride || 0) * TAU) * 0.06,
      len = 62 * E; // carried out in front, face first, the way it swings it; held point-first like a ram on the charge
    setH(swing ? 40 : 30);
    quad(
      R.rk_sign,
      h1x + Math.cos(a) * len * 0.47,
      h1y + Math.sin(a) * len * 0.47,
      a,
      E * 1.05,
      E * 1.05,
      1,
      1,
      1,
      1,
      0.5,
      0.5,
      0.5,
      fl
    );
  }
  let pzFlat = null;
  if (bt === 'pz' && !dying) {
    // the IV pole in its fist, the bag swinging at the top, the line running into its other arm; torn restraint straps trailing from both wrists
    const flat = st === 'pswing' || (st === 'act' && e.act === 'spear');
    if (flat)
      pzFlat = () => {
        const [sx, sy] = W(0, G.sh),
          a = st === 'pswing' ? Math.atan2(h1y - sy, h1x - sx) : ta,
          ux = Math.cos(a),
          uy = Math.sin(a),
          b0x = h1x - ux * 16 * E,
          b0y = h1y - uy * 16 * E,
          b1x = h1x + ux * 56 * E,
          b1y = h1y + uy * 56 * E; // swung flat round its body, or driven forward base-first like a spear: the wheeled feet are the business end
        setH(42);
        lineQ(b0x, b0y, b1x, b1y, 2.6 * E, 0.6, 0.62, 0.64, 1, 0, 0, 0, fl, R.pixel);
        for (const o of [-1, 1])
          lineQ(
            b1x,
            b1y,
            b1x + (ux * 4 - uy * o * 10) * E,
            b1y + (uy * 4 + ux * o * 10) * E,
            1.8 * E,
            0.48,
            0.5,
            0.52,
            1,
            0,
            0,
            0,
            fl,
            R.pixel
          );
        setH(44);
        quad(
          R.pz_bag,
          b0x - ux * 4 * E,
          b0y - uy * 4 * E,
          a + Math.PI / 2,
          E * 1.0,
          E * 1.0,
          1,
          1,
          1,
          1,
          0.4,
          0.4,
          0.3,
          fl
        );
        lineQ(b0x, b0y, h0x, h0y, 0.9, 0.85, 0.85, 0.75, 0.8, 0, 0, 0, 0, R.pixel);
      };
    // drawn over the torso: held out at chest height
    else {
      const bx = h1x + c * 6 * E,
        by = h1y + 34 * E;
      setH(6);
      lineQ(bx, by, bx + 1, by - 64 * E, 2.6 * E, 0.6, 0.62, 0.64, 1, 0, 0, 0, fl, R.pixel);
      for (const o of [-1, 1])
        lineQ(bx, by, bx + o * 10 * E, by + 5 * E, 1.8 * E, 0.48, 0.5, 0.52, 1, 0, 0, 0, fl, R.pixel);
      setH(50);
      quad(
        R.pz_bag,
        bx + 1 + Math.sin(time * 2.2) * 2,
        by - 66 * E,
        Math.sin(time * 2.2) * 0.15,
        E * 1.15,
        E * 1.15,
        1,
        1,
        1,
        1,
        0.4,
        0.4,
        0.3,
        fl
      );
      lineQ(bx + 1, by - 56 * E, h0x, h0y, 0.9, 0.85, 0.85, 0.75, 0.8, 0, 0, 0, 0, R.pixel);
    }
    setH(20);
    for (const [hx, hy, k] of [
      [h0x, h0y, 0],
      [h1x, h1y, 1],
    ]) {
      const tw = Math.sin(time * 3 + k * 2) * 6,
        bxx = hx - c * 30 * E - s * tw,
        byy = hy - s * 30 * E + c * tw;
      lineQ(hx, hy, bxx, byy, 3.4 * E, 0.42, 0.3, 0.2, 1, 0, 0, 0, fl, R.pixel);
      quad(R.pixel, bxx, byy, ta, 1.4 * E, 1.4 * E, 0.7, 0.66, 0.5, 1, 0, 0, 0, fl);
    }
  }
  setH(24 * G.K);
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1;
    zArm(
      W,
      [0, sd * G.sh],
      hands[i],
      G.L * E,
      G.w1 * E,
      G.w2 * E,
      sd,
      G.skin,
      G.sleeve,
      fl,
      G.hand * E,
      false,
      0,
      true
    );
  }
  if ((bt === 'chief' || bt === 'grave') && !dying) {
    const reg = bt === 'chief' ? R.cf_axe : R.gk_shovel,
      off = bt === 'chief' ? 44 : 52,
      sc = bt === 'chief' ? 1.15 : 1.7,
      hd = Math.hypot(h1x - h0x, h1y - h0y);
    setH(30 * G.K);
    if (hd > 14 * E && hd < off * 1.75 * E) {
      const a = Math.atan2(h1y - h0y, h1x - h0x);
      quad(
        reg,
        h0x + Math.cos(a) * off * E,
        h0y + Math.sin(a) * off * E,
        a,
        E * sc,
        E * sc,
        1,
        1,
        1,
        1,
        0.3,
        0.3,
        0.3,
        fl
      );
    } // both hands on the shaft: the back hand at the grip, the head out past the front hand
    else {
      const [sx, sy] = W(0, G.sh),
        a0 = Math.atan2(h1y - sy, h1x - sx),
        a = a0 + clamp(angDiff(a0, ta), -0.6, 0.6) * 0.6;
      quad(
        reg,
        h1x + Math.cos(a) * (off - 10) * E,
        h1y + Math.sin(a) * (off - 10) * E,
        a,
        E * sc,
        E * sc,
        1,
        1,
        1,
        1,
        0.3,
        0.3,
        0.3,
        fl
      );
    }
  } // arms flung wide or hanging: one fist round the end of the shaft, the head out past it along the arm
  // torso, then the shoulder muscle over the arm roots, then the head
  setH(30 * G.K);
  const rear =
      st === 'rear' || st === 'roar'
        ? 1.05 + Math.sin(time * 40) * 0.012
        : st === 'inhale'
          ? 1 + 0.1 * clamp(1.3 - e.stT, 0, 1)
          : st === 'act' && e.act === 'retch'
            ? 1.04 + Math.sin(time * 30) * 0.015
            : 1,
    /* the chest swells on the breath in */ br = 1 + Math.sin(time * 1.6 + e.id) * 0.012;
  quad(
    R[G.torso],
    x0,
    y0,
    ta + (e.stunT > 0 ? Math.sin(time * 18) * 0.05 : 0),
    E * rear * br * (1 + sq) * (1 + 0.18 * fe),
    E * rear * br,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    fl
  );
  if ((e.ph || 0) >= 1 && !SHMODE) {
    const wc =
        bt === 'pz'
          ? [0.5, 0.55, 0.16]
          : bt === 'chief'
            ? [0.12, 0.1, 0.08]
            : bt === 'grave'
              ? [0.3, 0.07, 0.05]
              : [0.42, 0.05, 0.04],
      n = e.ph >= 2 ? 5 : 2; // the damage shows: torn cloth and open wounds, more of them each phase (soot on the Chief's coat, pus on Patient Zero)
    for (let i = 0; i < n; i++) {
      const u = [
          [4, -0.42],
          [-9, 0.5],
          [11, 0.18],
          [-3, -0.78],
          [-14, -0.1],
        ][i],
        [wx, wy] = W(u[0], u[1] * G.sh);
      quad(
        R['splat' + ((i + e.id) % 4)],
        wx,
        wy,
        i * 1.7 + e.id,
        E * (0.2 + 0.05 * (i % 3)) * (e.ph >= 2 ? 1.25 : 1),
        E * (0.16 + 0.04 * (i % 2)),
        wc[0],
        wc[1],
        wc[2],
        0.85,
        0,
        0,
        0,
        fl
      );
    }
  }
  if (pzFlat) pzFlat();
  if (bt === 'grave' && e.lant) {
    const [lx, ly] = W(-4, -G.sh * 0.92);
    setH(31 * G.K);
    quad(
      R.gk_lantern,
      lx,
      ly + Math.sin(time * 2) * 1.5 * E,
      ta * 0.2,
      E * 1.2,
      E * 1.2,
      1,
      1,
      1,
      1,
      dying ? 0.3 : 1.1,
      dying ? 0.3 : 1.0,
      dying ? 0.3 : 0.9,
      fl
    );
  }
  // (the 3D bodies round over the arm roots themselves, so no separate shoulder caps)
  if (bt === 'chief' && !e.tankGone) {
    const [tx, ty] = W(-16, 0);
    setH(31.5 * G.K);
    quad(R.cf_tank, tx, ty, ta, E * 1.05, E * 1.05, 1, 1, 1, 1, 0.5, 0.5, 0.5, fl);
  } // the air pack: shoot it
  const look = dying
      ? 0
      : e.cueT > 0
        ? clamp(angDiff(ta, e.cueA), -1.1, 1.1) * Math.min(1, (e.cueMax - e.cueT) / 0.07)
        : angDiff(ta, e.face ?? ta) * 0.5,
    [hx, hy] = W(G.hx - 40 * fe - (slump ? 7 : 0), 0);
  setH(40 * G.K);
  quad(
    R[G.head],
    hx,
    hy,
    ta + look + (bt === 'grave' ? 0 : Math.sin(time * 1.2 + e.id) * 0.06),
    E * G.hs,
    E * G.hs,
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
// a body lying where it fell
