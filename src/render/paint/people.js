/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: realistic people from straight above: the infected, their heads, hands and clothes
import { circ, ell, grad, region, rgrad, rr, shape } from '../atlas.js';
import { TAU, lerp, pick, rand, randi } from '../../core/util.js';
import { ZSHIRT } from '../draw-enemies.js';
import { SHP, ears, gash, grime, hairMass, nose, spline, weave, zscalp } from './figure.js';
export function paintPeople() {
  /* ----- realistic people seen from straight above (all face +x); these replace the older round sprites ----- */
  const EDGE = 'rgba(14,10,12,0.6)';
  // upper body outline: shoulder caps, flat-ish chest and back, f pushes the shoulders forward (hunch)
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
      a.stroke(); // rain-worn highlight on the cape shoulders
      a.strokeStyle = '#7a6440';
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
      } // a coil of grave rope slung across the back
      a.fillStyle = '#2e2a22';
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
}
