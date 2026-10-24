/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { TAU, rand } from '../core/util.js';
import { gl } from './gl.js';
import { BAKE, bakeRun } from './bake.js';
/* =====================================================================
   Painted atlas + generated normal maps
   ===================================================================== */
export let MAXTEX;
export let AS, ATL;
export let atlA, atlE, atlN;
let xa, xe, xn;
export let R, META;
let SHELVES;
let SHELF_Y;
// spec: shininess, soft: how rounded the generated volume is, det: how much painted detail turns into relief
export function region(name, w, h, paint, spec = 0.3, soft = 1, det = 1) {
  const pw = Math.ceil(w * AS) + 14,
    ph = Math.ceil(h * AS) + 14;
  // best-fit shelf packing: drop into the existing row that wastes the least height, else open a new row
  let best = null;
  for (const r of SHELVES) if (r.h >= ph && r.x + pw <= ATL && (!best || r.h < best.h)) best = r;
  if ((!best || best.h > ph * 1.8) && SHELF_Y + ph <= ATL) {
    best = { x: 4, y: SHELF_Y, h: ph };
    SHELVES.push(best);
    SHELF_Y += ph;
  } // a new row only if it fits; otherwise the warning below fires
  if (!best) {
    best = SHELVES.filter(r => r.x + pw <= ATL).sort((p, q) => p.h - q.h)[0] || { x: 4, y: 4, h: ph };
    console.warn('atlas full:', name);
  }
  const x = best.x + 7,
    y = best.y + 7;
  best.x += pw;
  for (const c of [xa, xe]) {
    c.save();
    c.beginPath();
    c.rect(x, y, w * AS, h * AS);
    c.clip();
    c.translate(x + (w * AS) / 2, y + (h * AS) / 2);
    c.scale(AS, AS);
    c.lineJoin = 'round';
    c.lineCap = 'round';
  }
  const BK = BAKE.parts[name] ? bakeRun(name, Math.ceil(w * AS), Math.ceil(h * AS), w, h) : null;
  CHARK = /^(z_|hb\d|hh\d|h_(upper|fore|hand|foot|elbow))/.test(name);
  if (BK) {
    if (BK.cv) {
      xa.drawImage(BK.cv, BK.sx, BK.sy, BK.sw, BK.sh, -w / 2, -h / 2, w, h);
      if (BAKE.parts[name].sl) {
        xe.save();
        xe.globalAlpha = name === 'crate' || name === 'wcase' ? 0.6 : 0.42;
        xe.drawImage(BK.cv, BK.sx, BK.sy, BK.sw, BK.sh, -w / 2, -h / 2, w, h);
        xe.restore();
      } /* the orange marker panel glows, so a drop is easy to find in the dark */
    } else {
      const cv = document.createElement('canvas');
      cv.width = BK.W;
      cv.height = BK.H;
      cv.getContext('2d').putImageData(BK.img, 0, 0);
      xa.drawImage(cv, -w / 2, -h / 2, w, h);
    }
    const sc = BAKE.scratch || (BAKE.scratch = document.createElement('canvas').getContext('2d'));
    sc.save();
    paint(sc, BAKE.parts[name].ne ? sc : xe, w, h);
    sc.restore();
  } // the baked photo goes in; the painter still runs for its glow (eyes), its paint thrown away
  else paint(xa, xe, w, h);
  CHARK = false;
  xa.restore();
  xe.restore();
  R[name] = { w, h, u0: x / ATL, v0: y / ATL, u1: (x + w * AS) / ATL, v1: (y + h * AS) / ATL, bk: !!BK }; // bk: drawn from a 3D picture
  // Each atlas region gets a material response: damp infected skin and helmet/face surfaces catch a soft highlight, cloth stays matte, and metal gear retains tight speculars.
  const key = name.toLowerCase();
  let materialSpec = spec;
  if (/^(z_head|z_shead|z_bhead)/.test(key)) materialSpec = Math.max(materialSpec, 0.36);
  else if (/^hh[0-9]/.test(key)) materialSpec = Math.max(materialSpec, 0.32);
  else if (/^hb[0-9]/.test(key)) materialSpec = Math.max(materialSpec, 0.27);
  else if (key === 'carburn')
    materialSpec = 0.08; // burnt paint and bare metal don't shine
  else if (/^(truck|police|car)/.test(key))
    materialSpec = Math.max(materialSpec, 0.42); // old paint under a coat of dust: a soft sheen, not a toy's gloss
  else if (/^(h_gun|h_shotgun|h_launcher|lightbar|lightbar2|mag|bbtop)/.test(key))
    materialSpec = Math.max(materialSpec, 0.74);
  META.push({
    px: x - 4,
    py: y - 4,
    pw: Math.ceil(w * AS) + 8,
    ph: Math.ceil(h * AS) + 8,
    spec: materialSpec,
    soft,
    det,
  });
  if (BK) {
    const W = BK.W,
      Hh = BK.H,
      pw = W + 8,
      hm = new Float32Array(pw * (Hh + 8));
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) hm[(j + 4) * pw + i + 4] = BK.hz[j * W + i] * 1.3;
    META[META.length - 1].hm = hm;
  } // the bake's exact heights replace the guess from paint
}
export function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h),
    out = new Float32Array(w * h),
    inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) if (x >= 0 && x < w) acc += src[row + x];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * inv;
      const xo = x - r,
        xi = x + r + 1;
      if (xo >= 0) acc -= src[row + xo];
      if (xi < w) acc += src[row + xi];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) if (y >= 0 && y < h) acc += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * inv;
      const yo = y - r,
        yi = y + r + 1;
      if (yo >= 0) acc -= tmp[yo * w + x];
      if (yi < h) acc += tmp[yi * w + x];
    }
  }
  return out;
}
export function heightToNormals(H, w, h, K, od, ow, ox, oy, specArr, alphaArr) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const gx = (H[y * w + Math.min(w - 1, x + 1)] - H[y * w + Math.max(0, x - 1)]) * 0.5;
      const gy = (H[Math.min(h - 1, y + 1) * w + x] - H[Math.max(0, y - 1) * w + x]) * 0.5;
      let nx = -gx * K,
        ny = -gy * K;
      const l = Math.hypot(nx, ny, 1);
      nx /= l;
      ny /= l;
      const o = ((oy + y) * ow + ox + x) * 4;
      od[o] = nx * 127.5 + 127.5;
      od[o + 1] = ny * 127.5 + 127.5;
      od[o + 2] = specArr ? specArr[i] : 0;
      od[o + 3] = alphaArr ? alphaArr[i] : 255;
    }
}
function normalsInto(img, rows, meta, od) {
  // relief for every painted region: blurred alpha + painted luminance as a height field, then its gradient as a normal
  for (const m of meta) {
    const { px, py, pw, ph } = m,
      n = pw * ph,
      A = new Float32Array(n),
      Lm = new Float32Array(n),
      al = new Uint8Array(n),
      sp = new Uint8Array(n);
    for (let j = 0; j < ph; j++)
      for (let i = 0; i < pw; i++) {
        const k = j * pw + i,
          o = ((py + j) * ATL + px + i) * 4;
        A[k] = img[o + 3] / 255;
        al[k] = img[o + 3];
        sp[k] = m.spec * 255;
        Lm[k] = (0.3 * img[o] + 0.59 * img[o + 1] + 0.11 * img[o + 2]) / 255;
      }
    const r = Math.max(1, Math.round(Math.min(pw, ph) * 0.1 * m.soft));
    const B = boxBlur(boxBlur(A, pw, ph, r), pw, ph, r),
      Ld = boxBlur(Lm, pw, ph, 1),
      H = new Float32Array(n);
    if (m.hm && m.hm.length === n) H.set(m.hm);
    else for (let k = 0; k < n; k++) H[k] = Math.sqrt(Math.max(0, B[k])) * 0.88 + Ld[k] * A[k] * 0.42 * m.det;
    heightToNormals(H, pw, ph, r * 2.15, od, ATL, px, py, sp, al);
  }
}
export function genNormals(done) {
  // the slowest part of loading runs in a worker when the page allows one, so the menu comes up while it finishes
  const rows = Math.min(ATL, SHELF_Y + 8),
    meta = META.map(m => ({
      px: m.px,
      py: m.py,
      pw: m.pw,
      ph: m.ph,
      spec: m.spec,
      soft: m.soft,
      det: m.det,
      hm: m.hm || null,
    }));
  const finish = od => {
    xn.putImageData(new ImageData(od, ATL, rows), 0, 0);
    done();
  };
  const sync = () => {
    const img = xa.getImageData(0, 0, ATL, rows).data,
      od = new Uint8ClampedArray(ATL * rows * 4);
    normalsInto(img, rows, meta, od);
    finish(od);
  };
  let w = null;
  try {
    const src = `const ATL = ${ATL};\n${boxBlur.toString()}\n${heightToNormals.toString()}\n${normalsInto.toString()}\nonmessage = e => { const { img, rows, meta } = e.data, od = new Uint8ClampedArray(ATL * rows * 4); normalsInto(img, rows, meta, od); postMessage(od, [od.buffer]); };`;
    w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    const img = xa.getImageData(0, 0, ATL, rows).data,
      keep = new Uint8ClampedArray(img); // a copy stays here in case the worker dies
    w.onmessage = ev => {
      w.terminate();
      finish(ev.data);
    };
    w.onerror = ev => {
      ev.preventDefault && ev.preventDefault();
      w.terminate();
      const od = new Uint8ClampedArray(ATL * rows * 4);
      normalsInto(keep, rows, meta, od);
      finish(od);
    };
    w.postMessage({ img, rows, meta }, [img.buffer]);
  } catch (err) {
    if (w) w.terminate();
    sync();
  }
}
export let OUT;
let CHARK; // people (the hero, survivors, the dead) get a thinner, translucent outline that takes on the colour beneath it
export function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
export function circ(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, Math.max(0.01, r), 0, TAU);
}
export function ell(c, x, y, rx, ry, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}
export function grad(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  return g;
}
export function rgrad(c, x, y, r, stops, fx = x, fy = y) {
  const g = c.createRadialGradient(fx, fy, 0, x, y, r);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  return g;
}
export function radial(c, x, y, r, stops) {
  c.fillStyle = rgrad(c, x, y, r, stops);
  circ(c, x, y, r);
  c.fill();
}
// paint a shape: fill, speckle texture, inner occlusion along the edge, outline
export function shape(c, path, fill, o = {}) {
  path(c);
  c.fillStyle = fill;
  c.fill();
  c.save();
  path(c);
  c.clip();
  if (o.speck) {
    c.fillStyle = o.speck;
    for (let i = 0; i < (o.n || 40); i++) {
      circ(c, rand(-60, 60) * (o.sx || 0.5), rand(-60, 60) * (o.sy || 0.5), rand(0.4, o.sr || 1.3));
      c.fill();
    }
  }
  path(c);
  c.strokeStyle = o.ao || 'rgba(9,10,12,0.26)';
  c.lineWidth = o.aoW || 3.2;
  c.stroke();
  c.restore();
  path(c);
  c.strokeStyle = o.out || (CHARK ? 'rgba(12,12,16,0.55)' : 'rgba(14,15,18,0.62)');
  c.lineWidth = CHARK ? (o.lw ?? 0.9) : (o.lw ?? 1.2) * 0.7;
  c.stroke(); // painted props get a thin, soft edge, not a cartoon outline
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  MAXTEX = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 2048;
  AS = MAXTEX < 4096 ? 1.5 : 3;
  ATL = MAXTEX >= 4096 ? 4096 : 2048;
  atlA = document.createElement('canvas');
  atlE = document.createElement('canvas');
  atlN = document.createElement('canvas');
  atlA.width = atlA.height = atlE.width = atlE.height = atlN.width = atlN.height = ATL;
  xa = atlA.getContext('2d', { willReadFrequently: true });
  xe = atlE.getContext('2d');
  xn = atlN.getContext('2d');
  R = {};
  META = [];
  SHELVES = [];
  SHELF_Y = 4;
  OUT = '#24252a';
  CHARK = false;
}
