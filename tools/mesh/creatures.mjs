/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The dead that aren't people-shaped, as 3D shapes for tools/mesh/build.mjs: the dog and the egg sac.
// x forward, y to its right, z up, on the ground at z = 0. Regions as in humanoid.mjs (0 its hide, 1 darker fur,
// 12 eyes, 13 the mouth, 17 raw flesh).
import { REGION } from './humanoid.mjs';

const f = x => (Number.isInteger(x) ? x + '.0' : String(+x.toFixed(4)));
const v = a => `vec3(${a.map(f).join(',')})`;

// the dog: a big, starved, half-rotten dog, about 18 at the shoulder and 34 from nose to rump. Its skeleton has the
// same 14 bones as a person's, put to a dog's use: hips, back, chest, then its head (on its neck); each front leg in two
// (upper, lower to the paw); each hind leg in three (thigh, shin, the long foot to the paw). Its tail rides its hips.
const DOG_BONES = [
  ['hips', -1, [-10, 0, 16.5], [-6, 0, 17.5]],
  ['back', 0, [-6, 0, 17.5], [3, 0, 18]],
  ['chest', 1, [3, 0, 18], [9, 0, 18.5]],
  ['head', 2, [10, 0, 20], [23, 0, 21.5]],
  ['frontUR', 2, [7.5, 3.4, 14.5], [6.8, 3.6, 7.5]],
  ['frontLR', 4, [6.8, 3.6, 7.5], [8.2, 3.6, 0.5]],
  ['frontUL', 2, [7.5, -3.4, 14.5], [6.8, -3.6, 7.5]],
  ['frontLL', 6, [6.8, -3.6, 7.5], [8.2, -3.6, 0.5]],
  ['thighR', 0, [-11, 3.4, 15], [-7, 3.6, 8.6]],
  ['shinR', 8, [-7, 3.6, 8.6], [-11.8, 3.6, 4.4]],
  ['footR', 9, [-11.8, 3.6, 4.4], [-10.2, 3.6, 0.5]],
  ['thighL', 0, [-11, -3.4, 15], [-7, -3.6, 8.6]],
  ['shinL', 11, [-7, -3.6, 8.6], [-11.8, -3.6, 4.4]],
  ['footL', 12, [-11.8, -3.6, 4.4], [-10.2, -3.6, 0.5]],
];
const J = {};
for (const [n, , a, b] of DOG_BONES) {
  J[n] = a;
  J[n + 'E'] = b;
}
const DOG_GLSL = `
const vec3 FS=${v(J.frontUR)}, FE=${v(J.frontLR)}, FP=${v(J.frontLRE)};
const vec3 HH=${v(J.thighR)}, HK=${v(J.shinR)}, HJ=${v(J.footR)}, HP=${v(J.footRE)};
const vec3 NB=${v(J.head)}, HC=vec3(19.0,0.0,22.2); // the base of the neck; the middle of the skull
int gPart; int gReg; float gU;
float best;
void near(float d, int part, int reg, float u){ if(d<best){ best=d; gPart=part; gReg=reg; gU=clamp(u,0.0,1.0); } }
float along(vec3 p, vec3 a, vec3 b){ vec3 ba=b-a; return dot(p-a,ba)/dot(ba,ba); }
float mange(vec3 p){ return (fbm(p.xz*0.7+p.y*0.4)-0.5)*0.5+(vn(p.xy*1.9+p.z)-0.5)*0.2; } // matted, patchy fur
// its body: a deep chest, the belly tucked up, the ribs and hips showing
float body(vec3 p, out float dChest, out float dBack, out float dHips){
  vec3 q=vec3(p.x,abs(p.y),p.z);
  float ch=sdEll(q,vec3(5.5,0.0,15.8),vec3(5.2,4.0,4.8)); // the chest, deep
  ch=smin(ch,sdEll(q,vec3(7.6,2.6,14.6),vec3(2.4,1.9,3.2)),1.4); // the shoulders
  ch-=sin(q.x*1.8)*0.25*smoothstep(1.0,4.0,q.y)*step(0.5,q.x)*step(q.x,8.5); // ribs
  float bk=sdCap(q,vec3(-6.0,0.0,16.6),vec3(3.0,0.0,17.0),3.0,3.6); bk=smax(bk,-(q.z-12.6+(q.x+2.0)*0.12),1.8); // the back, the belly tucked up under it
  float hp=sdEll(q,vec3(-9.0,0.0,16.0),vec3(3.6,3.5,3.4)); hp=smin(hp,sdEll(q,vec3(-10.4,2.8,14.4),vec3(2.4,1.6,3.0)),1.0); // the hips, the haunches
  hp=smin(hp,sdCap(q,vec3(-12.0,0.0,16.6),vec3(-18.0,0.0,10.0),1.1,0.45),0.9); // the tail, hanging
  float m=mange(p);
  dChest=ch+m; dBack=bk+m; dHips=hp+m;
  return smin(smin(dChest,dBack,2.2),dHips,2.0);
}
float head(vec3 p, out float dNeck, out float dSkull){
  vec3 q=vec3(p.x,abs(p.y),p.z);
  float nk=sdCap(q,NB+vec3(-1.5,0.0,-1.0),HC+vec3(-2.6,0.0,-0.8),2.9,2.2); // the neck, thick at the base
  float sk=sdEll(q,HC+vec3(-0.6,0.0,0.4),vec3(2.9,2.4,2.4)); // the skull
  sk=smin(sk,sdCap(q,HC+vec3(1.2,0.0,0.0),HC+vec3(5.4,0.0,-0.9),1.7,1.2),1.1); // the muzzle, long
  sk=smin(sk,sdCap(q,HC+vec3(1.0,0.0,-1.6),HC+vec3(4.8,0.0,-3.1),1.25,0.8),0.6); // the lower jaw, hanging open
  sk=smax(sk,-sdCap(q,HC+vec3(2.2,0.0,-1.4),HC+vec3(6.0,0.0,-1.9),0.1,0.75),0.4); // the snarl between
  sk=smin(sk,sdCap(q,HC+vec3(-1.4,1.6,1.8),HC+vec3(-2.2,2.2,4.0),0.8,0.25),0.5); // the ears, pricked (one torn)
  sk=smax(sk,-sdSph(q,HC+vec3(1.5,1.35,0.9),0.5),0.2); // the eyes, sunk
  sk+=mange(p)*0.6;
  dNeck=nk+mange(p); dSkull=sk;
  return smin(sk,dNeck,1.2);
}
float fleg(vec3 p, float s, out float dU, out float dL){
  vec3 q=vec3(p.x,p.y*s,p.z);
  float u=sdCap(q,FS,FE,2.4,1.4); u=smin(u,sdEll(q,mix(FS,FE,0.25)+vec3(0.5,0.0,0.0),vec3(1.6,1.4,2.6)),0.8);
  float l=sdCap(q,FE,FP+vec3(-0.6,0.0,0.6),1.15,0.85); l=smin(l,sdEll(q,FP+vec3(0.5,0.0,0.3),vec3(1.4,1.05,0.75)),0.5); // the paw
  dU=u+mange(p)*0.6; dL=l;
  return smin(dU,dL,0.7);
}
float hleg(vec3 p, float s, out float dT, out float dS, out float dF){
  vec3 q=vec3(p.x,p.y*s,p.z);
  float t=sdCap(q,HH,HK,3.0,1.5); t=smin(t,sdEll(q,mix(HH,HK,0.3)+vec3(-0.6,0.0,0.0),vec3(2.2,1.5,3.0)),1.0); // the thigh, the hams
  float sh=sdCap(q,HK,HJ,1.3,0.8);
  float ft=sdCap(q,HJ,HP+vec3(-0.6,0.0,0.6),0.8,0.8); ft=smin(ft,sdEll(q,HP+vec3(0.5,0.0,0.3),vec3(1.3,1.0,0.7)),0.5);
  dT=t+mange(p)*0.6; dS=sh; dF=ft;
  return smin(smin(dT,dS,0.6),dF,0.5);
}
float model(vec3 p){
  float a,b,c,n,sk,u,l,t,sh,ft;
  float d=body(p,a,b,c);
  d=smin(d,head(p,n,sk),1.0);
  d=smin(d,fleg(p,1.0,u,l),1.2); d=smin(d,fleg(p,-1.0,u,l),1.2);
  d=smin(d,hleg(p,1.0,t,sh,ft),1.3); d=smin(d,hleg(p,-1.0,t,sh,ft),1.3);
  // wounds: patches of hide gone, the flesh beneath
  return d;
}
void attrs(vec3 p){
  best=1e9; gPart=0; gReg=0; gU=0.0;
  float a,b,c; body(p,a,b,c);
  int raw=vn(p.xz*0.55+p.y*0.45+vec2(5.0,2.0))*vn(p.yz*0.9+p.x*0.3)>0.5?17:0; // the mange: raw where the hide has gone
  near(c,0,raw,0.0); near(b,1,raw==17?17:(p.z>17.5?1:0),0.0); near(a,2,raw,0.0);
  float n,sk; head(p,n,sk);
  { vec3 q=vec3(p.x,abs(p.y),p.z); int reg=0;
    if(sdSph(q,HC+vec3(1.5,1.35,0.9),0.8)<0.0) reg=12;
    if(sdCap(q,HC+vec3(2.0,0.0,-1.3),HC+vec3(6.2,0.0,-2.0),0.1,1.0)<0.0) reg=13;
    near(sk,3,reg,0.5); near(n,3,0,0.0); }
  for(int k=0;k<2;k++){ float s=k==0?1.0:-1.0; vec3 q=vec3(p.x,p.y*s,p.z);
    float u,l; fleg(p,s,u,l); near(u,k==0?4:6,0,0.0); near(l,k==0?5:7,0,along(q,FE,FP));
    float t,sh,ft; hleg(p,s,t,sh,ft); near(t,k==0?8:11,0,0.0); near(sh,k==0?9:12,0,0.0); near(ft,k==0?10:13,0,0.0); }
}
`;
export const DOG = {
  BONES: DOG_BONES,
  BOUNDS: [
    [-21, -10, -1],
    [29, 10, 28],
  ],
  GLSL: DOG_GLSL,
  REGION,
  SCALE: 1,
  MRES: 0.75,
};

