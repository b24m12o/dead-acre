/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
/* global window, document */ // parts of this run inside the browser
// Builds the 3D figures' meshes from their shapes (tools/mesh/*.mjs): each shape is measured on a fine 3D grid in a
// browser's GPU, the grid's surface becomes triangles (surface nets), each corner is settled onto the true surface and
// told its normal, its bones (with weights blending across each joint), what it is (skin, shirt, trousers...), how far
// along its limb it sits and how deep in a crease. Writes assets/mesh.<hash>.bin and its entry in assets/pack.json,
// and preview pictures of each model to build/mesh/.
//   node tools/mesh/build.mjs [--res 0.7] [--preview-only]
import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { browser, ROOT } from '../../tests/lib/harness.mjs';
import { SDF_LIB } from '../../src/render/sdf-lib.js';
import * as ZOMBIE from './zombie.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const LODS = [+arg('--res', 1.0), +arg('--res-lo', 1.7)]; // each model twice: close up, and for a crowd
const MODELS = { zombie: ZOMBIE };
const OUT = join(ROOT, 'build/mesh');
mkdirSync(OUT, { recursive: true });

// ---------- in the browser: the GPU measures the shape ----------
const PAGE = () => {
  const cv = document.createElement('canvas');
  const gl = cv.getContext('webgl2', { antialias: false });
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const VS = `#version 300 es
  void main(){ vec2 p=vec2(gl_VertexID==1?3.0:-1.0, gl_VertexID==2?3.0:-1.0); gl_Position=vec4(p,0.0,1.0); }`;
  const prog = fs => {
    const p = gl.createProgram();
    for (const [t, src] of [
      [gl.VERTEX_SHADER, VS],
      [gl.FRAGMENT_SHADER, fs],
    ]) {
      const s = gl.createShader(t);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };
  const target = (w, h) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, w, h);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, fb, w, h };
  };
  const b64 = f => {
    const u = new Uint8Array(f.buffer);
    let s = '';
    for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return btoa(s);
  };
  const unb64 = s => {
    const b = atob(s),
      u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return new Float32Array(u.buffer);
  };
  window.MESH = {
    // the distance to the shape at every point of the grid, slice by slice
    grid(lib, glsl, org, res, nx, ny, nz) {
      const p = prog(`#version 300 es
precision highp float; precision highp int;
uniform vec3 uOrg; uniform float uRes; uniform float uZ; uniform float uSeed; out vec4 o;
${lib}
${glsl}
void main(){ vec3 p=uOrg+vec3(floor(gl_FragCoord.xy),uZ)*uRes; o=vec4(model(p)); }`);
      gl.useProgram(p);
      target(nx, ny);
      const out = new Float32Array(nx * ny * nz),
        px = new Float32Array(nx * ny * 4);
      gl.viewport(0, 0, nx, ny);
      gl.uniform3f(gl.getUniformLocation(p, 'uOrg'), ...org);
      gl.uniform1f(gl.getUniformLocation(p, 'uRes'), res);
      for (let k = 0; k < nz; k++) {
        gl.uniform1f(gl.getUniformLocation(p, 'uZ'), k);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.readPixels(0, 0, nx, ny, gl.RGBA, gl.FLOAT, px);
        for (let i = 0; i < nx * ny; i++) out[k * nx * ny + i] = px[i * 4];
      }
      return b64(out);
    },
    // each corner: settled onto the surface, then its normal and what it is
    attrs(lib, glsl, posB64) {
      const pos = unb64(posB64),
        n = pos.length / 3,
        W = 1024,
        H = Math.ceil(n / W);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, W, H);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // float: unfiltered, or it reads as nothing
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      const up = new Float32Array(W * H * 4);
      for (let i = 0; i < n; i++) up.set([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], 1], i * 4);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.FLOAT, up);
      const res = [];
      for (let pass = 0; pass < 3; pass++) {
        const p = prog(`#version 300 es
precision highp float; precision highp int;
uniform highp sampler2D uPos; uniform float uSeed; out vec4 o;
${lib}
${glsl}
vec3 grad(vec3 p){ vec2 e=vec2(0.12,-0.12); return normalize(e.xyy*model(p+e.xyy)+e.yyx*model(p+e.yyx)+e.yxy*model(p+e.yxy)+e.xxx*model(p+e.xxx)); }
void main(){ vec3 p=texelFetch(uPos,ivec2(gl_FragCoord.xy),0).xyz;
  for(int i=0;i<4;i++){ p-=grad(p)*model(p); } // onto the surface
  vec3 n=grad(p);
  ${['o=vec4(p,0.0);', 'o=vec4(n,clamp(model(p+n*2.0)/2.0,0.0,1.0)*0.5+clamp(model(p+n*5.0)/5.0,0.0,1.0)*0.5);', 'attrs(p); o=vec4(float(gPart),float(gReg),gU,0.0);'][pass]} }`);
        gl.useProgram(p);
        const T = target(W, H); // (binds its own texture: the corners' go back on after)
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(gl.getUniformLocation(p, 'uPos'), 0);
        gl.viewport(0, 0, W, H);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const px = new Float32Array(W * H * 4);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, px);
        res.push(b64(px.subarray(0, n * 4).slice()));
        gl.deleteFramebuffer(T.fb);
      }
      return res;
    },
    // a look at the mesh from a few sides, coloured by what each part is
    preview(posB64, nrmB64, regB64, idxB64, views, size) {
      const pos = unb64(posB64),
        nrm = unb64(nrmB64),
        reg = unb64(regB64),
        idx = new Uint32Array(unb64(idxB64).buffer);
      cv.width = size * views.length;
      cv.height = size;
      const p = gl.createProgram();
      const sh = (t, s) => {
        const o = gl.createShader(t);
        gl.shaderSource(o, s);
        gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
        gl.attachShader(p, o);
      };
      sh(
        gl.VERTEX_SHADER,
        `#version 300 es
in vec3 aP; in vec3 aN; in float aR; uniform mat3 uV; uniform float uS; out vec3 vN; out float vR;
void main(){ vec3 q=uV*(aP-vec3(1.0,0.0,24.0)); gl_Position=vec4(q.x/uS,q.y/uS,-q.z/100.0,1.0); vN=uV*aN; vR=aR; }`
      );
      sh(
        gl.FRAGMENT_SHADER,
        `#version 300 es
precision highp float; in vec3 vN; in float vR; out vec4 o;
void main(){ int r=int(vR+0.5); vec3 c=r==0?vec3(0.62,0.66,0.52):r==1?vec3(0.2,0.17,0.14):r==2?vec3(0.58,0.62,0.5):r<=4?vec3(0.36,0.44,0.52):r==5?vec3(0.22,0.22,0.26):r==6?vec3(0.36,0.44,0.52):r<=8?vec3(0.62,0.66,0.52):r<=10?vec3(0.22,0.22,0.26):r==11?vec3(0.12,0.1,0.09):vec3(0.3,0.03,0.02);
  vec3 n=normalize(vN); float l=0.3+0.7*max(dot(n,normalize(vec3(0.4,0.6,0.7))),0.0); o=vec4(c*l,1.0); }`
      );
      gl.linkProgram(p);
      gl.useProgram(p);
      const buf = (loc, data, k) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        const l = gl.getAttribLocation(p, loc);
        gl.enableVertexAttribArray(l);
        gl.vertexAttribPointer(l, k, gl.FLOAT, false, 0, 0);
      };
      buf('aP', pos, 3);
      buf('aN', nrm, 3);
      buf('aR', reg, 1);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0.16, 0.17, 0.19, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      views.forEach((v, i) => {
        gl.viewport(i * size, 0, size, size);
        gl.uniformMatrix3fv(gl.getUniformLocation(p, 'uV'), false, v);
        gl.uniform1f(gl.getUniformLocation(p, 'uS'), 30);
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0);
      });
      return cv.toDataURL('image/png');
    },
  };
  return 1;
};

