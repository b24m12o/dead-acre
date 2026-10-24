/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: street props: the 3D pictures and the stacked top-view slices they replace
import { circ, grad, region, rgrad, rr, shape } from '../atlas.js';
import { O_SIZES } from '../bake.js';
import { TAU, pick, rand } from '../../core/util.js';
export function paintStreet() {
  /* ----- street props as 3D pictures, seen at the game's angle (shapes/props.js); the sliced versions below are the fallback ----- */
  for (const [n, [w, h]] of Object.entries(O_SIZES)) region(n, w, h, () => {}, 0.3, 0.4, 0.8);
  /* ----- street props (top view slices, stacked when drawn) ----- */
  region(
    'p_hydrant',
    16,
    16,
    a => {
      shape(
        a,
        c => circ(c, 0, 0, 6),
        rgrad(
          a,
          0,
          0,
          7,
          [
            [0, '#e04a3a'],
            [1, '#8a1a12'],
          ],
          -2,
          -2
        ),
        { lw: 1.4 }
      );
      for (const s of [-1, 1]) shape(a, c => rr(c, s * 6 - 2, -2, 4, 4, 1), '#c0392b', { lw: 1 });
      shape(a, c => circ(c, 0, 0, 2.6), '#d8c040', { lw: 0.8 });
    },
    0.6,
    0.6,
    0.6
  );
  region(
    'p_mailbox',
    18,
    16,
    a => {
      shape(
        a,
        c => rr(c, -7, -6, 14, 12, 5),
        grad(a, 0, -6, 0, 6, [
          [0, '#3a5aa8'],
          [1, '#1a2a6a'],
        ]),
        { lw: 1.4 }
      );
      a.fillStyle = '#e8e4d8';
      a.fillRect(-4, -1, 8, 2);
    },
    0.6,
    0.6,
    0.6
  );
  region(
    'p_trash',
    18,
    18,
    a => {
      shape(
        a,
        c => circ(c, 0, 0, 7.5),
        rgrad(
          a,
          0,
          0,
          8,
          [
            [0, '#8a8c90'],
            [1, '#4a4c50'],
          ],
          -2,
          -2
        ),
        { lw: 1.4 }
      );
      a.strokeStyle = 'rgba(0,0,0,0.35)';
      a.lineWidth = 0.8;
      a.beginPath();
      a.arc(0, 0, 5, 0, TAU);
      a.stroke();
      shape(a, c => rr(c, -3, -1, 6, 2, 1), '#3a3c40', { lw: 0.6 });
    },
    0.6,
    0.5,
    0.6
  );
  region(
    'p_dumpster',
    44,
    30,
    a => {
      shape(
        a,
        c => rr(c, -20, -12, 40, 24, 2),
        grad(a, 0, -12, 0, 12, [
          [0, '#3a6a3a'],
          [1, '#1e3a1e'],
        ]),
        { lw: 2 }
      );
      a.strokeStyle = 'rgba(0,0,0,0.35)';
      a.lineWidth = 1;
      for (let x = -14; x <= 14; x += 7) {
        a.beginPath();
        a.moveTo(x, -12);
        a.lineTo(x, 12);
        a.stroke();
      }
      a.fillStyle = 'rgba(200,200,190,0.5)';
      a.fillRect(-18, -2, 8, 4);
      a.fillStyle = '#5a4030';
      a.fillRect(4, -10, 12, 4);
    },
    0.4,
    0.4,
    0.8
  );
  region(
    'p_cone',
    14,
    14,
    a => {
      shape(a, c => rr(c, -6, -6, 12, 12, 2), '#2a2a2a', { lw: 1 });
      shape(
        a,
        c => circ(c, 0, 0, 5),
        rgrad(a, 0, 0, 5, [
          [0, '#ffb060'],
          [1, '#e05a10'],
        ]),
        { lw: 1 }
      );
      a.strokeStyle = '#f4f0e8';
      a.lineWidth = 1.4;
      a.beginPath();
      a.arc(0, 0, 3, 0, TAU);
      a.stroke();
    },
    0.4,
    0.6,
    0.4
  );
  region(
    'p_cart',
    30,
    22,
    a => {
      a.strokeStyle = '#a8aaae';
      a.lineWidth = 1.2;
      a.strokeRect(-12, -8, 22, 16);
      for (let x = -9; x < 10; x += 3) {
        a.beginPath();
        a.moveTo(x, -8);
        a.lineTo(x, 8);
        a.stroke();
      }
      for (let y = -5; y < 8; y += 3) {
        a.beginPath();
        a.moveTo(-12, y);
        a.lineTo(10, y);
        a.stroke();
      }
      a.strokeStyle = '#c03a2a';
      a.lineWidth = 2;
      a.beginPath();
      a.moveTo(12, -9);
      a.lineTo(12, 9);
      a.stroke();
    },
    0.6,
    0.6,
    0.3
  );
  region(
    'p_news',
    16,
    16,
    a => {
      shape(
        a,
        c => rr(c, -6, -6, 12, 12, 1.5),
        grad(a, 0, -6, 0, 6, [
          [0, '#e8c040'],
          [1, '#a88010'],
        ]),
        { lw: 1.2 }
      );
      a.fillStyle = '#1a1a1a';
      a.fillRect(-4, -1, 8, 3);
    },
    0.5,
    0.6,
    0.5
  );
  region(
    'p_bench',
    40,
    16,
    a => {
      for (const y of [-4, 0, 4]) shape(a, c => rr(c, -18, y - 1.4, 36, 2.8, 1), '#7a5434', { lw: 0.8 });
      a.fillStyle = '#1a1a1a';
      for (const x of [-15, 15]) a.fillRect(x - 1.5, -6, 3, 12);
    },
    0.3,
    0.4,
    0.6
  );
  for (const ph of [0, 1])
    region(
      'tire_up' + ph,
      34,
      16,
      a => {
        shape(a, c => rr(c, -15, -5.5, 30, 11, 4.5), '#1b1b1d', { lw: 1.2, out: '#050505' });
        a.fillStyle = '#323236';
        for (let x = -13 + ph * 2; x < 13; x += 4) a.fillRect(x, -4.6, 1.5, 9.2);
        a.fillStyle = 'rgba(255,255,255,0.08)';
        a.fillRect(-13, -0.7, 26, 1.4);
      },
      0.25,
      0.6,
      0.8
    ); // an upright tyre from above: just its tread
  region(
    'p_tire',
    18,
    18,
    a => {
      shape(a, c => circ(c, 0, 0, 7.5), '#1a1a1c', { lw: 1.2, out: '#050505' });
      a.fillStyle = '#4a4a4c';
      circ(a, 0, 0, 3.5);
      a.fill();
      a.strokeStyle = 'rgba(255,255,255,0.1)';
      a.lineWidth = 1;
      a.beginPath();
      a.arc(0, 0, 5.6, 0, TAU);
      a.stroke();
    },
    0.3,
    0.6,
    0.6
  );
  region(
    'p_coffin',
    40,
    18,
    a => {
      shape(
        a,
        c => {
          c.beginPath();
          c.moveTo(-18, -4);
          c.lineTo(-10, -7);
          c.lineTo(18, -5);
          c.lineTo(18, 5);
          c.lineTo(-10, 7);
          c.lineTo(-18, 4);
          c.closePath();
        },
        grad(a, 0, -7, 0, 7, [
          [0, '#6a4a30'],
          [1, '#3a2414'],
        ]),
        { lw: 1.4 }
      );
      a.fillStyle = '#1a0e08';
      a.fillRect(-4, -3, 14, 6);
      a.fillStyle = '#c8b060';
      a.fillRect(-14, -1, 3, 2);
    },
    0.3,
    0.4,
    0.8
  );
  region(
    'p_wreath',
    18,
    18,
    a => {
      a.strokeStyle = '#2a4a2a';
      a.lineWidth = 4;
      a.beginPath();
      a.arc(0, 0, 5.5, 0, TAU);
      a.stroke();
      for (let i = 0; i < 6; i++) {
        const g = (i / 6) * TAU;
        a.fillStyle = pick(['#c03a3a', '#e8e0c8', '#c8a0d8']);
        circ(a, Math.cos(g) * 5.5, Math.sin(g) * 5.5, 1.6);
        a.fill();
      }
    },
    0.2,
    0.6,
    0.6
  );
  region(
    'p_tl',
    10,
    22,
    a => {
      shape(a, c => rr(c, -4, -10, 8, 20, 2), '#1a1a1c', { lw: 1 });
      for (const y of [-6, 0, 6]) {
        a.fillStyle = '#2a2a2c';
        circ(a, 0, y, 2.2);
        a.fill();
      }
    },
    0.6,
    0.6,
    0.4
  );
  region(
    'p_stop',
    18,
    18,
    a => {
      shape(
        a,
        c => {
          c.beginPath();
          for (let i = 0; i < 8; i++) {
            const g = ((i + 0.5) / 8) * TAU;
            c.lineTo(Math.cos(g) * 8, Math.sin(g) * 8);
          }
          c.closePath();
        },
        '#b82a22',
        { lw: 1.2, out: '#f0ece0' }
      );
      a.fillStyle = '#f0ece0';
      a.font = '900 4.6px sans-serif';
      a.textAlign = 'center';
      a.fillText('STOP', 0, 1.6);
    },
    0.6,
    0.6,
    0.4
  );
  region(
    'p_busroof',
    84,
    34,
    a => {
      shape(
        a,
        c => rr(c, -40, -14, 80, 28, 3),
        grad(a, 0, -14, 0, 14, [
          [0, '#8a9098'],
          [1, '#4a5058'],
        ]),
        { lw: 1.8 }
      );
      a.fillStyle = '#d8d4c8';
      a.fillRect(-38, 9, 76, 4);
      a.fillStyle = '#c03a2a';
      a.font = '700 7px monospace';
      a.textAlign = 'center';
      a.fillText('BUS 9', 0, 2);
    },
    0.5,
    0.3,
    0.8
  );
  region(
    'p_busglass',
    84,
    34,
    (a, e) => {
      a.fillStyle = 'rgba(160,200,220,0.45)';
      a.fillRect(-38, -14, 76, 28);
      a.strokeStyle = '#2a2e34';
      a.lineWidth = 2;
      a.strokeRect(-38, -14, 76, 28);
      a.beginPath();
      a.moveTo(-12, -14);
      a.lineTo(-12, 14);
      a.moveTo(14, -14);
      a.lineTo(14, 14);
      a.stroke();
      a.strokeStyle = 'rgba(255,255,255,0.4)';
      a.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        a.beginPath();
        a.moveTo(rand(-36, 30), rand(-12, 0));
        a.lineTo(rand(-36, 30), rand(0, 12));
        a.stroke();
      }
      a.fillStyle = '#e8e0c8';
      a.fillRect(16, -10, 18, 20);
      a.fillStyle = '#c84a3a';
      a.fillRect(18, -8, 14, 6);
    },
    0.8,
    0.3,
    0.3
  );
}