// the egg sac: a swollen, veined bag of rot on the ground, something curled inside. All of it rides the first bone; the
// rest of the skeleton is unused
const EGG_BONES = DOG_BONES.map(([n, p, a, b], i) => (i === 0 ? ['sac', -1, [0, 0, 0], [0, 0, 8]] : [n, p, a, b]));
const EGG_GLSL = `
int gPart; int gReg; float gU;
float sac(vec3 p){
  float d=sdEll(p,vec3(0.0,0.0,6.5),vec3(10.0,8.6,7.6)); // the bag
  d=smin(d,sdEll(p,vec3(4.5,2.0,4.0),vec3(5.0,4.4,4.2)),2.0); d=smin(d,sdEll(p,vec3(-3.6,-3.0,3.6),vec3(5.2,4.6,4.0)),2.0); // lumpy
  d=smax(d,-p.z,0.8); // sitting on the ground
  d-=(vn(p.xy*0.6+p.z*0.4)-0.5)*0.8+(1.0-smoothstep(0.0,0.035,abs(vn(p.xy*0.7+p.z*0.5)-0.5)))*0.3; // swellings; the veins standing out
  return d;
}
float model(vec3 p){ return sac(p); }
void attrs(vec3 p){ gPart=0; gU=0.0; gReg=abs(vn(p.xy*0.7+p.z*0.5)-0.5)<0.03?13:17; }
`;
export const EGG = {
  BONES: EGG_BONES,
  BOUNDS: [
    [-14, -13, -1],
    [14, 13, 16],
  ],
  GLSL: EGG_GLSL,
  REGION,
  SCALE: 1.5, // the size of the pictures
  MRES: 0.9,
};
