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
`;
// each gun: its steel, its polymer and its light, as distances
const SHAPES = {
  // an AR-pattern carbine: receiver, a handguard, the barrel, a stock, a magazine, a light under the handguard
  rifle: `
float steel(vec3 p){ float d=bx(p,vec3(3.0,0.0,1.6),vec3(5.2,0.75,1.25),0.3); d=min(d,rodX(p,8.0,21.0,0.0,1.9,0.42)); d=min(d,bx(p,vec3(2.6,0.0,3.2),vec3(3.0,0.3,0.35),0.15)); return d; }
float poly(vec3 p){ float d=bx(p,vec3(-5.6,0.0,1.3),vec3(3.6,0.6,1.1),0.4); d=smin(d,bx(p,vec3(-2.6,0.0,1.7),vec3(0.8,0.45,0.5),0.3),0.6);
  d=min(d,bx(p,vec3(11.0,0.0,1.9),vec3(3.6,0.85,0.95),0.4)); d=min(d,bx(p,vec3(0.0,0.0,-0.4),vec3(0.75,0.5,1.4),0.3)); d=min(d,bx(p,vec3(4.4,0.0,-0.6),vec3(0.9,0.55,1.7),0.3)); return d; }
float lamp(vec3 p){ return rodX(p,12.0,15.0,0.0,0.55,0.55); }`,
  // a pump shotgun: a long barrel over its magazine tube, the pump, a stock
  shotgun: `
float steel(vec3 p){ float d=bx(p,vec3(2.4,0.0,1.5),vec3(4.4,0.75,1.1),0.3); d=min(d,rodX(p,6.0,25.0,0.0,2.0,0.5)); d=min(d,rodX(p,6.0,20.0,0.0,1.0,0.45)); return d; }
float poly(vec3 p){ float d=bx(p,vec3(-6.0,0.0,1.1),vec3(4.4,0.65,1.2),0.45); d=min(d,bx(p,vec3(-1.0,0.0,0.2),vec3(0.8,0.5,1.0),0.3)); d=min(d,bx(p,vec3(12.5,0.0,1.0),vec3(3.0,0.8,0.8),0.4)); return d; }
float lamp(vec3 p){ return rodX(p,15.0,17.4,0.0,0.15,0.5); }`,
  // a submachine gun: a short receiver and barrel, a folded stock, a long magazine
  smg: `
float steel(vec3 p){ float d=bx(p,vec3(3.4,0.0,1.6),vec3(4.8,0.7,1.1),0.3); d=min(d,rodX(p,8.0,13.5,0.0,1.9,0.42)); d=min(d,bx(p,vec3(-3.4,0.0,1.4),vec3(2.0,0.25,0.5),0.15)); return d; }
float poly(vec3 p){ float d=bx(p,vec3(0.0,0.0,-0.4),vec3(0.7,0.5,1.3),0.3); d=min(d,bx(p,vec3(4.2,0.0,-1.2),vec3(0.65,0.45,2.2),0.25)); d=min(d,bx(p,vec3(8.6,0.0,1.4),vec3(1.8,0.75,0.75),0.35)); return d; }
float lamp(vec3 p){ return rodX(p,9.0,11.0,0.0,0.45,0.48); }`,
  // a magazine-fed auto shotgun: a boxy receiver, a long barrel, a box magazine, a polymer stock and handguard
  auto: `
float steel(vec3 p){ float d=bx(p,vec3(2.6,0.0,1.6),vec3(5.0,0.8,1.2),0.3); d=min(d,rodX(p,7.0,24.0,0.0,1.9,0.55)); return d; }
float poly(vec3 p){ float d=bx(p,vec3(-6.0,0.0,1.2),vec3(4.4,0.65,1.2),0.45); d=min(d,bx(p,vec3(0.0,0.0,-0.4),vec3(0.75,0.5,1.4),0.3)); d=min(d,bx(p,vec3(4.2,0.0,-0.9),vec3(1.2,0.7,2.0),0.3)); d=min(d,bx(p,vec3(13.0,0.0,1.5),vec3(3.6,0.85,0.9),0.4)); return d; }
float lamp(vec3 p){ return rodX(p,15.5,18.0,0.0,0.3,0.5); }`,
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
  // a belt-fed machine gun: a long receiver, a carry handle, a heavy barrel in its shroud, a box of rounds hung under
  // it, the bipod folded under the barrel
  lmg: `
