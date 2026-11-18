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
import { SUNV, flush, inking, lampNow, viewH, viewW } from './sprites.js';
import { downEl, lyState, supOK } from './draw-bodies.js';

const NB = 14, // bones in a figure's skeleton (tools/mesh/zombie.mjs)
  TW = NB * 3 + 8, // texels in a figure's row: three for each bone's matrix, then its looks
  ROWS = 1024;
export const FIG = { models: null, n: 0, drawn: 0, calls: 0, tw: TW }; // tw: texels in a figure's row

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
  // a stump: raw and dark where a lost limb (or its head) was torn away
  int lostM=int(T(${NB * 3 + 6},r).x+0.5);
  bool l0=((lostM>>int(aB.x))&1)==1, l1=((lostM>>int(aB.y))&1)==1;
  if(l0||l1){ float bw=l0?1.0:clamp((1.0-aW.x)*2.4,0.0,1.0); c=mix(c,vec3(0.32,0.04,0.035),bw); shirt*=1.0-bw; }
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
uniform float uShA; uniform int uInk;
in vec3 vC; in vec3 vN; in vec3 vO; in float vAO; in float vZ; in float vS; flat in vec4 vK; flat in float vPat;
${shadow ? 'layout(location=0) out vec4 o0;' : 'layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;'}
${shadow ? '' : NOISE}
void main(){
  if(vZ<-0.6) discard; // under the street (climbing out of it)
  float a=vK.x;
  ${
    shadow
      ? 'o0=vec4(uShA*a);'
      : `if(uInk==1){ float s=a*uShA; o0=vec4(0.0,0.0,0.0,s); o1=vec4(0.0); o2=vec4(0.5*s,0.5*s,0.1*s,s); return; }
  vec3 n=normalize(vN); float nz=max(n.z,0.0), seed=vK.z*61.0;
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
// every vector and turn made while posing comes from these pools, handed out afresh for each figure (poolReset): a
// crowd's worth of little arrays a frame would otherwise keep the garbage collector busy and the frames uneven
const POOL9 = [],
  POOL3 = [];
let p9 = 0,
  p3 = 0;
const poolReset = () => (p9 = p3 = 0),
  m9 = () => POOL9[p9++] || (POOL9[p9 - 1] = new Array(9)),
  v3 = (x, y, z) => {
    const v = POOL3[p3++] || (POOL3[p3 - 1] = [0, 0, 0]);
    v[0] = x;
    v[1] = y;
    v[2] = z;
    return v;
  };
const I3 = () => {
    const R = m9();
    R.fill(0);
    R[0] = R[4] = R[8] = 1;
    return R;
  },
  mm = (A, B) => {
    const C = m9();
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
    return C;
  },
  mv = (A, v) =>
    v3(
      A[0] * v[0] + A[1] * v[1] + A[2] * v[2],
      A[3] * v[0] + A[4] * v[1] + A[5] * v[2],
      A[6] * v[0] + A[7] * v[1] + A[8] * v[2]
    ),
  add = (a, b) => v3(a[0] + b[0], a[1] + b[1], a[2] + b[2]),
  sub = (a, b) => v3(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  mul = (a, k) => v3(a[0] * k, a[1] * k, a[2] * k),
  dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len = a => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]),
  nrm = a => {
    const l = len(a) || 1;
    return v3(a[0] / l, a[1] / l, a[2] / l);
  },
  cross = (a, b) => v3(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]);
// a turn of th about the unit axis k
function rotA(k, th) {
  const c = Math.cos(th),
    s = Math.sin(th),
    t = 1 - c,
    [x, y, z] = k,
    R = m9();
  R[0] = t * x * x + c;
  R[1] = t * x * y - s * z;
  R[2] = t * x * z + s * y;
  R[3] = t * x * y + s * z;
  R[4] = t * y * y + c;
  R[5] = t * y * z - s * x;
  R[6] = t * x * z - s * y;
  R[7] = t * y * z + s * x;
  R[8] = t * z * z + c;
  return R;
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
const sc3 = (v, k) => v3(v[0] * k[0], v[1] * k[0], v[2] * k[1]),
  mul3 = (R, k) => {
    const M = m9();
    for (let i = 0; i < 9; i += 3) {
      M[i] = R[i] * k[0];
      M[i + 1] = R[i + 1] * k[0];
      M[i + 2] = R[i + 2] * k[1];
    }
    return M;
  };
let MODEL_END = null;

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
// turns as quaternions, to blend one turn into another (a body tipping from standing to lying)
function quatOf(R) {
  const t = R[0] + R[4] + R[8];
  let w, x, y, z;
  if (t > 0) {
    const s = Math.sqrt(t + 1) * 2;
    w = s / 4;
    x = (R[7] - R[5]) / s;
    y = (R[2] - R[6]) / s;
    z = (R[3] - R[1]) / s;
  } else if (R[0] > R[4] && R[0] > R[8]) {
    const s = Math.sqrt(1 + R[0] - R[4] - R[8]) * 2;
    w = (R[7] - R[5]) / s;
    x = s / 4;
    y = (R[1] + R[3]) / s;
    z = (R[2] + R[6]) / s;
  } else if (R[4] > R[8]) {
    const s = Math.sqrt(1 + R[4] - R[0] - R[8]) * 2;
    w = (R[2] - R[6]) / s;
    x = (R[1] + R[3]) / s;
    y = s / 4;
    z = (R[5] + R[7]) / s;
  } else {
    const s = Math.sqrt(1 + R[8] - R[0] - R[4]) * 2;
    w = (R[3] - R[1]) / s;
    x = (R[2] + R[6]) / s;
    y = (R[5] + R[7]) / s;
    z = s / 4;
  }
  return [w, x, y, z];
}
function matOf([w, x, y, z]) {
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - w * z),
    2 * (x * z + w * y),
    2 * (x * y + w * z),
    1 - 2 * (x * x + z * z),
    2 * (y * z - w * x),
    2 * (x * z - w * y),
    2 * (y * z + w * x),
    1 - 2 * (x * x + y * y),
  ];
}
function slerpR(A, B, t) {
  if (t <= 0) return A;
  if (t >= 1) return B;
  const a = quatOf(A);
  let b = quatOf(B),
    d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) {
    b = b.map(v => -v);
    d = -d;
  }
  let q;
  if (d > 0.9995) q = a.map((v, i) => v + (b[i] - v) * t);
  else {
    const th = Math.acos(d),
      s = Math.sin(th);
    q = a.map((v, i) => (v * Math.sin((1 - t) * th) + b[i] * Math.sin(t * th)) / s);
  }
  const l = Math.hypot(...q);
  return matOf(q.map(v => v / l));
}
const Rz = a => rotA([0, 0, 1], a),
  Ryb = a => rotA([0, 1, 0], a), // about the body's own right: + bends it forward
  Rxb = a => rotA([1, 0, 0], a); // about its own front: + leans it to its right
const lyS = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const angLerp = (a, b, t) => a + angDiff(a, b) * t;
// which bones a figure has lost (a bit for each): its arms, its head, its legs (a crawler), all below the waist (half)
function lostOf(e) {
  let m = 0;
  if (e.lost && e.lost[0]) m |= (1 << 6) | (1 << 7);
  if (e.lost && e.lost[1]) m |= (1 << 4) | (1 << 5);
  if (e.headless) m |= 1 << 3;
  if (e.crawl || e.half) m |= 0b11111100000000;
  if (e.half) m |= 1;
  return m;
}

// ---------- the ordinary zombie, posed from what it is doing (the same numbers and states its pictures move by) ----------
function poseZombie(e, D, o) {
  poolReset();
  if (!MODEL_END) MODEL_END = FIG.models.zombie.bones.map(b => b[3]);
  const r = REST,
    dead = e.dying !== undefined,
    id = e.id || 0,
    k = [(e.sc || 1) * 1.2, (e.sc || 1) * 0.86], // its size: as broad as its pictures, stockier than life (as they are)
    t = GS.time,
    lost = lostOf(e),
    // on the ground: dying, knocked down (or playing dead), crawling on its hands, or half a body
    ground = dead || e.down > 0 || e.crawl || e.half,
    H = r[0][2] * k[1], // its hips' height, standing
    hipT = 5.2 * k[0], // ... and lying, on its front or its back
    D3 = (b, R, J) => bone(D, o, b, mul3(R, k), J, r[b]);
  let yaw = e.a || 0,
    Rp, // the hips' turn
    Jp, // where they are
    chestBend = 0,
    chestSide = 0,
    headUp = 0,
    feet = null, // the feet's targets (world), [right, left]; null: worked out standing
    hands = null, // the hands' targets (world); null: worked out standing
    uprightK = 1, // how much of the standing figure's carriage it has (sway, reach, head turn)
    lieR = null;
  // ---- on the ground ----
  if (ground) {
    const st = lyState(e),
      crawl = (e.crawl || e.half) && !dead,
      // on its back: knocked down, as the game decided (its getting up depends on it); killed, as it fell: thrown
      // backward it lands on its back, forward on its face (no turning over in the air)
      sup = crawl
        ? false
        : dead
          ? Math.abs(angDiff(e.a || 0, e.fallA ?? (e.a || 0) + Math.PI)) > Math.PI / 2
          : !!e.sup && supOK(e),
      A = crawl ? e.a : (e.fallA ?? e.a + Math.PI), // where its head points as it lies
      el = dead || crawl ? 0 : downEl(e),
      s1 = dead || crawl ? 0 : st.pl, // hands planted
      s2 = dead || crawl ? 0 : lyS(0.82, 1.13, el), // knees under it (or sitting up)
      s3 = dead || crawl ? 0 : lyS(1.06, 1.24, el), // up on its knees
      s4 = dead || crawl ? 0 : lyS(1.24, 1.55, el), // on its feet
      g0 = st.g; // how far it has gone over
    // how it dies, decided once from the blow (the speed the game threw the body at): an ordinary round and its
    // knees go first and it slumps, then over; buckshot or a blast throws it off its feet; headless, it drops
    if (dead && e._dk === undefined) {
      const sp = Math.hypot(e.rvx || 0, e.rvy || 0);
      e._dk = e.headless ? 2 : sp > 330 || (e.vz || 0) > 40 ? 1 : 0;
    }
    const dk = dead ? e._dk : -1,
      td = dead ? e.dying : 0,
      g = dk === 1 ? Math.min(1, g0 * 1.3) : g0,
      buckle =
        dk === 0 || dk === 2 ? (1 - g) * Math.sin((Math.min(1, td / (dk === 2 ? 0.12 : 0.22)) * Math.PI) / 2) : 0,
      fly = dk === 1 ? Math.sin(Math.min(1, td / 0.5) * Math.PI) : 0;
    const Hd = sup ? A + Math.PI : A, // its heading lying down: toward its head face down, toward its feet on its back
      Rlie = sup ? mm(Rz(Hd), Ryb(-Math.PI / 2)) : mm(Rz(Hd), Ryb(Math.PI / 2));
    // up again: the body's tilt comes back (all fours, then kneeling, then standing), turning to where it goes
    const hd = angLerp(Hd, e.a, s3),
      tilt = sup ? -Math.PI / 2 + (Math.PI / 2) * (0.85 * s2 + 0.15 * s3) : (Math.PI / 2) * (1 - 0.4 * s2 - 0.6 * s3),
      Rup = mm(Rz(hd), Ryb(tilt));
    const Rst = Rz(dead ? e.a || 0 : e.a || 0); // standing, as it was when it went over
    lieR = s2 > 0 || s3 > 0 ? Rup : Rlie;
    Rp = slerpR(Rst, lieR, g);
    yaw = hd;
    uprightK = s4;
    // its waist: where the game keeps it (it travels out from the feet as it goes over), at its height
    const zLie = sup ? 6.2 * k[0] : hipT,
      zKneel = 11.2 * k[1],
      z0 = zLie + (H - zLie) * Math.cos((g * Math.PI) / 2),
      z1 = sup ? lerp(z0, zLie + 1, s2) : lerp(z0, zKneel, s2),
      z2 = lerp(z1, zKneel + 1, s3);
    Jp = [e.x, e.y, lerp(z2, H, s4) + (dead ? (e.z || 0) - buckle * H * (dk === 2 ? 0.5 : 0.32) + fly * 7 : 0)];
    // pushing up: its back arches and its head comes up; sitting up on its back it hunches over its knees
    chestBend = dead
      ? (hsh(id, 51) - 0.5) * 0.3 + buckle * 0.5 - fly * 0.3
      : sup
        ? 0.25 * s2
        : -0.55 * s1 * (1 - s2) + 0.25 * s2 * (1 - s3);
    chestSide = dead ? (hsh(id, 53) - 0.5) * 0.5 : 0;
    headUp = dead ? (hsh(id, 55) - 0.5) * 0.8 * g + buckle * 0.5 - fly * 0.5 : crawl ? -0.5 : -0.35 * s1 * (1 - s3);
    // the limbs on the ground: where they lie (dead, in the pose it fell in), are planted, or reach and haul it on
    const hdF = [Math.cos(hd), Math.sin(hd), 0],
      hdR = [-Math.sin(hd), Math.cos(hd), 0],
      G = (base, f, s, z) => [base[0] + hdF[0] * f + hdR[0] * s, base[1] + hdF[1] * f + hdR[1] * s, z],
      gz = 2.4 * k[0],
      sp = e.splay ?? 0.6;
    if (g > 0.02 || s4 < 1) {
      feet = [1, -1].map(sd => {
        const ly = sd * (5.5 + sp * 5) * k[0],
          lie = G(Jp, sup ? H * 0.98 : -H * 0.98, ly, gz), // straight out from the hips
          knee = sup ? G(Jp, 11 * k[0], ly * 0.8, gz) : G(Jp, -10.5 * k[0], ly * 0.75, gz), // drawn up: knees up (on its back), shins flat behind (kneeling)
          stand = G(Jp, (sd === (id % 2 ? 1 : -1) ? 4 : -1) * k[0], sd * 6.2 * k[0], r[10][2] * k[1]),
          f1 = [0, 1, 2].map(i => lerp(lie[i], knee[i], s2));
        return [0, 1, 2].map(i => lerp(f1[i], stand[i], s4));
      });
      if (g < 1) {
        // still going over: the feet stay where they stood
        const fd = [Math.cos(e.a || 0), Math.sin(e.a || 0), 0],
          fr = [-fd[1], fd[0], 0];
        feet = feet.map((f, i) => {
          const sd = i ? -1 : 1,
            st0 = [
              e.x - fd[0] * Math.sin((g * Math.PI) / 2) * H * 0.0 + fr[0] * sd * 6.2 * k[0],
              e.y + fr[1] * sd * 6.2 * k[0],
              r[10][2] * k[1],
            ];
          return [0, 1, 2].map(j => lerp(st0[j], f[j], g * g));
        });
      }
      if (crawl) {
        // hand over hand: one reaches out ahead while the other drags the body up to it
        const cph = t * 5.2 + id;
        hands = [1, -1].map(sd => {
          const rc = Math.sin(cph + (sd > 0 ? Math.PI : 0));
          return G(
            Jp,
            (34 + 9 * rc) * k[1],
            sd * (15 - 3 * rc) * k[0],
            gz + Math.max(0, Math.cos(cph + (sd > 0 ? Math.PI : 0))) * 4
          );
        });
      } else if (!dead && e.lurk === 'grab' && GS.P) {
        hands = [1, -1].map(sd => (sd > 0 ? [GS.P.x, GS.P.y, gz] : G(Jp, 20 * k[1], -13 * k[0], gz))); // it has your ankle
      } else {
        const pose = e.apose ?? 1,
          tw =
            dead && e.dying > 0.6 && e.dying < 2.2 && id % 3 === 0
              ? Math.sin(e.dying * 31 + id) * (2.2 - e.dying) * 0.8
              : 0;
        hands = [1, -1].map(sd => {
          const up = pose === 0 || (pose === 2 && sd < 0),
            out = pose === 3,
            along = sup ? -1 : 1, // its head's way, in the heading's terms
            lyingAt = up
              ? G(Jp, along * 40 * k[1], sd * 10 * k[0], gz)
              : out
                ? G(Jp, along * 26 * k[1], sd * 30 * k[0], gz)
                : G(Jp, along * 5 * k[1], sd * 15 * k[0], gz),
            planted = sup ? G(Jp, -2 * k[1], sd * 15 * k[0], gz) : G(Jp, 23 * k[1], sd * 13 * k[0], gz); // by its shoulders to push up; by its hips to sit up
          let h = [0, 1, 2].map(i => lerp(lyingAt[i], planted[i], s1));
          h[1] += tw * sd;
          return h;
        });
        if (g < 1) {
          uprightK = Math.max(uprightK, 1 - g); // its arms still out as it goes over...
          const up = Math.sin(g * Math.PI) * (dk === 1 ? 16 : 9);
          for (const h of hands) h[2] += up; // ...and flung up by the fall
        }
      }
    }
  }
  // ---- on its feet (or climbing out of the ground, or getting the last of the way up) ----
  const mvv = dead || ground ? 0 : Math.min(1, Math.hypot(e.vx || 0, e.vy || 0) / 50),
    ph = (e.stride || 0) * Math.PI * 2,
    run = !!e.run,
    limp = e.limp && !run,
    em = e.emerge < 1 ? e.emerge : 1,
    hu = run ? 0 : e.hunch || 0,
    fk = e.flT > 0 && !dead ? e.flT / 0.16 : 0,
    U = uprightK,
    sway =
      ((run ? 0.8 : limp ? 2.8 : 1.6) * Math.sin(ph) * mvv * (run ? 1 : e.swK || 1) +
        (dead || run ? 0 : (1 - mvv) * Math.sin(t * 1.4 + id * 1.7) * 1.3 * (e.swK || 1)) +
        (e.wbT > 0 ? Math.sin(t * 9 + id) * 3.4 * Math.min(1, e.wbT / 0.5) : 0)) *
      0.06 *
      U,
    bob = (Math.abs(Math.cos(ph)) * 1.2 + (limp ? Math.max(0, Math.sin(ph)) * 1.6 : 0)) * mvv,
    crouch = e.st === 'crouch' && !dead ? 1 : 0,
    lk = e.lunge > 0 && !ground ? Math.sin(clamp(1 - e.lunge / 0.42, 0, 1) * Math.PI) : 0;
  if (!ground) {
    yaw += Math.sin(t * 40) * (e.wob || 0) * 0.08 + (1 - mvv) * Math.sin(t * 1.2 + id) * 0.06;
    Rp = Rz(yaw);
    // climbing out of the ground: it hauls itself up out of the street (the street hides what's still under it)
    Jp = [e.x, e.y, (r[0][2] - (crouch * 3 + lk * 2) + bob * 0.5) * k[1] + (e.z || 0) - (1 - em) * (1 - em) * 52];
  }
  const fwd = [Math.cos(yaw), Math.sin(yaw), 0],
    rt = [-Math.sin(yaw), Math.cos(yaw), 0];
  // a hit: the upper body is shoved the way the round was going (back, or to a side), and twists off it; the head
  // snaps after it. The legs keep on under it
  const fd = e.fdx !== undefined ? [e.fdx, e.fdy || 0, 0] : fwd,
    hf = fk * (fd[0] * fwd[0] + fd[1] * fwd[1]),
    hs = fk * (fd[0] * rt[0] + fd[1] * rt[1]),
    tw0 = fk * (e.flS || 1) * 0.3;
  const lean = (0.12 + hu * 0.35 + crouch * 0.35 + lk * 0.25 + hf * 0.55 + mvv * (run ? 0.25 : 0.06)) * U,
    side = hs * 0.45 * U,
    Rpp = mm(Rp, mm(Rxb(sway * 0.6 + side * 0.3), Ryb(lean * 0.35))),
    Rs = mm(
      Rpp,
      mm(Ryb(lean * 0.3 + chestBend * 0.5), Rz(-sway * 0.8 + Math.sin(ph) * 0.08 * mvv + chestSide * 0.5 + tw0))
    ),
    Rc = mm(
      Rs,
      mm(Ryb(lean * 0.35 + chestBend * 0.5), Rxb(-sway * 0.5 + side + (hsh(id, 3) - 0.5) * 0.12 * U + chestSide * 0.5))
    );
  const Js = add(Jp, mv(Rpp, sc3(sub(r[1], r[0]), k))),
    Jc = add(Js, mv(Rs, sc3(sub(r[2], r[1]), k)));
  D3(0, Rpp, Jp);
  D3(1, Rs, Js);
  D3(2, Rc, Jc);
  // the head: hanging forward, lolling, turned toward what it looks at; lifted as it pushes up off the ground
  const look = dead || ground ? 0 : clamp(angDiff(yaw, e.hl ?? yaw), -0.9, 0.9),
    droop = (0.25 + (hsh(id, 5) - 0.5) * 0.3 + hu * 0.3) * U + headUp + hf * 0.4,
    loll = (hsh(id, 7) - 0.5) * 0.5 + Math.sin(t * 0.9 + id) * 0.08 * (dead ? 0 : 1),
    Rh = mm(Rc, mm(Rz(look * 0.8), mm(Ryb(droop - lean * 0.4), Rxb(loll)))),
    Jh = add(Jc, mv(Rc, sc3(sub(r[3], r[2]), k)));
  bone(D, o, 3, mul3(Rh, [k[0] * 1.14, k[1] * 1.22]), Jh, r[3]); // a bigger head: from above it is what you read first
  // where its head is, for the eyes the flashlight catches and the breath a lurker gives itself away by
  {
    const hc = add(Jh, mv(Rh, sc3([0.7, 0, 5.1], [k[0] * 1.14, k[1] * 1.22]))),
      p = 760 / (760 - hc[2]);
    e.__hx = e.x + (hc[0] - e.x) * p;
    e.__hy = e.y + 40 + (hc[1] - e.y - 40) * p;
    e.__lhx = e.__hx;
    e.__lhy = e.__hy;
    e.__ha = Math.atan2(Rh[3], Rh[0]);
    e.__hk = 1;
    if (!ground && !e.headless) e.__ht = t;
  }
  // the legs
  const stepL = ((run ? 15 : 9) * mvv) / (run ? 1 : e.cad || 1),
    drag = run ? 1 : 0.55;
  const W = (lx, ly, lz) => [e.x + fwd[0] * lx + rt[0] * ly, e.y + fwd[1] * lx + rt[1] * ly, lz];
  for (const sd of [1, -1]) {
    const ti = sd > 0 ? 8 : 11,
      hip = add(Jp, mv(Rpp, sc3(sub(r[ti], r[0]), k)));
    let foot;
    if (feet) foot = feet[sd > 0 ? 0 : 1];
    else {
      const bad = limp && sd > 0,
        s1 = Math.sin(ph + (sd > 0 ? Math.PI : 0)),
        f = s1 * stepL * (bad ? 0.3 : sd > 0 ? drag : 1) - (bad ? 4 * mvv : 0),
        lift = Math.max(0, Math.cos(ph + (sd > 0 ? Math.PI : 0))) * (run ? 6 : bad ? 0.6 : 2.6) * mvv;
      foot = W(
        f * k[0] * 0.9 + (crouch ? -3 : 0),
        sd * 6.2 * k[0] + (bad ? 1.5 : 0),
        r[ti + 2][2] * k[1] + lift - (1 - em) * 30
      );
      if (em < 1) foot = W(-3 * k[0], sd * 6 * k[0], Jp[2] - 18 * k[1]); // still under the street, hanging below it
    }
    const pole = lieR && !feet ? mv(Rpp, [1, sd * 0.15, 0]) : mv(Rpp, [1, sd * 0.15, 0]),
      [Rsh, ank] = limb(D, o, ti, ti + 1, Rpp, hip, foot, pole, k);
    // the foot: flat, pointing where the body points (turned out a little); on the ground, along the shin
    const flat = mm(Rz(yaw + sd * 0.12 + (limp && sd > 0 ? 0.5 : 0)), Ryb(0)),
      Rf = ground ? slerpR(mm(Rsh, Ryb(Math.PI / 2)), flat, uprightK) : flat; // on the ground the foot points on along the shin (kneeling, it rests on its instep)
    D3(ti + 2, Rf, ank);
  }
  // the arms: reaching for you at shoulder height, or hanging and swinging, per its pose (as its pictures do)
  const tw = dead ? 0 : Math.sin(t * 2.2 + id) * 3,
    sw = Math.sin(ph),
    pose = e.st === 'crouch' ? 0 : e.pose || 0,
    reach = crouch ? 4 : 0;
  let hd2;
  if (run)
    hd2 = [
      [Math.sin(ph) * 13, -14],
      [-Math.sin(ph) * 13, 14],
    ];
  else if (pose === 1)
    hd2 = e.limp
      ? [
          [22 + reach + tw + sw * 3, -11],
          [6 + sw * 6 * mvv, 19],
        ]
      : [
          [6 + sw * 6 * mvv, -19],
          [22 + reach + tw + sw * 3, 11],
        ];
  else if (pose === 2)
    hd2 = [
      [8 + sw * 7 * mvv + tw * 0.4, -18],
      [8 - sw * 7 * mvv - tw * 0.4, 18],
    ];
  else if (pose === 3)
    hd2 = [
      [24 + reach + tw, -10],
      [13 + reach - tw * 0.6 + sw * 2, 16],
    ];
  else
    hd2 = [
      [22 + reach + tw + sw * 3, -11.5],
      [20.5 + reach - tw - sw * 3, 11.5],
    ];
  if (!dead && e.aw > 0 && GS.P) {
    const nr = clamp((150 - Math.hypot(GS.P.x - e.x, GS.P.y - e.y)) / 90, 0, 1);
    if (nr > 0)
      hd2 = hd2.map((h, i) => [
        lerp(h[0], 24 + tw * 0.5 + Math.sin(t * 7 + i * 2) * 1.5, nr),
        lerp(h[1], (i ? 1 : -1) * 11, nr),
      ]);
  }
  if (hu) hd2 = hd2.map(h => [h[0] * (1 - 0.3 * hu) - 3 * hu, h[1] * (1 - 0.12 * hu)]);
  if (lk) hd2 = hd2.map(h => [h[0] + 15 * lk, h[1] * (1 - 0.45 * lk)]);
  for (const sd of [1, -1]) {
    const h2 = hd2[sd > 0 ? 1 : 0],
      ub = sd > 0 ? 4 : 6,
      sh = add(Jc, mv(Rc, sc3(sub(r[ub], r[2]), k))),
      up = clamp((h2[0] - 6) / 14, 0, 1),
      bodyZ = Jc[2];
    let hand = W(
      h2[0] * 0.95,
      h2[1],
      lerp(bodyZ - 9 * k[1], bodyZ + 2 * k[1], up) + Math.sin(t * 3 + id + sd) * 0.6 * (dead ? 0 : 1)
    );
    if (em < 1)
      hand = W(10 * k[0], sd * 12 * k[0], Math.max(2, Jp[2] + 22 * k[1] * (0.6 + 0.4 * Math.sin(t * 6 + sd)))); // clawing up out of the ground
    if (hands) {
      const g0 = hands[sd > 0 ? 0 : 1];
      hand = [0, 1, 2].map(i => lerp(g0[i], hand[i], uprightK));
    }
    const pole = nrm(add(mul(rt, sd * 0.6), [0, 0, -0.8]));
    limb(D, o, ub, ub + 1, Rc, sh, hand, pole, k);
  }
  // what it has lost goes: those bones shrink to nothing at their joints (the skin round them closes into the stump)
  if (lost)
    for (let b = 0; b < NB; b++)
      if (lost & (1 << b)) {
        const q = o + b * 12,
          J = [
            D[q + 3] + D[q] * r[b][0] + D[q + 1] * r[b][1] + D[q + 2] * r[b][2],
            D[q + 7] + D[q + 4] * r[b][0] + D[q + 5] * r[b][1] + D[q + 6] * r[b][2],
            D[q + 11] + D[q + 8] * r[b][0] + D[q + 9] * r[b][1] + D[q + 10] * r[b][2],
          ];
        for (let i = 0; i < 3; i++) {
          D[q + i * 4] = D[q + i * 4 + 1] = D[q + i * 4 + 2] = 0;
          D[q + i * 4 + 3] = J[i];
        }
      }
  // its looks: the eye over it, how solid it is, a hit's flare; its skin, shirt (and sleeves), trousers, hair, tint
  const q = o + NB * 12,
    sk = SKINS[e.sk || 0] || SKINS[0],
    shc = ((SHIRTS && SHIRTS[e.v || 0]) || [0.36, 0.44, 0.52]).map(x => x * 0.72),
    tc = e.tc || [1, 1, 1],
    pa = PANTS[Math.floor(hsh(id, 31) * PANTS.length)],
    ha = HAIR[Math.floor(hsh(id, 33) * HAIR.length)],
    slv = e.v === 16 ? -1 : hsh(id, 35) < 0.45 ? 2 : hsh(id, 36) < 0.75 ? 1 : 0, // long sleeves, short, none; or no shirt at all
    fade = dead ? clamp(((e.keep || 0.55) - e.dying) / 1.5, 0, 1) : 1,
    fl = e.flash > 0 && !dead ? 0.12 * Math.min(1, e.flash / 0.05) : 0,
    gT = e.lurk === 'lie' ? 0.62 : 1 - (dead ? 0.25 * Math.min(1, e.dying / 0.6) : 0); // its own, not the pictures' (GS.gT and the rest belong to whichever was drawn last)
  D.set([e.x, e.y + 40, fade * (0.3 + 0.7 * (e.sv ?? 1)), fl], q);
  D.set([sk[0] * 0.86, sk[1] * 0.86, sk[2] * 0.86, hsh(id, 37) < 0.7 ? 1 : 0], q + 4);
  D.set([shc[0] * tc[0], shc[1] * tc[1], shc[2] * tc[2], slv], q + 8);
  D.set([pa[0], pa[1], pa[2], hsh(id, 39) < 0.25 ? 0.62 : 1.1], q + 12);
  D.set([ha[0], ha[1], ha[2], hsh(id, 41) < 0.12 ? 1 : 0], q + 16);
  D.set([gT, gT, gT, Math.floor(hsh(id, 47) * 5)], q + 20);
  D.set([lost, 0, 0, 0.35 + hsh(id, 43) * 0.65 + (e.wounds || 0) * 0.15 + (lost ? 0.4 : 0)], q + 24);
  D.set([0, 0, 0, hsh(id, 45)], q + 28);
}
let POSE = poseZombie;

// ---------- which figures draw in 3D ----------
// for now the ordinary zombie (and half a one), in all it does: walking, falling, lying, getting up, crawling, lying in
// wait, climbing out of the ground, missing an arm or its head, and painted into the street once it lies still
export function is3D(e) {
  return (e.type === 'skitter' || e.type === 'mini') && !e.trait && !e.kind && !e.shield && !e.__std && fig3dOn();
}
// the remains pass (remains.js) draws bodies into a patch of the street's own picture: its camera, and its target's size
let CAM = null,
  CSZ = 0;
export function figCam(rect, size) {
  figFlush();
  CAM = rect;
  CSZ = size || 0;
}

// ---------- drawing ----------
const queue = [];
const depths = {}; // depth buffers by size (the screen's, the remains pass's), and the frame each was last cleared in
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
    ink = m === 1 && inking(), // painting a body's shadow into the street: dark, in the body's own shape
    prog = m && !ink ? P.shadow : P.body,
    u = prog.u,
    cam = CAM || [GS.camX, GS.camY, viewW, viewH];
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
  gl.uniform4f(u.uCam, cam[0], cam[1], cam[2], cam[3]);
  gl.uniform1i(u.uMode, m);
  gl.uniform2f(u.uSun, SUNV[0], SUNV[1]);
  if (m === 2) {
    const [lx, ly, lh] = lampNow();
    gl.uniform4f(u.uLight, lx, ly, lh, 120);
  } else if (m === 3) gl.uniform4f(u.uLight, GS.FLX, GS.FLY, 0, 0);
  if (m) gl.uniform1f(u.uShA, GS.SHS || 0.6);
  if (prog === P.body) gl.uniform1i(u.uInk, ink ? 1 : 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, rowBuf());
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, rows, 0, n);
  if (!m) {
    // depth, for the bodies among themselves: a depth buffer on the scene's own target while they draw
    const vp = gl.getParameter(gl.VIEWPORT),
      w = CSZ || vp[2],
      h = CSZ || vp[3],
      key = w + 'x' + h;
    let d = depths[key];
    if (!d) {
      d = depths[key] = { rb: gl.createRenderbuffer(), f: -1 };
      gl.bindRenderbuffer(gl.RENDERBUFFER, d.rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      for (const k2 in depths) if (k2 !== key && !CSZ && k2 !== 'keep') delete depths[k2]; // the screen changed size
    }
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d.rb);
    if (d.f !== frame || CSZ) {
      const sc = gl.isEnabled(gl.SCISSOR_TEST);
      gl.disable(gl.SCISSOR_TEST);
      gl.depthMask(true);
      gl.clear(gl.DEPTH_BUFFER_BIT); // once a frame on the screen; every patch of the street afresh
      if (sc) gl.enable(gl.SCISSOR_TEST);
      d.f = frame;
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
