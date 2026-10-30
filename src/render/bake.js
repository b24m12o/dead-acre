/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { $ } from '../core/errors.js';
import { gl, progFinish, program } from './gl.js';
import { AS, regionScale } from './atlas.js';
import { PACK } from '../core/assets.js';
export const FS_VS = `#version 300 es
out vec2 vUv; void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv=p; gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;
/* ---------- the 3D bake: body parts are modelled as signed-distance shapes and photographed straight down on the graphics card at load.
   Each part keeps its old name and size, so the drawing code never knows; if the card can't do it, the painted version is used. ---------- */
const BAKE_LIB = `
float sdSph(vec3 p, vec3 c, float r){ return length(p-c)-r; }
float sdEll(vec3 p, vec3 c, vec3 r){ p-=c; float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.0)/max(k1,1e-5); }
float sdCap(vec3 p, vec3 a, vec3 b, float ra, float rb){ vec3 pa=p-a, ba=b-a; float t=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*t)-mix(ra,rb,t); }
float sdBox(vec3 p, vec3 c, vec3 b, float r){ vec3 q=abs(p-c)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r; }
float smin(float a, float b, float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }
float smax(float a, float b, float k){ return -smin(-a,-b,k); }
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=0.5; } return s; }
vec3 hx(int c){ return vec3(float((c>>16)&255),float((c>>8)&255),float(c&255))/255.0; }
`;
const BAKE_FS = group => `#version 300 es
precision highp float; precision highp int;
uniform vec3 uBox; uniform vec2 uRes; uniform int uPart; uniform float uSeed; uniform int uSS; uniform int uSteps; uniform float uObl;
layout(location=0) out vec4 oC; layout(location=1) out vec4 oH;
${BAKE_LIB}
${group}
vec3 nrm(vec3 p){ vec3 n=vec3(0.0); for(int i=min(uSS,0);i<4;i++){ vec3 e=0.5773*(2.0*vec3(float(((i+3)>>1)&1),float((i>>1)&1),float(i&1))-1.0); n+=e*map(p+e*0.0606); } return normalize(n); } // looped, not written out four times: keeps map() from being copied into the shader again and again, which is what makes some drivers take seconds to build it
float occl(vec3 p, vec3 n){ float o=0.0, s=1.0; for(int i=1+min(uSS,0);i<=5;i++){ float h=0.32*float(i); o+=(h-map(p+n*h))*s; s*=0.62; } return clamp(1.0-o*0.6,0.0,1.0); }
void main(){
  vec3 acc=vec3(0.0); float cov=0.0, hz=0.0;
  for(int s=0; s<uSS; s++){ int sx=s-(s/3)*3, sy=s/3; // loop bounds come from uniforms so no compiler tries to unroll the march nine times
    vec2 px=(gl_FragCoord.xy-0.5+(vec2(float(sx),float(sy))+0.5)/3.0)/uRes;
    vec2 q=vec2((px.x-0.5)*uBox.x,(0.5-px.y)*uBox.y);
    float z=uBox.z; bool hit=false; vec3 p=vec3(q,z);
    for(int i=0;i<uSteps;i++){ p=uObl>0.5?vec3(q.x,q.y+z-uBox.z*0.5,z):vec3(q,z); float d=map(p); if(d<0.003){ hit=true; break; } z-=max(d*(uObl>0.5?0.6:0.85),0.006); if(z<-uBox.z) break; }
    if(!hit) continue;
    /* angled parts (uObl) are seen the way the game draws height: each unit up the object is one unit up the picture, so their fronts show */
    vec3 n=nrm(p); float o=occl(p,n);
    vec3 c=alb(p,n); float sh=(0.46+0.54*pow(max(n.z,0.0),1.2))*mix(1.0,o,0.75); // gentle: the game's own lights shade these surfaces again
    acc+=c*sh; cov+=1.0; hz+=z;
  }
  if(cov<0.5){ oC=vec4(0.0); oH=vec4(0.0); return; }
  float a=cov/9.0; float h=clamp(((hz/cov)+uBox.z)/(2.0*uBox.z),0.0,1.0)*a, h8=h*255.0;
  oC=vec4(clamp(acc/cov,0.0,1.0),a); oH=vec4(floor(h8)/255.0,fract(h8),0.0,1.0);
}`;
export let BAKE;
export function bakeGroup(name, glsl) {
  BAKE.groups[name] = glsl;
}
export function bakePart(name, group, id, zTop, seed = 0, ne = false, obl = false) {
  BAKE.parts[name] = { group, id, zTop, seed, ne, obl };
} // ne: drop the painted version's glow layer, which would not line up with the 3D shape; obl: seen at the game's angle (fronts show), not straight down
export function bakeRun(name, W, H, w, h) {
  // renders one part, returns straight-alpha pixels top row first and a height field, or null
  const P = BAKE.parts[name];
  if (!P || !BAKE.ok || BAKE.bad[P.group]) return null;
  const t0 = performance.now();
  const pre = BAKE.pre[name];
  if (pre && pre.W === W && pre.H === H) return pre; // loaded from the shipped pictures (or built live) during the loading screen
  if (pre && pre.cv) {
    const hz = new Float32Array(W * H),
      sw = pre.W,
      sh = pre.H;
    for (let j = 0; j < H; j++) {
      const y = Math.min(sh - 1, Math.max(0, ((j + 0.5) * sh) / H - 0.5)),
        y0 = Math.floor(y),
        y1 = Math.min(sh - 1, y0 + 1),
        fy = y - y0;
      for (let i = 0; i < W; i++) {
        const x = Math.min(sw - 1, Math.max(0, ((i + 0.5) * sw) / W - 0.5)),
          x0 = Math.floor(x),
          x1 = Math.min(sw - 1, x0 + 1),
          fx = x - x0;
        hz[j * W + i] =
          (pre.hz[y0 * sw + x0] * (1 - fx) + pre.hz[y0 * sw + x1] * fx) * (1 - fy) +
          (pre.hz[y1 * sw + x0] * (1 - fx) + pre.hz[y1 * sw + x1] * fx) * fy;
      }
    }
    return { cv: pre.cv, sx: pre.sx, sy: pre.sy, sw: pre.sw, sh: pre.sh, W, H, hz };
  } // a machine with a smaller texture limit gets the same pictures, scaled: never a live 3D bake, which is what upset weaker graphics chips
  if (!window.__liveBake) return null; // no shipped picture for this part: its painted version stands in
  try {
    let pr = BAKE.progs[P.group];
    if (!pr) {
      const c0 = performance.now();
      pr = BAKE.progs[P.group] = program(FS_VS, BAKE_FS(BAKE.groups[P.group]));
      BAKE.cms += performance.now() - c0;
    }
    if (!BAKE.fb) {
      BAKE.fb = gl.createFramebuffer();
      BAKE.tc = gl.createTexture();
      BAKE.th = gl.createTexture();
      BAKE.sz = [0, 0];
    }
    if (BAKE.sz[0] < W || BAKE.sz[1] < H) {
      const sw = Math.max(W, 256),
        sh = Math.max(H, 256);
      for (const t of [BAKE.tc, BAKE.th]) {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, sw, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      }
      BAKE.sz = [sw, sh];
      gl.bindFramebuffer(gl.FRAMEBUFFER, BAKE.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, BAKE.tc, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, BAKE.th, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, BAKE.fb);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(pr.p);
    gl.uniform1i(pr.u.uSS, 9);
    gl.uniform1i(pr.u.uSteps, P.obl ? 200 : 120);
    if (pr.u.uObl) gl.uniform1f(pr.u.uObl, P.obl ? 1 : 0);
    gl.uniform3f(pr.u.uBox, w, h, P.zTop);
    gl.uniform2f(pr.u.uRes, W, H);
    gl.uniform1i(pr.u.uPart, P.id);
    gl.uniform1f(pr.u.uSeed, P.seed);
    gl.bindVertexArray(null);
    gl.enable(gl.SCISSOR_TEST);
    for (let ty = 0; ty < H; ty += 64)
      for (let tx = 0; tx < W; tx += 64) {
        gl.scissor(tx, ty, Math.min(64, W - tx), Math.min(64, H - ty));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.flush();
      }
    gl.disable(gl.SCISSOR_TEST); // small tiles, each sent on its own, so no single draw is long enough to upset a weak graphics chip
    const c = new Uint8Array(W * H * 4),
      hh = new Uint8Array(W * H * 4);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, hh);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const img = new ImageData(W, H),
      hz = new Float32Array(W * H);
    for (let j = 0; j < H; j++) {
      const sj = H - 1 - j;
      img.data.set(c.subarray(sj * W * 4, (sj + 1) * W * 4), j * W * 4);
      for (let i = 0; i < W; i++) {
        const o = (sj * W + i) * 4;
        hz[j * W + i] = (hh[o] + hh[o + 1] / 255) / 255;
      }
    }
    BAKE.ms += performance.now() - t0;
    BAKE.n++;
    return { img, hz, W, H };
  } catch (err) {
    console.warn('3D bake failed for ' + P.group + ', using its painted parts', err);
    BAKE.bad[P.group] = true;
    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } catch (e2) {}
    return null;
  } // one broken group falls back alone
}
// the street props drawn from 3D pictures: [width, height, how tall the object stands]. Seen at the game's
// angle, a picture is the footprint plus that height tall; the ones that sit at any angle get one per heading
const OS = {
  o_hydrant: [22, 27, 13],
  o_bin: [18, 32, 16],
  o_drum: [29, 44, 16],
  o_burn: [30, 48, 18],
  o_mailbox: [16, 32, 19],
  o_news: [14, 28, 17],
  o_bench: [40, 28, 14],
  o_cone: [14, 26, 12],
  o_tyre: [19, 25, 5],
  o_dump: [46, 46, 20],
  o_cart: [32, 46, 14],
  o_coffin: [38, 46, 8],
  o_tl: [56, 80, 66, 23], // the picture's centre is out along the arm: that far from the mast
  o_shelter: [90, 70, 36],
  o_gen: [52, 54, 24],
  o_chim: [12, 24, 14],
  o_vent: [10, 14, 5],
  o_dish: [16, 22, 10],
  o_ac: [22, 26, 10],
  // seen straight down, for the shadows: [width, depth, height]
  o_hydrant_t: [22, 22, 13],
  o_bin_t: [18, 18, 16],
  o_drum_t: [29, 29, 16],
  o_burn_t: [30, 30, 18],
  o_mailbox_t: [16, 14, 19],
  o_news_t: [14, 12, 17],
  o_bench_t: [40, 12, 14],
  o_cone_t: [14, 14, 12],
  o_tyre_t: [19, 19, 5],
  o_dump_t: [46, 30, 20],
  o_cart_t: [32, 18, 14],
  o_coffin_t: [38, 18, 8],
  o_gen_t: [52, 36, 24],
};
// roof pieces (shapes/roofs.js): rf_f / rf_b the front and back slope of a roof whose ridge runs across, for houses
// 4-6 tiles deep (piece 0 middle, 1 left end, 2 right end); rf_s a row of a roof whose ridge runs up the screen, for
// houses 4-5 tiles wide (0 middle, 1 the front end with its gable, 2 the back end). [width, height, roof height]
export const RF_SIZES = (() => {
  const o = {};
  for (let n = 4; n <= 6; n++) {
    const D = n * 40 + 16,
      r = D * 0.12;
    for (let i = 0; i < 3; i++) {
      o['rf_f' + n + '_' + i] = [i ? 48 : 44, Math.ceil(D / 2 + r + 12), r + 3];
      o['rf_b' + n + '_' + i] = [i ? 48 : 44, Math.ceil(D / 2 - r + 16), r + 3];
    }
  }
  for (let n = 4; n <= 5; n++) {
    const D = n * 40 + 12,
      r = D * 0.12;
    for (let i = 0; i < 3; i++) o['rf_s' + n + '_' + i] = [D + 4, Math.ceil((i ? 50 : 44) + r + 14), r + 3];
  }
  for (const m of [0, 1, 2, 4, 8, 5, 9, 6, 10]) {
    o['rf_t' + m] = [44, 53, 5]; // a flat shop roof tile; m: which edges carry the parapet (1 N, 2 S, 4 W, 8 E)
    o['rf_c' + m] = [44, 53, 5]; // a crypt's stone roof
  }
  return o;
})();
// wall blocks (shapes/roofs.js), in id order: brick 28 tall (plain twice, a lit window, a dark one, boarded, a
// poster, cracked), brick 21 and 14 tall (ruined, twice each), concrete 30 tall (plain, a shop window); stone 28 (twice)
// and 21 (ruined), jersey barriers (whole, chipped), the hoardings round the edge of town (plain, two with graffiti)
export const WB_SIZES = Object.fromEntries(
  [
    ['b28a', 28],
    ['b28b', 28],
    ['b28win', 28],
    ['b28dark', 28],
    ['b28board', 28],
    ['b28post', 28],
    ['b28crack', 28],
    ['b21a', 21],
    ['b21b', 21],
    ['b14a', 14],
    ['b14b', 14],
    ['c30', 30],
    ['c30win', 30],
    ['s28a', 28],
    ['s28b', 28],
    ['s21', 21],
    ['r16a', 16],
    ['r16b', 16],
    ['h34a', 34],
    ['h34b', 34],
    ['h34c', 34],
  ].map(([n, z]) => ['wb_' + n, [44, 42 + z + 6, z]])
);
export const O_TURNS = { o_dump: 2, o_cart: 8, o_coffin: 8, o_tl: 2, o_dish: 4 };
export const O_SIZES = Object.fromEntries(
  Object.entries(OS).flatMap(([n, v]) => (O_TURNS[n] ? [...Array(O_TURNS[n]).keys()].map(i => [n + i, v]) : [[n, v]]))
);
let BAKE_SIZES; // every baked part's size, so all of them can be built during the loading screen (a part whose size changes is simply built when the atlas reaches it)
// the 3D characters, built once from the shapes above and shipped as pictures, so every machine shows exactly the same thing without doing any 3D work itself
function bakeKey() {
  let h = 2166136261;
  const src =
    BAKE_LIB + BAKE_FS('') + JSON.stringify(BAKE.groups) + JSON.stringify(BAKE.parts) + JSON.stringify(BAKE_SIZES) + AS;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'bake3d-' + (h >>> 0).toString(36) + '-' + src.length;
} // changes whenever any shape or colour does, so a stale copy is never used
export async function bakePrep() {
  // the 3D characters ship as two pictures (PACK.bake, see core/assets.js); loading them is the same quick step on every machine, with no 3D work on the player's graphics card
  const D = (BAKE.diag = { on: false, why: '', ms: 0, n: 0 }),
    T0 = performance.now(),
    nap = () => new Promise(r => setTimeout(r, 0));
  try {
    indexedDB.deleteDatabase('dead-acre');
  } catch (e) {} // the browser copy kept by version 86 is no longer needed
  const names = Object.keys(BAKE_SIZES).filter(n => BAKE.parts[n]);
  if (window.__liveBake === true) return bakeLive(names, D, T0, nap); // only for rebuilding the pictures after a shape changes
  if (!PACK.bake) {
    D.why = 'no character pictures in this build';
    return;
  }
  if (Object.values(BAKE.groups).some(Boolean) && PACK.bake.key !== bakeKey()) {
    D.stale = true;
    console.warn('Dead Acre: the shipped character pictures are older than the shapes (rebuild them)');
  }
  const pic = async src => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.src = src;
    await im.decode();
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0);
    return { c, x };
  };
  let A, Hm;
  try {
    [A, Hm] = await Promise.all([pic(PACK.bake.a), pic(PACK.bake.h)]);
  } catch (err) {
    D.why = 'this browser could not open the character pictures';
    console.warn('Dead Acre:', err);
    return;
  }
  for (const n of names) {
    const q = PACK.bake.pos[n];
    if (!q) continue;
    const [sx, sy, sw, sh] = q,
      W = q[4] || sw,
      H = q[5] || sh,
      hs = PACK.bake.hs || 1,
      hx0 = Math.floor(sx * hs),
      hy0 = Math.floor(sy * hs),
      hw = Math.max(2, Math.round(sw * hs)),
      hh = Math.max(2, Math.round(sh * hs)),
      src = Hm.x.getImageData(hx0, hy0, hw, hh).data,
      raw = new Float32Array(W * H),
      hz = new Float32Array(W * H); // a part stored smaller (and its heights at lower resolution still) is scaled back up here
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const fx = Math.min(hw - 1.001, Math.max(0, ((i + 0.5) * hw) / W - 0.5)),
          fy = Math.min(hh - 1.001, Math.max(0, ((j + 0.5) * hh) / H - 0.5)),
          x0 = fx | 0,
          y0 = fy | 0,
          ax = fx - x0,
          ay = fy - y0,
          at = (x, y) => src[(y * hw + x) * 4] / 255;
        raw[j * W + i] =
          (at(x0, y0) * (1 - ax) + at(x0 + 1, y0) * ax) * (1 - ay) +
          (at(x0, y0 + 1) * (1 - ax) + at(x0 + 1, y0 + 1) * ax) * ay;
      }
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        let t = 0,
          k = 0;
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            const u = i + di,
              v = j + dj;
            if (u < 0 || v < 0 || u >= W || v >= H) continue;
            const wt = (di ? 1 : 2) * (dj ? 1 : 2);
            t += raw[v * W + u] * wt;
            k += wt;
          }
        hz[j * W + i] = t / k;
      } // a light blur hides the 8-bit steps in the stored heights
    BAKE.pre[n] = { cv: A.c, sx, sy, sw, sh, W, H, hz };
  }
  if (window.__liveBake === 'new')
    await bakeLive(
      names.filter(n => !BAKE.pre[n]),
      D,
      T0,
      nap
    ); // developer option: build only the parts the shipped pictures do not have
  D.n = Object.keys(BAKE.pre).length;
  D.ms = performance.now() - T0;
  D.on = D.n > 0;
  if (!D.on) D.why = 'no character pictures found';
}
async function bakeLive(names, D, T0, nap) {
  // builds the parts on this machine's graphics card: the tool that makes the shipped pictures (tools/bake), never used in normal play
  const ld = $('ldStat'),
    ext = gl.getExtension('KHR_parallel_shader_compile'),
    pend = [];
  for (const g in BAKE.groups) {
    try {
      const p = gl.createProgram(),
        vs = gl.createShader(gl.VERTEX_SHADER),
        fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(vs, FS_VS);
      gl.shaderSource(fs, BAKE_FS(BAKE.groups[g]));
      gl.compileShader(vs);
      gl.compileShader(fs);
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      pend.push({ g, p, fs });
    } catch (err) {
      BAKE.bad[g] = true;
    }
  }
  if (ext) {
    const lim = performance.now() + 30000;
    while (performance.now() < lim && pend.some(x => !gl.getProgramParameter(x.p, ext.COMPLETION_STATUS_KHR)))
      await new Promise(r => setTimeout(r, 30));
  }
  for (const x of pend) {
    if (gl.getProgramParameter(x.p, gl.LINK_STATUS)) BAKE.progs[x.g] = progFinish(x.p);
    else {
      BAKE.bad[x.g] = true;
      console.warn('Dead Acre: 3D shader ' + x.g + ' failed', gl.getShaderInfoLog(x.fs) || gl.getProgramInfoLog(x.p));
    }
  }
  let i = 0;
  for (const n of names) {
    const [w, h] = BAKE_SIZES[n],
      r = bakeRun(n, Math.ceil(w * regionScale(n)), Math.ceil(h * regionScale(n)), w, h);
    if (r) BAKE.pre[n] = r;
    i++;
    if (ld) ld.textContent = 'Raising the dead… ' + Math.floor((i / names.length) * 100) + '%';
    await nap();
  }
  D.n = Object.keys(BAKE.pre).length;
  D.ms = performance.now() - T0;
  D.on = D.n > 0;
  D.key = bakeKey();
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  BAKE = {
    groups: {},
    parts: {},
    ok: !!gl,
    progs: {},
    fb: null,
    ms: 0,
    n: 0,
    cms: 0,
    bad: {},
    diag: { on: false, why: '' },
    pre: {},
  };
  BAKE_SIZES = {
    hb0: [42, 50],
    hb1: [42, 50],
    hb2: [42, 50],
    hh0: [28, 28],
    hh1: [28, 28],
    hh2: [28, 28],
    h_glove: [12, 12],
    h_glove2: [12, 12],
    h_hand: [12, 12],
    h_foot: [17, 12],
    h_pack: [30, 34],
    z_torso0: [38, 42],
    z_torso1: [38, 42],
    z_torso2: [38, 42],
    z_torso3: [38, 42],
    z_torso4: [38, 42],
    z_torso5: [38, 42],
    z_torso6: [38, 42],
    z_torso7: [38, 42],
    z_torso8: [38, 42],
    z_torso9: [38, 42],
    z_torso10: [38, 42],
    z_torso11: [38, 42],
    z_torso12: [38, 42],
    z_torso13: [38, 42],
    z_torso14: [38, 42],
    z_torso15: [38, 42],
    z_torso16: [38, 42],
    z_torso17: [38, 42],
    z_torso18: [38, 42],
    z_torso_spit: [38, 42],
    z_head0: [24, 24],
    z_head1: [24, 24],
    z_head2: [24, 24],
    z_head3: [26, 26],
    z_head4: [26, 26],
    z_head5: [30, 30],
    z_head6: [26, 26],
    z_head7: [26, 26],
    z_head8: [26, 26],
    z_head9: [24, 24],
    z_head10: [28, 28],
    z_head11: [26, 26],
    z_head12: [24, 24],
    z_head13: [24, 24],
    z_head14: [26, 26],
    z_head15: [26, 26],
    z_head16: [26, 26],
    z_head17: [26, 26],
    z_head_spit: [24, 24],
    z_hand: [11, 10],
    z_foot: [13, 9],
    z_scream: [46, 46],
    z_shead: [28, 28],
    z_bhead: [28, 28],
    z_brute: [82, 92],
    z_bloat: [64, 64],
    h_upper: [20, 10],
    h_fore: [20, 9],
    h_elbow: [10, 10],
    z_upper: [20, 10],
    z_fore: [20, 9],
    z_elbow: [10, 10],
    z_hound: [54, 28],
    z_hhead: [24, 18],
    z_ly0: [52, 44],
    z_ly1: [52, 44],
    z_ly2: [52, 44],
    z_ly3: [52, 44],
    z_ly4: [52, 44],
    z_ly5: [52, 44],
    z_ly6: [52, 44],
    z_ly7: [52, 44],
    z_ly8: [52, 44],
    z_ly9: [52, 44],
    z_ly10: [52, 44],
    z_ly11: [52, 44],
    z_ly12: [52, 44],
    z_ly13: [52, 44],
    z_ly14: [52, 44],
    z_ly15: [52, 44],
    z_ly16: [52, 44],
    z_ly17: [52, 44],
    z_ly18: [52, 44],
    z_ly19: [88.39999999999999, 74.8],
    z_ly20: [52, 44],
    z_ly21: [52, 44],
    z_lhip: [30, 30],
    z_lleg: [50, 16],
    rk_torso: [96, 150],
    gk_torso: [108, 124],
    cf_torso: [104, 140],
    pz_torso: [96, 146],
    rk_head: [46, 46],
    gk_head: [50, 50],
    pz_head: [46, 46],
    cf_head: [52, 52],
    ab_body: [190, 156],
    ab_head: [86, 76],
    ab_limb: [40, 14],
    ab_seg: [42, 38],
    medkit: [26, 26],
    ammo: [26, 20],
    ammo_light: [28, 22],
    ammo_shells: [30, 24],
    ammo_rifle: [34, 24],
    ammo_heavy: [28, 22],
    ammo_gren: [34, 26],
    crate: [34, 34],
    wcase: [64, 26],
  };
  BAKE_SIZES.heli = [272, 112];
  Object.assign(BAKE_SIZES, O_SIZES, RF_SIZES, WB_SIZES);
  BAKE_SIZES.car = [84, 46];
  BAKE_SIZES.police = [84, 46];
  BAKE_SIZES.truck = [124, 52];
  BAKE_SIZES.carburn = [84, 46];
  BAKE_SIZES.tanker = [124, 52];
  BAKE_SIZES.fuelvan = [84, 46];
  for (let v = 0; v <= 18; v++) BAKE_SIZES['z_lu' + v] = BAKE_SIZES['z_ly' + v];
  BAKE_SIZES.z_lhipu = BAKE_SIZES.z_lhip;
  for (let v = 0; v <= 17; v++) BAKE_SIZES['z_headu' + v] = [28, 28]; // the bodies lying face up
}
