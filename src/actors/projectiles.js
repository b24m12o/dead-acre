/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
function shellBoom(x, y, R0, dmg, main) {
  if (boss && boss.signAt && d2(x, y, boss.signAt.x, boss.signAt.y) < (R0 + 20) ** 2) hitSign(boss, dmg * 1.5);
  sfx.boom2(x, y);
  shake((main ? 0.14 : 0.05) * (P ? clamp(1.25 - Math.hypot(x - P.x, y - P.y) / 600, 0.2, 1) : 1));
  distort(x, y, main ? 0.02 : 0.01, 0.8, 0.35);
  flashLight(x, y, R0 * 2.6, [2.2, 1.2, 0.8], 0.3);
  glowBurst(x, y, [1, 0.5, 0.6], main ? 22 : 10, R0 * 4, 0.45, 0.7);
  sparks(x, y, [1, 0.8, 0.5], main ? 16 : 8, R0 * 5);
  dust(x, y, main ? 8 : 4, R0, 1.3, 1.2);
  decal(R.scorch, x, y, R0 / 60, [1, 1, 1, 0.75], [0, 0, 0], 20);
  ring(x, y, 8, R0, 0.28, [2.4, 1.2, 1.4], 1);
  query(x, y, R0 + 70, e => {
    if (e.dead) return;
    const dd = Math.sqrt(d2(x, y, e.x, e.y));
    if (dd < R0 + e.r) {
      const crit = Math.random() < S.crit;
      hurtEnemy(e, dmg * (crit ? 2.5 : 1) * (1 - 0.35 * Math.min(1, dd / R0)), crit, e.x - x, e.y - y, 1.6, 'shell');
      if (S.evo.stun && !e.dead) e.slowT = Math.max(e.slowT || 0, 0.8);
    }
  });
  for (const b of barrels)
    if (!b.dead && d2(x, y, b.x, b.y) < (R0 + 10) ** 2) {
      b.hp = 0;
      later.push({ t: 0.1, fn: () => blowBarrel(b) });
    }
  for (const c of crystals) if (c.alive && d2(x, y, c.x, c.y) < (R0 + 16) ** 2) hitCrystal(c, dmg, c.x - x, c.y - y);
  if (main && S.bomblets)
    for (let i = 0; i < S.bomblets; i++) {
      const a = rand(0, TAU),
        d = rand(50, 90),
        bx = x + Math.cos(a) * d,
        by = y + Math.sin(a) * d;
      pbullets.push({
        shell: true,
        mini: true,
        x0: x,
        y0: y,
        x,
        y,
        tx: bx,
        ty: by,
        t: -0.05,
        dur: 0.32,
        z: 0,
        vx: 0,
        vy: 0,
        life: 9,
        dmg: dmg * 0.4,
        hits: [],
        spin: 0,
      });
    }
}
function pumpDrop(e, b) {
  // the pump at close range: four pellets of one shell into one body and it goes down
  if (
    e.dead ||
    e.type === 'queen' ||
    e.big ||
    e.type === 'beetle' ||
    e.type === 'egg' ||
    e.trait === 'armored' ||
    e.shield ||
    !HUMAN[e.type]
  )
    return;
  if (e.pSid !== b.sid) {
    e.pSid = b.sid;
    e.pN = 0;
  }
  if (++e.pN !== 4 || e.down > 0 || e.crawl || e.hp <= 0) return;
  e.dT = DOWN_T * rand(1, 1.3);
  e.down = e.dT;
  e.fallA = lyAngle(e.x, e.y, Math.atan2(b.vy, b.vx) + rand(-0.3, 0.3), 100);
  e.sup = supOK(e) && Math.random() < 0.75;
  e.splay = rand(0.2, 1);
  e.apose = randi(0, 3);
  e.lyG = 0;
  e.kx += b.vx * 0.12;
  e.ky += b.vy * 0.12;
}
function fragBurst(x, y, b, skipId) {
  const R0 = (34 + S.frag * 14) * (b.pellet ? 0.6 : 1);
  glowBurst(x, y, [0.5, 1, 1], 6, 180, 0.25, 0.4);
  ring(x, y, 4, R0, 0.18, [0.8, 1.8, 1.8], 0.6);
  query(x, y, R0 + 30, e => {
    if (!e.dead && e.id !== skipId && d2(x, y, e.x, e.y) < (R0 + e.r) ** 2)
      hurtEnemy(e, b.dmg * (0.12 + 0.16 * S.frag) * (b.pellet ? 0.5 : 1), false, e.x - x, e.y - y, 0.4, 'frag');
  });
}
function queenTail(e) {
  const pts = [];
  let x = -80,
    y = 0,
    a = Math.PI;
  const sway = Math.sin(time * 1.4) * 0.22,
    r = e.hoseR || 0;
  for (let i = 0; i < 4; i++) {
    pts.push([x, y]);
    a += sway * (i / 3) + 0.08;
    x += Math.cos(a) * 24;
    y += Math.sin(a) * 24;
  }
  pts.push([x, y]);
  if (r > 0.001)
    for (let i = 0; i < pts.length; i++) {
      const t = i / (pts.length - 1),
        ax = -80 + 118 * t,
        ay = Math.sin(t * Math.PI) * 10 * (e.hoseDir || 1);
      pts[i] = [lerp(pts[i][0], ax, r), lerp(pts[i][1], ay, r)];
    } // rearing to hose: the tail arcs up over its back so the mouth hangs above its shoulders
  return pts;
}
function toWorld(e, lx, ly, sc = 1) {
  const c = Math.cos(e.a),
    s = Math.sin(e.a);
  return [e.x + (lx * c - ly * s) * sc, e.y + (lx * s + ly * c) * sc];
}
function tireProj(b, dt, p) {
  // a tyre rolled underarm: it runs upright, slows on the asphalt, wobbles more as it slows, tips over and lies there
  if (!(b.flat > 0)) {
    const f = Math.exp(-0.22 * dt);
    b.vx *= f;
    b.vy *= f;
    const ox = b.x,
      oy = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    const sp = Math.hypot(b.vx, b.vy);
    b.ph = b.ph ?? rand(0, TAU);
    b.spin = (b.spin || 0) + (dt * sp) / 13;
    b.lean = Math.sin(time * 5 + b.ph) * 0.1 * (1.6 - Math.min(1, sp / 340));
    if (solidPt(b.x, b.y)) {
      b.x = ox;
      b.y = oy;
      if (b.bounces > 0 && sp > 150) {
        b.bounces--;
        if (solidPt(ox + b.vx * dt, oy)) b.vx = -b.vx * 0.5;
        else b.vy = -b.vy * 0.5;
        b.vx *= 0.8;
        b.vy *= 0.8;
        dust(b.x, b.y, 2, 40, 0.6, 0.5);
        sfx.thump(b.x, b.y);
      } else {
        b.flat = 1e-4;
        b.vx *= 0.2;
        b.vy *= 0.2;
      }
    }
    if (!(b.flat > 0) && (sp < 115 || b.life <= 0)) b.flat = 1e-4; // too slow to stay up
    if (Math.random() < dt * 8) dust(b.x, b.y, 1, 20, 0.5, 0.4);
    if (!(b.flat > 0) && d2(b.x, b.y, p.x, p.y) < (b.r + p.r - 3) ** 2 && p.inv <= 0) {
      hurtPlayer(b.dmg, b.x, b.y, b.owner && b.owner.type === 'queen' ? bossOf(b.owner) : 'a tyre');
      const l = Math.hypot(b.vx, b.vy) || 1;
      p.vx += (b.vx / l) * 320;
      p.vy += (b.vy / l) * 320;
      const s2 = Math.random() < 0.5 ? -1 : 1;
      b.vx = b.vx * 0.3 - b.vy * 0.25 * s2;
      b.vy = b.vy * 0.3 + b.vx * 0.25 * s2;
      b.flat = 1e-4;
    } // it glances off you and goes down
    if (b.flat > 0) {
      b.fa = Math.atan2(b.vy, b.vx);
      b.life = 9;
    }
    return;
  }
  b.flat += dt;
  const f = Math.exp(-(b.flat < 0.35 ? 3 : 9) * dt);
  b.vx *= f;
  b.vy *= f;
  const nx = b.x + b.vx * dt,
    ny = b.y + b.vy * dt;
  if (!solidPt(nx, ny)) {
    b.x = nx;
    b.y = ny;
  }
  if (b.flat >= 0.35 && !b.down) {
    b.down = 1;
    sfx.thump(b.x, b.y);
    dust(b.x, b.y, 4, 50, 0.9, 0.7);
  } // the slap as it lands flat
  if (b.flat > 2.2) {
    decal(R.p_tire, b.x, b.y, 1.9, [0.8, 0.8, 0.8, 1], [0, 0, 0], 300);
    b.life = 0;
  } // and it stays in the road
}
const SIGN_HP = () => 90 + 30 * wave; // the STOP sign stuck in the road takes this much shooting to break
function signKnocked(e) {
  e.sign = false;
  const [sx, sy] = toWorld(e, 80, rand(-50, 50)),
    a = rand(0, TAU);
  e.signAt = { x: sx, y: sy, a, t: time, hp: SIGN_HP(), max: SIGN_HP() };
  chips(sx, sy, 10, [0.6, 0.6, 0.6], 4, 260);
  sparks(sx, sy, [1, 0.85, 0.5], 14, 320);
  sfx.signClang(sx, sy);
  shake(0.15);
  interruptBoss(e);
  e.st = 'move';
  e.stunT = Math.max(e.stunT || 0, 0.9);
  showStreak('Sign knocked loose', 'Shoot it apart before it gets it back');
}
function hitSign(e, dmg, x, y) {
  const sa = e.signAt;
  if (!sa) return;
  sa.hp -= dmg;
  sparks(x ?? sa.x, y ?? sa.y, [1, 0.85, 0.5], 2, 200);
  if (thr('signHit', 90)) playS('dry', 0.1, 1.6 + rand(0, 0.3), 0, 0.1);
  if (sa.hp <= 0) {
    e.signAt = null;
    e.signGone = true;
    e.chargeT = Math.min(e.chargeT || 0, 1.5);
    chips(sa.x, sa.y, 18, [0.75, 0.2, 0.18], 4, 340);
    chips(sa.x, sa.y, 10, [0.8, 0.8, 0.8], 4, 300);
    sfx.signClang(sa.x, sa.y);
    sfx.crunch(sa.x, sa.y);
    const d = decal(R.rk_sign, sa.x, sa.y, 0.6, [0.45, 0.42, 0.4, 1], [0, 0, 0], 900);
    if (d) d.rot = sa.a;
    sfx.roar(e.x, e.y);
    showStreak('Sign destroyed', 'It charges blind now · stand in front of a car');
  }
}
function tailHit(e, b, tx, ty) {
  HITB = b;
  try {
    hurtEnemy(e, b.dmg, true, b.vx, b.vy, 0.3, 'bolt', tx, ty);
  } finally {
    HITB = null;
  }
  b.hits.push(e.id);
  b.life = 0;
  bleed(tx, ty, 10, b.vx, b.vy, 4, BILE, 160);
  if (!(e.tailLimp > 0)) {
    e.tailDmg = (e.tailDmg || 0) + b.dmg;
    if (e.tailDmg > e.maxHp * 0.05) {
      e.tailDmg = 0;
      e.tailLimp = 7;
      e.hoseR = 0;
      if (e.st === 'act' && (e.act === 'hose' || e.act === 'hosewind')) {
        interruptBoss(e);
        e.st = 'move';
      }
      sfx.roar(e.x, e.y);
      sfx.wet(tx, ty);
      bleed(tx, ty, 26, b.vx, b.vy, 12, BILE, 260);
      showStreak('Tail crippled', 'No acid hose for a while · keep on its back');
    }
  }
}
function bossProj(b, dt, p) {
  // the bosses' own thrown things: tyres that roll and bounce, the sign that flies flat and sticks in the road
  if (b.k === 'tire') return tireProj(b, dt, p);
  const ox = b.x,
    oy = b.y;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.life -= dt;
  b.spin = (b.spin || 0) + dt * (b.k === 'sign' ? 22 : Math.hypot(b.vx, b.vy) / 13);
  if (solidPt(b.x, b.y)) {
    if (b.k === 'tire' && b.bounces > 0) {
      b.bounces--;
      if (solidPt(ox, b.y)) b.vy = -b.vy * 0.85;
      else b.vx = -b.vx * 0.85;
      b.x = ox;
      b.y = oy;
      dust(b.x, b.y, 2, 40, 0.6, 0.5);
      sfx.thump(b.x, b.y);
    } else b.life = 0;
  }
  if (b.k === 'tire' && Math.random() < dt * 8) dust(b.x, b.y, 1, 20, 0.5, 0.4);
  if (b.k === 'sign' && Math.random() < dt * 30) sparks(b.x, b.y, [1, 0.85, 0.5], 1, 120);
  if (b.life <= 0) {
    if (b.k === 'sign') {
      if (b.owner && !b.owner.dead && b.owner === boss)
        b.owner.signAt = { x: b.x, y: b.y, a: (b.a || 0) + (b.spin || 0), t: time, hp: SIGN_HP(), max: SIGN_HP() };
      else decal(R.rk_sign, b.x, b.y, 1.05, [0.9, 0.9, 0.9, 1], [0, 0, 0], 600);
      chips(b.x, b.y, 8, [0.5, 0.5, 0.5], 4, 200);
      dust(b.x, b.y, 6, 60, 1, 0.8);
      sfx.signClang(b.x, b.y);
      shake(0.15);
    } else {
      dust(b.x, b.y, 3, 40, 0.8, 0.6);
    }
    return;
  }
  if (d2(b.x, b.y, p.x, p.y) < (b.r + p.r - 3) ** 2 && p.inv <= 0) {
    hurtPlayer(
      b.dmg,
      b.x,
      b.y,
      b.owner && b.owner.type === 'queen' ? bossOf(b.owner) : b.hose ? 'the Abomination' : 'spitter acid'
    );
    const l = Math.hypot(b.vx, b.vy) || 1;
    p.vx += (b.vx / l) * 380;
    p.vy += (b.vy / l) * 380;
    if (b.k === 'tire') {
      b.vx *= -0.5;
      b.vy *= -0.5;
      b.bounces = 0;
    }
  }
}
function bossSlam(e) {
  const R0 = 150;
  for (const L of lamps)
    if (!L.down && !L.lantern && d2(L.bx, L.by, e.x, e.y) < 230 * 230) {
      L.down = true;
      L.fa = Math.atan2(L.by - e.y, L.bx - e.x) + rand(-0.3, 0.3);
      sparks(L.hx, L.hy, [1, 0.9, 0.6], 14, 300);
      flashLight(L.hx, L.hy, 200, [1.4, 1.2, 0.8], 0.15);
    }
  /* it lands on the light: the street goes darker */ sfx.boom(e.x, e.y);
  sfx.gib(e.x, e.y);
  shake(0.7);
  hitstop = Math.max(hitstop, 0.06);
  distort(e.x, e.y, 0.06, 1.1, 0.6);
  ring(e.x, e.y, 20, R0 * 1.2, 0.45, [1.6, 1.38, 1.1], 1.4);
  dust(e.x, e.y, 22, 220, 2, 1.6);
  chips(e.x, e.y, 22, null, 4, 460);
  decal(R.hole, e.x, e.y, 3.6, [1, 1, 1, 0.95], [0, 0, 0], 40);
  flashLight(e.x, e.y, 420, [1.4, 0.4, 0.2], 0.35);
  if (state === 'play' && d2(e.x, e.y, P.x, P.y) < (R0 + P.r * 0.3) ** 2) hurtPlayer(e.dmg * 1.35, e.x, e.y);
  crushCrystals(e.x, e.y, R0);
  for (const b of barrels)
    if (!b.dead && d2(e.x, e.y, b.x, b.y) < R0 * R0) {
      const bb = b;
      bb.hp = 0;
      later.push({ t: 0.1, fn: () => blowBarrel(bb) });
    }
}
/* Boss AI. One big move at a time, each read before it lands, then a short opening where the boss is exposed.
   The Abomination keeps its leap, tail and claws; the three humanoid giants each fight their own way. */
