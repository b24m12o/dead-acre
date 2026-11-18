/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The live 3D bosses. The Abomination is drawn every frame from its own 3D shapes (shapes/bosses.js, the ones its
// pictures were photographed from), posed by a skeleton: the fused body, the head on its neck, four legs and two
// bladed arms (two-bone IK), a tail. It is written into the same colour, glow and normal buffers as the pictures, so
// the street's own lamps, moonlight and grade fall on it, and it throws its own moon and lamp shadows. The street
// hides whatever is below it, except in a hole, where it is dark.
// Its pose comes from the fight the game already plays (its planted feet, its blades, its tail, what it's doing) with
// the body's weight on top: lowering into a crouch, rising in a leap, rearing, leaning into its speed and its turns,
// rocking from hits, collapsing when it dies. Its entrance is a clip of its own (clipAbom): it climbs out of the
// street. Off in Settings (3D bosses), or on a machine that can't build it, the old pictures draw it instead.
import { GS } from '../core/gs.js';
import { opt } from '../core/settings.js';
import { angDiff, clamp, lerp } from '../core/util.js';
import { gl, program } from './gl.js';
import { FS_VS } from './bake.js';
import { SDF_LIB } from './sdf-lib.js';
import { GB_GLSL } from './shapes/bosses.js';
import { SUNV, emptyVAO, flush, lampNow, viewH, viewW } from './sprites.js';
import { queenTail } from '../actors/projectiles.js';

const FS = () => `#version 300 es
precision highp float; precision highp int;
uniform vec4 uCam; uniform vec2 uRes; uniform int uMode; uniform vec2 uSun; uniform vec3 uLamp; uniform float uShA;
uniform vec4 uHole; uniform vec3 uEye; uniform float uT; uniform float uFlash; uniform float uFade; uniform float uRage;
uniform mat3 uBodyR; uniform vec3 uBodyP; uniform mat3 uHeadR; uniform vec3 uHeadP;
uniform vec3 uNeck[2]; uniform vec3 uLeg[12]; uniform vec3 uArm[8]; uniform vec3 uTail[6]; uniform vec3 uBound;
layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;
vec3 uBox; int uPart; float uSeed;
${SDF_LIB}
${GB_GLSL}
float sdLimb(vec3 p, vec3 a, vec3 b, float ra, float rb){ return sdCap(p,a,b,ra,rb)-(fbm(p.xy*0.5+p.z*0.3)-0.5)*1.0; }
mat3 frameOf(vec3 a, vec3 b){ vec3 x=normalize(b-a); vec3 up=abs(x.z)<0.97?vec3(0.0,0.0,1.0):vec3(0.0,1.0,0.0); vec3 y=normalize(cross(up,x)); return mat3(x,y,cross(x,y)); }
float scene(vec3 p, out int part, out vec3 lp){
  float d=1e3; part=-1; lp=p;
  { vec3 l=transpose(uBodyR)*(p-uBodyP); float b=length(l/vec3(70.0,64.0,40.0))-1.0;
    float db; if(b>0.3) db=b*40.0; else { uPart=9; db=map(l); }
    d=db; part=9; lp=l; }
  { float dn=sdLimb(p,uNeck[0],uNeck[1],18.0,14.0); if(dn<d+6.0){ float m=smin(d,dn,8.0); if(dn<d){ part=11; mat3 f=frameOf(uNeck[0],uNeck[1]); lp=transpose(f)*(p-(uNeck[0]+uNeck[1])*0.5)*vec3(0.6,1.0,1.0); } d=m; } }
  { vec3 l=transpose(uHeadR)*(p-uHeadP); float b=length(l/vec3(34.0,30.0,26.0))-1.0;
    float dh; if(b>0.3) dh=b*26.0; else { uPart=10; dh=map(l); }
    if(dh<d){ part=10; lp=l; } d=smin(d,dh,4.0); }
  for(int i=0;i<4;i++){ vec3 h=uLeg[i*3], k=uLeg[i*3+1], f=uLeg[i*3+2];
    float a=sdLimb(p,h,k,9.5,7.0), b=sdLimb(p,k,f,7.0,4.2); float dl=smin(a,b,3.0); dl=smin(dl,sdSph(p,f,5.5),2.0);
    if(dl<d){ part=11; mat3 fr=frameOf(a<b?h:k,a<b?k:f); lp=transpose(fr)*(p-((a<b?h+k:k+f)*0.5)); }
    d=smin(d,dl,a<b?6.0:1.0); }
  for(int i=0;i<2;i++){ vec3 s=uArm[i*4], e=uArm[i*4+1], h=uArm[i*4+2], t=uArm[i*4+3];
    float a=sdLimb(p,s,e,12.0,9.5), b=sdLimb(p,e,h,9.5,6.5); float da=smin(a,b,3.0);
    vec3 bl=t-h; float bt=clamp(dot(p-h,bl)/dot(bl,bl),0.0,1.0); vec3 q=p-(h+bl*bt);
    mat3 fr=frameOf(h,t); vec3 lq=transpose(fr)*q; float blade=length(lq*vec3(1.0,1.0,2.6))-mix(7.5,0.6,bt);
    if(da<d){ part=11; mat3 f2=frameOf(a<b?s:e,a<b?e:h); lp=transpose(f2)*(p-((a<b?s+e:e+h)*0.5)); }
    if(blade<min(d,da)){ part=13; lp=lq; }
    d=smin(d,da,7.0); d=min(d,blade); }
  for(int i=0;i<5;i++){ vec3 a=uTail[i], b=uTail[i+1]; mat3 fr=frameOf(b,a); vec3 l=transpose(fr)*(p-(a+b)*0.5)/(1.0-float(i)*0.07);
    float ds; if(length(l)>34.0) ds=(length(l)-26.0)*(1.0-float(i)*0.07); else { uPart=12; ds=map(l)*(1.0-float(i)*0.07); }
    if(ds<d){ part=12; lp=l; } d=smin(d,ds,3.0); }
  { vec3 m=uTail[5]; float dm=sdSph(p,m,12.0); dm=smax(dm,-sdSph(p,m+normalize(m-uTail[4])*11.0,7.0),2.0); if(dm<d){ part=14; lp=p-m; } d=smin(d,dm,3.0); }
  return d;
}
float sceneD(vec3 p){ int k; vec3 l; return scene(p,k,l); }
vec3 nrmS(vec3 p){ vec2 e=vec2(0.7,-0.7); return normalize(e.xyy*sceneD(p+e.xyy)+e.yyx*sceneD(p+e.yyx)+e.yxy*sceneD(p+e.yxy)+e.xxx*sceneD(p+e.xxx)); }
bool inHole(vec2 xy){ if(uHole.z<1.0) return false; vec2 q=xy-uHole.xy; float an=atan(q.y,q.x); return length(q)<uHole.z*(1.0+0.13*(vn(vec2(an*2.6,1.7))-0.5)+0.06*sin(an*7.0)); }
vec3 worldOf(vec2 fc){ return vec3(uCam.x+fc.x/uRes.x*uCam.z, uCam.y+(1.0-fc.y/uRes.y)*uCam.w, 0.0); }
void main(){
  vec3 g=worldOf(gl_FragCoord.xy);
  if(uMode>0){ // its shadow on the street: the moon's (each unit up throws it SUNV further), or a lamp's
    if(inHole(g.xy)) discard;
    float sh=0.0;
    if(uMode==1){ float z=2.0; for(int i=0;i<60;i++){ vec3 q=vec3(g.xy-uSun*z,z); float dd=sceneD(q); if(dd<0.5){ sh=1.0; break; } z+=max(dd*0.6,1.5); if(z>uBound.z) break; } }
    else { vec3 v=uLamp-g; float len=length(v), s=2.0/len; for(int i=0;i<60;i++){ vec3 q=g+v*s; float dd=sceneD(q); if(dd<0.5){ sh=1.0; break; } s+=max(dd*0.6,1.5)/len; if(s>0.95||q.z>uBound.z) break; } }
    if(sh<0.5) discard;
    o0=vec4(uShA*uFade); o1=vec4(0.0); o2=vec4(0.0); return; }
  // straight down from a camera high over it: what stands higher is a little nearer, a little bigger
  vec3 ro=uEye, rd=normalize(g-uEye);
  float t=max(0.0,(uEye.z-uBound.z)/max(-rd.z,0.01)), dmin=1e3; vec3 pm=ro; bool hit=false; vec3 p=ro;
  float px=uCam.z/uRes.x;
  for(int i=0;i<110;i++){ p=ro+rd*t; float floorZ=inHole(p.xy)?-uHole.w:0.0; if(p.z<floorZ) break;
    float dd=sceneD(p); if(dd<dmin){ dmin=dd; pm=p; } if(dd<0.25){ hit=true; break; } t+=max(dd*0.8,0.35); }
  float cov=(hit?1.0:smoothstep(1.4*px,0.0,dmin))*uFade;
  if(cov<0.01) discard;
  if(!hit) p=pm;
  int k; vec3 lp; scene(p,k,lp); vec3 n=nrmS(p);
  vec3 c;
  if(k==13){ c=mix(vec3(0.84,0.8,0.72),vec3(0.42,0.36,0.3),smoothstep(0.3,0.8,fbm(lp.xy*0.4)))*0.9; }
  else if(k==14){ c=mix(vec3(0.3,0.04,0.03),vec3(0.55,0.42,0.36),smoothstep(5.0,11.0,length(lp+normalize(uTail[5]-uTail[4])*6.0))); }
  else { uPart=k; uSeed=k==9?87.9:k==10?91.0:k==11?94.1:97.2; uBox=k==9?vec3(190.0,156.0,34.0):k==10?vec3(86.0,76.0,22.0):k==11?vec3(40.0,14.0,8.0):vec3(42.0,38.0,15.0);
    c=alb(lp,n); }
  float ao=clamp(sceneD(p+n*4.0)/4.0,0.0,1.0)*0.5+clamp(sceneD(p+n*10.0)/10.0,0.0,1.0)*0.5;
  float sh=(0.46+0.54*pow(max(n.z,0.0),1.2))*mix(1.0,ao,0.6);
  if(p.z<0.0) sh*=mix(0.07,0.75,smoothstep(-uHole.w,0.0,p.z)); // down in the hole: in the dark
  vec3 em=vec3(0.5,0.64,0.82)*pow(1.0-max(n.z,0.0),1.7)*0.32*step(0.0,p.z)+vec3(uFlash);
  if(k==10){ for(int s=-1;s<=1;s+=2){ float e=length(lp-vec3(5.0,float(s)*12.0,13.0)); em+=vec3(1.4,0.25,0.12)*uRage*smoothstep(4.5,1.5,e)*(0.8+0.2*sin(uT*9.0)); } } // the eyes catch, and burn
  if(k==9){ float e=length(lp/1.22-vec3(-10.0,0.0,20.0)); em+=vec3(0.9,0.16,0.08)*uRage*smoothstep(13.0,4.0,e)*(0.55+0.45*sin(uT*2.4)); } // the raw core at its heart, pulsing
  o0=vec4(c*sh*cov,cov); o1=vec4(em*cov,cov); o2=vec4((n.xy*0.5+0.5)*cov,0.12*cov,cov);
}`;

// ---------- the rig: vectors, turns, two-bone IK ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len = a => Math.hypot(a[0], a[1], a[2]),
  nrm = a => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  sm = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// a turn: yaw round the up axis, then pitch (nose up), then roll; its columns are forward, right, up
function rot(yaw, pitch, roll = 0) {
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch),
    X = [cy * cp, sy * cp, sp],
    Y0 = [-sy, cy, 0],
    Z0 = cross(X, Y0),
    cr = Math.cos(roll),
    sr = Math.sin(roll),
    Y = add(mul(Y0, cr), mul(Z0, sr));
  return [X, Y, cross(X, Y)];
}
const xf = (R, P, l) => add(P, add(mul(R[0], l[0]), add(mul(R[1], l[1]), mul(R[2], l[2]))));
function ik(h, f, L1, L2, pole) {
  let v = sub(f, h),
    d = len(v);
  const mx = L1 + L2 - 0.5;
  if (d > mx) {
    f = add(h, mul(v, mx / d));
    v = sub(f, h);
    d = mx;
  }
  if (d < 1) d = 1;
  const dir = mul(v, 1 / d),
    a = (L1 * L1 - L2 * L2 + d * d) / (2 * d),
    hh = Math.sqrt(Math.max(0, L1 * L1 - a * a)),
    pp = nrm(sub(pole, mul(dir, dot(pole, dir))));
  return [add(h, add(mul(dir, a), mul(pp, hh))), f];
}
const track = keys => t => {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const [t1, p1] = keys[i],
    [t2, p2] = keys[i + 1],
    p0 = i > 0 ? keys[i - 1][1] : p1,
    p3 = i + 2 < n ? keys[i + 2][1] : p2,
    u = (t - t1) / (t2 - t1),
    u2 = u * u,
    u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}; // a smooth path through [time, value] keys (Catmull-Rom), held flat at the ends

