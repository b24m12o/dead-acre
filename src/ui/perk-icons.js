/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Icons for the gear picks: each upgrade as the real thing it is (a suppressor, a plate carrier, a pipe bomb), drawn
// the way the gun wheel draws its guns: a filled silhouette, openings cut right through, thin engraved detail, lit
// from above with a soft sheen. Drawn with paths into a 48 × 48 box and cached. Combos get their own drawing; the two
// skill picks of each character are the ability's own object with a small badge (a stopwatch for "recharges faster",
// a chevron for "stronger").
import { icon } from './icons.js';

const TAU = Math.PI * 2;
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
  c.arc(x, y, r, 0, TAU);
};
const line = (c, ...p) => {
  c.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
};
const arcL = (c, x, y, r, a0, a1) => {
  c.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
  c.arc(x, y, r, a0, a1);
};
// a cartridge standing up, nose at the top: base centre x, case from y0 to y1, ogive h tall
function round(c, x, y0, y1, w, h, flat = false) {
  rect(c, x - w / 2, y0, w, y1 - y0);
  c.moveTo(x - w / 2, y0);
  if (flat) {
    c.lineTo(x - w * 0.42, y0 - h * 0.8);
    c.lineTo(x + w * 0.42, y0 - h * 0.8);
  } else c.quadraticCurveTo(x - w / 2, y0 - h * 0.7, x, y0 - h);
  if (!flat) c.quadraticCurveTo(x + w / 2, y0 - h * 0.7, x + w / 2, y0);
  else c.lineTo(x + w / 2, y0);
  c.closePath();
  rect(c, x - w / 2 - 1, y1 - 1.5, w + 2, 2.5); // the rim
}
// a bullet lying on its side, nose to the right
function slug(c, x, y, len, w) {
  c.moveTo(x, y - w / 2);
  c.lineTo(x + len * 0.55, y - w / 2);
  c.quadraticCurveTo(x + len, y - w / 2, x + len, y);
  c.quadraticCurveTo(x + len, y + w / 2, x + len * 0.55, y + w / 2);
  c.lineTo(x, y + w / 2);
  c.closePath();
}
// a flame, base at (x, y), h tall
function flame(c, x, y, h, w = h * 0.55) {
  c.moveTo(x, y);
  c.bezierCurveTo(x - w * 0.9, y - h * 0.05, x - w * 0.75, y - h * 0.55, x - w * 0.15, y - h * 0.75);
  c.bezierCurveTo(x - w * 0.2, y - h * 0.5, x + w * 0.05, y - h * 0.45, x + w * 0.05, y - h * 0.6);
  c.bezierCurveTo(x + w * 0.1, y - h * 0.8, x + w * 0.05, y - h * 0.9, x + w * 0.2, y - h);
  c.bezierCurveTo(x + w * 0.9, y - h * 0.6, x + w * 0.85, y - h * 0.1, x, y);
  c.closePath();
}
function heart(c, x, y, s) {
  c.moveTo(x, y + s * 0.95);
  c.bezierCurveTo(x - s * 1.25, y + s * 0.1, x - s * 1.05, y - s * 0.95, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 1.05, y - s * 0.95, x + s * 1.25, y + s * 0.1, x, y + s * 0.95);
  c.closePath();
}
function arrowHead(c, x, y, a, s) {
  c.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
  c.lineTo(x + Math.cos(a + 2.5) * s, y + Math.sin(a + 2.5) * s);
  c.lineTo(x + Math.cos(a - 2.5) * s, y + Math.sin(a - 2.5) * s);
  c.closePath();
}
// SHAPE fills the silhouette; STROKE adds thick lines in the same colour (paths, wires, rays); HOLE cuts openings
// right through; CUT engraves thin detail lines
const P = {
  // ---- guns and rounds ----
  dmg: {
    // Hollow Points: a fat pistol round, the open cavity in its flat nose
    shape: c => {
      rect(c, 15, 24, 18, 19);
      c.moveTo(15, 24);
      c.bezierCurveTo(15, 14, 18, 8, 20, 7);
      c.lineTo(28, 7);
      c.bezierCurveTo(30, 8, 33, 14, 33, 24);
      c.closePath();
      rect(c, 14, 41, 20, 3);
    },
    hole: c => {
      c.moveTo(19.5, 7);
      c.lineTo(24, 14);
      c.lineTo(28.5, 7);
      c.closePath();
    },
    cut: c => {
      line(c, 15, 24, 33, 24);
      line(c, 15.5, 38.5, 32.5, 38.5);
      line(c, 18, 11, 17.4, 19);
      line(c, 30, 11, 30.6, 19);
    },
  },
  rate: {
    // Light Trigger: the trigger in its guard, pulled right back, speed lines behind it
    shape: c => {
      rect(c, 8, 8, 38, 4); // the frame above
      c.moveTo(32, 12);
      c.quadraticCurveTo(34, 24, 25, 31);
      c.lineTo(22.5, 29);
      c.quadraticCurveTo(28, 22, 27, 12);
      c.closePath(); // the blade, swept back
    },
    str: c => {
      c.moveTo(11, 12);
      c.quadraticCurveTo(9, 38, 27, 39);
      c.quadraticCurveTo(44, 39, 44, 12); // the guard
      arcL(c, 31, 22, 9, 2.2, 3.0);
      arcL(c, 31, 22, 13, 2.25, 2.95); // the pull
    },
    sw: 1.6,
    halo: c => {
      c.moveTo(32, 12);
      c.quadraticCurveTo(34, 24, 25, 31);
    },
  },
  multi: {
    // Burst Fire: three rounds in a line, one hard behind the other
    shape: c => {
      slug(c, 2, 24, 12, 8);
      slug(c, 17, 24, 12, 8);
      slug(c, 32, 24, 14, 9);
    },
    cut: c => {
      line(c, 7, 20, 7, 28);
      line(c, 22, 20, 22, 28);
      line(c, 37, 19.5, 37, 28.5);
    },
    extra: c => {
      rect(c, 4, 33, 7, 1.4);
      rect(c, 19, 33, 7, 1.4);
    },
  },
  pierce: {
    // AP Rounds: a pointed round punched clean through a steel plate
    shape: c => {
      poly(c, 17, 5, 29, 11, 29, 43, 17, 37); // the plate, at an angle
      c.moveTo(1, 21.5);
      c.lineTo(36, 21.5);
      c.lineTo(46, 24);
      c.lineTo(36, 26.5);
      c.lineTo(1, 26.5);
      c.closePath(); // the round, its steel penetrator out the far side
    },
    hole: c => {
      poly(c, 16, 19.5, 30, 19.5, 30, 20.6, 16, 20.6);
      poly(c, 16, 27.4, 30, 27.4, 30, 28.5, 16, 28.5);
    },
    cut: c => {
      line(c, 10, 21.5, 10, 26.5);
      line(c, 19, 9, 27, 13);
      line(c, 19, 39, 27, 41);
      line(c, 19, 14, 22, 19);
      line(c, 26, 33, 23, 29);
      line(c, 20, 33, 22, 29);
    },
  },
  bounce: {
    // Ricochet: a round's track glancing off the ground and on to the next
    shape: c => {
      rect(c, 3, 38, 42, 5); // the ground
      c.save();
      c.translate(40, 9);
      c.rotate(-1.05);
      slug(c, -6, 0, 12, 5.5);
      c.restore(); // the round, going on
    },
    str: c => line(c, 4, 5, 21, 36, 36, 14),
    sw: 2.2,
    dash: [3.4, 2.6],
    cut: c => {
      for (let x = 5; x < 45; x += 5) line(c, x, 43, x + 3, 38);
    },
    extra: c => {
      for (const [x, y] of [
        [15, 33],
        [26, 32],
        [21, 30.5],
      ])
        rect(c, x, y, 2, 2);
    }, // the spark off the ground
  },
  frag: {
    // Frangible Rounds: a round breaking apart into a spray of fragments
    shape: c => {
      slug(c, 2, 24, 18, 9);
      for (const [x, y, s] of [
        [24, 17, 3.2],
        [27, 25, 3.6],
        [24, 31, 2.8],
        [33, 13, 2.6],
        [35, 22, 2.8],
        [33, 34, 2.6],
        [41, 17, 2],
        [42, 28, 2.2],
        [40, 38, 1.8],
      ])
        poly(c, x, y - s, x + s, y, x, y + s, x - s * 0.7, y);
    },
    cut: c => line(c, 11, 19.5, 11, 28.5),
  },
  crit: {
    // Red Dot Sight: a tube sight from the front, its lens and the dot, on its mount
    shape: c => {
      ring(c, 24, 21, 16);
      rect(c, 15, 34, 18, 9); // the mount
      rr(c, 36, 8, 6, 7, 1); // the turret
    },
    hole: c => ring(c, 24, 21, 11.5),
    dot: c => ring(c, 24, 21, 2.8),
    cut: c => {
      for (let x = 17; x < 33; x += 3.5) line(c, x, 39, x, 43);
      line(c, 15, 39, 33, 39);
    },
  },
  arc: {
    // Incendiary Rounds: a round with the fire coming off its nose
    shape: c => {
      round(c, 15, 26, 44, 11, 10);
      flame(c, 31, 30, 26, 15);
    },
    hole: c => flame(c, 31, 27.5, 13, 7),
    cut: c => {
      line(c, 9.5, 26, 20.5, 26);
      line(c, 10, 40, 20, 40);
    },
  },
  choke: {
    // Tight Choke: a shotgun's muzzle, the shot leaving it in a narrow column
    shape: c => {
      rect(c, 2, 19, 20, 10); // the barrel
      rect(c, 20, 18, 5, 12); // the choke tube
      for (const [x, y] of [
        [31, 22],
        [31, 26],
        [36, 20.5],
        [36, 24],
        [36, 27.5],
        [41, 22],
        [41, 26],
        [45, 24],
      ])
        ring(c, x, y, 1.7);
    },
    hole: c => rect(c, 2, 22.5, 18, 3),
    cut: c => {
      line(c, 22.5, 18, 22.5, 30);
    },
  },
  quiet: {
    // Suppressor: the can, threaded onto a pistol's barrel
    shape: c => {
      rr(c, 12, 15, 34, 18, 3); // the can
      rect(c, 2, 20.5, 11, 7); // the barrel it threads onto
    },
    cut: c => {
      for (let x = 18; x < 44; x += 5) line(c, x, 16, x, 32);
      line(c, 12, 19, 46, 19);
    },
    hole: c => ring(c, 44, 24, 1.6),
  },
  ambush: {
    // Ambush: an eye that hasn't seen you, crossed out
    shape: c => {
      c.moveTo(3, 24);
      c.quadraticCurveTo(24, 3, 45, 24);
      c.quadraticCurveTo(24, 45, 3, 24);
      c.closePath();
    },
    hole: c => {
      c.moveTo(9, 24);
      c.quadraticCurveTo(24, 10, 39, 24);
      c.quadraticCurveTo(24, 38, 9, 24);
      c.closePath();
    },
    dot: c => ring(c, 24, 24, 6.5),
    str: c => line(c, 8, 41, 40, 7),
    sw: 3.6,
    halo: c => line(c, 8, 41, 40, 7), // the slash cut clear of the eye so it reads on its own
  },
  reload: {
    // Fast Hands: a magazine going in, a turn arrow round it
    shape: c => {
      c.moveTo(19, 6);
      c.lineTo(31, 6);
      c.lineTo(33, 32);
      c.lineTo(21, 34);
      c.closePath();
      rect(c, 19, 33, 16, 4); // base plate
      arrowHead(c, 40, 34, 1.9, 5);
    },
    str: c => arcL(c, 26, 24, 16, -2.6, 1.5),
    sw: 2.6,
    cut: c => {
      for (let y = 11; y < 31; y += 5) line(c, 21, y, 31.5, y + 0.5);
    },
    halo: c => arcL(c, 26, 24, 16, -2.6, 1.5),
  },
  mags: {
    // Extended Mags: a long curved magazine, its extension at the foot
    shape: c => {
      c.moveTo(14, 3);
      c.lineTo(25, 3);
      c.quadraticCurveTo(28, 22, 36, 36);
      c.lineTo(26, 41);
      c.quadraticCurveTo(17, 25, 14, 3);
      c.closePath();
      poly(c, 25.5, 40.5, 36.5, 35, 39, 40, 28, 45.5); // the extension pad
    },
    cut: c => {
      line(c, 26.6, 41.5, 36.3, 36.4);
      line(c, 15, 9, 24.5, 8.5);
    },
    dots: c => {
      for (let i = 0; i < 4; i++) {
        const t = 0.15 + i * 0.2;
        ring(c, 20 + t * 14, 8 + t * 28, 1.3);
      }
    }, // witness holes: the rounds counted in it
  },
  // ---- thrown and planted ----
  darts: {
    // Pipe Bombs: a capped pipe, the fuse lit
    shape: c => {
      rr(c, 6, 18, 30, 14, 2);
      rect(c, 3, 16, 6, 18); // end caps
      rect(c, 33, 16, 6, 18);
    },
    str: c => {
      c.moveTo(36, 16);
      c.quadraticCurveTo(38, 7, 44, 8);
    },
    sw: 1.8,
    cut: c => {
      line(c, 9, 25, 33, 25);
      line(c, 3, 20, 9, 20);
      line(c, 3, 30, 9, 30);
      line(c, 33, 20, 39, 20);
      line(c, 33, 30, 39, 30);
    },
    extra: c => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        rect(c, 44 + Math.cos(a) * 3.5 - 0.8, 7 + Math.sin(a) * 3.5 - 0.8, 1.6, 1.6);
      }
    }, // the spark
  },
  pulse: {
    // Stun Grenades: a flashbang canister, ported, its spoon and ring
    shape: c => {
      rr(c, 15, 14, 18, 30, 3);
      rect(c, 18, 9, 12, 6); // the fuze
      poly(c, 30, 10, 35, 12, 33, 30, 31, 30); // the spoon
    },
    str: c => ring(c, 13, 10, 3.5),
    sw: 1.8,
    hole: c => {
      for (let y = 19; y < 42; y += 6) {
        rr(c, 18, y, 4, 3, 1);
        rr(c, 26, y, 4, 3, 1);
      }
    },
  },
  molotov: {
    // Molotovs: the bottle, its rag alight
    shape: c => {
      c.moveTo(20, 18);
      c.lineTo(20, 22);
      c.quadraticCurveTo(13, 25, 13, 32);
      c.lineTo(13, 44);
      c.lineTo(31, 44);
      c.lineTo(31, 32);
      c.quadraticCurveTo(31, 25, 24, 22);
      c.lineTo(24, 18);
      c.closePath();
      flame(c, 22, 17, 16, 10);
    },
    hole: c => rect(c, 13, 34, 18, 1.2), // the fill line
    cut: c => {
      line(c, 20, 18, 24, 18);
      line(c, 16, 37, 28, 37);
    },
  },
  // ---- people and kit ----
  buddy: {
    // Backup: two survivors, shoulder to shoulder
    shape: c => {
      ring(c, 31, 14, 6);
      c.moveTo(20, 40);
      c.quadraticCurveTo(21, 23, 31, 23);
      c.quadraticCurveTo(42, 23, 43, 40);
      c.closePath();
      ring(c, 17, 17, 6.5);
      c.moveTo(4, 44);
      c.quadraticCurveTo(5, 27, 17, 27);
      c.quadraticCurveTo(29, 27, 30, 44);
      c.closePath();
    },
    halo: c => {
      ring(c, 17, 17, 6.5);
      c.moveTo(4, 44);
      c.quadraticCurveTo(5, 27, 17, 27);
      c.quadraticCurveTo(29, 27, 30, 44);
    }, // the one in front, cut clear of the one behind
  },
  hull: {
    // Plate Carrier: the vest, its plate and the webbing
    shape: c => {
      c.moveTo(13, 4);
      c.lineTo(19, 4);
      c.quadraticCurveTo(24, 12, 29, 4);
      c.lineTo(35, 4);
      c.lineTo(36, 14);
      c.lineTo(41, 18);
      c.lineTo(40, 44);
      c.lineTo(8, 44);
      c.lineTo(7, 18);
      c.lineTo(12, 14);
      c.closePath();
    },
    cut: c => {
      rr(c, 14, 17, 20, 16, 2); // the plate pocket
      for (let y = 36; y < 43; y += 3) line(c, 10, y, 38, y); // MOLLE webbing
      line(c, 12, 14, 36, 14);
    },
  },
  regen: {
    // Field Medkit: the pouch, its cross
    shape: c => {
      rr(c, 5, 13, 38, 28, 4);
      rr(c, 17, 7, 14, 7, 2); // the handle loop
    },
    hole: c => {
      rect(c, 21, 17, 6, 20);
      rect(c, 14, 24, 20, 6);
      rr(c, 20, 9, 8, 3, 1);
    },
    cut: c => line(c, 5, 19, 43, 19),
  },
  leech: {
    // Adrenaline: an auto-injector, its cap off
    shape: c => {
      rr(c, 6, 18, 28, 12, 3); // the body
      rect(c, 2, 20, 5, 8); // the safety cap end
      poly(c, 34, 20.5, 40, 22.5, 40, 25.5, 34, 27.5); // the tip
      rect(c, 40, 23.3, 6, 1.4); // the needle
    },
    hole: c => rr(c, 12, 21, 12, 6, 1.5), // the window
    cut: c => {
      line(c, 28, 18, 28, 30);
      line(c, 7, 18, 7, 30);
    },
    dot: c => {
      line(c, 13, 24, 16, 24, 17.5, 21.5, 19.5, 26.5, 21, 24, 23, 24);
    }, // a heartbeat in the window
    dotStroke: 1.2,
  },
  speed: {
    // Running Shoes: a trainer, side on, speed lines behind
    shape: c => {
      c.moveTo(12, 14);
      c.lineTo(22, 14);
      c.quadraticCurveTo(24, 22, 32, 24);
      c.quadraticCurveTo(44, 26, 46, 33);
      c.lineTo(46, 36);
      c.lineTo(12, 36);
      c.closePath();
      rr(c, 11, 36, 36, 5, 2); // the sole
    },
    cut: c => {
      line(c, 12, 30, 46, 30);
      for (let i = 0; i < 3; i++) line(c, 22 + i * 3, 19 + i * 1.6, 27 + i * 3, 17 + i * 1.6); // the laces
      line(c, 14, 38.5, 44, 38.5);
    },
    extra: c => {
      for (const [y, l] of [
        [18, 7],
        [25, 9],
        [32, 6],
      ])
        rect(c, 1, y, l, 1.6);
    },
  },
  dash: {
    // Cardio: a roll, the arrow turning over itself
    shape: c => {
      arrowHead(c, 37, 32, 1.2, 6);
      ring(c, 24, 24, 4);
    },
    str: c => arcL(c, 24, 24, 13, 3.6, 3.6 + TAU * 0.8),
    sw: 3.4,
    extra: c => {
      for (const [y, l] of [
        [36, 8],
        [41, 12],
      ])
        rect(c, 2, y, l, 1.6);
    },
  },
  magnet: {
    // Long Reach: a hand reaching out, a box drawn in to it
    shape: c => {
      rr(c, 6, 20, 13, 14, 3); // the palm
      for (const [y, l] of [
        [20, 14],
        [24, 15],
        [28, 14],
        [32, 11],
      ])
        rr(c, 15, y, l, 3.2, 1.6); // the fingers, reaching
      poly(c, 9, 20, 15, 13, 18, 15, 14, 21); // the thumb
      rr(c, 36, 17, 10, 8, 1); // the ammo box
    },
    str: c => line(c, 32, 21, 34.5, 21),
    sw: 1.4,
    cut: c => line(c, 36, 20, 46, 20),
  },
  wind: {
    // Second Wind: a heart nearly empty, filling back up
    shape: c => {
      heart(c, 22, 24, 17);
      arrowHead(c, 41, 8, -Math.PI / 2, 5);
      rect(c, 39.8, 9, 2.4, 14);
    },
    hole: c => {
      c.save();
      c.beginPath();
      rect(c, 0, 0, 48, 30);
      c.clip();
      c.beginPath();
      heart(c, 22, 24.5, 13.5);
      c.fill();
      c.restore();
    }, // only the bottom of it still full
  },
  scav: {
    // Scavenger: an ammo can, its lid latched and handle up
    shape: c => {
      rr(c, 5, 16, 38, 26, 2);
      rect(c, 4, 13, 40, 5); // the lid
    },
    str: c => {
      c.moveTo(16, 13);
      c.lineTo(17, 8);
      c.lineTo(31, 8);
      c.lineTo(32, 13);
    },
    sw: 2.4,
    cut: c => {
      line(c, 4, 18, 44, 18);
      rr(c, 37, 18, 5, 10, 1); // the latch
      rr(c, 11, 24, 18, 11, 1); // the stencil plate
    },
  },
  // ---- the characters' abilities: the object, with a badge added for each of the two picks ----
  mortar: {
    // Mortar strike: a mortar round, fins at the tail
    shape: c => {
      c.moveTo(24, 3);
      c.quadraticCurveTo(33, 9, 33, 20);
      c.lineTo(31, 31);
      c.lineTo(17, 31);
      c.lineTo(15, 20);
      c.quadraticCurveTo(15, 9, 24, 3);
      c.closePath();
      rect(c, 21, 31, 6, 9);
      poly(c, 21, 33, 14, 44, 21, 42);
      poly(c, 27, 33, 34, 44, 27, 42);
    },
    cut: c => {
      line(c, 15.5, 17, 32.5, 17);
      line(c, 16, 21, 32, 21);
      line(c, 21, 36, 27, 36);
    },
  },
  flashbang: {
    // Flashbang: the canister, ported, the burst of light off it
    shape: c => {
      rr(c, 16, 16, 16, 28, 3);
      rect(c, 19, 11, 10, 6);
      poly(c, 29, 12, 33, 14, 31, 30, 29.5, 30);
    },
    hole: c => {
      for (let y = 21; y < 42; y += 6) {
        rr(c, 19, y, 3.5, 3, 1);
        rr(c, 26, y, 3.5, 3, 1);
      }
    },
    extra: c => {
      for (const a of [-2.6, -2.1, -1.57, -1.05, -0.55]) {
        const x = 24 + Math.cos(a) * 15,
          y = 26 + Math.sin(a) * 18;
        c.save();
        c.translate(x, y);
        c.rotate(a);
        c.rect(0, -0.9, 5, 1.8);
        c.restore();
      }
    },
  },
  fan: {
    // Fan the hammer: a revolver's cylinder, end on, its six chambers
    shape: c => ring(c, 24, 24, 18),
    hole: c => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2;
        ring(c, 24 + Math.cos(a) * 10.5, 24 + Math.sin(a) * 10.5, 4.4);
      }
      ring(c, 24, 24, 2.2);
    },
    cut: c => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2 + Math.PI / 6;
        line(c, 24 + Math.cos(a) * 15, 24 + Math.sin(a) * 15, 24 + Math.cos(a) * 18, 24 + Math.sin(a) * 18);
      }
    }, // the bolt notches
  },
  claymore: {
    // Claymore: the curved mine on its scissor legs
    shape: c => {
      c.moveTo(4, 14);
      c.quadraticCurveTo(24, 22, 44, 14);
      c.lineTo(44, 30);
      c.quadraticCurveTo(24, 38, 4, 30);
      c.closePath();
      poly(c, 10, 31, 12.5, 32, 7, 44, 4.5, 43);
      poly(c, 38, 31, 35.5, 32, 41, 44, 43.5, 43);
      rect(c, 21, 9, 6, 9); // the detonator well
    },
    cut: c => {
      c.moveTo(8, 22);
      c.quadraticCurveTo(24, 29, 40, 22);
    },
  },
  flare: {
    // Road flare: the stick, burning at one end
    shape: c => {
      c.save();
      c.translate(24, 26);
      c.rotate(-0.75);
      rr(c, -18, -4, 26, 8, 2);
      rect(c, -20, -3, 3, 6);
      c.restore();
      flame(c, 34, 22, 18, 11);
    },
    cut: c => {
      c.save();
      c.translate(24, 26);
      c.rotate(-0.75);
      line(c, -12, -4, -12, 4);
      line(c, -2, -4, -2, 4);
      c.restore();
    },
  },
  dynamite: {
    // Dynamite: three sticks taped together, the fuse lit
    shape: c => {
      for (const x of [10, 19, 28]) rr(c, x, 16, 9, 28, 2);
    },
    str: c => {
      c.moveTo(23.5, 16);
      c.quadraticCurveTo(24, 6, 33, 6);
    },
    sw: 1.8,
    cut: c => {
      line(c, 19, 16, 19, 44);
      line(c, 28, 16, 28, 44);
      rect(c, 9, 22, 29, 4);
      rect(c, 9, 34, 29, 4);
    },
    extra: c => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        rect(c, 35 + Math.cos(a) * 3.5 - 0.8, 6 + Math.sin(a) * 3.5 - 0.8, 1.6, 1.6);
      }
    },
  },
  // ---- the combos ----
  inferno: {
    // Inferno: a fire that has got going: one big flame with another inside it
    shape: c => {
      flame(c, 24, 44, 40, 26);
      rect(c, 6, 42, 36, 3); // the ground it's on
    },
    hole: c => flame(c, 24, 40, 22, 13),
    dot: c => flame(c, 24, 39, 12, 6),
  },
  dtap: {
    // Double Tap: two rounds side by side, fired as one
    shape: c => {
      round(c, 17, 18, 42, 11, 11);
      round(c, 31, 18, 42, 11, 11);
    },
    cut: c => {
      line(c, 11.5, 18, 22.5, 18);
      line(c, 25.5, 18, 36.5, 18);
      line(c, 12, 38, 22, 38);
      line(c, 26, 38, 36, 38);
    },
  },
  hose: {
    // Bullet Hose: the SMG, its rounds spraying out
    gun: 'smg',
    shape: c => {
      for (const [x, y, a] of [
        [30, 32, 0.1],
        [37, 36, 0.35],
        [26, 40, 0.5],
        [40, 43, 0.6],
      ]) {
        c.save();
        c.translate(x, y);
        c.rotate(a);
        slug(c, -3.5, 0, 7.5, 3.6);
        c.restore();
      }
    },
  },
  marks: {
    // Marksman: a scope's reticle, its mil dots
    shape: c => ring(c, 24, 24, 20),
    hole: c => ring(c, 24, 24, 16.5),
    dot: c => {
      rect(c, 4, 23.2, 15, 1.6);
      rect(c, 29, 23.2, 15, 1.6);
      rect(c, 23.2, 4, 1.6, 15);
      rect(c, 23.2, 29, 1.6, 15);
      for (const d of [-9, -5, 5, 9]) {
        ring(c, 24 + d, 24, 1.1);
        ring(c, 24, 24 + d, 1.1);
      }
    },
  },
  oneshot: {
    // One Shot: a reticle on one long rifle round
    shape: c => {
      ring(c, 24, 24, 20);
      round(c, 24, 20, 40, 7, 12, true);
    },
    hole: c => {
      ring(c, 24, 24, 17);
    },
    dot: c => {
      round(c, 24, 21, 39, 7, 13);
      rect(c, 4, 23.2, 7, 1.6);
      rect(c, 37, 23.2, 7, 1.6);
      rect(c, 23.2, 2, 1.6, 6);
    },
  },
  cowboy: {
    // Cowboy Reload: the lever-action, its lever swung right round
    gun: 'lever',
    gunBox: [0, 6, 48, 19],
    shape: c => arrowHead(c, 28.5, 25.5, -0.9, 4.5),
    str: c => arcL(c, 17, 22, 11, 0.55, 2.9),
    sw: 2.4,
  },
  walkfire: {
    // Walking Fire: the machine gun, firing on the move
    gun: 'lmg',
    gunBox: [7, 12, 41, 17],
    shape: c => {
      for (const [y, l] of [
        [15, 7],
        [21, 9],
        [27, 6],
      ])
        rect(c, 0, y, l, 1.6);
      for (const [x, y] of [
        [30, 36],
        [36, 40],
        [42, 36],
      ])
        rect(c, x, y, 3, 1.6);
    }, // speed lines behind it, its brass falling
  },
  airburst: {
    // Airburst: a 40 mm grenade, the ring of its burst above
    shape: c => {
      rect(c, 15, 30, 18, 14); // the case
      c.moveTo(15, 30);
      c.quadraticCurveTo(15, 18, 24, 17);
      c.quadraticCurveTo(33, 18, 33, 30);
      c.closePath(); // the warhead
    },
    str: c => arcL(c, 24, 18, 15, Math.PI + 0.25, TAU - 0.25),
    sw: 2,
    cut: c => {
      line(c, 15, 30, 33, 30);
      line(c, 15, 40, 33, 40);
    },
    extra: c => {
      for (const a of [-2.8, -2.2, -1.57, -0.94, -0.34]) {
        const x = 24 + Math.cos(a) * 20,
          y = 18 + Math.sin(a) * 15;
        rect(c, x - 1.1, y - 1.1, 2.2, 2.2);
      }
    },
  },
  tempest: {
    // Dragon's Breath: a shotgun shell, a cone of fire roaring out of it
    shape: c => {
      rect(c, 3, 18, 16, 12); // the hull
      rect(c, 1, 17, 5, 14); // the brass head
      poly(c, 19, 21, 46, 7, 40, 14, 47, 19, 40, 24, 47, 29, 40, 34, 46, 41, 19, 27);
    },
    hole: c => poly(c, 24, 23, 39, 15, 35, 20, 40, 24, 35, 28, 39, 33, 24, 25),
    cut: c => {
      line(c, 6, 17, 6, 31);
      for (let x = 9; x < 18; x += 3) line(c, x, 18, x, 30);
    },
  },
  overclock: {
    // Gunsmith: a wrench across a round
    shape: c => {
      c.save();
      c.translate(24, 24);
      c.rotate(-Math.PI / 4);
      rr(c, -18, -3, 30, 6, 2);
      ring(c, 15, 0, 7);
      c.restore();
      c.save();
      c.translate(24, 24);
      c.rotate(Math.PI / 4);
      round(c, 0, -4, 17, 7, 10);
      c.restore();
    },
    hole: c => {
      c.save();
      c.translate(24, 24);
      c.rotate(-Math.PI / 4);
      rect(c, 13, -2.5, 10, 5); // the jaw
      c.restore();
    },
  },
  nova: {
    // Combat Medic: the cross, light bursting off it
    shape: c => {
      rect(c, 19, 9, 10, 30);
      rect(c, 9, 19, 30, 10);
    },
    extra: c => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + Math.PI / 8;
        c.save();
        c.translate(24 + Math.cos(a) * 19, 24 + Math.sin(a) * 19);
        c.rotate(a);
        c.rect(0, -1, 4.5, 2);
        c.restore();
      }
    },
    cut: c => {
      line(c, 21.5, 11.5, 26.5, 11.5);
    },
  },
  swarm: {
    // Demolition Crew: a survivor, a pipe bomb in hand
    shape: c => {
      ring(c, 18, 13, 6.5);
      c.moveTo(4, 44);
      c.quadraticCurveTo(5, 23, 18, 23);
      c.quadraticCurveTo(31, 23, 32, 44);
      c.closePath();
      c.save();
      c.translate(36, 24);
      c.rotate(-0.6);
      rr(c, -4, -9, 8, 18, 1.5);
      rect(c, -5, -10, 10, 3);
      rect(c, -5, 7, 10, 3);
      c.restore();
    },
    str: c => {
      c.moveTo(41, 15);
      c.quadraticCurveTo(42, 8, 46, 6);
    },
    sw: 1.6,
    halo: c => {
      c.save();
      c.translate(36, 24);
      c.rotate(-0.6);
      rr(c, -4, -9, 8, 18, 1.5);
      c.restore();
    },
  },
  speedload: {
    // Speed Loader: six rounds held round a knob, ready to drop in
    shape: c => {
      ring(c, 24, 24, 17);
      rect(c, 20, 2, 8, 6); // the knob
    },
    hole: c => ring(c, 24, 24, 2),
    dot: c => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2;
        ring(c, 24 + Math.cos(a) * 10, 24 + Math.sin(a) * 10, 3.6);
      }
    },
    dotCut: true, // the rounds' heads, ringed so they stand out on the loader
  },
  storm: {
    // Buck and Ball: a shotgun shell, the ball and the buckshot leaving it
    shape: c => {
      rect(c, 3, 18, 16, 12);
      rect(c, 1, 17, 5, 14);
      ring(c, 29, 24, 6);
      for (const [x, y] of [
        [39, 15],
        [41, 24],
        [39, 33],
        [45, 19],
        [45, 29],
      ])
        ring(c, x, y, 2.2);
    },
    cut: c => {
      line(c, 6, 17, 6, 31);
      for (let x = 9; x < 19; x += 3) line(c, x, 18, x, 30);
    },
  },
};
// the badges on a character's two skill picks
const BADGE = {
  cd: c => {
    ring(c, 38, 38, 8);
    rect(c, 36.5, 27, 3, 3);
  }, // a stopwatch
  up: c => {
    poly(c, 30, 42, 38, 33, 46, 42, 42, 42, 38, 38, 34, 42);
    poly(c, 30, 47, 38, 38, 46, 47, 42, 47, 38, 43, 34, 47);
  }, // a double chevron
};
const CACHE = {};
// an icon canvas s × s (CSS px, at the screen's density), in colour col; badge 'cd' or 'up' for the skill picks
export function perkIcon(id, s, col = '#f2ead8', badge = null) {
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1),
    key = `${id}|${s}|${col}|${badge}|${dpr}`;
  if (CACHE[key]) return CACHE[key];
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.round(s * dpr);
  const c = cv.getContext('2d'),
    k = cv.width / 48,
    D = P[id];
  if (!D) return cv;
  c.scale(k, k);
  if (badge) {
    c.save();
    c.beginPath();
    c.rect(0, 0, 48, 48);
    ring(c, 38, 38, badge === 'cd' ? 12 : 12.5);
    c.clip('evenodd');
  } // room for the badge in the corner
  if (D.gun) {
    const [gx, gy, gw, gh] = D.gunBox || [0, 3, 48, 19];
    c.drawImage(icon(D.gun, 96, 38, col), gx, gy, gw, gh);
  } // a gun's own combo: the gun, as the wheel draws it
  c.fillStyle = col;
  c.strokeStyle = col;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  D.shape(c);
  c.fill();
  if (D.str) {
    c.lineWidth = D.sw || 2.4;
    if (D.dash) c.setLineDash(D.dash);
    c.beginPath();
    D.str(c);
    c.stroke();
    c.setLineDash([]);
  }
  if (D.extra) {
    c.beginPath();
    D.extra(c);
    c.fill();
  }
  c.globalCompositeOperation = 'destination-out';
  if (D.halo) {
    c.lineWidth = (D.sw || 2.4) + 3.2;
    c.beginPath();
    D.halo(c);
    c.stroke();
  } // a gap round the front part, so overlapping shapes stay readable
  if (D.hole) {
    c.beginPath();
    D.hole(c);
    c.fill();
  }
  if (D.cut) {
    c.lineWidth = 0.9;
    c.beginPath();
    D.cut(c);
    c.stroke();
  }
  if (D.dotCut && D.dot) {
    c.lineWidth = 1.2;
    c.beginPath();
    D.dot(c);
    c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  if (D.halo) {
    c.lineWidth = D.sw || 2.4;
    c.beginPath();
    if (id === 'buddy') {
      D.halo(c);
      c.fill();
    } else if (id === 'swarm') {
      D.halo(c);
      c.fill();
    } else {
      D.halo(c);
      c.stroke();
    }
  }
  if (D.dot && !D.dotCut) {
    c.beginPath();
    D.dot(c);
    if (D.dotStroke) {
      c.lineWidth = D.dotStroke;
      c.stroke();
    } else c.fill();
  } // the bit that sits inside an opening: the red dot, the pupil, the heartbeat
  if (D.dots) {
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    D.dots(c);
    c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  c.globalCompositeOperation = 'source-atop';
  {
    const g = c.createLinearGradient(0, 0, 0, 48);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    c.fillStyle = g;
    c.fillRect(0, 0, 48, 48);
  } // lit from above, like the guns
  c.globalCompositeOperation = 'source-over';
  if (badge) {
    c.restore();
    c.fillStyle = col;
    c.strokeStyle = col;
    c.beginPath();
    BADGE[badge](c);
    c.fill();
    if (badge === 'cd') {
      c.globalCompositeOperation = 'destination-out';
      c.beginPath();
      ring(c, 38, 38, 6);
      c.fill();
      c.globalCompositeOperation = 'source-over';
      c.lineWidth = 1.6;
      c.beginPath();
      line(c, 38, 38, 38, 33.5);
      line(c, 38, 38, 41.5, 39.5);
      c.stroke();
    }
  }
  return (CACHE[key] = cv);
}
export const PERK_ICONS = Object.keys(P);
