/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from './gs.js';
import { $ } from './errors.js';
import { mergeSavedMeta, store } from './settings.js';
import { normalizeMeta } from './profile.js';
const PROFILE_FORMAT = 'dead-acre-profile';
const PROFILE_VERSION = 1;
const PROFILE_KEYS = [
  'rr_meta',
  'rr_lean',
  'rr_shake',
  'rr_music',
  'rr_gore',
  'rr_grain',
  'rr_los',
  'rr_flash',
  'rr_quality',
  'rr_muted',
  'rr_best',
  'rr_wave',
];
const PROFILE_TOGGLES = new Set([
  'rr_lean',
  'rr_shake',
  'rr_music',
  'rr_gore',
  'rr_grain',
  'rr_los',
  'rr_flash',
  'rr_muted',
]);
function profileStatus(message, isError = false) {
  const el = $('saveStatus');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', !!isError);
}
function buildProfileExport() {
  const values = {};
  values.rr_meta = JSON.stringify(GS.meta);
  for (const key of PROFILE_KEYS) if (key !== 'rr_meta') values[key] = store.get(key);
  // Keep older backup readers compatible while ensuring this build always records Ultra.
  values.rr_quality = 'ultra';
  return { format: PROFILE_FORMAT, version: PROFILE_VERSION, exportedAt: new Date().toISOString(), values };
}
let dlCap;
async function exportProfile() {
  const name = `dead-acre-save-${new Date().toISOString().slice(0, 10)}.json`;
  const dl = dlCap ? await dlCap : null;
  if (dl) {
    try {
      await dl.save({ filename: name, data: JSON.stringify(buildProfileExport(), null, 2) });
      profileStatus('Save exported. Store the JSON file somewhere safe.');
    } catch (err) {
      profileStatus(
        err && err.code === 'declined' ? 'Export cancelled.' : 'Export is not available in this view.',
        err && err.code !== 'declined'
      );
    }
    return;
  }
  try {
    const payload = JSON.stringify(buildProfileExport(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    profileStatus('Save exported. Store the JSON file somewhere safe.');
  } catch (err) {
    profileStatus('Export failed. Check that this browser allows file downloads.', true);
  }
}
function normalizeImportedProfile(doc) {
  if (
    !doc ||
    typeof doc !== 'object' ||
    Array.isArray(doc) ||
    doc.format !== PROFILE_FORMAT ||
    doc.version !== PROFILE_VERSION ||
    !doc.values ||
    typeof doc.values !== 'object' ||
    Array.isArray(doc.values)
  ) {
    throw new Error('That file is not a supported Dead Acre save backup.');
  }
  if (typeof doc.values.rr_meta !== 'string') throw new Error('The backup is missing its profile data.');
  let rawMeta;
  try {
    rawMeta = JSON.parse(doc.values.rr_meta);
  } catch (err) {
    throw new Error('The profile data is not valid JSON.');
  }
  if (
    !rawMeta ||
    typeof rawMeta !== 'object' ||
    Array.isArray(rawMeta) ||
    !['seeds', 'unlocked', 'hero', 'stats', 'chal'].some(k => Object.prototype.hasOwnProperty.call(rawMeta, k))
  ) {
    throw new Error('The backup does not contain a valid game profile.');
  }
  // Reuse the game's allow-list and clamping rules; don't trust raw file data as runtime state.
  const previousMeta = GS.meta;
  let sanitizedMeta;
  try {
    mergeSavedMeta(doc.values.rr_meta);
    normalizeMeta();
    sanitizedMeta = JSON.stringify(GS.meta);
  } finally {
    GS.meta = previousMeta;
  }
  const clean = { rr_meta: sanitizedMeta };
  for (const key of PROFILE_KEYS) {
    if (key === 'rr_meta') continue;
    const value = doc.values[key];
    if (PROFILE_TOGGLES.has(key)) clean[key] = value === '0' || value === '1' ? value : null;
    else if (key === 'rr_quality') clean[key] = 'ultra';
    else if (key === 'rr_best' || key === 'rr_wave') {
      const n = Number(value);
      clean[key] = value != null && Number.isFinite(n) && n >= 0 ? String(Math.floor(Math.min(n, 1e9))) : null;
    }
  }
  return clean;
}
function commitImportedProfile(values) {
  const keys = [...PROFILE_KEYS, 'rr_meta_backup'];
  const previous = {};
  // Read everything before writing anything, so blocked storage fails cleanly.
  for (const key of keys) previous[key] = localStorage.getItem(key);
  try {
    // `meta` is already normalized at runtime; keep that known-good profile as the recovery point.
    localStorage.setItem('rr_meta_backup', JSON.stringify(GS.meta));
    localStorage.setItem('rr_meta', values.rr_meta);
    for (const key of PROFILE_KEYS) {
      if (key === 'rr_meta') continue;
      if (values[key] == null) localStorage.removeItem(key);
      else localStorage.setItem(key, values[key]);
    }
  } catch (err) {
    // Roll back the partial write if quota/security policy rejects an item.
    for (const key of keys) {
      try {
        if (previous[key] == null) localStorage.removeItem(key);
        else localStorage.setItem(key, previous[key]);
      } catch (rollbackErr) {}
    }
    throw new Error(
      'The browser could not save the imported profile. Nothing was intentionally changed; check storage permissions and free space.'
    );
  }
}
/* ---------- Hangar ---------- */

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  if (window.claude && typeof window.claude.use === 'function')
    dlCap = window.claude
      .use('downloads')
      .catch(() => null); /* hosted on claude.ai: saves go through the viewer's own confirmation */
  $('exportSave').addEventListener('click', exportProfile);
  $('importSave').addEventListener('click', () => {
    $('importSaveFile').click();
  });
  $('importSaveFile').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      profileStatus('Import failed: save files must be smaller than 2 MB.', true);
      return;
    }
    try {
      const doc = JSON.parse(await file.text());
      const values = normalizeImportedProfile(doc);
      if (
        !window.confirm(
          'Import this save? It replaces the profile and settings in this browser, then reloads the game. Your current valid profile will be kept as a recovery backup.'
        )
      ) {
        profileStatus('Import cancelled. Your current profile is unchanged.');
        return;
      }
      commitImportedProfile(values);
      profileStatus('Import successful. Reloading the game…');
      setTimeout(() => location.reload(), 250);
    } catch (err) {
      profileStatus(`Import failed: ${String((err && err.message) || err).slice(0, 220)}`, true);
    }
  });
}
