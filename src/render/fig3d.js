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
import { DOWN_T, downEl, downReal, lyState, pantsOf, supOK } from './draw-bodies.js';
import { GK, HEROIC, PER_M, TILT, gaitOfSpeed, strideLen } from '../core/scale.js';
import { FK, MOTION } from './motion.js';
import { FKC } from './motion-cmu.js';
import { flinch } from './flinch.js';
import { inert } from './inertia.js';
import { ragKnock, ragPose } from './ragdoll.js';
import { FEED, feeding } from '../actors/feeding.js';
// a 3D figure's heights against a pictured one's (whose shadows the lamps and the torch were tuned on): about 0.3
const SH3 = 0.3;

const NB = 22, // bones in a figure's skeleton at most (14 for most: tools/mesh/humanoid.mjs; 22 with recorded motion: fk22.mjs)
  TW = NB * 3 + 8, // texels in a figure's row: three for each bone's matrix, then its looks
  ROWS = 1024;
export const FIG = { models: null, n: 0, drawn: 0, calls: 0, tw: TW, figk: 1 }; // tw: texels in a figure's row; figk: a figure's units to the street's

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
      gl.enableVertexAttribArray(5);
      gl.vertexAttribIPointer(5, 1, gl.UNSIGNED_SHORT, 16, 14); // its own colour, for a thing painted corner by corner (region 99)
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
        kn: m.kn || null,
        hb: Math.max(
          0,
          m.bones.findIndex(b => b[0] === 'head')
        ), // its head's bone
        // the 14 bones it was made on (the poses worked out on those are moved on to its 22: see poseZombie22)
        rest14: m.b14 ? m.b14.map(b => b[2]) : null,
        ends14: m.b14 ? m.b14.map(b => b[3]) : null,
      };
      if (name.startsWith('v_') && !name.includes('@')) M[name].top = topOf(dv, base + m.vo, m.nv);
    }
    // each build against the ordinary zombie's: how wide its shoulders and hips, how long its arms and legs, how tall,
    // how big its head; the poses scale their reaches and steps by them
    // (measured on the 14 bones each was made on)
    const r14 = X => X.rest14 || X.rest,
      e14 = X => X.ends14 || X.ends,
      Z = M.zombie,
      L = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
      arm = X => L(r14(X)[4], r14(X)[5]) + L(r14(X)[5], e14(X)[5]);
    for (const X of Object.values(M))
      X.f = {
        bw: r14(X)[4][1] / r14(Z)[4][1],
        hw: r14(X)[8][1] / r14(Z)[8][1],
        ba: arm(X) / arm(Z),
        bl: r14(X)[8][2] / r14(Z)[8][2],
        bh: e14(X)[3][2] / e14(Z)[3][2],
        hs: L(r14(X)[3], e14(X)[3]) / L(r14(Z)[3], e14(Z)[3]),
      };
    FIG.models = M;
  } catch (err) {
    console.warn('Dead Acre: the 3D figures could not be read, so the pictures stand in', err);
  }
}
// a car's top, from its own corners: the highest in each 4-unit cell of its plan (a bullet's hole sits on it)
const TOPC = 4,
  TOPX = 32,
  TOPY = 12;
