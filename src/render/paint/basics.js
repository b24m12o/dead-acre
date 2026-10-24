/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: the small shared pieces: pixels, limbs, glows, bullets, muzzle flashes, decals
import { circ, ell, grad, radial, region, rgrad, rr, shape } from '../atlas.js';
import { TAU, pick, rand } from '../../core/util.js';
export function paintBasics() {
  region(
    'pixel',
    4,
    4,
    (a, e) => {
      a.fillStyle = '#fff';
      a.fillRect(-2, -2, 4, 4);
      e.fillStyle = '#fff';
      e.fillRect(-2, -2, 4, 4);
    },
    0,
    0.1,
    0
  );
  region(
    'limb',
    18,
    8,
    a => {
      a.fillStyle = '#fff';
      rr(a, -9, -4, 18, 8, 4);
      a.fill();
    },
    0.35,
    1.4,
    0
  );
  region(
    'glow',
    64,
    64,
    (a, e) =>
      radial(e, 0, 0, 32, [
        [0, 'rgba(255,255,255,1)'],
        [0.2, 'rgba(255,255,255,0.5)'],
        [0.55, 'rgba(255,255,255,0.12)'],
        [1, 'rgba(255,255,255,0)'],
      ]),
    0,
    1,
    0
  );
  region(
    'bolt',
    36,
    12,
    (a, e) => {
      e.fillStyle = grad(e, -18, 0, 18, 0, [
        [0, 'rgba(255,255,255,0)'],
        [0.6, 'rgba(255,255,255,0.65)'],
        [1, '#fff'],
      ]);
      rr(e, -18, -5, 36, 10, 5);
      e.fill();
      e.fillStyle = '#fff';
      rr(e, 1, -2, 16, 4, 2);
      e.fill();
    },
    0,
    1,
    0
  );
  region(
    'spark',
    24,
    4,
    (a, e) => {
      e.fillStyle = grad(e, -12, 0, 12, 0, [
        [0, 'rgba(255,255,255,0)'],
        [1, '#fff'],
      ]);
      rr(e, -12, -2, 24, 4, 2);
      e.fill();
    },
    0,
    1,
    0
  );
  region(
    'ring',
    128,
    128,
    (a, e) => {
      for (let i = 0; i < 5; i++) {
        e.strokeStyle = `rgba(255,255,255,${0.9 - i * 0.17})`;
        e.lineWidth = 2 + i * 2.5;
        circ(e, 0, 0, 58 - i * 1.5);
        e.stroke();
      }
    },
    0,
    1,
    0
  );
  region(
    'muzzle',
    40,
    28,
    (a, e) => {
      radial(e, -6, 0, 13, [
        [0, '#fff'],
        [1, 'rgba(255,255,255,0)'],
      ]);
      e.fillStyle = 'rgba(255,255,255,0.9)';
      e.beginPath();
      e.moveTo(-10, -5);
      e.lineTo(20, 0);
      e.lineTo(-10, 5);
      e.fill();
      e.beginPath();
      e.moveTo(-6, -3);
      e.lineTo(5, -12);
      e.lineTo(-1, 0);
      e.lineTo(5, 12);
      e.lineTo(-6, 3);
      e.fill();
    },
    0,
    1,
    0
  );
  region(
    'dust',
    64,
    64,
    a => {
      for (let i = 0; i < 8; i++)
        radial(a, rand(-10, 10), rand(-10, 10), rand(13, 20), [
          [0, 'rgba(236,224,196,0.5)'],
          [1, 'rgba(236,224,196,0)'],
        ]);
    },
    0,
    1.5,
    0
  );
  region(
    'cloud',
    256,
    256,
    a => {
      for (let i = 0; i < 14; i++)
        radial(a, rand(-60, 60), rand(-50, 50), rand(50, 80), [
          [0, 'rgba(255,255,255,0.55)'],
          [1, 'rgba(255,255,255,0)'],
        ]);
    },
    0,
    1,
    0
  );
  region(
    'hole',
    56,
    56,
    a => {
      radial(a, 0, 0, 27, [
        [0, 'rgba(40,28,18,0.95)'],
        [0.45, 'rgba(70,50,30,0.8)'],
        [0.75, 'rgba(120,92,60,0.5)'],
        [1, 'rgba(120,92,60,0)'],
      ]);
      for (let i = 0; i < 14; i++) {
        const g = rand(0, TAU),
          d = rand(14, 24);
        a.fillStyle = 'rgba(110,84,56,0.8)';
        circ(a, Math.cos(g) * d, Math.sin(g) * d, rand(1.5, 3.5));
        a.fill();
      }
    },
    0.05,
    0.8,
    1.5
  );
  for (let k = 0; k < 4; k++)
    region(
      'splat' + k,
      76,
      76,
      (a, e) => {
        // blood on the ground: an irregular wet pool, thicker in the middle, spatter thrown one way
        const blob = (c, cx, cy, r0, n, jit) => {
          const P = [];
          for (let i = 0; i < n; i++) {
            const g = (i / n) * TAU,
              r = r0 * rand(1 - jit, 1 + jit) * (1 + 0.2 * Math.sin(g * 3 + k * 1.7));
            P.push([cx + Math.cos(g) * r, cy + Math.sin(g) * r * rand(0.82, 1)]);
          }
          c.beginPath();
          for (let i = 0; i < n; i++) {
            const p0 = P[i],
              p1 = P[(i + 1) % n],
              mx = (p0[0] + p1[0]) / 2,
              my = (p0[1] + p1[1]) / 2;
            if (!i) c.moveTo(mx, my);
            else c.quadraticCurveTo(p0[0], p0[1], mx, my);
          }
          const p0 = P[0],
            p1 = P[1];
          c.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
          c.closePath();
        };
        const r0 = rand(11, 15);
        a.fillStyle = 'rgba(235,235,235,0.72)';
        blob(a, 0, 0, r0, 18, 0.28);
        a.fill();
        for (let i = 0; i < 3; i++) {
          const g = rand(0, TAU),
            d = r0 * rand(0.7, 1.15);
          blob(a, Math.cos(g) * d, Math.sin(g) * d, rand(3.5, 6.5), 10, 0.3);
          a.fill();
        }
        a.fillStyle = 'rgba(255,255,255,0.55)';
        blob(a, rand(-2, 2), rand(-2, 2), r0 * 0.62, 14, 0.25);
        a.fill();
        const dir = rand(0, TAU);
        for (let i = 0; i < 9; i++) {
          const g = dir + rand(-0.55, 0.55),
            d = rand(r0 + 1, 34),
            x = Math.cos(g) * d,
            y = Math.sin(g) * d,
            l = rand(1.2, 3.6) * (1 - d / 46);
          a.save();
          a.translate(x, y);
          a.rotate(g);
          a.fillStyle = `rgba(240,240,240,${rand(0.6, 0.85)})`;
          a.beginPath();
          a.ellipse(0, 0, l * 1.7, l * 0.6, 0, 0, TAU);
          a.fill();
          a.strokeStyle = 'rgba(240,240,240,0.5)';
          a.lineWidth = l * 0.35;
          a.beginPath();
          a.moveTo(-l * 1.5, 0);
          a.lineTo(-l * 3.6, 0);
          a.stroke();
          a.restore();
        }
        for (let i = 0; i < 6; i++) {
          const g = rand(0, TAU),
            d = rand(r0 + 4, 32);
          a.fillStyle = 'rgba(240,240,240,0.6)';
          a.beginPath();
          a.arc(Math.cos(g) * d, Math.sin(g) * d, rand(0.4, 1), 0, TAU);
          a.fill();
        }
        e.fillStyle = 'rgba(255,255,255,0.14)';
        e.beginPath();
        e.ellipse(-r0 * 0.25, -r0 * 0.3, r0 * 0.4, r0 * 0.18, -0.5, 0, TAU);
        e.fill();
      },
      0.9,
      0.35,
      0
    );
  for (let k = 0; k < 3; k++)
    region(
      'speck' + k,
      22,
      22,
      a => {
        // a few drops of blood on the ground: one round wet drop and a couple of satellites, no streaks
        const r0 = rand(4.2, 5.4);
        a.fillStyle = 'rgba(235,235,235,0.8)';
        a.beginPath();
        for (let i = 0; i <= 14; i++) {
          const g = (i / 14) * TAU,
            r = r0 * (1 + 0.12 * Math.sin(g * 3 + k * 2.1));
          i ? a.lineTo(Math.cos(g) * r, Math.sin(g) * r * 0.9) : a.moveTo(r, 0);
        }
        a.closePath();
        a.fill();
        for (let i = 0; i < 2 + k; i++) {
          const g = rand(0, TAU),
            d = r0 + rand(1.5, 4);
          a.beginPath();
          a.arc(Math.cos(g) * d, Math.sin(g) * d, rand(0.7, 1.5), 0, TAU);
          a.fill();
        }
      },
      0.7,
      0.4,
      0
    );
  region(
    'scorch',
    110,
    110,
    a => {
      // a blast mark: blotchy soot, a darker burnt core, pale ash at the rim, a few tapering burn streaks
      radial(a, 0, 0, 50, [
        [0, 'rgba(26,20,16,0.8)'],
        [0.5, 'rgba(36,28,20,0.5)'],
        [1, 'rgba(40,32,24,0)'],
      ]);
      for (let i = 0; i < 16; i++) {
        const g = rand(0, TAU),
          d = rand(8, 34),
          r = rand(6, 15);
        radial(a, Math.cos(g) * d, Math.sin(g) * d, r, [
          [0, `rgba(22,18,14,${rand(0.25, 0.45)})`],
          [1, 'rgba(22,18,14,0)'],
        ]);
      }
      for (let i = 0; i < 7; i++) {
        const g = rand(0, TAU),
          r0 = rand(16, 24),
          r1 = rand(34, 50),
          w = rand(2.5, 5); // eslint-disable-line no-unused-vars -- unused, but drawing it keeps the random sequence the rest of this art depends on
        a.fillStyle = 'rgba(24,18,14,0.35)';
        a.beginPath();
        a.moveTo(Math.cos(g - 0.12) * r0, Math.sin(g - 0.12) * r0);
        a.lineTo(Math.cos(g) * r1, Math.sin(g) * r1);
        a.lineTo(Math.cos(g + 0.12) * r0, Math.sin(g + 0.12) * r0);
        a.closePath();
        a.fill();
      }
      for (let i = 0; i < 120; i++) {
        const g = rand(0, TAU),
          d = rand(30, 52);
        a.fillStyle = `rgba(170,160,145,${rand(0.06, 0.18)})`;
        a.fillRect(Math.cos(g) * d, Math.sin(g) * d, rand(0.6, 1.8), rand(0.6, 1.8));
      } // ash
      radial(a, 0, 0, 16, [
        [0, 'rgba(10,8,6,0.55)'],
        [1, 'rgba(10,8,6,0)'],
      ]);
    },
    0,
    1,
    0.5
  );
  region(
    'chip',
    9,
    9,
    a => {
      a.beginPath();
      a.moveTo(-3.5, -3);
      a.lineTo(3.5, -2);
      a.lineTo(2, 3.5);
      a.lineTo(-3, 2);
      a.closePath();
      a.fillStyle = '#fff';
      a.fill();
      a.strokeStyle = 'rgba(36,37,42,0.45)';
      a.lineWidth = 0.8;
      a.stroke();
    },
    0.6,
    1,
    0.5
  );
  region(
    'rockchip',
    8,
    8,
    a => {
      a.beginPath();
      a.moveTo(-3, -3);
      a.lineTo(3, -2);
      a.lineTo(2, 3);
      a.lineTo(-3, 2);
      a.closePath();
      a.fillStyle = grad(a, -3, -3, 3, 3, [
        [0, '#9a9384'],
        [1, '#6c675c'],
      ]);
      a.fill();
      a.strokeStyle = 'rgba(255,250,235,0.22)';
      a.lineWidth = 0.6;
      a.beginPath();
      a.moveTo(-3, -3);
      a.lineTo(3, -2);
      a.stroke();
    },
    0.35,
    1,
    0.5
  );
  region(
    'shell',
    7,
    4,
    a => {
      rr(a, -3.5, -1.6, 7, 3.2, 1.4);
      a.fillStyle = '#e0b552';
      a.fill();
      a.strokeStyle = '#5a4010';
      a.lineWidth = 0.8;
      a.stroke();
    },
    1,
    1,
    0
  );
  region(
    'leafbit',
    10,
    6,
    a => {
      ell(a, 0, 0, 4.5, 2.2);
      a.fillStyle = grad(a, 0, -2, 0, 2, [
        [0, '#6b8051'],
        [1, '#4a5a3a'],
      ]);
      a.fill();
    },
    0.2,
    1,
    0
  );
  region(
    'petalbit',
    8,
    6,
    a => {
      ell(a, 0, 0, 3.6, 2);
      a.fillStyle = '#c99bff';
      a.fill();
    },
    0.2,
    1,
    0
  );
  region(
    'gem',
    18,
    24,
    (a, e) => {
      const p = c => {
        c.beginPath();
        c.moveTo(0, -11);
        c.lineTo(7, -2);
        c.lineTo(0, 11);
        c.lineTo(-7, -2);
        c.closePath();
      };
      shape(
        a,
        p,
        grad(a, -7, -11, 7, 11, [
          [0, '#ffe7a0'],
          [0.5, '#ffb030'],
          [1, '#e06a10'],
        ]),
        { lw: 1.6 }
      );
      a.fillStyle = 'rgba(255,255,255,0.75)';
      a.beginPath();
      a.moveTo(0, -9);
      a.lineTo(3.5, -2);
      a.lineTo(0, -1);
      a.lineTo(-3, -2);
      a.closePath();
      a.fill();
      p(e);
      e.fillStyle = 'rgba(255,170,60,0.55)';
      e.fill();
    },
    1,
    0.5,
    0.5
  );
  region(
    'medkit',
    26,
    26,
    (a, e) => {
      shape(
        a,
        c => rr(c, -11, -10, 22, 20, 5),
        grad(a, 0, -10, 0, 10, [
          [0, '#34a85c'],
          [1, '#1c6434'],
        ]),
        { lw: 2, out: '#0a1a0e' }
      );
      a.fillStyle = 'rgba(0,0,0,0.25)';
      a.fillRect(-11, -1, 22, 1.6);
      a.fillStyle = '#f6f1e6';
      a.fillRect(-2.6, -6.8, 5.2, 13.6);
      a.fillRect(-6.8, -2.6, 13.6, 5.2);
      e.fillStyle = 'rgba(255,240,230,0.35)';
      e.fillRect(-2.6, -6.8, 5.2, 13.6);
      e.fillRect(-6.8, -2.6, 13.6, 5.2);
    },
    0.08,
    0.6,
    0.6
  ); // matte, so a lamp right overhead can't gloss it into a white blob; a green first-aid kit with a white cross, the way real ones are marked
  region(
    'canister',
    34,
    34,
    a => {
      // old fuel drum from above: rust-eaten red paint, dented lid, bungs, a faded hazard sticker
      circ(a, 0, 0, 14.5);
      a.fillStyle = rgrad(
        a,
        0,
        0,
        15,
        [
          [0, '#9c4430'],
          [0.75, '#7e3222'],
          [1, '#4c1a10'],
        ],
        -4,
        -4
      );
      a.fill();
      a.save();
      circ(a, 0, 0, 14.5);
      a.clip();
      for (let i = 0; i < 16; i++) {
        a.fillStyle = pick(['rgba(130,70,30,0.45)', 'rgba(90,50,24,0.5)', 'rgba(40,20,12,0.4)', 'rgba(160,96,50,0.3)']);
        ell(a, rand(-13, 13), rand(-13, 13), rand(1, 4.5), rand(0.8, 3), rand(0, 3));
        a.fill();
      }
      for (let i = 0; i < 200; i++) {
        a.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,200,160,0.06)';
        a.fillRect(rand(-14, 14), rand(-14, 14), 0.5, 0.5);
      }
      a.fillStyle = 'rgba(0,0,0,0.25)';
      ell(a, 4, -5, 4, 2.6, 0.6);
      a.fill();
      a.fillStyle = 'rgba(255,220,200,0.08)';
      ell(a, 3.4, -5.6, 3.4, 2, 0.6);
      a.fill();
      a.restore();
      a.strokeStyle = 'rgba(0,0,0,0.45)';
      a.lineWidth = 1.3;
      circ(a, 0, 0, 12.6);
      a.stroke();
      a.strokeStyle = 'rgba(200,150,120,0.12)';
      a.lineWidth = 0.6;
      circ(a, 0, 0, 11.8);
      a.stroke();
      for (const [x, y, r] of [
        [-7, -2.5, 2.1],
        [3, 7.5, 1.3],
      ]) {
        a.fillStyle = '#2a120c';
        circ(a, x, y, r + 0.7);
        a.fill();
        a.fillStyle = '#4c4640';
        circ(a, x, y, r);
        a.fill();
        a.fillStyle = 'rgba(0,0,0,0.45)';
        a.fillRect(x - r * 0.6, y - 0.4, r * 1.2, 0.8);
      } /* bungs: dark steel, uneven, never a pair of eyes */
      a.save();
      circ(a, 0, 0, 14.5);
      a.clip();
      a.translate(0, 0);
      a.rotate(-0.5);
      for (let i = -7; i < 7; i++) {
        a.fillStyle = i % 2 ? 'rgba(210,170,40,0.55)' : 'rgba(24,20,16,0.6)';
        a.fillRect(i * 2.6, -13.6, 2.6, 2.6);
      }
      a.restore(); // a worn hazard band near the rim
      a.strokeStyle = 'rgba(255,210,180,0.22)';
      a.lineWidth = 1;
      a.beginPath();
      a.arc(0, 0, 13.6, Math.PI * 0.95, Math.PI * 1.6);
      a.stroke(); // the rim catching the light
      a.save();
      a.translate(-1, 7);
      a.rotate(Math.PI / 4 + 0.15);
      a.fillStyle = 'rgba(200,160,60,0.7)';
      a.fillRect(-2.3, -2.3, 4.6, 4.6);
      a.fillStyle = 'rgba(40,30,20,0.5)';
      a.fillRect(-2.3, 0.6, 4.6, 1.8);
      a.fillStyle = 'rgba(20,20,20,0.7)';
      a.fillRect(-0.45, -1.5, 0.9, 2);
      a.restore();
      circ(a, 0, 0, 14.5);
      a.strokeStyle = 'rgba(14,10,12,0.75)';
      a.lineWidth = 0.8;
      a.stroke();
    },
    0.35,
    0.7,
    0.9
  );
  region(
    'dart',
    22,
    10,
    (a, e) => {
      shape(a, c => rr(c, -9, -3.2, 17, 6.4, 3), '#e9eef0', { lw: 1.3 });
      a.fillStyle = '#ff7a2f';
      a.fillRect(3, -3.2, 3, 6.4);
      a.fillStyle = '#5a646c';
      a.beginPath();
      a.moveTo(-9, -5);
      a.lineTo(-4, -2);
      a.lineTo(-4, 2);
      a.lineTo(-9, 5);
      a.closePath();
      a.fill();
      e.fillStyle = '#ffb060';
      circ(e, -10, 0, 2.6);
      e.fill();
    },
    0.8,
    0.6,
    0.5
  );
  region(
    'buddy',
    46,
    46,
    (a, e) => {
      a.strokeStyle = '#141618';
      a.lineWidth = 3.4;
      a.lineCap = 'round';
      a.beginPath();
      a.moveTo(-14, -14);
      a.lineTo(14, 14);
      a.moveTo(14, -14);
      a.lineTo(-14, 14);
      a.stroke();
      a.strokeStyle = '#3a3e44';
      a.lineWidth = 1.8;
      a.stroke();
      for (const [x, y] of [
        [-14, -14],
        [14, -14],
        [-14, 14],
        [14, 14],
      ]) {
        shape(a, c => circ(c, x, y, 3.2), '#2a2c30', { lw: 1 });
        a.fillStyle = 'rgba(200,210,220,0.18)';
        circ(a, x, y, 9);
        a.fill();
        a.strokeStyle = 'rgba(220,230,240,0.35)';
        a.lineWidth = 0.8;
        a.beginPath();
        a.arc(x, y, 9, 0, TAU);
        a.stroke();
      }
      shape(
        a,
        c => rr(c, -8, -6, 16, 12, 3),
        grad(a, 0, -6, 0, 6, [
          [0, '#5a5e64'],
          [1, '#26282c'],
        ]),
        { lw: 1.5 }
      );
      shape(a, c => rr(c, 6, -2.6, 9, 5.2, 1.4), '#18191c', { lw: 1 });
      a.fillStyle = '#c0a050';
      a.fillRect(-6, -1, 7, 2);
      shape(a, c => circ(c, 4, 0, 2.4), '#0c0c0e', { lw: 0.8 });
      a.fillStyle = '#4a7aa0';
      circ(a, 4.4, -0.4, 1);
      a.fill();
      for (const [x, y, col] of [
        [-14, -14, 'rgba(255,60,40,1)'],
        [-14, 14, 'rgba(255,60,40,1)'],
        [14, -14, 'rgba(90,255,120,1)'],
        [14, 14, 'rgba(90,255,120,1)'],
      ]) {
        e.fillStyle = col;
        circ(e, x, y, 1.6);
        e.fill();
      }
    },
    0.6,
    0.6,
    0.6
  );
  region(
    'flashbang',
    16,
    10,
    a => {
      shape(
        a,
        c => rr(c, -6, -3.6, 12, 7.2, 2.4),
        grad(a, 0, -3.6, 0, 3.6, [
          [0, '#5a6048'],
          [1, '#2e3224'],
        ]),
        { lw: 1.2 }
      );
      a.fillStyle = 'rgba(0,0,0,0.35)';
      for (const x of [-3, 0, 3]) a.fillRect(x, -3.4, 1, 6.8);
      shape(a, c => rr(c, 5, -2, 3, 4, 1), '#8a8c90', { lw: 0.7 });
      a.strokeStyle = '#a8aaae';
      a.lineWidth = 1;
      a.beginPath();
      a.moveTo(6, -2);
      a.lineTo(-3, -5);
      a.stroke();
    },
    0.6,
    0.8,
    0.5
  );
  region(
    'pipebomb',
    18,
    10,
    a => {
      shape(
        a,
        c => rr(c, -6, -3.4, 12, 6.8, 2),
        grad(a, 0, -3.4, 0, 3.4, [
          [0, '#9a9ea4'],
          [1, '#4a4e54'],
        ]),
        { lw: 1.2 }
      );
      for (const x of [-7, 6]) shape(a, c => rr(c, x, -4.2, 2.4, 8.4, 1), '#3a3c40', { lw: 0.8 });
      a.strokeStyle = '#c02020';
      a.lineWidth = 1;
      a.beginPath();
      a.moveTo(-3, -3.4);
      a.quadraticCurveTo(0, -6, 3, -3.4);
      a.stroke();
      a.fillStyle = '#e8e0c0';
      a.fillRect(-2, -1, 4, 2);
    },
    0.6,
    0.8,
    0.5
  );
  region(
    'spore',
    24,
    24,
    (a, e) => {
      shape(
        a,
        c => circ(c, 0, 0, 9),
        rgrad(
          a,
          0,
          0,
          10,
          [
            [0, '#ffd6ec'],
            [0.5, '#ff4fa8'],
            [1, '#b0186a'],
          ],
          -3,
          -3
        ),
        { lw: 2.6, out: '#3a0d2a' }
      );
      a.fillStyle = 'rgba(255,255,255,0.85)';
      circ(a, -3, -3, 2.4);
      a.fill();
      radial(e, 0, 0, 10, [
        [0, '#fff'],
        [0.45, 'rgba(255,90,170,0.9)'],
        [1, 'rgba(255,90,170,0)'],
      ]);
    },
    1,
    0.8,
    0
  );
  region(
    'sting',
    26,
    10,
    (a, e) => {
      const p = c => {
        c.beginPath();
        c.moveTo(12, 0);
        c.lineTo(-6, -4);
        c.lineTo(-11, 0);
        c.lineTo(-6, 4);
        c.closePath();
      };
      shape(
        a,
        p,
        grad(a, -11, 0, 12, 0, [
          [0, '#ff7a2f'],
          [1, '#ffe0b0'],
        ]),
        { lw: 2.2, out: '#4a1206' }
      );
      p(e);
      e.fillStyle = 'rgba(255,110,60,0.9)';
      e.fill();
    },
    0.8,
    0.5,
    0
  );
}
