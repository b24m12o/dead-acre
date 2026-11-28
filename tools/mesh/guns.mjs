/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The guns the living carry, as 3D shapes for tools/mesh/build.mjs: each its own small mesh on one bone, held at the
// grip (the origin), the muzzle along +x, z up. Sized against the people (55 of these units to a grown man, about
// 1.8 m): a rifle about 90 cm, a shotgun a metre, a submachine gun 60 cm, a pistol 20 cm. Regions as in humanoid.mjs:
// 25 the gun's blued steel, 26 its polymer (stock, grip, magazine), 27 the lens of the light under the barrel.
import { REGION } from './humanoid.mjs';

// one bone, the gun's own (the other thirteen are unused: every model shares the people's fourteen)
const BONES = [
  ['gun', -1, [0, 0, 0], [8, 0, 0]],
  ...[...Array(13).keys()].map(i => ['x' + i, 0, [0, 0, 0], [0, 0, 1]]),
];
const LIB = `
int gPart; int gReg; float gU;
float bx(vec3 p, vec3 c, vec3 b, float r){ return sdBox(p,c,b-r,r); }
float rodX(vec3 p, float x0, float x1, float y, float z, float r){ return sdCap(p,vec3(x0,y,z),vec3(x1,y,z),r,r); }
float bxr(vec3 p, vec3 c, vec3 b, float r, float a){ p-=c; float cs=cos(a), sn=sin(a); p.xz=vec2(cs*p.x-sn*p.z,sn*p.x+cs*p.z); return bx(p,vec3(0.0),b,r); } // a box raked back in the gun's plane (a grip)
`;
// each gun: its steel, its polymer and its light, as distances
const SHAPES = {
  // an AR-pattern carbine: the flat-top upper with its rail and rear sight, the charging handle, the lower and its
  // magazine well and trigger guard, a round handguard, the gas block's front sight, the flash hider, the buffer tube
  // and a collapsing stock, a raked grip, a light under the handguard; the curved magazine apart (magz)
  rifle: `
float steel(vec3 p){ float d=bx(p,vec3(3.4,0.0,2.1),vec3(5.0,0.62,0.72),0.2); d=min(d,bx(p,vec3(3.0,0.0,2.95),vec3(4.4,0.42,0.16),0.05));
  for(int i=0;i<9;i++) d=min(d,bx(p,vec3(-0.6+float(i)*0.95,0.0,3.12),vec3(0.2,0.44,0.1),0.03));
  d=min(d,bx(p,vec3(-1.0,0.0,3.5),vec3(0.45,0.38,0.42),0.1)); d=min(d,bx(p,vec3(2.2,0.0,1.0),vec3(3.4,0.58,0.55),0.2));
  d=min(d,bx(p,vec3(4.5,0.0,0.5),vec3(1.15,0.62,0.8),0.15)); d=min(d,bx(p,vec3(1.5,0.0,0.15),vec3(1.2,0.12,0.06),0.05)); d=min(d,bx(p,vec3(2.6,0.0,0.35),vec3(0.1,0.12,0.25),0.05));
  d=min(d,rodX(p,8.0,21.2,0.0,2.0,0.3)); d=min(d,bx(p,vec3(14.9,0.0,2.45),vec3(0.55,0.36,0.62),0.1)); d=min(d,bx(p,vec3(14.9,0.0,3.45),vec3(0.25,0.14,0.55),0.06));
  d=min(d,rodX(p,20.4,22.4,0.0,2.0,0.48)); d=min(d,rodX(p,-8.0,-1.5,0.0,2.0,0.42)); d=min(d,bx(p,vec3(-1.9,0.0,2.6),vec3(0.5,0.85,0.15),0.08)); return d; }
float poly(vec3 p){ float d=rodX(p,8.0,14.2,0.0,2.05,0.88); d=min(d,bxr(p,vec3(-0.3,0.0,-0.3),vec3(0.55,0.45,1.3),0.3,0.3));
  d=min(d,bx(p,vec3(-6.4,0.0,1.75),vec3(2.4,0.62,1.1),0.35)); d=min(d,bx(p,vec3(-6.6,0.0,0.75),vec3(1.8,0.55,0.45),0.3)); return d; }
float magz(vec3 p){ vec3 q=p-vec3(4.55,0.0,0.3); q.x-=0.06*q.z*q.z; return bx(q,vec3(0.0,0.0,-1.9),vec3(0.95,0.5,2.1),0.2)*0.8; }
float lamp(vec3 p){ return rodX(p,11.5,14.0,0.0,0.8,0.48); }`,
  // a pump shotgun: the receiver, a long barrel with its vent rib and bead, the magazine tube and its cap under it,
  // the ribbed pump, the stock and its grip, a side saddle of four shells on the receiver's left
  shotgun: `
float steel(vec3 p){ float d=bx(p,vec3(2.4,0.0,1.55),vec3(4.2,0.72,1.05),0.25); d=min(d,rodX(p,6.4,25.0,0.0,2.05,0.42)); d=min(d,bx(p,vec3(15.5,0.0,2.52),vec3(9.3,0.12,0.1),0.05));
  d=min(d,sdSph(p,vec3(24.7,0.0,2.68),0.2)); d=min(d,rodX(p,6.4,20.5,0.0,1.05,0.42)); d=min(d,rodX(p,20.2,21.0,0.0,1.05,0.5)); d=min(d,bx(p,vec3(0.6,0.0,0.35),vec3(1.2,0.13,0.08),0.05)); return d; }
float poly(vec3 p){ float d=bx(p,vec3(-6.2,0.0,1.0),vec3(4.4,0.62,1.15),0.45); d=smin(d,bxr(p,vec3(-1.4,0.0,0.2),vec3(0.8,0.5,1.0),0.3,0.4),0.5);
  float pm=rodX(p,11.0,15.4,0.0,1.15,0.78); pm+=0.08*smoothstep(0.6,0.9,abs(fract(p.x*1.1)*2.0-1.0)); return min(d,pm); }
float extra(vec3 p){ float d=1e3; for(int i=0;i<4;i++) d=min(d,sdCap(p,vec3(1.0+float(i)*0.78,0.9,0.75),vec3(1.0+float(i)*0.78,0.9,2.35),0.32,0.32)); return d; }
int extraReg(vec3 p){ return p.z<1.15?20:35; }
float lamp(vec3 p){ return rodX(p,15.0,17.4,0.0,0.15,0.5); }`,
  // a submachine gun: the round receiver and its cocking tube, the drum rear sight and hooded front sight, a short
  // barrel, the folded stock's two struts and its butt plate along the sides, a raked grip, the handguard; the curved
  // magazine apart
  smg: `
float steel(vec3 p){ float d=rodX(p,-1.6,8.6,0.0,1.75,0.72); d=min(d,bx(p,vec3(3.4,0.0,2.5),vec3(4.2,0.3,0.2),0.08)); d=min(d,bx(p,vec3(-0.9,0.0,2.85),vec3(0.4,0.45,0.45),0.15));
  d=min(d,bx(p,vec3(8.4,0.0,2.75),vec3(0.3,0.42,0.5),0.12)); d=min(d,rodX(p,8.6,12.8,0.0,1.75,0.3)); d=min(d,rodX(p,11.8,12.9,0.0,1.75,0.42)); d=min(d,rodX(p,5.0,10.5,0.0,2.55,0.25));
  for(int s=-1;s<=1;s+=2) d=min(d,rodX(p,-6.5,0.5,float(s)*0.85,1.4,0.16)); d=min(d,bx(p,vec3(-6.6,0.0,1.0),vec3(0.3,1.0,0.9),0.15));
  d=min(d,bx(p,vec3(1.0,0.0,0.7),vec3(1.6,0.5,0.5),0.2)); d=min(d,bx(p,vec3(1.0,0.0,-0.1),vec3(1.0,0.12,0.06),0.05)); d=min(d,bx(p,vec3(4.3,0.0,1.0),vec3(0.75,0.55,0.5),0.15)); return d; }
float poly(vec3 p){ float d=bxr(p,vec3(-0.2,0.0,-0.4),vec3(0.55,0.45,1.25),0.3,0.25); d=min(d,bx(p,vec3(7.0,0.0,1.3),vec3(1.6,0.78,0.72),0.35)); return d; }
float magz(vec3 p){ vec3 q=p-vec3(4.3,0.0,0.9); q.x-=0.05*q.z*q.z; return bx(q,vec3(0.0,0.0,-2.2),vec3(0.6,0.42,2.4),0.18)*0.8; }
float lamp(vec3 p){ return rodX(p,9.0,11.0,0.0,0.45,0.48); }`,
  // a magazine-fed auto shotgun: a boxy receiver with a rail, a long barrel and its muzzle brake, a polymer stock,
  // grip and handguard; the fat box magazine apart
  auto: `
float steel(vec3 p){ float d=bx(p,vec3(2.6,0.0,1.6),vec3(5.0,0.8,1.15),0.3); for(int i=0;i<8;i++) d=min(d,bx(p,vec3(-1.0+float(i)*1.0,0.0,2.85),vec3(0.22,0.45,0.15),0.04));
  d=min(d,rodX(p,7.0,23.0,0.0,1.95,0.5)); d=min(d,rodX(p,22.5,24.5,0.0,1.95,0.66)); d=min(d,bx(p,vec3(4.3,0.0,0.45),vec3(1.5,0.8,0.5),0.15)); return d; }
float poly(vec3 p){ float d=bx(p,vec3(-6.2,0.0,1.2),vec3(4.2,0.65,1.2),0.45); d=min(d,bxr(p,vec3(-0.2,0.0,-0.4),vec3(0.6,0.5,1.35),0.3,0.3)); d=min(d,bx(p,vec3(13.0,0.0,1.6),vec3(3.6,0.85,0.85),0.4)); return d; }
float magz(vec3 p){ return bx(p,vec3(4.3,0.0,-1.3),vec3(1.35,0.7,2.0),0.25); }
float lamp(vec3 p){ return rodX(p,15.5,18.0,0.0,0.45,0.5); }`,
  // a scoped hunting rifle: a bolt action, a long barrel, the scope on top, a walnut stock and fore-end
  hunter: `
float steel(vec3 p){ float d=bx(p,vec3(2.4,0.0,1.7),vec3(4.0,0.6,0.85),0.3); d=min(d,rodX(p,6.0,27.0,0.0,1.9,0.38));
  d=min(d,rodX(p,0.0,7.0,0.0,3.7,0.55)); d=min(d,sdCap(p,vec3(6.4,0.0,3.7),vec3(8.0,0.0,3.7),0.62,0.85)); d=min(d,sdCap(p,vec3(-1.4,0.0,3.7),vec3(0.2,0.0,3.7),0.8,0.62)); // the scope
  d=min(d,sdCap(p,vec3(0.6,0.6,1.8),vec3(0.4,1.7,1.4),0.18,0.3)); return d; } // the bolt handle
float poly(vec3 p){ return 1e3; }
float wood(vec3 p){ float d=bx(p,vec3(-6.0,0.0,1.0),vec3(5.0,0.6,1.25),0.45); d=smin(d,bx(p,vec3(-0.6,0.0,0.4),vec3(1.2,0.5,1.0),0.4),0.8); d=min(d,bx(p,vec3(11.0,0.0,1.3),vec3(5.0,0.7,0.75),0.4)); return d; }
float lamp(vec3 p){ return 1e3; }`,
  // a lever-action carbine: the receiver and its loop lever, a barrel over the magazine tube, walnut furniture
  lever: `
float steel(vec3 p){ float d=bx(p,vec3(1.6,0.0,1.5),vec3(3.0,0.6,1.05),0.3); d=min(d,rodX(p,4.0,24.0,0.0,2.0,0.42)); d=min(d,rodX(p,4.0,19.0,0.0,1.1,0.36));
  vec2 w=vec2(abs(length(vec2(p.x-0.4,p.z+0.9))-1.1)-0.2,abs(p.y)-0.15); d=min(d,min(max(w.x,w.y),0.0)+length(max(w,0.0))-0.15); return d; } // the lever's loop
float poly(vec3 p){ return 1e3; }
float wood(vec3 p){ float d=bx(p,vec3(-5.8,0.0,0.9),vec3(4.5,0.6,1.15),0.45); d=min(d,bx(p,vec3(8.5,0.0,1.4),vec3(3.6,0.65,0.7),0.35)); return d; }
float lamp(vec3 p){ return 1e3; }`,
  // a belt-fed machine gun: the long receiver and its feed cover, the carry handle, a heavy barrel and flash hider, the
  // gas tube, the bipod folded under it, the front sight, a stock, grip and handguard, the belt of brass going in on
  // the left; the canvas box of rounds hung under it apart
  lmg: `
float steel(vec3 p){ float d=bx(p,vec3(3.0,0.0,1.9),vec3(6.2,0.95,1.3),0.3); d=min(d,bx(p,vec3(3.2,0.0,3.35),vec3(3.2,0.85,0.3),0.15));
  d=min(d,bx(p,vec3(9.4,0.0,4.0),vec3(1.6,0.2,0.22),0.1)); for(int s=-1;s<=1;s+=2) d=min(d,bx(p,vec3(9.4+float(s)*1.4,0.0,3.4),vec3(0.2,0.2,0.6),0.08));
  d=min(d,rodX(p,9.2,28.0,0.0,2.0,0.5)); d=min(d,rodX(p,27.0,29.0,0.0,2.0,0.64)); d=min(d,rodX(p,9.2,22.0,0.0,1.05,0.3)); d=min(d,bx(p,vec3(26.0,0.0,2.95),vec3(0.16,0.1,0.65),0.05));
  for(int i=-1;i<=1;i+=2) d=min(d,rodX(p,15.0,25.0,float(i)*0.45,0.6,0.18)); return d; }
float poly(vec3 p){ float d=bx(p,vec3(-6.0,0.0,1.5),vec3(3.8,0.68,1.3),0.4); d=min(d,bxr(p,vec3(0.0,0.0,-0.3),vec3(0.6,0.5,1.35),0.3,0.3)); d=min(d,bx(p,vec3(12.5,0.0,1.15),vec3(3.0,1.0,0.6),0.35)); return d; }
float extra(vec3 p){ return bx(p,vec3(3.0,1.05,0.9),vec3(1.6,0.28,0.5),0.15); }
int extraReg(vec3 p){ return 20; }
float magz(vec3 p){ float d=bx(p,vec3(3.0,0.25,-1.45),vec3(2.4,1.4,1.9),0.55); d-=0.1*smoothstep(0.7,1.0,abs(fract(p.x*0.7)*2.0-1.0)); return d; }
float lamp(vec3 p){ return 1e3; }`,
  // a single-shot grenade launcher: a fat short barrel, its leaf sight, a wooden stock
  launcher: `
float steel(vec3 p){ float d=rodX(p,3.0,16.0,0.0,2.3,1.45); d=min(d,bx(p,vec3(0.6,0.0,1.9),vec3(2.6,1.0,1.3),0.4)); d=min(d,bx(p,vec3(4.0,0.0,4.0),vec3(0.3,0.5,0.6),0.12)); return d; }
float poly(vec3 p){ return bx(p,vec3(0.0,0.0,-0.4),vec3(0.75,0.5,1.4),0.3); }
float wood(vec3 p){ return bx(p,vec3(-5.2,0.0,1.4),vec3(4.0,0.7,1.2),0.45); }
float lamp(vec3 p){ return 1e3; }`,
  // a pistol: the slide and its sights over the frame, the raked grip, the trigger guard, a light under the muzzle;
  // the magazine up inside the grip apart (only its base shows)
  pistol: `
float steel(vec3 p){ float d=bx(p,vec3(2.6,0.0,1.95),vec3(3.5,0.45,0.55),0.18); d=min(d,bx(p,vec3(5.6,0.0,2.58),vec3(0.12,0.1,0.15),0.04)); d=min(d,bx(p,vec3(-0.5,0.0,2.58),vec3(0.15,0.3,0.15),0.04)); return d; }
float poly(vec3 p){ float d=bx(p,vec3(2.2,0.0,1.05),vec3(2.7,0.4,0.38),0.15); d=min(d,bxr(p,vec3(-0.1,0.0,-0.35),vec3(0.62,0.42,1.4),0.3,0.3)); d=min(d,bx(p,vec3(1.3,0.0,0.45),vec3(0.9,0.1,0.06),0.04)); return d; }
float magz(vec3 p){ return bxr(p,vec3(-0.3,0.0,-0.9),vec3(0.5,0.38,1.35),0.15,0.3); }
float lamp(vec3 p){ return rodX(p,4.0,5.6,0.0,0.6,0.42); }`,
};
// what a shape leaves out gets a stand-in that is nowhere
const fill = src =>
  src +
  (src.includes('float wood(') ? '' : '\nfloat wood(vec3 p){ return 1e3; }') +
  (src.includes('float extra(') ? '' : '\nfloat extra(vec3 p){ return 1e3; } int extraReg(vec3 p){ return 0; }') +
  (src.includes('float magz(') ? '' : '\nfloat magz(vec3 p){ return 1e3; }');