function topOf(dv, o, nv) {
  const h = new Float32Array(TOPX * TOPY);
  for (let i = 0; i < nv; i++) {
    const x = dv.getInt16(o + i * 16, true) / 256,
      y = dv.getInt16(o + i * 16 + 2, true) / 256,
      z = dv.getInt16(o + i * 16 + 4, true) / 256,
      cx = Math.floor(x / TOPC + TOPX / 2),
      cy = Math.floor(y / TOPC + TOPY / 2);
    if (cx >= 0 && cx < TOPX && cy >= 0 && cy < TOPY && z > h[cy * TOPX + cx]) h[cy * TOPX + cx] = z;
  }
  return h;
}
// how high a car's top stands at u along it, v across (0 if it isn't drawn in 3D)
export function carTop(c, u, v) {
  const T = c.veh3d && FIG.models?.[c.veh3d]?.top;
  if (!T) return 0;
  const cx = Math.floor(u / TOPC + TOPX / 2),
    cy = Math.floor(v / TOPC + TOPY / 2);
  return cx >= 0 && cx < TOPX && cy >= 0 && cy < TOPY ? T[cy * TOPX + cx] : 0;
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
layout(location=0) in vec3 aP; layout(location=1) in vec2 aN; layout(location=2) in uvec2 aB; layout(location=3) in vec4 aW; layout(location=4) in float aRow; layout(location=5) in uint aC;
uniform highp sampler2D uBones; uniform uint uHB; uniform float uTilt; uniform vec4 uCam; uniform int uMode; uniform vec2 uSun; uniform vec4 uLight; uniform vec4 uKt; uniform vec3 uKp;
out vec3 vC; out vec3 vN; out vec3 vO; out float vAO; out float vZ; out float vS; out vec4 vM; flat out vec4 vK; flat out float vPat; flat out vec3 vE; flat out vec3 vH; flat out vec3 vSk; flat out float vSty;
vec4 T(int x, int r){ return texelFetch(uBones,ivec2(x,r),0); }
const vec3 HAT[16]=vec3[16](vec3(0.55,0.1,0.08),vec3(0.8,0.78,0.72),vec3(0.1,0.12,0.2),vec3(0.06,0.06,0.07),vec3(0.86,0.7,0.1),vec3(0.86,0.38,0.07),vec3(0.82,0.82,0.78),vec3(0.2,0.32,0.2),
  vec3(0.4,0.4,0.42),vec3(0.36,0.1,0.12),vec3(0.6,0.48,0.18),vec3(0.16,0.26,0.48),vec3(0.75,0.6,0.15),vec3(0.5,0.46,0.34),vec3(0.3,0.22,0.16),vec3(0.62,0.12,0.1));
vec3 oct(vec2 e){ vec3 v=vec3(e,1.0-abs(e.x)-abs(e.y)); if(v.z<0.0) v.xy=(1.0-abs(v.yx))*vec2(v.x>=0.0?1.0:-1.0,v.y>=0.0?1.0:-1.0); return normalize(v); }
float h3(vec3 q){ return fract(sin(dot(q,vec3(127.1,311.7,74.7)))*43758.5453); }
float vn3(vec3 q){ vec3 i=floor(q), f=fract(q); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
// a burnt-out car's metal: its paint burnt off to rust and grey-white ash in broad patches, blackened with soot low
// down and over its wheels and where the fire came out of the windows, the roof bleached paler
vec3 burnt(vec3 p, vec3 n){
  float a=vn3(p*0.09)*0.65+vn3(p*0.27+7.0)*0.35;
  vec3 c=mix(vec3(0.29,0.165,0.1),vec3(0.44,0.42,0.39),smoothstep(0.42,0.62,a)); // rust, ash
  c=mix(c,c*vec3(1.15,0.9,0.75),smoothstep(0.62,0.8,vn3(p*0.5+3.0))*0.6); // flakes of scorched primer
  float soot=smoothstep(11.0,4.0,p.z)*0.75+smoothstep(0.5,0.0,n.z)*smoothstep(15.0,23.0,p.z)*0.5;
  c=mix(c,vec3(0.06,0.055,0.05),clamp(soot,0.0,0.85)*(0.7+0.3*vn3(p*0.4)));
  return c*mix(1.0,1.25,smoothstep(0.75,0.95,n.z)*smoothstep(20.0,26.0,p.z)); }
void main(){
  int r=int(aRow+0.5);
  vec3 p=uKp+(aP/256.0-uKp)*uKt.w+uKt.xyz, n=oct(aN);
  int b0=int(aB.x)*3, b1=int(aB.y)*3;
  vec4 a0=T(b0,r), a1=T(b0+1,r), a2=T(b0+2,r), c0=T(b1,r), c1=T(b1+1,r), c2=T(b1+2,r);
  vec3 w0=vec3(dot(a0.xyz,p)+a0.w,dot(a1.xyz,p)+a1.w,dot(a2.xyz,p)+a2.w), w1=vec3(dot(c0.xyz,p)+c0.w,dot(c1.xyz,p)+c1.w,dot(c2.xyz,p)+c2.w);
  vec3 n0=vec3(dot(a0.xyz,n),dot(a1.xyz,n),dot(a2.xyz,n)), n1=vec3(dot(c0.xyz,n),dot(c1.xyz,n),dot(c2.xyz,n));
  float w=aW.x; vec3 W=mix(w1,w0,w); vN=normalize(mix(n1,n0,w)); vO=p; vZ=W.z; vAO=aW.w;
  vec4 E=T(${NB * 3},r); // its eye (x, y), how solid it is, the flare of a hit
  vK=vec4(E.z,E.w,T(${NB * 3 + 7},r).w,T(${NB * 3 + 6},r).w);
  vec2 g;
  if(uMode==0){ g=W.xy-vec2(0.0,W.z*uTilt); } // seen from a camera tilted toward the top of the screen: each unit of height a little way up it
  else if(uMode==1){ g=W.xy+uSun*max(W.z,0.0); } // the moon's shadow
  else { vec2 d=W.xy-uLight.xy; float l=max(length(d),1.0); // a lamp's (uMode 2) or your flashlight's (3), thrown away from it
    float hz=max(W.z,0.0), off=uMode==2?min(uLight.w,hz*l/max(34.0,uLight.z-hz)):min(hz*${SH3}*(0.55+l/${(150 * GK).toFixed(2)}),hz*${SH3}+${(30 * GK).toFixed(2)}); /* the torch's: as long as the pictured figures' (sprites.js), never a ghost down the beam */
    g=W.xy+d/l*off; }
  vec2 s=(g-uCam.xy)/uCam.zw;
  gl_Position=vec4(s.x*2.0-1.0,1.0-s.y*2.0,clamp(0.5-(W.z+(W.y-E.y)*uTilt)/160.0,-1.0,1.0),1.0); // nearer the camera: higher, or further down the screen
  ${
    shadow
      ? 'vC=vec3(0.0); vS=0.0; vPat=0.0; vM=vec4(0.0); vE=vec3(0.0); vH=vec3(0.0); vSk=vec3(0.0); vSty=0.0;'
      : `// its colour: what this corner is (region), in this figure's own skin, shirt, trousers, hair and shoes
  int reg=int(aW.y*255.0+0.5); float u=aW.z;
  vec4 SK=T(${NB * 3 + 1},r), SH=T(${NB * 3 + 2},r), PA=T(${NB * 3 + 3},r), HA=T(${NB * 3 + 4},r), TI=T(${NB * 3 + 5},r), X6=T(${NB * 3 + 6},r), X7=T(${NB * 3 + 7},r);
  vec3 c=SK.rgb; float shirt=0.0;
  if(reg==1) c=SK.w>0.5?HA.rgb:SK.rgb*0.92;
  else if(reg==3||reg==4) shirt=SH.w>-0.5?1.0:0.0;
  else if(reg==6) shirt=SH.w>0.5&&(SH.w>1.5||u<0.62)?1.0:0.0;
  else if(reg==7) shirt=SH.w>1.5&&u<0.92?1.0:0.0;
  if(shirt>0.5) c=SH.rgb;
  // a stump: raw and dark where a lost limb (or its head) was torn away
  int lostM=int(X6.x+0.5);
  bool l0=((lostM>>int(aB.x))&1)==1, l1=((lostM>>int(aB.y))&1)==1;
  if(l0||l1){ float bw=l0?1.0:clamp((1.0-aW.x)*2.4,0.0,1.0); c=mix(c,vec3(0.32,0.04,0.035),bw); shirt*=1.0-bw; }
  else if(reg==5||reg==9) c=PA.rgb;
  else if(reg==10) c=u<PA.w?PA.rgb:SK.rgb;
  else if(reg==11) c=HA.w>0.5?SK.rgb*0.8:vec3(0.13,0.11,0.1);
  else if(reg==12) c=vec3(0.74,0.72,0.62);
  else if(reg==13) c=vec3(0.22,0.05,0.05);
  else if(reg==14) c=vec3(0.17,0.18,0.16); // a plate carrier
  else if(reg==15) c=vec3(0.12,0.13,0.15); // a helmet
  else if(reg==16) c=vec3(0.07,0.075,0.085); // a riot shield, black and scuffed
  else if(reg==18) c=HAT[int(X6.y)&15]; // a hat, in its own colours
  else if(reg==19) c=HAT[(int(X6.y)>>4)&15];
  else if(reg==20) c=vec3(0.66,0.54,0.24); // brass: a badge
  else if(reg==21) c=vec3(0.8,0.8,0.76); // the white band across a riot shield
  else if(reg==22) c=vec3(0.04,0.05,0.06); // its window
  else if(reg==23) { c=SH.rgb*0.35; shirt=0.0; } // a hood's edge round the face, in its shadow
  else if(reg==24) c=vec3(0.27,0.28,0.2); // a backpack, olive canvas
  else if(reg==25) c=vec3(0.075,0.08,0.085); // a gun's blued steel
  else if(reg==26) c=vec3(0.15,0.145,0.13); // its polymer
  else if(reg==27) c=vec3(0.95,0.92,0.8); // the lens of its light
  else if(reg==28) c=vec3(0.07,0.065,0.06); // a sole, black rubber
  else if(reg==29) c=vec3(0.11,0.11,0.1); // a glove
  else if(reg==42) c=(HA.w>0.5?SK.rgb*0.8:vec3(0.13,0.11,0.1))*1.9+0.03; // a boot's laces
  else if(reg==43) c=(HA.w>0.5?SK.rgb*0.8:vec3(0.13,0.11,0.1))*0.7; // its collar and toe cap, darker leather
  // a car: its own paint, glass, trim, tyres, lamps (lit, they shine), a police car's white doors, a truck's box or tank
  else if(reg==30) c=SH.rgb;
  else if(reg==31) c=vec3(0.06,0.075,0.09);
  else if(reg==32) c=vec3(0.05,0.05,0.055);
  else if(reg==33) c=vec3(0.035,0.033,0.032);
  else if(reg==34) c=vec3(0.8,0.8,0.74);
  else if(reg==35) c=vec3(0.48,0.05,0.04);
  else if(reg==36) c=vec3(0.8,0.8,0.78);
  else if(reg==37) c=vec3(0.075,0.075,0.075);
  else if(reg==38) c=vec3(0.58,0.6,0.62);
  else if(reg==39) c=vec3(0.52,0.08,0.06);
  else if(reg==40) c=burnt(p,n);
  else if(reg==41) c=vec3(0.6,0.6,0.58);
  else if(reg==44) c=vec3(0.06,0.12,0.55);
  else if(reg==45) c=vec3(0.3,0.17,0.09); // a gun's walnut
  else if(reg==99){ c=vec3(float((aC>>11)&31u)/31.0,float((aC>>5)&63u)/63.0,float(aC&31u)/31.0); c*=c; } // its own colour (a thing to pick up: tools/mesh/pickups.mjs)
  else if(reg==17) c=TI.w<-0.5?vec3(0.3,0.1,0.08):SK.rgb*vec3(1.08,0.96,0.7); // raw flesh (on a dog), or swollen, stretched and veined
  vC=c*TI.rgb; vS=shirt; vPat=TI.w;
  bool hd=aB.x==uHB&&aW.x>0.5; // on the head
  float gloss=reg==31?1.0:reg==30||reg==36||reg==39?0.55:reg==38||reg==41?0.35:reg==99?0.3:0.0; // a car's paint and glass catch the sky
  if(reg==25) gloss=0.45; // a gun's steel: its edges catch the sky as metal does
  vM=vec4(reg==5||reg==9||reg==10?1.0:0.0, hd&&reg==1?1.0:0.0, reg>=30||reg==25?gloss:hd&&reg==0?1.0:0.0, reg==12?1.0:reg==34?X7.w:reg==35?X7.w*0.45:0.0); // trousers, scalp, face (a car's gloss), eyes (a car's lamps, lit)
  vE=X7.xyz; vH=HA.rgb; vSk=SK.rgb; vSty=X6.z;`
  }
}`;
const NOISE = `
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<3;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=0.5; } return s*1.15; }`;
const DRESS = `
float hsh(float x){ return fract(sin(x*91.7)*43758.5); }
// what it died in, painted on the body as it was cut (o: the body's own place, made to the ordinary build): the
// uniforms with their badges and bands, the jackets, the hoodie's pocket, a tie, a cardigan's buttons
float inb(vec2 p, vec2 c, vec2 h){ vec2 d=abs(p-c)-h; return step(max(d.x,d.y),0.0); }
vec3 dress(vec3 c, vec3 o, int v, float sm, float pm, float seed){
  float ay=abs(o.y), z=o.z, tor=step(ay,6.9)*step(29.0,z), fr=smoothstep(0.3,1.3,o.x), bk=smoothstep(-0.3,-1.3,o.x), arm=step(7.4,ay);
  vec3 s=c, pc=c;
  vec3 refl=vec3(0.86,0.76,0.2), silv=vec3(0.8,0.8,0.78);
  if(v==2){ // a work shirt: two chest pockets, a placket, stains
    float pk=fr*inb(vec2(ay,z),vec2(2.4,41.6),vec2(1.15,1.4)); s=mix(s,s*0.78,pk); s=mix(s,s*0.6,fr*inb(vec2(ay,z),vec2(2.4,43.0),vec2(1.2,0.12)));
    s=mix(s,s*0.62,fr*step(ay,0.12)*tor); s=mix(s,s*vec3(0.75,0.68,0.5),smoothstep(0.6,0.75,vn(o.yz*0.5+seed))); }
  else if(v==3){ // a police uniform: badge, name tag, shoulder patches, the placket; a duty belt
    s=mix(s,vec3(0.72,0.6,0.26),fr*step(length(vec2(o.y+2.6,(z-42.4)*0.9)),0.75));
    s=mix(s,vec3(0.7,0.66,0.48),fr*inb(vec2(o.y,z),vec2(2.6,42.1),vec2(0.95,0.28)));
    s=mix(s,vec3(0.5,0.42,0.2),arm*step(abs(o.x),1.7)*inb(vec2(ay,z),vec2(9.6,40.2),vec2(1.4,1.4)));
    s=mix(s,s*0.55,fr*step(ay,0.14)*tor);
    float belt=step(30.7,z)*step(z,32.7); pc=mix(pc,vec3(0.05,0.05,0.055),belt); pc=mix(pc,vec3(0.6,0.5,0.25),belt*fr*step(ay,0.8));
    pc=mix(pc,vec3(0.04),belt*inb(vec2(o.y,o.x),vec2(-5.0,0.0),vec2(1.0,2.0))); } // its holster, empty
  else if(v==4){ // scrubs: a V at the neck, a badge clipped to the pocket
    s=mix(s,vSk*0.86,fr*step(41.2,z)*step(ay,(z-41.2)*0.55)); s=mix(s,vec3(0.88,0.88,0.85),fr*inb(vec2(o.y,z),vec2(-2.6,41.0),vec2(0.85,0.55)));
    s=mix(s,s*0.7,fr*step(abs(z-39.6),0.08)*step(abs(o.y+2.6),1.2)); }
  else if(v==5){ // a firefighter's turnout coat and trousers: yellow bands with silver down their middle
    float b=max(max(step(abs(z-40.2),0.75),step(abs(z-33.4),0.75))*tor,arm*step(abs(z-28.4),0.7)); float m=b*step(abs(fract(z*0.5)-0.5),0.0);
    s=mix(s,refl,b); s=mix(s,silv,b*(step(abs(z-40.2),0.25)+step(abs(z-33.4),0.25)+step(abs(z-28.4),0.25))*(1.0-m));
    float pb=step(abs(z-8.2),0.7); pc=mix(pc,refl,pb); pc=mix(pc,silv,pb*step(abs(z-8.2),0.25)); }
  else if(v==6){ // a road crew's hi-vis vest over a grey tee: bands round the middle, braces over the shoulders
    float vest=tor*step(ay,6.3)*step(31.3,z)*(1.0-fr*step(ay,0.55));
    float bands=(step(abs(z-36.6),0.42)+step(abs(z-40.0),0.42)+step(41.0,z)*step(abs(ay-2.5),0.45)*max(fr,bk))*vest;
    s=mix(s,vec3(0.94,0.42,0.07),vest); s=mix(s,silv,min(bands,1.0)); }
  else if(v==7){ // a trucker's denim jacket, its sherpa collar
    s=mix(s,vec3(0.84,0.78,0.66)*(0.85+0.3*vn(o.yz*3.0)),tor*step(44.2,z)); s=mix(s,s*0.6,fr*step(abs(o.y-0.3),0.12)*tor);
    s=mix(s,s*0.75,fr*inb(vec2(ay,z),vec2(2.6,41.5),vec2(1.2,1.1))); }
  else if(v==8){ // a biker's leather cut over a pale shirt, the club's patch on its back
    float cut=tor*step(ay,6.5)*step(31.0,z)*(1.0-fr*step(ay,1.5)); s=mix(s,vec3(0.07,0.065,0.065),cut);
    float pt=bk*inb(vec2(ay,z),vec2(0.0,40.2),vec2(3.3,3.0)), rk=bk*step(ay,3.6)*(step(abs(z-44.0),0.5)+step(abs(z-36.4),0.5));
    s=mix(s,vec3(0.52,0.14,0.08),pt); s=mix(s,vec3(0.78,0.7,0.52),min(rk,1.0)*cut); }
  else if(v==9){ // a funeral suit: the white shirt in the V of the jacket, a black tie
    float vv=fr*step(37.4,z)*step(z,45.6)*step(ay,(z-37.4)*0.42); s=mix(s,vec3(0.8,0.8,0.76),vv);
    s=mix(s,vec3(0.06,0.04,0.05),vv*step(ay,0.36+(45.0-z)*0.025)*step(36.0,z)); s=mix(s,s*1.6,fr*step(abs(ay-(z-37.4)*0.42-0.5),0.1)*step(37.4,z)*step(z,44.5)); }
  else if(v==10){ // burial clothes: pale linen, grave dirt in it
    s*=mix(vec3(1.0),vec3(0.55,0.47,0.36),smoothstep(0.45,0.75,fbm(o.yz*0.35+o.x*0.2+seed))); }
  else if(v==11){ // a groundskeeper's coveralls: the zip down the front, a chest pocket
    s=mix(s,vec3(0.2,0.2,0.18),fr*step(ay,0.18)*step(30.0,z)*step(z,45.2)); s=mix(s,s*0.72,fr*inb(vec2(o.y,z),vec2(-2.5,41.6),vec2(1.2,1.2)));
    pc=mix(pc,pc*0.62,step(abs(z-31.8),0.35)); }
  else if(v==12){ // a hoodie: the pocket across its belly, the drawstrings
    float pk=fr*inb(vec2(ay,z),vec2(0.0,34.2),vec2(3.4,1.7)); s=mix(s,s*0.78,pk); s=mix(s,s*0.6,fr*step(abs(ay-3.4),0.15)*step(abs(z-34.2),1.7));
    s=mix(s,vec3(0.76,0.74,0.68),fr*step(abs(ay-0.9),0.13)*step(40.6,z)*step(z,45.0)); s=mix(s,s*0.7,step(abs(z-30.5),0.5)); }
  else if(v==13){ // a stone-washed denim jacket: orange topstitching, the yoke, the pockets
    s*=0.82+0.36*fbm(o.yz*0.7+seed); vec3 st=vec3(0.78,0.46,0.16);
    s=mix(s,st,tor*step(abs(z-43.2),0.11)); s=mix(s,st,fr*step(abs(ay-0.7),0.09)*tor);
    s=mix(s,st,fr*(1.0-inb(vec2(ay,z),vec2(2.7,41.5),vec2(1.0,1.0)))*inb(vec2(ay,z),vec2(2.7,41.5),vec2(1.15,1.15))); }
  else if(v==14){ // a quilted puffer jacket: fat baffles all over, a dirty sheen
    s*=0.66+0.42*smoothstep(-0.9,0.9,sin(z*1.75)); }
  else if(v==15){ // an office shirt, the tie still knotted at the throat, sweat under the arms
    float tie=fr*step(ay,0.34+(45.2-z)*0.035)*step(35.0,z)*step(z,45.4); vec3 tc=hsh(seed)>0.5?vec3(0.36,0.08,0.1):vec3(0.1,0.14,0.3);
    s=mix(s,mix(tc,tc*1.5,step(0.5,fract((o.y+z)*0.7))),tie); s=mix(s,s*vec3(0.84,0.82,0.7),tor*step(4.4,ay)*step(abs(z-40.6),1.8));
    s=mix(s,s*1.12,fr*step(44.6,z)*step(ay,2.6)); }
  else if(v==16){ // an undershirt: the arms bare to the shoulder, a scooped neck
    s=mix(s,vSk*0.86,tor*step(4.6,ay)*step(41.0,z)); s=mix(s,vSk*0.86,fr*step(43.6,z)*step(ay,2.6)); }
  else if(v==17){ // a cardigan, knitted, open on a pale shirt, buttons down its edge
    s*=0.9+0.12*sin(z*6.0); float op=fr*step(ay,1.5)*tor; s=mix(s,vec3(0.72,0.7,0.62),op);
    s=mix(s,vec3(0.12,0.1,0.08),fr*step(abs(o.y+1.85),0.3)*step(fract(z/2.3),0.22)*tor*step(z,44.0)); }
  else if(v==18){ // a black dress for a funeral, a grey knitted shawl over the shoulders
    float sw=max(tor*step(42.4,z),arm*step(37.5,z)); s=mix(s,vec3(0.46,0.45,0.48)*(0.9+0.14*sin(o.y*5.0+z*2.0)),sw); }
  return mix(mix(c,s,sm),pc,pm*step(0.5,1.0-sm));
}
`;
const FS = shadow => `#version 300 es
precision highp float; precision highp int;
uniform float uShA; uniform int uInk;
in vec3 vC; in vec3 vN; in vec3 vO; in float vAO; in float vZ; in float vS; in vec4 vM; flat in vec4 vK; flat in float vPat; flat in vec3 vE; flat in vec3 vH; flat in vec3 vSk; flat in float vSty;
uniform vec4 uB; uniform vec4 uHC; uniform int uKit;
${shadow ? 'layout(location=0) out vec4 o0;' : 'layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;'}
${shadow ? '' : NOISE + DRESS}
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
  if(pat>=10&&uKit==0) c=dress(c,vec3(vO.x/uB.x,vO.y/uB.y,vO.z-uB.z),pat-10,vS,vM.x,seed); // a uniform, a jacket, a dress: who it was
  // its head: a beard, stubble, a bandana over the scalp
  int sty=int(vSty+0.5);
  if(sty>0&&uKit==0){ vec3 q=(vO-uHC.xyz)/uHC.w;
    if(sty==1||sty==2) c=mix(c,vH*0.8,vM.z*step(0.9,q.x)*step(q.z,-0.4)*step(-4.4,q.z)*(0.75+0.25*vn(q.yz*6.0)));
    if(sty==2) c=mix(c,mix(vec3(0.5,0.09,0.07),vec3(0.82,0.76,0.64),step(0.68,vn(q.yz*3.2+q.x))),vM.y);
    if(sty==3) c=mix(c,vSk*0.62*(0.8+0.4*vn(q.yz*9.0)),vM.y); }
  if(vK.w<-0.5) c*=0.9+0.16*fbm(vO.xy*0.06+vO.z*0.05+seed); // a car: grime in broad patches, not a cloth's weave
  else c*=0.8+0.34*fbm(vO.yz*0.42+vO.x*0.3+seed); // dirt, wear, the cloth's weave and the skin's mottling
  float bl=smoothstep(0.58,0.7,fbm(vO.xz*0.16+vO.y*0.11+seed*1.7))*max(vK.w,0.0); // old blood, soaked in
  c=mix(c,vec3(0.21,0.03,0.025),bl*0.9);
  bool pk=vK.w<-1.5; // a thing to pick up (posePick): low on the street, so not darkened as a figure's feet are
  float sh=(0.46+0.54*pow(nz,1.2))*mix(1.0,vAO,0.7)*(pk?mix(0.8,1.0,smoothstep(0.0,5.0,vZ)):mix(0.62,1.0,smoothstep(0.0,26.0,vZ)));
  vec3 em=vec3(0.5,0.64,0.82)*pow(1.0-nz,1.7)*0.3+vec3(pk?0.0:vK.y)+vE*vM.w;
  // ...and now and then a shine runs across it, corner to corner (vK.y: where the band is, in its own units), as light
  // catches a lid or a can: what tells you at a glance it's a thing you could take, not more of the street
  if(pk) em+=vec3(1.0,0.93,0.78)*0.75*exp(-pow((vO.x*0.8-vO.y*0.6-vK.y)/1.7,2.0))*(0.35+0.65*nz);
  if(sty==0) em+=vec3(0.42,0.52,0.66)*vM.z*(0.1*smoothstep(0.55,1.0,nz)*(0.55+0.45*vn(vO.xy*0.07+seed))+0.12*pow(1.0-nz,2.5)); // a car's paint and glass, the sky in them // the moon on its edges; a hit's flare; its eyes, if they shine
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
  // (a jump in its pose since last frame eased out: inertia.js)
  const MM = e.__MM;
  if (
    MM &&
    e.dying === undefined &&
    !(e.down > 0) &&
    !e.gone &&
    !e.crawl &&
    !e.half &&
    !e.ride &&
    !(e.hp <= 0 && e === GS.P)
  )
    inert(e, DATA, e._r3 * TW * 4, MM, e === GS.P || !!e.npc, DATA[e._r3 * TW * 4 + NB * 12 + 24] | 0);
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
// (given the limb's own turns, Rb, as posed: each bone turned from its own only as far as it must be to reach, so
// its twist about its length is kept: reaching where it already is, it stays exactly as it was)
function limb(D, o, b1, b2, Rp, A, tgt, pole, k, Rb) {
  const r = REST,
    j1 = r[b1],
    j2 = r[b2],
    j3 = MODEL_END[b2],
    u1 = sc3(sub(j2, j1), k),
    u2 = sc3(sub(j3, j2), k),
    [M, E] = ik(A, tgt, len(u1), len(u2), pole),
    B1 = Rb ? Rb[0] : Rp,
    R1 = mm(rotTo(mv(B1, u1), sub(M, A)), B1),
    B2 = Rb ? mm(rotTo(mv(B1, u1), sub(M, A)), Rb[1]) : R1,
    R2 = mm(rotTo(mv(B2, u2), sub(E, M)), B2);
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
// ---------- what the ordinary dead wear: who they were (e.v, the 2D pictures' outfit; e.hv, their head) ----------
const DRESSED = { zombie: 1, lean: 1, gaunt: 1, bloat: 1 },
  LONG = { 0: 1, 1: 1, 2: 1, 3: 1, 5: 1, 7: 1, 8: 1, 9: 1, 11: 1, 12: 1, 13: 1, 14: 1, 17: 1, 18: 1 }, // sleeves to the wrist
  FULL = { 3: 1, 4: 1, 5: 1, 6: 1, 9: 1, 11: 1 }, // uniforms: full-length trousers
  CAPS = [0, 2, 3, 7, 8, 9, 11, 13], // a cap's colours (the shader's HAT list)
  KNITS = [3, 8, 9, 7, 10, 11, 2, 0];
// e's look for this model, worked out once: its pattern or outfit, sleeves, trousers, hair, what it wears on its head
const RK_SKIN = [0.66, 0.5, 0.42]; // Roadkill: sunburnt, bruised, road-rashed
function lookOf(e, name, id) {
  if (e._lk && e._lk.m === name) return e._lk;
  if (name === 'roadkill')
    return (e._lk = {
      m: name,
      kits: null,
      pat: 26, // bare to the waist (DRESS 16)
      slv: 0,
      pa: [0.2, 0.22, 0.27], // work jeans, black with road
      paw: 1.1,
      ha: [0.1, 0.08, 0.07],
      bald: true,
      sty: 0,
      hat: 0,
    });
  if (name === 'chief')
    return (e._lk = {
      m: name,
      kits: ['fire'],
      pat: 15, // his turnout coat: the yellow and silver bands (DRESS 5)
      slv: 2,
      pa: [0.46, 0.38, 0.22], // the turnout trousers, bands at the shins
      paw: 1.1,
      ha: [0.16, 0.13, 0.1],
      bald: true,
      sty: 0,
      hat: 6 + 16 * 3, // a chief's white helmet
    });
  const kd = e.kind,
    v = e.v || 0,
    // the head to go with a uniform: the biker's bandana, the trucker's cap, combed for the funeral, the groundskeeper's cap
    hv = v === 8 ? 9 : v === 7 ? 8 : v === 9 ? 10 : v === 11 ? 7 : e.hv || 0,
    dressed = DRESSED[name] && !kd && (e.type === 'skitter' || e.type === 'mini'),
    L = { m: name, kits: null, pat: 0, slv: 1, pa: null, paw: 1.1, ha: null, bald: false, sty: 0, hat: 0 };
  L.ha = HAIR[Math.floor(hsh(id, 33) * HAIR.length)];
  L.bald = hsh(id, 37) >= 0.7;
  if (!dressed) {
    if (name === 'riot') L.kits = ['shield'];
    return (e._lk = L);
  }
  L.pat = v === 0 ? Math.floor(hsh(id, 47) * 5) : v === 1 ? 1 : 10 + v;
  L.slv = v === 16 ? 0 : LONG[v] ? 2 : 1;
  const pc = pantsOf(e);
  L.pa = Array.isArray(pc) ? pc : PANTS[Math.floor(hsh(id, 31) * PANTS.length)];
  L.paw = v === 18 ? 0 : FULL[v] || hsh(id, 39) >= 0.25 ? 1.1 : 0.62;
  // the head: a hat for the job, or what it wore that day; hair long or up, a beard, a shaved head, a bandana
  const r = hsh(id, 51);
  let head = null;
  if (hv === 3) head = 'police';
  else if (hv === 5) head = 'fire';
  else if (hv === 6) head = 'hard';
  else if (hv === 7 || hv === 8) head = 'cap';
  else if (hv === 11) head = 'long';
  else if (hv === 12) head = 'beanie';
  else if (hv === 15) head = 'bun';
  else if (hv === 16) head = 'capb';
  else if (hv === 17) head = 'hood';
  else if (hv === 9 || hv === 10 || hv === 13) head = null;
  else head = r < 0.2 ? 'long' : r < 0.26 ? 'bun' : r < 0.36 ? 'cap' : r < 0.42 ? 'beanie' : null;
  if (v === 18 && !head) head = r < 0.6 ? 'long' : 'bun'; // the mourners
  const c1 = CAPS[Math.floor(hsh(id, 53) * CAPS.length)];
  L.hat =
    head === 'police'
      ? 2 + 16 * 3
      : head === 'fire'
        ? (hsh(id, 55) < 0.5 ? 3 : 12) + 16 * 3
        : head === 'hard'
          ? [4, 5, 6][Math.floor(hsh(id, 55) * 3)]
          : head === 'cap' && v === 11
            ? 7 + 16 * 7 // a groundskeeper's: green
            : head === 'cap' && (hv === 7 || hv === 8)
              ? 0 + 16 * 1 // a trucker's cap: red front, white mesh back
              : head === 'beanie'
                ? KNITS[Math.floor(hsh(id, 55) * KNITS.length)]
                : c1 + 16 * c1;
  if (hv === 15) L.ha = [0.6, 0.6, 0.58];
  else if (hv === 14) L.ha = [0.62, 0.5, 0.3];
  else if (hv === 10) L.ha = [0.12, 0.1, 0.09];
  if (head === 'long' || head === 'bun' || hv === 10 || hv === 14 || hv === 15) L.bald = false;
  L.sty = hv === 9 ? 2 : hv === 13 ? 3 : head !== 'long' && head !== 'bun' && v !== 18 && hsh(id, 57) < 0.18 ? 1 : 0;
  if (hv === 13) L.bald = true;
  const kits = [];
  if (head) kits.push(head);
  if (v === 12 && head !== 'hood') kits.push('hoodd');
  L.kits = kits.length ? kits : null;
  return (e._lk = L);
}
// its eyes, lit: an elite's catch the light like an animal's (amber, blinking now and then); the others' throw back
// your flashlight when they look straight down it at you
function eyeGlow(e, out) {
  out[0] = out[1] = out[2] = 0;
  if (e.dead || e.dormant || e.dying !== undefined || e.down > 0) return out;
  const v = e.sv ?? 1;
  if (e.elite) {
    if (v < 0.55) return out;
    const bl = Math.sin(GS.time * 0.9 + (e.id || 0) * 1.7) > 0.96 ? 0.15 : 1;
    out[0] = 0.9 * v * bl;
    out[1] = 0.42 * v * bl;
    out[2] = 0.08 * v * bl;
    return out;
  }
  const P = GS.P;
  if (!P || GS.state === 'menu') return out;
  const dx = e.x - P.x,
    dy = e.y - P.y,
    d = Math.hypot(dx, dy);
  if (d > 560 || d < 40) return out;
  const da = Math.atan2(dy, dx),
    off = Math.abs(angDiff(P.aimA, da)),
    face = Math.abs(angDiff(e.__ha ?? e.a, da + Math.PI));
  if (off > 0.42 || face > 0.9) return out;
  const k = (1 - off / 0.42) * (1 - face / 0.9) * (1 - d / 560) * v * 1.6;
  out[0] = k;
  out[1] = k * 0.95;
  out[2] = k * 0.78;
  return out;
}
const EYE = [0, 0, 0];
// life size in the street (core/scale.js: 20 units to the metre, and a touch over): the models are a grown man 55
// tall, so 0.64 of that is 1.75 m; a big dog 1.1 m from nose to tail; the brute a little bigger again
const FIGK = ((1.75 * PER_M) / 55) * HEROIC,
  DOGK = 0.45 * HEROIC;
FIG.figk = FIGK;
// how this one walks, its own from the start (a hash of who it is): how much it rolls from side to side, how far it
// leans into the walk and lurches forward now and then, how high it lifts its feet (a shuffler barely does), how wide
// it stands and turns its toes out, one leg taking a shorter step than the other, its head nodding or hanging to a
// side, its shoulders twisting, its arms swinging or hardly at all
function gaitOf(e) {
  if (e._g && e._g.id === e.id) return e._g;
  const id = e.id || 0,
    h = n => hsh(id, 200 + n),
    shuffle = h(1) < 0.3;
  e._g = {
    id: e.id,
    sway: 0.55 + h(2) * 1.2,
    lean: -0.04 + h(3) * 0.3,
    lurch: h(4) < 0.35 ? 0.35 + h(5) * 0.4 : 0,
    lift: shuffle ? 0.2 + h(6) * 0.25 : 0.8 + h(6) * 0.6,
    stance: 0.8 + h(7) * 0.55,
    toe: -0.1 + h(8) * 0.45,
    hitch: h(9) < 0.4 ? 0.55 + h(10) * 0.3 : 1,
    hs: h(11) < 0.5 ? 1 : -1,
    bob: h(12) < 0.4 ? 0.05 + h(13) * 0.1 : 0,
    tilt: h(14) < 0.3 ? (h(15) - 0.5) * 0.9 : 0,
    twist: h(16) * 0.12,
    arms: h(17) < 0.25 ? 0.25 : 0.7 + h(18) * 0.7,
  };
  return e._g;
}
// a lurch: every few steps it pitches forward and catches itself (0..1, a short pulse)
const lurchOf = (e, ph) => Math.pow(Math.max(0, Math.sin(ph * 0.25 + (e.id || 0) * 1.3)), 10);
function poseZombie(e, D, o) {
  poolReset();
  const name = modelOf(e) || 'zombie',
    MM = FIG.models[name] || FIG.models.zombie,
    F = MM.f;
  REST = MM.rest14 || MM.rest;
  MODEL_END = MM.ends14 || MM.ends;
  const r = REST,
    dead = e.dying !== undefined,
    id = e.id || 0,
    bs = (e.sc || 1) * MM.scale * FIGK * (e.bs || 1) * (name === 'brute' ? 1.2 : 1),
    k = [bs * (0.5 + 0.5 * (e.bw || 1)), bs], // its size (across, up): its kind's, its own height and build
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
  let yaw = e.c3d && e._ax ? e._ax.yaw : e.a || 0,
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
      A = crawl ? crawlHd(e) : (e.fallA ?? e.a + Math.PI), // where its head points as it lies
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
        // hand over hand: a hand reaches out ahead and is put down on the street; there it stays while the body is
        // hauled up to it, then it's lifted and reaches out again, the hands by turns. The crawl goes by the ground
        // it covers, not the clock (a planted hand doesn't slide; stopped, it finishes a reach and rests on both)
        const C = crawlOf(e, Jp, hd, kh, kw, gz);
        hands = C.hands;
        if (e.pin && e.lurk === 'grab' && GS.P && !dead) hands[0] = [GS.P.x, GS.P.y, gz + 2]; // pinned, it has your ankle
        Jp = C.Jp;
        chestSide = C.roll;
        headUp = -0.5 + C.bob;
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
  const G = gaitOf(e),
    mvv = dead || ground ? 0 : Math.min(1, Math.hypot(e.vx || 0, e.vy || 0) / 50),
    ph = (e.stride || 0) * Math.PI * 2,
    run = !!e.run,
    limp = e.limp && !run,
    em = e.emerge < 1 ? e.emerge : 1,
    fk = e.flT > 0 && !dead ? (e.flT / 0.16) * (IN22 ? 0.3 : 1) : 0, // (on the 22, a little: the recorded hit does the rest)
    U = uprightK,
    // each kind's own moves (0..1): the brute rearing, charging, stunned against a wall; the bloater swelling to burst;
    // the spitter hunched to spit; the screamer drawing breath and screaming, head back and arms out; the riot cop
    // shoving with its shield; the climber on all fours
    live = !dead && !ground,
    rear = eased(e, 'rear', live && brute && e.st === 'rear' ? Math.min(1, (0.7 - (e.stT || 0)) / 0.3) : 0),
    chg = eased(e, 'chg', live && brute && e.st === 'charge' ? 1 : 0),
    stun = eased(e, 'stun', live && brute && e.st === 'stun' ? 1 : 0),
    swl = live && hop && e.st === 'swell' ? clamp(e.swell || 0, 0, 1) : 0,
    spt = eased(e, 'spt', live && spit && e.charging > 0 ? 1 : 0),
    scrm = live
      ? name === 'screamer'
        ? e.open || 0
        : name === 'gaunt' && e.scrIn > 0
          ? clamp(1 - e.scrIn / 0.95, 0, 1)
          : 0
      : 0,
    bash = eased(e, 'bash', live && riot && e.st === 'bash' ? 1 : live && riot && e.st === 'bashW' ? -0.5 : 0, 16),
    climb = live && e.kind === 'climb',
    hu = run ? 0 : brute ? 0.55 + stun * 0.4 : (e.hunch || 0) + spt * 0.6 + (name === 'drag' ? 0.5 : 0),
    sway =
      ((run ? 0.8 : limp ? 2.8 : fat ? 3.2 : brute ? 2.2 : 1.6) *
        Math.sin(ph) *
        mvv *
        (run ? 1 : (e.swK || 1) * G.sway) +
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
        mvv * (run ? 0.25 : 0.06) +
        (run ? 0 : G.lean + G.lurch * lurchOf(e, ph) * mvv) -
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
      mm(
        Ryb(lean * 0.3 + chestBend * 0.5),
        Rz(-sway * 0.8 + Math.sin(ph) * (0.08 + G.twist) * mvv + chestSide * 0.5 + tw0)
      )
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
      (climb ? 1.0 : 0) +
      Math.sin(ph * 2) * G.bob * mvv, // its head nodding with each step, if it does
    loll = (hsh(id, 7) - 0.5) * 0.5 + Math.sin(t * 0.9 + id) * 0.08 * (dead ? 0 : 1) + G.tilt,
    Rh = mm(Rc, mm(Rz(look * 0.8), mm(Ryb(droop - lean * 0.4), Rxb(loll)))),
    Jh = add(Jc, mv(Rc, sc3(sub(r[3], r[2]), k)));
  D3(3, Rh, Jh);
  // where its head is, for the eyes the flashlight catches and the breath a lurker gives itself away by
  {
    const hc = add(Jh, mv(Rh, sc3(mul(sub(MODEL_END[3], r[3]), 0.55), k)));
    e.__hx = hc[0];
    e.__hy = hc[1] - hc[2] * TILT; // where its head is drawn (the tilt)
    e.__lhx = e.__hx;
    e.__lhy = e.__hy;
    e.__ha = Math.atan2(Rh[3], Rh[0]);
    e.__hk = 0.53 * k[0] * F.hs; // a life-size head: its eyes are closer together than the pictures'
    if (!ground && !e.headless) e.__ht = t;
  }
  // the legs
  const stepL = (strideLen(e) * (chg ? 1.15 : 1) * mvv) / (4 * 0.9 * k[0]) / (run || chg ? 1 : e.cad || 1), // a quarter stride each way: the planted foot keeps pace with the street
    drag = run ? 1 : 0.55;
  const W = (lx, ly, lz) => [e.x + fwd[0] * lx + rt[0] * ly, e.y + fwd[1] * lx + rt[1] * ly, lz];
  // on its feet and walking the street, its feet are planted where they land (stepFeet): no sliding, no spinning on a
  // spot; its gait (a limp, a dragged leg, a lift) carried over
  const dtz = clamp(t - (e._ft ?? t), 0, 0.1);
  e._ft = t;
  const SF =
    !feet && em >= 1 && !crouch && !climb && !(e.wbT > 0 && mvv < 0.1)
      ? stepFeet(e, dtz, yaw, 4.3 * kp * (brute || fat ? 1.25 : 1) * (run ? 1 : G.stance), 0, r[8][2] * k[1], {
          L: (strideLen(e) * (chg ? 1.15 : 1)) / (run || chg ? 1 : e.cad || 1),
          ph: e.stride || 0,
          runK: run || chg ? 1 : 0,
          lift: run ? 1.1 : limp ? 0.5 : 0.75 * G.lift,
          sz: k[1] / (FIGK * 1.0),
          short: [limp ? 0.3 : run ? 1 : drag + 0.2, 1],
        })
      : null;
  for (const sd of [1, -1]) {
    const ti = sd > 0 ? 8 : 11,
      hip = add(Jp, mv(Rpp, sc3(sub(r[ti], r[0]), k)));
    let foot;
    if (feet) foot = feet[sd > 0 ? 0 : 1];
    else if (SF) {
      const F = SF.feet[sd > 0 ? 0 : 1];
      foot = [F.x, F.y, r[ti + 2][2] * k[1] + F.z + Math.max(0, F.pitch) * 2.4 * k[1]];
    } else {
      const bad = limp && sd > 0,
        s1 = Math.sin(ph + (sd > 0 ? Math.PI : 0)),
        f = s1 * stepL * (bad ? 0.3 : sd > 0 ? drag : 1) * (run || sd !== G.hs ? 1 : G.hitch) - (bad ? 4 * mvv : 0),
        lift = Math.max(0, Math.cos(ph + (sd > 0 ? Math.PI : 0))) * (run ? 6 : bad ? 0.6 : 2.6 * G.lift) * mvv;
      foot = W(
        f * k[0] * 0.9 + (crouch ? -3 : 0) + (climb ? -2 : 0),
        sd * 4.3 * kp * (brute || fat ? 1.25 : 1) * (run ? 1 : G.stance) + (bad ? 1.2 : 0),
        r[ti + 2][2] * k[1] + lift - (1 - em) * 30
      );
      if (em < 1) foot = W(-3 * k[0], sd * 6 * k[0], Jp[2] - 18 * k[1]); // still under the street, hanging below it
    }
    const pole = lieR && !feet ? mv(Rpp, [1, sd * 0.15, 0]) : mv(Rpp, [1, sd * 0.15, 0]),
      [Rsh, ank] = limb(D, o, ti, ti + 1, Rpp, hip, foot, pole, k);
    // the foot: flat, pointing where the body points (turned out a little); on the ground, along the shin
    const Fs = SF && SF.feet[sd > 0 ? 0 : 1],
      flat = mm(
        Rz((Fs ? Fs.yaw - sd * 0.1 : yaw) + sd * G.toe + (limp && sd > 0 ? 0.5 : 0)),
        Ryb(Fs ? Fs.pitch * 0.7 : 0)
      ),
      Rf = ground ? slerpR(mm(Rsh, Ryb(Math.PI / 2)), flat, uprightK) : flat; // on the ground the foot points on along the shin (kneeling, it rests on its instep)
    D3(ti + 2, Rf, ank);
  }
  // the arms: reaching for you at shoulder height, or hanging and swinging, per its pose (as its pictures do)
  const tw = dead ? 0 : Math.sin(t * 2.2 + id) * 3,
    sw = Math.sin(ph) * G.arms,
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
    hd2 = [
      [lerp(12 + sw * 9 * mvv, -4, chg), -lerp(21, 20, chg)],
      [lerp(12 - sw * 9 * mvv, -4, chg), lerp(21, 20, chg)],
    ]; // knuckles low and forward, swinging; charging (as much as it is), head down, arms back
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
  // the 3D giants: both hands on what they carry (their shoulders and arms' reach, for keeping the hands where an arm
  // can put them)
  const CH =
    e.c3d && !ground
      ? chiefArms(
          e,
          Jc,
          yaw,
          k,
          [4, 6].map(ub => [
            add(Jc, mv(Rc, sc3(sub(r[ub], r[2]), k))),
            len(sc3(sub(r[ub + 1], r[ub]), k)) + len(sc3(sub(MODEL_END[ub + 1], r[ub + 1]), k)),
          ])
        )
      : null;
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
    if (brute && !ground) {
      // (by its thighs as it walks, eased toward the reach of a rear or a charge as it goes into one)
      const hw = W(h2[0] * 0.5 * ka, h2[1] * 0.68 * kw, Jp[2] - 6 * k[1]),
        f = 1 - Math.max(chg, rear);
      hand = [0, 1, 2].map(i => lerp(hand[i], hw[i], f));
    }
    if (em < 1) hand = W(8 * k[0], sd * 8 * k[0], Math.max(2, Jp[2] + 24 * k[1] * (0.6 + 0.4 * Math.sin(t * 6 + sd)))); // clawing up out of the ground
    if (hands) {
      const g0 = hands[sd > 0 ? 0 : 1];
      hand = [0, 1, 2].map(i => lerp(g0[i], hand[i], uprightK));
    }
    if (CH) hand = CH[sd > 0 ? 0 : 1]; // (right where he holds it, left along it: or hanging free)
    let pole = nrm(add(mul(rt, sd * 0.6), [0, 0, -0.8]));
    // the giants' elbows as a man's go: back and down (not winged out) with the hand hanging by his side; out to his
    // side and down with it held out before him (not back into his chest); out as it comes up over the shoulder
    if (CH) {
      const L = len(sc3(sub(r[ub + 1], r[ub]), k)) * 2,
        bd = Math.abs(dot(sub(sh, Jc), rt)) * 0.62,
        ahead = clamp((dot(sub(hand, Jc), fwd) - bd * 0.3) / bd, 0, 1),
        up = clamp((hand[2] - sh[2]) / L + 0.15, 0, 1),
        P = [0, 1, 2].map(i =>
          lerp(lerp([-0.8, 0.3, -0.55][i], [0.35, 0.75, -0.55][i], ahead), [-0.2, 0.8, -0.3][i], up)
        );
      pole = nrm(add(add(mul(fwd, P[0]), mul(rt, sd * P[1])), [0, 0, P[2]]));
    }
    // the riot cop's shield arm: the forearm upright before its chest, the shield's face to the front
    if (riot && sd < 0 && e.shield && !dead && !(e.stag > 0) && !ground) {
      // the upper arm down by its side and a little forward, the forearm upright through the straps: the shield from
      // its knees to its eyes
      const lu = len(sc3(sub(r[7], r[6]), k)),
        elbowAt = add(sh, mul(nrm(add(mul(fwd, 0.45 + bash * 0.6), [0, 0, -0.9])), lu)),
        handAt = add(elbowAt, add(mul(fwd, 1 + bash * 2.5), [0, 0, 9 * k[1]]));
      // the upper arm straight to the elbow (no reaching for the hand: the forearm is set upright below)
      const u1 = sc3(sub(r[ub + 1], r[ub]), k),
        R1 = mm(rotTo(mv(Rc, u1), sub(elbowAt, sh)), Rc),
        M = elbowAt;
      bone(D, o, ub, mul3(R1, k), sh, r[ub]);
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
    } else {
      const [, wr] = limb(D, o, ub, ub + 1, Rc, sh, hand, pole, k);
      if (e.c3d) {
        const H =
          e._hw ||
          (e._hw = [
            [0, 0, 0],
            [0, 0, 0],
          ]);
        H[sd > 0 ? 1 : 0] = [wr[0], wr[1], wr[2]];
      } // (where his hands are: the axe goes in them)
    }
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
              : name === 'roadkill'
                ? RK_SKIN
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
            : name === 'chief'
              ? [0.78, 0.64, 0.38] // tan turnout cloth, sooted
              : name === 'roadkill'
                ? RK_SKIN.map(x => (x * 0.86) / 0.72) // (no shirt: skin)
                : hop
                  ? [0.27, 0.33, 0.39]
                  : riot || name === 'armored'
                    ? [0.2, 0.24, 0.32] // a uniform under the gear
                    : (SHIRTS && SHIRTS[e.v || 0]) || [0.36, 0.44, 0.52]
    ).map(x => x * 0.72),
    tc = e.tc || [1, 1, 1],
    LK = lookOf(e, name, id),
    pa = LK.pa || PANTS[Math.floor(hsh(id, 31) * PANTS.length)],
    ha = LK.ha,
    slv = LK.pa
      ? LK.slv
      : e.v === 16 || kd === 'spore' || kd === 'climb'
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
    bald = brute || hop || kd === 'blind' || kd === 'climb' || LK.bald,
    fade = dead ? clamp(((e.keep || 0.55) - e.dying) / 1.5, 0, 1) : 1,
    fl = e.flash > 0 && !dead ? 0.12 * Math.min(1, e.flash / 0.05) : 0,
    gT = e.lurk === 'lie' ? 0.62 : 1 - (dead ? 0.25 * Math.min(1, e.dying / 0.6) : 0); // its own, not the pictures' (GS.gT and the rest belong to whichever was drawn last)
  D.set([e.x, e.y + 40, fade * (0.3 + 0.7 * (e.sv ?? 1)), fl], q);
  D.set([sk[0] * 0.86, sk[1] * 0.86, sk[2] * 0.86, bald ? 0 : 1], q + 4);
  D.set([shc[0] * tc[0], shc[1] * tc[1], shc[2] * tc[2], slv], q + 8);
  D.set([pa[0], pa[1], pa[2], LK.pa ? LK.paw : hsh(id, 39) < 0.25 ? 0.62 : 1.1], q + 12);
  D.set([ha[0], ha[1], ha[2], hsh(id, 41) < 0.12 ? 1 : 0], q + 16);
  D.set(
    [gT, gT, gT, brute || hop || riot || name === 'armored' ? 0 : LK.pa ? LK.pat : Math.floor(hsh(id, 47) * 5)],
    q + 20
  );
  D.set([lost, LK.hat, LK.sty, 0.35 + hsh(id, 43) * 0.65 + (e.wounds || 0) * 0.15 + (lost ? 0.4 : 0)], q + 24);
  eyeGlow(e, EYE);
  D.set([EYE[0], EYE[1], EYE[2], hsh(id, 45)], q + 28);
  e._kits = LK.kits;
}
// a move's weight (0..1) eased in and out over a moment, by the game's clock, not switched in a frame: the brute's
// rear and charge, the spitter's hunch, the riot cop's bash (dead, or another call the same frame, it holds)
function eased(e, key, v, rate = 12) {
  const S = e._sw || (e._sw = {}),
    t = GS.time,
    w = S[key];
  if (!w || t - w.t > 0.25 || t < w.t) {
    S[key] = { v, t };
    return v;
  }
  w.v += (v - w.v) * Math.min(1, (t - w.t) * rate);
  if (Math.abs(w.v - v) < 0.005) w.v = v; // (there, exactly: some read it as on or off)
  w.t = t;
  return w.v;
}
// a crawler's hands and haul, the hands by turns: each hand's cycle (by the ground covered, a cycle a reach's length,
// RCH less PULL) is six parts in ten planted, the body hauled past it, and four lifted, reaching out to where it's put
// down next; one is always down. Its hips (Jp) surge as a hand hauls and lag as the other reaches, its shoulders roll
// to the reaching arm. Stopped, a hand in the air finishes its reach. (Turned on the spot, a hand left too far round
// is lifted and put down again)
// a crawler's heading, drawn: the game steers it in steps (a tenth of a turn at a time, every other frame), which
// would swing its body and throw its planted hands out of line; this eases after it
function crawlHd(e) {
  const t = GS.time,
    H = e._chd;
  if (!H || t - H.t > 0.5 || t < H.t) return (e._chd = { a: e.a || 0, t }).a;
  H.a += angDiff(H.a, e.a || 0) * Math.min(1, (t - H.t) * 6);
  H.t = t;
  return H.a;
}
const RCH = 31,
  PULL = 14; // (a hand is lifted while still a little ahead of its shoulder: hauled past it, the arm folds)
function crawlOf(e, Jp, hd, kh, kw, gz) {
  const t = GS.time,
    C = e._cr && t - e._cr.t < 0.5 && t >= e._cr.t ? e._cr : (e._cr = { t, d: 0, x: e.x, y: e.y, h: [null, null] }),
    dt = t - C.t,
    fw = [Math.cos(hd), Math.sin(hd)],
    rt = [-fw[1], fw[0]],
    cyc = (PULL / 0.6) * kh;
  // the ground covered since last frame, along where it heads (a jump, as when it's moved, isn't crawled)
  const mx = e.x - C.x,
    my = e.y - C.y,
    along = mx * fw[0] + my * fw[1];
  if (Math.hypot(mx, my) < 40) C.d += Math.max(0, along);
  C.x = e.x;
  C.y = e.y;
  // stopped with a hand in the air: it finishes its reach (the cycle on by time, to where both are down)
  const u0 = (((C.d / cyc) % 1) + 1) % 1,
    reaching = u0 >= 0.1 && u0 < 0.5 ? 1 : u0 >= 0.6 ? 0 : -1;
  if (Math.abs(along) < dt * 3 && reaching >= 0) C.d += Math.min(dt * cyc * 1.6, cyc * 0.02);
  if (e.claw > 0 && Math.abs(along) < dt * 3) C.d += Math.min(dt, 0.05) * cyc * e.claw * 0.55; // pinned, clawing at the street where it lies (actors/idle.js)
  C.t = t;
  const u = (((C.d / cyc) % 1) + 1) % 1;
  // the hips: hauled on a little ahead, then lagging, about where the game has them
  const surge = Math.sin(u * Math.PI * 4) * 0.09 * cyc,
    J = [Jp[0] + fw[0] * surge, Jp[1] + fw[1] * surge, Jp[2] + Math.max(0, Math.sin(u * Math.PI * 4 - 0.6)) * 0.8 * kh],
    hands = [0, 1].map(i => {
      const sd = i ? -1 : 1,
        v = (u + i * 0.5) % 1,
        side = sd * 10 * kw,
        at = (f, s) => [J[0] + fw[0] * f + rt[0] * s, J[1] + fw[1] * f + rt[1] * s, gz],
        cur = C.h[i];
      if (v < 0.6) {
        // planted where it was put down (the first time, where it would be by now)
        if (!cur || (!cur.on && !cur.hop)) C.h[i] = { on: true, p: at(RCH * kh - v * cyc, side) };
        const H = C.h[i],
          want = at(RCH * kh - v * cyc, side);
        // (turned on the spot, or left behind: picked up and put down again where it should be, quickly, not in a
        // frame)
        if (H.hop) {
          H.hop.u = Math.min(1, H.hop.u + dt / 0.25);
          const w = H.hop.u * H.hop.u * (3 - 2 * H.hop.u);
          if (H.hop.u >= 1) C.h[i] = { on: true, p: want };
          else
            return [
              lerp(H.hop.from[0], want[0], w),
              lerp(H.hop.from[1], want[1], w),
              gz + Math.sin(H.hop.u * Math.PI) * 4 * kh,
            ];
          return C.h[i].p;
        }
        const p = H.p,
          rel = (p[0] - J[0]) * fw[0] + (p[1] - J[1]) * fw[1],
          lat = (p[0] - J[0]) * rt[0] + (p[1] - J[1]) * rt[1];
        // (or out of its arm's reach from its shoulder: an arm can't hold a hand down further off than it is long)
        const shF = 14 * kh,
          shS = sd * 7 * kw,
          far = Math.hypot(rel - shF, lat - shS, (p[2] - J[2]) * 0.5) > 17.5 * kh;
        if (rel < 0 || rel > RCH * kh * 1.35 || Math.abs(lat - side) > 9 * kw || far)
          C.h[i] = { on: false, hop: { u: 0, from: p }, p };
        return p;
      }
      // lifted: from where it came up to where it goes down next, over and up
      if (!cur || cur.on || cur.hop) C.h[i] = { on: false, p: cur ? cur.p : at(RCH * kh - 0.6 * cyc, side) };
      const w = (v - 0.6) / 0.4,
        e2 = w * w * (3 - 2 * w),
        to = at(RCH * kh, side),
        from = C.h[i].p;
      return [lerp(from[0], to[0], e2), lerp(from[1], to[1], e2), gz + Math.sin(w * Math.PI) * (e.pin ? 1.2 : 5) * kh]; // (pinned, it drags its hands along the street: nothing to haul itself on to)
    });
  // the shoulders roll to the arm reaching (its side up), the head bobs as it hauls
  const reachSd = u >= 0.6 ? 1 : u >= 0.1 && u < 0.5 ? -1 : 0,
    rw = reachSd ? Math.sin((reachSd > 0 ? (u - 0.6) / 0.4 : (u - 0.1) / 0.4) * Math.PI) : 0;
  return { hands, Jp: J, roll: reachSd * rw * 0.16, bob: Math.sin(u * Math.PI * 4) * 0.12 };
}
// ---------- the dog: a gallop, a crouch, a leap; dead, on its side ----------
// a two-bone leg's length (b1's joint to b2's, b2's to the end point), its build k
const segL = (b1, b2, end, k) => len(sc3(sub(REST[b2], REST[b1]), k)) + len(sc3(sub(end, REST[b2]), k));
// a reach eased as it nears the leg's full length: never quite straight, so the knee doesn't snap from straight to
// bent as the target comes back within reach (it keeps nine tenths of the length freely, the last tenth softly)
function softReach(top, tg, L) {
  const d = sub(tg, top),
    n = len(d),
    a = 0.9 * L;
  if (n <= a || n < 1e-6) return tg;
  const m = a + (L - a) * (1 - Math.exp(-(n - a) / (L - a)));
  return add(top, mul(d, m / n));
}
const FURS = [
  [0.3, 0.24, 0.18],
  [0.22, 0.19, 0.17],
  [0.42, 0.38, 0.32],
  [0.5, 0.36, 0.22],
  [0.26, 0.26, 0.25],
];
function poseDog(e, D, o) {
  poolReset();
  e._kits = null;
  const MM = FIG.models.dog;
  e.__MM = MM; // (a jump left over is eased out, as anyone's: inertia.js)
  REST = MM.rest;
  MODEL_END = MM.ends;
  const r = REST,
    dead = e.dying !== undefined,
    id = e.id || 0,
    t = GS.time,
    k = [(e.sc || 1) * MM.scale * DOGK, (e.sc || 1) * MM.scale * DOGK],
    D3 = (b, R, J) => bone(D, o, b, mul3(R, k), J, r[b]),
    yaw = e.a || 0,
    // (its pace, a crouch and a leap each eased in and out over a moment, not switched in a frame; in a leap its legs
    // hold their reach, not galloping in the air)
    dt = clamp(t - (e._dT ?? t), 0, 0.1),
    sp = dead ? 0 : Math.hypot(e.vx || 0, e.vy || 0),
    ease = (v, to, r) => v + (to - v) * Math.min(1, dt * r),
    inLeap = (e._dl = ease(e._dl ?? 0, !dead && e.st === 'leap' ? 1 : 0, 12)),
    mvv = (e._dm = ease(e._dm ?? 0, Math.min(1, sp / 180), 8)) * (1 - inLeap),
    // its own gallop: up to three and a half strides a second (the game's stride count runs twice that at its
    // speed, its paws skating), each stride as long as its pace makes it, so the paws keep to the ground
    gf = 1.2 + 2.2 * mvv,
    ph = ((e._dph = ((e._dph ?? hsh(id, 69)) + dt * gf) % 1) % 1) * Math.PI * 2,
    crouch = (e._dc = ease(e._dc ?? 0, !dead && e.st === 'crouch' ? 1 : 0, 10)),
    leap = !dead && e.st === 'leap' ? Math.sin(clamp(1 - (e.stT || 0) / 0.3, 0, 1) * Math.PI) : 0,
    fall = dead ? Math.min(1, e.dying / 0.4) : 0,
    fl = fall * fall * (3 - 2 * fall);
  // the body: pitching and bobbing with the gallop, low in a crouch, stretched out in a leap; dead, rolled onto its side
  const side = hsh(id, 61) < 0.5 ? 1 : -1,
    Rroll = rotA([Math.cos(yaw), Math.sin(yaw), 0], side * fl * Math.PI * 0.5),
    pitch = Math.sin(ph * 2) * 0.09 * mvv + crouch * 0.12 - leap * 0.1,
    Rp = mm(Rroll, mm(Rz(yaw), Ryb(pitch))),
    lift = (Math.abs(Math.sin(ph)) * 1.6 * mvv - crouch * 5 + leap * 9) * k[1],
    _t = (e._dT = t),
    Jp = [
      e.x - Math.cos(yaw) * 7 * k[0], // its hips behind it: the middle of its body over its spot
      e.y - Math.sin(yaw) * 7 * k[0],
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
    const hc = add(Jh, mv(Rh, sc3([9, 0, 2.2], k)));
    e.__hx = hc[0];
    e.__hy = hc[1] - hc[2] * TILT; // where its head is drawn (the tilt)
    e.__ha = Math.atan2(Rh[3], Rh[0]);
    e.__hk = 0.32 * k[0];
    if (!dead) e.__ht = t;
  }
  // the legs: a rotary gallop (each foot its own moment in the stride); in a leap, the front pair reach and the hind
  // pair push out behind; crouched, the haunches gather under it; dead, stiff and out from its body
  const fwd = [Math.cos(yaw), Math.sin(yaw), 0],
    rt = [-Math.sin(yaw), Math.cos(yaw), 0],
    W = (lx, ly, lz) => [e.x + fwd[0] * lx + rt[0] * ly, e.y + fwd[1] * lx + rt[1] * ly, lz],
    stride = Math.min(sp / (2 * Math.PI * gf), 11 * k[0]) * (1 - inLeap) * Math.min(1, mvv * 4);
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
    if (front)
      limb(
        D,
        o,
        b1,
        b1 + 1,
        b1 < 8 ? Rc : Rp,
        top,
        softReach(top, paw, segL(b1, b1 + 1, MODEL_END[b1 + 1], k)),
        pole,
        k
      );
    else {
      // the hind leg: thigh and shin to the hock, then the long foot down to the paw
      const footL = len(sc3(sub(MODEL_END[b1 + 2], r[b1 + 2]), k)),
        hock = add(paw, mv(Rz(yaw), [-2 * k[0], 0, footL * 0.93])),
        [Rsh, H] = limb(
          D,
          o,
          b1,
          b1 + 1,
          Rp,
          top,
          softReach(top, dead ? add(paw, mv(Rp, sc3([-2, 0, 4], k))) : hock, segL(b1, b1 + 1, r[b1 + 2], k)),
          pole,
          k
        ),
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
  e._kits = null;
  const MM = FIG.models.egg;
  REST = MM.rest;
  MODEL_END = MM.ends;
  const id = e.id || 0,
    t = GS.time,
    dead = e.dying !== undefined,
    sw = clamp(1 - (e.hatch ?? 6) / 1.2, 0, 1), // the last moments before it splits
    beat = 1 + Math.sin(t * (2.2 + sw * 9) + id) * (0.035 + sw * 0.06) + sw * 0.14,
    k = (e.sc || 1) * MM.scale * FIGK,
    col = dead ? Math.max(0, 1 - e.dying * 2.5) : 1, // shot, it bursts and sags
    R = mul3(Rz((e.a || 0) + hsh(id, 71) * 6), [k * beat, k * beat * (0.25 + 0.75 * col)]);
  bone(D, o, 0, R, [e.x, e.y, 0], REST[0]);
  for (let b = 1; b < REST.length; b++) bone(D, o, b, [0, 0, 0, 0, 0, 0, 0, 0, 0], [e.x, e.y, 0], REST[b]);
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
// ---------- you (and the survivors with you): legs on their own heading, the body turned to the aim, the gun in both hands ----------
// which of the guns' models a gun is drawn with
// the gun in his hands: on the truck, its machine gun (as the picture had it), not his own
export const heldGun = p => (p && p.ride === 'truck' ? 'lmg' : p ? p.gun : '');
export const gunModel = g =>
  ({
    pistol: 'pistol',
    smg: 'smg',
    shotgun: 'shotgun',
    auto: 'auto',
    hunter: 'hunter',
    lever: 'lever',
    lmg: 'lmg',
    launcher: 'launcher',
  })[g] || (/shotgun|breacher|riot/.test(g || '') ? 'shotgun' : 'rifle');
// how each is held, in the gun's own units (its grip at the origin, the muzzle along +x): the point of the stock that
// sits in the shoulder (butt), where the other hand holds it (fore), the magazine it reaches for on a reload (mag),
// the way it's carried (style), and how far the chest turns side-on behind it (blade)
const HOLD = {
  rifle: { style: 'shoulder', butt: [-9.2, 0, 1.3], fore: [11, 0, 0.7], mag: [4.4, 0, -1.8], blade: 0.32 },
  shotgun: { style: 'shoulder', butt: [-10.4, 0, 1.1], fore: [12.5, 0, 0.3], mag: [3.5, 0, 0.2], blade: 0.34, pump: 1 },
  auto: { style: 'shoulder', butt: [-10.4, 0, 1.2], fore: [13, 0, 0.6], mag: [4.2, 0, -2.4], blade: 0.34 },
  hunter: { style: 'shoulder', butt: [-11, 0, 1.0], fore: [11.5, 0, 0.6], mag: [1.5, 0, 0.6], blade: 0.38, cheek: 1 },
  lever: { style: 'shoulder', butt: [-10.3, 0, 0.9], fore: [9.5, 0, 0.8], mag: [1.0, 0, -0.6], blade: 0.34 },
  launcher: { style: 'shoulder', butt: [-9.2, 0, 1.4], fore: [8, 0, 0.6], mag: [12, 0, 2.3], blade: 0.3 },
  smg: { style: 'compact', butt: [-5.4, 0, 1.4], fore: [4.2, 0, -0.4], mag: [4.2, 0, -3.2], blade: 0.18 },
  lmg: { style: 'hip', butt: [-9.8, 0, 1.4], fore: [12, 0, 0.6], mag: [3, 0, -2.8], blade: 0.42 },
  pistol: { style: 'pistol', butt: [0, 0, 0], fore: [-0.2, -0.95, -0.5], mag: [0, 0, -1.9], blade: 0.24 },
};
// where each one's bore comes out (tools/mesh/guns.mjs): the shots are seen to leave from there
const TIP = {
  rifle: [21, 0, 1.9],
  shotgun: [25, 0, 2],
  smg: [13.5, 0, 1.9],
  auto: [24, 0, 1.9],
  hunter: [27, 0, 1.9],
  lever: [24, 0, 2],
  lmg: [28, 0, 2],
  launcher: [16, 0, 2.3],
  pistol: [7.7, 0, 2.3], // (its mesh drawn a fifth over: tools/mesh/guns.mjs)
};
const lerp3 = (a, b, f) => v3(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
// a recorded loop's row at a moment of its stride (0..1), column j (motion.js), between its samples
const moRow = (m, ph, j) => {
  const R = m.rows,
    n = R.length,
    x = (((ph % 1) + 1) % 1) * n,
    i = Math.floor(x),
    f = x - i;
  return R[i % n][j] * (1 - f) + R[(i + 1) % n][j] * f;
};
// our stride's moment on to the recording's: its time down matched to ours, its time in the air to ours
const moPh = (ph, st, sc) => {
  ph = ((ph % 1) + 1) % 1;
  return ph < st ? (ph / st) * sc : sc + ((ph - st) / (1 - st)) * (1 - sc);
};
// a turn kept as axis × angle (motion.js) as a matrix
const rotV = v => {
  const a = Math.hypot(v[0], v[1], v[2]);
  return a < 1e-5 ? Rz(0) : rotA([v[0] / a, v[1] / a, v[2] / a], a);
};
// ---------- the feet: a stride from the speed, each foot planted in the street while it bears ----------
// Each foot is put down ahead of its hip by half the way the body will go while it bears, and stays exactly there,
// whatever the body does, until it lifts; in the air it swings through to where it will next come down (so it never
// slides, changing direction included). Stopping, the step under way is finished; standing, a foot that has been left
// behind or twisted under a turn is picked up and set down again, one at a time. sp: from the middle to each foot
// o (for the dead that walk): L, the ground a stride covers (the stride then set by the street, not the beat); ph, the
// stride's own count (enemy-ai.js keeps it, its lurches go with it); runK; lift and size (sz) against a man's;
// short, how much of a full step each foot takes (a limp, a dragged leg)
function stepFeet(p, dt, hy, sp, top, Hl, o = null) {
  const vx = p.vx || 0,
    vy = p.vy || 0,
    v = Math.hypot(vx, vy),
    gs = o ? { runK: o.runK || 0, f: Math.max(0.55, v / o.L), st: 0.6 - 0.24 * (o.runK || 0) } : gaitOfSpeed(v, top),
    { runK, st } = gs,
    // no step longer than the legs allow (a foot lands at most this far ahead of its hip): faster, the beat quickens
    Amax = 10.5 * GK * 2.4 * (o ? o.sz || 1 : 1),
    f = Math.max(gs.f, (v * st) / (2 * Amax)),
    synced = !o || f <= gs.f * 1.02,
    mk = o ? clamp(v / (14 * GK), 0, 1) : clamp(v / (0.18 * top), 0, 1),
    SZ = o ? o.sz || 1 : 1,
    hr = [-Math.sin(hy), Math.cos(hy)],
    rest = sd => [p.x + hr[0] * sd * sp, p.y + hr[1] * sd * sp];
  let g = p._sf;
  if (!g || Math.hypot(g.cx - p.x, g.cy - p.y) > 70 * GK) {
    // a first frame, or it was carried off (a dash, a respawn): the feet set under it
    g = p._sf = { ph: 0, idle: -1, it: 0, cx: p.x, cy: p.y, feet: null };
    g.feet = [1, -1].map(sd => {
      const R = rest(sd);
      return { x: R[0], y: R[1], z: 0, lx: R[0], ly: R[1], yaw: hy + sd * 0.1, pitch: 0, st: true };
    });
  }
  g.cx = p.x;
  g.cy = p.y;
  if (mk > 0.04) {
    if (o && o.ph !== undefined && synced && Math.abs(o.ph - g.ph) < 0.6) g.ph = o.ph;
    else g.ph += dt * f; // (the beat set by the speed, and the step's length by the beat: never stretched)
  } else if ((g.ph * 2) % 1 > 0.2) g.ph += dt * 1.6; // the step under way finished: then both feet are down
  const A = (v * st) / (2 * f), // a foot lands this far ahead of its hip
    // the recorded walk and run (motion.js), blended by the speed in leg lengths a second: the swing's path, the heel
    // and the toes, the hips; their lift kept to the length of our step
    wJ = o ? (runK > 0.5 ? 1 : 0) : clamp((v / Hl - 1.1) / 1.9, 0, 1),
    MW = wJ < 1 ? [MOTION.walk, 1 - wJ] : null,
    MJ = wJ > 0 ? [MOTION.jog, wJ] : null,
    moAt = (ph, j) =>
      (MW ? moRow(MW[0], moPh(ph, st, MW[0].st), j) * MW[1] : 0) +
      (MJ ? moRow(MJ[0], moPh(ph, st, MJ[0].st), j) * MJ[1] : 0),
    // the recorded foot's swing from where it lifts to where it lands, 0..1 (a heel kicked back can take it below 0)
    swingE = ph => {
      let e = 0;
      for (const M of [MW, MJ]) {
        if (!M) continue;
        const m = M[0],
          a0 = moRow(m, m.st, 0),
          a1 = moRow(m, 0, 0),
          a = moRow(m, moPh(ph, st, m.st), 0);
        e += clamp((a - a0) / (a1 - a0 || 1), 0, 1) * M[1]; // (its heel kicked back up behind, not the foot left trailing)
      }
      return e;
    },
    hsc = clamp(
      A /
        Hl /
        (0.5 * (MW ? MOTION.walk.S * MOTION.walk.st * MW[1] : 0) +
          0.5 * (MJ ? MOTION.jog.S * MOTION.jog.st * MJ[1] : 0) || 1),
      0.55,
      1
    ),
    dx = v > 1 ? vx / v : 0,
    dy = v > 1 ? vy / v : 0,
    lift = (2.0 + 2.4 * runK) * GK * 2.4 * (o ? o.lift : 1) * SZ,
    reach = 17 * GK * 2.4 * SZ; // past this from its hip a foot is dragged rather than the leg pulled off
  let bob = 0,
    sway = 0;
  g.feet.forEach((F, i) => {
    const sd = i ? -1 : 1,
      ph = (g.ph + i * 0.5) % 1,
      R = rest(sd),
      walking = mk > 0.04 || (g.ph * 2) % 1 > 0.2;
    if (!walking) return;
    const inSt = ph < st;
    if (inSt && !F.st) {
      F.st = true;
      F.yaw = hy + sd * 0.1;
    }
    if (!inSt && F.st) {
      F.st = false;
      F.lx = F.x;
      F.ly = F.y;
    }
    if (inSt) {
      const u = ph / st,
        c = Math.sin(Math.PI * u);
      F.z = Math.max(0, moAt(ph, 2)) * Hl * hsc * mk; // the heel rising as it rolls on to its toes
      F.pitch = mk * clamp(moAt(ph, 3) * 0.85, -0.5, 1); // heel first, then the roll forward to the toes
      void c;
    } else {
      const u = (ph - st) / (1 - st),
        left = ((1 - u) * (1 - st)) / f, // seconds before it lands
        ee = swingE(ph); // as the recorded foot swings through
      const Af = A * (o && o.short ? o.short[i] : 1);
      let tx = R[0] + vx * left + dx * Af,
        ty = R[1] + vy * left + dy * Af;
      // never across the other foot
      const lat = (tx - p.x) * hr[0] + (ty - p.y) * hr[1],
        ok = sd > 0 ? Math.max(lat, sp * 0.65) : Math.min(lat, -sp * 0.65);
      tx += hr[0] * (ok - lat);
      ty += hr[1] * (ok - lat);
      F.x = F.lx + (tx - F.lx) * ee;
      F.y = F.ly + (ty - F.ly) * ee;
      F.z =
        Math.max(0, moAt(ph, 2)) *
        Hl *
        hsc *
        Math.max(mk, 0.4) *
        (o && o.short ? 0.25 + 0.75 * o.short[i] : 1) *
        (o ? o.lift : 1); // as high as the recorded foot
      F.yaw += angDiff(F.yaw, hy + sd * 0.1) * Math.min(1, dt * 14);
      F.pitch = mk * clamp(moAt(ph, 3) * 0.85, -0.5, 1);
    }
  });
  if (!(mk > 0.04 || (g.ph * 2) % 1 > 0.2)) {
    // standing: a foot left behind, or twisted under a turn, stepped back under the hip
    if (g.idle < 0)
      for (let i = 0; i < 2; i++) {
        const F = g.feet[i],
          R = rest(i ? -1 : 1);
        if (Math.hypot(F.x - R[0], F.y - R[1]) > 3.2 * GK * 2.4 * SZ || Math.abs(angDiff(F.yaw, hy)) > 0.75) {
          g.idle = i;
          g.it = 0;
          F.lx = F.x;
          F.ly = F.y;
          break;
        }
      }
    if (g.idle >= 0) {
      const i = g.idle,
        F = g.feet[i],
        sd = i ? -1 : 1,
        R = rest(sd);
      g.it = Math.min(1, g.it + dt / 0.26);
      const e = g.it * g.it * (3 - 2 * g.it);
      F.x = F.lx + (R[0] - F.lx) * e;
      F.y = F.ly + (R[1] - F.ly) * e;
      F.z = Math.sin(Math.PI * g.it) * 2.2 * GK * 2.4;
      F.yaw += angDiff(F.yaw, hy + sd * 0.1) * Math.min(1, dt * 12);
      F.pitch = 0.25 * Math.sin(Math.PI * g.it);
      F.st = true;
      sway -= sd * 0.35 * Math.sin(Math.PI * g.it); // the weight on the other foot
      if (g.it >= 1) g.idle = -1;
    } else
      for (const F of g.feet) {
        F.z = 0;
        F.pitch = 0;
      }
  }
  // a planted foot the body has run away from (a shove, a hit) is dragged rather than the leg torn off
  for (let i = 0; i < 2; i++) {
    const F = g.feet[i],
      R = rest(i ? -1 : 1),
      ddx = F.x - R[0],
      ddy = F.y - R[1],
      dd = Math.hypot(ddx, ddy);
    if (dd > reach) {
      F.x = R[0] + (ddx / dd) * reach;
      F.y = R[1] + (ddy / dd) * reach;
    }
  }
  // the hips and chest as the recording has them, a stride along (as the right foot's)
  const walking = mk > 0.04 || (g.ph * 2) % 1 > 0.2,
    phR = g.ph % 1,
    pk = walking ? Math.max(mk, 0.3) : 0;
  bob += moAt(phR, 10) * 28 * pk * hsc; // (in the model's units: a leg's 28 of them)
  sway += moAt(phR, 9) * 28 * pk;
  const prot = [moAt(phR, 11), moAt(phR, 12), moAt(phR, 13)].map(x => x * pk),
    crot = [moAt(phR, 14), moAt(phR, 15), moAt(phR, 16)].map(x => x * pk);
  void lift;
  return {
    prot,
    crot,
    feet: g.feet,
    runK,
    mk,
    bob: bob - (0.3 + 0.9 * runK) * mk, // a little lower, the faster it goes
    sway,
    twist: 0.1 * mk * (0.4 + runK) * Math.sin(2 * Math.PI * g.ph),
  };
}
function poseHero(p, D, o) {
  poolReset();
  p._kits = null;
  const MM = FIG.models.hero;
  REST = MM.rest;
  MODEL_END = MM.ends;
  const r = REST,
    t = GS.time,
    id = p.id || 0,
    bs = MM.scale * FIGK,
    k = [bs, bs],
    D3 = (b, R, J) => bone(D, o, b, mul3(R, k), J, r[b]),
    aim = p.npc ? (p.aim ?? p.bodyA) : p.bodyA,
    gm = gunModel(heldGun(p)),
    H = HOLD[gm] || HOLD.rifle,
    kick = clamp((p.recoil || 0) / 8, 0, 1), // the gun's kick, back into the shoulder
    rl = clamp(p.rk || 0, 0, 1), // reloading: the gun comes down and in, the free hand to the magazine
    sw = p.swap > 0 ? Math.sin(Math.min(1, p.swap / 0.3) * Math.PI) : 0, // swapping guns: the gun lowered
    shv = p.shoveT > 0 ? Math.sin(Math.PI * clamp(1 - p.shoveT / 0.25, 0, 1)) : 0, // the shove: the gun driven out butt-first
    breathe = Math.sin(t * 2.2 + id) * 0.25,
    dt = clamp(t - (p._hipT ?? t), 0, 0.1);
  p._hipT = t;
  // the hips face the aim, turned a little toward the way you're going (or, backing off, away from it); standing, they
  // follow the aim once it has turned well past them. The feet do the rest (stepFeet)
  const vx = p.vx || 0,
    vy = p.vy || 0,
    spd = Math.hypot(vx, vy),
    top = 260 * GK,
    mA = spd > 4 ? Math.atan2(vy, vx) : (p.moveA ?? aim),
    rel = angDiff(aim, mA),
    back = Math.abs(rel) > 1.95,
    moving = spd > 0.12 * top;
  if (p._hipA === undefined) p._hipA = aim;
  {
    const off = angDiff(p._hipA, aim),
      want = moving
        ? aim + clamp(back ? angDiff(aim, mA + Math.PI) : rel, -1.05, 1.05) * 0.9
        : Math.abs(off) > 0.45
          ? aim
          : p._hipA;
    p._hipA += angDiff(p._hipA, want) * Math.min(1, dt * (moving ? 9 : 6));
  }
  // leaning: forward into speed and into a hard start, back as it stops, over into a turn
  {
    const ax = (vx - (p._pvx ?? vx)) / Math.max(dt, 1e-3),
      ay = (vy - (p._pvy ?? vy)) / Math.max(dt, 1e-3);
    p._pvx = vx;
    p._pvy = vy;
    const kk = Math.min(1, dt * 8);
    p._ax = lerp(p._ax || 0, ax, kk);
    p._ay = lerp(p._ay || 0, ay, kk);
  }
  const hy0 = p._hipA,
    G0 = stepFeet(p, dt, hy0, 4.4 * k[0], top, r[8][2] * k[1]),
    hy = hy0 + G0.twist, // the pelvis swings round with the leg going through
    blade = (H.blade + shv * 0.1) * (1 - rl * 0.4), // side-on behind a long gun, square behind a pistol
    tw = clamp(angDiff(hy, aim + blade), -1.3, 1.3),
    hr = [-Math.sin(hy0), Math.cos(hy0), 0],
    fwd = [Math.cos(hy0), Math.sin(hy0), 0],
    aF = (p._ax * fwd[0] + p._ay * fwd[1]) / top,
    aR = (p._ax * hr[0] + p._ay * hr[1]) / top,
    leanF = clamp(0.04 + 0.14 * G0.runK * G0.mk + aF * 0.025, -0.12, 0.3),
    leanR = clamp(aR * 0.02, -0.12, 0.12);
  // hips over the legs, the trunk twisting up to the aim, leaning; a shove's lunge
  const Rp = mm(Rz(hy), mm(rotV(G0.prot), mm(Rxb(leanR * 0.5), Ryb(leanF * 0.4)))),
    Jp = [p.x + hr[0] * G0.sway * k[0], p.y + hr[1] * G0.sway * k[0], (r[0][2] + G0.bob - shv * 0.6) * k[1]],
    Rs = mm(
      Rp,
      mm(Rz(tw * 0.45), mm(rotV(G0.crot.map(x => x * 0.3)), mm(Rxb(leanR * 0.5), Ryb(0.04 + leanF * 0.6 + shv * 0.12))))
    ), // the recorded chest's counter-swing, held in by the gun
    Rc = mm(Rs, mm(Rz(tw * 0.55), Ryb(0.04 + breathe * 0.01 - kick * 0.06 + shv * 0.1 - leanF * 0.25))),
    Js = add(Jp, mv(Rp, sc3(sub(r[1], r[0]), k))),
    Jc = add(Js, mv(Rs, sc3(sub(r[2], r[1]), k)));
  D3(0, Rp, Jp);
  D3(1, Rs, Js);
  D3(2, Rc, Jc);
  // the legs reach down to where the feet are
  for (const [i, sd] of [
    [0, 1],
    [1, -1],
  ]) {
    const ti = sd > 0 ? 8 : 11,
      F = G0.feet[i],
      hip = add(Jp, mv(Rp, sc3(sub(r[ti], r[0]), k))),
      foot = [F.x, F.y, r[ti + 2][2] * k[1] + F.z + Math.max(0, F.pitch) * 3.0 * k[1]],
      kf = [Math.cos(F.yaw), Math.sin(F.yaw), 0];
    const [, ank] = limb(D, o, ti, ti + 1, Rp, hip, foot, add(kf, [hr[0] * sd * 0.12, hr[1] * sd * 0.12, 0]), k);
    D3(ti + 2, mm(Rz(F.yaw), Ryb(F.pitch)), ank);
  }
  heroArms(p, D, o, {
    aim,
    k,
    r,
    D3,
    H,
    gm,
    kick,
    rl,
    sw,
    shv,
    t,
    id,
    Jc,
    Rc,
    shR: add(Jc, mv(Rc, sc3(sub(r[4], r[2]), k))), // the right shoulder
    shL: add(Jc, mv(Rc, sc3(sub(r[6], r[2]), k))),
    Jh: add(Jc, mv(Rc, sc3(sub(r[3], r[2]), k))),
    headB: 3,
    arms: [4, 5, 6, 7],
    hands: null,
  });
}
// the arms and the gun on whichever skeleton (C: the pose so far, and its bones' numbers)
// the guns loaded a shell at a time (each shell its own reload)
const PER_SHELL = { shotgun: 1, lever: 1 };
// the guns whose magazine comes out on a reload, and its middle (gun units: tools/mesh/guns.mjs mag_)
export const MAG_OUT = {
  rifle: [4.6, 0, -1.6],
  smg: [4.4, 0, -1.4],
  auto: [4.3, 0, -1.3],
  lmg: [3, 0.25, -1.45],
  pistol: [-0.36, 0, -1.08],
};
export const MAG_C = Object.fromEntries(
  Object.entries(MAG_OUT).map(([g, c]) => ['mag_' + g, g === 'pistol' ? c.map(v => v / 1.2) : c])
); // (in the mesh's own units: the pistol's is drawn a fifth over)
// the free hand through a reload, at its point u (0..1): a magazine's out, dropped; a fresh one fetched from the
// front of the vest, brought up and seated (0.6, when its sound plays); then, if the gun ran dry, the bolt or slide
// racked (0.84) and the hand back. A shell at a time: to the pouch on the belt, back, and thumbed into the gate
function reloadHand(p, H, G, W, hand, Jc, Rc, k) {
  const u = clamp(1 - p.reload / (p.reloadMax || 1), 0, 1),
    gm = gunModel(heldGun(p)),
    well = hand(H.mag),
    below = hand(add(H.mag, [-0.5, 0.5, -6])), // (a magazine's length below the well)
    pouch = add(Jc, mv(Rc, sc3([3.2, -2.2, -7.5], k))), // (on the vest's front, the free hand's side, low)
    path = (keys, u) => {
      let i = 0;
      while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
      const [u0, a] = keys[i],
        [u1, b] = keys[i + 1],
        x = clamp((u - u0) / Math.max(1e-3, u1 - u0), 0, 1);
      return lerp3(a, b, x * x * (3 - 2 * x));
    };
  if (PER_SHELL[gm]) {
    const gate = hand(add(H.mag, [0, 0.3, -0.8])),
      push = hand(add(H.mag, [1.8, 0.3, -0.6]));
    return path(
      [
        [0, gate],
        [0.4, pouch],
        [0.78, gate],
        [0.9, push],
        [1, gate],
      ],
      u
    );
  }
  const rack = !!(p.rl && p.rl.steps && p.rl.steps.some(s => s[2])),
    bolt = hand(gm === 'pistol' ? [-1.8, 0.4, 1.6] : add(H.mag, [-1.5, 1.8, 3.6])),
    pulled = hand(gm === 'pistol' ? [-4.6, 0.4, 1.6] : add(H.mag, [-5.5, 1.8, 3.6])),
    fore = hand(H.fore);
  return path(
    rack
      ? [
          [0, fore],
          [0.06, well],
          [0.2, below],
          [0.38, pouch],
          [0.52, below],
          [0.6, well],
          [0.72, bolt],
          [0.82, bolt],
          [0.86, pulled],
          [0.94, fore],
          [1, fore],
        ]
      : [
          [0, fore],
          [0.06, well],
          [0.2, below],
          [0.38, pouch],
          [0.52, below],
          [0.6, well],
          [0.66, well],
          [0.82, fore],
          [1, fore],
        ],
    u
  );
}
function heroArms(p, D, o, C) {
  const { aim, k, r, D3, H, gm, kick, rl, sw, shv, t, id, Jc, Rc, shR, shL } = C;
  void r;
  // the gun, held as that kind is: a long gun's stock in the shoulder, the cheek down on it; a submachine gun tucked
  // in tight; the machine gun at the hip under the arm; a pistol out in both hands at arm's length
  const af = [Math.cos(aim), Math.sin(aim), 0],
    ar = [-Math.sin(aim), Math.cos(aim), 0],
    up = [0, 0, 1],
    low = rl * 0.5 + sw * 0.9, // the muzzle down: reloading, swapping
    // where in the reload (its sounds' beats: the magazine out, the fresh one seated at 0.6, the bolt racked at 0.84);
    // the gun jolted up as the magazine's seated, back as the bolt's let go
    RU = p.reload > 0 ? clamp(1 - p.reload / (p.reloadMax || 1), 0, 1) : -1,
    seat =
      RU >= 0 && !PER_SHELL[gm]
        ? Math.exp(-(((RU - 0.6) / 0.035) ** 2)) - 0.5 * Math.exp(-(((RU - 0.86) / 0.03) ** 2))
        : 0,
    Rg = mm(Rz(aim + rl * 0.25), mm(Ryb(low - kick * 0.12 - shv * 0.2 - seat * 0.09), Rxb(rl * 0.55))),
    W = (v, s = 1) => sc3(mv(Rg, v), [k[0] * s, k[1] * s]); // a point of the gun, in the street
  let G;
  if (H.style === 'pistol') {
    // a two-handed stance, pressed out but not locked: the elbows bent a little and out, the gun on the body's
    // middle line at chin height, the body turned a touch side-on behind it (blade); a straight-armed reach read
    // from above as two stiff poles
    const reach = (12.5 - kick * 2.0 - rl * 4.5 - sw * 4 + shv * 3) * k[0],
      mid = add(Jc, mv(Rc, sc3([1.5, 0.6, 0], k)));
    G = [mid[0] + af[0] * reach, mid[1] + af[1] * reach, shR[2] - (0.9 + rl * 4 + sw * 5) * k[1]];
  } else {
    // the stock's butt in the pocket inside the shoulder (lower, under the arm, for the machine gun); pulled in and
    // down to reload; driven out on a shove
    const pocket =
      H.style === 'hip'
        ? add(shR, add(mv(Rc, sc3([-1.0, -0.6, -8.5], k)), mul(af, 1.5 * k[0])))
        : H.style === 'compact'
          ? add(shR, mv(Rc, sc3([1.6, -2.4, -2.4], k)))
          : add(shR, mv(Rc, sc3([1.2, -1.8, 0.6], k))); // up at the cheek: the sights at the eye
    const P = add(pocket, add(mul(af, (shv * 5 - kick * 1.4 - rl * 2) * k[0]), mul(up, -(rl * 2.5 + sw * 3) * k[1])));
    G = sub(P, W(H.butt));
  }
  p._grip = [G[0], G[1], G[2]]; // copies: the pools are handed out afresh when the gun itself is posed
  p._gunR = Rg.slice();
  {
    const m = add(G, W(TIP[gm] || TIP.rifle));
    p._mz = [m[0], m[1], m[2]]; // the muzzle, for the shots (player-weapons.js)
    p._mzT = t;
  }
  // the other hand: on the fore-end (sliding back with a shotgun's pump), reloading, or thrown
  const pump = H.pump && p.pumpT > 0 && p.pumpT < 0.24 ? Math.sin((1 - p.pumpT / 0.24) * Math.PI) : 0,
    foreP = [H.fore[0] - pump * 3.2, H.fore[1], H.fore[2]],
    hand = v => add(G, W(add(v, [0.6, -0.5, -0.7]))),
    H2 =
      rl > 0.02 && RU >= 0
        ? lerp3(hand(foreP), reloadHand(p, H, G, W, hand, Jc, Rc, k), Math.min(1, rl * 1.4))
        : hand(foreP);
  // the head: to the aim; down on the stock behind a long gun
  const cheek = H.style === 'shoulder' ? 1 : H.style === 'compact' ? 0.5 : 0,
    Rh = mm(
      Rz(aim),
      mm(Rxb(cheek * (0.16 + (H.cheek ? 0.06 : 0)) * (1 - rl)), Ryb(0.06 + cheek * 0.1 - kick * 0.05 + rl * 0.42))
    ),
    Jh = C.Jh;
  D3(C.headB, Rh, Jh);
  // a throw: the free hand comes off the gun, back past the shoulder, and through the way it is thrown
  const tt = t - (p.throwT ?? -9),
    tk = tt >= 0 && tt < 0.36 && !(p.reload > 0) ? tt / 0.36 : -1;
  let HL = H2;
  if (tk >= 0 && !p.pour) {
    const ta = p.throwA ?? aim,
      tc = Math.cos(ta),
      ts = Math.sin(ta),
      bk = v3(shL[0] - tc * 13 * k[0], shL[1] - ts * 13 * k[0], shL[2] + 2.5 * k[1]),
      out = v3(shL[0] + tc * 34 * k[0], shL[1] + ts * 34 * k[0], shL[2] + 0.5 * k[1]); // at full stretch
    HL =
      tk < 0.08
        ? lerp3(H2, bk, tk / 0.08)
        : tk < 0.3
          ? lerp3(bk, out, (tk - 0.08) / 0.22)
          : lerp3(out, H2, (tk - 0.3) / 0.7);
  }
  p.__th = [HL[0], HL[1]]; // where the free hand is (the tests read it)
  // the magazine, on a reload (its beats as reloadHand's path): the hand on it at the well, drawing it out and down;
  // let go below the gun (the empty falls: game/state.js); none while the hand goes to the pouch; the fresh one in
  // the hand from the pouch, up and into the well, seated
  {
    const M = p._magAt || (p._magAt = [0, 0, 0]),
      W0 = p._magW || (p._magW = [0, 0, 0]);
    let off = 0;
    if (RU >= 0 && rl > 0.02 && !PER_SHELL[gm] && MAG_OUT[gm]) {
      if (RU >= 0.2 && RU < 0.38) off = -1;
      else if ((RU >= 0.06 && RU < 0.2) || (RU >= 0.38 && RU < 0.6)) off = 1;
    }
    if (off < 0 || !MAG_OUT[gm]) p._magAt = off < 0 ? null : M;
    else {
      const wh = hand(H.mag);
      M[0] = off ? HL[0] - wh[0] : 0;
      M[1] = off ? HL[1] - wh[1] : 0;
      M[2] = off ? HL[2] - wh[2] : 0;
      p._magAt = M;
      const c = add(G, W(MAG_OUT[gm]));
      W0[0] = c[0] + M[0];
      W0[1] = c[1] + M[1];
      W0[2] = c[2] + M[2]; // (where it is in the street: where the empty drops from)
    }
  }
  // the elbows: the gun arm's out to the side and down; the other's under the gun (a pistol's, both down and in)
  const pis = H.style === 'pistol';
  // (the hand's end is the fingertips: the grip sits in the palm, a little short of them and under)
  let GH = add(G, W(pis ? [0.9, 0.35, -0.6] : [1.0, 0.45, -0.9]));
  // pouring fuel (game/journey.js): the gun down on its sling, a jerrycan lifted in both hands in front of him and
  // tipped into the truck's filler, the right hand on its handles, the left under its front
  p._can = null;
  if (p.pour && FIG.models.jerry) {
    const s = FIGK * 1.0,
      tilt = 0.25 + 0.85 * Math.min(1, (p.pour.k || 0) * 3 + 0.3) * (0.92 + 0.08 * Math.sin(t * 9)),
      Rk = pickTurn(aim, aim + Math.PI / 2, tilt), // (its top, and the spout on it, tipped forward and down)
      ctr = [0, 0, 7.2],
      C = add(Jc, add(mul(af, 12 * k[0]), v3(0, 0, -17 * k[1]))),
      at = v => add(C, mul(mv(Rk, sub(v, ctr)), s));
    p._can = { R: Rk, c: [C[0], C[1], C[2]], s };
    GH = at([-1.2, -0.6, 15.9]);
    HL = at([3.6, 1.2, 2.0]);
    const sp = at([4.9, 0, 15.6]);
    p._spout = [sp[0], sp[1], sp[2]];
  }
  const [uR, fR, uL, fL] = C.arms,
    // (with hands of their own, the forearm reaches the wrist: the hand on in line with it to the grip)
    wristTo = (sh, tg) => {
      if (!C.hands) return tg;
      const d = sub(tg, sh),
        l = len(d) || 1,
        hl = len(sc3(sub(MODEL_END[C.hands[0]], REST[C.hands[0]]), k)) * 0.55;
      return sub(tg, mul(d, hl / l));
    };
  const [RfR, wR] = limb(
    D,
    o,
    uR,
    fR,
    Rc,
    shR,
    wristTo(shR, GH),
    add(mul(ar, pis ? 0.75 : 0.55), [0, 0, pis ? -0.8 : H.style === 'hip' ? -0.8 : -0.6]),
    k
  ); // out a little and down: seen from above a flared elbow reads as an arm hanging
  const [RfL, wL] = limb(
    D,
    o,
    uL,
    fL,
    Rc,
    shL,
    wristTo(shL, HL),
    add(mul(ar, pis ? -0.85 : 0.15), [0, 0, pis ? -0.7 : -1]),
    k
  );
  if (C.hands) {
    D3(C.hands[0], RfR, wR);
    D3(C.hands[1], RfL, wL);
  }
  heroLooks(p, D, o, id);
}
// the hero's (or a survivor's) looks, after its bones in its row
function heroLooks(p, D, o, id) {
  const q = o + NB * 12,
    L = (p.hv && CO_LOOK[p.hv]) || HERO_LOOK[p.npc ? 1 + (id % (HERO_LOOK.length - 1)) : 0],
    fl = p.hitT > 0 ? 0.12 : 0;
  D.set([p.x, p.y + 40, GS.gA ?? 1, fl], q);
  D.set([...L.sk.map(x => x * 0.86), 0], q + 4);
  D.set([...L.sh, 2], q + 8);
  D.set([...L.pa, 1.1], q + 12);
  D.set([...L.ha, 0], q + 16);
  D.set([1, 1, 1, 0], q + 20);
  D.set([0, 0, 0, 0.25], q + 24);
  D.set([0, 0, 0, 0], q + 28);
}
// which way a reaching leg's knee goes: where the recording has it, and a little forward, as knees bend (a leg held
// near straight, as a lame one is, has its knee almost on the line from hip to foot, and the reach could flip it
// from one side to the other frame to frame)
const kneeTo = (knee, mid, yaw, Hl) => add(sub(knee, mid), [Math.cos(yaw) * 0.1 * Hl, Math.sin(yaw) * 0.1 * Hl, 0]);
// a foot let go of (or its hold eased): what it was held off the recording by (rx, ry) settles out as a stiff
// spring does, from rest, so it doesn't set off at a jump; mostly gone in a sixth of a second
function settle(L, dt) {
  const w = 26;
  for (let left = dt; left > 1e-4; ) {
    const h = Math.min(left, 1 / 120);
    left -= h;
    L.vx = (L.vx || 0) + (-w * w * (L.rx || 0) - 2 * w * (L.vx || 0)) * h;
    L.vy = (L.vy || 0) + (-w * w * (L.ry || 0) - 2 * w * (L.vy || 0)) * h;
    L.rx = (L.rx || 0) + L.vx * h;
    L.ry = (L.ry || 0) + L.vy * h;
  }
}
// ---------- recorded motion, every bone (motion.js's FK), on the hero's fuller skeleton (tools/mesh/fk22.mjs) ----------
// a quaternion (x, y, z, w) as a turn
const q9 = q => {
  const [x, y, z, w] = q,
    R = m9();
  R[0] = 1 - 2 * (y * y + z * z);
  R[1] = 2 * (x * y - z * w);
  R[2] = 2 * (x * z + y * w);
  R[3] = 2 * (x * y + z * w);
  R[4] = 1 - 2 * (x * x + z * z);
  R[5] = 2 * (y * z - x * w);
  R[6] = 2 * (x * z - y * w);
  R[7] = 2 * (y * z + x * w);
  R[8] = 1 - 2 * (x * x + y * y);
  return R;
};
const FKQ = new Float32Array(22 * 4),
  FKR = new Float32Array(3);
// add a clip's moment (t seconds in; a loop wraps) into a blend (Q, and Rt its hips' place; FKQ and FKR unless
// given), w its share: every bone's turn and the hips' place
function fkAdd(c, t, w, loop, Q = FKQ, Rt = FKR) {
  if (w <= 0) return;
  const n = c.frames.length,
    x = (loop ? (((t / c.dur) % 1) + 1) % 1 : clamp(t / c.dur, 0, 0.9999)) * n,
    i = Math.floor(x),
    f = x - i,
    i2 = loop ? (i + 1) % n : Math.min(i + 1, n - 1),
    A = c.frames[i % n],
    B = c.frames[i2];
  for (let o4 = 0; o4 < 88; o4 += 4) {
    const a0 = A[o4],
      a1 = A[o4 + 1],
      a2 = A[o4 + 2],
      a3 = A[o4 + 3],
      sB = a0 * B[o4] + a1 * B[o4 + 1] + a2 * B[o4 + 2] + a3 * B[o4 + 3] < 0 ? -f : f,
      g = 1 - f,
      q0 = a0 * g + B[o4] * sB,
      q1 = a1 * g + B[o4 + 1] * sB,
      q2 = a2 * g + B[o4 + 2] * sB,
      q3 = a3 * g + B[o4 + 3] * sB,
      sw = q0 * Q[o4] + q1 * Q[o4 + 1] + q2 * Q[o4 + 2] + q3 * Q[o4 + 3] < 0 ? -w : w;
    Q[o4] += q0 * sw;
    Q[o4 + 1] += q1 * sw;
    Q[o4 + 2] += q2 * sw;
    Q[o4 + 3] += q3 * sw;
  }
  const ra = c.root[i % n],
    rb = c.root[i2];
  for (let j = 0; j < 3; j++) Rt[j] += (ra[j] * (1 - f) + rb[j] * f) * w;
}
// a looped recording's time at a stride's phase (its right foot landing at each whole one; over its strides in turn)
const fkT = (c, fph) => (((((fph + (c.ph0 || 0)) / (c.ns || 1)) % 1) + 1) % 1) * c.dur;
const FK2 = new Float32Array(22 * 4),
  FKR2 = new Float32Array(3);
const fkNorm = Q => {
  for (let o4 = 0; o4 < 88; o4 += 4) {
    const l =
      1 / (Math.sqrt(Q[o4] * Q[o4] + Q[o4 + 1] * Q[o4 + 1] + Q[o4 + 2] * Q[o4 + 2] + Q[o4 + 3] * Q[o4 + 3]) || 1);
    Q[o4] *= l;
    Q[o4 + 1] *= l;
    Q[o4 + 2] *= l;
    Q[o4 + 3] *= l;
  }
};
// one clip's moment alone, into Q (and its hips' place into Rt)
function fkSnap(Q, Rt, c, t, loop) {
  Q.fill(0);
  Rt.fill(0);
  fkAdd(c, t, 1, loop, Q, Rt);
  fkNorm(Q);
}
// bone b of Q moved toward Q2's by w
function fkMix(Q, Q2, b, w) {
  const o4 = b * 4;
  let d = 0;
  for (let j = 0; j < 4; j++) d += Q[o4 + j] * Q2[o4 + j];
  const s2 = d < 0 ? -1 : 1;
  for (let j = 0; j < 4; j++) Q[o4 + j] += (Q2[o4 + j] * s2 - Q[o4 + j]) * w;
  const l = 1 / (Math.sqrt(Q[o4] * Q[o4] + Q[o4 + 1] * Q[o4 + 1] + Q[o4 + 2] * Q[o4 + 2] + Q[o4 + 3] * Q[o4 + 3]) || 1);
  for (let j = 0; j < 4; j++) Q[o4 + j] *= l;
}
// each bone's turn from our rest to the recording's T-pose (the shortest one: both stand facing forward)
function fkAlign(MM) {
  if (MM.fkA) return MM.fkA;
  MM.fkA = FK.dir.map((d, b) => {
    const r = sub(MM.ends[b], MM.rest[b]),
      R = rotTo(r, d);
    return Array.from(R);
  });
  return MM.fkA;
}
function poseHeroFK(p, D, o) {
  poolReset();
  p._kits = null;
  const MM = FIG.models.hero;
  p.__MM = MM;
  REST = MM.rest;
  MODEL_END = MM.ends;
  const r = REST,
    t = GS.time,
    id = p.id || 0,
    bs = MM.scale * FIGK,
    k = [bs, bs],
    D3 = (b, R, J) => bone(D, o, b, mul3(R, k), J, r[b]),
    aim = p.npc ? (p.aim ?? p.bodyA) : p.bodyA,
    gm = gunModel(heldGun(p)),
    H = HOLD[gm] || HOLD.rifle,
    kick = clamp((p.recoil || 0) / 8, 0, 1),
    rl = clamp(p.rk || 0, 0, 1),
    dt = clamp(t - (p._hipT ?? t), 0, 0.1),
    // one of yours with nothing to shoot at carries the gun low and ready, not up at the sky (the swap's lowering, half
    // way), and brings it up as soon as there's something
    lr = (p._lr = lerp(
      p._lr || 0,
      p.npc && !p.tgt && GS.time - (p.lastShotT ?? -9) > 2 ? 0.55 : 0,
      Math.min(1, dt * 6)
    )),
    sw = Math.max(p.swap > 0 ? Math.sin(Math.min(1, p.swap / 0.3) * Math.PI) : 0, lr),
    shv = p.shoveT > 0 ? Math.sin(Math.PI * clamp(1 - p.shoveT / 0.25, 0, 1)) : 0,
    A = fkAlign(MM),
    par = MM.bones.map(b => b[1]),
    Hl = r[14][2] * k[1]; // a leg's length: the hips' height
  p._hipT = t;
  // where it's going against where it aims (+ to its right), and the recordings for it. Walking: forward the walk;
  // backward or to a side, a walk backward or sideways (CMU's: motion-cmu.js), blended by the direction, each turned
  // so that its going is the hero's and its body faces the aim. Running, no one shuffles sideways at a run: the legs
  // run the way it's going and the trunk twists back to the aim, as far as a trunk can; further round than that, it
  // backpedals
  // how he moves: yours, as the game drives you; one of your people, as they actually go (they're steered by a
  // velocity of their own, and nudged, jostled, boarded)
  if (p.npc) {
    const lx = p._lgX ?? p.x,
      ly = p._lgY ?? p.y,
      mx = dt > 0 ? (p.x - lx) / dt : 0,
      my = dt > 0 ? (p.y - ly) / dt : 0,
      ok = dt > 0 && Math.hypot(mx, my) < 600,
      g = Math.min(1, dt * 14);
    p._lgX = p.x;
    p._lgY = p.y;
    if (ok) {
      p._mvx = (p._mvx ?? 0) + (mx - (p._mvx ?? 0)) * g;
      p._mvy = (p._mvy ?? 0) + (my - (p._mvy ?? 0)) * g;
    }
  }
  // (riding the truck, its speed is yours but your feet are planted on its bed; in a boss's entrance everything holds
  // still: either way you stand, not walk on the spot)
  const held = !p.npc && (p.ride === 'truck' || GS.state === 'cine'),
    vx = held ? 0 : p.npc ? (p._mvx ?? 0) : p.vx || 0,
    vy = held ? 0 : p.npc ? (p._mvy ?? 0) : p.vy || 0,
    spd = Math.hypot(vx, vy),
    sL = spd / Hl, // leg lengths a second
    mA = spd > 4 ? Math.atan2(vy, vx) : aim,
    blade = (H.blade + shv * 0.1) * (1 - rl * 0.4),
    C = FK.clips,
    X = FKC,
    wM0 = clamp((sL - 0.08) / 0.35, 0, 1),
    // how much it's going, and how much running: eased, up in a tenth of a second or so, down over a quarter (a
    // runner can't stop his legs in a frame: the stride carries on to the next foot down and he settles from there)
    started = wM0 > 0 && !((p._wm ?? 0) > 0.05),
    wMove = (p._wm =
      (p._wm ?? wM0) + (wM0 - (p._wm ?? wM0)) * Math.min(1, dt * (wM0 > (p._wm ?? 0) ? 12 : p._phr > 0 ? 3 : 8))),
    wJ0 = clamp((sL - 1.2) / 2.0, 0, 1),
    wJ = (p._wj = (p._wj ?? wJ0) + (wJ0 - (p._wj ?? wJ0)) * Math.min(1, dt * (wM0 > 0 ? 10 : 3))),
    shortK = 1 - 0.3 * wJ, // running, the recorded athlete's stride is long: a shorter arc, at a quicker beat
    WALKS = [C.walk, X.sideM, X.back, X.side],
    // each walk's going: forward, right, back, left, round the circle
    G = WALKS.map((c, d) => (d ? (c.go < 0 ? c.go + 2 * Math.PI : c.go) : 0)),
    rel = spd > 4 ? angDiff(aim, mA) : 0,
    rr = rel < 0 ? rel + 2 * Math.PI : rel,
    dw = p._dw || (p._dw = [1, 0, 0, 0]),
    // running: how far into the backpedal (from 95° off the aim to 145°); its going, on the side it's turning
    bkW = clamp((Math.abs(rel) - 1.65) / 0.88, 0, 1),
    goBP = rel >= 0 ? X.bpedal.go : X.bpedal.go - 2 * Math.PI;
  {
    // the two directions it's between, and how far
    const W = [0, 0, 0, 0];
    for (let d = 0; d < 4; d++) {
      const a = G[d],
        b = d < 3 ? G[d + 1] : 2 * Math.PI;
      if (rr >= a && rr <= b) {
        const u = (rr - a) / Math.max(1e-3, b - a);
        W[d] = 1 - u;
        W[(d + 1) % 4] += u;
        break;
      }
    }
    p._dwT = W; // (the directions as wanted: what the legs face by)
    // (its legs change over in a moment, not in a frame)
    let sm = 0;
    for (let d = 0; d < 4; d++) sm += dw[d] += (W[d] - dw[d]) * Math.min(1, dt * 10);
    for (let d = 0; d < 4; d++) dw[d] /= sm || 1;
    p._bk = (p._bk ?? 0) + (bkW * bkW * (3 - 2 * bkW) - (p._bk ?? 0)) * Math.min(1, dt * 10);
  }
  const bk = p._bk;
  if (p._legA === undefined) p._legA = aim;
  {
    // moving, the body turned off its going by the blend's own going: walking, it faces the aim (once the blend has
    // caught up); running, the legs face the way it runs, or backpedalling, the aim again. Standing, the legs turn
    // after the trunk once it's twisted too far
    // (by the directions as wanted, as the backpedal below: eased, setting off back from a run, the legs would turn
    // to face the way he goes, and back again)
    const dT = p._dwT || dw;
    let gW = 0;
    for (let d = 0; d < 4; d++) gW += dT[d] * (G[d] + 2 * Math.PI * Math.round((rr - G[d]) / (2 * Math.PI)));
    gW -= 2 * Math.PI * Math.round(gW / (2 * Math.PI) - rel / (2 * Math.PI));
    // (the backpedal as it's wanted, not as eased in: the legs' own turn is eased, and reversing, a legs' going
    // eased from the run's would set them turning round to face the way he now goes, and back)
    const bkT = bkW * bkW * (3 - 2 * bkW),
      gB = gW * (1 - wJ) + bkT * goBP * wJ,
      want = sL > 0.25 ? mA - gB : Math.abs(angDiff(p._legA, aim + blade)) > 1.1 ? aim : p._legA;
    // (no faster than a body pivots on its feet: reversing a run sideways, the legs turn half round)
    p._legA += clamp(angDiff(p._legA, want) * Math.min(1, dt * (sL > 0.25 ? 10 : 5)), -9 * dt, 9 * dt);
  }
  const yaw = p._legA,
    tw = clamp(angDiff(yaw, aim + blade), -1.75, 1.75);
  // each recording's weight, how much of its swing (a recording slower or faster than he goes brought to his pace,
  // half by a longer or shorter step and half by a quicker or slower one), and so the ground a stride covers
  let cyc = 0,
    aB = 0,
    stK = 0;
  const use = [];
  // (running, CMU's run, at about his pace: the library's athletic jog bounds and floats, and read as a skip)
  for (const [c, w] of [...WALKS.map((c, d) => [c, dw[d] * (1 - wJ)]), [X.run, (1 - bk) * wJ], [X.bpedal, bk * wJ]]) {
    if (w < 1e-3) continue;
    const own = c === C.walk || c === C.jog,
      a = own ? shortK : clamp(Math.sqrt(sL / c.v), 0.75, 1.5);
    cyc += w * ((c.v * c.dur) / (c.ns || 1)) * a;
    aB += w * a;
    stK += w * (c === C.walk ? MOTION.walk.st : c === C.jog ? MOTION.jog.st : c.st);
    use.push([c, w]);
  }
  // setting off, it pushes off: the stride taken up where a foot leaves the ground. Stopping, the stride runs on
  // to the next foot down (the braking step), and holds there
  if (started) p._fph = Math.floor(p._fph || 0) + 0.5;
  const rate = cyc > 0.01 && sL > 0.25 ? sL / cyc : 0;
  if (rate > 0) {
    p._fph = (p._fph || 0) + dt * rate;
    p._phr = rate;
  } else if (p._phr > 0) {
    const f0 = (((p._fph || 0) % 0.5) + 0.5) % 0.5,
      st = dt * p._phr;
    if (f0 + st >= 0.5) {
      p._fph += 0.5 - f0;
      p._phr = 0;
    } else p._fph += st;
  }
  const still = !(rate > 0) && !(p._phr > 0); // (stopped, the last step down)
  const ph = ((p._fph % 1) + 1) % 1,
    wJog = wJ * wMove * (1 - bk);
  FKQ.fill(0);
  FKR.fill(0);
  fkAdd(C.idle, t, 1 - wMove, true);
  for (const [c, w] of use) fkAdd(c, fkT(c, p._fph), w * wMove, true);
  fkNorm(FKQ);
  // the legs' arc: their turns drawn toward standing (shorter), or on past the recording's (longer)
  if (Math.abs(1 - aB) > 0.01 && wMove > 0) {
    fkSnap(FK2, FKR2, C.idle, t, true);
    for (let b = 14; b < 22; b++) fkMix(FKQ, FK2, b, 1 - aB);
  }
  // a gun up is carried steady: the recorded runner's trunk and shoulders swing with free arms, and a man holding a
  // rifle at his shoulder keeps them still over the hips (the hips and legs move as recorded). Each bone of the trunk
  // held toward standing, more the higher it is
  if (wMove > 0) {
    fkSnap(FK2, FKR2, C.idle, t, true);
    // how still, by how it's held: a rifle or shotgun in the shoulder stillest (a little of the run left in it); a
    // submachine gun tucked in, nearly; a pistol out in both hands lets the shoulders work more; the machine gun's
    // weight at the hip sways the trunk most
    const STEADY = [0, 0.4, 0.65, 0.85, 0.85, 0, 0.9, 0, 0, 0, 0.9],
      sk = { shoulder: 1, compact: 0.9, pistol: 0.72, hip: 0.62 }[H.style] ?? 1;
    for (let b = 1; b <= 10; b++) if (STEADY[b]) fkMix(FKQ, FK2, b, STEADY[b] * sk * wMove);
  }
  // a hit: the trunk and head jolted back, as the recording flinches
  const hurtK = p.hurt > 0 ? Math.sin(Math.PI * clamp(1 - p.hurt / 0.18, 0, 1)) * 0.85 : 0;
  if (hurtK > 0) {
    fkSnap(FK2, FKR2, C.hit, 0.14, false);
    for (let b = 1; b <= 5; b++) fkMix(FKQ, FK2, b, hurtK);
  }
  // the dodge roll: the recording's roll, through in half a second, the way it was thrown; then back on its feet and
  // round to the aim. The same roll whichever way: thrown back the way he faces, he turns with it and rolls forward
  // too (a backward somersault started by sitting back, so the throw's burst of speed went by before the roll began:
  // a slide, then a roll; the forward roll is the throw)
  if (p.dashT > 0 && !(t - (p._rollT0 ?? -9) < (p._rollD || 0.5) + 0.05)) {
    const da = p.dashA ?? yaw;
    p._rollT0 = t;
    p._rollB = false;
    p._rollA = da;
    p._rollD = 0.5;
    // thrown back the way he faces (backing off), not a roll: a quick dash back on his feet, still on his aim (the legs
    // step it: stepFeet); the roll is for going forward or to the side
    p._rollX = Math.abs(angDiff(da, aim)) > 2.0;
  }
  const rollU = (t - (p._rollT0 ?? -9)) / (p._rollD || 0.5),
    rollK = rollU >= 0 && rollU < 1 && !p._rollX ? Math.min(1, rollU / 0.08, (1 - rollU) / 0.15) : 0;
  const stepB = 0; // (backing off was two quick steps back; it's a roll now, as forward)
  if (rollK > 0 && p._rollB) {
    fkSnap(FK2, FKR2, X.broll, Math.min(rollU, 0.999) * X.broll.dur, false);
    for (let b = 0; b < 22; b++) fkMix(FKQ, FK2, b, rollK);
    for (let j = 0; j < 3; j++) FKR[j] += (FKR2[j] - FKR[j]) * rollK;
  } else if (rollK > 0) {
    fkSnap(FK2, FKR2, C.roll, 0.45 + rollU * 1.05, false); // (the tuck and roll, not the dive before it)
    for (let b = 0; b < 22; b++) fkMix(FKQ, FK2, b, rollK);
    for (let j = 0; j < 3; j++) FKR[j] += (FKR2[j] - FKR[j]) * rollK;
  }
  // killed (or one of your people, downed): his knees go and he falls back, as recorded, and lies there (the gun still
  // in his hand); one of your people brought round gets up as recorded (Library 2's get-up)
  const downed = (p.hp <= 0 && GS.state === 'over' && p === GS.P) || (p.npc && (p.down > 0 || p.gone)),
    deadU = downed ? t - (p._deadT ?? (p._deadT = t)) : -1,
    dK = deadU >= 0 ? Math.min(1, deadU / 0.15) : 0;
  if (deadU < 0 && p._deadT !== undefined) {
    p._deadT = undefined;
    if (p.npc) p._upT = t; // (back on their feet: up off the ground)
  }
  if (dK > 0) {
    fkSnap(FK2, FKR2, C.death, Math.min(deadU, C.death.dur - 0.01), false);
    for (let b = 0; b < 22; b++) fkMix(FKQ, FK2, b, dK);
    for (let j = 0; j < 3; j++) FKR[j] += (FKR2[j] - FKR[j]) * dK;
  }
  const upU = t - (p._upT ?? -99),
    uK = upU >= 0 && upU < C.getup.dur ? Math.min(1, (C.getup.dur - upU) / 0.25) : 0;
  if (uK > 0) {
    fkSnap(FK2, FKR2, C.getup, upU, false);
    for (let b = 0; b < 22; b++) fkMix(FKQ, FK2, b, uK);
    for (let j = 0; j < 3; j++) FKR[j] += (FKR2[j] - FKR[j]) * uK;
  }
  const allK = Math.max(stepB > 0 ? 0 : rollK, dK, uK); // (every bone as recorded: rolling, down, getting up)
  // a throw: the trunk winds up and comes through with it as recorded (the overhand throw's wind-up to its follow-
  // through, at the toss's own quick pace; the arm keeps its own path, as heroArms throws it)
  {
    const tt = t - (p.throwT ?? -9),
      tk = tt >= 0 && tt < 0.36 && !(p.reload > 0) && allK === 0 ? tt / 0.36 : -1;
    if (tk >= 0) {
      fkSnap(FK2, FKR2, C.throw, 0.3 + tk * 0.5, false);
      const w = Math.sin(Math.PI * tk) * (p.throwLite ? 0.2 : 0.7); // (gear lobbed while you fire: the trunk barely turns)
      for (const b of [1, 2, 3, 4, 5]) fkMix(FKQ, FK2, b, w);
    }
  }
  const yawR = rollK > 0 ? p._rollA + angDiff(p._rollA, yaw) * (1 - rollK) : yaw;
  // place the bones: each turned as recorded (and the trunk on round to the aim), its joint where its parent's bone
  // puts it (our lengths, their turns)
  const Ry = Rz(yawR),
    J = [],
    R = [];
  const rk = wJ * wMove, // (running the trunk round, a little more of the twist low, the hips taking some)
    twistOf = b =>
      allK > 0
        ? 0
        : b === 0
          ? 0.12 * rk
          : b === 1
            ? 0.25 + 0.1 * rk
            : b === 2
              ? 0.6 + 0.1 * rk
              : b >= 3 && b <= 13
                ? 1
                : 0,
    // leaning into the run (the steadied trunk would stand up straight); and into a change of pace, as a body with
    // weight does: forward setting off, back pulling up, into a turn's side
    acc = (() => {
      const a = p._acc || (p._acc = [0, 0]),
        pv = p._pv || [vx, vy],
        g = dt > 0 ? Math.min(1, dt * 12) : 0;
      if (dt > 0) {
        a[0] += ((vx - pv[0]) / dt - a[0]) * g;
        a[1] += ((vy - pv[1]) / dt - a[1]) * g;
      }
      p._pv = [vx, vy];
      const A = 26 * Hl; // (about the hardest it speeds up or stops)
      return [
        clamp((a[0] * Math.cos(yawR) + a[1] * Math.sin(yawR)) / A, -1, 1),
        clamp((-a[0] * Math.sin(yawR) + a[1] * Math.cos(yawR)) / A, -1, 1),
      ];
    })(),
    // (the recorded run leans of itself; reloading, he hunches in over the gun a little)
    lean = (0.05 * wJog + 0.16 * acc[0] + 0.07 * clamp(p.rk || 0, 0, 1)) * (1 - allK),
    roll = 0.09 * acc[1] * (1 - allK),
    // each shot jolts the trunk: back, and round off the gun shoulder, on a stiff spring that rebounds a little and
    // settles in a fifth of a second; kicked as hard as the gun kicks (a shotgun rocks him, a pistol barely). The
    // head, aimed on its own, stays on the target, and the gun, carried by the chest, goes back with it
    rc = (() => {
      const S = p._rc || (p._rc = { x: 0, v: 0, shot: p.lastShotT ?? -9 });
      if (p.lastShotT !== undefined && p.lastShotT !== S.shot) {
        S.shot = p.lastShotT;
        if (t - p.lastShotT < 0.1) S.v += clamp((p.recoil || 0) / 8, 0.2, 1.6) * 2.4;
      }
      for (let left = dt; left > 1e-4; ) {
        const h = Math.min(left, 1 / 120),
          w = 21,
          z = 0.45;
        left -= h;
        S.v += (-w * w * S.x - 2 * z * w * S.v) * h;
        S.x += S.v * h;
      }
      return S.x * (1 - allK);
    })();
  for (let b = 0; b < 22; b++) {
    const lf = b === 1 ? 0.4 : b === 2 ? 0.7 : b >= 3 && b <= 13 ? 1 : 0,
      rf = b === 1 ? 0.25 : b === 2 ? 0.55 : b >= 3 && b <= 13 ? 1 : 0, // (the jolt mostly high in the chest)
      Rb = mm(
        mm(
          mm(Rz(yawR + tw * twistOf(b) + rc * 0.35 * rf), mm(Ryb(lean * lf - rc * rf), Rxb(roll * lf))),
          q9([FKQ[b * 4], FKQ[b * 4 + 1], FKQ[b * 4 + 2], FKQ[b * 4 + 3]])
        ),
        A[b]
      );
    R[b] = Array.from(Rb);
    if (b === 0) {
      const rr = mv(Ry, [FKR[0] * Hl, FKR[1] * Hl, 0]);
      J[0] = [p.x + rr[0], p.y + rr[1], r[0][2] * k[1] + FKR[2] * Hl];
    } else {
      const pj = par[b],
        d = mv(R[pj], sc3(sub(r[b], r[pj]), k));
      J[b] = [J[pj][0] + d[0], J[pj][1] + d[1], J[pj][2] + d[2]];
    }
    if (b < 6 || b >= 14 || b === 6 || b === 10 || allK > 0) D3(b, R[b], J[b]);
  }
  // the feet: each held where it was put down while the recording has it on the ground (no sliding, the body may
  // turn and change pace over it), the leg reaching to it; let go as it lifts
  {
    const lk = p._flk || (p._flk = [{ on: false }, { on: false }]);
    for (const [i, ti] of [
      [0, 14],
      [1, 18],
    ]) {
      const L = lk[i],
        fp = (ph + i * 0.5) % 1,
        down = allK > 0 || stepB > 0 || p.ride ? false : still || wMove < 0.05 ? true : fp < stK,
        ank = J[ti + 2],
        // a hold let go, or eased in or out, takes the foot from where it was to where the recording has it over a
        // few frames, not in one (settle)
        free = () => {
          L.on = false;
          L.rx += L.px || 0;
          L.ry += L.py || 0;
          L.pw = L.px = L.py = 0;
        };
      settle(L, dt);
      if (!down) {
        if (L.on) free();
      } else if (!L.on) {
        L.on = true;
        L.x = ank[0];
        L.y = ank[1];
        L.u = -1;
        L.pw = 0;
      }
      // standing with a foot left out of place (stopped mid-stride, or turned on the spot), it steps it under him:
      // lifted, carried and put down, one foot at a time
      let lift = 0,
        ox = 0,
        oy = 0;
      if (L.on) {
        if (still) {
          const off = Math.hypot(L.x - ank[0], L.y - ank[1]);
          if (!(L.u >= 0) && off > 0.14 * Hl && !(lk[1 - i].u >= 0)) {
            L.u = 0;
            L.sx = L.x;
            L.sy = L.y;
          }
          if (L.u >= 0) {
            L.u = Math.min(1, L.u + dt / 0.22);
            const e = L.u * L.u * (3 - 2 * L.u);
            L.x = L.sx + (ank[0] - L.sx) * e;
            L.y = L.sy + (ank[1] - L.sy) * e;
            lift = Math.sin(Math.PI * L.u) * 0.09 * Hl;
            if (L.u >= 1) L.u = -1;
          }
        } else L.u = -1;
        if (Math.hypot(L.x - ank[0], L.y - ank[1]) > 0.6 * Hl)
          free(); // left too far behind: let it go (the next step puts it down again)
        else {
          const w = still || wMove < 0.05 ? 1 : clamp(Math.min(fp / stK, 1 - fp / stK) / 0.12, 0, 1),
            dw = (L.pw || 0) - w;
          L.rx += dw * (L.x - ank[0]);
          L.ry += dw * (L.y - ank[1]);
          L.pw = w;
          ox = L.px = (L.x - ank[0]) * w;
          oy = L.py = (L.y - ank[1]) * w;
        }
      }
      if (!L.on && Math.hypot(L.rx, L.ry) < 0.05 && Math.hypot(L.vx, L.vy) < 1) continue;
      const tg = [ank[0] + ox + L.rx, ank[1] + oy + L.ry, ank[2] + lift],
        mid = mul(add(J[ti], ank), 0.5),
        [, E] = limb(D, o, ti, ti + 1, R[0], J[ti], tg, kneeTo(J[ti + 1], mid, yawR, Hl), k, [R[ti], R[ti + 1]]);
      D3(ti + 2, R[ti + 2], E);
      const toe = add(E, mv(R[ti + 2], sc3(sub(r[ti + 3], r[ti + 2]), k)));
      D3(ti + 3, R[ti + 3], toe);
    }
  }
  if ((rollK > 0 && !stepB && rollU < 0.7) || dK > 0 || uK > 0) {
    // mid-roll (or fallen) the gun stays in the right hand (coming up out of a roll, the hands go back to it)
    const hd = sub(J[9], J[8]),
      Rg = rotTo([1, 0, 0], hd);
    p._grip = add(J[9], mul(hd, 0.4));
    p._gunR = Array.from(Rg);
    p._mz = null;
    heroLooks(p, D, o, id);
    return;
  }
  // the arms and the gun as before, from the recorded shoulders
  heroArms(p, D, o, {
    aim,
    k,
    r,
    D3,
    H,
    gm,
    kick,
    rl,
    sw,
    shv,
    t,
    id,
    Jc: J[3],
    Rc: R[3],
    shR: J[7],
    shL: J[11],
    Jh: J[5],
    headB: 5,
    arms: [7, 8, 11, 12],
    hands: [9, 13],
  });
}
// the colours you and they wear: skin, jacket, trousers, hair
const HERO_LOOK = [
  { sk: [0.78, 0.6, 0.48], sh: [0.27, 0.31, 0.26], pa: [0.24, 0.25, 0.22], ha: [0.18, 0.13, 0.09] },
  { sk: [0.6, 0.44, 0.33], sh: [0.42, 0.3, 0.2], pa: [0.22, 0.24, 0.3], ha: [0.08, 0.07, 0.06] },
  { sk: [0.86, 0.7, 0.58], sh: [0.2, 0.26, 0.36], pa: [0.3, 0.28, 0.24], ha: [0.5, 0.38, 0.2] },
  { sk: [0.42, 0.3, 0.22], sh: [0.4, 0.4, 0.38], pa: [0.2, 0.2, 0.2], ha: [0.05, 0.05, 0.05] },
];
// and the two met on the road (actors/backups.js), in what they wore when they were the one you played: the Deputy's
// khaki duty shirt and dark uniform trousers, the Gunslinger's weathered brown coat over faded denim
const CO_LOOK = {
  breacher: { sk: [0.6, 0.44, 0.33], sh: [0.5, 0.43, 0.3], pa: [0.15, 0.16, 0.19], ha: [0.08, 0.07, 0.06] },
  grenadier: { sk: [0.84, 0.66, 0.52], sh: [0.34, 0.23, 0.14], pa: [0.27, 0.3, 0.38], ha: [0.42, 0.3, 0.16] },
};
// the gun itself: its own small mesh at the grip, along the aim
function poseGun(g, D, o) {
  poolReset();
  g._kits = null;
  const MM = FIG.models[g.gm];
  REST = MM.rest;
  MODEL_END = MM.ends;
  const bs = FIGK * MM.scale,
    h = g.holder,
    J = g.off ? v3(h._grip[0] + g.off[0], h._grip[1] + g.off[1], h._grip[2] + g.off[2]) : h._grip; // (a magazine out of the gun, in the hand: moved with it)
  bone(D, o, 0, mul3(h._gunR, [bs, bs]), J, REST[0]);
  for (let b = 1; b < REST.length; b++) bone(D, o, b, [0, 0, 0, 0, 0, 0, 0, 0, 0], J, REST[b]);
  const q = o + NB * 12;
  D.set([g.x, g.y + 40, GS.gA ?? 1, 0], q);
  for (let i = 4; i < 24; i += 4) D.set([1, 1, 1, 0], q + i);
  D.set([0, 0, 0, 0], q + 24); // nothing lost (a set bit there paints a stump's raw red)
  D.set([0, 0, 0, 0], q + 28);
}
// ---------- the cars and trucks: one rigid bone, at their true size, each in its own paint ----------
// which model a car is drawn with
export const vehOf = c =>
  c.burnt || c.fire > 0.5
    ? c.truck
      ? c.tanker
        ? 'v_tanker'
        : 'v_truck'
      : c.tanker
        ? 'v_fuelvan'
        : 'v_burnt'
    : c.tanker
      ? c.truck
        ? 'v_tanker'
        : 'v_fuelvan'
      : c.police
        ? 'v_police'
        : c.truck
          ? 'v_truck'
          : { hatchback: 'v_hatch', wagon: 'v_wagon', pickup: 'v_pickup', suv: 'v_suv' }[c.body] || 'v_car';
function poseCar(c, D, o) {
  poolReset();
  c._kits = null;
  const MM = FIG.models[c.veh3d];
  REST = MM.rest;
  MODEL_END = MM.ends;
  const burnt = c.burnt || c.fire > 0.5;
  bone(D, o, 0, mul3(Rz(c.a || 0), [1, 1]), [c.x, c.y, 0], REST[0]);
  for (let b = 1; b < REST.length; b++) bone(D, o, b, [0, 0, 0, 0, 0, 0, 0, 0, 0], [c.x, c.y, 0], REST[b]);
  const q = o + NB * 12,
    t = c.police ? [0.07, 0.08, 0.1] : c.tint || [0.8, 0.8, 0.8],
    pk = c.police ? 1 : 0.82, // the paint: its tint over a pale grey, as the pictures have it
    hk =
      burnt && !c.burnt
        ? 0.5
        : (c.burnt ? (c.truck || c.tanker ? 0.3 : 1) : 0.62 + 0.38 * clamp(c.hp / c.max, 0, 1)) * (c.fire ? 0.85 : 1),
    lit = c.lights && !burnt ? (c.hp < c.max * 0.5 && Math.sin(GS.time * 23 + c.x) > 0.3 ? 0.15 : 1) : 0;
  D.set([c.x, c.y + 40, 1, c.flash > 0 ? 0.12 : 0], q);
  D.set([0.6, 0.6, 0.6, 0], q + 4);
  D.set([t[0] * pk, t[1] * pk, t[2] * pk, -1], q + 8);
  D.set([0.3, 0.3, 0.3, 1], q + 12);
  D.set([0.3, 0.3, 0.3, 0], q + 16);
  D.set([hk, hk * (c.fire ? 0.9 : 1), hk * (c.fire ? 0.82 : 1), 0], q + 20);
  D.set([0, 0, 0, -1], q + 24); // (-1: a car, see FS)
  D.set([1.6 * lit, 1.5 * lit, 1.25 * lit, lit ? 1 : 0], q + 28);
}
// ---------- the things to pick up and the supply drops: one rigid bone, at the size their pictures are drawn ----------
// (k.pk: its turn (9), where it is (3), its scale across and up (2), how solid, where its shine is; set by drawPick3D)
function posePick(k, D, o) {
  poolReset();
  k._kits = null;
  const MM = FIG.models[k.pk3d],
    Q = k._pk;
  REST = MM.rest;
  MODEL_END = MM.ends;
  const Rs = mul3(Q.R, [Q.s, Q.sz]),
    J = Q.c ? sub(Q.at, mv(Rs, Q.c)) : Q.at;
  bone(D, o, 0, Rs, J, REST[0]);
  for (let b = 1; b < REST.length; b++) bone(D, o, b, [0, 0, 0, 0, 0, 0, 0, 0, 0], J, REST[b]);
  const q = o + NB * 12;
  D.set([Q.at[0], Q.at[1] + 40, Q.al, Q.sw], q);
  for (let i = 4; i < 20; i += 4) D.set([1, 1, 1, 0], q + i);
  D.set([1, 1, 1, 0], q + 20); // (its own colours: no tint, no pattern)
  D.set([0, 0, 0, -2], q + 24); // (-2: a thing to pick up, see FS)
  D.set([0, 0, 0, Q.seed], q + 28);
}
const pkName = n => (FIG.models[n] ? n : 'pk_' + n); // (a magazine is a model of its own: mag_rifle)
export const pick3dOn = n => fig3dOn() && !!FIG.models[pkName(n)];
// a thing to pick up in 3D, n its model (pk_ + n), drawn with the street's things (draw-props.js): turned by R (a
// 3×3, row-major), at x, y and z up off the street, s its scale (sz up, for a landing's squash), al how solid, sw where
// its shine has got to (in its own units; far off for none). False if it can't: the picture draws
export function drawPick3D(k, n, R, x, y, z, s, sz, al, sw, ctr = null) {
  if (!pick3dOn(n)) return false;
  if (k.id === undefined) k.id = 11000 + Math.floor(Math.random() * 9999);
  k.pk3d = pkName(n);
  const Q = k._pk || (k._pk = { R: null, at: [0, 0, 0], s: 1, sz: 1, al: 1, sw: 99, seed: Math.random() });
  Q.R = R;
  Q.at[0] = x;
  Q.at[1] = y;
  Q.at[2] = z;
  Q.s = s;
  Q.sz = sz;
  Q.al = al;
  Q.sw = sw;
  Q.c = ctr; // (turned about this point of it, not its own origin: a magazine, made in its gun's place)
  if (k._f3 === frame) k._f3 = -1; // (moved since it was posed this frame: a shadow pass, then the picture's own)
  return drawFig3D(k);
}
// a turn: yaw about the up, then tipped by th about the level axis at ax (a tumble in the air, a lid's wobble)
export function pickTurn(yaw, ax, th) {
  const c = Math.cos(yaw),
    s = Math.sin(yaw),
    Y = [c, -s, 0, s, c, 0, 0, 0, 1];
  if (!th) return Y;
  const ca = Math.cos(ax),
    sa = Math.sin(ax),
    k = [ca, sa, 0],
    C = Math.cos(th),
    S = Math.sin(th),
    t = 1 - C,
    T = [
      t * k[0] * k[0] + C,
      t * k[0] * k[1],
      S * k[1],
      t * k[0] * k[1],
      t * k[1] * k[1] + C,
      -S * k[0],
      -S * k[1],
      S * k[0],
      C,
    ],
    M = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) M[i * 3 + j] = T[i * 3] * Y[j] + T[i * 3 + 1] * Y[3 + j] + T[i * 3 + 2] * Y[6 + j];
  return M;
}
// a car in 3D (cars.js), drawn where it falls among the street's things: what's queued before it goes first
export function drawCar3D(c) {
  if (!fig3dOn() || opt.car3d === false) return false;
  const m = vehOf(c);
  if (!FIG.models[m]) return false;
  if (c.id === undefined) c.id = 7000 + Math.floor(Math.random() * 999);
  c.veh3d = m;
  figFlush();
  CLR = true;
  if (!drawFig3D(c)) return false;
  figFlush();
  CLR = true;
  return true;
}
// riding in the truck's bed: all of him, and his gun's grip and muzzle, up on its floor (its height there, from its mesh)
function onBed(p, D, o) {
  const T = GS.truck;
  if (p._climbZ > 0 && p.ride !== 'truck' && T) {
    const dz = (carTop(T, -40, 0) || 30) * p._climbZ,
      nb = (p.__MM || FIG.models.hero).rest.length;
    for (let b = 0; b < nb; b++) D[o + b * 12 + 11] += dz;
    return;
  } // climbing in over the tailgate (journey.js): lifted up onto it, as high as he'll ride
  if (p.ride !== 'truck' || !T) return;
  const dx = p.x - T.x,
    dy = p.y - T.y,
    ca = Math.cos(T.a || 0),
    sa = Math.sin(T.a || 0),
    dz = carTop(T, dx * ca + dy * sa, -dx * sa + dy * ca) || 30;
  const nb = (p.__MM || FIG.models.hero).rest.length;
  for (let b = 0; b < nb; b++) D[o + b * 12 + 11] += dz;
  if (p._grip) p._grip[2] += dz;
  if (p._mz) p._mz[2] += dz;
}
const poseFig = (e, D, o) => {
  const m = modelOf(e);
  if (e.pk3d) return posePick(e, D, o);
  if (e.veh3d) return poseCar(e, D, o);
  return m === 'dog'
    ? poseDog(e, D, o)
    : m === 'egg'
      ? poseEgg(e, D, o)
      : m === 'hero'
        ? (FIG.models.hero.rest.length > 14 ? poseHeroFK(e, D, o) : poseHero(e, D, o), onBed(e, D, o))
        : e.holder
          ? poseGun(e, D, o)
          : (FIG.models[m || 'zombie'] || FIG.models.zombie).rest14
            ? poseZombie22(e, D, o)
            : poseZombie(e, D, o);
};
// a pose worked out on the 14 bones, moved on to the 22 the mesh is skinned to: each of the 22 is a part of one of the
// 14 (the spine's upper pieces and the collarbones of the chest, the neck of the head, the hands of the forearms, the
// toes of the feet) and moves with it exactly
const X22 = [0, 1, 2, 2, 3, 3, 2, 4, 5, 5, 2, 6, 7, 7, 8, 9, 10, 10, 11, 12, 13, 13],
  ZT = new Float32Array(TW * 4);
// (its legs and hips, of the 14: lost, it can't walk on recorded legs; an arm or its head gone, it still can)
const LEGS14 = 0b11111100000001;
let IN22 = false; // (posing one of the dead on the 14 for its 22: its hits are the recorded ones, flinch.js)
function poseZombie22(e, D, o) {
  IN22 = true;
  poseZombie(e, ZT, 0);
  IN22 = false;
  const MM = FIG.models[modelOf(e) || 'zombie'] || FIG.models.zombie;
  e.__MM = MM;
  for (let b = 0; b < 22; b++) D.set(ZT.subarray(X22[b] * 12, X22[b] * 12 + 12), o + b * 12);
  D.set(ZT.subarray(NB * 12, NB * 12 + 32), o + NB * 12);
  const q = o + NB * 12 + 24, // what it has lost, a bit a bone: on to the 22
    m14 = D[q];
  if (m14) {
    let m22 = 0;
    for (let b = 0; b < 22; b++) if ((m14 >> X22[b]) & 1) m22 |= 1 << b;
    D[q] = m22;
  }
  // on its feet and going about, its legs walk as the recording does (its hips and all above them as its own pose has
  // them: the lurch, the hunch, the reach)
  if (
    e.dying === undefined &&
    !(e.down > 0) &&
    !e.crawl &&
    !e.half &&
    !(e.emerge < 1) &&
    e.st !== 'crouch' &&
    e.kind !== 'climb' &&
    e.type !== 'hopper' &&
    !(e.z > 2) &&
    !(m14 & LEGS14)
  )
    fkLegs(e, D, o, MM);
  // killed: it falls as a body does (ragdoll.js), from the pose it died in
  else if (e.dying !== undefined && !e.giant) ragPose(e, D, o, MM);
  // knocked down: likewise, and up again
  else if (e.down > 0 && !e.giant && !(m14 & LEGS14)) knockPose(e, D, o, MM);
  if (e.dying === undefined && !(e.down > 0)) e._rk = undefined;
  // on its knees at a body, feeding; or getting up off them (actors/feeding.js)
  if ((e.feed || e._fkS) && e.dying === undefined && !(e.down > 0) && !(m14 & LEGS14)) kneelPose(e, D, o, MM);
  else e._fkS = undefined;
  // on its feet: each hit knocks it back as the recorded hits do (flinch.js)
  if (e.dying === undefined && !(e.down > 0) && !e.crawl && !e.half && !(e.emerge < 1) && !(e.z > 2))
    flinch(e, D, o, MM);
  else e.hitAcc = 0;
}
// a zombie knocked off its feet: down as a body goes down (ragdoll.js), and lying as it fell; then, on its back, up
// again as Quaternius' recorded get-up has it (its last moment met by its own standing pose), or on its face, the
// hands it plants (its own pose) taking it from there
const KB = new Float32Array(22 * 12),
  KC = new Float32Array(22 * 12);
function knockPose(e, D, o, MM) {
  if (!ragKnock(e, D, o, MM, KB, 0)) return;
  const n = 22 * 12,
    tr = downReal(e),
    el = downEl(e),
    GU = FK.clips.getup,
    ct = tr - (DOWN_T - GU.dur), // (its get-up timed to finish as the game stands it up)
    mix = (S, w) => {
      if (w > 0) for (let i = 0; i < n; i++) D[o + i] += (S[i] - D[o + i]) * w;
    };
  if (e.sup && supOK(e) && ct > 0) {
    getupRows(e, D, o, MM, GU, ct);
    // (lying as it fell, eased into the recording's first moment; and at its last, into its own standing pose,
    // already in D)
    const wR = 1 - lyS2(0, 0.3, ct),
      wE = lyS2(GU.dur - 0.2, GU.dur, ct);
    for (let i = 0; i < n; i++) KC[i] += (KB[i] - KC[i]) * wR;
    mix(KC, 1 - wE);
  } else mix(KB, 1 - lyS2(0.55, 0.75, el));
}
const lyS2 = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// the recorded get-up at time ct, into KC: facing the way it'll stand (away from where its head lay), finishing with
// its hips where the game stands it
function getupRows(e, D, o, MM, GU, ct) {
  REST = MM.rest;
  MODEL_END = MM.ends;
  const r = REST,
    A = fkAlign(MM),
    par = MM.bones.map(b => b[1]),
    k = [Math.hypot(D[o], D[o + 4], D[o + 8]), Math.hypot(D[o + 2], D[o + 6], D[o + 10])],
    Hl = r[14][2] * k[1],
    Ry = Rz((e.fallA ?? 0) + Math.PI),
    end = GU.root[GU.root.length - 1];
  fkSnap(FK2, FKR2, GU, Math.min(ct, GU.dur - 0.001), false);
  const sw = mv(Ry, [(FKR2[0] - end[0]) * Hl, (FKR2[1] - end[1]) * Hl, 0]),
    J = [],
    R = [];
  for (let b = 0; b < 22; b++) {
    R[b] = mm(mm(Ry, q9([FK2[b * 4], FK2[b * 4 + 1], FK2[b * 4 + 2], FK2[b * 4 + 3]])), A[b]);
    if (b === 0) J[0] = [e.x + sw[0], e.y + sw[1], r[0][2] * k[1] + FKR2[2] * Hl];
    else {
      const d = mv(R[par[b]], sc3(sub(r[b], r[par[b]]), k));
      J[b] = [J[par[b]][0] + d[0], J[par[b]][1] + d[1], J[par[b]][2] + d[2]];
    }
    bone(KC, 0, b, mul3(R[b], k), J[b], r[b]);
  }
}
// one of the dead feeding, as Quaternius' recorded kneeling-at-work goes: down on its knees (its first second), at
// the body (its middle stretch, played back and forth so it never jumps), and up again (its last); facing the body,
// its hips where the game has it, all of it eased in from and out to its own pose (in D)
const KN_DOWN = 1.0,
  KN_A = 1.1,
  KN_B = 5.2,
  KN_UP = 5.35;
function kneelPose(e, D, o, MM) {
  const t = GS.time,
    KN = FK.clips.kneel,
    eat = feeding(e);
  if (eat && e._fkS !== 'eat') {
    e._fkS = 'eat';
    e._fkT = t;
  } else if (!eat && e._fkS === 'eat') {
    if (!(e.riseT > 0)) return void (e._fkS = undefined); // (killed off its knees, or anything else: its own pose)
    e._fkS = 'up';
    e._fkT = t;
  } else if (!eat && !e._fkS) return;
  const u = t - e._fkT;
  let ct, w;
  if (e._fkS === 'eat') {
    const span = KN_B - KN_A,
      v = Math.max(0, u - KN_DOWN) % (2 * span);
    ct = u < KN_DOWN ? u : KN_A + (v < span ? v : 2 * span - v);
    w = lyS2(0, 0.25, u);
  } else {
    const ru = FEED.rise,
      up = (KN.dur - KN_UP) / ru; // (its get-up brought to the game's time for it)
    if (u >= ru) return void (e._fkS = undefined);
    ct = KN_UP + u * up;
    w = 1 - lyS2(ru - 0.2, ru, u);
  }
  REST = MM.rest;
  MODEL_END = MM.ends;
  const r = REST,
    A = fkAlign(MM),
    par = MM.bones.map(b => b[1]),
    k = [Math.hypot(D[o], D[o + 4], D[o + 8]), Math.hypot(D[o + 2], D[o + 6], D[o + 10])],
    Hl = r[14][2] * k[1],
    Ry = Rz(e.feedA ?? e.a),
    r0 = KN.root[0];
  fkSnap(FK2, FKR2, KN, Math.min(ct, KN.dur - 0.001), false);
  const sw = mv(Ry, [(FKR2[0] - r0[0]) * Hl, (FKR2[1] - r0[1]) * Hl, 0]),
    J = [],
    R = [];
  for (let b = 0; b < 22; b++) {
    R[b] = mm(mm(Ry, q9([FK2[b * 4], FK2[b * 4 + 1], FK2[b * 4 + 2], FK2[b * 4 + 3]])), A[b]);
    if (b === 0) J[0] = [e.x + sw[0], e.y + sw[1], r[0][2] * k[1] + FKR2[2] * Hl];
    else {
      const d = mv(R[par[b]], sc3(sub(r[b], r[par[b]]), k));
      J[b] = [J[par[b]][0] + d[0], J[par[b]][1] + d[1], J[par[b]][2] + d[2]];
    }
    bone(KC, 0, b, mul3(R[b], k), J[b], r[b]);
  }
  const n = 22 * 12;
  for (let i = 0; i < n; i++) D[o + i] += (KC[i] - D[o + i]) * w;
  // its feet stay where they knelt: the walking legs' holds let go
  if (e._flk) for (const L of e._flk) L.on = false;
}
// the dead's own carriage, recorded: CMU's zombie shambles, a drunk's stagger, a man walking on a hurt leg, and
// Quaternius' zombie walk (its dragged leg and all); each of the walking dead given one (a limper its limp, legs and
// all). Its trunk, arms and head as the recording carries them, in step with its legs, hunched as a zombie stands
// when it stands, swiping as recorded when it lunges; its own pose back for a stagger or a scream (a hit knocks it
// back over all of this: flinch.js)
const ZUP = ['zwalk', 'zwalk2', 'drunk', 'shamble', 'zwalk2', 'hurt', 'zwalk', 'shamble', 'zwalk'];
function zCarriage(e) {
  if (e.run || e.hunch > 0 || e.shield || e.type !== 'skitter') return null;
  const m = modelOf(e);
  if (m !== 'zombie' && m !== 'gaunt' && m !== 'armored' && m !== 'lean' && m !== 'drag') return null;
  const n = e.limp ? 'limp' : m === 'drag' ? 'hurt' : ZUP[Math.floor(hsh(e.id || 0, 11) * ZUP.length) % ZUP.length];
  return FKC[n] || FK.clips[n];
}
const ZROW = new Float32Array(14 * 12),
  FK3 = new Float32Array(22 * 4),
  FKR3 = new Float32Array(3);
// the recorded legs under a figure whose hips are already placed (row o of D): blended walk to run by its speed, its
// stride shortened for a shamble or drawn stiff for a limp, each foot held where it was put down; above them, its
// recorded carriage, if it has one
function fkLegs(e, D, o, MM) {
  REST = MM.rest;
  MODEL_END = MM.ends;
  const r = REST,
    t = GS.time,
    dt = clamp(t - (e._lgT ?? t), 0, 0.1),
    A = fkAlign(MM),
    par = MM.bones.map(b => b[1]),
    D3 = (b, R, J) => bone(D, o, b, mul3(R, k), J, r[b]);
  let R0 = [D[o], D[o + 1], D[o + 2], D[o + 4], D[o + 5], D[o + 6], D[o + 8], D[o + 9], D[o + 10]],
    t0 = [D[o + 3], D[o + 7], D[o + 11]];
  const k = [Math.hypot(R0[0], R0[3], R0[6]), Math.hypot(R0[2], R0[5], R0[8])],
    yaw = Math.atan2(R0[3], R0[0]),
    Hl = r[14][2] * k[1];
  e._lgT = t;
  // how it actually moves (its stride and all, and a hit's shove back, a crowd's jostle: its own going is only
  // part of that), so its legs step with whatever carries it
  {
    const lx = e._lgX ?? e.x,
      ly = e._lgY ?? e.y,
      mx = dt > 0 ? (e.x - lx) / dt : 0,
      my = dt > 0 ? (e.y - ly) / dt : 0,
      ok = Math.hypot(mx, my) < 600, // (not a jump across the map)
      g = Math.min(1, dt * 14);
    e._lgX = e.x;
    e._lgY = e.y;
    e._mvx = (e._mvx ?? e.vx ?? 0) + ((ok ? mx : e.vx || 0) - (e._mvx ?? e.vx ?? 0)) * g;
    e._mvy = (e._mvy ?? e.vy ?? 0) + ((ok ? my : e.vy || 0) - (e._mvy ?? e.vy ?? 0)) * g;
  }
  const vx = e._mvx,
    vy = e._mvy,
    spd = Math.hypot(vx, vy),
    sL = spd / Hl,
    back = spd > 4 && Math.cos(Math.atan2(vy, vx) - yaw) < -0.3,
    run = !!e.run,
    C = FK.clips,
    Z = zCarriage(e),
    ZL = !!Z && (Z === FKC.limp || Z === C.shamble), // the limp and the zombie walk walk their own legs too
    IDL = Z ? C.zidle : C.idle, // (standing, hunched as a zombie stands)
    wMove = clamp((sL - 0.08) / 0.35, 0, 1),
    wJ = ZL ? 0 : clamp((sL - 1.6) / 2.0, 0, 1),
    wW = (1 - wJ) * wMove,
    wJog = wJ * wMove,
    LW = ZL ? Z : C.walk,
    aL = ZL ? clamp(Math.sqrt(sL / Z.v), 0.8, 1.5) : 1, // (brought to its pace, half by a longer step)
    shortK = ZL ? aL : run ? 0.8 : 0.9, // a shamble: a little shorter than a man's
    cyc = (wW * ((LW.v * LW.dur) / (LW.ns || 1)) + wJog * C.jog.v * C.jog.dur) * shortK;
  e._fph =
    (e._fph ?? Math.random() * 8) + (cyc > 0.01 ? ((back ? -1 : 1) * dt * sL) / (cyc / Math.max(wMove, 0.01)) : 0);
  const ph = ((e._fph % 1) + 1) % 1;
  // its carriage: how much of it (eased in and out as it walks, lunges, staggers, is hit)
  if (Z) {
    const want = e.lunge > 0 ? 1 : e.wbT > 0 || e.scrIn > 0 || e.st === 'crouch' ? 0 : 1,
      zk0 = e._zk ?? want;
    e._zk = zk0 + (want - zk0) * Math.min(1, dt * (want < zk0 ? 14 : 4));
  } else e._zk = 0;
  const zk = e._zk;
  if (zk > 0.01) {
    fkSnap(FK2, FKR2, Z, fkT(Z, e._fph), true);
    // standing, its stance; lunging, the recorded swipe (wound up and through over the lunge)
    const mixIn = (c, at, w, loop) => {
      if (w <= 0.001) return;
      fkSnap(FK3, FKR3, c, at, loop);
      for (let b = 0; b < 14; b++) fkMix(FK2, FK3, b, w);
      for (let j = 0; j < 3; j++) FKR2[j] += (FKR3[j] - FKR2[j]) * w;
    };
    mixIn(C.zidle, t + (e.id || 0), 1 - wMove, true);
    // the shamble and the hurt walk fling their arms out wide as recorded: walking, their arms are brought most of the
    // way in to how the dead stand, hanging and heavy (the walk's swing still in them, smaller)
    const flail = Z === C.shamble ? 0.6 : Z === FKC.hurt ? 0.45 : 0;
    if (flail > 0 && wMove > 0.001) {
      fkSnap(FK3, FKR3, C.zidle, t + (e.id || 0), true);
      for (let b = 6; b < 14; b++) fkMix(FK2, FK3, b, flail * wMove);
    }
    // doing nothing much (actors/idle.js): swaying where it stands, its upper body rolling and lurching as the recorded
    // drunk's does over its planted feet; or up against a window, both hands on the glass, pushing at it
    const I = e.idle,
      swW = eased(e, 'sway', I && I.k === 'sway' ? 1 : 0, 3),
      glW = eased(e, 'glass', I && I.k === 'glass' && I.at ? 1 : 0, 4);
    if (swW > 0.01) mixIn(FKC.drunk, t * 0.85 + (e.id || 0), swW * 0.6 * (1 - wMove), true); // (most of it: its arms still hang, not out for balance)
    if (glW > 0.01) mixIn(C.push, t * 1.2 + (e.id || 0), glW * (1 - wMove), true);
    if (e.lunge > 0) {
      const u = clamp(1 - e.lunge / 0.42, 0, 1);
      mixIn(C.scratch, 0.4 + u * 0.85, clamp(Math.min(u / 0.12, (1 - u) / 0.25), 0, 1), false);
    }
    // as recorded from the hips up, the hips where its own pose has them (swaying about there as recorded)
    const Ry = Rz(yaw),
      J = [],
      R = [],
      sw = mv(Ry, [FKR2[0] * Hl, FKR2[1] * Hl, 0]);
    for (let b = 0; b < 14; b++) {
      R[b] = mm(mm(Ry, q9([FK2[b * 4], FK2[b * 4 + 1], FK2[b * 4 + 2], FK2[b * 4 + 3]])), A[b]);
      if (b === 0)
        J[0] = add(add(mv(R0, r[0]), t0), sw); // (R0 scaled: the row maps rest to the street)
      else {
        const pj = par[b],
          d = mv(R[pj], sc3(sub(r[b], r[pj]), k));
        J[b] = [J[pj][0] + d[0], J[pj][1] + d[1], J[pj][2] + d[2]];
      }
      bone(ZROW, 0, b, mul3(R[b], k), J[b], r[b]);
    }
    for (let b = 0; b < 14; b++)
      for (let j = 0; j < 12; j++) D[o + b * 12 + j] += (ZROW[b * 12 + j] - D[o + b * 12 + j]) * zk;
    R0 = [D[o], D[o + 1], D[o + 2], D[o + 4], D[o + 5], D[o + 6], D[o + 8], D[o + 9], D[o + 10]];
    t0 = [D[o + 3], D[o + 7], D[o + 11]];
    // its head, for the eyes the flashlight catches (as poseZombie keeps it)
    if (zk > 0.5 && !e.headless) {
      const Rh = R[5],
        hc = add(J[5], mv(Rh, sc3(mul(sub(MODEL_END[5], r[5]), 0.55), k)));
      e.__hx = e.__lhx = hc[0];
      e.__hy = e.__lhy = hc[1] - hc[2] * TILT;
      e.__ha = Math.atan2(Rh[3], Rh[0]);
    }
  }
  FKQ.fill(0);
  FKR.fill(0);
  fkAdd(IDL, t + (e.id || 0), 1 - wMove, true);
  fkAdd(LW, fkT(LW, e._fph), wW, true);
  fkAdd(C.jog, ((ph + C.jog.ph0) % 1) * C.jog.dur, wJog, true);
  fkNorm(FKQ);
  fkSnap(FK2, FKR2, IDL, t + (e.id || 0), true);
  if (wMove > 0) for (let b = 14; b < 22; b++) fkMix(FKQ, FK2, b, 1 - shortK);
  // a lame leg (its right) barely bends: dragged, or swung stiff (a recorded limp limps of itself)
  const lame = ZL ? 0 : e.kind === 'drag' ? 0.75 : e.limp && !run ? 0.55 : 0;
  if (lame) for (let b = 14; b < 18; b++) fkMix(FKQ, FK2, b, lame);
  const J = [],
    R = [];
  for (const b of [14, 15, 16, 17, 18, 19, 20, 21]) {
    R[b] = Array.from(mm(mm(Rz(yaw), q9([FKQ[b * 4], FKQ[b * 4 + 1], FKQ[b * 4 + 2], FKQ[b * 4 + 3]])), A[b]));
    const pj = par[b];
    if (pj === 0)
      J[b] = [
        R0[0] * r[b][0] + R0[1] * r[b][1] + R0[2] * r[b][2] + t0[0],
        R0[3] * r[b][0] + R0[4] * r[b][1] + R0[5] * r[b][2] + t0[1],
        R0[6] * r[b][0] + R0[7] * r[b][1] + R0[8] * r[b][2] + t0[2],
      ];
    else {
      const d = mv(R[pj], sc3(sub(r[b], r[pj]), k));
      J[b] = [J[pj][0] + d[0], J[pj][1] + d[1], J[pj][2] + d[2]];
    }
    D3(b, R[b], J[b]);
  }
  // the feet held where they were put down
  const stK = ZL ? (Z.st ?? MOTION.shamble.st) : (1 - wJ) * MOTION.walk.st + wJ * MOTION.jog.st,
    lk = e._flk || (e._flk = [{ on: false }, { on: false }]),
    Rp = Rz(yaw);
  for (const [i, ti] of [
    [0, 14],
    [1, 18],
  ]) {
    const L = lk[i],
      fp = ((((back ? 1 - ph : ph) + i * 0.5) % 1) + 1) % 1,
      down = wMove < 0.05 ? true : fp < stK,
      ank = J[ti + 2],
      // (a hold let go, or eased in or out, eases the foot over a few frames, as the hero's do)
      free = () => {
        L.on = false;
        L.rx += L.px || 0;
        L.ry += L.py || 0;
        L.pw = L.px = L.py = 0;
      };
    settle(L, dt);
    if (!down) {
      if (L.on) free();
    } else if (!L.on) {
      L.on = true;
      L.x = ank[0];
      L.y = ank[1];
      L.pw = 0;
    }
    let ox = 0,
      oy = 0;
    if (L.on) {
      if (Math.hypot(L.x - ank[0], L.y - ank[1]) > 0.45 * Hl) free();
      else {
        const w = wMove < 0.05 ? 1 : clamp(Math.min(fp / stK, 1 - fp / stK) / 0.12, 0, 1),
          dw = (L.pw || 0) - w;
        L.rx += dw * (L.x - ank[0]);
        L.ry += dw * (L.y - ank[1]);
        L.pw = w;
        ox = L.px = (L.x - ank[0]) * w;
        oy = L.py = (L.y - ank[1]) * w;
      }
    }
    if (!L.on && Math.hypot(L.rx, L.ry) < 0.05 && Math.hypot(L.vx, L.vy) < 1) continue;
    // the ground under the foot: never through it (its hips may have sunk in a lurch)
    const tg = [ank[0] + ox + L.rx, ank[1] + oy + L.ry, Math.max(ank[2], r[ti + 2][2] * k[1] * 0.9)],
      mid = mul(add(J[ti], ank), 0.5),
      [, E] = limb(D, o, ti, ti + 1, Rp, J[ti], tg, kneeTo(J[ti + 1], mid, yaw, Hl), k, [R[ti], R[ti + 1]]);
    D3(ti + 2, R[ti + 2], E);
    D3(ti + 3, R[ti + 3], add(E, mv(R[ti + 2], sc3(sub(r[ti + 3], r[ti + 2]), k))));
  }
}
let POSE = poseFig;

// ---------- which figures draw in 3D ----------
// the model each of the dead is drawn with: by its type, its special kind or its elite trait
export function modelOf(e) {
  if (e.pk3d) return e.pk3d;
  if (e.c3d) return e.c3d; // a giant in 3D: the Fire Chief, Roadkill (drawGiant3D)
  if (e.veh3d) return e.veh3d;
  if (e.hero3d) return 'hero';
  if (e.holder) return e.gm;
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
// you (or a survivor) in 3D, with your gun: when the meshes are in, and you're on your feet (rolling, down or riding
// out, the pictures still draw)
// ---- the giants in 3D (the Fire Chief, Roadkill): what each does with what he carries, as a few numbers on springs ----
// where his right hand holds it (f ahead of his chest, s to his right, h up from it), the thing's pitch (p: up from
// level, ahead; past a right angle it's over his shoulder) and its turn off his facing (az: to his left as it goes
// negative), how far along it his left hand is (g), where along it his right hand is (u, from its own foot), and how
// much his left hand is on it at all (two: 0, swinging free; 1, on it). Every move of his is a set of these, and they go
// from one to the next on springs: a carry is loose, a blow stiff. His hands and what he carries follow them, so they
// always agree with each other and nothing jumps (all in his own units, scaled by his build)
const AXP = ['f', 's', 'h', 'p', 'az', 'g', 'u', 'two'];
function chiefTarget(e, t) {
  const st = e.st,
    stride = (e.stride || 0) * Math.PI * 2,
    T = (v, K) => [[...v, 2, 1], K];
  if (e.stunT > 0) return T([7, 6, -20, -0.6, -0.4, 10], 60);
  if (st === 'rear' || st === 'roar') return T([2, -1, 14, 0.15, -1.45, 14], 70); // raised over his head, crossways
  if (st === 'brace') return T([8, 6, -7, 0.25, -0.95, 14], 110); // down across him, set to go
  if (st === 'rush' || st === 'charge') return T([10, 5, -9, 0.2, -0.35, 13], 120); // out ahead, low, as he comes
  if (st === 'chop') {
    if (e.stT > 0.15) return T([-1, 3, 7, 2.25, 0.1, 4], 150); // back over his right shoulder
    return T([14, 1, -12, -0.5, 0, 4], 1100); // and down: into the street ahead of him
  }
  if (e.stuckT > 0) return T([15, 1, -14, -0.55 + Math.sin(t * 15) * 0.04 * (e.stuckT > 0.35 ? 1 : 0), 0, 5], 160); // stuck: he hauls at it
  if ((e.claw || 0) > 0) return T([10, 4, -4, 0.15, lerp(1.4, -1.45, e.claw), 4], 700); // swung through, side to side
  if ((e.wind || 0) > 0) return T([2, 8, 0, 0.45, 1.5 * e.wind, 4], 140); // drawn back to his right
  if (e.recT > 0.25) return T([8, 4, -18, -0.2, -0.2, 12], 60); // spent: the head down by his knees
  return T([6, 5, -14 + Math.sin(stride * 2) * 0.8, 0.85, -0.75, 13], 70); // carried at port: across him, the head by his left shoulder
}
// Roadkill and his sign: dragged behind him by the post on the walk, its face scraping the road; held out ahead in
// both fists to ram with on the charge; drawn back and swung round in the haymaker; both fists on a new one's post,
// heaving it out of the street; drawn far back and thrown; raised overhead in one fist to roar
function roadkillTarget(e, t) {
  const st = e.st,
    act = st === 'act' ? e.act : null,
    stride = (e.stride || 0) * Math.PI * 2,
    T = (v, K) => [v, K];
  if (!e.sign) return T([4, 9, -14, -0.6, 0.6, 6, 4, 0], 60); // (nothing in his hands: drawn nowhere)
  if (act === 'pull') return T([16, 0, -12 + Math.sin(t * 7) * 1.5, 1.3, 0, 6, 30, 1], 120); // heaving a post up out of the ground
  if (act === 'signthrow') return T([-8, 8, 8, 0.55, 2.8, 5, 6, 1], 160); // drawn far back over his right shoulder
  if (act === 'stomp') return T([2, 10, 14, 1.2, 0.4, 6, 4, 0], 120); // up in one fist as his weight comes down
  if (act === 'bolt') return T([-6, 10, -10, -0.4, 2.6, 6, 4, 0], 110); // hunched, arms back, about to go
  if (e.stunT > 0) return T([6, 8, -18, -0.5, 0.6, 6, 4, 0], 60); // let hang, its face on the road
  if (st === 'rear' || st === 'roar') return T([0, 8, 18, 1.35, 0.3, 6, 4, 0], 70); // held up over his head
  if (st === 'charge' || st === 'sprint') return T([8, 3, -6, 0.05, -0.1, 10, 4, 1], 140); // out ahead, edge first, a ram
  if ((e.claw || 0) > 0) return T([6, 6, -2, 0.15, lerp(2.0, -1.3, e.claw), 6, 4, 1], 650); // the haymaker
  if ((e.wind || 0) > 0) return T([-4, 8, 4, 0.25, 2.3 * e.wind, 6, 4, 1], 130); // drawn back to his right
  if (e.recT > 0.25) return T([6, 8, -18, -0.5, 0.6, 6, 4, 0], 60); // spent
  return T([-2, 9, -16 + Math.sin(stride * 2) * 0.6, -0.3, 2.7, 6, 4, 0], 60); // dragged behind him by the post
}
export const GIANT3D = {
  chief: { model: 'chief', prop: 'axe', k: 1.5, tgt: chiefTarget },
  roadkill: { model: 'roadkill', prop: 'stopsign', k: 1.7, tgt: roadkillTarget, has: e => !!e.sign },
};
// a giant's hand target made one his arm can reach: out of his body (round his side if it's on its own side of him,
// across his front if it's reaching over), not up against the shoulder (the arm folded flat on itself), never further
// than a bent arm goes
function fitHand(hand, sh, L, Jc, F, Rt, sd) {
  const o = sub(sh, Jc),
    sw = Math.abs(o[0] * Rt[0] + o[1] * Rt[1]),
    bw = sw * 0.86,
    bd = sw * 0.62,
    shz = o[2];
  let h = hand.slice();
  const loc = () => {
    const d = sub(h, Jc);
    return [d[0] * F[0] + d[1] * F[1], d[0] * Rt[0] + d[1] * Rt[1], d[2]];
  };
  // (folded up against the shoulder: out from it, away from his body)
  let v = sub(h, sh),
    d = len(v);
  const lo = L * 0.4,
    out = [Rt[0] * sd, Rt[1] * sd, 0];
  if (d < lo) {
    const dir = nrm(add(d > 1e-3 ? mul(v, 1 / d) : [0, 0, -1], mul(out, 1.2 * (1 - d / lo))));
    h = add(sh, mul(dir, lo));
  }
  // (inside his body below the collar: round his side; reaching over to his other side, across his front, clear of
  // his chest, so the arm goes before him and not through him)
  let [lf, ls, lz] = loc();
  if (lz < shz + 4) {
    const cross = ls * sd < 0,
      e2 = (Math.max(0, lf) / bd) ** 2 + (ls / bw) ** 2;
    if (cross) lf = Math.max(lf, bd + 3);
    else if (e2 < 1 || lf < 0) {
      if (lf < bd * 0.55 || e2 >= 1)
        ls = sd * Math.max(Math.abs(ls), bw * Math.sqrt(Math.max(0, 1 - (Math.max(0, lf) / bd) ** 2)) + 2);
      else lf = bd * Math.sqrt(Math.max(0, 1 - (ls / bw) ** 2)) + 2;
    }
    h = [Jc[0] + F[0] * lf + Rt[0] * ls, Jc[1] + F[1] * lf + Rt[1] * ls, Jc[2] + lz];
  }
  // (out of reach: drawn in till the elbow bends)
  v = sub(h, sh);
  d = len(v);
  if (d > L * 0.9) h = add(sh, mul(v, (L * 0.9) / d));
  return h;
}
function chiefArms(e, Jc, yaw, k, SH) {
  const A = e._ax,
    G = GIANT3D[e.btype],
    [Tg, K] = G.tgt(e, GS.time);
  if (!A.v) {
    A.v = Tg.slice();
    A.d = Tg.map(() => 0);
  }
  const dt = A.dt || 0,
    n = Math.max(1, Math.ceil(dt / 0.008)),
    h = dt / n,
    c = 2 * Math.sqrt(K);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < AXP.length; i++) {
      A.d[i] += ((Tg[i] - A.v[i]) * K - A.d[i] * c) * h;
      A.v[i] += A.d[i] * h;
    }
  const [f, s0, hh, p, az, g, u, two] = A.v,
    F = [Math.cos(yaw), Math.sin(yaw)],
    Rt = [-Math.sin(yaw), Math.cos(yaw)],
    kx = k[0],
    kz = k[1],
    // his build: how far out his shoulders are, how long his arms
    shY = Math.abs(REST[4][1]),
    armL = len(sub(REST[5], REST[4])) + len(sub(MODEL_END[5], REST[5])),
    // (the right hand where his arm can put it: the thing in it follows)
    rear = fitHand(
      [Jc[0] + (F[0] * f + Rt[0] * s0) * kx, Jc[1] + (F[1] * f + Rt[1] * s0) * kx, Jc[2] + hh * kz],
      SH[0][0],
      SH[0][1],
      Jc,
      F,
      Rt,
      1
    ),
    a2 = yaw + az,
    cp = Math.cos(p),
    sp = Math.sin(p),
    X = [cp * Math.cos(a2), cp * Math.sin(a2), sp],
    // its edge (the blade, the plate's rim) to the swing: up and ahead wound back over the shoulder, down into what it
    // comes down on
    Z = [sp * Math.cos(a2), sp * Math.sin(a2), -cp],
    front = [rear[0] + X[0] * g * kx, rear[1] + X[1] * g * kx, rear[2] + X[2] * g * kz],
    // his left hand when it isn't on it: hanging by his side from the shoulder, just clear of his body, the elbow a
    // little bent, swinging to his stride
    sw = Math.sin((e.stride || 0) * Math.PI * 2) * armL * 0.12,
    shZ = REST[6][2] - REST[2][2],
    free = [
      Jc[0] + (F[0] * (2 + sw) - Rt[0] * (shY + 3)) * kx,
      Jc[1] + (F[1] * (2 + sw) - Rt[1] * (shY + 3)) * kx,
      Jc[2] + (shZ - armL * 0.86) * kz,
    ],
    left = fitHand(
      [0, 1, 2].map(i => lerp(free[i], front[i], clamp(two, 0, 1))),
      SH[1][0],
      SH[1][1],
      Jc,
      F,
      Rt,
      -1
    );
  A.X = X;
  A.Z = Z;
  A.two = clamp(two, 0, 1);
  A.foot = [rear[0] - X[0] * u * kx, rear[1] - X[1] * u * kx, rear[2] - X[2] * u * kz];
  return [rear, left];
}
// a giant in 3D (GIANT3D): his body posed as the street's dead are (poseZombie), his hands and what he carries by
// chiefArms. False if he can't be: his picture draws
export const giant3DOn = bt => fig3dOn() && !!FIG.models && !!GIANT3D[bt] && !!FIG.models[GIANT3D[bt].model];
export function drawGiant3D(e) {
  const G = GIANT3D[e.btype];
  if (!G || !giant3DOn(e.btype)) return false;
  e.c3d = G.model;
  if (e.id === undefined) e.id = 12000 + Math.floor(Math.random() * 999);
  // once a frame: the time since the last (his springs), and the way he faces, turned on a spring of its own (so a snap
  // round to a new line is a quick turn, not a jump)
  const A = e._ax || (e._ax = { t: GS.time, yaw: e.face ?? e.a ?? 0 });
  if (A.f !== frame) {
    A.f = frame;
    A.dt = clamp(GS.time - A.t, 0, 0.05);
    A.t = GS.time;
    const to = e.face ?? e.a ?? 0,
      kq = e.st === 'rush' || e.st === 'charge' || e.st === 'chop' || e.st === 'sprint' ? 14 : 7;
    A.yaw += angDiff(A.yaw, to) * (1 - Math.exp(-kq * A.dt));
  } else A.dt = 0;
  if (e._f3 === frame) e._f3 = -1;
  if (!drawFig3D(e)) return false;
  if (FIG.models[G.prop] && A.X && !(e.dying > 0.2) && (!G.has || G.has(e))) {
    const s = FIGK * G.k,
      X = A.X,
      Z = A.Z,
      Y = [Z[1] * X[2] - Z[2] * X[1], Z[2] * X[0] - Z[0] * X[2], Z[0] * X[1] - Z[1] * X[0]],
      R = [X[0], Y[0], Z[0], X[1], Y[1], Z[1], X[2], Y[2], Z[2]],
      E = e._axeE || (e._axeE = { id: e.id + 1 });
    drawPick3D(E, G.prop, R, A.foot[0], A.foot[1], A.foot[2], s, s, 1, 99);
  }
  return true;
}
export function drawHero3D(p) {
  if (!FIG.models) return false; // (the meshes come in after the title is up: the picture until then)
  // (he falls as recorded; so does one of your people, downed)
  const fell = (GS.state === 'over' ? p === GS.P : !!p.npc) && FIG.models.hero && FIG.models.hero.rest.length > 14;
  if (!fig3dOn() || !FIG.models.hero || ((p.down > 0 || p.hp <= 0) && !fell) || (p.ride && p.ride !== 'truck'))
    return false;
  if (p.dashT > 0 && !(FIG.models.hero.rest.length > 14)) return false; // (the roll, recorded, on the fuller skeleton)
  if (p.id === undefined) p.id = 9000 + Math.floor(Math.random() * 999);
  p.hero3d = true;
  if (p._f3 === frame && p._pT !== p.throwT) p._f3 = -1; // thrown since it was posed this frame: posed afresh
  p._pT = p.throwT;
  if (!drawFig3D(p)) return false;
  // (pouring fuel: the can in his hands, not the gun: heroArms)
  if (p.pour && p._can) {
    const cE = p._canE || (p._canE = { id: p.id + 3 });
    drawPick3D(cE, 'jerry', p._can.R, p._can.c[0], p._can.c[1], p._can.c[2], p._can.s, p._can.s, 1, 99, [0, 0, 7.2]);
    return true;
  }
  const gm = gunModel(heldGun(p));
  if (FIG.models[gm] && p._grip && !p.unarmed) {
    const g = p._gunE || (p._gunE = { id: p.id + 1, holder: p });
    g.gm = gm;
    g.x = p.x;
    g.y = p.y + 1;
    drawFig3D(g);
    // its magazine: seated in it, or out in the free hand on a reload (heroArms: _magAt), or gone (dropped, not yet
    // a fresh one out of the pouch)
    if (FIG.models['mag_' + gm] && p._magAt) {
      const m = p._magE || (p._magE = { id: p.id + 2, holder: p });
      m.gm = 'mag_' + gm;
      m.x = p.x;
      m.y = p.y + 1.2;
      m.off = p._magAt[0] || p._magAt[1] || p._magAt[2] ? p._magAt : null;
      drawFig3D(m);
    }
  }
  return true;
}
export function is3D(e) {
  if (e.__std || e.c3d || !fig3dOn()) return false; // (a giant goes his own way: drawGiant3D)
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
let CLR = false; // a car: its depth (and the next figures') afresh, since each figure's depth is its own (see VS)
const depths = {}; // depth buffers by size (the screen's, the remains pass's), and the frame each was last cleared in
const mode = () => (GS.SHMODE === 3 || GS.SHMODE === 4 ? 2 : GS.SHMODE === 2 ? 3 : GS.SHMODE ? 1 : 0);
// down on the street: dead, knocked down, crawling, or what's left of one
const onGround = e => e.dying !== undefined || e.dead || e.down > 0 || e.crawl || e.half;
// draws e in 3D, or queues it to draw with the figures next to it; false if it can't (the picture draws instead)
export function drawFig3D(e) {
  if (rowOf(e) < 0) return false;
  const m = mode();
  if (m === 1 && !inking() && onGround(e)) return true; // lying on the street it throws next to no shadow (its own would cover it and black it out): the soft one under it does

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
      mn = modelOf(e) || 'zombie',
      key = mn + (full || !FIG.models[mn + '@1'] ? '' : '@1'); // (a car has the one mesh)
    if (full) near++;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
    // and what it wears over its body (one mesh each, near and far), riding the same bones
    if (e._kits)
      for (const k of e._kits) {
        const km = FIG.models[mn + '+' + k] ? mn + '+' + k : 'zombie+' + k, // its own, or the ordinary zombie's fitted to it
          kk = km + '|' + mn;
        if (!FIG.models[km]) continue;
        if (!groups.has(kk)) groups.set(kk, []);
        groups.get(kk).push(e);
      }
  }
  let n = 0;
  const runs = [];
  for (const [key, L] of groups) {
    const c = Math.min(L.length, ROWS - n);
    runs.push([key, n, c]);
    for (let i = 0; i < c; i++) rows[n++] = L[i]._r3;
  }
  const qn = queue.length;
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
  if (u.uTilt) gl.uniform1f(u.uTilt, TILT);
  gl.uniform1i(u.uMode, m);
  gl.uniform2f(u.uSun, SUNV[0], SUNV[1]);
  if (m === 2) {
    const [lx, ly, lh] = lampNow();
    gl.uniform4f(u.uLight, lx, ly, lh / SH3, 50); // the lamp's head as high over these figures as over the pictured ones (they stand taller in their own units)
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
    if (d.f !== frame || CSZ || CLR) {
      CLR = false;
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
  const draw = (key, from, cnt) => {
    if (!cnt || !key) return;
    const [name, who] = key.split('|'),
      M = FIG.models[name],
      kit = !!who,
      W = FIG.models[who || name.replace(/@.*/, '')] || M,
      kn = W.kn || [1, 1, 0, 1, 0.5, 0, 51.2],
      kb = (kit && FIG.models[name.replace(/\+.*/, '')]?.kn) || kn;
    // a thing worn, made for one build, fitted to another's head: moved and scaled about the head's middle
    gl.uniform3f(u.uKp, kb[4], kb[5], kb[6]);
    gl.uniform4f(u.uKt, kn[4] - kb[4], kn[5] - kb[5], kn[6] - kb[6], kn[3] / kb[3]);
    if (prog === P.body) {
      // its build, for the clothes painted onto it; and whether this is a thing it wears (painted plain)
      gl.uniform4f(u.uB, kn[0], kn[1], kn[2], kn[3]);
      gl.uniform4f(u.uHC, kn[4], kn[5], kn[6], kn[3]);
      gl.uniform1i(u.uKit, kit ? 1 : 0);
    }
    if (u.uHB) gl.uniform1ui(u.uHB, M.hb);
    gl.bindVertexArray(M.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, RB);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 4, from * 4);
    gl.drawElementsInstanced(gl.TRIANGLES, M.ni, gl.UNSIGNED_SHORT, 0, cnt);
    FIG.calls++;
  };
  for (const [key, from, cnt] of runs) draw(key.includes('|') || FIG.models[key] ? key : 'zombie', from, cnt);
  if (!m) {
    FIG.drawn += qn;
    gl.disable(gl.DEPTH_TEST);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, null);
  }
  gl.bindVertexArray(null);
  gl.activeTexture(gl.TEXTURE0);
  gl.useProgram(GS.curProg.p);
}
