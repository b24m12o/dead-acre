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
      M[name] = {
        vao,
        ni: m.ni,
        bones: m.bones,
        rest: m.bones.map(b => b[2]),
        ends: m.bones.map(b => b[3]),
        scale: m.scale || 1,
      };
    }
    // each build against the ordinary zombie's: how wide its shoulders and hips, how long its arms and legs, how tall,
    // how big its head; the poses scale their reaches and steps by them
    const Z = M.zombie,
      L = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
      arm = X => L(X.rest[4], X.rest[5]) + L(X.rest[5], X.ends[5]);
    for (const X of Object.values(M))
      X.f = {
        bw: X.rest[4][1] / Z.rest[4][1],
        hw: X.rest[8][1] / Z.rest[8][1],
        ba: arm(X) / arm(Z),
        bl: X.rest[8][2] / Z.rest[8][2],
        bh: X.ends[3][2] / Z.ends[3][2],
        hs: L(X.rest[3], X.ends[3]) / L(Z.rest[3], Z.ends[3]),
      };
    FIG.models = M;
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
  else if(reg==14) c=vec3(0.17,0.18,0.16); // a plate carrier
  else if(reg==15) c=vec3(0.12,0.13,0.15); // a helmet
  else if(reg==16) c=vec3(0.26,0.29,0.33); // a riot shield, scuffed
  else if(reg==17) c=TI.w<-0.5?vec3(0.3,0.1,0.08):SK.rgb*vec3(1.08,0.96,0.7); // raw flesh (on a dog), or swollen, stretched and veined
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
  return [R2, E, M];
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
  const name = modelOf(e) || 'zombie',
    MM = FIG.models[name] || FIG.models.zombie,
    F = MM.f;
  REST = MM.rest;
  MODEL_END = MM.ends;
  const r = REST,
    dead = e.dying !== undefined,
    id = e.id || 0,
    k = [(e.sc || 1) * MM.scale, (e.sc || 1) * MM.scale], // its size (across, up): true to life, or its kind's
    // its build against the ordinary zombie's: across the shoulders (kw) and hips (kp), its arms' reach (ka), its legs
    // (kl), its height (kh)
    kw = k[0] * F.bw,
    kp = k[0] * F.hw,
    ka = k[0] * F.ba,
    kl = k[1] * F.bl,
    kh = k[1] * F.bh,
    brute = name === 'brute',
    hop = name === 'hopper',
    fat = hop || name === 'bloat',
    spit = name === 'spitter',
    riot = name === 'riot',
    t = GS.time,
    lost = lostOf(e),
    // on the ground: dying, knocked down (or playing dead), crawling on its hands, or half a body
    ground = dead || e.down > 0 || e.crawl || e.half,
    H = r[0][2] * k[1], // its hips' height, standing
    hipT = 3.6 * kw * (fat ? 1.7 : 1), // ... and lying, on its front or its back (on its gut, if it has one)
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
    const zLie = sup ? 4.1 * kw : hipT,
      zKneel = 13.6 * kl,
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
      gz = 1.4 * k[0],
      sp = e.splay ?? 0.6;
    if (g > 0.02 || s4 < 1) {
      feet = [1, -1].map(sd => {
        const ly = sd * (3.8 + sp * 4) * kp,
          lie = G(Jp, sup ? H * 0.98 : -H * 0.98, ly, gz), // straight out from the hips
          knee = sup ? G(Jp, 14 * kl, ly * 0.8, gz) : G(Jp, -12.5 * kl, ly * 0.75, gz), // drawn up: knees up (on its back), shins flat behind (kneeling)
          stand = G(Jp, (sd === (id % 2 ? 1 : -1) ? 4 : -1) * kl, sd * 4.3 * kp, r[10][2] * k[1]),
          f1 = [0, 1, 2].map(i => lerp(lie[i], knee[i], s2));
        return [0, 1, 2].map(i => lerp(f1[i], stand[i], s4));
      });
      if (g < 1) {
        // still going over: the feet stay where they stood
        const fd = [Math.cos(e.a || 0), Math.sin(e.a || 0), 0],
          fr = [-fd[1], fd[0], 0];
        feet = feet.map((f, i) => {
          const sd = i ? -1 : 1,
            st0 = [e.x + fr[0] * sd * 4.3 * kp, e.y + fr[1] * sd * 4.3 * kp, r[10][2] * k[1]];
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
            (27 + 7 * rc) * kh,
            sd * (10 - 2 * rc) * kw,
            gz + Math.max(0, Math.cos(cph + (sd > 0 ? Math.PI : 0))) * 4
          );
        });
      } else if (!dead && e.lurk === 'grab' && GS.P) {
        hands = [1, -1].map(sd => (sd > 0 ? [GS.P.x, GS.P.y, gz] : G(Jp, 16 * kh, -9 * kw, gz))); // it has your ankle
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
              ? G(Jp, along * 36 * kh, sd * 6 * kw, gz)
              : out
                ? G(Jp, along * 16 * kh, sd * 24 * ka, gz)
                : G(Jp, along * 2 * kh, sd * 10 * kw, gz),
            planted = sup ? G(Jp, -2 * kh, sd * 10 * kw, gz) : G(Jp, 16 * kh, sd * 8 * kw, gz); // by its shoulders to push up; by its hips to sit up
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
    fk = e.flT > 0 && !dead ? e.flT / 0.16 : 0,
    U = uprightK,
    // each kind's own moves (0..1): the brute rearing, charging, stunned against a wall; the bloater swelling to burst;
    // the spitter hunched to spit; the screamer drawing breath and screaming, head back and arms out; the riot cop
    // shoving with its shield; the climber on all fours
    live = !dead && !ground,
    rear = live && brute && e.st === 'rear' ? Math.min(1, (0.7 - (e.stT || 0)) / 0.3) : 0,
    chg = live && brute && e.st === 'charge' ? 1 : 0,
    stun = live && brute && e.st === 'stun' ? 1 : 0,
    swl = live && hop && e.st === 'swell' ? clamp(e.swell || 0, 0, 1) : 0,
    spt = live && spit && e.charging > 0 ? 1 : 0,
    scrm = live
      ? name === 'screamer'
        ? e.open || 0
        : name === 'gaunt' && e.scrIn > 0
          ? clamp(1 - e.scrIn / 0.95, 0, 1)
          : 0
      : 0,
    bash = live && riot && e.st === 'bash' ? 1 : live && riot && e.st === 'bashW' ? -0.5 : 0,
    climb = live && e.kind === 'climb',
    hu = run ? 0 : brute ? 0.55 + stun * 0.4 : (e.hunch || 0) + spt * 0.6 + (name === 'drag' ? 0.5 : 0),
    sway =
      ((run ? 0.8 : limp ? 2.8 : fat ? 3.2 : brute ? 2.2 : 1.6) * Math.sin(ph) * mvv * (run ? 1 : e.swK || 1) +
        (dead || run ? 0 : (1 - mvv) * Math.sin(t * 1.4 + id * 1.7) * 1.3 * (e.swK || 1)) +
        (e.wbT > 0 ? Math.sin(t * 9 + id) * 3.4 * Math.min(1, e.wbT / 0.5) : 0) +
        stun * Math.sin(t * 5 + id) * 3 +
        swl * Math.sin(t * 31 + id) * 2.2) *
      0.06 *
      U,
    bob = (Math.abs(Math.cos(ph)) * 1.2 + (limp ? Math.max(0, Math.sin(ph)) * 1.6 : 0)) * mvv,
    crouch = e.st === 'crouch' && !dead ? 1 : 0,
    lk = e.lunge > 0 && !ground ? Math.sin(clamp(1 - e.lunge / 0.42, 0, 1) * Math.PI) : 0;
  if (!ground) {
    yaw += Math.sin(t * 40) * (e.wob || 0) * 0.08 + (1 - mvv) * Math.sin(t * 1.2 + id) * 0.06;
    Rp = Rz(yaw);
    // climbing out of the ground: it hauls itself up out of the street (the street hides what's still under it)
    Jp = [
      e.x,
      e.y,
      (r[0][2] * (climb ? 0.58 : 1) - (crouch * 5 + lk * 2.5 + chg * 3) + bob * 0.6 + rear * 2) * k[1] +
        (e.z || 0) -
        (1 - em) * (1 - em) * 52,
    ];
  }
  const fwd = [Math.cos(yaw), Math.sin(yaw), 0],
    rt = [-Math.sin(yaw), Math.cos(yaw), 0];
  // a hit: the upper body is shoved the way the round was going (back, or to a side), and twists off it; the head
  // snaps after it. The legs keep on under it
  const fd = e.fdx !== undefined ? [e.fdx, e.fdy || 0, 0] : fwd,
    hf = fk * (fd[0] * fwd[0] + fd[1] * fwd[1]),
    hs = fk * (fd[0] * rt[0] + fd[1] * rt[1]),
    tw0 = fk * (e.flS || 1) * 0.3;
  const lean =
      (0.12 +
        hu * 0.35 +
        crouch * 0.35 +
        lk * 0.25 +
        hf * 0.55 +
        mvv * (run ? 0.25 : 0.06) -
        rear * 0.75 +
        chg * 0.5 -
        scrm * 0.3 +
        bash * 0.35 +
        (climb ? 1.15 : 0)) *
      U,
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
  // swelling to burst, its trunk puffs up
  const kS = swl ? [k[0] * (1 + 0.28 * swl), k[1] * (1 + 0.12 * swl)] : k;
  bone(D, o, 1, mul3(Rs, kS), Js, r[1]);
  bone(D, o, 2, mul3(Rc, kS), Jc, r[2]);
  // the head: hanging forward, lolling, turned toward what it looks at; lifted as it pushes up off the ground
  const look = dead || ground ? 0 : clamp(angDiff(yaw, e.hl ?? yaw), -0.9, 0.9),
    droop =
      (0.25 + (hsh(id, 5) - 0.5) * 0.3 + hu * 0.3) * U +
      headUp +
      hf * 0.4 -
      scrm * 1.0 -
      spt * 0.55 -
      rear * 0.4 +
      stun * 0.5 -
      (climb ? 1.0 : 0),
    loll = (hsh(id, 7) - 0.5) * 0.5 + Math.sin(t * 0.9 + id) * 0.08 * (dead ? 0 : 1),
    Rh = mm(Rc, mm(Rz(look * 0.8), mm(Ryb(droop - lean * 0.4), Rxb(loll)))),
    Jh = add(Jc, mv(Rc, sc3(sub(r[3], r[2]), k)));
  D3(3, Rh, Jh);
  // where its head is, for the eyes the flashlight catches and the breath a lurker gives itself away by
  {
    const hc = add(Jh, mv(Rh, sc3(mul(sub(MODEL_END[3], r[3]), 0.55), k))),
      p = 760 / (760 - hc[2]);
    e.__hx = e.x + (hc[0] - e.x) * p;
    e.__hy = e.y + 40 + (hc[1] - e.y - 40) * p;
    e.__lhx = e.__hx;
    e.__lhy = e.__hy;
    e.__ha = Math.atan2(Rh[3], Rh[0]);
    e.__hk = 0.53 * k[0] * F.hs; // a life-size head: its eyes are closer together than the pictures'
    if (!ground && !e.headless) e.__ht = t;
  }
  // the legs
  const stepL = (((run ? 15 : chg ? 17 : 9) * mvv) / (run || chg ? 1 : e.cad || 1)) * F.bl,
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
        f * k[0] * 0.9 + (crouch ? -3 : 0) + (climb ? -2 : 0),
        sd * 4.3 * kp * (brute || fat ? 1.25 : 1) + (bad ? 1.2 : 0),
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
  if (hu && !brute) hd2 = hd2.map(h => [h[0] * (1 - 0.3 * hu) - 3 * hu, h[1] * (1 - 0.12 * hu)]);
  if (lk) hd2 = hd2.map(h => [h[0] + 15 * lk, h[1] * (1 - 0.45 * lk)]);
  let raise = 0; // hands up above the shoulders, by this much
  if (brute)
    hd2 = chg
      ? [
          [-4, -20],
          [-4, 20],
        ] // charging: head down, arms back
      : [
          [12 + sw * 9 * mvv, -21],
          [12 - sw * 9 * mvv, 21],
        ]; // knuckles low and forward, swinging
  if (fat)
    hd2 = [
      [6 + sw * 3 * mvv, -30 - swl * 6],
      [6 - sw * 3 * mvv, 30 + swl * 6],
    ]; // held out round the gut
  if (spt)
    hd2 = [
      [0, -17],
      [0, 17],
    ]; // drawn back as it spits
  if (scrm) hd2 = hd2.map((h, i) => [lerp(h[0], 6, scrm), lerp(h[1], (i ? 1 : -1) * 32, scrm)]); // flung wide as it screams
  if (climb)
    hd2 = [
      [24 + Math.sin(ph) * 6, -9],
      [24 - Math.sin(ph) * 6, 9],
    ]; // down on the ground ahead of it, hand over hand
  raise = rear * 18 + scrm * 8 + swl * 6;
  for (const sd of [1, -1]) {
    const h2 = hd2[sd > 0 ? 1 : 0],
      ub = sd > 0 ? 4 : 6,
      sh = add(Jc, mv(Rc, sc3(sub(r[ub], r[2]), k))),
      up = clamp((h2[0] - 6) / 14, 0, 1),
      bodyZ = Jc[2];
    // the pictures' hands (lx forward, ly out) on a life-size body: reaching, about as far as its arms go, a little in from
    // its shoulders, at their height; hanging, by its thighs
    let hand = W(
      lerp(h2[0] - 6, h2[0] * 0.92, up) * ka,
      h2[1] * 0.6 * kw,
      lerp(bodyZ - 10 * ka, bodyZ + 2.5 * ka, up) +
        raise * kh +
        Math.sin(t * 3 + id + sd) * 0.6 * (dead ? 0 : 1) +
        swl * Math.sin(t * 27 + sd) * 1.5
    );
    if (climb) hand[2] = 1.4 * k[0] + Math.max(0, Math.sin(ph + (sd > 0 ? Math.PI : 0))) * 3; // on the ground
    // running, the arms pump, bent at the elbow, at its sides; walking, a brute's knuckles hang by its thighs
    if (run && !ground) hand = W(h2[0] * 0.65 * ka, h2[1] * 0.55 * kw, Jc[2] - 9 * ka + Math.max(0, h2[0]) * 0.3 * ka);
    if (brute && !chg && !rear && !ground) hand = W(h2[0] * 0.5 * ka, h2[1] * 0.68 * kw, Jp[2] - 6 * k[1]);
    if (em < 1) hand = W(8 * k[0], sd * 8 * k[0], Math.max(2, Jp[2] + 24 * k[1] * (0.6 + 0.4 * Math.sin(t * 6 + sd)))); // clawing up out of the ground
    if (hands) {
      const g0 = hands[sd > 0 ? 0 : 1];
      hand = [0, 1, 2].map(i => lerp(g0[i], hand[i], uprightK));
    }
    const pole = nrm(add(mul(rt, sd * 0.6), [0, 0, -0.8]));
    // the riot cop's shield arm: the forearm upright before its chest, the shield's face to the front
    if (riot && sd < 0 && e.shield && !dead && !(e.stag > 0) && !ground) {
      const elbowAt = add(sh, add(mul(fwd, 6 * ka + bash * 4), [0, 0, -9 * k[1]])),
        handAt = add(elbowAt, add(mul(fwd, 2 + bash * 3), [0, 0, 10 * k[1]]));
      const [, , M] = limb(D, o, ub, ub + 1, Rc, sh, handAt, nrm(add(mul(rt, -0.7), [0, 0, -0.6])), k);
      const ta = nrm(sub(handAt, M)),
        tf = nrm(sub(fwd, mul(ta, dot(fwd, ta)))),
        dr = nrm(sub(MODEL_END[7], r[7])),
        fr = nrm(sub([1, 0, 0], mul(dr, dr[0]))),
        A = [ta, tf, cross(ta, tf)],
        Bm = [dr, fr, cross(dr, fr)],
        R = m9();
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) R[i * 3 + j] = A[0][i] * Bm[0][j] + A[1][i] * Bm[1][j] + A[2][i] * Bm[2][j];
      D3(7, R, M);
    } else limb(D, o, ub, ub + 1, Rc, sh, hand, pole, k);
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
    kd = e.kind,
    sk =
      kd === 'climb'
        ? [0.86, 0.85, 0.79] // pale, bloodless
        : kd === 'spore'
          ? [0.8, 0.74, 0.4] // yellowing
          : kd === 'drag'
            ? [0.34, 0.35, 0.34] // near black
            : kd === 'blind'
              ? [0.72, 0.72, 0.7] // ashen
              : brute
                ? [0.56, 0.6, 0.5] // grey-green, swollen with muscle
                : hop
                  ? [0.7, 0.68, 0.48] // sickly, stretched tight
                  : SKINS[e.sk || 0] || SKINS[0],
    shc = (
      spit
        ? [0.4, 0.42, 0.34]
        : name === 'screamer'
          ? [0.36, 0.33, 0.38]
          : brute
            ? [0.3, 0.24, 0.2]
            : hop
              ? [0.27, 0.33, 0.39]
              : riot || name === 'armored'
                ? [0.2, 0.24, 0.32] // a uniform under the gear
                : (SHIRTS && SHIRTS[e.v || 0]) || [0.36, 0.44, 0.52]
    ).map(x => x * 0.72),
    tc = e.tc || [1, 1, 1],
    pa = PANTS[Math.floor(hsh(id, 31) * PANTS.length)],
    ha = HAIR[Math.floor(hsh(id, 33) * HAIR.length)],
    slv =
      e.v === 16 || kd === 'spore' || kd === 'climb'
        ? -1
        : brute || hop
          ? 1
          : riot || name === 'armored'
            ? 2
            : hsh(id, 35) < 0.45
              ? 2
              : hsh(id, 36) < 0.75
                ? 1
                : 0, // long sleeves, short, none; or no shirt at all
    bald = brute || hop || kd === 'blind' || kd === 'climb' || hsh(id, 37) >= 0.7,
    fade = dead ? clamp(((e.keep || 0.55) - e.dying) / 1.5, 0, 1) : 1,
    fl = e.flash > 0 && !dead ? 0.12 * Math.min(1, e.flash / 0.05) : 0,
    gT = e.lurk === 'lie' ? 0.62 : 1 - (dead ? 0.25 * Math.min(1, e.dying / 0.6) : 0); // its own, not the pictures' (GS.gT and the rest belong to whichever was drawn last)
  D.set([e.x, e.y + 40, fade * (0.3 + 0.7 * (e.sv ?? 1)), fl], q);
  D.set([sk[0] * 0.86, sk[1] * 0.86, sk[2] * 0.86, bald ? 0 : 1], q + 4);
  D.set([shc[0] * tc[0], shc[1] * tc[1], shc[2] * tc[2], slv], q + 8);
  D.set([pa[0], pa[1], pa[2], hsh(id, 39) < 0.25 ? 0.62 : 1.1], q + 12);
  D.set([ha[0], ha[1], ha[2], hsh(id, 41) < 0.12 ? 1 : 0], q + 16);
  D.set([gT, gT, gT, brute || hop || riot || name === 'armored' ? 0 : Math.floor(hsh(id, 47) * 5)], q + 20);
  D.set([lost, 0, 0, 0.35 + hsh(id, 43) * 0.65 + (e.wounds || 0) * 0.15 + (lost ? 0.4 : 0)], q + 24);
  D.set([0, 0, 0, hsh(id, 45)], q + 28);
}
// ---------- the dog: a gallop, a crouch, a leap; dead, on its side ----------
const FURS = [
  [0.3, 0.24, 0.18],
  [0.22, 0.19, 0.17],
  [0.42, 0.38, 0.32],
  [0.5, 0.36, 0.22],
  [0.26, 0.26, 0.25],
];
function poseDog(e, D, o) {
  poolReset();
  const MM = FIG.models.dog;
  REST = MM.rest;
  MODEL_END = MM.ends;
  const r = REST,
    dead = e.dying !== undefined,
    id = e.id || 0,
    t = GS.time,
    k = [(e.sc || 1) * MM.scale, (e.sc || 1) * MM.scale],
    D3 = (b, R, J) => bone(D, o, b, mul3(R, k), J, r[b]),
    yaw = e.a || 0,
    mvv = dead ? 0 : Math.min(1, Math.hypot(e.vx || 0, e.vy || 0) / 180),
    ph = ((e.stride ?? t * 2.6) % 1) * Math.PI * 2,
    crouch = !dead && e.st === 'crouch' ? 1 : 0,
    leap = !dead && e.st === 'leap' ? Math.sin(clamp(1 - (e.stT || 0) / 0.3, 0, 1) * Math.PI) : 0,
    fall = dead ? Math.min(1, e.dying / 0.4) : 0,
    fl = fall * fall * (3 - 2 * fall);
  // the body: pitching and bobbing with the gallop, low in a crouch, stretched out in a leap; dead, rolled onto its side
  const side = hsh(id, 61) < 0.5 ? 1 : -1,
    Rroll = rotA([Math.cos(yaw), Math.sin(yaw), 0], side * fl * Math.PI * 0.5),
    pitch = Math.sin(ph * 2) * 0.09 * mvv + crouch * 0.12 - leap * 0.1,
    Rp = mm(Rroll, mm(Rz(yaw), Ryb(pitch))),
    lift = (Math.abs(Math.sin(ph)) * 1.6 * mvv - crouch * 5 + leap * 9) * k[1],
    Jp = [
      e.x - Math.cos(yaw) * 4,
      e.y - Math.sin(yaw) * 4,
      r[0][2] * k[1] * (1 - fl) + 4.5 * k[0] * fl + lift * (1 - fl),
    ];
  const flex = Math.sin(ph * 2) * 0.12 * mvv, // the back flexes and stretches with each stride
    Rb = mm(Rp, Ryb(flex - leap * 0.08)),
    Rc = mm(Rb, Ryb(-flex * 0.8 + crouch * 0.1)),
    Jb = add(Jp, mv(Rp, sc3(sub(r[1], r[0]), k))),
    Jc = add(Jb, mv(Rb, sc3(sub(r[2], r[1]), k)));
  D3(0, Rp, Jp);
  D3(1, Rb, Jb);
  D3(2, Rc, Jc);
  // the head: low and thrust forward at a run or crouched to spring, snapping; turned toward what it hunts
  const look = dead ? 0 : clamp(angDiff(yaw, e.hl ?? yaw), -0.8, 0.8),
    Rh = mm(
      Rc,
      mm(Rz(look * 0.7), Ryb(0.15 * mvv + crouch * 0.35 - leap * 0.2 + Math.sin(t * 9 + id) * 0.05 + fl * 0.4))
    ),
    Jh = add(Jc, mv(Rc, sc3(sub(r[3], r[2]), k)));
  D3(3, Rh, Jh);
  {
    const hc = add(Jh, mv(Rh, sc3([9, 0, 2.2], k))),
      p = 760 / (760 - hc[2]);
    e.__hx = e.x + (hc[0] - e.x) * p;
    e.__hy = e.y + 40 + (hc[1] - e.y - 40) * p;
    e.__ha = Math.atan2(Rh[3], Rh[0]);
    e.__hk = 0.32 * k[0];
    if (!dead) e.__ht = t;
  }
  // the legs: a rotary gallop (each foot its own moment in the stride); in a leap, the front pair reach and the hind
  // pair push out behind; crouched, the haunches gather under it; dead, stiff and out from its body
  const fwd = [Math.cos(yaw), Math.sin(yaw), 0],
    rt = [-Math.sin(yaw), Math.cos(yaw), 0],
    W = (lx, ly, lz) => [e.x + fwd[0] * lx + rt[0] * ly, e.y + fwd[1] * lx + rt[1] * ly, lz],
    stride = 9 * mvv * k[0];
  for (const [b1, front, sd, off] of [
    [4, true, 1, 0],
    [6, true, -1, 0.12],
    [8, false, 1, 0.55],
    [11, false, -1, 0.67],
  ]) {
    const s = ph + off * Math.PI * 2,
      top = add(b1 < 8 ? Jc : Jp, mv(b1 < 8 ? Rc : Rp, sc3(sub(r[b1], r[b1 < 8 ? 2 : 0]), k))),
      rx = r[b1][0] * k[0] + (front ? 1 : -1) * 0.6 * k[0];
    let paw;
    if (dead) paw = add(top, mv(Rp, sc3(front ? [3, sd * 2, -14] : [-5, sd * 2, -14], k)));
    else {
      const swing = Math.sin(s) * stride,
        up = Math.max(0, Math.cos(s)) * 4 * mvv * k[1];
      paw = W(
        rx + swing + (front ? leap * 13 : -leap * 9) + (front ? 0 : crouch * 3),
        sd * 3.6 * k[0],
        0.5 * k[1] + up + leap * (front ? 11 : 3)
      );
    }
    const pole = front ? mv(Rp, [-1, 0, -0.2]) : mv(Rp, [1, 0, 0.1]);
    if (front) limb(D, o, b1, b1 + 1, b1 < 8 ? Rc : Rp, top, paw, pole, k);
    else {
      // the hind leg: thigh and shin to the hock, then the long foot down to the paw
      const footL = len(sc3(sub(MODEL_END[b1 + 2], r[b1 + 2]), k)),
        hock = add(paw, mv(Rz(yaw), [-2 * k[0], 0, footL * 0.93])),
        [Rsh, H] = limb(D, o, b1, b1 + 1, Rp, top, dead ? add(paw, mv(Rp, sc3([-2, 0, 4], k))) : hock, pole, k),
        Rf = mm(rotTo(mv(Rsh, sub(MODEL_END[b1 + 2], r[b1 + 2])), sub(paw, H)), Rsh);
      D3(b1 + 2, Rf, H);
    }
  }
  // its looks: hide (and its darker fur), the eye over it, how solid it is, a hit's flare
  const q = o + NB * 12,
    fur = FURS[Math.floor(hsh(id, 63) * FURS.length)],
    fade = dead ? clamp(((e.keep || 0.55) - e.dying) / 1.5, 0, 1) : 1,
    fls = e.flash > 0 && !dead ? 0.12 * Math.min(1, e.flash / 0.05) : 0;
  D.set([e.x, e.y + 40, fade, fls], q);
  D.set([fur[0], fur[1], fur[2], 1], q + 4);
  D.set([fur[0], fur[1], fur[2], -1], q + 8);
  D.set([fur[0], fur[1], fur[2], 1.1], q + 12);
  D.set([fur[0] * 0.55, fur[1] * 0.55, fur[2] * 0.55, 0], q + 16);
  D.set([1 - fl * 0.25, 1 - fl * 0.25, 1 - fl * 0.25, -1], q + 20); // -1: its bare patches are raw
  D.set([0, 0, 0, 0.4 + hsh(id, 65) * 0.4], q + 24);
  D.set([0, 0, 0, hsh(id, 67)], q + 28);
}
// ---------- the egg sac: it breathes, and swells as it comes to hatch ----------
function poseEgg(e, D, o) {
  poolReset();
  const MM = FIG.models.egg;
  REST = MM.rest;
  MODEL_END = MM.ends;
  const id = e.id || 0,
    t = GS.time,
    dead = e.dying !== undefined,
    sw = clamp(1 - (e.hatch ?? 6) / 1.2, 0, 1), // the last moments before it splits
    beat = 1 + Math.sin(t * (2.2 + sw * 9) + id) * (0.035 + sw * 0.06) + sw * 0.14,
    k = (e.sc || 1) * MM.scale,
    col = dead ? Math.max(0, 1 - e.dying * 2.5) : 1, // shot, it bursts and sags
    R = mul3(Rz((e.a || 0) + hsh(id, 71) * 6), [k * beat, k * beat * (0.25 + 0.75 * col)]);
  bone(D, o, 0, R, [e.x, e.y, 0], REST[0]);
  for (let b = 1; b < NB; b++) bone(D, o, b, [0, 0, 0, 0, 0, 0, 0, 0, 0], [e.x, e.y, 0], REST[b]);
  const q = o + NB * 12,
    fade = dead ? clamp(((e.keep || 0.55) - e.dying) / 1.5, 0, 1) : 1,
    fls = e.flash > 0 && !dead ? 0.1 * Math.min(1, e.flash / 0.05) : 0;
  D.set([e.x, e.y + 40, fade, fls], q);
  D.set([0.6, 0.47, 0.42, 0], q + 4); // pale and fleshy
  D.set([0.6, 0.55, 0.35, -1], q + 8);
  D.set([0.6, 0.55, 0.35, 1.1], q + 12);
  D.set([0.22, 0.06, 0.12, 0], q + 16); // the veins, dark
  D.set([1, 1, 1, 0], q + 20);
  D.set([0, 0, 0, 0.3], q + 24);
  D.set([0, 0, 0, hsh(id, 73)], q + 28);
}
const poseFig = (e, D, o) => {
  const m = modelOf(e);
  return m === 'dog' ? poseDog(e, D, o) : m === 'egg' ? poseEgg(e, D, o) : poseZombie(e, D, o);
};
let POSE = poseFig;