const gun = (name, B) => ({
  BONES,
  BOUNDS: B,
  GLSL:
    LIB +
    fill(SHAPES[name]) +
    `
float model(vec3 p){ return min(min(min(min(steel(p),poly(p)),lamp(p)),wood(p)),extra(p)); } // (its magazine apart: mag_ below)
void attrs(vec3 p){ gPart=0; gU=0.5; float s=steel(p), o=poly(p), l=lamp(p), w=wood(p), x=extra(p);
  gReg=x<min(min(min(s,o),l),w)?extraReg(p):w<min(min(s,o),l)?45:l<min(s,o)?${REGION.lens}:s<o?${REGION.gun}:${REGION.grip}; }
`,
  REGION,
  SCALE: 1,
  RIGID: true, // all of a piece
  MRES: 0.35, // small and plain: a fine grid
});
// a gun's magazine on its own, in the gun's own place (seated, it is posed as the gun is; on a reload it comes away
// in the hand, and the empty one falls to the street): in the gun's polymer, its steel, or (the machine gun's box of
// rounds) olive canvas
const mag = (name, B, reg) => ({
  BONES,
  BOUNDS: B,
  GLSL:
    LIB +
    fill(SHAPES[name]) +
    `\nfloat model(vec3 p){ return magz(p); }\nvoid attrs(vec3 p){ gPart=0; gU=0.5; gReg=${reg}; }\n`,
  REGION,
  SCALE: 1,
  RIGID: true,
  ONE: true,
  MRES: 0.35,
});
export const GUNS = {
  rifle: gun('rifle', [
    [-10, -1.6, -2.3],
    [23, 1.6, 4.4],
  ]),
  shotgun: gun('shotgun', [
    [-11.2, -1.6, -1.6],
    [25.5, 1.6, 3.2],
  ]),
  smg: gun('smg', [
    [-7.5, -1.7, -2.2],
    [13.6, 1.7, 3.6],
  ]),
  auto: gun('auto', [
    [-11, -1.6, -2.2],
    [25.5, 1.6, 3.4],
  ]),
  hunter: gun('hunter', [
    [-12, -2.5, -1.5],
    [27.5, 2.5, 5],
  ]),
  lever: gun('lever', [
    [-11, -2, -3],
    [24.5, 2, 3.5],
  ]),
  lmg: gun('lmg', [
    [-10.5, -1.6, -2.2],
    [29.8, 1.7, 4.6],
  ]),
  launcher: gun('launcher', [
    [-10, -2.5, -2.5],
    [16.5, 2.5, 5],
  ]),
  pistol: gun('pistol', [
    [-2.4, -1, -2.2],
    [6.4, 1, 3],
  ]),
  mag_rifle: mag(
    'rifle',
    [
      [2.6, -1, -5],
      [7.6, 1, 0.8],
    ],
    REGION.grip
  ),
  mag_smg: mag(
    'smg',
    [
      [2.8, -0.9, -5.2],
      [7.2, 0.9, 1.4],
    ],
    REGION.gun
  ),
  mag_auto: mag(
    'auto',
    [
      [2.6, -1.1, -3.6],
      [6, 1.1, 1],
    ],
    REGION.grip
  ),
  mag_lmg: mag(
    'lmg',
    [
      [0.2, -1.6, -3.7],
      [5.8, 2.1, 0.8],
    ],
    REGION.pack
  ),
  mag_pistol: mag(
    'pistol',
    [
      [-2, -0.7, -2.7],
      [1.2, 0.7, 0.8],
    ],
    REGION.grip
  ),
};