const STAND = 30; // the body's height on its legs
const HIPS = [
  [22, -42, -4],
  [22, 42, -4],
  [-38, -42, -4],
  [-38, 42, -4],
]; // front left, front right, back left, back right: the order of e.legs (legs.js LEGSPEC.queen)
const REST = [
  [56, -100],
  [56, 100],
  [-66, -98],
  [-66, 98],
];
// the tail as six joints: along its 2D curve (queenTail), heights added
function tailJoints(e, R, P, z0, up, limp) {
  const pts = queenTail(e),
    seg = [];
  let tot = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    seg.push(l);
    tot += l;
  }
  const out = [];
  for (let k = 0; k < 6; k++) {
    let d = (k / 5) * tot,
      i = 0;
    while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
    const f = seg[i] ? d / seg[i] : 0,
      lx = lerp(pts[i][0], pts[i + 1][0], f),
      ly = lerp(pts[i][1], pts[i + 1][1], f),
      u = k / 5,
      w = xf(R, P, [lx, ly, 0]);
    w[2] = limp ? 4 + (1 - u) * 6 : z0 + u * 6 + up * 90 * Math.sin(u * Math.PI); // raised to hose: an arc up over its back
    out.push(w);
  }
  return out;
}
// ---------- the pose, from the fight ----------
function poseLive(e) {
  const now = GS.time,
    S = (e.p3 = e.p3 || { z: STAND, pitch: 0, roll: 0, hp: 0, vx: 0, vy: 0, af: 0, t: now }),
    dt = clamp(now - S.t, 0, 0.05);
  S.t = now;
  const k = dt ? Math.min(1, dt * 7) : 0,
    st = e.st,
    dying = e.dying !== undefined,
    df = dying ? sm(e.dying / 1.1) : 0;
  // what it's doing sets where its body wants to be
  let z = STAND,
    pitch = 0,
    roll = 0,
    hp = Math.sin(now * 0.9) * 0.05;
  if (st === 'crouch') {
    z = 17;
    pitch = -0.2;
  } else if (st === 'leap') {
    const t = clamp(1 - Math.max(0, e.stT) / (e.ldur || 0.8), 0, 1);
    z = STAND + (e.z || 0);
    pitch = 0.3 * Math.cos(t * Math.PI);
  } else if (st === 'rear' || st === 'roar') {
    z = 38;
    pitch = 0.45;
    hp = 0.5;
  } else if (st === 'charge') {
    z = 26;
    pitch = -0.14;
  } else if (st === 'act' && e.act === 'volley') {
    hp = 0.35 * Math.sin(clamp(1 - e.stT / 0.45, 0, 1) * Math.PI);
    pitch = 0.1;
  } else if (st === 'act' && e.act === 'lay') {
    z = 22;
    pitch = 0.22;
  }
  if (e.stunT > 0) {
    z = 16;
    pitch = -0.22;
    roll = 0.24;
    hp = -0.45;
  } else if (e.recT > 0.25) {
    z = 24;
    pitch = -0.1;
    hp = -0.2;
  }
  if (e.ph === 2 && !dying) hp += Math.sin(now * 3.1) * 0.08;
  // weight: it leans into its speed and its turns, and a hit rocks it
  const c = Math.cos(e.a),
    s = Math.sin(e.a),
    fwd = (e.vx || 0) * c + (e.vy || 0) * s,
    fwd0 = S.vx * c + S.vy * s;
  S.af += ((dt ? (fwd - fwd0) / dt : 0) - S.af) * Math.min(1, dt * 6);
  S.vx = e.vx || 0;
  S.vy = e.vy || 0;
  pitch += clamp(-S.af * 0.00035, -0.14, 0.14);
  roll += clamp(-(e.av || 0) * Math.hypot(e.vx || 0, e.vy || 0) * 0.0009, -0.16, 0.16);
  const rx = e.rcx || 0,
    ry = e.rcy || 0,
    rf = rx * c + ry * s,
    rs = -rx * s + ry * c;
  pitch += rf * -0.03;
  roll += rs * 0.03;
  if (dying) {
    z = lerp(STAND, 9, df);
    pitch = lerp(pitch, -0.12, df);
    roll = lerp(roll, (e.dieDir || 1) * 0.3, df);
    hp = lerp(hp, -0.6, df);
  }
  if (st === 'leap' || dying) S.z = z;
  else S.z += (z - S.z) * k;
  S.pitch += (pitch - S.pitch) * k;
  S.roll += (roll - S.roll) * k;
  S.hp += (hp - S.hp) * k;
  const yaw = e.a + (e.tw || 0) * 0.5,
    br = 1 + Math.sin(now * 2.2) * 0.012,
    R = rot(yaw, S.pitch, S.roll),
    P = [e.x + rx * 1.4, e.y + ry * 1.4, S.z];
  // the legs: down to where the fight has each foot planted, lifted while it steps; tucked in a leap; splayed when it dies
  const tuck = st === 'leap' ? Math.sin(clamp(1 - Math.max(0, e.stT) / (e.ldur || 0.8), 0, 1) * Math.PI) : 0;
  const legs = HIPS.map((h, i) => {
    const hip = xf(R, P, h),
      L = e.legs && e.legs[i],
      side = h[1] < 0 ? -1 : 1;
    let foot = L
      ? [L.fx, L.fy, L.t < 1 ? Math.sin(L.t * Math.PI) * 28 : 0]
      : xf(rot(yaw, 0), [e.x, e.y, 0], [REST[i][0], REST[i][1], 0]);
    if (tuck) foot = mix3(foot, xf(R, P, [h[0] * 1.2, h[1] * 1.6, -24]), tuck * 0.85);
    if (dying) {
      const out = xf(rot(yaw, 0), [e.x, e.y, 0], [REST[i][0] * 1.3, REST[i][1] * 1.3, 0]);
      foot = mix3(foot, out, df * 0.8);
      foot[2] = lerp(foot[2], 0, df);
    }
    const pole = nrm(add(mul(R[1], side * 0.7), [0, 0, dying ? 0.4 : 1])),
      [knee, f2] = ik(hip, foot, 58, 62, pole);
    return [hip, knee, f2];
  });
  // the blades: carried out in front, swung in and down to strike, raised high when it rears
  const cl = dying ? 0 : e.claw || 0,
    rear = st === 'rear' || st === 'roar' ? 1 : 0;
  const arms = [-1, 1].map(sd => {
    const sh = xf(R, P, [40, sd * 52, 6]);
    let hand, bdir;
    if (dying) {
      hand = xf(rot(yaw, 0), [e.x, e.y, 0], [96, sd * 92, 4]);
      bdir = nrm(add(mul(rot(yaw, 0)[0], 1), mul(rot(yaw, 0)[1], sd * 0.6)));
    } else {
      const reach = 104 + cl * 58,
        hz = rear ? 72 : 26 + 30 * Math.sin(Math.min(1, cl * 1.6) * Math.PI) - 24 * sm((cl - 0.6) / 0.4);
      hand = xf(R, P, [rear ? 82 : reach, sd * (rear ? 74 : 58 - cl * 40), 0]);
      hand[2] = hz;
      const f = R[0],
        down = sm((cl - 0.5) / 0.5);
      bdir = nrm(
        mix3(add(add(f, mul(R[1], sd * 0.25)), [0, 0, rear ? 0.9 : 0.3]), add(mul(f, 0.45), [0, 0, -1]), down)
      );
    }
    const pole = nrm(add(mul(R[1], sd * 0.8), [0, 0, 0.9])),
      [elbow, h2] = ik(sh, hand, 60, 60, pole);
    return [sh, elbow, h2, add(h2, mul(bdir, 54))];
  });
  const tail = tailJoints(
    e,
    R,
    P,
    Math.max(6, S.z * 0.55),
    dying ? 0 : e.hoseR || 0,
    dying ? df > 0.5 : e.tailLimp > 0
  );
  const tw = dying ? 0 : angDiff(e.a, e.face || e.a) * 0.4,
    HR = rot(yaw + tw, S.pitch + S.hp, S.roll),
    headP = xf(R, P, [70, Math.sin(tw) * 10, 10 - (dying ? 8 * df : 0)]),
    neckA = xf(R, P, [30, 0, 6]),
    neckB = xf(HR, headP, [-14, 0, -2]);
  return {
    bodyR: R.map(v => mul(v, 1 / br)),
    bodyP: P,
    headR: HR,
    headP,
    neck: [neckA, neckB],
    legs,
    arms,
    tail,
    hole: [0, 0, 0, 0],
    eye: [P[0], P[1] + 40, 760],
    top: Math.max(130, S.z + 110),
  };
}

