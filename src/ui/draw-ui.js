/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, clamp } from '../core/util.js';
import { TS, opt } from '../core/settings.js';
import { GUNS } from '../game/arsenal.js';
import { ui, uic } from '../render/gl.js';
import { RH, RW, VH, VW, ZOOM } from '../render/sprites.js';
import { WHEEL, drawWheel } from '../game/state.js';
import { hudDomRects } from './callouts.js';
import { spatSprite } from '../render/effects.js';
import { mouse } from '../core/input.js';
import { drawRadar } from './radar.js';
import { drawCrosshair } from './crosshair.js';
import { safeLabel } from './hud.js';
import { drawInd, drawMarkersUI, pushInd } from './markers.js';
import { FPSV } from '../core/main.js';
export function drawUI() {
  const k = uic.width / VW;
  ui.setTransform(k, 0, 0, k, 0, 0);
  ui.clearRect(0, 0, VW, VH);
  if (GS.meta.hud.fps && GS.state !== 'menu') {
    const f = Math.round(FPSV);
    ui.font = `600 ${11 * TS()}px "JetBrains Mono", monospace`;
    ui.textAlign = 'right';
    ui.textBaseline = 'alphabetic';
    ui.fillStyle = f >= 55 ? 'rgba(160,230,180,0.85)' : f >= 40 ? 'rgba(240,210,140,0.9)' : 'rgba(255,140,120,0.95)';
    ui.fillText(`${f} FPS · ${RW}×${RH}`, VW - 14, VH - 30 * TS());
    ui.textAlign = 'left';
  } // the frame-rate readout: bottom right, clear of the HUD
  if (GS.whiteFlash > 0.01) {
    ui.fillStyle = `rgba(255,252,240,${Math.min(opt.flash ? 0.1 : 0.75, GS.whiteFlash)})`;
    ui.fillRect(0, 0, VW, VH);
  }
  for (const b of GS.screenBlood) {
    const sp = spatSprite(b.k || 0),
      a = Math.min(1, b.life / 0.8) * 0.5,
      x = b.x * VW,
      y = b.y * VH,
      sc = b.r / 40,
      age = b.max - b.life;
    ui.save();
    ui.globalAlpha = a;
    ui.translate(x, y);
    ui.strokeStyle = 'rgba(70,4,6,0.85)';
    ui.lineCap = 'round';
    ui.lineWidth = 2.2 * sc;
    ui.beginPath();
    ui.moveTo(0, 0);
    ui.lineTo(Math.sin(b.seed) * 2, Math.min(60, age * 22) * sc);
    ui.stroke();
    ui.rotate(b.rot || 0);
    ui.drawImage(sp, -64 * sc, -64 * sc, 128 * sc, 128 * sc);
    ui.restore();
    continue;
  }
  const toS = (x, y) => [(x - GS.camX) * ZOOM, (y - GS.camY) * ZOOM];
  ui.textAlign = 'center';
  ui.lineJoin = 'round';
  const placed = [];
  for (const t of GS.state === 'play' || WHEEL.open ? GS.texts : []) {
    let [x, y] = toS(t.x, t.y);
    const fs = t.size * Math.max(0.85, ZOOM);
    ui.font = `italic 800 ${fs}px Kanit, sans-serif`;
    const w = ui.measureText(t.txt).width + 8,
      h =
        fs *
        1.05; /* never on top of another text: a newer one steps up above the older, and nothing is cut off at the screen edge */
    x = clamp(x, w / 2 + 6, VW - w / 2 - 6);
    for (let k = 0; k < 8; k++) {
      const hitR = placed.find(r => Math.abs(r[0] - x) < (r[2] + w) / 2 && Math.abs(r[1] - y) < (r[3] + h) / 2);
      if (!hitR) break;
      y = hitR[1] - (hitR[3] + h) / 2 - 1;
    }
    y = clamp(y, h + 4, VH - 6);
    placed.push([x, y, w, h]);
    ui.globalAlpha =
      Math.min(1, t.life * 3) *
      (!t.nf && mouse.seen && Math.abs(x - mouse.x) < 46 && Math.abs(y - mouse.y) < 34 ? 0.3 : 1);
    ui.font = `italic 800 ${t.size * Math.max(0.85, ZOOM)}px Kanit, sans-serif`;
    ui.strokeStyle = 'rgba(20,24,29,0.85)';
    ui.lineWidth = 4;
    ui.strokeText(t.txt, x, y);
    ui.fillStyle = t.col;
    ui.fillText(t.txt, x, y);
  }
  ui.globalAlpha = 1;
  if (GS.state !== 'play') return;
  const few = !GS.queue.length && GS.enemies.length <= 5;
  for (const e of GS.enemies) {
    if (e.dormant) continue;
    const big = e.type === 'queen' || e.type === 'beetle';
    if (!big && !few) continue;
    const [bx, by] = toS(e.x, e.y - e.z),
      col = e.type === 'queen' ? '#ff3d5a' : few ? '#ffd23a' : 'rgba(255,122,47,0.9)';
    if (bx > 0 && by > 0 && bx < VW && by < VH) {
      if (!few) continue;
      const bob = Math.sin(GS.time * 6) * 4,
        yy = by - (e.r + 18) * ZOOM + bob,
        hr = hudDomRects().boss;
      if (hr && bx > hr.left - 12 && bx < hr.right + 12 && yy > hr.top - 12 && yy < hr.bottom + 12) continue; // never drawn over the boss panel
      ui.save();
      ui.translate(bx, yy);
      ui.fillStyle = col;
      ui.strokeStyle = 'rgba(20,24,29,0.85)';
      ui.lineWidth = 3;
      ui.beginPath();
      ui.moveTo(-8, -6);
      ui.lineTo(8, -6);
      ui.lineTo(0, 5);
      ui.closePath();
      ui.stroke();
      ui.fill();
      ui.restore();
      continue;
    }
    pushInd({
      a: Math.atan2(by - VH / 2, bx - VW / 2),
      kind: 'enemy',
      grp: e.type === 'queen' ? 'boss' : 'enemy',
      col,
      dist: Math.round(Math.hypot(e.x - GS.P.x, e.y - GS.P.y) / 10),
      lab: few,
      pulse: few,
    });
  }
  for (const c of GS.crates) {
    const [bx, by] = toS(c.x + (c.landed ? 0 : c.sx || 0), c.y - c.z + (c.landed ? 0 : c.sy || 0));
    if (bx > 0 && by > 0 && bx < VW && by < VH) {
      ui.font = `600 ${11 * TS()}px "JetBrains Mono", monospace`;
      ui.strokeStyle = 'rgba(20,24,29,0.85)';
      ui.lineWidth = 3;
      const lb = c.alt ? 'WEAPON CASE' : c.gun ? GUNS[c.gun].name.toUpperCase() : 'SUPPLY';
      const ly = by + (c.landed ? -30 : 34) * ZOOM;
      const ovr = ['banner', 'streak'].some(id => {
        const r = hudDomRects()[id];
        if (!r) return false;
        return ly > r.top - 8 && ly < r.bottom + 8 && Math.abs(bx - VW / 2) < r.width * 0.5;
      });
      ui.globalAlpha = ovr ? 0 : 1;
      const [lx2, ly2] = safeLabel(lb, bx, ly);
      ui.strokeText(lb, lx2, ly2);
      ui.fillStyle = c.gun ? '#ffd08a' : '#8ff0e8';
      ui.fillText(lb, lx2, ly2);
      continue;
    } // while it hangs under the canopy the name goes below it
    pushInd({
      a: Math.atan2(by - VH / 2, bx - VW / 2),
      kind: 'crate',
      grp: 'crate',
      col: c.gun ? '#ffd08a' : '#39d0c8',
      dist: Math.round(Math.hypot(c.x - GS.P.x, c.y - GS.P.y) / 10),
      lab: false,
    });
  }
  drawMarkersUI(toS);
  drawInd();
  {
    const px = (GS.P.x - GS.camX) * ZOOM,
      py = (GS.P.y - GS.camY) * ZOOM;
    for (const h of GS.hitDirs) {
      const al = h.life / 0.8;
      ui.strokeStyle = `rgba(255,61,90,${al * 0.9})`;
      ui.lineWidth = 6;
      ui.beginPath();
      ui.arc(px, py, 58 * Math.max(0.85, ZOOM), h.a - 0.45, h.a + 0.45);
      ui.stroke();
      ui.strokeStyle = `rgba(255,255,255,${al * 0.5})`;
      ui.lineWidth = 2;
      ui.beginPath();
      ui.arc(px, py, 58 * Math.max(0.85, ZOOM), h.a - 0.3, h.a + 0.3);
      ui.stroke();
    }
  }
  drawRadar();
  drawWheel();
  if (mouse.seen) drawCrosshair();
  else if (GS.state === 'play' && GS.P && (GS.P.reload > 0 || (GS.P.mag && GS.P.mag[GS.P.gun] <= 0))) {
    const hx = (GS.P.x - GS.camX) * ZOOM,
      hy = (GS.P.y - GS.camY) * ZOOM,
      r = 30 * ZOOM;
    ui.save();
    ui.lineWidth = 4;
    ui.strokeStyle = 'rgba(20,24,29,0.6)';
    ui.beginPath();
    ui.arc(hx, hy, r, 0, TAU);
    ui.stroke();
    if (GS.P.reload > 0) {
      ui.lineWidth = 3;
      ui.strokeStyle = '#ffd08a';
      ui.beginPath();
      ui.arc(hx, hy, r, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(1 - GS.P.reload / GS.P.reloadMax, 0, 1));
      ui.stroke();
    } else {
      ui.font = `600 ${11 * TS()}px JetBrains Mono, monospace`;
      ui.textAlign = 'center';
      ui.lineWidth = 3;
      ui.strokeStyle = 'rgba(14,16,20,0.9)';
      ui.strokeText('EMPTY', hx, hy - r - 8);
      ui.fillStyle = '#ff6a5a';
      ui.fillText('EMPTY', hx, hy - r - 8);
    }
    ui.restore();
  }
}

/* ---------- line of sight: walls and buildings hide what's behind them ---------- */
