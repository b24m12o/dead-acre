/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: a crow from above, life size (about 0.45 m nose to tail; the street's 20 units to the metre): its body
// with the wings folded, facing +x (crow), and one wing spread, its root at the left, its tip at the right and its
// leading edge up (cwing: the other wing is this one mirrored). Black, with the blue-violet sheen crows have.
import { ell, region } from '../atlas.js';

export function paintBirds() {
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
}