// ---------- surface nets: the grid's surface as quads ----------
function surfaceNets(d, nx, ny, nz, org, res) {
  const at = (i, j, k) => d[(k * ny + j) * nx + i],
    vid = new Int32Array(nx * ny * nz).fill(-1),
    pos = [];
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0,
          sx = 0,
          sy = 0,
          sz = 0,
          cnt = 0;
        const c = [];
        for (let q = 0; q < 8; q++) {
          const v = at(i + (q & 1), j + ((q >> 1) & 1), k + ((q >> 2) & 1));
          c.push(v);
          if (v < 0) mask |= 1 << q;
        }
        if (mask === 0 || mask === 255) continue;
        // where the surface crosses each of the cell's 12 edges
        for (let a = 0; a < 8; a++)
          for (const ax of [1, 2, 4]) {
            const b = a | ax;
            if (b === a || (a & ax) !== 0) continue;
            if (c[a] < 0 === c[b] < 0) continue;
            const t = c[a] / (c[a] - c[b]);
            sx += (a & 1) + ((b & 1) - (a & 1)) * t;
            sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
            sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
            cnt++;
          }
        vid[(k * ny + j) * nx + i] = pos.length / 3;
        pos.push(org[0] + (i + sx / cnt) * res, org[1] + (j + sy / cnt) * res, org[2] + (k + sz / cnt) * res);
      }
  const idx = [],
    V = (i, j, k) => vid[(k * ny + j) * nx + i];
  // a quad round each grid edge the surface crosses, facing out of the shape
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v0 = at(i, j, k) < 0;
        for (const ax of [0, 1, 2]) {
          const [di, dj, dk] = ax === 0 ? [1, 0, 0] : ax === 1 ? [0, 1, 0] : [0, 0, 1];
          if (i + di >= nx || j + dj >= ny || k + dk >= nz) continue;
          const v1 = at(i + di, j + dj, k + dk) < 0;
          if (v0 === v1) continue;
          // the four cells round this edge
          let q;
          if (ax === 0) q = [V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k)];
          else if (ax === 1) q = [V(i - 1, j, k - 1), V(i - 1, j, k), V(i, j, k), V(i, j, k - 1)];
          else q = [V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k)];
          if (q.some(x => x < 0)) continue;
          if (v0) idx.push(q[0], q[1], q[2], q[0], q[2], q[3]);
          else idx.push(q[0], q[2], q[1], q[0], q[3], q[2]);
        }
      }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

