/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The road map on the travel card: the stops from Dead Acre to the hospital, the way you took between each two
// you have passed (a darker line, bowed the side you took, with its mark), and ahead of you the road forking into
// the two ways on offer, each drawn in the colour of its danger with the mark of what waits on it. Hover a way's
// card and its fork lights up; pick it and the van drives that fork to the next stop.
import { GS } from '../core/gs.js';
import { STOPS } from '../game/route.js';
import { VIA } from '../game/routes.js';

const NS = 'http://www.w3.org/2000/svg',
  VW = 560,
  VH = 112,
  Y = 58,
  PADX = 34,
  BOW = 18, // how far the two ways ahead bow apart
  BOW_PAST = 11;
export const RISK = ['Calm', 'Rough', 'Bad'];
const RISK_COL = ['#8ec5a0', '#e0b36a', '#e8806a'];
// a mark for each way, drawn in a 20 × 20 box round 0,0: [path, filled?]
export const GLYPH = {
  road: ['M-6-5l5 5-5 5M1-5l5 5-5 5', false],
  pharmacy: ['M-2-6.5h4v4.5h4.5v4h-4.5v4.5h-4v-4.5h-4.5v-4h4.5z', true],
  gunshop: ['M0-8v5M0 3v5M-8 0h5M3 0h5M5 0a5 5 0 1 1-10 0a5 5 0 1 1 10 0', false],
  hideout: ['M-7 0L0-6.5L7 0M-5-1.5V6.5h10V-1.5M-1.5 6.5v-4h3v4', false],
  checkpoint: ['M-8-3h16v4h-16zM-6 1v6M6 1v6M-4-3l-2 4M2-3l-2 4M8-3l-2 4', false],
  wrecks: ['M-8 3v-3l2.5-4h11l2.5 4v3zM-4 3.5a1.8 1.8 0 1 0 .1 0M4 3.5a1.8 1.8 0 1 0 .1 0', false],
  bridge: ['M-9-2h18M-7 6Q0-7 7 6M-3.5 6v-5M3.5 6v-5', false],
  tanker: ['M0-8C3-4 6-2 6 2.5A6 6 0 0 1-6 2.5C-6-0.5-4.5-2.5-2.5-4C-2.5-2-1.5-1 0-0.5C0-3-1-5 0-8z', true],
  bus: ['M-9-4h18v8h-18zM-7-1.5h3M-2.5-1.5h3M2-1.5h3M-6 4v2M6 4v2', false],
  river: ['M-8-3q2-2.4 4 0t4 0t4 0t4 0M-8 3q2-2.4 4 0t4 0t4 0t4 0', false],
};
const el = (t, a = {}, parent) => {
  const n = document.createElementNS(NS, t);
  for (const k in a) if (a[k] !== null && a[k] !== undefined) n.setAttribute(k, a[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const X = i => PADX + (i / (STOPS.length - 1)) * (VW - 2 * PADX);
const legPath = (i, side, bow) => {
  const x0 = X(i - 1),
    x1 = X(i),
    b = side === null ? 0 : side ? bow : -bow;
  return { d: `M${x0} ${Y}Q${(x0 + x1) / 2} ${Y + 2 * b} ${x1} ${Y}`, mx: (x0 + x1) / 2, my: Y + b };
};
// the mark for a way, as an <svg> for a card
export function glyphSvg(id) {
  const g = GLYPH[id] || GLYPH.road;
  return `<svg viewBox="-10 -10 20 20" aria-hidden="true"><path d="${g[0]}" ${g[1] ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'}/></svg>`;
}
function mark(svg, id, x, y, col, scale, ring) {
  const g = el('g', { transform: `translate(${x} ${y}) scale(${scale})`, class: 'rmark' }, svg),
    G = GLYPH[id] || GLYPH.road;
  if (ring) el('circle', { r: 11, fill: '#14181d', stroke: col, 'stroke-width': 1.6 }, g);
  el(
    'path',
    G[1]
      ? { d: G[0], fill: col, transform: ring ? 'scale(.82)' : null }
      : {
          d: G[0],
          fill: 'none',
          stroke: col,
          'stroke-width': ring ? 1.7 : 2,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          transform: ring ? 'scale(.82)' : null,
        },
    g
  );
  return g;
}
// draw the map into the card's .road: `to` is the stop you are heading for, `ways` the two on offer (or none)
export function drawRoad(box, to, ways) {
  box.innerHTML = '';
  const svg = el('svg', { viewBox: `0 0 ${VW} ${VH}`, class: 'rmap' }, box),
    log = (GS.RUN && GS.RUN.viaLog) || [];
  for (let i = 1; i < STOPS.length; i++) {
    if (i < to) {
      const L = log.find(l => l.s === i),
        p = legPath(i, L ? L.i : null, BOW_PAST);
      el('path', { d: p.d, class: 'rleg past' }, svg);
      if (L && VIA[L.id]) mark(svg, L.id, p.mx, p.my + (L.i ? 10 : -10), '#7fa892', 0.7, false); // its mark, just off the line
    } else if (i === to && ways && ways.length) {
      ways.forEach((id, k) => {
        const V = VIA[id] || {},
          col = RISK_COL[V.risk || 0],
          p = legPath(i, ways.length > 1 ? k : null, BOW);
        el('path', { d: p.d, class: 'rleg fork', 'data-i': k, stroke: col, id: `rway${k}` }, svg);
        mark(svg, id, p.mx, p.my, col, 1, true).setAttribute('data-i', k);
      });
    } else
      el(
        'path',
        { d: legPath(i, null, 0).d, class: i === to ? 'rleg fork solo' : 'rleg ahead', id: i === to ? 'rway0' : null },
        svg
      );
  }
  STOPS.forEach((s, i) => {
    const x = X(i),
      g = el('g', { class: `rstop${i < to ? ' done' : ''}${i === to ? ' next' : ''}` }, svg);
    el('circle', { cx: x, cy: Y, r: 5.5 }, g);
    const t = el('text', { x, y: i % 2 ? 22 : 102, 'text-anchor': 'middle' }, g);
    t.textContent = s.short;
  });
  const van = el('g', { class: 'rvan', transform: `translate(${X(Math.max(0, to - 1))} ${Y})` }, svg);
  el('rect', { x: -10, y: -5, width: 20, height: 10, rx: 3 }, van);
  return svg;
}
// light up one way's fork (or none: -1)
export function hotWay(box, i) {
  const svg = box.querySelector('svg');
  if (!svg) return;
  svg.classList.toggle('hover', i >= 0);
  for (const n of svg.querySelectorAll('[data-i]')) n.classList.toggle('hot', +n.dataset.i === i);
}
// the van drives the way you picked to the next stop; then `done`
export function driveVan(box, i, done, ms = 1100) {
  const svg = box.querySelector('svg'),
    path = svg && (svg.querySelector(`#rway${i}`) || svg.querySelector('#rway0')),
    van = svg && svg.querySelector('.rvan');
  if (!path || !van || !path.getTotalLength) return done();
  hotWay(box, i);
  const len = path.getTotalLength();
  let over = false,
    el0 = 0, // time driven so far: counted from the first frame, a long frame (the new place's first) at most 1/20 s
    last = 0;
  const end = () => {
    if (over) return;
    over = true;
    done();
  };
  const step = () => {
    if (over) return;
    const now = performance.now();
    el0 += last ? Math.min(50, now - last) : 0;
    last = now;
    const u = Math.min(1, el0 / ms),
      e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2,
      p = path.getPointAtLength(e * len),
      q = path.getPointAtLength(Math.min(len, e * len + 2)),
      r = e * len + 2 > len ? 0 : (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
    van.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${r})`);
    if (u < 1) requestAnimationFrame(step);
    else end();
  };
  requestAnimationFrame(step);
  setTimeout(end, ms + 2500); // no frames (a hidden tab): the card still goes
}
