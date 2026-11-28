/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { renderSummary } from './summary.js';
import { HEROES } from '../game/arsenal.js';
import { clearSave, savedRun } from '../game/save.js';
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { saveMeta, store } from '../core/settings.js';
import { DIFF } from '../core/profile.js';
import { AC, initAudio, sleepAudio, wakeAudio } from '../audio/audio.js';
import { offAir } from '../audio/radio.js';
import { hushBarks } from '../audio/barks.js';
import { cutRun, setMuted } from '../audio/music.js';
import { S, rec } from '../game/state.js';
import { BLOOD } from '../render/draw-enemies.js';
import { bleed, pool, shake } from '../render/effects.js';
import { syncOpts } from './settings-ui.js';
import { PK, begin, continueRun, renderKit, renderPauseGuns } from './hangar.js';
import { setB, setT } from './hud.js';
import { FINAL_NIGHT, twistK } from '../game/districts.js';
import { chalRunSummary, checkChal, openChal, statMax } from '../game/challenges.js';
import { practiceReport } from '../game/practice.js';
import { bossLogHtml } from '../game/boss-flow.js';
import { stopHeli } from '../game/evac.js';
import { SETUP, affordNow, menuInit, renderDistricts, setSetup } from './menu.js';
import { STOPS, stopAt } from '../game/route.js';
GS.glDead = false;
export function setPause(p) {
  if (!p && GS.glDead) return;
  if (p && GS.state === 'play') {
    GS.state = 'pause';
    renderPauseGuns();
    $('pause').hidden = false;
    $('resumeBtn').focus({ preventScroll: true });
    sleepAudio();
  } else if (!p && GS.state === 'pause') {
    GS.state = 'play';
    $('pause').hidden = true;
    $('settings').hidden = true;
    if (!document.hidden) wakeAudio();
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
  {
    const P = GS.P;
    P.down = 1; // no blast: you go down where you stood, slumped against nothing, and bleed out
    P.dashT = 0;
    P.inv = 0;
    P.hurt = 0; // the game stops here: a hit flash would stay on for good
    P.strideAmp = 0;
    P.vx = P.vy = 0;
    bleed(P.x, P.y, 16, 0, 0, 22, BLOOD, 260, 1.2);
    pool(P.x, P.y, 1.6, BLOOD);
    shake(0.45);
  }
  GS.hitstop = 0.3; // the HUD stops updating once you're dead: show the zero

  stopHeli();
  $('over').querySelector('.eyebrow').textContent = `Killed by ${GS.P.lastBy || 'the dead'} · The radio is still on`;
  $('againBtn').textContent = 'Try again';
  $('oScoreL').textContent = 'Score';
  if (GS.RUN.practice) {
    practiceReport(false);
    return;
  }
  if (!GS.RUN.hm) statMax('maxNight', GS.wave - 1); // Horde Mode's waves aren't nights of the campaign
  statMax('maxLevel', GS.level);
  checkChal(true);
  const pd = GS.RUN.paid || { k: 0, w: 1, s: 0 },
    earned = Math.max(
      1,
      Math.round(
        ((GS.kills - pd.k) * 0.5 + Math.max(0, GS.wave - Math.max(1, pd.w)) * 10 + Math.max(0, GS.runSeeds - pd.s)) *
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
        ? `<br><span class="afford">Your kit can now buy: ${af.slice(0, 3).join(' · ')}${af.length > 3 ? ` · and ${af.length - 3} more` : ''}</span>`
        : '');
  }
  const nb = GS.score > rec.score,
    nw = !GS.RUN.hm && GS.wave > rec.wave; // a Horde Mode wave is not a night of the campaign
  if (nb) {
    rec.score = GS.score;
    store.set('rr_best', GS.score);
  }
  if (nw) {
    rec.wave = GS.wave;
    store.set('rr_wave', GS.wave);
  }
  if (GS.RUN.hm) {
    const m = (GS.meta.hm = GS.meta.hm || { wave: 0, score: 0 });
    m.wave = Math.max(m.wave, GS.wave - 1);
    m.score = Math.max(m.score, GS.score);
    saveMeta();
  } // Horde Mode keeps its own records
  $('overTitle').textContent = GS.RUN.hm
    ? `Overrun by horde ${GS.wave}`
    : `Eaten on night ${GS.wave} of ${FINAL_NIGHT}`; // the title already says the night
  $('oScore').textContent = GS.score.toLocaleString();
  $('oWaveL').textContent = 'Scrap';
  $('oWave').textContent = `+${earned}`;
  $('oKills').textContent = GS.kills;
  $('oLevel').textContent = GS.level;
  renderRunReport('oBreakdown');
  renderSummary('oSum', false); // the road, the build, your people (summary.js)
  {
    const lost = (GS.RUN.lost || []).concat(GS.buddies.map(b => b.nm).filter(Boolean));
    $('oCrew').textContent = lost.length ? `Lost with you: ${lost.join(', ')}.` : '';
    $('oCrew').hidden = true; // your people are in the summary now
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
  $('menuRec').innerHTML =
    (rec.score ? `Best <b>${rec.score.toLocaleString()}</b> · furthest night <b>${rec.wave}</b> of 15` : '') +
    (GS.meta.seeds ? `${rec.score ? ' · ' : ''}scrap <b>${GS.meta.seeds.toLocaleString()}</b>` : '');
  $('menuNote').textContent = GS.meta.heroRefund
    ? `${GS.meta.heroRefund.toLocaleString()} scrap back from the Deputy and the Gunslinger: they join you on the road now`
    : '';
  {
    const d = savedRun(),
      cb = $('contBtn');
    cb.hidden = !d;
    $('survBtn').classList.toggle('ghost', !!d);
    if (d) {
      cb.textContent = 'Continue'; // (where the run stands: on its tooltip, not across the button)
      cb.title = d.RUN.hm
        ? `Horde ${d.wave + 1} · saved at dawn`
        : `Night ${d.wave + 1} of ${FINAL_NIGHT}${d.RUN.journey ? ' · ' + STOPS[Number.isInteger(d.RUN.stop) ? d.RUN.stop : stopAt(d.wave + 1)].name : ''} · ${(HEROES[d.RUN.hero] || HEROES.ranger).name} · saved at dawn`;
    }
  } // a run saved at its last dawn: pick it up where it stopped
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  $('startBtn').addEventListener('click', () => {
    GS.HM = SETUP === 'hm' ? true : null;
    if (begin(false) === false) GS.HM = null;
  });
  $('contBtn').addEventListener('click', continueRun);
  $('hmBtn').addEventListener('click', () => {
    initAudio();
    const b = $('hmBtn');
    if (b.disabled) return;
    openSetup('hm');
  }); // Horde Mode: the same setup, with the ground to pick
  $('survBtn').addEventListener('click', () => {
    initAudio();
    openSetup('camp');
  });
  function openSetup(m) {
    setSetup(m);
    {
      const d = savedRun();
      $('newRunWarn').hidden = !d;
      if (d) $('newRunWarn').textContent = `A new run replaces the one saved at dawn after night ${d.wave}.`;
    }
    $('menu').hidden = true;
    offAir(); // (the title's Channel 9 stays on the title)
    renderDistricts();
    syncOpts();
    for (const d of ['kitDrawer', 'rulesDrawer']) $(d).hidden = true;
    $('survSetup').hidden = false;
    renderKit(); // (the summary on its button; the kit itself is drawn again when it's opened, to measure its lines)
    $('startBtn').focus({ preventScroll: true });
  }
  // the setup screen's two tucked-away panels: your kit, and the run's rules, each over the screen at full size
  const drawer = (id, btn, then) => {
    $(btn).addEventListener('click', () => {
      initAudio();
      const d = $(id);
      d.hidden = false;
      d.scrollTop = 0;
      then && then();
      const f = d.querySelector('.chip.on, .seg .on, button:not([data-close])');
      if (f) f.focus({ preventScroll: true });
    });
    $(id)
      .querySelector('[data-close]')
      .addEventListener('click', () => {
        $(id).hidden = true;
        $(btn).focus({ preventScroll: true });
      });
  };
  drawer('kitDrawer', 'kitBtn', renderKit);
  drawer('rulesDrawer', 'rulesBtn');
  addEventListener(
    'keydown',
    e => {
      if (e.key !== 'Escape' || $('survSetup').hidden) return;
      const d = ['kitDrawer', 'rulesDrawer'].find(id => !$(id).hidden);
      if (!d) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      $(d).querySelector('[data-close]').click();
    },
    true
  ); // Escape shuts the panel first, then (again) leaves the setup
  $('survBack').addEventListener('click', () => {
    $('survSetup').hidden = true;
    $('menu').hidden = false;
    $(SETUP === 'hm' ? 'hmBtn' : 'survBtn').focus({ preventScroll: true }); // back to the button that opened it
  });
  const wonToMenu = () => {
    $('won').hidden = true;
    $('hud').hidden = true;
    showMenuRec();
    $('menu').hidden = false;
    menuInit();
  };
  $('wonMenuBtn').addEventListener('click', () => {
    wonToMenu();
    openSetup('camp'); // straight to the road out again, your kit on the same screen
  });
  $('wonHomeBtn').addEventListener('click', wonToMenu);
  $('againBtn').addEventListener('click', () => {
    begin(false);
  });
  $('resumeBtn').addEventListener('click', () => setPause(false));
  $('quitBtn').addEventListener('click', () => {
    const qb = $('quitBtn');
    if (qb.dataset.sure !== '1') {
      qb.dataset.sure = '1';
      qb.textContent = 'Quit? The run ends: its scrap and its dawn save are lost';
      setTimeout(() => {
        qb.dataset.sure = '';
        qb.textContent = 'Quit run';
      }, 3000);
      return;
    }
    qb.dataset.sure = '';
    qb.textContent = 'Quit run';
    hushBarks();
    cutRun(); // what the run had playing when you paused must not play out on your next click in the menu
    GS.state = 'menu'; // (before the wake: the sound doesn't wake while paused)
    wakeAudio(); // and the title isn't left asking to be tuned in: the cut's silence, then its own sound fades up
    if (AC && AC.state === 'suspended') AC.resume().then(cutRun); // (a frozen clock jumps on waking: the silence is laid again from where it really is)
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