// ---------- its entrance: climbing out of the street ----------
// the body's way out, relative to the hole: forward of its middle (u), height (z), nose up (pitch)
const CU = track([
    [0, -34],
    [1.0, -32],
    [1.7, -20],
    [2.5, 0],
    [3.3, 34],
    [4.0, 56],
    [4.7, 60],
    [6, 62],
  ]),
  CZ = track([
    [0, -150],
    [0.9, -128],
    [1.7, -72],
    [2.5, -26],
    [3.3, 8],
    [4.0, 27],
    [4.7, 30],
    [6, 30],
  ]),
  CP = track([
    [0, 1.05],
    [1.0, 1.0],
    [1.7, 0.82],
    [2.5, 0.5],
    [3.3, 0.16],
    [4.0, 0.02],
    [4.45, 0.0],
    [4.75, 0.2],
    [5.2, 0.24],
    [5.7, 0.04],
    [6.5, 0.0],
  ]),
  CR = track([
    [0, 0],
    [1.9, 0.08],
    [2.5, -0.1],
    [3.1, 0.07],
    [3.7, -0.04],
    [4.3, 0],
  ]),
  CHP = track([
    [0, 0.1],
    [1.4, 0.35],
    [2.2, 0.15],
    [3.3, -0.05],
    [4.4, 0.0],
    [4.8, 0.5],
    [5.3, 0.55],
    [5.8, 0.08],
  ]),
  CHY = track([
    [0, 0],
    [1.8, -0.25],
    [2.6, 0.2],
    [3.4, -0.1],
    [4.2, 0.0],
    [6.0, 0.15],
  ]);
