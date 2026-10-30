/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: the town in 2.5D: wall tops and fronts, windows, roofs, cars, ground
import { circ, ell, grad, region, rr, shape } from '../atlas.js';
import { TAU, pick, rand, randi } from '../../core/util.js';
export function paintBlocks() {
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
  // the fuel tanker and the fuel van: a polished round tank you can read from above, banded, with its catwalk and
  // hatches, FUEL in red down its back, flammable placards at the end, and a red cab
  const tank = (a, x0, x1, W, big) => {
    shape(
      a,
      c => rr(c, x0, -W / 2, x1 - x0, W, W * 0.45),
      grad(a, 0, -W / 2, 0, W / 2, [
        [0, '#6e7378'],
        [0.22, '#c9ced2'],
        [0.42, '#f4f6f6'],
        [0.6, '#b9bec2'],
        [1, '#4d5257'],
      ]),
      { lw: 2.2, out: '#141210' }
    ); // round from above: dark at the sides, a bright highlight along the top
    a.strokeStyle = 'rgba(30,32,36,0.45)';
    a.lineWidth = 1.2;
    for (let x = x0 + 10; x < x1 - 4; x += big ? 17 : 13) {
      a.beginPath();
      a.moveTo(x, -W / 2 + 1);
      a.lineTo(x, W / 2 - 1);
      a.stroke();
    } // the bands
    a.fillStyle = 'rgba(40,42,46,0.55)';
    a.fillRect(x0 + 6, -2.2, x1 - x0 - 12, 4.4); // catwalk
    for (let i = 0; i < (big ? 3 : 1); i++) {
      a.beginPath();
      a.arc(x0 + (x1 - x0) * (big ? 0.25 + i * 0.25 : 0.7), 0, big ? 4.5 : 3.6, 0, TAU);
      a.fillStyle = '#9aa0a5';
      a.fill();
      a.strokeStyle = '#2a2d31';
      a.lineWidth = 1;
      a.stroke();
    } // hatches
    a.save();
    a.font = `900 ${big ? 15 : 10}px Kanit, Arial, sans-serif`;
    a.textAlign = 'center';
    a.textBaseline = 'middle';
    const tx = x0 + (x1 - x0) * (big ? 0.5 : 0.6);
    a.lineWidth = 3;
    a.strokeStyle = 'rgba(255,255,255,0.85)';
    a.strokeText('FUEL', tx, W * 0.26);
    a.fillStyle = '#c8261c';
    a.fillText('FUEL', tx, W * 0.26);
    a.strokeText('FUEL', tx, -W * 0.26);
    a.fillText('FUEL', tx, -W * 0.26);
    a.restore();
    for (const sy of [-1, 1]) {
      a.save();
      a.translate(x0 + 7, (sy * W) / 4);
      a.rotate(Math.PI / 4);
      a.fillStyle = '#d42a1e';
      a.fillRect(-4, -4, 8, 8);
      a.strokeStyle = '#fff';
      a.lineWidth = 0.8;
      a.strokeRect(-3, -3, 6, 6);
      a.restore();
    } // red flammable placards on the back
  };
  const cab = (a, x0, x1, W) => {
    shape(
      a,
      c => rr(c, x0, -W / 2 + 2, x1 - x0, W - 4, 7),
      grad(a, 0, -W / 2, 0, W / 2, [
        [0, '#c0392b'],
        [0.5, '#a3271c'],
        [1, '#5e140e'],
      ]),
      { lw: 2, out: '#141210' }
    );
    a.fillStyle = '#24303a';
    rr(a, x0 + (x1 - x0) * 0.45, -W / 2 + 5, 9, W - 10, 3);
    a.fill();
  };
  const wheels = (a, L, W) => {
    a.fillStyle = 'rgba(0,0,0,0.55)';
    for (const wx of [-L * 0.31, L * 0.31])
      for (const sy of [-1, 1]) {
        rr(a, wx - 8, sy * (W / 2 + 1) - 4, 16, 8, 3);
        a.fill();
      }
  };
  region(
    'tanker',
    124,
    52,
    a => {
      wheels(a, 118, 44);
      tank(a, -59, 24, 44, true);
      cab(a, 27, 59, 44);
    },
    0.55,
    0.3,
    0.8
  );
  region(
    'fuelvan',
    84,
    46,
    a => {
      wheels(a, 78, 38);
      tank(a, -39, 10, 36, false);
      cab(a, 12, 39, 38);
    },
    0.55,
    0.3,
    0.8
  );
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
}