// ---------- skinning: each corner's bones and weights, blending across its joints ----------
function weights(pos, part, BONES) {
  const n = part.length,
    b0 = new Uint8Array(n),
    b1 = new Uint8Array(n),
    w0 = new Uint8Array(n),
    kids = BONES.map((_, i) => BONES.map((b, j) => (b[1] === i ? j : -1)).filter(j => j >= 0)),
    ZONE = 2.4; // how far either side of a joint the skin blends between its two bones
  const seg = (p, a, b) => {
    const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      L = Math.hypot(...ba),
      t = ((p[0] - a[0]) * ba[0] + (p[1] - a[1]) * ba[1] + (p[2] - a[2]) * ba[2]) / (L * L);
    return [t * L, L];
  };
  for (let i = 0; i < n; i++) {
    const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]],
      b = part[i],
      [, par, ja, jb] = BONES[b];
    const [s, L] = seg(p, ja, jb);
    let other = b,
      w = 1;
    if (par >= 0 && s < ZONE) {
      other = par;
      w = 0.5 + 0.5 * Math.max(0, Math.min(1, s / ZONE));
    } else if (kids[b].length && s > L - ZONE) {
      // toward the child whose joint is nearest
      let best = -1,
        bd = 1e9;
      for (const c of kids[b]) {
        const j = BONES[c][2],
          dd = Math.hypot(p[0] - j[0], p[1] - j[1], p[2] - j[2]);
        if (dd < bd) {
          bd = dd;
          best = c;
        }
      }
      if (bd < ZONE * 2.2) {
        other = best;
        w = 0.5 + 0.5 * Math.max(0, Math.min(1, (L - s) / ZONE));
      }
    }
    b0[i] = b;
    b1[i] = other;
    w0[i] = Math.round(w * 255);
  }
  return { b0, b1, w0 };
}

