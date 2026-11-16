/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The town as the people who left it left it. What they sprayed on the street on their way out, a few words to whoever
// came after, different in every place; and at St. Mary's, what the children dropped on the school's front walk when
// the buses came for them (the buses got out: the radio says so). Painted into the ground when a place is built.
import { TAU, pick, rand, randi } from '../core/util.js';

export const MARKS = {
  main: ['WE WENT NORTH', 'NO FOOD HERE', 'BUSES TO ST MARYS', 'DONT DRINK THE WATER'],
  clinic: ['EVAC POINT', 'ALL KIDS ON BUS 3', 'NO MORE BEDS', 'PICK UP HERE 6AM'],
  gas: ['NO GAS', 'RT 9 CLOSED', 'ARMY WENT NORTH', 'DONT STOP'],
  motel: ['ROOM 12 OK', 'DONT OPEN', 'BITTEN = OUT'],
  quarry: ['CONVOY LEFT', 'WAIT FOR US', 'NOT IN THE PIT'],
  bridge: ['BRIDGE HOLDS', 'THEY SWIM', 'CROSS BY DAY'],
  hill: ['DONT GO UP', 'THEY RISE AT NIGHT', 'PRAY'],
  hospital: ['NO ROOM', 'HELIPAD THIS WAY', 'GOD HELP US'],
};
const INK = ['#b23a2c', '#ded6c2', '#1c1c1e', '#cf7a2a']; // red, white, black and orange cans
// one message, sprayed by hand: a soft edge of overspray, a second pass that doesn't quite line up, specks round it
function spray(a, sc, x, y, txt, rot, col, size) {
  a.save();
  a.translate(x, y);
  a.rotate(rot);
  a.font = `900 ${size}px Kanit, Impact, sans-serif`;
  a.textAlign = 'center';
  a.textBaseline = 'middle';
  a.fillStyle = col;
  a.shadowColor = col;
  const w = a.measureText(txt).width;
  let x0 = -w / 2;
  for (const ch of txt) {
    const cw = a.measureText(ch).width,
      dy = rand(-1.6, 1.6),
      r = rand(-0.07, 0.07),
      k = rand(0.9, 1.08); // each letter by hand: a little off its line, its own tilt and size
    a.save();
    a.translate(x0 + cw / 2, dy);
    a.rotate(r);
    a.scale(k, k);
    a.shadowBlur = size * 0.16 * sc;
    a.globalAlpha = rand(0.36, 0.48);
    a.fillText(ch, 0, 0);
    a.shadowBlur = 0;
    a.globalAlpha = 0.24;
    a.fillText(ch, rand(-1.2, 1.2), rand(-1.2, 1.2));
    a.restore();
    x0 += cw * rand(0.98, 1.06);
  }
  for (let i = 0; i < w * 0.7; i++) {
    a.globalAlpha = rand(0.12, 0.38);
    a.fillRect(rand(-w / 2 - 8, w / 2 + 8), rand(-size * 0.75, size * 0.75), rand(0.6, 1.7), rand(0.6, 1.7));
  }
  a.restore();
}
// the messages for place id, each on open street or pavement, apart from each other: where they went, for the tests
export function paintMarks(a, { id, sc, ROAD, at, MW, MH, TILE, isWall, avoid }) {
  const words = MARKS[id],
    placed = [];
  if (!words) return placed;
  const open = (tx, ty, w, h) => {
    for (let y = ty; y < ty + h; y++)
      for (let x = tx; x < tx + w; x++) if (!ROAD[at(x, y)] || isWall(x, y)) return false;
    return true;
  };
  for (const txt of words) {
    const size = rand(22, 30),
      wT = Math.ceil((txt.length * size * 0.66) / TILE) + 1,
      hT = 2;
    for (let t = 0; t < 600; t++) {
      const tx = randi(3, MW - 4 - wT),
        ty = randi(3, MH - 3 - hT);
      if (!open(tx, ty, wT, hT)) continue;
      const x = (tx + wT / 2) * TILE,
        y = (ty + hT / 2) * TILE;
      if (placed.some(p => Math.hypot(p.x - x, p.y - y) < 300) || (avoid && avoid(x, y))) continue;
      spray(a, sc, x, y, txt, rand(-0.16, 0.16), pick(INK), size);
      placed.push({ x, y, txt });
      break;
    }
  }
  return placed;
}
// what was dropped on a school's front walk, from (x0, y0) to (x1, y1) in px: backpacks, loose pages, a shoe, a lunchbox
export function paintSchool(a, x0, y0, x1, y1) {
  const dirt = (c, k) => c.map(v => Math.round(v * k));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const bags = [
    [178, 52, 48],
    [44, 84, 150],
    [222, 170, 40],
    [60, 130, 80],
    [130, 60, 140],
    [230, 110, 150],
  ];
  const out = [];
  for (let i = 0; i < 16; i++) {
    const x = rand(x0, x1),
      y = rand(y0, y1),
      r = rand(0, TAU),
      k = pick(['bag', 'bag', 'bag', 'page', 'page', 'page', 'shoe', 'lunch']);
    a.save();
    a.translate(x, y);
    a.rotate(r);
    if (k === 'bag') {
      const c = dirt(pick(bags), rand(0.62, 0.82));
      a.fillStyle = 'rgba(0,0,0,0.28)';
      a.beginPath();
      a.ellipse(1.5, 2, 9, 7, 0, 0, TAU);
      a.fill(); // its shadow on the concrete
      a.fillStyle = rgb(c);
      a.beginPath();
      a.roundRect(-8, -6, 16, 12, 3.5);
      a.fill();
      a.fillStyle = rgb(dirt(c, 0.78));
      a.beginPath();
      a.roundRect(-8, -6, 16, 5, [3.5, 3.5, 1, 1]);
      a.fill(); // the flap
      a.fillStyle = rgb(dirt(c, 0.88));
      a.fillRect(-5, 1, 10, 4); // the front pocket
      a.strokeStyle = 'rgba(30,30,32,0.75)';
      a.lineWidth = 1.2;
      a.beginPath();
      a.moveTo(-6, 6);
      a.quadraticCurveTo(-9, 11, -3, 12);
      a.moveTo(6, 6);
      a.quadraticCurveTo(10, 10, 4, 12);
      a.stroke(); // the straps, splayed where it was dropped
    } else if (k === 'page') {
      a.fillStyle = `rgba(226,222,208,${rand(0.55, 0.8)})`;
      a.fillRect(-4.5, -6, 9, 12);
      a.strokeStyle = 'rgba(90,110,150,0.35)';
      a.lineWidth = 0.5;
      for (let l = -3.5; l < 5; l += 1.8) {
        a.beginPath();
        a.moveTo(-3.5, l);
        a.lineTo(3.5, l);
        a.stroke();
      }
      if (Math.random() < 0.5) {
        a.strokeStyle = `rgba(${pick(['200,60,50', '60,120,200', '230,170,40'])},0.6)`;
        a.lineWidth = 0.9;
        a.beginPath();
        a.arc(rand(-1, 1), rand(-2, 2), rand(1.5, 2.6), 0, TAU);
        a.stroke(); // a drawing on it
      }
    } else if (k === 'shoe') {
      a.fillStyle = 'rgba(0,0,0,0.25)';
      a.beginPath();
      a.ellipse(1, 1.5, 6.5, 3.4, 0, 0, TAU);
      a.fill();
      a.fillStyle = '#d4d0c6';
      a.beginPath();
      a.ellipse(0, 0, 6, 3, 0, 0, TAU);
      a.fill();
      a.fillStyle = pick(['#c04040', '#3a6ab0', '#e0a020']);
      a.fillRect(-2, -3, 1.6, 6); // the stripe
    } else {
      a.fillStyle = 'rgba(0,0,0,0.25)';
      a.fillRect(-5, -3, 11, 8);
      a.fillStyle = pick(['#b83a36', '#3a7a5a', '#4a5ab0']);
      a.beginPath();
      a.roundRect(-6, -4, 11, 8, 1.5);
      a.fill();
      a.strokeStyle = 'rgba(30,30,32,0.7)';
      a.lineWidth = 1;
      a.beginPath();
      a.moveTo(-3, -4);
      a.quadraticCurveTo(-0.5, -7, 2, -4);
      a.stroke(); // a lunchbox, its handle up
    }
    a.restore();
    out.push({ x, y, k });
  }
  return out;
}
