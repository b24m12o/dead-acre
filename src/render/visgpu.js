/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// What you can see from where you stand, drawn on the graphics card: every wall tile in view throws a shadow away
// from you, out past the edge of the screen, into a small mask. The mask's red channel dims what is out of sight (the
// line-of-sight option; far off it never goes fully dark), its green channel stops the flashlight: the beam lights the
// wall it hits and nothing behind it.
import { GS } from '../core/gs.js';
import { gl, program } from './gl.js';
import { VH, VW, viewH, viewW } from './sprites.js';
import { MH, MW, TILE, grid, ttype } from '../world/map.js';

const VS = `#version 300 es
layout(location=0) in vec2 aP; uniform vec4 uCam; out vec2 vW;
void main(){ vW=aP; vec2 p=(aP-uCam.xy)/uCam.zw; gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0); }`;
const FS = `#version 300 es
precision highp float; uniform vec2 uO; in vec2 vW; out vec4 o;
void main(){ float far=0.5*smoothstep(340.0,900.0,length(vW-uO)); o=vec4(far,0.0,0.0,1.0); }`;
const DIV = 6; // the mask is a sixth of the screen's size: texture filtering gives the soft edge
let P = null,
  vao,
  vbo,
  buf,
  fb,
  W = 0,
  H = 0;
export let visTex = null,
  visW = 1,
  visH = 1;
const opaque = i => grid[i] === 1 && (ttype[i] === 1 || ttype[i] === 5); // walls and the map's edge; fences, cars and trees don't block the view
function setup() {
  P = program(VS, FS);
  vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  buf = new Float32Array(6 * 2 * 4000);
  gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.bindVertexArray(null);
  fb = gl.createFramebuffer();
}
function size() {
  const w = Math.max(2, Math.ceil(VW / DIV)),
    h = Math.max(2, Math.ceil(VH / DIV));
  if (w === W && h === H && visTex) return;
  W = w;
  H = h;
  visW = w;
  visH = h;
  if (visTex) gl.deleteTexture(visTex);
  visTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, visTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, visTex, 0);
}
// the mask, seen from (ox, oy); leaves the framebuffer unbound
export function buildVisGPU(ox, oy) {
  if (!P) setup();
  size();
  const FAR = Math.hypot(viewW, viewH) * 1.5 + 400,
    tx0 = Math.max(0, Math.floor((GS.camX - 80) / TILE)),
    tx1 = Math.min(MW - 1, Math.floor((GS.camX + viewW + 80) / TILE)),
    ty0 = Math.max(0, Math.floor((GS.camY - 80) / TILE)),
    ty1 = Math.min(MH - 1, Math.floor((GS.camY + viewH + 120) / TILE)),
    pcx = Math.floor(ox / TILE),
    pcy = Math.floor(oy / TILE);
  let n = 0;
  const corner = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!opaque(ty * MW + tx) || (tx === pcx && ty === pcy)) continue;
      if (n + 12 > buf.length) break;
      const x0 = tx * TILE,
        y0 = ty * TILE,
        ca = Math.atan2(y0 + TILE / 2 - oy, x0 + TILE / 2 - ox);
      corner[0] = x0;
      corner[1] = y0;
      corner[2] = x0 + TILE;
      corner[3] = y0;
      corner[4] = x0 + TILE;
      corner[5] = y0 + TILE;
      corner[6] = x0;
      corner[7] = y0 + TILE;
      // the two corners at the widest angle either side of the tile's centre, as seen from you
      let lo = 9,
        hi = -9,
        li = 0,
        hiI = 0;
      for (let c = 0; c < 4; c++) {
        let d = Math.atan2(corner[c * 2 + 1] - oy, corner[c * 2] - ox) - ca;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        if (d < lo) {
          lo = d;
          li = c;
        }
        if (d > hi) {
          hi = d;
          hiI = c;
        }
      }
      const pts = [];
      for (const c of [li, hiI]) {
        const cx = corner[c * 2],
          cy = corner[c * 2 + 1],
          dx = cx - ox,
          dy = cy - oy,
          L = Math.hypot(dx, dy) || 1,
          ux = dx / L,
          uy = dy / L,
          off = 20 + (uy < 0 ? -uy * 34 : 0); // the wall itself stays in view, its raised face too
        pts.push(cx + ux * off, cy + uy * off, cx + ux * FAR, cy + uy * FAR);
      }
      // near A, near B, far B / near A, far B, far A
      buf[n++] = pts[0];
      buf[n++] = pts[1];
      buf[n++] = pts[4];
      buf[n++] = pts[5];
      buf[n++] = pts[6];
      buf[n++] = pts[7];
      buf[n++] = pts[0];
      buf[n++] = pts[1];
      buf[n++] = pts[6];
      buf[n++] = pts[7];
      buf[n++] = pts[2];
      buf[n++] = pts[3];
    }
  const blend = gl.isEnabled(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, W, H);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.BLEND);
  gl.useProgram(P.p);
  gl.uniform4f(P.u.uCam, GS.camX, GS.camY, viewW, viewH);
  gl.uniform2f(P.u.uO, ox, oy);
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf, 0, n);
  if (n) gl.drawArrays(gl.TRIANGLES, 0, n / 2);
  gl.bindVertexArray(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (blend) gl.enable(gl.BLEND); // the light pass after this adds its lights up
}
// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  P = null;
  visTex = null;
  W = H = 0;
}
