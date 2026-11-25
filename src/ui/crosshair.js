/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, clamp } from '../core/util.js';
import { TS } from '../core/settings.js';
import { ui } from '../render/gl.js';
import { ZOOM } from '../render/sprites.js';
import { S, magSize } from '../game/state.js';
import { mouse } from '../core/input.js';
import { gunPose } from '../game/evac-ride.js';
import { HITMK, aimedAt } from '../actors/player-weapons.js';
import { TILT } from '../core/scale.js';
export const CH_COLS = {
  white: '#f2efe6',
  amber: '#ffc04a',
  red: '#ff5a4a',
  green: '#9be07a',
  lime: '#9be07a',
  cyan: '#f2efe6',
  pink: '#ff5a4a',
};
let chHot = 0;
export function drawCrosshair() {
  const ch = GS.meta.ch,
    col = CH_COLS[ch.col] || CH_COLS.lime,
    k = ch.size * 0.72,
    mx = mouse.x,
    my = mouse.y;
  // aim line from the muzzle to the cursor
  if (ch.line) {
    const G = GS.evac && GS.evac.ride ? gunPose(GS.evac) : null, // on the chopper: from its door gun
      P = GS.P,
      mz = !G && P._mz && GS.time - (P._mzT ?? -9) < 0.25 ? P._mz : null, // (the gun's own muzzle, as drawn)
      px = ((G ? G.fx : mz ? mz[0] : P.x + Math.cos(P.aimA) * S.muzzle) - GS.camX) * ZOOM,
      py = ((G ? G.fy : mz ? mz[1] - mz[2] * TILT : P.y + Math.sin(P.aimA) * S.muzzle) - GS.camY) * ZOOM,
      L = Math.hypot(mx - px, my - py);
    if (L > 40) {
      ui.save();
      ui.setLineDash([3, 9]);
      ui.lineDashOffset = -GS.time * 40;
      ui.lineCap = 'round';
      ui.strokeStyle = 'rgba(20,24,29,0.45)';
      ui.lineWidth = 4;
      ui.beginPath();
      ui.moveTo(px, py);
      ui.lineTo(mx - ((mx - px) / L) * 22 * k, my - ((my - py) / L) * 22 * k);
      ui.stroke();
      ui.strokeStyle = col;
      ui.globalAlpha = 0.55;
      ui.lineWidth = 1.6;
      ui.stroke();
      ui.restore();
    }
  }
  // is a creature under the cursor? (as the shots will take it: player-weapons.js)
  const hot = !!aimedAt(GS.camX + mx / ZOOM, GS.camY + my / ZOOM);
  chHot += ((hot ? 1 : 0) - chHot) * 0.35;
  const c2 = hot ? '#ffffff' : col,
    sp =
      (11 + Math.max(0, GS.P.fireCd) * 22 + GS.P.recoil * 0.9 + (GS.P.heat || 0) * 9) *
        k *
        (GS.P.gun === 'rifle' && Math.hypot(GS.P.vx, GS.P.vy) < 40 ? 0.6 : 1) -
      chHot * 3 * k; /* a braced rifle: the gap closes */
  paintCH(ui, mx, my, k, c2, sp, chHot, true);
  // a round of yours landed: four short ticks on the diagonals, out past the ring, there and gone (a kill: further
  // out, longer, red)
  const age = GS.time - HITMK.t,
    life = HITMK.kill ? 0.22 : 0.12;
  if (age >= 0 && age < life) {
    const f = 1 - age / life,
      r0 = (HITMK.kill ? 21 : 18) * k + (1 - f) * 3 * k, // (outside the ring: over one of them its own ticks are on the diagonals too)
      r1 = r0 + (HITMK.kill ? 9 : 7) * k;
    ui.save();
    ui.lineCap = 'round';
    for (const [w, c, a] of [
      [3.6 * k, 'rgba(20,24,29,0.6)', 1],
      [1.7 * k, HITMK.kill ? '#ff4a3a' : '#ffffff', 1],
    ]) {
      ui.strokeStyle = c;
      ui.lineWidth = w;
      ui.globalAlpha = Math.min(1, f * 1.6) * a;
      ui.beginPath();
      for (let i = 0; i < 4; i++) {
        const q = Math.PI / 4 + (i * Math.PI) / 2,
          cx = Math.cos(q),
          cy = Math.sin(q);
        ui.moveTo(mx + cx * r0, my + cy * r0);
        ui.lineTo(mx + cx * r1, my + cy * r1);
      }
      ui.stroke();
    }
    ui.restore();
  }
}
export function paintCH(ui, mx, my, k, c2, sp, chHot, game) {
  const R0 = 15 * k;
  ui.save();
  ui.lineCap = 'round';
  // soft dark backdrop so it reads on any background
  ui.fillStyle = 'rgba(20,24,29,0.28)';
  ui.beginPath();
  ui.arc(mx, my, R0 + 7 * k, 0, TAU);
  ui.fill();
  const draw = (stroke, lw) => {
    ui.strokeStyle = stroke;
    ui.lineWidth = lw;
    ui.beginPath();
    ui.arc(mx, my, R0, 0, TAU);
    ui.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + (chHot * Math.PI) / 4;
      ui.beginPath();
      ui.moveTo(mx + Math.cos(a) * sp, my + Math.sin(a) * sp);
      ui.lineTo(mx + Math.cos(a) * (sp + 10 * k), my + Math.sin(a) * (sp + 10 * k));
      ui.stroke();
    }
  };
  draw('rgba(10,12,16,0.95)', 4.6 * Math.max(0.7, k));
  draw(c2, 2.1 * Math.max(0.7, k));
  ui.fillStyle = 'rgba(10,12,16,0.95)';
  ui.beginPath();
  ui.arc(mx, my, 4 * k, 0, TAU);
  ui.fill();
  ui.fillStyle = c2;
  ui.beginPath();
  ui.arc(mx, my, 2.4 * k, 0, TAU);
  ui.fill();
  ui.restore();
  if (!game || GS.P.ride || (GS.evac && GS.evac.ride)) return; // on a mounted gun: no reload ring, no ammo count
  if (GS.P.reload > 0) {
    const f = 1 - GS.P.reload / GS.P.reloadMax,
      R1 = 24 * k;
    ui.save();
    ui.lineWidth = 4;
    ui.strokeStyle = 'rgba(20,24,29,0.7)';
    ui.beginPath();
    ui.arc(mx, my, R1, 0, TAU);
    ui.stroke();
    ui.strokeStyle = '#ffd08a';
    ui.lineWidth = 3;
    ui.beginPath();
    ui.arc(mx, my, R1, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(f, 0, 1));
    ui.stroke();
    ui.font = `600 ${11 * TS()}px JetBrains Mono, monospace`;
    ui.textAlign = 'center';
    ui.lineWidth = 3;
    ui.strokeStyle = 'rgba(14,16,20,0.9)';
    ui.strokeText('RELOAD', mx, my + R1 + 15);
    ui.fillStyle = '#ffd08a';
    ui.fillText('RELOAD', mx, my + R1 + 15);
    ui.restore();
  } else if (GS.P.mag && GS.P.mag[GS.P.gun] <= Math.ceil(magSize(GS.P.gun) * 0.2)) {
    ui.save();
    ui.font = `600 ${11 * TS()}px JetBrains Mono, monospace`;
    ui.textAlign = 'center';
    const lt = GS.P.mag[GS.P.gun] ? `${GS.P.mag[GS.P.gun]} LEFT · R` : 'EMPTY';
    ui.lineWidth = 3;
    ui.strokeStyle = 'rgba(14,16,20,0.9)';
    ui.strokeText(lt, mx, my + 38 * k);
    ui.fillStyle = GS.P.mag[GS.P.gun] ? '#ffd08a' : '#ff6a5a';
    ui.fillText(lt, mx, my + 38 * k);
    ui.restore();
  }
}
