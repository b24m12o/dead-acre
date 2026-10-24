/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
let WINDX = 14,
  TDMG = new Float32Array(1),
  grassFire = [],
  hazeSrc = [],
  physT = 0,
  stepT = 0;
const PUSH = {
  trash: { m: 1.6, r: 12, fr: 6, tip: 340 },
  cone: { m: 0.5, r: 9, fr: 6, tip: 220 },
  cart: { m: 1.8, r: 15, fr: 2.2, roll: true },
  tire: { m: 1.2, r: 11, fr: 3.5, roll: true },
  news: { m: 4, r: 12, fr: 9, tip: 600, fixed: true },
};
function ragKick(e, ux, uy, imp, pop) {
  // throw a body
  e.rvx = (e.rvx || 0) + ux * imp;
  e.rvy = (e.rvy || 0) + uy * imp;
  e.rw = (e.rw || 0) + (rand(-1, 1) * imp) / 80;
  if (pop) e.vz = Math.max(e.vz || 0, imp * 0.55);
  if (e.limbs)
    for (const L of e.limbs) {
      L.vx += ux * imp * rand(0.6, 1.6) + rand(-1, 1) * imp * 0.5;
      L.vy += uy * imp * rand(0.6, 1.6) + rand(-1, 1) * imp * 0.5;
    }
}
function corpseMass(e) {
  return e.big || e.type === 'queen' || e.r >= 40 ? Infinity : e.type === 'beetle' ? 5 : e.type === 'hopper' ? 2 : 1;
}
function corpsePhys(e, dt) {
  if (e.rvx === undefined) {
    e.rvx = (e.kx || 0) + (e.vx || 0) * 0.3;
    e.rvy = (e.ky || 0) + (e.vy || 0) * 0.3;
    e.rw = 0;
  }
  if (e.vz || e.z > 0) {
    e.vz = e.vz || 0;
    e.vz -= 900 * dt;
    e.z = (e.z || 0) + e.vz * dt;
    if (e.z <= 0) {
      e.z = 0;
      if (e.vz < -160) {
        dust(e.x, e.y, 3, 40, 0.8, 0.6);
        if (HUMAN[e.type]) bleed(e.x, e.y, 4, 0, 0, 3, bloodOf(e), 120);
        e.vz *= -0.25;
      } else e.vz = 0;
    }
  }
  const air = e.z > 1,
    fr = Math.exp(-(air ? 0.4 : 5) * dt);
  e.rvx *= fr;
  e.rvy *= fr;
  e.rw *= Math.exp(-(air ? 0.5 : 4) * dt);
  const nx = e.x + e.rvx * dt,
    ny = e.y + e.rvy * dt,
    lb = LYB[e.type] ? (e.type === 'beetle' ? 1.9 : 1) * 50 : 0,
    lc = Math.cos(e.fallA ?? 0) * lb,
    ls = Math.sin(e.fallA ?? 0) * lb;
  if ((solidPt(nx, ny) || (lb && (solidPt(nx + lc, ny + ls) || solidPt(nx - lc, ny - ls)))) && !solidPt(e.x, e.y)) {
    // a whole body stops when its head or feet reach a wall
    const bx = solidPt(nx, e.y),
      by = solidPt(e.x, ny),
      sp = Math.hypot(e.rvx, e.rvy);
    if (bx || !by) e.rvx *= -0.3;
    if (by || !bx) e.rvy *= -0.3;
    e.rw += rand(-2, 2) * Math.min(1, sp / 200);
    if (sp > 90) {
      dust(nx, ny, 2, 30, 0.6, 0.5);
      if (HUMAN[e.type]) {
        bleed(nx, ny, 10, -e.rvx, -e.rvy, 4, bloodOf(e), 120);
      }
      if (sp > 200 && thr('thud', 60)) {
        playS('dry', 0.12, 0.45, 0, 0);
        shake(0.04);
      }
    }
  } else {
    e.x = nx;
    e.y = ny;
  }
  e.fallA = (e.fallA ?? e.a + Math.PI) + e.rw * dt;
  if (Math.hypot(e.rvx, e.rvy) > 140 && HUMAN[e.type] && Math.random() < dt * 14)
    decal(
      R['splat' + randi(0, 3)],
      e.x + rand(-6, 6),
      e.y + rand(-6, 6),
      rand(0.1, 0.18),
      [bloodOf(e)[0] * 0.85, bloodOf(e)[1], bloodOf(e)[2], 0.8],
      [0, 0, 0],
      40
    );
  if (P && state === 'play' && corpseMass(e) === 1 && !e.z) {
    const dd = d2(e.x, e.y, P.x, P.y);
    if (dd < 18 * 18) {
      const sp = Math.hypot(P.vx, P.vy);
      if (sp > 170 && !(e.shoveT > time)) {
        e.shoveT = time + 0.8;
        e.rvx += P.vx * 0.3;
        e.rvy += P.vy * 0.3;
        e.rw += rand(-0.6, 0.6);
      }
    }
  } // only a running step shoves a body, and only a normal-sized one
  if (e.lr) {
    // hands and feet flop on springs behind the body
    if (!e.limbs)
      e.limbs = e.lr.map(([x, y]) => ({
        x,
        y,
        vx: e.rvx * rand(0.2, 1.4) + rand(-90, 90),
        vy: e.rvy * rand(0.2, 1.4) + rand(-90, 90),
      }));
    const dmp = Math.exp(-5 * dt),
      mx = (e.type === 'beetle' ? 1.9 : 1) * 8;
    for (let i = 0; i < 4; i++) {
      const L = e.limbs[i],
        [tx, ty] = e.lr[i];
      L.vx = (L.vx + (tx - L.x) * 40 * dt) * dmp;
      L.vy = (L.vy + (ty - L.y) * 40 * dt) * dmp;
      L.x += L.vx * dt;
      L.y += L.vy * dt;
      const dx = L.x - tx,
        dy = L.y - ty,
        dl = Math.hypot(dx, dy);
      if (dl > mx) {
        L.x = tx + (dx / dl) * mx;
        L.y = ty + (dy / dl) * mx;
      }
    }
  }
  if (!e.pooled && e.dying > 0.8 && Math.hypot(e.rvx, e.rvy) < 25 && !e.z) {
    e.pooled = true;
    if (e.type !== 'queen')
      bloodPool(e.x, e.y, (e.type === 'beetle' ? 2 : e.type === 'hopper' ? 1.5 : 1.15) * rand(0.8, 1.2), bloodOf(e));
  }
}
function bloodPool(x, y, scale, col, life = 60) {
  const d = decal(
    R['splat' + randi(0, 3)],
    x,
    y,
    scale * 0.2,
    [col[0] * 0.62, col[1] * 0.7, col[2] * 0.7, 0.88],
    col === BILE ? [0.12, 0.2, 0.02] : [0, 0, 0],
    life
  );
  if (d) {
    d.gs = scale;
    d.blood = true;
  }
}
/* ---- props ---- */
function propsTick(dt) {
  const cx = cam.x + viewW / 2,
    cy = cam.y + viewH / 2;
  for (const d of decor) {
    const D = PUSH[d.kind];
    if (!D || Math.abs(d.x - cx) > viewW + 400 || Math.abs(d.y - cy) > viewH + 400) continue;
    d.vx = d.vx || 0;
    d.vy = d.vy || 0;
    d.va = d.va || 0;
    const bump = (o, k, om) => {
      const rr2 = D.r + (o.cr || o.r),
        dd = d2(o.x, o.y, d.x, d.y);
      if (dd < rr2 * rr2 && dd > 0.01) {
        const dl = Math.sqrt(dd),
          ux = (d.x - o.x) / dl,
          uy = (d.y - o.y) / dl,
          pen = rr2 - dl,
          share = D.fixed ? 0 : om / (om + D.m);
        d.x += ux * pen * share;
        d.y += uy * pen * share;
        o.x -= ux * pen * (1 - share);
        o.y -= uy * pen * (1 - share);
        const vn = Math.max(0, (o.vx || 0) * ux + (o.vy || 0) * uy);
        if (D.fixed || vn < 40) return;
        d.vx += (ux * vn * k) / D.m;
        d.vy += (uy * vn * k) / D.m;
        d.va += (rand(-2, 2) * vn) / 400;
        if (D.tip && (vn * k) / D.m > D.tip && !d.down) tipProp(d, ux, uy);
      }
    };
    if (P && state === 'play') bump(P, 0.55, 1.2);
    query(d.x, d.y, D.r + 40, e => {
      if (!e.dead && !e.fly && e.z < 10) bump(e, e.type === 'beetle' ? 1.4 : 0.35, e.type === 'beetle' ? 5 : 0.6);
    });
    const f = Math.exp(-D.fr * dt);
    d.vx *= f;
    d.vy *= f;
    d.va *= Math.exp(-3 * dt);
    const nx = d.x + d.vx * dt,
      ny = d.y + d.vy * dt;
    if (solidPt(nx, ny) && !solidPt(d.x, d.y)) {
      const bx = solidPt(nx, d.y),
        by = solidPt(d.x, ny);
      if (bx || !by) d.vx *= -0.4;
      if (by || !bx) d.vy *= -0.4;
      if (Math.hypot(d.vx, d.vy) > 120 && thr('clang', 60)) {
        playS('dry', 0.1, 1.4, 0, 0);
        sparks(d.x, d.y, [1, 0.85, 0.5], 2, 120);
      }
    } else {
      d.x = nx;
      d.y = ny;
    }
    if (D.roll && Math.hypot(d.vx, d.vy) > 20) d.a += angDiff(d.a, Math.atan2(d.vy, d.vx)) * Math.min(1, dt * 4);
    else d.a += d.va * dt;
    {
      const o = { x: d.x, y: d.y, r: D.r * 0.8, vx: d.vx, vy: d.vy };
      if (collide(o)) {
        d.x = o.x;
        d.y = o.y;
        d.vx = o.vx * 0.6;
        d.vy = o.vy * 0.6;
      }
    }
    d.tx = Math.floor(d.x / TILE);
    d.ty = Math.floor(d.y / TILE);
  }
  for (const c of cars)
    if (c.jx || c.jy || c.ja || c.jvx || c.jvy || c.jva) {
      // a blast rocks the car on its springs
      c.jx = c.jx || 0;
      c.jy = c.jy || 0;
      c.ja = c.ja || 0;
      c.jvx = c.jvx || 0;
      c.jvy = c.jvy || 0;
      c.jva = c.jva || 0;
      c.jvx += -c.jx * 120 * dt;
      c.jvy += -c.jy * 120 * dt;
      c.jva += -c.ja * 120 * dt;
      const dm = Math.exp(-5 * dt);
      c.jvx *= dm;
      c.jvy *= dm;
      c.jva *= dm;
      c.jx += c.jvx * dt;
      c.jy += c.jvy * dt;
      c.ja += c.jva * dt;
      if (Math.abs(c.jx) + Math.abs(c.jy) + Math.abs(c.ja) + Math.abs(c.jvx) + Math.abs(c.jvy) < 0.05)
        c.jx = c.jy = c.ja = c.jvx = c.jvy = c.jva = 0;
    }
}
function tipProp(d, ux, uy) {
  d.down = true;
  d.a = Math.atan2(uy, ux);
  if (d.kind === 'trash') chips(d.x, d.y, 5, [0.8, 0.78, 0.7], 3, 160);
  playS('dry', 0.15, d.kind === 'cone' ? 1.8 : 0.9, 0, 0);
}
function propShot(b) {
  // bullets shove light props
  for (const d of decor) {
    const D = PUSH[d.kind];
    if (!D || D.fixed || b.pp === d || d2(b.x, b.y, d.x, d.y - 4) > (D.r + 3) ** 2) continue;
    b.pp = d;
    const sp = Math.hypot(b.vx, b.vy) || 1,
      ux = b.vx / sp,
      uy = b.vy / sp,
      k = (b.heavy ? 260 : b.pellet ? 70 : 120) / D.m;
    d.vx = (d.vx || 0) + ux * k;
    d.vy = (d.vy || 0) + uy * k;
    d.va = (d.va || 0) + rand(-8, 8);
    sparks(b.x, b.y, [1, 0.85, 0.5], 3, 180);
    if (D.tip && k > D.tip * 0.6 && !d.down) tipProp(d, ux, uy);
    return false;
  }
  return false;
}
/* ---- destruction ---- */
function damageTile(i, amt) {
  const t = ttype[i],
    tx = i % MW,
    ty = (i / MW) | 0;
  if (t !== 9 && t !== 5) return;
  if (tx < 3 || ty < 3 || tx > MW - 4 || ty > MH - 4) return;
  const lim = t === 9 ? 70 : 170;
  TDMG[i] += amt;
  const x = (tx + 0.5) * TILE,
    y = (ty + 0.5) * TILE;
  if (Math.random() < 0.4) {
    if (t === 9) sparks(x, y - 10, [1, 0.85, 0.5], 2, 120);
    else chips(x, y, 2, null, 4, 140);
  }
  if (TDMG[i] >= lim) breakTile(i);
}
function breakTile(i) {
  const t = ttype[i],
    tx = i % MW,
    ty = (i / MW) | 0,
    x = (tx + 0.5) * TILE,
    y = (ty + 0.5) * TILE;
  grid[i] = 0;
  ttype[i] = 0;
  WHT[i] = 0;
  WHOLES.delete(i);
  for (const w of windows) if (w.i === i) w.broke = true;
  flowTile = -1;
  repaintGround(tx, ty, t);
  if (t === 9) {
    for (let k = 0; k < 2; k++) {
      const dd = decal(
        R.wf_fence,
        x + rand(-8, 8),
        y + rand(-6, 6),
        rand(0.8, 1),
        [0.55, 0.55, 0.55, 1],
        [0, 0, 0],
        240
      );
      dd.rot = rand(-0.6, 0.6) + (k ? Math.PI / 2 : 0);
    }
    sparks(x, y, [1, 0.85, 0.5], 10, 260);
    playS('dry', 0.35, 0.6, 0, 0);
    sfx.crunch(x, y);
  } else {
    dust(x, y, 16, 120, 1.6, 1.6);
    chips(x, y, 16, null, 4, 300);
    smoke(x, y, 4, 60);
    for (let k = 0; k < 7; k++)
      decal(R.rockchip, x + rand(-18, 18), y + rand(-18, 18), rand(1.4, 2.6), [0.62, 0.48, 0.42, 1], [0, 0, 0], 300);
    sfx.crunch(x, y);
    shake(0.15);
  }
}
let mipDirty = false,
  mipT = 0;
