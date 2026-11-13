/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The run summary, on both end screens: the road you took on the map (the van where you finished), what you
// carried and what you'd learned, who was with you and who was lost on the way, and the run's numbers; with a
// button that copies it all as plain text. Nothing leaves the page.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { GUNS, HEROES } from '../game/arsenal.js';
import { AB } from '../game/abilities.js';
import { KITS } from '../game/kits.js';
import { EVOS, UP } from '../game/upgrades.js';
import { LV } from '../game/state.js';
import { FINAL_NIGHT } from '../game/districts.js';
import { STOPS } from '../game/route.js';
import { VIA } from '../game/routes.js';
import { stopNow } from '../game/journey.js';
import { drawRoad } from './roadmap.js';

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clock = s => `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, '0')}`;
export function summaryData(won) {
  const R = GS.RUN || {},
    m = R.metrics || {},
    stop = R.journey ? Math.min(STOPS.length - 1, stopNow()) : -1,
    ways = (R.viaLog || []).map(l => ({
      stop: STOPS[l.s] ? STOPS[l.s].name : '',
      name: VIA[l.id] ? VIA[l.id].name : l.id,
    })),
    kits = R.kits || [],
    ups = UP.concat(EVOS)
      .filter(u => (LV[u.id] || 0) > 0)
      .map(u => ({ name: typeof u.name === 'function' ? u.name() : u.name, lv: LV[u.id] }));
  let ab = '';
  try {
    ab = R.hero ? AB().name : '';
  } catch (e) {
    ab = '';
  }
  return {
    won: !!won,
    daily: R.daily ? R.daily.date : null,
    night: GS.wave,
    of: FINAL_NIGHT,
    stop,
    at: stop >= 0 ? STOPS[stop].name : '',
    ways,
    hero: HEROES[R.hero] ? HEROES[R.hero].name : '',
    ability: ab || '',
    guns: (GS.P ? GS.P.owned : []).map(g => ({
      name: GUNS[g] ? GUNS[g].name : g,
      kits: kits.filter(k => KITS[k] && KITS[k].gun === g).map(k => KITS[k].name),
    })),
    ups,
    with: GS.buddies.filter(b => b.nm && !(b.hp <= 0)).map(b => b.nm),
    lost: (R.lost || []).slice(),
    score: GS.score,
    kills: GS.kills,
    chain: Math.round(m.peakCombo || 0),
    dealt: Math.round(m.damageDealt || 0),
    taken: Math.round(m.damageTaken || 0),
    jobs: `${m.objectives || 0} of ${(m.objectives || 0) + (m.objectivesFailed || 0)}`,
    time: clock(m.elapsed),
    scrap: GS.runSeeds,
    spent: m.scrapSpent || 0,
  };
}
export function summaryText(D) {
  const L = [
    `Dead Acre · ${D.won ? 'made it out' : `eaten on night ${D.night} of ${D.of}`}${D.at ? ` at ${D.at}` : ''}${D.daily ? ` · daily run ${D.daily}` : ''}`,
    `${D.hero}${D.ability ? ` · ${D.ability}` : ''}`,
    `Nights ${D.won ? D.of : D.night} · kills ${D.kills} · score ${D.score} · best chain ×${D.chain} · time ${D.time}`,
    `Damage dealt ${D.dealt} · taken ${D.taken} · jobs done ${D.jobs} · scrap ${D.scrap} earned, ${D.spent} spent`,
  ];
  if (D.ways.length) L.push('The road: ' + D.ways.map(w => `${w.name} to ${w.stop}`).join(' · '));
  if (D.guns.length)
    L.push('Guns: ' + D.guns.map(g => g.name + (g.kits.length ? ` (${g.kits.join(', ')})` : '')).join(' · '));
  if (D.ups.length) L.push('Gear: ' + D.ups.map(u => `${u.name} ${u.lv}`).join(' · '));
  if (D.with.length) L.push('With you: ' + D.with.join(', '));
  if (D.lost.length) L.push('Lost: ' + D.lost.join(', '));
  return L.join('\n');
}
// fill one end screen's summary box (id) and its copy button
export function renderSummary(id, won) {
  const el = $(id);
  if (!el || !GS.RUN) return;
  const D = summaryData(won);
  GS.RUN.sumText = summaryText(D);
  const list = (h, items, empty) =>
    `<div class="scol2"><span class="sh">${h}</span>${items.length ? items.map(t => `<div>${t}</div>`).join('') : `<div class="none">${empty}</div>`}</div>`;
  el.classList.toggle('nomap', !GS.RUN.journey);
  el.innerHTML =
    (GS.RUN.journey ? '<div class="road sumroad"></div>' : '') +
    `<div class="sumcols">${list(
      'Build',
      [`<b>${esc(D.hero)}</b>${D.ability ? ` · ${esc(D.ability)}` : ''}`]
        .concat([
          D.guns.map(g => esc(g.name) + (g.kits.length ? ` <i>(${esc(g.kits.join(', '))})</i>` : '')).join(' · '),
        ])
        .concat(D.ups.length ? [`<i>${D.ups.map(u => `${esc(u.name)} ${u.lv}`).join(' · ')}</i>`] : []),
      ''
    )}${list(
      'Your people',
      D.with.map(n => esc(n)).concat(D.lost.map(n => `<s>${esc(n)}</s> <i>lost</i>`)),
      'Nobody joined you'
    )}<div class="sumfoot"><button class="opt" type="button" data-copy>Copy summary</button><span class="copied" hidden>Copied</span></div></div>`;
  if (GS.RUN.journey) drawRoad(el.querySelector('.sumroad'), won ? STOPS.length : D.stop + 1, null, true);
  const btn = el.querySelector('[data-copy]'),
    ok = el.querySelector('.copied');
  btn.onclick = () => {
    copyText(GS.RUN.sumText).then(r => {
      ok.hidden = !r;
      ok.textContent = r ? 'Copied' : 'Could not copy';
      ok.hidden = false;
    });
  };
}
async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const r = document.execCommand('copy');
      ta.remove();
      return r;
    } catch (e2) {
      return false;
    }
  }
}
