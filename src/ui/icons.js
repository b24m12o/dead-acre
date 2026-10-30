/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Icons for the gun wheel and the trap belt: each gun and trap as a side-on silhouette with its machined detail
// cut in (slide serrations, ports, flutes, pump grooves, the lever's loop), lit from above with a soft sheen, the way
// a game's weapon wheel shows its guns. Drawn with paths into a 100 × 40 box, muzzle to the right, and cached.
import { GUNS } from '../game/arsenal.js';

const rect = (c, x, y, w, h) => c.rect(x, y, w, h);
const poly = (c, ...p) => {
  c.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
  c.closePath();
};
const rr = (c, x, y, w, h, r) => {
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
const line = (c, ...p) => {
  c.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
};
// a trigger guard: a loop under the frame
const guard = (c, x, y) => {
  c.moveTo(x - 6, y);
  c.quadraticCurveTo(x - 7, y + 7, x, y + 7);
  c.quadraticCurveTo(x + 6, y + 7, x + 7, y);
  c.closePath();
};
// SHAPE fills the silhouette; HOLE cuts openings right through it; CUT engraves thin detail lines
const G = {
  pistol: {
    shape: c => {
      poly(c, 14, 9, 82, 9, 85, 12, 85, 19, 14, 19); // slide
      rect(c, 84, 12, 4, 5); // muzzle
      poly(c, 18, 19, 80, 19, 80, 23, 50, 24, 46, 23, 40, 23); // frame and dust cover
      poly(c, 20, 19, 40, 21, 37, 38, 34, 39, 21, 39, 18, 37); // grip, raked
      guard(c, 46, 23);
      rect(c, 14, 7, 3, 2); // rear sight
      rect(c, 79, 7, 3, 2); // front sight
    },
    hole: c => {
      ring(c, 46, 26, 3.3);
      rr(c, 48, 10.5, 12, 3.5, 1); // ejection port
    },
    cut: c => {
      for (let x = 17; x < 30; x += 2.6) line(c, x, 10, x, 18); // slide serrations
      line(c, 14, 19, 82, 19);
      for (let y = 25; y < 37; y += 3) line(c, 22, y, 35, y + 0.8); // grip texture
    },
  },
  revolver: {
    shape: c => {
      rr(c, 52, 9.5, 44, 7, 1.5); // barrel with its rib
      rect(c, 52, 16.5, 34, 4); // ejector shroud
      rect(c, 93, 7, 2.5, 3); // front sight
      rr(c, 31, 7, 23, 16, 3); // cylinder
      poly(c, 24, 8, 33, 8, 33, 24, 26, 24); // frame
      poly(c, 20, 4, 28, 8, 26, 11); // hammer spur
      guard(c, 38, 23);
      poly(c, 26, 22, 36, 24, 31, 40, 17, 39, 19, 32, 22, 25); // the curved grip
    },
    hole: c => ring(c, 38, 26, 3),
    cut: c => {
      for (const x of [36, 42.5, 49]) line(c, x, 9, x, 21); // flutes
      line(c, 52, 16.5, 86, 16.5);
      rr(c, 21, 26, 10, 11, 3); // grip panel
    },
  },
  smg: {
    shape: c => {
      rr(c, 26, 9, 46, 13, 2); // receiver
      rr(c, 72, 11, 14, 9, 2); // handguard
      rect(c, 86, 13.5, 10, 4); // barrel
      rect(c, 82, 6, 3, 5); // front sight hood
      rect(c, 30, 6, 4, 3);
      poly(c, 46, 22, 54, 22, 58, 38, 50, 39); // curved mag
      poly(c, 30, 21, 37, 21, 35, 34, 28, 34); // grip
      guard(c, 40, 21);
      rect(c, 4, 10, 22, 3); // collapsible stock rails
      rect(c, 4, 18, 22, 3);
      rr(c, 2, 9, 5, 14, 1.5); // butt
    },
    hole: c => ring(c, 40, 24, 3),
    cut: c => {
      line(c, 26, 15, 72, 15);
      for (let x = 74; x < 85; x += 3) line(c, x, 12, x, 19);
    },
  },
  shotgun: {
    shape: c => {
      rr(c, 38, 9.5, 61, 5, 1.5); // barrel
      rect(c, 96, 8, 2, 2); // bead
      rr(c, 40, 14.5, 46, 4, 1.5); // magazine tube
      rr(c, 52, 13, 20, 8, 2.5); // pump
      rr(c, 25, 8.5, 17, 12, 2); // receiver
      guard(c, 34, 20);
      poly(c, 26, 13, 2, 14, 1, 26, 6, 27, 26, 20); // stock
    },
    hole: c => {
      ring(c, 34, 22.5, 3);
      rr(c, 29, 10.5, 8, 3, 1); // ejection port
    },
    cut: c => {
      for (let x = 55; x < 70; x += 2.6) line(c, x, 13.5, x, 20.5); // pump grooves
      line(c, 4, 15, 4, 26); // recoil pad
    },
  },
  auto: {
    shape: c => {
      rr(c, 26, 8, 30, 13, 2); // receiver
      rr(c, 56, 10, 20, 9, 2); // handguard
      rr(c, 76, 11.5, 22, 5, 1.5); // barrel
      rect(c, 94, 9, 3, 3);
      poly(c, 38, 21, 50, 21, 52, 37, 40, 38); // box mag
      poly(c, 28, 20, 35, 20, 33, 34, 26, 34); // grip
      guard(c, 36, 20);
      poly(c, 26, 10, 3, 11, 2, 22, 6, 23, 26, 18); // folding stock
    },
    hole: c => {
      ring(c, 36, 23, 3);
      rr(c, 8, 13.5, 14, 5, 2);
    },
    cut: c => {
      for (let x = 59; x < 74; x += 3) line(c, x, 11, x, 18);
      line(c, 40, 26, 51, 26);
      line(c, 40, 31, 51, 31);
    },
  },
  rifle: {
    shape: c => {
      rr(c, 26, 9, 36, 11, 1.5); // receiver
      rect(c, 28, 6, 32, 3); // top rail
      rr(c, 62, 9, 24, 9, 1.5); // handguard
      rect(c, 86, 12, 9, 3); // barrel
      rr(c, 95, 11, 5, 5, 1); // flash hider
      rect(c, 82, 5, 3, 4); // front sight
      poly(c, 40, 20, 49, 20, 54, 37, 45, 38); // curved mag
      poly(c, 29, 19, 36, 19, 34, 33, 27, 33); // grip
      guard(c, 39, 20);
      rect(c, 14, 12, 12, 4); // buffer tube
      poly(c, 2, 9, 16, 10, 16, 21, 2, 24); // stock
    },
    hole: c => ring(c, 39, 23, 3),
    cut: c => {
      for (let x = 29; x < 60; x += 3) line(c, x, 6, x, 9); // rail teeth
      for (let x = 65; x < 84; x += 4) line(c, x, 11, x, 16); // handguard vents
      line(c, 26, 14, 62, 14);
    },
  },
  hunter: {
    shape: c => {
      rr(c, 58, 11.5, 41, 4, 1.5); // long barrel
      rr(c, 33, 9.5, 27, 9, 2); // receiver
      rr(c, 36, 2, 26, 5, 2.5); // scope tube
      rr(c, 33, 1, 7, 7, 2); // eyepiece
      rr(c, 57, 0, 8, 8, 2); // objective bell
      rect(c, 42, 7, 3, 3);
      rect(c, 53, 7, 3, 3);
      ring(c, 40, 20, 2.4); // bolt knob
      poly(c, 36, 17, 41, 19, 39, 21);
      poly(c, 34, 12, 1, 14, 0, 28, 6, 28, 22, 20, 34, 19); // wooden stock
      rr(c, 58, 15, 26, 4.5, 2); // forestock
      guard(c, 45, 18);
    },
    hole: c => ring(c, 45, 21, 2.8),
    cut: c => {
      line(c, 6, 18, 22, 17);
      line(c, 33, 14, 60, 14);
    },
  },
  lever: {
    shape: c => {
      poly(c, 50, 10, 98, 10.5, 98, 14.5, 50, 15); // barrel
      rect(c, 96, 8.5, 2, 2);
      rr(c, 50, 15, 42, 3.5, 1.5); // tube magazine
      rr(c, 30, 9, 22, 11, 2.5); // receiver
      poly(c, 30, 12, 1, 14, 0, 27, 5, 28, 22, 21, 30, 20); // stock
      rr(c, 52, 14.5, 18, 5, 2); // forend
      c.moveTo(34, 20); // the lever and its big loop
      c.quadraticCurveTo(33, 31, 42, 31);
      c.quadraticCurveTo(50, 31, 49, 22);
      c.lineTo(52, 20);
      c.closePath();
    },
    hole: c => {
      c.moveTo(37, 21);
      c.quadraticCurveTo(37, 28, 42, 28);
      c.quadraticCurveTo(47, 28, 46, 21);
      c.closePath();
      ring(c, 28, 13, 1.4); // the saddle ring
    },
    cut: c => {
      line(c, 33, 13, 50, 13);
      line(c, 5, 18, 22, 17);
    },
  },
  lmg: {
    shape: c => {
      rr(c, 22, 7, 40, 14, 2); // receiver
      poly(c, 30, 7, 52, 7, 50, 3, 32, 3); // feed cover
      rr(c, 36, 0, 12, 4, 1.5); // carry handle
      rr(c, 62, 9, 20, 9, 2); // heat shield
      rr(c, 82, 11.5, 15, 4, 1.5); // barrel
      rr(c, 96, 10.5, 4, 6, 1);
      rr(c, 33, 21, 17, 14, 1.5); // the ammo box
      poly(c, 24, 20, 31, 20, 29, 33, 22, 33); // grip
      poly(c, 22, 9, 2, 9, 2, 23, 22, 20); // stock
      poly(c, 74, 17, 77, 17, 86, 35, 83, 35); // bipod
      poly(c, 74, 17, 77, 17, 70, 35, 67, 35);
    },
    hole: c => rr(c, 6, 12.5, 12, 5, 2),
    cut: c => {
      for (let x = 64; x < 81; x += 3.5) line(c, x, 10, x, 17);
      line(c, 36, 26, 47, 26);
      line(c, 22, 14, 62, 14);
    },
  },
  launcher: {
    shape: c => {
      rr(c, 42, 6, 54, 16, 5); // the fat barrel
      rr(c, 94, 7, 4, 14, 1.5); // muzzle ring
      rr(c, 28, 8, 16, 13, 2.5); // breech
      rect(c, 50, 1, 3, 6); // ladder sight
      rect(c, 50, 1, 9, 2);
      guard(c, 36, 21);
      poly(c, 30, 12, 2, 13, 1, 27, 6, 28, 22, 21, 30, 21); // wooden stock
    },
    hole: c => ring(c, 36, 24, 3),
    cut: c => {
      line(c, 44, 14, 92, 14);
      line(c, 6, 18, 22, 17);
    },
  },
  mine: {
    shape: c => {
      poly(c, 14, 33, 86, 33, 80, 21, 20, 21); // the cast body
      rr(c, 10, 32, 80, 5, 2); // base flange
      rr(c, 36, 14, 28, 8, 3); // pressure plate
      rect(c, 47, 7, 6, 8); // fuze
      rect(c, 44, 5, 12, 3);
    },
    cut: c => {
      line(c, 24, 27, 76, 27);
      for (let x = 30; x < 72; x += 7) line(c, x, 22, x, 32);
    },
  },
  drum: {
    shape: c => {
      rr(c, 31, 2, 38, 37, 3); // a 55-gallon drum
      rect(c, 29, 1, 42, 3);
      rect(c, 29, 37, 42, 3);
      rect(c, 58, 0, 6, 2); // bung
    },
    hole: c => {
      poly(c, 50, 14, 57, 21, 55, 27, 50, 30, 45, 27, 43, 21, 47, 22); // a flame, cut through
    },
    cut: c => {
      line(c, 31, 12, 69, 12);
      line(c, 31, 31, 69, 31);
    },
  },
  noise: {
    shape: c => {
      ring(c, 50, 23, 14); // the clock
      ring(c, 37, 9, 6.5); // bells
      ring(c, 63, 9, 6.5);
      rect(c, 46, 4, 8, 3); // the hammer between them
      poly(c, 39, 34, 43, 34, 37, 40, 33, 40); // legs
      poly(c, 57, 34, 61, 34, 67, 40, 63, 40);
    },
    hole: c => ring(c, 50, 23, 10.5),
    hands: c => {
      ring(c, 50, 23, 1.6);
      rect(c, 49.2, 15, 1.6, 8.5);
      rect(c, 50, 22.2, 7, 1.6);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        rect(c, 50 + Math.cos(a) * 8.7 - 0.6, 23 + Math.sin(a) * 8.7 - 0.6, 1.2, 1.2);
      }
    },
  },
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
    s = Math.min(cv.width / 100, cv.height / 40),
    D = G[id] || G.pistol;
  c.translate((cv.width - 100 * s) / 2, (cv.height - 40 * s) / 2);
  c.scale(s, s);
  c.fillStyle = col;
  c.beginPath();
  D.shape(c);
  c.fill();
  c.globalCompositeOperation = 'destination-out';
  if (D.hole) {
    c.beginPath();
    D.hole(c);
    c.fill();
  }
  if (D.cut) {
    c.lineWidth = 0.9;
    c.lineCap = 'round';
    c.beginPath();
    D.cut(c);
    c.stroke();
  } // the detail, engraved: thin lines cut right through so the dark shows
  c.globalCompositeOperation = 'source-atop';
  {
    const g = c.createLinearGradient(0, 0, 0, 40);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    c.fillStyle = g;
    c.fillRect(0, 0, 100, 40);
  } // lit from above: a sheen on top, falling off underneath
  c.globalCompositeOperation = 'source-over';
  if (D.hands) {
    c.fillStyle = col;
    c.beginPath();
    D.hands(c);
    c.fill();
  }
  return (CACHE[key] = cv);
}
const URLS = {};
export function iconURL(id) {
  return URLS[id] || (URLS[id] = icon(id, 40, 16).toDataURL());
}
