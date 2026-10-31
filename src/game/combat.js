/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, angDiff, clamp, d2, rand, randi, pick } from '../core/util.js';
import { opt, saveMeta } from '../core/settings.js';
import { GUNS } from './arsenal.js';
import { DIFF } from '../core/profile.js';
import { R } from '../render/atlas.js';
import { MH, MW, TILE, WH, WW, cars, crystals, grid, isWall, ttype } from '../world/map.js';
import { query, solidPt } from '../world/nav.js';
import { MUS, noise, playS, spat, thr, tone } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { S, ammoNeed, dropAmmo, giveGun } from './state.js';
import { offerGuns, offerKits, offerUpgrades } from './upgrades.js';
import { KITS } from './kits.js';
import { showStreak } from '../ui/callouts.js';
import { ET, TRAIT, makeEnemy } from '../actors/enemies.js';
import {
  HUMAN,
  bleed,
  bloodOf,
  chips,
  decal,
  distort,
  dust,
  flashLight,
  floatText,
  gib,
  glowBurst,
  part,
  pool,
  ring,
  shake,
  sparks,
  splatterScreen,
} from '../render/effects.js';
import { gameOver } from '../ui/screens.js';
import { hitSign, signKnocked, toWorld } from '../actors/projectiles.js';
import { STAGGERABLE, breakLantern, interruptBoss, tankHit } from '../actors/bosses.js';
import { BILE, BLOOD, ZSKIN } from '../render/draw-enemies.js';
import { DOWN_T, lyAngle, pantsOf, supOK } from '../render/draw-bodies.js';
import { scorchWalls, wallHit } from '../world/wear.js';
import { WINDX, blastWorld } from '../world/physics.js';
import { chuteGeom } from '../render/draw-props.js';
import { isBlock } from '../render/blocks.js';
import { carAt, damageCar, firePool, fireball, flame, hitCar, ignite, smoke } from '../world/fire.js';
import { makeNoise } from './noise.js';
import { INF, TW } from './districts.js';
import { bump, checkChal, stat, statMax } from './challenges.js';
import { tip } from '../audio/radio.js';
import { finishObjective } from './objective-flow.js';
import { bossDown, bossName } from './boss-flow.js';
import { hordeBlast, hordeKilled } from './horde.js';
import { TRAP, giveTraps } from './traps.js';
import { dropCarried, sporeBurst } from '../actors/specials.js';
GS.HITB = null; // the player's bullet being resolved right now (gun family for boss armour)
const CHOKE_W = { hunter: 4, lever: 3, pistol: 1.6 }; // so every gun can choke Patient Zero in a 1.3 s inhale
const BOSS_DEF = {
  // grounded counters: what the armour is, what gets through it
  abom: { front: 0.55, back: 1.6, fire: 1.5, crack: 160 }, // chitin plates in front; buckshot up close cracks them; soft belly behind; it burns
  roadkill: { front: 0.5, back: 1.6, ap: 0.75 }, // the STOP sign stops pistol rounds and buckshot; rifle rounds punch through it
  grave: { front: 0.6, back: 1.4 }, // the spade held across the body guards the front: get round to the lantern side or behind
  chief: { front: 0.45, back: 1.6, rifle: 0.8, buck: 0.35, torn: 0.75 }, // turnout gear in front; rifles cut through better; the air tank behind
  pz: { front: 1, back: 1.3, inhale: 1.5 }, // nothing to stop a bullet: hit it hardest while it breathes in
};
function bossDefense(e, dmg, src, hx, hy) {
  // returns { dmg, armor, crit }
  const D = BOSS_DEF[e.btype] || BOSS_DEF.abom,
    bt = e.btype,
    b = GS.HITB,
    fam = b ? b.fam : null,
    gun = !(
      src === 'boom' ||
      src === 'pulse' ||
      src === 'crystal' ||
      src === 'fire' ||
      src === 'arc' ||
      src === 'frag' ||
      src === 'shell'
    );
  if (src === 'shell') dmg *= 0.6; // big as it is, a 40 mm round only scorches a boss
  const df = Math.abs(angDiff(e.a, Math.atan2(hy - e.y, hx - e.x))),
    back = df > 1.75,
    front = df < 1.0,
    open = e.recT > 0 || e.stunT > 0 || e.st === 'roar';
  let armor = false,
    crit = false,
    tag = null;
  if (src === 'fire' && D.fire) dmg *= D.fire;
  if (src === 'fire' && bt === 'grave' && !e.lant) {
    dmg *= 2;
    tag = tag || ['Oil-soaked', '#ffb070'];
  } // the lantern oil on its coat
  if (open) {
    dmg *= 1.3;
    if (gun && back) {
      dmg *= 1.5;
      crit = true;
      tag = ['Weak spot', '#ffcf3a'];
      if (thr('bkhit', 90)) {
        const sb = spat(hx, hy);
        tone(95, 0.12, 'sine', 0.07, 0.55, 0, 0, sb);
        noise(0.07, 0.07, 700, 200, 'lowpass', 0, sb);
      }
    } // a heavier, wetter hit you can hear
    if (e.stunT > 0 && bt === 'roadkill') dmg *= 1.15;
  } // an opening: armour is down, and its back is wide open
  else if (gun) {
    let fr = D.front;
    if (bt === 'chief' && e.tankGone) fr = D.torn;
    if (bt === 'roadkill' && !e.sign) fr = 1;
    if (bt === 'abom' && fam === 'shotgun' && GS.P && d2(GS.P.x, GS.P.y, e.x, e.y) < (D.crack + e.r) ** 2) {
      fr = 0.9;
      if (front) tag = ['Plates crack', '#ffd08a'];
    }
    if (
      (bt === 'roadkill' && e.sign && b && b.ap) ||
      (bt === 'roadkill' && e.sign && b && (b.gun === 'hunter' || b.gun === 'lever'))
    ) {
      fr = D.ap;
      if (front) tag = ['Through the sign', '#ffd08a'];
    }
    if (bt === 'chief' && fam === 'shotgun') fr = Math.min(fr, D.buck); // buckshot just bounces off the turnout coat
    if (bt === 'chief' && fam === 'rifle') {
      fr = Math.max(fr, D.rifle);
      if (front) tag = ['Cuts the gear', '#ffd08a'];
    }
    if (front && fr < 1 && bt === 'roadkill' && e.sign) {
      e.signWear = (e.signWear || 0) + dmg * (1 - fr);
      if (e.signWear > e.maxHp * 0.06) {
        e.signWear = 0;
        signKnocked(e);
      }
    } // enough rounds into the sign and it is torn out of its hands
    if (front && fr < 1) {
      dmg *= fr;
      armor = fr < 0.7;
      if (armor) tag = bt === 'grave' ? ['Spade blocks', '#9aa4ae'] : ['Armoured', '#9aa4ae'];
    } else if (back) {
      dmg *= D.back;
      crit = true;
      tag = ['Weak spot', '#ffcf3a'];
    }
  }
  if (bt === 'pz' && e.st === 'inhale' && gun) {
    dmg *= D.inhale;
    crit = true;
    tag = ['Weak spot', '#ffcf3a'];
  }
  if (bt === 'chief' && !e.tankGone && gun && back) {
    dmg *= 1.25;
    tankHit(e, dmg, hx, hy);
  } // the air pack on its back
  if (tag && (b || src === 'fire') && thr('btag' + tag[0], tag[0] === 'Armoured' ? 2600 : 1600)) {
    floatText(e.x, e.y - (e.z || 0) - e.r - 34, tag[0], tag[1], 15);
    GS.texts[GS.texts.length - 1].nf = true;
    GS.texts[GS.texts.length - 1].life = 1.1;
  } // tells you what is working (above the boss, never faded by the cursor)
  return { dmg, armor, crit };
}
export const SHIELD_TURN = 2.1; // how fast a riot cop can swing its shield round to you (rad/s): circle faster than that and you are behind it
export function makeLurker(x, y) {
  // a body in the road that isn't dead: it lies among the others and waits for your feet
  const e = makeEnemy('skitter', x, y);
  e.lurk = 'lie';
  e.emerge = 1;
  e.run = false;
  e.dT = DOWN_T;
  e.down = e.dT - 0.9;
  e.fallA = rand(0, TAU);
  e.sup = supOK(e) && Math.random() < 0.6;
  e.splay = rand(0.2, 1);
  e.apose = randi(0, 3);
  e.lyG = 1;
  e.hp *= 1.3;
  e.maxHp = e.hp;
  e.aw = 0;
  return e;
}
export function releaseGrab(push = 1) {
  const e = GS.P && GS.P.held;
  if (!GS.P) return;
  GS.P.held = null;
  if (e && !e.dead) {
    e.lurk = null;
    e.aw = 9;
    e.down = Math.min(e.down, e.dT - 0.95);
    const dx = e.x - GS.P.x,
      dy = e.y - GS.P.y,
      dl = Math.hypot(dx, dy) || 1;
    e.kx += (dx / dl) * 160 * push;
    e.ky += (dy / dl) * 160 * push;
  }
}
export const SIGHT = () => (GS.ev === 'fog' ? 330 : GS.ev === 'blackout' ? 420 : 640); // how far the dead can see you: fog and a dead grid hide you, so you can slip past or pick your moment
export function shieldUp(e) {
  return e.shield && !(e.stag > 0) && !(e.down > 0) && e.st !== 'bash';
}
export function makeShield(e) {
  e.v = e.hv = 3;
  e.run = false;
  e.pose = 0;
  e.limp = 0;
  e.shield = { hp: (230 * e.maxHp) / ET.skitter.hp / DIFF().hp, max: 0 };
  e.shield.max = e.shield.hp;
  e.hp *= 1.6;
  e.maxHp = e.hp;
  e.sp *= 0.82;
  return e;
}
function breakShield(e, kx, ky) {
  const sh = e.shield;
  if (!sh) return;
  e.shield = null;
  const [sx, sy] = toWorld(e, 26, 0);
  sfx.crunch(sx, sy);
  chips(sx, sy, 14, [0.55, 0.6, 0.65], 3, 300);
  sparks(sx, sy, [1, 0.9, 0.7], 10, 300);
  const kl = Math.hypot(kx, ky) || 1;
  decal(R.riotflat, sx + (kx / kl) * 30, sy + (ky / kl) * 30, 0.62, [1, 1, 1, 1], [0, 0, 0], 60);
  e.stag = Math.max(e.stag || 0, 0.6);
  if (thr('shieldDown', 900)) floatText(e.x, e.y - 40, 'Shield broken', '#ffd08a', 15);
}
// a round in the leg: it limps from now on, slower (a runner is down to a hobble), and leaves a trail of blood
function legWound(e, slow) {
  if (e.legW) return;
  e.legW = true;
  e.limp = 1;
  if (e.run) e.run = false;
  e.sp *= slow;
  e.drip = 6;
  e.stag = Math.max(e.stag || 0, 0.45);
}
export function hurtEnemy(e, dmg, crit, kx, ky, kb = 1, src = 'bolt', hx, hy) {
  if (e.dead) return;
  if (hx === undefined || hy === undefined) {
    const kl = Math.hypot(kx, ky) || 1;
    hx = e.x - (kx / kl) * (e.r || 14);
    hy = e.y - (ky / kl) * (e.r || 14);
  } // no hit point given: it came from the side the push came from, never 'due east'
  if (e.type === 'flower' && e.st === 'closed') dmg *= 0.45;
  if (e.type === 'beetle' && e.st === 'stun') dmg *= 2;
  if (e.fireproof && src === 'fire') dmg *= 0.15; // turnout gear
  if (e.trait === 'armored') {
    kb *= 0.25;
    if (src === 'bolt' || src === 'buddy') {
      dmg *= GS.HITB && (GS.HITB.ap || GS.HITB.heavy) ? 0.88 : 0.7;
      if (GS.HITB) {
        GS.HITB.pierce = 0;
        GS.HITB.bounce = 0;
      }
      if (thr('armTing', 90)) {
        sparks(e.x, e.y - 20, [1, 0.9, 0.7], 2, 200);
        sfx.tink(e.x, e.y);
      }
    }
  }
  if (e.shield) {
    // a riot cop: rounds from in front stop in the shield; blasts and fire go round it; a flashbang or a fall drops it
    if (
      shieldUp(e) &&
      (src === 'bolt' || src === 'buddy' || src === 'frag') &&
      Math.abs(angDiff(e.a, Math.atan2(-ky, -kx))) < 1.2
    ) {
      e.shield.hp -= dmg * (GS.HITB && GS.HITB.heavy ? 2 : GS.HITB && GS.HITB.ap ? 1.5 : src === 'frag' ? 0.5 : 1);
      if (GS.HITB) {
        GS.HITB.pierce = 0;
        GS.HITB.bounce = 0;
      }
      const [sx, sy] = toWorld(e, 26, 0);
      sparks(sx, sy, [1, 0.92, 0.7], 3, 240);
      if (thr('shieldTing', 70)) playS('dry', 0.12, 2.2 + rand(0, 0.4), 0, 0.1);
      e.aw = Math.max(e.aw || 0, 8);
      const kl = Math.hypot(kx, ky) || 1;
      e.kx += (kx / kl) * 30 * kb;
      e.ky += (ky / kl) * 30 * kb;
      e.wob = 0.4;
      if (!(GS.meta.tips && GS.meta.tips.shield)) {
        GS.meta.tips = GS.meta.tips || {};
        GS.meta.tips.shield = 1;
        saveMeta();
        showStreak('Riot shield', 'Get round it, blow it up, or flash it');
      }
      if (e.shield.hp <= 0) breakShield(e, kx, ky);
      return;
    }
    if (src === 'boom' || src === 'shell') {
      e.shield.hp -= dmg * 0.6;
      if (e.shield.hp <= 0) breakShield(e, kx, ky);
    }
  }
  let armor = false;
  if (e.type === 'queen') {
    const r = bossDefense(e, dmg, src, hx, hy);
    dmg = r.dmg;
    armor = r.armor;
    if (r.crit) crit = true;
  } // each boss has its own armour and its own weakness (BOSS_DEF)
  if (e.type === 'queen' && e.btype === 'pz' && e.st === 'inhale') {
    e.inhDmg =
      (e.inhDmg || 0) +
      (src === 'bolt'
        ? GS.HITB && GS.HITB.fam === 'shotgun'
          ? 0.6
          : CHOKE_W[GS.HITB && GS.HITB.gun] || 1
        : src === 'shell'
          ? 4
          : src === 'boom'
            ? 3
            : src === 'buddy'
              ? 0.5
              : 0);
    if (e.inhDmg >= 8) {
      // eight good hits while it breathes in choke it
      interruptBoss(e);
      e.st = 'move';
      e.stunT = Math.max(e.stunT || 0, 2);
      e.busyT = Math.max(e.busyT || 0, 2.4);
      sfx.grunt(e.x, e.y, true);
      showStreak('Choked', 'You cut the scream short');
    }
  } // shoot it while it breathes in and it chokes
  if (e.type === 'queen' && e.btype === 'grave' && e.lant && (src === 'bolt' || src === 'buddy')) {
    const [lx, ly] = toWorld(e, -4, -39, e.sc || 1),
      la = Math.atan2(ly - e.y, lx - e.x),
      ha = Math.atan2(hy - e.y, hx - e.x);
    if (Math.abs(angDiff(la, ha)) < 0.5) {
      e.lantHits = (e.lantHits || 0) + dmg / 28; // damage-based: a heavy round smashes it, buckshot chips at it
      sparks(lx, ly, [1, 0.8, 0.4], 4, 160);
      if (thr('lanttink', 70)) tone(rand(2600, 3200), 0.06, 'sine', 0.02, 0.98);
      if (e.lantHits >= 6) breakLantern(e);
    }
  } // the lantern at its hip
  if (e.type === 'queen') {
    const kl = Math.hypot(kx, ky) || 1;
    e.rcx = clamp((e.rcx || 0) + (kx / kl) * 2.5, -7, 7);
    e.rcy = clamp((e.rcy || 0) + (ky / kl) * 2.5, -7, 7); // a hit rocks the body back
    e.stg = (e.stg || 0) + dmg;
    if (e.stg > e.maxHp * 0.05 && GS.time > (e.stgCd || 0) && !(e.stunT > 0) && !(e.spinT > 0) && STAGGERABLE[e.st]) {
      e.stg = 0;
      e.stgCd = GS.time + 8;
      interruptBoss(e);
      e.st = 'move';
      e.stunT = Math.max(e.stunT || 0, 0.8);
      e.busyT = Math.max(e.busyT || 0, 1.2);
      sfx.grunt(e.x, e.y, true);
      showStreak('Staggered', 'Pour it on');
    }
  }
  if (
    S.ambush &&
    e.type !== 'queen' &&
    !e.big &&
    src === 'bolt' &&
    !(GS.HITB && GS.HITB.noAmb) &&
    (!(e.aw > 0) || GS.time - (e.wokeT ?? -9) < 0.4 || (e.dazedT || 0) > GS.time || e.down > 0 || e.stunT > 0)
  ) {
    dmg *= 1.8;
    if (thr('ambush', 400)) floatText(hx, hy - 24, 'Ambush', '#ffd08a', 14);
  } // caught before it turned: a gunshot takes a moment to register
  if (GS.RUN && GS.RUN.metrics && GS.state === 'play')
    GS.RUN.metrics.damageDealt += Math.min(Math.max(0, e.hp), Math.max(0, dmg));
  if (e.type !== 'queen' && e.type !== 'egg') {
    const fl2 = Math.hypot(kx, ky) || 1;
    e.flT = 0.16;
    e.fdx = kx / fl2;
    e.fdy = ky / fl2;
    e.flS = Math.random() < 0.5 ? -1 : 1;
  } // the body snaps away from the hit
  e.hp -= dmg;
  e.flash = 0.08;
  e.squash = 0.18;
  e.wob = 1;
  e.aw = Math.max(e.aw || 0, 8);
  e.lure = null;
  if (src !== 'fire' && HUMAN[e.type] && e.type !== 'mini') {
    if (
      e.type === 'skitter' &&
      !e.crawl &&
      !e.run &&
      e.hp > 0 &&
      e.hp < e.maxHp * 0.7 &&
      Math.random() < (src === 'boom' ? 0.45 : clamp((dmg - 10) / 60, 0.03, 0.35) + (e.hp < e.maxHp * 0.55 ? 0.12 : 0))
    ) {
      // blasts and heavy rounds take legs: the walker keeps coming on its hands
      e.crawl = true;
      e.sup = false;
      e.down = 0;
      e.fallA = e.a;
      e.lyG = 0;
      e.cfall = 0.32;
      const a = e.a + Math.PI;
      gib(
        e.x + Math.cos(a) * 18,
        e.y + Math.sin(a) * 18,
        R.g_leg,
        pantsOf(e) || ZSKIN[e.sk || 0],
        bloodOf(e),
        160,
        Math.cos(a),
        Math.sin(a)
      );
      bleed(e.x, e.y, 14, Math.cos(a), Math.sin(a), 8, bloodOf(e), 200);
      sfx.gib(e.x, e.y);
    } else if (
      e.type === 'skitter' &&
      e.run &&
      !e.crawl &&
      !(e.down > 0) &&
      e.hp > 0 &&
      e.vx * e.vx + e.vy * e.vy > 120 * 120 &&
      dmg >= e.maxHp * 0.2 &&
      Math.random() < 0.5
    ) {
      // shot mid-stride, a runner's legs go out from under it: it pitches forward onto its face and skids on
      const va = Math.atan2(e.vy, e.vx);
      e.dT = DOWN_T * rand(1.05, 1.4);
      e.down = e.dT;
      e.fallA = lyAngle(e.x, e.y, va + rand(-0.3, 0.3), 100);
      e.sup = false;
      e.splay = rand(0.5, 1);
      e.apose = randi(0, 3);
      e.lyG = 0;
      e.kx += e.vx * 0.7;
      e.ky += e.vy * 0.7;
      kb *= 0.3; // its own speed carries it, not the round
      if (e.trait !== 'runner' && Math.random() < 0.5) legWound(e, 0.4);
    } else if (
      !e.crawl &&
      !(e.down > 0) &&
      e.hp > 0 &&
      e.type !== 'beetle' &&
      e.type !== 'egg' &&
      (kb >= 2.3 || dmg >= e.maxHp * 0.4) &&
      Math.random() < 0.55
    ) {
      e.dT = DOWN_T * rand(0.92, 1.3);
      e.down = e.dT;
      e.fallA = lyAngle(e.x, e.y, Math.atan2(ky, kx) + rand(-0.4, 0.4), 100);
      e.sup = supOK(e) && Math.random() < 0.75; // knocked back away from you: mostly onto its back, face up, so it sits up and gets up already facing you; now and then it twists and lands face down
      e.splay = rand(0.2, 1);
      e.apose = randi(0, 3);
      e.lyG = 0;
    } else {
      const hk = clamp(dmg / e.maxHp, 0, 1);
      e.stag = e.type === 'beetle' ? (dmg > e.maxHp * 0.12 ? 0.25 : 0) : 0.12 + hk * 0.5;
      if (e.type !== 'beetle' && hk > 0.22 && Math.random() < 0.3) {
        e.stag = 0.5;
        const sa = Math.atan2(ky, kx) + (Math.random() < 0.5 ? 1.4 : -1.4);
        e.kx += Math.cos(sa) * 70;
        e.ky += Math.sin(sa) * 70;
      }
      if (
        e.type === 'skitter' &&
        !e.legW &&
        !e.crawl &&
        e.trait !== 'runner' &&
        e.hp > 0 &&
        Math.random() < clamp((dmg / e.maxHp) * 0.45, 0, 0.3)
      )
        legWound(e, e.run ? 0.42 : 0.8);
    } // heavier rounds rock them longer; a hard hit can send one stumbling sideways; one in the leg leaves it limping
    {
      const kl0 = Math.hypot(kx, ky) || 1,
        tq = ((hx - e.x) * ky - (hy - e.y) * kx) / kl0;
      if (e.type !== 'beetle' && Math.abs(tq) > 2)
        e.a += clamp((tq / (e.r || 14)) * Math.min(1, dmg / (e.maxHp * 0.25)) * 0.55, -0.6, 0.6);
    } // a hit off-centre twists the body round
    e.wounds = e.wounds || [];
    if (e.wounds.length < 3 && Math.random() < 0.3) {
      const c0 = Math.cos(e.a),
        s0 = Math.sin(e.a),
        dx = hx - e.x,
        dy = hy - e.y;
      e.wounds.push({
        x: clamp((dx * c0 + dy * s0) * 0.5, -6, 6),
        y: clamp(-dx * s0 + dy * c0, -10, 10),
        r: rand(0, TAU),
      });
    }
  }
  const kl = Math.hypot(kx, ky) || 1,
    mass =
      e.type === 'egg'
        ? 0
        : e.type === 'queen'
          ? 0.03
          : e.type === 'beetle'
            ? 0.25
            : e.type === 'hopper'
              ? 0.4
              : e.type === 'flower'
                ? 0.5
                : 1;
  e.kx += (kx / kl) * 170 * kb * mass;
  e.ky += (ky / kl) * 170 * kb * mass;
  if (opt.dmgNums && src !== 'fire' && (crit || dmg >= 60)) {
    const tt = GS.texts.find(t => t.eid === e.id && t.life > 0.35);
    if (tt) {
      tt.dv += dmg;
      tt.txt = Math.round(tt.dv);
      tt.life = 0.7;
      if (crit) {
        tt.col = '#ffcf3a';
        tt.size = 22;
      }
    } else {
      floatText(
        hx + rand(-6, 6),
        hy - e.r - 4 - e.z,
        Math.round(dmg),
        src === 'fire' ? '#ffa860' : armor ? '#9aa4ae' : crit ? '#ffcf3a' : '#ffffff',
        src === 'fire' ? 12 : armor ? 13 : crit ? 22 : 15
      );
      const t = GS.texts[GS.texts.length - 1];
      t.eid = e.id;
      t.dv = dmg;
    }
  } // hits landing together add up in one number instead of a pile
  crit ? sfx.crit() : sfx.hit();
  const col = bloodOf(e);
  if (armor) {
    if (e.type === 'queen') sfx.bossArmor(hx, hy, e.btype);
    sparks(hx, hy - 10, [1, 0.8, 0.5], 3, 240, Math.atan2(-ky, -kx), 0.9);
    bleed(hx, hy, 16, -kx, -ky, 1, col, 120);
  } else {
    bleed(hx, hy, 14 + e.z, kx, ky, crit ? 6 : 3, col, 300);
    bleed(hx, hy, 14 + e.z, -kx, -ky, 1, col, 110);
    sfx.squelch();
    if (dmg > 12 && Math.random() < 0.3) gib(hx, hy, R['g_meat' + randi(0, 1)], [1, 1, 1], col, 180, kx / kl, ky / kl);
    if (
      HUMAN[e.type] &&
      e.type !== 'mini' &&
      e.hp > 0 &&
      e.hp < e.maxHp * 0.8 &&
      Math.random() < clamp((dmg - 6) / 45, 0.05, 0.6) * (crit ? 1.6 : 1)
    ) {
      const ly = -(hx - e.x) * Math.sin(e.a) + (hy - e.y) * Math.cos(e.a),
        i = Math.abs(ly) < 3 ? (Math.random() < 0.5 ? 0 : 1) : ly > 0 ? 1 : 0; // the arm on the side the round hit
      if (!e.lost[i]) {
        e.lost[i] = true;
        const [ax, ay] = toWorld(e, 2, (i ? 1 : -1) * 13);
        gib(ax, ay, R.g_arm, ZSKIN[e.sk || 0], col, 220, kx / kl, ky / kl);
        bleed(ax, ay, 18, kx, ky, 8, col, 260);
        pool(ax, ay, 0.3, col);
      }
    }
  }
  if (src === 'bolt' && S.arc && Math.random() < (S.evo.tempest ? 1 : 0.08 + S.arc * 0.06)) {
    ignite(e, S.evo.tempest ? 5 : 2.5);
    if (Math.random() < 0.4) flame(hx, hy, 2, 4, 0.8);
  }
  if (e.hp <= 0) killEnemy(e, dmg, src, kx / kl, ky / kl, crit);
}
function gibAll(e, dx, dy, col) {
  const ex = e.x,
    ey = e.y,
    big = e.type === 'beetle' ? 1.6 : 1,
    sp = 280 * big;
  if (HUMAN[e.type]) {
    if (!e.headless) gib(ex, ey, R.g_head, [1, 1, 1], col, sp, dx, dy);
    for (let i = 0; i < 2; i++) if (!e.lost || !e.lost[i]) gib(ex, ey, R.g_arm, [1, 1, 1], col, sp, dx, dy, 0.85);
    if (e.type !== 'mini') {
      const pc = pantsOf(e) || [0.24, 0.27, 0.34];
      for (let i = 0; i < 2; i++) gib(ex, ey, R.g_leg, pc, col, sp, dx, dy, 0.85);
    }
  }
  const nm = Math.round((opt.gore ? 5 : 3) * big);
  for (let i = 0; i < nm; i++) gib(ex, ey, R['g_meat' + randi(0, 1)], [1, 1, 1], col, sp, dx, dy);
  for (let i = 0; i < (opt.gore ? 3 : 1); i++) gib(ex, ey, R.g_bone, [1, 1, 1], col, sp, dx, dy);
  bleed(ex, ey, 18, dx, dy, 26 * big, col, 380, 1.2);
  pool(ex, ey, Math.min(2.2, (e.r / 13) * rand(1, 1.3)), col);
  pool(ex + dx * 30, ey + dy * 30, Math.min(1.4, e.r / 18), col);
  sfx.gib(ex, ey);
}
export function killEnemy(e, dmg = 0, src = '', dx = 0, dy = 0, crit = false) {
  if (GS.P && opt.gore && e.type !== 'queen' && d2(e.x, e.y, GS.P.x, GS.P.y) < 70 * 70) {
    GS.P.stains = GS.P.stains || [];
    for (let i = 0; i < (src === 'boom' ? 3 : 1); i++) {
      GS.P.stains.push({ u: rand(4, 10), v: rand(-11, 11), r: rand(0, TAU), s: rand(0.35, 0.75), c: 0.5, a: 0.85 });
      if (GS.P.stains.length > 22) GS.P.stains.shift();
    }
  } // close kills spatter you
  if (GS.P && GS.P.held === e) GS.P.held = null;
  if (e.shield) {
    const [sx, sy] = toWorld(e, 26, 0);
    decal(R.riotflat, sx, sy, 0.62, [1, 1, 1, 1], [0, 0, 0], 60);
    e.shield = null;
  } // the shield goes down with it
  e.dead = true;
  e.dying = 0;
  e.dieDir = Math.random() < 0.5 ? -1 : 1;
  GS.kills++;
  hordeKilled(e, src);
  if (e.kind === 'spore') sporeBurst(e);
  else if (e.kind === 'drag') dropCarried(e);
  GS.combo++;
  GS.comboT = 2.4;
  if (GS.RUN && GS.RUN.metrics) GS.RUN.metrics.peakCombo = Math.max(GS.RUN.metrics.peakCombo, GS.combo);
  bump('kills');
  statMax('bestChain', GS.combo);
  if (src === 'bolt' && GS.P && GS.P.gun) bump(GUNS[GS.P.gun].fam);
  if (src === 'fire') bump('fire');
  if (e.type === 'queen') {
    bump('bosses');
    MUS.win = true;
  }
  if (stat('kills') % 50 === 0) checkChal();
  const STREAKS = { 20: 'Killing spree', 40: 'Rampage', 75: 'Butcher', 120: 'Corpse collector', 200: 'Massacre' };
  if (STREAKS[GS.combo]) {
    showStreak(STREAKS[GS.combo], `${GS.combo} chain`);
    sfx.streak();
  }
  if (e.mark && GS.obj && GS.obj.type === 'hunt' && !GS.obj.done) {
    GS.obj.got++;
    floatText(e.x, e.y - 50, `Marked ${GS.obj.got} / ${GS.obj.need}`, '#ff9a7a', 18);
    if (GS.obj.got >= GS.obj.need) {
      const o = GS.obj;
      GS.later.push({
        t: 0.6,
        fn: () => {
          if (GS.obj === o && GS.state === 'play') finishObjective(true);
        },
      });
    }
  }
  if (e.elite) {
    GS.runSeeds += 15;
    GS.slowmo = Math.max(GS.slowmo, 0.25);
    showStreak('Elite down', e.trait ? `${TRAIT[e.trait].name} · +15 scrap` : '+15 scrap');
    sfx.elite();
    GS.xp += 9;
    if (ammoNeed() > 0.6) dropAmmo(e.x, e.y, 1.5, 80);
    if (!TW('nomeds') && (!INF(4) || Math.random() < 0.5) && GS.P && GS.P.hp < S.maxHp * 0.9)
      GS.pickups.push({ k: 'hp', v: 25, x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-60, 60), t: 0 });
    glowBurst(e.x, e.y, [1, 0.85, 0.3], 30, 320, 0.8, 0.7);
  }
  const mult = 1 + Math.min(4, Math.floor(GS.combo / 10) * 0.5);
  GS.score += Math.round(e.score * mult * (1 + GS.wave * 0.1));
  if (S.leech) GS.P.hp = Math.min(S.maxHp, GS.P.hp + S.leech);
  const big = e.type === 'queen',
    ex = e.x,
    ey = e.y - e.z,
    col = bloodOf(e);
  if (!dx && !dy) {
    const a = Math.atan2(e.y - GS.P.y, e.x - GS.P.x);
    dx = Math.cos(a);
    dy = Math.sin(a);
  }
  if (e.type === 'egg') {
    e.keep = 0;
    e.dying = 99;
    bleed(ex, ey, 18, dx, dy, 16, col, 260, 1.1);
    pool(e.x, e.y, 0.9, col, 40);
    decal(R.ab_egg, e.x, e.y, 1.35, [0.42, 0.46, 0.3, 0.85], [0, 0, 0], 120);
    for (let i = 0; i < 6; i++)
      part({
        k: 2,
        x: e.x + rand(-8, 8),
        y: e.y + rand(-8, 8),
        vx: rand(-40, 40),
        vy: rand(-40, 40),
        life: rand(0.5, 0.9),
        max: 0.9,
        size: rand(0.5, 0.8),
        grow: 1.4,
        drag: 2.5,
        rot: rand(0, TAU),
        vr: rand(-1, 1),
        c: [0.45, 0.55, 0.2],
      });
    sfx.wet(e.x, e.y);
    GS.xp += e.xp;
    return;
  } // a sac bursts where it sits: no tumbling body, just the split membrane and the bile
  const overkill =
    !big &&
    (e.type === 'hopper' ||
      (src !== 'boom' && dmg > e.maxHp * 0.75) ||
      (src === 'boom' && e.r < 26 && Math.random() < 0.4) ||
      (src === 'crystal' && Math.random() < 0.5));
  let fallK = 0;
  if (overkill) gibAll(e, dx, dy, col);
  else {
    e.keep = e.horde ? 80 : big ? 14 : 11; // a horde's dead lie where they fell: the street fills with them
    e.tilt = rand(-0.4, 0.4);
    if ((e.down > 0 || e.crawl || e.half) && (e.lyG || 0) > 0.5) {
      e.dying = 0.45;
      e.lyG = 1;
      if (e.crawl || e.half) {
        e.fallA = e.a;
        e.apose = 0;
      }
    } else {
      const spd = Math.hypot(e.vx || 0, e.vy || 0),
        towards = spd > 110 && ((e.vx || 0) * dx + (e.vy || 0) * dy) / spd < 0.3;
      fallK =
        e.type !== 'skitter' || src === 'boom'
          ? 0
          : towards && Math.random() < 0.7
            ? 2
            : (crit || dmg < e.maxHp * 0.35) && Math.random() < 0.45
              ? 1
              : 0;
      e.fallA = lyAngle(
        e.x,
        e.y,
        fallK === 2
          ? Math.atan2(e.vy, e.vx) + rand(-0.3, 0.3)
          : fallK === 1
            ? e.a + rand(-1.3, 1.3)
            : Math.atan2(dy, dx) + rand(-0.4, 0.4),
        100 * (e.type === 'beetle' ? 1.9 : 1)
      ); // three ways down: thrown back by the round; folding where it stands (a head shot, or a last light hit), forward or to a side; or, killed mid-charge, carried on by its own speed onto its face
      e.splay = rand(0.2, 1);
      e.apose = randi(0, 3);
      e.lyG = 0;
      e.sup = fallK === 2 ? false : fallK === 1 ? supOK(e) && Math.random() < 0.3 : supOK(e) && Math.random() < 0.65;
    }
    if (e.crawl || e.half) e.sup = false;
    e.down = 0; // a body already on the ground just stays there
    {
      const ul = Math.hypot(dx, dy) || 1,
        ux = dx / ul,
        uy = dy / ul,
        imp =
          (src === 'boom' ? 440 : 100 + Math.min(300, dmg * 3.2)) *
          rand(0.8, 1.2) *
          (e.type === 'beetle' ? 0.35 : big ? 0 : 1) *
          (fallK ? 0.25 : 1),
        carry = fallK === 2 ? 0.95 : 0.3;
      e.rvx = ux * imp + (e.vx || 0) * carry;
      e.rvy = uy * imp + (e.vy || 0) * carry;
      e.rw = (rand(-1, 1) * imp) / 90;
      e.limbs = null;
      e.lr = null;
      e.kx = e.ky = 0;
      e.vz = src === 'boom' || imp > 330 ? imp * 0.45 : 0;
    }
    GS.corpses.push(e);
    if (GS.corpses.length > (GS.horde && !GS.horde.done ? 240 : 90)) GS.corpses.shift();
    if (!big) sfx.fall(e.x, e.y);
    if (HUMAN[e.type] && e.type !== 'mini' && crit && Math.random() < 0.55) {
      e.headless = true;
      bump('heads');
      const [hx, hy] = toWorld(e, 4, 0);
      gib(hx, hy, R.g_head, [1, 1, 1], col, 240, dx, dy);
      bleed(hx, hy, 24, dx, dy, 14, col, 300);
      sfx.gib(hx, hy);
    }
    bleed(ex, ey, 14, dx, dy, big ? 40 : 10, col, big ? 420 : 300, big ? 1.6 : 1);
    if (Math.random() < 0.25) gib(ex, ey, R['g_meat' + randi(0, 1)], [1, 1, 1], col, 200, dx, dy);
    if (big)
      GS.later.push({
        t: 0.5,
        fn: () =>
          pool(
            e.x + Math.cos(e.fallA) * 8,
            e.y + Math.sin(e.fallA) * 8,
            Math.min(2.6, (e.r / 12) * rand(1, 1.4) * (big ? 2.2 : 1)),
            col,
            60
          ),
      });
  }
  splatterScreen(e.x, e.y, overkill ? 4 : 2);
  flashLight(ex, ey, e.r * 4, [0.5, 0.08, 0.05], 0.15);
  sfx.splat();
  if (e.trait === 'bloater') {
    ring(ex, ey, 8, 110, 0.45, [0.5, 0.6, 0.2], 0.6);
    bleed(e.x, e.y, 16, 0, 0, 24, BILE, 320, 1.3);
    distort(ex, ey, 0.03, 0.8, 0.45);
    shake(0.2);
    sfx.retch && sfx.retch(e.x, e.y);
    GS.pools.push({
      x: e.x,
      y: e.y,
      r: 70,
      life: 6,
      max: 6,
      dmg: 7 * (1 + 0.04 * GS.wave),
      rot: rand(0, TAU),
      v: randi(0, 3),
    });
    if (GS.state === 'play' && d2(e.x, e.y, GS.P.x, GS.P.y) < (95 + GS.P.r) ** 2)
      hurtPlayer(16 * (1 + 0.04 * GS.wave), e.x, e.y, 'a bloater');
  }
  if (e.type === 'hopper') {
    ring(ex, ey, 8, 100, 0.45, [0.42, 0.4, 0.26], 0.5);
    for (let k = 0; k < 10; k++)
      part({
        k: 2,
        x: ex + rand(-20, 20),
        y: ey + rand(-20, 20),
        vx: rand(-60, 60),
        vy: rand(-60, 60),
        life: rand(1.2, 2),
        max: 2,
        size: rand(0.8, 1.3),
        grow: 1.8,
        drag: 1.6,
        rot: rand(0, TAU),
        vr: rand(-1, 1),
        c: [0.42, 0.4, 0.26],
        wind: 0.8,
      });
    distort(ex, ey, 0.03, 0.8, 0.45);
    shake(0.25);
    GS.pools.push({
      x: e.x,
      y: e.y,
      r: 64,
      life: 6,
      max: 6,
      dmg: 7 * (1 + 0.04 * GS.wave),
      rot: rand(0, TAU),
      v: randi(0, 3),
    });
    if (GS.state === 'play' && d2(e.x, e.y, GS.P.x, GS.P.y) < (100 + GS.P.r) ** 2)
      hurtPlayer(16 * (1 + 0.04 * GS.wave), e.x, e.y, 'a bloater');
    query(e.x, e.y, 110, o => {
      if (!o.dead && o !== e && d2(e.x, e.y, o.x, o.y) < 100 * 100)
        hurtEnemy(o, 30, false, o.x - e.x, o.y - e.y, 2, 'boom');
    });
    for (const s of [-1, 1]) {
      const m = makeEnemy('mini', e.x + s * 16, e.y + rand(-8, 8));
      m.emerge = 0.6;
      m.kx = s * 160;
    }
  }
  GS.xp += e.xp;
  const ac =
    (big ? 3 : e.type === 'beetle' ? 0.4 : e.type === 'hopper' || e.type === 'wasp' ? 0.14 : 0.08) *
    (INF(7) && !big ? 0.65 : 1) *
    (S.scav ? 1.3 : 1);
  const ac2 = big ? ac : ac * 1.25 * ammoNeed() * (GS.wave <= 4 ? 1.25 : GS.wave >= 10 ? 0.8 : 1); // a little more early, before the drops can keep up with a new gun; a little less late, when every calibre is stocked
  for (let i = 0; i < Math.floor(ac2) + (Math.random() < ac2 % 1 ? 1 : 0); i++) dropAmmo(e.x, e.y, 1, 90); // fewer drops while you are well stocked
  const hc =
    (big
      ? 1
      : (e.type === 'beetle' ? 0.2 : e.type === 'flower' || e.type === 'hopper' ? 0.15 : 0.025) *
        clamp(0.35 + 1.1 * (1 - GS.P.hp / S.maxHp), 0.35, 1.2)) *
    (INF(4) && !big ? 0.5 : 1) *
    (e.horde ? (GS.RUN.hm ? 0.3 : 0.5) : 1); // a horde is hundreds of kills: it can't be hundreds of medkits too // like ammo: fewer medkits while you are healthy, more when you are hurt
  if (!TW('nomeds') && Math.random() < hc)
    GS.pickups.push({ k: 'hp', v: 25, x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-60, 60), t: 0 });
  if (e.type === 'beetle' || big) {
    shake(big ? 0.8 : 0.3);
    GS.hitstop = Math.max(GS.hitstop, big ? 0.3 : 0.05);
    distort(ex, ey, big ? 0.026 : 0.02, big ? 1.1 : 0.6, big ? 0.8 : 0.45); // a boss's last breath ripples the air; stronger, it read as a target painted on its back
  } else shake(overkill ? 0.1 : 0.05);
  if (big) {
    GS.boss = GS.enemies.find(o => o !== e && !o.dead && o.type === 'queen') || null;
    if (!GS.boss) $('bossBox').hidden = true; // on Ground Zero two can come: the bar stays while either lives
    GS.slowmo = 1.4;
    if (GS.RUN.practice) for (const z of GS.enemies) if (!z.dead && z.type !== 'queen') killEnemy(z, 999, 'boom');
    bossDown(e, !GS.boss);
    if (!GS.boss) {
      for (const b of GS.ebullets) glowBurst(b.x, b.y, [0.5, 0.9, 0.15], 3, 80, 0.3, 0.4);
      GS.ebullets.length = 0;
      GS.mortars.length = 0;
      GS.warns.length = 0;
    }
    for (let i = 0; i < 7; i++)
      GS.later.push({
        t: i * 0.14,
        fn: () => {
          const x = e.x + rand(-70, 70),
            y = e.y + rand(-70, 70);
          bleed(x, y, 30, rand(-1, 1), rand(-1, 1), 20, BLOOD, 420, 1.4);
          for (let k = 0; k < 4; k++) gib(x, y, R['g_meat' + randi(0, 1)], [1, 1, 1], BLOOD, 380);
          gib(x, y, R.g_bone, [1, 1, 1], BLOOD, 380);
          pool(x, y, 1.6, BLOOD, 70);
          sfx.gib(x, y);
          shake(0.2);
        },
      });
  }
}
const FOE_NAME = {
  skitter: 'a walker',
  mini: 'a crawler',
  hopper: 'a bloater',
  wasp: 'a spitter',
  flower: 'a screamer',
  beetle: 'a brute',
  hound: 'a dog',
  egg: 'a hatchling',
};
const BOSS_THE = {
  abom: 'the Abomination',
  roadkill: 'Roadkill',
  grave: 'the Gravekeeper',
  chief: 'the Fire Chief',
  pz: 'Patient Zero',
};
export function bossOf(e) {
  return BOSS_THE[e.btype] || bossName();
}
function killerAt(sx, sy) {
  // who most likely did it: the nearest of the dead to where the hit came from
  if (sx === undefined) return 'the dead';
  let best = null,
    bd = 140 * 140;
  for (const e of GS.enemies) {
    if (e.dead) continue;
    const dd = d2(e.x, e.y, sx, sy) - (e.type === 'queen' ? 60 * 60 : 0);
    if (dd < bd) {
      bd = dd;
      best = e;
    }
  }
  if (best)
    return best.type === 'queen'
      ? bossOf(best)
      : best.type === 'skitter' && best.run
        ? 'a runner'
        : FOE_NAME[best.type] || 'the dead';
  return GS.boss && !GS.boss.dead ? bossOf(GS.boss) : 'the dead';
}
export function hurtPlayer(dmg, sx, sy, why) {
  if (GS.P.inv > 0 || GS.state !== 'play') return;
  GS.P.lastBy = why || killerAt(sx, sy);
  dmg *= DIFF().dmg;
  if (GS.RUN && GS.RUN.metrics) GS.RUN.metrics.damageTaken += Math.max(0, dmg);
  GS.nightHit = true;
  if (sx !== undefined) {
    GS.hitDirs.push({ a: Math.atan2(sy - GS.P.y, sx - GS.P.x), life: 0.8 });
    if (GS.hitDirs.length > 6) GS.hitDirs.shift();
  }
  GS.P.stains = GS.P.stains || [];
  if (GS.P.stains.length < 22)
    GS.P.stains.push({ u: rand(-9, 9), v: rand(-11, 11), r: rand(0, TAU), s: rand(0.9, 1.6) });
  GS.P.hp -= dmg;
  if (S.wind && GS.P.hp < S.maxHp * 0.25 && GS.RUN.windN !== GS.wave) {
    GS.RUN.windN = GS.wave;
    GS.P.hp = Math.max(GS.P.hp, 30);
    GS.P.inv = 1.6;
    showStreak('Second wind', 'Not yet');
    flashLight(GS.P.x, GS.P.y, 180, [0.6, 1.4, 0.8], 0.4);
    sfx.level();
  } // once a night, the hit that should have finished you doesn't
  GS.press = (GS.press || 0) + dmg / S.maxHp; // how hard the night is pressing you: the spawns read it
  if (GS.P.hp > 0 && GS.P.hp < S.maxHp * 0.35) tip('hurt');
  if (GS.RUN.practice) GS.RUN.taken = (GS.RUN.taken || 0) + dmg;
  GS.P.inv = 0.9;
  GS.P.hurt = 0.18;
  shake(0.35);
  GS.hitstop = Math.max(GS.hitstop, 0.05);
  GS.chroma = 0.008;
  sfx.hurt();
  sparks(GS.P.x, GS.P.y, [1, 0.6, 0.4], 12, 340);
  floatText(GS.P.x, GS.P.y - 34, '-' + Math.round(dmg), '#ff3d5a', 20);
  GS.combo = 0;
  if (sx !== undefined) {
    const a = Math.atan2(GS.P.y - sy, GS.P.x - sx);
    GS.P.vx += Math.cos(a) * 380;
    GS.P.vy += Math.sin(a) * 380;
  }
  if (GS.P.hp <= 0) gameOver();
}
/* what a round does when it meets something solid: chain-link barely stops anything, rifle rounds go through car bodies,
   and a shallow hit on concrete or steel skips off with a whine. Returns true when the round flies on. */
