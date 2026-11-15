/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Lamp light stops at walls. For every street lamp, how far its light gets in each direction before it meets a
// wall: one row of a small texture per lamp, 256 directions round it. The light shader (gl.js) looks its pixel's
// direction up in the lamp's row and leaves the ground behind the wall dark, for as far as a wall that high shades
// it; past that the light comes down over the wall again. So a house's back yard is dark, the inside of a house is
// not lit through its walls, and a wall is somewhere to stand unseen: lampHid() answers the same question for the
// game (how the dead see you, lights.js), from the same numbers. Built when the map is, and again when a wall goes.
import { gl } from './gl.js';
import { MH, MW, TILE, lamps, ttype } from '../world/map.js';

export const OCC = {
  N: 256, // directions round a lamp
  far: 400, // px a distance byte spans (no lamp reaches further)
  past: 44, // the wall itself is lit: its face and its top. The dark begins this far behind where the light met it,
  band: 0.62, // and runs this share of the lamp's distance to the wall (a wall a third the height of the lamp)
};
let tex = null,
  data = null,
  rows = 0,
  dirty = true,
  built = null;
export function occDirty() {
  dirty = true;
}
const wallAt = (x, y) => {
  const i = Math.floor(x / TILE),
    j = Math.floor(y / TILE);
  if (i < 0 || j < 0 || i >= MW || j >= MH) return true;
  const t = ttype[j * MW + i];
  return t === 1 || t === 5;
};
function build() {
  dirty = false;
  built = lamps;
  rows = lamps.length;
  if (!rows) return;
  if (!data || data.length !== OCC.N * rows) data = new Uint8Array(OCC.N * rows);
  lamps.forEach((L, r) => {
    L.occ = r + 1;
    const R = (L.lantern ? 210 : 330) + 20;
    for (let a = 0; a < OCC.N; a++) {
      const an = (a / OCC.N) * Math.PI * 2,
        c = Math.cos(an),
        s = Math.sin(an);
      let d = 16; // its own pole and whatever it hangs from don't count
      for (; d < R; d += 5) if (wallAt(L.hx + c * d, L.hy + s * d)) break;
      data[r * OCC.N + a] = d >= R ? 255 : Math.min(254, Math.round((d / OCC.far) * 255));
    }
  });
  if (!tex) tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, OCC.N, rows, 0, gl.RED, gl.UNSIGNED_BYTE, data);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
// the texture, up to date (null on a map with no lamps)
export function occTex() {
  if (dirty || built !== lamps) build();
  return rows ? tex : null;
}
// how much of lamp L's light a wall keeps off the point x, y: 0 none, 1 all of it. The shader's own sum, on the CPU
export function lampHid(L, x, y) {
  if (dirty || built !== lamps) {
    if (!gl) return 0;
    build();
  }
  if (!L.occ || !data) return 0;
  const dx = x - L.hx,
    dy = y - L.hy,
    dl = Math.hypot(dx, dy);
  let an = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
  an *= OCC.N;
  const i0 = Math.floor(an) % OCC.N,
    f = an - Math.floor(an),
    o = (L.occ - 1) * OCC.N,
    b0 = data[o + i0],
    b1 = data[o + ((i0 + 1) % OCC.N)];
  if (b0 === 255 && b1 === 255) return 0;
  const dw = ((b0 + (b1 - b0) * f) / 255) * OCC.far,
    st = (a, b, v) => {
      const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
  return (
    st(dw + OCC.past - 8, dw + OCC.past + 8, dl) * (1 - st(dw * (1 + OCC.band) + 40, dw * (1 + OCC.band) + 70, dl))
  );
}
