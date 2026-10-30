/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from './gs.js';
import { clamp } from './util.js';
import { showStreak } from '../ui/callouts.js';
export const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      if (k === 'rr_meta') {
        const old = localStorage.getItem(k);
        if (old && old !== v) {
          try {
            const parsed = JSON.parse(old);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
              localStorage.setItem('rr_meta_backup', old);
          } catch (e) {}
        }
      }
      localStorage.setItem(k, v);
      return true;
    } catch (e) {
      return false;
    }
  },
};
export let opt;
const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
export let TSU; // the text size the player picked
export let TS; // text size in play (radio, prompts, markers): the pick, grown on big screens
export let TSH; // the same for the HUD's corner panels, capped so the two top ones never meet
export let META_DEF;
export function mergeSavedMeta(raw) {
  const m = JSON.parse(raw || '{}');
  if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error('Invalid saved profile');
  const d = META_DEF(),
    record = v => !!v && typeof v === 'object' && !Array.isArray(v);
  // Copy only known top-level fields. Object spread creates data properties safely, including for a
  // malformed "__proto__" key, instead of allowing imported profile data to alter object prototypes.
  GS.meta = META_DEF();
  for (const k of ['seeds', 'diff', 'district', 'inf', 'infMax', 'hero', 'outfit', 'tutDone', 'tutForce', 'v']) {
    if (Object.prototype.hasOwnProperty.call(m, k)) GS.meta[k] = m[k];
  }
  for (const k of [
    'unlocked',
    'perks',
    'daily',
    'vol',
    'ch',
    'hud',
    'perkOff',
    'stats',
    'chal',
    'trophies',
    'evacDist',
    'tips',
    'twists',
    'keys',
    'abOwn',
    'abSel',
  ]) {
    if (record(m[k])) GS.meta[k] = { ...m[k] };
  }
  GS.meta.unlocked = { ranger: true, ...GS.meta.unlocked };
  GS.meta.vol = { ...d.vol, ...GS.meta.vol };
  GS.meta.ch = { ...d.ch, ...GS.meta.ch };
  GS.meta.hud = { ...d.hud, ...GS.meta.hud };
}
export let META_VER; // profile format: bump when a saved field changes meaning; older profiles load and are upgraded in normalizeMeta
let saveFail;
export function saveMeta() {
  GS.meta.v = META_VER;
  const ok = store.set('rr_meta', JSON.stringify(GS.meta));
  if (!ok && !saveFail) {
    saveFail = true;
    const w = document.getElementById('saveWarn');
    if (w) w.hidden = false;
    if (typeof GS.state !== 'undefined' && GS.state === 'play' && typeof showStreak === 'function')
      showStreak('Progress not saved', 'This browser is blocking storage, or it is full');
  } else if (ok && saveFail) {
    saveFail = false;
    const w = document.getElementById('saveWarn');
    if (w) w.hidden = true;
  }
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  opt = {
    // with the system's reduced-motion setting on, lean, shake and flashes start off until the player says otherwise
    lean: store.get('rr_lean') === '1' || (store.get('rr_lean') == null && !reduceMotion()),
    shake: store.get('rr_shake') === '1' || (store.get('rr_shake') == null && !reduceMotion()),
    dmgNums: store.get('rr_dmgnums') === '1', // off unless asked for
    music: store.get('rr_music') !== '0',
    gore: store.get('rr_gore') !== '0',
    grain: store.get('rr_grain') !== '0',
    los: store.get('rr_los') !== '0',
    flash: store.get('rr_flash') === '1' || (store.get('rr_flash') == null && reduceMotion()),
    quality: 'ultra',
  };
  // Graphics quality is intentionally fixed at Ultra. Keep old profile data compatible but never let it downgrade rendering.
  store.set('rr_quality', 'ultra');
  TSU = () => (GS.meta && GS.meta.hud && GS.meta.hud.ts) || 1;
  TS = () => {
    const w = window.innerWidth,
      h = window.innerHeight,
      a = clamp(Math.round(Math.min(w / 1366, h / 768) * 20) / 20, 1, 1.4);
    return Math.max(1, TSU() * a);
  };
  TSH = () => {
    const cap = Math.floor(((window.innerWidth / 2 - 12) / 470) * 20) / 20;
    return Math.max(1, Math.min(TS(), cap));
  };
  META_DEF = () => ({
    ch: { col: 'white', size: 1.15, line: true },
    hud: { size: 'compact', op: 1, gfx: 'ultra', fps: false },
    seeds: 0,
    unlocked: { ranger: true },
    perks: {},
    daily: {},
    vol: { master: 0.8, music: 0.6, sfx: 0.6 },
    diff: 'normal',
    hero: 'ranger',
  });
  GS.meta = META_DEF();
  try {
    mergeSavedMeta(store.get('rr_meta') || '{}');
  } catch (e) {
    try {
      mergeSavedMeta(store.get('rr_meta_backup') || '{}');
    } catch (e2) {
      GS.meta = META_DEF();
    }
  }
  META_VER = 2;
  saveFail = false;
}
