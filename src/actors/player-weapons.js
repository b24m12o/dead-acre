/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { camKick } from '../render/camera.js';
import { GS } from '../core/gs.js';
import { TAU, angDiff, clamp, d2, lerp, rand, randi } from '../core/util.js';
import { GUNS } from '../game/arsenal.js';
import { kitMod } from '../game/kits.js';
import { ZOOM } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { crystals } from '../world/map.js';
import { los, query, solidPt } from '../world/nav.js';
import { noise, playS, spat } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { S, gd, heroGun, startReload } from '../game/state.js';
import { makeEnemy } from './enemies.js';
import {
  bleed,
  bloodOf,
  chips,
  decal,
  dust,
  flashLight,
  floatText,
  glowBurst,
  part,
  ring,
  shake,
  sparks,
} from '../render/effects.js';
import { blowBarrel, bossOf, hitCrystal, hurtEnemy, hurtPlayer, impact, passSolid } from '../game/combat.js';
import { mouse } from '../core/input.js';
import { fragBurst, hitSign, pumpDrop, queenTail, shellBoom, tailHit, toWorld } from './projectiles.js';
import { BILE, BLOOD } from '../render/draw-enemies.js';
import { grassIgnite } from '../world/physics.js';
import { decorShot } from '../render/decor.js';
import { firePool } from '../world/fire.js';
import { LOUD, SUPP, makeNoise } from '../game/noise.js';
import { TW } from '../game/districts.js';
import { dynamiteBlast, startFlare } from '../game/gadgets.js';
export function firePlayer(cwx, cwy, p, target) {
  const g = p.gun,
    G = GUNS[g],
    hb = heroGun(g),
    km = kitMod(g),
    still = Math.hypot(p.vx, p.vy) < 40,
    braced = (km.brace && still) || (g === 'rifle' && S.evo.marks); // a bipod down, or the Marksman combo
  if (p.mag[g] <= 0) {
    if (GS.time - (p.lastShotT || -9) > 0.14) startReload();
  } else {
    if (p.reload > 0) p.reload = 0;
    p.mag[g]--;
    p.lastShotT = GS.time;
    camKick(p.aimA, g);
    if (GS.RUN && GS.RUN.metrics) GS.RUN.metrics.triggers++;
    const rate = G.rate * S.rate * hb.rate * (g === 'lmg' && (braced || S.evo.walkfire) ? 1.15 : 1);
    p.fireCd += 1 / rate;
    if (p.fireCd < -0.05) p.fireCd = 1 / rate;
    const c = Math.cos(p.aimA),
      s = Math.sin(p.aimA),
      mxp = p.x + c * G.muzzle,
      myp = p.y + s * G.muzzle,
      dm = G.dmg * S.dmg * hb.dmg * km.dmg * (g === 'pistol' && TW('pistol') ? 1.6 : 1);
    let base = p.aimA;
    {
      const fx = cwx - mxp,
        fy = cwy - myp;
      if (Math.abs(angDiff(p.aimA, target)) < 0.3 && fx * c + fy * s > 50) {
        const a = Math.atan2(fy, fx);
        if (Math.abs(angDiff(a, p.aimA)) < 0.35) base = a;
      }
    } // the rounds converge on the crosshair only when it is well out past the muzzle: with the cursor on or behind
    // the body the line from the muzzle to it would point back through you, so they go where the gun points
    if (G.lob) {
      // the 40 mm round arcs to where you aim, over cars and headstones, and bursts there
      let tx = GS.camX + mouse.x / ZOOM,
        ty = GS.camY + mouse.y / ZOOM;
      let dx0 = tx - p.x,
        dy0 = ty - p.y,
        d0 = Math.hypot(dx0, dy0) || 1;
      if (d0 < 40 || Math.abs(angDiff(Math.atan2(dy0, dx0), p.aimA)) > 0.35) {
        dx0 = c * d0;
        dy0 = s * d0;
      } // a cursor on or behind the body: lob it the way the launcher points, not back over your shoulder
      const dl = clamp(d0, G.muzzle + 30, 560 + G.muzzle);
      tx = p.x + (dx0 / d0) * dl + rand(-1, 1) * (dl - G.muzzle) * G.spread;
      ty = p.y + (dy0 / d0) * dl + rand(-1, 1) * (dl - G.muzzle) * G.spread;
      GS.pbullets.push({
        shell: true,
        gl: true,
        x0: mxp,
        y0: myp,
        x: mxp,
        y: myp,
        tx,
        ty,
        t: 0,
        dur: clamp((dl - G.muzzle) / G.speed, 0.16, 0.6),
        R: km.blast !== 1 || S.evo.airburst ? (S.blast || 95) * km.blast * (S.evo.airburst ? 1.4 : 1) : undefined,
        z: 0,
        vx: 0,
        vy: 0,
        life: 9,
        dmg: dm,
        hits: [],
        spin: 0,
      });
      p.vx -= c * 60;
      p.vy -= s * 60;
      shake(0.08);
      for (let k = 0; k < 3; k++) dust(mxp + c * 6, myp + s * 6, 1, 50, 0.7, 0.6);
    } else if (G.pellets && km.slug) {
      // a slug: one solid round down the barrel, the whole load's punch at any range
      const a = base + rand(-0.02, 0.02),
        sp = G.speed * 1.15;
      GS.pbullets.push({
        x: p.x + c * 14,
        y: p.y + s * 14,
        sx: p.x + c * 14,
        sy: p.y + s * 14,
        mz: G.muzzle - 14,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: (G.life * 2.2 + G.muzzle / sp) * S.rangeK,
        dmg: dm * (G.pellets + hb.pellets) * 0.7,
        pierce: S.pierce + 2,
        fall: 0.8,
        bounce: 0,
        hits: [],
        fam: 'shotgun',
        gun: g,
        kb: (S.evo.kb ? 3.5 : 2.6) * km.kb,
        heavy: true,
      });
      p.vx -= c * 90;
      p.vy -= s * 90;
      shake(0.1);
      for (let k = 0; k < 3; k++) dust(mxp + c * 10, myp + s * 10, 1, 70, 0.6, 0.5);
    } else if (G.pellets) {
      const n = G.pellets + hb.pellets + (S.shots - 1) * 2,
        spr = G.spread * S.spreadK * (S.spreadMul || 1) * km.spread;
      for (let i = 0; i < n; i++) {
        const a = base + (n > 1 ? (i / (n - 1) - 0.5) * spr : 0) + rand(-0.04, 0.04),
          sp = rand(G.speed * 0.9, G.speed * 1.05);
        GS.pbullets.push({
          x: p.x + c * 14,
          y: p.y + s * 14,
          sx: p.x + c * 14,
          sy: p.y + s * 14,
          mz: G.muzzle - 14,
          ox: p.x + c * 14,
          oy: p.y + s * 14,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: (G.life + G.muzzle / sp) * S.rangeK * rand(0.85, 1.08),
          dmg: dm,
          pierce: S.pierce,
          bounce: S.bounce,
          hits: [],
          pellet: true,
          fam: 'shotgun',
          gun: g,
          kb: (S.evo.kb ? 3.5 : g === 'auto' ? 1.7 : 2.4) * km.kb,
          sid: (p.shellN = (p.shellN || 0) + (i ? 0 : 1)),
        });
      }
      p.vx -= c * (G.perShell ? 80 : 50);
      p.vy -= s * (G.perShell ? 80 : 50);
      shake(G.perShell ? 0.09 : 0.06);
      for (let k = 0; k < 3; k++) dust(mxp + c * 10, myp + s * 10, 1, 70, 0.6, 0.5);
      const ej = () => {
        if (!GS.P) return;
        const cc = Math.cos(GS.P.aimA),
          ss = Math.sin(GS.P.aimA);
        part({
          k: 7,
          x: GS.P.x + cc * 22,
          y: GS.P.y + ss * 22,
          z: 8,
          vz: rand(60, 120),
          vx: -ss * rand(80, 140),
          vy: cc * rand(80, 140),
          life: 1.6,
          max: 1.6,
          size: 1.5,
          rot: rand(0, TAU),
          vr: rand(-20, 20),
          drag: 3,
          c: [1, 1, 1],
          tc: [1, 0.3, 0.25],
        });
      };
      if (G.perShell) GS.later.push({ t: 0.38, fn: ej });
      else ej();
    } else {
      const n = S.shots,
        big = g === 'hunter';
      const shot = (aa, k) => {
        const q = GS.P;
        if (!q) return;
        const cc = Math.cos(aa),
          ss = Math.sin(aa),
          br = (g === 'rifle' && Math.hypot(q.vx, q.vy) < 40) || braced,
          a =
            aa +
            rand(-G.spread, G.spread) *
              (0.35 + 0.65 * (q.heat || 0)) *
              (S.spreadMul || 1) *
              km.spread *
              (br ? (g === 'lmg' ? 0.4 : 0.5) : 1); // stand still and the rifle is braced: tighter, and through one more body
        GS.pbullets.push({
          x: q.x + cc * 14,
          y: q.y + ss * 14,
          sx: q.x + cc * 14,
          sy: q.y + ss * 14,
          mz: G.muzzle - 14,
          vx: Math.cos(a) * G.speed,
          vy: Math.sin(a) * G.speed,
          life: G.life + G.muzzle / G.speed,
          dmg: dm * k,
          pierce: S.pierce + hb.pierce + km.pierce + (G.pierce || 0) + (br && g === 'rifle' ? 1 : 0),
          crit: km.crit + (g === 'rifle' && S.evo.marks ? 0.15 : 0),
          fall: G.fall || 0.85,
          ap: g === 'rifle' || g === 'lmg' || g === 'lever' ? 1 : 0,
          fam: G.fam,
          gun: g,
          bounce: S.bounce + (g === 'smg' && S.evo.hose ? 1 : 0),
          hits: [],
          kb: (big ? 3 : g === 'pistol' ? 1.3 : 1) * k * km.kb,
          heavy: big && k === 1,
        });
      };
      shot(base, 1);
      if (g === 'pistol' && S.evo.dtap)
        GS.later.push({
          t: 0.07,
          fn: () => {
            if (GS.P && GS.state === 'play' && GS.P.gun === 'pistol') shot(GS.P.aimA, 0.85);
          },
        }); // Double Tap: a second round right behind the first
      for (let i = 1; i < n; i++)
        GS.later.push({
          t: i * 0.055,
          fn: () => {
            if (!GS.P || GS.state !== 'play' || GS.P.gun !== g) return;
            shot(GS.P.aimA, [0.4, 0.3, 0.25][i - 1] ?? 0.25);
            const cc = Math.cos(GS.P.aimA),
              ss = Math.sin(GS.P.aimA);
            GS.flashes.push({
              x: GS.P.x + cc * (G.muzzle + 4),
              y: GS.P.y + ss * (G.muzzle + 4),
              rot: GS.P.aimA,
              life: 0.04,
              max: 0.04,
              reg: R.mf_pistol,
              fs: 0.7,
            });
            playS(G.snd === 'hunter' || G.snd === 'lever' ? 'rifle' : G.snd, 0.35, 1.08, 0, 0.15);
          },
        }); // Burst Fire: the follow-up rounds go down the same line a beat later, lighter than the first
      const push = big ? 70 : g === 'pistol' ? 18 : g === 'lmg' ? 16 : 10;
      p.vx -= c * push;
      p.vy -= s * push;
      if (big) {
        shake(0.12);
        GS.hitstop = Math.max(GS.hitstop, 0.02);
      } else if (g === 'pistol' || g === 'lmg') shake(0.03);
      const ej = () => {
        if (!GS.P) return;
        const cc = Math.cos(GS.P.aimA),
          ss = Math.sin(GS.P.aimA);
        part({
          k: 7,
          x: GS.P.x + cc * 22,
          y: GS.P.y + ss * 22,
          z: 8,
          vz: rand(60, 120),
          vx: -ss * rand(70, 130) + rand(-20, 20),
          vy: cc * rand(70, 130) + rand(-20, 20),
          life: 1.4,
          max: 1.4,
          size: G.shell,
          rot: rand(0, TAU),
          vr: rand(-20, 20),
          drag: 3,
          c: [1, 1, 1],
        });
      };
      if (big) GS.later.push({ t: 0.5, fn: ej });
      else if (G.shell) ej();
    }
    p.recoil = G.kick;
    if (!G.pellets) p.heat = Math.min(1, (p.heat || 0) + 0.16);
    const sup = S.quiet && SUPP[g];
    if (sup) sfx.supp();
    else sfx[G.snd]();
    if (g === 'shotgun') p.pumpT = 0.56;
    makeNoise(p.x, p.y, (LOUD[g] || 700) * (sup ? 0.45 : 1));
    GS.flashes.push({
      x: mxp + c * 4,
      y: myp + s * 4,
      rot: p.aimA + rand(-0.08, 0.08),
      life: 0.05,
      max: 0.05,
      reg: G.pellets
        ? R.mf_shotgun
        : g === 'hunter' || g === 'lmg'
          ? R.mf_big
          : g === 'pistol'
            ? R.mf_pistol
            : R.mf_rifle,
      fs: rand(0.85, 1.15),
    });
    for (let i = 0; i < (G.pellets || g === 'hunter' ? 2 : 1); i++)
      part({
        k: 2,
        x: mxp + c * 8,
        y: myp + s * 8,
        vx: c * rand(30, 70) + rand(-12, 12),
        vy: s * rand(30, 70) + rand(-12, 12),
        life: rand(1.3, 2.2),
        max: 2.2,
        size: rand(0.28, 0.48),
        grow: 1.8,
        drag: 2.5,
        c: [0.36, 0.36, 0.37],
        rot: rand(0, TAU),
        vr: rand(-1, 1),
        wind: 1,
      });
    flashLight(mxp, myp, G.pellets || g === 'hunter' ? 210 : 165, [1.15, 0.72, 0.34], 0.055);
    if (p.mag[g] <= 0)
      GS.later.push({
        t: 0.14,
        fn: () => {
          if (GS.P && GS.state === 'play' && GS.P.gun === g && GS.P.mag[g] <= 0) startReload();
        },
      }); // the last shot finishes (flash, recoil) before the hands go to the reload
  }
}
function ricoAim(b, R) {
  // Ricochet: a round that glances off a wall or a body kicks toward the nearest of the dead it can reach
  let best = null,
    bd = R * R;
  query(b.x, b.y, R, e => {
    if (e.dead || e.emerge < 1 || b.hits.includes(e.id)) return;
    const dd = d2(b.x, b.y, e.x, e.y);
    if (dd < bd && dd > 100 && los(b.x, b.y, e.x, e.y)) {
      bd = dd;
      best = e;
    }
  });
  if (!best) return false;
  const sp = Math.hypot(b.vx, b.vy) || 900,
    d = Math.sqrt(bd),
    a = Math.atan2(best.y - b.y, best.x - b.x);
  b.vx = Math.cos(a) * sp;
  b.vy = Math.sin(a) * sp;
  b.life = Math.max(b.life, d / sp + 0.08);
  return true;
}
export function updatePBullet(b, dt) {
  if (b.shell) {
    b.t += dt;
    if (b.t < 0) return;
    const k = Math.min(1, b.t / b.dur);
    b.x = lerp(b.x0, b.tx, k);
    b.y = lerp(b.y0, b.ty, k);
    b.z = Math.sin(k * Math.PI) * (30 + b.dur * 90) + (1 - k) * 18;
    b.spin += dt * 14;
    if (b.gl && k > 0.45 && k < 1) {
      let hitE = null;
      query(b.x, b.y, 40, e => {
        if (!hitE && !e.dead && e.emerge >= 1 && !e.fly && d2(e.x, e.y, b.x, b.y) < (e.r + 8) ** 2) hitE = e;
      });
      if (hitE) {
        b.life = 0;
        shellBoom(b.x, b.y, b.R || S.blast || 95, b.dmg, true);
        return;
      }
    } // low in its arc a round bursts on the first body it meets
    if (Math.random() < 0.6)
      part({
        k: 2,
        x: b.x,
        y: b.y - b.z,
        vx: 0,
        vy: 0,
        life: 0.4,
        max: 0.4,
        size: 0.3,
        grow: 0.6,
        rot: 0,
        vr: 0,
        drag: 2,
      });
    if (k >= 1) {
      b.life = 0;
      shellBoom(b.x, b.y, (b.R || S.blast || 95) * (b.mini ? 0.55 : 1), b.dmg, !b.mini);
    }
    return;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.life -= dt;
  if (b.life <= 0) return;
  let used = false;
  if (GS.boss && GS.boss.signAt && !b.small && d2(b.x, b.y, GS.boss.signAt.x, GS.boss.signAt.y) < 26 * 26) {
    hitSign(GS.boss, b.dmg, b.x, b.y);
    b.life = 0;
    return;
  }
  if (
    GS.boss &&
    GS.boss.btype === 'abom' &&
    !GS.boss.dead &&
    GS.boss.emerge >= 1 &&
    !b.hits.includes(GS.boss.id) &&
    !b.small
  ) {
    const pts = queenTail(GS.boss);
    for (let i = 1; i < pts.length; i++) {
      const [tx, ty] = toWorld(GS.boss, pts[i][0], pts[i][1], GS.boss.sc || 1);
      if (d2(b.x, b.y, tx, ty) < 21 * 21) {
        tailHit(GS.boss, b, tx, ty);
        return;
      }
    }
  } // the tail trails behind the chitin: get round and it takes every round
  for (const cr of crystals)
    if (cr.alive && d2(b.x, b.y, cr.x, cr.y - 6) < 24 * 24) {
      hitCrystal(cr, b.dmg, b.vx, b.vy);
      b.life = 0;
      used = true;
      break;
    }
  if (used) return;
  if (decorShot(b)) {
    b.life = 0;
    return;
  }
  for (const br of GS.barrels)
    if (!br.dead && d2(b.x, b.y, br.x, br.y) < (br.r + 4) ** 2) {
      br.hp -= b.dmg;
      sparks(b.x, b.y, [1, 0.8, 0.4], 4, 200);
      if (br.hp <= 0) blowBarrel(br);
      b.life = 0;
      used = true;
      break;
    }
  if (used) return;
  query(b.x, b.y, 140, e => {
    if (e.dead || e.emerge < 0.6 || b.hits.includes(e.id)) return;
    let hx = b.x,
      hy = b.y + e.z,
      rr2 = e.r + 5,
      hitIt = d2(b.x, b.y, e.x, e.y - e.z * 0.6) < rr2 * rr2; // where the round actually struck
    if (!hitIt) return;
    const crit =
        Math.random() < S.crit + (b.crit || 0) ||
        (b.gun === 'hunter' &&
          S.evo.oneshot &&
          (!(e.aw > 0) || (e.dazedT || 0) > GS.time || e.down > 0 || e.stunT > 0)), // One Shot: the hunting rifle never wastes a shot on one that hasn't seen you
      tr = b.pellet && b.ox !== undefined ? Math.hypot(b.x - b.ox, b.y - b.oy) : 0;
    const rk = b.pellet ? clamp(1.3 - tr / 260, 0.4, 1.2) : 1,
      kbk = b.pellet ? clamp(1.5 - tr / 260, 0.35, 1.3) : 1; // buckshot hits hard up close and spreads thin
    GS.HITB = b.small ? null : b;
    try {
      hurtEnemy(
        e,
        b.dmg * rk * (crit ? 2.5 : 1),
        crit,
        b.vx,
        b.vy,
        (b.kb || 1) * kbk,
        b.small ? 'buddy' : 'bolt',
        hx,
        hy - e.z
      );
    } finally {
      GS.HITB = null;
    }
    if (b.pellet && b.gun === 'shotgun' && b.sid) pumpDrop(e, b);
    b.hits.push(e.id);
    if (S.frag && !b.small) fragBurst(b.x, b.y, b, e.id);
    if (b.pierce > 0) {
      b.pierce--;
      b.dmg *= b.fall || 0.85;
      b.kb = (b.kb || 1) * 0.8;
      if (!e.dead || Math.random() < 0.5)
        bleed(e.x + b.vx * 0.02, e.y + b.vy * 0.02, 14, b.vx, b.vy, 3, bloodOf(e), 260);
    } else if (b.bounce > 0 && !b.pellet && !b.small && ricoAim(b, 230)) {
      b.bounce--;
      b.dmg *= 0.7;
      sparks(b.x, b.y, [1, 0.85, 0.5], 3, 200);
    } else b.life = 0;
    return true;
  });
  if (b.life > 0 && solidPt(b.x, b.y) && passSolid(b, dt)) return;
  if (b.life > 0 && b.bounce > 0 && !b.pellet && solidPt(b.x, b.y)) {
    const px = b.x - b.vx * dt,
      py = b.y - b.vy * dt;
    if (solidPt(px, b.y)) b.vy = -b.vy;
    else b.vx = -b.vx;
    if (solidPt(px, b.y) && solidPt(b.x, py)) {
      b.vx = -b.vx;
    }
    b.x = px;
    b.y = py;
    b.bounce--;
    b.dmg *= 0.8;
    b.hits.length = 0;
    ricoAim(b, 340);
    sparks(px, py, [1, 0.85, 0.5], 4, 220);
    if (Math.random() < 0.5) playS('dry', 0.08, 2.6, 0, 0);
    return;
  }
  if (b.life > 0 && solidPt(b.x, b.y)) {
    b.life = 0;
    impact(b.x - b.vx * 0.012, b.y - b.vy * 0.012, b);
    if (S.frag && !b.small) fragBurst(b.x, b.y, b);
  }
}
export function updateMortar(m, dt, p) {
  m.t += dt;
  const t = Math.min(1, m.t / m.dur);
  m.x = lerp(m.x0, m.tx, t);
  m.y = lerp(m.y0, m.ty, t);
  m.z = Math.sin(t * Math.PI) * 220;
  if (t >= 1 && m.slab) {
    m.done = true;
    sfx.crunch(m.tx, m.ty);
    sfx.boom2(m.tx, m.ty);
    chips(m.tx, m.ty, 16, [0.62, 0.6, 0.56], 4, 320);
    dust(m.tx, m.ty, 10, 90, 1.4, 1);
    decal(R['grave' + m.gk], m.tx, m.ty, 1.2, [0.7, 0.7, 0.7, 1], [0, 0, 0], 300);
    decal(R.hole, m.tx, m.ty, 1.3, [1, 1, 1, 0.8], [0, 0, 0], 40);
    shake(0.25);
    if (d2(m.tx, m.ty, p.x, p.y) < (60 + p.r * 0.3) ** 2)
      hurtPlayer(20 * (1 + 0.04 * GS.wave), m.tx, m.ty, GS.boss && !GS.boss.dead ? bossOf(GS.boss) : 'the dead');
    return;
  } // a headstone lands and breaks
  if (t >= 1 && m.walker) {
    m.done = true;
    sfx.crunch(m.tx, m.ty);
    sfx.fall(m.tx, m.ty);
    bleed(m.tx, m.ty, 8, 0, 0, 12, BLOOD, 200);
    dust(m.tx, m.ty, 8, 80, 1.2, 1);
    shake(0.2);
    if (d2(m.tx, m.ty, p.x, p.y) < (55 + p.r * 0.3) ** 2)
      hurtPlayer(16 * (1 + 0.04 * GS.wave), m.tx, m.ty, GS.boss && !GS.boss.dead ? bossOf(GS.boss) : 'the dead');
    if (!solidPt(m.tx, m.ty) && GS.enemies.length < 50) {
      const z = makeEnemy('skitter', m.tx, m.ty);
      z.emerge = 1;
      z.v = m.walker.v;
      z.hv = m.walker.hv;
      z.sk = m.walker.sk;
      z.down = 0.9;
      z.fallA = rand(0, TAU);
      z.splay = 1;
      z.aw = 9;
    }
    return;
  } // the body hits, and gets back up
  if (t >= 1 && m.flare) {
    m.done = true;
    firePool(m.tx, m.ty, 46, 4.5);
    grassIgnite(m.tx, m.ty, 50, 0.8);
    sparks(m.tx, m.ty, [1, 0.5, 0.3], 10, 200);
    noise(0.5, 0.1, 3000, 800, 'bandpass', 0, spat(m.tx, m.ty));
    return;
  }
  if (t >= 1 && m.ext) {
    m.done = true;
    sfx.crunch(m.tx, m.ty);
    noise(1.2, 0.12, 5000, 1500, 'highpass', 0, spat(m.tx, m.ty));
    for (let i = 0; i < 22; i++) {
      const a = rand(0, TAU),
        v = rand(30, 150);
      part({
        k: 2,
        x: m.tx,
        y: m.ty,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: rand(1.4, 2.6),
        max: 2.6,
        size: rand(0.8, 1.4),
        grow: 2.2,
        drag: 1.4,
        rot: rand(0, TAU),
        vr: rand(-1, 1),
        c: [0.86, 0.86, 0.84],
      });
    }
    ring(m.tx, m.ty, 8, 80, 0.3, [1.3, 1.3, 1.3], 0.6);
    shake(0.2);
    if (d2(m.tx, m.ty, p.x, p.y) < (70 + p.r * 0.3) ** 2) {
      hurtPlayer(
        14 * (1 + 0.04 * GS.wave),
        m.tx,
        m.ty,
        m.rock || m.ext ? (GS.boss && !GS.boss.dead ? bossOf(GS.boss) : 'the dead') : 'spitter acid'
      );
      p.daze = Math.max(p.daze || 0, 1.2);
    }
    GS.gasClouds.push({ x: m.tx, y: m.ty, r: 85, life: 4, max: 4 });
    return;
  } // a thrown extinguisher bursts into a choking white cloud that hangs for a few seconds
  if (t >= 1 && m.rock) {
    m.done = true;
    sfx.crunch(m.tx, m.ty);
    dust(m.tx, m.ty, 10, 90, 1.4, 1);
    chips(m.tx, m.ty, 14, [0.55, 0.55, 0.52], 4, 300);
    ring(m.tx, m.ty, 8, 70, 0.3, [1, 0.95, 0.85], 0.6);
    decal(R.hole, m.tx, m.ty, 1.4, [1, 1, 1, 0.9], [0, 0, 0], 20);
    shake(0.2);
    if (d2(m.tx, m.ty, p.x, p.y) < (62 + p.r * 0.3) ** 2)
      hurtPlayer(18 * (1 + 0.04 * GS.wave), m.tx, m.ty, GS.boss && !GS.boss.dead ? bossOf(GS.boss) : 'the dead');
  } else if (t >= 1) {
    m.done = true;
    sfx.splat();
    glowBurst(m.tx, m.ty, [0.25, 0.45, 0.06], 8, 200, 0.4, 0.5);
    bleed(m.tx, m.ty, 10, 0, 0, 10, BILE, 200);
    ring(m.tx, m.ty, 8, 70, 0.3, [0.6, 1.4, 0.2], 0.9);
    GS.pools.push({
      x: m.tx,
      y: m.ty,
      r: 56,
      life: 5,
      max: 5,
      dmg: 6 * (1 + 0.04 * GS.wave),
      rot: rand(0, TAU),
      v: randi(0, 3),
    });
    if (d2(m.tx, m.ty, p.x, p.y) < (62 + p.r * 0.3) ** 2)
      hurtPlayer(
        14 * (1 + 0.04 * GS.wave),
        m.tx,
        m.ty,
        m.rock || m.ext ? (GS.boss && !GS.boss.dead ? bossOf(GS.boss) : 'the dead') : 'spitter acid'
      );
  }
}
export function updateBang(g, dt, p) {
  if (g.t < g.dur) {
    g.t += dt;
    const k = Math.min(1, g.t / g.dur);
    g.x = lerp(g.x0, g.tx, k);
    g.y = lerp(g.y0, g.ty, k);
    g.z = Math.sin(k * Math.PI) * (24 + g.dur * 90);
    g.spin += dt * 16;
    if (k >= 1) {
      g.z = 0;
      sfx.ting();
    }
    return;
  }
  g.fuse -= dt;
  if (g.dyn && g.fuse > 0 && Math.random() < dt * 40) sparks(g.x, g.y - 6, [1, 0.75, 0.4], 1, 120); // the fuse spits
  if (g.fuse > 0) return;
  g.done = true;
  if (g.flare) return startFlare(g.x, g.y);
  if (g.dyn) return dynamiteBlast(g.x, g.y);
  const R0 = g.big ? 190 * (1 + 0.25 * S.abLv) : 130 + 35 * S.pulse;
  sfx.flashbang();
  shake(0.15);
  flashLight(g.x, g.y, R0 * 3, [3, 3, 2.8], 0.35);
  dust(g.x, g.y, 8, 60, 1.4, 1.6);
  sparks(g.x, g.y, [1, 1, 0.9], 10, 260);
  const pd = Math.hypot(GS.P.x - g.x, GS.P.y - g.y);
  GS.whiteFlash = Math.max(GS.whiteFlash, clamp(1 - pd / (R0 * 2.2), 0, 1) * 0.6 + 0.12);
  let nh = 0;
  query(g.x, g.y, R0 + 40, e => {
    if (!e.dead && d2(g.x, g.y, e.x, e.y) < (R0 + e.r) ** 2) {
      hurtEnemy(e, gd() * (g.big ? 1.5 : 0.8 + S.pulse * 0.4), false, e.x - g.x, e.y - g.y, g.big ? 3.5 : 2.5, 'pulse');
      if (!e.dead) {
        const st = g.big ? 2.5 + S.abLv : 1.3 + 0.3 * S.pulse;
        if (e.type === 'queen') {
          if (g.big && GS.time > (e.bangCd || 0)) {
            e.bangCd = GS.time + 6;
            e.stunT = Math.max(e.stunT || 0, 0.8);
          } // a boss shrugs off the little ones; the big bang buys a moment, not a crawl
        } else {
          e.stag = Math.max(e.stag || 0, st);
          e.dazedT = GS.time + st;
        }
      }
      nh++;
    }
  });
  if (S.evo.nova && nh) {
    p.hp = Math.min(S.maxHp, p.hp + nh * 2);
    floatText(p.x, p.y - 36, '+' + nh * 2, '#8ef0b8', 15);
  }
  for (const b of GS.ebullets)
    if (d2(g.x, g.y, b.x, b.y) < R0 * R0) {
      b.life = 0;
      dust(b.x, b.y, 1, 20, 0.4, 0.4);
    }
}
