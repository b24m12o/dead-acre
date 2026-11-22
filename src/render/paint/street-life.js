/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: the street's small life (world/life.js), from above, at twice life size (the street's 20 units to the
// metre). A crow (0.45 m nose to tail): its body with the wings folded, facing +x (crow), and one wing spread, its root
// at the left, its tip at the right and its leading edge up (cwing: the other is this one mirrored); black, with the
// blue-violet sheen crows have. A rat, facing +x, its tail behind (rat). A sheet of newspaper (sheet). A drag smear
// (smear), white, to be tinted.
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
      for (const y of [-2.6, -1.4, -0.3, 0.9, 2.2]) a.fillRect(-10.5 + Math.abs(y) * 1.5, y, 19 - Math.abs(y) * 2.5, 0.35);
    },
    0.2,
    1,
    0
  );
}
