/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The ordinary zombie as one 3D shape in its rest pose, for tools/mesh/build.mjs to turn into the mesh the game draws.
// A grown man in true proportions, about 55 of the game's units tall (7½ heads; arms to mid-thigh, shoulder to
// fingertip some 44% of the height; legs half of it), gaunt. x forward, y to its right, z up, feet on z = 0. The arms
// hang out a little from the body (an A pose), so skinning can swing them anywhere from there.
//
// The GLSL gives two things: model(p), the distance to the body; and attrs(p), what a point on the body is: which
// bone carries it (part), what it is (region: skin, hair, shirt or trousers ground, shoe, eye...) and how far along its
// limb it sits (u, 0 at the joint it hangs from, 1 at its far end), which the game uses to cut sleeves and trouser legs
// to each zombie's own length and to tear its clothes.

// the skeleton: each bone from its joint (where it turns) to its end; parent first
export const BONES = [
  // name, parent, joint, end
  ['pelvis', -1, [0, 0, 29], [0, 0, 33]],
  ['spine', 0, [0, 0, 32.5], [0, 0, 38]],
  ['chest', 1, [0, 0, 38], [0, 0, 46.4]],
  ['head', 2, [0.2, 0, 46.4], [0.8, 0, 55.2]],
  ['uarmR', 2, [-0.5, 7.2, 44.4], [-0.5, 13.7, 36.6]],
  ['farmR', 4, [-0.5, 13.7, 36.6], [-0.2, 22.6, 25.9]],
  ['uarmL', 2, [-0.5, -7.2, 44.4], [-0.5, -13.7, 36.6]],
  ['farmL', 6, [-0.5, -13.7, 36.6], [-0.2, -22.6, 25.9]],
  ['thighR', 0, [0, 4, 28.4], [0.6, 4.3, 15.3]],
  ['shinR', 8, [0.6, 4.3, 15.3], [0, 4.5, 2.6]],
  ['footR', 9, [0, 4.5, 2.6], [7.4, 4.7, 0.9]],
  ['thighL', 0, [0, -4, 28.4], [0.6, -4.3, 15.3]],
  ['shinL', 11, [0.6, -4.3, 15.3], [0, -4.5, 2.6]],
  ['footL', 12, [0, -4.5, 2.6], [7.4, -4.7, 0.9]],
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
  [-8, -27, -1],
  [11, 27, 57],
];
const v = a => `vec3(${a.map(x => (Number.isInteger(x) ? x + '.0' : x)).join(',')})`;
const J = {};
for (const [n, , a, b] of BONES) {
  J[n] = a;
  J[n + 'E'] = b;
}
export const GLSL = `
// bones' joints (see BONES); the wrist sits 8 along the forearm bone, which runs on to the fingertips
const vec3 SHO=${v(J.uarmR)}, ELB=${v(J.farmR)}, FIN=${v(J.farmRE)};
const vec3 HIP=${v(J.thighR)}, KNEE=${v(J.shinR)}, ANK=${v(J.footR)}, TOE=${v(J.footRE)};
const vec3 HC=vec3(0.5,0.0,51.2); // the middle of the head
int gPart; int gReg; float gU;
float best; // the nearest part so far, for attrs
void near(float d, int part, int reg, float u){ if(d<best){ best=d; gPart=part; gReg=reg; gU=clamp(u,0.0,1.0); } }
float along(vec3 p, vec3 a, vec3 b){ vec3 ba=b-a; return dot(p-a,ba)/dot(ba,ba); }
// cloth: soft folds and a little sag, only where there is cloth
float folds(vec3 p, float k){ return (sin(p.z*1.9+sin(p.y*0.9)*1.8)*0.5+sin(p.y*1.3-p.z*1.0)*0.35)*0.14*k+(fbm(p.yz*0.65+p.x*0.3)-0.5)*0.22*k; }
// the trunk: chest, belly, hips; gaunt, the ribs and collarbones showing through the shirt a little
float trunk(vec3 p, out float dChest, out float dBelly, out float dHips){
  vec3 q=vec3(p.x,abs(p.y),p.z);
  float ch=sdEll(q,vec3(-0.4,0.0,40.2),vec3(3.5,5.5,5.2));
  ch=smin(ch,sdCap(q,vec3(-0.6,0.0,44.2),vec3(-0.6,6.4,44.3),1.9,1.7),1.8); // the yoke of the shoulders
  ch=smin(ch,sdSph(q,vec3(-0.4,7.2,43.9),2.2),1.2); // the shoulder, bony
  ch=smin(ch,sdEll(q,vec3(-2.5,3.0,41.6),vec3(1.5,2.6,2.8)),1.1); // the shoulder blades, sharp
  ch=smax(ch,-sdCap(q,vec3(3.0,0.0,44.0),vec3(3.6,0.0,39.5),0.7,0.45),1.0); // the breastbone hollow
  ch+=folds(p,1.0)*0.8-sin(q.z*3.0)*0.08*smoothstep(2.6,3.8,q.x)*step(35.5,q.z); // ribs through the cloth
  float be=sdEll(q,vec3(-0.3,0.0,34.2),vec3(2.8,4.5,3.8)); be=smax(be,-(2.8-q.x+(q.z-34.2)*(q.z-34.2)*0.07),1.4); // the belly, sunken
  be+=folds(p,1.0);
  float hp=sdEll(q,vec3(-0.3,0.0,29.6),vec3(3.3,5.4,3.3));
  hp=smin(hp,sdEll(q,vec3(-1.5,2.6,28.1),vec3(2.3,2.5,2.8)),1.1); // the seat
  hp=smin(hp,sdCap(q,vec3(0.2,0.0,31.9),vec3(0.1,5.0,31.7),0.6,0.6),0.6); // the belt
  dChest=ch; dBelly=be; dHips=hp;
  return smin(smin(ch,be,1.9),hp,1.6);
}
float head(vec3 p, out float dNeck, out float dSkull){
  vec3 q=vec3(p.x,abs(p.y),p.z)-HC;
  float sk=sdEll(q,vec3(-0.4,0.0,0.9),vec3(3.1,2.5,3.1)); // the skull
  sk=smin(sk,sdEll(q,vec3(1.3,0.0,-1.6),vec3(1.9,1.9,1.7)),1.0); // the jaw, hanging
  sk=smin(sk,sdEll(q,vec3(2.1,1.1,0.0),vec3(1.0,0.9,1.0)),0.6); // cheekbones
  sk=smin(sk,sdCap(q,vec3(2.5,0.0,0.9),vec3(3.2,0.0,-0.3),0.42,0.55),0.5); // the nose
  sk=smin(sk,sdEll(q,vec3(-0.4,2.5,0.2),vec3(0.75,0.35,1.05)),0.35); // the ears
  sk=smin(sk,sdCap(q,vec3(2.3,-1.6,1.4),vec3(2.3,1.6,1.4),0.55,0.55),0.6); // the brow
  sk=smax(sk,-sdSph(q,vec3(2.65,1.05,0.6),0.68),0.3); // the eye sockets
  sk=smax(sk,-sdEll(q,vec3(2.9,0.0,-1.9),vec3(0.85,1.2,0.42)),0.35); // the mouth, slack
  sk+=(fbm(q.xy*1.3+q.z*0.6)-0.5)*0.15;
  float nk=sdCap(p,vec3(-0.2,0.0,43.6),HC+vec3(-0.8,0.0,-2.4),1.7,1.45);
  nk=smin(nk,sdCap(vec3(p.x,abs(p.y),p.z),vec3(-0.3,0.4,44.4),HC+vec3(-0.2,1.5,-2.6),0.55,0.45),0.8); // the cords of the neck
  dNeck=nk; dSkull=sk;
  return smin(sk,nk,1.0);
}
// one arm (s = 1 its right, -1 its left): upper arm, forearm, hand
float arm(vec3 p, float s, out float dU, out float dF, out float dH){
  vec3 q=vec3(p.x,p.y*s,p.z);
  vec3 dir=normalize(FIN-ELB), WRI=ELB+dir*8.0;
  float u=sdCap(q,SHO+vec3(0.0,0.1,-0.4),ELB,1.85,1.45); u=smin(u,sdEll(q,mix(SHO,ELB,0.35)+vec3(0.3,0.0,0.0),vec3(1.45,1.5,2.5)),0.8); // the biceps, wasted
  float f=sdCap(q,ELB,WRI,1.45,1.0); f=smin(f,sdSph(q,ELB,1.5),0.5); // the elbow's knob
  float h=sdEll(q,WRI+dir*1.9,vec3(0.85,1.35,1.85)); h=smin(h,sdCap(q,WRI+dir*1.4,WRI+dir*4.6+vec3(0.5,0.0,0.0),0.62,0.42),0.5); h=smin(h,sdCap(q,WRI+dir*1.0+vec3(0.4,-0.9,0.0),WRI+dir*2.5+vec3(1.1,-1.2,0.0),0.42,0.33),0.4); // the hand, fingers curled; the thumb
  float sl=folds(p,1.0)*0.7; u+=sl; f+=sl*0.6;
  dU=u; dF=f; dH=h;
  return smin(smin(u,f,0.8),h,0.6);
}
float leg(vec3 p, float s, out float dT, out float dS, out float dFt){
  vec3 q=vec3(p.x,p.y*s,p.z);
  float t=sdCap(q,HIP,KNEE,2.75,1.95); t=smin(t,sdSph(q,KNEE+vec3(0.5,0.0,0.0),1.85),0.7);
  float sh=sdCap(q,KNEE,ANK+vec3(0.0,0.0,0.5),1.85,1.2); sh=smin(sh,sdEll(q,mix(KNEE,ANK,0.28)+vec3(-0.8,0.0,0.0),vec3(1.2,1.3,2.9)),0.7); // the calf
  float tr=folds(p,1.0)*0.9; t+=tr; sh+=tr*0.8;
  float ft=sdCap(q,ANK+vec3(-1.2,0.0,-1.2),TOE+vec3(0.0,0.0,0.35),1.5,1.25); ft=smax(ft,-q.z,0.4); // the shoe, flat underneath
  ft=smin(ft,sdSph(q,ANK+vec3(-0.5,0.0,-0.2),1.55),0.7);
  dT=t; dS=sh; dFt=ft;
  return smin(smin(t,sh,0.8),ft,0.6);
}
float model(vec3 p){
  float c,b,h,n,u,f,hd,t,s,ft;
  float d=trunk(p,c,b,h);
  float sk; d=smin(d,head(p,n,sk),0.8);
  d=smin(d,arm(p,1.0,u,f,hd),1.3); d=smin(d,arm(p,-1.0,u,f,hd),1.3);
  d=smin(d,leg(p,1.0,t,s,ft),1.6); d=smin(d,leg(p,-1.0,t,s,ft),1.6);
  return d;
}
// what the point p on the body is (sets gPart, gReg, gU)
void attrs(vec3 p){
  best=1e9; gPart=0; gReg=0; gU=0.0;
  float c,b,h; trunk(p,c,b,h);
  near(c,2,3,(p.z-37.0)/9.0); near(b,1,4,(p.z-31.0)/6.0); near(h,0,5,(p.z-25.0)/7.0);
  float n, sk; head(p,n,sk);
  { vec3 q=vec3(p.x,abs(p.y),p.z)-HC;
    float face=q.x-1.0-q.z*0.35;
    int reg=(face<0.0&&q.z>-0.8)||q.z>2.2?1:0; // the scalp: hair where it grows, if it has any
    if(sdSph(q,vec3(2.65,1.05,0.6),0.95)<0.0) reg=12; if(sdEll(q,vec3(2.9,0.0,-1.9),vec3(1.15,1.5,0.7))<0.0) reg=13;
    near(sk,3,reg,(q.z+4.5)/9.0); }
  near(n,3,2,(p.z-43.5)/4.0);
  for(int k=0;k<2;k++){ float s=k==0?1.0:-1.0; float u,f,hh; arm(p,s,u,f,hh); vec3 q=vec3(p.x,p.y*s,p.z);
    vec3 WRI=ELB+normalize(FIN-ELB)*8.0;
    near(u,k==0?4:6,6,along(q,SHO,ELB)); near(f,k==0?5:7,7,along(q,ELB,WRI)); near(hh,k==0?5:7,8,1.0);
    float t,sh,ft; leg(p,s,t,sh,ft);
    near(t,k==0?8:11,9,along(q,HIP,KNEE)); near(sh,k==0?9:12,10,along(q,KNEE,ANK)); near(ft,k==0?10:13,11,along(q,ANK,TOE)); }
}
`;