const C_LEGS = [
  { grip: 2.05, stand: 3.55 },
  { grip: 2.3, stand: 3.75 },
  { grip: 2.85, stand: 3.95 },
  { grip: 3.1, stand: 4.15 },
];
const C_ARMS = [{ slam: 1.0 }, { slam: 1.22 }];
export const CLIP_END = 6; // standing, roared, settled
export const HOLE_R = 66;
// a climb out of a hole at (hx, hy), facing yaw: clip.pose(t) and clip.events(t0, t1, fx)
export function clipAbom(hx, hy, yaw) {
  const f = [Math.cos(yaw), Math.sin(yaw), 0],
    s = [-Math.sin(yaw), Math.cos(yaw), 0],
    hist = [],
    fired = new Set(),
    ground = (u, v, z = 0) => [hx + f[0] * u + s[0] * v, hy + f[1] * u + s[1] * v, z],
    rootAt = t => [rot(yaw, CP(t), CR(t)), ground(CU(t), 0, CZ(t))],
    arc = (a, b, k, lift) => {
      const p = mix3(a, b, sm(k));
      p[2] += Math.sin(Math.PI * Math.min(1, k)) * lift;
      return p;
    };
  const C = { hx, hy, yaw, last: null };
  C.pose = t => {
    const [R, P] = rootAt(t),
      tb = xf(R, P, [-80, 0, 2]),
      lh = hist[hist.length - 1];
    if (!lh || len(sub(tb, lh)) > 1.5) hist.push(tb);
    const legs = HIPS.map((h, i) => {
      const L = C_LEGS[i],
        hip = xf(R, P, h),
        hang = xf(R, P, [REST[i][0] * 0.55, REST[i][1] * 0.4, -46]),
        hg = xf(...rootAt(L.grip), h),
        dx = hg[0] - hx + f[0] * 20,
        dy = hg[1] - hy + f[1] * 20,
        dl = Math.hypot(dx, dy) || 1,
        rim = [hx + (dx / dl) * (HOLE_R + 24), hy + (dy / dl) * (HOLE_R + 24), 0],
        [RF, PF] = rootAt(Math.max(t, L.stand + 0.45)),
        g = xf(RF, PF, [REST[i][0], REST[i][1], 0]),
        stance = [g[0], g[1], 0];
      let foot;
      if (t < L.grip) foot = hang;
      else if (t < L.grip + 0.45)
        foot = arc(xf(...rootAt(L.grip), [REST[i][0] * 0.55, REST[i][1] * 0.4, -46]), rim, (t - L.grip) / 0.45, 40);
      else if (t < L.stand) foot = rim;
      else foot = arc(rim, stance, (t - L.stand) / 0.45, 26);
      const pole = nrm(add(mul(R[1], (h[1] < 0 ? -1 : 1) * 0.7), [0, 0, 1])),
        [knee, f2] = ik(hip, foot, 58, 62, pole);
      return [hip, knee, f2];
    });
    const arms = C_ARMS.map((Ar, i) => {
      const side = i ? 1 : -1,
        sh = xf(R, P, [40, side * 52, 6]),
        under = xf(R, P, [92, side * 34, -10]),
        stab = ground(HOLE_R + 62, side * 58, 0),
        ready = xf(R, P, [104, side * 66, 30]),
        rdy = sm((t - 3.7) / 0.6);
      let hand, bdir;
      if (t < Ar.slam - 0.5) {
        hand = under;
        bdir = nrm(add(R[0], [0, 0, 0.6]));
      } else if (t < Ar.slam) {
        const k = (t - (Ar.slam - 0.5)) / 0.5;
        hand = arc(xf(...rootAt(Ar.slam - 0.5), [92, side * 34, -10]), add(stab, [0, 0, 6]), k, 70);
        bdir = nrm(mix3([0, 0, 1], add(mul(f, 0.35), [0, 0, -1]), sm(k)));
      } else {
        hand = mix3(add(stab, [0, 0, 6]), ready, rdy);
        bdir = nrm(mix3(add(mul(f, 0.35), [0, 0, -1]), add(add(R[0], mul(R[1], side * 0.25)), [0, 0, 0.35]), rdy));
      }
      const pole = nrm(add(mul(R[1], side * 0.8), [0, 0, 0.9])),
        [elbow, h2] = ik(sh, hand, 60, 60, pole);
      return [sh, elbow, h2, add(h2, mul(bdir, 54))];
    });
    // the tail comes out last, along the way the body came up
    const tail = [];
    {
      let idx = hist.length - 1,
        cur = hist[idx] || tb;
      tail.push(cur);
      const back = mul(R[0], -1);
      for (let k = 1; k < 6; k++) {
        let need = 24;
        while (need > 0 && idx > 0) {
          const nx = hist[idx - 1],
            sl = len(sub(nx, cur));
          if (sl >= need) {
            cur = add(cur, mul(nrm(sub(nx, cur)), need));
            need = 0;
          } else {
            need -= sl;
            cur = nx;
            idx--;
          }
        }
        if (need > 0) cur = add(cur, mul(nrm(add(back, [0, 0, -1.4])), need));
        tail.push(add(cur, mul(s, Math.sin(t * 1.6 - k * 0.7) * k * 2.2 * sm((t - 3.5) / 1))));
      }
    }
    const HR = rot(yaw + CHY(t), CP(t) + CHP(t), CR(t)),
      headP = xf(R, P, [70, 0, 10]),
      br = 1 + Math.sin(t * 2.2) * 0.012;
    C.last = { legs, P, R };
    return {
      bodyR: R.map(v => mul(v, 1 / br)),
      bodyP: P,
      headR: HR,
      headP,
      neck: [xf(R, P, [30, 0, 6]), xf(HR, headP, [-14, 0, -2])],
      legs,
      arms,
      tail,
      hole: [hx, hy, HOLE_R * sm(t / 0.75), 150],
      eye: [P[0], P[1] + 40, 760],
      top: 130,
    };
  };
  // what happens along the way: the street splitting, the blades going in, each grip, it hauling out, the roar
  C.events = (t0, t1, pose, fx) => {
    const once = (key, at, fn) => {
      if (at > t0 && at <= t1 && !fired.has(key)) {
        fired.add(key);
        fn();
      }
    };
    for (let k = 0; k < 6; k++) once('crack' + k, 0.05 + k * 0.1, () => fx.crack(k / 5));
    once('burst', 0.65, () => fx.burst());
    C_ARMS.forEach((Ar, i) => once('slam' + i, Ar.slam, () => fx.stab(pose.arms[i][3])));
    C_LEGS.forEach((L, i) => {
      once('grip' + i, L.grip + 0.45, () => fx.grip(pose.legs[i][2]));
      once('step' + i, L.stand + 0.45, () => fx.step(pose.legs[i][2]));
    });
    once('haul', 2.5, () => fx.haul());
    once('roar', 4.75, () => fx.roar());
  };
  return C;
}

