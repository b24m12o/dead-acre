/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The figures drawn as 3D meshes. Each model (tools/mesh/build.mjs makes them from their shapes, into
// assets/mesh.*.bin) is a skinned mesh: every corner rides one or two bones of its skeleton. Each frame every figure
// on screen gets its skeleton posed from what it is doing (pose functions, below), written as one row of a float
// texture, and runs of figures are drawn together, many in one call, into the same colour, glow and normal buffers as
// the pictures, so the street's lights light them like everything else; and into the moon's, the lamps' and your
// flashlight's shadows. Settings: 3D models (opt.b3d) switches them; off, or until the meshes arrive, the pictures draw.
import { GS } from '../core/gs.js';
import { opt } from '../core/settings.js';
import { angDiff, clamp, lerp } from '../core/util.js';
import { gl, progFinish } from './gl.js';
import { SUNV, flush, lampNow, viewH, viewW, culling } from './sprites.js';

const NB = 14, // bones in a figure's skeleton (tools/mesh/zombie.mjs)
  TW = NB * 3 + 8, // texels in a figure's row: three for each bone's matrix, then its looks
  ROWS = 1024;
export const FIG = { models: null, n: 0, drawn: 0, calls: 0 };

// ---------- the meshes ----------
// from assets/mesh.*.bin: a JSON header, then each model's corners (16 bytes each) and triangles
export function meshArrived(buf) {
  try {
    const dv = new DataView(buf),
      hl = dv.getUint32(0, true),
      head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl))),
      base = 4 + hl,
      M = {};
    for (const [name, m] of Object.entries(head.models)) {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(buf, base + m.vo, m.nv * 16), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.SHORT, false, 16, 0); // where it is (/256)
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.BYTE, true, 16, 6); // its normal, folded flat
      gl.enableVertexAttribArray(2);
      gl.vertexAttribIPointer(2, 2, gl.UNSIGNED_BYTE, 16, 8); // its two bones
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, 16, 10); // the first bone's weight, what it is, how far along, crease
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(buf, base + m.io, m.ni), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, rowBuf());
      gl.enableVertexAttribArray(4);
      gl.vertexAttribDivisor(4, 1);
      gl.bindVertexArray(null);
      M[name] = { vao, ni: m.ni, bones: m.bones };
    }
    FIG.models = M;
    REST = M.zombie.bones.map(b => b[2]);
  } catch (err) {
    console.warn('Dead Acre: the 3D figures could not be read, so the pictures stand in', err);
  }
}
let RB = null;
const rowBuf = () => {
  if (!RB) {
    RB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, RB);
    gl.bufferData(gl.ARRAY_BUFFER, ROWS * 4, gl.DYNAMIC_DRAW);
  }
  return RB;
};

