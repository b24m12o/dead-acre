/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, clamp, d2 } from '../core/util.js';
import { TS } from '../core/settings.js';
import { ui } from '../render/gl.js';
import { VH, VW, ZOOM, addLight, lineQ, quad, viewH, viewW } from '../render/sprites.js';
import { R, rr } from '../render/atlas.js';
import { cam } from '../game/state.js';
import { TRAIT } from '../actors/enemies.js';
import { hudRects, inRect, safeLabel } from './hud.js';
import { budTag } from '../actors/backups.js';
import { BOX_SEARCH } from '../game/objectives.js';
import { drawRainUI } from '../world/weather.js';
import { cars } from '../world/map.js';
export function drawObjectiveGlow() {
  if (GS.evac) {
    const pu = (0.6 + Math.sin(GS.time * 6) * 0.3) * (GS.evac.t >= GS.evac.land ? 0.16 : 1); // once it is down, the ring fades so the chopper itself reads
    quad(
      R.ring,
      GS.evac.x,
      GS.evac.y,
      GS.time * 0.5,
      80 / 58,
      80 / 58,
      0,
      0,
      0,
      0.8,
      0.18 * pu,
      0.6 * pu,
      0.26 * pu,
      0
    );
    if (GS.evac.hold > 0) quad(R.glow, GS.evac.x, GS.evac.y, 0, 1.2, 1.2, 0, 0, 0, 0.35, 0.08, 0.35, 0.12, 0);
    quad(R.glow, GS.evac.x + 40, GS.evac.y + 30, 0, 0.4 + Math.random() * 0.1, 0.4, 0, 0, 0, 1, 1.5, 0.25, 0.18, 0);
  }
  if (GS.obj && GS.obj.type === 'fuel')
    for (const c of GS.obj.cans) if (!c.got) quad(R.glow, c.x, c.y, 0, 0.6, 0.6, 0, 0, 0, 1, 0.6, 0.4, 0.1, 0);
  if (GS.obj && GS.obj.type === 'box' && !GS.obj.done && GS.obj.batt > 0) {
    const bx = GS.obj.piles.find(q => q.box);
    if (bx && d2(bx.x, bx.y, GS.P.x, GS.P.y) < 200 * 200 && (GS.time * 1.6) % 1 < 0.12)
      quad(R.glow, bx.x, bx.y - 4, 0, 0.16, 0.16, 0, 0, 0, 1, 1.2 * GS.obj.batt, 0.1, 0.05, 0);
  } // a pinprick of red in the wreckage, only up close
  if (GS.evac)
    for (const t of GS.evac.tr) {
      const f = 1 - t.t / 0.07,
        f0 = Math.max(0, f - 0.45),
        dx = t.x1 - t.x0,
        dy = t.y1 - t.y0;
      lineQ(t.x0 + dx * f0, t.y0 + dy * f0, t.x0 + dx * f, t.y0 + dy * f, 2.2, 0, 0, 0, 0.9, 2.6, 1.7, 0.7, 0, R.pixel);
      if (f > 0.9) quad(R.glow, t.x1, t.y1, 0, 0.18, 0.18, 0, 0, 0, 1, 1.4, 0.9, 0.4, 0);
    } // door-gun tracers
}
export function objectiveLights() {
  if (GS.obj && GS.obj.type === 'gen' && GS.obj.hp > 0) addLight(GS.obj.x, GS.obj.y - 30, 200, 0.4, 0.36, 0.28);
  if (GS.obj && GS.obj.type === 'rescue' && GS.obj.s.hp > 0 && !GS.obj.joined)
    addLight(
      GS.obj.s.x + Math.cos(GS.obj.s.aimA) * 8,
      GS.obj.s.y + Math.sin(GS.obj.s.aimA) * 8,
      420,
      0.6,
      0.6,
      0.5,
      GS.obj.s.aimA,
      0.86
    );
  if (GS.evac) {
    const landed = GS.evac.t >= GS.evac.land;
    addLight(GS.evac.x + 40, GS.evac.y + 30, 200, 0.95, 0.17, 0.1); // the flare: a red glow on the tarmac, not a blob
    addLight(
      GS.evac.hx,
      GS.evac.hy,
      landed ? 300 : 360,
      landed ? 0.85 : 1.1,
      landed ? 0.88 : 1.15,
      landed ? 0.92 : 1.2
    );
  }
}
export function markerList() {
  const m = [];
  if (GS.evac) m.push({ x: GS.evac.x, y: GS.evac.y, col: '#8ef0a0', label: 'EVAC' });
  for (const b of GS.buddies)
    if (
      b.down > 0 &&
      (Math.abs(b.x - cam.x - viewW / 2) > viewW / 2 - 20 || Math.abs(b.y - cam.y - viewH / 2) > viewH / 2 - 20)
    )
      m.push({ x: b.x, y: b.y, col: '#ff6a5a', label: `${(b.nm || 'BACKUP').toUpperCase()} ${Math.ceil(b.down)} S` }); // off screen and bleeding out: which way
  if (GS.RUN.sg && GS.RUN.sg.horde && GS.time < GS.RUN.sg.horde.t && GS.nightLive && !GS.nightDone)
    m.push({ x: GS.RUN.sg.horde.x, y: GS.RUN.sg.horde.y, col: '#ff8a6a', label: 'HORDE' });
  if (GS.horde && !GS.horde.done)
    for (const c of cars) if (c.tanker && !c.dead) m.push({ x: c.x, y: c.y, col: '#ff9a4a', label: 'FUEL TANKER' }); // tonight it's a weapon
  if (GS.horde && !GS.horde.done && GS.horde.startT <= 0 && !GS.horde.alert && GS.horde.spawned)
    m.push({ x: GS.horde.x, y: GS.horde.y, col: '#e8b25a', label: 'HORDE' }); // where the mass is while it roams
  if (GS.obj && !GS.obj.done) {
    if (GS.obj.type === 'gen') m.push({ x: GS.obj.x, y: GS.obj.y, col: '#ffe08a', label: 'GENERATOR' });
    if (GS.obj.type === 'rescue' && !GS.obj.joined)
      m.push({ x: GS.obj.s.x, y: GS.obj.s.y, col: '#bff4ff', label: 'SURVIVOR' });
    if (GS.obj.type === 'fuel')
      for (const c of GS.obj.cans)
        if (!c.got) {
          m.push({ x: c.x, y: c.y, col: c.reg === 'medkit' ? '#8ef0a0' : '#ffb070', label: c.label || 'FUEL' });
        }
    if (GS.obj.type === 'hunt')
      for (const e of GS.enemies)
        if (e.mark && !e.dead)
          m.push({
            x: e.x,
            y: e.y,
            col: '#ff9a7a',
            label: e.emerge >= 1 ? `MARKED ${Math.max(0, Math.ceil(e.markT ?? 50))} s` : 'MARKED',
          });
  }
  return m;
}
/* off-screen indicators: one frame inset from the screen edge, kept clear of HUD panels; arrows pointing the same way merge into one with a count */
const IND = [];
function edgeSpot(a) {
  const cx = VW / 2,
    cy = VH / 2,
    x0 = 30,
    x1 = VW - 30,
    y0 = 30,
    y1 = VH - 38,
    c = Math.cos(a),
    s = Math.sin(a);
  const k = Math.min(
    c > 1e-6 ? (x1 - cx) / c : c < -1e-6 ? (x0 - cx) / c : 1e9,
    s > 1e-6 ? (y1 - cy) / s : s < -1e-6 ? (y0 - cy) / s : 1e9
  );
  let x = cx + c * k,
    y = cy + s * k;
  const rects = hudRects();
  for (let it = 0; it < 4; it++) {
    let mv = false;
    for (const q of rects)
      if (inRect(x, y, q, 16)) {
        y = y > cy ? q.t - 22 : q.b + 22;
        mv = true;
      }
    if (!mv) break;
  }
  return [x, y];
}
export function pushInd(o) {
  const [x, y] = edgeSpot(o.a);
  o.x = x;
  o.y = y;
  o.n = 1;
  for (const q of IND)
    if (q.grp === o.grp && Math.abs(q.x - x) < 34 && Math.abs(q.y - y) < 34) {
      q.n++;
      if (o.dist < q.dist) q.dist = o.dist;
      q.lab = q.lab || o.lab;
      q.pulse = q.pulse || o.pulse;
      return;
    }
  for (let it = 0; it < 4; it++) {
    const q = IND.find(q => Math.abs(q.x - o.x) < 26 && Math.abs(q.y - o.y) < 26);
    if (!q) break;
    const side = Math.abs(o.y - VH / 2) > (Math.abs(o.x - VW / 2) * VH) / VW;
    if (side) o.x += o.x >= q.x ? 30 : -30;
    else o.y += o.y >= q.y ? 30 : -30;
  }
  {
    const rects = hudRects();
    for (let it = 0; it < 4; it++) {
      let mv = false;
      for (const q of rects)
        if (inRect(o.x, o.y, q, 16)) {
          o.y = o.y > VH / 2 ? q.t - 22 : q.b + 22;
          mv = true;
        }
      if (!mv) break;
    }
  } // nudged apart, then kept off the HUD again
  IND.push(o);
}
export function drawInd() {
  const used = [],
    rects = hudRects(),
    dark = 'rgba(20,24,29,0.85)';
  IND.sort(
    (p, q) =>
      (p.kind === 'marker' ? 0 : p.grp === 'boss' ? 1 : p.kind === 'crate' ? 2 : 3) -
      (q.kind === 'marker' ? 0 : q.grp === 'boss' ? 1 : q.kind === 'crate' ? 2 : 3)
  );
  for (const o of IND) {
    ui.save();
    ui.translate(o.x, o.y);
    ui.rotate(o.a);
    ui.fillStyle = o.col;
    ui.strokeStyle = dark;
    ui.lineWidth = 3;
    ui.lineJoin = 'round';
    if (o.kind === 'enemy') {
      const pu = o.pulse ? 1 + Math.sin(GS.time * 7) * 0.15 : 1;
      ui.scale(pu, pu);
      ui.beginPath();
      ui.moveTo(15, 0);
      ui.lineTo(-8, -10);
      ui.lineTo(-3, 0);
      ui.lineTo(-8, 10);
      ui.closePath();
      ui.stroke();
      ui.fill();
    } else if (o.kind === 'crate') {
      ui.fillRect(-7, -7, 14, 14);
      ui.strokeRect(-7, -7, 14, 14);
      ui.beginPath();
      ui.moveTo(18, 0);
      ui.lineTo(9, -6);
      ui.lineTo(9, 6);
      ui.closePath();
      ui.stroke();
      ui.fill();
    } else {
      ui.beginPath();
      ui.arc(0, 0, 7, 0, TAU);
      ui.stroke();
      ui.fill();
      ui.beginPath();
      ui.moveTo(18, 0);
      ui.lineTo(9, -6);
      ui.lineTo(9, 6);
      ui.closePath();
      ui.stroke();
      ui.fill();
    }
    ui.restore();
    if (!o.lab && o.n < 2) continue;
    const txt = [o.name, o.n > 1 ? `×${o.n}` : '', o.lab ? o.dist + ' m' : '']
      .filter(Boolean)
      .join(o.name ? ' ' : ' · ');
    ui.font = `600 ${(o.name ? 10 : 11) * TS()}px "JetBrains Mono", monospace`;
    ui.textAlign = 'center';
    const w = ui.measureText(txt).width;
    let tx = o.x - Math.cos(o.a) * (16 + w / 2),
      ty = o.y - Math.sin(o.a) * 22 + 4;
    tx = clamp(tx, w / 2 + 6, VW - w / 2 - 6);
    for (let it = 0; it < 3; it++) {
      const q = rects.find(q => tx + w / 2 > q.l - 6 && tx - w / 2 < q.r + 6 && ty > q.t - 6 && ty - 10 < q.b + 6);
      if (!q) break;
      ty = o.y > VH / 2 ? q.t - 10 : q.b + 16;
    }
    if (used.some(([ux, uy, uw]) => Math.abs(ux - tx) < (uw + w) / 2 + 4 && Math.abs(uy - ty) < 14)) continue;
    used.push([tx, ty, w]);
    ui.lineWidth = 3;
    ui.strokeStyle = dark;
    ui.strokeText(txt, tx, ty);
    ui.fillStyle = o.kind === 'enemy' && o.grp !== 'boss' ? '#fff' : o.col;
    ui.fillText(txt, tx, ty);
  }
  IND.length = 0;
}
function drawTraitTags(toS) {
  // a late elite says what it is, small, under it, while it is near
  const used = [];
  ui.font = `600 ${9 * TS()}px "JetBrains Mono", monospace`;
  ui.textAlign = 'center';
  ui.lineWidth = 3;
  ui.strokeStyle = 'rgba(20,24,29,0.85)';
  for (const e of GS.enemies) {
    if (
      !e.trait ||
      e.dead ||
      e.dying !== undefined ||
      e.emerge < 1 ||
      (e.sv ?? 1) < 0.5 ||
      d2(e.x, e.y, GS.P.x, GS.P.y) > 450 * 450
    )
      continue;
    const [bx, by0] = toS(e.x, e.y),
      by = by0 + 30 * ZOOM * (e.sc || 1);
    if (bx < 20 || by < 20 || bx > VW - 20 || by > VH - 20) continue;
    const t = TRAIT[e.trait].name.toUpperCase(),
      w = ui.measureText(t).width;
    if (used.some(([x, y, uw]) => Math.abs(x - bx) < (uw + w) / 2 + 4 && Math.abs(y - by) < 12)) continue;
    used.push([bx, by, w]);
    ui.strokeText(t, bx, by);
    ui.fillStyle = { runner: '#ffb070', bloater: '#d8e070', screamer: '#ffc8c0', armored: '#b8c8e8' }[e.trait];
    ui.fillText(t, bx, by);
  }
}
function boxPill(toS) {
  if (!GS.obj || GS.obj.type !== 'box' || !GS.obj.cur || GS.obj.still) return null;
  const k = TS(),
    [bx, by] = toS(GS.obj.cur.x, GS.obj.cur.y),
    lb = 'Stand still to search';
  ui.font = `600 ${11 * k}px "JetBrains Mono", monospace`;
  const w = ui.measureText(lb).width + 16 * k;
  return { lb, x: bx - w / 2, y: by + 24 * ZOOM + 6 * k, w, h: 20 * k };
} /* the prompt's box, shared so the pile icons can step out of its way */
export function drawMarkersUI(toS) {
  drawTraitTags(toS);
  if (
    GS.obj &&
    GS.obj.type === 'box' &&
    !GS.obj.done &&
    d2(GS.obj.crash.x, GS.obj.crash.y, GS.P.x, GS.P.y) < 420 * 420
  ) {
    const k = TS();
    ui.save();
    const pl = boxPill(toS),
      hit = (x, y) =>
        pl && x > pl.x - 14 * k && x < pl.x + pl.w + 14 * k && y > pl.y - 14 * k && y < pl.y + pl.h + 14 * k;
    for (const q of GS.obj.piles) {
      const [bx, by] = toS(q.x, q.y);
      if (q.done) {
        ui.globalAlpha = 0.5;
        ui.strokeStyle = '#cfd6d9';
        ui.lineWidth = 2 * k;
        ui.beginPath();
        ui.moveTo(bx - 5 * k, by - 30 * ZOOM);
        ui.lineTo(bx - 1 * k, by - 30 * ZOOM + 4 * k);
        ui.lineTo(bx + 6 * k, by - 30 * ZOOM - 4 * k);
        if (!hit(bx, by - 30 * ZOOM)) ui.stroke();
        continue;
      }
      if (q === GS.obj.cur && q.prog > 0 && GS.obj.still) continue;
      const pu = 0.55 + 0.25 * Math.sin(GS.time * 3 + q.v);
      ui.globalAlpha = pu;
      ui.setLineDash([4 * k, 4 * k]);
      ui.lineWidth = 2 * k;
      ui.strokeStyle = '#ffd08a';
      ui.beginPath();
      ui.arc(bx, by, 24 * ZOOM, 0, TAU);
      ui.stroke();
      ui.setLineDash([]);
      const ix = bx,
        iy = by - 24 * ZOOM - 12 * k,
        ir = 5 * k;
      if (hit(ix, iy)) continue;
      ui.globalAlpha = 0.9;
      ui.fillStyle = 'rgba(14,16,20,0.75)';
      ui.beginPath();
      ui.arc(ix, iy, 10 * k, 0, TAU);
      ui.fill();
      ui.strokeStyle = '#ffd08a';
      ui.lineWidth = 2 * k;
      ui.beginPath();
      ui.arc(ix - 1.5 * k, iy - 1.5 * k, ir, 0, TAU);
      ui.moveTo(ix + 2 * k, iy + 2 * k);
      ui.lineTo(ix + 6 * k, iy + 6 * k);
      ui.stroke();
    }
    ui.restore();
  } /* every unsearched pile near the wreck gets the same dashed ring and magnifier, so you know they can be searched but not which one holds the box; searched ones get a grey tick */
  {
    const pl = boxPill(toS);
    if (pl) {
      const k = TS();
      ui.save();
      ui.font = `600 ${11 * k}px "JetBrains Mono", monospace`;
      ui.textAlign = 'center';
      ui.textBaseline = 'middle';
      rr(ui, pl.x, pl.y, pl.w, pl.h, pl.h / 2);
      ui.fillStyle = 'rgba(14,16,20,0.85)';
      ui.fill();
      ui.fillStyle = '#ffd08a';
      ui.fillText(pl.lb, pl.x + pl.w / 2, pl.y + pl.h / 2);
      ui.restore();
    }
  } /* on a pile but moving: say what to do, under the pile and clear of you */
  if (GS.obj && GS.obj.type === 'box' && GS.obj.cur && GS.obj.cur.prog > 0) {
    const q = GS.obj.cur,
      [bx, by] = toS(q.x, q.y),
      r = 22 * ZOOM;
    ui.save();
    ui.lineWidth = 5;
    ui.strokeStyle = 'rgba(20,24,29,0.7)';
    ui.beginPath();
    ui.arc(bx, by, r, 0, TAU);
    ui.stroke();
    ui.lineWidth = 3;
    ui.strokeStyle = '#ffd08a';
    ui.beginPath();
    ui.arc(bx, by, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, q.prog / BOX_SEARCH));
    ui.stroke();
    ui.restore();
  } // searching a pile: how long to hold still
  for (const mk of markerList()) {
    const [bx, by] = toS(mk.x, mk.y);
    ui.font = `600 ${11 * TS()}px "JetBrains Mono", monospace`;
    ui.textAlign = 'center';
    ui.lineWidth = 3;
    ui.strokeStyle = 'rgba(20,24,29,0.85)';
    if (bx > 0 && by > 0 && bx < VW && by < VH) {
      const [lx2, ly2] = safeLabel(mk.label, bx, by - 34 * ZOOM);
      ui.strokeText(mk.label, lx2, ly2);
      ui.fillStyle = mk.col;
      ui.fillText(mk.label, lx2, ly2);
      continue;
    }
    pushInd({
      a: Math.atan2(by - VH / 2, bx - VW / 2),
      kind: 'marker',
      grp: 'mk:' + mk.label,
      col: mk.col,
      dist: Math.round(Math.hypot(mk.x - GS.P.x, mk.y - GS.P.y) / 10),
      lab: true,
      name: mk.label,
    });
  }
  if (GS.obj && GS.obj.type === 'gen' && GS.obj.hp > 0 && !GS.obj.done) {
    const [bx, by] = toS(GS.obj.x, GS.obj.y);
    if (bx > 0 && by > 0 && bx < VW && by < VH) {
      ui.fillStyle = 'rgba(20,24,29,0.8)';
      ui.fillRect(bx - 30, by + 26 * ZOOM, 60, 6);
      ui.fillStyle = GS.obj.hp / GS.obj.max > 0.6 ? '#8ef0a0' : GS.obj.hp / GS.obj.max > 0.3 ? '#ffc04a' : '#ff5a4a';
      ui.fillRect(bx - 29, by + 26 * ZOOM + 1, (58 * GS.obj.hp) / GS.obj.max, 4);
    }
  }
  for (const s of GS.buddies) {
    if (!(s.hp < s.max) && !(s.down > 0)) continue;
    const [bx, by] = toS(s.x, s.y);
    if (bx < 0 || by < 0 || bx > VW || by > VH) continue; // your people: a bar only once they are hurt; down, a bleed-out ring
    if (s.down > 0) {
      const r = 15 * ZOOM;
      ui.lineWidth = 3;
      ui.strokeStyle = 'rgba(20,24,29,0.8)';
      ui.beginPath();
      ui.arc(bx, by - 4 * ZOOM, r, 0, TAU);
      ui.stroke();
      ui.strokeStyle = Math.sin(GS.time * 8) > 0 ? '#ff5a4a' : '#c23a2e';
      ui.beginPath();
      ui.arc(bx, by - 4 * ZOOM, r, -Math.PI / 2, -Math.PI / 2 + (TAU * s.down) / (s.downMax || 12));
      ui.stroke();
      budTag(s, bx, by + 22 * ZOOM);
      if (s.rev > 0) {
        ui.strokeStyle = '#8ef0b8';
        ui.lineWidth = 4;
        ui.beginPath();
        ui.arc(bx, by - 4 * ZOOM, r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, s.rev / 1));
        ui.stroke();
      }
      continue;
    }
    ui.fillStyle = 'rgba(20,24,29,0.8)';
    ui.fillRect(bx - 18, by + 26 * ZOOM, 36, 5);
    ui.fillStyle = s.hp / s.max >= 0.5 ? '#8ef0b8' : '#ffc04a';
    ui.fillRect(bx - 17, by + 26 * ZOOM + 1, (34 * s.hp) / s.max, 3);
    budTag(s, bx, by + 26 * ZOOM + 15);
  }
  if (GS.obj && GS.obj.type === 'rescue' && GS.obj.s.hp > 0 && GS.obj.s.hp < GS.obj.s.max && !GS.obj.done) {
    const [bx, by] = toS(GS.obj.s.x, GS.obj.s.y);
    if (bx > 0 && by > 0 && bx < VW && by < VH) {
      ui.fillStyle = 'rgba(20,24,29,0.8)';
      ui.fillRect(bx - 22, by + 26 * ZOOM, 44, 5);
      ui.fillStyle = '#8ef0b8';
      ui.fillRect(bx - 21, by + 26 * ZOOM + 1, (42 * GS.obj.s.hp) / GS.obj.s.max, 3);
    }
  }
  if (GS.evac && GS.evac.t >= GS.evac.land && !GS.evac.leave) {
    const [bx, by] = toS(GS.evac.x, GS.evac.y),
      f = clamp(GS.evac.hold / 2.5, 0, 1),
      r = 86 * ZOOM;
    ui.save();
    ui.lineWidth = 6;
    ui.strokeStyle = 'rgba(20,24,29,0.6)';
    ui.beginPath();
    ui.arc(bx, by, r, 0, TAU);
    ui.stroke();
    ui.lineWidth = 4;
    ui.strokeStyle = '#8ef0a0';
    ui.beginPath();
    ui.arc(bx, by, r, -Math.PI / 2, -Math.PI / 2 + TAU * f);
    ui.stroke();
    if (f > 0) {
      ui.font = `700 ${12 * TS()}px "JetBrains Mono", monospace`;
      ui.textAlign = 'center';
      ui.lineWidth = 3;
      ui.strokeStyle = 'rgba(20,24,29,0.85)';
      const t = `HOLD ${Math.max(0, 2.5 - GS.evac.hold).toFixed(1)} s`;
      ui.strokeText(t, bx, by - r - 10);
      ui.fillStyle = '#8ef0a0';
      ui.fillText(t, bx, by - r - 10);
    }
    ui.restore();
  }
  drawRainUI();
}
/* ---------- menu: districts + infection ---------- */
