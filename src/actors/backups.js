/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { bandaged } from '../game/routes.js';
import { GK, PEOPLE } from '../core/scale.js';
import { GS } from '../core/gs.js';
import { TAU, angDiff, d2, damp, lerp, pick, rand } from '../core/util.js';
import { TS } from '../core/settings.js';
import { ui } from '../render/gl.js';
import { viewH, viewW } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { MH, MW, TILE, WH, WW, isWall } from '../world/map.js';
import { N8, collide, flow, los, query, blockPt } from '../world/nav.js';
import { budKey, playR, playS, thr, tone } from '../audio/audio.js';
import { muzzleOf } from './player-weapons.js';
import { sfx } from '../audio/sfx.js';
import { LV, S, ammoFill, ammoTypes, cam, gd } from '../game/state.js';
import { renderMods } from '../game/upgrades.js';
import { showStreak } from '../ui/callouts.js';
import { bleed, floatText, pool } from '../render/effects.js';
import { HLOOK, blow } from '../render/draw-player.js';
import { BLOOD } from '../render/draw-enemies.js';
import { makeNoise } from '../game/noise.js';
import { TW } from '../game/districts.js';
import { radio } from '../audio/radio.js';
import { bark } from '../audio/barks.js';
GS.nightLive = false;
GS.obj = null;
GS.ev = null;
GS.evac = null;
GS.nightHit = false;
GS.nightDone = false;
GS.lightning = 0;
GS.lightT = 0;
// buddies can be hurt: contact with the dead hurts them (less than you), they patch up when it is quiet, and at zero they go down
// a downed buddy bleeds out in 12 s unless you stand next to them for 1.5 s; bled out, they are gone and the Backup card can be offered again
const BUD_NAMES = [
  'Dale',
  'Rhonda',
  'Marcus',
  'Ellie',
  'Tomas',
  'Jess',
  'Hank',
  'Carmen',
  'Wes',
  'Priya',
  'Ray',
  'Nadia',
  'Lou',
  'Trish',
  'Bo',
  'Maria',
];
export const TRAITS = {
  // each backup brings one thing: you learn who they are by what they do
  medic: {
    name: 'Medic',
    desc: 'Patches you and the others up while close, and keeps the downed alive longer',
    gun: 'pistol',
  },
  marksman: { name: 'Marksman', desc: 'A rifle: slow, heavy shots from long range', gun: 'rifle' },
  scav: { name: 'Scavenger', desc: 'Turns up spare rounds, and a medkit when you are hurt', gun: 'pistol' },
  cop: { name: 'Ex-cop', desc: 'A shotgun that knocks them flat, and a thicker skin', gun: 'shotgun' },
};
export function rollBud() {
  const free = Object.keys(TRAITS).filter(t => !GS.buddies.some(b => b.tr === t)),
    used = ['Dr. Hale'].concat(
      GS.buddies.map(b => b.nm),
      GS.RUN.lost || [],
      (GS.RUN.aboard || []).map(b => b.nm)
    );
  return {
    nm: pick(BUD_NAMES.filter(n => !used.includes(n))) || pick(BUD_NAMES),
    tr: pick(free.length ? free : Object.keys(TRAITS)),
  };
}
export const budMax = b => (100 + 12 * Math.max(1, GS.wave)) * (b.tr === 'cop' ? 1.4 : 1);
export function budSetup(b, r) {
  b.nm = r.nm;
  b.tr = r.tr;
  b.gun = TRAITS[r.tr].gun;
  b.max = Math.max(b.max, budMax(b));
  b.hp = b.max;
}
export function budPerk(s, dt, pd) {
  // what the trait does, every frame the survivor is on their feet
  if (s.tr === 'medic') {
    if (pd < 180 * GK && GS.P.hp > 0 && GS.P.hp < S.maxHp) GS.P.hp = Math.min(S.maxHp, GS.P.hp + 2 * dt);
    for (const b of GS.buddies)
      if (b !== s && !(b.down > 0) && b.hp < b.max && d2(b.x, b.y, s.x, s.y) < (180 * GK) ** 2)
        b.hp = Math.min(b.max, b.hp + 3 * dt);
  }
  if (s.tr === 'scav' && GS.nightLive && !GS.nightDone && !GS.evac) {
    s.scT = (s.scT ?? 22) - dt;
    if (s.scT <= 0) {
      s.scT = 28;
      const ts = ammoTypes().sort((a, b) => ammoFill(a) - ammoFill(b));
      if (GS.P.hp < S.maxHp * 0.6 && !TW('nomeds') && Math.random() < 0.35) {
        GS.pickups.push({ k: 'hp', v: 20, x: s.x, y: s.y, vx: rand(-60, 60) * GK, vy: rand(-60, 60) * GK, t: 0 });
        floatText(s.x, s.y - 40, `${s.nm} found a medkit`, '#8ef0b8', 14);
        bark(s, 'found');
      } else if (ts.length && ammoFill(ts[0]) < 0.95) {
        GS.pickups.push({
          k: 'ammo',
          at: ts[0],
          v: 1,
          x: s.x,
          y: s.y,
          vx: rand(-60, 60) * GK,
          vy: rand(-60, 60) * GK,
          t: 0,
        });
        floatText(s.x, s.y - 40, `${s.nm} found rounds`, '#ffd08a', 14);
        bark(s, 'found');
      } else s.scT = 6;
    }
  }
}
// what each backup's gun holds and how long a reload takes. They run dry and reload like you do (a little faster
// between shots to make up for it), and top up in a quiet moment rather than walk into the next fight half empty
const BMAG = { pistol: [17, 1.3], shotgun: [8, 2.2], rifle: [10, 2.0] };
const BRLD = {
  pistol: ['magOutP', 'magInP', 'slideP'],
  shotgun: ['magOutR', 'magInR', 'rack'],
  rifle: ['magOutR', 'magInR', 'rack'],
};
// where their shots are seen to leave: their own gun's muzzle, as posed (as yours are: player-weapons.js); the
// round from in front of them on their aim line, drawn beside it, out of the muzzle
const BMZ = { muzzle: 32 * GK },
  outOf = (M, s, c, sn) => ({
    x: s.x + c * 14 * GK,
    y: s.y + sn * 14 * GK,
    sx: s.x + c * 14 * GK,
    sy: s.y + sn * 14 * GK,
    mz: Math.max(0, M.f - 14 * GK),
    h: M.h,
    lx: M.lx,
    ly: M.ly,
  });
