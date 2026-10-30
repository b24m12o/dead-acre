/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { HEROES } from '../game/arsenal.js';
import { clearSave, savedRun } from '../game/save.js';
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { saveMeta, store } from '../core/settings.js';
import { DIFF } from '../core/profile.js';
import { AC, initAudio } from '../audio/audio.js';
import { setMuted } from '../audio/music.js';
import { S, rec } from '../game/state.js';
import { explode } from '../game/combat.js';
import { syncOpts } from './settings-ui.js';
import { PK, begin, continueRun, openHangar, renderHeroes, renderPauseGuns, seedsLine } from './hangar.js';
import { setB, setT } from './hud.js';
import { DISTRICTS, FINAL_NIGHT, twistK } from '../game/districts.js';
import { chalRunSummary, checkChal, openChal, statMax } from '../game/challenges.js';
import { practiceReport } from '../game/practice.js';
import { bossLogHtml } from '../game/boss-flow.js';
import { goEndless, stopHeli } from '../game/evac.js';
import { affordNow, menuInit, renderDistricts } from './menu.js';
GS.glDead = false;
export function setPause(p) {
  if (!p && GS.glDead) return;
  if (p && GS.state === 'play') {
    GS.state = 'pause';
    renderPauseGuns();
    $('pause').hidden = false;
    $('resumeBtn').focus({ preventScroll: true });
    if (AC && AC.state === 'running') AC.suspend();
  } else if (!p && GS.state === 'pause') {
    GS.state = 'play';
    $('pause').hidden = true;
    $('settings').hidden = true;
    if (AC && AC.state === 'suspended' && !document.hidden) AC.resume();
  }
} // the whole mix freezes with the game, so a paused tab doesn't stutter music in the background
export function gameOver() {
  clearSave(); // eaten: the run and its save are over
  $('hint').classList.remove('show', 'tut');
  if (GS.RUN.tut) GS.RUN.tut = null;
  GS.state = 'over';
  GS.P.hp = 0;
  setB('hpFill', 0);
  setT('hpTxt', `0 / ${Math.round(S.maxHp)}`);
  $('hpBar').classList.add('low');
  explode(GS.P.x, GS.P.y, 110, 0, false);
  GS.hitstop = 0.3; // the HUD stops updating once you're dead: show the zero

  stopHeli();
  $('over').querySelector('.eyebrow').textContent = `Killed by ${GS.P.lastBy || 'the dead'} · The radio is still on`;
  $('againBtn').textContent = 'Try again';
  $('oScoreL').textContent = 'Score';
  if (GS.RUN.practice) {
    practiceReport(false);
    return;
  }
  statMax('maxNight', GS.wave - 1);
  statMax('maxLevel', GS.level);
  checkChal(true);
  const pd = GS.RUN.paid || { k: 0, w: 1, s: 0 },
    earned = Math.max(
      1,
      Math.round(
        ((GS.kills - pd.k) * 0.5 + Math.max(0, GS.wave - Math.max(1, pd.w)) * 10 + (GS.runSeeds - pd.s)) *
          (1 + 0.15 * (PK().vault || 0)) *
          (GS.RUN.clean ? 1.25 : 1) *
          DIFF().seeds *
          (1 + 0.12 * (GS.RUN.inf || 0)) *
          twistK()
      )
    );
  GS.meta.seeds += earned;
  saveMeta();
  {
    const af = affordNow();
    $('oSeeds').innerHTML =
      `<b>${GS.meta.seeds.toLocaleString()}</b> scrap banked` +
      (af.length
        ? `<br><span class="afford">In the Armory you can now buy: ${af.slice(0, 3).join(' · ')}${af.length > 3 ? ` · and ${af.length - 3} more` : ''}</span>`
        : '');
  }
  const nb = GS.score > rec.score,
    nw = GS.wave > rec.wave;
  if (nb) {
    rec.score = GS.score;
    store.set('rr_best', GS.score);
  }
  if (nw) {
    rec.wave = GS.wave;
    store.set('rr_wave', GS.wave);
  }
  $('overTitle').textContent = GS.RUN.endless
    ? `Eaten on endless night ${GS.wave}`
    : `Eaten on night ${GS.wave} of ${FINAL_NIGHT}`; // the title already says the night
  $('oScore').textContent = GS.score.toLocaleString();
  $('oWaveL').textContent = 'Scrap';
  $('oWave').textContent = `+${earned}`;
  $('oKills').textContent = GS.kills;
  $('oLevel').textContent = GS.level;
  renderRunReport('oBreakdown');
  {
    const lost = (GS.RUN.lost || []).concat(GS.buddies.map(b => b.nm).filter(Boolean));
    $('oCrew').textContent = lost.length ? `Lost with you: ${lost.join(', ')}.` : '';
    $('oCrew').hidden = !lost.length;
    const who = GS.RUN.voice || 'Reyes';
    $('oRadio').innerHTML = GS.RUN.practice
      ? ''
      : `<b>CH 9 · ${who.toUpperCase()}</b>“${who === 'Hawk' ? 'Nine? Nine, I have lost your signal. Nine, come in.' : GS.wave >= 10 ? 'Nine, come in. Nine? We heard the shooting stop.' : 'Nine? Nine, come in. Somebody pick up the relay.'}”`;
    $('oRadio').hidden = !!GS.RUN.practice;
  }
  $('oChal').innerHTML =
    chalRunSummary() + '<div><button class="opt" id="oChalBtn" type="button">See all challenges</button></div>';
  $('oChalBtn').onclick = () => openChal('over');
  $('oRec').innerHTML =
    `${nb || nw ? '<span class="newrec">New record · </span>' : ''}Best score <b>${rec.score.toLocaleString()}</b> · furthest night <b>${rec.wave}</b>` +
    bossLogHtml();
  $('bossBox').hidden = true;
  setTimeout(() => {
    if (GS.state === 'over') {
      $('over').hidden = false;
      $('againBtn').focus({ preventScroll: true });
      $('againBtn').scrollIntoView({ block: 'nearest' });
    }
  }, 1300);
}
function formatRunTime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function renderRunReport(id) {
  const m = GS.RUN && GS.RUN.metrics;
  const el = $(id);
  if (!el || !m) return;
  const cells = [
    ['Time in action', formatRunTime(m.elapsed)],
    ['Damage dealt', Math.round(m.damageDealt).toLocaleString()],
    ['Damage taken', Math.round(m.damageTaken).toLocaleString()],
    ['Trigger pulls', Math.round(m.triggers).toLocaleString()],
    ['Dodge rolls', Math.round(m.rolls).toLocaleString()],
    ['Reloads', Math.round(m.reloads).toLocaleString()],
    ['Jobs done', `${m.objectives} of ${m.objectives + m.objectivesFailed}`],
    ['Best chain', `×${Math.max(0, Math.round(m.peakCombo))}`],
  ];
  el.innerHTML = cells.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('');
}
export function showMenuRec() {
  $('menuRec').innerHTML = rec.score
    ? `Best <b>${rec.score.toLocaleString()}</b> · furthest night <b>${rec.wave}</b>`
    : 'No runs logged yet';
  $('menuSeeds').innerHTML = seedsLine();
  {
    const d = savedRun(),
      cb = $('contBtn');
    cb.hidden = !d;
    $('survBtn').classList.toggle('ghost', !!d);
    if (d) {
      cb.textContent = d.RUN.endless
        ? `Continue · endless night ${d.wave + 1}`
        : `Continue · night ${d.wave + 1} of ${FINAL_NIGHT}`;
      cb.title = `${(HEROES[d.RUN.hero] || HEROES.ranger).name} · ${(DISTRICTS[d.RUN.district] || DISTRICTS.town).name} · saved at dawn`;
    }
  } // a run saved at its last dawn: pick it up where it stopped
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  $('startBtn').addEventListener('click', () => begin(false));
  $('contBtn').addEventListener('click', continueRun);
  $('survBtn').addEventListener('click', () => {
    initAudio();
    {
      const d = savedRun();
      $('saveWarn').hidden = !d;
      if (d) $('saveWarn').textContent = `A new run replaces the one saved at dawn after night ${d.wave}.`;
    }
    $('menu').hidden = true;
    renderDistricts();
    syncOpts();
    $('survSetup').hidden = false;
    $('startBtn').focus({ preventScroll: true });
  });
  $('survBack').addEventListener('click', () => {
    $('survSetup').hidden = true;
    $('menu').hidden = false;
  });
  $('endlessBtn').addEventListener('click', goEndless);
  const wonToMenu = () => {
    $('won').hidden = true;
    $('hud').hidden = true;
    showMenuRec();
    renderHeroes();
    $('menu').hidden = false;
    menuInit();
  };
  $('wonMenuBtn').addEventListener('click', () => {
    wonToMenu();
    openHangar();
  });
  $('wonHomeBtn').addEventListener('click', wonToMenu);
  $('againBtn').addEventListener('click', () => begin(false));
  $('resumeBtn').addEventListener('click', () => setPause(false));
  $('quitBtn').addEventListener('click', () => {
    const qb = $('quitBtn');
    if (qb.dataset.sure !== '1') {
      qb.dataset.sure = '1';
      qb.textContent = "Quit? This run's scrap is lost";
      setTimeout(() => {
        qb.dataset.sure = '';
        qb.textContent = 'Quit run';
      }, 3000);
      return;
    }
    qb.dataset.sure = '';
    qb.textContent = 'Quit run';
    clearSave();
    $('pause').hidden = true;
    $('hint').classList.remove('show');
    $('hud').hidden = true;
    $('bossBox').hidden = true;
    showMenuRec();
    $('menu').hidden = false;
    menuInit();
  });
  $('muteBtn').addEventListener('click', () => {
    initAudio();
    setMuted(!GS.muted);
  });
  $('tutBtn').addEventListener('click', () => {
    GS.meta.tutForce = !GS.meta.tutForce;
    saveMeta();
    syncOpts();
  });
  $('menu').addEventListener('pointerdown', () => initAudio());
}
