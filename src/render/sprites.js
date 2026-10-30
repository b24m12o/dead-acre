/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { SOFT3, clamp } from '../core/util.js';
import { TS, TSH } from '../core/settings.js';
import { LIGHT_FS, LIGHT_VS, SHADOW_FS, SPRITE_FS, SPRITE_VS, gl, glc, hasCBF, program, uic } from './gl.js';
import { FS_VS } from './bake.js';
import { COMP_FS, DOWN_FS, FINAL_FS, UP_FS } from './post.js';
import { R } from './atlas.js';
export let P_SPRITE, P_SHADOW, P_LIGHT, P_COMP, P_DOWN, P_UP, P_FINAL;
export let emptyVAO;

function makeTex(w, h, hdr) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  if (hdr && hasCBF) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function makeRT(w, h, texs) {
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  texs.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
  gl.drawBuffers(texs.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
  return { fb, w, h, texs };
}
function freeRT(rt) {
  if (!rt) return;
  gl.deleteFramebuffer(rt.fb);
  rt.texs.forEach(t => gl.deleteTexture(t));
}

export let VW, VH, RW, RH, ZOOM, viewW, viewH;
export let rtScene, rtShadow, rtLight, rtComp, bloomRTs, rtFlash;
let GFX; // Ultra: the full shading; Balanced: no edge shading or sharpening, fewer pixels, for weaker laptops
export let gfxPreset;
export let DEVICE_RENDER_CAP; // render at the screen's own pixel density (no forced supersampling on ordinary monitors); the pixel budget bounds GPU memory
export function resize() {
  VW = window.innerWidth;
  VH = window.innerHeight;
  if (typeof GS.meta !== 'undefined' && GS.meta) {
    document.documentElement.style.setProperty('--ts', TS());
    document.documentElement.style.setProperty('--tsh', TSH());
  }
  const gp = gfxPreset();
  const rs = Math.min(GS.rsCap, gp.dpr, Math.sqrt(gp.pixels / Math.max(1, VW * VH))); // quality preset cap, with adaptive downscaling on slow hardware
  RW = Math.max(2, Math.round(VW * rs));
  RH = Math.max(2, Math.round(VH * rs));
  glc.width = RW;
  glc.height = RH;
  const ud = Math.min(window.devicePixelRatio || 1, 2);
  uic.width = Math.round(VW * ud);
  uic.height = Math.round(VH * ud);
  ZOOM = window.__Z || clamp(Math.min(VW / 1.5, VH) / 740, 0.62, 1.3);
  viewW = VW / ZOOM;
  viewH = VH / ZOOM;
  const gk = RW + 'x' + RH + ':' + gp.lightDiv + ':' + gp.bloomLevels;
  if (rtScene && resize.key === gk) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return;
  }
  resize.key = gk; // nothing would change: keep the render targets instead of rebuilding them all
  [rtScene, rtShadow, rtFlash, rtLight, rtComp, ...bloomRTs].forEach(freeRT);
  rtScene = makeRT(RW, RH, [makeTex(RW, RH, false), makeTex(RW, RH, true), makeTex(RW, RH, false)]);
  const hw = Math.max(2, RW >> 1),
    hh = Math.max(2, RH >> 1);
  rtShadow = makeRT(hw, hh, [makeTex(hw, hh, false)]);
  rtFlash = makeRT(hw, hh, [makeTex(hw, hh, true)]);
  const lightDiv = gp.lightDiv,
    lw = Math.max(2, Math.ceil(RW / lightDiv)),
    lh = Math.max(2, Math.ceil(RH / lightDiv));
  rtLight = makeRT(lw, lh, [makeTex(lw, lh, true)]);
  rtComp = makeRT(RW, RH, [makeTex(RW, RH, true)]);
  bloomRTs = [];
  let bw = RW >> 1,
    bh = RH >> 1;
  for (let i = 0; i < gp.bloomLevels && bw >= 4 && bh >= 4; i++) {
    bloomRTs.push(makeRT(bw, bh, [makeTex(bw, bh, true)]));
    bw >>= 1;
    bh >>= 1;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

/* ---------- Sprite batch ---------- */
let MAXQ, FPV, vdata;
let sVAO;
let sVBO;
let idx;
let sIBO;
let bAdd;
let SHX, SHY, SHH;
export let SUNV;
export function setH(h) {
  SHX = SUNV[0] * h;
  SHY = SUNV[1] * h;
  SHH = h;
}
export function bset(a, e, n, add) {
  if (a !== GS.bTexA || e !== GS.bTexE || n !== GS.bTexN || add !== bAdd) {
    flush();
    GS.bTexA = a;
    GS.bTexE = e;
    GS.bTexN = n;
    bAdd = add;
  }
}
export function flush() {
  if (!GS.qn) return;
  gl.bindVertexArray(sVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, sVBO);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, vdata, 0, GS.qn * 4 * FPV);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, GS.bTexA);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, GS.bTexE);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, GS.bTexN);
  if (GS.curProg === P_SPRITE) {
    gl.uniform1f(P_SPRITE.u.uAdd, bAdd ? 1 : 0);
    if (bAdd) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  gl.drawElements(gl.TRIANGLES, GS.qn * 6, gl.UNSIGNED_SHORT, 0);
  GS.qn = 0;
}
let CX, CY;
export function quad(r, x, y, rot, sx, sy, tr, tg, tb, ta, er, eg, eb, ef) {
  if (GS.SHMODE === 2) {
    // flashlight shadows: smear each silhouette away from the light, longer the further it stands
    const dx = x - GS.FLX,
      dy = y - GS.FLY,
      d = Math.hypot(dx, dy) || 1;
    if (d > 760 || SHH < 1) return;
    const off = SHH * (0.55 + d / 150);
    GS.SHMODE = 3;
    for (const k of SOFT3)
      quad(
        r,
        x + (dx / d) * off * k,
        y + (dy / d) * off * k,
        rot,
        sx,
        sy,
        tr,
        tg,
        tb,
        ta * (1.15 - k * 0.3),
        er,
        eg,
        eb,
        ef
      );
    GS.SHMODE = 2;
    return;
  }
  if (GS.SHMODE === 3) ta *= GS.SHS;
  else if (GS.SHMODE) {
    x += SHX;
    y += SHY;
    ta *= GS.SHS;
  }
  ta *= GS.gA;
  tr *= GS.gT * GS.gR;
  tg *= GS.gT * GS.gG;
  tb *= GS.gT * GS.gB;
  if (ta <= 0.002) return;
  const hw = r.w * sx * 0.5,
    hh = r.h * sy * 0.5,
    ext = Math.abs(hw) + Math.abs(hh);
  if (x + ext < GS.camX || x - ext > GS.camX + viewW || y + ext < GS.camY || y - ext > GS.camY + viewH) return;
  if (GS.qn >= MAXQ) flush();
  const c = Math.cos(rot),
    s = Math.sin(rot),
    fx = sx < 0 ? -1 : 1,
    fy = sy < 0 ? -1 : 1;
  let o = GS.qn * 4 * FPV;
  for (let i = 0; i < 4; i++) {
    const lx = CX[i] * hw,
      ly = CY[i] * hh;
    vdata[o++] = x + lx * c - ly * s;
    vdata[o++] = y + lx * s + ly * c;
    vdata[o++] = i === 1 || i === 2 ? r.u1 : r.u0;
    vdata[o++] = i >= 2 ? r.v1 : r.v0;
    vdata[o++] = tr;
    vdata[o++] = tg;
    vdata[o++] = tb;
    vdata[o++] = ta;
    vdata[o++] = er;
    vdata[o++] = eg;
    vdata[o++] = eb;
    vdata[o++] = ef;
    vdata[o++] = c;
    vdata[o++] = s;
    vdata[o++] = fx;
    vdata[o++] = fy;
  }
  GS.qn++;
}
export function lineQ(x0, y0, x1, y1, w, tr, tg, tb, ta, er, eg, eb, ef, reg) {
  const r = reg || R.limb,
    dx = x1 - x0,
    dy = y1 - y0,
    L = Math.hypot(dx, dy);
  if (L < 0.01) return;
  quad(
    r,
    (x0 + x1) / 2,
    (y0 + y1) / 2,
    Math.atan2(dy, dx),
    (L + w * 0.7) / r.w,
    w / r.h,
    tr,
    tg,
    tb,
    ta,
    er,
    eg,
    eb,
    ef
  );
}
/* ---------- Lights ---------- */
export let MAXL, ldata;
export let lVAO;
let cornerBuf;
export let lVBO;
export function addLight(x, y, r, cr, cg, cb, dir = 0, cw = 0) {
  if (GS.ln >= MAXL || x + r < GS.camX || x - r > GS.camX + viewW || y + r < GS.camY || y - r > GS.camY + viewH) return;
  let o = GS.ln * 8;
  ldata[o++] = x;
  ldata[o++] = y;
  ldata[o++] = r;
  ldata[o++] = dir;
  ldata[o++] = cr;
  ldata[o++] = cg;
  ldata[o++] = cb;
  ldata[o++] = cw;
  GS.ln++;
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  P_SPRITE = program(SPRITE_VS, SPRITE_FS);
  P_SHADOW = program(SPRITE_VS, SHADOW_FS);
  P_LIGHT = program(LIGHT_VS, LIGHT_FS);
  P_COMP = program(FS_VS, COMP_FS);
  P_DOWN = program(FS_VS, DOWN_FS);
  P_UP = program(FS_VS, UP_FS);
  P_FINAL = program(FS_VS, FINAL_FS);
  emptyVAO = gl.createVertexArray();
  VW = 1;
  VH = 1;
  RW = 1;
  RH = 1;
  ZOOM = 1;
  viewW = 1;
  viewH = 1;
  rtScene = undefined;
  rtShadow = undefined;
  rtLight = undefined;
  rtComp = undefined;
  bloomRTs = [];
  rtFlash = null;
  GFX = {
    ultra: { dpr: 1.5, pixels: 3.7e6, lightDiv: 4, bloomLevels: 6, bloom: 0.6, sharpen: 0.1, ash: 90, cav: 1 },
    balanced: { dpr: 1, pixels: 2.1e6, lightDiv: 4, bloomLevels: 5, bloom: 0.56, sharpen: 0, ash: 45, cav: 0 },
  };
  gfxPreset = () =>
    GFX[
      typeof GS.meta !== 'undefined' && GS.meta && GS.meta.hud && GS.meta.hud.gfx === 'balanced' ? 'balanced' : 'ultra'
    ];
  DEVICE_RENDER_CAP = Math.min(window.devicePixelRatio || 1, 2);
  GS.RS_MAX = Math.min(DEVICE_RENDER_CAP, gfxPreset().dpr);
  GS.rsCap = GS.RS_MAX;
  GS.rsUp = 0;
  GS.rsDropT = 0;
  GS.rzT = 0;
  MAXQ = 16000;
  FPV = 16;
  vdata = new Float32Array(MAXQ * 4 * FPV);
  GS.qn = 0;
  sVAO = gl.createVertexArray();
  gl.bindVertexArray(sVAO);
  sVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sVBO);
  gl.bufferData(gl.ARRAY_BUFFER, vdata.byteLength, gl.DYNAMIC_DRAW);
  [
    [0, 2, 0],
    [1, 2, 2],
    [2, 4, 4],
    [3, 4, 8],
    [4, 4, 12],
  ].forEach(([loc, size, off]) => {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, FPV * 4, off * 4);
  });
  idx = new Uint16Array(MAXQ * 6);
  for (let i = 0; i < MAXQ; i++) {
    const v = i * 4,
      o = i * 6;
    idx[o] = v;
    idx[o + 1] = v + 1;
    idx[o + 2] = v + 2;
    idx[o + 3] = v;
    idx[o + 4] = v + 2;
    idx[o + 5] = v + 3;
  }
  sIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  GS.bTexA = null;
  GS.bTexE = null;
  GS.bTexN = null;
  bAdd = false;
  GS.camX = 0;
  GS.camY = 0;
  GS.curProg = P_SPRITE;
  GS.SHMODE = false;
  SHX = 0;
  SHY = 0;
  SHH = 0;
  GS.FLX = 0;
  GS.FLY = 0;
  GS.NOHERO = false;
  GS.SHS = 0.6;
  GS.gT = 1;
  GS.gA = 1;
  GS.gR = 1;
  GS.gG = 1;
  GS.gB = 1;
  SUNV = [0.75, 0.95];
  CX = [-1, 1, 1, -1];
  CY = [-1, -1, 1, 1];
  MAXL = 128;
  ldata = new Float32Array(MAXL * 8);
  GS.ln = 0;
  lVAO = gl.createVertexArray();
  gl.bindVertexArray(lVAO);
  cornerBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  lVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lVBO);
  gl.bufferData(gl.ARRAY_BUFFER, ldata.byteLength, gl.DYNAMIC_DRAW);
  [1, 2].forEach((loc, i) => {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 32, i * 16);
    gl.vertexAttribDivisor(loc, 1);
  });
  gl.bindVertexArray(null);
}