export function passSolid(b, dt) {
  const tx = Math.floor(b.x / TILE),
    ty = Math.floor(b.y / TILE);
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return false;
  const ti = ty * MW + tx,
    t = ttype[ti],
    key = t === 6 ? 'c' + carAt[ti] : ti;
  if (b.passK === key) return true;
  if (t === 9 && Math.random() < (b.pellet ? 0.7 : 0.92)) {
    b.passK = key;
    if (Math.random() < 0.3) sparks(b.x, b.y, [1, 0.85, 0.5], 2, 160);
    return true;
  }
  if (t === 6 && !b.pellet && (b.heavy || (b.ap > 0 && Math.random() < 0.45))) {
    b.passK = key;
    impact(b.x - b.vx * 0.012, b.y - b.vy * 0.012, b);
    b.dmg *= 0.5;
    b.kb = (b.kb || 1) * 0.6;
    return true;
  }
  if (b.pellet || b.ric || b.small || !(t === 1 || t === 5 || t === 6 || t === 9)) return false;
  const px = b.x - b.vx * dt,
    py = b.y - b.vy * dt,
    sp = Math.hypot(b.vx, b.vy) || 1;
  let nx, ny;
  const hz = isWall(tx - 1, ty) || isWall(tx + 1, ty),
    vt = isWall(tx, ty - 1) || isWall(tx, ty + 1),
    cx0 = (tx + 0.5) * TILE,
    cy0 = (ty + 0.5) * TILE;
  if ((t === 1 || t === 5 || t === 9) && hz !== vt) {
    if (hz) {
      nx = 0;
      ny = py > cy0 ? 1 : -1;
    } else {
      nx = px > cx0 ? 1 : -1;
      ny = 0;
    }
  } // a straight run of wall: its face is flat
  else {
    const cx = (tx + 0.5) * TILE,
      cy = (ty + 0.5) * TILE,
      l = Math.hypot(b.x - cx, b.y - cy) || 1;
    nx = (b.x - cx) / l;
    ny = (b.y - cy) / l;
  }
  const vn = b.vx * nx + b.vy * ny,
    cosI = Math.abs(vn) / sp;
  if (cosI > 0.45 || Math.random() > 0.6) return false;
  impact(b.x - b.vx * 0.012, b.y - b.vy * 0.012, b);
  b.x = px;
  b.y = py;
  b.vx = (b.vx - 2 * vn * nx) * 0.72;
  b.vy = (b.vy - 2 * vn * ny) * 0.72;
  b.dmg *= 0.5;
  b.ric = 1;
  b.life = Math.min(b.life, 0.3);
  b.pierce = 0;
  sparks(px, py, [1, 0.9, 0.6], 6, 380, Math.atan2(b.vy, b.vx), 0.5);
  if (GS.P && thr('ric', 90)) {
    const v = clamp(1 - Math.hypot(px - GS.P.x, py - GS.P.y) / 900, 0, 1);
    if (v > 0) tone(rand(1900, 2700), 0.24, 'sine', 0.03 * v, 0.42, 0, 4200);
  }
  return true;
}
export function impact(x, y, b) {
  const tx = Math.floor((x + b.vx * 0.02) / TILE),
    ty = Math.floor((y + b.vy * 0.02) / TILE),
    t = tx >= 0 && ty >= 0 && tx < MW && ty < MH ? ttype[ty * MW + tx] : 1,
    back = Math.atan2(-b.vy, -b.vx);
  if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && isBlock(t)) wallHit(ty * MW + tx, x, y);
  if (t === 6) {
    sparks(x, y, [1, 0.85, 0.5], 7, 320, back, 0.9);
    hitCar(tx, ty, b.dmg, x, y);
    if (Math.random() < 0.5) playS('dry', 0.12, 2.2, 0, 0);
  } else if (t === 9 || t === 4) sparks(x, y, [1, 0.9, 0.6], 6, 300, back, 0.9);
  else if (t === 3) {
    chips(x, y, 2, [0.4, 0.3, 0.2], 3, 160);
  } else {
    dust(x, y, 2, 30, 0.45, 0.5);
    chips(x, y, 2, null, 4, 180);
    sparks(x, y, [1, 0.8, 0.6], 2, 160, back, 0.7);
  }
}
export function explode(x, y, R0, dmg, hurtsPlayer = true) {
  makeNoise(x, y, 1300);
  scorchWalls(x, y, R0);
  blastWorld(x, y, R0, dmg);
  if (GS.boss && GS.boss.signAt && d2(x, y, GS.boss.signAt.x, GS.boss.signAt.y) < (R0 + 20) ** 2) hitSign(GS.boss, dmg);
  sfx.boom(x, y);
  {
    const pd = GS.P ? Math.hypot(x - GS.P.x, y - GS.P.y) : 0;
    shake(0.4 * clamp(1.25 - pd / 600, 0.2, 1));
  }
  distort(x, y, 0.022, 0.9, 0.55);
  flashLight(x, y, R0 * 2.6, [1.8, 1.05, 0.42], 0.32); // a blast across the street rumbles; one at your feet jolts
  // layers: a white-hot core for a tenth of a second, a rolling orange fireball, burning debris, then dark smoke that rolls out after the fire
  glowBurst(x, y, [0.45, 0.38, 0.26], 3, R0 * 0.6, 0.09, 0.9);
  fireball(x, y, R0);
  sparks(x, y, [1, 0.78, 0.35], 16, R0 * 5);
  for (let i = 0; i < 9; i++) {
    const a = rand(0, TAU),
      v = rand(R0 * 2, R0 * 4.5);
    part({
      k: 0,
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: rand(0.6, 1.2),
      max: 1.2,
      size: rand(0.08, 0.16),
      c: [1, 0.5, 0.15],
      drag: 1.6,
    });
  } // burning bits
  dust(x, y, 10, R0 * 1.4, 1.8, 1.6, [0.3, 0.27, 0.24]); // thrown-up dirt and grit, not a pale cloud
  chips(x, y, 14, null, 4, 420);
  GS.later.push({ t: 0.45, fn: () => smoke(x, y, 9, R0, true) }); // the fireball cools into its own soot first
  decal(R.scorch, x, y, R0 / 50, [1, 1, 1, 0.9], [0, 0, 0], 40);
  ring(x, y, 10, R0 * 1.3, 0.22, [0.5, 0.42, 0.32], 0.22); // the shock front: a faint, quick ripple, the distortion does the rest
  if (dmg > 0) {
    const k0 = GS.kills;
    query(x, y, R0 + 70, e => {
      if (!e.dead && d2(x, y, e.x, e.y) < (R0 + e.r) ** 2) hurtEnemy(e, dmg, false, e.x - x, e.y - y, 2.5, 'boom');
    });
    const n = GS.kills - k0;
    if (n >= 6) floatText(x, y - 50, `${n} in one blast`, '#ffcf7a', 16 + Math.min(10, n / 3));
    hordeBlast(n);
    if (hurtsPlayer && d2(x, y, GS.P.x, GS.P.y) < (R0 + GS.P.r) ** 2) hurtPlayer(dmg * 0.3, x, y, 'an explosion');
  }
  for (const b of GS.barrels)
    if (!b.dead && d2(x, y, b.x, b.y) < (R0 + 10) ** 2) {
      b.hp = 0;
      GS.later.push({ t: 0.1, fn: () => blowBarrel(b) });
    }
  if (dmg > 0) for (const c of cars) if (!c.dead && d2(x, y, c.x, c.y) < (R0 + 50) ** 2) damageCar(c, dmg * 1.5 + 40);
  for (const c of crystals)
    if (c.alive && d2(x, y, c.x, c.y) < (R0 + 18) ** 2) {
      const cc = c;
      GS.later.push({ t: 0.08, fn: () => hitCrystal(cc, 999, cc.x - x, cc.y - y) });
    }
}
function crystalCol(c) {
  return [1, 0.8, 0.4];
}
export function hitCrystal(c, dmg, kx, ky) {
  if (!c.alive || c.grow < 1) return;
  c.hp -= dmg;
  c.flash = 0.08;
  const col = crystalCol(c);
  sparks(c.x, c.y - 8, col, 5, 260, Math.atan2(-ky, -kx), 1);
  chips(c.x, c.y - 6, 2, null, 4, 180);
  sfx.ting();
  if (c.hp <= 0) shatterCrystal(c);
}
function shatterCrystal(c) {
  c.alive = false;
  const i = c.ty * MW + c.tx;
  grid[i] = 0;
  ttype[i] = 0;
  GS.flowTile = -1;
  const col = crystalCol(c),
    R0 = 150;
  sfx.boom(c.x, c.y);
  sfx.zap();
  shake(0.3);
  distort(c.x, c.y, 0.035, 0.9, 0.5);
  if (c.hue === 2) {
    GS.later.push({
      t: 0.05,
      fn: () => {
        explode(c.x, c.y, 140, 80 + GS.wave * 10, true);
        firePool(c.x, c.y, 90, 8);
      },
    });
  }
  glowBurst(c.x, c.y - 6, col, 4, 160, 0.35, 0.25);
  chips(c.x, c.y, 18, col, 3, 380);
  sparks(c.x, c.y, [col[0] + 0.3, col[1] + 0.3, 1], 30, 520);
  smoke(c.x, c.y, 6, 60, true);
  ring(c.x, c.y, 10, R0, 0.3, [col[0] * 1.4, col[1] * 1.4, col[2] * 1.6], 0.35); // the box blows: a spray of sparks and a puff of smoke, not a glowing wheel
  flashLight(c.x, c.y, R0 * 2.2, [col[0] * 2, col[1] * 2, col[2] * 2.2], 0.4);
  decal(R.scorch, c.x, c.y, 1, [1, 1, 1, 0.9], [0, 0, 0], 40);
  if (GS.state === 'play') {
    let caught = 0;
    query(c.x, c.y, R0 + 40, e => {
      if (!e.dead && d2(c.x, c.y, e.x, e.y) < (R0 + e.r) ** 2) {
        hurtEnemy(e, 40 + GS.wave * 6, false, e.x - c.x, e.y - c.y, 3, 'crystal');
        e.slowT = 2.5;
        caught++;
      }
    });
    for (const b of GS.ebullets) if (d2(c.x, c.y, b.x, b.y) < R0 * R0) b.life = 0;
    GS.xp += Math.min(6, caught); // experience only for the dead it caught, a point each (their kills pay as usual): an empty street teaches you nothing
    if (Math.random() < 0.35 * ammoNeed()) dropAmmo(c.x, c.y, 1, 60);
    if (Math.random() < 0.3)
      GS.pickups.push({ k: 'hp', v: 20, x: c.x, y: c.y, vx: rand(-60, 60), vy: rand(-60, 60), t: 0 });
    floatText(c.x, c.y - 30, 'Short circuit', '#ffe08a', 18);
  }
}
export function dropCrate(gun, alt, kits) {
  if (kits) {
    gun = KITS[kits[0]].gun;
    alt = KITS[kits[1] || kits[0]].gun;
  } // a kit case looks like a weapon case
  for (let k = 0; k < 40; k++) {
    const a = rand(0, TAU),
      d = gun ? rand(170, 320) : rand(240, 480),
      x = clamp(GS.P.x + Math.cos(a) * d, 4 * TILE, WW - 4 * TILE),
      y = clamp(GS.P.y + Math.sin(a) * d, 4 * TILE, WH - 4 * TILE);
    if (solidPt(x, y) || solidPt(x + 20, y) || solidPt(x - 20, y) || solidPt(x, y + 20) || solidPt(x, y - 20)) continue;
    const cr = { x, y, z: 640, landed: false, t: 0, gun, alt, kit: kits };
    GS.crates.push(cr);
    const live = () => GS.crates.includes(cr) && !cr.open;
    if (kits)
      showStreak(
        'Convoy airdrop',
        `A weapon case is coming down · ${kits.map(k => KITS[k].name).join(' or ')}`,
        undefined,
        live
      );
    else if (gun && alt)
      showStreak(
        'Convoy airdrop',
        `A weapon case is coming down · ${GUNS[gun].name} or ${GUNS[alt].name}`,
        undefined,
        live
      );
    else if (gun) {
      const nm = GUNS[gun].name,
        low = /^[A-Z]{2,}/.test(nm) ? nm : nm.toLowerCase();
      showStreak('Convoy airdrop', `${/^[aeiou]|^SMG/i.test(low) ? 'An' : 'A'} ${low} is coming down`, undefined, live);
    } else showStreak('Supply drop', 'Ammo and a free pick of gear · no gun in this one', undefined, live);
    sfx.streak();
    return cr;
  }
}
export function updateCrates(dt) {
  for (const c of GS.crates) {
    c.t += dt;
    if (!c.landed) {
      // out of the aircraft: a short free fall, the canopy snaps open, the drop slows to a steady descent and the load swings on its lines like a pendulum
      c.ph = c.ph ?? rand(0, TAU);
      c.rot = (c.rot ?? rand(0, TAU)) + dt * 0.12;
      c.vz = c.vz ?? -330;
      c.thx = c.thx ?? rand(-0.2, 0.2);
      c.thy = c.thy ?? 0;
      c.wx = c.wx ?? 0;
      c.wy = c.wy ?? 0;
      const dep = clamp((c.t - 0.35) / 0.55, 0, 1),
        was = c.dep || 0;
      c.dep = dep;
      if (dep > 0 && was === 0) {
        c.wx += (Math.random() < 0.5 ? -1 : 1) * rand(0.7, 1.1);
        c.wy += rand(-0.5, 0.5);
        if (GS.P) {
          const v = clamp(1 - Math.hypot(c.x - GS.P.x, c.y - GS.P.y) / 1000, 0, 1);
          if (v > 0) noise(0.35, 0.09 * v, 1400, 260, 'bandpass');
        }
      } // the snatch as the canopy fills
      c.vz += (-140 - c.vz) * Math.min(1, dt * 3.2 * dep);
      c.z += c.vz * dt;
      const gust = Math.sin(c.t * 1.2 + c.ph) * 0.24 + Math.sin(c.t * 2.1 + c.ph * 3) * 0.12; // gusts near the swing's own rhythm keep it rocking
      c.wx += (-1.6 * Math.sin(c.thx) - 0.3 * c.wx + gust * dep) * dt;
      c.thx += c.wx * dt;
      c.wy += (-1.9 * Math.sin(c.thy) - 0.5 * c.wy + gust * 0.4 * dep) * dt;
      c.thy += c.wy * dt;
      c.sx = Math.sin(c.thx) * 34 * dep;
      c.sy = Math.sin(c.thy) * 14 * dep;
      const nx = c.x + WINDX * 0.55 * dep * dt;
      if (nx < WW - 4 * TILE && !solidPt(nx + 24, c.y) && !solidPt(nx + 24, c.y + 18) && !solidPt(nx + 24, c.y - 18))
        c.x = nx; // the wind carries it a little
      if (c.z <= 0) {
        const g = chuteGeom(c),
          lx = c.x + c.sx,
          ly = c.y + c.sy * 0.5;
        if (!solidPt(lx, ly) && !solidPt(lx + 18, ly) && !solidPt(lx - 18, ly)) {
          c.x = lx;
          c.y = ly;
        }
        if (c.gun) tip('wcase');
        else tip('supply');
        c.z = 0;
        c.landed = true;
        c.vz = 70;
        c.vx = c.wx * 34 * 0.9 + WINDX * 0.6;
        c.vy = c.wy * 14 * 0.6;
        c.ang = clamp(c.thx * 0.8 + rand(-0.12, 0.12), -0.35, 0.35);
        c.squash = 1;
        c.sx = c.sy = 0;
        dust(c.x, c.y, 12, 80, 1.2, 1);
        ring(c.x, c.y, 8, 60, 0.35, [1.6, 1.4, 1], 0.7);
        sfx.crate(c.x, c.y);
        shake(0.08);
        c.flare = 9;
        makeNoise(c.x, c.y, 560); // a road flare strapped to the crate pops on landing: you can find it, and so can they
        chips(c.x, c.y, 5, [0.55, 0.5, 0.42], 4, 160);
        for (const e of GS.enemies)
          if (!e.dead && e.type !== 'queen' && d2(e.x, e.y, c.x, c.y) < (e.r + 20) ** 2) {
            hurtEnemy(e, 60 + GS.wave * 4, false, e.x - c.x, e.y - c.y, 2.5, 'boom');
            if (!e.dead && HUMAN[e.type] && e.type !== 'beetle') {
              e.down = 1.15;
              e.fallA = Math.atan2(e.y - c.y, e.x - c.x);
              e.splay = 1;
            }
          } // nothing survives a crate on the head
        if (GS.P && d2(GS.P.x, GS.P.y, c.x, c.y) < (GS.P.r + 20) ** 2) {
          const dx = GS.P.x - c.x,
            dy = GS.P.y - c.y,
            dl = Math.hypot(dx, dy) || 1;
          GS.P.vx += (dx / dl) * 420;
          GS.P.vy += (dy / dl) * 420;
          hurtPlayer(8, c.x, c.y, 'a falling supply crate');
        }
        GS.chutesDown.push({
          x: g.cx,
          y: c.y + 4,
          z: c.y - g.cy,
          cx: c.x,
          cy: c.y,
          crate: c,
          t: 0,
          life: 10,
          s: c.gun ? 1.2 : 1,
          rot: c.rot,
          a: rand(-0.35, 0.35),
          dx: 34 + WINDX,
        });
        GS.later.push({
          t: 0.5,
          fn: () => {
            if (!GS.P) return;
            const v = clamp(1 - Math.hypot(c.x - GS.P.x, c.y - GS.P.y) / 900, 0, 1);
            if (v > 0) noise(0.6, 0.07 * v, 700, 160, 'lowpass');
          },
        });
      }
    } else if (c.vz || c.z > 0 || Math.abs(c.vx || 0) + Math.abs(c.vy || 0) > 1) {
      // after touchdown: a short hop, a scrape along the ground, then it sits where it stopped
      c.vz -= 900 * dt;
      c.z += c.vz * dt;
      if (c.z <= 0) {
        c.z = 0;
        if (c.vz < -60) {
          c.vz = -c.vz * 0.28;
          dust(c.x, c.y, 3, 40, 0.8, 0.7);
          if (thr('crate2', 120)) playS('dry', 0.12, 0.6, 0, 0);
        } else c.vz = 0;
      }
      const ox = c.x,
        oy = c.y;
      c.x += (c.vx || 0) * dt;
      c.y += (c.vy || 0) * dt;
      if (solidPt(c.x + Math.sign(c.vx || 0) * 18, c.y) || solidPt(c.x, c.y + Math.sign(c.vy || 0) * 16)) {
        c.x = ox;
        c.y = oy;
        c.vx = (c.vx || 0) * -0.2;
        c.vy = (c.vy || 0) * -0.2;
      }
      const f = Math.exp(-(c.z > 0 ? 0.5 : 6) * dt);
      c.vx *= f;
      c.vy *= f;
      if (c.z === 0 && Math.random() < 0.3 && Math.abs(c.vx) > 20)
        dust(c.x - Math.sign(c.vx) * 14, c.y + 6, 1, 20, 0.5, 0.5);
      c.ang += (c.vx || 0) * 0.0015 * dt * 60 * (c.z === 0 ? 1 : 0.2);
      if (Math.abs(c.vx) < 2 && Math.abs(c.vy) < 2 && !c.vz) c.vx = c.vy = 0;
    } else if (GS.state === 'play' && !c.vz && c.z === 0 && d2(c.x, c.y, GS.P.x, GS.P.y) < 40 * 40 && c.kit) {
      c.open = true;
      const ks = c.kit.filter(id => !(GS.RUN.kits || []).includes(id)),
        go = () => {
          if (GS.state === 'play') {
            if (ks.length > 1) offerKits(ks);
            else if (ks.length) {
              GS.RUN.kits = (GS.RUN.kits || []).concat(ks[0]);
              showStreak(KITS[ks[0]].name, GUNS[KITS[ks[0]].gun].name + ' · kit fitted');
            }
          } else if (GS.state === 'levelup' || GS.state === 'pause') GS.later.push({ t: 0.1, fn: go });
        };
      GS.later.push({ t: 0.15, fn: go });
      glowBurst(c.x, c.y, [1, 0.8, 0.3], 22, 240, 0.5, 0.6);
      chips(c.x, c.y, 10, [0.45, 0.5, 0.3], 3, 260);
    } else if (GS.state === 'play' && !c.vz && c.z === 0 && d2(c.x, c.y, GS.P.x, GS.P.y) < 40 * 40 && c.gun) {
      c.open = true;
      if (c.alt && !GS.P.owned.includes(c.alt) && !GS.P.owned.includes(c.gun)) {
        const gs = [c.gun, c.alt];
        const go = () => {
          if (GS.state === 'play') {
            const left = gs.filter(g => !GS.P.owned.includes(g));
            if (left.length > 1) offerGuns(left);
            else left.forEach(giveGun);
          } else if (GS.state === 'levelup' || GS.state === 'pause') GS.later.push({ t: 0.1, fn: go });
          else
            gs.filter(g => !GS.P.owned.includes(g))
              .slice(0, 1)
              .forEach(giveGun);
        };
        GS.later.push({ t: 0.15, fn: go }); // a level-up card on the same tick waits its turn: the case is never lost
      } else giveGun(c.alt && GS.P.owned.includes(c.gun) ? c.alt : c.gun);
      glowBurst(c.x, c.y, [1, 0.8, 0.3], 22, 240, 0.5, 0.6);
      chips(c.x, c.y, 10, [0.45, 0.5, 0.3], 3, 260);
    } else if (GS.state === 'play' && !c.vz && c.z === 0 && d2(c.x, c.y, GS.P.x, GS.P.y) < 40 * 40) {
      c.open = true;
      for (const t of new Set(GS.P.owned.map(g => GUNS[g].ammo).filter(Boolean)))
        GS.pickups.push({ k: 'ammo', at: t, v: 1.35, x: c.x, y: c.y, vx: rand(-140, 140), vy: rand(-140, 140), t: 0 }); // a box for every kind of round you carry: about what the crate used to add invisibly
      glowBurst(c.x, c.y, [1, 0.7, 0.3], 18, 220, 0.5, 0.5);
      chips(c.x, c.y, 10, [0.85, 0.7, 0.45], 3, 260);
      if (GS.wave >= 2 && !GS.RUN.practice) {
        const t = pick(['mine', 'mine', 'drum', 'noise']);
        giveTraps({ [t]: 1 });
        floatText(c.x, c.y - 30, `+1 ${TRAP[t].name.toLowerCase()}`, '#e8c46a', 15);
      } // a supply crate carries a trap or two from the second night on
      const go = () => {
        if (GS.state === 'play') offerUpgrades('crate');
        else if (GS.state === 'levelup' || GS.state === 'pause') GS.later.push({ t: 0.1, fn: go });
      };
      GS.later.push({ t: 0.15, fn: go });
    } /* the ammo spills out where you can see it, and the free pick waits behind any card already on screen instead of vanishing */
  }
  for (const c of GS.crates) {
    if (c.squash > 0) c.squash = Math.max(0, c.squash - dt * 5);
    if (c.flare > 0) {
      c.flare -= dt;
      const fx = c.x + 20,
        fy = c.y + 12;
      if (Math.random() < dt * 14)
        part({
          k: 2,
          x: fx,
          y: fy - 4,
          vx: WINDX * 1.4 + rand(-6, 6),
          vy: rand(-22, -10),
          life: rand(1.4, 2.4),
          max: 2.4,
          size: rand(0.35, 0.6),
          grow: 1.8,
          drag: 0.6,
          rot: rand(0, TAU),
          vr: rand(-1, 1),
          c: [0.62, 0.22, 0.2],
          wind: 1,
        });
      if (Math.random() < dt * 10)
        part({
          k: 0,
          x: fx,
          y: fy,
          vx: rand(-30, 30),
          vy: rand(-50, -10),
          life: 0.4,
          max: 0.4,
          size: 0.08,
          drag: 2,
          c: [1, 0.45, 0.3],
        });
    }
  }
  GS.crates = GS.crates.filter(c => !c.open);
  for (const h of GS.chutesDown) {
    h.t += dt;
    if (h.t > 1) h.life -= dt;
  }
  GS.chutesDown = GS.chutesDown.filter(h => h.life > 0);
}
export function crushCrystals(x, y, r) {
  for (const c of crystals) if (c.alive && d2(x, y, c.x, c.y) < (r + 10) ** 2) shatterCrystal(c);
}
export function blowBarrel(b) {
  if (b.dead) return;
  b.dead = true;
  tip('barrel');
  explode(b.x, b.y, b.gas ? 120 : 105, (70 + GS.wave * 6) * (b.gas ? 1.2 : 1));
  if (b.gas) {
    firePool(b.x, b.y, 115, 11);
    for (let i = 0; i < 4; i++) {
      const a = rand(0, TAU),
        d = rand(70, 120);
      GS.later.push({ t: 0.08 + i * 0.05, fn: () => firePool(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 55, 9) });
    }
  } // a gas drum: the fuel goes everywhere, burning
}