// ---------- the shaders: the body (three targets) and its shadow (one) ----------
const VS = shadow => `#version 300 es
precision highp float; precision highp int;
layout(location=0) in vec3 aP; layout(location=1) in vec2 aN; layout(location=2) in uvec2 aB; layout(location=3) in vec4 aW; layout(location=4) in float aRow;
uniform highp sampler2D uBones; uniform vec4 uCam; uniform int uMode; uniform vec2 uSun; uniform vec4 uLight;
out vec3 vC; out vec3 vN; out vec3 vO; out float vAO; out float vZ; out float vS; flat out vec4 vK; flat out float vPat;
vec4 T(int x, int r){ return texelFetch(uBones,ivec2(x,r),0); }
vec3 oct(vec2 e){ vec3 v=vec3(e,1.0-abs(e.x)-abs(e.y)); if(v.z<0.0) v.xy=(1.0-abs(v.yx))*vec2(v.x>=0.0?1.0:-1.0,v.y>=0.0?1.0:-1.0); return normalize(v); }
void main(){
  int r=int(aRow+0.5);
  vec3 p=aP/256.0, n=oct(aN);
  int b0=int(aB.x)*3, b1=int(aB.y)*3;
  vec4 a0=T(b0,r), a1=T(b0+1,r), a2=T(b0+2,r), c0=T(b1,r), c1=T(b1+1,r), c2=T(b1+2,r);
  vec3 w0=vec3(dot(a0.xyz,p)+a0.w,dot(a1.xyz,p)+a1.w,dot(a2.xyz,p)+a2.w), w1=vec3(dot(c0.xyz,p)+c0.w,dot(c1.xyz,p)+c1.w,dot(c2.xyz,p)+c2.w);
  vec3 n0=vec3(dot(a0.xyz,n),dot(a1.xyz,n),dot(a2.xyz,n)), n1=vec3(dot(c0.xyz,n),dot(c1.xyz,n),dot(c2.xyz,n));
  float w=aW.x; vec3 W=mix(w1,w0,w); vN=normalize(mix(n1,n0,w)); vO=p; vZ=W.z; vAO=aW.w;
  vec4 E=T(${NB * 3},r); // its eye (x, y), how solid it is, the flare of a hit
  vK=vec4(E.z,E.w,T(${NB * 3 + 7},r).w,T(${NB * 3 + 6},r).w);
  vec2 g;
  if(uMode==0){ g=E.xy+(W.xy-E.xy)*760.0/(760.0-min(W.z,600.0)); } // seen from a camera high over it
  else if(uMode==1){ g=W.xy+uSun*max(W.z,0.0); } // the moon's shadow
  else { vec2 d=W.xy-uLight.xy; float l=max(length(d),1.0); // a lamp's (uMode 2) or your flashlight's (3), thrown away from it
    float off=uMode==2?min(uLight.w,max(W.z,0.0)*l/max(34.0,uLight.z-W.z)):max(W.z,0.0)*(0.55+l/150.0);
    g=W.xy+d/l*off; }
  vec2 s=(g-uCam.xy)/uCam.zw;
  gl_Position=vec4(s.x*2.0-1.0,1.0-s.y*2.0,clamp(0.5-W.z/160.0,-1.0,1.0),1.0);
  ${
    shadow
      ? 'vC=vec3(0.0); vS=0.0; vPat=0.0;'
      : `// its colour: what this corner is (region), in this figure's own skin, shirt, trousers, hair and shoes
  int reg=int(aW.y*255.0+0.5); float u=aW.z;
  vec4 SK=T(${NB * 3 + 1},r), SH=T(${NB * 3 + 2},r), PA=T(${NB * 3 + 3},r), HA=T(${NB * 3 + 4},r), TI=T(${NB * 3 + 5},r);
  vec3 c=SK.rgb; float shirt=0.0;
  if(reg==1) c=SK.w>0.5?HA.rgb:SK.rgb*0.92;
  else if(reg==3||reg==4) shirt=SH.w>-0.5?1.0:0.0;
  else if(reg==6) shirt=SH.w>0.5&&(SH.w>1.5||u<0.62)?1.0:0.0;
  else if(reg==7) shirt=SH.w>1.5&&u<0.92?1.0:0.0;
  if(shirt>0.5) c=SH.rgb;
  else if(reg==5||reg==9) c=PA.rgb;
  else if(reg==10) c=u<PA.w?PA.rgb:SK.rgb;
  else if(reg==11) c=HA.w>0.5?SK.rgb*0.8:vec3(0.13,0.11,0.1);
  else if(reg==12) c=vec3(0.74,0.72,0.62);
  else if(reg==13) c=vec3(0.22,0.05,0.05);
  vC=c*TI.rgb; vS=shirt; vPat=TI.w;`
  }
}`;
const NOISE = `
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<3;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=0.5; } return s*1.15; }`;
const FS = shadow => `#version 300 es
precision highp float; precision highp int;
uniform float uShA;
in vec3 vC; in vec3 vN; in vec3 vO; in float vAO; in float vZ; in float vS; flat in vec4 vK; flat in float vPat;
${shadow ? 'layout(location=0) out vec4 o0;' : 'layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;'}
${shadow ? '' : NOISE}
void main(){
  float a=vK.x;
  ${
    shadow
      ? 'o0=vec4(uShA*a);'
      : `vec3 n=normalize(vN); float nz=max(n.z,0.0), seed=vK.z*61.0;
  vec3 c=vC;
  // the shirt's pattern, on the body as it was cut: plaid, stripes, an open jacket or vest over it, or plain
  int pat=int(vPat+0.5);
  if(vS>0.01){ vec3 o=vO; float m=0.0;
    if(pat==1){ float a=step(fract(o.y*0.21),0.34), b=step(fract(o.z*0.21+0.1),0.34); m=a*0.55+b*0.45-a*b*0.25; c=mix(c,c*0.45,m*vS); c=mix(c,c*1.25+0.05,step(fract(o.y*0.21+0.5),0.06)*vS*0.6); }
    else if(pat==2){ m=step(fract(o.z*0.3),0.42); c=mix(c,c*0.55,m*vS); }
    else if(pat==3){ float open=step(3.0,o.x)*step(abs(o.y),2.6+max(0.0,30.0-o.z)*0.12)*step(24.0,o.z); c=mix(c,mix(c*0.42,vec3(0.62,0.6,0.55),open),vS); } // a dark jacket hanging open on a pale shirt
    else if(pat==4){ float vest=step(abs(o.y),9.0)*step(26.0,o.z)*step(abs(o.y),7.0+step(0.0,-o.x)*3.0); c=mix(c,mix(c,vec3(0.7,0.68,0.6),vest),vS); } // a vest's pale body, the arms its sleeves
  }
  c*=0.8+0.34*fbm(vO.yz*0.42+vO.x*0.3+seed); // dirt, wear, the cloth's weave and the skin's mottling
  float bl=smoothstep(0.58,0.7,fbm(vO.xz*0.16+vO.y*0.11+seed*1.7))*vK.w; // old blood, soaked in
  c=mix(c,vec3(0.21,0.03,0.025),bl*0.9);
  float sh=(0.46+0.54*pow(nz,1.2))*mix(1.0,vAO,0.7)*mix(0.62,1.0,smoothstep(0.0,26.0,vZ));
  vec3 em=vec3(0.5,0.64,0.82)*pow(1.0-nz,1.7)*0.3+vec3(vK.y);
  o0=vec4(c*sh*a,a); o1=vec4(em*a,a); o2=vec4((n.xy*0.5+0.5)*a,0.1*a,a);`
  }
}`;
let P = null,
  bad = false,
  pend = null;
