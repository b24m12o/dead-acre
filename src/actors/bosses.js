/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const WCOL = {
  friend: [0.7, 0.62, 0.45],
  dust: [0.8, 0.68, 0.5],
  slam: [2.0, 0.32, 0.22],
  bile: [1.0, 1.7, 0.25],
  rock: [1.7, 1.05, 0.4],
  dead: [1.4, 1.0, 0.6],
};
let curBoss = null;
function bossVoice(e, dt) {
  // between attacks you can still tell who is out there
  if (e.dying !== undefined || e.emerge < 1) return;
  const bt = e.btype;
  e.vT = (e.vT || 0) - dt;
  const ph = e.ph || 0;
  if (ph >= 1 && Math.random() < dt * (ph >= 2 ? 7 : 3)) {
    const x = e.x + rand(-20, 20),
      y = e.y + rand(-20, 20); // and how hurt it is
    if (bt === 'chief') {
      smoke(x, y - 30, 1, 60);
      if (ph >= 2) sparks(x, y - 40, [1, 0.55, 0.15], 2, 90);
    } else if (bt === 'pz') bleed(x, y, 30, rand(-1, 1), rand(-1, 1), 1, [0.5, 0.55, 0.16], 60);
    else if (bt === 'grave') chips(x, y, 2, [0.32, 0.25, 0.18], 3, 60);
    else if (bt === 'roadkill') {
      bleed(x, y, 30, rand(-1, 1), rand(-1, 1), 1, BLOOD, 60);
      if (ph >= 2) sparks(x, y - 20, [1, 0.8, 0.4], 1, 120);
    } else {
      bleed(x, y, 20, rand(-1, 1), rand(-1, 1), 1, BILE, 70);
      if (ph >= 2) smoke(x, y - 20, 1, 50);
    }
  }
  if (bt === 'pz') {
    e.hbT = (e.hbT || 0) - dt;
    if (e.hbT <= 0) {
      const k = 1 - e.hp / e.maxHp;
      e.hbT = 60 / (64 + k * 90);
      e.hbP = 1;
      sfx.monitor(e.x, e.y);
    }
    e.hbP = Math.max(0, (e.hbP || 0) - dt * 4);
  } // it speeds up as you hurt it
  else if (bt === 'chief') {
    if ((e.stunT > 0 || e.recT > 0.3) && e.vT <= 0) {
      e.vT = 0.9;
      sfx.pass(e.x, e.y);
    } else if (e.vT <= 0) {
      e.vT = (e.ph || 0) >= 2 ? 1.5 : 2.4;
      sfx.breath(e.x, e.y, (e.ph || 0) >= 1);
    }
  } else if (bt === 'grave') {
    if (e.vT <= 0 && Math.hypot(e.vx, e.vy) > 40) {
      e.vT = rand(0.5, 0.8);
      sfx.chain(e.x, e.y);
    }
  } else if (bt === 'roadkill') {
    if (e.vT <= 0) {
      e.vT = rand(2.2, 3.6);
      sfx.rumble(e.x, e.y);
    }
  } else if (e.vT <= 0) {
    e.vT = rand(1.8, 3.2);
    sfx.gurgle(e.x, e.y);
  }
}
function bossProps(e) {
  // what it carried stays where it fell
  const a = e.a,
    x = e.x,
    y = e.y,
    put = (reg, dx, dy, rot, sc, t = 0.45) =>
      later.push({
        t,
        fn: () => {
          const d = decal(reg, x + dx, y + dy, sc, [1, 1, 1, 1], [0, 0, 0], 900);
          d.rot = rot;
          dust(x + dx, y + dy, 5, 50, 1, 0.8);
        },
      });
  const side = (d, o) => [Math.cos(a) * d - Math.sin(a) * o, Math.sin(a) * d + Math.cos(a) * o];
  if (e.btype === 'roadkill' && e.signAt) {
    const d = decal(R.rk_sign, e.signAt.x, e.signAt.y, 1.05, [0.9, 0.9, 0.9, 1], [0, 0, 0], 900);
    if (d) d.rot = e.signAt.a;
    e.signAt = null;
  }
  if (e.btype === 'roadkill' && e.sign) {
    const [dx, dy] = side(-10, 70);
    put(R.rk_sign, dx, dy, a + 2.2, 1.05);
    later.push({ t: 0.45, fn: () => sfx.signClang(x + dx, y + dy) });
  } else if (e.btype === 'chief') {
    const [dx, dy] = side(70, -30);
    put(R.cf_axe, dx, dy, a + 0.6, 1.15);
    later.push({ t: 0.45, fn: () => sfx.axeRing(x + dx, y + dy) });
    if (!e.tankGone) {
      later.push({
        t: 0.2,
        fn: () => {
          noise(1.6, 0.08, 6000, 2500, 'highpass', 0, spat(x, y));
          for (let i = 0; i < 10; i++) smoke(x - Math.cos(a) * 20, y - Math.sin(a) * 20, 1, 70);
        },
      });
    }
  } // the axe drops; the air tank bleeds out
  else if (e.btype === 'grave') {
    const [dx, dy] = side(60, 40);
    put(R.gk_shovel, dx, dy, a - 0.4, 1.7);
    if (e.lant) {
      const [lx, ly] = side(-6, -60);
      put(R.gk_lantern, lx, ly, rand(0, TAU), 1.2, 0.5);
      later.push({
        t: 0.5,
        fn: () => {
          if (state === 'play') {
            firePool(x + lx, y + ly, 24, 6);
            sfx.shatter();
          }
        },
      });
    }
  } // the lantern smashes and the oil burns out
  else if (e.btype === 'pz') {
    const [dx, dy] = side(30, 70);
    put(R.pz_pole, dx, dy, a + 1.9, 1.1, 0.4);
    later.push({
      t: 0.4,
      fn: () => {
        sfx.signClang(x + dx, y + dy);
      },
    });
  }
}
function bossDeathSfx(e) {
  const x = e.x,
    y = e.y;
  bossProps(e); // the last sound each one makes
  if (e.btype === 'pz') later.push({ t: 0.3, fn: () => sfx.flatline(x, y) });
  else if (e.btype === 'chief') later.push({ t: 0.6, fn: () => sfx.pass(x, y, 6) });
  else if (e.btype === 'grave') later.push({ t: 1.2, fn: () => sfx.bell(x, y) });
  else if (e.btype === 'roadkill') {
    const b = spat(x, y);
    tone(60, 2, 'sawtooth', 0.08, 0.3, 0, 300, b);
  } else {
    const b = spat(x, y);
    let t = 0,
      g = 0.03;
    while (t < 1.4) {
      tone(rand(1800, 2600), 0.012, 'square', 0.018, 1, t, 0, b);
      t += g;
      g *= 1.18;
    }
  } // the clicking slows and stops
}
function bossWarn(o) {
  warns.push(Object.assign({ t: 0, k: 'slam', owner: curBoss }, o));
}
function hitsP(x, y, r) {
  return state === 'play' && d2(x, y, P.x, P.y) < (r + P.r * 0.3) ** 2;
} // hit areas match what is drawn
const BOSS_HINT = {
  abom: 'Chitin in front · buckshot up close, or get round and shoot its tail',
  roadkill: 'The sign stops bullets · rifles punch through · enough fire knocks it loose · alarms bait it',
  grave: 'Spade guards the front · flank to the lantern on its left hip · roll out of the hook',
  chief: 'Fireproof · rifles, not buckshot · air tank on its back',
  pz: 'Shoot it as it breathes in · break line of sight · roll late when it bolts',
};
function bossHint(e) {
  // the hint follows the fight: once the sign, the lantern or the tank is gone, it says what to do next
  if (e.btype === 'roadkill' && !e.sign)
    return e.signAt
      ? 'Sign stuck in the road · shoot it apart before it gets it back, or hit its back as it pulls'
      : 'The sign is gone · nothing stops your rounds now · alarms still bait it';
  if (e.btype === 'grave' && !e.lant) return 'Lantern smashed · it burns now · fire hurts it double';
  if (e.btype === 'chief' && e.tankGone) return 'Air tank gone · its back is open · the gear is torn';
  return BOSS_HINT[e.btype] || '';
}
function bossPhaseText(e, ph) {
  const t = {
    abom: ['It lays eggs and charges · it leaps twice now', 'Three leaps · slip through the gaps in the bile'],
    roadkill: [
      'Here comes the sign · it turns and charges twice',
      'Every car it hits sets the next one screaming · three charges now',
    ],
    chief: ['It is calling its crew on the radio', 'It swings wild now'],
    grave: ['It tears up headstones · stay off fresh graves', 'Two slams now · the crack splits three ways'],
    pz: ['It leaves infection where it walks · it swings twice', 'Its scream wakes the whole town'],
  }[e.btype] || ['', ''];
  return t[ph - 1];
}
const STAGGERABLE = { move: 1, rear: 1, inhale: 1, gslam: 1, pswing: 1, chop: 1, brace: 1, crouch: 1, act: 1 };
function bossAct(e, name, wind, fn, o = {}) {
  // a wind-up the player can read (the body tells it), then the move happens; a stagger cancels it
  e.st = 'act';
  e.act = name;
  e.stT = wind;
  e.actFn = fn;
  e.actTick = o.tick || null;
  e.actFace = o.face;
  e.actRec = o.rec || 0;
  e.busyT = wind + (o.busy ?? 1.0);
  if (o.arm) {
    e.clawW = wind + 0.3;
    e.clawT = wind + 0.3;
  }
}
function pzScream(e, ph) {
  // only reaches you if it can see you: get behind a house or a car when it breathes in
  sfx.scream(e.x, e.y);
  sfx.roar(e.x, e.y);
  distort(e.x, e.y, 0.03, 0.9, 0.6);
  for (let i = 0; i < 4; i++)
    later.push({ t: i * 0.08, fn: () => ring(e.x, e.y, 14, 300 + i * 70, 0.6, [0.4, 0.38, 0.42], 0.5) });
  const d = Math.hypot(P.x - e.x, P.y - e.y),
    seen = d < 600 && los(e.x, e.y, P.x, P.y);
  if (state === 'play' && seen) {
    P.daze = Math.max(P.daze || 0, 1.8);
    chroma = Math.max(chroma, 0.012);
    hurtPlayer(10 * (1 + 0.04 * wave), e.x, e.y);
  } else if (state === 'play' && d < 700) floatText(P.x, P.y - 44, 'Out of sight', '#b8e0c8', 15);
  const R2 = ph >= 2 ? 1e12 : 700 * 700;
  for (const o of enemies)
    if (!o.dead && o !== e && d2(o.x, o.y, e.x, e.y) < R2) {
      o.frenzy = 3.5;
      o.aw = 9;
    }
  makeNoise(e.x, e.y, ph >= 2 ? 2600 : 1600);
}
function graveCrack(e, ga, ph, summon) {
  // the spade comes down: the ground splits along a line and the dead climb out of the graves it runs past
  const c = Math.cos(ga),
    s2 = Math.sin(ga),
    L = 300;
  sfx.boom(e.x, e.y);
  sfx.dig(e.x, e.y);
  shake(0.45);
  hitstop = Math.max(hitstop, 0.04);
  for (let d = 50; d <= L; d += 22) {
    const x = e.x + c * d + rand(-6, 6),
      y = e.y + s2 * d + rand(-6, 6);
    decal(R.hole, x, y, rand(0.7, 1.1), [1, 1, 1, 0.85], [0, 0, 0], 25);
    dust(x, y, 2, 40, 1, 0.8);
    chips(x, y, 2, [0.42, 0.34, 0.24], 4, 180);
  }
  {
    const px = P.x - e.x,
      py = P.y - e.y,
      along = px * c + py * s2,
      side = Math.abs(-px * s2 + py * c);
    if (state === 'play' && along > 30 && along < L + 20 && side < 30 + P.r * 0.3) hurtPlayer(e.dmg * 1.1, e.x, e.y);
  }
  if (summon) {
    let n = 0;
    const cap = 2 + ph;
    for (
      let ty = Math.floor((Math.min(e.y, e.y + s2 * L) - 80) / TILE);
      ty <= Math.floor((Math.max(e.y, e.y + s2 * L) + 80) / TILE) && n < cap;
      ty++
    )
      for (
        let tx = Math.floor((Math.min(e.x, e.x + c * L) - 80) / TILE);
        tx <= Math.floor((Math.max(e.x, e.x + c * L) + 80) / TILE) && n < cap;
        tx++
      ) {
        if (tx < 0 || ty < 0 || tx >= MW || ty >= MH || ttype[ty * MW + tx] !== 8) continue;
        const gx = (tx + 0.5) * TILE,
          gy = (ty + 0.5) * TILE + 22,
          px = gx - e.x,
          py = gy - e.y,
          al = px * c + py * s2,
          sd = Math.abs(-px * s2 + py * c);
        if (al < 20 || al > L + 40 || sd > 75) continue;
        if (enemies.length < 40) {
          const z = makeEnemy(Math.random() < 0.5 ? 'mini' : 'skitter', gx, gy);
          z.emerge = 0;
          z.aw = 9;
        }
        freshGraves.push({ x: gx, y: gy, used: false });
        decal(R.hole, gx, gy, 0.9, [0.55, 0.42, 0.3, 0.9], [0, 0, 0], 120);
        dust(gx, gy, 5, 60, 1, 0.8);
        n++;
      }
  } // the dead only climb out of real graves the crack runs past
}
function interruptBoss(e) {
  // every forced state change goes through here, so nothing an attack set up is left behind
  if (e.st === 'leap' || e.st === 'crouch') {
    if ((e.z || 0) > 1) {
      e.z = 0;
      bossSlam(e);
    }
    e.z = 0;
  }
  e.rushHit = false;
  e.chop2 = false;
  e.gs2 = false;
  e.gfan = false;
  e.ps2 = false;
  e.lc = 0;
  e.rc = 0;
  e.stuckT = 0;
  e.spin = 0;
  e.clawT = 0;
  e.claw = 0;
  e.wind = 0;
  e.atk = (e.atk || 0) + 1;
  e.actFn = null;
  e.actTick = null;
  keepIf(warns, w => w.owner !== e);
}
function breakLantern(e) {
  // glass and burning oil: it stands in flames, blind, and hunts by sound from here on
  e.lant = 0;
  const [lx, ly] = toWorld(e, -4, -39, e.sc || 1);
  firePool(lx, ly, 56, 3.2);
  ignite(e, 3);
  interruptBoss(e);
  e.st = 'move';
  e.stunT = Math.max(e.stunT || 0, 1.2);
  e.blindT = 8;
  e.hx2 = P.x;
  e.hy2 = P.y;
  for (let i = 0; i < 10; i++)
    part({
      k: 3,
      x: lx,
      y: ly,
      z: 30,
      vz: rand(40, 140),
      vx: rand(-80, 80),
      vy: rand(-80, 80),
      life: 1.4,
      max: 1.4,
      size: rand(0.25, 0.45),
      rot: rand(0, TAU),
      vr: rand(-12, 12),
      drag: 2,
      c: [0.9, 0.8, 0.5],
    });
  flashLight(lx, ly, 260, [1.6, 0.8, 0.3], 0.3);
  sfx.shatter();
  sfx.roar(e.x, e.y);
  shake(0.3);
  showStreak('Lantern smashed', 'It is blind · it hunts by sound now');
}
function tankHit(e, dmg, hx, hy) {
  e.tank -= dmg;
  if (Math.random() < 0.5) sparks(hx, hy, [1, 1, 0.95], 2, 160);
  if (thr('tankping', 90)) tone(rand(1700, 2100), 0.08, 'sine', 0.025, 0.97);
  if (e.tank <= 0) ruptureTank(e);
}
function ruptureTank(e) {
  // the Chief's air pack splits: a blast of air, it spins out of control, and its armour is done
  interruptBoss(e);
  e.tankGone = true;
  e.tank = 0;
  e.st = 'move';
  e.stunT = 2.4;
  e.spinT = 2.4;
  e.busyT = 2.8;
  const bx = e.x - Math.cos(e.a) * 30,
    by = e.y - Math.sin(e.a) * 30;
  ring(bx, by, 10, 150, 0.35, [1.6, 1.6, 1.6], 0.8);
  glowBurst(bx, by, [0.9, 0.9, 0.9], 20, 300, 0.5, 0.6);
  chips(bx, by, 12, [0.8, 0.8, 0.76], 3, 380);
  shake(0.5);
  hitstop = Math.max(hitstop, 0.06);
  noise(2.2, 0.22, 7000, 1800, 'highpass', 0, spat(bx, by));
  sfx.boom2(bx, by);
  sfx.roar(e.x, e.y);
  if (state === 'play' && d2(P.x, P.y, bx, by) < 120 * 120) {
    const a = Math.atan2(P.y - by, P.x - bx);
    P.vx += Math.cos(a) * 520;
    P.vy += Math.sin(a) * 520;
  }
  showStreak('Air pack ruptured', 'Its armour is done. Pour it on');
}
const WIND_ST = new Set(['act', 'crouch', 'rear', 'brace', 'gslam', 'chop', 'inhale', 'pswing']);
function bossAbom(dist, dt, e, lead, ph) {
  if (e.tailLimp > 0) e.tailLimp -= dt;
  e.hoseR =
    (e.hoseR || 0) +
    ((e.st === 'act' && (e.act === 'hosewind' || e.act === 'hose') ? 1 : 0) - (e.hoseR || 0)) * Math.min(1, dt * 7);
  if (e.leapT <= 0 && dist > 130 && dist < 760) {
    e.leapT = [7.5, 5.8, 4.4][ph] + rand(-0.6, 0.6);
    e.st = 'crouch';
    e.stT = 0.7;
    e.ldur = 0.8;
    e.busyT = 1.5 + 1.2;
    // it jumps for the street light nearest you when there is one: the lights go out as the fight goes on
    let [tx, ty] = lead(0.9);
    const L = lamps
      .filter(l => !l.down && !l.lantern && d2(l.bx, l.by, P.x, P.y) < 200 * 200)
      .sort((a, b) => d2(a.bx, a.by, P.x, P.y) - d2(b.bx, b.by, P.x, P.y))[0];
    if (L) {
      tx = lerp(tx, L.bx, 0.5);
      ty = lerp(ty, L.by, 0.5);
    }
    e.tx = clamp(tx, 3 * TILE + 40, WW - 3 * TILE - 40);
    e.ty = clamp(ty, 3 * TILE + 40, WH - 3 * TILE - 40);
    bossWarn({ x: e.tx, y: e.ty, r: 150, dur: e.stT + e.ldur, k: 'dust' });
    sfx.chitter(e.x, e.y, 0.7);
    /* where it will land, in the colour of the dust it throws up */ return;
  }
  if (ph >= 1 && e.chargeT <= 0 && e.los && dist > 160) {
    e.chargeT = [9, 7, 5][ph];
    e.st = 'rear';
    e.stT = 0.75;
    e.busyT = 0.75 + 0.95 + 1.2;
    e.lx = Math.cos(e.face);
    e.ly = Math.sin(e.face);
    sfx.roar(e.x, e.y);
    return;
  }
  if (ph >= 1 && e.k2T <= 0) {
    e.k2T = [0, 10, 8][ph];
    bossAct(
      e,
      'lay',
      0.7,
      () => {
        // two egg sacs glued to the ground near it: shoot them before they split
        for (let i = 0, n = 0; i < 12 && n < 2; i++) {
          const a = rand(0, TAU),
            d = rand(90, 170),
            x = e.x + Math.cos(a) * d,
            y = e.y + Math.sin(a) * d;
          if (solidPt(x, y) || x < 3 * TILE || y < 3 * TILE || x > WW - 3 * TILE || y > WH - 3 * TILE) continue;
          const g = makeEnemy('egg', x, y);
          g.emerge = 1;
          g.hatch = 6.5;
          n++;
          bleed(x, y, 10, 0, 0, 8, BILE, 120);
        }
        sfx.wet(e.x, e.y);
        sfx.chitter(e.x, e.y, 0.4);
      },
      { busy: 0.6 }
    );
    return;
  }
  if ((e.vlT = (e.vlT ?? 2.5) - dt) <= 0 && dist > 200 && dist < 620 && e.los) {
    e.vlT = [3.4, 2.8, 2.3][ph]; // it hacks up a fan of bile globs where you are heading: keep at range and it still reaches you
    bossAct(
      e,
      'volley',
      0.45,
      () => {
        const n = 5 + ph,
          [hx, hy] = toWorld(e, 70, 0, e.sc || 1),
          v = 400,
          [tx, ty] = lead(Math.hypot(P.x - hx, P.y - hy) / v),
          base = Math.atan2(ty - hy, tx - hx);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.13;
          ebullets.push({
            k: 'acid',
            x: hx,
            y: hy,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            r: 7,
            dmg: 6 * (1 + 0.04 * wave),
            life: 1.6,
            c: BILE,
            ghost: 0.2,
            owner: e,
          });
        }
        sfx.spit(e.x, e.y);
        sfx.retch(e.x, e.y);
      },
      { busy: 0.35 }
    );
    sfx.wet(e.x, e.y);
    return;
  }
  if (e.tailT <= 0 && dist < 560 && !(e.tailLimp > 0)) {
    e.tailT = [5.2, 4.3, 3.5][ph];
    const base = Math.atan2(P.y - e.y, P.x - e.x); // the acid hose: the tail rears over its back, gurgles, then hoses a sweeping arc of acid across the ground
    bossAct(
      e,
      'hosewind',
      0.6,
      () => {
        e.hoseA0 = base;
        e.hoseDir = Math.random() < 0.5 ? -1 : 1;
        e.hoseN = 0;
        bossAct(e, 'hose', ph >= 1 ? 2.2 : 1.3, null, {
          busy: 0.8,
          rec: 0.9,
          tick: dt2 => {
            const total = ph >= 1 ? 2.2 : 1.3,
              k = 1 - e.stT / total,
              sweep = ph >= 1 ? Math.sin(k * Math.PI * 2) : k * 2 - 1,
              a = e.hoseA0 + sweep * 0.8 * e.hoseDir;
            e.hoseNow = a;
            e.hoseAcc = (e.hoseAcc || 0) + dt2;
            e.hoseA0 += clamp(angDiff(e.hoseA0, Math.atan2(P.y - e.y, P.x - e.x)), -0.7 * dt2, 0.7 * dt2);
            const hd = Math.hypot(P.x - e.x, P.y - e.y);
            const tpp = queenTail(e),
              tip = tpp[tpp.length - 1],
              [mx0, my0] = toWorld(e, tip[0], tip[1], e.sc || 1);
            while (e.hoseAcc > 0.03) {
              e.hoseAcc -= 0.03;
              e.hoseN++;
              const [sx, sy] = [mx0 + Math.cos(a) * 12, my0 + Math.sin(a) * 12],
                /* out of the tail's mouth, reared over its back */ v = rand(400, 460),
                aa = a + rand(-0.04, 0.04);
              ebullets.push({
                k: 'acid',
                x: sx,
                y: sy,
                vx: Math.cos(aa) * v,
                vy: Math.sin(aa) * v,
                r: 6,
                dmg: 7 * (1 + 0.04 * wave),
                life: clamp((hd + rand(30, 110)) / v, 0.5, 1.45),
                c: BILE,
                ghost: 0.3,
                pool: e.hoseN % 5 === 0,
                hose: 1,
              });
            }
            if (Math.random() < 0.3) sfx.spit(e.x, e.y);
          },
        });
      },
      { busy: 0.2 }
    );
    sfx.retch(e.x, e.y);
    return;
  }
  return;
}
function bossRoadkill(dist, dt, e, lead, ph, spMul) {
  e.baitT = (e.baitT || 0) - dt;
  e.hugT = dist < 175 ? (e.hugT || 0) + dt : Math.max(0, (e.hugT || 0) - dt * 2);
  if (e.hugT > [1.1, 0.85, 0.65][ph] && time > (e.stompCd || 0)) {
    e.hugT = 0;
    e.stompCd = time + 3.2;
    const R0 = 195;
    bossWarn({ x: e.x, y: e.y, r: R0, dur: 0.6, k: 'slam', follow: e });
    sfx.windup(e.x, e.y); // stand under it and it stamps: the road heaves out to the edge of the ring
    bossAct(
      e,
      'stomp',
      0.6,
      () => {
        e.squash = 0.18;
        sfx.boom(e.x, e.y);
        sfx.crunch(e.x, e.y);
        shake(0.5);
        hitstop = Math.max(hitstop, 0.05);
        ring(e.x, e.y, 18, R0, 0.4, [1.5, 1.3, 1.0], 1.2);
        dust(e.x, e.y, 18, 200, 1.8, 1.4);
        chips(e.x, e.y, 14, null, 4, 380);
        decal(R.hole, e.x, e.y, 2.6, [1, 1, 1, 0.9], [0, 0, 0], 40);
        if (state === 'play' && d2(e.x, e.y, P.x, P.y) < (R0 + P.r * 0.3) ** 2) {
          const a = Math.atan2(P.y - e.y, P.x - e.x);
          hurtPlayer(e.dmg, e.x, e.y);
          P.vx += Math.cos(a) * 520;
          P.vy += Math.sin(a) * 520;
          P.daze = Math.max(P.daze || 0, 0.5);
        }
      },
      { busy: 0.4, rec: 0.7 }
    );
    return;
  }
  if (!e.sign && e.signAt && time - e.signAt.t > [9, 4, 3][ph]) {
    const sa = e.signAt,
      dS = Math.hypot(sa.x - e.x, sa.y - e.y),
      a = Math.atan2(sa.y - e.y, sa.x - e.x); // it goes back for its sign: pulling it out of the asphalt takes a moment, back to you
    if (dS < e.r + 55) {
      e.sgT = 0;
      e.recT = 1.6;
      bossAct(
        e,
        'pull',
        1.5,
        () => {
          if (!e.signAt) return;
          e.sign = true;
          e.signAt = null;
          e.thrCd = time + 7;
          chips(sa.x, sa.y, 10, [0.45, 0.45, 0.45], 4, 220);
          dust(sa.x, sa.y, 6, 60, 1, 0.8);
          sfx.signClang(e.x, e.y);
          sfx.roar(e.x, e.y);
          floatText(e.x, e.y - 110, 'It has the sign again', '#ffb070', 15);
        },
        { face: a, busy: 0.3 }
      );
      sfx.grunt(e.x, e.y);
      return;
    }
    if (dS < 1100 && (e.sgT = (e.sgT || 0) + dt) < 7) {
      e.face = a;
      e.tvx = Math.cos(a) * e.sp * 1.3 * spMul;
      e.tvy = Math.sin(a) * e.sp * 1.3 * spMul;
      return;
    }
    e.signAt = null;
  }
  const bait =
    e.baitT <= 0
      ? cars
          .filter(c => c.alarm > 0 && !c.dead && d2(c.x, c.y, e.x, e.y) < 950 * 950)
          .sort((a, b) => d2(a.x, a.y, e.x, e.y) - d2(b.x, b.y, e.x, e.y))[0]
      : null;
  if (bait) {
    e.baitT = 3;
    e.bait = bait;
    const a = Math.atan2(bait.y - e.y, bait.x - e.x);
    e.st = 'rear';
    e.stT = 0.75;
    e.busyT = 0.75 + 1.2 + 1.2;
    e.lx = Math.cos(a);
    e.ly = Math.sin(a);
    e.face = a;
    sfx.roar(e.x, e.y);
    sfx.signClang(e.x, e.y);
    return;
  } // a screaming car: it can't help itself
  if (ph >= 1 && e.sign && ((e.throws || 0) < 1 || (ph >= 2 && (e.throws || 0) < 3)) && time > (e.thrCd || 0)) {
    const base = Math.atan2(P.y - e.y, P.x - e.x);
    e.throws = (e.throws || 0) + 1;
    bossWarn({ lane: true, x: e.x, y: e.y, a: base, len: 560, w: 44, dur: 0.8, k: 'slam' }); // the STOP sign, thrown like a blade; it sticks in the road and the front armour goes with it
    bossAct(
      e,
      'signthrow',
      0.8,
      () => {
        e.sign = false;
        const [sx, sy] = toWorld(e, 40, 30);
        ebullets.push({
          k: 'sign',
          x: sx,
          y: sy,
          vx: Math.cos(base) * 680,
          vy: Math.sin(base) * 680,
          r: 22,
          dmg: e.dmg * 1.1,
          life: 0.82,
          c: [1, 0.3, 0.2],
          spin: 0,
          a: base,
          owner: e,
        });
        sfx.signClang(e.x, e.y);
        shake(0.15);
      },
      { face: base, busy: 0.7, rec: 1.0 }
    );
    sfx.windup(e.x, e.y);
    return;
  }
  if (e.chargeT <= 0 && e.los && dist > 160) {
    e.chargeT = [6, 4.8, 3.8][ph] * (e.signGone ? 0.6 : 1);
    e.st = 'rear';
    e.stT = 0.75;
    e.busyT = 0.75 + 0.95 + 1.2;
    e.lx = Math.cos(e.face);
    e.ly = Math.sin(e.face);
    e.bait = null;
    sfx.roar(e.x, e.y);
    sfx.signClang(e.x, e.y);
    return;
  }
  if (e.tailT <= 0 && dist > 150 && dist < 680) {
    e.tailT = [2.6, 2.2, 1.8][ph];
    const n = 2 + ph; // tyres, rolled underarm: they bounce off walls and cars
    bossAct(
      e,
      'tyre',
      0.45,
      () => {
        const side = Math.random() < 0.5 ? -1 : 1;
        for (let i = 0; i < n; i++) {
          const [sx, sy] = toWorld(e, 30, 34),
            v = 340 + i * 15,
            [lx, ly] = lead(Math.hypot(P.x - sx, P.y - sy) / v),
            a = Math.atan2(ly - sy, lx - sx) + (i === 0 ? 0 : (i % 2 ? side : -side) * 0.32 * Math.ceil(i / 2));
          ebullets.push({
            k: 'tire',
            x: sx,
            y: sy,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            r: 13,
            dmg: 14 * (1 + 0.04 * wave),
            life: 3.4,
            c: [0.3, 0.3, 0.3],
            bounces: 2,
            spin: 0,
            owner: e,
          });
        }
        sfx.tyre(e.x, e.y);
      },
      { arm: true, busy: 0.4 }
    );
    return;
  }
  return;
}
function bossGrave(dist, dt, e, lead, ph) {
  if (e.mortT <= 0 && dist < 420) {
    e.mortT = [7, 5.5, 4.2][ph];
    e.ga = e.face;
    e.st = 'gslam';
    e.stT = 0.85;
    e.busyT = 0.85 + 1.3;
    e.clawW = 0.85;
    e.clawT = 0.85;
    bossWarn({ lane: true, x: e.x, y: e.y, a: e.ga, len: 300, w: 46, dur: 0.85, k: 'dead' });
    if (ph >= 2) {
      e.gfan = true;
      for (const o of [-0.42, 0.42])
        bossWarn({ lane: true, x: e.x, y: e.y, a: e.ga + o, len: 300, w: 46, dur: 0.85, k: 'dead' });
    }
    sfx.bell(e.x, e.y);
    return;
  }
  if ((e.hkT = (e.hkT ?? 3) - dt) <= 0 && dist > 140 && dist < 290 && e.los) {
    e.hkT = [5.5, 4.5, 3.6][ph];
    const base = Math.atan2(P.y - e.y, P.x - e.x); // the hook: the spade blade thrust out low and dragged back, and you come with it into the swing
    bossWarn({ lane: true, x: e.x, y: e.y, a: base, len: 300, w: 40, dur: 0.55, k: 'dead' });
    sfx.windup(e.x, e.y);
    bossAct(
      e,
      'hook',
      0.55,
      () => {
        const c = Math.cos(base),
          s2 = Math.sin(base),
          px = P.x - e.x,
          py = P.y - e.y,
          along = px * c + py * s2,
          side = Math.abs(-px * s2 + py * c);
        sfx.dig(e.x + c * 200, e.y + s2 * 200);
        dust(e.x + c * 240, e.y + s2 * 240, 4, 50, 1, 0.7);
        if (state === 'play' && P.inv <= 0 && along > 30 && along < 310 && side < 22 + P.r * 0.3) {
          const pull = Math.max(0, along - 100),
            v = Math.sqrt(4800 * pull);
          P.vx = -c * v;
          P.vy = -s2 * v;
          P.daze = Math.max(P.daze || 0, 0.45);
          hurtPlayer(4 * (1 + 0.04 * wave), e.x + c * along, e.y + s2 * along, 'the Gravekeeper');
          P.vx = -c * v;
          P.vy = -s2 * v;
          P.inv = 0.12;
          e.recT = 0;
          e.clawT = 0;
          e.swingCd = 0;
          sfx.crunch(P.x, P.y);
          floatText(P.x, P.y - 44, 'Hooked · roll!', '#ffb070', 16);
        }
      },
      { face: base, busy: 0.25 }
    );
    return;
  }
  if (ph >= 1 && e.k2T <= 0 && dist > 140) {
    e.k2T = [0, 6.5, 5][ph]; // it rips a headstone out of the ground and throws it: the cover goes as the fight goes on
    let gi = -1,
      gd = 300 * 300;
    for (let ty = Math.floor((e.y - 300) / TILE); ty <= Math.floor((e.y + 300) / TILE); ty++)
      for (let tx = Math.floor((e.x - 300) / TILE); tx <= Math.floor((e.x + 300) / TILE); tx++) {
        if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
        const i = ty * MW + tx;
        if (ttype[i] !== 8) continue;
        const dd = d2((tx + 0.5) * TILE, (ty + 0.5) * TILE, e.x, e.y);
        if (dd < gd) {
          gd = dd;
          gi = i;
        }
      }
    if (gi >= 0) {
      const gx = ((gi % MW) + 0.5) * TILE,
        gy = (((gi / MW) | 0) + 0.5) * TILE,
        gk = Math.floor(hsh(gi % MW, (gi / MW) | 0) * 8) % 8;
      bossAct(
        e,
        'rip',
        0.65,
        () => {
          grid[gi] = 0;
          ttype[gi] = 0;
          flowTile = -1;
          chips(gx, gy, 10, [0.62, 0.6, 0.56], 4, 220);
          dust(gx, gy, 8, 70, 1.2, 1);
          sfx.crunch(gx, gy);
          decal(R.hole, gx, gy + 6, 1.1, [1, 1, 1, 0.85], [0, 0, 0], 60);
          const dur = 0.9,
            [tx, ty] = lead(dur * 0.85, 30);
          mortars.push({ x0: e.x, y0: e.y - 40, tx, ty, t: 0, dur, x: e.x, y: e.y, z: 0, slab: true, gk });
          bossWarn({ x: tx, y: ty, r: 60, dur, k: 'rock' });
          sfx.thump(e.x, e.y);
        },
        { face: Math.atan2(gy - e.y, gx - e.x), arm: true, busy: 0.6 }
      );
      return;
    }
    e.k2T = 2;
  }
  if (e.tailT <= 0 && dist > 110 && dist < 300) {
    e.tailT = [4.2, 3.4, 2.8][ph];
    const base = Math.atan2(P.y - e.y, P.x - e.x); // a spadeful of grave dirt flung in your face: a short cone, it stings and blinds
    bossAct(
      e,
      'shovel',
      0.5,
      () => {
        const R0 = 290,
          half = 0.5;
        for (let i = 0; i < 34; i++) {
          const a = base + rand(-half, half),
            v = rand(180, 420);
          part({
            k: 2,
            x: e.x + Math.cos(base) * 50,
            y: e.y + Math.sin(base) * 50,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: rand(0.5, 1.0),
            max: 1,
            size: rand(0.5, 0.9),
            grow: 1.4,
            drag: 3,
            rot: rand(0, TAU),
            vr: rand(-2, 2),
            c: [0.34, 0.27, 0.19],
          });
        }
        chips(e.x + Math.cos(base) * 50, e.y + Math.sin(base) * 50, 12, [0.36, 0.28, 0.2], 4, 380);
        sfx.dirt(e.x, e.y);
        const d = Math.hypot(P.x - e.x, P.y - e.y),
          da = Math.abs(angDiff(base, Math.atan2(P.y - e.y, P.x - e.x)));
        if (state === 'play' && d < R0 && da < half + 0.12) {
          hurtPlayer(11 * (1 + 0.04 * wave), e.x, e.y);
          P.daze = Math.max(P.daze || 0, 0.7);
        }
      },
      { face: base, arm: true, busy: 0.5 }
    );
    return;
  }
  return;
}
function bossChief(dist, dt, e, lead, ph) {
  if ((e.rushT -= dt) <= 0 && e.los && dist > 170 && dist < 520) {
    e.rushT = [4.2, 3.2, 2.4][ph];
    e.st = 'brace';
    e.stT = [0.45, 0.4, 0.35][ph];
    e.busyT = e.stT + 0.55 + 0.5;
    sfx.breath(e.x, e.y, true);
    return;
  }
  if (e.mortT <= 0 && dist < 330) {
    e.mortT = [5, 4, 3.2][ph];
    e.ga = e.face;
    e.st = 'chop';
    e.stT = [0.8, 0.7, 0.6][ph];
    e.busyT = e.stT + 1.4;
    bossWarn({ lane: true, x: e.x, y: e.y, a: e.ga, len: 300, w: 56, dur: e.stT, k: 'slam' });
    sfx.axeRing(e.x, e.y);
    return;
  }
  if (ph >= 1 && e.summonT <= 0) {
    e.summonT = [99, 12, 9][ph];
    sfx.radio(e.x, e.y);
    floatText(e.x, e.y - 90, 'Engine 4, respond…', '#ffb070', 14); // the crew: the dead of Engine 4 walk in from the dark a few seconds later
    later.push({
      t: 4,
      fn: () => {
        if (e.dead || state !== 'play') return;
        const [sx, sy] = spawnPoint(380, false);
        for (let i = 0; i < 2 + ph; i++) {
          const z = makeEnemy('skitter', sx + rand(-20, 20), sy + rand(-20, 20));
          z.v = z.hv = 5;
          z.fireproof = true;
          z.aw = 9;
        }
        dust(sx, sy, 7, 50, 1, 1);
      },
    });
  }
  if ((e.extT = (e.extT ?? 5) - dt) <= 0 && dist > 220) {
    e.extT = [6, 5, 4][ph];
    const n = 1 + ph;
    e.busyT = 0.35 * n + 0.9;
    e.clawW = 0.85;
    e.clawT = 0.85;
    for (let i = 0; i < n; i++)
      later.push({
        t: 0.35 + i * 0.35,
        fn: () => {
          if (e.dead || state !== 'play' || e.stunT > 0) return;
          const dur = 1.0,
            [tx, ty] = lead(dur * 0.85, i ? 150 : 0);
          mortars.push({ x0: e.x, y0: e.y - 40, tx, ty, t: 0, dur, x: e.x, y: e.y, z: 0, rock: true, ext: true });
          bossWarn({ x: tx, y: ty, r: 70, dur, k: 'rock' });
          sfx.thump(e.x, e.y);
        },
      });
    return;
  }
  if (e.tailT <= 0 && dist > 140) {
    e.tailT = [2.8, 2.3, 1.9][ph];
    const n = ph >= 2 ? 2 : 1;
    e.clawW = 0.75;
    e.clawT = Math.max(e.clawT, 0.75);
    sfx.flareLight(e.x, e.y); // road flares: struck, then lobbed where you're heading; the ground burns for a few seconds and it walks straight through
    later.push({
      t: 0.3,
      fn: () => {
        if (e.dead || state !== 'play' || e.stunT > 0) return;
        for (let i = 0; i < n; i++) {
          const [tx, ty] = lead(0.7, i ? 110 : 20);
          mortars.push({ x0: e.x, y0: e.y - 40, tx, ty, t: 0, dur: 0.75, x: e.x, y: e.y, z: 0, flare: true });
          bossWarn({ x: tx, y: ty, r: 46, dur: 0.75, k: 'rock' });
        }
        sfx.thump(e.x, e.y);
      },
    });
  }
  return;
}
function bossPz(dist, dt, e, lead, ph) {
  if (e.scrT <= 0) {
    e.scrT = [9, 7.5, 6][ph];
    e.st = 'inhale';
    e.stT = 1.3;
    e.busyT = 1.3 + 1.4;
    e.inhDmg = 0;
    sfx.inhale(e.x, e.y);
    return;
  }
  if (e.swT <= 0 && dist < 230) {
    e.swT = [6.5, 5, 4][ph];
    e.st = 'pswing';
    e.stT = 0.65;
    e.busyT = 0.65 + 1.4;
    bossWarn({ x: e.x, y: e.y, r: 135, dur: 0.65, k: 'slam', follow: e });
    sfx.poleWhoosh(e.x, e.y);
    return;
  }
  if (ph >= 1 && e.swT <= 0 && dist >= 230 && dist < 330) {
    e.swT = [6.5, 5, 4][ph];
    const base = Math.atan2(P.y - e.y, P.x - e.x);
    bossWarn({ lane: true, x: e.x, y: e.y, a: base, len: 290, w: 40, dur: 0.6, k: 'slam' }); // the IV pole as a spear
    bossAct(
      e,
      'spear',
      0.6,
      () => {
        const c = Math.cos(base),
          s2 = Math.sin(base),
          px = P.x - e.x,
          py = P.y - e.y,
          along = px * c + py * s2,
          side = Math.abs(-px * s2 + py * c);
        sfx.crunch(e.x + c * 200, e.y + s2 * 200);
        dust(e.x + c * 260, e.y + s2 * 260, 4, 60, 1, 0.7);
        if (state === 'play' && along > 20 && along < 300 && side < 26 + P.r * 0.3) {
          hurtPlayer(e.dmg * 1.2, e.x, e.y);
          P.vx += c * 480;
          P.vy += s2 * 480;
        }
      },
      { face: base, busy: 0.6, rec: 1.1 }
    );
    sfx.windup(e.x, e.y);
    return;
  }
  if ((e.spT = (e.spT ?? 7) - dt) <= 0 && dist > 200 && dist < 700 && e.los) {
    e.spT = [10, 8, 6.5][ph];
    const base = Math.atan2(P.y - e.y, P.x - e.x);
    sfx.flatline(e.x, e.y);
    bossWarn({ lane: true, x: e.x, y: e.y, a: base, len: 360, w: 60, dur: 0.75, k: 'slam' }); // the monitor flatlines and it bolts at you
    bossAct(
      e,
      'bolt',
      0.75,
      () => {
        e.st = 'sprint';
        e.stT = 1.5 + ph * 0.25;
        e.sa = Math.atan2(P.y - e.y, P.x - e.x);
        e.spPx = undefined;
        e.spSlow = 0;
        e.busyT = e.stT + 1.2;
        sfx.roar(e.x, e.y);
        shake(0.2);
      },
      { face: base, busy: 2.4 }
    );
    return;
  }
  if (e.k2T <= 0 && dist < 240) {
    e.k2T = [6, 5, 4][ph];
    const base = Math.atan2(P.y - e.y, P.x - e.x); // a heave of black bile on the ground in front of it
    bossAct(
      e,
      'retch',
      0.6,
      () => {
        for (let i = 0; i < 4; i++) {
          const d = 60 + i * 50,
            a = base + rand(-0.25, 0.25);
          pools.push({
            x: e.x + Math.cos(a) * d,
            y: e.y + Math.sin(a) * d,
            r: 36,
            life: 5,
            max: 5,
            dmg: 6 * (1 + 0.04 * wave),
            rot: rand(0, TAU),
            v: randi(0, 3),
          });
        }
        bleed(e.x + Math.cos(base) * 40, e.y + Math.sin(base) * 40, 20, Math.cos(base), Math.sin(base), 24, BILE, 320);
        sfx.retch(e.x, e.y);
      },
      { face: base, busy: 0.6, rec: 0.6 }
    );
    return;
  }
  if (e.tailT <= 0 && dist > 180 && dist < 720) {
    e.tailT = [4.5, 3.8, 3.2][ph]; // it grabs one of the dead and throws it at you
    let z = null,
      zd = 220 * 220;
    for (const o of enemies)
      if (!o.dead && (o.type === 'skitter' || o.type === 'mini') && !o.big && o.emerge >= 1) {
        const dd = d2(o.x, o.y, e.x, e.y);
        if (dd < zd) {
          zd = dd;
          z = o;
        }
      }
    const look = z
      ? { v: z.v, hv: z.hv, sk: z.sk }
      : { v: randi(0, 2), hv: randi(0, 2), sk: randi(0, ZSKIN.length - 1) };
    if (z) {
      z.dead = true;
      dust(z.x, z.y, 4, 40, 1, 0.6);
    } else {
      dust(e.x + 40, e.y, 6, 50, 1, 0.8);
      chips(e.x + 40, e.y, 6, null, 4, 140);
    }
    bossAct(
      e,
      'grab',
      0.55,
      () => {
        const dur = 0.85,
          [tx, ty] = lead(dur * 0.85, 25);
        mortars.push({ x0: e.x, y0: e.y - 40, tx, ty, t: 0, dur, x: e.x, y: e.y, z: 0, walker: look });
        bossWarn({ x: tx, y: ty, r: 55, dur, k: 'rock' });
        sfx.thump(e.x, e.y);
      },
      { arm: true, busy: 0.5 }
    );
    return;
  }
  return;
}
function bossCharge(G, bt, dt, e, ph) {
  if (bt === 'roadkill') {
    // Route 9's boss runs straight through parked cars: the car is wrecked and set alight, glass and metal fly forward, and it reels
    const fx = e.x + e.lx * e.r * 0.9,
      fy = e.y + e.ly * e.r * 0.9,
      tx = Math.floor(fx / TILE),
      ty = Math.floor(fy / TILE);
    if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && ttype[ty * MW + tx] === 6) {
      const ci = carAt[ty * MW + tx],
        car = ci >= 0 ? cars[ci] : null;
      if (car && !car.dead && e.bait && car !== e.bait && !e.bait.dead) {
        if (car.plowed !== e.id) {
          car.plowed = e.id;
          damageCar(car, car.max * 0.5);
          car.jvx = (car.jvx || 0) - e.ly * 220;
          car.jvy = (car.jvy || 0) + e.lx * 220;
          car.jva = (car.jva || 0) + rand(-0.6, 0.6);
          sparks(fx, fy, [1, 0.9, 0.6], 18, 380);
          sfx.crunch(fx, fy);
          shake(0.3);
        }
      } // on its way to the screaming car it shoulders everything else aside
      else if (car && !car.dead) {
        damageCar(car, car.max * 0.75);
        car.jvx = (car.jvx || 0) + e.lx * 160;
        car.jvy = (car.jvy || 0) + e.ly * 160;
        car.jva = (car.jva || 0) + rand(-0.3, 0.3);
        sparks(fx, fy, [1, 0.9, 0.6], 26, 420);
        chips(fx, fy, 16, [0.75, 0.85, 0.9], 3, 380);
        shake(0.55);
        hitstop = Math.max(hitstop, 0.05);
        sfx.crunch(fx, fy);
        sfx.boom(fx, fy);
        for (let i = 0; i < 14; i++)
          part({
            k: 3,
            x: fx,
            y: fy,
            z: 14,
            vz: rand(40, 160),
            vx: e.lx * rand(80, 260) + rand(-90, 90),
            vy: e.ly * rand(80, 260) + rand(-90, 90),
            life: 1.6,
            max: 1.6,
            size: rand(0.25, 0.5),
            rot: rand(0, TAU),
            vr: rand(-14, 14),
            drag: 2.5,
            c: [0.75, 0.85, 0.9],
          });
        sfx.shatter();
        const ph2 = e.ph || 0,
          baited = e.bait === car;
        e.bait = null;
        if (ph2 >= 1)
          for (const c2 of cars)
            if (c2 !== car && !c2.dead && c2.hasAlarm && !c2.alarmUsed && d2(c2.x, c2.y, car.x, car.y) < 320 * 320)
              startAlarm(c2);
        if (ph2 >= 2 && !car.dead) car.fire = 1; // the crash sets the neighbours screaming; in the last phase the wreck catches
        if (ph2 >= 2 && (e.chain || 0) < 2) {
          const nx = cars.filter(
            c2 => c2 !== car && c2.alarm > 0 && !c2.dead && d2(c2.x, c2.y, e.x, e.y) < 700 * 700
          )[0];
          if (nx) {
            e.chain = (e.chain || 0) + 1;
            const a = Math.atan2(nx.y - e.y, nx.x - e.x);
            e.bait = nx;
            e.st = 'rear';
            e.stT = 0.6;
            e.lx = Math.cos(a);
            e.ly = Math.sin(a);
            e.busyT = 2.5;
            sfx.roar(e.x, e.y);
            return;
          }
        }
        e.chain = 0;
        e.st = 'move';
        e.stunT = (baited ? 2.6 : 1.6) + (e.signGone ? 1 : 0);
        e.turnT = 1;
        e.vx = e.vy = 0;
        if (baited) showStreak('Pinned', 'It is stuck in the wreck · get behind it');
        return;
      }
    }
  }
  e.stT -= dt;
  const csp = bt === 'roadkill' ? 760 : bt === 'chief' ? 560 : 620;
  e.tvx = e.lx * csp;
  e.tvy = e.ly * csp;
  e.vx = e.tvx;
  e.vy = e.tvy;
  e.face = Math.atan2(e.ly, e.lx);
  if (Math.random() < 0.6) dust(e.x, e.y, 1, 40, 1.2, 0.8);
  if (!G && Math.random() < 0.3) bleed(e.x, e.y, 10, -e.lx, -e.ly, 1, BLOOD, 80);
  if (bt === 'roadkill' && e.sign && Math.random() < 0.5)
    sparks(e.x + e.lx * 95, e.y + e.ly * 95, [1, 0.85, 0.5], 2, 160); // the sign out in front, its edge scraping the asphalt
  const edge =
    (e.x < 3 * TILE + e.r && e.lx < 0) ||
    (e.x > WW - 3 * TILE - e.r && e.lx > 0) ||
    (e.y < 3 * TILE + e.r && e.ly < 0) ||
    (e.y > WH - 3 * TILE - e.r && e.ly > 0); // only running out of the map ends it, not starting near the edge
  if (e.stT <= 0 && !edge && (e.rc || 0) < (bt === 'roadkill' ? ph : ph - 1) && e.los) {
    e.rc = (e.rc || 0) + 1;
    const a = Math.atan2(P.y - e.y, P.x - e.x);
    e.st = 'rear';
    e.stT = 0.5;
    e.lx = Math.cos(a);
    e.ly = Math.sin(a);
    e.busyT = 0.5 + 0.95 + 1.2;
    e.vx *= 0.2;
    e.vy *= 0.2;
    shake(0.2);
    dust(e.x, e.y, 6, 70, 1.2, 0.8);
    sfx.roar(e.x, e.y);
    return;
  } // it digs in, turns and comes again: the second dodge is the test
  if (e.stT <= 0 || edge) {
    e.rc = 0;
    e.st = 'move';
    shake(0.3);
    e.recT = 1.2;
    e.turnT = 0.8;
    if (edge && bt === 'roadkill') {
      e.stunT = 1.2;
    }
  }
  crushCrystals(e.x, e.y, e.r);
  return;
}
function bossLeap(dist, dt, e, ph) {
  e.stT -= dt;
  const t = 1 - Math.max(0, e.stT) / e.ldur,
    k = t * t * (3 - 2 * t),
    nx = lerp(e.sx, e.tx, k),
    ny = lerp(e.sy, e.ty, k);
  e.tvx = (nx - e.x) / Math.max(dt, 1e-4);
  e.tvy = (ny - e.y) / Math.max(dt, 1e-4);
  e.vx = e.tvx;
  e.vy = e.tvy;
  e.z = Math.sin(t * Math.PI) * 170;
  e.face = Math.atan2(e.ty - e.sy, e.tx - e.sx);
  if (e.stT <= 0) {
    e.z = 0;
    e.st = 'move';
    e.vx = e.vy = e.tvx = e.tvy = 0;
    bossSlam(e);
    e.recT = 1.2;
    {
      const n = 14 + ph * 3,
        off = rand(0, TAU);
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * TAU,
          v = 290;
        ebullets.push({
          k: 'acid',
          x: e.x + Math.cos(a) * 60,
          y: e.y + Math.sin(a) * 60,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          r: 7,
          dmg: 6 * (1 + 0.04 * wave),
          life: 0.85,
          c: BILE,
          ghost: 0.25,
          owner: e,
        });
      }
      sfx.wet(e.x, e.y);
    } // the landing bursts the sacs under it: a ring of bile runs out across the road, with gaps to slip through
    if ((e.lc || 0) < ph && dist < 800) {
      e.lc = (e.lc || 0) + 1;
      e.recT = 0;
      const [tx, ty] = [P.x + P.vx * 0.3, P.y + P.vy * 0.3];
      e.tx = clamp(tx, 3 * TILE + 40, WW - 3 * TILE - 40);
      e.ty = clamp(ty, 3 * TILE + 40, WH - 3 * TILE - 40);
      e.st = 'crouch';
      e.stT = 0.5;
      e.ldur = 0.75;
      e.busyT = 0.5 + 0.75 + 1.2;
      bossWarn({ x: e.tx, y: e.ty, r: 150, dur: e.stT + e.ldur, k: 'dust', owner: e });
      sfx.chitter(e.x, e.y, 0.7);
    } else e.lc = 0;
  } // hurt, it jumps again before you have settled
  return;
}
function bossChop(dt, e, ph) {
  e.stT -= dt;
  e.face = e.ga;
  if (e.stT <= 0) {
    e.st = 'move';
    e.recT = 1.4;
    e.stuckT = 1.1;
    const c = Math.cos(e.ga),
      s2 = Math.sin(e.ga),
      L = 300;
    for (const car of cars) {
      if (car.dead) continue;
      const px = car.x - e.x,
        py = car.y - e.y,
        al = px * c + py * s2,
        sd = Math.abs(-px * s2 + py * c);
      if (al > 0 && al < L + 30 && sd < 40) {
        damageCar(car, car.max * 0.45);
        sparks(car.x, car.y, [1, 0.9, 0.6], 14, 300);
        car.jvx = (car.jvx || 0) + c * 80;
        car.jvy = (car.jvy || 0) + s2 * 80;
      }
    } // forcible entry: the axe goes through fences and car doors
    {
      const px = P.x - e.x,
        py = P.y - e.y,
        along = px * c + py * s2,
        side = Math.abs(-px * s2 + py * c);
      if (state === 'play' && along > 20 && along < L + 20 && side < 28 + P.r * 0.3) hurtPlayer(e.dmg * 1.05, e.x, e.y);
    }
  }
  return;
}
function bossSprint(dt, e, ph) {
  e.stT -= dt;
  const want = Math.atan2(P.y - e.y, P.x - e.x),
    tr = [1.8, 2.1, 2.4][ph],
    v = 470 + ph * 40;
  e.sa += clamp(angDiff(e.sa, want), -tr * dt, tr * dt);
  e.face = e.sa;
  e.tvx = e.vx = Math.cos(e.sa) * v;
  e.tvy = e.vy = Math.sin(e.sa) * v;
  if (Math.random() < 0.6) dust(e.x, e.y, 1, 40, 1.2, 0.7);
  if (Math.random() < 0.25 && pools.length < 40) bleed(e.x, e.y, 6, -Math.cos(e.sa), -Math.sin(e.sa), 2, BILE, 60); // the bolt: it runs you down, turning as it goes; roll late and it can't turn in time
  if (state === 'play' && P.inv <= 0 && hitsP(e.x + Math.cos(e.sa) * 30, e.y + Math.sin(e.sa) * 30, e.r * 0.85)) {
    hurtPlayer(e.dmg * 1.1, e.x, e.y);
    P.vx += Math.cos(e.sa) * 560;
    P.vy += Math.sin(e.sa) * 560;
    shake(0.35);
    sfx.crunch(P.x, P.y);
    e.st = 'move';
    e.recT = 0.8;
    e.turnT = 0.6;
    e.vx *= 0.3;
    e.vy *= 0.3;
    return;
  }
  const spd = e.spPx !== undefined ? Math.hypot(e.x - e.spPx, e.y - e.spPy) / Math.max(dt, 1e-4) : v;
  e.spPx = e.x;
  e.spPy = e.y;
  e.spSlow = spd < v * 0.35 ? (e.spSlow || 0) + dt : 0;
  if (e.spSlow > 0.12) {
    e.st = 'move';
    e.spPx = undefined;
    e.stunT = 1.8;
    e.vx = e.vy = 0;
    shake(0.45);
    sfx.crunch(e.x, e.y);
    sfx.boom2(e.x, e.y);
    chips(e.x + Math.cos(e.sa) * 40, e.y + Math.sin(e.sa) * 40, 12, null, 4, 300);
    showStreak('It hit the wall', 'Its back is open');
    return;
  } // run it into a wall or a car and it reels
  if (Math.abs(angDiff(e.sa, want)) > 1.6 && Math.hypot(P.x - e.x, P.y - e.y) < 300) {
    e.st = 'move';
    e.spPx = undefined;
    e.stunT = 1.3;
    e.vx *= 0.3;
    e.vy *= 0.3;
    dust(e.x, e.y, 8, 80, 1.2, 1);
    sfx.grunt(e.x, e.y, true);
    if (!e.overranOnce) {
      e.overranOnce = true;
      showStreak('It overran you', 'Its back is open');
    } else floatText(e.x, e.y - 110, 'Overran', '#ffcf3a', 15);
    return;
  }
  if (e.stT <= 0) {
    e.st = 'move';
    e.spPx = undefined;
    e.recT = 0.9;
    e.vx *= 0.3;
    e.vy *= 0.3;
  }
  return;
}
