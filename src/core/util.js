/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
export const TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const d2 = (ax, ay, bx, by) => {
  const x = ax - bx,
    y = ay - by;
  return x * x + y * y;
};
export const SOFT3 = [0.3, 0.6, 1];
export function keepIf(arr, pred) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (pred(v)) arr[j++] = v;
  }
  arr.length = j;
  return arr;
} // drops finished items in place: no new array every frame
export const angDiff = (a, b) => {
  let d = b - a;
  if (d > Math.PI || d < -Math.PI) d -= TAU * Math.floor((d + Math.PI) / TAU);
  return d;
}; // wraps in one step: a bad angle can never spin a loop forever
export const pick = arr => arr[(Math.random() * arr.length) | 0];
export const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