function repaintGround(tx, ty, t) {
  // the baked ground still showed the wall's footprint: paint it over with the surrounding ground and refresh the minimap
  try {
    const kA = mapA.width / WW,
      x0 = Math.floor(tx * TILE * kA) - 1,
      y0 = Math.floor(ty * TILE * kA) - 1,
      w = Math.ceil(TILE * kA) + 2,
      c = mapA.getContext('2d'); // the colour map is bigger than the world (MAPS): work in its own pixels
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    let src = null;
    for (const [ox, oy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const i = (ty + oy) * MW + tx + ox;
      if (!grid[i]) {
        src = [x0 + ox * w + w / 2, y0 + oy * w + w / 2];
        break;
      }
    }
    const px = src ? c.getImageData(Math.round(src[0]), Math.round(src[1]), 1, 1).data : [78, 72, 60, 255];
    c.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`;
    c.fillRect(x0, y0, w, w);
    for (let i = 0; i < 40 * kA; i++) {
      c.fillStyle = `rgba(${Math.random() < 0.5 ? '20,16,12' : '120,104,86'},${rand(0.15, 0.4)})`;
      c.fillRect(x0 + rand(0, w), y0 + rand(0, w), rand(0.6, 2) * kA, rand(0.6, 2) * kA);
    }
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(x0 + 1, y0 + 1, w - 2, w - 2);
    const img = c.getImageData(x0, y0, w, w);
    c.restore();
    gl.bindTexture(gl.TEXTURE_2D, texMapA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    mipDirty = true; // mipmaps are rebuilt at most twice a second, not per broken tile
    const kN = NM / WW,
      nx0 = Math.floor(tx * TILE * kN) - 1,
      ny0 = Math.floor(ty * TILE * kN) - 1,
      nw = Math.ceil(TILE * kN) + 2;
    const flat = new Uint8Array(nw * nw * 4);
    for (let i = 0; i < nw * nw; i++) {
      flat[i * 4] = 128;
      flat[i * 4 + 1] = 128;
      flat[i * 4 + 2] = 0;
      flat[i * 4 + 3] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, texMapN);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, nx0, ny0, nw, nw, gl.RGBA, gl.UNSIGNED_BYTE, flat);
    if (radarBg) {
      const r = radarBg.getContext('2d');
      r.clearRect(tx, ty, 1, 1);
      r.fillStyle = 'rgba(70,70,58,0.6)';
      r.fillRect(tx, ty, 1, 1);
    }
  } catch (err) {
    /* cosmetic only */
  }
}
function blastWorld(x, y, R0, dmg) {
  // what an explosion does to the street around it
  const rr = R0 * 0.8;
  for (let ty = Math.floor((y - rr) / TILE); ty <= Math.floor((y + rr) / TILE); ty++)
    for (let tx = Math.floor((x - rr) / TILE); tx <= Math.floor((x + rr) / TILE); tx++) {
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
      const i = ty * MW + tx,
        d = Math.hypot((tx + 0.5) * TILE - x, (ty + 0.5) * TILE - y);
      if (d < rr && dmg > 0) damageTile(i, 300 * (1 - d / rr));
    }
  for (const e of corpses) {
    const m = corpseMass(e),
      dx = e.x - x,
      dy = e.y - y,
      d = Math.hypot(dx, dy);
    if (m < Infinity && d < R0 * 1.5 && d > 0.1) ragKick(e, dx / d, dy / d, (460 * (1 - d / (R0 * 1.5))) / m, m < 2);
  }
  for (const d of decor) {
    const D = PUSH[d.kind];
    if (D) {
      const dx = d.x - x,
        dy = d.y - y,
        dl = Math.hypot(dx, dy);
      if (dl < R0 * 2 && dl > 0.1) {
        const k = (560 * (1 - dl / (R0 * 2))) / D.m;
        d.vx = (d.vx || 0) + (dx / dl) * k;
        d.vy = (d.vy || 0) + (dy / dl) * k;
        d.va = (d.va || 0) + rand(-10, 10);
        if (D.tip && !d.down) tipProp(d, dx / dl, dy / dl);
      }
    } else if ((d.kind === 'tlight' || d.kind === 'stop') && !d.down && d2(d.x, d.y, x, y) < (R0 * 0.85) ** 2) {
      d.down = true;
      d.fa = Math.atan2(d.y - y, d.x - x) + rand(-0.3, 0.3);
      sparks(d.x, d.y, [1, 0.85, 0.5], 8, 220);
      sfx.crunch(d.x, d.y);
    }
  }
  for (const L of lamps)
    if (!L.down && !L.lantern && d2(L.bx, L.by, x, y) < (R0 * 0.9) ** 2) {
      L.down = true;
      L.fa = Math.atan2(L.by - y, L.bx - x) + rand(-0.3, 0.3);
      sparks(L.hx, L.hy, [1, 0.9, 0.6], 14, 300);
      flashLight(L.hx, L.hy, 200, [1.4, 1.2, 0.8], 0.15);
      sfx.crunch(L.hx, L.hy);
      later.push({
        t: 0.35,
        fn: () => {
          playS('dry', 0.4, 0.4, 0, 0.3);
          shake(0.1);
          dust(L.bx + Math.cos(L.fa) * 60, L.by + Math.sin(L.fa) * 60, 6, 60, 1, 1);
        },
      });
    }
  for (const c of cars)
    if (!c.dead) {
      const dx = c.x - x,
        dy = c.y - y,
        dl = Math.hypot(dx, dy);
      if (dl < R0 * 2.2 && dl > 0.1) {
        const k = 90 * (1 - dl / (R0 * 2.2));
        c.jvx = (c.jvx || 0) + (dx / dl) * k;
        c.jvy = (c.jvy || 0) + (dy / dl) * k - k * 0.6;
        c.jva = (c.jva || 0) + rand(-1, 1) * k * 0.012;
      }
    }
}
function fencePressure() {
  // a crowd leaning on a fence will bring it down
  if (!P || state !== 'play') return;
  for (const e of enemies) {
    if (e.dead || e.dormant || e.fly || !HUMAN[e.type] || d2(e.x, e.y, P.x, P.y) > 340 * 340) continue;
    const a0 = Math.atan2(P.y - e.y, P.x - e.x);
    for (const da of [0, -0.8, 0.8]) {
      const a = a0 + da,
        tx = Math.floor((e.x + Math.cos(a) * (e.r + 14)) / TILE),
        ty = Math.floor((e.y + Math.sin(a) * (e.r + 14)) / TILE);
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
      const i = ty * MW + tx;
      if (ttype[i] === 9) {
        damageTile(i, e.type === 'beetle' ? 9 : 2.2);
        if (Math.random() < 0.08) playS('dry', 0.08, 0.5 + Math.random() * 0.3, 0, 0);
        break;
      }
      if (ttype[i] === 6) {
        const ci = carAt[i],
          car = ci >= 0 ? cars[ci] : null;
        if (car && !car.dead) {
          const k = e.type === 'beetle' ? 3 : 1;
          car.jvx = (car.jvx || 0) + Math.cos(a) * rand(5, 12) * k;
          car.jvy = (car.jvy || 0) + Math.sin(a) * rand(5, 12) * k;
          car.jva = (car.jva || 0) + rand(-0.01, 0.01) * k;
          if (Math.random() < 0.05 && thr('carrock', 300)) playS('dry', 0.07, 0.45, 0, 0);
        }
        break;
      }
    }
  } // a crowd shoving at a parked car rocks it on its springs
}
/* ---- fire in the dry grass ---- */
function grassIgnite(x, y, r, chance = 1) {
  if (ev === 'storm' || grassFire.length > 220) return;
  for (let ty = Math.floor((y - r) / TILE); ty <= Math.floor((y + r) / TILE); ty++)
    for (let tx = Math.floor((x - r) / TILE); tx <= Math.floor((x + r) / TILE); tx++) {
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
      for (const g of grassCells[ty * MW + tx])
        if (!g.burnt && !(g.burn > 0) && d2(g.x, g.y, x, y) < r * r && Math.random() < chance) {
          g.burn = rand(1.6, 2.8);
          g.sp = rand(0.2, 0.5);
          grassFire.push(g);
        }
    }
}
function grassTick(dt) {
  for (const fp of firePools) grassIgnite(fp.x, fp.y, fp.r + 6, dt * 6);
  for (const c of cars) if (c.fire && !c.dead) grassIgnite(c.x, c.y, 60, dt * 3);
  for (const e of enemies) if (e.burn > 0 && !e.dead) grassIgnite(e.x, e.y, 16, dt * 4);
  for (const g of grassFire) {
    g.burn -= dt * (ev === 'storm' ? 3 : 1);
    g.sp -= dt;
    if (Math.random() < dt * 5) flame(g.x, g.y - 2, 1, 4, 0.75);
    if (Math.random() < dt * 1.6)
      part({
        k: 2,
        x: g.x,
        y: g.y - 6,
        vx: rand(-6, 6),
        vy: rand(-30, -14),
        life: rand(1.8, 3),
        max: 3,
        size: rand(0.5, 0.9),
        grow: 1.8,
        drag: 0.5,
        rot: rand(0, TAU),
        vr: rand(-1, 1),
        c: [0.18, 0.17, 0.16],
        wind: 1.1,
      });
    if (Math.random() < dt * 1.2)
      part({
        k: 0,
        x: g.x + rand(-4, 4),
        y: g.y - 6,
        vx: WINDX * 1.5 + rand(-12, 12),
        vy: rand(-60, -30),
        life: rand(0.8, 1.6),
        max: 1.6,
        size: rand(0.05, 0.09),
        c: [1, 0.5, 0.15],
        drag: 0.8,
      }); // embers lifting off
    if (g.sp <= 0) {
      g.sp = rand(0.3, 0.5);
      grassIgnite(g.x, g.y, 66, 0.2);
    }
    if (state === 'play') {
      if (P.inv <= 0 && d2(P.x, P.y, g.x, g.y) < 16 * 16 && Math.random() < dt * 3)
        hurtPlayer(3 + wave * 0.2, g.x, g.y, 'fire');
      if (Math.random() < dt * 4)
        query(g.x, g.y, 30, e => {
          if (!e.dead && e.z < 10 && d2(e.x, e.y, g.x, g.y) < (e.r * 0.6 + 8) ** 2) ignite(e, 1.6);
        });
    }
    if (g.burn <= 0) {
      g.burnt = true;
      if (Math.random() < 0.3 && decals.length < 380)
        decal(R.scorch, g.x, g.y, rand(0.18, 0.3), [1, 1, 1, 0.6], [0, 0, 0], 90);
    }
  }
  grassFire = grassFire.filter(g => g.burn > 0);
}
/* ---- footprints, wind, heat haze ---- */
function footTick(dt) {
  if (!P || state !== 'play') return;
  stepT -= dt;
  if (stepT <= 0) {
    stepT = 0.12;
    for (const d of decals)
      if (
        d.blood &&
        d.life > 6 &&
        Math.abs(d.x - P.x) < 40 &&
        Math.abs(d.y - P.y) < 40 &&
        d2(d.x, d.y, P.x, P.y) < (d.s * 26) ** 2
      ) {
        P.bloodSteps = 12;
        break;
      }
  }
  if (P.bloodSteps > 0) {
    const st = Math.floor(P.stride * 2);
    if (P.lastStep === undefined) P.lastStep = st;
    if (st !== P.lastStep && Math.hypot(P.vx, P.vy) > 40) {
      P.lastStep = st;
      const side = st & 1 ? 1 : -1,
        a = P.moveA,
        x = P.x - Math.sin(a) * 6 * side,
        y = P.y + Math.cos(a) * 6 * side;
      if (decals.length > 410) decals.shift();
      decals.push({
        reg: R.fprint,
        x,
        y,
        rot: a + Math.PI / 2,
        s: 1,
        tint: [0.42, 0.04, 0.03, 0.75 * Math.min(1, P.bloodSteps / 6)],
        emit: [0, 0, 0],
        life: 40,
        max: 40,
      });
      P.bloodSteps--;
    }
  }
}
function hazeCollect() {
  hazeSrc.length = 0;
  const vis = (x, y) => x > camX - 60 && x < camX + viewW + 60 && y > camY - 60 && y < camY + viewH + 60;
  const add = (x, y, r, k) => {
    if (hazeSrc.length < 6 && vis(x, y)) hazeSrc.push([x, y, r, k]);
  };
  for (const c of cars) if (c.fire && !c.dead) add(c.x, c.y - 40, 90, 1);
  for (const fp of firePools) add(fp.x, fp.y - 30, fp.r * 1.4, Math.min(1, fp.life / 1.5));
  for (const f of fires) add(f.x, f.y - 30, 50, 0.6);
  for (let i = 0; i < grassFire.length; i += 9) add(grassFire[i].x, grassFire[i].y - 20, 60, 0.7);
}
function physTick(dt) {
  WINDX = 14 + Math.sin(time * 0.2) * 10;
  // Keep ordinary frames cheap, but use bounded semi-fixed substeps after a hitch so corpses and loose props are less likely to tunnel through walls.
  const physSteps = dt > 1 / 45 ? Math.min(3, Math.max(2, Math.ceil(dt / (1 / 60)))) : 1;
  const pdt = dt / physSteps;
  for (let i = 0; i < physSteps; i++) {
    for (const e of corpses) corpsePhys(e, pdt);
    propsTick(pdt);
  }
  for (const L of lamps)
    if (
      L.down &&
      (L.zap = (L.zap ?? 20) - dt) > 0 &&
      Math.random() < dt * 1.2 &&
      Math.abs(L.bx - cam.x - viewW / 2) < viewW
    ) {
      const hx = L.bx + Math.cos(L.fa) * 66,
        hy = L.by + Math.sin(L.fa) * 66;
      sparks(hx, hy, [1, 0.9, 0.6], 6, 200);
      flashLight(hx, hy, 140, [1.2, 1.1, 0.9], 0.06);
      if (Math.random() < 0.5) sfx.zap && sfx.zap();
    }
  grassTick(dt);
  footTick(dt);
  physT -= dt;
  if (physT <= 0) {
    physT = 0.25;
    fencePressure();
  }
}
