/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The things to pick up as real objects (fig3d.js draws them, tools/mesh/pickups.mjs makes them): each thrown out of
// what dropped it, turning over once in the air, bouncing and settling at a slant of its own on the street; a shine
// running over it now and then; lifted and turning as it comes to you. Without the 3D meshes the pictures draw
// (render.js).
import { GS } from '../core/gs.js';
import { GK } from '../core/scale.js';
import { drawPick3D, pick3dOn, pickTurn } from './fig3d.js';

export const PICK_K = 1.25; // a little over life size: found at a glance from above
const TOSS = 0.42, // the first arc, s
  BOUNCE = 0.2, // the bounce after it
  EXT = { wcase: 36, crate: 20, bn_drum: 24 }; // how far its shine runs, in its own units (the rest: 17)
const hash = (x, y) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
// which model, and how big, for what lies there
export function pickModel(k, boon) {
  if (boon) return ['bn_' + k.id, 1.3];
  if (k.k === 'pouch') return ['pouch', 1.2];
  if (k.k === 'ammo') return k.at ? ['ammo_' + k.at, 1.25] : ['ammo', 1];
  return ['medkit', 1.2];
}
// how high it is off the street now (the toss, the bounce, the lift on its way to you), and its turn
function stateOf(k) {
  if (k._ps === GS.time && k._pz !== undefined) return;
  k._ps = GS.time;
  if (k._py === undefined) {
    k._py = hash(k.x, k.y) * Math.PI * 2; // the way it ends up lying: its own
    const v = Math.hypot(k.vx || 0, k.vy || 0);
    k._pa = v > 5 ? Math.atan2(k.vy, k.vx) + Math.PI / 2 : hash(k.y, k.x) * Math.PI * 2; // it turns over the way it was thrown
    k._pd = hash(k.x + 3, k.y) < 0.5 ? -1 : 1;
  }
  const t = Math.max(0, k.t || 0);
  let z = 0,
    th = 0,
    yaw = k._py;
  if (t < TOSS) {
    const u = t / TOSS;
    z = 4 * u * (1 - u) * 13 * GK * 2.4;
    th = (1 - (1 - u) * (1 - u)) * Math.PI * 2 * k._pd; // over once, quick at first: it lands the right way up
    yaw += (1 - u) * 1.4 * k._pd;
  } else if (t < TOSS + BOUNCE) {
    const u = (t - TOSS) / BOUNCE;
    z = 4 * u * (1 - u) * 2.6 * GK * 2.4;
    th = Math.sin(u * Math.PI) * 0.22 * k._pd; // a corner catches as it comes down again
  } else if (t < TOSS + BOUNCE + 0.25) th = Math.sin(((t - TOSS - BOUNCE) / 0.25) * Math.PI * 2) * 0.05 * k._pd; // and rocks still
  if (k.pull) {
    if (k._pl === undefined) k._pl = GS.time;
    const u = GS.time - k._pl;
    z = Math.max(z, Math.min(1, u * 6) * 9 * GK * 2.4);
    yaw += u * 9 * k._pd; // lifted, spinning, on its way into your hands
    th = Math.sin(u * 7) * 0.3;
  } else k._pl = undefined;
  k._pz = z;
  k._pth = th;
  k._pyaw = yaw;
}
// its height off the street (the contact shadow under it shrinks and fades as it goes up: render.js)
export function pickZ(k) {
  stateOf(k);
  return k._pz;
}
// the shine: once every few seconds a band of light across it, corner to corner (far off the rest of the time)
function shine(k, ext) {
  const P = 2.9,
    u = (GS.time + hash(k.x, k.y + 1) * P) % P;
  return u < 0.5 ? -ext + (u / 0.5) * ext * 2 : 99;
}
// draws k in 3D among the street's things (draw-props.js); false if it can't
export function drawPickup(k, boon = false, al = 1) {
  const [n, sc] = pickModel(k, boon);
  if (!pick3dOn(n)) return false;
  stateOf(k);
  const s = sc * GK * PICK_K;
  return drawPick3D(k, n, pickTurn(k._pyaw, k._pa, k._pth), k.x, k.y, k._pz, s, s, al, shine(k, EXT[n] || 17));
}
export const pickup3D = (k, boon = false) => pick3dOn(pickModel(k, boon)[0]);
// a supply drop or weapon case, in the air under its canopy or down on the street (draw-props.js drawCrate)
export function drawCrate3D(c, k) {
  const n = c.gun || c.kit ? 'wcase' : 'crate';
  if (!pick3dOn(n)) return false;
  const sq = c.squash > 0 ? Math.sin(c.squash * Math.PI) * 0.12 : 0,
    s = k * (c.gun || c.kit ? 1.08 : 1.22),
    yaw = c.landed ? c.ang || 0 : 0,
    sw = (c.thx || 0) * 0.5;
  if (c.id === undefined) c.id = 21000 + Math.floor(Math.random() * 999);
  // (in the air it hangs where its picture would, up the screen by its height: the canopy's lines meet it there)
  return drawPick3D(
    c,
    n,
    pickTurn(yaw, yaw, c.landed ? 0 : sw),
    c.x + (c.sx || 0),
    c.y - c.z + (c.sy || 0),
    0,
    s * (1 + sq),
    s * (1 - sq),
    1,
    c.landed && !c.open ? shine(c, EXT[n]) : 99
  );
}