function warm() {
  if (P || bad || pend || !gl) return;
  try {
    const ext = gl.getExtension('KHR_parallel_shader_compile'),
      one = shadow => {
        const p = gl.createProgram(),
          sh = (type, src) => {
            const o = gl.createShader(type);
            gl.shaderSource(o, src);
            gl.compileShader(o);
            gl.attachShader(p, o);
            return o;
          },
          vs = sh(gl.VERTEX_SHADER, VS(shadow)),
          fs = sh(gl.FRAGMENT_SHADER, FS(shadow));
        gl.linkProgram(p);
        return { p, vs, fs };
      };
    pend = { ext, body: one(false), shadow: one(true) };
  } catch (err) {
    fail(err);
  }
}
function fail(err) {
  bad = true;
  pend = null;
  console.warn('Dead Acre: the 3D figures could not be built here, so the pictures stand in', err);
}
function ready() {
  if (P) return true;
  if (bad) return false;
  if (!pend) warm();
  if (!pend) return false;
  const { ext, body, shadow } = pend;
  if (
    ext &&
    !(
      gl.getProgramParameter(body.p, ext.COMPLETION_STATUS_KHR) &&
      gl.getProgramParameter(shadow.p, ext.COMPLETION_STATUS_KHR)
    )
  )
    return false;
  pend = null;
  for (const { p, vs, fs } of [body, shadow])
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      fail(gl.getShaderInfoLog(vs) || gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(p));
      return false;
    }
  P = { body: progFinish(body.p), shadow: progFinish(shadow.p) };
  return true;
}
export const fig3dWarm = warm;
// whether the 3D figures draw now: switched on, the meshes in, the shaders built
export const fig3dOn = () => opt.b3d !== false && !bad && !!gl && !!FIG.models && ready();

// ---------- each frame: one row of the bone texture per figure ----------
let TEX = null,
  DATA = null,
  frame = 0,
  rowN = 0,
  upTo = 0;
export function fig3dFrame() {
  frame++;
  rowN = 0;
  upTo = 0;
  FIG.drawn = FIG.calls = 0;
}
function tex() {
  if (!TEX) {
    TEX = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, TEX);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, TW, ROWS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    DATA = new Float32Array(TW * 4 * ROWS);
  }
  return TEX;
}
// its row this frame, posed
function rowOf(e) {
  if (e._f3 === frame) return e._r3;
  if (rowN >= ROWS) return -1;
  tex();
  e._f3 = frame;
  e._r3 = rowN++;
  POSE(e, DATA, e._r3 * TW * 4);
  return e._r3;
}

