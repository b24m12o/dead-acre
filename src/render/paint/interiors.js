/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: interiors: plaster walls, furniture seen from above
import { circ, ell, grad, radial, region, rgrad, rr, shape } from '../atlas.js';
import { TAU, pick, rand } from '../../core/util.js';
export function paintInteriors() {
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
}