// ---------- which figures draw in 3D ----------
// the model each of the dead is drawn with: by its type, its special kind or its elite trait
export function modelOf(e) {
  switch (e.type) {
    case 'wasp':
      return 'spitter';
    case 'flower':
      return 'screamer';
    case 'beetle':
      return 'brute';
    case 'hopper':
      return 'hopper';
    case 'mini':
      return 'zombie';
    case 'hound':
      return 'dog';
    case 'egg':
      return 'egg';
    case 'skitter': {
      if (e.shield) return 'riot';
      const k = e.kind,
        t = e.trait;
      if (k) return k === 'climb' ? 'lean' : k === 'spore' ? 'bloat' : k === 'drag' ? 'drag' : 'zombie';
      return t === 'runner'
        ? 'lean'
        : t === 'screamer'
          ? 'gaunt'
          : t === 'armored'
            ? 'armored'
            : t === 'bloater'
              ? 'bloat'
              : 'zombie';
    }
  }
  return null;
}
// the people-shaped dead, in all they do: walking, falling, lying, getting up, crawling, lying in wait, climbing out of
// the ground, missing an arm or its head, and painted into the street once they lie still
export function is3D(e) {
  if (e.__std || !fig3dOn()) return false;
  const m = modelOf(e);
  return !!m && !!FIG.models[m];
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
    groups = new Map(); // model (and detail) -> its figures
  let near = 0;
  for (const e of queue) {
    const d = Pl ? Math.hypot(e.x - Pl.x, e.y - Pl.y) : 0,
      full = d < 460 && FIG.drawn + near < 90,
      key = (modelOf(e) || 'zombie') + (full ? '' : '@1');
    if (full) near++;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  let n = 0;
  const runs = [];
  for (const [key, L] of groups) {
    runs.push([key, n, L.length]);
    for (const e of L) rows[n++] = e._r3;
  }
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
  for (const [key, from, cnt] of runs) draw(FIG.models[key] ? key : 'zombie', from, cnt);
  if (!m) {
    FIG.drawn += n;
    gl.disable(gl.DEPTH_TEST);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, null);
  }
  gl.bindVertexArray(null);
  gl.activeTexture(gl.TEXTURE0);
  gl.useProgram(GS.curProg.p);
}
