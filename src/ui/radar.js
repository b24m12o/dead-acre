/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
let radarBg = null;
function bakeRadar() {
  radarBg = document.createElement('canvas'); radarBg.width = MW; radarBg.height = MH; const r = radarBg.getContext('2d');
  r.fillStyle = 'rgba(70,70,58,0.6)'; r.fillRect(0, 0, MW, MH);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (ROAD[y * MW + x]) { r.fillStyle = ROAD[y * MW + x] === 1 || ROAD[y * MW + x] === 3 ? 'rgba(40,40,44,0.9)' : ROAD[y * MW + x] === 4 ? 'rgba(130,122,106,0.8)' : 'rgba(110,108,100,0.8)'; r.fillRect(x, y, 1, 1); }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const t = ttype[y * MW + x]; if (!grid[y * MW + x] || t === 4) continue; r.fillStyle = t === 1 ? 'rgba(20,18,16,0.95)' : t === 3 ? 'rgba(90,70,50,0.9)' : t === 5 ? 'rgba(160,96,72,0.95)' : t === 6 ? 'rgba(130,140,150,0.95)' : t === 7 ? 'rgba(255,150,50,1)' : t === 8 ? 'rgba(170,170,166,0.9)' : t === 9 ? 'rgba(20,20,20,0.9)' : 'rgba(150,142,124,0.95)'; r.fillRect(x, y, 1, 1); }
}
const RADAR_COL = { skitter: '#ff6a45', hopper: '#a8e04a', mini: '#ff8a6a', wasp: '#c8f060', flower: '#c48cff', beetle: '#ff9a4a', hound: '#ffb070', queen: '#ff3d5a' };
function drawRadar() {
  if (!radarBg) return;
  const { S0, x0, y0 } = radarBox(), k = S0 / WW;
  ui.save(); ui.globalAlpha = clamp(Math.min(HUDF.radarA, HUDF.a.radar ?? 1) * ((meta.hud && meta.hud.op) || 1), 0, 1);
  ui.fillStyle = 'rgba(20,24,29,0.78)'; ui.beginPath(); ui.roundRect ? ui.roundRect(x0 - 6, y0 - 6, S0 + 12, S0 + 12, 10) : ui.rect(x0 - 6, y0 - 6, S0 + 12, S0 + 12); ui.fill();
  ui.imageSmoothingEnabled = false; ui.drawImage(radarBg, x0, y0, S0, S0); ui.imageSmoothingEnabled = true;
  ui.strokeStyle = 'rgba(255,255,255,0.5)'; ui.lineWidth = 1; ui.strokeRect(x0 + cam.x * k, y0 + cam.y * k, viewW * k, viewH * k);
  for (const c of crystals) if (c.alive) { ui.fillStyle = '#8f9ba6'; ui.fillRect(x0 + c.x * k - 1.5, y0 + c.y * k - 1.5, 3, 3); } // the electrical boxes: grey, so yellow on the map always means a job
  for (const mk of markerList()) { const mx2 = x0 + mk.x * k, my2 = y0 + mk.y * k, pu2 = 0.75 + 0.25 * Math.sin(time * 5); ui.strokeStyle = mk.col; ui.lineWidth = 2; ui.globalAlpha *= 1; ui.beginPath(); ui.arc(mx2, my2, mk.zone ? Math.max(6, mk.zone * k) : (mk.label === 'EVAC' ? 6.5 : 5) * pu2 + 1, 0, TAU); ui.stroke(); ui.fillStyle = mk.col; ui.beginPath(); ui.arc(mx2, my2, 1.8, 0, TAU); ui.fill(); } // objectives and the landing zone, as rings
  const few = !queue.length && enemies.length <= 5, pz = few ? 1.6 + Math.sin(time * 7) * 0.5 : 1;
  for (const c of crates) { ui.fillStyle = '#39d0c8'; ui.strokeStyle = '#14181d'; ui.lineWidth = 1; ui.fillRect(x0 + c.x * k - 3, y0 + c.y * k - 3, 6, 6); ui.strokeRect(x0 + c.x * k - 3, y0 + c.y * k - 3, 6, 6); }
  for (const e of enemies) { if (opt.los && !few && e.type !== 'queen' && (e.sv ?? 1) < 0.5 && d2(e.x, e.y, P.x, P.y) > 260 * 260) continue; const r = (e.type === 'queen' ? 4 : e.elite ? 3.2 : e.type === 'beetle' || e.type === 'hopper' || e.type === 'flower' ? 2.6 : 1.8) * pz; const ex = x0 + e.x * k, ey = y0 + e.y * k, col = e.elite ? '#ffd23a' : RADAR_COL[e.type] || '#fff'; ui.fillStyle = col; ui.beginPath(); const tr = e.trait; if (tr === 'armored') { ui.rect(ex - r, ey - r, r * 2, r * 2); } else if (tr === 'runner') { ui.moveTo(ex, ey - r * 1.3); ui.lineTo(ex + r * 1.1, ey + r * 0.9); ui.lineTo(ex - r * 1.1, ey + r * 0.9); ui.closePath(); } else if (e.type === 'wasp' || e.type === 'hopper' || tr === 'bloater') { const q = r * 1.25; ui.moveTo(ex, ey - q); ui.lineTo(ex + q, ey); ui.lineTo(ex, ey + q); ui.lineTo(ex - q, ey); ui.closePath(); } else ui.arc(ex, ey, r, 0, TAU); /* shape as well as colour: spitters and bloaters are diamonds, the screamer a ring; elite traits too: armored a square, runner a triangle */ if (e.type === 'flower' || tr === 'screamer') { ui.strokeStyle = col; ui.lineWidth = 1.6; ui.stroke(); } else { ui.fill(); if (few) { ui.strokeStyle = 'rgba(20,24,29,0.9)'; ui.lineWidth = 1; ui.stroke(); } } }
  { ui.save(); ui.beginPath(); ui.rect(x0, y0, S0, S0); ui.clip(); ui.lineWidth = 1.3; // how far your noise carried, and car alarms
    for (const r of noiseRings) { const t = (time - r.t0) / (r.alarm ? 1.4 : 0.9); if (t < 0 || t > 1) continue; ui.strokeStyle = r.alarm ? `rgba(255,176,64,${(1 - t) * 0.9})` : `rgba(240,236,224,${(1 - t) * 0.6})`; ui.beginPath(); ui.arc(x0 + r.x * k, y0 + r.y * k, r.r * k * (0.2 + 0.8 * Math.sqrt(t)), 0, TAU); ui.stroke(); }
    for (const c of cars) if (c.alarm > 0) { const t = (time * 0.8) % 1, on = (c.alarm * 2.2) % 1 < 0.5; ui.strokeStyle = `rgba(255,176,64,${(1 - t) * 0.7})`; ui.beginPath(); ui.arc(x0 + c.x * k, y0 + c.y * k, 3 + t * 22, 0, TAU); ui.stroke(); ui.fillStyle = on ? '#ffb040' : '#7a4a10'; ui.fillRect(x0 + c.x * k - 2.5, y0 + c.y * k - 2.5, 5, 5); }
    ui.restore(); }
  const px = x0 + P.x * k, py = y0 + P.y * k; ui.translate(px, py); ui.rotate(P.aimA); ui.fillStyle = '#ffffff'; ui.strokeStyle = '#14181d'; ui.lineWidth = 1.5;
  ui.beginPath(); ui.moveTo(5, 0); ui.lineTo(-3.5, -3.5); ui.lineTo(-3.5, 3.5); ui.closePath(); ui.stroke(); ui.fill();
  ui.restore();
}
