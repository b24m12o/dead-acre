/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The people-shaped dead as 3D shapes in their rest pose, for tools/mesh/build.mjs to turn into the meshes the game
// draws. One body, made to each one's build by a handful of knobs (humanoid(P), below): the ordinary zombie is a grown
// man in true proportions, about 55 of the game's units tall (7½ heads; arms to mid-thigh; legs half the height),
// gaunt; the others are him thinned, swollen, hulked out, stretched, given a big skull and a hanging jaw, a throat sac,
// a plate carrier and helmet, a riot shield. All share one skeleton (14 bones, in the same order, so the game poses
// them all with one piece of code); its joints move with the build. The game scales the big ones up (SCALE).
// x forward, y to its right, z up, feet on z = 0. The arms hang out a little from the body (an A pose), so skinning
// can swing them anywhere from there.
//
// The GLSL gives two things: model(p), the distance to the body; and attrs(p), what a point on the body is: which
// bone carries it (part), what it is (region) and how far along its limb it sits (u: 0 at the joint it hangs from, 1
// at its far end), which the game uses to cut sleeves and trouser legs to each zombie's own length.

// what a point is (attrs' region): the game colours each from the zombie's own skin, shirt, trousers and shoes, and
// its gear's own colours
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
  vest: 14,
  helmet: 15,
  shield: 16,
  flesh: 17,
  hat: 18, // a hat's own colour
  hat2: 19, // and its second: a cap's mesh back, a police cap's band and peak
  metal: 20, // a badge
  band: 21, // the white band across a riot shield
  glass: 22, // a riot shield's window
  rim: 23, // the edge of a hood, round the face
};
// the ordinary zombie's skeleton: each bone from its joint (where it turns) to its end; parent first
const BASE = [
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
const f = x => (Number.isInteger(x) ? x + '.0' : String(+x.toFixed(4)));

// what the dead may wear over the body, each a small mesh of its own that rides one bone (3 the head, 2 the chest, 7
// the left forearm), drawn with the figure it belongs to; the game picks them by who it was (a cop's cap, a road
// crew's hard hat, a hoodie's hood). Head-borne ones are made about the head (q: the head's own space, in head sizes)
const KIT_LIB = `
vec3 hq(vec3 p){ return (p-HC)/HS; }
// hair grown out over the scalp: down to the nape behind, the ears at the sides, the hairline in front
float hcap(vec3 q){ float h=sdEll(q,vec3(-0.55,0.0,1.0),vec3(3.34,2.78,3.3)); h=smax(h,q.x-1.3-q.z*0.35,0.4); return smax(h,-(q.z+0.9+max(0.0,-q.x-1.0)*0.5),0.4); }
float crownC(vec3 q){ float c=sdEll(q,vec3(-0.45,0.0,1.25),vec3(3.4,2.84,3.04)); return smax(c,-(q.z-1.0-0.15*q.x),0.25); }
float brimC(vec3 q){ q.z+=(q.x-2.0)*0.12; float b=sdEll(q,vec3(3.4,0.0,1.55),vec3(2.45,2.6,0.38)); return smax(b,-(q.x-1.4),0.2); }
float capQ(vec3 q){ return min(min(crownC(q),brimC(q)),sdSph(q,vec3(-0.35,0.0,4.28),0.38)); }
`;
const KIT = {
  // a baseball cap (a trucker's: a red front, the white mesh back)
  cap: {
    bone: 3,
    glsl: `
float model(vec3 p){ return capQ(hq(p))*HS; }
void attrs(vec3 p){ vec3 q=hq(p); gPart=3; gU=0.5; gReg=brimC(q)<crownC(q)||q.x>0.4?18:19; }`,
  },
  // the same, worn backwards
  capb: {
    bone: 3,
    glsl: `
vec3 bq(vec3 p){ vec3 q=hq(p); return vec3(-q.x,q.y,q.z+0.15); }
float model(vec3 p){ return capQ(bq(p))*HS; }
void attrs(vec3 p){ vec3 q=bq(p); gPart=3; gU=0.5; gReg=brimC(q)<crownC(q)||q.x>0.4?18:19; }`,
  },
  // a knit beanie, its cuff turned up
  beanie: {
    bone: 3,
    glsl: `
float bn(vec3 q){ float b=sdEll(q,vec3(-0.5,0.0,1.4),vec3(3.38,2.88,3.22)); float base=q.z-0.55-0.12*q.x; b-=0.24*(1.0-smoothstep(0.0,1.3,base)); return smax(b,-base,0.25); }
float model(vec3 p){ return bn(hq(p))*HS; }
void attrs(vec3 p){ gPart=3; gU=0.5; gReg=18; }`,
  },
  // a police officer's peaked cap: navy crown, black band and peak, a badge
  police: {
    bone: 3,
    glsl: `
float crownP(vec3 q){ float band=sdEll(q,vec3(-0.35,0.0,2.2),vec3(3.44,2.92,1.3)); band=smax(band,-(q.z-1.25-0.06*q.x),0.2);
  float top=sdEll(q,vec3(0.0,0.0,3.35),vec3(4.0,3.4,0.72)); return smin(band,top,0.7); }
float visor(vec3 q){ q.z+=(q.x-2.4)*0.2; return sdEll(q,vec3(2.7,0.0,1.4),vec3(2.0,2.6,0.4)); }
float badge(vec3 q){ return sdEll(q,vec3(3.3,0.0,2.5),vec3(0.4,0.6,0.62)); }
float model(vec3 p){ vec3 q=hq(p); return min(min(crownP(q),visor(q)),badge(q))*HS; }
void attrs(vec3 p){ vec3 q=hq(p); gPart=3; gU=0.5; float c=crownP(q), v=visor(q), b=badge(q);
  gReg=b<min(c,v)+0.05?20:v<c?19:(q.z<2.25-0.06*q.x?19:18); }`,
  },
  // a hard hat: a dome with a ridge along the top and a brim all round
  hard: {
    bone: 3,
    glsl: `
float hh(vec3 q){ float d=sdEll(q,vec3(-0.35,0.0,1.85),vec3(3.62,3.08,3.0)); d=smax(d,-(q.z-0.9-0.08*q.x),0.2);
  float b=min(sdEll(q,vec3(0.1,0.0,0.98),vec3(4.4,3.68,0.38)),sdEll(q,vec3(3.0,0.0,1.05),vec3(2.0,2.4,0.38)));
  d=min(d,b); return smin(d,sdCap(q,vec3(-3.0,0.0,4.35),vec3(1.0,0.0,4.65),0.5,0.42),0.4); }
float model(vec3 p){ return hh(hq(p))*HS; }
void attrs(vec3 p){ gPart=3; gU=0.5; gReg=18; }`,
  },
  // a firefighter's helmet: the long brim behind, a comb on top, the badge on the front
  fire: {
    bone: 3,
    glsl: `
float fbadge(vec3 q){ return sdBox(q,vec3(3.15,0.0,2.5),vec3(0.2,1.0,1.05),0.25); }
float fh(vec3 q){ float d=sdEll(q,vec3(-0.4,0.0,1.9),vec3(3.66,3.12,3.02)); d=smax(d,-(q.z-0.9-0.06*q.x),0.2);
  float bz=0.95+min(q.x,0.0)*0.24; d=min(d,sdEll(vec3(q.x,q.y,q.z-bz),vec3(-1.1,0.0,0.0),vec3(5.4,3.95,0.42)));
  d=smin(d,sdCap(q,vec3(-3.3,0.0,4.2),vec3(0.8,0.0,4.75),0.55,0.45),0.4); return smin(d,fbadge(q),0.3); }
float model(vec3 p){ return fh(hq(p))*HS; }
void attrs(vec3 p){ vec3 q=hq(p); gPart=3; gU=0.5; gReg=fbadge(q)<0.1?20:18; }`,
  },
  // hair up in a bun
  bun: {
    bone: 3,
    glsl: `
float model(vec3 p){ vec3 q=hq(p); return smin(hcap(q),sdSph(q,vec3(-3.15,0.0,2.3),1.45),0.5)*HS; }
void attrs(vec3 p){ gPart=3; gU=0.5; gReg=1; }`,
  },
  // long hair, down the back and past the ears, lank
  long: {
    bone: 3,
    glsl: `
float model(vec3 p){ vec3 q=hq(p);
  float d=smin(hcap(q),sdEll(q,vec3(-2.45,0.0,-2.3),vec3(1.45,2.9,3.8)),0.9);
  d=smin(d,sdEll(vec3(q.x,abs(q.y),q.z),vec3(-0.7,2.3,-1.3),vec3(1.5,0.75,2.9)),0.7);
  d=smax(d,-(q.z+6.2),0.5);
  return (d+(vn(q.yz*vec2(3.0,0.8)+q.x)-0.5)*0.16)*HS; }
void attrs(vec3 p){ gPart=3; gU=0.5; gReg=1; }`,
  },
  // a hood pulled up, the face in the dark of it
  hood: {
    bone: 3,
    glsl: `
float hd(vec3 q){ float o=sdEll(q,vec3(-0.75,0.0,0.55),vec3(4.15,3.52,4.25));
  o=smin(o,sdCap(q,vec3(-1.4,0.0,-2.6),vec3(-1.0,0.0,-5.6),3.05,3.5),1.2); // down over the neck to the shoulders
  o=smax(o,-sdEll(q,vec3(3.0,0.0,0.1),vec3(2.45,2.35,3.1)),0.5); // the opening round the face
  o=smax(o,-sdCap(q,vec3(3.1,0.0,-1.2),vec3(3.4,0.0,-7.0),2.3,2.3),0.5); // and under the chin
  return o+(sin(q.z*1.6+q.y*0.7)*0.06); }
float model(vec3 p){ return hd(hq(p))*HS; }
void attrs(vec3 p){ vec3 q=hq(p); gPart=3; gU=0.5; gReg=q.x>1.9?23:3; }`,
  },
  // a hoodie's hood, down: bunched on the upper back
  hoodd: {
    bone: 2,
    glsl: `
float model(vec3 p0){ vec3 p=vec3(p0.x/TD,abs(p0.y)/TW,p0.z-ZU); float k=min(TD,TW);
  float d=smin(sdEll(p,vec3(-3.55,0.0,44.6),vec3(1.7,3.3,1.9)),sdEll(p,vec3(-3.0,1.9,45.5),vec3(1.8,2.3,1.5)),1.0);
  d=smax(d,-sdCap(p,vec3(-0.4,0.0,44.0),vec3(-0.6,0.0,49.0),2.0,2.0),0.6); // round the neck
  return (d+sin(p.y*2.2+p.z)*0.08)*k; }
void attrs(vec3 p){ gPart=2; gU=0.5; gReg=3; }`,
  },
  // the riot shield: a tall, curved, black slab strapped along the left forearm, before the middle of its body; a white
  // band across it, a window above
  shield: {
    bone: 7,
    gear: 'riot',
    mres: 1.05,
    glsl: `
vec3 sh(vec3 p){ vec3 q=vec3(p.x,-p.y,p.z); vec3 d=normalize(FIN-ELB), w=normalize(cross(d,vec3(1.0,0.0,0.0)));
  vec3 l=q-(ELB-d*1.0+w*4.5+vec3(4.0,0.0,0.0)); float a=dot(l,d), b=dot(l,w); return vec3(l.x+b*b*0.014,b,a); }
float model(vec3 p){ return sdBox(sh(p),vec3(0.0),vec3(0.3,9.6,16.0),0.6); }
void attrs(vec3 p){ vec3 s=sh(p); gPart=7; gU=0.5; gReg=16;
  if(abs(s.y)<8.6&&s.z>2.0&&s.z<5.2) gReg=21; else if(abs(s.y)<5.6&&s.z>8.0&&s.z<13.5) gReg=22; }`,
  },
};
const v = a => `vec3(${a.map(f).join(',')})`;
// the knobs, all 1 (or 0) for the ordinary zombie:
//   tw, td: the trunk's width and depth; sw: the shoulders' width; lt: how thick the limbs are; al, ll: arm and leg
//   length; hs: the head's size; jaw: how far the jaw hangs open; belly: a swollen gut; throat: a swollen throat sac;
//   bumps: boils and swellings all over; hulk: a hulk's muscle (a hump over the shoulders, a slab of chest, forearms
//   bigger than the upper arms); neck: the neck's length; gear: 'armor' (plate carrier, helmet) or 'riot'
//   (and a shield); dress: has its own hats, hoods and hair to wear (see KIT; the game fits the ordinary zombie's to
//   the others); scale: what the game scales it by
export function humanoid(P0 = {}) {
  const P = {
    tw: 1,
    td: 1,
    sw: 1,
    lt: 1,
    al: 1,
    ll: 0.95, // a touch shorter in the leg than the first cut: lying in the street they read too long
    hs: 1,
    jaw: 0,
    belly: 0,
    throat: 0,
    bumps: 0,
    hulk: 0,
    neck: 1,
    gear: null,
    dress: 0,
    scale: 1,
    mres: 1,
    ...P0,
  };
  // the skeleton, moved with the build: the legs lengthen from the ground up (the hips ride on them), the arms from the
  // shoulders (which sit wider or narrower), the head on its neck
  const dz = (P.ll - 1) * 28.4; // the legs' extra length raises everything above them
  const up = p => [p[0], p[1], p[2] + dz];
  const B = BASE.map(b => [b[0], b[1], [...b[2]], [...b[3]]]);
  for (const b of B) {
    if (/^(thigh|shin|foot)/.test(b[0])) {
      const s = p => [p[0], p[1] * Math.min(P.tw, 1.25), p[2] * P.ll];
      b[2] = s(b[2]);
      b[3] = s(b[3]);
    } else {
      b[2] = up(b[2]);
      b[3] = up(b[3]);
    }
  }
  B[3][3][2] = B[3][2][2] + (55.2 - 46.4) * P.hs * P.neck;
  for (const [u, fa] of [
    [4, 5],
    [6, 7],
  ]) {
    const sho = B[u][2],
      s = [sho[0], sho[1] * P.sw, sho[2]],
      e0 = B[u][3],
      fin = B[fa][3],
      e = [s[0] + (e0[0] - sho[0]) * P.al, s[1] + (e0[1] - sho[1]) * P.al, s[2] + (e0[2] - sho[2]) * P.al],
      fi = [e[0] + (fin[0] - e0[0]) * P.al, e[1] + (fin[1] - e0[1]) * P.al, e[2] + (fin[2] - e0[2]) * P.al];
    B[u][2] = s;
    B[u][3] = e;
    B[fa][2] = e;
    B[fa][3] = fi;
  }
  const J = {};
  for (const [n, , a, b] of B) {
    J[n] = a;
    J[n + 'E'] = b;
  }
  const xs = B.flatMap(b => [b[2], b[3]]),
    m = 6 * Math.max(P.tw, P.td, P.lt, P.hs, 1 + P.belly) + 4,
    lo = [0, 1, 2].map(i => Math.min(...xs.map(p => p[i])) - m),
    hi = [0, 1, 2].map(i => Math.max(...xs.map(p => p[i])) + m);
  lo[2] = -1;
  hi[2] += 4 * P.hs;
  const Z = dz; // everything on the trunk and head, up by the legs' extra length
  const BODY = `
const float HULK=${f(P.hulk)}, TW=${f(P.tw)}, TD=${f(P.td)}, LT=${f(P.lt)}, HS=${f(P.hs)}, JAW=${f(P.jaw)}, BELLY=${f(P.belly)}, THROAT=${f(P.throat)}, BUMPS=${f(P.bumps)}, ZU=${f(Z)};
// bones' joints (see the skeleton); the wrist sits 8 along the forearm bone (as long as its arm), which runs on to the
// fingertips
const vec3 SHO=${v(J.uarmR)}, ELB=${v(J.farmR)}, FIN=${v(J.farmRE)};
const vec3 HIP=${v(J.thighR)}, KNEE=${v(J.shinR)}, ANK=${v(J.footR)}, TOE=${v(J.footRE)};
const vec3 NB=${v(J.head)}; // the base of the neck
const vec3 HC=NB+vec3(0.3,0.0,4.8*HS*${f(P.neck)}); // the middle of the head
int gPart; int gReg; float gU;
float best; // the nearest part so far, for attrs
void near(float d, int part, int reg, float u){ if(d<best){ best=d; gPart=part; gReg=reg; gU=clamp(u,0.0,1.0); } }
float along(vec3 p, vec3 a, vec3 b){ vec3 ba=b-a; return dot(p-a,ba)/dot(ba,ba); }
// cloth: soft folds and a little sag
float folds(vec3 p, float k){ return (sin(p.z*1.9+sin(p.y*0.9)*1.8)*0.5+sin(p.y*1.3-p.z*1.0)*0.35)*0.14*k+(fbm(p.yz*0.65+p.x*0.3)-0.5)*0.22*k; }
// boils and swellings, where the build has them
float boils(vec3 p){ return BUMPS>0.0?-smoothstep(0.55,0.85,vn(p.xy*0.42+p.z*0.31+vec2(3.1,1.7)))*BUMPS*1.6-smoothstep(0.6,0.9,vn(p.yz*0.7+p.x*0.2))*BUMPS*0.6:0.0; }
// the trunk: chest, belly, hips (made at the ordinary build, then widened and deepened to this one's)
float trunk(vec3 p0, out float dChest, out float dBelly, out float dHips){
  vec3 p=vec3(p0.x/TD,p0.y/TW,p0.z-ZU); float k=min(TD,TW);
  vec3 q=vec3(p.x,abs(p.y),p.z);
  float ch=sdEll(q,vec3(-0.4,0.0,40.2),vec3(3.5,5.5,5.2));
  ch=smin(ch,sdCap(q,vec3(-0.6,0.0,44.2),vec3(-0.6,6.4,44.3),1.9,1.7),1.8); // the yoke of the shoulders
  ch=smin(ch,sdSph(q,vec3(-0.4,7.2,43.9),2.2),1.2); // the shoulder, bony
  ch=smin(ch,sdEll(q,vec3(-2.5,3.0,41.6),vec3(1.5,2.6,2.8)),1.1); // the shoulder blades, sharp
  ch=smax(ch,-sdCap(q,vec3(3.0,0.0,44.0),vec3(3.6,0.0,39.5),0.7,0.45),1.0); // the breastbone hollow
  ch+=folds(p,1.0)*0.8-sin(q.z*3.0)*0.08*smoothstep(2.6,3.8,q.x)*step(35.5,q.z); // ribs through the cloth
  float be=sdEll(q,vec3(-0.3,0.0,34.2),vec3(2.8,4.5,3.8)); be=smax(be,-(2.8-q.x+(q.z-34.2)*(q.z-34.2)*0.07),1.4*(1.0-min(1.0,BELLY))); // the belly, sunken
  if(BELLY>0.0) be=smin(be,sdEll(q,vec3(0.8+BELLY*1.3,0.0,33.6-BELLY*1.5),vec3(2.8+BELLY*2.8,4.2+BELLY*2.0,3.8+BELLY*2.7)),2.6); // swollen, sagging
  be+=folds(p,1.0);
  float hp=sdEll(q,vec3(-0.3,0.0,29.6),vec3(3.3,5.4,3.3));
  hp=smin(hp,sdEll(q,vec3(-1.5,2.6,28.1),vec3(2.3,2.5,2.8)),1.1); // the seat
  hp=smin(hp,sdCap(q,vec3(0.2,0.0,31.9),vec3(0.1,5.0,31.7),0.6,0.6),0.6); // the belt
  if(HULK>0.0){ ch=smin(ch,sdEll(q,vec3(-2.2,0.0,44.6),vec3(3.0,5.6,2.6)*(1.0+HULK*0.25)),2.4); // the hump of muscle over its shoulders, burying its neck
    ch=smin(ch,sdEll(q,vec3(1.6,2.6,41.2),vec3(2.4,3.0,2.6)),1.6); } // a slab of chest
  dChest=ch*k+boils(p0); dBelly=be*k+boils(p0); dHips=hp*k;
  return smin(smin(dChest,dBelly,1.9*k),dHips,1.6*k);
}
float head(vec3 p, out float dNeck, out float dSkull){
  vec3 q=(vec3(p.x,abs(p.y),p.z)-HC)/HS;
  float sk=sdEll(q,vec3(-0.4,0.0,0.9),vec3(3.1,2.5,3.1)); // the skull
  sk=smin(sk,sdEll(q,vec3(1.3,0.0,-1.6-JAW*1.3),vec3(1.9,1.9,1.7+JAW*0.3)),1.0); // the jaw, hanging (open, on some)
  sk=smin(sk,sdEll(q,vec3(2.1,1.1,0.0),vec3(1.0,0.9,1.0)),0.6); // cheekbones
  sk=smin(sk,sdCap(q,vec3(2.5,0.0,0.9),vec3(3.2,0.0,-0.3),0.42,0.55),0.5); // the nose
  sk=smin(sk,sdEll(q,vec3(-0.4,2.5,0.2),vec3(0.75,0.35,1.05)),0.35); // the ears
  sk=smin(sk,sdCap(q,vec3(2.3,-1.6,1.4),vec3(2.3,1.6,1.4),0.55,0.55),0.6); // the brow
  sk=smax(sk,-sdSph(q,vec3(2.65,1.05,0.6),0.68),0.3); // the eye sockets
  sk=smax(sk,-sdEll(q,vec3(2.9,0.0,-1.9-JAW*0.9),vec3(0.85+JAW*0.5,1.2+JAW*0.35,0.42+JAW*1.15)),0.35); // the mouth: slack, or gaping
  sk+=(fbm(q.xy*1.3+q.z*0.6)-0.5)*0.15;
  sk*=HS;
  float nk=sdCap(p,NB+vec3(-0.4,0.0,-2.8),HC+vec3(-0.8,0.0,-2.4*HS),1.7*min(TW,1.6),1.45*HS);
  nk=smin(nk,sdCap(vec3(p.x,abs(p.y),p.z),NB+vec3(-0.5,0.4,-2.0),HC+vec3(-0.2,1.5*HS,-2.6*HS),0.55,0.45),0.8); // the cords of the neck
  if(THROAT>0.0) nk=smin(nk,sdEll(p,HC+vec3(1.0,0.0,-4.2*HS),vec3(2.2,2.5,2.0)*THROAT),1.2); // the throat sac, swollen with what it spits
  dNeck=nk+boils(p); dSkull=sk;
  return smin(sk,dNeck,1.0);
}
// one arm (s = 1 its right, -1 its left): upper arm, forearm, hand
float arm(vec3 p, float s, out float dU, out float dF, out float dH){
  vec3 q=vec3(p.x,p.y*s,p.z);
  vec3 dir=normalize(FIN-ELB); float fl=length(FIN-ELB); vec3 WRI=ELB+dir*fl*0.57;
  float u=sdCap(q,SHO+vec3(0.0,0.1,-0.4),ELB,1.85*LT,1.45*LT); u=smin(u,sdEll(q,mix(SHO,ELB,0.35)+vec3(0.3,0.0,0.0)*LT,vec3(1.45,1.5,2.5)*LT),0.8*LT); // the biceps
  float f=sdCap(q,ELB,WRI,1.45*LT*(1.0+HULK*0.35),1.0*LT*(1.0+HULK*0.45)); f=smin(f,sdSph(q,ELB,1.5*LT),0.5*LT); // the elbow's knob (a hulk's forearms outgrow its upper arms)
  float hk=mix(1.0,LT,0.6); // the hands grow less than the arms
  float h=sdEll(q,WRI+dir*1.9*hk,vec3(0.85,1.35,1.85)*hk); h=smin(h,sdCap(q,WRI+dir*1.4*hk,WRI+dir*4.6*hk+vec3(0.5,0.0,0.0)*hk,0.62*hk,0.42*hk),0.5*hk); h=smin(h,sdCap(q,WRI+(dir*1.0+vec3(0.4,-0.9,0.0))*hk,WRI+(dir*2.5+vec3(1.1,-1.2,0.0))*hk,0.42*hk,0.33*hk),0.4*hk); // the hand, fingers curled; the thumb
  float sl=folds(p,1.0)*0.7; u+=sl+boils(p); f+=sl*0.6+boils(p)*0.7;
  dU=u; dF=f; dH=h;
  return smin(smin(u,f,0.8*LT),h,0.6*hk);
}
float leg(vec3 p, float s, out float dT, out float dS, out float dFt){
  vec3 q=vec3(p.x,p.y*s,p.z);
  float lk=mix(1.0,LT,0.8);
  float t=sdCap(q,HIP,KNEE,2.75*lk,1.95*lk); t=smin(t,sdSph(q,KNEE+vec3(0.5,0.0,0.0)*lk,1.85*lk),0.7*lk);
  float sh=sdCap(q,KNEE,ANK+vec3(0.0,0.0,0.5),1.85*lk,1.2*lk); sh=smin(sh,sdEll(q,mix(KNEE,ANK,0.28)+vec3(-0.8,0.0,0.0)*lk,vec3(1.2,1.3,2.9)*lk),0.7*lk); // the calf
  float tr=folds(p,1.0)*0.9; t+=tr+boils(p)*0.6; sh+=tr*0.8;
  float fk=mix(1.0,LT,0.5);
  float ft=sdCap(q,ANK+vec3(-1.2,0.0,-1.2)*fk,TOE+vec3(0.0,0.0,0.35),1.5*fk,1.25*fk); ft=smax(ft,-q.z,0.4); // the shoe, flat underneath
  ft=smin(ft,sdSph(q,ANK+vec3(-0.5,0.0,-0.2)*fk,1.55*fk),0.7);
  dT=t; dS=sh; dFt=ft;
  return smin(smin(t,sh,0.8*lk),ft,0.6);
}
${
  P.gear
    ? `// its gear: a plate carrier over the chest and back, a helmet (a riot shield is its own mesh: see KIT)
float vest(vec3 p){ vec3 q=vec3(p.x/TD,abs(p.y)/TW,p.z-ZU); float k=min(TD,TW);
  float c,be,h; trunk(p,c,be,h); float b=smin(c,be,1.5)/k-0.95; // a shell over the chest and back, standing off it
  b=smax(b,max(34.6-q.z,q.z-45.0),0.5); b=smax(b,q.y-5.7,0.6); b=smax(b,-sdCap(q,vec3(0.0,0.0,46.0),vec3(0.0,0.0,42.6),2.4,2.4),0.8); // from the waist to the collar, inside the arms, round the neck
  b=smin(b,sdBox(q,vec3(3.9,0.0,36.4),vec3(0.9,4.0,1.4),0.4),0.5); // pouches across the front
  return b*k; }
float helmet(vec3 p){ vec3 q=(vec3(p.x,abs(p.y),p.z)-HC)/HS; float h=sdEll(q,vec3(-0.5,0.0,1.4),vec3(3.6,3.0,3.4)); h=smax(h,-(q.z+0.2-max(0.0,-q.x)*0.15),0.4); h=smax(h,-(q.x-2.4),0.3); return h*HS; }
`
    : ''
}
`;
  const GLSL =
    BODY +
    `
float model(vec3 p){
  float c,b,h,n,u,f,hd,t,s,ft;
  float d=trunk(p,c,b,h);
  float sk; d=smin(d,head(p,n,sk),0.8);
  d=smin(d,arm(p,1.0,u,f,hd),1.3*LT); d=smin(d,arm(p,-1.0,u,f,hd),1.3*LT);
  d=smin(d,leg(p,1.0,t,s,ft),1.6); d=smin(d,leg(p,-1.0,t,s,ft),1.6);
  ${P.gear ? 'd=min(d,vest(p)); d=min(d,helmet(p));' : ''}
  return d;
}
// what the point p on the body is (sets gPart, gReg, gU)
void attrs(vec3 p){
  best=1e9; gPart=0; gReg=0; gU=0.0;
  float c,b,h; trunk(p,c,b,h);
  near(c,2,3,(p.z-ZU-37.0)/9.0); near(b,1,BUMPS>0.6?17:4,(p.z-ZU-31.0)/6.0); near(h,0,5,(p.z-ZU-25.0)/7.0);
  float n, sk; head(p,n,sk);
  { vec3 q=(vec3(p.x,abs(p.y),p.z)-HC)/HS;
    float face=q.x-1.0-q.z*0.35;
    int reg=(face<0.0&&q.z>-0.8)||q.z>2.2?1:0; // the scalp: hair where it grows, if it has any
    if(sdSph(q,vec3(2.65,1.05,0.6),0.95)<0.0) reg=12; if(sdEll(q,vec3(2.9,0.0,-1.9-JAW*0.9),vec3(1.15+JAW*0.5,1.5+JAW*0.35,0.7+JAW*1.15))<0.0) reg=13;
    near(sk,3,reg,(q.z+4.5)/9.0); }
  near(n,3,THROAT>0.0?17:2,0.5);
  for(int k=0;k<2;k++){ float s=k==0?1.0:-1.0; float u,f,hh; arm(p,s,u,f,hh); vec3 q=vec3(p.x,p.y*s,p.z);
    vec3 WRI=ELB+normalize(FIN-ELB)*length(FIN-ELB)*0.57;
    near(u,k==0?4:6,6,along(q,SHO,ELB)); near(f,k==0?5:7,7,along(q,ELB,WRI)); near(hh,k==0?5:7,8,1.0);
    float t,sh,ft; leg(p,s,t,sh,ft);
    near(t,k==0?8:11,9,along(q,HIP,KNEE)); near(sh,k==0?9:12,10,along(q,KNEE,ANK)); near(ft,k==0?10:13,11,along(q,ANK,TOE)); }
  ${P.gear ? 'if(vest(p)<best+0.05){ best=vest(p); gPart=2; gReg=14; gU=0.5; } if(helmet(p)<best+0.05){ best=helmet(p); gPart=3; gReg=15; gU=0.5; }' : ''}
}
`;
  // what the game needs to paint clothes onto it: the trunk's depth and width, how far its trunk is raised, its head's
  // size and middle
  const HCv = [J.head[0] + 0.3, J.head[1], J.head[2] + 4.8 * P.hs * P.neck];
  const KN = [P.td, P.tw, Z, P.hs, ...HCv];
  // and what it may wear over it, each its own small mesh riding one bone (see KIT)
  const kits = {};
  for (const [k, K] of Object.entries(KIT)) {
    if (K.gear ? P.gear !== K.gear : !P.dress) continue; // clothes for the ordinary dead; gear for the gear's wearers
    const head = K.bone === 3,
      arm = K.bone === 7,
      c = head ? HCv : arm ? [J.farmL[0] + 6, J.farmL[1] - 8, J.farmL[2] - 4] : J.head,
      r = head ? 7.5 * P.hs : arm ? 20 : 9 * Math.max(P.tw, P.td);
    kits[k] = {
      BONES: B,
      BOUNDS: [
        [c[0] - r, c[1] - r, c[2] - (head ? 10 * P.hs : arm ? r : 6)],
        [c[0] + r, c[1] + r, c[2] + (head ? 6 * P.hs : arm ? r : 4)],
      ],
      GLSL: BODY + KIT_LIB + K.glsl,
      REGION,
      SCALE: P.scale,
      MRES: K.mres || 0.6,
      ONE: true,
      RIGID: K.bone === 7,
    };
  }
  return { BONES: B, BOUNDS: [lo, hi], GLSL, REGION, SCALE: P.scale, MRES: P.mres, KN, kits };
}

// the people-shaped dead, each by its knobs (see humanoid)
export const MODELS = {
  zombie: humanoid({ dress: 1 }), // the ordinary dead; and the listener, ashen and blind, which is only coloured differently
  lean: humanoid({ tw: 0.86, td: 0.9, lt: 0.82, al: 1.06, ll: 0.98 }), // the runner and the climber: stripped, lean, long in the arm
  gaunt: humanoid({ tw: 0.88, td: 0.88, lt: 0.8, hs: 1.14, jaw: 1, neck: 1.1 }), // the screamer among them: a big skull on a thin neck, the jaw hanging open
  screamer: humanoid({ tw: 1.22, td: 1.25, sw: 1.1, lt: 0.95, hs: 1.1, jaw: 1.35, neck: 1.1, scale: 1.12, mres: 1.1 }), // the screamer: a barrel chest of lungs, the jaw unhinged
  spitter: humanoid({ tw: 0.95, lt: 0.92, throat: 1, jaw: 0.35 }), // the spitter: its throat a sac of what it spits
  armored: humanoid({ tw: 1.06, sw: 1.04, lt: 1.05, gear: 'armor' }), // in a plate carrier and helmet
  riot: humanoid({ tw: 1.06, sw: 1.04, lt: 1.05, gear: 'riot' }), // and a riot shield
  bloat: humanoid({ tw: 1.3, td: 1.25, lt: 1.3, belly: 1, bumps: 0.5, scale: 1.08, mres: 1.25 }), // swollen: the bloater among them, and the spore
  drag: humanoid({
    tw: 1.35,
    td: 1.25,
    sw: 1.25,
    lt: 1.4,
    al: 1.38,
    ll: 0.95,
    hs: 0.92,
    hulk: 0.35,
    neck: 0.8,
    scale: 1.0,
    mres: 1.2,
  }), // the dragger: big, long in the arm, made to haul
  brute: humanoid({
    tw: 1.8,
    td: 1.65,
    sw: 1.8,
    lt: 2.1,
    al: 1.14,
    ll: 0.84,
    hs: 0.76,
    neck: 0.4,
    bumps: 0.35,
    hulk: 1,
    scale: 1.0,
    mres: 1.55,
  }), // the brute: a hulk, its small head sunk between its shoulders
  hopper: humanoid({
    tw: 1.5,
    td: 1.45,
    sw: 1.25,
    lt: 1.65,
    ll: 0.9,
    hs: 0.86,
    neck: 0.6,
    belly: 2.3,
    bumps: 1,
    scale: 1.25,
    mres: 1.6,
  }), // the bloater: a sack of rot on legs
};
