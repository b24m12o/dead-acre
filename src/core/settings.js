/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const store = {
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
const opt = {
  lean: store.get('rr_lean') !== '0',
  shake: store.get('rr_shake') !== '0',
  music: store.get('rr_music') !== '0',
  gore: store.get('rr_gore') !== '0',
  grain: store.get('rr_grain') !== '0',
  los: store.get('rr_los') !== '0',
  flash:
    store.get('rr_flash') === '1' ||
    (store.get('rr_flash') == null && !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)),
  quality: 'ultra',
};
// Graphics quality is intentionally fixed at Ultra. Keep old profile data compatible but never let it downgrade rendering.
store.set('rr_quality', 'ultra');
const TSU = () => (meta && meta.hud && meta.hud.ts) || 1; // the text size the player picked
const TS = () => {
  const w = window.innerWidth,
    h = window.innerHeight,
    a = clamp(Math.round(Math.min(w / 1366, h / 768) * 20) / 20, 1, 1.4),
    cap = Math.floor(((w / 2 - 12) / 470) * 20) / 20;
  return Math.max(1, Math.min(TSU() * a, cap));
}; // HUD text size: the pick, grown on big screens, capped so the top panels never meet
const META_DEF = () => ({
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
let meta = META_DEF();
function mergeSavedMeta(raw) {
  const m = JSON.parse(raw || '{}');
  if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error('Invalid saved profile');
  const d = META_DEF(),
    record = v => !!v && typeof v === 'object' && !Array.isArray(v);
  // Copy only known top-level fields. Object spread creates data properties safely, including for a
  // malformed "__proto__" key, instead of allowing imported profile data to alter object prototypes.
  meta = META_DEF();
  for (const k of ['seeds', 'diff', 'district', 'inf', 'infMax', 'hero', 'outfit', 'tutDone', 'tutForce', 'v']) {
    if (Object.prototype.hasOwnProperty.call(m, k)) meta[k] = m[k];
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
  ]) {
    if (record(m[k])) meta[k] = { ...m[k] };
  }
  meta.unlocked = { ranger: true, ...meta.unlocked };
  meta.vol = { ...d.vol, ...meta.vol };
  meta.ch = { ...d.ch, ...meta.ch };
  meta.hud = { ...d.hud, ...meta.hud };
}
try {
  mergeSavedMeta(store.get('rr_meta') || '{}');
} catch (e) {
  try {
    mergeSavedMeta(store.get('rr_meta_backup') || '{}');
  } catch (e2) {
    meta = META_DEF();
  }
}
const META_VER = 2; // profile format: bump when a saved field changes meaning; older profiles load and are upgraded in normalizeMeta
let saveFail = false;
function saveMeta() {
  meta.v = META_VER;
  const ok = store.set('rr_meta', JSON.stringify(meta));
  if (!ok && !saveFail) {
    saveFail = true;
    const w = document.getElementById('saveWarn');
    if (w) w.hidden = false;
    if (typeof state !== 'undefined' && state === 'play' && typeof showStreak === 'function')
      showStreak('Progress not saved', 'This browser is blocking storage, or it is full');
  } else if (ok && saveFail) {
    saveFail = false;
    const w = document.getElementById('saveWarn');
    if (w) w.hidden = true;
  }
}
