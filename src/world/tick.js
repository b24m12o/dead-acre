/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, clamp, d2, keepIf, rand, randi } from '../core/util.js';
import { opt } from '../core/settings.js';
import { viewH, viewW } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { WH, WW, crystals } from './map.js';
import { solidPt } from './nav.js';
import { updateLegs } from '../actors/legs.js';
import { AC, MUS, ambG, musLP, playS, thr } from '../audio/audio.js';
import { S, cam } from '../game/state.js';
import { showStreak } from '../ui/callouts.js';
import { HUMAN, decal, part, ring, shake } from '../render/effects.js';
import { LYB, lyMove, lyState, lyThud } from '../render/draw-bodies.js';
import { updateAsh } from './wear.js';
import { WINDX, physTick } from './physics.js';
import { sightTick } from './vision.js';
import { updateJets } from '../render/decor.js';
import { updateFire } from './fire.js';
import { NOISE } from '../game/noise.js';
import { updateEvac } from '../game/evac.js';
import { updateWeather } from './weather.js';
export function tickWorld(dt) {
  sightTick(dt);
  updateJets(dt);
  updateAsh(dt);
  updateFire(dt);
  updateWeather(dt);
  if (GS.evac && GS.state !== 'play') updateEvac(dt);
  for (const q of GS.parts) {
    q.life -= dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    if (q.k === 2) {
      const w = q.wind ?? 0.5;
      q.x += WINDX * w * dt;
      q.y += WINDX * 0.2 * w * dt;
    } else if (
      (q.k === 9 || q.k === 3 || q.k === 4 || q.k === 7 || q.k === 12) &&
      (q.z || 0) < 40 &&
      solidPt(q.x, q.y) &&
      !solidPt(q.x - q.vx * dt, q.y - q.vy * dt)
    ) {
      q.x -= q.vx * dt;
      q.y -= q.vy * dt;
      const sp = Math.hypot(q.vx, q.vy);
      if (solidPt(q.x + q.vx * dt, q.y)) q.vx *= -0.45;
      else q.vy *= -0.45;
      if (q.vr) q.vr = -q.vr;
      if (q.k === 9 && sp > 120 && q.c && GS.decals.length < 400)
        decal(R['splat' + randi(0, 3)], q.x, q.y, rand(0.1, 0.18), [q.c[0], q.c[1], q.c[2], 0.85], [0, 0, 0], 40);
      if (sp > 160 && q.k !== 9 && Math.random() < 0.2 && thr('tick', 40)) playS('dry', 0.03, 2.2, 0, 0);
    }
    const f = Math.pow(Math.exp(-q.drag), dt);
    q.vx *= f;
    q.vy *= f;
    if (q.rot !== undefined) q.rot += (q.vr || 0) * dt;
    if (q.vz !== undefined) {
      q.vz -= 600 * dt;
      q.z += q.vz * dt;
      if (q.z < 0) {
        if (q.k === 11) {
          q.life = 0;
          if (Math.random() < 0.3) ring(q.x, q.y, 1, 6, 0.3, [0.5, 0.6, 0.7], 0.3);
          continue;
        }
        if (q.k === 8) {
          q.life = 0;
          if (Math.random() < 0.4)
            decal(
              R['splat' + randi(0, 3)],
              q.x,
              q.y,
              q.size * rand(0.1, 0.2),
              [q.c[0], q.c[1], q.c[2], 0.9],
              [0, 0, 0],
              40
            );
          continue;
        }
        if (q.k === 9 && q.vz < -60 && !q.spl)
          (q.spl = 1),
            decal(R['splat' + randi(0, 3)], q.x, q.y, rand(0.12, 0.22), [q.c[0], q.c[1], q.c[2], 0.9], [0, 0, 0], 40);
        q.z = 0;
        q.vz *= -0.35;
        q.vx *= 0.6;
        q.vy *= 0.6;
        if (q.vr) q.vr *= 0.5;
      }
    }
  }
  for (const q of GS.parts)
    if ((q.k === 3 || q.k === 4) && q.life > 0 && q.life < dt * 1.5 && GS.decals.length < 380 && Math.random() < 0.35)
      decal(
        q.k === 3 ? R.chip : R.rockchip,
        q.x,
        q.y,
        q.size * 0.8,
        [(q.c || [1, 1, 1])[0] * 0.8, (q.c || [1, 1, 1])[1] * 0.8, (q.c || [1, 1, 1])[2] * 0.8, 1],
        [0, 0, 0],
        40
      );
  GS.GIBN = 0;
  for (const q of GS.parts) if (q.k === 9) GS.GIBN++;
  for (const q of GS.parts)
    if (q.k === 9 && q.life > 0 && q.life < dt * 1.5 && GS.decals.length < 400)
      decal(R['splat' + ((q.x | 0) & 3)], q.x, q.y, q.size * 0.22, [0.2, 0.03, 0.03, 0.75], [0, 0, 0], 50); // a gone piece leaves a dark smear where it lay
  for (const q of GS.parts)
    if (q.k === 12 && q.life > 0 && q.life < dt * 1.5) decal(R.mag, q.x, q.y, q.size, [1, 1, 1, 1], [0, 0, 0], 40);
  for (const q of GS.parts)
    if (q.k === 7 && q.life > 0 && q.life < dt * 1.5 && GS.decals.length < 400)
      decal(R.shell, q.x, q.y, q.size, q.tc ? [q.tc[0], q.tc[1], q.tc[2], 1] : [1, 1, 1, 1], [0, 0, 0], 30);
  if (dt > 0) keepIf(GS.parts, q => q.life > 0);
  for (const d of GS.decals) {
    d.life -= dt * (GS.decals.length > 340 ? 3 : 1);
    if (d.gs) {
      if (d.s < d.gs) d.s = Math.min(d.gs, d.s + dt * d.gs * (d.s < d.gs * 0.6 ? 0.5 : 0.12));
      if (d.tint[0] > 0.2) d.tint[0] *= 1 - dt * 0.012;
    }
    if (d.dry && d.tint[0] > 0.15) {
      d.tint[0] *= 1 - dt * 0.009;
      d.tint[1] = Math.min(d.tint[1] * (1 + dt * 0.004), 0.05);
    }
  }
  keepIf(GS.decals, d => d.life > 0);
  for (const t of GS.texts) {
    t.life -= dt;
    t.y += t.vy * dt;
    t.vy *= Math.pow(0.0018, dt);
  }
  keepIf(GS.texts, t => t.life > 0);
  for (const f of GS.flashes) f.life -= dt;
  keepIf(GS.flashes, f => f.life > 0);
  for (const r of GS.rings) r.life -= dt;
  keepIf(GS.rings, r => r.life > 0);
  for (const l of GS.dlights) l.life -= dt;
  keepIf(GS.dlights, l => l.life > 0);
  for (const w of GS.dwaves) w.t += dt;
  keepIf(GS.dwaves, w => w.t < w.life);
  for (const e of GS.corpses) {
    const pd = e.dying;
    e.dying += dt;
    if (LYB[e.type] && pd < 0.5) lyMove(e, lyState(e).g);
    if (pd < 0.42 && e.dying >= 0.42 && HUMAN[e.type] && GS.corpses.length < 60) {
      const K = e.type === 'beetle' ? 2 : 1,
        ba = e.fallA ?? e.a + Math.PI;
      if (LYB[e.type]) lyThud(e);
      for (let i = 0; i < 4 * K; i++) {
        const t = rand(-36, 30) * K;
        part({
          k: 2,
          x: e.x + Math.cos(ba) * t + rand(-8, 8),
          y: e.y + Math.sin(ba) * t + rand(-8, 8),
          vx: rand(-40, 40),
          vy: rand(-40, 40),
          life: rand(0.5, 0.9),
          max: 0.9,
          size: rand(0.5, 0.9) * K,
          grow: 1,
          drag: 4,
          c: [0.42, 0.4, 0.36],
          rot: rand(0, TAU),
          vr: rand(-1, 1),
        });
      }
      if (K > 1) shake(0.08);
    }
    if (e.legs) updateLegs(e, dt);
  }
  physTick(dt);
  GS.corpses = GS.corpses.filter(e => e.dying < (e.keep || 0.55));
  GS.whiteFlash = Math.max(0, GS.whiteFlash - dt * 1.6);
  for (const b of GS.screenBlood) b.life -= dt;
  keepIf(GS.screenBlood, b => b.life > 0);
  for (const h of GS.hitDirs) h.life -= dt;
  keepIf(GS.hitDirs, h => h.life > 0);
  if (GS.streakT > 0) {
    GS.streakT -= dt;
    if (GS.streakT <= 0) {
      $('streak').classList.remove('show');
      GS.streakCur = null;
    }
  } else if (GS.state === 'play' && GS.streakQ.length && GS.bannerT <= -0.45) {
    const [t, sub, ok] = GS.streakQ.shift();
    if (!ok || ok()) {
      GS.later.push({ t: 0.2, fn: () => showStreak(t, sub, undefined, ok) });
      GS.streakT = 0.01;
    }
  } // news that has gone stale while it waited (a case already opened) is dropped
  for (const c of crystals) {
    if (c.flash > 0) c.flash -= dt;
    if (c.grow < 1) c.grow = Math.min(1, c.grow + dt * 1.5);
  }
  for (const c of GS.clouds) {
    c.x += 14 * dt;
    c.y += 6 * dt;
    if (c.x > WW + 400) c.x = -400;
    if (c.y > WH + 400) c.y = -400;
  }
  if (GS.P) {
    for (const b of GS.butterflies) {
      b.t += dt;
      b.a += Math.sin(b.t * 1.3 + b.hue * 9) * dt * 2.2;
      b.x += Math.cos(b.a) * 46 * dt;
      b.y += Math.sin(b.a) * 46 * dt;
      if (d2(b.x, b.y, GS.P.x, GS.P.y) < 70 * 70) b.a = Math.atan2(b.y - GS.P.y, b.x - GS.P.x);
      if (Math.abs(b.x - GS.P.x) > 700 || Math.abs(b.y - GS.P.y) > 520) {
        b.x = GS.P.x + rand(-600, 600);
        b.y = GS.P.y + (Math.random() < 0.5 ? -480 : 480);
      }
    }
    for (const p of GS.pollen) {
      p.x += Math.sin(GS.time * 0.6 + p.ph) * 10 * dt + 8 * dt;
      p.y += Math.cos(GS.time * 0.5 + p.ph) * 8 * dt;
      if (Math.abs(p.x - cam.x - viewW / 2) > viewW * 0.7) p.x = cam.x + rand(0, viewW);
      if (Math.abs(p.y - cam.y - viewH / 2) > viewH * 0.7) p.y = cam.y + rand(0, viewH);
    }
  }
  GS.trauma = Math.max(0, GS.trauma - dt * 2);
  GS.shakeLoad = Math.max(0, GS.shakeLoad - dt * 0.6);
  GS.chroma = opt.flash ? 0 : Math.max(0, GS.chroma - dt * 0.04);
  {
    // threat: how many aware zombies are close, plus your own gunfire; rises fast, settles slowly. The band follows it.
    let th = 0;
    if (GS.state === 'play' && GS.P) {
      for (const e of GS.enemies)
        if (!e.dead && (e.aw > 0 || e.big)) {
          const d = Math.hypot(e.x - GS.P.x, e.y - GS.P.y);
          if (d < 520) th += (e.big ? 3 : e.elite ? 1.6 : 1) * (1 - d / 520);
        }
      th = th / 5 + (GS.time - NOISE.t < 1.2 ? 0.18 : 0) + (GS.P.hp < S.maxHp * 0.35 ? 0.2 : 0);
    }
    let ht = clamp(th, 0, 1);
    if (GS.state === 'play' && GS.RUN.sg && GS.RUN.sg.lull > 0) ht *= 0.45;
    /* between surges the band drops back */ if (GS.time < (MUS.floorT || 0)) ht = Math.max(ht, MUS.floor || 0);
    if (GS.evac && GS.state === 'play') ht = Math.max(ht, 0.6 + 0.4 * clamp(GS.evac.t / (GS.evac.land || 36), 0, 1));
    /* the evac builds to full tilt as the bird comes in */ /* a surge kicks the band in at once, a horde at full tilt */ MUS.heat =
      (MUS.heat || 0) + (ht - (MUS.heat || 0)) * Math.min(1, dt * (ht > (MUS.heat || 0) ? 1.6 : 0.22));
    if (AC && musLP) {
      const f = MUS.level === 'fight' ? 1800 + Math.pow(MUS.heat, 1.5) * 16000 : 18000;
      if (Math.abs(f - (MUS.lpF || 0)) > (MUS.lpF || 1) * 0.05) {
        MUS.lpF = f;
        musLP.frequency.cancelScheduledValues(AC.currentTime);
        musLP.frequency.setTargetAtTime(f, AC.currentTime, 0.3);
      }
    }
  }
  const live =
    GS.queue.length > 0 || GS.enemies.some(e => !e.dead && !(e.rout > 0) && e.type !== 'flower' && e.type !== 'egg');
  MUS.quietT = live ? 0 : (MUS.quietT || 0) + dt;
  {
    const on = GS.state !== 'menu';
    if (ambG && on !== GS.ambOn) {
      GS.ambOn = on;
      ambG.gain.setTargetAtTime(on ? 0.025 : 0, AC.currentTime, on ? 1.2 : 0.15);
    }
  } // the wind fades in once you are out there, and is gone the moment you are back at the menu
  MUS.want =
    GS.state === 'menu'
      ? 'none'
      : GS.state === 'over' || GS.state === 'won'
        ? 'menu'
        : GS.boss && !GS.boss.dead
          ? 'boss'
          : GS.bossDue && MUS.level !== 'menu'
            ? MUS.level
            : GS.evac && GS.state === 'play'
              ? 'fight'
              : GS.time < (MUS.cutT || 0) || !GS.wave
                ? 'none'
                : live || (MUS.level === 'fight' && MUS.quietT < 3 && !GS.nightDone)
                  ? 'fight'
                  : 'calm';
}
