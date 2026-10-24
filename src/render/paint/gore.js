/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: gore: gibs, stumps, blood
import { circ, ell, grad, region, rgrad, rr } from '../atlas.js';
import { TAU, pick, rand, randi } from '../../core/util.js';
import { ears, gash, grime, hairMass, nose, weave, zscalp } from './figure.js';
export function paintGore() {
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
}