const b64f = f => Buffer.from(f.buffer, f.byteOffset, f.byteLength).toString('base64');
const f32 = s => {
  const b = Buffer.from(s, 'base64');
  return new Float32Array(b.buffer, b.byteOffset, b.length / 4);
};

const b = await browser();
const built = [];
try {
  const pg = await b.newPage();
  pg.setDefaultTimeout(600000);
  await pg.goto('about:blank');
  await pg.evaluate(`(${PAGE.toString()})()`);
  for (const [name0, M] of Object.entries(MODELS))
    for (const [li, RES] of LODS.entries()) {
      const t0 = Date.now(),
        name = li ? `${name0}@${li}` : name0;
      const [lo, hi] = M.BOUNDS,
        nx = Math.ceil((hi[0] - lo[0]) / RES) + 1,
        ny = Math.ceil((hi[1] - lo[1]) / RES) + 1,
        nz = Math.ceil((hi[2] - lo[2]) / RES) + 1;
      const d = f32(
        await pg.evaluate(
          ([lib, g, o, r, x, y, z]) => window.MESH.grid(lib, g, o, r, x, y, z),
          [SDF_LIB, M.GLSL, lo, RES, nx, ny, nz]
        )
      );
      const net = surfaceNets(d, nx, ny, nz, lo, RES);
      const [P, N, A] = (
        await pg.evaluate(([lib, g, p]) => window.MESH.attrs(lib, g, p), [SDF_LIB, M.GLSL, b64f(net.pos)])
      ).map(f32);
      const nv = net.pos.length / 3,
        pos = new Float32Array(nv * 3),
        nrm = new Float32Array(nv * 3),
        ao = new Float32Array(nv),
        part = new Uint8Array(nv),
        reg = new Float32Array(nv),
        u = new Float32Array(nv);
      for (let i = 0; i < nv; i++) {
        pos.set([P[i * 4], P[i * 4 + 1], P[i * 4 + 2]], i * 3);
        nrm.set([N[i * 4], N[i * 4 + 1], N[i * 4 + 2]], i * 3);
        ao[i] = N[i * 4 + 3];
        part[i] = A[i * 4];
        reg[i] = A[i * 4 + 1];
        u[i] = A[i * 4 + 2];
      }
      const W = weights(pos, part, M.BONES);
      built.push({ name, M, pos, nrm, ao, reg, u, idx: net.idx, W });
      console.log(
        `${name}: ${nv} corners, ${net.idx.length / 3} triangles, ${((Date.now() - t0) / 1000).toFixed(1)} s`
      );
      // previews: front, its right side, from above, three-quarters from above
      const c = Math.cos,
        s = Math.sin;
      const view = (yaw, pitch) => {
        // camera looking along its -z; world x forward, z up. Columns of uV map world to view
        const cy = c(yaw),
          sy = s(yaw),
          cp = c(pitch),
          sp = s(pitch);
        // view x = right on screen, y = up on screen, z = toward the viewer
        const R = [
          [-sy, cy, 0],
          [-cy * sp, -sy * sp, cp],
          [cy * cp, sy * cp, sp],
        ];
        return [R[0][0], R[1][0], R[2][0], R[0][1], R[1][1], R[2][1], R[0][2], R[1][2], R[2][2]];
      };
      const png = await pg.evaluate(
        ([p, n, r, i, v]) => window.MESH.preview(p, n, r, i, v, 400),
        [
          b64f(pos),
          b64f(nrm),
          b64f(reg),
          b64f(new Float32Array(net.idx.buffer)),
          [view(0, 0.1), view(Math.PI / 2, 0.1), view(Math.PI, 0.1), view(0, 1.5), view(0.7, 0.7)],
        ]
      );
      writeFileSync(join(OUT, name + '.png'), Buffer.from(png.split(',')[1], 'base64'));
    }
} finally {
  await b.close();
}

