/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, d2, pick, rand, randi } from '../core/util.js';
import { DIFF } from '../core/profile.js';
import { cars } from '../world/map.js';
import { query } from '../world/nav.js';
import { LEGSPEC, makeLegs } from './legs.js';
import { budKey, playR, thr } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { bossNight } from '../game/waves.js';
import { bleed, distort, ring } from '../render/effects.js';
import { BILE, ZSKIN } from '../render/draw-enemies.js';
import { FINAL_NIGHT, INF } from '../game/districts.js';
import { tip } from '../audio/radio.js';
import { bossName } from '../game/boss-flow.js';
export const ET = {
  skitter: { hp: 20, r: 14, sp: 84, dmg: 9, xp: 1, score: 10, col: [0.62, 0.04, 0.03] },
  hopper: { hp: 70, r: 24, sp: 46, dmg: 0, xp: 3, score: 30, col: [0.42, 0.62, 0.1] },
  mini: { hp: 14, r: 12, sp: 62, dmg: 7, xp: 1, score: 8, col: [0.62, 0.04, 0.03] },
  wasp: { hp: 34, r: 15, sp: 120, dmg: 8, xp: 2, score: 20, col: [0.42, 0.62, 0.1] },
  flower: { hp: 95, r: 18, sp: 40, dmg: 6, xp: 4, score: 40, col: [0.75, 0.35, 1] },
  beetle: { hp: 240, r: 30, sp: 70, dmg: 22, xp: 7, score: 70, col: [0.62, 0.04, 0.03] },
  hound: { hp: 32, r: 15, sp: 225, dmg: 10, xp: 2, score: 25, col: [0.62, 0.04, 0.03] },
  egg: { hp: 70, r: 20, sp: 0, dmg: 0, xp: 2, score: 25, col: [0.5, 0.7, 0.2] },
  queen: { hp: 7500, r: 64, sp: 84, dmg: 32, xp: 80, score: 5000, col: [0.62, 0.04, 0.03] },
};
export function makeEnemy(type, x, y) {
  const T = ET[type];
  // Preserve a meaningful late-run health ramp without letting ordinary enemies become pure bullet sponges.
  // For ordinary enemies, night 15 is about 4.85x base health (5.45x originally, 4.25x in the proposed cut): tested with the pacing bot, the full cut made nights 11-15 half as dangerous
  const waveHp =
    type === 'queen'
      ? (1 + 0.65 * Math.max(0, GS.wave / 5 - 1)) * (INF(6) ? 1.3 : 1)
      : 1 + 0.135 * (GS.wave - 1) + 0.01 * (GS.wave - 1) ** 2;
  const m = waveHp * DIFF().hp * (INF(1) ? 1.15 : 1);
  const e = {
    id: GS.nid++,
    type,
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    kx: 0,
    ky: 0,
    r: T.r,
    hp: T.hp * m,
    maxHp: T.hp * m,
    sp: T.sp * (1 + Math.min(0.3, Math.max(0, GS.wave - 4) * 0.025)) * rand(0.92, 1.08),
    dmg: T.dmg * (1 + 0.05 * (GS.wave - 1)),
    xp: T.xp,
    score: T.score,
    col: T.col,
    a: rand(0, TAU),
    anim: rand(0, 10),
    flash: 0,
    squash: 0,
    emerge: 0,
    los: false,
    losT: rand(0, 0.3),
    st: 'move',
    stT: rand(0.8, 2),
    fireT: rand(1.2, 2.6),
    dead: false,
    wob: 0,
  };
  if (type !== 'queen') e.cr = Math.min(e.r, type === 'beetle' ? 19 : type === 'hopper' ? 18 : 15); // against walls: the big ones keep more of their bulk out of them, and still fit a one-tile gap

  if (INF(5)) e.sp *= 1.1;
  if (INF(9)) e.dmg *= 1.25;
  if (GS.ev === 'blood') {
    e.sp *= 1.12;
    e.xp *= 2;
  }

  e.v = randi(0, 2);
  e.hv = randi(0, 2);
  e.sk = randi(0, ZSKIN.length - 1);
  e.pose = Math.random() < 0.5 ? 0 : randi(1, 3);
  e.limp = Math.random() < 0.5 ? 0 : 1;
  e.stride = rand(0, 1);
  e.lost = [false, false];
  if (type === 'skitter' || type === 'mini') {
    // who the dead were: police, medics, firefighters and road crews everywhere; truckers and bikers on Route 9; mourners, the buried and the groundskeepers at Hollow Hill
    const r = Math.random(),
      D = GS.RUN.district,
      w =
        D === 'highway'
          ? [
              [3, 0.06],
              [4, 0.03],
              [5, 0.05],
              [6, 0.12],
              [7, 0.16],
              [8, 0.12],
            ]
          : D === 'cemetery'
            ? [
                [3, 0.05],
                [4, 0.06],
                [5, 0.03],
                [9, 0.18],
                [10, 0.13],
                [11, 0.08],
              ]
            : [
                [3, 0.1],
                [4, 0.08],
                [5, 0.05],
                [6, 0.06],
              ];
    let acc = 0;
    for (const [v, p] of w) {
      acc += p;
      if (r < acc) {
        e.v = e.hv = v;
        break;
      }
    }
    if (acc <= r) {
      // an ordinary person: what they wore that day depends on where they died
      const civ =
        D === 'highway'
          ? [0, 1, 2, 12, 13, 14, 16, 12, 13]
          : D === 'cemetery'
            ? [0, 2, 15, 17, 18, 17, 18, 12]
            : [0, 1, 2, 12, 13, 14, 15, 16, 17];
      e.v = pick(civ);
      const heads =
        e.v === 18
          ? [10, 14, 9]
          : e.v === 17
            ? [9, 14, 12, 1]
            : e.v === 12 && Math.random() < 0.4
              ? [16]
              : [0, 1, 2, 12, 13, 15, 17, 4];
      e.hv = pick(heads);
      e.tc = pick([
        [1, 1, 1],
        [0.88, 0.92, 1.05],
        [1.06, 0.94, 0.86],
        [0.82, 0.82, 0.84],
        [1.02, 1.0, 0.86],
        [0.9, 1.0, 0.9],
      ]);
    }
  }
  if (e.v === 5) e.fireproof = true;
  if (e.v === 6) {
    e.hp *= 1.3;
    e.maxHp = e.hp;
  }
  if (e.v === 8) {
    e.hp *= 1.15;
    e.maxHp = e.hp;
  } // hard hats and leather take a little more
  if (
    type === 'skitter' &&
    Math.random() <
      Math.min(0.6, 0.08 + GS.wave * 0.03 + (INF(2) ? 0.15 : 0) + (GS.RUN.district === 'highway' ? 0.1 : 0))
  ) {
    e.run = true;
    e.sp *= 2.05;
    e.hp *= 0.85;
    e.maxHp = e.hp;
  }
  if (type === 'queen') {
    makeLegs(e, LEGSPEC.queen);
    e.big = true;
    e.t0 = GS.time;
    e.los = true;
    e.ph = -1;
    e.summonT = 7;
    e.chargeT = 6;
    e.clawT = 0;
    e.claw = 0;
    e.tailT = 2;
    e.spin = 0;
    e.leapT = 5;
    e.mortT = 4;
    GS.boss = e;
    $('bossBox').hidden = false;
    {
      const bb = $('bossBox').firstElementChild;
      if (bb) bb.textContent = bossName();
    }
    e.btype =
      !GS.RUN.endless && GS.wave === FINAL_NIGHT
        ? 'pz'
        : !GS.RUN.endless && GS.wave === 10
          ? 'chief'
          : GS.RUN.district === 'highway'
            ? 'roadkill'
            : GS.RUN.district === 'cemetery'
              ? 'grave'
              : 'abom';
    if (e.btype === 'chief') {
      e.hp *= 1.2;
      e.maxHp = e.hp;
      e.fireproof = true;
      e.tank = e.maxHp * 0.1;
      e.mortT = 3;
      e.extT = 5;
      e.chargeT = 1e9;
      e.rushT = 2.5;
      e.tailT = 1.5;
      e.sp *= 1.3;
    }
    if (e.btype === 'pz') {
      e.hp *= 2.2;
      e.maxHp = e.hp; // no armour, but it can be choked
      e.sc = 1.12;
    } // the last boss is the longest fight
    if (e.btype === 'roadkill') {
      e.hp *= 1.2;
      e.maxHp = e.hp;
      e.sp *= 1.15;
      e.chargeT = 3;
      e.sign = true;
    }
    if (e.btype === 'grave') {
      e.mortT = 3;
      e.lant = 1;
      e.lantHits = 0;
    }
    if (e.btype === 'roadkill')
      for (const c of cars) if (!c.burnt && !c.police && !c.dead && !c.alarmUsed) c.hasAlarm = true; // Route 9 is full of cars with alarms: tonight that's a tool
    if (e.btype !== 'abom') {
      e.legs = null;
      e.giant = true;
    }
  }
  if (type === 'flower') {
    e.st = 'closed';
    e.stT = rand(1.4, 2.4);
    e.open = 0;
  }
  if (type === 'mini') {
    e.half = true;
    e.lyG = 1;
  } // already on the ground: half a body
  GS.enemies.push(e);
  return e;
}
export function makeElite(e) {
  if (GS.state === 'play' && GS.wave > 0) tip('elite');
  e.elite = true;
  e.hp *= 3.2;
  e.maxHp = e.hp;
  e.sc = 1.3;
  e.r *= 1.3;
  e.sp *= 1.12;
  e.dmg *= 1.4;
  e.score *= 5;
  e.xp *= 4;
  if (e.legSpec) {
    e.legSpec = Object.assign({}, e.legSpec);
  }
  if ((GS.wave >= 9 || GS.RUN.endless) && GS.state === 'play' && !GS.RUN.practice && !bossNight(GS.wave)) {
    const pool =
      e.type === 'skitter' && !e.shield
        ? ['runner', 'bloater', 'screamer', 'armored']
        : e.type === 'beetle'
          ? ['bloater', 'armored']
          : [];
    if (pool.length && Math.random() < 0.6) setTrait(e, pick(pool));
  } // late in the run an elite is more than a bigger zombie: each one asks for its own answer
}
export const TRAIT = {
  runner: {
    name: 'Runner',
    tip: 'That fast one is an elite runner. It closes the gap in a heartbeat. Roll when it crouches.',
  },
  bloater: { name: 'Bloater', tip: "Swollen elite, nine. It bursts when it dies. Do not kill it at arm's length." },
  screamer: {
    name: 'Screamer',
    tip: 'Hear that? A screamer. Every time it sees you it calls the rest in faster. Drop it first.',
  },
  armored: {
    name: 'Armored',
    tip: 'That one has body armour on. Rounds stop in it and it shrugs off a shove. Use blasts or fire.',
  },
};
function setTrait(e, t) {
  e.trait = t;
  if (GS.state === 'play' && thr('budLook', 18000)) {
    const up = GS.buddies.filter(b => !(b.down > 0));
    if (up.length)
      GS.later.push({
        t: 0.9,
        fn: () => {
          const b = pick(up);
          if (GS.state === 'play' && b && !(b.down > 0)) playR(budKey(b, 'Look'), 0.22, b.x, b.y);
        },
      });
  } /* one of your people spots it first */
  if (t === 'runner') {
    e.sp = rand(265, 290);
    e.hp *= 0.7;
    e.run = true;
    e.limp = 0;
  }
  if (t === 'bloater') {
    e.hp *= 0.9;
    e.sc *= 1.12;
  }
  if (t === 'screamer') {
    e.scrT = rand(1.5, 3);
    e.hp *= 0.85;
  }
  if (t === 'armored') {
    e.hp *= 1.3;
    e.sp *= 0.88;
    if (e.type === 'skitter') {
      e.v = e.hv = 3;
      e.run = false;
      e.pose = 0;
    }
  }
  e.hp *= 0.8;
  e.maxHp = e.hp; // the trait is the threat now, not the extra health
}
export function traitTick(e, dt, pd2) {
  // what the trait does while it walks
  if (e.trait === 'screamer') {
    e.scrT -= dt;
    if (e.scrT <= 0 && e.los && pd2 < 520 * 520 && !(e.down > 0) && !(e.stag > 0)) {
      e.scrT = 10;
      e.wakeT = 0.7;
      e.scrPose = GS.time + 0.9;
      sfx.scream(e.x, e.y);
      e.squash = 0.2;
      distort(e.x, e.y, 0.012, 0.6, 0.5);
      ring(e.x, e.y - 30, 10, 140, 0.5, [1, 0.9, 0.8], 0.5);
      query(e.x, e.y, 340, o => {
        if (o !== e && !o.dead && o.type !== 'queen' && d2(o.x, o.y, e.x, e.y) < 340 * 340) {
          o.aw = Math.max(o.aw || 0, 8);
          o.frenzy = Math.max(o.frenzy || 0, 3);
        }
      });
      if (GS.state === 'play') tip('el_screamer');
    }
  }
  if (e.trait === 'bloater' && Math.random() < dt * 3) bleed(e.x, e.y, 8, rand(-1, 1), rand(-1, 1), 1, BILE, 40);
}
