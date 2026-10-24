/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
function budTarget(e, pd2) {
  // a survivor standing much nearer than you is the one they go for: your people draw some of the night off you
  if (
    !buddies.length ||
    e.type === 'queen' ||
    e.big ||
    e.fly ||
    e.type === 'wasp' ||
    e.type === 'flower' ||
    e.lure ||
    e.rout > 0
  )
    return null;
  if (time > (e.bNext || 0)) {
    e.bNext = time + 0.5 + Math.random() * 0.3;
    e.bud = null;
    let bd = 260 * 260;
    for (const s of buddies) {
      if (s.down > 0 || !(s.hp > 0)) continue;
      const dd = d2(e.x, e.y, s.x, s.y);
      if (dd < bd && dd < pd2 * 0.36) {
        bd = dd;
        e.bud = s;
      }
    }
  }
  return e.bud && !(e.bud.down > 0) && e.bud.hp > 0 && buddies.includes(e.bud) ? e.bud : null;
}
function objTarget(e) {
  if (!obj || obj.done || e.big || e.type === 'wasp' || e.type === 'flower') return null;
  if (obj.type === 'gen') {
    const dg = d2(e.x, e.y, obj.x, obj.y);
    if (dg < 300 * 300 && dg < d2(e.x, e.y, P.x, P.y) * 1.1) return obj;
  }
  if (obj.type === 'rescue' && obj.s.hp > 0) {
    const ds = d2(e.x, e.y, obj.s.x, obj.s.y);
    if (ds < 420 * 420 && ds < d2(e.x, e.y, P.x, P.y)) return obj.s;
  }
  return null;
}
function objHold(dt) {
  // the last zombie down doesn't end the night while you are still out for the cans or the survivor: a short grace, with stragglers
  if (
    !obj ||
    obj.done ||
    nightDone ||
    !nightLive ||
    obj.type === 'gen' ||
    obj.type === 'hunt' ||
    (obj.type === 'rescue' && obj.state === 'follow')
  )
    return false;
  obj.grace = (obj.grace ?? 25) - dt;
  if (obj.grace <= 0) return false;
  obj.hold = true;
  if (Math.random() < dt * 0.5) {
    const [x, y] = spawnPoint(460);
    makeEnemy('skitter', x, y);
  }
  return true;
}
function updateObjective(dt) {
  if (obj && obj.done && obj.type === 'rescue' && !obj.joined && obj.s.hp > 0 && obj.failed === false) {
    const s = obj.s,
      a = Math.atan2(s.y - P.y, s.x - P.x),
      ox = s.x,
      oy = s.y;
    s.x += Math.cos(a) * 170 * dt;
    s.y += Math.sin(a) * 170 * dt;
    collide(s);
    const v = Math.hypot(s.x - ox, s.y - oy) / Math.max(dt, 1e-4);
    if (v > 20) s.moveA += angDiff(s.moveA, Math.atan2(s.y - oy, s.x - ox)) * damp(10, dt);
    s.strideAmp = lerp(s.strideAmp, Math.min(1, v / 250), damp(10, dt));
    s.stride += (v * dt) / 76;
    s.aimA = s.bodyA = s.moveA;
    s.walkT = (s.walkT || 0) + dt;
    const off =
      Math.abs(s.x - cam.x - viewW / 2) > viewW / 2 + 40 || Math.abs(s.y - cam.y - viewH / 2) > viewH / 2 + 60;
    if (off && (s.walkT > 3 || d2(s.x, s.y, P.x, P.y) > 600 * 600)) obj.joined = true;
    else if (s.walkT > 20) obj.joined = true;
    return;
  } // a full team: they walk off toward the convoy instead of freezing in place
  if (!obj || obj.done) return;
  if (obj.hold && enemies.length && !queue.length) obj.grace -= dt; // the grace runs down while you fight the stragglers too
  if (obj.type === 'gen') {
    for (const o of [P, ...enemies]) {
      if (o.dead) continue;
      const rr2 = 24 + (o.cr || o.r),
        dd = d2(o.x, o.y, obj.x, obj.y);
      if (dd < rr2 * rr2 && dd > 0.01) {
        const d = Math.sqrt(dd);
        o.x += ((o.x - obj.x) / d) * (rr2 - d);
        o.y += ((o.y - obj.y) / d) * (rr2 - d);
        if (o !== P && o.dmg > 0) {
          obj.hp -= o.dmg * dt * 1.1;
          if (Math.random() < dt * 6) sparks(obj.x, obj.y - 10, [1, 0.8, 0.4], 2, 160);
        }
      }
    }
    if (obj.hp <= 0) {
      explode(obj.x, obj.y, 90, 0, false);
      obj.hp = 0;
      ev = 'blackout';
      finishObjective(false, 'The generator blew. The lamps went dark');
    }
  } else if (obj.type === 'rescue') {
    const s = obj.s;
    s.inv = Math.max(0, s.inv - dt);
    s.recoil = Math.max(0, s.recoil - dt * 40);
    s.hurt = Math.max(0, s.hurt - dt);
    if (obj.state === 'wait' && d2(s.x, s.y, P.x, P.y) < 70 * 70) {
      obj.state = 'follow';
      floatText(s.x, s.y - 40, "I'm with you. Go!", '#bff4ff', 17);
      sfx.heal();
    }
    let tx = s.x,
      ty = s.y;
    if (obj.state === 'follow') {
      const fa = P.formA ?? P.bodyA,
        still = Math.hypot(P.vx, P.vy) < 40 && d2(s.x, s.y, P.x, P.y) < 110 * 110,
        taken = buddies.length ? P.__slots || [] : [];
      let sl = s.slot; // a spot of their own round you, like your backup's, and never one a backup already holds
      if (
        !sl ||
        Math.hypot(P.x - sl.px, P.y - sl.py) > (still ? 30 : 0) ||
        solidPt(sl.x, sl.y) ||
        taken.some(q => !q.rs && d2(q[0], q[1], sl.x, sl.y) < 44 * 44)
      ) {
        const b = buddySlot(
          P,
          s,
          buddies.length,
          taken.filter(q => !q.rs)
        );
        sl = s.slot = b
          ? { x: b[0], y: b[1], px: P.x, py: P.y }
          : { x: P.x - Math.cos(fa) * 64, y: P.y - Math.sin(fa) * 64, px: P.x, py: P.y };
      }
      if (!still && d2(s.x, s.y, sl.x, sl.y) > 22 * 22) {
        tx = sl.x;
        ty = sl.y;
      }
    } // behind you as you walk; when you stop, they stop: no circling round you while you aim
    const dx = tx - s.x,
      dy = ty - s.y,
      dl = Math.hypot(dx, dy),
      sp = dl > 4 ? Math.min(250, dl * 4) : 0;
    s.vx += ((dl ? dx / dl : 0) * sp - s.vx) * damp(10, dt);
    s.vy += ((dl ? dy / dl : 0) * sp - s.vy) * damp(10, dt);
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    {
      const ex = s.x - P.x,
        ey = s.y - P.y,
        el = Math.hypot(ex, ey) || 1;
      if (el < 36) {
        s.x = P.x + (ex / el) * 36;
        s.y = P.y + (ey / el) * 36;
      }
    }
    collide(s); /* never inside you */
    const spd = Math.hypot(s.vx, s.vy);
    if (spd > 20) s.moveA += angDiff(s.moveA, Math.atan2(s.vy, s.vx)) * damp(10, dt);
    s.strideAmp = lerp(s.strideAmp, Math.min(1, spd / 250), damp(10, dt));
    s.stride += (spd * dt) / 76;
    let tgt = null,
      bd = 380 * 380;
    query(s.x, s.y, 380, e => {
      if (e.dead || e.emerge < 1) return;
      const dd = d2(s.x, s.y, e.x, e.y);
      if (dd < bd && los(s.x, s.y, e.x, e.y)) {
        bd = dd;
        tgt = e;
      }
    });
    if (tgt) {
      s.aimA += angDiff(s.aimA, Math.atan2(tgt.y - s.y, tgt.x - s.x)) * damp(12, dt);
      s.cd -= dt;
      if (s.cd <= 0 && Math.abs(angDiff(s.aimA, Math.atan2(tgt.y - s.y, tgt.x - s.x))) < 0.2) {
        s.cd = 0.5;
        const c = Math.cos(s.aimA),
          sn = Math.sin(s.aimA);
        pbullets.push({
          x: s.x + c * 34,
          y: s.y + sn * 34,
          vx: c * 1100,
          vy: sn * 1100,
          life: 0.5,
          dmg: 13 + wave,
          pierce: 0,
          bounce: 0,
          hits: [],
          small: true,
        });
        s.recoil = 4;
        flashes.push({ x: s.x + c * 36, y: s.y + sn * 36, rot: s.aimA, life: 0.05, max: 0.05 });
        playS('pistol_m', 0.28, 1.05, 0, 0.2);
      }
    } else if (spd > 30) s.aimA += angDiff(s.aimA, s.moveA) * damp(6, dt);
    s.bodyA += angDiff(s.bodyA, s.aimA) * damp(8, dt);
    if (s.inv <= 0)
      for (const e of enemies)
        if (!e.dead && e.dmg > 0 && e.z < 12 && d2(e.x, e.y, s.x, s.y) < (e.r + s.r) ** 2) {
          s.hp -= e.dmg * 0.8;
          s.inv = 0.6;
          s.hurt = 0.15;
          bleed(s.x, s.y, 16, s.x - e.x, s.y - e.y, 5, BLOOD, 200);
          break;
        }
    if (s.hp <= 0) {
      s.hp = 0;
      bleed(s.x, s.y, 16, 0, 0, 30, BLOOD, 340, 1.3);
      for (let i = 0; i < 6; i++) gib(s.x, s.y, R['g_meat' + randi(0, 1)], [1, 1, 1], BLOOD, 260);
      pool(s.x, s.y, 1.3, BLOOD);
      sfx.gib(s.x, s.y);
      finishObjective(false, "The survivor didn't make it");
    }
  } else if (obj.type === 'box') updateBox(dt);
  else if (obj.type === 'fuel') {
    for (const c of obj.cans) {
      c.t += dt;
      if (!c.got && d2(c.x, c.y, P.x, P.y) < 38 * 38) {
        c.got = true;
        obj.got++;
        sfx.ammo();
        floatText(c.x, c.y - 30, `${obj.name || 'Fuel'} ${obj.got} / ${obj.need || 5}`, '#ffd08a', 16);
        if (obj.got >= (obj.need || 5)) finishObjective(true);
      }
    }
  }
}
/* ---------- evac ---------- */
