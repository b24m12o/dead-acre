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
float model(vec3 p){ return min(min(steel(p),poly(p)),lamp(p)); }
void attrs(vec3 p){ gPart=0; gU=0.5; float s=steel(p), o=poly(p), l=lamp(p); gReg=l<min(s,o)?${REGION.lens}:s<o?${REGION.gun}:${REGION.grip}; }
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
  pistol: gun('pistol', [
    [-2, -1.5, -2.2],
    [7, 1.5, 3],
  ]),
};
