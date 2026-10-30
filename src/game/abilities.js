/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, angDiff, clamp, d2, rand } from '../core/util.js';
import { GUNS } from './arsenal.js';
import { ZOOM } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { los, query } from '../world/nav.js';
import { noise, playS, spat, thr } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { S, cam } from './state.js';
import { dust, floatText, shake } from '../render/effects.js';
import { explode, releaseGrab } from './combat.js';
import { mouse, moveInput } from '../core/input.js';
import { makeNoise } from './noise.js';
export const AB_DEF = {
  ranger: {
    name: 'Mortar strike',
    cd: 26,
    desc: 'Calls three mortar rounds onto the cursor. They land after a second and a half.',
    up: 'Mortar strike fires 2 more rounds and hits 20% harder.',
    cdName: 'Field Radio', // the two ability upgrades, named for what each hero would actually carry
    upName: 'Heavier Load',
  },
  breacher: {
    name: 'Flashbang',
    cd: 20,
    desc: 'Throws a big flashbang at the cursor. Everything near it is stunned for 2.5 s.',
    up: 'Flashbang reaches 25% wider and stuns 1 s longer.',
    cdName: 'Bandolier', // spare bangs on the belt
    upName: 'Nine-Banger', // the multi-blast stun grenade police teams use
  },
  grenadier: {
    name: 'Fan the hammer',
    cd: 16,
    desc: 'Six fast pistol shots at everything in front of you, no ammo used.',
    up: 'Fan the hammer fires 3 more shots.',
    cdName: 'Quick Draw',
    upName: 'Two-Gun Rig', // a second revolver on the other hip
  },
};
export const AB = () => AB_DEF[GS.RUN.hero] || AB_DEF.ranger,
  abCd = () => AB().cd * S.abCd;
