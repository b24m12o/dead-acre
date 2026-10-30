/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Icons for the gun wheel and the trap belt: each gun and trap as a flat side-on silhouette, the way you'd know it
// at a glance, drawn with paths into a 100 × 40 box (muzzle to the right). Cached as canvases (and as image URLs
// for the HTML HUD) at the sizes asked for.
import { GUNS } from '../game/arsenal.js';

const rect = (c, x, y, w, h) => c.rect(x, y, w, h);
const poly = (c, ...p) => {
  c.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
  c.closePath();
};
const rrect = (c, x, y, w, h, r) => {
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};
const ring = (c, x, y, r) => {
  c.moveTo(x + r, y);
  c.arc(x, y, r, 0, Math.PI * 2);
};
// each shape is filled with the nonzero rule; HOLES are cut out afterwards
const SHAPE = {
  pistol: c => {
    rrect(c, 18, 9, 64, 11, 2); // slide
    rect(c, 22, 20, 46, 5); // frame
    poly(c, 22, 22, 38, 22, 34, 40, 18, 40); // grip, raked back
    rect(c, 78, 12, 6, 6);
  },
  revolver: c => {
    rect(c, 54, 11, 42, 6); // barrel
    rect(c, 54, 17, 30, 3); // ejector rod
    rrect(c, 32, 7, 24, 16, 4); // cylinder
    poly(c, 26, 9, 34, 9, 34, 22, 28, 22); // frame
    poly(c, 22, 6, 30, 9, 26, 12); // hammer spur
    poly(c, 28, 20, 38, 22, 30, 40, 16, 38, 22, 26); // curved grip
  },
  smg: c => {
    rrect(c, 22, 10, 56, 13, 2); // receiver
    rect(c, 78, 13, 14, 5); // barrel
    rect(c, 44, 23, 8, 17); // straight mag
    poly(c, 26, 22, 34, 22, 32, 36, 24, 36); // grip
    rect(c, 2, 12, 20, 3); // wire stock
    rect(c, 2, 12, 3, 12);
    rect(c, 2, 21, 20, 3);
  },
  shotgun: c => {
    rect(c, 36, 10, 62, 5); // barrel
    rect(c, 38, 15, 48, 4); // magazine tube
    rrect(c, 52, 13, 18, 9, 2); // pump
    rrect(c, 24, 9, 16, 12, 2); // receiver
    poly(c, 2, 13, 26, 11, 26, 20, 4, 27); // stock
  },
  auto: c => {
    rect(c, 50, 11, 44, 5);
    rrect(c, 24, 8, 30, 14, 2);
    rect(c, 36, 22, 10, 13); // box mag
    poly(c, 26, 21, 33, 21, 31, 34, 24, 34);
    poly(c, 2, 12, 24, 10, 24, 20, 6, 24);
    rrect(c, 54, 15, 22, 6, 2);
  },
  rifle: c => {
    rrect(c, 24, 9, 40, 12, 2); // receiver
    rect(c, 38, 4, 18, 5); // carry handle and sights
    rrect(c, 64, 10, 24, 9, 2); // handguard
    rect(c, 88, 13, 11, 3); // barrel
    poly(c, 42, 21, 50, 21, 54, 36, 46, 37); // curved mag
    poly(c, 28, 20, 35, 20, 33, 33, 26, 33); // grip
    poly(c, 0, 10, 24, 12, 24, 19, 0, 24); // stock
  },
  hunter: c => {
    rect(c, 56, 12, 43, 4); // long barrel
    rrect(c, 32, 10, 26, 9, 2); // receiver
    rrect(c, 34, 2, 30, 6, 3); // scope
    rect(c, 40, 7, 3, 4);
    rect(c, 56, 7, 3, 4);
    poly(c, 0, 14, 34, 11, 34, 20, 18, 21, 4, 28); // wooden stock
    rect(c, 58, 16, 22, 4); // forestock
  },
  lever: c => {
    rect(c, 52, 11, 46, 4);
    rect(c, 52, 15, 40, 3); // tube
    rrect(c, 32, 9, 22, 11, 2);
    poly(c, 0, 13, 32, 11, 32, 20, 4, 27);
    ring(c, 42, 25, 6); // the lever's loop
  },
  lmg: c => {
    rrect(c, 22, 6, 42, 16, 2); // receiver
    rect(c, 64, 10, 35, 6); // barrel
    rrect(c, 66, 8, 18, 10, 2); // heat shield
    rect(c, 34, 22, 16, 12); // box
    poly(c, 26, 21, 33, 21, 31, 33, 24, 33);
    poly(c, 0, 9, 22, 9, 22, 20, 0, 22); // stock
    poly(c, 82, 16, 85, 16, 92, 34, 89, 34); // bipod
    poly(c, 82, 16, 85, 16, 80, 34, 77, 34);
  },
  launcher: c => {
    rrect(c, 40, 6, 52, 17, 4); // the fat barrel
    rrect(c, 26, 8, 16, 13, 2);
    poly(c, 0, 12, 26, 10, 26, 20, 6, 28);
    poly(c, 30, 20, 37, 20, 35, 33, 28, 33);
    rect(c, 52, 2, 3, 5); // leaf sight
  },
  mine: c => {
    poly(c, 18, 32, 82, 32, 76, 20, 24, 20); // the body
    rrect(c, 38, 13, 24, 8, 3); // pressure plate
    rect(c, 47, 8, 6, 6); // the prong
    rect(c, 14, 32, 72, 4);
  },
  drum: c => {
    rrect(c, 32, 1, 36, 38, 3); // the drum
  },
  noise: c => {
    ring(c, 50, 22, 14); // the clock
    ring(c, 37, 9, 6); // bells
    ring(c, 63, 9, 6);
    poly(c, 38, 33, 42, 33, 36, 40, 32, 40); // legs
    poly(c, 58, 33, 62, 33, 68, 40, 64, 40);
  },
};
const HOLES = {
  pistol: c => ring(c, 34, 26, 4), // trigger guard
  revolver: c => {
    ring(c, 40, 26, 3.5);
    rect(c, 35, 10, 2, 10); // the cylinder's flutes
    rect(c, 43, 10, 2, 10);
    rect(c, 51, 10, 2, 10);
  },
  smg: c => rect(c, 5, 15, 14, 6),
  lever: c => ring(c, 42, 25, 3.5),
  drum: c => {
    rect(c, 32, 12, 36, 2.5); // ribs
    rect(c, 32, 26, 36, 2.5);
    poly(c, 50, 16, 56, 21, 51, 21, 54, 25, 46, 20, 50, 20); // a flame
  },
  noise: c => {
    ring(c, 50, 22, 10);
  },
};
const NOISE_HANDS = c => {
  rect(c, 49, 14, 2, 9);
  rect(c, 49, 21, 7, 2);
};
const CACHE = {};
export const iconId = g => (g === 'pistol' && GUNS.pistol && GUNS.pistol.rev ? 'revolver' : g);
// an icon canvas w × h (CSS px, at the screen's density), in colour col
export function icon(id, w, h, col = '#f2ead8') {
  const dpr = Math.min(2, window.devicePixelRatio || 1),
    key = `${id}|${w}|${h}|${col}|${dpr}`;
  if (CACHE[key]) return CACHE[key];
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const c = cv.getContext('2d'),
    s = Math.min(cv.width / 100, cv.height / 40);
  c.translate((cv.width - 100 * s) / 2, (cv.height - 40 * s) / 2);
  c.scale(s, s);
  c.fillStyle = col;
  c.beginPath();
  (SHAPE[id] || SHAPE.pistol)(c);
  c.fill();
  if (HOLES[id]) {
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    HOLES[id](c);
    c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  if (id === 'noise') {
    c.beginPath();
    NOISE_HANDS(c);
    c.fill();
  }
  return (CACHE[key] = cv);
}
const URLS = {};
export function iconURL(id) {
  return URLS[id] || (URLS[id] = icon(id, 40, 16).toDataURL());
}
