/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The things to pick up and the supply drops as 3D meshes for tools/mesh/build.mjs: the same shapes and paint the
// flat pictures are baked from (src/render/shapes/pickups.js, read from there so the two never drift), each on one
// bone, in those shapes' own units (fig3d.js scales them to the street), z up, lying on z = 0. Painted corner by
// corner in their own colours (region 99, gCol), not by region: a medkit's white cross, an ammo can's stencils.
import { readFileSync } from 'node:fs';
import { REGION } from './humanoid.mjs';

const SRC = readFileSync(new URL('../../src/render/shapes/pickups.js', import.meta.url), 'utf8');
const GLSL = SRC.match(/bakeGroup\(\s*'pk',\s*`([\s\S]*?)`\s*\);/)[1].replace(
  /\n\s*vec3 alb\(vec3 p, vec3 n\)\{[^\n]*\n/,
  '\n'
); // (alb: the baked picture's own shading; the street lights these)
const ORDER = SRC.slice(SRC.indexOf("['medkit'"), SRC.indexOf('.forEach'));
const NAMES = [...ORDER.matchAll(/\['(\w+)',\s*(\d+)\]/g)].map(m => [m[1], +m[2]]);
const BONES = [['pk', -1, [0, 0, 0], [8, 0, 0]], ...[...Array(13).keys()].map(i => ['x' + i, 0, [0, 0, 0], [0, 0, 1]])];
// how far each reaches (its baked picture's size, in the same units) and how tall it stands
const SIZE = {
  medkit: [26, 26],
  ammo: [26, 20],
  ammo_light: [28, 22],
  ammo_shells: [30, 24],
  ammo_rifle: [34, 24],
  ammo_heavy: [28, 22],
  ammo_gren: [34, 26],
  crate: [34, 34],
  wcase: [64, 26],
  bn_adren: [30, 20],
  bn_duty: [26, 22],
  bn_bag: [34, 22],
  bn_gear: [32, 26],
  bn_drum: [44, 22],
  pouch: [22, 20],
};
const model = (k, [w, h], z) => ({
  BONES,
  BOUNDS: [
    [-w / 2 - 3, -h / 2 - 3, -0.6],
    [w / 2 + 3, h / 2 + 3, z + 3],
  ],
  GLSL: `#define uPart ${k}
int gPart; int gReg; float gU; vec3 gCol;
${GLSL}
float model(vec3 p){ return map(p); }
void attrs(vec3 p){ gPart=0; gU=0.5; gReg=99; vec2 e=vec2(0.1,-0.1);
  vec3 n=normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));
  gCol=albB(p,n); }
`,
  REGION,
  SCALE: 1,
  RIGID: true,
  ONE: true, // small: the one mesh, near and far
  MRES: k === 7 || k === 8 ? 0.95 : 0.75, // (a few pixels across on the screen: fine enough for a cross, a stencil, a strap)
});
export const PICKUPS = Object.fromEntries(NAMES.map(([n, z], i) => ['pk_' + n, model(i, SIZE[n], z)]));
