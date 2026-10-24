/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const AB_DEF = {
  ranger: {
    name: 'Mortar strike',
    cd: 26,
    desc: 'Calls three mortar rounds onto the cursor. They land after a second and a half.',
    up: 'Mortar strike fires 2 more rounds and hits 20% harder.',
  },
  breacher: {
    name: 'Flashbang',
    cd: 20,
    desc: 'Throws a big flashbang at the cursor. Everything near it is stunned for 2.5 s.',
    up: 'Flashbang reaches 25% wider and stuns 1 s longer.',
  },
  grenadier: {
    name: 'Fan the hammer',
    cd: 16,
    desc: 'Six fast pistol shots at everything in front of you, no ammo used.',
    up: 'Fan the hammer fires 3 more shots.',
  },
};
const AB = () => AB_DEF[RUN.hero] || AB_DEF.ranger,
  abCd = () => AB().cd * S.abCd;
function useAbility() {
  if (state !== 'play' || !P || P.hp <= 0 || RUN.tut) return;
  if (P.abT > 0) {
    if (thr('abno', 500)) {
      sfx.dry();
      floatText(P.x, P.y - 44, `${AB().name} in ${Math.ceil(P.abT)} s`, '#cfd6d9', 13);
    }
    return;
  }
  const cwx = cam.x + mouse.x / ZOOM,
    cwy = cam.y + mouse.y / ZOOM,
    a = Math.atan2(cwy - P.y, cwx - P.x),
    dl = Math.hypot(cwx - P.x, cwy - P.y),
    h = RUN.hero;
  if (h === 'breacher') {
    const d = Math.min(dl, 420),
      tx = P.x + Math.cos(a) * d,
      ty = P.y + Math.sin(a) * d;
    bangs.push({
      x0: P.x,
      y0: P.y,
      x: P.x,
      y: P.y,
      tx,
      ty,
      t: 0,
      dur: clamp(d / 520, 0.25, 0.6),
      z: 0,
      spin: rand(0, TAU),
      fuse: 0.35,
      big: true,
    });
    sfx.swap();
  } else if (h === 'grenadier') {
    const n = 6 + 3 * S.abLv;
    for (let i = 0; i < n; i++) later.push({ t: i * 0.065, fn: () => fanShot(a) });
  } else {
    const d = Math.min(dl, 560),
      tx = P.x + Math.cos(a) * d,
      ty = P.y + Math.sin(a) * d,
      n = 3 + 2 * S.abLv;
    sfx.radio(P.x, P.y);
    floatText(P.x, P.y - 44, 'Fire mission', '#bff4ff', 15);
    warns.push({ t: 0, k: 'friend', x: tx, y: ty, r: 130, dur: 1.5 + (n - 1) * 0.42, owner: null });
    for (let i = 0; i < n; i++) {
      const ox = i ? rand(-35, 35) : 0,
        oy = i ? rand(-35, 35) : 0;
      later.push({
        t: 1.5 + i * 0.42 - 0.6,
        fn: () => {
          if (state === 'play') noise(0.6, 0.05, 2600, 700, 'bandpass', 0, spat(tx + ox, ty + oy));
        },
      });
      later.push({
        t: 1.5 + i * 0.42,
        fn: () => {
          if (state !== 'play') return;
          explode(tx + ox, ty + oy, 95, (60 + 12 * wave) * (1 + 0.2 * S.abLv) * (0.5 + 0.5 * S.dmg), false);
        },
      });
    }
  } // a whistle, then the round
  P.abT = abCd();
  if (RUN.metrics) RUN.metrics.abilities = (RUN.metrics.abilities || 0) + 1;
}
function fanShot(a0) {
  // from the hip: each shot snaps to the next zombie in front of you
  if (state !== 'play' || !P) return;
  let tg = null,
    bd = 1e12;
  const used = (P.__fan = P.__fan && time - P.__fanT < 1 ? P.__fan : []);
  P.__fanT = time;
  query(P.x, P.y, 520, e => {
    if (e.dead || e.emerge < 1) return;
    const ea = Math.atan2(e.y - P.y, e.x - P.x);
    if (Math.abs(angDiff(a0, ea)) > 0.62) return;
    const dd = d2(P.x, P.y, e.x, e.y) * (used.includes(e.id) ? 4 : 1);
    if (dd < bd && los(P.x, P.y, e.x, e.y)) {
      bd = dd;
      tg = e;
    }
  });
  const a = tg ? Math.atan2(tg.y - P.y, tg.x - P.x) + rand(-0.03, 0.03) : a0 + rand(-0.25, 0.25);
  if (tg) used.push(tg.id);
  const G = GUNS.pistol,
    c = Math.cos(a),
    sn = Math.sin(a),
    dm = G.dmg * S.dmg * 1.25 * 2.2;
  pbullets.push({
    x: P.x + c * 14,
    y: P.y + sn * 14,
    sx: P.x + c * 14,
    sy: P.y + sn * 14,
    mz: G.muzzle - 14,
    vx: c * G.speed,
    vy: sn * G.speed,
    life: G.life + G.muzzle / G.speed,
    dmg: dm,
    pierce: 1 + S.pierce,
    fall: 0.85,
    ap: 0,
    fam: 'pistol',
    gun: 'pistol',
    bounce: S.bounce,
    hits: [],
    kb: 1.3,
    noAmb: true,
  });
  flashes.push({
    x: P.x + c * (GUNS[P.gun].muzzle || 40),
    y: P.y + sn * (GUNS[P.gun].muzzle || 40),
    rot: a,
    life: 0.05,
    max: 0.05,
    reg: R.mf_pistol,
    fs: 1,
  });
  playS('pistol', 0.5, rand(0.95, 1.1), 0, 0.15);
  P.recoil = 5;
  P.aimA = a;
  shake(0.03);
  makeNoise(P.x, P.y, 700);
}
function tryDash() {
  if (state === 'play' && P.held) {
    if (P.dashCd > 0) {
      P.held.grip -= 0.34;
      sfx.grunt && sfx.grunt(P.x, P.y);
      if (P.held.grip > 0) return;
      releaseGrab();
      return;
    }
    releaseGrab();
  } // a roll tears the ankle free; on cooldown, keep kicking
  if (state !== 'play' || P.dashCd > 0) return;
  let [mx, my] = moveInput();
  if (!mx && !my) {
    mx = Math.cos(P.bodyA);
    my = Math.sin(P.bodyA);
  }
  const l = Math.hypot(mx, my) || 1;
  P.dashA = Math.atan2(my, mx);
  P.vx = (mx / l) * 1050;
  P.vy = (my / l) * 1050;
  P.dashT = 0.17;
  P.dashCd = S.dashCd;
  P.inv = Math.max(P.inv, 0.3);
  if (RUN && RUN.metrics) RUN.metrics.rolls++;
  sfx.dash();
  shake(0.08);
  dust(P.x, P.y, 6, 50, 0.8, 0.8);
}
