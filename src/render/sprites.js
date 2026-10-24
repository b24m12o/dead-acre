/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const P_SPRITE = program(SPRITE_VS, SPRITE_FS),
  P_SHADOW = program(SPRITE_VS, SHADOW_FS),
  P_LIGHT = program(LIGHT_VS, LIGHT_FS),
  P_COMP = program(FS_VS, COMP_FS),
  P_DOWN = program(FS_VS, DOWN_FS),
  P_UP = program(FS_VS, UP_FS),
  P_FINAL = program(FS_VS, FINAL_FS);
const emptyVAO = gl.createVertexArray();

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

let VW = 1,
  VH = 1,
  RW = 1,
  RH = 1,
  ZOOM = 1,
  viewW = 1,
  viewH = 1;
let rtScene,
  rtShadow,
  rtLight,
  rtComp,
  bloomRTs = [],
  rtFlash = null;
const GFX = {
  ultra: { dpr: 1.5, pixels: 3.7e6, lightDiv: 4, bloomLevels: 6, bloom: 0.6, sharpen: 0.1, ash: 90, cav: 1 },
  balanced: { dpr: 1, pixels: 2.1e6, lightDiv: 4, bloomLevels: 5, bloom: 0.56, sharpen: 0, ash: 45, cav: 0 },
}; // Ultra: the full shading; Balanced: no edge shading or sharpening, fewer pixels, for weaker laptops
const gfxPreset = () =>
  GFX[typeof meta !== 'undefined' && meta && meta.hud && meta.hud.gfx === 'balanced' ? 'balanced' : 'ultra'];
const DEVICE_RENDER_CAP = Math.min(window.devicePixelRatio || 1, 2); // render at the screen's own pixel density (no forced supersampling on ordinary monitors); the pixel budget bounds GPU memory
let RS_MAX = Math.min(DEVICE_RENDER_CAP, gfxPreset().dpr),
  rsCap = RS_MAX,
  rsUp = 0,
  rsDropT = 0,
  rzT = 0;
function resize() {
  VW = window.innerWidth;
  VH = window.innerHeight;
  if (typeof meta !== 'undefined' && meta) document.documentElement.style.setProperty('--ts', TS());
  const gp = gfxPreset();
  const rs = Math.min(rsCap, gp.dpr, Math.sqrt(gp.pixels / Math.max(1, VW * VH))); // quality preset cap, with adaptive downscaling on slow hardware
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
const MAXQ = 16000,
  FPV = 16,
  vdata = new Float32Array(MAXQ * 4 * FPV);
let qn = 0;
const sVAO = gl.createVertexArray();
gl.bindVertexArray(sVAO);
const sVBO = gl.createBuffer();
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
const idx = new Uint16Array(MAXQ * 6);
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
const sIBO = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIBO);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
gl.bindVertexArray(null);
let bTexA = null,
  bTexE = null,
  bTexN = null,
  bAdd = false,
  camX = 0,
  camY = 0,
  curProg = P_SPRITE;
let SHMODE = false,
  SHX = 0,
  SHY = 0,
  SHH = 0,
  FLX = 0,
  FLY = 0,
  NOHERO = false,
  SHS = 0.6,
  gT = 1,
  gA = 1,
  gR = 1,
  gG = 1,
  gB = 1;
const SUNV = [0.75, 0.95];
function setH(h) {
  SHX = SUNV[0] * h;
  SHY = SUNV[1] * h;
  SHH = h;
}
function bset(a, e, n, add) {
  if (a !== bTexA || e !== bTexE || n !== bTexN || add !== bAdd) {
    flush();
    bTexA = a;
    bTexE = e;
    bTexN = n;
    bAdd = add;
  }
}
function flush() {
  if (!qn) return;
  gl.bindVertexArray(sVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, sVBO);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, vdata, 0, qn * 4 * FPV);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, bTexA);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, bTexE);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, bTexN);
  if (curProg === P_SPRITE) {
    gl.uniform1f(P_SPRITE.u.uAdd, bAdd ? 1 : 0);
    if (bAdd) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  gl.drawElements(gl.TRIANGLES, qn * 6, gl.UNSIGNED_SHORT, 0);
  qn = 0;
}
const CX = [-1, 1, 1, -1],
  CY = [-1, -1, 1, 1];
function quad(r, x, y, rot, sx, sy, tr, tg, tb, ta, er, eg, eb, ef) {
  if (SHMODE === 2) {
    // flashlight shadows: smear each silhouette away from the light, longer the further it stands
    const dx = x - FLX,
      dy = y - FLY,
      d = Math.hypot(dx, dy) || 1;
    if (d > 760 || SHH < 1) return;
    const off = SHH * (0.55 + d / 150);
    SHMODE = 3;
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
    SHMODE = 2;
    return;
  }
  if (SHMODE === 3) ta *= SHS;
  else if (SHMODE) {
    x += SHX;
    y += SHY;
    ta *= SHS;
  }
  ta *= gA;
  tr *= gT * gR;
  tg *= gT * gG;
  tb *= gT * gB;
  if (ta <= 0.002) return;
  const hw = r.w * sx * 0.5,
    hh = r.h * sy * 0.5,
    ext = Math.abs(hw) + Math.abs(hh);
  if (x + ext < camX || x - ext > camX + viewW || y + ext < camY || y - ext > camY + viewH) return;
  if (qn >= MAXQ) flush();
  const c = Math.cos(rot),
    s = Math.sin(rot),
    fx = sx < 0 ? -1 : 1,
    fy = sy < 0 ? -1 : 1;
  let o = qn * 4 * FPV;
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
  qn++;
}
function lineQ(x0, y0, x1, y1, w, tr, tg, tb, ta, er, eg, eb, ef, reg) {
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
const MAXL = 128,
  ldata = new Float32Array(MAXL * 8);
let ln = 0;
const lVAO = gl.createVertexArray();
gl.bindVertexArray(lVAO);
const cornerBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const lVBO = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, lVBO);
gl.bufferData(gl.ARRAY_BUFFER, ldata.byteLength, gl.DYNAMIC_DRAW);
[1, 2].forEach((loc, i) => {
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 32, i * 16);
  gl.vertexAttribDivisor(loc, 1);
});
gl.bindVertexArray(null);
function addLight(x, y, r, cr, cg, cb, dir = 0, cw = 0) {
  if (ln >= MAXL || x + r < camX || x - r > camX + viewW || y + r < camY || y - r > camY + viewH) return;
  let o = ln * 8;
  ldata[o++] = x;
  ldata[o++] = y;
  ldata[o++] = r;
  ldata[o++] = dir;
  ldata[o++] = cr;
  ldata[o++] = cg;
  ldata[o++] = cb;
  ldata[o++] = cw;
  ln++;
}
