/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, clamp, d2, pick, rand, randi } from '../core/util.js';
import { SUNV, addLight, lineQ, quad, setH, viewH, viewW } from './sprites.js';
import { R } from './atlas.js';
import { MH, MW, ROAD, RX, RY, TILE, cars, grid, houses, ttype } from '../world/map.js';
import { query } from '../world/nav.js';
import { noise, playS } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { cam } from '../game/state.js';
import { chips, decal, part, sparks } from './effects.js';
import { propShot } from '../world/physics.js';
import { WST, WSTN, hsh, windows } from './blocks.js';
import { O_SIZES, O_TURNS } from './bake.js';
export function drawGrave(i) {
  const tx = i % MW,
    ty = (i / MW) | 0,
    h = hsh(tx, ty),
    k = Math.floor(h * 8) % 8,
    sc = 1.2 + hsh(ty * 7, tx * 3) * 0.4,
    ox = (hsh(tx * 5, ty) - 0.5) * 8,
    x = (tx + 0.5) * TILE + ox,
    y = (ty + 0.5) * TILE,
    tilt = (hsh(tx, ty * 11) - 0.5) * 0.18; // no two rows alike: size, offset and lean vary
  if (GS.SHMODE) {
    setH(18 * sc);
    quad(R.pixel, x, y - 6, 0, 5 * sc, 1.6, 1, 1, 1, 1, 0, 0, 0, 0);
    return;
  }
  quad(R['grave' + k], x, y - 18 * sc, tilt, sc, sc, 0.92, 0.92, 0.92, 1, 0, 0, 0, 0);
}
export function drawPole(x, y, h, w, col = 0.16) {
  if (GS.SHMODE) {
    const s = GS.SHMODE === 1 ? 1 : 0;
    setH(0);
    lineQ(x, y, x + SUNV[0] * h * s + 0.01, y + SUNV[1] * h * s + 0.01, w, 1, 1, 1, 1, 0, 0, 0, 0, R.pixel);
    return;
  }
  lineQ(x, y, x, y - h, w, col, col, col * 1.08, 1, 0, 0, 0, 0, R.pixel);
}
export const LAMPV = L => (L.lantern ? 10 : 20); // seen from almost straight above, a lamp head sits just above its light pool, not a pole's height up the screen (the shadow still shows how tall it is)
export function drawLampPole(L) {
  if (L.down) {
    if (GS.SHMODE) return;
    const ex = L.bx + Math.cos(L.fa) * 66,
      ey = L.by + Math.sin(L.fa) * 66;
    setH(1);
    const c0 = Math.cos(L.fa),
      s0 = Math.sin(L.fa);
    lineQ(L.bx + c0 * 8 + 1.5, L.by + s0 * 8 + 3, ex + 1.5, ey + 3, 7, 0, 0, 0, 0.35, 0, 0, 0, 0, R.pixel);
    quad(R.pixel, L.bx, L.by, L.fa, 1.8, 1.8, 0.18, 0.18, 0.2, 1, 0, 0, 0, 0);
    quad(R.pixel, L.bx + c0 * 3, L.by + s0 * 3, L.fa + 0.6, 0.9, 0.6, 0.45, 0.42, 0.38, 1, 0, 0, 0, 0);
    lineQ(L.bx + c0 * 7, L.by + s0 * 7, ex, ey, 5.5, 0.3, 0.3, 0.33, 1, 0, 0, 0, 0, R.pixel);
    lineQ(
      L.bx + c0 * 7 - s0 * 1.2,
      L.by + s0 * 7 + c0 * 1.2,
      ex - s0 * 1.2,
      ey + c0 * 1.2,
      1.4,
      0.5,
      0.5,
      0.52,
      0.8,
      0,
      0,
      0,
      0,
      R.pixel
    ); // the snapped stump stays bolted down; the pole lies away from it, a highlight along its top
    quad(R.lamp, ex, ey, L.fa, 1.1, 1.1, 0.85, 0.85, 0.85, 1, 0, 0, 0, 0);
    return;
  }
  if (GS.SHMODE) {
    const h = L.lantern ? 30 : 66;
    drawPole(L.bx, L.by, h, L.lantern ? 3 : 4.5);
    return;
  }
  const v = LAMPV(L);
  quad(R.glow, L.bx + 3, L.by + 3, 0, 0.16, 0.13, 0, 0, 0, 0.55, 0, 0, 0, 0);
  lineQ(L.bx, L.by + 1, L.bx, L.by - v, L.lantern ? 4 : 6.5, 0.2, 0.2, 0.22, 1, 0, 0, 0, 0, R.pixel);
  quad(R.pixel, L.bx, L.by - v, 0, L.lantern ? 1.1 : 1.6, L.lantern ? 1.1 : 1.6, 0.27, 0.27, 0.3, 1, 0, 0, 0, 0);
} // the pole seen end-on from above: a short dark column with its cap; the arm reaches out from the cap
export function drawTrunk(t) {
  if (GS.SHMODE) {
    drawPole(t.x, t.y, 40 * t.s, 9 * t.s, 0.2);
    return;
  }
  const h = 40 * t.s;
  lineQ(t.x, t.y, t.x, t.y - h * 0.55, 11 * t.s, 0.2, 0.16, 0.12, 1, 0, 0, 0, 0, R.pixel);
  lineQ(t.x, t.y - h * 0.5, t.x, t.y - h, 8 * t.s, 0.26, 0.21, 0.16, 1, 0, 0, 0, 0, R.pixel);
  quad(R.glow, t.x, t.y, 0, 0.3 * t.s, 0.16 * t.s, 0, 0, 0, 0.5, 0, 0, 0, 0);
} // the trunk: brown bark, thicker at the root flare, the same colour as the limbs above
/* ---------- decor ---------- */
const DECOR = {
  hydrant: { reg: 'p_hydrant', n: 6, step: 2, shoot: true, o: 'o_hydrant' },
  mailbox: { reg: 'p_mailbox', n: 9, step: 2, o: 'o_mailbox' },
  trash: { reg: 'p_trash', n: 7, step: 2, shoot: true, o: 'o_bin' },
  dumpster: { reg: 'p_dumpster', n: 9, step: 2.2, o: 'o_dump' },
  cone: { reg: 'p_cone', n: 6, step: 2, taper: true, o: 'o_cone' },
  cart: { reg: 'p_cart', n: 4, step: 3, o: 'o_cart' },
  news: { reg: 'p_news', n: 8, step: 2, o: 'o_news' },
  bench: { reg: 'p_bench', n: 3, step: 3, o: 'o_bench' },
  tire: { reg: 'p_tire', n: 3, step: 2, o: 'o_tyre' },
  coffin: { reg: 'p_coffin', n: 4, step: 2, o: 'o_coffin' },
  wreath: { reg: 'p_wreath', n: 1, step: 1 },
}; // o: the 3D picture (bake-shapes.js) drawn instead of the stacked slices when it is there
export function genDecor() {
  GS.decor = [];
  GS.jets = [];
  const D = GS.RUN.district || 'town',
    c0 = MW / 2;
  const spot = (pred, minGap = 3) => {
    for (let k = 0; k < 60; k++) {
      const tx = randi(3, MW - 4),
        ty = randi(3, MH - 4),
        i = ty * MW + tx;
      if (grid[i] || !pred(tx, ty, i) || Math.hypot(tx - c0, ty - c0) < 4) continue;
      if (GS.decor.some(d => Math.hypot(d.tx - tx, d.ty - ty) < minGap)) continue;
      return [tx, ty];
    }
    return null;
  };
  const put = (kind, n, pred, extra = {}) => {
    for (let j = 0; j < n; j++) {
      const s = spot(pred, extra.gap || 3);
      if (!s) continue;
      const [tx, ty] = s;
      GS.decor.push(
        Object.assign(
          { kind, tx, ty, x: (tx + 0.5) * TILE + rand(-8, 8), y: (ty + 0.5) * TILE + rand(-8, 8), a: rand(0, TAU) },
          extra.fn ? extra.fn(tx, ty) : {}
        )
      );
    }
  };
  const side = (tx, ty, i) => ROAD[i] === 2,
    lot = (tx, ty, i) => !ROAD[i],
    road = (tx, ty, i) => ROAD[i] === 1 || ROAD[i] === 3;
  const nearHouse = (tx, ty, i) =>
    !ROAD[i] && houses.some(o => tx >= o.x - 1 && tx <= o.x + o.w && ty >= o.y - 1 && ty <= o.y + o.h);
  if (D === 'town') {
    put('hydrant', 14, side, { fn: () => ({ a: 0 }) });
    put('mailbox', 6, side, { fn: () => ({ a: 0 }) });
    put('trash', 12, (tx, ty, i) => side(tx, ty, i) || nearHouse(tx, ty, i));
    put('news', 4, side, { fn: () => ({ a: 0 }) });
    put('cone', 18, road, { gap: 1 });
    put('cart', 6, (tx, ty, i) => road(tx, ty, i) || lot(tx, ty, i));
    put('bench', 5, side, { fn: () => ({ a: 0 }) });
    put('tire', 5, lot);
    for (let j = 0; j < 5; j++) {
      const s = spot(nearHouse, 4);
      if (!s) continue;
      const [tx, ty] = s;
      grid[ty * MW + tx] = 1;
      ttype[ty * MW + tx] = 10;
      GS.decor.push({ kind: 'dumpster', tx, ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, a: pick([0, Math.PI]) });
    }
    for (const rx of RX)
      for (const ry of RY)
        for (const [dx, dy] of [
          [-2.4, -2.4],
          [2.4, 2.4],
        ]) {
          if (Math.random() < 0.25) continue;
          const x = (rx + 0.5 + dx) * TILE,
            y = (ry + 0.5 + dy) * TILE;
          GS.decor.push({
            kind: 'tlight',
            tx: Math.floor(x / TILE),
            ty: Math.floor(y / TILE),
            x,
            y,
            a: dx < 0 ? 0 : Math.PI,
            ph: ((rx + ry) * 3.7) % 14,
            broken: Math.random() < 0.25,
          });
        }
    for (const rx of RX)
      for (const ry of RY)
        if (Math.random() < 0.5) {
          const x = (rx + 0.5 + 2.4) * TILE,
            y = (ry + 0.5 - 2.4) * TILE;
          GS.decor.push({ kind: 'stop', tx: Math.floor(x / TILE), ty: Math.floor(y / TILE), x, y, a: 0 });
        }
    for (let j = 0; j < 2; j++) {
      const s = spot((tx, ty, i) => side(tx, ty, i) && side(tx + 1, ty, i + 1) && ROAD[i - MW] === 1, 6);
      if (s) GS.decor.push({ kind: 'bus', tx: s[0], ty: s[1], x: (s[0] + 1) * TILE, y: (s[1] + 0.5) * TILE, a: 0 });
    }
    const pc = cars.filter(c => !c.truck && !c.burnt);
    if (pc.length) {
      const c = pick(pc);
      c.police = true;
      c.lights = 1;
    }
  } else if (D === 'highway') {
    put('cone', 30, road, { gap: 1 });
    put('tire', 12, (tx, ty, i) => true);
    put('trash', 5, nearHouse);
    for (let j = 0; j < 2; j++) {
      const s = spot(nearHouse, 4);
      if (!s) continue;
      const [tx, ty] = s;
      grid[ty * MW + tx] = 1;
      ttype[ty * MW + tx] = 10;
      GS.decor.push({ kind: 'dumpster', tx, ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, a: 0 });
    }
    const pc = cars.filter(c => !c.truck && !c.burnt);
    for (let j = 0; j < 2 && pc.length; j++) {
      const c = pc.splice(randi(0, pc.length - 1), 1)[0];
      c.police = true;
      c.lights = 1;
    }
  } else {
    put(
      'bench',
      6,
      (tx, ty, i) => {
        for (const [ox, oy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          if (ROAD[(ty + oy) * MW + tx + ox] === 4) return !ROAD[i];
        return false;
      },
      { fn: () => ({ a: 0 }) }
    );
    put('wreath', 14, (tx, ty, i) => ttype[i + MW] === 8 || ttype[i - MW] === 8, { gap: 2 });
    put('coffin', 4, lot);
    put('tire', 2, lot);
  }
  for (const c of cars) if (!c.police && !c.burnt && Math.random() < 0.3) c.lights = 1;
}
export function decorKey(d) {
  const D = DECOR[d.kind];
  if (D && D.n * D.step <= 12 && !d.down) return d.y - 34; // knee-high: a bench or a cone sits under anyone standing at it, so it never covers a gun
  return d.kind === 'tlight' || d.kind === 'stop' ? d.y : d.kind === 'bus' ? d.y + 16 : d.y + 6;
}
function tlightState(d) {
  if (GS.ev === 'blackout') return -1; // no mains power: the signals go dark with the street lights
  if (d.broken) return Math.sin(GS.time * 9 + d.ph) > 0.4 ? 1 : -1;
  const t = (GS.time + d.ph) % 14;
  return t < 6 ? 2 : t < 8 ? 1 : 0;
}
export function drawDecor(d) {
  const k = d.kind;
  if (d.down && (k === 'tlight' || k === 'stop')) {
    if (GS.SHMODE) return;
    const h = k === 'tlight' ? 64 : 40,
      ex = d.x + Math.cos(d.fa) * h,
      ey = d.y + Math.sin(d.fa) * h;
    setH(1);
    lineQ(d.x + 2, d.y + 4, ex + 2, ey + 4, 7, 0, 0, 0, 0.45, 0, 0, 0, 0, R.pixel);
    lineQ(d.x, d.y, ex, ey, 4.5, 0.34, 0.34, 0.37, 1, 0, 0, 0, 0, R.pixel);
    quad(k === 'tlight' ? R.p_tl : R.p_stop, ex, ey, d.fa + Math.PI / 2, 1, 1, 0.85, 0.85, 0.85, 1, 0, 0, 0, 0);
    return;
  }
  if (k === 'tlight') {
    const h = 64,
      ax = d.x + Math.cos(d.a) * 46;
    drawPole(d.x, d.y, h, 4);
    if (GS.SHMODE) {
      setH(h);
      lineQ(d.x, d.y, ax, d.y, 3, 1, 1, 1, 1, 0, 0, 0, 0, R.pixel);
      quad(R.p_tl, ax, d.y, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0);
      return;
    }
    lineQ(d.x, d.y - h, ax, d.y - h, 3, 0.16, 0.16, 0.18, 1, 0, 0, 0, 0, R.pixel);
    const s = tlightState(d);
    quad(R.p_tl, ax, d.y - h + 6, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0);
    if (s >= 0) {
      const col = s === 2 ? [0.3, 2.6, 0.8] : s === 1 ? [2.8, 2.0, 0.3] : [2.8, 0.35, 0.25],
        oy = s === 2 ? 6 : s === 1 ? 0 : -6;
      quad(R.pixel, ax, d.y - h + 6 + oy, 0, 1.1, 1.1, 0, 0, 0, 1, col[0], col[1], col[2], 1);
    }
    return;
  }
  if (k === 'stop') {
    drawPole(d.x, d.y, 40, 3);
    if (GS.SHMODE) {
      setH(40);
      quad(R.p_stop, d.x, d.y, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0);
      return;
    }
    quad(R.p_stop, d.x, d.y - 46, 0, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0);
    return;
  }
  if (k === 'bus') {
    for (const ox of [-34, 34]) drawPole(d.x + ox, d.y + 10, 34, 3);
    if (GS.SHMODE) {
      setH(36);
      quad(R.p_busroof, d.x, d.y, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0);
      return;
    }
    quad(R.p_busglass, d.x, d.y - 4, 0, 1, 1, 1, 1, 1, 0.55, 0.15, 0.2, 0.25, 0);
    quad(R.p_busroof, d.x, d.y - 34, 0, 1, 1, 1, 1, 1, 1, 0.4, 0.4, 0.4, 0);
    return;
  }
  const D = DECOR[k];
  if (!D) return;
  const reg = R[D.reg];
  const K = D.sc || 1;
  if (d.down) {
    if (!GS.SHMODE) quad(reg, d.x, d.y, d.a, K, 0.8 * K, 0.7, 0.7, 0.7, 1, 0, 0, 0, 0);
    return;
  }
  if (GS.SHMODE) {
    setH(D.n * D.step);
    quad(reg, d.x, d.y, d.a, K, K, 1, 1, 1, 1, 0, 0, 0, 0);
    return;
  }
  if (D.o && drawProp(D.o, d.x, d.y, d.a)) return;
  for (let j = 0; j <= D.n; j++) {
    const sh = 0.45 + (0.55 * j) / D.n,
      s = (D.taper ? 1 - (j / D.n) * 0.7 : 1) * K;
    quad(reg, d.x, d.y - j * D.step, d.a, s, s, sh, sh, sh, 1, 0, 0, 0, 0);
  }
}
// draws a street prop from its 3D picture, if it has one: the one for the nearest heading, its foot on the spot
// (a picture's centre sits half the object's height up). False when there is no picture, to draw the slices instead
export function drawProp(name, x, y, a = 0) {
  const t = O_TURNS[name],
    r = R[t ? name + (((Math.round((a / TAU) * t) % t) + t) % t) : name];
  if (!r || !r.bk) return false;
  const z = O_SIZES[t ? name + 0 : name][2];
  setH(z);
  quad(r, x, y - z / 2, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0);
  return true;
}
export function decorShot(b) {
  if (propShot(b)) return true;
  for (const d of GS.decor) {
    const D = DECOR[d.kind];
    if (!D || !D.shoot || d.down) continue;
    if (d2(b.x, b.y, d.x, d.y - 6) > 13 * 13) continue;
    if (d.kind === 'hydrant') {
      if (!d.jet) {
        d.jet = 8;
        GS.jets.push(d);
        playS('dry', 0.2, 0.6, 0, 0);
        noise(0.6, 0.12, 2400, 1200, 'bandpass');
      }
      sparks(b.x, b.y, [1, 0.9, 0.7], 3, 200);
    } else if (d.kind === 'trash') {
      d.down = true;
      d.a = Math.atan2(b.vy, b.vx);
      d.x += Math.cos(d.a) * 8;
      d.y += Math.sin(d.a) * 8;
      chips(d.x, d.y, 6, [0.8, 0.78, 0.7], 3, 200);
      sfx.crunch(d.x, d.y);
    }
    return true;
  }
  return false;
}
export function updateJets(dt) {
  for (const d of GS.jets) {
    d.jet -= dt;
    if (d.jet <= 0) continue;
    const vis = Math.abs(d.x - cam.x - viewW / 2) < viewW && Math.abs(d.y - cam.y - viewH / 2) < viewH;
    if (!vis) continue;
    for (let n = 0; n < 3; n++) {
      const a = -Math.PI / 2 + rand(-0.25, 0.25),
        s = rand(40, 120);
      part({
        k: 11,
        x: d.x + rand(-2, 2),
        y: d.y - 10,
        z: 10,
        vz: rand(280, 380) * Math.min(1, d.jet / 2),
        vx: Math.cos(a) * s * 0.4 + rand(-30, 30),
        vy: rand(-30, 30),
        life: 1.4,
        max: 1.4,
        size: rand(0.12, 0.2),
        drag: 0.6,
      });
    }
    if (Math.random() < dt * 3)
      decal(
        R['splat' + randi(0, 3)],
        d.x + rand(-30, 30),
        d.y + rand(-30, 30),
        rand(0.3, 0.6),
        [0.22, 0.24, 0.28, 0.6],
        [0, 0, 0],
        20
      );
    query(d.x, d.y, 60, e => {
      if (!e.dead && d2(e.x, e.y, d.x, d.y) < 50 * 50) {
        const a = Math.atan2(e.y - d.y, e.x - d.x);
        e.kx += Math.cos(a) * 200 * dt;
        e.ky += Math.sin(a) * 200 * dt;
        if (e.burn > 0) e.burn = 0;
      }
    });
  }
  GS.jets = GS.jets.filter(d => d.jet > 0);
}
export function decorLights() {
  if (GS.ev !== 'blackout')
    for (const w of windows)
      if (!w.broke)
        addLight(w.x, w.y, w.cool ? 170 : 140, w.cool ? 0.45 : 0.62, w.cool ? 0.6 : 0.42, w.cool ? 0.55 : 0.2);
  for (const c of cars) {
    if (c.dead || c.burnt) continue;
    if (c.alarm > 0) {
      const on = (c.alarm * 2.2) % 1 < 0.5;
      if (on) {
        for (const sd of [1, -1])
          addLight(c.x + Math.cos(c.a) * 36 * sd, c.y + Math.sin(c.a) * 36 * sd, 170, 1.1, 0.62, 0.12);
        addLight(c.x + Math.cos(c.a) * 40, c.y + Math.sin(c.a) * 40, 360, 0.8, 0.78, 0.66, c.a, 0.9);
      }
    }
    if (c.police) {
      const on = Math.sin(GS.time * 14) > 0;
      addLight(c.x, c.y, 300, on ? 0.12 : 0.75, 0.08, on ? 0.85 : 0.12);
    }
    if (c.lights) {
      const k = c.hp < c.max * 0.5 && Math.sin(GS.time * 23 + c.x) > 0.3 ? 0.15 : 1,
        fx = c.x + Math.cos(c.a) * 40,
        fy = c.y + Math.sin(c.a) * 40;
      addLight(fx, fy, 380, 1.0 * k, 0.95 * k, 0.8 * k, c.a, 0.9);
    }
  }
  for (let i = 0; i < GS.grassFire.length; i += 5) {
    const g = GS.grassFire[i],
      fk = 0.75 + Math.sin(GS.time * 11 + g.ph) * 0.25;
    addLight(g.x, g.y, 150, 0.9 * fk, 0.42 * fk, 0.1 * fk);
  }
  for (const d of GS.decor)
    if (d.kind === 'tlight' && !d.down) {
      const s = tlightState(d);
      if (s < 0) continue;
      const ax = d.x + Math.cos(d.a) * 46,
        col = s === 2 ? [0.1, 0.6, 0.25] : s === 1 ? [0.7, 0.5, 0.08] : [0.75, 0.1, 0.08];
      addLight(ax, d.y, 120, col[0], col[1], col[2]);
    }
}
export function drawHouseRoofs() {
  for (const o of houses) {
    if (!o.roof) continue;
    const RH = (WSTN[WST[o.y * MW + o.x]] === 'conc' ? 30 : WSTN[WST[o.y * MW + o.x]] === 'stone' ? 30 : 28) + 2;
    const x0 = o.x * TILE,
      y0 = o.y * TILE,
      x1 = (o.x + o.w) * TILE,
      y1 = (o.y + o.h) * TILE;
    if (x1 < GS.camX - 40 || x0 > GS.camX + viewW + 40 || y1 < GS.camY - 40 || y0 - RH > GS.camY + viewH + 40) continue;
    const inside = GS.P && GS.P.x > x0 - 6 && GS.P.x < x1 + 6 && GS.P.y > y0 - RH - 10 && GS.P.y < y1 + 4;
    o.fade += ((inside ? 0.12 : 1) - o.fade) * 0.15;
    GS.gA = o.fade;
    const flat = o.style === 'crypt' || o.style === 'store',
      rx = o.w >= o.h,
      tc = o.style === 'crypt' ? [0.8, 1, 1] : o.style === 'store' ? [1, 1.1, 1] : [1, 1, 1]; // houses get a pitched roof: a ridge along the long side, the slope facing the light paler than the one turned away
    for (let ty = o.y; ty < o.y + o.h; ty++)
      for (let tx = o.x; tx < o.x + o.w; tx++) {
        const sm = (fx, fy) => (hsh(fx, fy) + hsh(fx + 1, fy) + hsh(fx, fy + 1) + hsh(fx + 1, fy + 1)) * 0.25,
          n = sm(tx >> 1, ty >> 1) * 0.6 + hsh(tx * 7 + 1, ty * 11 + 3) * 0.4,
          m = sm((tx + 3) >> 1, (ty + 5) >> 1),
          u = rx ? (ty - o.y + 0.5) / o.h : (tx - o.x + 0.5) / o.w,
          lit = u < 0.5;
        let k = flat ? 1.35 : lit ? 1.7 - (0.5 - u) * 0.2 : 1.12 - (u - 0.5) * 0.12;
        k *= 0.95 + 0.08 * n; // weathering that drifts across the roof in patches, not tile by tile
        const mo = clamp((0.36 - m) * 4, 0, 1) * 0.12,
          t = [1 - mo * 1.2, 1, 1 - mo * 1.6]; // moss creeping in where the roof stays damp, fading in and out
        const rot = flat ? 0 : rx ? (lit ? Math.PI : 0) : lit ? Math.PI / 2 : -Math.PI / 2;
        quad(
          R.roof_t,
          (tx + 0.5) * TILE,
          (ty + 0.5) * TILE - RH,
          rot,
          1.02,
          1.02,
          tc[0] * t[0] * k,
          tc[1] * t[1] * k,
          tc[2] * t[2] * k,
          1,
          0,
          0,
          0,
          0
        );
      }
    if (!flat) {
      // the ridge cap and its highlight
      if (rx) {
        const ry = (y0 + y1) / 2 - RH;
        lineQ(x0 + 4, ry, x1 - 4, ry, 7, 0.22, 0.2, 0.19, 1, 0, 0, 0, 0, R.pixel);
        lineQ(x0 + 4, ry - 2, x1 - 4, ry - 2, 2, 0.7, 0.66, 0.6, 1, 0, 0, 0, 0, R.pixel);
      } else {
        const rxx = (x0 + x1) / 2;
        lineQ(rxx, y0 - RH + 4, rxx, y1 - RH - 4, 7, 0.22, 0.2, 0.19, 1, 0, 0, 0, 0, R.pixel);
        lineQ(rxx - 2, y0 - RH + 4, rxx - 2, y1 - RH - 4, 2, 0.7, 0.66, 0.6, 1, 0, 0, 0, 0, R.pixel);
      }
    }
    lineQ(x0 + 2, y0 - RH + 1.5, x1 - 2, y0 - RH + 1.5, 2.2, 0.32, 0.32, 0.3, 1, 0, 0, 0, 0, R.pixel); // the far gutter
    for (let tx = o.x; tx < o.x + o.w; tx++)
      quad(R.roof_edge, (tx + 0.5) * TILE, y1 - RH + 4, 0, 1.02, 1, 1, 1, 1, 1, 0, 0, 0, 0);
    const h = hsh(o.x * 5 + 2, o.y * 7 + 1),
      sp = (fx, fy) => [x0 + fx * (x1 - x0), y0 + fy * (y1 - y0) - RH]; // the things that stick out of a roof, placed the same way every night
    if (!flat && o.style !== 'chapel') {
      const [cx, cy] = rx ? sp(0.25 + h * 0.5, 0.36) : sp(0.36, 0.25 + h * 0.5);
      setH(14);
      quad(R.r_chim, cx, cy - 6, 0, 1.2, 1.2, 1.35, 1.3, 1.25, 1, 0, 0, 0, 0);
    }
    for (let i = 0; i < 2; i++) {
      const a = hsh(o.x + i * 17, o.y * 3 + i);
      if (a < 0.6) {
        const [vx, vy] = sp(0.15 + a * 1.1, rx ? 0.7 : 0.3 + a * 0.5);
        setH(3);
        quad(R.r_vent, vx, vy, 0, 1.15, 1.15, 1.4, 1.4, 1.4, 1, 0, 0, 0, 0);
      }
    }
    if (!flat && h > 0.68) {
      const [dx, dy] = sp(0.8, 0.28);
      setH(6);
      quad(R.r_dish, dx, dy, h * 6, 1.1, 1.1, 1.3, 1.3, 1.3, 1, 0, 0, 0, 0);
    }
    if (h < 0.22 || o.style === 'store') {
      const [kx, ky] = sp(0.55, rx ? 0.68 : 0.5);
      setH(1);
      quad(R.r_sky, kx, ky, rx ? 0 : Math.PI / 2, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0);
    }
    GS.gA = 1;
  }
}
export function roofShadows() {
  for (const o of houses)
    if (o.roof) {
      setH(0);
      quad(R.pixel, (o.x + o.w / 2) * TILE, (o.y + o.h / 2) * TILE, 0, o.w * 10, o.h * 10, 1, 1, 1, 1, 0, 0, 0, 0);
    }
}

/* ---------- Fire: flames, smoke, burning, fire pools, cars, molotovs ---------- */