// ---------- drawing ----------
let P3 = null,
  bad = false;
export const B3D = { ms: 0 };
// whether the 3D Abomination draws (Settings: 3D bosses), and whether this machine could build it
export const boss3dOn = () => opt.b3d !== false && !bad && !!gl;
function build() {
  if (P3 || bad) return P3;
  try {
    P3 = program(FS_VS, FS());
  } catch (err) {
    bad = true;
    console.warn('Dead Acre: the 3D bosses could not be built here, so the pictures stand in', err);
  }
  return P3;
}
// draws the Abomination in 3D into whichever pass is running (the scene, the moon's shadows, a lamp's); false if it
// can't, so the picture draws instead
export function drawBoss3D(e) {
  if (!boss3dOn() || !build()) return false;
  if (e.p3F !== GS.time || !e.pose3) {
    e.p3F = GS.time;
    if (!e.clip3d) e.pose3 = poseLive(e);
  }
  const S = e.pose3;
  if (!S) return true;
  flush();
  const vp = gl.getParameter(gl.VIEWPORT),
    W = vp[2],
    H = vp[3],
    mode = GS.SHMODE === 3 || GS.SHMODE === 4 ? 2 : GS.SHMODE ? 1 : 0,
    u = P3.u,
    [lx, ly, lh] = lampNow(),
    fade = e.dying !== undefined ? clamp(((e.keep || 0.55) - e.dying) / 1.5, 0, 1) : 1;
  gl.useProgram(P3.p);
  gl.uniform4f(u.uCam, GS.camX, GS.camY, viewW, viewH);
  gl.uniform2f(u.uRes, W, H);
  gl.uniform1i(u.uMode, mode);
  gl.uniform2f(u.uSun, SUNV[0], SUNV[1]);
  gl.uniform3f(u.uLamp, lx, ly, lh);
  gl.uniform1f(u.uShA, mode ? GS.SHS * (mode === 2 ? 0.8 : 1) : 1);
  gl.uniform4f(u.uHole, S.hole[0], S.hole[1], S.hole[2], S.hole[3]);
  gl.uniform3f(u.uEye, S.eye[0], S.eye[1], S.eye[2]);
  gl.uniform1f(u.uT, GS.time);
  gl.uniform1f(u.uFlash, e.flash > 0 && e.dying === undefined ? 0.35 * Math.min(1, e.flash / 0.05) : 0);
  gl.uniform1f(u.uFade, fade);
  gl.uniform1f(u.uRage, e.dying !== undefined ? 0.2 : e.ph === 2 ? 1.6 : 1);
  gl.uniformMatrix3fv(u.uBodyR, false, S.bodyR.flat());
  gl.uniform3fv(u.uBodyP, S.bodyP);
  gl.uniformMatrix3fv(u.uHeadR, false, S.headR.flat());
  gl.uniform3fv(u.uHeadP, S.headP);
  gl.uniform3fv(u.uNeck, S.neck.flat());
  gl.uniform3fv(u.uLeg, S.legs.flat(2));
  gl.uniform3fv(u.uArm, S.arms.flat(2));
  gl.uniform3fv(u.uTail, S.tail.flat());
  gl.uniform3f(u.uBound, 0, 0, S.top);
  // only the screen round it (and round its shadow)
  const r = mode ? 380 : 270,
    cx = S.bodyP[0],
    cy = S.bodyP[1],
    sx = v => ((v - GS.camX) / viewW) * W,
    sy = v => (1 - (v - GS.camY) / viewH) * H,
    x0 = Math.max(0, Math.floor(sx(cx - r))),
    x1 = Math.min(W, Math.ceil(sx(cx + r))),
    y0 = Math.max(0, Math.floor(sy(cy + r))),
    y1 = Math.min(H, Math.ceil(sy(cy - r)));
  if (x1 > x0 && y1 > y0) {
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x0, y0, x1 - x0, y1 - y0);
    gl.bindVertexArray(emptyVAO);
    if (!mode) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
  }
  gl.useProgram(GS.curProg.p);
  return true;
}