// ---------- the skeleton: rotations as 3×3 (row-major), bones posed by forward kinematics and two-bone reach ----------
let REST = null;
const I3 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
  mm = (A, B) => {
    const C = new Array(9);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
    return C;
  },
  mv = (A, v) => [
    A[0] * v[0] + A[1] * v[1] + A[2] * v[2],
    A[3] * v[0] + A[4] * v[1] + A[5] * v[2],
    A[6] * v[0] + A[7] * v[1] + A[8] * v[2],
  ],
  add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len = a => Math.hypot(a[0], a[1], a[2]),
  nrm = a => {
    const l = len(a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// a turn of th about the unit axis k
function rotA(k, th) {
  const c = Math.cos(th),
    s = Math.sin(th),
    t = 1 - c,
    [x, y, z] = k;
  return [
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c,
  ];
}
// the least turn taking direction a onto direction b
function rotTo(a, b) {
  a = nrm(a);
  b = nrm(b);
  const c = cross(a, b),
    s = len(c),
    d = dot(a, b);
  if (s < 1e-6) return d > 0 ? I3() : rotA(Math.abs(a[0]) < 0.9 ? nrm(cross(a, [1, 0, 0])) : [0, 0, 1], Math.PI);
  return rotA(mul(c, 1 / s), Math.atan2(s, d));
}
// where the middle joint goes so two bones of lengths L1, L2 reach from h to f, bending toward pole
function ik(h, f, L1, L2, pole) {
  let v = sub(f, h),
    d = len(v);
  const mx = (L1 + L2) * 0.999;
  if (d > mx) {
    f = add(h, mul(v, mx / d));
    v = sub(f, h);
    d = mx;
  }
  d = Math.max(d, Math.abs(L1 - L2) + 0.01);
  const dir = mul(v, 1 / d),
    a = (L1 * L1 - L2 * L2 + d * d) / (2 * d),
    hh = Math.sqrt(Math.max(0, L1 * L1 - a * a)),
    pp = nrm(sub(pole, mul(dir, dot(pole, dir))));
  return [add(h, add(mul(dir, a), mul(pp, hh))), f];
}
// writes a bone: world turn R, its joint in the world J (rest joint j0): a corner p goes to R (p - j0) + J
function bone(D, o, b, R, J, j0) {
  const t = sub(J, mv(R, j0)),
    q = o + b * 12;
  for (let i = 0; i < 3; i++) {
    D[q + i * 4] = R[i * 3];
    D[q + i * 4 + 1] = R[i * 3 + 1];
    D[q + i * 4 + 2] = R[i * 3 + 2];
    D[q + i * 4 + 3] = t[i];
  }
}
// a limb of two bones (b1 from joint a, b2 to its end) turned so the end reaches tgt; parent turn Rp
function limb(D, o, b1, b2, Rp, A, tgt, pole, k) {
  const r = REST,
    j1 = r[b1],
    j2 = r[b2],
    j3 = MODEL_END[b2],
    u1 = sc3(sub(j2, j1), k),
    u2 = sc3(sub(j3, j2), k),
    [M, E] = ik(A, tgt, len(u1), len(u2), pole),
    R1 = mm(rotTo(mv(Rp, u1), sub(M, A)), Rp),
    R2 = mm(rotTo(mv(R1, u2), sub(E, M)), R1);
  bone(D, o, b1, mul3(R1, k), A, j1);
  bone(D, o, b2, mul3(R2, k), M, j2);
  return [R2, E];
}
// a figure's build: k = [across, up]; a turn R with the build in it (corners are scaled, then turned)
const sc3 = (v, k) => [v[0] * k[0], v[1] * k[0], v[2] * k[1]],
  mul3 = (R, k) => [
    R[0] * k[0],
    R[1] * k[0],
    R[2] * k[1],
    R[3] * k[0],
    R[4] * k[0],
    R[5] * k[1],
    R[6] * k[0],
    R[7] * k[0],
    R[8] * k[1],
  ];
let MODEL_END = null;

// ---------- the ordinary zombie, posed from what it is doing (the same numbers its pictures move by) ----------
const SKINS = [
    [0.6, 0.66, 0.5],
    [0.66, 0.6, 0.5],
    [0.55, 0.61, 0.58],
    [0.52, 0.55, 0.57],
    [0.64, 0.6, 0.46],
  ],
  PANTS = [
    [0.2, 0.21, 0.26],
    [0.28, 0.25, 0.2],
    [0.17, 0.17, 0.17],
    [0.3, 0.31, 0.33],
    [0.24, 0.27, 0.22],
    [0.36, 0.32, 0.25],
  ],
  HAIR = [
    [0.16, 0.12, 0.09],
    [0.09, 0.08, 0.07],
    [0.32, 0.24, 0.14],
    [0.45, 0.43, 0.4],
    [0.26, 0.15, 0.08],
  ];
let SHIRTS = null;
export const setShirts = s => (SHIRTS = s);
const hsh = (n, k) => {
  const x = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
function poseZombie(e, D, o) {
  if (!MODEL_END) MODEL_END = FIG.models.zombie.bones.map(b => b[3]);
  const r = REST,
    dead = e.dying !== undefined,
    id = e.id || 0,
    k = [(e.sc || 1) * 1.2, (e.sc || 1) * 0.86], // its size: as broad as its pictures, stockier than life (as they are)
    fall = dead ? Math.min(1, e.dying / 0.75) : 0,
    mvv = dead ? 0 : Math.min(1, Math.hypot(e.vx || 0, e.vy || 0) / 50),
    ph = (e.stride || 0) * Math.PI * 2,
    run = !!e.run,
    limp = e.limp && !run,
    t = GS.time,
    yaw =
      (e.a || 0) +
      (dead ? 0 : Math.sin(t * 40) * (e.wob || 0) * 0.08) +
      (dead ? 0 : (1 - mvv) * Math.sin(t * 1.2 + id) * 0.06);
  // the body: where its hips are and how it carries itself
  const hu = run ? 0 : e.hunch || 0,
    fk = e.flT > 0 && !dead ? e.flT / 0.16 : 0,
    sway =
      ((run ? 0.8 : limp ? 2.8 : 1.6) * Math.sin(ph) * mvv * (run ? 1 : e.swK || 1) +
        (dead || run ? 0 : (1 - mvv) * Math.sin(t * 1.4 + id * 1.7) * 1.3 * (e.swK || 1)) +
        (e.wbT > 0 ? Math.sin(t * 9 + id) * 3.4 * Math.min(1, e.wbT / 0.5) : 0)) *
      0.06,
    bob = (Math.abs(Math.cos(ph)) * 1.2 + (limp ? Math.max(0, Math.sin(ph)) * 1.6 : 0)) * mvv,
    crouch = e.st === 'crouch' && !dead ? 1 : 0,
    lk = e.lunge > 0 ? Math.sin(clamp(1 - e.lunge / 0.42, 0, 1) * Math.PI) : 0;
  const Ry = rotA([0, 0, 1], yaw),
    fwd = [Math.cos(yaw), Math.sin(yaw), 0],
    rt = [-Math.sin(yaw), Math.cos(yaw), 0];
  // falling: the whole body tips over its feet toward where the blow sent it, and goes down onto the street
  let Rroot = Ry,
    root = [e.x, e.y, (r[0][2] - (crouch * 3 + lk * 2) + bob * 0.5) * k[1] + (e.z || 0)];
  if (dead) {
    const dd = e.dieDir ?? yaw + Math.PI,
      dir = [Math.cos(dd), Math.sin(dd), 0],
      ax = nrm(cross([0, 0, 1], dir)), // tip toward dir
      tip = (Math.PI / 2) * (fall * fall * (3 - 2 * fall)) * 0.97,
      Rt = rotA(ax, tip);
    Rroot = mm(Rt, Ry);
    // pivot at the feet: the hips swing down and out as it goes
    root = add([e.x, e.y, 3.6 * k[0] * Math.sin(tip)], mv(Rt, [0, 0, r[0][2] * k[1]]));
  }
  const lean = 0.12 + hu * 0.35 + crouch * 0.35 + lk * 0.25 - fk * 0.32 * (e.flS || 1) + mvv * (run ? 0.25 : 0.06),
    Rp = mm(Rroot, mm(rotA([1, 0, 0], sway * 0.6), rotA([0, 1, 0], lean * 0.35))),
    Rs = mm(Rp, mm(rotA([0, 1, 0], lean * 0.3), rotA([0, 0, 1], -sway * 0.8 + Math.sin(ph) * 0.08 * mvv))),
    Rc = mm(Rs, mm(rotA([0, 1, 0], lean * 0.35), rotA([1, 0, 0], -sway * 0.5 + (hsh(id, 3) - 0.5) * 0.12)));
  const Jp = root,
    Js = add(Jp, mv(Rp, sc3(sub(r[1], r[0]), k))),
    Jc = add(Js, mv(Rs, sc3(sub(r[2], r[1]), k)));
  bone(D, o, 0, mul3(Rp, k), Jp, r[0]);
  bone(D, o, 1, mul3(Rs, k), Js, r[1]);
  bone(D, o, 2, mul3(Rc, k), Jc, r[2]);
  // the head: hanging forward, lolling, turned toward what it looks at
  const look = dead ? 0 : clamp(angDiff(yaw, e.hl ?? yaw), -0.9, 0.9),
    droop = 0.25 + (hsh(id, 5) - 0.5) * 0.3 + hu * 0.3,
    loll = (hsh(id, 7) - 0.5) * 0.5 + Math.sin(t * 0.9 + id) * 0.08,
    Rh = mm(Rc, mm(rotA([0, 0, 1], look * 0.8), mm(rotA([0, 1, 0], droop - lean * 0.4), rotA([1, 0, 0], loll)))),
    Jh = add(Jc, mv(Rc, sc3(sub(r[3], r[2]), k)));
  bone(D, o, 3, mul3(Rh, [k[0] * 1.14, k[1] * 1.22]), Jh, r[3]); // a bigger head: from above it is what you read first
  // the feet: stepping on its stride (the bad one dragging behind); flat on the street when it's down
  const stepL = ((run ? 15 : 9) * mvv) / (run ? 1 : e.cad || 1),
    drag = run ? 1 : 0.55;
  const W = (lx, ly, lz) => [e.x + fwd[0] * lx + rt[0] * ly, e.y + fwd[1] * lx + rt[1] * ly, lz];
  for (const sd of [1, -1]) {
    const bad = limp && sd > 0,
      s1 = Math.sin(ph + (sd > 0 ? Math.PI : 0)),
      f = s1 * stepL * (bad ? 0.3 : sd > 0 ? drag : 1) - (bad ? 4 * mvv : 0),
      lift = Math.max(0, Math.cos(ph + (sd > 0 ? Math.PI : 0))) * (run ? 6 : bad ? 0.6 : 2.6) * mvv;
    const ti = sd > 0 ? 8 : 11,
      hip = add(Jp, mv(Rp, sc3(sub(r[ti], r[0]), k)));
    let foot = W(f * k[0] * 0.9 + (crouch ? -3 : 0), sd * 6.2 * k[0] + (bad ? 1.5 : 0), r[ti + 2][2] * k[1] + lift);
    if (dead) {
      // its legs go where its body takes them: straight out below the hips, a little splayed
      const Rl = mm(Rp, rotA([1, 0, 0], sd * (0.12 + hsh(id, 11 + sd) * 0.2)));
      foot = add(hip, mv(Rl, mul(sc3(sub(r[ti + 2], r[ti]), k), 0.98)));
    }
    const pole = mv(Rp, [1, sd * 0.15, 0]),
      [Rsh, ank] = limb(D, o, ti, ti + 1, Rp, hip, foot, pole, k);
    // the foot: flat, pointing where the body points (turned out a little), tipping up as it leaves the ground
    const Rf = mm(mm(Ry, rotA([0, 0, 1], sd * (0.12 + (bad ? 0.5 : 0)))), rotA([0, 1, 0], -lift * 0.04));
    bone(D, o, ti + 2, mul3(dead ? Rsh : Rf, k), ank, r[ti + 2]);
  }
  // the arms: reaching for you at shoulder height, or hanging and swinging, per its pose (as its pictures do)
  const tw = dead ? 0 : Math.sin(t * 2.2 + id) * 3,
    sw = Math.sin(ph),
    pose = e.st === 'crouch' ? 0 : e.pose || 0,
    reach = crouch ? 4 : 0;
  let hands;
  if (run)
    hands = [
      [Math.sin(ph) * 13, -14],
      [-Math.sin(ph) * 13, 14],
    ];
  else if (pose === 1)
    hands = e.limp
      ? [
          [22 + reach + tw + sw * 3, -11],
          [6 + sw * 6 * mvv, 19],
        ]
      : [
          [6 + sw * 6 * mvv, -19],
          [22 + reach + tw + sw * 3, 11],
        ];
  else if (pose === 2)
    hands = [
      [8 + sw * 7 * mvv + tw * 0.4, -18],
      [8 - sw * 7 * mvv - tw * 0.4, 18],
    ];
  else if (pose === 3)
    hands = [
      [24 + reach + tw, -10],
      [13 + reach - tw * 0.6 + sw * 2, 16],
    ];
  else
    hands = [
      [22 + reach + tw + sw * 3, -11.5],
      [20.5 + reach - tw - sw * 3, 11.5],
    ];
  if (!dead && e.aw > 0 && GS.P) {
    const nr = clamp((150 - Math.hypot(GS.P.x - e.x, GS.P.y - e.y)) / 90, 0, 1);
    if (nr > 0)
      hands = hands.map((h, i) => [
        lerp(h[0], 24 + tw * 0.5 + Math.sin(t * 7 + i * 2) * 1.5, nr),
        lerp(h[1], (i ? 1 : -1) * 11, nr),
      ]);
  }
  if (hu) hands = hands.map(h => [h[0] * (1 - 0.3 * hu) - 3 * hu, h[1] * (1 - 0.12 * hu)]);
  if (lk) hands = hands.map(h => [h[0] + 15 * lk, h[1] * (1 - 0.45 * lk)]);
  for (const sd of [1, -1]) {
    const h = hands[sd > 0 ? 1 : 0],
      ub = sd > 0 ? 4 : 6,
      sh = add(Jc, mv(Rc, sc3(sub(r[ub], r[2]), k))),
      up = clamp((h[0] - 6) / 14, 0, 1), // reaching out comes up to the shoulder; hanging stays low
      bodyZ = Jc[2];
    let hand;
    if (dead) {
      // limp: flung out from the shoulder, lying where the fall leaves it
      const Ra = mm(Rc, rotA([1, 0, 0], sd * (0.5 + hsh(id, 21 + sd) * 0.9)));
      hand = add(sh, mv(Ra, mul(sc3(sub(MODEL_END[ub + 1], r[ub]), k), 0.95)));
    } else {
      const hw = W(h[0] * 0.95, h[1] * 1.0, 0);
      hand = [hw[0], hw[1], lerp(bodyZ - 9 * k[1], bodyZ + 2 * k[1], up) + Math.sin(t * 3 + id + sd) * 0.6];
    }
    const pole = nrm(add(mul(rt, sd * 0.6), [0, 0, -0.8]));
    limb(D, o, ub, ub + 1, Rc, sh, hand, pole, k);
  }
  // its looks: the eye over it, how solid it is, a hit's flare; its skin, shirt (and sleeves), trousers, hair, tint
  const q = o + NB * 12,
    sk = SKINS[e.sk || 0] || SKINS[0],
    sh = ((SHIRTS && SHIRTS[e.v || 0]) || [0.36, 0.44, 0.52]).map(x => x * 0.72),
    tc = e.tc || [1, 1, 1],
    pa = PANTS[Math.floor(hsh(id, 31) * PANTS.length)],
    ha = HAIR[Math.floor(hsh(id, 33) * HAIR.length)],
    slv = e.v === 16 ? -1 : hsh(id, 35) < 0.45 ? 2 : hsh(id, 36) < 0.75 ? 1 : 0, // long sleeves, short, none; or no shirt at all
    fade = dead ? clamp(((e.keep || 0.55) - e.dying) / 1.5, 0, 1) : 1,
    fl = e.flash > 0 && !dead ? 0.12 * Math.min(1, e.flash / 0.05) : 0,
    gT = 1 - fall * 0.3; // its own, not the pictures' (GS.gT and the rest belong to whichever was drawn last)
  D.set([e.x, e.y + 40, fade * (0.3 + 0.7 * (e.sv ?? 1)), fl], q);
  D.set([sk[0] * 0.86, sk[1] * 0.86, sk[2] * 0.86, hsh(id, 37) < 0.7 ? 1 : 0], q + 4);
  D.set([sh[0] * tc[0], sh[1] * tc[1], sh[2] * tc[2], slv], q + 8);
  D.set([pa[0], pa[1], pa[2], hsh(id, 39) < 0.25 ? 0.62 : 1.1], q + 12);
  D.set([ha[0], ha[1], ha[2], hsh(id, 41) < 0.12 ? 1 : 0], q + 16);
  D.set([gT, gT, gT, Math.floor(hsh(id, 47) * 5)], q + 20);
  D.set([0, 0, 0, 0.35 + hsh(id, 43) * 0.65 + (e.wounds || 0) * 0.15], q + 24);
  D.set([0, 0, 0, hsh(id, 45)], q + 28);
}
let POSE = poseZombie;

// ---------- which figures draw in 3D ----------
// for now the ordinary zombie, on its feet or going down; the rest (and it, getting up, crawling, lying in wait or
// painted into the ground) keep their pictures
export function is3D(e) {
  return (
    e.type === 'skitter' &&
    !e.trait &&
    !e.kind &&
    !e.shield &&
    !e.__std &&
    !e.crawl &&
    !e.lurk &&
    !(e.down > 0) &&
    !(e.emerge < 1) &&
    !(e.lost && (e.lost[0] || e.lost[1])) &&
    !e.headless &&
    !culling() &&
    fig3dOn()
  );
}

// ---------- drawing ----------
const queue = [];
let depth = null,
  dW = 0,
  dH = 0,
  depthF = -1;
const mode = () => (GS.SHMODE === 3 || GS.SHMODE === 4 ? 2 : GS.SHMODE === 2 ? 3 : GS.SHMODE ? 1 : 0);
// draws e in 3D, or queues it to draw with the figures next to it; false if it can't (the picture draws instead)
export function drawFig3D(e) {
  if (rowOf(e) < 0) return false;
  const m = mode();
  if (m === 2) {
    // a lamp's shadow: each figure on its own, thrown from the lamp lampshadows.js chose for it
    figFlush();
    queue.push(e);
    figFlush();
    return true;
  }
  queue.push(e);
  return true;
}
const rows = new Float32Array(ROWS);
export function figFlush() {
  if (!queue.length) return;
  flush();
  const m = mode(),
    prog = m ? P.shadow : P.body,
    u = prog.u;
  // the near ones in full, the far ones (and all of a big crowd but the nearest) in the lighter mesh
  const Pl = GS.P,
    nearN = [],
    farN = [];
  for (const e of queue) {
    const d = Pl ? Math.hypot(e.x - Pl.x, e.y - Pl.y) : 0;
    (d < 460 && FIG.drawn + nearN.length < 90 ? nearN : farN).push(e);
  }
  let n = 0;
  for (const e of nearN) rows[n++] = e._r3;
  for (const e of farN) rows[n++] = e._r3;
  queue.length = 0;
  // the bone rows written since the last upload go up
  gl.activeTexture(gl.TEXTURE7);
  gl.bindTexture(gl.TEXTURE_2D, tex());
  if (rowN > upTo) {
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, upTo, TW, rowN - upTo, gl.RGBA, gl.FLOAT, DATA, upTo * TW * 4);
    upTo = rowN;
  }
  gl.useProgram(prog.p);
  gl.uniform1i(u.uBones, 7);
  gl.uniform4f(u.uCam, GS.camX, GS.camY, viewW, viewH);
  gl.uniform1i(u.uMode, m);
  gl.uniform2f(u.uSun, SUNV[0], SUNV[1]);
  if (m === 2) {
    const [lx, ly, lh] = lampNow();
    gl.uniform4f(u.uLight, lx, ly, lh, 120);
  } else if (m === 3) gl.uniform4f(u.uLight, GS.FLX, GS.FLY, 0, 0);
  if (m) gl.uniform1f(u.uShA, GS.SHS || 0.6);
  gl.bindBuffer(gl.ARRAY_BUFFER, rowBuf());
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, rows, 0, n);
  if (!m) {
    // depth, for the bodies among themselves: a depth buffer on the scene's own target while they draw
    const vp = gl.getParameter(gl.VIEWPORT);
    if (!depth || dW !== vp[2] || dH !== vp[3]) {
      depth = depth || gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, vp[2], vp[3]);
      dW = vp[2];
      dH = vp[3];
    }
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    if (depthF !== frame) {
      gl.clear(gl.DEPTH_BUFFER_BIT);
      depthF = frame;
    }
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  const draw = (name, from, cnt) => {
    if (!cnt) return;
    const M = FIG.models[name];
    gl.bindVertexArray(M.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, RB);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 4, from * 4);
    gl.drawElementsInstanced(gl.TRIANGLES, M.ni, gl.UNSIGNED_SHORT, 0, cnt);
    FIG.calls++;
  };
  draw('zombie', 0, nearN.length);
  draw('zombie@1', nearN.length, farN.length);
  if (!m) {
    FIG.drawn += n;
    gl.disable(gl.DEPTH_TEST);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, null);
  }
  gl.bindVertexArray(null);
  gl.activeTexture(gl.TEXTURE0);
  gl.useProgram(GS.curProg.p);
}
