/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { soundWait } from '../ui/loading.js';
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { pick } from '../core/util.js';
import { AMMO_MAX, GUN_ORDER, HEROES } from './arsenal.js';
import { LV, S, ammoMax, equip, magSize } from './state.js';
import { need } from './run.js';
import { EVOS, renderMods, upgradePool } from './upgrades.js';
import { hideCallouts } from '../ui/callouts.js';
import { banner } from './waves.js';
import { begin } from '../ui/hangar.js';
import { bossEntrance, bossName, fmtT } from './boss-flow.js';
import { districtOpen } from './challenges.js';
const met = night => ((GS.meta.stats && GS.meta.stats.maxNight) || 0) >= night - 1; // got as far as that night in a run
export const PRACTICE_SET = [
  { bt: 'abom', name: 'Abomination', d: 'town', night: 5, where: 'Dead Acre · night 5' },
  { bt: 'roadkill', name: 'Roadkill', d: 'highway', night: 5, where: 'Route 9 · night 5' },
  { bt: 'grave', name: 'Gravekeeper', d: 'cemetery', night: 5, where: 'Hollow Hill · night 5' },
  { bt: 'chief', name: 'Fire Chief', d: 'town', night: 10, where: 'Dead Acre · night 10' },
  { bt: 'pz', name: 'Patient Zero', d: 'town', night: 15, where: 'Dead Acre · night 15, the last night' },
];
export function openPractice(from) {
  PRACTICE_FROM = from;
  for (const id of ['menu', 'settings']) $(id).hidden = true;
  $('practiceList').innerHTML = PRACTICE_SET.map(o => {
    const open = districtOpen(o.d) && (o.night <= 5 || (GS.meta.trophies || {})[o.bt] || met(o.night));
    return open
      ? `<div class="perk"><span class="nm">${o.name}</span><button type="button" class="buy" data-bt="${o.bt}">Fight</button><span class="ds">${o.where}${trophyLine(o.bt)}</span></div>`
      : `<div class="perk"><span class="nm">Unknown</span><button type="button" class="buy" disabled>Locked</button><span class="ds">${o.where} · reach it in a run first</span></div>`;
  }).join(''); // only the bosses you could have met: the others stay a surprise
  for (const b of $('practiceList').querySelectorAll('.buy:not([disabled])'))
    b.addEventListener('click', () => startPractice(b.dataset.bt));
  $('practice').hidden = false;
}
export let PRACTICE_FROM = 'menu';
function trophyLine(bt) {
  const t = (GS.meta.trophies || {})[bt];
  if (!t) return '';
  const a = [];
  if (t.n) a.push(`killed ${t.n}× in runs, best ${fmtT(t.best)}`);
  if (t.pbest) a.push(`practice best ${fmtT(t.pbest)}`);
  return a.length ? '<br><span class="tro">' + a.join(' · ') + '</span>' : '';
}
export function startPractice(bt) {
  // the fight on its own: that night's district, the guns and level you'd have by then, only the boss
  if (soundWait()) return;
  const C = PRACTICE_SET.find(o => o.bt === bt);
  GS.PRACTICE = { bt, d: C.d, night: C.night };
  for (const id of ['practice', 'over', 'settings', 'menu']) $(id).hidden = true;
  begin.inPractice = true;
  begin();
  begin.inPractice = false;
  const guns =
    C.night >= 15
      ? ['shotgun', 'smg', 'rifle', 'auto', 'hunter', 'lever', 'lmg', 'launcher']
      : C.night >= 10
        ? ['shotgun', 'smg', 'rifle', 'auto', 'hunter']
        : ['shotgun', 'rifle']; // what a run would really have by then (weapon cases on nights 2, 4, 7, 9, 12)
  for (const g of guns) if (!GS.P.owned.includes(g)) GS.P.owned.push(g);
  GS.P.owned.sort((a, b) => GUN_ORDER.indexOf(a) - GUN_ORDER.indexOf(b));
  const n = Math.round(C.night * 1.4);
  for (let i = 0; i < n; i++) {
    const evo = EVOS.find(v => !LV[v.id] && Object.entries(v.need).every(([k, m]) => (LV[k] || 0) >= m));
    const pool = upgradePool();
    const u = evo || (pool.length ? pick(pool) : null);
    if (!u) break;
    LV[u.id] = (LV[u.id] || 0) + 1;
    u.apply();
  }
  for (const g of GS.P.owned) GS.P.mag[g] = magSize(g);
  for (const t of Object.keys(AMMO_MAX)) GS.P.ammo[t] = ammoMax(t);
  GS.level = n + 1;
  GS.xp = 0;
  GS.xpNeed = need(GS.level);
  GS.P.hp = S.maxHp;
  GS.texts.length = 0;
  GS.streakQ = [];
  hideCallouts();
  const spec = (HEROES[GS.RUN.hero] || HEROES.ranger).spec;
  equip(GS.P.owned.includes(spec) ? spec : 'rifle', true);
  renderMods();
  GS.wave = C.night;
  GS.nightLive = false;
  GS.nightDone = false;
  GS.queue = [];
  GS.interT = 99;
  GS.RUN.t0 = GS.time;
  GS.RUN.taken = 0;
  bossEntrance(bt, true); // the same staged arrival as in a run, only sooner
}
export function practiceReport(won) {
  if (GS.RUN.reported) return;
  GS.RUN.reported = true;
  const secs = Math.round(GS.time - (GS.RUN.t0 || GS.time)),
    b = GS.boss || GS.enemies.find(e => e.type === 'queen'),
    hpLeft = b && !won ? Math.max(0, Math.round((b.hp / b.maxHp) * 100)) : 0,
    name = PRACTICE_SET.find(o => o.bt === (GS.PRACTICE && GS.PRACTICE.bt)) || { name: bossName() };
  if (won) {
    banner(`${name.name} down`, `Practice · ${fmtT(secs)}${GS.RUN.pBest ? ' · best time' : ''}`, true);
    if (GS.P) GS.P.inv = 1e9;
  } // nothing left can take the win away
  GS.later.push({
    t: won ? 2.5 : 0,
    fn: () => {
      if (won) GS.state = 'over';
      $('over').querySelector('.eyebrow').textContent = 'Boss practice · nothing earned, nothing lost';
      $('oCrew').hidden = true;
      $('oRadio').hidden = true;
      $('overTitle').textContent = won ? `${name.name} down in ${fmtT(secs)}` : `${name.name} got you`;
      $('oScore').textContent = Math.round(GS.RUN.taken || 0);
      $('oScoreL').textContent = 'Damage taken';
      $('oWaveL').textContent = 'Night';
      $('oWave').textContent = GS.wave;
      $('oKills').textContent = GS.kills;
      $('oLevel').textContent = GS.level;
      $('oSeeds').textContent = won
        ? `Health left ${Math.max(0, Math.round(GS.P.hp))} of ${Math.round(S.maxHp)}`
        : `Boss health left ${hpLeft}% · ${fmtT(secs)}`;
      {
        const tr = (GS.meta.trophies || {})[GS.PRACTICE && GS.PRACTICE.bt] || {};
        $('oRec').innerHTML =
          (tr.pbest ? `Practice best <b>${fmtT(tr.pbest)}</b>` : '') +
          (tr.best ? ` · in a run <b>${fmtT(tr.best)}</b>` : '');
      }
      $('oChal').innerHTML = '';
      $('againBtn').textContent = 'Fight again';
      $('bossBox').hidden = true;
      setTimeout(
        () => {
          if (GS.state === 'over') {
            $('over').hidden = false;
            $('againBtn').focus({ preventScroll: true });
          }
        },
        won ? 200 : 1300
      );
    },
  });
}
