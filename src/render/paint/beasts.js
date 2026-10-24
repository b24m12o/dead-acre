/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: the abomination and the dog
import { circ, ell, grad, radial, region, rgrad, rr, shape } from '../atlas.js';
import { TAU, lerp, pick, rand } from '../../core/util.js';
import { SHP } from './figure.js';
export function paintBeasts() {
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
        a.fill(); // old bone, bloodied toward the point
        a.strokeStyle = 'rgba(60,40,30,0.6)';
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
}