if (!process.argv.includes('--preview-only')) {
  // the file: a JSON header (each model's bones and where its corners and triangles are), then the data
  // each corner, 16 bytes: position (3 × int16, /256), normal (2 × int8, octahedral), bones (2 × uint8), the first's
  // weight, region, along (u), crease (ao), spare
  const parts = [],
    head = { v: 1, models: {} };
  let off = 0;
  for (const m of built) {
    const nv = m.pos.length / 3,
      vb = Buffer.alloc(nv * 16);
    for (let i = 0; i < nv; i++) {
      for (let k = 0; k < 3; k++) vb.writeInt16LE(Math.round(m.pos[i * 3 + k] * 256), i * 16 + k * 2);
      let [x, y, z] = [m.nrm[i * 3], m.nrm[i * 3 + 1], m.nrm[i * 3 + 2]];
      const l = Math.abs(x) + Math.abs(y) + Math.abs(z);
      x /= l;
      y /= l;
      if (z < 0) [x, y] = [(1 - Math.abs(y)) * Math.sign(x || 1), (1 - Math.abs(x)) * Math.sign(y || 1)];
      vb.writeInt8(Math.round(x * 127), i * 16 + 6);
      vb.writeInt8(Math.round(y * 127), i * 16 + 7);
      vb.writeUInt8(m.W.b0[i], i * 16 + 8);
      vb.writeUInt8(m.W.b1[i], i * 16 + 9);
      vb.writeUInt8(m.W.w0[i], i * 16 + 10);
      vb.writeUInt8(Math.round(m.reg[i]), i * 16 + 11);
      vb.writeUInt8(Math.round(Math.max(0, Math.min(1, m.u[i])) * 255), i * 16 + 12);
      vb.writeUInt8(Math.round(Math.max(0, Math.min(1, m.ao[i])) * 255), i * 16 + 13);
    }
    const ib = Buffer.from(new Uint16Array(m.idx).buffer);
    if (nv > 65535) throw new Error(m.name + ': too many corners for 16-bit indices');
    head.models[m.name] = {
      bones: m.M.BONES,
      nv,
      ni: m.idx.length,
      vo: off,
      io: off + vb.length,
    };
    parts.push(vb, ib);
    off += vb.length + ib.length;
    if (off % 4) {
      parts.push(Buffer.alloc(4 - (off % 4)));
      off += 4 - (off % 4);
    }
  }
  const hj = Buffer.from(JSON.stringify(head)),
    hl = Buffer.alloc(4);
  let pad = (4 - ((4 + hj.length) % 4)) % 4;
  hl.writeUInt32LE(hj.length + pad);
  const file = Buffer.concat([hl, hj, Buffer.from(' '.repeat(pad)), ...parts]),
    hash = createHash('sha256').update(file).digest('hex').slice(0, 8),
    name = `mesh.${hash}.bin`;
  for (const f of readdirSync(join(ROOT, 'assets')))
    if (/^mesh\.[0-9a-f]{8}\.bin$/.test(f)) rmSync(join(ROOT, 'assets', f));
  writeFileSync(join(ROOT, 'assets', name), file);
  const pk = JSON.parse(readFileSync(join(ROOT, 'assets/pack.json'), 'utf8'));
  pk.mesh = { file: name };
  writeFileSync(join(ROOT, 'assets/pack.json'), JSON.stringify(pk));
  console.log('wrote assets/' + name, file.length, 'bytes');
}
