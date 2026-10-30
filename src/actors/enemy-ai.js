/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, angDiff, clamp, d2, damp, rand, randi } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { viewH, viewW } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { MH, MW, TILE, WH, WW, cars, isWall, ttype } from '../world/map.js';
import { GIANT_STOP, N8, collide, flow, flowBig, gblk, los, steer } from '../world/nav.js';
import { updateLegs } from './legs.js';
import { sfx } from '../audio/sfx.js';
import { S, cam } from '../game/state.js';
import { showStreak } from '../ui/callouts.js';
import { ET, makeEnemy, traitTick } from './enemies.js';
import { spawnPoint } from '../game/waves.js';
import { HUMAN, bleed, bloodOf, chips, decal, distort, dust, part, pool, shake, sparks } from '../render/effects.js';
import { SHIELD_TURN, SIGHT, hurtPlayer, killEnemy, releaseGrab, shieldUp } from '../game/combat.js';
import { toWorld } from './projectiles.js';
import { updateQueen } from './queen.js';
import { BILE, BLOOD } from '../render/draw-enemies.js';
import { downEl, lyMove, lyState, lyThud } from '../render/draw-bodies.js';
import { breakTile, corpseMass, ragKick } from '../world/physics.js';
import { burnTick, carAt, damageCar } from '../world/fire.js';
import { poundCar, screamAt } from '../game/noise.js';
import { tip } from '../audio/radio.js';
import { finishObjective } from '../game/objective-flow.js';
import { budTarget, objTarget } from '../game/objective-update.js';
// a giant that has stopped getting anywhere while it walks, pressed into a building or caught inside one, is walked out
// to the nearest open street it can move on from (a tile clear of buildings that its own path map can reach)
function giantWedge(e, dt) {
  e.wgT = (e.wgT || 0) + dt;
  if (e.wgT < 1) return;
  e.wgT = 0;
  const moved = Math.hypot(e.x - (e.wgX ?? e.x + 99), e.y - (e.wgY ?? e.y + 99));
  e.wgX = e.x;
  e.wgY = e.y;
  const cx = Math.floor(e.x / TILE),
    cy = Math.floor(e.y / TILE),
    i = cy * MW + cx,
    bad = gblk[i] || flowBig[i] >= 65535;
  const far = !GS.P || Math.hypot(GS.P.x - e.x, GS.P.y - e.y) > e.r * (e.sc || 1) * 2.2 + 60; // not just standing over you, fighting
  e.wgN = (e.st === 'move' || !e.st) && (bad || (moved < 18 && far)) && !(e.stunT > 0) ? (e.wgN || 0) + 1 : 0;
  if (e.wgN < (bad ? 2 : 3)) return;
  e.wgN = 0;
  for (let r = 1; r <= 9; r++)
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || x < 3 || y < 3 || x >= MW - 3 || y >= MH - 3)
          continue;
        const j = y * MW + x;
        if (gblk[j] || flowBig[j] >= 65535) continue;
        e.unw = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, t: 2.5 + r * 0.3 };
        return;
      }
}
export function updateEnemy(e, dt, p) {
  if (e.dead) return;
  e.flash = Math.max(0, e.flash - dt);
  e.squash = Math.max(0, e.squash - dt);
  e.wob = Math.max(0, e.wob - dt * 4);
  if (e.emerge < 1) {
    e.emerge = Math.min(1, e.emerge + dt * (e.type === 'queen' ? 0.7 : 2.2));
    if (Math.random() < dt * 20) dust(e.x, e.y, 1, 30, 0.6, 0.6);
  }
  if (!GS.queue.length && GS.enemies.length <= 3 && e.type !== 'flower' && e.type !== 'queen' && !e.big)
    e.sp = Math.max(e.sp, ET[e.type].sp * 1.25); // the last stragglers hurry; a boss keeps its own pace
  e.losT -= dt;
  if (e.losT <= 0) {
    e.losT = 0.25;
    e.los = e.fly || e.big ? true : los(e.x, e.y, p.x, p.y);
  }
  // awareness: they see you, hear you, or get hit; otherwise they amble
  const pd2 = d2(e.x, e.y, p.x, p.y),
    allAw =
      e.big ||
      e.fly ||
      e.type === 'wasp' ||
      e.type === 'flower' ||
      !!GS.evac ||
      (!GS.queue.length && GS.enemies.length <= 5);
  const sr = SIGHT();
  if (e.los && pd2 < sr * sr) {
    if (!(e.aw > 0)) e.wokeT = GS.time;
    e.aw = Math.max(e.aw || 0, 4);
  }
  e.aw = (e.aw || 0) - dt;
  if (!(e.aw > 0) && !e.lure) {
    e.idleT = (e.idleT || 0) + dt;
    if (e.idleT > 22) {
      e.idleT = 0;
      e.aw = 6;
    }
  } else e.idleT = 0; // nothing stays lost for long: sooner or later they find your scent
  let lure = e.lure;
  if (lure && (lure.dead || !(lure.alarm > 0))) lure = e.lure = null;
  if (lure && e.los && pd2 < (lure.flare ? 110 : 200) ** 2) {
    lure = e.lure = null;
    e.aw = 4;
  }
  if (e.mark && GS.obj && GS.obj.type === 'hunt' && !GS.obj.done && e.emerge >= 1) {
    e.markT -= dt;
    if (e.markT <= 0) {
      e.dead = true;
      e.escaped = true;
      dust(e.x, e.y, 10, 60, 1.2, 1);
      chips(e.x, e.y, 8, null, 4, 160);
      sfx.dig(e.x, e.y);
      decal(R.hole, e.x, e.y, 1.2, [1, 1, 1, 0.9], [0, 0, 0], 14);
      finishObjective(false, 'A marked one went back underground');
      return;
    }
  } // it gets away
  if (e.trait) {
    traitTick(e, dt, pd2);
    if (!e.tipped && e.los && pd2 < 450 * 450 && GS.state === 'play') {
      e.tipped = 1;
      tip('el_' + e.trait);
    }
  }
  const aware = allAw || e.aw > 0;
  const ot = objTarget(e) || budTarget(e, pd2);
  if (ot) {
    e.loT = (e.loT || 0) - dt;
    if (e.loT <= 0) {
      e.loT = 0.3;
      e.losO = los(e.x, e.y, ot.x, ot.y);
    }
  }
  const [ux, uy, dist] = ot
      ? e.losO
        ? steer(e, ot.x, ot.y, null, true)
        : steer(e, ot.x, ot.y, flow)
      : lure
        ? steer(e, lure.x, lure.y, lure.flow)
        : steer(e, p.x, p.y),
    em = e.emerge >= 1;
  let tvx = 0,
    tvy = 0,
    face = Math.atan2(uy, ux),
    rate = 6;
  if (e.rout > 0 && em && e.type !== 'flower') {
    e.rout -= dt;
    const fa = Math.atan2(e.y - p.y, e.x - p.x) + Math.sin(GS.time * 1.7 + e.id) * 0.5;
    tvx = Math.cos(fa) * e.sp * 1.15;
    tvy = Math.sin(fa) * e.sp * 1.15;
    face = fa;
    rate = 5;
    if (
      (pd2 > 560 * 560 && Math.abs(e.x - cam.x - viewW / 2) > viewW * 0.5 + 60) ||
      (pd2 > 560 * 560 && Math.abs(e.y - cam.y - viewH / 2) > viewH * 0.5 + 60)
    )
      e.dead = true;
  } // the boss fell: the horde breaks and scatters, and what runs out of sight is gone for the night
  else if (
    e.mark &&
    em &&
    !(e.down > 0) &&
    GS.obj &&
    GS.obj.type === 'hunt' &&
    !GS.obj.done &&
    pd2 > 85 * 85 &&
    pd2 < 460 * 460
  ) {
    // marked: it runs, up the slope of your trail, away from you
    const cx = Math.floor(e.x / TILE),
      cy = Math.floor(e.y / TILE);
    let best = flow[cy * MW + cx],
      bx = cx,
      by = cy;
    for (const [ox2, oy2] of N8) {
      const nx = cx + ox2,
        ny = cy + oy2;
      if (isWall(nx, ny) || (ox2 && oy2 && (isWall(cx + ox2, cy) || isWall(cx, cy + oy2)))) continue;
      const v = flow[ny * MW + nx];
      if (v !== 65535 && v > best) {
        best = v;
        bx = nx;
        by = ny;
      }
    }
    const fa =
      bx !== cx || by !== cy
        ? Math.atan2((by + 0.5) * TILE - e.y, (bx + 0.5) * TILE - e.x)
        : Math.atan2(e.y - p.y, e.x - p.x);
    const fs = Math.min(Math.max(e.sp * 1.4, 200), S.speed * 0.9);
    tvx = Math.cos(fa) * fs;
    tvy = Math.sin(fa) * fs;
    face = fa;
    rate = 6;
  } else if (lure && !ot) {
    if (dist < (lure.truck ? 98 : 78)) {
      face = Math.atan2(lure.y - e.y, lure.x - e.x);
      if (em && !lure.flare) poundCar(e, lure, dt);
    } else {
      tvx = ux * e.sp * 1.1;
      tvy = uy * e.sp * 1.1;
    }
    rate = 5;
  } else
    switch (e.type) {
      case 'skitter': {
        e.stT -= dt;
        if (e.lurk) {
          // playing dead: it breathes (a puff of breath in the cold is the only tell), then takes your ankle as you pass
          tvx = tvy = 0;
          rate = 10;
          e.down = e.dT - 0.9 + dt;
          const dP = Math.sqrt(pd2);
          e.puffT = (e.puffT ?? rand(1.5, 4)) - dt;
          if (e.puffT <= 0 && e.__lhx !== undefined) {
            e.puffT = rand(2.6, 4.6);
            for (let i = 0; i < 3; i++)
              part({
                k: 2,
                x: e.__lhx + rand(-2, 2),
                y: e.__lhy + rand(-2, 2),
                vx: rand(-8, 8),
                vy: rand(-14, -6),
                life: 1.4,
                max: 1.4,
                size: 0.16,
                grow: 1.6,
                drag: 1.2,
                c: [0.72, 0.74, 0.78],
                rot: rand(0, TAU),
                vr: rand(-1, 1),
                wind: 1,
              });
          }
          if (e.lurk === 'lie') {
            e.aw = 0;
            if (e.hp < e.maxHp || (!GS.queue.length && !GS.enemies.some(o => o !== e && !o.dead && !o.lurk))) {
              e.lurk = null;
              e.aw = 9;
              e.down = Math.min(e.down, e.dT - 0.95);
              sfx.groan(e.x, e.y);
            } // shot, or the last one left: it gives up the act and gets up
            else if (dP < 48 && !(p.dashT > 0) && !p.held && GS.state === 'play' && em) {
              e.lurk = 'grab';
              e.grip = 1;
              e.gT = 0;
              e.tickT = 0.5;
              p.held = e;
              hurtPlayer(5 + GS.wave * 0.5, e.x, e.y, 'a lurker');
              sfx.growl(e.x, e.y);
              shake(0.12);
              if (!(GS.meta.tips && GS.meta.tips.lurk)) {
                GS.meta.tips = GS.meta.tips || {};
                GS.meta.tips.lurk = 1;
                saveMeta();
              }
              showStreak('Grabbed', 'Dodge to break free', true);
            }
          } else if (e.lurk === 'grab') {
            if (p.held !== e || GS.state !== 'play') {
              e.lurk = null;
              e.down = Math.min(e.down, e.dT - 0.95);
              if (p.held === e) p.held = null;
            } else {
              e.gT += dt;
              e.tickT -= dt;
              if (e.tickT <= 0) {
                e.tickT = 0.5;
                hurtPlayer(4 + GS.wave * 0.35, e.x, e.y, 'a lurker');
              }
              const dx = e.x - p.x,
                dy = e.y - p.y;
              p.vx += dx * 3 * dt;
              p.vy += dy * 3 * dt;
              if (e.gT > 3) releaseGrab(0.5);
            }
          }
          break;
        }
        if (e.shield || e.st === 'bashW' || e.st === 'bash') {
          // riot cop: a slow, steady advance behind the shield, then a shove
          if (e.st === 'bashW') {
            face = Math.atan2(p.y - e.y, p.x - e.x);
            if (e.stT <= 0) {
              e.st = 'bash';
              e.stT = 0.24;
              e.lx = Math.cos(e.a);
              e.ly = Math.sin(e.a);
            }
          } else if (e.st === 'bash') {
            tvx = e.lx * 360;
            tvy = e.ly * 360;
            face = e.a;
            if (e.stT <= 0) {
              e.st = 'move';
              e.stT = rand(1.4, 2.2);
            }
          } else {
            const lurch = 0.8 + Math.abs(Math.sin((e.stride || 0) * Math.PI)) * 0.25;
            tvx = ux * e.sp * lurch;
            tvy = uy * e.sp * lurch;
            face = e.los ? Math.atan2(p.y - e.y, p.x - e.x) : Math.atan2(uy, ux);
            if (em && e.los && dist < 78 && e.stT <= 0 && e.shield) {
              e.st = 'bashW';
              e.stT = 0.42;
              sfx.groan(e.x, e.y);
            }
            if (Math.random() < dt * 0.05) sfx.groan(e.x, e.y);
          }
          rate = e.st === 'bash' ? 0 : 4;
          if (e.st === 'bash') {
            e.vx = tvx;
            e.vy = tvy;
          }
          break;
        }
        if (e.st === 'leap') {
          tvx = e.lx * 400;
          tvy = e.ly * 400;
          face = Math.atan2(e.ly, e.lx);
          if (e.stT <= 0) {
            e.st = 'move';
            e.stT = rand(1.2, 1.8);
          }
        } else if (e.st === 'crouch') {
          face = Math.atan2(p.y - e.y, p.x - e.x);
          if (e.stT <= 0) {
            e.st = 'leap';
            e.stT = 0.22;
            e.lx = Math.cos(face);
            e.ly = Math.sin(face);
            if (Math.random() < 0.5) sfx.groan(e.x, e.y);
          }
        } else {
          const w = Math.sin(GS.time * (e.run ? 3 : 1.1) + e.id) * (e.run ? 0.3 : 0.45),
            c = Math.cos(w),
            s = Math.sin(w),
            lurch = e.run
              ? 1
              : e.limp
                ? 0.3 + Math.pow(Math.abs(Math.sin((e.stride || 0) * Math.PI)), 2) * 1.45
                : 0.6 + Math.abs(Math.sin((e.stride || 0) * Math.PI)) * 0.6;
          tvx = (ux * c - uy * s) * e.sp * lurch;
          tvy = (ux * s + uy * c) * e.sp * lurch;
          if (em && e.los && dist < (e.run ? 120 : 64) && e.stT <= 0) {
            e.st = 'crouch';
            e.stT = e.run ? 0.28 : 0.3;
          } /* runners get a readable beat before the lunge too */
          if (Math.random() < dt * 0.06) sfx.groan(e.x, e.y);
        }
        rate = e.run ? 7 : 3;
        break;
      }
      case 'hopper': {
        if (e.st === 'swell') {
          e.swell = Math.min(1, (e.swell || 0) + dt / 0.85);
          tvx = tvy = 0;
          if (Math.random() < dt * 20) bleed(e.x, e.y, 20, rand(-1, 1), rand(-1, 1), 1, BILE, 80);
          if (e.swell >= 1) {
            killEnemy(e, 0, 'self');
            return;
          }
        } else {
          tvx = ux * e.sp;
          tvy = uy * e.sp;
          if (em && dist < 84 && e.los) {
            e.st = 'swell';
            e.swell = 0;
            sfx.groan(e.x, e.y);
            sfx.wet(e.x, e.y);
          }
        }
        rate = 3;
        break;
      }
      case 'mini': {
        const pull = 0.45 + Math.max(0, Math.sin((e.stride || 0) * TAU)) * 1.1;
        tvx = ux * e.sp * pull;
        tvy = uy * e.sp * pull;
        rate = 4;
        break;
      }
      case 'egg': {
        tvx = tvy = 0;
        rate = 10;
        e.hatch = (e.hatch ?? 6) - dt;
        face = e.a;
        if (e.hatch < 1.2 && Math.random() < dt * 10) bleed(e.x, e.y, 6, rand(-1, 1), rand(-1, 1), 1, BILE, 60, 0.6); // the sac swells, splits, and something long climbs out
        if (e.hatch <= 0) {
          e.dead = true;
          bleed(e.x, e.y, 10, 0, 0, 14, BILE, 200);
          pool(e.x, e.y, 0.8, BILE, 40);
          sfx.wet(e.x, e.y);
          for (let i = 0; i < 2; i++) {
            const c = makeEnemy('mini', e.x + rand(-10, 10), e.y + rand(-10, 10));
            c.emerge = 0.6;
            c.aw = 9;
          }
        } // the sac splits and two infected crawlers spill out
        break;
      }
      case 'hound': {
        e.stT -= dt;
        if (e.st === 'leap') {
          tvx = e.lx * 540;
          tvy = e.ly * 540;
          face = Math.atan2(e.ly, e.lx);
          if (e.stT <= 0) {
            e.st = 'move';
            e.stT = rand(0.9, 1.5);
          }
        } else if (e.st === 'crouch') {
          face = Math.atan2(p.y - e.y, p.x - e.x);
          if (e.stT <= 0) {
            e.st = 'leap';
            e.stT = 0.3;
            e.lx = Math.cos(face);
            e.ly = Math.sin(face);
            sfx.growl(e.x, e.y);
          }
        } else {
          const w = dist > 220 ? Math.sin(GS.time * 2.4 + e.id * 2.1) * 0.75 : 0.1,
            c = Math.cos(w),
            s = Math.sin(w);
          tvx = (ux * c - uy * s) * e.sp;
          tvy = (ux * s + uy * c) * e.sp;
          if (em && e.los && dist < 175 && e.stT <= 0) {
            e.st = 'crouch';
            e.stT = 0.32;
          }
        }
        rate = e.st === 'leap' ? 0 : 7;
        if (e.st === 'leap') {
          e.vx = tvx;
          e.vy = tvy;
        }
        break;
      }
      case 'wasp': {
        const k = dist > 320 ? 1 : dist < 200 ? -0.8 : 0,
          side = Math.sin(GS.time * 0.7 + e.id * 1.7) > 0 ? 1 : -1;
        tvx = (ux * k - uy * side * 0.5) * e.sp;
        tvy = (uy * k + ux * side * 0.5) * e.sp;
        face = Math.atan2(p.y - e.y, p.x - e.x);
        e.fireT -= dt;
        if (em && e.fireT <= 0 && dist < 540 && e.los) {
          if (!e.charging) {
            e.charging = 0.6;
            sfx.retch(e.x, e.y);
          }
          e.charging -= dt;
          tvx *= 0.1;
          tvy *= 0.1;
          if (e.charging <= 0) {
            e.charging = 0;
            e.fireT = Math.max(1.8, 3 - GS.wave * 0.05);
            const [mx2, my2] = toWorld(e, 12, 0);
            for (const o of [-0.16, 0, 0.16]) {
              const a = face + o + rand(-0.04, 0.04),
                sp = o ? 300 : 340;
              GS.ebullets.push({
                k: 'acid',
                x: mx2,
                y: my2,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                r: o ? 5.5 : 7.5,
                dmg: 8 * (1 + 0.05 * GS.wave),
                life: 2.2,
                c: BILE,
                pool: !o,
              });
            }
            sfx.spit(e.x, e.y);
            bleed(mx2, my2, 20, Math.cos(face), Math.sin(face), 4, BILE, 160);
          }
        }
        rate = 4;
        break;
      }
      case 'flower': {
        e.stT -= dt;
        if (e.st === 'closed') {
          e.open = Math.max(0, e.open - dt * 3);
          if (dist > 220) {
            tvx = ux * e.sp * 1.4;
            tvy = uy * e.sp * 1.4;
          }
          if (em && e.stT <= 0 && dist < 620) {
            e.st = 'opening';
            e.stT = 0.45;
            sfx.inhale(e.x, e.y);
          }
        } else if (e.st === 'opening') {
          e.open = Math.min(1, e.open + dt / 0.45);
          if (e.stT <= 0) {
            e.st = 'open';
            e.stT = 1.8;
            e.shots = 0;
            e.fireT = 0;
          }
        } else if (e.st === 'open') {
          e.open = 1;
          e.fireT -= dt;
          if (e.fireT <= 0 && e.shots < 1) {
            e.shots++;
            e.fireT = 0.9;
            screamAt(e);
          }
          if (e.stT <= 0) {
            e.st = 'closing';
            e.stT = 0.4;
          }
        } else {
          e.open = Math.max(0, e.open - dt / 0.4);
          if (e.stT <= 0) {
            e.st = 'closed';
            e.stT = rand(1.8, 2.6);
          }
        }
        face = Math.atan2(p.y - e.y, p.x - e.x);
        rate = 3;
        break;
      }
      case 'beetle': {
        e.stT -= dt;
        e.anim += dt;
        if (e.st === 'rear') {
          face = Math.atan2(p.y - e.y, p.x - e.x);
          if (e.stT <= 0) {
            e.st = 'charge';
            e.stT = 0.85;
            e.lx = Math.cos(face);
            e.ly = Math.sin(face);
            shake(0.1);
            sfx.growl(e.x, e.y);
          }
        } else if (e.st === 'charge') {
          tvx = e.lx * 560;
          tvy = e.ly * 560;
          e.vx = tvx;
          e.vy = tvy;
          face = Math.atan2(e.ly, e.lx);
          if (Math.random() < 0.5) dust(e.x, e.y, 1, 20, 0.6, 0.6);
          if (e.stT <= 0) {
            e.st = 'move';
            e.stT = rand(2.5, 4);
          }
        } else if (e.st === 'stun') {
          face = e.a;
          if (e.stT <= 0) {
            e.st = 'move';
            e.stT = rand(2, 3);
          }
        } else {
          tvx = ux * e.sp;
          tvy = uy * e.sp;
          if (em && e.los && dist < 420 && dist > 100 && e.stT <= 0) {
            e.st = 'rear';
            e.stT = 0.7;
          }
        }
        rate = e.st === 'charge' ? 0 : 5;
        break;
      }
      case 'queen':
        e.anim += dt;
        updateQueen(e, dt, ux, uy, dist);
        tvx = e.tvx;
        tvy = e.tvy;
        face = e.face;
        rate = 3;
        break;
    }
  if (!aware && !lure && !ot && e.st !== 'leap' && e.st !== 'charge') {
    const w = Math.sin(GS.time * 0.5 + e.id * 1.7) * 0.6,
      c = Math.cos(w),
      sn = Math.sin(w),
      nx = tvx * c - tvy * sn,
      ny = tvx * sn + tvy * c;
    tvx = nx * 0.7;
    tvy = ny * 0.7;
  } // shambling, not hunting
  if (e.slowT > 0) {
    e.slowT -= dt;
    tvx *= 0.45;
    tvy *= 0.45;
    if (Math.random() < dt * 8)
      part({
        k: 0,
        x: e.x + rand(-e.r, e.r),
        y: e.y - e.z + rand(-e.r, e.r),
        vx: 0,
        vy: -30,
        life: 0.5,
        max: 0.5,
        size: 0.3,
        c: [0.5, 0.85, 1],
        drag: 1,
      });
  }
  if (e.wakeT > 0) {
    e.wakeT -= dt;
    tvx *= 0.1;
    tvy *= 0.1;
  }
  if (e.frenzy > 0) {
    e.frenzy -= dt;
    tvx *= 1.35;
    tvy *= 1.35;
  }
  if (e.lunge > 0) e.lunge -= dt;
  if (e.crawl) {
    if (e.cfall > 0) {
      e.cfall -= dt;
      tvx = tvy = 0;
      lyMove(e, lyState(e).g);
      if (e.cfall <= 0) lyThud(e);
    } else e.fallA = e.a;
    tvx *= 0.36;
    tvy *= 0.36;
    if (Math.random() < dt * 3)
      decal(
        R['splat' + randi(0, 3)],
        e.x - Math.cos(e.a) * 16,
        e.y - Math.sin(e.a) * 16,
        rand(0.12, 0.2),
        [BLOOD[0] * 0.8, BLOOD[1], BLOOD[2], 0.7],
        [0, 0, 0],
        25
      );
  }
  if (e.wbT > 0) e.wbT -= dt;
  if (e.down > 0) {
    const pe = downEl(e);
    e.down -= dt;
    tvx = tvy = 0;
    rate = 10;
    if (e.down > 0) {
      lyMove(e, lyState(e).g);
      if (pe < 0.3 && downEl(e) >= 0.3) lyThud(e);
      const el2 = downEl(e);
      if (el2 > 0.95 && e.fallA !== undefined) {
        if (el2 < 1.26) {
          e.a = e.fallA + (e.sup ? Math.PI : 0);
          e.hl = el2 < 1.12 ? e.a : e.hl;
        } else {
          const tg = Math.atan2(p.y - e.y, p.x - e.x);
          e.a += clamp(angDiff(e.a, tg), -2.2 * dt, 2.2 * dt);
        }
      } // up on its knees it starts to turn toward you, the head first, before it is even standing
    } else {
      e.lyG = 0;
      e.stag = Math.max(e.stag || 0, 0.45);
      e.wbT = 0.75;
    } // back up, facing the way its head lay, then a few unsteady steps
  } else if (e.stag > 0) {
    e.stag -= dt;
    tvx *= 0.2;
    tvy *= 0.2;
  }
  if (e.drip > 0) {
    e.drip -= dt;
    e.dripT = (e.dripT || 0) - dt * Math.min(1, Math.hypot(e.vx, e.vy) / 40);
    if (e.dripT <= 0) {
      e.dripT = rand(0.22, 0.45);
      pool(e.x + rand(-5, 5), e.y + rand(-5, 5), rand(0.07, 0.13), bloodOf(e), 25);
    }
  } // a leg wound leaves a trail
  if (e.wbT > 0 && !(e.down > 0) && (tvx || tvy)) {
    const al = Math.cos(angDiff(e.a, Math.atan2(tvy, tvx)));
    tvx *= clamp(al, 0.15, 1);
    tvy *= clamp(al, 0.15, 1);
  } // just up, it turns to face you before it really walks
  if (e.burn > 0 && e.type !== 'queen') {
    const w = Math.sin(GS.time * 9 + e.id) * 0.6,
      c = Math.cos(w),
      s2 = Math.sin(w);
    const nx = tvx * c - tvy * s2,
      ny = tvx * s2 + tvy * c;
    tvx = nx * 1.3;
    tvy = ny * 1.3;
  }
  if (rate) {
    const k = damp(rate, dt);
    e.vx += (tvx - e.vx) * k;
    e.vy += (tvy - e.vy) * k;
  }
  if (!em) {
    e.vx *= 0.2;
    e.vy *= 0.2;
  }
  const fa =
    Math.hypot(e.vx, e.vy) > 15 &&
    e.type !== 'wasp' &&
    e.type !== 'queen' &&
    e.type !== 'flower' &&
    e.st !== 'rear' &&
    e.st !== 'crouch'
      ? Math.atan2(e.vy, e.vx)
      : face;
  if (e.shield && shieldUp(e) && e.emerge >= 1) e.a += clamp(angDiff(e.a, face), -SHIELD_TURN * dt, SHIELD_TURN * dt);
  else if (!(e.down > 0))
    e.a +=
      angDiff(e.a, fa) *
      damp(
        e.stag > 0 || e.wbT > 0
          ? 2.6
          : e.type === 'queen'
            ? e.st === 'charge' || e.st === 'leap' || e.st === 'rush'
              ? 8
              : e.recT > 0 ||
                  e.stunT > 0 ||
                  e.turnT > 0 ||
                  e.st === 'chop' ||
                  e.st === 'gslam' ||
                  e.st === 'roar' ||
                  e.st === 'pswing' ||
                  e.st === 'inhale' ||
                  e.st === 'brace'
                ? 0.45
                : 1.15
            : 10,
        dt
      ); // a boss that's recovering turns slowly: that's when you get round its back
  if (HUMAN[e.type] && !(e.down > 0 && downEl(e) < 1.12)) {
    const tg = aware || e.down > 0 ? Math.atan2(p.y - e.y, p.x - e.x) : e.a + Math.sin(GS.time * 0.7 + e.id) * 0.7;
    e.hl = (e.hl ?? e.a) + angDiff(e.hl ?? e.a, tg) * damp(e.down > 0 ? 4 : 7, dt);
  }
  if (e.flT > 0) e.flT -= dt;
  const ox0 = e.x,
    oy0 = e.y;
  {
    const kl = Math.hypot(e.kx, e.ky),
      km = e.type === 'queen' ? 2000 : 900;
    if (kl > km) {
      e.kx *= km / kl;
      e.ky *= km / kl;
    }
  } // a blast shoves hard, but never fast enough to tunnel through a wall
  if (e.big && e.unw) {
    const dx = e.unw.x - e.x,
      dy = e.unw.y - e.y,
      d = Math.hypot(dx, dy) || 1,
      sp = Math.max(90, (ET[e.type].sp || 84) * 1.2);
    e.vx = (dx / d) * sp;
    e.vy = (dy / d) * sp;
    e.kx = e.ky = 0;
    e.a += angDiff(e.a, Math.atan2(dy, dx)) * Math.min(1, dt * 6);
    if ((e.unw.t -= dt) <= 0 || d < 14) e.unw = null;
  } // wedged in a building: it shoulders its way back out to open street, then the fight goes on
  e.x += (e.vx + e.kx) * dt;
  e.y += (e.vy + e.ky) * dt;
  const kd = Math.pow(0.015, dt);
  e.kx *= kd;
  e.ky *= kd;
  let hitWall = false;
  if (!e.fly && !e.big && e.st !== 'jump') {
    hitWall = collide(e);
    e.x = clamp(e.x, 2.5 * TILE, WW - 2.5 * TILE);
    e.y = clamp(e.y, 2.5 * TILE, WH - 2.5 * TILE);
  } else {
    if (e.big && !e.fly && e.st !== 'jump' && !e.unw) hitWall = collide(e, 30, GIANT_STOP); // a giant shoulders through fences and hedges, but not through a building
    if (e.big && !e.fly && !e.unw && gblk) giantWedge(e, dt);
    e.x = clamp(e.x, 3 * TILE + e.r * (e.big ? 0.6 : 0), WW - 3 * TILE - e.r * (e.big ? 0.6 : 0));
    e.y = clamp(e.y, 3 * TILE + e.r * (e.big ? 0.6 : 0), WH - 3 * TILE - e.r * (e.big ? 0.6 : 0));
  }
  if (em && !e.dormant && e.type !== 'queen' && e.type !== 'egg' && !(e.down > 0)) {
    e.progT = (e.progT || 0) + dt;
    if (e.progT >= 1) {
      e.progT = 0;
      const d = Math.sqrt(pd2);
      e.noProg = d > 260 && d > (e.lastPD ?? 1e9) - 25 ? (e.noProg || 0) + 1 : 0;
      e.lastPD = d;
      if (e.noProg >= 12 && !GS.queue.length && GS.nightLive) {
        // stuck where it can't reach you once the night's last wave is out: it comes round again near you, however many are left
        const [sx, sy] = spawnPoint(380, false);
        e.x = sx;
        e.y = sy;
        e.vx = e.vy = e.kx = e.ky = 0;
        e.emerge = 0;
        e.aw = 9;
        e.noProg = 0;
        e.lastPD = 1e9;
      }
    }
  } // the last stragglers that can't find a way to you (stuck behind something, lost in a corner) climb back out of the dark nearer you, so a night always ends
  if (!e.fly && !e.big && e.st === 'move' && em) {
    const moved = Math.hypot(e.x - ox0, e.y - oy0),
      want = Math.hypot(tvx, tvy) * dt;
    if (want > 0.5 && moved < want * 0.25) e.stk = (e.stk || 0) + dt;
    else e.stk = Math.max(0, (e.stk || 0) - dt);
    if (e.stk > 0.5 && e.los) {
      e.flowT = GS.time + 1.2;
      e.stk = 0;
    } // can see you but can't get through: take the long way round for a while
    if (e.stk > 0.5) {
      const a = Math.atan2(tvy, tvx) + (Math.random() < 0.5 ? 1.6 : -1.6);
      e.kx += Math.cos(a) * 220;
      e.ky += Math.sin(a) * 220;
      e.stk = 0;
    }
  }
  if (
    (e.type === 'beetle' || e.type === 'queen') &&
    (e.st === 'charge' || (e.type === 'queen' && e.st === 'leap' && (e.z || 0) < 30))
  ) {
    const ca = Math.atan2(e.vy, e.vx),
      tx = Math.floor((e.x + Math.cos(ca) * (e.r * 0.8 + 8)) / TILE),
      ty = Math.floor((e.y + Math.sin(ca) * (e.r * 0.8 + 8)) / TILE);
    if (tx > 2 && ty > 2 && tx < MW - 3 && ty < MH - 3 && ttype[ty * MW + tx] === 9) {
      breakTile(ty * MW + tx);
      shake(0.15);
    }
  } // a charge goes straight through chain-link
  if ((e.type === 'beetle' || e.type === 'queen') && Math.hypot(e.vx, e.vy) > 140) {
    const sp = Math.hypot(e.vx, e.vy),
      ux2 = e.vx / sp,
      uy2 = e.vy / sp;
    for (const c of GS.corpses) {
      if (d2(c.x, c.y, e.x, e.y) > (e.r + 16) ** 2) continue;
      const m = corpseMass(c);
      if (m < Infinity) ragKick(c, ux2, uy2, Math.min(420, sp * 0.8) / m, sp > 400);
    }
  } // bodies in its path get kicked aside
  if (e.type === 'beetle' && e.st === 'charge' && hitWall) {
    {
      const tx = Math.floor((e.x + e.lx * (e.r + 10)) / TILE),
        ty = Math.floor((e.y + e.ly * (e.r + 10)) / TILE),
        i = ty * MW + tx;
      if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && ttype[i] === 6) {
        const car = cars[carAt[i]];
        if (car && !car.dead) {
          car.jvx = (car.jvx || 0) + e.lx * 90;
          car.jvy = (car.jvy || 0) + e.ly * 90;
          car.jva = (car.jva || 0) + rand(-0.12, 0.12);
          damageCar(car, 40);
          chips(e.x + e.lx * e.r, e.y + e.ly * e.r, 8, [0.75, 0.85, 0.9], 3, 260);
        }
      }
    }
    e.st = 'stun';
    e.stT = 1.4;
    shake(0.25);
    sparks(e.x + e.lx * e.r, e.y + e.ly * e.r, [1, 0.9, 0.5], 18, 340);
    dust(e.x, e.y, 6, 50);
    distort(e.x, e.y, 0.015, 0.6, 0.4);
    sfx.crunch(e.x, e.y);
  }
  if (e.legs) updateLegs(e, dt);
  burnTick(e, dt);
  e.stride =
    (e.stride || 0) +
    (Math.hypot(e.vx, e.vy) * dt) / (e.type === 'beetle' ? 120 : e.type === 'hound' ? 70 : e.type === 'mini' ? 44 : 58);
  if (e.hp < e.maxHp * 0.5 && Math.random() < dt * 2.5)
    bleed(e.x, e.y, 12, rand(-1, 1), rand(-1, 1), 1, bloodOf(e), 30, 0.8);
  if (em && e.type !== 'flower' && e.dmg > 0 && e.z < 12 && !(e.down > 0)) {
    const rr2 = e.r + p.r;
    if (!(e.lunge > 0) && d2(e.x, e.y, p.x, p.y) < (rr2 + 22) ** 2) e.lunge = 0.42;
    if (d2(e.x, e.y, p.x, p.y) < rr2 * rr2) {
      if (e.st === 'bash') {
        const dx = p.x - e.x,
          dy = p.y - e.y,
          dl = Math.hypot(dx, dy) || 1;
        p.vx += (dx / dl) * 520;
        p.vy += (dy / dl) * 520;
        e.st = 'move';
        e.stT = 1.6;
      }
      hurtPlayer(
        e.dmg *
          (e.st === 'charge' ? 1.5 : e.shield ? 1.3 : 1) *
          (e.lost && e.lost[0] && e.lost[1] ? 0.5 : e.lost && (e.lost[0] || e.lost[1]) ? 0.8 : 1),
        e.x,
        e.y
      );
      if (e.type !== 'queen') {
        const dx = e.x - p.x,
          dy = e.y - p.y,
          dl = Math.hypot(dx, dy) || 1;
        e.kx += (dx / dl) * 300;
        e.ky += (dy / dl) * 300;
      }
      if ((e.st === 'leap' && e.type !== 'queen') || e.st === 'charge') {
        e.st = 'move';
        e.stT = 1.2;
      }
    }
  }
}
