/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { TAU, lerp, pick, rand, randi } from '../core/util.js';
import { OUT, circ, ell, grad, radial, region, rgrad, rr, shape } from './atlas.js';
import { ZSHIRT } from './draw-enemies.js';
export function paintAtlas() {
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

  /* ----- Survivors (hero), facing +x ----- */
  /* superseded: h_foot */
  /* superseded: h_pack */
  region(
    'h_bag',
    22,
    26,
    a => {
      shape(
        a,
        c => rr(c, -8, -10, 13, 20, 4),
        grad(a, -8, 0, 5, 0, [
          [0, '#4a3020'],
          [1, '#7a5034'],
        ]),
        { lw: 1.6 }
      );
      a.strokeStyle = 'rgba(20,10,6,0.6)';
      a.lineWidth = 1;
      a.beginPath();
      a.moveTo(-8, -3);
      a.lineTo(5, -3);
      a.stroke();
      shape(a, c => rr(c, -1, -2, 3, 3, 1), '#c8a050', { lw: 0.6 });
    },
    0.3,
    0.6,
    1
  );
  // 0: Soldier · olive fatigues under a tan plate carrier
  /* superseded: hb0 */
  // 1: Deputy · khaki shirt, leather vest, badge
  /* superseded: hb1 */
  // 2: Gunslinger · red flannel
  /* superseded: hb2 */
  /* superseded: hh0 */
  /* superseded: hh1 */
  /* superseded: hh2 */
  /* superseded: h_glove */
  /* superseded: h_glove2 */
  /* superseded: h_hand */
  /* superseded: h_upper */
  /* superseded: h_fore */
  region(
    'h_pistol',
    140,
    30,
    (a, e) => {
      // service pistol from above: squared slide with rear serrations, ejection port, sights, the frame and grip just showing under it
      rr(a, -4.6, -2.9, 9, 5.8, 1.6);
      a.fillStyle = '#202022';
      a.fill();
      const sl = c => rr(c, -4, -2.3, 20.5, 4.6, 0.9);
      sl(a);
      a.fillStyle = grad(a, 0, -2.3, 0, 2.3, [
        [0, '#4a4d52'],
        [0.45, '#34363a'],
        [1, '#1c1d20'],
      ]);
      a.fill();
      a.save();
      sl(a);
      a.clip();
      a.fillStyle = 'rgba(0,0,0,0.55)';
      for (let x = -3.4; x < 0.6; x += 0.85) a.fillRect(x, -2.3, 0.4, 4.6);
      a.fillStyle = 'rgba(255,255,255,0.08)';
      for (let x = -3.0; x < 0.8; x += 0.85) a.fillRect(x, -2.3, 0.3, 4.6);
      a.fillStyle = '#0c0c0e';
      rr(a, 5.4, -1.2, 4.4, 2.2, 0.4);
      a.fill();
      a.fillStyle = 'rgba(200,160,80,0.55)';
      a.fillRect(6.2, -0.6, 2.4, 0.9);
      a.fillStyle = 'rgba(255,255,255,0.16)';
      a.fillRect(-3.8, -2.1, 20, 0.5);
      a.restore();
      sl(a);
      a.strokeStyle = 'rgba(10,10,12,0.8)';
      a.lineWidth = 0.4;
      a.stroke();
      a.fillStyle = '#121214';
      a.fillRect(-3.8, -0.9, 1, 1.8);
      a.fillRect(14.8, -0.45, 1.1, 0.9);
      a.fillStyle = '#060606';
      circ(a, 16.6, 0, 0.75);
      a.fill();
    },
    0.3,
    0.45,
    1
  );
  region(
    'h_smg',
    140,
    30,
    a => {
      a.strokeStyle = '#18191c';
      a.lineWidth = 1.6;
      a.beginPath();
      a.moveTo(-8, -2.4);
      a.lineTo(2, -2.4);
      a.moveTo(-8, 2.4);
      a.lineTo(2, 2.4);
      a.moveTo(-8, -2.4);
      a.lineTo(-8, 2.4);
      a.stroke();
      shape(
        a,
        c => rr(c, 1, -3.6, 24, 7.2, 1.6),
        grad(a, 0, -3.6, 0, 3.6, [
          [0, '#4a4e54'],
          [1, '#1e2024'],
        ]),
        { lw: 1.5 }
      );
      shape(a, c => rr(c, 12, 3, 5, 6, 1), '#2a2c30', { lw: 0.9 });
      shape(a, c => rr(c, 24, -2.2, 12, 4.4, 1.4), '#141518', { lw: 1 });
      a.fillStyle = 'rgba(255,255,255,0.2)';
      a.fillRect(3, -3.1, 20, 0.9);
    },
    0.3,
    0.45,
    1
  );
  region(
    'h_auto',
    140,
    32,
    a => {
      shape(
        a,
        c => rr(c, -4, -3.6, 18, 7.2, 2.4),
        grad(a, 0, -3.6, 0, 3.6, [
          [0, '#2e3034'],
          [1, '#141518'],
        ]),
        { lw: 1.3 }
      );
      shape(
        a,
        c => rr(c, 12, -4.4, 20, 8.8, 1.8),
        grad(a, 0, -4.4, 0, 4.4, [
          [0, '#3c3f44'],
          [1, '#18191c'],
        ]),
        { lw: 1.5 }
      );
      shape(
        a,
        c => circ(c, 22, 6, 7),
        rgrad(a, 22, 6, 7, [
          [0, '#4a4e54'],
          [1, '#1a1c20'],
        ]),
        { lw: 1.4 }
      );
      a.strokeStyle = 'rgba(0,0,0,0.5)';
      a.lineWidth = 0.9;
      a.beginPath();
      a.arc(22, 6, 4, 0, TAU);
      a.stroke();
      shape(a, c => rr(c, 30, -2.6, 30, 5.2, 1.4), '#1c1d20', { lw: 1 });
      a.fillStyle = 'rgba(0,0,0,0.5)';
      for (let x = 34; x < 56; x += 4) a.fillRect(x, -2.4, 1.6, 4.8);
    },
    0.3,
    0.45,
    1
  );
  region(
    'h_hunter',
    160,
    30,
    a => {
      shape(
        a,
        c => {
          c.beginPath();
          c.moveTo(-8, -3.4);
          c.lineTo(20, -3.2);
          c.lineTo(34, -2.6);
          c.lineTo(34, 2.6);
          c.lineTo(20, 3.2);
          c.lineTo(4, 4);
          c.quadraticCurveTo(-8, 4.4, -8, 0);
          c.closePath();
        },
        grad(a, 0, -4, 0, 4, [
          [0, '#a06a3a'],
          [1, '#5a3418'],
        ]),
        { lw: 1.4 }
      );
      a.strokeStyle = 'rgba(40,20,8,0.4)';
      a.lineWidth = 0.7;
      for (let i = 0; i < 6; i++) {
        a.beginPath();
        a.moveTo(-6, -2.6 + i);
        a.quadraticCurveTo(10, -2 + i * 0.9, 30, -2 + i * 0.8);
        a.stroke();
      }
      shape(a, c => rr(c, 34, -1.5, 46, 3, 1), '#26282c', { lw: 1 });
      shape(
        a,
        c => rr(c, 14, -2.6, 26, 5.2, 2.4),
        grad(a, 0, -2.6, 0, 2.6, [
          [0, '#4a4e54'],
          [1, '#141518'],
        ]),
        { lw: 1.3 }
      );
      a.fillStyle = '#7ab0d0';
      circ(a, 39.5, 0, 1.6);
      a.fill();
      shape(a, c => rr(c, 24, 2.6, 3, 4, 1), '#8a8c90', { lw: 0.7 });
    },
    0.3,
    0.45,
    1
  );
  region(
    'h_lever',
    160,
    30,
    a => {
      // a .30-30 lever-action: straight walnut stock, case-hardened receiver, tube magazine under the barrel, the loop lever
      shape(
        a,
        c => {
          c.beginPath();
          c.moveTo(-8, -3);
          c.lineTo(14, -2.8);
          c.lineTo(14, 2.8);
          c.lineTo(2, 3.6);
          c.quadraticCurveTo(-8, 4, -8, 0);
          c.closePath();
        },
        grad(a, 0, -4, 0, 4, [
          [0, '#9a6236'],
          [1, '#55301a'],
        ]),
        { lw: 1.4 }
      );
      shape(
        a,
        c => rr(c, 13, -3, 15, 6, 1.6),
        grad(a, 13, -3, 28, 3, [
          [0, '#8a8478'],
          [0.5, '#5a564e'],
          [1, '#3a3732'],
        ]),
        { lw: 1.3 }
      );
      shape(a, c => rr(c, 27, -1.4, 50, 2.8, 1), '#232528', { lw: 1 });
      shape(a, c => rr(c, 29, 1.2, 40, 2.4, 1), '#2e3034', { lw: 0.8 });
      shape(
        a,
        c => rr(c, 30, -2.6, 20, 5.2, 2),
        grad(a, 0, -2.6, 0, 2.6, [
          [0, '#8a5a32'],
          [1, '#4a2a16'],
        ]),
        { lw: 1.1 }
      );
      a.strokeStyle = '#2a2a2c';
      a.lineWidth = 1.6;
      a.beginPath();
      a.ellipse(17, 5.2, 4.5, 2.4, 0, 0, TAU);
      a.stroke();
    },
    0.3,
    0.45,
    1
  );
  region(
    'h_lmg',
    160,
    40,
    a => {
      shape(
        a,
        c => rr(c, -4, -3.6, 18, 7.2, 2),
        grad(a, 0, -3.6, 0, 3.6, [
          [0, '#34363a'],
          [1, '#141518'],
        ]),
        { lw: 1.3 }
      );
      shape(
        a,
        c => rr(c, 12, -5, 28, 10, 2),
        grad(a, 0, -5, 0, 5, [
          [0, '#46494e'],
          [1, '#1a1c20'],
        ]),
        { lw: 1.6 }
      );
      shape(
        a,
        c => rr(c, 16, 5, 14, 11, 2),
        grad(a, 16, 5, 30, 16, [
          [0, '#5a6440'],
          [1, '#343a24'],
        ]),
        { lw: 1.3 }
      );
      a.fillStyle = '#c8a040';
      for (let x = 18; x < 30; x += 2.6) a.fillRect(x, 3, 1.4, 3);
      shape(a, c => rr(c, 40, -3.6, 22, 7.2, 1.6), '#2a2c30', { lw: 1.2 });
      a.fillStyle = '#0c0c0e';
      for (let x = 43; x < 60; x += 4) {
        circ(a, x, 0, 1.2);
        a.fill();
      }
      shape(a, c => rr(c, 61, -1.6, 18, 3.2, 1), '#1a1b1e', { lw: 1 });
      a.strokeStyle = '#1a1b1e';
      a.lineWidth = 1.4;
      a.beginPath();
      a.moveTo(62, -2);
      a.lineTo(46, -6);
      a.moveTo(62, 2);
      a.lineTo(46, 6);
      a.stroke();
    },
    0.3,
    0.45,
    1
  );
  region(
    'wcase',
    64,
    26,
    (a, e) => {
      shape(
        a,
        c => rr(c, -30, -10, 60, 20, 4),
        grad(a, -30, -10, 30, 10, [
          [0, '#5a6440'],
          [1, '#2e3420'],
        ]),
        { lw: 2.2 }
      );
      a.fillStyle = 'rgba(0,0,0,0.3)';
      a.fillRect(-30, -1, 60, 2);
      for (const x of [-20, 18]) shape(a, c => rr(c, x, -11.5, 6, 3, 1), '#1a1c14', { lw: 0.8 });
      a.strokeStyle = '#e0a640';
      a.lineWidth = 2;
      a.beginPath();
      a.moveTo(-18, 5);
      a.lineTo(14, 5);
      a.stroke();
      e.strokeStyle = 'rgba(255,190,80,0.9)';
      e.lineWidth = 2;
      e.beginPath();
      e.moveTo(-18, 5);
      e.lineTo(14, 5);
      e.stroke();
      a.fillStyle = '#d8d0b0';
      a.font = '700 6px monospace';
      a.textAlign = 'center';
      a.fillText('ARMS', 0, -3);
    },
    0.4,
    0.5,
    1
  );
  region(
    'crystal2',
    54,
    54,
    (a, e) => {
      shape(
        a,
        c => rr(c, -12, -18, 24, 36, 4),
        grad(a, -12, -18, 12, 18, [
          [0, '#d8d4cc'],
          [1, '#8a8680'],
        ]),
        { lw: 2.2 }
      );
      shape(a, c => rr(c, -8, -14, 16, 10, 2), '#1e2428', { lw: 1 });
      e.fillStyle = 'rgba(120,255,140,0.9)';
      e.fillRect(-6, -12, 12, 4);
      a.fillStyle = '#7aff90';
      a.fillRect(-6, -12, 12, 4);
      a.fillStyle = '#c0392b';
      a.fillRect(-12, 2, 24, 6);
      a.fillStyle = '#f4f0e4';
      a.font = '700 5px monospace';
      a.textAlign = 'center';
      a.fillText('FUEL', 0, 7);
      a.strokeStyle = '#141414';
      a.lineWidth = 2.2;
      a.beginPath();
      a.moveTo(10, 12);
      a.quadraticCurveTo(20, 16, 16, 22);
      a.stroke();
    },
    0.55,
    0.4,
    1.2
  );
  region(
    'gs_roof',
    260,
    110,
    (a, e) => {
      shape(
        a,
        c => rr(c, -126, -50, 252, 100, 6),
        grad(a, 0, -50, 0, 50, [
          [0, '#ece8e0'],
          [1, '#bab6ae'],
        ]),
        { lw: 3 }
      );
      a.fillStyle = '#b8302a';
      a.fillRect(-126, -50, 252, 12);
      a.fillRect(-126, 38, 252, 12);
      a.strokeStyle = 'rgba(0,0,0,0.12)';
      a.lineWidth = 1.4;
      for (let x = -110; x < 126; x += 24) {
        a.beginPath();
        a.moveTo(x, -38);
        a.lineTo(x, 38);
        a.stroke();
      }
      for (let x = -90; x <= 90; x += 60)
        for (const y of [-20, 20]) {
          a.fillStyle = '#fffbe8';
          rr(a, x - 14, y - 4, 28, 8, 3);
          a.fill();
          e.fillStyle = 'rgba(255,250,230,1)';
          rr(e, x - 14, y - 4, 28, 8, 3);
          e.fill();
        }
      a.fillStyle = 'rgba(60,40,30,0.4)';
      for (let i = 0; i < 6; i++) {
        ell(a, rand(-110, 110), rand(-30, 30), rand(8, 20), rand(5, 12), rand(0, 3));
        a.fill();
      }
      a.fillStyle = '#f4f0e4';
      a.font = '900 16px Kanit, sans-serif';
      a.textAlign = 'center';
      a.fillText('ROUTE 9 GAS', 0, -40);
    },
    0.3,
    0.4,
    0.8
  );
  region(
    'lantern',
    14,
    14,
    (a, e) => {
      shape(a, c => rr(c, -5, -5, 10, 10, 2), '#2a2622', { lw: 1.3 });
      a.fillStyle = '#ffd890';
      rr(a, -3, -3, 6, 6, 1.5);
      a.fill();
      e.fillStyle = 'rgba(255,200,120,1)';
      rr(e, -3, -3, 6, 6, 1.5);
      e.fill();
    },
    0.4,
    0.8,
    0.5
  );
  region(
    'gen',
    50,
    40,
    (a, e) => {
      // portable generator from above: tubular frame, scuffed fuel tank, muffler, outlet panel, a small status lamp
      for (const [x0, y0, x1, y1] of [
        [-21, -15, 21, -15],
        [-21, 15, 21, 15],
        [-21, -15, -21, 15],
        [21, -15, 21, 15],
      ]) {
        a.strokeStyle = '#141414';
        a.lineWidth = 3.4;
        a.beginPath();
        a.moveTo(x0, y0);
        a.lineTo(x1, y1);
        a.stroke();
        a.strokeStyle = '#3a3a3a';
        a.lineWidth = 1.6;
        a.stroke();
        a.strokeStyle = 'rgba(255,255,255,0.18)';
        a.lineWidth = 0.5;
        a.beginPath();
        a.moveTo(x0 - 0.4, y0 - 0.4);
        a.lineTo(x1 - 0.4, y1 - 0.4);
        a.stroke();
      }
      rr(a, -18, -12, 36, 24, 3);
      a.fillStyle = '#26272a';
      a.fill();
      const tank = c => rr(c, -15, -10.5, 22, 21, 5);
      tank(a);
      a.fillStyle = grad(a, -15, -10, 7, 10, [
        [0, '#a8882e'],
        [1, '#6e561a'],
      ]);
      a.fill();
      a.save();
      tank(a);
      a.clip();
      for (let i = 0; i < 14; i++) {
        a.fillStyle = pick(['rgba(60,40,10,0.35)', 'rgba(20,16,10,0.3)', 'rgba(255,240,200,0.12)']);
        ell(a, rand(-15, 7), rand(-10, 10), rand(0.8, 3), rand(0.5, 1.8), rand(0, 3));
        a.fill();
      }
      a.fillStyle = rgrad(
        a,
        -4,
        0,
        14,
        [
          [0, 'rgba(255,245,210,0.16)'],
          [1, 'rgba(0,0,0,0.35)'],
        ],
        -8,
        -6
      );
      a.fillRect(-16, -12, 24, 24);
      a.restore();
      tank(a);
      a.strokeStyle = 'rgba(14,10,6,0.7)';
      a.lineWidth = 0.7;
      a.stroke();
      circ(a, -6, -3, 3);
      a.fillStyle = '#1a1a1a';
      a.fill();
      circ(a, -6, -3, 2);
      a.fillStyle = '#3a3a3a';
      a.fill();
      a.strokeStyle = 'rgba(255,255,255,0.2)';
      a.lineWidth = 0.4;
      circ(a, -6.3, -3.3, 1.4);
      a.stroke();
      rr(a, 9, -10, 8, 9, 1.5);
      a.fillStyle = '#2e2f32';
      a.fill();
      for (let x = 10; x < 16.5; x += 1.4) {
        a.fillStyle = 'rgba(0,0,0,0.6)';
        a.fillRect(x, -9, 0.7, 7);
      }
      rr(a, 9, 1, 8, 9, 1.2);
      a.fillStyle = '#1e1f22';
      a.fill();
      for (const [x, y] of [
        [11.4, 4],
        [14.6, 4],
      ]) {
        a.fillStyle = '#0a0a0a';
        rr(a, x - 1, y - 1.2, 2, 2.4, 0.4);
        a.fill();
      }
      circ(a, 13, 8, 0.9);
      a.fillStyle = '#5aa060';
      a.fill();
      e.fillStyle = 'rgba(120,255,140,0.9)';
      circ(e, 13, 8, 0.8);
      e.fill();
      a.strokeStyle = '#111';
      a.lineWidth = 1.4;
      a.beginPath();
      a.moveTo(17, 6);
      a.bezierCurveTo(22, 8, 21, 14, 24, 18);
      a.stroke();
    },
    0.16,
    0.6,
    1
  );
  region(
    'fuelcan',
    22,
    28,
    a => {
      shape(
        a,
        c => rr(c, -9, -12, 18, 24, 3),
        grad(a, -9, -12, 9, 12, [
          [0, '#d83a2a'],
          [1, '#7a1a12'],
        ]),
        { lw: 1.8 }
      );
      a.strokeStyle = 'rgba(0,0,0,0.35)';
      a.lineWidth = 1.4;
      a.beginPath();
      a.moveTo(-9, -12);
      a.lineTo(9, 12);
      a.moveTo(9, -12);
      a.lineTo(-9, 12);
      a.stroke();
      shape(a, c => rr(c, 2, -15, 6, 5, 1), '#2a2a2a', { lw: 1 });
      shape(a, c => rr(c, -7, -15, 7, 3, 1), '#3a3a3a', { lw: 0.8 });
    },
    0.6,
    0.6,
    1
  );
  region(
    'heli',
    272,
    112,
    (a, e) => {
      // the evac helicopter seen from above, nose at +x (the baked 3D version replaces this where it can)
      const od = '#4b5135';
      shape(a, c => rr(c, -114, -4.5, 96, 9, 4), od, { lw: 1.2 });
      shape(a, c => rr(c, -121, -34, 14, 68, 2), od, { lw: 1 });
      shape(a, c => rr(c, -130, 5, 26, 2.6, 1), '#222', { lw: 0.6 });
      shape(
        a,
        c => {
          c.beginPath();
          c.moveTo(-28, -8);
          c.lineTo(16, -19.5);
          c.lineTo(92, -19);
          c.quadraticCurveTo(126, -16, 126, 0);
          c.quadraticCurveTo(126, 16, 92, 19);
          c.lineTo(16, 19.5);
          c.lineTo(-28, 8);
          c.closePath();
        },
        grad(a, 0, -20, 0, 20, [
          [0, '#5a6044'],
          [0.5, '#4b5135'],
          [1, '#3a3f29'],
        ]),
        { lw: 1.6 }
      );
      shape(a, c => rr(c, 10, -10, 60, 20, 5), '#454a31', { lw: 1 });
      a.fillStyle = 'rgba(14,22,27,0.95)';
      a.beginPath();
      a.moveTo(96, -16);
      a.quadraticCurveTo(113, -14, 115, 0);
      a.quadraticCurveTo(113, 14, 96, 16);
      a.closePath();
      a.fill();
      a.fillStyle = '#1c1d18';
      a.beginPath();
      a.moveTo(115, -10);
      a.quadraticCurveTo(126, -6, 126, 0);
      a.quadraticCurveTo(126, 6, 115, 10);
      a.closePath();
      a.fill();
      a.fillStyle = '#e8e4da';
      a.fillRect(-47, -7, 14, 14);
      a.fillStyle = '#b02020';
      a.fillRect(-45.5, -1.8, 11, 3.6);
      a.fillRect(-41.8, -5.5, 3.6, 11);
      a.fillStyle = '#2c2e2c';
      circ(a, 48, 0, 6);
      a.fill();
      e.fillStyle = 'rgba(255,60,40,1)';
      circ(e, 70, -20.5, 2.2);
      e.fill();
      e.fillStyle = 'rgba(120,255,140,1)';
      circ(e, 70, 20.5, 2.2);
      e.fill();
      e.fillStyle = 'rgba(255,255,255,1)';
      circ(e, -126, 0, 1.8);
      e.fill(); // red on the left of the heading, green on the right, white at the tail
    },
    0.5,
    0.5,
    1
  );
  region(
    'carburn',
    84,
    46,
    a => {
      shape(
        a,
        c => rr(c, -39, -19, 78, 38, 9),
        grad(a, 0, -19, 0, 19, [
          [0, '#2e2a28'],
          [1, '#141212'],
        ]),
        { lw: 2.4, out: '#0a0808' }
      );
      a.fillStyle = '#0c0a0a';
      rr(a, 6, -14, 14, 28, 4);
      a.fill();
      rr(a, -26, -13, 10, 26, 3);
      a.fill();
      a.fillStyle = 'rgba(140,70,30,0.6)';
      for (let i = 0; i < 9; i++) {
        circ(a, rand(-34, 34), rand(-15, 15), rand(2, 5));
        a.fill();
      }
      a.fillStyle = 'rgba(200,200,190,0.35)';
      for (let i = 0; i < 20; i++) {
        circ(a, rand(-40, 40), rand(-20, 20), rand(0.5, 1.4));
        a.fill();
      }
    },
    0.2,
    0.5,
    1
  );
  region(
    'molotov',
    18,
    10,
    (a, e) => {
      shape(
        a,
        c => rr(c, -7, -3.4, 11, 6.8, 3),
        grad(a, 0, -3.4, 0, 3.4, [
          [0, '#7aa058'],
          [1, '#3a5a2a'],
        ]),
        { lw: 1.2 }
      );
      shape(a, c => rr(c, 3, -1.6, 5, 3.2, 1), '#c8b890', { lw: 0.8 });
      radial(e, 8, 0, 3, [
        [0, 'rgba(255,200,80,1)'],
        [1, 'rgba(255,120,30,0)'],
      ]);
    },
    0.6,
    0.8,
    0.5
  );
  /* ----- 2.5D blocks: wall tops (40x40) and front faces (40 x height) ----- */
  const bricks = (a, w, h, col, mort, seedOff = 0) => {
    a.fillStyle = mort;
    a.fillRect(-w / 2, -h / 2, w, h);
    const bh = 6.5;
    for (let r = 0, y = -h / 2; y < h / 2; r++, y += bh) {
      for (let x = -w / 2 - (r & 1 ? 6 : 0); x < w / 2; x += 12) {
        const v = rand(-14, 14);
        a.fillStyle = `rgb(${col[0] + v},${col[1] + v * 0.6},${col[2] + v * 0.5})`;
        a.fillRect(x + 0.7, y + 0.7, 10.6, bh - 1.4);
      }
    }
  };
  const faceShade = (a, w, h) => {
    a.fillStyle = grad(a, 0, -h / 2, 0, h / 2, [
      [0, 'rgba(255,255,255,0.08)'],
      [0.7, 'rgba(0,0,0,0.1)'],
      [1, 'rgba(0,0,0,0.45)'],
    ]);
    a.fillRect(-w / 2, -h / 2, w, h);
    a.fillStyle = 'rgba(0,0,0,0.5)';
    a.fillRect(-w / 2, -h / 2, w, 1.4);
  };
  region(
    'wt_brick',
    40,
    40,
    a => {
      a.fillStyle = '#6a4436';
      a.fillRect(-20, -20, 40, 40);
      bricks(a, 40, 40, [112, 66, 52], '#4a3a32');
      a.fillStyle = 'rgba(230,220,200,0.12)';
      a.fillRect(-20, -20, 40, 40);
      for (let i = 0; i < 4; i++) {
        a.fillStyle = 'rgba(40,30,24,0.35)';
        circ(a, rand(-16, 16), rand(-16, 16), rand(2, 5));
        a.fill();
      }
    },
    0.2,
    0.15,
    1.2
  );
  const shards = (a, x0, y0, w, h) => {
    a.fillStyle = 'rgba(190,215,225,0.75)';
    for (const [cx, cy, sx, sy] of [
      [x0, y0, 1, 1],
      [x0 + w, y0, -1, 1],
      [x0, y0 + h, 1, -1],
      [x0 + w, y0 + h, -1, -1],
    ]) {
      a.beginPath();
      a.moveTo(cx, cy);
      a.lineTo(cx + sx * rand(3, w * 0.5), cy);
      a.lineTo(cx + sx * rand(1, 3), cy + sy * rand(1, 3));
      a.lineTo(cx, cy + sy * rand(3, h * 0.6));
      a.closePath();
      a.fill();
    }
  };
  for (const v of ['', 'win', 'dark', 'post', 'crack', 'brk'])
    region(
      'wf_brick' + v,
      40,
      28,
      (a, e) => {
        bricks(a, 40, 28, [128, 72, 56], '#5a4a40');
        if (v === 'brk') {
          shape(a, c => rr(c, -9, -10, 18, 15, 1), '#0c0806', { lw: 1.6, out: '#3a2a20' });
          shards(a, -7.5, -8.5, 15, 12);
          a.fillStyle = '#8a7a6a';
          a.fillRect(-10, 5, 20, 2);
        }
        if (v === 'win' || v === 'dark') {
          shape(a, c => rr(c, -9, -10, 18, 15, 1), '#20160e', { lw: 1.6, out: '#3a2a20' });
          const lit = v === 'win';
          if (lit) {
            a.fillStyle = '#f2c070';
            a.fillRect(-7.5, -8.5, 15, 12);
            e.fillStyle = 'rgba(255,190,100,1)';
            e.fillRect(-7.5, -8.5, 15, 12);
            a.fillStyle = 'rgba(80,40,20,0.75)';
            ell(a, rand(-3, 3), -1, 3, 4.5, 0);
            a.fill();
          }
          a.fillStyle = '#3a2a20';
          a.fillRect(-0.8, -9, 1.6, 13);
          a.fillRect(-8, -3, 16, 1.4);
          a.fillStyle = '#8a7a6a';
          a.fillRect(-10, 5, 20, 2);
        }
        if (v === 'post') {
          const px = rand(-10, 4),
            cols = ['#d8d0b8', '#c84a3a', '#3a6a9a', '#e8c040'];
          for (let i = 0; i < 2; i++) {
            a.save();
            a.translate(px + i * 9, -3);
            a.rotate(rand(-0.15, 0.15));
            a.fillStyle = pick(cols);
            a.fillRect(-4, -6, 8, 11);
            a.fillStyle = 'rgba(20,20,20,0.6)';
            a.fillRect(-3, -4, 6, 1.4);
            a.fillRect(-3, -1, 4, 1);
            a.restore();
          }
        }
        if (v === 'crack') {
          a.strokeStyle = 'rgba(20,14,10,0.8)';
          a.lineWidth = 1.4;
          a.beginPath();
          let x = rand(-8, 8),
            y = -14;
          a.moveTo(x, y);
          for (let k = 0; k < 6; k++) {
            x += rand(-4, 4);
            y += 4.6;
            a.lineTo(x, y);
          }
          a.stroke();
          a.fillStyle = 'rgba(120,10,8,0.6)';
          ell(a, rand(-8, 8), rand(-4, 6), rand(3, 6), rand(2, 4), 0);
          a.fill();
        }
        faceShade(a, 40, 28);
      },
      0.15,
      0.1,
      0.9
    );
  region(
    'wt_conc',
    40,
    40,
    a => {
      a.fillStyle = '#a8a69e';
      a.fillRect(-20, -20, 40, 40);
      a.strokeStyle = 'rgba(60,58,54,0.45)';
      a.lineWidth = 1;
      a.strokeRect(-19.5, -19.5, 39, 39);
      for (let i = 0; i < 14; i++) {
        a.fillStyle = 'rgba(70,68,62,0.3)';
        circ(a, rand(-18, 18), rand(-18, 18), rand(1, 3));
        a.fill();
      }
    },
    0.2,
    0.15,
    1
  );
  for (const v of ['', 'win', 'brk'])
    region(
      'wf_conc' + v,
      40,
      30,
      (a, e) => {
        a.fillStyle = '#b4b2aa';
        a.fillRect(-20, -15, 40, 30);
        a.strokeStyle = 'rgba(70,68,62,0.4)';
        a.lineWidth = 1;
        for (let y = -15; y < 15; y += 7.5) {
          a.beginPath();
          a.moveTo(-20, y);
          a.lineTo(20, y);
          a.stroke();
          for (let x = -20 + (((y + 15) / 7.5) & 1) * 8; x < 20; x += 16) {
            a.beginPath();
            a.moveTo(x, y);
            a.lineTo(x, y + 7.5);
            a.stroke();
          }
        }
        if (v === 'brk') {
          shape(a, c => rr(c, -14, -11, 28, 14, 1), '#0a0e10', { lw: 1.4 });
          shards(a, -12.5, -9.5, 25, 11);
        }
        if (v === 'win') {
          shape(a, c => rr(c, -14, -11, 28, 14, 1), '#1a2228', { lw: 1.4 });
          if (Math.random() < 0.5) {
            a.fillStyle = '#d8e8e0';
            a.fillRect(-12.5, -9.5, 25, 11);
            e.fillStyle = 'rgba(200,240,230,1)';
            e.fillRect(-12.5, -9.5, 25, 11);
          }
          a.fillStyle = '#c03a2a';
          a.font = '700 5px monospace';
          a.textAlign = 'center';
          a.fillText('OPEN 24H', 0, -2);
        }
        faceShade(a, 40, 30);
      },
      0.15,
      0.1,
      0.9
    );
  region(
    'wt_barr',
    40,
    40,
    a => {
      a.fillStyle = '#b0aea6';
      a.fillRect(-20, -9, 40, 18);
      a.fillStyle = '#8a8880';
      a.fillRect(-20, -20, 40, 11);
      a.fillRect(-20, 9, 40, 11);
      a.fillStyle = 'rgba(0,0,0,0.25)';
      a.fillRect(-20, -9, 40, 1);
      a.fillRect(-20, 8, 40, 1);
    },
    0.2,
    0.2,
    1
  );
  region(
    'wf_barr',
    40,
    16,
    a => {
      a.fillStyle = '#a8a69e';
      a.fillRect(-20, -8, 40, 16);
      a.save();
      a.beginPath();
      a.rect(-20, -2, 40, 6);
      a.clip();
      a.fillStyle = '#e8b830';
      a.fillRect(-20, -2, 40, 6);
      a.fillStyle = '#1a1a1a';
      for (let x = -26; x < 22; x += 8) {
        a.beginPath();
        a.moveTo(x, 4);
        a.lineTo(x + 4, -2);
        a.lineTo(x + 7, -2);
        a.lineTo(x + 3, 4);
        a.fill();
      }
      a.restore();
      faceShade(a, 40, 16);
    },
    0.2,
    0.1,
    0.9
  );
  region(
    'wt_stone',
    40,
    40,
    a => {
      a.fillStyle = '#6a6660';
      a.fillRect(-20, -20, 40, 40);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const v = randi(-14, 14);
          a.fillStyle = `rgb(${110 + v},${106 + v},${98 + v})`;
          rr(a, -19 + i * 10, -19 + j * 10, 9, 9, 1.5);
          a.fill();
        }
      a.fillStyle = 'rgba(80,110,60,0.5)';
      for (let i = 0; i < 5; i++) {
        circ(a, rand(-18, 18), rand(-18, 18), rand(2, 4));
        a.fill();
      }
    },
    0.2,
    0.15,
    1.2
  );
  region(
    'wf_stone',
    40,
    30,
    a => {
      a.fillStyle = '#4a4642';
      a.fillRect(-20, -15, 40, 30);
      for (let r = 0; r < 3; r++)
        for (let x = -20 - (r & 1) * 7; x < 20; x += 14) {
          const v = randi(-12, 12);
          a.fillStyle = `rgb(${104 + v},${100 + v},${92 + v})`;
          rr(a, x + 0.8, -15 + r * 10 + 0.8, 12.4, 8.4, 1.4);
          a.fill();
        }
      a.fillStyle = 'rgba(70,100,50,0.5)';
      for (let i = 0; i < 4; i++) {
        ell(a, rand(-18, 18), rand(-12, 14), rand(2, 5), rand(1.4, 3), 0);
        a.fill();
      }
      faceShade(a, 40, 30);
    },
    0.15,
    0.1,
    1
  );
  region(
    'wt_bord',
    40,
    40,
    a => {
      a.fillStyle = '#5a5650';
      a.fillRect(-20, -20, 40, 40);
      a.strokeStyle = 'rgba(20,18,16,0.5)';
      a.lineWidth = 1.4;
      a.strokeRect(-18, -18, 36, 36);
      for (let i = 0; i < 8; i++) {
        a.fillStyle = 'rgba(30,28,24,0.4)';
        circ(a, rand(-18, 18), rand(-18, 18), rand(1, 3.5));
        a.fill();
      }
    },
    0.2,
    0.15,
    1
  );
  for (let k = 0; k < 3; k++)
    region(
      'wf_bord' + k,
      40,
      32,
      a => {
        a.fillStyle = '#6e6a62';
        a.fillRect(-20, -16, 40, 32);
        a.fillStyle = 'rgba(0,0,0,0.35)';
        a.fillRect(-0.6, -16, 1.2, 32);
        if (k) {
          a.lineCap = 'round';
          for (let s = 0; s < 3; s++) {
            a.strokeStyle = pick(['#c83a3a', '#e8e0c8', '#3a8ac8', '#e8c040', '#8a3ac8']);
            a.lineWidth = rand(2, 3.4);
            a.beginPath();
            let x = rand(-16, -4),
              y = rand(-8, 8);
            a.moveTo(x, y);
            for (let j = 0; j < 4; j++) {
              x += rand(4, 9);
              y += rand(-6, 6);
              a.lineTo(x, y);
            }
            a.stroke();
          }
          if (k === 2) {
            a.fillStyle = '#e8e0c8';
            a.font = '900 9px Kanit, sans-serif';
            a.textAlign = 'center';
            a.fillText(pick(['RUN', 'HELP', 'NO', 'DEAD', 'GO N']), 0, 4);
          }
        }
        faceShade(a, 40, 32);
      },
      0.15,
      0.1,
      0.9
    );
  region(
    'wf_fence',
    40,
    26,
    a => {
      a.strokeStyle = '#141414';
      a.lineWidth = 2;
      for (let x = -18; x <= 18; x += 6) {
        a.beginPath();
        a.moveTo(x, -10);
        a.lineTo(x, 13);
        a.stroke();
        a.fillStyle = '#141414';
        a.beginPath();
        a.moveTo(x - 2, -10);
        a.lineTo(x, -13);
        a.lineTo(x + 2, -10);
        a.fill();
      }
      a.lineWidth = 2.4;
      for (const y of [-6, 9]) {
        a.beginPath();
        a.moveTo(-20, y);
        a.lineTo(20, y);
        a.stroke();
      }
    },
    0.5,
    0.4,
    0.4
  );
  region(
    'roof_t',
    40,
    40,
    a => {
      a.fillStyle = '#3e3a3a';
      a.fillRect(-20, -20, 40, 40);
      for (let r = 0; r < 6; r++)
        for (let x = -20 - (r & 1) * 5; x < 20; x += 10) {
          const v = randi(-10, 10);
          a.fillStyle = `rgb(${74 + v},${62 + v},${60 + v})`;
          rr(a, x + 0.6, -20 + r * 6.7 + 0.6, 8.8, 6, 1.2);
          a.fill();
          a.fillStyle = 'rgba(0,0,0,0.3)';
          a.fillRect(x + 0.6, -20 + r * 6.7 + 5.2, 8.8, 1.4);
        }
      a.fillStyle = 'rgba(200,200,190,0.08)';
      a.fillRect(-20, -20, 40, 40);
    },
    0.25,
    0.1,
    1.2
  );
  region(
    'r_chim',
    18,
    18,
    a => {
      // a brick chimney stack from above: the flue dark and sooty, a cracked cap
      a.fillStyle = '#5a3a2e';
      a.fillRect(-8, -8, 16, 16);
      bricks(a, 16, 16, [104, 62, 48], '#3e2a22');
      a.fillStyle = 'rgba(0,0,0,0.25)';
      a.fillRect(-8, 4, 16, 4);
      a.fillStyle = '#8a8478';
      a.fillRect(-7, -7, 14, 2);
      a.fillRect(-7, -7, 2, 14);
      a.fillStyle = '#141210';
      rr(a, -4, -4, 8, 8, 1.5);
      a.fill();
      a.fillStyle = 'rgba(20,16,12,0.5)';
      circ(a, 0, 0, 7);
      a.fill();
    },
    0.2,
    0.7,
    1.2
  );
  region(
    'r_vent',
    10,
    10,
    a => {
      circ(a, 0, 0, 4.2);
      a.fillStyle = '#6a6a66';
      a.fill();
      a.strokeStyle = '#2a2a28';
      a.lineWidth = 0.8;
      a.stroke();
      circ(a, -0.8, -0.8, 2.4);
      a.fillStyle = '#9a9890';
      a.fill();
      a.fillStyle = 'rgba(90,50,30,0.5)';
      circ(a, 1.4, 1.2, 1.6);
      a.fill();
    },
    0.6,
    0.8,
    1
  );
  region(
    'r_dish',
    16,
    16,
    a => {
      circ(a, 0, 0, 6.5);
      a.fillStyle = '#c8c6be';
      a.fill();
      a.strokeStyle = '#4a4a46';
      a.lineWidth = 0.8;
      a.stroke();
      a.fillStyle = 'rgba(0,0,0,0.18)';
      circ(a, 1.5, 1.5, 4.5);
      a.fill();
      a.strokeStyle = '#3a3a36';
      a.lineWidth = 1;
      a.beginPath();
      a.moveTo(0, 0);
      a.lineTo(6, -5);
      a.stroke();
      a.fillStyle = '#2a2a28';
      circ(a, 6, -5, 1.2);
      a.fill();
    },
    0.5,
    0.8,
    1
  );
  region(
    'r_sky',
    16,
    22,
    (a, e) => {
      a.fillStyle = '#3a3a36';
      rr(a, -7, -10, 14, 20, 1.5);
      a.fill();
      a.fillStyle = '#121a1e';
      rr(a, -5.5, -8.5, 11, 17, 1);
      a.fill();
      a.fillStyle = 'rgba(160,190,200,0.25)';
      a.beginPath();
      a.moveTo(-5, -8);
      a.lineTo(1, -8);
      a.lineTo(-5, 2);
      a.fill();
      if (Math.random() < 0.5) {
        a.strokeStyle = 'rgba(200,220,230,0.5)';
        a.lineWidth = 0.5;
        a.beginPath();
        a.moveTo(-3, -6);
        a.lineTo(2, 1);
        a.lineTo(4, -3);
        a.stroke();
      }
    },
    0.8,
    0.6,
    1
  );
  region(
    'roof_edge',
    40,
    8,
    a => {
      a.fillStyle = '#2a2624';
      a.fillRect(-20, -4, 40, 8);
      a.fillStyle = 'rgba(255,255,255,0.12)';
      a.fillRect(-20, -4, 40, 1.4);
      a.fillStyle = '#5a4a3a';
      a.fillRect(-20, 2, 40, 2);
    },
    0.2,
    0.1,
    0.6
  );
  // vehicles: neutral body, tinted per car when drawn
  const carTop = (a, e, L, W, police, truck) => {
    a.fillStyle = 'rgba(0,0,0,0.55)';
    for (const [wx, wy] of [
      [-L * 0.31, -W / 2 - 1],
      [-L * 0.31, W / 2 + 1],
      [L * 0.31, -W / 2 - 1],
      [L * 0.31, W / 2 + 1],
    ]) {
      rr(a, wx - 8, wy - 4, 16, 8, 3);
      a.fill();
    }
    if (truck) {
      shape(
        a,
        c => rr(c, -L / 2, -W / 2, L * 0.72, W, 4),
        grad(a, 0, -W / 2, 0, W / 2, [
          [0, '#ecebe6'],
          [1, '#b8b6b0'],
        ]),
        { lw: 2.2, out: '#141210' }
      );
      a.strokeStyle = 'rgba(0,0,0,0.15)';
      a.lineWidth = 1;
      for (let x = -L / 2 + 8; x < L * 0.22; x += 10) {
        a.beginPath();
        a.moveTo(x, -W / 2 + 2);
        a.lineTo(x, W / 2 - 2);
        a.stroke();
      }
      shape(a, c => rr(c, L * 0.24, -W / 2 + 2, L * 0.26, W - 4, 7), '#d0d0d0', { lw: 2, out: '#141210' });
      a.fillStyle = '#24303a';
      rr(a, L * 0.36, -W / 2 + 5, 9, W - 10, 3);
      a.fill();
    } else {
      shape(
        a,
        c => rr(c, -L / 2, -W / 2, L, W, 9),
        grad(a, 0, -W / 2, 0, W / 2, [
          [0, police ? '#1a1a1e' : '#e6e6e6'],
          [0.5, police ? '#2a2a30' : '#d0d0d0'],
          [1, police ? '#121214' : '#a8a8a8'],
        ]),
        { lw: 2.4, out: '#141210' }
      );
      if (police) {
        a.fillStyle = '#ecebe6';
        rr(a, -12, -W / 2 + 1, 26, W - 2, 3);
        a.fill();
        a.fillStyle = '#1a1a1e';
        a.font = '700 6px monospace';
        a.textAlign = 'center';
        a.save();
        a.rotate(Math.PI / 2);
        a.fillText('POLICE', 0, -2);
        a.restore();
      }
      a.fillStyle = 'rgba(255,255,255,0.2)';
      rr(a, -L / 2 + 4, -W / 2 + 3, L - 8, 4, 2);
      a.fill();
      a.fillStyle = '#1e2a34';
      rr(a, 6, -W / 2 + 5, 14, W - 10, 4);
      a.fill();
      rr(a, -26, -W / 2 + 6, 10, W - 12, 3);
      a.fill();
      a.fillStyle = 'rgba(160,200,220,0.25)';
      rr(a, 8, -W / 2 + 7, 4, W - 14, 2);
      a.fill();
      a.fillStyle = police ? '#2a2a30' : 'rgba(0,0,0,0.12)';
      rr(a, -16, -W / 2 + 5, 22, W - 10, 4);
      a.fill();
      if (police) {
        a.fillStyle = '#2020a0';
        a.fillRect(-4, -W / 2 + 6, 5, (W - 12) / 2);
        a.fillStyle = '#c02020';
        a.fillRect(-4, 0, 5, (W - 12) / 2);
      }
    }
    a.fillStyle = '#f0e6c0';
    a.fillRect(L / 2 - 3, -W / 2 + 4, 3, 6);
    a.fillRect(L / 2 - 3, W / 2 - 10, 3, 6);
    a.fillStyle = '#a02020';
    a.fillRect(-L / 2, -W / 2 + 4, 3, 6);
    a.fillRect(-L / 2, W / 2 - 10, 3, 6);
    e.fillStyle = 'rgba(255,245,210,1)';
    e.fillRect(L / 2 - 3, -W / 2 + 4, 3, 6);
    e.fillRect(L / 2 - 3, W / 2 - 10, 3, 6);
    e.fillStyle = 'rgba(255,40,30,1)';
    e.fillRect(-L / 2, -W / 2 + 4, 3, 6);
    e.fillRect(-L / 2, W / 2 - 10, 3, 6);
    a.fillStyle = 'rgba(90,60,40,0.35)';
    for (let k = 0; k < 6; k++) {
      circ(a, rand(-L / 2 + 4, L / 2 - 4), rand(-W / 2 + 3, W / 2 - 3), rand(2, 4));
      a.fill();
    }
  };
  region('car', 84, 46, (a, e) => carTop(a, e, 78, 38, false, false), 0.4, 0.3, 0.8);
  region('police', 84, 46, (a, e) => carTop(a, e, 78, 38, true, false), 0.45, 0.3, 0.8);
  region('truck', 124, 52, (a, e) => carTop(a, e, 118, 44, false, true), 0.4, 0.3, 0.8);
  region(
    'lightbar',
    10,
    26,
    (a, e) => {
      a.fillStyle = '#1a1a1e';
      rr(a, -4, -12, 8, 24, 2);
      a.fill();
      a.fillStyle = '#2a4aff';
      a.fillRect(-3, -11, 6, 10);
      a.fillStyle = '#ff2a2a';
      a.fillRect(-3, 1, 6, 10);
      e.fillStyle = 'rgba(60,90,255,1)';
      e.fillRect(-3, -11, 6, 10);
    },
    0.8,
    0.8,
    0.4
  );
  region(
    'lightbar2',
    10,
    26,
    (a, e) => {
      a.fillStyle = '#1a1a1e';
      rr(a, -4, -12, 8, 24, 2);
      a.fill();
      a.fillStyle = '#2a4aff';
      a.fillRect(-3, -11, 6, 10);
      a.fillStyle = '#ff2a2a';
      a.fillRect(-3, 1, 6, 10);
      e.fillStyle = 'rgba(255,40,40,1)';
      e.fillRect(-3, 1, 6, 10);
    },
    0.8,
    0.8,
    0.4
  );
  for (let k = 0; k < 8; k++)
    region(
      'grave' + k,
      40,
      46,
      a => {
        // eight kinds of marker, seen from the front like the rest of the stonework: headstones, crosses, an obelisk, a double stone, broken ones
        const pale = k === 3 || k === 7 ? '#7a766e' : pick(['#a8a49c', '#9a978e', '#b0aaa0']),
          stone = grad(a, -12, 0, 12, 0, [
            [0, pale],
            [1, '#625e58'],
          ]),
          O = { lw: 1.5, out: '#2a2826' };
        const moss = (x, y, r) => {
          for (let i = 0; i < 6; i++) {
            a.fillStyle = `rgba(${randi(60, 84)},${randi(92, 110)},${randi(48, 60)},${rand(0.4, 0.7)})`;
            circ(a, x + rand(-r, r), y + rand(-r * 0.5, r * 0.5), rand(1, 2.4));
            a.fill();
          }
        };
        const lines = (x0, x1, y0, y1) => {
          a.strokeStyle = 'rgba(30,28,26,0.5)';
          a.lineWidth = 0.9;
          for (let y = y0; y < y1; y += 3) {
            a.beginPath();
            a.moveTo(x0, y);
            a.lineTo(x1 - rand(0, 4), y);
            a.stroke();
          }
        };
        a.fillStyle = 'rgba(0,0,0,0.35)';
        ell(a, 0, 20, 15, 3);
        a.fill(); // where it meets the ground
        if (k === 0 || k === 3) {
          a.save();
          if (k === 3) a.rotate(-0.2);
          shape(
            a,
            c => {
              c.beginPath();
              c.moveTo(-9, 20);
              c.lineTo(-9, -1);
              c.arc(0, -1, 9, Math.PI, 0);
              c.lineTo(9, 20);
              c.closePath();
            },
            stone,
            O
          );
          lines(-5, 5, 3, 16);
          moss(rand(-4, 4), 17, 5);
          if (k === 3) {
            a.strokeStyle = 'rgba(20,18,16,0.9)';
            a.lineWidth = 1.2;
            a.beginPath();
            a.moveTo(-9, 4);
            a.lineTo(1, 8);
            a.lineTo(9, 2);
            a.stroke();
          }
          a.restore();
        } else if (k === 1) {
          shape(
            a,
            c => {
              c.beginPath();
              c.rect(-2.8, -16, 5.6, 36);
              c.rect(-10, -9, 20, 5.4);
            },
            stone,
            O
          );
          moss(0, 18, 4);
        } else if (k === 2) {
          shape(
            a,
            c => {
              c.beginPath();
              c.moveTo(-16, 20);
              c.lineTo(-16, 4);
              c.arc(-8, 4, 8, Math.PI, 0);
              c.arc(8, 4, 8, Math.PI, 0);
              c.lineTo(16, 20);
              c.closePath();
            },
            stone,
            O
          );
          lines(-13, -3, 7, 17);
          lines(3, 13, 7, 17);
          a.strokeStyle = 'rgba(30,28,26,0.5)';
          a.beginPath();
          a.moveTo(0, 6);
          a.lineTo(0, 19);
          a.stroke();
          moss(-10, 18, 5);
        } else if (k === 4) {
          shape(
            a,
            c => {
              c.beginPath();
              c.moveTo(-10, 20);
              c.lineTo(-10, 13);
              c.lineTo(-6, 13);
              c.lineTo(-4.5, -14);
              c.lineTo(0, -20);
              c.lineTo(4.5, -14);
              c.lineTo(6, 13);
              c.lineTo(10, 13);
              c.lineTo(10, 20);
              c.closePath();
            },
            stone,
            O
          );
          a.fillStyle = 'rgba(255,255,255,0.12)';
          a.beginPath();
          a.moveTo(-4.5, -14);
          a.lineTo(0, -20);
          a.lineTo(-1, 13);
          a.lineTo(-6, 13);
          a.closePath();
          a.fill();
          moss(0, 17, 6);
        } // an obelisk on a plinth
        else if (k === 5) {
          shape(
            a,
            c => {
              c.beginPath();
              c.rect(-3, -14, 6, 34);
              c.rect(-11, -7, 22, 6);
            },
            stone,
            O
          );
          a.strokeStyle = '#2a2826';
          a.lineWidth = 4.4;
          a.beginPath();
          a.arc(0, -4, 7, 0, TAU);
          a.stroke();
          a.strokeStyle = pale;
          a.lineWidth = 2.4;
          a.stroke();
          moss(0, 18, 4);
        } // a ringed cross
        else if (k === 6) {
          shape(a, c => rr(c, -8, 6, 16, 14, 2), stone, O);
          lines(-5, 5, 10, 17);
          for (let i = 0; i < 5; i++) {
            a.fillStyle = pick(['rgba(120,40,40,0.9)', 'rgba(150,130,60,0.9)', 'rgba(90,60,90,0.9)']);
            circ(a, rand(-9, 9), rand(19, 22), rand(1.2, 2));
            a.fill();
          }
          a.strokeStyle = 'rgba(60,80,40,0.8)';
          a.lineWidth = 0.8;
          for (let i = 0; i < 5; i++) {
            a.beginPath();
            a.moveTo(rand(-8, 8), 22);
            a.lineTo(rand(-9, 9), 18);
            a.stroke();
          }
        } // a small marker, dead flowers in front
        else {
          shape(
            a,
            c => {
              c.beginPath();
              c.moveTo(-9, 20);
              c.lineTo(-9, 6);
              c.lineTo(-4, 3);
              c.lineTo(0, 7);
              c.lineTo(5, 2);
              c.lineTo(9, 5);
              c.lineTo(9, 20);
              c.closePath();
            },
            stone,
            O
          );
          a.save();
          a.translate(10, 16);
          a.rotate(1.2);
          shape(a, c => rr(c, -4, -3, 9, 6, 1.5), stone, { lw: 1.2, out: '#2a2826' });
          a.restore();
          moss(-3, 17, 5);
        } // snapped off, the top lying in the grass
      },
      0.3,
      0.3,
      1
    );
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
  /* ----- interiors: plaster walls, furniture seen from above ----- */

  region(
    'fprint',
    10,
    16,
    a => {
      // boot sole: tread bars on the ball, a separate heel block
      a.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) {
        const y = -6.6 + i * 1.5,
          w = 2.9 - Math.abs(i - 2) * 0.25;
        a.fillRect(-w, y, w * 2, 0.95);
      }
      a.beginPath();
      a.ellipse(0, -6.4, 2.4, 1.1, 0, Math.PI, TAU);
      a.fill();
      for (let i = 0; i < 3; i++) a.fillRect(-2.1, 3.2 + i * 1.35, 4.2, 0.9);
      a.fillStyle = 'rgba(255,255,255,0.45)';
      a.fillRect(-0.4, -6.8, 0.8, 9);
    },
    0.3,
    0.6,
    0.6
  );
  region(
    'ftongue',
    18,
    34,
    (a, e) => {
      // a single tongue of flame (emissive only): round base, licking tip, hotter core
      // soft all the way through: a tall glowing teardrop that fades out at the edges, brightest low in the body, no hard outlines
      e.save();
      e.scale(1, 2.1);
      {
        const g = e.createRadialGradient(0, 0.6, 0, 0, 0.2, 8.6);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.32, 'rgba(255,255,255,0.82)');
        g.addColorStop(0.62, 'rgba(255,255,255,0.32)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        e.fillStyle = g;
        e.beginPath();
        e.arc(0, 0.2, 8.6, 0, TAU);
        e.fill();
      }
      e.restore();
      {
        const g = e.createLinearGradient(0, -16, 0, -2);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(255,255,255,0.45)');
        e.fillStyle = g;
        e.beginPath();
        e.moveTo(0, -16);
        e.bezierCurveTo(2.6, -10, 4.4, -5, 3.6, -1);
        e.lineTo(-3.6, -1);
        e.bezierCurveTo(-4.4, -5, -2.6, -10, 0, -16);
        e.fill();
      } // the licking tip, fading out as it rises
    },
    0,
    1,
    0
  );
  region(
    'rustdisc',
    30,
    30,
    a => {
      // side of a rusted burn barrel (stacked into a drum)
      circ(a, 0, 0, 12.5);
      a.fillStyle = rgrad(
        a,
        0,
        0,
        13,
        [
          [0, '#5a3a26'],
          [0.8, '#4a2c1c'],
          [1, '#26160e'],
        ],
        -3,
        -3
      );
      a.fill();
      a.save();
      circ(a, 0, 0, 12.5);
      a.clip();
      for (let i = 0; i < 10; i++) {
        a.fillStyle = pick(['rgba(140,80,36,0.4)', 'rgba(30,16,10,0.4)', 'rgba(110,60,30,0.35)']);
        ell(a, rand(-12, 12), rand(-12, 12), rand(1, 4), rand(0.8, 2.5), rand(0, 3));
        a.fill();
      }
      a.restore();
      circ(a, 0, 0, 12.5);
      a.strokeStyle = 'rgba(14,10,8,0.7)';
      a.lineWidth = 0.8;
      a.stroke();
    },
    0.25,
    0.7,
    0.8
  );
  region(
    'bbtop',
    30,
    30,
    (a, e) => {
      // open top of the burn barrel: rolled rim, charred wood and glowing embers
      circ(a, 0, 0, 12.5);
      a.fillStyle = '#3a2418';
      a.fill();
      a.strokeStyle = '#1a0e08';
      a.lineWidth = 1.6;
      a.stroke();
      a.strokeStyle = 'rgba(200,140,90,0.25)';
      a.lineWidth = 0.6;
      circ(a, 0, 0, 11.6);
      a.stroke();
      circ(a, 0, 0, 10.6);
      a.fillStyle = '#140c08';
      a.fill();
      for (let i = 0; i < 6; i++) {
        a.save();
        a.translate(rand(-4, 4), rand(-4, 4));
        a.rotate(rand(0, TAU));
        a.fillStyle = '#20140c';
        a.fillRect(-5, -1, 10, 2);
        a.restore();
      }
      for (let i = 0; i < 14; i++) {
        const x = rand(-8, 8),
          y = rand(-8, 8);
        if (x * x + y * y > 70) continue;
        const r = rand(0.8, 2.2);
        a.fillStyle = pick(['#ff9a30', '#ffcf60', '#c84a10']);
        circ(a, x, y, r);
        a.fill();
        e.fillStyle = pick(['rgba(255,150,50,0.95)', 'rgba(255,210,110,0.95)', 'rgba(230,80,20,0.9)']);
        circ(e, x, y, r);
        e.fill();
      }
    },
    0.2,
    0.7,
    0.7
  );
  region(
    'bhole',
    8,
    8,
    a => {
      a.fillStyle = 'rgba(200,190,170,0.35)';
      circ(a, 0, 0, 3.4);
      a.fill();
      a.fillStyle = '#0a0806';
      circ(a, 0, 0, 1.7);
      a.fill();
    },
    0.1,
    0.6,
    0.6
  );
  region(
    'blob',
    32,
    32,
    a => {
      radial(a, 0, 0, 15, [
        [0, 'rgba(0,0,0,1)'],
        [0.5, 'rgba(0,0,0,0.7)'],
        [1, 'rgba(0,0,0,0)'],
      ]);
    },
    0,
    1,
    0
  );
  region(
    'mag',
    10,
    6,
    a => {
      shape(a, c => rr(c, -4.5, -2.2, 9, 4.4, 1), '#2a2c30', { lw: 0.8 });
      a.fillStyle = '#c8a040';
      a.fillRect(2.5, -1.6, 2, 3.2);
    },
    0.6,
    0.8,
    0.4
  );
  for (const [nm, w, h, draw] of [
    [
      'mf_pistol',
      26,
      18,
      e => {
        e.beginPath();
        e.moveTo(-6, -3);
        e.lineTo(12, 0);
        e.lineTo(-6, 3);
        e.fill();
        e.beginPath();
        e.moveTo(-4, -2);
        e.lineTo(2, -8);
        e.lineTo(0, 0);
        e.lineTo(2, 8);
        e.lineTo(-4, 2);
        e.fill();
      },
    ],
    [
      'mf_rifle',
      34,
      22,
      e => {
        for (const g of [0, -0.5, 0.5]) {
          e.save();
          e.rotate(g);
          e.beginPath();
          e.moveTo(-8, -2.4);
          e.lineTo(g ? 10 : 16, 0);
          e.lineTo(-8, 2.4);
          e.fill();
          e.restore();
        }
      },
    ],
    [
      'mf_shotgun',
      44,
      30,
      e => {
        e.beginPath();
        e.moveTo(-10, -4);
        e.lineTo(20, -12);
        e.lineTo(14, 0);
        e.lineTo(20, 12);
        e.lineTo(-10, 4);
        e.closePath();
        e.fill();
        for (let i = 0; i < 8; i++) {
          const g = rand(-0.6, 0.6);
          e.fillRect(4 + Math.cos(g) * rand(6, 18), Math.sin(g) * rand(6, 14), 1.4, 1.4);
        }
      },
    ],
    [
      'mf_big',
      46,
      30,
      e => {
        e.beginPath();
        e.moveTo(-10, -5);
        e.lineTo(22, 0);
        e.lineTo(-10, 5);
        e.fill();
        for (const s of [-1, 1]) {
          e.beginPath();
          e.moveTo(-6, s * 2);
          e.lineTo(2, s * 13);
          e.lineTo(4, s * 3);
          e.fill();
        }
      },
    ],
  ])
    region(
      nm,
      w,
      h,
      (a, e) => {
        radial(e, -6, 0, 9, [
          [0, '#fff'],
          [1, 'rgba(255,255,255,0)'],
        ]);
        e.fillStyle = 'rgba(255,255,255,0.92)';
        draw(e);
      },
      0,
      1,
      0
    );
  region(
    'ammo',
    26,
    20,
    (a, e) => {
      shape(
        a,
        c => rr(c, -11, -8, 22, 16, 2.5),
        grad(a, -11, -8, 11, 8, [
          [0, '#6a7448'],
          [1, '#3a4228'],
        ]),
        { lw: 1.8 }
      );
      a.fillStyle = 'rgba(0,0,0,0.35)';
      a.fillRect(-11, -1, 22, 2);
      for (let i = -7; i <= 7; i += 3.5) {
        a.fillStyle = '#d8a83a';
        rr(a, i - 1.2, -6, 2.4, 4, 1);
        a.fill();
        a.fillStyle = '#8a5a20';
        a.fillRect(i - 1.2, -3, 2.4, 1);
      }
      a.fillStyle = '#e8d8a0';
      a.font = '700 5px monospace';
      a.textAlign = 'center';
      a.fillText('AMMO', 0, 6.2);
      e.fillStyle = 'rgba(255,200,90,0.35)';
      e.fillRect(-9, 2.5, 18, 4.5);
    },
    0.15,
    0.6,
    1
  );
  for (const [t, w, h, body, dark, lab, labCol, rounds] of [
    ['light', 22, 16, '#c8a050', '#7a5a20', '9MM', '#2a1a08', '#e0c070'],
    ['shells', 24, 18, '#b83a2a', '#6a1a12', '12GA', '#f0e0c0', '#d8a83a'],
    ['rifle', 28, 18, '#5a6a3a', '#2c341c', '5.56', '#e8e0b0', null],
    ['heavy', 22, 16, '#6a4a2a', '#3a2614', 'HVY', '#f0d8a0', '#d8b060'],
    ['gren', 28, 20, '#4a5236', '#22261a', '40MM', '#ffd23a', null],
  ])
    region(
      'ammo_' + t,
      w + 6,
      h + 6,
      (a, e) => {
        // a box you can tell apart at a glance: 9mm card box, red shell box, green ammo can, brown .308 box, olive grenade case
        shape(
          a,
          c => rr(c, -w / 2, -h / 2, w, h, t === 'rifle' || t === 'gren' ? 2 : 1.5),
          grad(a, -w / 2, -h / 2, w / 2, h / 2, [
            [0, body],
            [1, dark],
          ]),
          { lw: 1.7 }
        );
        if (t === 'rifle' || t === 'gren') {
          a.fillStyle = 'rgba(0,0,0,0.4)';
          a.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 2.2);
          a.fillStyle = dark;
          rr(a, -4, -h / 2 - 2.5, 8, 3, 1);
          a.fill();
        } // lid and carry handle
        else if (rounds) {
          for (let i = -w / 2 + 4; i <= w / 2 - 4; i += 3.6) {
            a.fillStyle = rounds;
            rr(a, i - 1.2, -h / 2 + 2, 2.4, 4, 1);
            a.fill();
          }
        }
        a.fillStyle = labCol;
        a.font = '700 5.5px monospace';
        a.textAlign = 'center';
        a.fillText(lab, 0, h / 2 - 3);
        e.fillStyle = 'rgba(255,210,120,0.3)';
        e.fillRect(-w / 2 + 3, h / 2 - 8, w - 6, 5.5);
      },
      0.15,
      0.6,
      1
    );
  region(
    'h_gun',
    140,
    30,
    (a, e) => {
      shape(a, c => rr(c, -2, -3.4, 14, 6.8, 2), '#24262a', { lw: 1.3 });
      shape(
        a,
        c => rr(c, 11, -4.4, 24, 8.8, 1.8),
        grad(a, 0, -4.4, 0, 4.4, [
          [0, '#3c4046'],
          [1, '#1c1e22'],
        ]),
        { lw: 1.6 }
      );
      shape(
        a,
        c => rr(c, 34, -3.6, 16, 7.2, 1.4),
        grad(a, 0, -3.6, 0, 3.6, [
          [0, '#8a7a58'],
          [1, '#5c5038'],
        ]),
        { lw: 1.4 }
      );
      a.fillStyle = 'rgba(0,0,0,0.45)';
      for (let x = 36; x < 49; x += 3) a.fillRect(x, -3.4, 1.2, 6.8);
      shape(a, c => rr(c, 49, -1.5, 13, 3, 1), '#1a1c1e', { lw: 1.1 });
      shape(a, c => rr(c, 61, -2.3, 4.5, 4.6, 1), '#2a2c30', { lw: 1 });
      shape(a, c => rr(c, 18, -3, 9, 6, 1.5), '#111214', { lw: 1 });
      a.fillStyle = '#2a3036';
      circ(a, 22.5, 0, 0.9);
      a.fill();
      a.fillStyle = 'rgba(160,190,210,0.35)';
      circ(a, 22.2, -0.3, 0.4);
      a.fill();
      a.fillStyle = 'rgba(255,255,255,0.18)';
      a.fillRect(12, -3.8, 22, 1);
    },
    0.3,
    0.45,
    1
  );
  region(
    'h_shotgun',
    140,
    30,
    a => {
      shape(
        a,
        c => rr(c, -4, -3.6, 18, 7.2, 2.4),
        grad(a, 0, -3.6, 0, 3.6, [
          [0, '#8a5a34'],
          [1, '#5a3820'],
        ]),
        { lw: 1.3 }
      );
      shape(
        a,
        c => rr(c, 13, -4, 16, 8, 1.6),
        grad(a, 0, -4, 0, 4, [
          [0, '#3a3c40'],
          [1, '#18191c'],
        ]),
        { lw: 1.5 }
      );
      shape(a, c => rr(c, 28, -2.6, 36, 2.6, 1), '#1c1d20', { lw: 1 });
      shape(a, c => rr(c, 28, 0.4, 30, 2.4, 1), '#26282c', { lw: 1 });
      shape(
        a,
        c => rr(c, 33, -3.6, 12, 7.2, 2.2),
        grad(a, 0, -3.6, 0, 3.6, [
          [0, '#9a6a3e'],
          [1, '#603e22'],
        ]),
        { lw: 1.3 }
      );
      a.fillStyle = 'rgba(0,0,0,0.35)';
      for (let x = 35; x < 44; x += 2.2) a.fillRect(x, -3.4, 0.9, 6.8);
    },
    0.3,
    0.45,
    1
  );
  region(
    'h_launcher',
    140,
    34,
    a => {
      shape(a, c => rr(c, -4, -2.6, 16, 5.2, 1.6), '#2a2c2e', { lw: 1.2 });
      shape(
        a,
        c => circ(c, 20, 0, 9),
        grad(a, 11, -9, 29, 9, [
          [0, '#5a6046'],
          [1, '#2c3020'],
        ]),
        { lw: 1.8 }
      );
      for (let k = 0; k < 6; k++) {
        const g = (k / 6) * TAU;
        a.fillStyle = '#16180f';
        circ(a, 20 + Math.cos(g) * 5.2, Math.sin(g) * 5.2, 2);
        a.fill();
        a.fillStyle = '#b08a3a';
        circ(a, 20 + Math.cos(g) * 5.2, Math.sin(g) * 5.2, 1.1);
        a.fill();
      }
      shape(
        a,
        c => rr(c, 27, -5, 28, 10, 4),
        grad(a, 0, -5, 0, 5, [
          [0, '#4a4e3a'],
          [1, '#26281c'],
        ]),
        { lw: 1.8 }
      );
      shape(a, c => rr(c, 53, -5.6, 4, 11.2, 1.5), '#1a1c14', { lw: 1.1 });
      shape(a, c => rr(c, 33, -7.5, 8, 3, 1), '#1a1c14', { lw: 1 });
    },
    0.3,
    0.5,
    1
  );
  region(
    'grenade',
    16,
    12,
    a => {
      shape(
        a,
        c => rr(c, -6, -3.6, 12, 7.2, 3.4),
        grad(a, -6, 0, 6, 0, [
          [0, '#b08a3a'],
          [0.45, '#d8b060'],
          [0.5, '#4a5236'],
          [1, '#6a7450'],
        ]),
        { lw: 1.3 }
      );
    },
    0.8,
    0.8,
    0.4
  );

  /* ----- The dead (all face +x) ----- */
  /* superseded: z_torso0, z_torso1, z_torso2 */
  /* superseded: z_head0, z_head1, z_head2 */
  // 3 cop · 4 nurse · 5 firefighter · 6 construction worker
  /* superseded: z_torso3 */
  /* superseded: z_torso4 */
  /* superseded: z_torso5 */
  /* superseded: z_torso6 */
  /* superseded: z_head3 */
  /* superseded: z_head4 */
  /* superseded: z_head5 */
  /* superseded: z_head6 */
  region(
    'wound',
    14,
    10,
    a => {
      a.fillStyle = '#3a0404';
      ell(a, 0, 0, 5.5, 2.6, 0);
      a.fill();
      a.fillStyle = '#b02020';
      ell(a, 0, 0, 4, 1.4, 0);
      a.fill();
      a.fillStyle = '#e8b0a0';
      ell(a, -1, -0.4, 1.6, 0.6, 0);
      a.fill();
    },
    0.9,
    1,
    0.6
  );
  /* superseded: z_head_spit */
  /* superseded: z_torso_spit */
  /* superseded: z_hand */
  /* superseded: z_foot */
  /* superseded: z_bloat */
  /* superseded: z_brute */
  /* superseded: z_bhead */
  /* superseded: z_scream */
  /* superseded: z_shead */
  /* ----- realistic people seen from straight above (all face +x); these replace the older round sprites ----- */
  const EDGE = 'rgba(14,10,12,0.6)';
  // upper body outline: shoulder caps, flat-ish chest and back, f pushes the shoulders forward (hunch)
  const spline = (c, P) => {
    const n = P.length;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n],
        p1 = P[i],
        p2 = P[(i + 1) % n],
        p3 = P[(i + 2) % n];
      if (!i) c.moveTo(p1[0], p1[1]);
      c.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6,
        p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6,
        p2[1] - (p3[1] - p1[1]) / 6,
        p2[0],
        p2[1]
      );
    }
    c.closePath();
  };
  const SHP = (c, hw, hd, f = 0, tp = 0) => {
    // chest/back deepest in the middle, deltoid caps at the ends, f hunches the shoulders forward, tp narrows the back below the shoulders (a heavy man's V)
    const b = 1 - tp,
      P = [
        [hd * 0.82, 0],
        [hd * 0.8, hw * 0.44],
        [hd * (0.62 + f), hw * 0.8],
        [hd * (0.1 + f), hw],
        [-hd * 0.55, hw * 0.83 * b],
        [-hd * 0.86, hw * 0.46 * b],
        [-hd * 0.9, 0],
        [-hd * 0.86, -hw * 0.46 * b],
        [-hd * 0.55, -hw * 0.83 * b],
        [hd * (0.1 + f), -hw],
        [hd * (0.62 + f), -hw * 0.8],
        [hd * 0.8, -hw * 0.44],
      ];
    spline(c, P);
  };
  const delts = (a, hw, hd, f = 0) => {
    for (const s of [-1, 1]) {
      a.fillStyle = rgrad(a, hd * (0.02 + f), s * hw * 0.8, hw * 0.3, [
        [0, 'rgba(255,255,255,0.13)'],
        [1, 'rgba(255,255,255,0)'],
      ]);
      a.fillRect(-hd * 2, -hw * 2, hd * 4, hw * 4);
      a.strokeStyle = 'rgba(0,0,0,0.28)';
      a.lineWidth = 0.8;
      a.beginPath();
      a.moveTo(hd * (0.48 + f), s * hw * 0.6);
      a.quadraticCurveTo(hd * (0.05 + f), s * hw * 0.56, -hd * 0.5, s * hw * 0.64);
      a.stroke();
    }
  };
  const weave = (a, hw, hd, n, dark = 0.15, light = 0.085) => {
    for (let i = 0; i < n; i++) {
      a.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${dark})` : `rgba(255,255,255,${light})`;
      a.fillRect(rand(-hd, hd), rand(-hw, hw), rand(0.55, 1.75), rand(0.35, 0.95));
    }
  };
  // volume: shoulders roll off front/back and at the caps, ridge across the upper back catches light
  const volume = (a, path, hw, hd, f = 0) => {
    a.save();
    path(a);
    a.clip();
    a.fillStyle = grad(a, -hd, 0, hd, 0, [
      [0, 'rgba(0,0,0,0.42)'],
      [0.3, 'rgba(255,255,255,0.1)'],
      [0.45, 'rgba(255,255,255,0.13)'],
      [0.7, 'rgba(0,0,0,0.04)'],
      [1, 'rgba(0,0,0,0.4)'],
    ]);
    a.fillRect(-hd - 2, -hw - 2, hd * 2 + 4, hw * 2 + 4);
    a.fillStyle = grad(a, 0, -hw, 0, hw, [
      [0, 'rgba(0,0,0,0.38)'],
      [0.16, 'rgba(0,0,0,0)'],
      [0.84, 'rgba(0,0,0,0)'],
      [1, 'rgba(0,0,0,0.38)'],
    ]);
    a.fillRect(-hd - 2, -hw - 2, hd * 2 + 4, hw * 2 + 4);
    delts(a, hw, hd, f);
    path(a);
    a.strokeStyle = 'rgba(0,0,0,0.25)';
    a.lineWidth = 1.6;
    a.stroke();
    a.restore();
  };
  const folds = (a, hw, hd, k = 1) => {
    // cloth creases running from the shoulder caps to the neck and down the back
    a.lineCap = 'round';
    for (const s of [-1, 1])
      for (let i = 0; i < 3 * k; i++) {
        const x0 = rand(-hd * 0.7, hd * 0.5),
          y0 = s * rand(hw * 0.62, hw * 0.86),
          x1 = x0 + rand(-3, 3),
          y1 = s * rand(hw * 0.25, hw * 0.45);
        a.strokeStyle = 'rgba(0,0,0,0.22)';
        a.lineWidth = rand(0.6, 1.1);
        a.beginPath();
        a.moveTo(x0, y0);
        a.quadraticCurveTo((x0 + x1) / 2 + rand(-2, 2), (y0 + y1) / 2, x1, y1);
        a.stroke();
        a.strokeStyle = 'rgba(255,255,255,0.09)';
        a.lineWidth = 0.6;
        a.beginPath();
        a.moveTo(x0 + 0.8, y0);
        a.quadraticCurveTo((x0 + x1) / 2 + 0.8, (y0 + y1) / 2, x1 + 0.8, y1);
        a.stroke();
      }
    for (let i = 0; i < 2 * k; i++) {
      const y = rand(-hw * 0.4, hw * 0.4);
      a.strokeStyle = 'rgba(0,0,0,0.18)';
      a.lineWidth = 0.7;
      a.beginPath();
      a.moveTo(-hd * 0.85, y);
      a.quadraticCurveTo(-hd * 0.4, y + rand(-3, 3), -hd * 0.1, y + rand(-4, 4));
      a.stroke();
    }
  };
  const seams = (a, hw, hd) => {
    a.strokeStyle = 'rgba(0,0,0,0.3)';
    a.lineWidth = 0.6;
    a.setLineDash([1.2, 0.9]);
    for (const s of [-1, 1]) {
      a.beginPath();
      a.moveTo(hd * 0.55, s * hw * 0.74);
      a.quadraticCurveTo(0, s * hw * 0.68, -hd * 0.75, s * hw * 0.76);
      a.stroke();
    }
    a.setLineDash([]);
  };
  const outline = (a, path) => {
    path(a);
    a.strokeStyle = EDGE;
    a.lineWidth = 0.6;
    a.stroke();
  };
  const collar = (a, x, r, col) => {
    a.fillStyle = col;
    ell(a, x, 0, r * 0.85, r);
    a.fill();
    a.strokeStyle = 'rgba(0,0,0,0.4)';
    a.lineWidth = 0.7;
    a.stroke();
    a.fillStyle = 'rgba(0,0,0,0.35)';
    ell(a, x + 0.6, 0, r * 0.55, r * 0.7);
    a.fill();
  };
  const plaid = (a, hw, hd, base, band, line) => {
    a.fillStyle = band;
    for (let y = -hw; y < hw; y += 7) a.fillRect(-hd - 2, y, hd * 2 + 4, 3);
    for (let x = -hd; x < hd; x += 7) a.fillRect(x, -hw - 2, 3, hw * 2 + 4);
    a.fillStyle = line;
    for (let y = -hw + 5; y < hw; y += 7) a.fillRect(-hd - 2, y, hd * 2 + 4, 0.6);
    for (let x = -hd + 5; x < hd; x += 7) a.fillRect(x, -hw - 2, 0.6, hw * 2 + 4);
  };
  const blood = (a, hw, hd, n, wet = 0.5) => {
    // soaked-in stains: soft dark edges, wetter centres, a few drips running off
    for (let i = 0; i < n; i++) {
      const x = rand(-hd * 0.8, hd * 0.9),
        y = rand(-hw * 0.8, hw * 0.8),
        r = rand(1.6, 4.6),
        rot = rand(0, TAU); // eslint-disable-line no-unused-vars -- unused, but drawing it keeps the random sequence the rest of this art depends on
      for (let k = 0; k < 6; k++) {
        const ox = rand(-r, r) * 0.5,
          oy = rand(-r, r) * 0.5;
        a.fillStyle = rgrad(a, x + ox, y + oy, r * rand(0.6, 1.1), [
          [0, `rgba(${randi(56, 76)},${randi(6, 10)},${randi(6, 9)},${rand(0.35, 0.55)})`],
          [0.7, 'rgba(50,8,6,0.18)'],
          [1, 'rgba(50,8,6,0)'],
        ]);
        a.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
      }
      if (Math.random() < wet) {
        a.fillStyle = rgrad(a, x, y, r * 0.5, [
          [0, 'rgba(110,14,12,0.55)'],
          [1, 'rgba(110,14,12,0)'],
        ]);
        a.fillRect(x - r, y - r, r * 2, r * 2);
      }
      if (Math.random() < 0.5) {
        a.strokeStyle = 'rgba(60,8,6,0.45)';
        a.lineWidth = rand(0.4, 0.8);
        a.beginPath();
        a.moveTo(x, y);
        a.quadraticCurveTo(x - r * 0.8, y + rand(-1, 1), x - r * rand(1.4, 2.4), y + rand(-1.5, 1.5));
        a.stroke();
      }
    }
  };
  const grime = (a, hw, hd, n) => {
    for (let i = 0; i < Math.ceil(n * 1.35); i++) {
      const stain = Math.random() < 0.18;
      a.fillStyle = stain
        ? `rgba(${randi(52, 86)},${randi(24, 39)},${randi(21, 32)},${rand(0.15, 0.3)})`
        : `rgba(${randi(40, 70)},${randi(34, 52)},${randi(22, 36)},${rand(0.18, 0.4)})`;
      ell(a, rand(-hd, hd), rand(-hw, hw), rand(1.8, 4.8), rand(1.1, 3.2), rand(0, 3));
      a.fill();
    }
  };
  const rip = (a, x, y, w, h, skin) => {
    // a ragged tear in the cloth: frayed edge, dead skin and often a wound underneath
    const n = 16,
      pts = [],
      g0 = rand(0, TAU);
    for (let k = 0; k < n; k++) {
      const g = g0 + (k / n) * TAU,
        f = rand(0.55, 1.05) * (0.82 + 0.3 * Math.sin(g * 2 + g0));
      pts.push([x + Math.cos(g) * w * f, y + Math.sin(g) * h * f]);
    }
    const p = c => {
      c.beginPath();
      pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
      c.closePath();
    };
    p(a);
    a.fillStyle = skin;
    a.fill();
    a.save();
    p(a);
    a.clip();
    for (let i = 0; i < 4; i++) {
      a.fillStyle = pick(['rgba(90,60,100,0.3)', 'rgba(60,70,40,0.3)', 'rgba(40,30,30,0.25)']);
      ell(a, x + rand(-w, w) * 0.6, y + rand(-h, h) * 0.6, rand(0.6, 1.6), rand(0.4, 1.2), rand(0, 3));
      a.fill();
    }
    if (Math.random() < 0.6) {
      a.fillStyle = 'rgba(70,8,6,0.7)';
      ell(a, x + rand(-0.5, 0.5), y + rand(-0.5, 0.5), w * 0.45, h * 0.3, rand(0, 3));
      a.fill();
      a.fillStyle = 'rgba(160,30,24,0.5)';
      ell(a, x, y, w * 0.22, h * 0.13, rand(0, 3));
      a.fill();
    }
    p(a);
    a.strokeStyle = 'rgba(0,0,0,0.45)';
    a.lineWidth = 1.3;
    a.stroke();
    a.restore();
    a.lineCap = 'round';
    for (let k = 0; k < 10; k++) {
      const [px, py] = pts[randi(0, n - 1)],
        g = Math.atan2(py - y, px - x) + rand(-0.7, 0.7),
        l = rand(0.5, 1.5);
      a.strokeStyle = Math.random() < 0.5 ? 'rgba(225,215,195,0.3)' : 'rgba(0,0,0,0.35)';
      a.lineWidth = rand(0.2, 0.4);
      a.beginPath();
      a.moveTo(px, py);
      a.lineTo(px + Math.cos(g) * l, py + Math.sin(g) * l);
      a.stroke();
    }
  };

  /* survivors: torso (hw 18.5 half-width across the shoulders, hd 10 half-depth) */
  const HW = 18.5,
    HD = 10.5,
    hp_ = c => SHP(c, HW, HD);
  region(
    'hb0',
    42,
    50,
    a => {
      // soldier: olive field jacket under a coyote plate carrier
      hp_(a);
      a.fillStyle = '#4a5034';
      a.fill();
      a.save();
      hp_(a);
      a.clip();
      weave(a, HW, HD, 260);
      folds(a, HW, HD);
      const pc = c => rr(c, -HD * 0.92, -HW * 0.56, HD * 1.84, HW * 1.12, 2.5);
      pc(a);
      a.fillStyle = '#5e5440';
      a.fill();
      a.save();
      pc(a);
      a.clip();
      weave(a, HW, HD, 220, 0.18, 0.04);
      grime(a, HW, HD, 6);
      a.strokeStyle = 'rgba(30,24,14,0.28)';
      a.lineWidth = 0.6;
      for (let y = -HW * 0.42; y <= HW * 0.42; y += 4.2) {
        a.beginPath();
        a.moveTo(-HD * 0.85, y + rand(-0.3, 0.3));
        a.lineTo(-HD * 0.35, y + rand(-0.3, 0.3));
        a.stroke();
      }
      a.fillStyle = '#4e4634';
      rr(a, -HD * 0.86, -HW * 0.3, HD * 0.5, HW * 0.6, 1.5);
      a.fill();
      a.fillStyle = 'rgba(0,0,0,0.3)';
      a.fillRect(-HD * 0.86, -0.4, HD * 0.5, 0.8);
      a.restore();
      for (const s of [-1, 1]) {
        a.fillStyle = '#544a36';
        a.fillRect(-HD * 1.0, s * HW * 0.45 - 2.2, HD * 2, 4.4);
        a.fillStyle = 'rgba(0,0,0,0.25)';
        a.fillRect(-HD * 1.0, s * HW * 0.45 + 1.4, HD * 2, 0.8);
      }
      for (const y of [-7.5, -2.5, 2.5, 7.5]) {
        a.fillStyle = '#4a4232';
        rr(a, HD * 0.5, y - 2.2, 4, 4.4, 0.8);
        a.fill();
        a.fillStyle = 'rgba(0,0,0,0.35)';
        a.fillRect(HD * 0.5, y - 2.2, 1, 4.4);
        a.fillStyle = '#2a2a26';
        a.fillRect(HD * 0.5 + 3, y - 1.2, 1, 2.4);
      }
      // Reinforced carrier edge, visible webbing, and a stitched utility pocket make the plate rig read at game scale.
      a.strokeStyle = 'rgba(25,24,18,0.56)';
      a.lineWidth = 0.8;
      for (const s of [-1, 1]) {
        a.beginPath();
        a.moveTo(-HD * 0.72, s * HW * 0.39);
        a.lineTo(-HD * 0.34, s * HW * 0.18);
        a.lineTo(HD * 0.24, s * HW * 0.12);
        a.stroke();
        a.strokeStyle = 'rgba(214,195,145,0.30)';
        a.lineWidth = 0.45;
        a.beginPath();
        a.moveTo(-HD * 0.68, s * HW * 0.39);
        a.lineTo(-HD * 0.31, s * HW * 0.18);
        a.stroke();
        a.strokeStyle = 'rgba(25,24,18,0.56)';
        a.lineWidth = 0.8;
      }
      a.fillStyle = '#454536';
      rr(a, HD * 0.19, -2.65, 3.6, 5.3, 0.8);
      a.fill();
      a.strokeStyle = 'rgba(15,15,12,0.65)';
      a.lineWidth = 0.5;
      a.stroke();
      a.fillStyle = 'rgba(205,190,142,0.38)';
      a.fillRect(HD * 0.24, -1.6, 2.7, 0.55);
      a.fillRect(HD * 0.24, 1.0, 2.7, 0.55);
      a.fillStyle = '#26282a';
      rr(a, -HD * 0.4, -HW * 0.62, 5, 3.4, 0.8);
      a.fill();
      a.fillStyle = '#c0392b';
      a.fillRect(-HD * 0.4 + 0.8, -HW * 0.62 + 0.8, 1, 1);
      a.restore();
      volume(a, hp_, HW, HD);
      collar(a, 1.6, 5, '#3c4228');
      outline(a, hp_);
    },
    0.18,
    0.55,
    1.4
  );
  region(
    'hb1',
    42,
    50,
    (a, e) => {
      // deputy: tan uniform shirt, epaulettes, leather vest panels, star
      hp_(a);
      a.fillStyle = '#b4a278';
      a.fill();
      a.save();
      hp_(a);
      a.clip();
      weave(a, HW, HD, 220, 0.1, 0.08);
      folds(a, HW, HD);
      for (const [x0, x1] of [
        [HD * 0.3, HD * 1.1],
        [-HD * 1.1, -HD * 0.4],
      ]) {
        a.fillStyle = '#5a3a22';
        a.beginPath();
        a.moveTo(x0, -HW * 0.62);
        a.quadraticCurveTo((x0 + x1) / 2, -HW * 0.7, x1, -HW * 0.6);
        a.lineTo(x1, HW * 0.6);
        a.quadraticCurveTo((x0 + x1) / 2, HW * 0.7, x0, HW * 0.62);
        a.closePath();
        a.fill();
        a.save();
        a.clip();
        weave(a, HW, HD, 120, 0.16, 0.06);
        a.restore();
      }
      for (const s of [-1, 1]) {
        a.fillStyle = '#7a6a48';
        rr(a, -HD * 0.55, s * HW * 0.78 - 1.8, HD * 1.0, 3.6, 1.4);
        a.fill();
        a.fillStyle = '#c8b070';
        circ(a, HD * 0.4, s * HW * 0.78, 0.8);
        a.fill();
      }
      seams(a, HW, HD);
      // A radio mic, cable clip and worn stitching help the deputy's kit read separately from the ranger.
      a.fillStyle = '#2b2b27';
      rr(a, -HD * 0.62, HW * 0.12, 3.2, 5.1, 0.75);
      a.fill();
      a.strokeStyle = 'rgba(220,204,161,0.5)';
      a.lineWidth = 0.45;
      a.stroke();
      a.fillStyle = '#9e875b';
      rr(a, -HD * 0.36, HW * 0.15, 1.2, 2.2, 0.35);
      a.fill();
      a.strokeStyle = 'rgba(34,23,14,0.36)';
      a.lineWidth = 0.55;
      a.beginPath();
      a.moveTo(-HD * 0.45, HW * 0.18);
      a.quadraticCurveTo(-HD * 0.12, HW * 0.04, 1.4, -HW * 0.06);
      a.stroke();
      a.restore();
      volume(a, hp_, HW, HD);
      const star = (c, x, y, r) => {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const g = -Math.PI / 2 + (i * Math.PI) / 5,
            rr2 = i & 1 ? r * 0.45 : r;
          c.lineTo(x + Math.cos(g) * rr2, y + Math.sin(g) * rr2);
        }
        c.closePath();
      };
      star(a, HD * 0.62, -HW * 0.36, 2.4);
      a.fillStyle = '#d8c890';
      a.fill();
      a.strokeStyle = '#5a4a2a';
      a.lineWidth = 0.4;
      a.stroke();
      e.fillStyle = 'rgba(255,230,170,0.25)';
      star(e, HD * 0.62, -HW * 0.36, 2);
      e.fill();
      collar(a, 1.6, 5, '#9a8862');
      outline(a, hp_);
    },
    0.25,
    0.55,
    1.4
  );
  region(
    'hb2',
    42,
    50,
    a => {
      // drifter: faded red flannel over a grey tee
      hp_(a);
      a.fillStyle = '#8a2a22';
      a.fill();
      a.save();
      hp_(a);
      a.clip();
      plaid(a, HW, HD, '#8a2a22', 'rgba(30,8,8,0.42)', 'rgba(230,200,120,0.28)');
      weave(a, HW, HD, 200, 0.1, 0.06);
      folds(a, HW, HD, 1.3);
      seams(a, HW, HD);
      a.restore();
      volume(a, hp_, HW, HD);
      collar(a, 1.6, 5, '#5a5a58');
      a.fillStyle = '#7a2420';
      for (const s of [-1, 1]) {
        a.beginPath();
        a.moveTo(5, s * 1.5);
        a.lineTo(8.5, s * 4.8);
        a.lineTo(3.5, s * 5.8);
        a.closePath();
        a.fill();
      }
      // Patch pocket and placket buttons break up the flannel pattern without turning it into a flat graphic.
      a.fillStyle = 'rgba(42,15,14,0.58)';
      rr(a, 1.4, -12.3, 4.8, 4.9, 0.6);
      a.fill();
      a.strokeStyle = 'rgba(224,178,128,0.55)';
      a.lineWidth = 0.45;
      a.beginPath();
      a.moveTo(1.4, -12.3);
      a.lineTo(6.2, -12.3);
      a.lineTo(6.2, -7.4);
      a.stroke();
      a.fillStyle = '#d0b28a';
      for (const y of [-5.2, -1.7, 1.7, 5.2]) {
        circ(a, 7.3, y, 0.48);
        a.fill();
        a.fillStyle = 'rgba(30,10,8,0.42)';
        circ(a, 7.45, y + 0.15, 0.22);
        a.fill();
        a.fillStyle = '#d0b28a';
      }
      outline(a, hp_);
    },
    0.2,
    0.55,
    1.4
  );

  // heads: realistic proportion (about 40% of shoulder width), oval front to back
  const nose = (a, x, col) => {
    a.fillStyle = col;
    ell(a, x, 0, 1.7, 1.5);
    a.fill();
    a.fillStyle = 'rgba(0,0,0,0.25)';
    ell(a, x - 0.6, 0, 0.8, 1.6);
    a.fill();
  };
  const ears = (a, x, y, col) => {
    for (const s of [-1, 1]) {
      a.fillStyle = col;
      ell(a, x, s * y, 1.8, 1.1);
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.35)';
      a.lineWidth = 0.5;
      a.stroke();
    }
  };
  const hairMass = (a, x, rx, ry, base, hi, whorl = [-3, 1], n = 70, front = 0.9) => {
    n *= 2;
    a.save();
    ell(a, x, 0, rx, ry);
    a.clip();
    a.fillStyle = base;
    a.fillRect(-20, -20, 40, 40);
    for (let i = 0; i < n; i++) {
      const g = rand(0, TAU),
        r0 = rand(0, 2),
        r1 = rand(rx * 0.6, rx * 1.2);
      a.strokeStyle = Math.random() < 0.35 ? hi : 'rgba(0,0,0,0.35)';
      a.lineWidth = rand(0.35, 0.7);
      a.beginPath();
      a.moveTo(whorl[0] + Math.cos(g) * r0, whorl[1] + Math.sin(g) * r0);
      a.quadraticCurveTo(
        whorl[0] + Math.cos(g + 0.08) * r1 * 0.5,
        whorl[1] + Math.sin(g + 0.08) * r1 * 0.5,
        whorl[0] + Math.cos(g + 0.15) * r1,
        whorl[1] + Math.sin(g + 0.15) * r1
      );
      a.stroke();
    }
    a.fillStyle = grad(a, -rx, 0, rx, 0, [
      [0, 'rgba(0,0,0,0.35)'],
      [0.4, 'rgba(255,255,255,0.06)'],
      [1, 'rgba(0,0,0,0.25)'],
    ]);
    a.fillRect(-20, -20, 40, 40);
    a.restore();
  };
  region(
    'hh0',
    28,
    28,
    a => {
      // combat helmet over a face
      ell(a, 3.6, 0, 5, 4.8);
      a.fillStyle = '#b48462';
      a.fill();
      nose(a, 8.2, '#c08e6a');
      const hel = c => ell(c, -0.4, 0, 7.8, 7);
      hel(a);
      a.fillStyle = '#5a5e40';
      a.fill();
      a.save();
      hel(a);
      a.clip();
      for (let i = 0; i < 26; i++) {
        a.fillStyle = pick(['rgba(40,44,26,0.5)', 'rgba(120,110,74,0.35)', 'rgba(70,60,40,0.4)']);
        ell(a, rand(-8, 7), rand(-7, 7), rand(1, 2.6), rand(0.8, 1.8), rand(0, 3));
        a.fill();
      }
      a.fillStyle = rgrad(
        a,
        -0.4,
        0,
        8,
        [
          [0, 'rgba(255,255,255,0.12)'],
          [0.6, 'rgba(0,0,0,0)'],
          [1, 'rgba(0,0,0,0.45)'],
        ],
        -2.5,
        -1.5
      );
      a.fillRect(-10, -10, 20, 20);
      a.restore();
      for (const s of [-1, 1]) {
        a.fillStyle = '#2e3022';
        rr(a, -2.5, s * 6.2 - 0.9, 5, 1.8, 0.6);
        a.fill();
      }
      a.fillStyle = '#222420';
      rr(a, 5.2, -1.8, 2.2, 3.6, 0.6);
      a.fill();
      a.fillStyle = '#3a3c34';
      rr(a, -7.2, -2.2, 2.6, 4.4, 0.6);
      a.fill();
      hel(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.8;
      a.stroke();
    },
    0.22,
    0.75,
    1.2
  );
  region(
    'hh1',
    28,
    28,
    (a, e) => {
      // deputy's patrol cap: six-panel crown, stiff bill over the face, ears and the back of the head showing
      ell(a, -1.2, 0, 7, 6.2);
      a.fillStyle = '#2e2016';
      a.fill();
      ears(a, 0.6, 6.6, '#b8845e');
      const bill = c => {
        c.beginPath();
        c.moveTo(3, -5.6);
        c.quadraticCurveTo(11.6, -6, 12.2, 0);
        c.quadraticCurveTo(11.6, 6, 3, 5.6);
        c.closePath();
      };
      a.fillStyle = 'rgba(0,0,0,0.45)';
      a.save();
      a.translate(0.6, 0.8);
      bill(a);
      a.fill();
      a.restore();
      bill(a);
      a.fillStyle = grad(a, 3, 0, 12.2, 0, [
        [0, '#2e2418'],
        [1, '#4a3a26'],
      ]);
      a.fill();
      a.save();
      bill(a);
      a.clip();
      a.strokeStyle = 'rgba(220,200,160,0.28)';
      a.lineWidth = 0.3;
      a.setLineDash([0.6, 0.5]);
      for (const k of [0.82, 0.66]) {
        a.beginPath();
        a.moveTo(3, -5.6 * k);
        a.quadraticCurveTo(3 + 8.6 * k, -6 * k, 3 + 9.2 * k, 0);
        a.quadraticCurveTo(3 + 8.6 * k, 6 * k, 3, 5.6 * k);
        a.stroke();
      }
      a.setLineDash([]);
      a.restore();
      bill(a);
      a.strokeStyle = 'rgba(14,10,12,0.55)';
      a.lineWidth = 0.5;
      a.stroke();
      const crown = c => ell(c, -0.8, 0, 7.4, 6.8);
      crown(a);
      a.fillStyle = '#4a3a26';
      a.fill();
      a.save();
      crown(a);
      a.clip();
      weave(a, 8, 8, 120, 0.14, 0.06);
      for (let i = 0; i < 6; i++) {
        const g = (i / 6) * TAU + 0.52;
        a.strokeStyle = 'rgba(0,0,0,0.35)';
        a.lineWidth = 0.45;
        a.beginPath();
        a.moveTo(-0.8, 0);
        a.lineTo(-0.8 + Math.cos(g) * 8, Math.sin(g) * 8);
        a.stroke();
        a.strokeStyle = 'rgba(255,240,210,0.12)';
        a.lineWidth = 0.3;
        a.beginPath();
        a.moveTo(-0.6, 0.3);
        a.lineTo(-0.6 + Math.cos(g) * 8, 0.3 + Math.sin(g) * 8);
        a.stroke();
      }
      a.fillStyle = rgrad(
        a,
        -0.8,
        0,
        7.4,
        [
          [0, 'rgba(255,240,210,0.16)'],
          [0.6, 'rgba(0,0,0,0)'],
          [1, 'rgba(0,0,0,0.45)'],
        ],
        -2.2,
        -1.6
      );
      a.fillRect(-10, -10, 20, 20);
      a.fillStyle = 'rgba(0,0,0,0.25)';
      ell(a, -6.4, 0, 1.4, 3, 0);
      a.fill();
      a.restore();
      a.fillStyle = '#3a2c1c';
      circ(a, -0.8, 0, 0.9);
      a.fill();
      a.fillStyle = 'rgba(255,240,210,0.25)';
      circ(a, -1.1, -0.3, 0.35);
      a.fill();
      const star = (c, x, y, r) => {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const g = -Math.PI / 2 + (i * Math.PI) / 5,
            rr2 = i & 1 ? r * 0.45 : r;
          c.lineTo(x + Math.cos(g) * rr2, y + Math.sin(g) * rr2);
        }
        c.closePath();
      };
      star(a, 4.4, 0, 1.5);
      a.fillStyle = '#c8b070';
      a.fill();
      a.strokeStyle = 'rgba(40,30,10,0.6)';
      a.lineWidth = 0.3;
      a.stroke();
      e.fillStyle = 'rgba(255,230,170,0.18)';
      star(e, 4.4, 0, 1.2);
      e.fill();
      crown(a);
      a.strokeStyle = 'rgba(14,10,12,0.55)';
      a.lineWidth = 0.55;
      a.stroke();
    },
    0.2,
    0.8,
    1.2
  );
  region(
    'hh2',
    28,
    28,
    a => {
      // bare head: face at the front, ears, messy dark hair
      ell(a, 1, 0, 7.6, 6.4);
      a.fillStyle = '#c4906c';
      a.fill();
      nose(a, 8.3, '#cc9a74');
      ears(a, 0.4, 6.6, '#b8845e');
      hairMass(a, -1.2, 7.4, 6.6, '#2e2016', 'rgba(150,110,70,0.5)', [-3, 1], 90);
      a.fillStyle = '#2e2016';
      for (let i = 0; i < 6; i++) {
        a.beginPath();
        a.moveTo(5.2, rand(-5, 5));
        a.lineTo(rand(6.4, 7.6), rand(-4, 4));
        a.lineTo(5.4, rand(-5, 5));
        a.fill();
      }
      ell(a, 0.6, 0, 7.8, 6.6);
      a.strokeStyle = 'rgba(14,10,12,0.6)';
      a.lineWidth = 0.6;
      a.stroke();
    },
    0.22,
    0.75,
    1.3
  );
  const glove = (base, dk, knuckle) => a => {
    // back of a hand gripping, fingers curled over at the front
    shape(
      a,
      c => rr(c, -3.6, -2.8, 6.4, 5.6, 2.2),
      grad(a, -3.6, 0, 3, 0, [
        [0, dk],
        [1, base],
      ]),
      { lw: 0.7, out: EDGE, aoW: 1.4 }
    );
    for (let i = 0; i < 4; i++) {
      const y = -2.1 + i * 1.4;
      a.fillStyle = base;
      rr(a, 2.2, y - 0.62, 2.4, 1.24, 0.6);
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.45)';
      a.lineWidth = 0.35;
      a.stroke();
    }
    a.fillStyle = dk;
    rr(a, -1.4, -4.1, 3.6, 1.5, 0.7);
    a.fill();
    a.fillStyle = knuckle;
    for (let i = 0; i < 4; i++) {
      circ(a, 1.6, -2.1 + i * 1.4, 0.45);
      a.fill();
    }
  };
  region('h_glove', 12, 12, glove('#3a3a36', '#1c1c1a', 'rgba(255,255,255,0.14)'), 0.3, 0.9, 1);
  region('h_glove2', 12, 12, glove('#8a5a34', '#4e301a', 'rgba(255,220,180,0.18)'), 0.3, 0.9, 1);
  region('h_hand', 12, 12, glove('#d4a07c', '#a06e4c', 'rgba(255,255,255,0.18)'), 0.3, 0.9, 1);
  region(
    'h_foot',
    17,
    12,
    a => {
      // boot: rounded toe cap, laces, collar at the heel
      const b = c => {
        c.beginPath();
        c.moveTo(-7.4, -3.2);
        c.quadraticCurveTo(-1, -4.6, 4.6, -3.8);
        c.quadraticCurveTo(8.2, -2.6, 8.2, 0);
        c.quadraticCurveTo(8.2, 2.6, 4.6, 3.8);
        c.quadraticCurveTo(-1, 4.6, -7.4, 3.2);
        c.quadraticCurveTo(-8.4, 0, -7.4, -3.2);
        c.closePath();
      };
      shape(
        a,
        b,
        grad(a, 0, -4.4, 0, 4.4, [
          [0, '#4a3828'],
          [0.5, '#3a2c1e'],
          [1, '#1e160e'],
        ]),
        { lw: 0.8, out: EDGE, aoW: 1.6 }
      );
      a.fillStyle = 'rgba(255,255,255,0.12)';
      ell(a, 5.6, -1, 2.2, 1.4, 0);
      a.fill();
      a.strokeStyle = 'rgba(160,140,110,0.3)';
      a.lineWidth = 0.4;
      for (let x = -4; x < 3; x += 1.6) {
        a.beginPath();
        a.moveTo(x, -1.4);
        a.lineTo(x + 1.4, 1.4);
        a.moveTo(x, 1.4);
        a.lineTo(x + 1.4, -1.4);
        a.stroke();
      }
      a.fillStyle = '#120c08';
      ell(a, -6, 0, 1.6, 2.4);
      a.fill();
    },
    0.3,
    0.8,
    1
  );
  region(
    'h_pack',
    30,
    34,
    a => {
      // daypack seen from above: rounded top, lid, compression straps
      const p = c => rr(c, -10, -11.5, 13, 23, 4.5);
      shape(
        a,
        p,
        grad(a, -10, 0, 3, 0, [
          [0, '#30361e'],
          [1, '#56603c'],
        ]),
        { lw: 0.8, out: EDGE, aoW: 2 }
      );
      a.save();
      p(a);
      a.clip();
      weave(a, 12, 10, 120, 0.12, 0.06);
      a.restore();
      shape(
        a,
        c => rr(c, -12.5, -9.5, 6, 19, 3),
        grad(a, 0, -9, 0, 9, [
          [0, '#6a6044'],
          [1, '#4a4230'],
        ]),
        { lw: 0.7, out: EDGE, aoW: 1.4 }
      );
      a.fillStyle = '#20241a';
      for (const y of [-6, 6]) a.fillRect(-10, y - 0.9, 13, 1.8);
      a.fillStyle = '#8a8a80';
      for (const y of [-6, 6]) a.fillRect(0.5, y - 1.1, 1.6, 2.2);
    },
    0.15,
    0.6,
    1.2
  );

  /* the dead: torso hw 15.5, hd 9.5 with a forward hunch; neck stump sits at the front */
  const ZW = 15.5,
    ZD = 9.5,
    zp = c => SHP(c, ZW, ZD, 0.12);
  const ZSKINC = '#86907a';
  const zbody = (a, base, paint) => {
    zp(a);
    a.fillStyle = base;
    a.fill();
    a.save();
    zp(a);
    a.clip();
    weave(a, ZW, ZD, 200, 0.14, 0.05);
    paint(a);
    folds(a, ZW, ZD);
    grime(a, ZW, ZD, 7);
    // Subdermal infection veins are painted into the cloth/skin silhouette, not a flat screen overlay.
    for (let i = 0; i < 11; i++) {
      const x = rand(-ZD * 0.55, ZD * 0.58),
        y = rand(-ZW * 0.7, ZW * 0.7),
        dx = rand(1.5, 4.8),
        dy = rand(2.5, 7.5);
      a.strokeStyle = i & 1 ? 'rgba(145,166,76,0.34)' : 'rgba(44,68,34,0.34)';
      a.lineWidth = rand(0.42, 0.9);
      a.beginPath();
      a.moveTo(x - dx * 0.6, y - dy * 0.55);
      a.quadraticCurveTo(x + dx * 0.3, y - dy * 0.15, x, y + dy * 0.1);
      a.lineTo(x + dx * 0.7, y + dy * 0.65);
      a.moveTo(x, y + dy * 0.1);
      a.lineTo(x - dx * 0.6, y + dy * 0.5);
      a.stroke();
    }
    for (let i = 0; i < 2; i++)
      rip(a, rand(-ZD * 0.6, ZD * 0.3), rand(-ZW * 0.7, ZW * 0.7), rand(1.6, 2.8), rand(1.4, 2.4), ZSKINC);
    blood(a, ZW, ZD, 3);
    a.restore();
    volume(a, zp, ZW, ZD, 0.12);
    ell(a, 3.4, 0, 3.1, 3.3);
    a.fillStyle = rgrad(
      a,
      3.4,
      0,
      3.4,
      [
        [0, '#7e886e'],
        [0.75, '#646c56'],
        [1, '#3e4434'],
      ],
      -0.8,
      -0.8
    );
    a.fill();
    a.strokeStyle = 'rgba(0,0,0,0.35)';
    a.lineWidth = 0.5;
    a.stroke();
    outline(a, zp);
  };
  region(
    'z_torso0',
    38,
    42,
    a =>
      zbody(a, '#56687a', a => {
        a.fillStyle = 'rgba(255,255,255,0.08)';
        a.fillRect(-ZD, -ZW * 0.2, ZD * 2, ZW * 0.4);
        collar(a, 3.2, 4.8, 'rgba(40,50,60,0.6)');
      }),
    0.2,
    0.55,
    1.4
  );
  region(
    'z_torso1',
    38,
    42,
    a =>
      zbody(a, '#34505a', a => {
        plaid(a, ZW, ZD, '#34505a', 'rgba(8,16,22,0.45)', 'rgba(200,210,190,0.2)');
        collar(a, 3.2, 5, '#243a42');
      }),
    0.2,
    0.55,
    1.4
  ); // blue-grey flannel: the red plaid is the hero's
  region(
    'z_torso2',
    38,
    42,
    a =>
      zbody(a, '#948c74', a => {
        for (let i = 0; i < 3; i++) {
          a.fillStyle = 'rgba(120,96,40,0.25)';
          ell(a, rand(-ZD, ZD), rand(-ZW * 0.6, ZW * 0.6), rand(3, 6), rand(2, 4), 0);
          a.fill();
        }
        a.strokeStyle = 'rgba(60,54,40,0.4)';
        a.lineWidth = 0.6;
        for (const s of [-1, 1]) {
          a.beginPath();
          a.moveTo(ZD, s * ZW * 0.32);
          a.lineTo(-ZD, s * ZW * 0.32);
          a.stroke();
        }
      }),
    0.2,
    0.55,
    1.4
  );
  region(
    'z_torso3',
    38,
    42,
    a =>
      zbody(a, '#24304a', a => {
        for (const s of [-1, 1]) {
          a.fillStyle = '#18202e';
          rr(a, -ZD * 0.6, s * ZW * 0.74 - 1.6, ZD * 1.1, 3.2, 1.2);
          a.fill();
        }
        a.fillStyle = '#c8b468';
        a.beginPath();
        for (let i = 0; i < 6; i++) {
          const g = (i / 6) * TAU;
          a.lineTo(ZD * 0.62 + Math.cos(g) * 1.8, -ZW * 0.38 + Math.sin(g) * 2.2);
        }
        a.fill();
        a.fillStyle = '#121212';
        rr(a, ZD * 0.2, ZW * 0.44 - 1.4, 3, 2.8, 0.6);
        a.fill();
        a.strokeStyle = '#121212';
        a.lineWidth = 0.6;
        a.beginPath();
        a.moveTo(ZD * 0.2, ZW * 0.44);
        a.quadraticCurveTo(-2, ZW * 0.2, 1, 3);
        a.stroke();
        collar(a, 3.2, 4.8, '#1a2232');
      }),
    0.25,
    0.55,
    1.4
  );
  region(
    'z_torso4',
    38,
    42,
    a =>
      zbody(a, '#5a9a90', a => {
        a.strokeStyle = 'rgba(20,60,56,0.55)';
        a.lineWidth = 0.8;
        a.beginPath();
        a.moveTo(ZD * 0.95, -ZW * 0.32);
        a.lineTo(4.5, 0);
        a.lineTo(ZD * 0.95, ZW * 0.32);
        a.stroke();
        a.fillStyle = '#e8e4dc';
        rr(a, ZD * 0.45, -ZW * 0.55, 3, 2.2, 0.4);
        a.fill();
      }),
    0.2,
    0.55,
    1.4
  );
  region(
    'z_torso5',
    38,
    42,
    a =>
      zbody(a, '#8a6a38', a => {
        for (const x of [-ZD * 0.62, ZD * 0.58]) {
          a.fillStyle = '#c8c048';
          a.fillRect(x - 1.8, -ZW - 2, 3.6, ZW * 2 + 4);
          a.fillStyle = '#d8d8d0';
          a.fillRect(x - 0.6, -ZW - 2, 1.2, ZW * 2 + 4);
        }
        a.fillStyle = '#5a4424';
        ell(a, 3.4, 0, 5.4, 6.2);
        a.fill();
      }),
    0.3,
    0.55,
    1.4
  );
  region(
    'z_torso6',
    38,
    42,
    a =>
      zbody(a, '#5a5a5c', a => {
        for (const s of [-1, 1]) {
          a.fillStyle = '#e8701c';
          a.beginPath();
          a.moveTo(ZD + 2, s * ZW * 0.2);
          a.lineTo(ZD + 2, s * ZW * 0.7);
          a.lineTo(-ZD - 2, s * ZW * 0.72);
          a.lineTo(-ZD - 2, s * ZW * 0.18);
          a.closePath();
          a.fill();
          a.fillStyle = '#d8d8cc';
          a.fillRect(-ZD - 2, s * ZW * 0.45 - 0.9, ZD * 2 + 4, 1.8);
        }
        a.fillStyle = '#e8701c';
        a.fillRect(-ZD - 2, -ZW * 0.2, ZD * 0.9, ZW * 0.4);
        a.fillStyle = '#4a4a4c';
        ell(a, -ZD * 0.4, 0, 3.4, 4.6);
        a.fill();
      }),
    0.25,
    0.55,
    1.4
  );
  // district wardrobes. Route 9: a trucker's denim jacket, a biker's leather cut. Hollow Hill: a funeral suit, burial clothes, a groundskeeper's coveralls
  region(
    'z_torso7',
    38,
    42,
    a =>
      zbody(a, '#3e5068', a => {
        a.strokeStyle = 'rgba(220,200,150,0.35)';
        a.lineWidth = 0.5;
        for (const s of [-1, 1]) {
          a.beginPath();
          a.moveTo(ZD, s * ZW * 0.5);
          a.lineTo(-ZD, s * ZW * 0.55);
          a.stroke();
          a.beginPath();
          a.moveTo(-ZD * 0.2, s * ZW * 0.9);
          a.lineTo(-ZD * 0.2, s * 2);
          a.stroke();
        }
        collar(a, 3.4, 5.8, '#d6cbb0');
        a.fillStyle = 'rgba(255,250,235,0.35)';
        for (let i = 0; i < 26; i++) {
          const g = rand(0, TAU);
          circ(a, 3.4 + Math.cos(g) * rand(3, 5), Math.sin(g) * rand(4, 6), 0.5);
          a.fill();
        }
      }),
    0.2,
    0.55,
    1.4
  );
  region(
    'z_torso8',
    38,
    42,
    a =>
      zbody(a, '#c4c0b4', a => {
        const vest = s => {
          a.beginPath();
          a.moveTo(-ZD - 2, s * 2);
          a.lineTo(-ZD - 2, s * ZW * 0.86);
          a.lineTo(ZD * 0.6, s * ZW * 0.8);
          a.lineTo(ZD * 0.8, s * 4.5);
          a.lineTo(ZD * 0.1, s * 3);
          a.closePath();
        };
        for (const s of [-1, 1]) {
          vest(s);
          a.fillStyle = '#1c1a1a';
          a.fill();
          a.strokeStyle = 'rgba(160,150,140,0.35)';
          a.lineWidth = 0.5;
          a.stroke();
        }
        a.fillStyle = 'rgba(255,255,255,0.12)';
        ell(a, -2, -ZW * 0.5, 4, 1.4, 0.3);
        a.fill();
        ell(a, -2, ZW * 0.45, 4, 1.4, -0.3);
        a.fill();
        a.fillStyle = '#6a1e1a';
        circ(a, -ZD * 0.45, 0, 3.6);
        a.fill();
        a.strokeStyle = '#d8d0c0';
        a.lineWidth = 0.7;
        a.stroke();
        a.strokeStyle = '#d8d0c0';
        a.lineWidth = 1.4;
        a.beginPath();
        a.arc(-ZD * 0.45, 0, 7.5, Math.PI * 0.62, Math.PI * 1.38);
        a.stroke();
      }),
    0.35,
    0.55,
    1.4
  );
  region(
    'z_torso9',
    38,
    42,
    a =>
      zbody(a, '#1f1f24', a => {
        a.fillStyle = '#e0ddd4';
        a.beginPath();
        a.moveTo(ZD + 1, -3.2);
        a.lineTo(3, 0);
        a.lineTo(ZD + 1, 3.2);
        a.closePath();
        a.fill();
        a.fillStyle = '#121214';
        a.beginPath();
        a.moveTo(ZD + 1, -1);
        a.lineTo(4.4, 0);
        a.lineTo(ZD + 1, 1);
        a.closePath();
        a.fill();
        a.strokeStyle = 'rgba(120,120,130,0.45)';
        a.lineWidth = 0.6;
        for (const s of [-1, 1]) {
          a.beginPath();
          a.moveTo(ZD, s * 3.4);
          a.lineTo(ZD * 0.2, s * ZW * 0.5);
          a.stroke();
        }
        a.fillStyle = '#e8e4d8';
        circ(a, ZD * 0.4, -ZW * 0.42, 1.1);
        a.fill();
        for (let i = 0; i < 14; i++) {
          a.fillStyle = `rgba(${randi(70, 100)},${randi(56, 72)},${randi(36, 48)},0.45)`;
          ell(a, rand(-ZD, ZD), rand(-ZW, ZW), rand(1, 3), rand(0.8, 2), rand(0, 3));
          a.fill();
        }
      }),
    0.25,
    0.55,
    1.4
  );
  region(
    'z_torso10',
    38,
    42,
    a =>
      zbody(a, '#b8b0a0', a => {
        for (let i = 0; i < 40; i++) {
          a.fillStyle = 'rgba(140,110,120,0.22)';
          circ(a, rand(-ZD, ZD), rand(-ZW, ZW), 0.7);
          a.fill();
        }
        for (let i = 0; i < 9; i++) {
          const g = -Math.PI / 2 + (i / 8) * Math.PI;
          a.fillStyle = '#ece8de';
          circ(a, 3.4 + Math.cos(g) * 4.6, Math.sin(g) * 5.6, 1.3);
          a.fill();
        }
        for (let i = 0; i < 6; i++) {
          a.fillStyle = 'rgba(80,60,40,0.35)';
          ell(a, rand(-ZD, -ZD * 0.2), rand(-ZW, ZW), rand(2, 5), rand(1.5, 4), rand(0, 3));
          a.fill();
        }
      }),
    0.15,
    0.55,
    1.4
  );
  region(
    'z_torso11',
    38,
    42,
    a =>
      zbody(a, '#4c5a3e', a => {
        a.strokeStyle = 'rgba(20,24,14,0.6)';
        a.lineWidth = 0.7;
        a.beginPath();
        a.moveTo(ZD, 0);
        a.lineTo(ZD * 0.2, 0);
        a.stroke();
        a.fillStyle = '#d8d4c4';
        rr(a, ZD * 0.25, -ZW * 0.58, 4.4, 2.6, 0.6);
        a.fill();
        a.fillStyle = 'rgba(30,30,40,0.6)';
        a.fillRect(ZD * 0.35, -ZW * 0.54, 3.2, 0.5);
        a.fillRect(ZD * 0.35, -ZW * 0.48, 2.4, 0.5);
        for (let i = 0; i < 10; i++) {
          a.fillStyle = `rgba(${randi(70, 100)},${randi(56, 72)},${randi(36, 48)},0.4)`;
          ell(a, rand(-ZD, ZD), rand(-ZW, ZW), rand(1, 3), rand(0.8, 2), rand(0, 3));
          a.fill();
        }
      }),
    0.2,
    0.55,
    1.4
  );

  // everyday clothes, so a crowd looks like the town it came from (front is +x, the neck stump at x 3.4)
  region(
    'z_torso12',
    38,
    42,
    a =>
      zbody(a, '#4a4c52', a => {
        // a hoodie: the hood lies bunched on the upper back, drawstrings at the throat
        a.strokeStyle = 'rgba(0,0,0,0.3)';
        a.lineWidth = 0.7;
        for (const s of [-1, 1]) {
          a.beginPath();
          a.moveTo(ZD * 0.9, s * ZW * 0.86);
          a.quadraticCurveTo(0, s * ZW * 0.9, -ZD, s * ZW * 0.8);
          a.stroke();
        }
        a.fillStyle = '#3c3e44';
        ell(a, -1.2, 0, 6.8, 8.6);
        a.fill();
        a.fillStyle = 'rgba(0,0,0,0.38)';
        ell(a, 0.6, 0, 3.8, 5.6);
        a.fill();
        a.strokeStyle = 'rgba(255,255,255,0.1)';
        a.lineWidth = 0.6;
        a.beginPath();
        a.ellipse(-1.2, 0, 6.4, 8.2, 0, 2.2, 4.1);
        a.stroke();
        a.strokeStyle = '#d8d4cc';
        a.lineWidth = 0.6;
        for (const s of [-1, 1]) {
          a.beginPath();
          a.moveTo(ZD * 0.62, s * 2.2);
          a.lineTo(ZD + 1.2, s * 2.8);
          a.stroke();
        }
      }),
    0.15,
    0.55,
    1.4
  );
  region(
    'z_torso13',
    38,
    42,
    a =>
      zbody(a, '#56708e', a => {
        // a stone-washed denim jacket: yoke seam across the back, orange topstitching, a corduroy collar
        a.strokeStyle = 'rgba(30,40,56,0.55)';
        a.lineWidth = 0.8;
        a.beginPath();
        a.moveTo(-ZD * 0.15, -ZW * 0.95);
        a.lineTo(-ZD * 0.35, 0);
        a.lineTo(-ZD * 0.15, ZW * 0.95);
        a.stroke();
        a.strokeStyle = 'rgba(214,140,60,0.55)';
        a.setLineDash([0.8, 0.7]);
        a.lineWidth = 0.4;
        a.beginPath();
        a.moveTo(-ZD * 0.3, -ZW * 0.95);
        a.lineTo(-ZD * 0.5, 0);
        a.lineTo(-ZD * 0.3, ZW * 0.95);
        a.stroke();
        a.setLineDash([]);
        for (let i = 0; i < 24; i++) {
          a.fillStyle = 'rgba(220,230,240,0.08)';
          ell(a, rand(-ZD, ZD), rand(-ZW, ZW), rand(2, 5), rand(1, 3), rand(0, 3));
          a.fill();
        }
        collar(a, 3.4, 5.6, '#7a5a3a');
      }),
    0.2,
    0.55,
    1.4
  );
  region(
    'z_torso14',
    38,
    42,
    a =>
      zbody(a, '#5e2a2c', a => {
        // a quilted puffer jacket: fat baffles across the shoulders, a dirty sheen on each one
        for (let x = -ZD - 1; x < ZD + 2; x += 3.6) {
          a.fillStyle = grad(a, x, 0, x + 3.6, 0, [
            [0, 'rgba(0,0,0,0.28)'],
            [0.5, 'rgba(255,255,255,0.1)'],
            [1, 'rgba(0,0,0,0.3)'],
          ]);
          a.fillRect(x, -ZW - 2, 3.6, ZW * 2 + 4);
        }
        a.fillStyle = '#2c2c30';
        ell(a, 3.4, 0, 3.4, 5.4);
        a.fill();
      }),
    0.35,
    0.55,
    1.4
  );
  region(
    'z_torso15',
    38,
    42,
    a =>
      zbody(a, '#9caec4', a => {
        // an office shirt, untucked and sweat-stained, the tie still knotted at the throat
        a.strokeStyle = 'rgba(60,70,90,0.35)';
        a.lineWidth = 0.5;
        for (const s of [-1, 1]) {
          a.beginPath();
          a.moveTo(ZD * 0.8, s * ZW * 0.78);
          a.lineTo(-ZD, s * ZW * 0.74);
          a.stroke();
        }
        a.fillStyle = 'rgba(120,110,70,0.25)';
        ell(a, -ZD * 0.3, 0, 4.5, 7, 0);
        a.fill();
        for (const s of [-1, 1]) {
          ell(a, 2, s * ZW * 0.7, 3, 2, 0);
          a.fill();
        }
        a.fillStyle = '#e6e8ec';
        ell(a, 3.6, 0, 3.6, 4.6);
        a.fill();
        a.fillStyle = '#5a1a20';
        a.beginPath();
        a.moveTo(ZD * 0.62, -1.2);
        a.lineTo(ZD + 1.6, -1.6);
        a.lineTo(ZD + 1.6, 1.6);
        a.lineTo(ZD * 0.62, 1.2);
        a.closePath();
        a.fill();
      }),
    0.2,
    0.55,
    1.4
  );
  region(
    'z_torso16',
    38,
    42,
    a =>
      zbody(a, ZSKINC, a => {
        // an undershirt: the shoulders and arms bare, the cotton grey with filth
        for (let i = 0; i < 16; i++) {
          a.fillStyle = pick(['rgba(90,70,80,0.3)', 'rgba(60,70,40,0.3)', 'rgba(120,48,40,0.2)']);
          ell(a, rand(-ZD, ZD), rand(-ZW, ZW), rand(1, 3), rand(0.7, 2), rand(0, 3));
          a.fill();
        }
        const tank = c => {
          c.beginPath();
          c.moveTo(-ZD - 2, -ZW * 0.56);
          c.lineTo(ZD * 0.5, -ZW * 0.44);
          c.quadraticCurveTo(ZD * 0.2, 0, ZD * 0.5, ZW * 0.44);
          c.lineTo(-ZD - 2, ZW * 0.56);
          c.closePath();
        };
        tank(a);
        a.fillStyle = '#b4ae9c';
        a.fill();
        a.save();
        tank(a);
        a.clip();
        weave(a, ZW, ZD, 160, 0.12, 0.05);
        grime(a, ZW, ZD, 10);
        a.restore();
        tank(a);
        a.strokeStyle = 'rgba(40,36,28,0.45)';
        a.lineWidth = 0.6;
        a.stroke();
      }),
    0.25,
    0.55,
    1.4
  );
  region(
    'z_torso17',
    38,
    42,
    a =>
      zbody(a, '#7a6a56', a => {
        // a knitted cardigan, the kind a grandparent wears, buttons down the front band
        a.strokeStyle = 'rgba(40,30,20,0.25)';
        a.lineWidth = 0.45;
        for (let y = -ZW; y < ZW; y += 1.6) {
          a.beginPath();
          a.moveTo(-ZD - 1, y);
          a.lineTo(ZD + 1, y + 0.3);
          a.stroke();
        }
        a.fillStyle = '#5e5040';
        a.fillRect(ZD * 0.55, -ZW, 2.4, ZW * 2);
        a.fillStyle = '#d8ccb0';
        for (const y of [-ZW * 0.6, -ZW * 0.2, ZW * 0.2, ZW * 0.6]) {
          circ(a, ZD * 0.68, y, 0.7);
          a.fill();
        }
      }),
    0.15,
    0.55,
    1.4
  );
  region(
    'z_torso18',
    38,
    42,
    a =>
      zbody(a, '#2a2430', a => {
        // a black dress for a funeral, a grey knitted shawl over the shoulders
        const shawl = c => {
          c.beginPath();
          c.moveTo(ZD * 0.6, -ZW - 1);
          c.quadraticCurveTo(-ZD * 0.2, -ZW * 0.2, -ZD - 2, -ZW * 0.3);
          c.lineTo(-ZD - 2, ZW * 0.3);
          c.quadraticCurveTo(-ZD * 0.2, ZW * 0.2, ZD * 0.6, ZW + 1);
          c.lineTo(ZD + 2, ZW + 1);
          c.lineTo(ZD + 2, -ZW - 1);
          c.closePath();
        };
        shawl(a);
        a.fillStyle = '#5c5662';
        a.fill();
        a.save();
        shawl(a);
        a.clip();
        weave(a, ZW, ZD, 220, 0.14, 0.06);
        a.restore();
        a.strokeStyle = 'rgba(200,190,200,0.3)';
        a.lineWidth = 0.4;
        for (let i = 0; i < 24; i++) {
          const t = i / 23,
            y = lerp(-ZW * 0.3, ZW * 0.3, t),
            x = -ZD - 2;
          a.beginPath();
          a.moveTo(x, y);
          a.lineTo(x - rand(0.8, 1.8), y + rand(-0.4, 0.4));
          a.stroke();
        }
      }),
    0.2,
    0.55,
    1.4
  );
  region(
    'z_torso_spit',
    38,
    42,
    a => {
      // shirtless, swollen, bile-stained
      zp(a);
      a.fillStyle = '#7a8466';
      a.fill();
      a.save();
      zp(a);
      a.clip();
      grime(a, ZW, ZD, 10);
      a.strokeStyle = 'rgba(70,40,70,0.45)';
      a.lineWidth = 0.6;
      for (let i = 0; i < 10; i++) {
        let x = rand(-ZD, ZD),
          y = rand(-ZW, ZW);
        a.beginPath();
        a.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          x += rand(-3, 3);
          y += rand(-3, 3);
          a.lineTo(x, y);
        }
        a.stroke();
      }
      for (let i = 0; i < 8; i++) {
        a.fillStyle = `rgba(140,170,40,${rand(0.35, 0.7)})`;
        ell(a, rand(-2, ZD), rand(-ZW * 0.7, ZW * 0.7), rand(1.5, 4), rand(1, 3), rand(0, 3));
        a.fill();
      }
      for (let i = 0; i < 5; i++) {
        const x = rand(-ZD * 0.7, ZD * 0.6),
          y = rand(-ZW * 0.7, ZW * 0.7);
        a.fillStyle = '#b8b068';
        circ(a, x, y, rand(0.5, 0.9));
        a.fill();
        a.fillStyle = 'rgba(80,60,20,0.5)';
        circ(a, x + 0.3, y + 0.3, 0.5);
        a.fill();
      }
      blood(a, ZW, ZD, 3);
      a.restore();
      volume(a, zp, ZW, ZD, 0.12);
      ell(a, 3.2, 0, 3.8, 4);
      a.fillStyle = '#6e785a';
      a.fill();
      outline(a, zp);
    },
    0.35,
    0.55,
    1.4
  );

  const zscalp = (a, rx, ry, skin) => {
    ell(a, 0, 0, rx, ry);
    a.fillStyle = skin;
    a.fill();
    a.save();
    ell(a, 0, 0, rx, ry);
    a.clip();
    for (let i = 0; i < 24; i++) {
      a.fillStyle = pick([
        'rgba(90,70,80,0.32)',
        'rgba(60,70,40,0.34)',
        'rgba(120,110,90,0.27)',
        'rgba(118,48,40,0.16)',
      ]);
      ell(a, rand(-rx, rx), rand(-ry, ry), rand(0.65, 2.25), rand(0.45, 1.6), rand(0, 3));
      a.fill();
    }
    a.fillStyle = rgrad(
      a,
      0,
      0,
      rx,
      [
        [0, 'rgba(255,255,255,0.1)'],
        [0.7, 'rgba(0,0,0,0)'],
        [1, 'rgba(0,0,0,0.4)'],
      ],
      -1.5,
      -1
    );
    a.fillRect(-15, -15, 30, 30);
    a.restore();
  };
  // Infected eyes are part of the face texture. The dark socket provides depth;
  // the tiny emissive iris catches bloom without looking like a floating LED.
  const paintInfectedEyes = (
    a,
    e,
    x = 4.9,
    spread = 2.0,
    r = 0.66,
    iris = '#8e382b',
    glow = 'rgba(190,48,29,0.10)'
  ) => {
    for (const side of [-1, 1]) {
      const y = side * spread;
      a.fillStyle = 'rgba(20,13,13,0.82)';
      a.beginPath();
      a.ellipse(x, y, r * 1.5, r * 1.08, side * 0.06, 0, TAU);
      a.fill();
      a.fillStyle = 'rgba(5,5,7,0.92)';
      a.beginPath();
      a.ellipse(x + 0.03, y, r * 1.08, r * 0.78, side * 0.06, 0, TAU);
      a.fill();
      a.fillStyle = iris;
      a.beginPath();
      a.ellipse(x + 0.12, y, r * 0.64, r * 0.47, side * 0.06, 0, TAU);
      a.fill();
      a.fillStyle = 'rgba(255,207,165,0.72)';
      circ(a, x + 0.34, y - 0.15, r * 0.19);
      a.fill();
      e.fillStyle = glow;
      e.beginPath();
      e.ellipse(x + 0.08, y, r * 0.78, r * 0.48, side * 0.06, 0, TAU);
      e.fill();
    }
  };
  const gash = (a, x, y, l, g) => {
    a.save();
    a.translate(x, y);
    a.rotate(g);
    a.fillStyle = 'rgba(70,14,10,0.55)';
    ell(a, 0, 0.3, l * 1.2, 1.8);
    a.fill();
    a.strokeStyle = '#2a0404';
    a.lineWidth = 0.9;
    a.beginPath();
    a.moveTo(-l, 0);
    for (let t = -l; t <= l; t += l / 3) a.lineTo(t, rand(-0.5, 0.5));
    a.stroke();
    a.strokeStyle = 'rgba(150,30,24,0.8)';
    a.lineWidth = 0.4;
    a.stroke();
    for (let k = 0; k < 3; k++) {
      a.strokeStyle = 'rgba(60,8,6,0.6)';
      a.lineWidth = 0.5;
      const t = rand(-l, l);
      a.beginPath();
      a.moveTo(t, 0);
      a.lineTo(t + rand(-0.5, 0.5), rand(1.2, 2.4));
      a.stroke();
    }
    a.restore();
  };
  const zhead = (a, skin, hair, e) => {
    ears(a, 0.4, 6.3, '#7e8670');
    nose(a, 7.4, '#8a9078');
    zscalp(a, 7.2, 6.1, skin);
    if (hair) hair(a);
    paintInfectedEyes(a, e);
    ell(a, 0, 0, 7.2, 6.1);
    a.strokeStyle = 'rgba(14,10,12,0.7)';
    a.lineWidth = 0.6;
    a.stroke();
  };
  region(
    'z_head0',
    24,
    24,
    (a, e) =>
      zhead(
        a,
        '#8e9880',
        a => {
          hairMass(a, -1.6, 6.2, 5.8, '#2a2018', 'rgba(110,90,60,0.4)', [-3, 0.5], 60);
          a.fillStyle = '#8e9880';
          ell(a, -1, 2.4, 2.4, 1.8, 0.5);
          a.fill();
          gash(a, -2, 2.6, 2, 0.6);
        },
        e
      ),
    0.25,
    0.75,
    1.3
  );
  region(
    'z_head1',
    24,
    24,
    (a, e) =>
      zhead(
        a,
        '#9a907c',
        a => {
          a.save();
          ell(a, 0, 0, 7.2, 6.1);
          a.clip();
          a.strokeStyle = 'rgba(200,196,186,0.6)';
          a.lineWidth = 0.5;
          for (let i = 0; i < 40; i++) {
            const g = rand(1.9, 4.4),
              r = rand(4.4, 7.4);
            a.beginPath();
            a.moveTo(Math.cos(g) * r, Math.sin(g) * r);
            a.lineTo(Math.cos(g + 0.15) * (r + 1.4), Math.sin(g + 0.15) * (r + 1.4));
            a.stroke();
          }
          a.restore();
          for (let i = 0; i < 5; i++) {
            a.fillStyle = 'rgba(90,60,40,0.4)';
            circ(a, rand(-3, 4), rand(-3, 3), rand(0.4, 0.9));
            a.fill();
          }
          gash(a, -2.5, -1.5, 2.6, 1.1);
        },
        e
      ),
    0.3,
    0.75,
    1.3
  );
  region(
    'z_head2',
    24,
    24,
    (a, e) => {
      ears(a, 0.4, 6.3, '#7e8670');
      nose(a, 7.4, '#868c76');
      zscalp(a, 7.2, 6.1, '#868c7c');
      const hp2 = c => {
        c.beginPath();
        c.moveTo(5, -5);
        c.quadraticCurveTo(1, -8.4, -6, -8);
        c.quadraticCurveTo(-11.5, -4, -11.5, 0);
        c.quadraticCurveTo(-11.5, 4, -6, 8);
        c.quadraticCurveTo(1, 8.4, 5, 5);
        c.quadraticCurveTo(3, 0, 5, -5);
        c.closePath();
      };
      hp2(a);
      a.fillStyle = '#4a3420';
      a.fill();
      a.save();
      hp2(a);
      a.clip();
      for (let i = 0; i < 70; i++) {
        const y = rand(-8, 8);
        a.strokeStyle = Math.random() < 0.3 ? 'rgba(150,110,70,0.5)' : 'rgba(0,0,0,0.4)';
        a.lineWidth = rand(0.35, 0.7);
        a.beginPath();
        a.moveTo(4, y * 0.6);
        a.quadraticCurveTo(-3, y * 1.1, -11, y * 0.9 + rand(-1, 1));
        a.stroke();
      }
      a.fillStyle = 'rgba(60,8,8,0.5)';
      ell(a, -6, 3, 3, 2, 0);
      a.fill();
      a.restore();
      hp2(a);
      paintInfectedEyes(a, e, 4.7, 1.95, 0.62, '#83382e', 'rgba(166,45,28,0.09)');
      a.strokeStyle = 'rgba(14,10,12,0.7)';
      a.lineWidth = 0.6;
      a.stroke();
    },
    0.25,
    0.75,
    1.3
  );
  region(
    'z_head3',
    26,
    26,
    (a, e) => {
      nose(a, 7.8, '#8a9078');
      const cap = c => ell(c, -0.6, 0, 7.4, 7);
      cap(a);
      a.fillStyle = '#1e2638';
      a.fill();
      a.save();
      cap(a);
      a.clip();
      weave(a, 8, 8, 60, 0.15, 0.06);
      a.fillStyle = rgrad(
        a,
        -0.6,
        0,
        7.4,
        [
          [0, 'rgba(255,255,255,0.1)'],
          [1, 'rgba(0,0,0,0.4)'],
        ],
        -2,
        -1
      );
      a.fillRect(-10, -10, 20, 20);
      a.restore();
      a.fillStyle = '#0a0a0c';
      a.beginPath();
      a.ellipse(4.6, 0, 4.4, 6.6, 0, -1.25, 1.25);
      a.closePath();
      a.fill();
      a.fillStyle = 'rgba(255,255,255,0.2)';
      ell(a, 6.2, -2, 1.2, 0.5, 0.4);
      a.fill();
      a.fillStyle = '#c8b060';
      circ(a, 3.4, 0, 1.3);
      a.fill();
      paintInfectedEyes(a, e, 4.9, 1.85, 0.52, '#a27a42', 'rgba(176,126,46,0.08)');
      cap(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.7;
      a.stroke();
    },
    0.35,
    0.75,
    1.2
  );
  region(
    'z_head4',
    26,
    26,
    (a, e) =>
      zhead(
        a,
        '#968c7a',
        a => {
          hairMass(a, -1.4, 6.6, 6, '#4a3020', 'rgba(170,120,80,0.45)', [5, 0], 70);
          ell(a, -7.6, 0, 2.8, 2.6);
          a.fillStyle = '#3e2818';
          a.fill();
          a.strokeStyle = 'rgba(0,0,0,0.5)';
          a.lineWidth = 0.5;
          a.stroke();
          a.strokeStyle = 'rgba(150,110,70,0.5)';
          a.lineWidth = 0.4;
          for (let i = 0; i < 6; i++) {
            const g = rand(0, TAU);
            a.beginPath();
            a.arc(-7.6, 0, rand(0.8, 2.2), g, g + 1.5);
            a.stroke();
          }
        },
        e
      ),
    0.25,
    0.75,
    1.3
  );
  region(
    'z_head5',
    30,
    30,
    a => {
      nose(a, 8.2, '#8a9078');
      const brim = c => {
        c.beginPath();
        c.ellipse(-3.4, 0, 12.4, 9, 0, 0, TAU);
      };
      brim(a);
      a.fillStyle = '#1e1c18';
      a.fill();
      a.save();
      brim(a);
      a.clip();
      grime(a, 10, 13, 8);
      a.restore();
      brim(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.7;
      a.stroke();
      const dome = c => ell(c, 0, 0, 7.6, 6.8);
      dome(a);
      a.fillStyle = '#a8883a';
      a.fill();
      a.save();
      dome(a);
      a.clip();
      a.strokeStyle = 'rgba(40,30,10,0.5)';
      a.lineWidth = 0.6;
      for (let y = -6; y <= 6; y += 2) {
        a.beginPath();
        a.moveTo(-8, y);
        a.quadraticCurveTo(0, y * 1.15, 8, y);
        a.stroke();
      }
      grime(a, 7, 8, 10);
      a.fillStyle = rgrad(
        a,
        0,
        0,
        7.6,
        [
          [0, 'rgba(255,255,255,0.14)'],
          [1, 'rgba(0,0,0,0.4)'],
        ],
        -2,
        -1.5
      );
      a.fillRect(-10, -10, 20, 20);
      a.restore();
      a.fillStyle = '#d8c070';
      rr(a, 5, -2.4, 3.6, 4.8, 1);
      a.fill();
      a.fillStyle = '#8a2a1a';
      circ(a, 6.8, 0, 1);
      a.fill();
      dome(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.7;
      a.stroke();
    },
    0.4,
    0.75,
    1.2
  );
  region(
    'z_head6',
    26,
    26,
    a => {
      nose(a, 8, '#8a9078');
      const hat = c => ell(c, 0, 0, 7.8, 7.2);
      a.fillStyle = '#c8a022';
      ell(a, 6.4, 0, 3.4, 5.4);
      a.fill();
      hat(a);
      a.fillStyle = '#d8b028';
      a.fill();
      a.save();
      hat(a);
      a.clip();
      grime(a, 8, 8, 12);
      for (let i = 0; i < 6; i++) {
        a.strokeStyle = 'rgba(255,255,255,0.35)';
        a.lineWidth = 0.4;
        const x = rand(-5, 5),
          y = rand(-5, 5);
        a.beginPath();
        a.moveTo(x, y);
        a.lineTo(x + rand(-2, 2), y + rand(-2, 2));
        a.stroke();
      }
      a.fillStyle = rgrad(
        a,
        0,
        0,
        7.8,
        [
          [0, 'rgba(255,255,255,0.18)'],
          [1, 'rgba(0,0,0,0.4)'],
        ],
        -2,
        -1.5
      );
      a.fillRect(-10, -10, 20, 20);
      a.restore();
      a.strokeStyle = 'rgba(80,60,0,0.6)';
      a.lineWidth = 1.2;
      a.beginPath();
      a.moveTo(-7.4, 0);
      a.lineTo(7.4, 0);
      a.stroke();
      a.lineWidth = 0.7;
      for (const s of [-1, 1]) {
        a.beginPath();
        a.moveTo(-6.6, s * 2.6);
        a.quadraticCurveTo(0, s * 3.2, 6.6, s * 2.6);
        a.stroke();
      }
      hat(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.7;
      a.stroke();
    },
    0.55,
    0.75,
    1.2
  );
  region(
    'z_head7',
    26,
    26,
    a => {
      nose(a, 7.8, '#8a9078');
      ears(a, 0.4, 6.4, '#7e8670');
      a.fillStyle = '#7a1e1c';
      a.beginPath();
      a.ellipse(5.4, 0, 4.4, 6.2, 0, -1.3, 1.3);
      a.closePath();
      a.fill();
      const cap = c => ell(c, -0.6, 0, 7.2, 6.8);
      cap(a);
      a.fillStyle = '#e8e4dc';
      a.fill();
      a.save();
      cap(a);
      a.clip();
      a.fillStyle = '#9a2622';
      a.fillRect(0, -8, 8, 16);
      a.fillStyle = 'rgba(30,20,20,0.35)';
      for (let x = -7; x < 0; x += 1.4) for (let y = -7; y < 7; y += 1.4) a.fillRect(x, y, 0.6, 0.6);
      a.fillStyle = rgrad(
        a,
        -0.6,
        0,
        7.2,
        [
          [0, 'rgba(255,255,255,0.12)'],
          [1, 'rgba(0,0,0,0.4)'],
        ],
        -2,
        -1
      );
      a.fillRect(-10, -10, 20, 20);
      a.restore();
      cap(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.7;
      a.stroke();
      a.fillStyle = '#c8c0a8';
      circ(a, -0.6, 0, 0.8);
      a.fill();
    },
    0.25,
    0.75,
    1.2
  ); // trucker cap: red front panel, white mesh back
  region(
    'z_head8',
    26,
    26,
    a => {
      nose(a, 7.6, '#8a9078');
      ears(a, 0.4, 6.4, '#7e8670');
      zscalp(a, 7.2, 6.1, '#8a8a76');
      const band = c => ell(c, -0.4, 0, 7.4, 6.4);
      band(a);
      a.fillStyle = '#26365a';
      a.fill();
      a.save();
      band(a);
      a.clip();
      a.strokeStyle = 'rgba(220,220,230,0.45)';
      a.lineWidth = 0.4;
      for (let i = 0; i < 14; i++) {
        const x = rand(-6, 6),
          y = rand(-5, 5);
        a.beginPath();
        a.arc(x, y, rand(0.8, 1.6), 0, Math.PI * 1.4);
        a.stroke();
      }
      a.fillStyle = rgrad(
        a,
        0,
        0,
        7.4,
        [
          [0, 'rgba(255,255,255,0.1)'],
          [1, 'rgba(0,0,0,0.4)'],
        ],
        -2,
        -1
      );
      a.fillRect(-10, -10, 20, 20);
      a.restore();
      band(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.6;
      a.stroke();
      a.fillStyle = '#26365a';
      for (const s of [-1, 1]) {
        a.beginPath();
        a.moveTo(-7, 0);
        a.lineTo(-11.5, s * 2.8);
        a.lineTo(-10.5, s * 0.6);
        a.closePath();
        a.fill();
      }
      a.fillStyle = 'rgba(70,56,40,0.7)';
      a.beginPath();
      a.ellipse(6.6, 0, 1.8, 4.4, 0, -1.4, 1.4);
      a.fill();
    },
    0.25,
    0.75,
    1.2
  ); // biker: paisley bandana knotted at the back, beard under the chin
  region(
    'z_head9',
    24,
    24,
    (a, e) =>
      zhead(
        a,
        '#a49e90',
        a => {
          hairMass(a, -1.2, 6.4, 5.9, '#9a9690', 'rgba(220,220,214,0.45)', [-3, -2.2], 60);
          a.strokeStyle = 'rgba(60,56,52,0.7)';
          a.lineWidth = 0.5;
          a.beginPath();
          a.moveTo(4.2, -2.4);
          a.lineTo(-6.4, -2.6);
          a.stroke();
        },
        e
      ),
    0.3,
    0.75,
    1.2
  ); // combed and parted for the viewing
  region(
    'z_head10',
    28,
    28,
    (a, e) =>
      zhead(
        a,
        '#a8a090',
        a => {
          hairMass(a, -3.2, 7.8, 7.2, '#5a4632', 'rgba(170,140,100,0.4)', [4, 0], 90, 0.6);
          a.fillStyle = '#6a5a6a';
          circ(a, -1, -5.4, 1.4);
          a.fill();
          a.fillStyle = '#8a7a50';
          circ(a, -1, -5.4, 0.6);
          a.fill();
        },
        e
      ),
    0.25,
    0.75,
    1.2
  ); // long hair spread on the pillow, a dried flower
  region(
    'z_head11',
    26,
    26,
    a => {
      nose(a, 7.8, '#8a9078');
      ears(a, 0.6, 6.5, '#7e8670');
      const hat = c => ell(c, -0.4, 0, 7.4, 6.9);
      hat(a);
      a.fillStyle = '#3a4a34';
      a.fill();
      a.save();
      hat(a);
      a.clip();
      a.strokeStyle = 'rgba(0,0,0,0.25)';
      a.lineWidth = 0.6;
      for (let r = 1.5; r < 7.5; r += 1.3) {
        a.beginPath();
        a.ellipse(-0.4, 0, r, r * 0.93, 0, 0, TAU);
        a.stroke();
      }
      a.fillStyle = rgrad(
        a,
        0,
        0,
        7.4,
        [
          [0, 'rgba(255,255,255,0.1)'],
          [1, 'rgba(0,0,0,0.4)'],
        ],
        -2,
        -1
      );
      a.fillRect(-10, -10, 20, 20);
      a.restore();
      hat(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.6;
      a.stroke();
    },
    0.2,
    0.75,
    1.2
  ); // knit beanie

  region(
    'z_head12',
    24,
    24,
    (a, e) =>
      zhead(
        a,
        '#8c9480',
        a => {
          a.save();
          ell(a, 0, 0, 7.2, 6.1);
          a.clip();
          for (let i = 0; i < 90; i++) {
            a.fillStyle = 'rgba(30,26,22,0.35)';
            circ(a, rand(-7, 4), rand(-6, 6), 0.25);
            a.fill();
          }
          a.restore();
        },
        e
      ),
    0.3,
    0.75,
    1.3
  ); // shaved head, stubble
  region(
    'z_head13',
    24,
    24,
    (a, e) =>
      zhead(
        a,
        '#94907c',
        a => {
          hairMass(a, -1.4, 6.4, 5.9, '#a88c5a', 'rgba(230,200,140,0.45)', [-3, 1.5], 70);
        },
        e
      ),
    0.25,
    0.75,
    1.3
  ); // short dirty-blond hair
  region(
    'z_head14',
    26,
    26,
    (a, e) =>
      zhead(
        a,
        '#a29c8e',
        a => {
          hairMass(a, -1.2, 6.6, 6.1, '#8e8a84', 'rgba(220,216,210,0.45)', [-2, 0], 70);
          ell(a, -6.6, 0, 3, 2.8);
          a.fillStyle = '#7e7a74';
          a.fill();
          a.strokeStyle = 'rgba(0,0,0,0.4)';
          a.lineWidth = 0.5;
          a.stroke();
        },
        e
      ),
    0.25,
    0.75,
    1.3
  ); // grey hair pinned in a bun
  region(
    'z_head15',
    26,
    26,
    (a, e) => {
      ears(a, 0.4, 6.3, '#7e8670');
      nose(a, 7.4, '#8a9078');
      zscalp(a, 7.2, 6.1, '#8a9078');
      paintInfectedEyes(a, e);
      const cap = c => ell(c, -0.8, 0, 7, 6.6);
      cap(a);
      a.fillStyle = pick(['#2a3448', '#5a1e1e', '#2c3a2a']);
      a.fill();
      a.save();
      cap(a);
      a.clip();
      a.fillStyle = 'rgba(255,255,255,0.1)';
      ell(a, -2, -2, 4, 3, 0);
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.3)';
      a.lineWidth = 0.5;
      for (let k = 0; k < 6; k++) {
        const g = (k / 6) * TAU;
        a.beginPath();
        a.moveTo(-0.8, 0);
        a.lineTo(-0.8 + Math.cos(g) * 7, Math.sin(g) * 6.6);
        a.stroke();
      }
      a.restore();
      a.fillStyle = 'rgba(0,0,0,0.55)';
      circ(a, -0.8, 0, 0.8);
      a.fill();
    },
    0.25,
    0.75,
    1.3
  ); // a baseball cap worn backwards, the bill over the neck
  region(
    'z_head16',
    26,
    26,
    (a, e) => {
      nose(a, 7.6, '#8a9078');
      paintInfectedEyes(a, e);
      const hood = c => ell(c, -1, 0, 8.2, 7.4);
      hood(a);
      a.fillStyle = '#3c3e44';
      a.fill();
      a.save();
      hood(a);
      a.clip();
      weave(a, 8, 8, 80, 0.14, 0.06);
      a.fillStyle = 'rgba(0,0,0,0.5)';
      ell(a, 5.6, 0, 3.4, 4.6);
      a.fill();
      a.strokeStyle = 'rgba(255,255,255,0.12)';
      a.lineWidth = 0.5;
      a.beginPath();
      a.moveTo(6.5, -5);
      a.quadraticCurveTo(-4, -6, -8, 0);
      a.stroke();
      a.restore();
      hood(a);
      a.strokeStyle = 'rgba(14,12,14,0.6)';
      a.lineWidth = 0.6;
      a.stroke();
    },
    0.15,
    0.75,
    1.3
  ); // the hood up, the face a dark hole in it
  region(
    'z_head17',
    26,
    26,
    (a, e) =>
      zhead(
        a,
        '#8a8470',
        a => {
          a.save();
          ell(a, -0.6, 0, 7.6, 6.8);
          a.clip();
          for (let i = 0; i < 70; i++) {
            const x = rand(-8, 4),
              y = rand(-7, 7);
            a.fillStyle = pick(['#1c1612', '#2a201a', '#14100c']);
            circ(a, x, y, rand(0.8, 1.5));
            a.fill();
            a.fillStyle = 'rgba(160,130,100,0.2)';
            circ(a, x - 0.3, y - 0.3, 0.4);
            a.fill();
          }
          a.restore();
        },
        e
      ),
    0.25,
    0.75,
    1.3
  ); // tight dark curls
  region(
    'z_head_spit',
    24,
    24,
    (a, e) => {
      ears(a, 0.4, 6.6, '#7a8460');
      nose(a, 7.6, '#7e8862');
      zscalp(a, 7.4, 6.4, '#86906a');
      a.save();
      ell(a, 0, 0, 7.4, 6.4);
      a.clip();
      for (let i = 0; i < 7; i++) {
        const x = rand(-5, 5),
          y = rand(-4.5, 4.5),
          r = rand(0.4, 0.8);
        a.fillStyle = '#b8b868';
        circ(a, x, y, r);
        a.fill();
        a.fillStyle = 'rgba(255,255,255,0.4)';
        circ(a, x - r * 0.3, y - r * 0.3, r * 0.35);
        a.fill();
      }
      a.strokeStyle = 'rgba(80,40,80,0.45)';
      a.lineWidth = 0.5;
      for (let i = 0; i < 6; i++) {
        let x = rand(-6, 6),
          y = rand(-5, 5);
        a.beginPath();
        a.moveTo(x, y);
        for (let k = 0; k < 3; k++) {
          x += rand(-2, 2);
          y += rand(-2, 2);
          a.lineTo(x, y);
        }
        a.stroke();
      }
      a.restore();
      paintInfectedEyes(a, e, 4.65, 1.95, 0.64, '#90ab40', 'rgba(156,205,52,0.08)');
      ell(a, 0, 0, 7.4, 6.4);
      a.strokeStyle = 'rgba(14,10,12,0.7)';
      a.lineWidth = 0.6;
      a.stroke();
    },
    0.45,
    0.75,
    1.3
  );
  region(
    'z_hand',
    11,
    10,
    a => {
      // dead hand reaching: grey palm, fingers half-curled, dark split nails
      const sk = '#8a9280',
        dk = '#5e6656';
      ell(a, -1.4, 0, 2.9, 2.6);
      a.fillStyle = grad(a, -4.2, 0, 1.6, 0, [
        [0, dk],
        [1, sk],
      ]);
      a.fill();
      a.strokeStyle = 'rgba(14,10,12,0.5)';
      a.lineWidth = 0.4;
      a.stroke();
      const F = [
        [-1.75, 2.9, -0.22],
        [-0.6, 3.4, -0.07],
        [0.6, 3.3, 0.07],
        [1.7, 2.7, 0.24],
      ];
      for (const [y, l, g] of F) {
        const x1 = 1.1 + Math.cos(g) * l * 0.55,
          y1 = y + Math.sin(g) * l * 0.55,
          x2 = 1.1 + Math.cos(g * 1.5) * l,
          y2 = y + Math.sin(g * 1.5) * l;
        a.strokeStyle = 'rgba(14,10,12,0.5)';
        a.lineWidth = 1.45;
        a.beginPath();
        a.moveTo(1, y * 0.8);
        a.lineTo(x1, y1);
        a.lineTo(x2 - 0.4, y2);
        a.stroke();
        a.strokeStyle = sk;
        a.lineWidth = 1.05;
        a.stroke();
        a.fillStyle = 'rgba(0,0,0,0.25)';
        circ(a, x1, y1, 0.32);
        a.fill();
        a.fillStyle = '#3a3024';
        circ(a, x2 - 0.35, y2, 0.36);
        a.fill();
      }
      a.strokeStyle = 'rgba(14,10,12,0.5)';
      a.lineWidth = 1.35;
      a.beginPath();
      a.moveTo(-0.6, -2.1);
      a.lineTo(1, -3.4);
      a.stroke();
      a.strokeStyle = sk;
      a.lineWidth = 0.95;
      a.stroke();
      a.strokeStyle = 'rgba(70,50,90,0.4)';
      a.lineWidth = 0.3;
      a.beginPath();
      a.moveTo(-3.6, 0.6);
      a.lineTo(0.4, 0.2);
      a.stroke();
    },
    0.2,
    1,
    1
  );
  for (let v = 0; v <= 21; v++) {
    const big = v === 19 ? 1.7 : 1,
      col = v < 19 ? ZSHIRT[v] : v === 19 ? [0.35, 0.24, 0.16] : v === 20 ? [0.48, 0.54, 0.36] : [0.58, 0.55, 0.6];
    region(
      'z_ly' + v,
      52 * big,
      44 * big,
      a => {
        a.scale(big, big);
        a.fillStyle = `rgb(${col.map(x => Math.round(x * 255)).join(',')})`;
        a.beginPath();
        a.ellipse(1, 0, 24, 15, 0, 0, TAU);
        a.fill();
      },
      0.2,
      1,
      1
    );
  } // bodies face down: the 3D pictures replace these
  for (let v = 0; v <= 18; v++) {
    const col = ZSHIRT[v];
    region(
      'z_lu' + v,
      52,
      44,
      a => {
        a.fillStyle = `rgb(${col.map(x => Math.round(x * 255)).join(',')})`;
        a.beginPath();
        a.ellipse(1, 0, 24, 15, 0, 0, TAU);
        a.fill();
      },
      0.2,
      1,
      1
    );
  } // bodies face up
  for (let v = 0; v <= 17; v++)
    region(
      'z_headu' + v,
      28,
      28,
      a => {
        a.fillStyle = '#8e9880';
        a.beginPath();
        a.ellipse(0, 0, 7, 6, 0, 0, TAU);
        a.fill();
      },
      0.2,
      1,
      1
    );
  region(
    'z_lhipu',
    30,
    30,
    a => {
      a.fillStyle = '#d0d0d4';
      a.beginPath();
      a.ellipse(0, 0, 12, 12, 0, 0, TAU);
      a.fill();
    },
    0.2,
    1,
    1
  );
  region(
    'z_lhip',
    30,
    30,
    a => {
      a.fillStyle = '#d0d0d4';
      a.beginPath();
      a.ellipse(0, 0, 12, 12, 0, 0, TAU);
      a.fill();
    },
    0.2,
    1,
    1
  );
  region(
    'z_lleg',
    50,
    16,
    a => {
      a.fillStyle = '#d0d0d4';
      a.beginPath();
      a.ellipse(0, 0, 22, 5, 0, 0, TAU);
      a.fill();
    },
    0.2,
    1,
    1
  );
  region(
    'z_foot',
    13,
    9,
    a => {
      // scuffed shoe
      const b = c => {
        c.beginPath();
        c.moveTo(-5.6, -2.6);
        c.quadraticCurveTo(0, -3.6, 3.8, -3);
        c.quadraticCurveTo(6.4, -1.8, 6.4, 0);
        c.quadraticCurveTo(6.4, 1.8, 3.8, 3);
        c.quadraticCurveTo(0, 3.6, -5.6, 2.6);
        c.quadraticCurveTo(-6.4, 0, -5.6, -2.6);
        c.closePath();
      };
      shape(
        a,
        b,
        grad(a, 0, -3.4, 0, 3.4, [
          [0, '#4a4038'],
          [1, '#221c16'],
        ]),
        { lw: 0.7, out: EDGE, aoW: 1.2 }
      );
      grime(a, 3, 6, 3);
      a.fillStyle = '#0e0a08';
      ell(a, -4.4, 0, 1.3, 1.8);
      a.fill();
    },
    0.25,
    1,
    1
  );
  region(
    'z_scream',
    46,
    46,
    a => {
      // gaunt screamer: torn slip dress, ribs and collarbones under grey skin
      const W = 14,
        D = 8.5,
        p = c => SHP(c, W, D, 0.1);
      p(a);
      a.fillStyle = '#7e7a86';
      a.fill();
      a.save();
      p(a);
      a.clip();
      grime(a, W, D, 8);
      a.strokeStyle = 'rgba(40,34,48,0.5)';
      a.lineWidth = 0.7;
      for (let i = -3; i <= 3; i++) {
        a.beginPath();
        a.moveTo(-D * 0.7, i * 2.6);
        a.quadraticCurveTo(0, i * 2.9, D * 0.4, i * 2.6);
        a.stroke();
      }
      for (const s of [-1, 1]) {
        a.strokeStyle = 'rgba(220,214,230,0.3)';
        a.lineWidth = 0.8;
        a.beginPath();
        a.moveTo(4, s * 1.5);
        a.quadraticCurveTo(5.5, s * 6, 3, s * 11);
        a.stroke();
      }
      a.fillStyle = '#3a2e3a';
      a.beginPath();
      a.moveTo(-D - 2, -W * 0.5);
      a.lineTo(-D * 0.1, -W * 0.36);
      a.lineTo(-D * 0.3, -W * 0.1);
      a.lineTo(-D * 0.05, W * 0.12);
      a.lineTo(-D * 0.25, W * 0.4);
      a.lineTo(-D - 2, W * 0.5);
      a.closePath();
      a.fill();
      blood(a, W, D, 3);
      a.restore();
      volume(a, p, W, D);
      outline(a, p);
    },
    0.2,
    0.55,
    1.4
  );
  region(
    'z_shead',
    28,
    28,
    (a, e) => {
      // long wild hair fanning back, dark open mouth at the front
      a.fillStyle = '#1a0608';
      ell(a, 7.6, 0, 2.4, 2.8);
      a.fill();
      e.fillStyle = 'rgba(160,40,60,0.35)';
      ell(e, 7.6, 0, 1.8, 2.2);
      e.fill();
      zscalp(a, 6.8, 5.8, '#a49cac');
      const hp2 = c => {
        c.beginPath();
        c.moveTo(4.6, -5.4);
        c.quadraticCurveTo(-2, -12.5, -12.5, -9);
        c.quadraticCurveTo(-13.5, 0, -12.5, 9);
        c.quadraticCurveTo(-2, 12.5, 4.6, 5.4);
        c.quadraticCurveTo(2.4, 0, 4.6, -5.4);
        c.closePath();
      };
      hp2(a);
      a.fillStyle = '#1c181c';
      a.fill();
      a.save();
      hp2(a);
      a.clip();
      for (let i = 0; i < 90; i++) {
        const y = rand(-11, 11);
        a.strokeStyle = Math.random() < 0.3 ? 'rgba(120,110,120,0.5)' : 'rgba(0,0,0,0.45)';
        a.lineWidth = rand(0.3, 0.6);
        a.beginPath();
        a.moveTo(4, y * 0.45);
        a.quadraticCurveTo(-4, y * 0.9 + rand(-2, 2), -13, y + rand(-2, 2));
        a.stroke();
      }
      a.restore();
      paintInfectedEyes(a, e, 4.55, 1.9, 0.6, '#86629a', 'rgba(144,85,166,0.07)');
    },
    0.25,
    0.75,
    1.3
  );
  region(
    'z_bhead',
    28,
    28,
    (a, e) => {
      // brute: shaved head, stubble, thick neck folds, scar tissue
      ears(a, 0.2, 7.2, '#7e7062');
      nose(a, 8.4, '#8e806e');
      zscalp(a, 8, 7, '#93836f');
      a.save();
      ell(a, 0, 0, 8, 7);
      a.clip();
      for (let i = 0; i < 160; i++) {
        const x = rand(-8, 5),
          y = rand(-7, 7);
        a.fillStyle = 'rgba(30,24,20,0.35)';
        a.fillRect(x, y, 0.35, 0.35);
      }
      a.strokeStyle = 'rgba(40,28,24,0.35)';
      a.lineWidth = 0.8;
      for (const y of [-2, 0, 2]) {
        a.beginPath();
        a.moveTo(-8, y * 1.6);
        a.quadraticCurveTo(-6, y * 1.9, -4.6, y * 1.6);
        a.stroke();
      }
      for (const [x0, y0, x1, y1] of [
        [-3, -5, 3, -1.5],
        [0, 3, 4.5, 5],
      ]) {
        a.strokeStyle = 'rgba(70,30,30,0.5)';
        a.lineWidth = 1.1;
        a.beginPath();
        a.moveTo(x0, y0);
        a.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 0.8, x1, y1);
        a.stroke();
        a.strokeStyle = 'rgba(220,170,160,0.35)';
        a.lineWidth = 0.4;
        a.stroke();
      }
      a.restore();
      paintInfectedEyes(a, e, 4.75, 1.9, 0.62, '#87392c', 'rgba(166,49,25,0.08)');
      ell(a, 0, 0, 8, 7);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.6;
      a.stroke();
    },
    0.3,
    0.75,
    1.3
  );
  region(
    'z_brute',
    82,
    92,
    a => {
      // hulking dead labourer: mottled skin over heavy traps and shoulders, a work shirt torn off the back
      const W = 40,
        D = 22,
        p = c => SHP(c, W, D, 0.22, 0.3);
      p(a);
      a.fillStyle = '#5f564b';
      a.fill();
      a.save();
      p(a);
      a.clip();
      for (let i = 0; i < 30; i++) {
        a.fillStyle = pick([
          'rgba(96,70,110,0.2)',
          'rgba(70,84,58,0.2)',
          'rgba(150,130,104,0.16)',
          'rgba(52,40,40,0.16)',
        ]);
        ell(a, rand(-D, D), rand(-W, W), rand(3, 10), rand(2, 7), rand(0, 3));
        a.fill();
      }
      weave(a, W, D, 700, 0.06, 0.035);
      for (const s of [-1, 1]) {
        // trapezius and deltoid masses
        a.fillStyle = rgrad(a, -1, s * 15, 16, [
          [0, 'rgba(255,236,210,0.09)'],
          [1, 'rgba(0,0,0,0)'],
        ]);
        a.fillRect(-D - 2, -W - 2, D * 2 + 4, W * 2 + 4);
        a.fillStyle = rgrad(a, 4, s * 31, 11, [
          [0, 'rgba(255,236,210,0.07)'],
          [1, 'rgba(0,0,0,0)'],
        ]);
        a.fillRect(-D - 2, -W - 2, D * 2 + 4, W * 2 + 4);
        a.strokeStyle = 'rgba(40,28,24,0.32)';
        a.lineWidth = 1.4;
        a.beginPath();
        a.moveTo(12, s * 22);
        a.quadraticCurveTo(2, s * 25, -10, s * 23);
        a.stroke();
      }
      a.strokeStyle = 'rgba(40,28,24,0.4)';
      a.lineWidth = 1.6;
      a.beginPath();
      a.moveTo(-D, 0);
      a.quadraticCurveTo(-D * 0.4, 0.6, 2, 0);
      a.stroke(); // spine groove
      for (const s of [-1, 1]) {
        a.strokeStyle = 'rgba(40,28,24,0.25)';
        a.lineWidth = 1;
        a.beginPath();
        a.moveTo(-D * 0.9, s * 6);
        a.quadraticCurveTo(-D * 0.3, s * 12, -2, s * 9);
        a.stroke();
      } // shoulder blades
      // what is left of a denim work shirt, clinging to the lower back and one shoulder
      const sh = c => {
        c.beginPath();
        c.moveTo(-D - 3, -W * 0.9);
        c.lineTo(-D * 0.35, -W * 0.82);
        for (let t = 0; t <= 1; t += 0.08)
          c.lineTo(-D * 0.35 - Math.sin(t * 9) * 3 - rand(0, 2.5) + t * 2, lerp(-W * 0.82, W * 0.25, t));
        c.lineTo(-D * 0.75, W * 0.6);
        c.lineTo(-D - 3, W * 0.7);
        c.closePath();
      };
      sh(a);
      a.fillStyle = '#3a4656';
      a.fill();
      a.save();
      sh(a);
      a.clip();
      weave(a, W, D, 400, 0.15, 0.06);
      folds(a, W, D, 1.5);
      a.fillStyle = 'rgba(70,8,6,0.45)';
      ell(a, -D * 0.6, W * 0.1, 6, 9, 0.3);
      a.fill();
      a.restore();
      sh(a);
      a.strokeStyle = 'rgba(0,0,0,0.4)';
      a.lineWidth = 0.9;
      a.stroke();
      a.strokeStyle = 'rgba(210,200,180,0.35)';
      a.lineWidth = 0.35;
      for (let i = 0; i < 18; i++) {
        const y = rand(-W * 0.8, W * 0.2),
          x = -D * 0.35 - rand(0, 3);
        a.beginPath();
        a.moveTo(x, y);
        a.lineTo(x + rand(0.8, 2), y + rand(-0.8, 0.8));
        a.stroke();
      }
      // veins, bites, an old gunshot, healed welts
      a.strokeStyle = 'rgba(70,30,80,0.3)';
      a.lineWidth = 0.7;
      for (let i = 0; i < 14; i++) {
        let x = rand(-D * 0.2, D),
          y = rand(-W, W);
        a.beginPath();
        a.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          x += rand(-4, 4);
          y += rand(-4, 4);
          a.lineTo(x, y);
        }
        a.stroke();
      }
      for (const [x, y, g] of [
        [8, -20, 0.4],
        [-4, 26, -0.8],
      ]) {
        a.save();
        a.translate(x, y);
        a.rotate(g);
        a.fillStyle = 'rgba(60,6,6,0.6)';
        ell(a, 0, 0, 5, 3.4, 0);
        a.fill();
        a.fillStyle = 'rgba(150,30,24,0.6)';
        ell(a, 0, 0, 3.4, 2, 0);
        a.fill();
        a.fillStyle = '#2a0404';
        for (let k = -3; k <= 3; k++) {
          circ(a, k * 1.2, -3 + Math.abs(k) * 0.25, 0.55);
          a.fill();
          circ(a, k * 1.2, 3 - Math.abs(k) * 0.25, 0.55);
          a.fill();
        }
        a.restore();
      }
      a.fillStyle = '#2a0404';
      circ(a, 12, 12, 1.8);
      a.fill();
      a.fillStyle = 'rgba(120,20,16,0.5)';
      ell(a, 12, 12, 3.6, 3, 0);
      a.fill();
      for (const [x0, y0, x1, y1] of [
        [4, -30, 14, -6],
        [-8, 12, 6, 30],
      ]) {
        a.strokeStyle = 'rgba(60,30,30,0.45)';
        a.lineWidth = 2;
        a.beginPath();
        a.moveTo(x0, y0);
        a.quadraticCurveTo((x0 + x1) / 2 + 3, (y0 + y1) / 2, x1, y1);
        a.stroke();
        a.strokeStyle = 'rgba(210,160,150,0.35)';
        a.lineWidth = 0.8;
        a.stroke();
      }
      {
        // the shirt: a flannel work shirt split across the back as the body swelled, skin showing through the tears and around the neck
        const jag = (c, pts, w) => {
          c.moveTo(pts[0][0], pts[0][1] - w);
          for (const [x, y] of pts) c.lineTo(x + rand(-1.2, 1.2), y - w * rand(0.6, 1.3));
          for (let i = pts.length - 1; i >= 0; i--)
            c.lineTo(pts[i][0] + rand(-1.2, 1.2), pts[i][1] + w * rand(0.6, 1.3));
          c.closePath();
        };
        const shirt = c => {
          c.beginPath();
          c.rect(-D - 6, -W - 6, D * 1.45 + 6, W * 2 + 12);
          jag(
            c,
            [
              [-D * 0.05, -W * 0.55],
              [-D * 0.35, -W * 0.3],
              [-D * 0.6, -W * 0.05],
              [-D * 0.8, W * 0.2],
              [-D - 2, W * 0.32],
            ],
            3.2
          );
          c.moveTo(-8 + 6, 20);
          c.ellipse(-8, 20, 6, 4.4, 0.4, 0, TAU);
          c.moveTo(D * 0.45 + 9, 0);
          c.ellipse(D * 0.45, 0, 9, 11, 0, 0, TAU);
        };
        a.save();
        shirt(a);
        a.clip('evenodd');
        a.fillStyle = '#3b3229';
        a.fillRect(-D - 6, -W - 6, D * 3, W * 2 + 12);
        for (let y = -W - 6; y < W + 6; y += 7) {
          a.fillStyle = 'rgba(120,36,28,0.38)';
          a.fillRect(-D - 6, y, D * 3, 3.2);
        }
        for (let x = -D - 6; x < D * 2; x += 7) {
          a.fillStyle = 'rgba(120,36,28,0.3)';
          a.fillRect(x, -W - 6, 3.2, W * 2 + 12);
        }
        weave(a, W, D, 500, 0.16, 0.05);
        folds(a, W, D, 1.6);
        grime(a, W, D, 14);
        a.fillStyle = 'rgba(60,8,6,0.5)';
        ell(a, -D * 0.5, -W * 0.45, 7, 10, 0.4);
        a.fill();
        a.restore();
        shirt(a);
        a.strokeStyle = 'rgba(14,10,8,0.55)';
        a.lineWidth = 0.8;
        a.stroke();
        a.strokeStyle = 'rgba(200,180,150,0.3)';
        a.lineWidth = 0.35;
        for (let i = 0; i < 26; i++) {
          const t = rand(0, 1),
            x = lerp(-D * 0.05, -D - 2, t),
            y = lerp(-W * 0.55, W * 0.32, t) + (Math.random() < 0.5 ? -3.6 : 3.6);
          a.beginPath();
          a.moveTo(x, y);
          a.lineTo(x + rand(-1.5, 1.5), y + rand(-1.6, 1.6));
          a.stroke();
        }
      }
      blood(a, W, D, 7);
      a.restore();
      volume(a, p, W, D);
      outline(a, p);
    },
    0.2,
    0.6,
    1.4
  );
  /* ---- the district bosses: three dead giants, each dressed for where it died ---- */
  const GPATH = (c, W, D, o = {}) => {
    // a giant's back from above: neck, sloping traps, broad shoulders, a back that narrows to the hips. hunch drops one shoulder, lop swells one side, tail lets a coat trail behind
    const h = o.hunch || 0,
      t = o.tail || 0,
      l = o.lop || 0;
    spline(c, [
      [D * 0.6, 0],
      [D * 0.66, W * 0.2],
      [D * 0.5, W * 0.48],
      [D * 0.28, W * (0.86 + l)],
      [D * 0.0, W * (1.0 + l)],
      [-D * 0.34, W * (0.9 + l * 0.6)],
      [-D * 0.64, W * 0.72],
      [-D * (0.9 + t), W * 0.5],
      [-D * (1.0 + t), 0],
      [-D * (0.9 + t), -W * 0.5],
      [-D * 0.64, -W * 0.72],
      [-D * 0.34, -W * (0.9 - h)],
      [D * 0.0, -W * (1.0 - h)],
      [D * 0.28, -W * (0.86 - h)],
      [D * 0.5, -W * 0.48],
      [D * 0.66, -W * 0.2],
    ]);
  };
  const traps = (a, W, D, k = 1) => {
    for (const s of [-1, 1]) {
      a.fillStyle = rgrad(a, D * 0.2, s * W * 0.42, W * 0.36, [
        [0, `rgba(255,236,210,${0.14 * k})`],
        [1, 'rgba(0,0,0,0)'],
      ]);
      a.fillRect(-D * 1.2, -W * 1.2, D * 2.4, W * 2.4);
      a.strokeStyle = `rgba(30,20,16,${0.3 * k})`;
      a.lineWidth = 1.6;
      a.beginPath();
      a.moveTo(D * 0.5, s * W * 0.18);
      a.quadraticCurveTo(D * 0.1, s * W * 0.5, -D * 0.2, s * W * 0.82);
      a.stroke();
    }
    a.strokeStyle = `rgba(30,20,16,${0.35 * k})`;
    a.lineWidth = 2;
    a.beginPath();
    a.moveTo(D * 0.4, 0);
    a.quadraticCurveTo(-D * 0.3, 0.8, -D * 0.95, 0);
    a.stroke();
  }; // trapezius masses and the spine groove
  region(
    'rk_torso',
    96,
    150,
    a => {
      // Roadkill (Route 9): a hulking road-crew giant, hunched with the left shoulder dropped — torn hi-vis vest, tyre-tread bruises across the back, tar, and the left side skinned raw by asphalt
      const W = 66,
        D = 38,
        p = c => GPATH(c, W, D, { hunch: 0.07 });
      p(a);
      a.fillStyle = '#6e6052';
      a.fill();
      a.save();
      p(a);
      a.clip();
      for (let i = 0; i < 44; i++) {
        a.fillStyle = pick([
          'rgba(96,70,110,0.18)',
          'rgba(70,84,58,0.16)',
          'rgba(150,130,104,0.14)',
          'rgba(52,40,40,0.18)',
        ]);
        ell(a, rand(-D, D), rand(-W, W), rand(4, 13), rand(3, 8), rand(0, 3));
        a.fill();
      }
      traps(a, W, D, 1.1);
      const vest = c => {
        c.beginPath();
        c.moveTo(-D - 4, -W * 0.56);
        c.lineTo(D * 0.15, -W * 0.6);
        c.lineTo(D * 0.5, -W * 0.3);
        c.lineTo(D * 0.36, -W * 0.1);
        c.lineTo(D * 0.36, W * 0.1);
        c.lineTo(D * 0.5, W * 0.3);
        c.lineTo(D * 0.15, W * 0.6);
        c.lineTo(-D - 4, W * 0.56);
        c.closePath();
      };
      vest(a);
      a.fillStyle = '#b8682a';
      a.fill();
      a.save();
      vest(a);
      a.clip();
      weave(a, W, D, 1100, 0.13, 0.05);
      grime(a, W, D, 60);
      for (const x of [-D * 0.62, -D * 0.1]) {
        a.fillStyle = '#9fa29e';
        a.fillRect(x - 3.2, -W * 0.6, 6.4, W * 1.2);
        a.fillStyle = 'rgba(255,255,255,0.22)';
        a.fillRect(x - 3.2, -W * 0.6, 1.4, W * 1.2);
        for (let i = 0; i < 40; i++) {
          a.fillStyle = 'rgba(40,34,28,0.4)';
          a.fillRect(x - 3.2 + rand(0, 6.4), rand(-W * 0.6, W * 0.6), rand(0.5, 2), rand(0.5, 3));
        }
      }
      for (let k = 0; k < 2; k++) {
        const y0 = rand(-W * 0.4, W * 0.1);
        a.save();
        a.translate(-D * 0.35, y0);
        a.rotate(0.35 + k * 0.2);
        for (let i = -6; i <= 6; i++) {
          a.fillStyle = 'rgba(16,14,14,0.55)';
          a.fillRect(i * 4.4, -9, 2.6, 18);
          a.fillRect(i * 4.4 - 1, -2, 4.6, 4);
        }
        a.restore();
      } // tyre tread printed across the back
      for (let i = 0; i < 5; i++) {
        a.fillStyle = 'rgba(14,12,10,0.6)';
        ell(a, rand(-D, D * 0.2), rand(-W * 0.5, W * 0.5), rand(4, 9), rand(2, 5), rand(0, 3));
        a.fill();
        a.fillStyle = 'rgba(255,255,255,0.12)';
        ell(a, rand(-D, D * 0.2), rand(-W * 0.5, W * 0.5), rand(1, 2), rand(0.5, 1), 0);
        a.fill();
      } // tar, still wet
      a.fillStyle = 'rgba(70,8,6,0.5)';
      ell(a, -D * 0.3, W * 0.25, 9, 14, 0.4);
      a.fill();
      a.restore();
      vest(a);
      a.strokeStyle = 'rgba(40,24,10,0.6)';
      a.lineWidth = 1.1;
      a.stroke();
      {
        a.save();
        a.translate(-D * 0.5, W * 0.56);
        a.fillStyle = '#b8682a';
        for (let i = 0; i < 7; i++) {
          a.beginPath();
          a.moveTo(rand(-7, 7), 0);
          a.lineTo(rand(-9, 9), rand(4, 11));
          a.lineTo(rand(-7, 7), 2);
          a.fill();
        }
        a.restore();
      }
      a.save();
      a.beginPath();
      a.ellipse(-4, -W * 0.82, D * 0.95, W * 0.26, 0.1, 0, TAU);
      a.clip();
      a.fillStyle = '#7e3228';
      a.fillRect(-D - 4, -W - 4, D * 2 + 8, W * 0.56);
      for (let i = 0; i < 30; i++) {
        const y = rand(-W, -W * 0.56);
        a.strokeStyle = pick(['rgba(190,90,80,0.6)', 'rgba(60,10,8,0.5)', 'rgba(230,170,150,0.35)']);
        a.lineWidth = rand(0.6, 1.8);
        a.beginPath();
        a.moveTo(-D, y);
        a.lineTo(D, y + rand(-3, 3));
        a.stroke();
      }
      for (let i = 0; i < 140; i++) {
        a.fillStyle = pick(['#1a1a1c', '#38383a', '#5a5450']);
        a.fillRect(rand(-D, D), rand(-W, -W * 0.56), rand(0.4, 1.4), rand(0.4, 1.4));
      }
      a.restore();
      blood(a, W, D, 6);
      a.restore();
      volume(a, p, W, D, 0.1);
      outline(a, p);
    },
    0.22,
    0.6,
    1.5
  );
  region(
    'rk_head',
    46,
    46,
    a => {
      // bald, the scalp scraped down to the bone on one side, a torn ear, tar in the stubble, a bull neck
      a.fillStyle = '#6a5c4e';
      ell(a, -8, 0, 13, 15);
      a.fill();
      a.strokeStyle = EDGE;
      a.lineWidth = 0.7;
      a.stroke();
      a.strokeStyle = 'rgba(30,20,16,0.4)';
      a.lineWidth = 1.2;
      for (const y of [-6, 0, 6]) {
        a.beginPath();
        a.moveTo(-18, y);
        a.quadraticCurveTo(-14, y * 1.1, -11, y);
        a.stroke();
      } // neck folds
      for (const sd of [-1, 1]) {
        a.fillStyle = '#7e6a5a';
        ell(a, 0, sd * 11.6, 3, 2.2);
        a.fill();
        a.strokeStyle = 'rgba(0,0,0,0.4)';
        a.lineWidth = 0.5;
        a.stroke();
      }
      a.fillStyle = '#5a1a14';
      ell(a, 0.6, -12.2, 1.6, 1.2);
      a.fill(); // the torn ear
      a.fillStyle = grad(a, -11, -10, 11, 11, [
        [0, '#8e7c6a'],
        [1, '#6a5848'],
      ]);
      ell(a, 0, 0, 12, 11);
      a.fill();
      a.stroke();
      a.save();
      ell(a, 0, 0, 12, 11);
      a.clip();
      for (let i = 0; i < 260; i++) {
        a.fillStyle = 'rgba(28,22,18,0.35)';
        a.fillRect(rand(-12, 8), rand(-11, 11), 0.4, 0.4);
      }
      a.fillStyle = '#8a3a30';
      a.beginPath();
      a.ellipse(-2, -5, 8, 5, -0.4, 0, TAU);
      a.fill();
      for (let i = 0; i < 10; i++) {
        a.strokeStyle = 'rgba(220,170,150,0.4)';
        a.lineWidth = 0.6;
        const x = rand(-8, 4);
        a.beginPath();
        a.moveTo(x, -8);
        a.lineTo(x + 3, -2);
        a.stroke();
      }
      a.fillStyle = '#d8d0c0';
      ell(a, -3, -6, 2.4, 1.4, -0.4);
      a.fill(); // scraped to the bone
      a.fillStyle = 'rgba(14,12,10,0.6)';
      ell(a, 4, 5, 3, 2, 0.5);
      a.fill();
      a.restore();
      nose(a, 11.6, '#7e6a58');
      a.fillStyle = 'rgba(14,12,12,0.6)';
      ell(a, 10, 0, 1.2, 4.4);
      a.fill(); // brow ridge shadow
    },
    0.3,
    0.75,
    1.3
  );
  region(
    'gk_torso',
    108,
    124,
    a => {
      // the Gravekeeper (Hollow Hill): tall and gaunt in a long oilskin coat whose tails trail behind, a shoulder cape, collar up, mud to the hips
      const W = 50,
        D = 30,
        coat = c => GPATH(c, W, D, { tail: 0.62 });
      coat(a);
      a.fillStyle = '#4a4434';
      a.fill();
      a.save();
      coat(a);
      a.clip();
      weave(a, W, D * 1.7, 1100, 0.14, 0.04);
      for (let i = 0; i < 11; i++) {
        const y = rand(-W, W);
        a.strokeStyle = 'rgba(230,220,180,0.16)';
        a.lineWidth = rand(2, 5);
        a.beginPath();
        a.moveTo(rand(-D * 1.5, D * 0.4), y);
        a.lineTo(rand(-D * 1.5, D * 0.4), y + rand(-12, 12));
        a.stroke();
      } // oilskin sheen
      a.strokeStyle = 'rgba(0,0,0,0.45)';
      a.lineWidth = 1.4;
      a.beginPath();
      a.moveTo(-D * 0.9, 0);
      a.lineTo(-D * 1.6, 0);
      a.stroke(); // the vent split in the coat tails
      for (const sd of [-1, 1]) {
        a.strokeStyle = 'rgba(0,0,0,0.3)';
        a.lineWidth = 1;
        a.beginPath();
        a.moveTo(-D * 0.6, sd * W * 0.3);
        a.quadraticCurveTo(-D * 1.2, sd * W * 0.36, -D * 1.55, sd * W * 0.24);
        a.stroke();
      }
      const cape = c => {
        c.beginPath();
        c.moveTo(D * 0.6, -W * 0.86);
        c.quadraticCurveTo(-D * 0.25, -W * 1.0, -D * 0.68, -W * 0.52);
        c.quadraticCurveTo(-D * 0.82, 0, -D * 0.68, W * 0.52);
        c.quadraticCurveTo(-D * 0.25, W * 1.0, D * 0.6, W * 0.86);
        c.quadraticCurveTo(D * 0.82, 0, D * 0.6, -W * 0.86);
        c.closePath();
      };
      cape(a);
      a.fillStyle = '#5c5442';
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.55)';
      a.lineWidth = 1.3;
      a.stroke();
      a.save();
      cape(a);
      a.clip();
      folds(a, W, D, 1.4);
      weave(a, W, D, 600, 0.12, 0.05);
      a.restore();
      for (let i = 0; i < 60; i++) {
        a.fillStyle = `rgba(${randi(60, 90)},${randi(48, 66)},${randi(30, 44)},${rand(0.25, 0.6)})`;
        ell(a, rand(-D * 1.6, -D * 0.4), rand(-W, W), rand(1.5, 5), rand(1, 3.5), rand(0, 3));
        a.fill();
      } // grave mud on the tails
      a.strokeStyle = 'rgba(235,225,190,0.28)';
      a.lineWidth = 2;
      a.beginPath();
      a.moveTo(D * 0.5, -W * 0.8);
      a.quadraticCurveTo(-D * 0.2, -W * 0.94, -D * 0.6, -W * 0.5);
      a.stroke();
      a.beginPath();
      a.moveTo(D * 0.5, W * 0.8);
      a.quadraticCurveTo(-D * 0.2, W * 0.94, -D * 0.6, W * 0.5);
      a.stroke();
      /* rain-worn highlight on the cape shoulders */ a.strokeStyle = '#7a6440';
      a.lineWidth = 3;
      a.beginPath();
      a.moveTo(D * 0.55, -W * 0.7);
      a.quadraticCurveTo(0, -W * 0.1, -D * 0.6, W * 0.62);
      a.stroke();
      a.strokeStyle = 'rgba(30,20,10,0.5)';
      a.lineWidth = 0.6;
      for (let t = 0; t < 1; t += 0.08) {
        const x = lerp(D * 0.55, -D * 0.6, t),
          y = lerp(-W * 0.7, W * 0.62, t) + Math.sin(t * Math.PI) * W * 0.3;
        a.beginPath();
        a.moveTo(x - 1.5, y - 1.5);
        a.lineTo(x + 1.5, y + 1.5);
        a.stroke();
      }
      /* a coil of grave rope slung across the back */ a.fillStyle = '#2e2a22';
      a.beginPath();
      a.ellipse(D * 0.44, 0, 9, 15, 0, 0, TAU);
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.6)';
      a.lineWidth = 1;
      a.stroke();
      a.restore();
      volume(a, coat, W, D * 1.3, 0);
      coat(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.9;
      a.stroke();
    },
    0.35,
    0.6,
    1.3
  );
  region(
    'gk_head',
    50,
    50,
    a => {
      // a battered wide-brimmed hat from above, lank grey hair escaping at the back, a grey beard jutting past the brim
      a.strokeStyle = 'rgba(176,170,156,0.85)';
      a.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const y = rand(-6, 6);
        a.beginPath();
        a.moveTo(17, y * 0.8);
        a.quadraticCurveTo(21, y + rand(-2, 2), 24, y * 0.7 + rand(-2, 2));
        a.stroke();
      }
      a.strokeStyle = 'rgba(150,146,136,0.7)';
      a.lineWidth = 0.8;
      for (let i = 0; i < 16; i++) {
        const y = rand(-9, 9);
        a.beginPath();
        a.moveTo(-14, y);
        a.quadraticCurveTo(-19, y + rand(-3, 3), -23, y + rand(-5, 5));
        a.stroke();
      }
      const brim = c => {
        c.beginPath();
        for (let i = 0; i <= 28; i++) {
          const g = (i / 28) * TAU,
            r = 21 + Math.sin(g * 3 + 1) * 1.2 + (Math.cos(g) > 0.6 ? -1.5 : 0);
          i ? c.lineTo(Math.cos(g) * r, Math.sin(g) * r * 0.95) : c.moveTo(r, 0);
        }
        c.closePath();
      };
      brim(a);
      a.fillStyle = '#4e4234';
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.6)';
      a.lineWidth = 1;
      a.stroke();
      a.save();
      brim(a);
      a.clip();
      a.strokeStyle = 'rgba(220,200,160,0.22)';
      a.lineWidth = 3;
      a.beginPath();
      a.arc(0, 0, 20, Math.PI * 1.05, Math.PI * 1.7);
      a.stroke();
      a.restore();
      a.save();
      brim(a);
      a.clip();
      weave(a, 22, 22, 300, 0.15, 0.05);
      a.fillStyle = 'rgba(120,110,90,0.12)';
      ell(a, -6, -8, 10, 5, 0.6);
      a.fill();
      a.restore();
      a.fillStyle = grad(a, -8, -8, 8, 8, [
        [0, '#5e5040'],
        [1, '#33291f'],
      ]);
      ell(a, 0, 0, 10.5, 9.5);
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.6)';
      a.lineWidth = 0.8;
      a.stroke();
      a.strokeStyle = 'rgba(0,0,0,0.55)';
      a.lineWidth = 1.2;
      a.beginPath();
      a.moveTo(-7, 0);
      a.lineTo(7, 0);
      a.stroke();
      a.strokeStyle = 'rgba(160,150,130,0.18)';
      a.lineWidth = 0.8;
      a.beginPath();
      a.moveTo(-7, -1.2);
      a.lineTo(7, -1.2);
      a.stroke(); // the crown's dent
      a.strokeStyle = '#4a3a2a';
      a.lineWidth = 1.8;
      a.beginPath();
      a.ellipse(0, 0, 11, 10, 0, 0, TAU);
      a.stroke(); // band
    },
    0.12,
    0.7,
    1.1
  );
  region(
    'gk_shovel',
    104,
    22,
    a => {
      // a long-handled grave spade: worn ash shaft, a D-grip, a steel blade crusted with earth
      a.fillStyle = '#2e2622';
      rr(a, -50, -5, 9, 10, 3);
      a.fill();
      a.fillStyle = '#1a1512';
      rr(a, -48, -2.6, 5, 5.2, 2);
      a.fill(); // D-grip
      a.fillStyle = grad(a, 0, -2.5, 0, 2.5, [
        [0, '#a4835c'],
        [0.5, '#7a5c3a'],
        [1, '#4c3824'],
      ]);
      a.fillRect(-42, -2.4, 72, 4.8);
      a.strokeStyle = 'rgba(30,20,10,0.6)';
      a.lineWidth = 0.6;
      a.strokeRect(-42, -2.4, 72, 4.8);
      for (let i = 0; i < 10; i++) {
        a.strokeStyle = 'rgba(40,26,14,0.35)';
        a.lineWidth = 0.4;
        const x = rand(-40, 26);
        a.beginPath();
        a.moveTo(x, rand(-2, 2));
        a.lineTo(x + rand(6, 14), rand(-2, 2));
        a.stroke();
      }
      a.fillStyle = '#4a4a48';
      a.fillRect(26, -3.6, 8, 7.2); // the socket
      a.beginPath();
      a.moveTo(32, -9);
      a.lineTo(48, -8);
      a.quadraticCurveTo(52, 0, 48, 8);
      a.lineTo(32, 9);
      a.closePath();
      a.fillStyle = grad(a, 32, -9, 48, 9, [
        [0, '#8c8e8c'],
        [0.5, '#6a6c6a'],
        [1, '#4a4c4a'],
      ]);
      a.fill();
      a.strokeStyle = 'rgba(14,14,12,0.7)';
      a.lineWidth = 0.8;
      a.stroke();
      for (let i = 0; i < 26; i++) {
        a.fillStyle = `rgba(${randi(70, 100)},${randi(54, 72)},${randi(34, 46)},${rand(0.4, 0.8)})`;
        ell(a, rand(36, 50), rand(-7, 7), rand(0.8, 2.4), rand(0.6, 1.8), rand(0, 3));
        a.fill();
      }
    },
    0.45,
    0.8,
    1
  );
  region(
    'pz_torso',
    96,
    146,
    a => {
      // Patient Zero: lopsided, one side of the back swollen with growths; the hospital gown open down the back over grey skin and spine; bile down the front
      const W = 60,
        D = 36,
        p = c => GPATH(c, W, D, { lop: 0.12 });
      p(a);
      a.fillStyle = '#a49c8c';
      a.fill();
      a.save();
      p(a);
      a.clip();
      traps(a, W, D, 0.6);
      const gown = sd => {
        a.beginPath();
        a.moveTo(D + 4, sd * 2);
        a.lineTo(D + 4, sd * W * 1.2);
        a.lineTo(-D - 4, sd * W * 1.2);
        a.lineTo(-D - 4, sd * 10);
        a.quadraticCurveTo(-D * 0.3, sd * 7, D * 0.1, sd * 4);
        a.closePath();
      };
      for (const sd of [-1, 1]) {
        gown(sd);
        a.fillStyle = '#86a0a2';
        a.fill();
      }
      a.save();
      for (const sd of [-1, 1]) gown(sd);
      a.clip();
      for (let x = -D; x < D; x += 6)
        for (let y = -W * 1.2; y < W * 1.2; y += 6) {
          a.fillStyle = 'rgba(40,70,110,0.32)';
          a.save();
          a.translate(x + ((y / 6) & 1) * 3, y);
          a.rotate(Math.PI / 4);
          a.fillRect(-0.9, -0.9, 1.8, 1.8);
          a.restore();
        }
      weave(a, W, D, 800, 0.1, 0.06);
      folds(a, W, D, 1.5);
      a.fillStyle = 'rgba(120,140,40,0.45)';
      ell(a, D * 0.55, 6, 12, 18, 0.2);
      a.fill();
      a.fillStyle = 'rgba(80,100,20,0.35)';
      ell(a, D * 0.35, -10, 6, 10, 0);
      a.fill();
      a.fillStyle = 'rgba(70,8,6,0.45)';
      ell(a, -D * 0.4, W * 0.5, 8, 12, 0.3);
      a.fill();
      a.restore();
      a.strokeStyle = 'rgba(30,40,46,0.6)';
      a.lineWidth = 0.9;
      for (const sd of [-1, 1]) {
        a.beginPath();
        a.moveTo(-D - 2, sd * 10);
        a.quadraticCurveTo(-D * 0.3, sd * 7, D * 0.1, sd * 4);
        a.stroke();
      }
      for (const x of [-D * 0.75, -D * 0.25]) {
        a.strokeStyle = '#e8eef0';
        a.lineWidth = 1.4;
        a.beginPath();
        a.moveTo(x, -9);
        a.quadraticCurveTo(x + 2, 0, x, 9);
        a.stroke();
        a.fillStyle = '#e8eef0';
        ell(a, x, 0, 1.8, 2.6);
        a.fill();
      }
      a.strokeStyle = 'rgba(60,40,40,0.5)';
      a.lineWidth = 1.6;
      for (let x = -D * 0.95; x < D * 0.1; x += 5) {
        a.beginPath();
        a.moveTo(x, -1.6);
        a.lineTo(x + 2, 0);
        a.lineTo(x, 1.6);
        a.stroke();
      }
      const lump = (x, y, r) => {
        a.fillStyle = rgrad(
          a,
          x,
          y,
          r,
          [
            [0, '#94786a'],
            [0.6, '#6c5046'],
            [1, '#43302a'],
          ],
          x - r * 0.35,
          y - r * 0.4
        );
        ell(a, x, y, r, r * rand(0.8, 1), rand(0, 3));
        a.fill();
        a.strokeStyle = 'rgba(30,14,22,0.55)';
        a.lineWidth = 0.7;
        a.stroke();
        a.fillStyle = 'rgba(255,240,240,0.35)';
        ell(a, x - r * 0.35, y - r * 0.38, r * 0.28, r * 0.16, -0.5);
        a.fill();
      }; // a wet, veined growth
      for (const [cx, cy, n, R0] of [
        [-D * 0.3, W * 0.8, 7, 15],
        [D * 0.15, W * 0.95, 4, 9],
        [-D * 0.7, -W * 0.7, 3, 8],
      ]) {
        for (let i = 0; i < n; i++)
          lump(cx + rand(-R0, R0) * 0.9, cy + rand(-R0, R0) * 0.7, rand(R0 * 0.35, R0 * 0.75));
        a.strokeStyle = 'rgba(90,30,60,0.35)';
        a.lineWidth = 0.8;
        for (let k = 0; k < 8; k++) {
          a.beginPath();
          a.moveTo(cx, cy);
          a.quadraticCurveTo(
            cx + rand(-R0, R0) * 1.5,
            cy + rand(-R0, R0),
            cx + rand(-R0, R0) * 2.2,
            cy + rand(-R0, R0) * 1.6
          );
          a.stroke();
        }
      } // clusters on the swollen side
      a.restore();
      volume(a, p, W, D, 0.1);
      outline(a, p);
    },
    0.28,
    0.6,
    1.3
  );
  region(
    'pz_head',
    46,
    46,
    a => {
      // shaved and swollen, one side of the skull pushed out by a growth, electrode pads still stuck on with their leads
      a.fillStyle = '#9c9284';
      ell(a, -5, 0, 11, 12);
      a.fill();
      a.strokeStyle = EDGE;
      a.lineWidth = 0.6;
      a.stroke();
      for (const sd of [-1, 1]) {
        a.fillStyle = '#a19584';
        ell(a, 1, sd * 12.4, 2.6, 1.8);
        a.fill();
      }
      a.fillStyle = grad(a, -12, -10, 12, 12, [
        [0, '#c0b6a4'],
        [1, '#8e8474'],
      ]);
      ell(a, 0, 0, 13, 12);
      a.fill();
      a.stroke();
      a.fillStyle = rgrad(a, -2, 9, 9, [
        [0, '#8e7a82'],
        [1, '#5c4a54'],
      ]);
      ell(a, -2, 8.5, 8, 7, 0.3);
      a.fill();
      a.strokeStyle = 'rgba(40,20,30,0.5)';
      a.lineWidth = 0.6;
      a.stroke(); // the growth
      a.save();
      ell(a, 0, 0, 13, 12);
      a.clip();
      for (let i = 0; i < 200; i++) {
        a.fillStyle = 'rgba(40,34,30,0.3)';
        a.fillRect(rand(-13, 6), rand(-12, 12), 0.35, 0.35);
      }
      a.strokeStyle = 'rgba(90,40,90,0.35)';
      a.lineWidth = 0.6;
      for (let i = 0; i < 8; i++) {
        let x = rand(-10, 8),
          y = rand(-10, 10);
        a.beginPath();
        a.moveTo(x, y);
        for (let k = 0; k < 3; k++) {
          x += rand(-3, 3);
          y += rand(-3, 3);
          a.lineTo(x, y);
        }
        a.stroke();
      }
      a.restore();
      for (const [x, y] of [
        [4, -6],
        [-4, -8],
        [6, 4],
      ]) {
        a.fillStyle = '#e8e6de';
        circ(a, x, y, 2.4);
        a.fill();
        a.strokeStyle = 'rgba(0,0,0,0.35)';
        a.lineWidth = 0.4;
        a.stroke();
        a.fillStyle = '#9a9a98';
        circ(a, x, y, 0.8);
        a.fill();
        a.strokeStyle = pick(['#c84040', '#e0e0e0', '#3a6ab0']);
        a.lineWidth = 0.6;
        a.beginPath();
        a.moveTo(x, y);
        a.quadraticCurveTo(x - 8, y + rand(-4, 4), -16, y * 0.6);
        a.stroke();
      } // electrode pads, leads trailing off the back
    },
    0.3,
    0.75,
    1.3
  );
  region(
    'cf_torso',
    104,
    140,
    a => {
      // the Fire Chief (night 10): a giant in a scorched tan turnout coat, triple reflective trim across the back, air-pack harness over both shoulders, soot everywhere
      const W = 60,
        D = 34,
        p = c => GPATH(c, W, D, { tail: 0.28 });
      p(a);
      a.fillStyle = '#8a7a54';
      a.fill();
      a.save();
      p(a);
      a.clip();
      weave(a, W, D * 1.4, 1200, 0.12, 0.06);
      folds(a, W, D, 1.3);
      traps(a, W, D, 0.8);
      for (const x of [-D * 0.62, -D * 1.12]) {
        a.fillStyle = '#c8d23a';
        a.fillRect(x - 5, -W * 1.1, 10, W * 2.2);
        a.fillStyle = '#c4c8c8';
        a.fillRect(x - 1.8, -W * 1.1, 3.6, W * 2.2);
        a.fillStyle = 'rgba(255,255,255,0.3)';
        a.fillRect(x - 1.8, -W * 1.1, 1, W * 2.2);
        for (let i = 0; i < 50; i++) {
          a.fillStyle = 'rgba(30,24,16,0.45)';
          a.fillRect(x - 5 + rand(0, 10), rand(-W, W), rand(0.6, 2.4), rand(0.6, 3));
        }
      } // lime and silver trim, scuffed
      for (let i = 0; i < 26; i++) {
        a.fillStyle = `rgba(${randi(18, 34)},${randi(16, 28)},${randi(12, 22)},${rand(0.2, 0.5)})`;
        ell(a, rand(-D * 1.3, D * 0.6), rand(-W, W), rand(4, 14), rand(3, 9), rand(0, 3));
        a.fill();
      } // soot and scorch
      for (let i = 0; i < 4; i++) {
        const x = rand(-D * 1.1, D * 0.2),
          y = rand(-W * 0.8, W * 0.8);
        a.fillStyle = 'rgba(14,10,8,0.55)';
        ell(a, x, y, rand(3, 6), rand(2, 4), rand(0, 3));
        a.fill();
        a.strokeStyle = 'rgba(180,90,30,0.35)';
        a.lineWidth = 0.8;
        a.stroke();
      } // burn holes, edges still orange
      for (const sd of [-1, 1]) {
        a.strokeStyle = '#26221c';
        a.lineWidth = 6;
        a.beginPath();
        a.moveTo(D * 0.42, sd * W * 0.42);
        a.quadraticCurveTo(D * 0.1, sd * W * 0.36, -D * 0.5, sd * W * 0.2);
        a.stroke();
        a.strokeStyle = 'rgba(255,255,255,0.12)';
        a.lineWidth = 1;
        a.stroke();
        a.fillStyle = '#6a6a66';
        rr(a, -D * 0.2 - 3, sd * W * 0.27 - 4, 6, 8, 1.5);
        a.fill();
      } // harness straps and buckles
      a.strokeStyle = '#26221c';
      a.lineWidth = 5;
      a.beginPath();
      a.moveTo(-D * 0.85, -W * 0.5);
      a.lineTo(-D * 0.85, W * 0.5);
      a.stroke(); // waist belt
      grime(a, W, D, 40);
      blood(a, W, D, 3);
      a.restore();
      a.fillStyle = '#4a3e2a';
      a.beginPath();
      a.ellipse(D * 0.5, 0, 9, 17, 0, 0, TAU);
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.6)';
      a.lineWidth = 1;
      a.stroke(); // turned-up collar
      volume(a, p, W, D * 1.2, 0.05);
      outline(a, p);
    },
    0.3,
    0.6,
    1.4
  );
  region(
    'cf_tank',
    74,
    32,
    a => {
      // the air cylinder on its back: scuffed composite wrap, a brass valve at the bottom and a pressure gauge
      a.fillStyle = grad(a, 0, -12, 0, 12, [
        [0, '#4e4e4a'],
        [0.35, '#d8d4c4'],
        [0.55, '#b8b4a2'],
        [1, '#3e3e3a'],
      ]);
      rr(a, -30, -12, 58, 24, 11);
      a.fill();
      a.strokeStyle = 'rgba(10,10,8,0.7)';
      a.lineWidth = 0.9;
      a.stroke();
      for (let i = 0; i < 26; i++) {
        a.strokeStyle = 'rgba(40,36,30,0.35)';
        a.lineWidth = rand(0.4, 1);
        const x = rand(-26, 24);
        a.beginPath();
        a.moveTo(x, rand(-10, 10));
        a.lineTo(x + rand(-5, 5), rand(-10, 10));
        a.stroke();
      }
      for (const x of [-12, 12]) {
        a.fillStyle = '#1e1c18';
        a.fillRect(x - 2.5, -13, 5, 26);
      }
      a.fillStyle = '#b08a3a';
      rr(a, -36, -5, 8, 10, 2);
      a.fill();
      a.fillStyle = '#e8e4d8';
      circ(a, -33, 9, 4.2);
      a.fill();
      a.strokeStyle = '#222';
      a.lineWidth = 0.8;
      a.stroke();
      a.strokeStyle = '#c02a20';
      a.lineWidth = 1;
      a.beginPath();
      a.moveTo(-33, 9);
      a.lineTo(-31, 6.5);
      a.stroke(); // valve and gauge
      a.fillStyle = 'rgba(255,255,255,0.35)';
      rr(a, -24, -7, 44, 2.4, 1.2);
      a.fill();
    },
    0.7,
    0.7,
    1
  );
  region(
    'cf_head',
    52,
    52,
    a => {
      // a chief's white helmet from above: ribbed dome, the long duckbill tail at the back, the leather front shield, soot and a dent
      const brim = c => {
        c.beginPath();
        for (let i = 0; i <= 32; i++) {
          const g = (i / 32) * TAU,
            back = Math.max(0, -Math.cos(g)),
            r = 15 + back * back * 9 + Math.sin(g * 4) * 0.4;
          i ? c.lineTo(Math.cos(g) * r - back * 2, Math.sin(g) * r * 0.92) : c.moveTo(r, 0);
        }
        c.closePath();
      };
      brim(a);
      a.fillStyle = '#d8d2c2';
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.6)';
      a.lineWidth = 1;
      a.stroke();
      a.save();
      brim(a);
      a.clip();
      a.strokeStyle = '#c8d23a';
      a.lineWidth = 2;
      brim(a);
      a.stroke();
      for (let i = 0; i < 18; i++) {
        a.fillStyle = `rgba(26,20,14,${rand(0.15, 0.4)})`;
        ell(a, rand(-22, 14), rand(-15, 15), rand(2, 6), rand(1.5, 4), rand(0, 3));
        a.fill();
      }
      a.restore();
      a.fillStyle = grad(a, -9, -9, 9, 9, [
        [0, '#f2eee2'],
        [1, '#a8a294'],
      ]);
      ell(a, 0, 0, 11.5, 10.5);
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.5)';
      a.lineWidth = 0.7;
      a.stroke();
      for (const y of [-6, -2, 2, 6]) {
        a.strokeStyle = 'rgba(0,0,0,0.25)';
        a.lineWidth = 0.9;
        a.beginPath();
        a.moveTo(-10, y * 0.9);
        a.quadraticCurveTo(0, y * 1.1, 10, y * 0.9);
        a.stroke();
      } // the combs
      a.fillStyle = 'rgba(30,22,16,0.4)';
      ell(a, -4, 5, 3.5, 2.5, 0.3);
      a.fill();
      a.fillStyle = '#5a3a20';
      rr(a, 10, -6, 5, 12, 1.5);
      a.fill();
      a.fillStyle = '#d0a83a';
      circ(a, 12.5, 0, 2.6);
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.5)';
      a.lineWidth = 0.5;
      a.stroke(); // front shield, a brass badge
    },
    0.5,
    0.75,
    1.1
  );
  region(
    'cf_axe',
    114,
    28,
    a => {
      // a fire axe: yellow fibreglass handle, black grip, red head with a pick on the back
      a.fillStyle = grad(a, 0, -3, 0, 3, [
        [0, '#e4c050'],
        [0.5, '#c09a30'],
        [1, '#7a5e1a'],
      ]);
      a.fillRect(-52, -2.8, 88, 5.6);
      a.strokeStyle = 'rgba(30,20,8,0.6)';
      a.lineWidth = 0.6;
      a.strokeRect(-52, -2.8, 88, 5.6);
      a.fillStyle = '#1a1816';
      a.fillRect(-54, -3.4, 20, 6.8);
      for (let x = -52; x < -36; x += 3) {
        a.fillStyle = 'rgba(255,255,255,0.08)';
        a.fillRect(x, -3.4, 1, 6.8);
      }
      a.beginPath();
      a.moveTo(32, -4);
      a.lineTo(46, -5);
      a.quadraticCurveTo(54, -9, 50, -13);
      a.lineTo(56, -13);
      a.quadraticCurveTo(58, 0, 52, 4);
      a.lineTo(32, 4);
      a.closePath();
      a.fillStyle = '#a82a20';
      a.fill();
      a.strokeStyle = 'rgba(20,6,4,0.7)';
      a.lineWidth = 0.8;
      a.stroke(); // blade side
      a.fillStyle = '#c8ccd0';
      a.beginPath();
      a.moveTo(50, -13);
      a.lineTo(56, -13);
      a.quadraticCurveTo(57.5, -4, 55, -2);
      a.lineTo(53, -6);
      a.closePath();
      a.fill(); // the ground edge
      a.beginPath();
      a.moveTo(34, 4);
      a.lineTo(42, 4);
      a.lineTo(40, 13);
      a.closePath();
      a.fillStyle = '#8a221a';
      a.fill();
      a.stroke(); // the pick
      for (let i = 0; i < 14; i++) {
        a.fillStyle = `rgba(30,10,8,${rand(0.2, 0.5)})`;
        a.fillRect(rand(32, 54), rand(-11, 4), rand(0.6, 2), rand(0.6, 2));
      }
    },
    0.5,
    0.8,
    1
  );
  region(
    'cf_ext',
    30,
    14,
    a => {
      // a fire extinguisher, thrown
      a.fillStyle = grad(a, 0, -5, 0, 5, [
        [0, '#7a1410'],
        [0.4, '#d8382c'],
        [1, '#6a100c'],
      ]);
      rr(a, -11, -5, 20, 10, 4.5);
      a.fill();
      a.strokeStyle = 'rgba(20,4,2,0.7)';
      a.lineWidth = 0.7;
      a.stroke();
      a.fillStyle = '#2a2a28';
      a.fillRect(9, -2.5, 4, 5);
      a.fillStyle = '#e8e4d8';
      a.fillRect(-6, -4, 6, 8);
      a.fillStyle = '#1a1a18';
      a.fillRect(12, -1, 3, 2);
    },
    0.6,
    0.8,
    1
  );
  region(
    'rk_sign',
    136,
    52,
    a => {
      // a STOP sign ripped out of the ground: bent steel post, a lump of concrete still on the foot, the octagon dented and scraped
      a.fillStyle = '#7a7a76';
      rr(a, -66, -7, 16, 14, 4);
      a.fill();
      a.strokeStyle = 'rgba(20,20,18,0.6)';
      a.lineWidth = 0.8;
      a.stroke();
      for (let i = 0; i < 20; i++) {
        a.fillStyle = 'rgba(40,40,36,0.4)';
        a.fillRect(rand(-65, -51), rand(-6, 6), 1, 1);
      }
      a.strokeStyle = '#8c9094';
      a.lineWidth = 4;
      a.lineCap = 'round';
      a.beginPath();
      a.moveTo(-52, 0);
      a.quadraticCurveTo(-14, 6, 34, -1);
      a.stroke();
      a.strokeStyle = 'rgba(255,255,255,0.35)';
      a.lineWidth = 1;
      a.beginPath();
      a.moveTo(-52, -1.4);
      a.quadraticCurveTo(-14, 4.6, 34, -2.4);
      a.stroke();
      a.save();
      a.translate(46, 0);
      a.rotate(0.12);
      const oct = c => {
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const g = ((i + 0.5) / 8) * TAU,
            r = 21 + (i === 2 ? -3 : 0);
          i ? c.lineTo(Math.cos(g) * r, Math.sin(g) * r) : c.moveTo(Math.cos(g) * r, Math.sin(g) * r);
        }
        c.closePath();
      };
      oct(a);
      a.fillStyle = '#e8e4dc';
      a.fill();
      a.scale(0.86, 0.86);
      oct(a);
      a.fillStyle = '#a8241c';
      a.fill();
      a.setTransform(a.getTransform());
      a.restore();
      a.save();
      a.translate(46, 0);
      a.rotate(0.12 + Math.PI / 2);
      a.fillStyle = '#ece8e0';
      a.font = 'bold 11px Arial, sans-serif';
      a.textAlign = 'center';
      a.textBaseline = 'middle';
      a.fillText('STOP', 0, 0.5);
      a.restore();
      a.save();
      a.translate(46, 0);
      for (let i = 0; i < 24; i++) {
        a.strokeStyle = 'rgba(40,30,30,0.45)';
        a.lineWidth = rand(0.4, 1);
        const x = rand(-16, 16),
          y = rand(-16, 16);
        a.beginPath();
        a.moveTo(x, y);
        a.lineTo(x + rand(-6, 6), y + rand(-2, 2));
        a.stroke();
      }
      a.fillStyle = 'rgba(30,20,16,0.4)';
      ell(a, -6, 8, 8, 4, 0.3);
      a.fill();
      a.restore(); // scrapes and a dent
    },
    0.4,
    0.8,
    1
  );
  region(
    'gk_lantern',
    22,
    26,
    (a, e) => {
      // an old brass hurricane lantern hanging from the belt, the flame low behind sooty glass
      a.fillStyle = '#5a4428';
      rr(a, -7, -9, 14, 18, 3);
      a.fill();
      a.strokeStyle = 'rgba(20,14,8,0.8)';
      a.lineWidth = 0.9;
      a.stroke();
      a.fillStyle = 'rgba(255,190,90,0.85)';
      rr(a, -5, -6, 10, 12, 2.5);
      a.fill();
      a.fillStyle = 'rgba(60,40,20,0.35)';
      a.fillRect(-5, -6, 10, 3);
      e.fillStyle = 'rgba(255,170,70,1)';
      ell(e, 0, 1, 3.5, 4.5);
      e.fill();
      e.fillStyle = 'rgba(255,230,160,1)';
      ell(e, 0, 1.5, 1.6, 2.4);
      e.fill();
      a.strokeStyle = '#8a6a3a';
      a.lineWidth = 1.2;
      a.beginPath();
      a.moveTo(-5, -11);
      a.quadraticCurveTo(0, -15, 5, -11);
      a.stroke();
    },
    0.5,
    0.8,
    1
  );
  region(
    'pz_bag',
    18,
    26,
    a => {
      // an IV bag: clear plastic, a third full of something yellow, a printed label
      a.fillStyle = 'rgba(220,230,232,0.55)';
      rr(a, -7, -11, 14, 21, 3);
      a.fill();
      a.strokeStyle = 'rgba(30,40,40,0.6)';
      a.lineWidth = 0.7;
      a.stroke();
      a.fillStyle = 'rgba(200,190,90,0.7)';
      rr(a, -6.2, 2, 12.4, 7.5, 2.5);
      a.fill();
      a.fillStyle = '#f0f0ea';
      a.fillRect(-4, -7, 8, 6);
      a.fillStyle = 'rgba(30,30,30,0.6)';
      for (const y of [-6, -4.5, -3]) a.fillRect(-3, y, 6, 0.6);
      a.fillStyle = '#d0d4d4';
      a.fillRect(-1, 10, 2, 3);
    },
    0.6,
    0.8,
    1
  );
  region(
    'pz_pole',
    150,
    40,
    a => {
      // the IV stand lying where it fell: chrome pole, the wheeled base, the hook, the bag split open
      a.fillStyle = 'rgba(190,180,80,0.45)';
      a.beginPath();
      a.ellipse(52, 7, 16, 8, 0.2, 0, TAU);
      a.fill();
      const g = a.createLinearGradient(0, -2, 0, 2);
      g.addColorStop(0, '#e4e8ea');
      g.addColorStop(0.5, '#9aa2a6');
      g.addColorStop(1, '#5d6468');
      a.fillStyle = g;
      a.fillRect(-60, -1.6, 118, 3.2);
      a.strokeStyle = '#7c8488';
      a.lineWidth = 2.4;
      a.lineCap = 'round';
      for (const o of [-15, -7, 7, 15]) {
        a.beginPath();
        a.moveTo(-60, 0);
        a.lineTo(-68, o);
        a.stroke();
      }
      a.fillStyle = '#2a2c2e';
      for (const o of [-15, -7, 7, 15]) {
        a.beginPath();
        a.arc(-68, o, 2.6, 0, TAU);
        a.fill();
      }
      a.strokeStyle = '#b8bec2';
      a.lineWidth = 1.6;
      a.beginPath();
      a.moveTo(58, -7);
      a.lineTo(58, 7);
      a.stroke();
      for (const o of [-7, 7]) {
        a.beginPath();
        a.arc(61, o, 3, Math.PI, TAU * 0.9, o < 0);
        a.stroke();
      }
      a.save();
      a.translate(46, 9);
      a.rotate(0.5);
      a.fillStyle = 'rgba(220,230,232,0.6)';
      rr(a, -6, -9, 12, 18, 3);
      a.fill();
      a.strokeStyle = 'rgba(30,40,40,0.6)';
      a.lineWidth = 0.7;
      a.stroke();
      a.fillStyle = '#f0f0ea';
      a.fillRect(-3.5, -6, 7, 5);
      a.restore();
      a.strokeStyle = 'rgba(230,230,210,0.7)';
      a.lineWidth = 0.8;
      a.beginPath();
      a.moveTo(46, 0);
      a.bezierCurveTo(30, 14, 10, -12, -10, 10);
      a.stroke();
    },
    0.7,
    0.8,
    1
  );
  region(
    'z_bloat',
    64,
    64,
    (a, e) => {
      // bloater: swollen naked torso, belly pushed forward, skin stretched to splitting
      const W = 22,
        D = 16,
        p = c => SHP(c, W, D, 0.05),
        belly = c => ell(c, 8, 0, 17, 22);
      for (const path of [p, belly]) {
        path(a);
        a.strokeStyle = EDGE;
        a.lineWidth = 1.7;
        a.stroke();
      }
      for (const path of [p, belly]) {
        path(a);
        a.fillStyle = '#8c9070';
        a.fill();
      }
      for (const path of [p, belly]) {
        a.save();
        path(a);
        a.clip();
        grime(a, W, D + 6, 10);
        for (let i = 0; i < 4; i++) {
          a.fillStyle = `rgba(${randi(80, 110)},${randi(60, 80)},${randi(90, 110)},0.25)`;
          ell(a, rand(-D, D + 6), rand(-W, W), rand(3, 7), rand(2, 5), rand(0, 3));
          a.fill();
        }
        a.restore();
      }
      a.save();
      p(a);
      belly(a);
      a.restore();
      a.strokeStyle = 'rgba(100,60,100,0.4)';
      a.lineWidth = 0.7;
      for (let i = 0; i < 9; i++) {
        const g = rand(0, TAU),
          r0 = rand(4, 12);
        let x = 6 + Math.cos(g) * r0,
          y = Math.sin(g) * r0 * 1.3;
        a.beginPath();
        a.moveTo(x, y);
        a.bezierCurveTo(
          x + rand(-4, 4),
          y + rand(-4, 4),
          x + rand(-6, 6),
          y + rand(-6, 6),
          x + rand(-8, 8),
          y + rand(-8, 8)
        );
        a.stroke();
      }
      a.save();
      belly(a);
      a.clip();
      a.fillStyle = rgrad(
        a,
        8,
        0,
        22,
        [
          [0, 'rgba(255,255,230,0.2)'],
          [0.65, 'rgba(0,0,0,0)'],
          [1, 'rgba(0,0,0,0.38)'],
        ],
        3,
        -5
      );
      a.fillRect(-20, -30, 50, 60);
      a.strokeStyle = 'rgba(80,40,40,0.35)';
      a.lineWidth = 0.5;
      for (let i = 0; i < 10; i++) {
        const g = rand(0, TAU),
          r0 = rand(8, 13);
        a.beginPath();
        a.moveTo(6 + Math.cos(g) * r0, Math.sin(g) * r0 * 1.3);
        a.lineTo(6 + Math.cos(g) * (r0 + rand(2, 4)), Math.sin(g) * (r0 + rand(2, 4)) * 1.3);
        a.stroke();
      }
      a.fillStyle = '#3a2a1a';
      ell(a, 11, 1.5, 1.4, 1.1);
      a.fill();
      a.restore();
      for (let i = 0; i < 2; i++) {
        const x = rand(-4, 12),
          y = (i ? 1 : -1) * rand(9, 15),
          l = rand(2.5, 4.5),
          g = rand(0, 3);
        a.save();
        a.translate(x, y);
        a.rotate(g);
        a.fillStyle = '#4a1a10';
        ell(a, 0, 0, l, 1);
        a.fill();
        a.fillStyle = '#8a8a34';
        ell(a, 0, 0, l * 0.6, 0.4);
        a.fill();
        a.restore();
        e.save();
        e.translate(x, y);
        e.rotate(g);
        e.fillStyle = 'rgba(150,170,40,0.35)';
        ell(e, 0, 0, l * 0.5, 0.35);
        e.fill();
        e.restore();
      }
      for (let i = 0; i < 6; i++) {
        const x = rand(-D * 0.6, D + 6),
          y = rand(-W * 0.7, W * 0.7),
          r = rand(0.6, 1.2);
        a.fillStyle = '#c8c08a';
        circ(a, x, y, r);
        a.fill();
        a.fillStyle = 'rgba(255,255,255,0.3)';
        circ(a, x - r * 0.3, y - r * 0.3, r * 0.4);
        a.fill();
      }
      a.save();
      p(a);
      a.clip();
      a.fillStyle = grad(a, 0, -W, 0, W, [
        [0, 'rgba(0,0,0,0.35)'],
        [0.18, 'rgba(0,0,0,0)'],
        [0.82, 'rgba(0,0,0,0)'],
        [1, 'rgba(0,0,0,0.35)'],
      ]);
      a.fillRect(-30, -30, 60, 60);
      delts(a, W, D, 0.05);
      a.restore();
      {
        // what is left of a stained undershirt: it still covers the shoulders and back, and has split open over the belly
        const vest = c => {
          c.beginPath();
          c.moveTo(-D - 3, -W - 3);
          c.lineTo(2, -W - 3);
          for (let t = 0; t <= 1; t += 0.1)
            c.lineTo(4 + Math.sin(t * 11) * 2 + rand(-1, 1) - Math.sin(t * Math.PI) * 6, lerp(-W - 3, W + 3, t));
          c.lineTo(-D - 3, W + 3);
          c.closePath();
        };
        a.save();
        p(a);
        a.clip();
        vest(a);
        a.fillStyle = '#8a8268';
        a.fill();
        a.save();
        vest(a);
        a.clip();
        weave(a, W, D, 300, 0.12, 0.05);
        grime(a, W, D, 16);
        folds(a, W, D, 1.2);
        a.fillStyle = 'rgba(110,100,40,0.35)';
        ell(a, -4, 8, 8, 12, 0.3);
        a.fill();
        a.restore();
        vest(a);
        a.strokeStyle = 'rgba(30,26,18,0.55)';
        a.lineWidth = 0.7;
        a.stroke();
        a.restore();
        a.save();
        belly(a);
        a.clip();
        a.strokeStyle = 'rgba(60,40,50,0.4)';
        a.lineWidth = 0.6;
        for (let i = 0; i < 7; i++) {
          const y = rand(-18, 18);
          a.beginPath();
          a.moveTo(rand(-6, -2), y);
          a.quadraticCurveTo(rand(4, 10), y + rand(-3, 3), rand(14, 22), y + rand(-4, 4));
          a.stroke();
        }
        a.restore();
      }
    },
    0.55,
    0.9,
    1.3
  );
  /* arms: tapered segments with a real elbow; lineQ stretches these from shoulder (-x) to elbow (+x) and elbow to wrist */
  const limbPath = (c, x0, x1, h0, h1, bulge = 0) => {
    c.beginPath();
    c.moveTo(x0, -h0);
    c.bezierCurveTo(x0 + (x1 - x0) * 0.3, -h0 - bulge, x0 + (x1 - x0) * 0.7, -h1 - bulge * 0.4, x1 - h1 * 0.6, -h1);
    c.quadraticCurveTo(x1 + h1 * 0.25, 0, x1 - h1 * 0.6, h1);
    c.bezierCurveTo(x0 + (x1 - x0) * 0.7, h1 + bulge * 0.4, x0 + (x1 - x0) * 0.3, h0 + bulge, x0, h0);
    c.quadraticCurveTo(x0 - h0 * 0.5, 0, x0, -h0);
    c.closePath();
  };
  const cyl = (a, path, h) => {
    a.save();
    path(a);
    a.clip();
    a.fillStyle = grad(a, 0, -h, 0, h, [
      [0, 'rgba(0,0,0,0.42)'],
      [0.3, 'rgba(255,255,255,0.12)'],
      [0.55, 'rgba(255,255,255,0.05)'],
      [1, 'rgba(0,0,0,0.5)'],
    ]);
    a.fillRect(-12, -6, 24, 12);
    a.restore();
  };
  region(
    'h_upper',
    20,
    10,
    a => {
      // sleeve over shoulder and biceps, bunching toward the elbow
      const p = c => limbPath(c, -9.4, 9.6, 4.5, 3.5, 0.5);
      p(a);
      a.fillStyle = '#ececec';
      a.fill();
      a.save();
      p(a);
      a.clip();
      weave(a, 5, 10, 70, 0.08, 0.06);
      a.strokeStyle = 'rgba(0,0,0,0.25)';
      a.lineWidth = 0.55;
      for (const x of [3.5, 5.5, 7.4]) {
        a.beginPath();
        a.moveTo(x - 1, -3.4);
        a.quadraticCurveTo(x + 1.2, 0, x - 0.6, 3.4);
        a.stroke();
      }
      a.strokeStyle = 'rgba(0,0,0,0.2)';
      a.setLineDash([0.9, 0.7]);
      a.lineWidth = 0.4;
      a.beginPath();
      a.moveTo(-9, -1.6);
      a.lineTo(8, -1.2);
      a.stroke();
      a.setLineDash([]);
      a.restore();
      cyl(a, p, 4.6);
      p(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.6;
      a.stroke();
    },
    0.12,
    1.1,
    1.2
  );
  region(
    'h_fore',
    20,
    9,
    a => {
      // forearm: thick at the elbow, slim at the wrist, cuff
      const p = c => limbPath(c, -9.4, 9.6, 3.6, 2.8, 0.35);
      p(a);
      a.fillStyle = '#e6e6e6';
      a.fill();
      a.save();
      p(a);
      a.clip();
      weave(a, 4, 10, 60, 0.08, 0.06);
      a.strokeStyle = 'rgba(0,0,0,0.22)';
      a.lineWidth = 0.5;
      for (const x of [-7, -5]) {
        a.beginPath();
        a.moveTo(x, -3);
        a.quadraticCurveTo(x + 1.4, 0, x, 3);
        a.stroke();
      }
      a.fillStyle = 'rgba(0,0,0,0.28)';
      a.fillRect(5.6, -3.2, 2.6, 6.4);
      a.fillStyle = 'rgba(255,255,255,0.12)';
      a.fillRect(5.6, -3.2, 0.6, 6.4);
      a.restore();
      cyl(a, p, 3.6);
      p(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.6;
      a.stroke();
    },
    0.12,
    1.1,
    1.2
  );
  region(
    'h_elbow',
    10,
    10,
    a => {
      ell(a, 0, 0, 3.9, 3.7);
      a.fillStyle = '#dedede';
      a.fill();
      a.fillStyle = rgrad(
        a,
        0,
        0,
        4,
        [
          [0, 'rgba(255,255,255,0.1)'],
          [1, 'rgba(0,0,0,0.45)'],
        ],
        -1,
        -1
      );
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.35)';
      a.lineWidth = 0.5;
      a.beginPath();
      a.arc(0.6, 0, 2.6, -1.1, 1.1);
      a.stroke();
    },
    0.1,
    1,
    1
  );
  region(
    'z_upper',
    20,
    10,
    a => {
      // shirt sleeve, frayed where it tore at the elbow
      const p = c => {
        c.beginPath();
        c.moveTo(-9.4, -4.3);
        c.bezierCurveTo(-3, -4.8, 3, -4, 6, -3.6);
        for (let y = -3.6; y < 3.6; y += 1.2) c.lineTo(6 + rand(0.5, 3), y + 0.6);
        c.lineTo(6, 3.6);
        c.bezierCurveTo(3, 4, -3, 4.8, -9.4, 4.3);
        c.quadraticCurveTo(-11.5, 0, -9.4, -4.3);
        c.closePath();
      };
      a.fillStyle = '#9aa08c';
      ell(a, 6, 0, 4.6, 3.1);
      a.fill();
      p(a);
      a.fillStyle = '#e4e4e4';
      a.fill();
      a.save();
      p(a);
      a.clip();
      weave(a, 5, 10, 70, 0.1, 0.05);
      grime(a, 4, 9, 3);
      a.strokeStyle = 'rgba(0,0,0,0.22)';
      a.lineWidth = 0.5;
      for (const x of [-5, 0, 3]) {
        a.beginPath();
        a.moveTo(x, -3.8);
        a.quadraticCurveTo(x + 1.5, 0, x - 0.4, 3.8);
        a.stroke();
      }
      a.restore();
      cyl(a, p, 4.4);
      p(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.55;
      a.stroke();
    },
    0.12,
    1.1,
    1.2
  );
  region(
    'z_fore',
    20,
    9,
    a => {
      // bare dead forearm: tendons, bruising, a bite
      const p = c => limbPath(c, -9.6, 9.6, 3.4, 2.4, 0.4);
      p(a);
      a.fillStyle = '#e2e2dc';
      a.fill();
      a.save();
      p(a);
      a.clip();
      for (let i = 0; i < 6; i++) {
        a.fillStyle = pick(['rgba(90,60,100,0.25)', 'rgba(70,80,50,0.25)', 'rgba(120,100,80,0.2)']);
        ell(a, rand(-8, 8), rand(-2.5, 2.5), rand(1, 2.6), rand(0.6, 1.4), rand(0, 3));
        a.fill();
      }
      a.strokeStyle = 'rgba(0,0,0,0.2)';
      a.lineWidth = 0.4;
      for (const y of [-1, 0.6]) {
        a.beginPath();
        a.moveTo(-6, y);
        a.quadraticCurveTo(1, y * 0.8, 8, y * 0.5);
        a.stroke();
      }
      a.strokeStyle = 'rgba(80,50,90,0.35)';
      a.lineWidth = 0.35;
      a.beginPath();
      a.moveTo(-8, 1.6);
      a.bezierCurveTo(-3, 0.4, 2, 2, 8, 0.8);
      a.stroke();
      if (Math.random() < 0.7) {
        const x = rand(-5, 3);
        a.fillStyle = '#4a0a08';
        ell(a, x, rand(-1, 1), 1.8, 1.2, 0);
        a.fill();
        a.fillStyle = 'rgba(150,30,24,0.7)';
        ell(a, x, 0, 1, 0.6, 0);
        a.fill();
      }
      a.restore();
      cyl(a, p, 3.4);
      p(a);
      a.strokeStyle = EDGE;
      a.lineWidth = 0.55;
      a.stroke();
    },
    0.2,
    1.1,
    1.3
  );
  region(
    'z_elbow',
    10,
    10,
    a => {
      ell(a, 0, 0, 3.6, 3.4);
      a.fillStyle = '#d8d8d2';
      a.fill();
      a.fillStyle = rgrad(
        a,
        0,
        0,
        3.6,
        [
          [0, 'rgba(255,255,255,0.08)'],
          [1, 'rgba(0,0,0,0.45)'],
        ],
        -1,
        -1
      );
      a.fill();
      a.strokeStyle = 'rgba(0,0,0,0.3)';
      a.lineWidth = 0.45;
      a.beginPath();
      a.arc(0.5, 0, 2.3, -1.2, 1.2);
      a.stroke();
    },
    0.15,
    1,
    1
  );
  /* superseded: z_hound */
  /* superseded: z_hhead */

  /* ----- Abomination ----- */
  /* superseded: ab_body */
  /* superseded: ab_head */
  /* superseded: ab_seg */
  /* superseded: ab_mouth */
  /* superseded: ab_blade */

  /* ----- realistic overrides: the dog and the abomination ----- */
  {
    const EDGE2 = 'rgba(14,10,12,0.85)';
    const fur = (a, n, x0, x1, y0, y1, cols, len = 3) => {
      a.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const x = rand(x0, x1),
          y = rand(y0, y1);
        a.strokeStyle = pick(cols);
        a.lineWidth = rand(0.35, 0.7);
        a.beginPath();
        a.moveTo(x, y);
        a.lineTo(x - len * rand(0.6, 1.2), y + rand(-0.6, 0.6) + y * 0.04);
        a.stroke();
      }
    };
    region(
      'z_hound',
      54,
      28,
      a => {
        // starved dog from above: deep chest, tucked waist, ribs and spine showing, mange
        const bp = c => {
          c.beginPath();
          c.moveTo(19, 0);
          c.bezierCurveTo(19, -6, 14, -8.4, 8, -8.2);
          c.bezierCurveTo(2, -8, -3, -5.4, -7, -5.6);
          c.bezierCurveTo(-13, -6.2, -19, -7, -21.5, -3.6);
          c.quadraticCurveTo(-23.5, 0, -21.5, 3.6);
          c.bezierCurveTo(-19, 7, -13, 6.2, -7, 5.6);
          c.bezierCurveTo(-3, 5.4, 2, 8, 8, 8.2);
          c.bezierCurveTo(14, 8.4, 19, 6, 19, 0);
          c.closePath();
        };
        bp(a);
        a.fillStyle = '#8e7a62';
        a.fill();
        a.save();
        bp(a);
        a.clip();
        a.fillStyle = '#4a3a2c';
        a.beginPath();
        a.moveTo(16, 0);
        a.bezierCurveTo(12, -5.5, 0, -4.6, -8, -3.6);
        a.bezierCurveTo(-16, -4.2, -21, -2.4, -22, 0);
        a.bezierCurveTo(-21, 2.4, -16, 4.2, -8, 3.6);
        a.bezierCurveTo(0, 4.6, 12, 5.5, 16, 0);
        a.fill();
        fur(a, 260, -22, 19, -9, 9, ['rgba(20,14,10,0.6)', 'rgba(196,168,128,0.5)', 'rgba(60,44,32,0.6)']);
        a.strokeStyle = 'rgba(15,10,8,0.55)';
        a.lineWidth = 0.6;
        for (const s of [-1, 1])
          for (let x = -3; x <= 9; x += 2.6) {
            a.beginPath();
            a.moveTo(x, s * 2.2);
            a.quadraticCurveTo(x - 1.4, s * 5, x - 2.6, s * 7.4);
            a.stroke();
          }
        a.strokeStyle = 'rgba(230,210,180,0.18)';
        a.lineWidth = 0.5;
        for (const s of [-1, 1])
          for (let x = -2.2; x <= 9.8; x += 2.6) {
            a.beginPath();
            a.moveTo(x, s * 2.3);
            a.quadraticCurveTo(x - 1.4, s * 5, x - 2.6, s * 7.2);
            a.stroke();
          }
        a.fillStyle = 'rgba(210,190,170,0.12)';
        for (let x = -18; x <= 14; x += 2.6) {
          ell(a, x, 0, 0.6, 0.45);
          a.fill();
        }
        for (let i = 0; i < 4; i++) {
          a.fillStyle = 'rgba(150,110,110,0.75)';
          ell(a, rand(-18, 14), rand(-6, 6), rand(1.5, 3.4), rand(1, 2.4), rand(0, 3));
          a.fill();
        }
        a.fillStyle = '#4a0c0a';
        ell(a, -12, 4.5, 3.6, 1.8, 0.3);
        a.fill();
        a.fillStyle = 'rgba(160,30,26,0.7)';
        ell(a, -12, 4.5, 2.2, 0.9, 0.3);
        a.fill();
        a.fillStyle = 'rgba(230,220,200,0.7)';
        for (let k = 0; k < 3; k++) a.fillRect(-13.5 + k * 1.3, 4, 0.5, 1.4);
        a.fillStyle = grad(a, 0, -9, 0, 9, [
          [0, 'rgba(0,0,0,0.4)'],
          [0.3, 'rgba(255,255,255,0.06)'],
          [0.7, 'rgba(0,0,0,0)'],
          [1, 'rgba(0,0,0,0.4)'],
        ]);
        a.fillRect(-24, -10, 46, 20);
        a.restore();
        bp(a);
        a.strokeStyle = EDGE2;
        a.lineWidth = 0.7;
        a.stroke();
      },
      0.2,
      0.6,
      1.4
    );
    region(
      'z_hhead',
      24,
      18,
      (a, e) => {
        // long muzzle, pricked ears laid back, lips peeled off the teeth, eye-shine
        for (const s of [-1, 1]) {
          a.fillStyle = '#2a1e16';
          a.beginPath();
          a.moveTo(-1.5, s * 3.4);
          a.quadraticCurveTo(-6, s * 7.6, -8.6, s * 7);
          a.quadraticCurveTo(-6.4, s * 4.6, -4.6, s * 2.6);
          a.closePath();
          a.fill();
          a.fillStyle = 'rgba(150,100,90,0.5)';
          a.beginPath();
          a.moveTo(-2.4, s * 3.6);
          a.quadraticCurveTo(-5.6, s * 6.4, -7.4, s * 6.4);
          a.quadraticCurveTo(-5.6, s * 4.8, -4.2, s * 3.2);
          a.closePath();
          a.fill();
        }
        const hd = c => {
          c.beginPath();
          c.moveTo(-6, 0);
          c.bezierCurveTo(-6, -5.4, -1, -5.6, 2, -4.2);
          c.bezierCurveTo(5, -3, 8, -2.4, 10.6, -1.3);
          c.quadraticCurveTo(11.6, 0, 10.6, 1.3);
          c.bezierCurveTo(8, 2.4, 5, 3, 2, 4.2);
          c.bezierCurveTo(-1, 5.6, -6, 5.4, -6, 0);
          c.closePath();
        };
        hd(a);
        a.fillStyle = '#5a4634';
        a.fill();
        a.save();
        hd(a);
        a.clip();
        a.fillStyle = '#20160f';
        ell(a, 3, 0, 9, 2.2);
        a.fill();
        fur(a, 90, -6, 10, -5, 5, ['rgba(20,14,10,0.6)', 'rgba(150,120,90,0.4)'], 2);
        a.fillStyle = grad(a, 0, -5, 0, 5, [
          [0, 'rgba(0,0,0,0.4)'],
          [0.35, 'rgba(255,255,255,0.08)'],
          [1, 'rgba(0,0,0,0.4)'],
        ]);
        a.fillRect(-8, -6, 20, 12);
        a.restore();
        a.fillStyle = '#e8e0c8';
        for (const s of [-1, 1])
          for (let x = 4.5; x < 10.4; x += 1.3) {
            a.beginPath();
            a.moveTo(x, s * (3.1 - (x - 4.5) * 0.28));
            a.lineTo(x + 0.55, s * (3.9 - (x - 4.5) * 0.28));
            a.lineTo(x + 1.1, s * (3.1 - (x - 4.5) * 0.28));
            a.fill();
          }
        a.fillStyle = '#7a2a2a';
        for (const s of [-1, 1]) {
          ell(a, 7, s * 3, 3.2, 0.5, s * -0.25);
          a.fill();
        }
        a.fillStyle = '#0c0808';
        ell(a, 10.8, 0, 1.2, 1.4);
        a.fill();
        a.fillStyle = 'rgba(255,255,255,0.3)';
        circ(a, 10.6, -0.5, 0.35);
        a.fill();
        for (const s of [-1, 1]) {
          a.fillStyle = '#0c0806';
          ell(a, 2.2, s * 3.3, 0.9, 0.6);
          a.fill();
          e.fillStyle = 'rgba(200,180,90,0.7)';
          circ(e, 2.4, s * 3.3, 0.5);
          e.fill();
        }
        hd(a);
        a.strokeStyle = EDGE2;
        a.lineWidth = 0.6;
        a.stroke();
      },
      0.3,
      0.8,
      1.3
    );

    /* the abomination: bodies stitched into one, crawling on human arms */
    const flesh = (a, path, n = 40, R0 = 95) => {
      a.save();
      path(a);
      a.clip();
      for (let i = 0; i < n; i++) {
        a.fillStyle = pick([
          'rgba(90,50,70,0.22)',
          'rgba(140,120,100,0.2)',
          'rgba(110,30,30,0.25)',
          'rgba(70,80,60,0.18)',
        ]);
        ell(a, rand(-R0, R0), rand(-R0 * 0.85, R0 * 0.85), rand(3, 12), rand(2, 8), rand(0, 3));
        a.fill();
      }
      a.restore();
    };
    const spineBack = (a, x, y, g, s) => {
      // one human back fused into the mass: shoulder blades and vertebrae
      a.save();
      a.translate(x, y);
      a.rotate(g);
      a.scale(s, s);
      const p = c => SHP(c, 26, 15, 0);
      p(a);
      a.fillStyle = '#b09484';
      a.fill();
      flesh(a, p, 20, 26);
      a.fillStyle = rgrad(
        a,
        0,
        0,
        26,
        [
          [0, 'rgba(255,240,230,0.12)'],
          [1, 'rgba(0,0,0,0.35)'],
        ],
        -3,
        -4
      );
      p(a);
      a.fill();
      for (const sd of [-1, 1]) {
        a.strokeStyle = 'rgba(60,30,30,0.4)';
        a.lineWidth = 1;
        a.beginPath();
        a.moveTo(-10, sd * 4);
        a.quadraticCurveTo(-3, sd * 13, 6, sd * 9);
        a.stroke();
      }
      for (let k = -12; k <= 10; k += 3.2) {
        a.fillStyle = 'rgba(230,214,200,0.45)';
        ell(a, k, 0, 1.3, 1.6);
        a.fill();
        a.fillStyle = 'rgba(40,20,20,0.35)';
        ell(a, k + 1.3, 0, 0.5, 1.4);
        a.fill();
      }
      a.restore();
    };
    region(
      'ab_body',
      190,
      156,
      (a, e) => {
        const lobes = [
          [-40, -26, 38, 34],
          [-40, 26, 36, 33],
          [-6, -30, 36, 31],
          [-6, 30, 36, 31],
          [-14, 0, 48, 42],
          [24, 0, 32, 36],
          [-66, 0, 28, 30],
        ];
        const mass = c => {
          c.beginPath();
          for (const [x, y, rx, ry] of lobes) {
            c.moveTo(x + rx, y);
            c.ellipse(x, y, rx, ry, 0, 0, TAU);
          }
        };
        for (const [x, y, rx, ry] of lobes) {
          ell(a, x, y, rx, ry);
          a.strokeStyle = EDGE2;
          a.lineWidth = 2;
          a.stroke();
        }
        for (const [x, y, rx, ry] of lobes) {
          ell(a, x, y, rx, ry);
          a.fillStyle = '#9a7468';
          a.fill();
        }
        flesh(a, mass, 140);
        spineBack(a, -42, -24, -0.5, 0.95);
        spineBack(a, -40, 26, 0.6, 0.9);
        spineBack(a, 4, 0, 0.1, 1.05);
        spineBack(a, -70, 0, 3.1, 0.75);
        // exposed ribcage
        a.save();
        a.translate(-18, 2);
        a.fillStyle = '#4a0e0c';
        ell(a, 0, 0, 16, 11, 0.2);
        a.fill();
        a.fillStyle = 'rgba(140,40,36,0.7)';
        ell(a, 0, 0, 12, 7, 0.2);
        a.fill();
        a.strokeStyle = '#e6dccb';
        a.lineWidth = 2;
        for (let k = -10; k <= 10; k += 4) {
          a.beginPath();
          a.moveTo(k, -9);
          a.quadraticCurveTo(k + 4, 0, k, 9);
          a.stroke();
        }
        a.strokeStyle = 'rgba(0,0,0,0.35)';
        a.lineWidth = 0.6;
        for (let k = -10; k <= 10; k += 4) {
          a.beginPath();
          a.moveTo(k + 1, -9);
          a.quadraticCurveTo(k + 5, 0, k + 1, 9);
          a.stroke();
        }
        a.restore();
        // heads sunk in the flesh, eyes shut
        for (const [x, y, g] of [
          [-56, -36, -2.2],
          [-58, 34, 2.2],
          [26, -30, -0.8],
          [24, 32, 0.9],
        ]) {
          a.save();
          a.translate(x, y);
          a.rotate(g);
          a.fillStyle = 'rgba(40,10,10,0.5)';
          ell(a, 0, 0, 9.5, 8.5);
          a.fill();
          ell(a, 0, 0, 7.4, 6.4);
          a.fillStyle = '#9a9080';
          a.fill();
          a.fillStyle = rgrad(
            a,
            0,
            0,
            7.4,
            [
              [0, 'rgba(255,255,255,0.1)'],
              [1, 'rgba(0,0,0,0.45)'],
            ],
            -2,
            -2
          );
          a.fill();
          a.fillStyle = '#2a2018';
          a.beginPath();
          a.ellipse(-1.4, 0, 6, 6.2, 0, 1.9, 4.4);
          a.closePath();
          a.fill();
          a.strokeStyle = 'rgba(30,20,20,0.6)';
          a.lineWidth = 0.6;
          for (const s of [-1, 1]) {
            a.beginPath();
            a.moveTo(4, s * 2.6);
            a.lineTo(5.6, s * 2.2);
            a.stroke();
          }
          a.fillStyle = '#2a0808';
          ell(a, 6.6, 0, 0.8, 1.6);
          a.fill();
          a.restore();
        }
        for (const [x0, y0, x1, y1] of [
          [-66, -12, -40, -4],
          [-30, -48, -10, -20],
          [-30, 48, -12, 22],
          [10, -14, 34, -8],
          [8, 16, 30, 10],
          [-80, 10, -60, 22],
        ]) {
          // fusion scars where the bodies grew into each other: a wet crevice, skin dragged into folds, the odd torn flap
          const mx = (x0 + x1) / 2 + rand(-3, 3),
            my = (y0 + y1) / 2 + rand(-3, 3),
            L = Math.hypot(x1 - x0, y1 - y0),
            nx = -(y1 - y0) / L,
            ny = (x1 - x0) / L;
          a.strokeStyle = 'rgba(30,6,6,0.55)';
          a.lineWidth = 4.2;
          a.beginPath();
          a.moveTo(x0, y0);
          a.quadraticCurveTo(mx, my, x1, y1);
          a.stroke();
          a.strokeStyle = 'rgba(110,24,22,0.75)';
          a.lineWidth = 1.6;
          a.stroke();
          a.strokeStyle = 'rgba(20,2,2,0.8)';
          a.lineWidth = 0.6;
          a.stroke();
          for (let t = 0.06; t < 0.95; t += rand(0.07, 0.16)) {
            const px = lerp(lerp(x0, mx, t), lerp(mx, x1, t), t),
              py = lerp(lerp(y0, my, t), lerp(my, y1, t), t),
              l = rand(2.5, 6),
              sd = Math.random() < 0.5 ? -1 : 1,
              bend = rand(-0.5, 0.5);
            a.strokeStyle = 'rgba(40,16,14,0.35)';
            a.lineWidth = rand(0.6, 1.1);
            a.beginPath();
            a.moveTo(px + nx * sd * 1.5, py + ny * sd * 1.5);
            a.quadraticCurveTo(
              px + nx * sd * l * 0.6 + ny * bend * 3,
              py + ny * sd * l * 0.6 - nx * bend * 3,
              px + nx * sd * l,
              py + ny * sd * l
            );
            a.stroke();
            a.strokeStyle = 'rgba(230,200,190,0.12)';
            a.lineWidth = 0.5;
            a.beginPath();
            a.moveTo(px + nx * sd * 2 + 0.6, py + ny * sd * 2 + 0.6);
            a.lineTo(px + nx * sd * l * 0.8 + 0.6, py + ny * sd * l * 0.8 + 0.6);
            a.stroke();
          }
          if (Math.random() < 0.6) {
            const t = rand(0.3, 0.7),
              px = lerp(x0, x1, t),
              py = lerp(y0, y1, t);
            a.fillStyle = '#7a5048';
            a.beginPath();
            a.moveTo(px, py);
            a.lineTo(px + nx * 5 + rand(-2, 2), py + ny * 5 + rand(-2, 2));
            a.lineTo(px + ((x1 - x0) / L) * 4, py + ((y1 - y0) / L) * 4);
            a.closePath();
            a.fill();
            a.strokeStyle = 'rgba(30,6,6,0.5)';
            a.lineWidth = 0.5;
            a.stroke();
          }
        }
        for (let i = 0; i < 5; i++) {
          const x = rand(-75, 40),
            y = rand(-50, 50),
            r = rand(3, 6.5);
          a.fillStyle = '#b08e80';
          circ(a, x, y, r);
          a.fill();
          a.fillStyle = rgrad(
            a,
            x,
            y,
            r,
            [
              [0, 'rgba(255,240,220,0.2)'],
              [1, 'rgba(60,30,20,0.45)'],
            ],
            x - r * 0.3,
            y - r * 0.3
          );
          circ(a, x, y, r);
          a.fill();
        }
        for (let i = 0; i < 5; i++) {
          const x = rand(-70, 30),
            y = rand(-45, 45),
            r = rand(2.5, 4.5);
          a.fillStyle = '#3a0a08';
          ell(a, x, y, r, r * 0.7, rand(0, 3));
          a.fill();
          a.fillStyle = 'rgba(176,150,74,0.55)';
          ell(a, x, y, r * 0.5, r * 0.3, 0);
          a.fill();
          a.fillStyle = 'rgba(255,240,200,0.25)';
          ell(a, x - r * 0.15, y - r * 0.1, r * 0.18, r * 0.1, 0);
          a.fill();
        }
        a.save();
        mass(a);
        a.clip();
        a.fillStyle = rgrad(a, -14, 0, 100, [
          [0.4, 'rgba(0,0,0,0)'],
          [1, 'rgba(0,0,0,0.5)'],
        ]);
        a.fillRect(-100, -80, 200, 160);
        a.restore();
      },
      0.32,
      0.45,
      1.4
    );
    region(
      'ab_head',
      86,
      76,
      (a, e) => {
        // a huge, swollen human head; the jaw split open sideways
        for (const s of [-1, 1]) {
          a.fillStyle = '#8a6a5e';
          ell(a, -2, s * 24.5, 4.5, 3, 0);
          a.fill();
          a.strokeStyle = 'rgba(0,0,0,0.4)';
          a.lineWidth = 0.8;
          a.stroke();
        }
        const sk = c => ell(c, -2, 0, 27, 24);
        sk(a);
        a.strokeStyle = EDGE2;
        a.lineWidth = 1.6;
        a.stroke();
        a.fillStyle = '#a0807a';
        a.fill();
        flesh(a, sk, 60, 30);
        a.save();
        sk(a);
        a.clip();
        a.strokeStyle = 'rgba(90,50,80,0.45)';
        a.lineWidth = 0.8;
        for (let i = 0; i < 12; i++) {
          let x = rand(-24, 10),
            y = rand(-20, 20);
          a.beginPath();
          a.moveTo(x, y);
          a.bezierCurveTo(
            x + rand(-6, 6),
            y + rand(-6, 6),
            x + rand(-8, 8),
            y + rand(-8, 8),
            x + rand(-10, 10),
            y + rand(-10, 10)
          );
          a.stroke();
        }
        {
          // a tear in the scalp: yellowed skull under a ragged, blood-crusted rim of skin
          const P = [];
          for (let i = 0; i < 12; i++) {
            const g = (i / 12) * TAU,
              r = rand(5.2, 8.2);
            P.push([-16 + Math.cos(g) * r, -5 + Math.sin(g) * r * 0.75]);
          }
          const tear = c => {
            c.beginPath();
            P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
            c.closePath();
          };
          tear(a);
          a.fillStyle = 'rgba(70,10,8,0.75)';
          a.fill();
          a.save();
          tear(a);
          a.clip();
          a.fillStyle = rgrad(
            a,
            -16,
            -6,
            7,
            [
              [0, '#cfc2a2'],
              [0.7, '#a89a7a'],
              [1, '#6a5040'],
            ],
            -18,
            -8
          );
          ell(a, -16, -5, 5.6, 4.2, 0.2);
          a.fill();
          a.strokeStyle = 'rgba(60,40,30,0.55)';
          a.lineWidth = 0.35;
          a.beginPath();
          a.moveTo(-19, -8);
          a.lineTo(-16.5, -5);
          a.lineTo(-17.5, -2);
          a.moveTo(-16.5, -5);
          a.lineTo(-13, -4.4);
          a.stroke();
          a.fillStyle = 'rgba(110,20,16,0.5)';
          ell(a, -12.5, -3, 2, 1.4, 0.4);
          a.fill();
          a.restore();
          tear(a);
          a.strokeStyle = 'rgba(40,6,6,0.6)';
          a.lineWidth = 1.1;
          a.stroke();
          a.strokeStyle = 'rgba(160,110,100,0.35)';
          a.lineWidth = 0.4;
          a.stroke();
        }
        a.strokeStyle = 'rgba(40,30,26,0.5)';
        a.lineWidth = 0.4;
        for (let i = 0; i < 40; i++) {
          const x = rand(-26, 0),
            y = rand(-22, 22);
          a.beginPath();
          a.moveTo(x, y);
          a.lineTo(x - rand(2, 4), y + rand(-1, 1));
          a.stroke();
        }
        a.fillStyle = rgrad(
          a,
          -2,
          0,
          27,
          [
            [0, 'rgba(255,240,230,0.14)'],
            [0.7, 'rgba(0,0,0,0)'],
            [1, 'rgba(0,0,0,0.5)'],
          ],
          -8,
          -6
        );
        a.fillRect(-30, -26, 60, 52);
        a.restore();
        // the split jaw
        const m = c => {
          c.beginPath();
          c.moveTo(9, -14);
          c.quadraticCurveTo(22, -17, 29, -9);
          c.lineTo(25, -2);
          c.lineTo(27, 0);
          c.lineTo(25, 2);
          c.lineTo(29, 9);
          c.quadraticCurveTo(22, 17, 9, 14);
          c.quadraticCurveTo(15, 0, 9, -14);
          c.closePath();
        };
        m(a);
        a.fillStyle = '#1a0406';
        a.fill();
        a.save();
        m(a);
        a.clip();
        a.fillStyle = 'rgba(110,20,24,0.8)';
        ell(a, 16, 0, 9, 13);
        a.fill();
        a.fillStyle = 'rgba(160,60,60,0.6)';
        ell(a, 14, 0, 5, 7);
        a.fill();
        a.restore();
        a.fillStyle = '#dcd2bc';
        for (const s of [-1, 1])
          for (let t = 0.1; t < 0.9; t += 0.12) {
            const x = lerp(10, 28, t),
              y = s * (14 - t * 7);
            a.beginPath();
            a.moveTo(x - 1.2, y);
            a.lineTo(x + rand(-0.5, 0.5), y - s * rand(2.4, 4.2));
            a.lineTo(x + 1.2, y);
            a.fill();
          }
        m(a);
        a.strokeStyle = 'rgba(60,10,10,0.9)';
        a.lineWidth = 1.2;
        a.stroke();
        for (const s of [-1, 1]) {
          a.fillStyle = '#2a0a0a';
          ell(a, 4, s * 12, 3.2, 2, s * 0.4);
          a.fill();
          a.fillStyle = '#6a1a12';
          circ(a, 4.6, s * 12, 1.2);
          a.fill();
          e.fillStyle = 'rgba(255,70,30,0.55)';
          circ(e, 4.6, s * 12, 1.1);
          e.fill();
        }
      },
      0.32,
      0.55,
      1.3
    );
    region(
      'ab_seg',
      42,
      38,
      a => {
        // tail: a spine wrapped in flesh
        const f = c => ell(c, 0, 0, 16, 14);
        f(a);
        a.fillStyle = '#946e64';
        a.fill();
        flesh(a, f, 30, 18);
        a.strokeStyle = EDGE2;
        a.lineWidth = 1.1;
        a.stroke();
        a.fillStyle = '#e2d8c6';
        rr(a, -7, -4, 14, 8, 3);
        a.fill();
        for (const s of [-1, 1]) {
          a.beginPath();
          a.moveTo(-3, s * 3);
          a.lineTo(-6, s * 11);
          a.lineTo(-1, s * 10);
          a.lineTo(2, s * 3);
          a.fill();
        }
        a.strokeStyle = 'rgba(60,40,30,0.55)';
        a.lineWidth = 0.6;
        a.strokeRect(-7, -4, 14, 8);
        a.fillStyle = 'rgba(120,20,20,0.6)';
        ell(a, 8, 0, 3, 5);
        a.fill();
        a.fillStyle = rgrad(a, 0, 0, 16, [
          [0.5, 'rgba(0,0,0,0)'],
          [1, 'rgba(0,0,0,0.45)'],
        ]);
        f(a);
        a.fill();
      },
      0.32,
      0.65,
      1.3
    );
    region(
      'ab_mouth',
      52,
      40,
      (a, e) => {
        // tail tip: a ring of human jaws around a throat
        const f = c => ell(c, -4, 0, 16, 15);
        f(a);
        a.fillStyle = '#a07468';
        a.fill();
        flesh(a, f, 30, 18);
        a.strokeStyle = EDGE2;
        a.lineWidth = 1.1;
        a.stroke();
        circ(a, 6, 0, 9.5);
        a.fillStyle = '#5a1416';
        a.fill();
        circ(a, 6, 0, 6.5);
        a.fillStyle = '#12020a';
        a.fill();
        a.fillStyle = '#dcd2bc';
        for (let i = 0; i < 16; i++) {
          const g = (i / 16) * TAU,
            r0 = 9.2,
            r1 = rand(5.6, 7);
          a.beginPath();
          a.moveTo(6 + Math.cos(g - 0.12) * r0, Math.sin(g - 0.12) * r0);
          a.lineTo(6 + Math.cos(g) * r1, Math.sin(g) * r1);
          a.lineTo(6 + Math.cos(g + 0.12) * r0, Math.sin(g + 0.12) * r0);
          a.fill();
        }
        radial(e, 6, 0, 6, [
          [0, 'rgba(160,210,40,0.9)'],
          [1, 'rgba(160,210,40,0)'],
        ]);
      },
      0.32,
      0.6,
      1
    );
    region(
      'riotshield',
      22,
      54,
      a => {
        // a riot shield seen from above, held upright: a thick curved slab of smoked polycarbonate with a rubber rim, the white band round its face, the grip block behind
        const edge = c => {
          c.beginPath();
          c.moveTo(-1, -25);
          c.quadraticCurveTo(9, 0, -1, 25);
          c.lineTo(-8, 24);
          c.quadraticCurveTo(1.5, 0, -8, -24);
          c.closePath();
        };
        edge(a);
        a.fillStyle = grad(a, -8, 0, 6, 0, [
          [0, '#1c2024'],
          [0.5, '#3a4249'],
          [0.8, '#56616a'],
          [1, '#2a3036'],
        ]);
        a.fill();
        a.strokeStyle = '#0c0e10';
        a.lineWidth = 1.4;
        a.stroke();
        a.strokeStyle = 'rgba(215,230,240,0.45)';
        a.lineWidth = 0.8;
        a.beginPath();
        a.moveTo(2.2, -21);
        a.quadraticCurveTo(8.4, 0, 2.2, 21);
        a.stroke(); // light along the curved face
        a.save();
        edge(a);
        a.clip();
        a.fillStyle = 'rgba(222,218,208,0.75)';
        a.fillRect(2, -24, 3, 48);
        a.restore(); // the white band along the top of the face
        a.fillStyle = '#121416';
        rr(a, -11, -6, 3.6, 12, 1.2);
        a.fill(); // grip block
        for (let i = 0; i < 4; i++) {
          a.strokeStyle = 'rgba(200,210,215,0.32)';
          a.lineWidth = 0.5;
          a.beginPath();
          const y = rand(-20, 16);
          a.moveTo(-2, y);
          a.lineTo(2.5, y + rand(2, 5));
          a.stroke();
        }
      },
      0.5,
      0.35,
      0.9
    );
    region(
      'riotflat',
      52,
      88,
      a => {
        // the same shield dropped flat on the road: smoked polycarbonate, the white POLICE band, cracked through
        shape(a, c => rr(c, -22, -40, 44, 80, 7), 'rgba(52,60,68,0.92)', { lw: 1.6 });
        a.fillStyle = 'rgba(160,180,195,0.16)';
        rr(a, -18, -36, 18, 72, 5);
        a.fill();
        a.fillStyle = '#dcd8cc';
        a.fillRect(-22, -9, 44, 10);
        a.fillStyle = '#20252b';
        a.font = '900 8px Kanit, sans-serif';
        a.textAlign = 'center';
        a.fillText('POLICE', 0, -1);
        a.strokeStyle = 'rgba(230,240,245,0.55)';
        a.lineWidth = 0.7;
        let x = -6,
          y = -30;
        a.beginPath();
        a.moveTo(x, y);
        for (let i = 0; i < 6; i++) {
          x += rand(-6, 8);
          y += rand(8, 14);
          a.lineTo(x, y);
        }
        a.stroke();
        a.beginPath();
        a.moveTo(4, -12);
        a.lineTo(14, -20);
        a.lineTo(19, -16);
        a.stroke();
      },
      0.5,
      0.35,
      0.9
    );
    region(
      'ab_egg',
      40,
      40,
      (a, e) => {
        // an egg sac glued to the ground: veined, wet, something curled inside
        const sac = c => ell(c, 0, 0, 15, 12, 0.2);
        sac(a);
        a.fillStyle = rgrad(
          a,
          -3,
          -3,
          16,
          [
            [0, '#a8a87a'],
            [0.5, '#6e7246'],
            [1, '#33361e'],
          ],
          -6,
          -6
        );
        a.fill();
        a.strokeStyle = 'rgba(30,32,16,0.45)';
        a.lineWidth = 0.8;
        a.stroke();
        a.save();
        sac(a);
        a.clip();
        a.strokeStyle = 'rgba(90,30,40,0.55)';
        a.lineWidth = 0.8;
        for (let i = 0; i < 9; i++) {
          let x = rand(-14, 14),
            y = rand(-11, 11);
          a.beginPath();
          a.moveTo(x, y);
          for (let k = 0; k < 3; k++) {
            x += rand(-5, 5);
            y += rand(-5, 5);
            a.lineTo(x, y);
          }
          a.stroke();
        }
        a.fillStyle = 'rgba(40,30,20,0.45)';
        a.beginPath();
        a.arc(2, 1, 6, 0.4, 4.6);
        a.lineWidth = 3;
        a.strokeStyle = 'rgba(50,36,24,0.5)';
        a.stroke();
        a.restore(); // the shape curled inside
        a.fillStyle = 'rgba(255,255,240,0.45)';
        ell(a, -6, -5, 4, 2, -0.5);
        a.fill();
        for (let i = 0; i < 5; i++) {
          a.fillStyle = 'rgba(130,140,70,0.45)';
          ell(a, rand(-16, 16), rand(-14, 14), rand(1.5, 3), rand(1, 2), rand(0, 3));
          a.fill();
        } // wet highlight, slime around the base
        e.fillStyle = 'rgba(110,130,40,0.2)';
        ell(e, 0, 0, 8, 6, 0.2);
        e.fill();
      },
      0.6,
      0.8,
      1.2
    );
    region(
      'ab_blade',
      64,
      22,
      a => {
        // sharpened forearm bones bursting out of a flesh sleeve
        a.fillStyle = '#946e64';
        ell(a, -22, 0, 10, 7.5);
        a.fill();
        a.strokeStyle = EDGE2;
        a.lineWidth = 0.9;
        a.stroke();
        const b = c => {
          c.beginPath();
          c.moveTo(-18, -3.5);
          c.quadraticCurveTo(4, -7, 30, -1.5);
          c.quadraticCurveTo(12, 0.5, -16, 4.5);
          c.closePath();
        };
        b(a);
        a.fillStyle = grad(a, -18, 0, 30, 0, [
          [0, '#9a8a6c'],
          [0.55, '#b8a888'],
          [0.85, '#c2b292'],
          [1, '#7a3a2a'],
        ]);
        a.fill();
        /* old bone, bloodied toward the point */ a.strokeStyle = 'rgba(60,40,30,0.6)';
        a.lineWidth = 0.7;
        a.stroke();
        a.strokeStyle = 'rgba(120,100,80,0.5)';
        a.lineWidth = 0.5;
        a.beginPath();
        a.moveTo(-14, 0.5);
        a.quadraticCurveTo(6, -2.4, 26, -1.2);
        a.stroke();
        a.fillStyle = 'rgba(110,16,14,0.8)';
        for (let i = 0; i < 4; i++) {
          ell(a, rand(-18, -8), rand(-4, 4), rand(1.5, 3), rand(1, 2), rand(0, 3));
          a.fill();
        }
        a.fillStyle = '#5a1010';
        ell(a, -15, 0, 2.6, 5);
        a.fill();
      },
      0.55,
      0.55,
      1
    );
    region(
      'ab_limb',
      40,
      14,
      a => {
        // a long dead human arm used as a leg: thick at the shoulder, wasting to the wrist, sinew and torn skin
        const p = c => {
          c.beginPath();
          c.moveTo(-19, -6.4);
          c.bezierCurveTo(-10, -7.2, -2, -4.4, 6, -4.4);
          c.bezierCurveTo(12, -4.4, 15, -3, 18, -3);
          c.quadraticCurveTo(20.6, 0, 18, 3);
          c.bezierCurveTo(15, 3, 12, 4.6, 6, 4.4);
          c.bezierCurveTo(-2, 4.4, -10, 7.2, -19, 6.4);
          c.quadraticCurveTo(-21.4, 0, -19, -6.4);
          c.closePath();
        };
        p(a);
        a.fillStyle = '#c4b2aa';
        a.fill();
        a.save();
        p(a);
        a.clip();
        for (let i = 0; i < 14; i++) {
          a.fillStyle = pick([
            'rgba(90,50,80,0.25)',
            'rgba(120,30,30,0.25)',
            'rgba(70,80,60,0.2)',
            'rgba(40,30,30,0.22)',
          ]);
          ell(a, rand(-18, 18), rand(-5, 5), rand(1.5, 4.5), rand(1, 2.5), rand(0, 3));
          a.fill();
        }
        for (let i = 0; i < 2; i++) {
          const x = rand(-12, 8);
          a.fillStyle = '#5a1412';
          ell(a, x, rand(-1.5, 1.5), rand(2.5, 4), rand(1.2, 2), rand(-0.3, 0.3));
          a.fill();
          a.strokeStyle = 'rgba(200,120,110,0.45)';
          a.lineWidth = 0.35;
          for (let k = -1; k <= 1; k++) {
            a.beginPath();
            a.moveTo(x - 3, k * 0.6);
            a.lineTo(x + 3, k * 0.6 + rand(-0.3, 0.3));
            a.stroke();
          }
        }
        a.strokeStyle = 'rgba(40,20,20,0.35)';
        a.lineWidth = 0.6;
        for (const y of [-1.8, 0.4, 2]) {
          a.beginPath();
          a.moveTo(-17, y * 1.3);
          a.bezierCurveTo(-6, y * 1.1, 6, y * 0.9, 17, y * 0.5);
          a.stroke();
        }
        a.fillStyle = 'rgba(0,0,0,0.3)';
        ell(a, 6, 0, 2.2, 4.6, 0);
        a.fill();
        a.fillStyle = grad(a, 0, -7, 0, 7, [
          [0, 'rgba(0,0,0,0.5)'],
          [0.32, 'rgba(255,240,230,0.08)'],
          [0.6, 'rgba(0,0,0,0.05)'],
          [1, 'rgba(0,0,0,0.55)'],
        ]);
        a.fillRect(-22, -8, 44, 16);
        a.restore();
        p(a);
        a.strokeStyle = 'rgba(14,10,12,0.55)';
        a.lineWidth = 0.6;
        a.stroke();
      },
      0.25,
      1,
      1.3
    );
  }
  /* ----- Gore ----- */
  region(
    'drop',
    8,
    8,
    a => {
      circ(a, 0, 0, 3);
      a.fillStyle = '#e8e8e8';
      a.fill();
      a.fillStyle = '#ffffff';
      circ(a, -1, -1, 1);
      a.fill();
    },
    0.9,
    1,
    0
  );
  const ragged = (c, pts) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  };
  const stump = (a, x, y, rx, ry, ang = 0) => {
    a.save();
    a.translate(x, y);
    a.rotate(ang); // a torn end seen from above: a ragged dark edge, wet meat just showing, a splinter of bone; not an end-on disc
    const edge = [];
    for (let i = 0; i <= 8; i++) {
      const t = -1 + i / 4;
      edge.push([rand(-rx * 0.5, rx * 0.6), t * ry * 0.95]);
    }
    a.beginPath();
    a.moveTo(rx * 0.9, -ry);
    edge.forEach(([ex, ey]) => a.lineTo(ex, ey));
    a.lineTo(rx * 0.9, ry);
    a.closePath();
    a.fillStyle = '#2e0807';
    a.fill();
    a.beginPath();
    edge.forEach(([ex, ey], i) => (i ? a.lineTo(ex + 0.9, ey * 0.8) : a.moveTo(ex + 0.9, ey * 0.8)));
    a.strokeStyle = 'rgba(92,24,20,0.8)';
    a.lineWidth = 0.9;
    a.stroke();
    a.fillStyle = 'rgba(160,146,116,0.8)';
    a.save();
    a.translate(-rx * 0.2, ry * 0.15);
    a.rotate(rand(-0.4, 0.4));
    rr(a, -rx * 0.9, -0.45, rx * 1.1, 0.9, 0.4);
    a.fill();
    a.restore();
    a.restore();
  };
  for (let k = 0; k < 2; k++)
    region(
      'g_meat' + k,
      18,
      16,
      a => {
        // a torn lump of flesh: clotted, dark and dull, irregular, with a scrap of skin or cloth on it
        const P = [];
        for (let i = 0; i < 11; i++) {
          const g = (i / 11) * TAU,
            r = rand(3.4, 6.6);
          P.push([Math.cos(g) * r * 1.1, Math.sin(g) * r * 0.78]);
        }
        ragged(a, P);
        a.fillStyle = rgrad(
          a,
          0,
          0,
          7,
          [
            [0, '#5a1a16'],
            [0.55, '#3e0e0c'],
            [1, '#220606'],
          ],
          -1.2,
          -1.4
        );
        a.fill();
        a.save();
        ragged(a, P);
        a.clip();
        for (let i = 0; i < 6; i++) {
          a.fillStyle = `rgba(${randi(14, 40)},${randi(2, 8)},${randi(2, 8)},${rand(0.35, 0.6)})`;
          ell(a, rand(-5, 5), rand(-4, 4), rand(1, 2.6), rand(0.7, 1.6), rand(0, 3));
          a.fill();
        }
        a.fillStyle = k ? 'rgba(120,128,104,0.75)' : 'rgba(60,64,72,0.7)';
        ragged(a, [
          [rand(-6, -3), rand(-5, -2)],
          [rand(-1, 2), rand(-6, -4)],
          [rand(1, 4), rand(-2, 0)],
          [rand(-3, 0), rand(0, 2)],
        ]);
        a.fill(); // skin or a scrap of cloth
        a.fillStyle = 'rgba(150,130,100,0.35)';
        ell(a, rand(-2, 2), rand(-1, 2), rand(0.8, 1.6), 0.4, rand(0, 3));
        a.fill(); // a thread of fat
        a.fillStyle = 'rgba(255,230,220,0.08)';
        ell(a, -1.6, -1.8, 2.2, 0.9, 0.4);
        a.fill();
        a.restore();
        ragged(a, P);
        a.strokeStyle = 'rgba(16,2,2,0.55)';
        a.lineWidth = 0.5;
        a.stroke();
      },
      0.35,
      0.9,
      0.7
    ); // wet, but not candy
  region(
    'g_bone',
    16,
    7,
    a => {
      // splintered shaft of bone: one rounded joint end, one jagged break, stained
      const p = c => {
        c.beginPath();
        c.moveTo(-5.2, -1.6);
        c.quadraticCurveTo(-7.6, -2.6, -7.4, 0);
        c.quadraticCurveTo(-7.6, 2.6, -5.2, 1.6);
        c.lineTo(3, 1.2);
        c.lineTo(4.4, 2);
        c.lineTo(5, 0.6);
        c.lineTo(6.8, 1.1);
        c.lineTo(5.6, -0.4);
        c.lineTo(6.4, -1.4);
        c.lineTo(4.2, -1);
        c.lineTo(3, -1.2);
        c.closePath();
      };
      p(a);
      a.fillStyle = grad(a, 0, -2, 0, 2, [
        [0, '#b8ac90'],
        [1, '#7e7258'],
      ]);
      a.fill();
      a.save();
      p(a);
      a.clip();
      a.fillStyle = 'rgba(70,14,10,0.7)';
      ell(a, 4.5, 0, 2.6, 2, 0);
      a.fill();
      ell(a, -6.4, 0.6, 1.2, 1, 0);
      a.fill();
      a.fillStyle = 'rgba(80,40,24,0.35)';
      ell(a, -1, 0.4, 3, 0.8, 0);
      a.fill();
      a.restore();
      p(a);
      a.strokeStyle = 'rgba(30,20,12,0.6)';
      a.lineWidth = 0.45;
      a.stroke();
    },
    0.4,
    1,
    0.5
  );
  const bentLimb = (a, segs, w0, w1, bend) => {
    // a limb lying bent at the joint: two tapering segments, the outline uneven like a real arm or leg
    const [L1, L2] = segs,
      kx = L1 * Math.cos(bend * 0.5),
      ky = L1 * Math.sin(bend * 0.5),
      ex = kx + L2 * Math.cos(-bend * 0.5),
      ey = ky + L2 * Math.sin(-bend * 0.5);
    const seg = (x0, y0, x1, y1, r0, r1) => {
      const an = Math.atan2(y1 - y0, x1 - x0),
        nx = -Math.sin(an),
        ny = Math.cos(an);
      a.beginPath();
      a.moveTo(x0 + nx * r0, y0 + ny * r0);
      a.quadraticCurveTo(
        (x0 + x1) / 2 + nx * (r0 + r1) * 0.58,
        (y0 + y1) / 2 + ny * (r0 + r1) * 0.58,
        x1 + nx * r1,
        y1 + ny * r1
      );
      a.arc(x1, y1, r1, an + Math.PI / 2, an - Math.PI / 2, true);
      a.quadraticCurveTo(
        (x0 + x1) / 2 - nx * (r0 + r1) * 0.5,
        (y0 + y1) / 2 - ny * (r0 + r1) * 0.5,
        x0 - nx * r0,
        y0 - ny * r0
      );
      a.arc(x0, y0, r0, an - Math.PI / 2, an + Math.PI / 2, true);
      a.closePath();
    };
    return { kx, ky, ex, ey, seg };
  };
  region(
    'g_arm',
    30,
    12,
    a => {
      // a torn-off arm lying bent at the elbow: sleeve to the elbow, grey forearm, a curled hand; dark meat at the tear
      a.translate(-11, 0);
      const { kx, ky, ex, ey, seg } = bentLimb(a, [10, 10.5], 3.4, 2.2, 0.8);
      seg(kx, ky, ex, ey, 2.6, 2);
      a.fillStyle = '#7e8672';
      a.fill();
      a.save();
      seg(kx, ky, ex, ey, 2.6, 2);
      a.clip();
      for (let i = 0; i < 5; i++) {
        a.fillStyle = pick(['rgba(80,56,92,0.3)', 'rgba(56,64,40,0.28)', 'rgba(110,30,24,0.25)']);
        ell(a, kx + rand(0, 8), ky + rand(-3, 1), rand(0.8, 2), rand(0.5, 1.1), rand(0, 3));
        a.fill();
      }
      a.fillStyle = 'rgba(0,0,0,0.25)';
      a.fillRect(kx - 4, ky + 0.6, 16, 3);
      a.restore();
      ell(a, ex + 1.6, ey, 2.4, 2.1, -0.3);
      a.fillStyle = '#6a7260';
      a.fill();
      for (let i = 0; i < 4; i++) {
        a.fillStyle = '#727a66';
        ell(a, ex + 3.4, ey - 1.5 + i, 0.9, 0.5, -0.3);
        a.fill();
      } // the hand, fingers curled
      seg(0, 0, kx, ky, 3.6, 2.9);
      a.fillStyle = '#353b46';
      a.fill();
      a.save();
      seg(0, 0, kx, ky, 3.6, 2.9);
      a.clip();
      weave(a, 5, 14, 60, 0.12, 0.05);
      a.fillStyle = 'rgba(0,0,0,0.3)';
      a.fillRect(-4, 1, 16, 4);
      a.fillStyle = 'rgba(50,8,6,0.55)';
      ell(a, 1, 0.4, 3.4, 3, 0);
      a.fill();
      a.restore(); // the sleeve, soaked at the tear
      stump(a, -2.2, 0, 1.6, 3.4, 0.1);
    },
    0.35,
    1,
    0.9
  );
  region(
    'g_leg',
    34,
    13,
    a => {
      // a torn-off leg lying bent at the knee: trouser leg, a worn shoe; dark meat at the tear
      a.translate(-13, 0);
      const { kx, ky, ex, ey, seg } = bentLimb(a, [12.5, 11.5], 4.6, 3, 0.7);
      seg(kx, ky, ex, ey, 3.6, 2.8);
      a.fillStyle = '#d0d0d4';
      a.fill();
      seg(0, 0, kx, ky, 4.8, 3.7);
      a.fill(); // trouser colour is tinted per zombie in the game
      a.save();
      seg(0, 0, kx, ky, 4.8, 3.7);
      seg(kx, ky, ex, ey, 3.6, 2.8);
      a.clip();
      weave(a, 6, 16, 120, 0.12, 0.06);
      a.fillStyle = 'rgba(0,0,0,0.28)';
      a.fillRect(-6, 1.6, 30, 6);
      a.fillStyle = 'rgba(0,0,0,0.18)';
      ell(a, kx, ky, 2.4, 3, 0);
      a.fill();
      a.fillStyle = 'rgba(40,6,6,0.6)';
      ell(a, 1.4, 0.3, 4, 4, 0);
      a.fill();
      grime(a, 4, 14, 4);
      a.restore();
      const an = Math.atan2(ey - ky, ex - kx);
      a.save();
      a.translate(ex, ey);
      a.rotate(an);
      a.beginPath();
      a.moveTo(-1, -3);
      a.quadraticCurveTo(4, -3.6, 6.6, -2);
      a.quadraticCurveTo(8.2, 0, 6.6, 2);
      a.quadraticCurveTo(4, 3.4, -1, 3);
      a.closePath();
      a.fillStyle = grad(a, 0, -3, 0, 3, [
        [0, '#3a3028'],
        [1, '#18120e'],
      ]);
      a.fill();
      a.strokeStyle = 'rgba(8,6,4,0.6)';
      a.lineWidth = 0.5;
      a.stroke();
      a.restore(); // the shoe
      stump(a, -3, 0, 2, 4.6, 0.1);
    },
    0.3,
    1,
    0.9
  );
  region(
    'g_head',
    22,
    22,
    (a, e) => {
      // severed head lying face-down: matted hair, ears, a ragged neck with the spine showing
      a.fillStyle = '#4e0808';
      ell(a, -7.2, 0, 2.6, 3.8);
      a.fill();
      a.fillStyle = '#9a2a24';
      ell(a, -7, 0.2, 1.7, 2.8);
      a.fill();
      a.fillStyle = '#e0d8c0';
      circ(a, -7.3, 0.3, 1.1);
      a.fill();
      a.fillStyle = 'rgba(0,0,0,0.35)';
      circ(a, -7.1, 0.5, 0.45);
      a.fill();
      ears(a, 0.4, 6.3, '#7e8670');
      nose(a, 7.4, '#8a9078');
      zscalp(a, 7.2, 6.1, '#8e9880');
      hairMass(a, -1.4, 6.4, 5.8, '#2a2018', 'rgba(110,90,60,0.4)', [-2.6, 0.6], 60);
      a.save();
      ell(a, 0, 0, 7.2, 6.1);
      a.clip();
      a.fillStyle = 'rgba(80,8,6,0.55)';
      for (let i = 0; i < 3; i++) {
        ell(a, rand(-6, -2), rand(-4, 4), rand(1.2, 2.6), rand(0.8, 1.6), rand(0, 3));
        a.fill();
      }
      a.restore();
      gash(a, 1.5, -2.2, 1.8, 0.4);
      ell(a, 0, 0, 7.2, 6.1);
      a.strokeStyle = 'rgba(14,10,12,0.5)';
      a.lineWidth = 0.5;
      a.stroke();
    },
    0.3,
    0.8,
    1.2
  );

  /* ----- Props ----- */
  region(
    'sonic',
    30,
    30,
    (a, e) => {
      for (const [r, al] of [
        [11, 0.9],
        [7, 0.6],
      ]) {
        a.strokeStyle = `rgba(30,10,40,${al})`;
        a.lineWidth = 4;
        circ(a, 0, 0, r);
        a.stroke();
        a.strokeStyle = `rgba(230,170,255,${al})`;
        a.lineWidth = 2;
        circ(a, 0, 0, r);
        a.stroke();
        e.strokeStyle = `rgba(200,90,255,${al})`;
        e.lineWidth = 2.4;
        circ(e, 0, 0, r);
        e.stroke();
      }
    },
    0.2,
    0.6,
    0
  );
  region(
    'lamp',
    26,
    26,
    (a, e) => {
      shape(
        a,
        c => rr(c, -11, -6, 22, 12, 4),
        grad(a, 0, -6, 0, 6, [
          [0, '#6a6e72'],
          [1, '#2e3034'],
        ]),
        { lw: 1.8 }
      );
      a.fillStyle = '#f6e8c0';
      rr(a, -7, -3.2, 14, 6.4, 3);
      a.fill();
      e.fillStyle = 'rgba(255,220,150,1)';
      rr(e, -7, -3.2, 14, 6.4, 3);
      e.fill();
      shape(a, c => circ(c, -13, 0, 2.6), '#2a2c30', { lw: 1 });
    },
    0.6,
    0.6,
    0.6
  );
  for (let k = 0; k < 2; k++)
    region(
      'crystal' + k,
      54,
      54,
      (a, e) => {
        const body = k ? ['#7a8288', '#3e4448'] : ['#4e6a4a', '#2a3a28'];
        shape(
          a,
          c => rr(c, -20, -20, 40, 40, 4),
          grad(a, -20, -20, 20, 20, [
            [0, body[0]],
            [1, body[1]],
          ]),
          { lw: 1, out: 'rgba(12,14,16,0.6)', speck: 'rgba(120,70,30,0.35)', n: 30, sx: 0.3, sy: 0.3 }
        );
        a.fillStyle = 'rgba(0,0,0,0.35)';
        for (let y = -16; y <= 14; y += 5) a.fillRect(-18, y, 36, 2);
        a.save();
        rr(a, -20, 14, 40, 6, 2);
        a.clip();
        a.fillStyle = '#b8963a';
        a.fillRect(-20, 14, 40, 6);
        a.fillStyle = 'rgba(26,26,26,0.85)';
        for (let x = -24; x < 24; x += 7) {
          a.beginPath();
          a.moveTo(x, 20);
          a.lineTo(x + 4, 12);
          a.lineTo(x + 7, 12);
          a.lineTo(x + 3, 20);
          a.fill();
        }
        a.restore();
        shape(a, c => rr(c, -8, -8, 16, 12, 1.5), '#e8e0c8', { lw: 1.2 });
        a.fillStyle = '#c01818';
        a.beginPath();
        a.moveTo(0, -6);
        a.lineTo(-3, 0);
        a.lineTo(0, -1);
        a.lineTo(-1, 3);
        a.lineTo(3, -2);
        a.lineTo(0, -1.5);
        a.closePath();
        a.fill();
        for (const c of [a, e]) {
          c.fillStyle = c === a ? '#9ff0ff' : 'rgba(120,220,255,1)';
          circ(c, 14, -14, 2.6);
          c.fill();
        }
      },
      0.55,
      0.4,
      1.2
    );
  const deadTree = bark => a => {
    // a dead street tree from above: two or three heavy limbs off to one side, tapering, bending, splitting into twigs; never a neat star
    const segs = [],
      tips = [];
    const branch = (x, y, g, L, w, d) => {
      if (d > 5 || L < 5 || w < 0.7 || Math.hypot(x, y) > 100) {
        tips.push([x, y]);
        return;
      }
      const bend = rand(-0.4, 0.4),
        mx = x + Math.cos(g) * L * 0.5,
        my = y + Math.sin(g) * L * 0.5,
        g2 = g + bend,
        x2 = mx + Math.cos(g2) * L * 0.5,
        y2 = my + Math.sin(g2) * L * 0.5,
        wm = w * 0.86,
        w2 = w * 0.68;
      segs.push([x, y, mx, my, w, wm], [mx, my, x2, y2, wm, w2]);
      const n = d < 2 ? randi(2, 3) : randi(1, 3);
      for (let i = 0; i < n; i++) {
        const side = i === 0 ? rand(-0.25, 0.25) : (i % 2 ? 1 : -1) * rand(0.45, 1.0);
        branch(x2, y2, g2 + side, L * rand(0.55, 0.8) * (i ? 0.85 : 1), w2 * (i ? 0.62 : 0.9), d + 1);
      }
    };
    const lean = rand(0, TAU),
      nMain = randi(2, 3);
    for (let i = 0; i < nMain; i++)
      branch(
        0,
        0,
        lean + (i - (nMain - 1) / 2) * rand(0.9, 1.4) + rand(-0.3, 0.3),
        rand(30, 40) * (i ? 0.85 : 1.1),
        i ? 7.5 : 10,
        0
      );
    if (Math.random() < 0.75) branch(0, 0, lean + Math.PI + rand(-0.6, 0.6), rand(14, 22), 4.5, 3); // a short stub on the far side
    const seg = (q, grow, col) => {
      const [x, y, x2, y2, w0, w1] = q,
        g = Math.atan2(y2 - y, x2 - x),
        nx = -Math.sin(g),
        ny = Math.cos(g),
        u0 = (w0 + grow) / 2,
        u1 = (w1 + grow) / 2;
      a.fillStyle = col;
      a.beginPath();
      a.moveTo(x + nx * u0, y + ny * u0);
      a.lineTo(x2 + nx * u1, y2 + ny * u1);
      a.lineTo(x2 - nx * u1, y2 - ny * u1);
      a.lineTo(x - nx * u0, y - ny * u0);
      a.closePath();
      a.fill();
      circ(a, x2, y2, u1);
      a.fill();
    };
    for (const q of segs) seg(q, 1.2, 'rgba(14,10,8,0.32)'); // a soft dark edge where the bark turns away, not an ink outline
    for (const q of segs) seg(q, 0, bark);
    a.lineCap = 'round';
    for (const q of segs)
      if (q[4] > 3) {
        const [x, y, x2, y2, w0] = q,
          g = Math.atan2(y2 - y, x2 - x),
          o = w0 * 0.22;
        a.strokeStyle = 'rgba(255,236,210,0.13)';
        a.lineWidth = Math.max(0.8, w0 * 0.22);
        a.beginPath();
        a.moveTo(x - Math.sin(g) * o, y + Math.cos(g) * o);
        a.lineTo(x2 - Math.sin(g) * o, y2 + Math.cos(g) * o);
        a.stroke();
      } // light catching the top of the limbs
    for (let i = 0; i < 22; i++) {
      const t = pick(tips);
      if (!t) break;
      a.fillStyle = `rgba(${randi(80, 110)},${randi(62, 80)},${randi(34, 48)},${rand(0.55, 0.85)})`;
      ell(a, t[0] + rand(-6, 6), t[1] + rand(-6, 6), rand(1.8, 3.2), rand(1, 1.8), rand(0, 3));
      a.fill();
    } // a few dead leaves still hanging on
    a.fillStyle = bark;
    circ(a, 0, 0, 9);
    a.fill();
    radial(a, -1.5, -1.5, 9, [
      [0, 'rgba(255,236,210,0.1)'],
      [0.7, 'rgba(0,0,0,0)'],
      [1, 'rgba(0,0,0,0.25)'],
    ]); // the crown where the limbs leave the trunk, rounded off, no outline
  };
  region('canopy0', 220, 220, deadTree('#4a3c30'), 0.05, 0.3, 1.6);
  region('canopy1', 220, 220, deadTree('#3e3830'), 0.05, 0.3, 1.6);
  region('canopy2', 220, 220, deadTree('#52463a'), 0.05, 0.3, 1.6);
  for (let k = 0; k < 4; k++)
    region(
      'grass' + k,
      26,
      26,
      a => {
        const cols = ['#5e5e3a', '#6a6444', '#545838', '#726a48'];
        for (let i = 0; i < 10; i++) {
          const g = -Math.PI / 2 + rand(-1.3, 1.3),
            L = rand(6, 11),
            bx = rand(-3, 3),
            by = rand(4, 8);
          a.strokeStyle = 'rgba(30,28,16,0.22)';
          a.lineWidth = 1.7;
          a.beginPath();
          a.moveTo(bx, by);
          a.quadraticCurveTo(
            bx + Math.cos(g) * L * 0.5 + rand(-2, 2),
            by + Math.sin(g) * L * 0.5,
            bx + Math.cos(g) * L,
            by + Math.sin(g) * L
          );
          a.stroke();
          a.strokeStyle = pick(cols);
          a.lineWidth = 1.3;
          a.stroke();
        }
      },
      0.1,
      0.25,
      1.4
    );
  region(
    'acid',
    24,
    24,
    (a, e) => {
      const pts = [];
      for (let i = 0; i < 9; i++) {
        const g = (i / 9) * TAU,
          r = rand(5.5, 8.5);
        pts.push([Math.cos(g) * r, Math.sin(g) * r]);
      }
      const p = c => {
        c.beginPath();
        pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
      };
      shape(
        a,
        p,
        rgrad(
          a,
          0,
          0,
          9,
          [
            [0, '#c8b850'],
            [0.6, '#8a7a2a'],
            [1, '#4a3c14'],
          ],
          -2,
          -2
        ),
        { lw: 1, out: 'rgba(30,24,8,0.9)', aoW: 2 }
      );
      a.fillStyle = 'rgba(60,40,10,0.5)';
      for (let i = 0; i < 4; i++) {
        circ(a, rand(-4, 4), rand(-4, 4), rand(0.6, 1.4));
        a.fill();
      }
      radial(e, 0, 0, 7, [
        [0, 'rgba(150,140,40,0.35)'],
        [1, 'rgba(150,140,40,0)'],
      ]);
    },
    0.6,
    0.8,
    0.6
  );
  region(
    'crate',
    34,
    34,
    (a, e) => {
      shape(
        a,
        c => rr(c, -15, -15, 30, 30, 4),
        grad(a, -15, -15, 15, 15, [
          [0, '#d6c08a'],
          [1, '#8a6c3a'],
        ]),
        { lw: 2.2 }
      );
      a.strokeStyle = '#5a4424';
      a.lineWidth = 2.2;
      a.beginPath();
      a.moveTo(-15, -15);
      a.lineTo(15, 15);
      a.moveTo(15, -15);
      a.lineTo(-15, 15);
      a.stroke();
      shape(a, c => rr(c, -15, -3, 30, 6, 1.5), '#ff8a2a', { lw: 1.2 });
      e.fillStyle = 'rgba(255,140,40,0.9)';
      e.fillRect(-15, -3, 30, 6);
      shape(a, c => circ(c, 0, 0, 5.5), '#f6f0e4', { lw: 1.4 });
      a.fillStyle = '#ff7a2f';
      a.fillRect(-1.2, -3.6, 2.4, 7.2);
      a.fillRect(-3.6, -1.2, 7.2, 2.4);
    },
    0.4,
    0.5,
    1.2
  );
  region(
    'chute2',
    120,
    120,
    a => {
      // military cargo canopy from above: 24 olive-drab gores, each one bellied out by the air between its tapes, lit from the moon's side, an open crown vent
      const R0 = 56,
        N = 24,
        LA = Math.atan2(-0.56, -0.48);
      for (let i = 0; i < N; i++) {
        const g0 = (i / N) * TAU,
          g1 = ((i + 1) / N) * TAU,
          gm = (g0 + g1) / 2,
          lit = 0.5 + 0.5 * Math.cos(gm - LA);
        const wedge = c => {
          c.beginPath();
          c.moveTo(0, 0);
          for (let k = 0; k <= 10; k++) {
            const g = lerp(g0, g1, k / 10),
              r = R0 * (0.91 + 0.09 * Math.sin((k / 10) * Math.PI));
            c.lineTo(Math.cos(g) * r, Math.sin(g) * r);
          }
          c.closePath();
        };
        wedge(a);
        a.fillStyle = ['#5f6b47', '#58643f', '#626e49', '#5b6743'][i % 4];
        a.fill();
        a.save();
        wedge(a);
        a.clip();
        const px = -Math.sin(gm),
          py = Math.cos(gm),
          w = R0 * Math.sin(Math.PI / N);
        for (const r of [R0 * 0.35, R0 * 0.62, R0 * 0.9]) {
          const cx = Math.cos(gm) * r,
            cy = Math.sin(gm) * r,
            ww = ((w * r) / R0) * 1.15; // across the gore: dark at the seams, the cloth swelling out in the middle
          a.fillStyle = grad(a, cx - px * ww, cy - py * ww, cx + px * ww, cy + py * ww, [
            [0, 'rgba(10,14,6,0.25)'],
            [0.5 - 0.18 * (lit - 0.5), `rgba(255,252,225,${(0.05 + lit * 0.13).toFixed(3)})`],
            [1, 'rgba(10,14,6,0.25)'],
          ]);
          a.fillRect(cx - R0 * 0.2, cy - R0 * 0.2, R0 * 0.4, R0 * 0.4);
        }
        a.fillStyle = `rgba(0,0,0,${(0.2 * (1 - lit)).toFixed(3)})`;
        a.fillRect(-R0, -R0, R0 * 2, R0 * 2);
        a.restore();
      }
      a.fillStyle = rgrad(
        a,
        0,
        0,
        R0,
        [
          [0, 'rgba(255,255,236,0.16)'],
          [0.45, 'rgba(0,0,0,0)'],
          [0.85, 'rgba(0,0,0,0.16)'],
          [1, 'rgba(0,0,0,0.38)'],
        ],
        -14,
        -16
      );
      a.beginPath();
      a.arc(0, 0, R0, 0, TAU);
      a.fill();
      a.strokeStyle = 'rgba(34,38,24,0.5)';
      a.lineWidth = 0.9;
      for (let i = 0; i < N; i++) {
        const g = (i / N) * TAU;
        a.beginPath();
        a.moveTo(Math.cos(g) * 8, Math.sin(g) * 8);
        a.lineTo(Math.cos(g) * R0 * 0.91, Math.sin(g) * R0 * 0.91);
        a.stroke();
      }
      a.strokeStyle = 'rgba(30,34,20,0.22)';
      a.lineWidth = 0.8;
      for (const r of [0.36, 0.6, 0.8]) {
        a.beginPath();
        for (let k = 0; k <= 96; k++) {
          const g = (k / 96) * TAU,
            rr2 = R0 * r * (0.97 + 0.03 * Math.abs(Math.sin((g * N) / 2)));
          k ? a.lineTo(Math.cos(g) * rr2, Math.sin(g) * rr2) : a.moveTo(Math.cos(g) * rr2, Math.sin(g) * rr2);
        }
        a.stroke();
      }
      a.strokeStyle = 'rgba(46,52,34,0.85)';
      a.lineWidth = 2.4;
      a.beginPath();
      for (let k = 0; k <= N * 10; k++) {
        const g = (k / (N * 10)) * TAU,
          rr2 = R0 * (0.895 + 0.085 * Math.abs(Math.sin((g * N) / 2)));
        k ? a.lineTo(Math.cos(g) * rr2, Math.sin(g) * rr2) : a.moveTo(Math.cos(g) * rr2, Math.sin(g) * rr2);
      }
      a.stroke(); // the scalloped skirt hem
      a.fillStyle = '#1b1e14';
      a.beginPath();
      a.arc(0, 0, 6.5, 0, TAU);
      a.fill();
      a.strokeStyle = 'rgba(130,138,104,0.6)';
      a.lineWidth = 0.6;
      for (let i = 0; i < 6; i++) {
        const g = (i / 6) * Math.PI;
        a.beginPath();
        a.moveTo(Math.cos(g) * 6.5, Math.sin(g) * 6.5);
        a.lineTo(-Math.cos(g) * 6.5, -Math.sin(g) * 6.5);
        a.stroke();
      }
      a.strokeStyle = '#48523a';
      a.lineWidth = 1.8;
      a.beginPath();
      a.arc(0, 0, 7.2, 0, TAU);
      a.stroke();
    },
    0.08,
    0.9,
    0.6
  );
  region(
    'chutedn',
    132,
    64,
    a => {
      // the canopy collapsed on the ground, as it lies after landing: narrow where the lines gather, fanning out downwind to a crumpled skirt, gores running the length of it
      const P0 = [-60, 0],
        top = [],
        bot = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10,
          x = -60 + t * 116,
          w = 3 + Math.pow(t, 0.8) * 25;
        top.push([x, -w + Math.sin(t * 9) * 2.2 * t]);
        bot.push([x, w + Math.sin(t * 7 + 1) * 2.4 * t]);
      }
      const skirt = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8,
          y = lerp(top[10][1], bot[10][1], t);
        skirt.push([56 + Math.sin(t * 13) * 4 + (k % 2 ? 3 : -1), y]);
      }
      const outline = c => {
        c.beginPath();
        c.moveTo(...P0);
        for (const q of top) c.lineTo(...q);
        for (const q of skirt) c.lineTo(...q);
        for (let k = bot.length - 1; k >= 0; k--) c.lineTo(...bot[k]);
        c.closePath();
      };
      outline(a);
      a.fillStyle = grad(a, -60, -20, 60, 20, [
        [0, '#4e5839'],
        [0.6, '#57613f'],
        [1, '#4d5738'],
      ]);
      a.fill();
      a.save();
      outline(a);
      a.clip();
      for (let k = 0; k < 9; k++) {
        const t = (k + 0.5) / 9,
          y1 = lerp(top[10][1], bot[10][1], t);
        a.strokeStyle = k % 2 ? 'rgba(0,0,0,0.26)' : 'rgba(255,255,228,0.12)';
        a.lineWidth = k % 2 ? 1.4 : 2.2;
        a.beginPath();
        a.moveTo(-58, 0);
        a.bezierCurveTo(-20, y1 * 0.35 + rand(-3, 3), 20, y1 * 0.8 + rand(-4, 4), 56, y1);
        a.stroke();
      }
      for (let k = 0; k < 7; k++) {
        const x = rand(-30, 45),
          y = rand(-14, 14);
        a.fillStyle = k % 2 ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,230,0.08)';
        a.beginPath();
        a.ellipse(x, y, rand(6, 12), rand(3, 6), rand(-0.5, 0.5), 0, TAU);
        a.fill();
      }
      a.restore();
      a.strokeStyle = '#353e2a';
      a.lineWidth = 2.6;
      a.beginPath();
      a.moveTo(...skirt[0]);
      for (const q of skirt) a.lineTo(...q);
      a.stroke();
      outline(a);
      a.strokeStyle = 'rgba(14,14,10,0.55)';
      a.lineWidth = 0.9;
      a.stroke();
    },
    0.06,
    0.9,
    0.6
  );
  region(
    'bf_wing',
    14,
    12,
    a => {
      ell(a, 0, 0, 6, 5);
      a.fillStyle = grad(a, -6, 0, 6, 0, [
        [0, '#8a8274'],
        [1, '#d8d0c0'],
      ]);
      a.fill();
      a.strokeStyle = OUT;
      a.lineWidth = 1;
      a.stroke();
      a.fillStyle = OUT;
      circ(a, 2, 1, 1.2);
      a.fill();
    },
    0.3,
    0.8,
    0.3
  );
}
