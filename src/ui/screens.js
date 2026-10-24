/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
let glDead = false;
function setPause(p) { if (!p && glDead) return; if (p && state === 'play') { state = 'pause'; renderPauseGuns(); $('pause').hidden = false; $('resumeBtn').focus({ preventScroll: true }); if (AC && AC.state === 'running') AC.suspend(); } else if (!p && state === 'pause') { state = 'play'; $('pause').hidden = true; $('settings').hidden = true; if (AC && AC.state === 'suspended' && !document.hidden) AC.resume(); } } // the whole mix freezes with the game, so a paused tab doesn't stutter music in the background
function gameOver() { $('hint').classList.remove('show', 'tut'); if (RUN.tut) RUN.tut = null;
  state = 'over'; P.hp = 0; setB('hpFill', 0); setT('hpTxt', `0 / ${Math.round(S.maxHp)}`); $('hpBar').classList.add('low'); explode(P.x, P.y, 110, 0, false); hitstop = 0.3; // the HUD stops updating once you're dead: show the zero
  
  stopHeli(); $('over').querySelector('.eyebrow').textContent = `Killed by ${P.lastBy || 'the dead'} · The radio is still on`; $('againBtn').textContent = 'Try again';
  if (RUN.practice) { practiceReport(false); return; }
  statMax('maxNight', wave - 1); statMax('maxLevel', level); checkChal(true);
  const pd = RUN.paid || { k: 0, w: 1, s: 0 }, earned = Math.max(1, Math.round(((kills - pd.k) * 0.5 + Math.max(0, wave - Math.max(1, pd.w)) * 10 + (runSeeds - pd.s)) * (1 + 0.15 * (PK().vault || 0)) * (RUN.clean ? 1.25 : 1) * DIFF().seeds * (1 + 0.12 * (RUN.inf || 0)) * twistK()));
  meta.seeds += earned;
  saveMeta();
  { const af = affordNow(); $('oSeeds').innerHTML = `+${earned} scrap · <b>${meta.seeds.toLocaleString()}</b> banked` + (af.length ? `<br><span class="afford">In the Armory you can now buy: ${af.slice(0, 3).join(' · ')}${af.length > 3 ? ` · and ${af.length - 3} more` : ''}</span>` : ''); }
  const nb = score > rec.score, nw = wave > rec.wave;
  if (nb) { rec.score = score; store.set('rr_best', score); } if (nw) { rec.wave = wave; store.set('rr_wave', wave); }
  $('overTitle').textContent = RUN.endless ? `Eaten on endless night ${wave}` : `Eaten on night ${wave} of ${FINAL_NIGHT}`; $('oScore').textContent = score.toLocaleString(); $('oWaveL').textContent = 'Scrap'; $('oWave').textContent = `+${earned}`; /* the title already says the night */ $('oKills').textContent = kills; $('oLevel').textContent = level;
  renderRunReport('oBreakdown');
  { const lost = (RUN.lost || []).concat(buddies.map(b => b.nm).filter(Boolean)); $('oCrew').textContent = lost.length ? `Lost with you: ${lost.join(', ')}.` : ''; $('oCrew').hidden = !lost.length; const who = RUN.voice || 'Reyes'; $('oRadio').innerHTML = RUN.practice ? '' : `<b>CH 9 · ${who.toUpperCase()}</b>“${who === 'Hawk' ? 'Nine? Nine, I have lost your signal. Nine, come in.' : wave >= 10 ? 'Nine, come in. Nine? We heard the shooting stop.' : 'Nine? Nine, come in. Somebody pick up the relay.'}”`; $('oRadio').hidden = !!RUN.practice; }
  $('oChal').innerHTML = chalRunSummary() + '<div><button class="opt" id="oChalBtn" type="button">See all challenges</button></div>'; $('oChalBtn').onclick = () => openChal('over');
  $('oRec').innerHTML = `${nb || nw ? '<span class="newrec">New record · </span>' : ''}Best score <b>${rec.score.toLocaleString()}</b> · longest night <b>${rec.wave}</b>` + bossLogHtml();
  $('bossBox').hidden = true;
  setTimeout(() => { if (state === 'over') { $('over').hidden = false; $('againBtn').focus({ preventScroll: true }); $('againBtn').scrollIntoView({ block: 'nearest' }); } }, 1300);
}
function formatRunTime(seconds) { const s = Math.max(0, Math.floor(Number(seconds) || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function renderRunReport(id) {
  const m = RUN && RUN.metrics; const el = $(id); if (!el || !m) return;
  const cells = [
    ['Time in action', formatRunTime(m.elapsed)],
    ['Damage dealt', Math.round(m.damageDealt).toLocaleString()],
    ['Damage taken', Math.round(m.damageTaken).toLocaleString()],
    ['Trigger pulls', Math.round(m.triggers).toLocaleString()],
    ['Dodge rolls', Math.round(m.rolls).toLocaleString()],
    ['Reloads', Math.round(m.reloads).toLocaleString()],
    ['Jobs done', `${m.objectives} of ${m.objectives + m.objectivesFailed}`],
    ['Best chain', `×${Math.max(0, Math.round(m.peakCombo))}`]
  ];
  el.innerHTML = cells.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('');
}
function showMenuRec() {
  $('menuRec').innerHTML = rec.score ? `Best <b>${rec.score.toLocaleString()}</b> · longest night <b>${rec.wave}</b>` : 'No runs logged yet';
  $('menuSeeds').innerHTML = seedsLine();
}
$('startBtn').addEventListener('click', () => begin(false));
$('survBtn').addEventListener('click', () => { initAudio(); $('menu').hidden = true; renderDistricts(); $('survSetup').hidden = false; $('startBtn').focus({ preventScroll: true }); });
$('survBack').addEventListener('click', () => { $('survSetup').hidden = true; $('menu').hidden = false; });






$('endlessBtn').addEventListener('click', goEndless);
$('wonMenuBtn').addEventListener('click', () => { $('won').hidden = true; $('hud').hidden = true; showMenuRec(); renderHeroes(); $('menu').hidden = false; menuInit(); openHangar(); }); $('againBtn').addEventListener('click', () => begin(false));
$('resumeBtn').addEventListener('click', () => setPause(false));
$('quitBtn').addEventListener('click', () => { const qb = $('quitBtn'); if ((qb.dataset.sure !== '1')) { qb.dataset.sure = '1'; qb.textContent = 'Quit? This run\'s scrap is lost'; setTimeout(() => { qb.dataset.sure = ''; qb.textContent = 'Quit run'; }, 3000); return; } qb.dataset.sure = ''; qb.textContent = 'Quit run';  $('pause').hidden = true; $('hint').classList.remove('show'); $('hud').hidden = true; $('bossBox').hidden = true; showMenuRec(); $('menu').hidden = false; menuInit(); });
$('muteBtn').addEventListener('click', () => { initAudio(); setMuted(!muted); });
$('tutBtn').addEventListener('click', () => { meta.tutForce = !meta.tutForce; saveMeta(); syncOpts(); });
$('menu').addEventListener('pointerdown', () => initAudio());

