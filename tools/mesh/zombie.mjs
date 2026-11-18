/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The ordinary zombie as one 3D shape in its rest pose, for tools/mesh/build.mjs to turn into the mesh the game draws.
// Units are the game's (a zombie's shoulders are about 30 across); x forward, y to its right, z up, feet on z = 0.
// The arms hang out a little from the body (an A pose), so skinning can swing them anywhere from there.
//
// The GLSL gives two things: model(p), the distance to the body; and attrs(p), what a point on the body is: which
// bone carries it (part), what it is (region: skin, hair, shirt or trousers ground, shoe, eye...) and how far along its
// limb it sits (u, 0 at the joint it hangs from, 1 at its far end), which the game uses to cut sleeves and trouser legs
// to each zombie's own length and to tear its clothes.

// the skeleton: each bone from its joint (where it turns) to its end; parent first
export const BONES = [
  // name, parent, joint, end
  ['pelvis', -1, [0, 0, 23.5], [0, 0, 27]],
  ['spine', 0, [0, 0, 26], [0, 0, 31]],
  ['chest', 1, [0, 0, 31], [0, 0, 38.5]],
  ['head', 2, [0.2, 0, 38.5], [0.8, 0, 48]],
  ['uarmR', 2, [-0.5, 11.8, 36.6], [-0.5, 19.2, 27.8]],
  ['farmR', 4, [-0.5, 19.2, 27.8], [-0.2, 29.6, 15.8]],
  ['uarmL', 2, [-0.5, -11.8, 36.6], [-0.5, -19.2, 27.8]],
  ['farmL', 6, [-0.5, -19.2, 27.8], [-0.2, -29.6, 15.8]],
  ['thighR', 0, [0, 5.2, 22.4], [0.8, 5.6, 12.4]],
  ['shinR', 8, [0.8, 5.6, 12.4], [0, 5.8, 3.2]],
  ['footR', 9, [0, 5.8, 3.2], [6.5, 6.0, 1.0]],
  ['thighL', 0, [0, -5.2, 22.4], [0.8, -5.6, 12.4]],
  ['shinL', 11, [0.8, -5.6, 12.4], [0, -5.8, 3.2]],
  ['footL', 12, [0, -5.8, 3.2], [6.5, -6.0, 1.0]],
];
// what a point is (attrs' region): the game colours each from the zombie's own skin, shirt, trousers and shoes
export const REGION = {
  skin: 0,
  hair: 1,
  neck: 2,
  chest: 3,
  belly: 4,
  hips: 5,
  uarm: 6,
  farm: 7,
  hand: 8,
  thigh: 9,
  shin: 10,
  foot: 11,
  eye: 12,
  mouth: 13,
};
export const BOUNDS = [
  [-12, -34, -1],
  [14, 34, 51],
];
const v = a => `vec3(${a.map(x => (Number.isInteger(x) ? x + '.0' : x)).join(',')})`;
const J = {};
for (const [n, , a, b] of BONES) {
  J[n] = a;
  J[n + 'E'] = b;
}
export const GLSL = `
// bones' joints (see BONES)
const vec3 SHO=${v(J.uarmR)}, ELB=${v(J.farmR)}, WRI=${v(J.farmRE)};
const vec3 HIP=${v(J.thighR)}, KNEE=${v(J.shinR)}, ANK=${v(J.footR)}, TOE=${v(J.footRE)};
const vec3 HC=vec3(0.9,0.0,43.6); // the middle of the head
int gPart; int gReg; float gU;
float best; // the nearest part so far, for attrs
void near(float d, int part, int reg, float u){ if(d<best){ best=d; gPart=part; gReg=reg; gU=clamp(u,0.0,1.0); } }
float along(vec3 p, vec3 a, vec3 b){ vec3 ba=b-a; return dot(p-a,ba)/dot(ba,ba); }
// cloth: soft folds and a little sag, only where there is cloth
float folds(vec3 p, float k){ return (sin(p.z*1.3+sin(p.y*0.6)*1.8)*0.5+sin(p.y*0.9-p.z*0.7)*0.35)*0.22*k+(fbm(p.yz*0.45+p.x*0.2)-0.5)*0.35*k; }
// the trunk: chest, belly, hips; gaunt, the ribs and collarbones showing through the shirt a little
float trunk(vec3 p, out float dChest, out float dBelly, out float dHips){
  vec3 q=vec3(p.x,abs(p.y),p.z);
  float ch=sdEll(q,vec3(-0.8,0.0,33.0),vec3(5.0,9.2,5.6));
  ch=smin(ch,sdCap(q,vec3(-1.0,0.0,36.1),vec3(-0.9,10.6,36.4),2.6,2.4),2.6); // the yoke of the shoulders
  ch=smin(ch,sdSph(q,vec3(-0.6,11.7,36.2),3.1),1.6); // the shoulder, bony
  ch=smin(ch,sdEll(q,vec3(-3.6,4.6,33.6),vec3(2.4,4.0,3.8)),1.6); // the shoulder blades, sharp
  ch=smax(ch,-sdCap(q,vec3(4.6,0.0,36.2),vec3(5.6,0.0,30.0),1.0,0.6),1.4); // the breastbone hollow
  ch+=folds(p,1.0)*0.8-sin(q.z*2.2)*0.12*smoothstep(4.0,6.0,q.x)*step(28.0,q.z); // ribs through the cloth
  float be=sdEll(q,vec3(-0.6,0.0,28.0),vec3(3.9,6.9,4.4)); be=smax(be,-(4.0-q.x+(q.z-28.0)*(q.z-28.0)*0.05),2.0); // the belly, sunken
  be+=folds(p,1.0);
  float hp=sdEll(q,vec3(-0.4,0.0,23.4),vec3(4.4,7.4,3.9));
  hp=smin(hp,sdEll(q,vec3(-2.0,3.6,21.8),vec3(3.0,3.4,3.6)),1.6); // the seat
  hp=smin(hp,sdCap(q,vec3(0.4,0.0,25.4),vec3(0.2,7.0,25.2),0.9,0.9),0.8); // the belt
  dChest=ch; dBelly=be; dHips=hp;
  return smin(smin(ch,be,2.6),hp,2.2);
}
float head(vec3 p, out float dNeck, out float dSkull){
  vec3 q=vec3(p.x,abs(p.y),p.z)-HC;
  float sk=sdEll(q,vec3(-0.6,0.0,0.6),vec3(5.0,4.5,5.2)); // the skull
  sk=smin(sk,sdEll(q,vec3(2.5,0.0,-2.6),vec3(2.9,3.3,2.5)),1.8); // the jaw, hanging
  sk=smin(sk,sdEll(q,vec3(3.6,1.9,-0.2),vec3(1.6,1.5,1.6)),1.0); // cheekbones
  sk=smin(sk,sdCap(q,vec3(4.3,0.0,1.6),vec3(5.5,0.0,-0.4),0.7,0.9),0.8); // the nose
  sk=smin(sk,sdEll(q,vec3(-0.6,4.5,0.0),vec3(1.2,0.6,1.7)),0.6); // the ears
  sk=smin(sk,sdCap(q,vec3(4.0,-2.6,2.3),vec3(4.0,2.6,2.3),0.9,0.9),1.0); // the brow
  sk=smax(sk,-sdSph(q,vec3(4.5,1.75,1.0),1.15),0.5); // the eye sockets
  sk=smax(sk,-sdEll(q,vec3(4.9,0.0,-3.0),vec3(1.4,2.0,0.7)),0.6); // the mouth, slack
  sk+=(fbm(q.xy*0.8+q.z*0.4)-0.5)*0.25;
  float nk=sdCap(p,vec3(0.0,0.0,36.5),HC+vec3(-1.2,0.0,-3.2),2.7,2.3);
  nk=smin(nk,sdCap(vec3(p.x,abs(p.y),p.z),vec3(-0.6,0.6,37.4),HC+vec3(-0.2,2.6,-3.4),0.9,0.7),1.2); // the cords of the neck
  dNeck=nk; dSkull=sk;
  return smin(sk,nk,1.6);
}
// one arm (s = 1 its right, -1 its left): upper arm, forearm, hand
float arm(vec3 p, float s, out float dU, out float dF, out float dH){
  vec3 q=vec3(p.x,p.y*s,p.z);
  float u=sdCap(q,SHO+vec3(0.0,0.2,-0.6),ELB,3.0,2.4); u=smin(u,sdEll(q,mix(SHO,ELB,0.35)+vec3(0.4,0.0,0.0),vec3(2.4,2.5,3.6)),1.2); // the biceps, wasted
  float f=sdCap(q,ELB,WRI,2.4,1.75); f=smin(f,sdSph(q,ELB,2.45),0.7); // the elbow's knob
  vec3 dir=normalize(WRI-ELB);
  float h=sdEll(q,WRI+dir*2.9,vec3(1.4,2.2,2.8)); h=smin(h,sdCap(q,WRI+dir*2.2,WRI+dir*6.0+vec3(0.8,0.0,0.0),1.0,0.7),0.8); h=smin(h,sdCap(q,WRI+dir*1.6+vec3(0.6,-1.4,0.0),WRI+dir*3.6+vec3(1.6,-1.8,0.0),0.7,0.55),0.6); // the thumb // the hand, fingers curled
  float sl=folds(p,1.0)*0.7; u+=sl; f+=sl*0.6;
  dU=u; dF=f; dH=h;
  return smin(smin(u,f,1.2),h,0.9);
}
float leg(vec3 p, float s, out float dT, out float dS, out float dFt){
  vec3 q=vec3(p.x,p.y*s,p.z);
  float t=sdCap(q,HIP,KNEE,3.3,2.4); t=smin(t,sdSph(q,KNEE+vec3(0.6,0.0,0.0),2.3),1.0);
  float sh=sdCap(q,KNEE,ANK+vec3(0.0,0.0,0.6),2.3,1.7); sh=smin(sh,sdEll(q,mix(KNEE,ANK,0.3)+vec3(-1.0,0.0,0.0),vec3(1.5,1.6,3.0)),1.0); // the calf
  float tr=folds(p,1.0)*0.9; t+=tr; sh+=tr*0.8;
  float ft=sdCap(q,ANK+vec3(-1.4,0.0,-1.2),TOE+vec3(0.0,0.0,0.4),2.0,1.6); ft=smax(ft,-q.z,0.6); // the shoe, flat underneath
  ft=smin(ft,sdSph(q,ANK+vec3(-0.6,0.0,-0.2),2.1),1.0);
  dT=t; dS=sh; dFt=ft;
  return smin(smin(t,sh,1.2),ft,0.9);
}
float model(vec3 p){
  float c,b,h,n,u,f,hd,t,s,ft;
  float d=trunk(p,c,b,h);
  float sk; d=smin(d,head(p,n,sk),1.2);
  d=smin(d,arm(p,1.0,u,f,hd),2.0); d=smin(d,arm(p,-1.0,u,f,hd),2.0);
  d=smin(d,leg(p,1.0,t,s,ft),2.4); d=smin(d,leg(p,-1.0,t,s,ft),2.4);
  return d;
}
// what the point p on the body is (sets gPart, gReg, gU)
void attrs(vec3 p){
  best=1e9; gPart=0; gReg=0; gU=0.0;
  float c,b,h; trunk(p,c,b,h);
  near(c,2,3,(p.z-30.0)/9.0); near(b,1,4,(p.z-25.0)/6.0); near(h,0,5,(p.z-19.0)/7.0);
  float n, sk; head(p,n,sk);
  { vec3 q=vec3(p.x,abs(p.y),p.z)-HC;
    float face=q.x-1.5-q.z*0.35;
    int reg=(face<0.0&&q.z>-1.2)||q.z>3.2?1:0; // the scalp: hair where it grows, if it has any
    if(sdSph(q,vec3(4.5,1.75,1.0),1.5)<0.0) reg=12; if(sdEll(q,vec3(4.9,0.0,-3.0),vec3(1.8,2.4,1.1))<0.0) reg=13;
    near(sk,3,reg,(q.z+6.0)/12.0); }
  near(n,3,2,(p.z-36.0)/4.0);
  for(int k=0;k<2;k++){ float s=k==0?1.0:-1.0; float u,f,hh; arm(p,s,u,f,hh); vec3 q=vec3(p.x,p.y*s,p.z);
    near(u,k==0?4:6,6,along(q,SHO,ELB)); near(f,k==0?5:7,7,along(q,ELB,WRI)); near(hh,k==0?5:7,8,1.0);
    float t,sh,ft; leg(p,s,t,sh,ft);
    near(t,k==0?8:11,9,along(q,HIP,KNEE)); near(sh,k==0?9:12,10,along(q,KNEE,ANK)); near(ft,k==0?10:13,11,along(q,ANK,TOE)); }
}
`;
