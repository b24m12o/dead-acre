/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Drawing helpers shared by the painted people: body outlines, cloth, grime, faces, hair, scalps, wounds
import { TAU, pick, rand, randi } from '../../core/util.js';
import { ell, grad, rgrad } from '../atlas.js';
export const spline = (c, P) => {
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

export const SHP = (c, hw, hd, f = 0, tp = 0) => {
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

export const weave = (a, hw, hd, n, dark = 0.15, light = 0.085) => {
  for (let i = 0; i < n; i++) {
    a.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${dark})` : `rgba(255,255,255,${light})`;
    a.fillRect(rand(-hd, hd), rand(-hw, hw), rand(0.55, 1.75), rand(0.35, 0.95));
  }
};

export const grime = (a, hw, hd, n) => {
  for (let i = 0; i < Math.ceil(n * 1.35); i++) {
    const stain = Math.random() < 0.18;
    a.fillStyle = stain
      ? `rgba(${randi(52, 86)},${randi(24, 39)},${randi(21, 32)},${rand(0.15, 0.3)})`
      : `rgba(${randi(40, 70)},${randi(34, 52)},${randi(22, 36)},${rand(0.18, 0.4)})`;
    ell(a, rand(-hd, hd), rand(-hw, hw), rand(1.8, 4.8), rand(1.1, 3.2), rand(0, 3));
    a.fill();
  }
};

export const nose = (a, x, col) => {
  a.fillStyle = col;
  ell(a, x, 0, 1.7, 1.5);
  a.fill();
  a.fillStyle = 'rgba(0,0,0,0.25)';
  ell(a, x - 0.6, 0, 0.8, 1.6);
  a.fill();
};

export const ears = (a, x, y, col) => {
  for (const s of [-1, 1]) {
    a.fillStyle = col;
    ell(a, x, s * y, 1.8, 1.1);
    a.fill();
    a.strokeStyle = 'rgba(0,0,0,0.35)';
    a.lineWidth = 0.5;
    a.stroke();
  }
};

export const hairMass = (a, x, rx, ry, base, hi, whorl = [-3, 1], n = 70, front = 0.9) => {
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

export const zscalp = (a, rx, ry, skin) => {
  ell(a, 0, 0, rx, ry);
  a.fillStyle = skin;
  a.fill();
  a.save();
  ell(a, 0, 0, rx, ry);
  a.clip();
  for (let i = 0; i < 24; i++) {
    a.fillStyle = pick(['rgba(90,70,80,0.32)', 'rgba(60,70,40,0.34)', 'rgba(120,110,90,0.27)', 'rgba(118,48,40,0.16)']);
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

export const gash = (a, x, y, l, g) => {
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