function budReload(s, rt, loud) {
  s.rl = rt;
  const k = BRLD[s.gun] || BRLD.pistol;
  playR(k[0], 0.16, s.x, s.y, 1, 0.05);
  playR(k[1], 0.16, s.x, s.y, 1, rt * 0.55);
  playR(k[2], 0.18, s.x, s.y, 1, rt * 0.9);
  if (loud) bark(s, 'reload');
}
export function buddyShoot(s, dt, slow) {
  s.cd -= dt / (slow || 1);
  const [mag, rt] = BMAG[s.gun] || BMAG.pistol;
  if (s.mag === undefined) s.mag = mag;
  // (reloading: drawn as yours is, the hands through it, fig3d.js)
  s.reload = Math.max(0, s.rl || 0);
  s.reloadMax = rt;
  s.rk = (s.rk || 0) + ((s.rl > 0 ? 1 : 0) - (s.rk || 0)) * Math.min(1, dt * 12);
  if (s.rl > 0) {
    s.rl -= dt / (slow || 1);
    if (s.rl <= 0) s.mag = mag;
  }
  const ready = !(s.rl > 0);
  const mm = s.tr === 'marksman',
    cop = s.tr === 'cop',
    rng = (mm ? 600 : cop ? 300 : 420) * GK;
  let tgt = null,
    bd = rng * rng * (mm ? 4 : 1);
  query(s.x, s.y, rng, e => {
    if (e.dead || e.emerge < 1) return;
    let dd = d2(s.x, s.y, e.x, e.y);
    if (dd > rng * rng) return;
    if (e.lure && e.lure.alarm > 0 && dd > (200 * GK) ** 2) return; // leave the ones pounding on a car alone: that bait is yours
    if (mm) dd /= (e.elite ? 4 : 1) * (e.maxHp > 150 ? 2 : 1); // the marksman picks the big ones
    if (dd < bd && los(s.x, s.y, e.x, e.y)) {
      bd = dd;
      tgt = e;
    }
  });
  if (s.tgt && s.tgt.dead && s.tgt !== tgt) bark(s, 'kill');
  s.tgt = null;
  if (tgt) {
    const P = GS.P;
    if (
      P &&
      d2(tgt.x, tgt.y, P.x, P.y) < (120 * GK) ** 2 &&
      Math.abs(angDiff(P.aimA, Math.atan2(tgt.y - P.y, tgt.x - P.x))) > 2.2
    )
      bark(s, 'behind'); // one closing on you from behind, where you are not looking
    if (tgt.horde && GS.horde && !GS.horde.seen) {
      GS.horde.seen = true;
      bark(s, 'horde'); // the first look at the whole lot of them
    }
    if (GS.time - (s.seenT ?? -99) > 4) bark(s, tgt.elite || tgt.maxHp > 150 ? 'big' : 'contact');
    s.seenT = GS.time;
    s.tgt = tgt;
  } else if (ready && s.mag < mag * 0.6 && GS.time - (s.seenT ?? -99) > 2.5) budReload(s, rt, false);
  if (
    tgt &&
    ready &&
    (mm || cop) &&
    s.cd <= 0 &&
    Math.abs(angDiff(s.aim, Math.atan2(tgt.y - s.y, tgt.x - s.x))) < 0.12
  ) {
    const c = Math.cos(s.aim),
      sn = Math.sin(s.aim),
      M = muzzleOf(s, BMZ, c, sn);
    s.lastShotT = GS.time; // (the shot jolts their trunk, as yours: fig3d.js)
    if (mm) {
      s.cd = S.buddyCd * 2;
      GS.pbullets.push({
        ...outOf(M, s, c, sn),
        vx: c * 1500 * GK,
        vy: sn * 1500 * GK,
        life: 0.5,
        dmg: gd() * 1.6 * (s.dk || 1),
        pierce: 1,
        bounce: 0,
        hits: [],
        small: true,
      });
      GS.flashes.push({
        x: M.x + c * 2 * GK,
        y: M.y + sn * 2 * GK,
        h: M.h,
        rot: s.aim,
        life: 0.06,
        max: 0.06,
        reg: R.mf_rifle,
        fs: 0.8,
      });
      playS('rifle_m', 0.2, 1.05, 0, 0.2);
    } else {
      s.cd = S.buddyCd * 1.3;
      for (let k = 0; k < 4; k++) {
        const a = s.aim + rand(-0.16, 0.16),
          v = rand(900, 1050) * GK;
        GS.pbullets.push({
          ...outOf(M, s, c, sn),
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 0.3,
          dmg: gd() * 0.32,
          pierce: 0,
          bounce: 0,
          hits: [],
          small: true,
          kb: 2.4,
        });
      }
      GS.flashes.push({
        x: M.x + c * 2 * GK,
        y: M.y + sn * 2 * GK,
        h: M.h,
        rot: s.aim,
        life: 0.06,
        max: 0.06,
        reg: R.mf_shotgun,
        fs: 0.8,
      });
      playS('shotgun_m', 0.2, 1.05, 0, 0.2);
    }
    s.recoil = 5;
    if (thr('bnoise', 400)) makeNoise(s.x, s.y, 480, true);
    if (--s.mag <= 0) budReload(s, rt, true);
  }
  if (tgt) {
    s.aim += angDiff(s.aim, Math.atan2(tgt.y - s.y, tgt.x - s.x)) * damp(14, dt);
    // (on target first, as the marksman and the cop are: on a new one it fired down the line of the last)
    if (ready && s.cd <= 0 && !mm && !cop && Math.abs(angDiff(s.aim, Math.atan2(tgt.y - s.y, tgt.x - s.x))) < 0.15) {
      s.cd = S.buddyCd * 0.87;
      const c = Math.cos(s.aim),
        sn = Math.sin(s.aim),
        M = muzzleOf(s, BMZ, c, sn);
      s.lastShotT = GS.time;
      GS.pbullets.push({
        ...outOf(M, s, c, sn),
        vx: Math.cos(s.aim) * 1000 * GK,
        vy: Math.sin(s.aim) * 1000 * GK,
        life: 0.6,
        dmg: gd() * 0.6,
        pierce: 0,
        bounce: 0,
        hits: [],
        small: true,
      });
      s.recoil = 4;
      if (thr('bnoise', 400)) makeNoise(s.x, s.y, 480, true);
      GS.flashes.push({
        x: M.x + c * 2 * GK,
        y: M.y + sn * 2 * GK,
        h: M.h,
        rot: s.aim,
        life: 0.05,
        max: 0.05,
        reg: R.mf_pistol,
        fs: 0.8,
      });
      playS('pistol_m', 0.22, 1.05, 0, 0.2);
      if (--s.mag <= 0) budReload(s, rt, true);
    }
  }
}
// with nothing in range a survivor behaves like a person, not a turret: eyes on the way ahead while walking, with a
// glance out to the side; standing, they watch their own side of you and look about, now and then at you, and at
// night toward the dead they can hear but not yet see. Just after a fight the gun stays on the spot a moment
export function budLook(s, p, dt, spd) {
  if (GS.time - (s.seenT ?? -99) < 1.1) return;
  const alert = GS.nightLive && !GS.nightDone;
  s.gazeT = (s.gazeT ?? rand(0.3, 1.5)) - dt;
  let rate = 3;
  if (spd > 70 * GK) {
    if (s.gazeT <= 0) {
      s.gazeT = rand(0.8, 2.2);
      s.walkGl = Math.random() < (alert ? 0.35 : 0.2) ? rand(-1.1, 1.1) : 0;
    }
    s.gaze = s.moveA + (s.walkGl || 0);
    rate = Math.abs(angDiff(s.aim, s.gaze)) > 1.5 ? 12 : 7; // turned right round: a quick turn, not a slow pivot
  } else if (s.gazeT <= 0 || s.gaze === undefined) {
    s.gazeT = alert ? rand(1, 2.6) : rand(1.8, 4.5);
    const out = Math.atan2(s.y - p.y, s.x - p.x),
      r = Math.random();
    let heard = null;
    if (alert && r > 0.45) {
      let bd = (900 * GK) ** 2;
      query(s.x, s.y, 900 * GK, e => {
        const dd = d2(s.x, s.y, e.x, e.y);
        if (!e.dead && dd < bd) {
          bd = dd;
          heard = e;
        }
      });
    }
    if (heard) s.gaze = Math.atan2(heard.y - s.y, heard.x - s.x) + rand(-0.3, 0.3);
    else if (r < (alert ? 0.08 : 0.2)) s.gaze = out + Math.PI + rand(-0.25, 0.25);
    else s.gaze = out + rand(-1.1, 1.1);
  }
  s.aim += angDiff(s.aim, s.gaze) * damp(rate, dt);
}
export function buddyHurt(s, p, dt) {
  s.inv = Math.max(0, (s.inv || 0) - dt);
  s.hurt = Math.max(0, (s.hurt || 0) - dt);
  if (!(s.down > 0)) {
    let near = false,
      crowd = 0;
    if (s.inv <= 0)
      query(s.x, s.y, 120 * GK, e => {
        if (e.dead || e.emerge < 1 || !(e.dmg > 0) || (e.z || 0) > 12) return;
        const dd = d2(e.x, e.y, s.x, s.y);
        if (dd < (300 * GK) ** 2) near = true;
        if (dd < (80 * GK) ** 2) crowd++;
        if (s.inv <= 0 && dd < (e.r + s.r) ** 2) {
          s.hp -= e.dmg * (e.type === 'queen' ? 0.8 : 0.35);
          s.inv = 0.6;
          s.hurt = 0.15;
          blow(s, e.x, e.y, 12);
          bleed(s.x, s.y, 16, s.x - e.x, s.y - e.y, 5, BLOOD, 200);
          if (s.hp > 0) bark(s, 'hurt');
        }
      });
    if (crowd >= 3) bark(s, 'panic'); // three of them on top of you is no time to be calm
    if (!near && s.hp < s.max && thr('bq' + (s.id || (s.id = GS.nid++)), 250)) {
      let q = true;
      query(s.x, s.y, 300 * GK, e => {
        if (!e.dead && e.emerge >= 1 && e.dmg > 0) q = false;
      });
      if (q) s.hp = Math.min(s.max, s.hp + 1);
    } // patches up when nothing is close (about 4 a second)
    if (s.hp <= 0) {
      s.hp = 0;
      s.down = GS.buddies.some(b => b !== s && b.tr === 'medic' && !(b.down > 0)) ? 24 : 18;
      s.downMax = s.down;
      s.rev = 0;
      s.strideAmp = 0;
      bleed(s.x, s.y, 16, 0, 0, 20, BLOOD, 300, 1.2);
      pool(s.x, s.y, 1.1, BLOOD);
      sfx.grunt && sfx.grunt(s.x, s.y);
      if (Math.abs(s.x - cam.x - viewW / 2) > viewW / 2 || Math.abs(s.y - cam.y - viewH / 2) > viewH / 2)
        sfx.radio(GS.P.x, GS.P.y);
      showStreak('Man down', `${s.nm || 'Backup'} · stand next to them to get them up`);
      s.callT = 2.2; // the grunt first, then the shouting
    }
    return false;
  }
  s.down -= dt;
  const close = d2(p.x, p.y, s.x, s.y) < (70 * GK) ** 2 && p.hp > 0 && !p.ride;
  const med = GS.buddies.some(
    b => b !== s && b.tr === 'medic' && !(b.down > 0) && d2(b.x, b.y, s.x, s.y) < (200 * GK) ** 2
  );
  const bk = bandaged() ? 2 : 1; // the pharmacy's bandages (routes.js)
  s.rev = close ? s.rev + dt * bk : med ? s.rev + dt * 0.5 * bk : s.rev; // what you put in stays; a medic nearby works on them too
  if (close && thr('revtick', 400)) tone(660 + s.rev * 200, 0.05, 'sine', 0.025);
  if (!close && (s.callT = (s.callT ?? 1.2) - dt) <= 0) {
    const urg = s.down < (s.downMax || 18) * 0.35;
    s.callT = urg ? rand(2, 2.8) : rand(3.4, 4.8);
    if (!bark(s, 'down')) playR(budKey(s, 'Help'), urg ? 0.3 : 0.24, s.x, s.y, urg ? 1.05 : 1);
  } /* a downed backup shouts for help from where they lie, faster as they bleed out */
  if (s.rev >= 1) {
    s.down = 0;
    s.rev = 0;
    s.hp = s.max * 0.5;
    s.inv = 1.2;
    floatText(s.x, s.y - 40, 'Back on their feet', '#8ef0b8', 15);
    sfx.ammo();
    bark(s, 'up', 0.5);
    return false;
  }
  if (s.down <= 0) {
    // bled out
    const i = GS.buddies.indexOf(s);
    if (i >= 0) GS.buddies.splice(i, 1);
    // they lie where they fell, as they fell (drawn in 3D, as the recorded fall leaves them); the last few kept
    s.gone = true;
    s.down = 0;
    (GS.fallen = GS.fallen || []).push(s);
    if (GS.fallen.length > 6) GS.fallen.shift();
    S.buddy = Math.max(0, S.buddy - 1);
    if ((LV.buddy || 0) > 0) LV.buddy--;
    pool(s.x, s.y, 1.6, BLOOD);
    radio(
      pick([
        'We heard. Nothing you could do, nine. Keep moving.',
        'Lost one of yours? Copy. Keep the rest close.',
        'They did not make it. Eyes up, nine.',
      ])
    );
    showStreak(
      "They didn't make it",
      s.nm ? `${s.nm} the ${TRAITS[s.tr].name.toLowerCase()} is gone` : 'You lost one of your backup'
    );
    if (s.nm) (GS.RUN.lost = GS.RUN.lost || []).push(s.nm);
    GS.RUN.lostW = GS.wave; // the others say so at dawn (threads.js mournDawn)
    renderMods();
    return true;
  }
  if (Math.random() < dt * 2) bleed(s.x, s.y, 10, rand(-1, 1), rand(-1, 1), 1, BLOOD, 40);
  s.recoil = Math.max(0, (s.recoil || 0) - dt * 40 * GK);
  s.aimA = s.aim;
  s.bodyA += angDiff(s.bodyA, s.aim) * damp(6, dt);
  buddyShoot(s, dt, 2);
  return true;
}
// a buddy lost behind walls rejoins from just off screen behind you, on ground with a short walk in; failing that, close behind you
const pspdOf = p => Math.hypot(p.vx, p.vy); // standing still, a survivor steps to the nearest good spot instead of crossing round you
export function buddySlot(p, s, i, taken) {
  // the best open spot round the player for survivor i, nearest to where the formation wants it
  const pref = p.formA + Math.PI + (i - (GS.buddies.length - 1) / 2) * 0.95;
  let best = null,
    bs = 1e9;
  for (const R of [84 * GK, 64 * GK, 48 * GK])
    for (let k = 0; k < 16; k++) {
      const a = pref + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (TAU / 16),
        x = p.x + Math.cos(a) * R,
        y = p.y + Math.sin(a) * R;
      if (
        blockPt(x, y) ||
        blockPt(x + 13 * GK, y) ||
        blockPt(x - 13 * GK, y) ||
        blockPt(x, y + 13 * GK) ||
        blockPt(x, y - 13 * GK) ||
        !los(p.x, p.y, x, y)
      )
        continue;
      if (Math.abs(angDiff(p.aimA, a)) < 0.55 || taken.some(q => d2(q[0], q[1], x, y) < (44 * GK) ** 2)) continue;
      if (s.avoid && GS.time < s.avoid.t && d2(s.avoid.x, s.avoid.y, x, y) < (30 * GK) ** 2) continue;
      const sc =
        Math.abs(angDiff(pref, a)) * 40 +
        (84 * GK - R) * 0.6 +
        Math.hypot(s.x - x, s.y - y) * (pspdOf(p) > 60 * GK ? 0.15 : 0.4) +
        (los(s.x, s.y, x, y) ? 0 : 60);
      if (sc < bs) {
        bs = sc;
        best = [x, y];
      }
    } // a spot it can walk straight to is better than one round a corner
  return best;
}
export function rescueFollower() {
  return GS.obj && GS.obj.type === 'rescue' && GS.obj.state === 'follow' && !GS.obj.done && GS.obj.s && GS.obj.s.hp > 0
    ? GS.obj.s
    : null;
}
export function budTag(s, x, y) {
  if (!s.nm) return;
  ui.font = `600 ${9 * TS()}px "JetBrains Mono", monospace`;
  ui.textAlign = 'center';
  const t = s.nm.toUpperCase();
  ui.lineWidth = 3;
  ui.strokeStyle = 'rgba(20,24,29,0.85)';
  ui.strokeText(t, x, y);
  ui.fillStyle = s.down > 0 ? '#ff8a7a' : '#cfe9dc';
  ui.fillText(t, x, y);
} // whose bar it is
export function budBoard(s, dt) {
  // to the side door; aboard, they are out of the fight and fly out with you
  const e = GS.evac,
    gx = e.x - 34 * GK,
    gy = e.y + 8,
    dx = gx - s.x,
    dy = gy - s.y,
    dd = Math.hypot(dx, dy);
  if (!s.boardSaid) {
    s.boardSaid = true;
    bark(s, 'chopper');
  }
  if (dd < 26 * GK) {
    const i = GS.buddies.indexOf(s);
    if (i >= 0) GS.buddies.splice(i, 1);
    GS.RUN.aboard.push(s);
    floatText(s.x, s.y - 40, `${s.nm || 'Backup'} is aboard`, '#8ef0b8', 15);
    sfx.ammo();
    return true;
  }
  let ux = dx / dd,
    uy = dy / dd;
  if (!los(s.x, s.y, gx, gy)) {
    const cx = Math.floor(s.x / TILE),
      cy = Math.floor(s.y / TILE);
    let best = flow[cy * MW + cx],
      bx = cx,
      by = cy;
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
      const qx = (bx + 0.5) * TILE - s.x,
        qy = (by + 0.5) * TILE - s.y,
        g = Math.hypot(qx, qy) || 1;
      ux = qx / g;
      uy = qy / g;
    }
  } // round the walls by your own path: you are at the chopper
  const ox = s.x,
    oy = s.y,
    v = Math.min(280 * GK, dd * 6);
  s.x += ux * v * dt;
  s.y += uy * v * dt;
  collide(s);
  const spd = Math.hypot(s.x - ox, s.y - oy) / Math.max(dt, 1e-4);
  if (spd > 20 * GK) s.moveA += angDiff(s.moveA, Math.atan2(s.y - oy, s.x - ox)) * damp(10, dt);
  s.strideAmp = lerp(s.strideAmp, Math.min(1, spd / (250 * GK)), damp(10, dt));
  s.stride += (spd * dt) / (76 * GK);
  s.aim = s.aimA = s.moveA;
  s.bodyA += angDiff(s.bodyA, s.moveA) * damp(8, dt);
  s.recoil = Math.max(0, (s.recoil || 0) - dt * 40 * GK);
  return true;
}
// an open spot beside you, in plain sight of you and on ground that walks to you: where a survivor who joins you
// stands, never inside a barricade, a fence or a wall you happen to be next to
export function spotNear(p, r0 = 40, r1 = 90) {
  const open = (x, y) =>
    !blockPt(x, y) &&
    !blockPt(x + 14 * GK, y) &&
    !blockPt(x - 14 * GK, y) &&
    !blockPt(x, y + 14 * GK) &&
    !blockPt(x, y - 14 * GK);
  for (let k = 0; k < 40; k++) {
    const a = rand(0, TAU),
      r = rand(r0, r1 + k * 4),
      x = p.x + Math.cos(a) * r,
      y = p.y + Math.sin(a) * r;
    if (x < 2 * TILE || y < 2 * TILE || x > WW - 2 * TILE || y > WH - 2 * TILE || !open(x, y)) continue;
    if (!los(p.x, p.y, x, y)) continue;
    if (flow && flow[Math.floor(y / TILE) * MW + Math.floor(x / TILE)] === 65535) continue;
    return [x, y];
  }
  return [p.x, p.y];
}
export function regroupSpot(p, i) {
  const back = p.formA + Math.PI,
    open = (x, y) => {
      if (
        blockPt(x, y) ||
        blockPt(x + 16 * GK, y) ||
        blockPt(x - 16 * GK, y) ||
        blockPt(x, y + 16 * GK) ||
        blockPt(x, y - 16 * GK)
      )
        return false;
      let hot = false;
      query(x, y, 70 * GK, e => {
        if (!e.dead && d2(e.x, e.y, x, y) < (70 * GK) ** 2) hot = true;
      });
      return !hot;
    }; // never onto the dead
  for (let k = 0; k < 24; k++) {
    const a = back + rand(-1.1, 1.1),
      c = Math.cos(a),
      sn = Math.sin(a),
      edge = Math.min(
        Math.abs(c) > 0.01 ? viewW / 2 / Math.abs(c) : 1e9,
        Math.abs(sn) > 0.01 ? viewH / 2 / Math.abs(sn) : 1e9
      ),
      r = edge + rand(40, 110) * GK,
      x = p.x + c * r,
      y = p.y + sn * r;
    if (x < 2 * TILE || y < 2 * TILE || x > WW - 2 * TILE || y > WH - 2 * TILE || !open(x, y)) continue;
    const f = flow[Math.floor(y / TILE) * MW + Math.floor(x / TILE)];
    if (f !== 65535 && (f / 2) * TILE < r * 1.5) return [x, y];
  }
  for (let k = 0; k < 16; k++) {
    const a = back + rand(-0.8, 0.8),
      r = rand(70, 130) * GK,
      x = p.x + Math.cos(a) * r,
      y = p.y + Math.sin(a) * r;
    if (open(x, y) && los(p.x, p.y, x, y)) return [x, y];
  }
  return null;
}
// an open, reachable spot minD to maxD from you. away: also out of sight when it is chosen, so it never pops up
// on screen. A spot that would fall off the map is tried again elsewhere rather than pushed back in (which could
// land it right next to you); if no throw lands, the best open tile in range is taken from a full scan
// (minD and maxD at the old size of things: core/scale.js)
export function freeSpot(minD, maxD, away = false) {
  minD *= GK;
  maxD *= GK;
  const open = (tx, ty) => {
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (isWall(tx + i, ty + j)) return false;
      return flow[ty * MW + tx] < 65535;
    },
    seen = (x, y) =>
      Math.abs(x - cam.x - viewW / 2) < viewW / 2 + 90 * GK && Math.abs(y - cam.y - viewH / 2) < viewH / 2 + 90 * GK,
    lo = 4 * TILE;
  for (let k = 0; k < 120; k++) {
    const a = rand(0, TAU),
      d = rand(minD, maxD),
      x = GS.P.x + Math.cos(a) * d,
      y = GS.P.y + Math.sin(a) * d;
    if (x < lo || y < lo || x > WW - lo || y > WH - lo) continue;
    const tx = Math.floor(x / TILE),
      ty = Math.floor(y / TILE),
      cx = (tx + 0.5) * TILE,
      cy = (ty + 0.5) * TILE;
    if (open(tx, ty) && !(away && seen(cx, cy))) return [cx, cy];
  }
  let best = null,
    bs = -1e9;
  for (let ty = 4; ty < MH - 4; ty++)
    for (let tx = 4; tx < MW - 4; tx++) {
      const cx = (tx + 0.5) * TILE,
        cy = (ty + 0.5) * TILE,
        d = Math.hypot(cx - GS.P.x, cy - GS.P.y);
      if (!open(tx, ty)) continue;
      const sc =
        -Math.max(0, minD - d) - Math.max(0, d - maxD) - (away && seen(cx, cy) ? 2000 : 0) + Math.random() * 40;
      if (sc > bs) {
        bs = sc;
        best = [cx, cy];
      }
    }
  return best || [GS.P.x + rand(-120, 120) * GK, GS.P.y + rand(-120, 120) * GK];
}
export const NPC_TINTS = [
  [1, 1, 1],
  [0.86, 0.92, 1.06],
  [1.08, 0.96, 0.8],
  [0.82, 0.86, 0.76],
]; // faded, sun-bleached and grimy clothes so backups aren't clones
export function makeSurvivor(x, y) {
  const mh = 100 + 12 * Math.max(1, GS.wave);
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    r: 14 * PEOPLE,
    hp: mh,
    max: mh,
    moveA: 0,
    bodyA: rand(0, TAU),
    aimA: 0,
    stride: 0,
    strideAmp: 0,
    recoil: 0,
    gun: 'pistol',
    swap: 0,
    reload: 0,
    inv: 0,
    dashT: 0,
    hurt: 0,
    ant: {},
    look: pick([0, 1, 2].filter(l => l !== (HLOOK[GS.RUN.hero] || 0))),
    tint: pick(NPC_TINTS.slice(1)),
    cd: 0,
    npc: true,
  };
}
