/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { lineQ, quad, setH } from './sprites.js';
import { R } from './atlas.js';
import { MH, MW, TILE, cars, houses, ttype } from '../world/map.js';
import { WBURN, WHOLES } from '../world/wear.js';
import { WB_SIZES } from './bake.js';
/* =====================================================================
   2.5D: extruded blocks, stacked props, cars, roofs, decor
   ===================================================================== */
const BH = { brick: 28, conc: 30, barr: 16, stone: 30, bord: 34, fence: 24, int: 26 },
  FACEH = { brick: 28, conc: 30, barr: 16, stone: 30, bord: 32, int: 30 };
export const WSTN = ['brick', 'conc', 'barr', 'stone', 'bord', 'fence', 'int'];
export let WST, WHT, WVAR;
export let hsh;
export let isBlock;
export let windows;
function hexTint(h) {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 208, ((n >> 8) & 255) / 208, (n & 255) / 208];
}
function wallStyleOf(tx, ty) {
  const t = ttype[ty * MW + tx];
  if (t === 1) return 'bord';
  if (t === 9) return 'fence';

  const D = GS.RUN.district || 'town',
    hz = houses.find(o => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
  if (D === 'cemetery') return 'stone';
  if (D === 'highway') return ty === 28 || ty === 32 ? 'barr' : hz && hz.style === 'store' ? 'conc' : 'brick';
  return hz && hz.style === 'store' ? 'conc' : 'brick';
}
export function prepBlocks() {
  windows = [];
  for (let ty = 0; ty < MH; ty++)
    for (let tx = 0; tx < MW; tx++) {
      const i = ty * MW + tx;
      WVAR[i] = 0;
      if (!isBlock(ttype[i])) {
        WHT[i] = 0;
        continue;
      }
      const st = wallStyleOf(tx, ty),
        r = hsh(tx, ty);
      WST[i] = WSTN.indexOf(st);
      let H = BH[st];
      if (st === 'brick' && r < 0.3) H *= 0.45 + r * 1.6;
      if (st === 'stone') H *= 0.85 + r * 0.15;
      WHT[i] = H;
    }
  for (let ty = 0; ty < MH; ty++)
    for (let tx = 0; tx < MW; tx++) {
      const i = ty * MW + tx;
      if (!WHT[i] || ttype[i] === 9) continue;
      const below = ty + 1 < MH ? i + MW : -1,
        faceShown = below < 0 || !(isBlock(ttype[below]) && WHT[below] >= WHT[i]);
      const st = WSTN[WST[i]],
        r = hsh(tx + 7, ty + 3);
      if (st === 'brick' && faceShown && WHT[i] >= 26) {
        WVAR[i] = r < 0.07 ? 1 : r < 0.12 ? 2 : r < 0.18 ? 3 : r < 0.26 ? 4 : 0;
        if (WVAR[i] === 1) windows.push({ x: (tx + 0.5) * TILE, y: (ty + 1.6) * TILE, i });
      }
      if (st === 'conc' && faceShown && r < 0.35) {
        WVAR[i] = 1;
        windows.push({ x: (tx + 0.5) * TILE, y: (ty + 1.6) * TILE, cool: true, i });
      }
      if (st === 'bord') WVAR[i] = r < 0.25 ? 1 : r < 0.33 ? 2 : 0;
      if (st === 'int' && faceShown) WVAR[i] = r < 0.1 ? 1 : r < 0.17 ? 2 : r < 0.23 ? 3 : r < 0.3 ? 4 : 0;
    }
  for (const o of houses)
    (o.roof = o.style === 'crypt' || o.style === 'store' || (o.style !== 'chapel' && hsh(o.x, o.y) < 0.5)),
      (o.fade = 1);
  for (const c of cars) {
    c.tint = hexTint(c.col || '#a0a0a0');
    c.police = c.police || false;
  }
}
export let WVN;
export function drawBlock(i) {
  const tx = i % MW,
    ty = (i / MW) | 0,
    x = (tx + 0.5) * TILE,
    y = (ty + 0.5) * TILE,
    st = WSTN[WST[i]],
    H = WHT[i];
  if (GS.SHMODE) {
    setH(H);
    if (st === 'fence') {
      const horiz = ttype[i - 1] === 9 || ttype[i + 1] === 9 || !(ttype[i - MW] === 9 || ttype[i + MW] === 9),
        a = horiz ? 0 : Math.PI / 2,
        c = Math.cos(a),
        sn = Math.sin(a); // a railing throws a railing's shadow: two rails and a row of pickets, light showing between them
      quad(R.pixel, x, y, a, 10.4, 0.5, 1, 1, 1, 0.85, 0, 0, 0, 0);
      for (let k = -3; k <= 3; k++)
        quad(R.pixel, x + c * k * 5.7, y + sn * k * 5.7, a, 0.35, 1.6, 1, 1, 1, 0.75, 0, 0, 0, 0);
      return;
    }
    quad(R.pixel, x, y, 0, 10, 10, 1, 1, 1, 1, 0, 0, 0, 0);
    return;
  }
  if (GS.P && st !== 'bord' && Math.abs(GS.P.x - x) < 36 && GS.P.y < y + 14 && GS.P.y > y - 20 - H - 30) GS.gA = 0.42;
  if (st === 'fence') {
    const horiz = ttype[i - 1] === 9 || ttype[i + 1] === 9 || !(ttype[i - MW] === 9 || ttype[i + MW] === 9);
    if (horiz) quad(R.wf_fence, x, y - H / 2 + 6, 0, 1, H / 26, 0.9, 0.9, 0.9, 1, 0, 0, 0, 0);
    else {
      for (const oy of [-12, 8]) lineQ(x, y + oy, x, y + oy - H, 2.4, 0.08, 0.08, 0.08, 1, 0, 0, 0, 0, R.pixel);
      lineQ(x, y - 20 - H * 0.8, x, y + 20 - H * 0.8, 2.2, 0.08, 0.08, 0.08, 1, 0, 0, 0, 0, R.pixel);
      lineQ(x, y - 20 - H * 0.2, x, y + 20 - H * 0.2, 2.2, 0.08, 0.08, 0.08, 1, 0, 0, 0, 0, R.pixel);
    }
    GS.gA = 1;
    return;
  }
  const below = ty + 1 < MH ? i + MW : -1,
    faceShown = below < 0 || !(isBlock(ttype[below]) && WHT[below] >= H);
  const bu = 1 - WBURN[i] * 0.6;
  const wb = wallBlock(st, i, H, tx, ty);
  if (wb) {
    const z = WB_SIZES[wb][2],
      lit = /win$/.test(wb) ? 1.4 : 0;
    setH(z);
    quad(R[wb], x, y - z / 2, 0, 1, 1, bu, bu, bu, 1, lit, lit, lit, 0);
  } // the 3D block: its top and the face toward you in one picture (the row in front covers a face that isn't shown)
  else if (faceShown) {
    const v = WVN[st] ? WVN[st][WVAR[i]] : '',
      reg = R['wf_' + st + v] || R['wf_' + st + '0'],
      lit = v === 'win' ? 1.4 : 0;
    const ft = [1, 1, 1];
    quad(
      reg,
      x,
      y + 20 - H / 2,
      0,
      1,
      H / FACEH[st],
      0.84 * bu * ft[0],
      0.84 * bu * ft[1],
      0.84 * bu * ft[2],
      1,
      lit,
      lit,
      lit,
      0
    );
  }
  if (!wb) quad(R['wt_' + st], x, y - H, 0, 1, 1, bu, bu, bu, 1, 0, 0, 0, 0);
  const hl = WHOLES.get(i);
  if (hl)
    for (const h of hl)
      if (h.f ? faceShown : true) quad(R.bhole, x + h.dx, y + h.dy, h.r, h.s, h.s, 1, 1, 1, 1, 0, 0, 0, 0);
  if (WBURN[i] > 0.05) quad(R.scorch, x, y + 20 - H * 0.5, 0, 0.36, H / 110, 1, 1, 1, WBURN[i] * 0.7, 0, 0, 0, 0);
  GS.gA = 1;
}

// the 3D picture for a brick or concrete wall tile: its height to the nearest one baked, its face's variant (a window,
// lit or dark or boarded, a poster, a crack) as the painted version chose it. Null when the pictures aren't in
function wallBlock(st, i, H, tx, ty) {
  if (st !== 'brick' && st !== 'conc') return null;
  const v = WVAR[i],
    r = hsh(tx * 3 + 5, ty * 7 + 1),
    n =
      st === 'conc'
        ? v === 1
          ? 'wb_c30win'
          : 'wb_c30'
        : H < 17.5
          ? r < 0.5
            ? 'wb_b14a'
            : 'wb_b14b'
          : H < 24.5
            ? r < 0.5
              ? 'wb_b21a'
              : 'wb_b21b'
            : v === 1
              ? 'wb_b28win'
              : v === 2
                ? r < 0.5
                  ? 'wb_b28dark'
                  : 'wb_b28board'
                : v === 3
                  ? 'wb_b28post'
                  : v === 4
                    ? 'wb_b28crack'
                    : r < 0.5
                      ? 'wb_b28a'
                      : 'wb_b28b';
  return R[n] && R[n].bk ? n : null;
}
// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  WST = new Uint8Array(MW * MH);
  WHT = new Float32Array(MW * MH);
  WVAR = new Uint8Array(MW * MH);
  hsh = (x, y) => ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000;
  isBlock = t => t === 5 || t === 1 || t === 9;
  windows = [];
  GS.decor = [];
  GS.jets = [];
  WVN = {
    brick: ['', 'win', 'dark', 'post', 'crack', 'brk'],
    conc: ['', 'win', 'brk'],
    bord: ['0', '1', '2'],
    int: ['', 'stain', 'blood', 'board', 'crack'],
  };
}
