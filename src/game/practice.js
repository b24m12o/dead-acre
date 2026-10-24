/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const PRACTICE_SET = [
  { bt: 'abom', name: 'Abomination', d: 'town', night: 5, where: 'Dead Acre · night 5' },
  { bt: 'roadkill', name: 'Roadkill', d: 'highway', night: 5, where: 'Route 9 · night 5' },
  { bt: 'grave', name: 'Gravekeeper', d: 'cemetery', night: 5, where: 'Hollow Hill · night 5' },
  { bt: 'chief', name: 'Fire Chief', d: 'town', night: 10, where: 'Dead Acre · night 10' },
  { bt: 'pz', name: 'Patient Zero', d: 'town', night: 15, where: 'Dead Acre · night 15, the last night' }
];
function openPractice(from) { PRACTICE_FROM = from; for (const id of ['menu', 'settings']) $(id).hidden = true; $('practiceList').innerHTML = PRACTICE_SET.map(o => `<div class="perk"><span class="nm">${o.name}</span><button type="button" class="buy" data-bt="${o.bt}">Fight</button><span class="ds">${o.where}${trophyLine(o.bt)}</span></div>`).join(''); for (const b of $('practiceList').querySelectorAll('.buy')) b.addEventListener('click', () => startPractice(b.dataset.bt)); $('practice').hidden = false; }
let PRACTICE_FROM = 'menu';
function trophyLine(bt) { const t = (meta.trophies || {})[bt]; if (!t) return ''; const a = []; if (t.n) a.push(`killed ${t.n}× in runs, best ${fmtT(t.best)}`); if (t.pbest) a.push(`practice best ${fmtT(t.pbest)}`); return a.length ? '<br><span class="tro">' + a.join(' · ') + '</span>' : ''; }
function startPractice(bt) { // the fight on its own: that night's district, the guns and level you'd have by then, only the boss
  const C = PRACTICE_SET.find(o => o.bt === bt); PRACTICE = { bt, d: C.d, night: C.night };
  for (const id of ['practice', 'over', 'settings', 'menu']) $(id).hidden = true;
  begin.inPractice = true; begin(); begin.inPractice = false;
  const guns = C.night >= 15 ? ['shotgun', 'smg', 'rifle', 'auto', 'hunter', 'lever', 'lmg', 'launcher'] : C.night >= 10 ? ['shotgun', 'smg', 'rifle', 'auto', 'hunter'] : ['shotgun', 'rifle']; // what a run would really have by then (weapon cases on nights 2, 4, 7, 9, 12)
  for (const g of guns) if (!P.owned.includes(g)) P.owned.push(g); P.owned.sort((a, b) => GUN_ORDER.indexOf(a) - GUN_ORDER.indexOf(b));
  const n = Math.round(C.night * 1.4); for (let i = 0; i < n; i++) { const evo = EVOS.find(v => !LV[v.id] && Object.entries(v.need).every(([k, m]) => (LV[k] || 0) >= m)); const pool = upgradePool(); const u = evo || (pool.length ? pick(pool) : null); if (!u) break; LV[u.id] = (LV[u.id] || 0) + 1; u.apply(); }
  for (const g of P.owned) P.mag[g] = magSize(g); for (const t of Object.keys(AMMO_MAX)) P.ammo[t] = ammoMax(t);
  level = n + 1; xp = 0; xpNeed = need(level); P.hp = S.maxHp; texts.length = 0; streakQ = []; hideCallouts();
  const spec = (HEROES[RUN.hero] || HEROES.ranger).spec; equip(P.owned.includes(spec) ? spec : 'rifle', true); renderMods();
  wave = C.night; nightLive = false; nightDone = false; queue = []; interT = 99; RUN.t0 = time; RUN.taken = 0;
  bossEntrance(bt, true); // the same staged arrival as in a run, only sooner
}
function practiceReport(won) {
  if (RUN.reported) return; RUN.reported = true;
  const secs = Math.round(time - (RUN.t0 || time)), b = boss || enemies.find(e => e.type === 'queen'), hpLeft = b && !won ? Math.max(0, Math.round(b.hp / b.maxHp * 100)) : 0, name = PRACTICE_SET.find(o => o.bt === (PRACTICE && PRACTICE.bt)) || { name: bossName() };
  if (won) { banner(`${name.name} down`, `Practice · ${fmtT(secs)}${RUN.pBest ? ' · best time' : ''}`, true); if (P) P.inv = 1e9; } // nothing left can take the win away
  later.push({ t: won ? 2.5 : 0, fn: () => {
    if (won) state = 'over';
    $('over').querySelector('.eyebrow').textContent = 'Boss practice · nothing earned, nothing lost'; $('oCrew').hidden = true; $('oRadio').hidden = true;
    $('overTitle').textContent = won ? `${name.name} down in ${fmtT(secs)}` : `${name.name} got you`;
    $('oScore').textContent = Math.round(RUN.taken || 0); $('oWaveL').textContent = 'Night'; $('oWave').textContent = wave; $('oKills').textContent = kills; $('oLevel').textContent = level;
    $('oSeeds').textContent = won ? `Health left ${Math.max(0, Math.round(P.hp))} of ${Math.round(S.maxHp)}` : `Boss health left ${hpLeft}% · ${fmtT(secs)}`;
    { const tr = ((meta.trophies || {})[PRACTICE && PRACTICE.bt]) || {}; $('oRec').innerHTML = 'Score shows the damage you took.' + (tr.pbest ? ` Practice best <b>${fmtT(tr.pbest)}</b>` : '') + (tr.best ? ` · in a run <b>${fmtT(tr.best)}</b>` : ''); } $('oChal').innerHTML = ''; $('againBtn').textContent = 'Fight again'; $('bossBox').hidden = true;
    setTimeout(() => { if (state === 'over') { $('over').hidden = false; $('againBtn').focus({ preventScroll: true }); } }, won ? 200 : 1300);
  } });
}