export function useAbility() {
  if (GS.state !== 'play' || !GS.P || GS.P.hp <= 0 || (GS.RUN.tut && !GS.RUN.tut.abOk)) return; // in training only once it is taught
  if (GS.P.abT > 0) {
    if (thr('abno', 500)) {
      sfx.dry();
      floatText(GS.P.x, GS.P.y - 44, `${AB().name} in ${Math.ceil(GS.P.abT)} s`, '#cfd6d9', 13);
    }
    return;
  }
  const cwx = cam.x + mouse.x / ZOOM,
    cwy = cam.y + mouse.y / ZOOM,
    a = Math.atan2(cwy - GS.P.y, cwx - GS.P.x),
    dl = Math.hypot(cwx - GS.P.x, cwy - GS.P.y),
    h = GS.RUN.hero;
  if (h === 'breacher') {
    const d = Math.min(dl, 420),
      tx = GS.P.x + Math.cos(a) * d,
      ty = GS.P.y + Math.sin(a) * d;
    GS.bangs.push({
      x0: GS.P.x,
      y0: GS.P.y,
      x: GS.P.x,
      y: GS.P.y,
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
    for (let i = 0; i < n; i++) GS.later.push({ t: i * 0.065, fn: () => fanShot(a) });
  } else {
    const d = Math.min(dl, 560),
      tx = GS.P.x + Math.cos(a) * d,
      ty = GS.P.y + Math.sin(a) * d,
      n = 3 + 2 * S.abLv;
    sfx.radio(GS.P.x, GS.P.y);
    floatText(GS.P.x, GS.P.y - 44, 'Fire mission', '#bff4ff', 15);
    GS.warns.push({ t: 0, k: 'friend', x: tx, y: ty, r: 130, dur: 1.5 + (n - 1) * 0.42, owner: null });
    for (let i = 0; i < n; i++) {
      const ox = i ? rand(-35, 35) : 0,
        oy = i ? rand(-35, 35) : 0;
      GS.later.push({
        t: 1.5 + i * 0.42 - 0.6,
        fn: () => {
          if (GS.state === 'play') noise(0.6, 0.05, 2600, 700, 'bandpass', 0, spat(tx + ox, ty + oy));
        },
      });
      GS.later.push({
        t: 1.5 + i * 0.42,
        fn: () => {
          if (GS.state !== 'play') return;
          explode(tx + ox, ty + oy, 95, (60 + 12 * GS.wave) * (1 + 0.2 * S.abLv) * (0.5 + 0.5 * S.dmg), false);
        },
      });
    }
  } // a whistle, then the round
  GS.P.abT = abCd();
  if (GS.RUN.metrics) GS.RUN.metrics.abilities = (GS.RUN.metrics.abilities || 0) + 1;
}
function fanShot(a0) {
  // from the hip: each shot snaps to the next zombie in front of you
  if (GS.state !== 'play' || !GS.P) return;
  let tg = null,
    bd = 1e12;
  const used = (GS.P.__fan = GS.P.__fan && GS.time - GS.P.__fanT < 1 ? GS.P.__fan : []);
  GS.P.__fanT = GS.time;
  query(GS.P.x, GS.P.y, 520, e => {
    if (e.dead || e.emerge < 1) return;
    const ea = Math.atan2(e.y - GS.P.y, e.x - GS.P.x);
    if (Math.abs(angDiff(a0, ea)) > 0.62) return;
    const dd = d2(GS.P.x, GS.P.y, e.x, e.y) * (used.includes(e.id) ? 4 : 1);
    if (dd < bd && los(GS.P.x, GS.P.y, e.x, e.y)) {
      bd = dd;
      tg = e;
    }
  });
  const a = tg ? Math.atan2(tg.y - GS.P.y, tg.x - GS.P.x) + rand(-0.03, 0.03) : a0 + rand(-0.25, 0.25);
  if (tg) used.push(tg.id);
  const G = GUNS.pistol,
    c = Math.cos(a),
    sn = Math.sin(a),
    dm = G.dmg * S.dmg * 1.25 * 2.2;
  GS.pbullets.push({
    x: GS.P.x + c * 14,
    y: GS.P.y + sn * 14,
    sx: GS.P.x + c * 14,
    sy: GS.P.y + sn * 14,
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
  GS.flashes.push({
    x: GS.P.x + c * (GUNS[GS.P.gun].muzzle || 40),
    y: GS.P.y + sn * (GUNS[GS.P.gun].muzzle || 40),
    rot: a,
    life: 0.05,
    max: 0.05,
    reg: R.mf_pistol,
    fs: 1,
  });
  playS('pistol', 0.5, rand(0.95, 1.1), 0, 0.15);
  GS.P.recoil = 5;
  GS.P.aimA = a;
  shake(0.03);
  makeNoise(GS.P.x, GS.P.y, 700);
}
export function tryDash() {
  if (GS.state === 'play' && GS.P.held) {
    if (GS.P.dashCd > 0) {
      GS.P.held.grip -= 0.34;
      sfx.grunt && sfx.grunt(GS.P.x, GS.P.y);
      if (GS.P.held.grip > 0) return;
      releaseGrab();
      return;
    }
    releaseGrab();
  } // a roll tears the ankle free; on cooldown, keep kicking
  if (GS.state !== 'play' || GS.P.dashCd > 0) return;
  let [mx, my] = moveInput();
  if (!mx && !my) {
    mx = Math.cos(GS.P.bodyA);
    my = Math.sin(GS.P.bodyA);
  }
  const l = Math.hypot(mx, my) || 1;
  GS.P.dashA = Math.atan2(my, mx);
  GS.P.vx = (mx / l) * 1050;
  GS.P.vy = (my / l) * 1050;
  GS.P.dashT = 0.17;
  GS.P.dashCd = S.dashCd;
  GS.P.inv = Math.max(GS.P.inv, 0.3);
  if (GS.RUN && GS.RUN.metrics) GS.RUN.metrics.rolls++;
  sfx.dash();
  shake(0.08);
  dust(GS.P.x, GS.P.y, 6, 50, 0.8, 0.8);
}