float steel(vec3 p){ float d=bx(p,vec3(3.0,0.0,1.8),vec3(6.0,0.9,1.35),0.3); d=min(d,rodX(p,9.0,28.0,0.0,2.0,0.55)); d=min(d,bx(p,vec3(5.0,0.0,3.6),vec3(2.2,0.25,0.5),0.2));
  for(int i=-1;i<=1;i+=2) d=min(d,rodX(p,15.0,25.0,float(i)*0.45,1.0,0.18)); return d; }
float poly(vec3 p){ float d=bx(p,vec3(-6.0,0.0,1.4),vec3(3.8,0.65,1.25),0.4); d=min(d,bx(p,vec3(0.0,0.0,-0.4),vec3(0.75,0.5,1.4),0.3));
  d=min(d,bx(p,vec3(3.0,0.0,-1.3),vec3(2.3,1.3,1.8),0.3)); d=min(d,bx(p,vec3(12.5,0.0,1.9),vec3(3.8,1.05,1.1),0.4)); return d; }
float lamp(vec3 p){ return 1e3; }`,
  // a single-shot grenade launcher: a fat short barrel, its leaf sight, a wooden stock
  launcher: `
float steel(vec3 p){ float d=rodX(p,3.0,16.0,0.0,2.3,1.45); d=min(d,bx(p,vec3(0.6,0.0,1.9),vec3(2.6,1.0,1.3),0.4)); d=min(d,bx(p,vec3(4.0,0.0,4.0),vec3(0.3,0.5,0.6),0.12)); return d; }
float poly(vec3 p){ return bx(p,vec3(0.0,0.0,-0.4),vec3(0.75,0.5,1.4),0.3); }
float wood(vec3 p){ return bx(p,vec3(-5.2,0.0,1.4),vec3(4.0,0.7,1.2),0.45); }
float lamp(vec3 p){ return 1e3; }`,
  // a pistol: the slide over the frame, the grip, a light under the muzzle
  pistol: `
float steel(vec3 p){ return bx(p,vec3(2.8,0.0,1.9),vec3(3.6,0.45,0.6),0.25); }
float poly(vec3 p){ float d=bx(p,vec3(2.2,0.0,1.0),vec3(2.9,0.42,0.45),0.2); d=min(d,bx(p,vec3(0.0,0.0,-0.3),vec3(0.7,0.42,1.4),0.3)); return d; }
float lamp(vec3 p){ return rodX(p,4.0,5.6,0.0,0.6,0.42); }`,
};
const gun = (name, B) => ({
  BONES,
  BOUNDS: B,
  GLSL:
    LIB +
    SHAPES[name] +
    `
${SHAPES[name].includes('float wood(') ? '' : 'float wood(vec3 p){ return 1e3; }'}
float model(vec3 p){ return min(min(min(steel(p),poly(p)),lamp(p)),wood(p)); }
void attrs(vec3 p){ gPart=0; gU=0.5; float s=steel(p), o=poly(p), l=lamp(p), w=wood(p); gReg=w<min(min(s,o),l)?45:l<min(s,o)?${REGION.lens}:s<o?${REGION.gun}:${REGION.grip}; }
`,
  REGION,
  SCALE: 1,
  RIGID: true, // all of a piece
  MRES: 0.35, // small and plain: a fine grid
});
export const GUNS = {
  rifle: gun('rifle', [
    [-10, -2, -3],
    [22, 2, 4.5],
  ]),
  shotgun: gun('shotgun', [
    [-11, -2, -2],
    [26, 2, 3.5],
  ]),
  smg: gun('smg', [
    [-6, -2, -4],
    [15, 2, 3.5],
  ]),
  auto: gun('auto', [
    [-11, -2, -3.5],
    [24.5, 2, 3.5],
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
    [-11, -2.5, -3.5],
    [28.5, 2.5, 4.5],
  ]),
  launcher: gun('launcher', [
    [-10, -2.5, -2.5],
    [16.5, 2.5, 5],
  ]),
  pistol: gun('pistol', [
    [-2, -1.5, -2.2],
    [7, 1.5, 3],
  ]),
};
