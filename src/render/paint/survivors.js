/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: the survivors you play and lead, seen from above, facing +x
import { circ, ell, grad, radial, region, rgrad, rr, shape } from '../atlas.js';
import { TAU, pick, rand } from '../../core/util.js';
export function paintSurvivors() {
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
    'h_revolver',
    140,
    30,
    a => {
      // six-shot revolver from above: wooden grip under the hand, hammer spur, the fluted cylinder bulging either side,
      // then a long round barrel with its ejector rod alongside and a blade sight at the muzzle
      rr(a, -5, -2.4, 6.5, 4.8, 1.8);
      a.fillStyle = grad(a, 0, -2.4, 0, 2.4, [
        [0, '#6a4426'],
        [0.5, '#4a2c16'],
        [1, '#2a180c'],
      ]);
      a.fill();
      a.fillStyle = '#1c1c1e';
      rr(a, -1.6, -1.3, 2.2, 2.6, 0.6);
      a.fill();
      a.fillStyle = '#2c2d30';
      rr(a, -3.2, -0.55, 2.4, 1.1, 0.5);
      a.fill();
      a.fillStyle = grad(a, 0, -1.1, 0, 1.1, [
        [0, '#5a5d62'],
        [0.5, '#3a3c40'],
        [1, '#1e1f22'],
      ]);
      rr(a, 6, -1.1, 12.4, 2.2, 1);
      a.fill();
      a.fillStyle = '#26272a';
      rr(a, 7, 1, 7.5, 0.7, 0.3);
      a.fill();
      rr(a, 0.4, -3.1, 6.2, 6.2, 2.4);
      a.fillStyle = grad(a, 0, -3.1, 0, 3.1, [
        [0, '#5c5f64'],
        [0.4, '#404247'],
        [1, '#17181a'],
      ]);
      a.fill();
      a.fillStyle = 'rgba(0,0,0,0.5)';
      for (const y of [-2.1, 0, 2.1]) a.fillRect(1.2, y - 0.3, 4.6, 0.6);
      a.fillStyle = 'rgba(255,255,255,0.14)';
      a.fillRect(0.9, -2.8, 5.2, 0.45);
      a.fillRect(6.4, -0.95, 11.6, 0.4);
      a.fillStyle = '#101012';
      a.fillRect(17, -0.35, 1.2, 0.7);
      a.fillStyle = '#060606';
      circ(a, 18.5, 0, 0.6);
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
}
