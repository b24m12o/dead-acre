/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: the street's small life (world/life.js), from above, at twice life size (the street's 20 units to the
// metre). A crow (0.45 m nose to tail): its body with the wings folded, facing +x (crow), and one wing spread, its root
// at the left, its tip at the right and its leading edge up (cwing: the other is this one mirrored); black, with the
// blue-violet sheen crows have. A rat, facing +x, its tail behind (rat). A sheet of newspaper (sheet). A drag smear
// (smear), white, to be tinted. A crazed pane (wcrack), white, laid over a window.
// A pane broken out (wbroke_b, wbroke_c), laid over a 3D wall block's window.
import { ell, region } from '../atlas.js';

export function paintStreetLife() {
  region(
    'crow',
    18,
    8,
    a => {
      // the tail, a fan of long feathers behind
      a.fillStyle = '#0d0d11';
      a.beginPath();
      a.moveTo(-3.5, -1.3);
      a.lineTo(-8.6, -2.1);
      a.quadraticCurveTo(-9.2, 0, -8.6, 2.1);
      a.lineTo(-3.5, 1.3);
      a.closePath();
      a.fill();
      // the body and the folded wings over it, their primaries crossed over the tail
      ell(a, 0.2, 0, 4.6, 2.5);
      a.fillStyle = '#101014';
      a.fill();
      a.fillStyle = '#16161c';
      for (const s of [1, -1]) {
        a.beginPath();
        a.moveTo(2.6, s * 0.6);
        a.quadraticCurveTo(0.5, s * 2.9, -4.8, s * 1.2);
        a.lineTo(-6.6, s * 0.2);
        a.quadraticCurveTo(-1.5, s * 0.9, 2.6, s * 0.6);
        a.fill();
      }
      // the sheen along the back, and the head and its heavy beak
      ell(a, 0.4, -0.6, 2.8, 0.7, -0.08);
      a.fillStyle = 'rgba(70,78,110,0.3)';
      a.fill();
      ell(a, 5.0, 0, 1.7, 1.45);
      a.fillStyle = '#0e0e12';
      a.fill();
      a.fillStyle = '#1c1c20';
      a.beginPath();
      a.moveTo(6.2, -0.55);
      a.lineTo(8.6, -0.05);
      a.lineTo(8.6, 0.12);
      a.lineTo(6.2, 0.6);
      a.closePath();
      a.fill();
      ell(a, 5.3, -0.75, 0.25, 0.22);
      a.fillStyle = 'rgba(160,170,200,0.5)';
      a.fill();
    },
    0.55,
    1,
    0
  );
  region(
    'cwing',
    12,
    7,
    a => {
      // one wing spread: broad at the root, the hand's long primaries splayed like fingers at the tip
      a.fillStyle = '#0f0f13';
      a.beginPath();
      a.moveTo(-5.8, -1.4);
      a.quadraticCurveTo(-1, -2.6, 3.2, -1.8);
      for (let k = 0; k < 5; k++) {
        const y = -1.8 + k * 0.9;
        a.lineTo(5.8 - k * 0.45, y);
        a.lineTo(3.4 - k * 0.25, y + 0.45);
      }
      a.quadraticCurveTo(0, 2.9, -5.8, 2.0);
      a.closePath();
      a.fill();
      // the coverts' paler sheen along its leading edge
      ell(a, -1.6, -0.9, 3.4, 0.8, 0.05);
      a.fillStyle = 'rgba(64,70,100,0.25)';
      a.fill();
    },
    0.5,
    1,
    0
  );
  region(
    'rat',
    16,
    6,
    a => {
      // the tail, long and bare, in a lazy curve behind
      a.strokeStyle = '#8a6a62';
      a.lineWidth = 0.7;
      a.lineCap = 'round';
      a.beginPath();
      a.moveTo(-2.5, 0);
      a.bezierCurveTo(-4.5, 0.2, -5.5, 1.6, -7.6, 1.2);
      a.stroke();
      // the body, a hunched pear, the head tapering to its snout; grey-brown fur, darker down its back
      a.fillStyle = '#4a4038';
      a.beginPath();
      a.moveTo(-3.2, 0);
      a.bezierCurveTo(-3.2, -2.1, 1.0, -2.2, 2.6, -1.1);
      a.quadraticCurveTo(4.8, -0.4, 6.2, 0);
      a.quadraticCurveTo(4.8, 0.4, 2.6, 1.1);
      a.bezierCurveTo(1.0, 2.2, -3.2, 2.1, -3.2, 0);
      a.fill();
      ell(a, -0.4, 0, 2.4, 0.7);
      a.fillStyle = 'rgba(30,25,22,0.6)';
      a.fill();
      for (const s of [1, -1]) {
        ell(a, 3.4, s * 0.95, 0.55, 0.45); // its ears
        a.fillStyle = '#6a5550';
        a.fill();
      }
      ell(a, 6.1, 0, 0.3, 0.25);
      a.fillStyle = '#c08a84';
      a.fill();
    },
    0.4,
    1,
    0
  );
  region(
    'sheet',
    10,
    8,
    a => {
      // a page of a newspaper: yellowed, a fold down its middle, its columns of print and a headline, a photo
      a.fillStyle = '#d8d2c0';
      a.fillRect(-4.6, -3.6, 9.2, 7.2);
      a.fillStyle = 'rgba(0,0,0,0.12)';
      a.fillRect(-0.15, -3.6, 0.3, 7.2);
      a.fillStyle = '#3a3a3a';
      a.fillRect(-4.1, -3.2, 8.2, 0.9);
      a.fillStyle = 'rgba(40,40,40,0.55)';
      for (let c = 0; c < 4; c++)
        for (let l = 0; l < 9; l++) if (!(c === 2 && l < 4)) a.fillRect(-4.1 + c * 2.1, -1.8 + l * 0.55, 1.8, 0.22);
      a.fillStyle = '#7a7670';
      a.fillRect(0.1, -1.8, 1.8, 2.0);
    },
    0.2,
    1,
    0
  ); // a smear on the ground (white: tinted when it's laid), along +x: what a body dragging itself along leaves, heavy at
  // its leading end, thinning and broken behind, streaked lengthwise by fingers and clothes
  region(
    'smear',
    24,
    8,
    a => {
      for (let i = 0; i < 26; i++) {
        const f = i / 25,
          x = 10.5 - f * 21,
          w = 3.6 * (1 - f * 0.45) + Math.sin(i * 1.7) * 0.3;
        a.fillStyle = `rgba(255,255,255,${(0.75 - 0.5 * f) * (0.8 + 0.2 * Math.sin(i * 2.3))})`;
        a.beginPath();
        a.ellipse(x, Math.sin(i * 0.6) * 0.3, 0.9, w, 0, 0, Math.PI * 2);
        a.fill();
      }
      a.fillStyle = 'rgba(255,255,255,0.35)';
      for (const y of [-2.6, -1.4, -0.3, 0.9, 2.2])
        a.fillRect(-10.5 + Math.abs(y) * 1.5, y, 19 - Math.abs(y) * 2.5, 0.35);
    },
    0.2,
    1,
    0
  );
  // a pane crazed by blows (white: drawn over a window, catching the light): long cracks running out from where the
  // blows landed, rings of short ones round it, a little star of shatter at its heart
  region(
    'wcrack',
    28,
    22,
    a => {
      a.strokeStyle = 'rgba(255,255,255,0.9)';
      a.lineCap = 'round';
      let s = 7;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < 11; k++) {
        let x = 0,
          y = 0,
          g = (k / 11) * Math.PI * 2 + rnd() * 0.4;
        a.lineWidth = 0.35;
        a.beginPath();
        a.moveTo(0, 0);
        for (let j = 0; j < 5; j++) {
          x += Math.cos(g) * (1.6 + rnd() * 1.6);
          y += Math.sin(g) * (1.3 + rnd() * 1.2);
          g += (rnd() - 0.5) * 0.7;
          a.lineTo(x, y);
        }
        a.stroke();
      }
      for (const r of [2.2, 4.4]) {
        a.lineWidth = 0.25;
        a.beginPath();
        for (let k = 0; k <= 16; k++) {
          const t = (k / 16) * Math.PI * 2,
            rr = r * (0.8 + rnd() * 0.4);
          if (rnd() < 0.3) a.moveTo(Math.cos(t) * rr * 1.2, Math.sin(t) * rr);
          else a.lineTo(Math.cos(t) * rr * 1.2, Math.sin(t) * rr);
        }
        a.stroke();
      }
      a.fillStyle = 'rgba(255,255,255,0.55)';
      a.beginPath();
      a.arc(0, 0, 0.9, 0, Math.PI * 2);
      a.fill();
    },
    0.2,
    1,
    0
  );
  // a pane broken out of its window, to lay over the glass of a wall's 3D block (its own broken face is painted with
  // the walls): the dark of the room behind, teeth of glass left in the corners of the frame, a glint on their edges.
  // Brick's window pane, and a shop's wider one
  for (const [n, w, h] of [
    ['wbroke_b', 15, 12],
    ['wbroke_c', 25, 11],
  ])
    region(
      n,
      w + 2,
      h + 2,
      a => {
        let s = w * 31 + h;
        const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647,
          x0 = -w / 2,
          y0 = -h / 2;
        a.fillStyle = '#0a0807';
        a.fillRect(x0, y0, w, h);
        a.fillStyle = 'rgba(40,30,26,0.8)'; // (a little of the room: something dark against the back)
        a.fillRect(x0 + w * 0.15, y0 + h * 0.45, w * 0.35, h * 0.5);
        for (const [cx, cy, sx, sy] of [
          [x0, y0, 1, 1],
          [x0 + w, y0, -1, 1],
          [x0, y0 + h, 1, -1],
          [x0 + w, y0 + h, -1, -1],
        ]) {
          const tx = cx + sx * (1.5 + rnd() * w * 0.22),
            ty = cy + sy * (1.5 + rnd() * h * 0.3);
          if (rnd() < 0.25) continue; // (a corner clean out)
          a.fillStyle = 'rgba(95,115,125,0.7)';
          a.beginPath();
          a.moveTo(cx, cy);
          a.lineTo(tx, cy);
          a.lineTo(cx + sx * (1 + rnd() * 2.5), cy + sy * (1 + rnd() * 2.5));
          a.lineTo(cx, ty);
          a.closePath();
          a.fill();
          a.strokeStyle = 'rgba(210,225,232,0.75)';
          a.lineWidth = 0.25;
          a.beginPath();
          a.moveTo(tx, cy);
          a.lineTo(cx + sx * (1 + rnd() * 2.5), cy + sy * (1 + rnd() * 2.5));
          a.stroke();
        }
      },
      0.1,
      1,
      0
    );
  // you, among the others: a thin ring on the ground round your feet, and a short tick on it where you aim (it is
  // turned to your aim when it's drawn: render.js). White, to be tinted; its glow the same, faint, so it reads at night
  region(
    'you_ring',
    64,
    64,
    (a, e) => {
      for (const [c, w, al] of [
        [a, 1.5, 0.95],
        [e, 2.6, 0.55],
      ]) {
        c.strokeStyle = `rgba(255,255,255,${al})`;
        c.lineWidth = w;
        c.beginPath();
        c.arc(0, 0, 26, 0.16, Math.PI * 2 - 0.16); // (a gap where the tick is)
        c.stroke();
        c.fillStyle = `rgba(255,255,255,${al})`;
        c.beginPath();
        c.moveTo(31.5, 0);
        c.lineTo(25, -4.2);
        c.lineTo(26.6, 0);
        c.lineTo(25, 4.2);
        c.closePath();
        c.fill();
      }
    },
    0,
    1,
    0
  );
}
