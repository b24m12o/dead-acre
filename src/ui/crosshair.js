/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const CH_COLS = { white: '#f2efe6', amber: '#ffc04a', red: '#ff5a4a', green: '#9be07a', lime: '#9be07a', cyan: '#f2efe6', pink: '#ff5a4a' };
let chHot = 0;
function drawCrosshair() {
  const ch = meta.ch, col = CH_COLS[ch.col] || CH_COLS.lime, k = ch.size * 0.72, mx = mouse.x, my = mouse.y;
  // aim line from the muzzle to the cursor
  if (ch.line) {
    const px = (P.x + Math.cos(P.aimA) * S.muzzle - camX) * ZOOM, py = (P.y + Math.sin(P.aimA) * S.muzzle - camY) * ZOOM, L = Math.hypot(mx - px, my - py);
    if (L > 40) { ui.save(); ui.setLineDash([3, 9]); ui.lineDashOffset = -time * 40; ui.lineCap = 'round'; ui.strokeStyle = 'rgba(20,24,29,0.45)'; ui.lineWidth = 4; ui.beginPath(); ui.moveTo(px, py); ui.lineTo(mx - (mx - px) / L * 22 * k, my - (my - py) / L * 22 * k); ui.stroke(); ui.strokeStyle = col; ui.globalAlpha = 0.55; ui.lineWidth = 1.6; ui.stroke(); ui.restore(); }
  }
  // is a creature under the cursor?
  const wx = camX + mx / ZOOM, wy = camY + my / ZOOM; let hot = false;
  for (const e of enemies) if (!e.dead && d2(wx, wy, e.x, e.y - e.z) < (e.r + 10) ** 2) { hot = true; break; }
  chHot += ((hot ? 1 : 0) - chHot) * 0.35;
  const c2 = hot ? '#ffffff' : col, sp = (11 + Math.max(0, P.fireCd) * 22 + P.recoil * 0.9 + (P.heat || 0) * 9) * k * (P.gun === 'rifle' && Math.hypot(P.vx, P.vy) < 40 ? 0.6 : 1) - chHot * 3 * k; /* a braced rifle: the gap closes */
  paintCH(ui, mx, my, k, c2, sp, chHot, true);
}
function paintCH(ui, mx, my, k, c2, sp, chHot, game) {
  const R0 = 15 * k;
  ui.save(); ui.lineCap = 'round';
  // soft dark backdrop so it reads on any background
  ui.fillStyle = 'rgba(20,24,29,0.28)'; ui.beginPath(); ui.arc(mx, my, R0 + 7 * k, 0, TAU); ui.fill();
  const draw = (stroke, lw) => {
    ui.strokeStyle = stroke; ui.lineWidth = lw;
    ui.beginPath(); ui.arc(mx, my, R0, 0, TAU); ui.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + chHot * Math.PI / 4; ui.beginPath(); ui.moveTo(mx + Math.cos(a) * sp, my + Math.sin(a) * sp); ui.lineTo(mx + Math.cos(a) * (sp + 10 * k), my + Math.sin(a) * (sp + 10 * k)); ui.stroke(); }
  };
  draw('rgba(10,12,16,0.95)', 4.6 * Math.max(0.7, k)); draw(c2, 2.1 * Math.max(0.7, k));
  ui.fillStyle = 'rgba(10,12,16,0.95)'; ui.beginPath(); ui.arc(mx, my, 4 * k, 0, TAU); ui.fill();
  ui.fillStyle = c2; ui.beginPath(); ui.arc(mx, my, 2.4 * k, 0, TAU); ui.fill();
  ui.restore();
  if (!game) return;
  if (P.reload > 0) { const f = 1 - P.reload / P.reloadMax, R1 = 24 * k; ui.save(); ui.lineWidth = 4; ui.strokeStyle = 'rgba(20,24,29,0.7)'; ui.beginPath(); ui.arc(mx, my, R1, 0, TAU); ui.stroke(); ui.strokeStyle = '#ffd08a'; ui.lineWidth = 3; ui.beginPath(); ui.arc(mx, my, R1, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(f, 0, 1)); ui.stroke(); ui.font = `600 ${11 * TS()}px JetBrains Mono, monospace`; ui.textAlign = 'center'; ui.lineWidth = 3; ui.strokeStyle = 'rgba(14,16,20,0.9)'; ui.strokeText('RELOAD', mx, my + R1 + 15); ui.fillStyle = '#ffd08a'; ui.fillText('RELOAD', mx, my + R1 + 15); ui.restore(); }
  else if (P.mag && P.mag[P.gun] <= Math.ceil(magSize(P.gun) * 0.2)) { ui.save(); ui.font = `600 ${11 * TS()}px JetBrains Mono, monospace`; ui.textAlign = 'center'; const lt = P.mag[P.gun] ? `${P.mag[P.gun]} LEFT · R` : 'EMPTY'; ui.lineWidth = 3; ui.strokeStyle = 'rgba(14,16,20,0.9)'; ui.strokeText(lt, mx, my + 38 * k); ui.fillStyle = P.mag[P.gun] ? '#ffd08a' : '#ff6a5a'; ui.fillText(lt, mx, my + 38 * k); ui.restore(); }
}
