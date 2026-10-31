/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { showStreak } from '../ui/callouts.js';
import { GS } from './gs.js';
import { $ } from './errors.js';
import { TAU, angDiff, clamp, d2, damp, keepIf, lerp, pick, rand, randi } from './util.js';
import { GUNS } from '../game/arsenal.js';
import { ZOOM, viewH, viewW } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { MW, TILE, isWall } from '../world/map.js';
import { N8, buildFlow, collide, flow, los, query, rebuildHash, solidPt } from '../world/nav.js';
import { SBV, noise, playS, spat, thr } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { S, WHEEL, addAmmo, addAmmoType, ammoRoomFor, ammoRoomK, cam, gd, magSize, reloadTime } from '../game/state.js';
import { need } from '../game/run.js';
import { offerUpgrades } from '../game/upgrades.js';
import { makeElite, makeEnemy } from '../actors/enemies.js';
import { bossNight, spawnPoint } from '../game/waves.js';
import { chips, decal, dust, floatText, glowBurst, part, pool, ring } from '../render/effects.js';
import { bossOf, explode, hurtPlayer, makeLurker, makeShield, updateCrates } from '../game/combat.js';
import { mouse, moveInput } from './input.js';
import { PK } from '../ui/hangar.js';
import { rope, runLater } from './later.js';
import { updateEnemy } from '../actors/enemy-ai.js';
import { firePlayer, updateBang, updateMortar, updatePBullet } from '../actors/player-weapons.js';
import { bossProj } from '../actors/projectiles.js';
import { BILE } from '../render/draw-enemies.js';
import { throwMolotov } from '../world/fire.js';
import { alarmTick } from '../game/noise.js';
import { FINAL_NIGHT, INF } from '../game/districts.js';
import { statMax } from '../game/challenges.js';
import { budBoard, budPerk, buddyHurt, buddyShoot, buddySlot, regroupSpot, rescueFollower } from '../actors/backups.js';
import { radioTick } from '../audio/radio.js';
import { nightCleared } from '../game/night-flow.js';
import { tutTick } from '../game/tutorial.js';
import { hordeSpot, startWave, surgeLull } from '../game/surges.js';
import { objHold, updateObjective } from '../game/objective-update.js';
import { heliVolume, startEvac, updateEvac } from '../game/evac.js';
import { tickGadgets } from '../game/gadgets.js';
import { hordeLive, tickHorde } from '../game/horde.js';
import { tickTraps } from '../game/traps.js';
import { tickSpores } from '../actors/specials.js';
import { SPECIAL, makeSpecial } from '../actors/specials.js';
export function update(dt) {
  radioTick(dt);
  GS.time += dt;
  GS.press = (GS.press || 0) * Math.pow(0.5, dt / 8); // the pressure fades with an 8 s half-life
  runLater(dt);
  if (GS.state !== 'play') return;
  if (GS.RUN && GS.RUN.metrics) GS.RUN.metrics.elapsed += dt;
  const p = GS.P;
  p.inv = Math.max(0, p.inv - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  if (p.abT > 0) {
    p.abT -= dt;
    if (p.abT <= 0) {
      p.abT = 0;
      sfx.ting();
    }
  }
  p.fireCd -= dt;
  p.hurt = Math.max(0, p.hurt - dt);
  if (p.daze > 0) {
    p.daze -= dt;
    GS.chroma = Math.max(GS.chroma, 0.004 * Math.min(1, p.daze));
  }
  if (S.regen) p.hp = Math.min(S.maxHp, p.hp + S.regen * dt);
  {
    const lowK = clamp((0.32 - p.hp / S.maxHp) / 0.32, 0, 1);
    if (lowK > 0 && p.hp > 0) {
      p.beatT = (p.beatT ?? 0) - dt;
      if (p.beatT <= 0) {
        p.beatT = lerp(1.05, 0.62, lowK);
        sfx.beat(lowK);
      }
    } else p.beatT = 0;
  }
  GS.comboT -= dt;
  if (GS.comboT <= 0) GS.combo = 0;
  if (GS.bannerT > -1) {
    const was = GS.bannerT;
    GS.bannerT -= dt;
    if (was > 0 && GS.bannerT <= 0) $('banner').classList.remove('show');
  } // keeps counting below 0 so callouts wait for the fade-out
  const [mx, my] = moveInput();
  if (p.dashT > 0) {
    p.dashT -= dt;
    if (Math.random() < dt * 40) dust(p.x - Math.cos(p.dashA) * 10, p.y - Math.sin(p.dashA) * 10, 1, 30, 0.7, 0.6);
    if (p.dashT <= 0) {
      p.vx *= 0.4;
      p.vy *= 0.4;
    }
  } else {
    const dz2 =
        (p.held ? 0.06 : p.daze > 0 ? 0.55 : 1) *
        (1 - 0.38 * (p.spore || 0)) *
        (p.gun === 'lmg' && !S.evo.walkfire && GS.time - (p.lastShotT || -9) < 0.22 ? 0.6 : 1),
      tvx = mx * S.speed * dz2,
      tvy = my * S.speed * dz2,
      dvx = tvx - p.vx,
      dvy = tvy - p.vy,
      dl = Math.hypot(dvx, dvy),
      acc = (mx || my ? 2000 : 2400) * dt;
    if (dl <= acc) {
      p.vx = tvx;
      p.vy = tvy;
    } else {
      p.vx += (dvx / dl) * acc;
      p.vy += (dvy / dl) * acc;
    }
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  collide(p);
  const spd = Math.hypot(p.vx, p.vy);
  if (spd > 20) p.moveA += angDiff(p.moveA, Math.atan2(p.vy, p.vx)) * damp(12, dt);
  p.strideAmp = lerp(p.strideAmp, Math.min(1, spd / S.speed), damp(10, dt));
  const ps = p.stride;
  p.stride += (spd * dt) / 76;
  if (spd > 60 && Math.floor(ps * 2) !== Math.floor(p.stride * 2)) {
    sfx.step();
    if (Math.random() < 0.5) dust(p.x - Math.cos(p.moveA) * 8, p.y - Math.sin(p.moveA) * 8, 1, 12, 0.35, 0.5);
  }
  p.recoil = Math.max(0, p.recoil - dt * 40);
  p.heat = Math.max(
    0,
    (p.heat || 0) - dt * 1.2
  ); /* sustained fire heats the barrel and the spread blooms; tapping stays tight */
  alarmTick(dt);
  let firing = false,
    target = p.aimA;
  const cwx = cam.x + mouse.x / ZOOM,
    cwy = cam.y + mouse.y / ZOOM;
  if (d2(cwx, cwy, p.x, p.y) > 40 * 40) target = Math.atan2(cwy - p.y, cwx - p.x);
  firing = mouse.down;
  if (WHEEL.open) {
    target = p.aimA;
    firing = false;
  } // the wheel is up: the mouse picks a gun, it doesn't aim or shoot
  p.aimA += angDiff(p.aimA, target) * damp(20, dt);
  p.bodyA += angDiff(p.bodyA, p.aimA) * damp(9, dt);
  if (p.swap > 0) p.swap -= dt;
  p.rk = lerp(p.rk || 0, p.reload > 0 ? 1 : p.rackT > 0 ? 0.4 : 0, damp(12, dt));
  if (p.rackT > 0) p.rackT -= dt;
  if (p.pumpT > 0) p.pumpT -= dt;
  if (p.reload > 0) {
    const g = p.gun,
      G = GUNS[g],
      n = magSize(g);
    p.reload -= dt * S.reloadK;
    if (p.reload <= 0) {
      if (G.perShell) {
        if (p.mag[g] < n && p.ammo[G.ammo] > 0) {
          p.mag[g]++;
          p.ammo[G.ammo]--;
          sfx.shell();
        }
        if (p.mag[g] < n && p.ammo[G.ammo] > 0) p.reload = reloadTime(g);
        else {
          p.reload = 0;
          if (g === 'lever' && SBV.leverAct) playS('leverAct', 0.6, 1, 0, 0.08);
          else sfx.pump();
          p.pumpT = 0.24;
          if (S.evo.medload) p.hp = Math.min(S.maxHp, p.hp + 3);
        }
      } else {
        const take = G.ammo ? Math.min(n - p.mag[g], p.ammo[G.ammo]) : n - p.mag[g];
        p.mag[g] += take;
        if (G.ammo) p.ammo[G.ammo] -= take;
        p.reload = 0;
        sfx.magIn();
        p.rackT = 0.32;
        if (S.evo.medload) p.hp = Math.min(S.maxHp, p.hp + 3);
      }
    }
  }
  if (!firing) p.trigFresh = true; // a fresh pull of the trigger can cut a shell-by-shell reload short; holding it down can't
  if (firing && p.fireCd <= 0 && p.swap <= 0 && !(p.reload > 0 && (!GUNS[p.gun].perShell || !p.trigFresh)))
    firePlayer(cwx, cwy, p, target);
  rope(p, dt, p.x - Math.cos(p.bodyA) * 9, p.y - Math.sin(p.bodyA) * 9);
  if (S.molo) {
    p.moloT = (p.moloT ?? 2) - dt;
    if (p.moloT <= 0) p.moloT = throwMolotov(p) ? 7 / (1 + 0.3 * (S.molo - 1)) : 0.5;
  }
  if (S.darts) {
    p.dartT -= dt;
    if (p.dartT <= 0) {
      const tg = [];
      query(p.x, p.y, 430, e => {
        if (!e.dead && e.emerge >= 1 && d2(e.x, e.y, p.x, p.y) > 70 * 70) tg.push(e);
      });
      if (tg.length) {
        p.dartT = S.dartCd;
        for (let i = 0; i < S.darts; i++) {
          const e = pick(tg),
            tx = e.x + e.vx * 0.4 + rand(-20, 20),
            ty = e.y + e.vy * 0.4 + rand(-20, 20),
            d = Math.hypot(tx - p.x, ty - p.y);
          GS.darts.push({
            x0: p.x,
            y0: p.y,
            x: p.x,
            y: p.y,
            tx,
            ty,
            t: -i * 0.12,
            dur: clamp(d / 480, 0.35, 0.9),
            z: 0,
            spin: rand(0, TAU),
            fuse: 0.45,
            life: 9,
          });
        }
        sfx.swap();
      } else p.dartT = 0.4;
    }
  }
  if (S.pulse) {
    p.pulseT -= dt;
    if (p.pulseT <= 0) {
      let best = null,
        bn = 0;
      query(p.x, p.y, 320, e => {
        if (e.dead || e.emerge < 1) return;
        let n = 0;
        query(e.x, e.y, 110, o => {
          if (!o.dead && d2(o.x, o.y, e.x, e.y) < 110 * 110) n++;
        });
        if (n > bn) {
          bn = n;
          best = e;
        }
      });
      if (best) {
        p.pulseT = S.pulseCd;
        const tx = best.x + best.vx * 0.3,
          ty = best.y + best.vy * 0.3,
          d = Math.hypot(tx - p.x, ty - p.y);
        GS.bangs.push({
          x0: p.x,
          y0: p.y,
          x: p.x,
          y: p.y,
          tx,
          ty,
          t: 0,
          dur: clamp(d / 520, 0.25, 0.6),
          z: 0,
          spin: rand(0, TAU),
          fuse: 0.4,
        });
        sfx.swap();
      } else p.pulseT = 0.5;
    }
  }
  for (const g of GS.bangs) updateBang(g, dt, p);
  keepIf(GS.bangs, g => !g.done);
  tickGadgets(dt);
  tickHorde(dt);
  tickTraps(dt);
  tickSpores(dt);
  // formation trails the way you walk, not the way you aim, and holds still while you stand
  const pspd = Math.hypot(p.vx, p.vy);
  if (p.formA === undefined) p.formA = p.moveA;
  if (pspd > 60) p.formA += angDiff(p.formA, p.moveA) * damp(2.5, dt);
  {
    p.__slots = [];
    const rs = rescueFollower();
    if (rs && rs.slot) p.__slots.push(Object.assign([rs.slot.x, rs.slot.y], { rs: 1 }));
  } // the spots your people hold, rebuilt once a frame
  GS.buddies.slice().forEach((s, i) => {
    // a copy: one may bleed out and leave mid-loop
    if (buddyHurt(s, p, dt)) return; // down: it sits where it fell and keeps shooting
    budPerk(s, dt, Math.hypot(p.x - s.x, p.y - s.y));
    if (GS.evac && GS.evac.t >= GS.evac.land - 3 && !GS.evac.leave && budBoard(s, dt)) return; // wheels down: they run for the door
    // each survivor holds a spot round you: open ground you can see, out of your line of fire, clear of the others; kept while you stand still, so nobody shuffles about
    const taken = p.__slots;
    let sl = s.slot;
    const bad =
      !sl ||
      Math.hypot(p.x - sl.px, p.y - sl.py) > (pspd > 60 ? 0 : 30) ||
      solidPt(sl.x, sl.y) ||
      (s.coneT = sl && Math.abs(angDiff(p.aimA, Math.atan2(sl.y - p.y, sl.x - p.x))) < 0.4 ? (s.coneT || 0) + dt : 0) >
        0.35 ||
      (s.stuckT || 0) > 0.8 ||
      taken.some(q => d2(q[0], q[1], sl.x, sl.y) < 40 * 40);
    if (bad) {
      const stuck = (s.stuckT || 0) > 0.8 && sl;
      if (stuck) {
        s.avoid = { x: sl.x, y: sl.y, t: GS.time + 3 };
        s.fails = (s.fails || 0) + 1;
      } else s.fails = 0;
      const b = s.fails >= 2 ? null : buddySlot(p, s, i, taken);
      sl = s.slot = b ? { x: b[0], y: b[1], px: p.x, py: p.y } : { x: s.x, y: s.y, px: p.x, py: p.y };
      if (!b) s.fails = 0;
      s.stuckT = 0;
      s.pgD = undefined;
    } // can't get to any spot: it simply stands where it is
    taken.push([sl.x, sl.y]);
    const tx = sl.x,
      ty = sl.y;
    const ox = s.x,
      oy = s.y;
    const dx = tx - s.x,
      dy = ty - s.y,
      dd = Math.hypot(dx, dy),
      pd = Math.hypot(p.x - s.x, p.y - s.y);
    if (dd > 22) {
      let ux = dx / dd,
        uy = dy / dd;
      if (pd > 110 && (s.flowT > 0 || !los(s.x, s.y, tx, ty))) {
        const cx = Math.floor(s.x / TILE), // the flow field leads to you, so it only helps from further out
          cy = Math.floor(s.y / TILE);
        let best = flow[cy * MW + cx],
          bx = cx,
          by = cy; // no clear line: walk the player's flow field round the obstacle
        for (const [ox2, oy2] of N8) {
          const nx = cx + ox2,
            ny = cy + oy2;
          if (isWall(nx, ny) || (ox2 && oy2 && (isWall(cx + ox2, cy) || isWall(cx, cy + oy2)))) continue;
          const v = flow[ny * MW + nx] + (ox2 && oy2 ? 0.8 : 0);
          if (v < best) {
            best = v;
            bx = nx;
            by = ny;
          }
        }
        if (bx !== cx || by !== cy) {
          const gx = (bx + 0.5) * TILE - s.x,
            gy = (by + 0.5) * TILE - s.y,
            g = Math.hypot(gx, gy) || 1;
          ux = gx / g;
          uy = gy / g;
        }
      }
      {
        const qx = p.x - s.x,
          qy = p.y - s.y,
          along = qx * ux + qy * uy,
          side = qx * uy - qy * ux;
        if (along > 0 && along < dd && Math.abs(side) < 40) {
          const sg = side >= 0 ? 1 : -1,
            nx = ux - uy * sg * 1.3,
            ny = uy + ux * sg * 1.3,
            nl = Math.hypot(nx, ny);
          ux = nx / nl;
          uy = ny / nl;
        }
      } // you are in the way: go round you, not into you
      const v = Math.min(Math.max(S.speed * 1.15, pspd * 1.1), dd * 5);
      s.x += ux * v * dt;
      s.y += uy * v * dt;
      s.wantV = v;
    } else s.wantV = 0;
    s.flowT = (s.flowT || 0) - dt;
    s.chkT = (s.chkT || 0) - dt;
    if (s.chkT <= 0) {
      s.chkT = 0.5;
      const closed = (s.lastPd ?? pd) - pd;
      s.lastPd = pd;
      if (dd > 60 && closed < 15) {
        s.flowT = 1.5;
      }
      if (pd > 280 && closed < 30) s.lostT = (s.lostT || 0) + 0.5;
      else s.lostT = 0;
    }
    const onScr = s.x > cam.x - 30 && s.x < cam.x + viewW + 30 && s.y > cam.y - 50 && s.y < cam.y + viewH + 30;
    if (pd > 950 || (s.lostT >= 2 && !onScr) || s.lostT >= 4) {
      const sp = regroupSpot(p, i);
      if (sp) {
        s.x = sp[0];
        s.y = sp[1];
        s.lostT = 0;
        s.lastPd = Math.hypot(p.x - s.x, p.y - s.y);
        s.flowT = 0;
      }
    }
    for (const o of rescueFollower() ? GS.buddies.concat(rescueFollower()) : GS.buddies)
      if (o !== s) {
        const ex = s.x - o.x,
          ey = s.y - o.y,
          el = Math.hypot(ex, ey);
        if (el < 42 && el > 0.01) {
          s.x += (ex / el) * (42 - el) * 0.5;
          s.y += (ey / el) * (42 - el) * 0.5;
        }
      }
    {
      let ex = s.x - p.x,
        ey = s.y - p.y,
        el = Math.hypot(ex, ey);
      if (el < 0.01) {
        const a2 = p.formA + Math.PI + i;
        ex = Math.cos(a2);
        ey = Math.sin(a2);
        el = 1;
      }
      if (el < 34) {
        s.x = p.x + (ex / el) * 34;
        s.y = p.y + (ey / el) * 34;
      }
    } // a survivor never stands inside you: always at least a shoulder's width away
    collide(s);
    {
      const nd = Math.hypot(tx - s.x, ty - s.y);
      s.pgT = (s.pgT || 0) + dt;
      if (s.pgT >= 0.4) {
        const gain = (s.pgD ?? nd) - nd;
        s.stuckT = (s.wantV || 0) > 30 && gain < 18 ? (s.stuckT || 0) + s.pgT : 0;
        s.pgT = 0;
        s.pgD = nd;
      }
    } // over a short window, walking but getting no closer: give up on that spot
    const vx = (s.x - ox) / Math.max(dt, 1e-4),
      vy = (s.y - oy) / Math.max(dt, 1e-4),
      spd = Math.hypot(vx, vy);
    if (spd > 20) s.moveA += angDiff(s.moveA, Math.atan2(vy, vx)) * damp(10, dt);
    s.strideAmp = lerp(s.strideAmp, Math.min(1, spd / 250), damp(10, dt));
    s.stride += (spd * dt) / 76;
    s.aimA = s.aim;
    s.bodyA += angDiff(s.bodyA, s.aim) * damp(8, dt);
    s.recoil = Math.max(0, s.recoil - dt * 40);
    buddyShoot(s, dt, 1);
  });
  const SG = GS.RUN.sg;
  if (GS.queue.length && SG && SG.lull > 0)
    surgeLull(SG, dt); // between surges: finish off what is out, then a breath before the next lot
  else if (GS.queue.length) {
    GS.spawnT -= dt;
    if (GS.spawnT <= 0) {
      GS.spawnT =
        Math.max(0.22, 1.0 - GS.wave * 0.05) *
        (1 - 0.07 * ((GS.wave - 1) % 5)) *
        (SG && SG.horde ? 0.7 : 1) *
        (1 + clamp((GS.press || 0) - 0.25, 0, 0.6)) *
        ((GS.press || 0) < 0.03 ? 0.88 : 1) *
        (bossNight(GS.wave) ? 1.7 : 1); // spawns quicken toward each boss; a surge comes faster, a horde faster still. They ease off while you are being hurt and press on while you are not, and a boss's company arrives in its own time
      let t = GS.queue.shift();
      const mark = t === 'hunt';
      if (mark) t = GS.wave >= 6 && Math.random() < 0.5 ? 'beetle' : 'skitter'; // a marked elite for the hunt job
      const edge = false,
        [sx, sy] = SG && SG.horde && t !== 'queen' ? hordeSpot(SG.horde) : spawnPoint(t === 'queen' ? 520 : 460, edge);
      if (SG) {
        SG.n++;
        if (SG.i < SG.cuts.length && (SG.m || 0) - GS.queue.length >= SG.cuts[SG.i] && GS.queue.length) {
          SG.i++;
          SG.lull = (GS.press || 0) > 0.35 ? 28 : (GS.press || 0) < 0.05 ? 15 : 22; // a longer breath after a hard surge, a shorter one after an easy one
          SG.quiet = 0;
        }
      }
      const pack = t === 'skitter' ? randi(2, 3 + Math.min(3, GS.wave >> 2)) : t === 'hound' ? 3 : 1; // specials come alone
      for (let i = 0; i < pack; i++) {
        const ne = SPECIAL[t]
          ? makeSpecial(t, sx, sy)
          : t === 'lurker'
            ? (() => {
                const [lx, ly] = spawnPoint(300, false);
                return makeLurker(lx, ly);
              })()
            : t === 'shield'
              ? makeShield(makeEnemy('skitter', sx, sy))
              : makeEnemy(t, sx + (i ? rand(-16, 16) : 0), sy + (i ? rand(-16, 16) : 0));
        if (
          GS.wave >= 3 &&
          t !== 'queen' &&
          t !== 'flower' &&
          Math.random() < (0.03 + GS.wave * 0.005 + 0.012 * ((GS.wave - 1) % 5)) * (INF(3) ? 2 : 1)
        )
          makeElite(ne);
        if (mark && !i && ne) {
          if (!ne.elite) makeElite(ne);
          ne.mark = true;
          ne.markT = 50;
        }
        if (i && GS.queue[0] === 'skitter') GS.queue.shift();
      }
      if (!edge && t !== 'lurker') {
        dust(sx, sy, 7, 50, 1, 1);
        chips(sx, sy, 6, null, 4, 140);
        sfx.dig(sx, sy);
        ring(sx, sy, 6, 40, 0.4, [0.6, 0.5, 0.4], 0.5);
        decal(R.hole, sx, sy, t === 'queen' ? 3 : t === 'beetle' ? 1.5 : 1, [1, 1, 1, 0.9], [0, 0, 0], 14);
      }
    }
  } else if (!GS.enemies.length && !GS.evac && !GS.bossDue && !GS.RUN.tut && !hordeLive() && !objHold(dt)) {
    if (GS.wave > 0 && GS.nightLive) nightCleared();
    const waitDrop =
      GS.nightDone &&
      GS.interT < 4 &&
      GS.crates.some(c => c.dawn && !c.open) &&
      (GS.RUN.dawnX = (GS.RUN.dawnX || 0) + dt) < 14;
    if (!waitDrop) GS.interT -= dt; // the countdown holds at 4 while the dawn drop sits unopened, for up to 14 s more
    if (GS.interT <= 0) {
      GS.interT = 2.6;
      if (!GS.RUN.endless && GS.wave >= FINAL_NIGHT) startEvac();
      else startWave();
    }
  }
  updateObjective(dt);
  if (GS.evac) updateEvac(dt);
  if (GS.RUN.tut) tutTick(dt);
  heliVolume();
  // the dead think and move once a frame; you, your rounds and your grenades take the finer steps (see main.js)
  const aiStep = !(GS.subI < (GS.subN || 1) - 1),
    aiDt = dt * (GS.subN || 1);
  if (aiStep) {
    buildFlow(p.x, p.y);
    rebuildHash();
    for (const e of GS.enemies) updateEnemy(e, aiDt, p);
    for (const a of GS.enemies) {
      if (a.dead || a.type === 'flower' || a.st === 'jump') continue;
      query(a.x, a.y, a.r + 30, b => {
        if (b === a || b.dead || b.id < a.id || b.st === 'jump' || !!a.fly !== !!b.fly) return;
        const rr2 = a.r + b.r,
          dd = d2(a.x, a.y, b.x, b.y);
        if (dd < rr2 * rr2 && dd > 0.01) {
          const d = Math.sqrt(dd),
            push = rr2 - d,
            nx = (a.x - b.x) / d,
            ny = (a.y - b.y) / d,
            wa = a.type === 'queen' || a.type === 'flower' || a.type === 'egg' ? 0 : 1 / (a.r * a.r),
            wb = b.type === 'queen' || b.type === 'flower' || b.type === 'egg' ? 0 : 1 / (b.r * b.r), // the lighter body gives way: a walker is shoved aside by a brute, not the other way round
            tot = wa + wb || 1;
          a.x += (nx * push * wa) / tot;
          a.y += (ny * push * wa) / tot;
          b.x -= (nx * push * wb) / tot;
          b.y -= (ny * push * wb) / tot;
        }
      });
    }
  }
  for (const b of GS.barrels) {
    if (b.dead) continue;
    for (let oi = -1; oi < GS.enemies.length; oi++) {
      const o = oi < 0 ? p : GS.enemies[oi];
      if (o.dead || o.fly || o.st === 'jump') continue;
      const rr2 = b.r + o.r,
        dd = d2(o.x, o.y, b.x, b.y);
      if (dd < rr2 * rr2 && dd > 0.01) {
        const d = Math.sqrt(dd);
        o.x += ((o.x - b.x) / d) * (rr2 - d);
        o.y += ((o.y - b.y) / d) * (rr2 - d);
      }
    }
  }
  for (const b of GS.pbullets) updatePBullet(b, dt);
  for (const m of GS.darts) {
    if (m.t < 0) {
      m.t += dt;
      continue;
    }
    if (m.t < m.dur) {
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      m.x = lerp(m.x0, m.tx, k);
      m.y = lerp(m.y0, m.ty, k);
      m.z = Math.sin(k * Math.PI) * (30 + m.dur * 110);
      m.spin += dt * 14;
      if (k >= 1) {
        m.z = 0;
        sfx.ting();
      }
      continue;
    }
    m.fuse -= dt;
    if (m.fuse <= 0) {
      m.life = 0;
      explode(m.x, m.y, 80, gd() * 2.6, false);
    }
  }
  for (const b of GS.ebullets) {
    if (b.k === 'tire' || b.k === 'sign') {
      bossProj(b, dt, p);
      continue;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.ghost) b.ghost -= dt;
    if (b.life <= 0 || (!(b.ghost > 0) && solidPt(b.x, b.y))) {
      if (b.k === 'rock') {
        chips(b.x, b.y, 3, b.c, 4, 160);
        dust(b.x, b.y, 1, 20, 0.5, 0.5);
        b.life = 0;
        continue;
      }
      glowBurst(b.x, b.y, b.c, 3, 80, 0.25, 0.35);
      if (b.k === 'acid') {
        pool(b.x, b.y, 0.35, BILE, 12);
        if (b.pool)
          GS.pools.push({
            x: b.x,
            y: b.y,
            r: 34,
            life: 3.5,
            max: 3.5,
            dmg: 4 * (1 + 0.04 * GS.wave),
            rot: rand(0, TAU),
            v: randi(0, 3),
          });
      }
      b.life = 0;
      continue;
    }
    if (d2(b.x, b.y, p.x, p.y) < (b.r + p.r - 3) ** 2 && p.inv <= 0) {
      hurtPlayer(
        b.dmg,
        b.x,
        b.y,
        b.owner && b.owner.type === 'queen' ? bossOf(b.owner) : b.hose ? 'the Abomination' : 'spitter acid'
      );
      b.life = 0;
    }
  }
  const ammoRoom = ammoRoomK(),
    hpRoom = S.maxHp - p.hp; // only pull what you have real room for; the rest waits on the ground
  let hpWait = 0; // at most four medkits wait for you on the ground; any more run out as usual
  for (const k of GS.pickups) {
    k.t += dt;
    const dd = Math.sqrt(d2(k.x, k.y, p.x, p.y));
    const full =
      k.k === 'hp' ? hpRoom < Math.min(12, k.v * 0.5) : (k.at ? ammoRoomFor(k) : ammoRoom) < 0.35 * (k.v || 1);
    if (full) {
      k.pull = false;
      if (GS.pickups.length < 25 && (k.k !== 'hp' || ++hpWait <= 4)) k.hold = (k.hold || 0) + dt;
    } /* full: leave it for later instead of wasting it, and don't let it run out while it waits */
    if (!full && ((dd < S.magnet && k.t > 0.25) || k.pull)) {
      k.pull = true;
      const s = 650 + k.t * 250,
        ux = (p.x - k.x) / (dd || 1),
        uy = (p.y - k.y) / (dd || 1);
      k.vx += (ux * s - k.vx) * damp(9, dt);
      k.vy += (uy * s - k.vy) * damp(9, dt);
    } else {
      const f = Math.pow(0.03, dt);
      k.vx *= f;
      k.vy *= f;
      const o = { x: k.x, y: k.y, r: 6, vx: k.vx, vy: k.vy };
      collide(o);
      k.x = o.x;
      k.y = o.y;
      k.vx = o.vx;
      k.vy = o.vy;
    }
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    if (!k.pull && solidPt(k.x, k.y)) {
      out: for (let r = 10; r <= 90; r += 10)
        for (let a = 0; a < 8; a++) {
          const x = k.x + Math.cos((a * Math.PI) / 4) * r,
            y = k.y + Math.sin((a * Math.PI) / 4) * r;
          if (!solidPt(x, y)) {
            k.x = x;
            k.y = y;
            k.vx = k.vy = 0;
            break out;
          }
        }
    } // thrown into a wall: it comes out on the nearest open ground, where you can get to it
    if (!full && dd < p.r + 10) {
      k.got = true;
      if (k.k === 'ammo') {
        if (k.at) addAmmoType(k.at, k.v);
        else addAmmo(k.v);
      } else {
        const hv = Math.round(k.v * (PK().medic ? 1.5 : 1));
        p.hp = Math.min(S.maxHp, p.hp + hv);
        sfx.heal();
        floatText(p.x, p.y - 34, `+${hv} health`, '#8ef0b8', 18);
        glowBurst(p.x, p.y, [0.4, 1, 0.7], 14, 160, 0.5, 0.5);
      }
    }
  }
  updateCrates(dt);
  for (const c of GS.gasClouds) {
    c.life -= dt;
    if (Math.random() < dt * 9) {
      const a = rand(0, TAU),
        r = rand(0, c.r * 0.8);
      part({
        k: 2,
        x: c.x + Math.cos(a) * r,
        y: c.y + Math.sin(a) * r,
        vx: rand(-20, 20),
        vy: rand(-20, 20),
        life: rand(1, 1.8),
        max: 1.8,
        size: rand(0.9, 1.4),
        grow: 1.6,
        drag: 1.2,
        rot: rand(0, TAU),
        vr: rand(-1, 1),
        c: [0.86, 0.86, 0.84],
      });
    }
    if (GS.state === 'play' && c.life > 0.4 && d2(c.x, c.y, p.x, p.y) < c.r * c.r) {
      p.daze = Math.max(p.daze || 0, 0.45);
      if (!GS.RUN.choked) {
        GS.RUN.choked = true;
        floatText(p.x, p.y - 46, 'Choking · get out of the powder', '#e8e4d8', 15);
      }
      if (thr('cough', 900)) {
        const b = spat(p.x, p.y);
        noise(0.18, 0.08, 900, 400, 'bandpass', 0, b);
        noise(0.14, 0.06, 800, 350, 'bandpass', 0.22, b);
      }
    }
  } // the powder cloud: you choke and slow down inside it
  keepIf(GS.gasClouds, c => c.life > 0);
  for (const m of GS.mortars) updateMortar(m, dt, p);
  keepIf(GS.mortars, m => !m.done);
  for (const w of GS.warns) w.t += dt;
  keepIf(GS.warns, w => w.t < w.dur);
  for (const pl of GS.pools) {
    pl.life -= dt;
    if (pl.life > 0.4 && d2(pl.x, pl.y, p.x, p.y) < (pl.r * 0.8) ** 2 && p.inv <= 0)
      hurtPlayer(pl.dmg, undefined, undefined, 'a pool of bile');
  }
  keepIf(GS.pools, pl => pl.life > 0);
  for (const a of GS.arcs) a.life -= dt;
  for (const g of GS.ghosts) g.life -= dt;
  keepIf(GS.pbullets, b => b.life > 0);
  keepIf(GS.darts, m => m.life > 0);
  keepIf(GS.ebullets, b => b.life > 0);
  GS.enemies = GS.enemies.filter(e => !e.dead);
  GS.pickups = GS.pickups.filter(k => !k.got && k.t - (k.hold || 0) < 40);
  keepIf(GS.arcs, a => a.life > 0);
  keepIf(GS.ghosts, g => g.life > 0);
  // in the thick of a fight a level-up waits for a breath (a lull, the street thinning out), so the cards don't
  // freeze a surge every half minute; it never waits more than 25 s
  let close = 0;
  if (GS.xp >= GS.xpNeed && GS.state === 'play')
    for (const e of GS.enemies)
      if (!e.dead && !e.dormant && e.aw > 0 && d2(e.x, e.y, p.x, p.y) < 380 * 380 && ++close >= 5) break;
  if (GS.xp >= GS.xpNeed && GS.state === 'play') {
    if (close >= 5) {
      if (!GS.lvWait) {
        GS.lvWait = GS.time;
        showStreak('Level up', 'Your pick waits for a breath');
      }
    }
  }
  const lvGo = !GS.lvWait || close < 3 || GS.time - GS.lvWait > 25;
  if (
    GS.xp >= GS.xpNeed &&
    GS.state === 'play' &&
    lvGo &&
    GS.time > (GS.RUN.lvHold || 0) &&
    !GS.evac &&
    !GS.bossDue &&
    !(GS.RUN.practice && (!GS.boss || GS.boss.dead))
  ) {
    GS.lvWait = 0;
    // never during the evac or a boss's entrance: the cards wait
    GS.xp -= GS.xpNeed;
    GS.level++;
    GS.xpNeed = need(GS.level);
    statMax('maxLevel', GS.level);
    offerUpgrades();
  }
}
