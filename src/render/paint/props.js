/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: props and pickups
import { OUT, circ, ell, grad, radial, region, rgrad, rr, shape } from '../atlas.js';
import { TAU, lerp, pick, rand, randi } from '../../core/util.js';
export function paintProps() {
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
