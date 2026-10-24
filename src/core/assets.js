/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The asset pack. dist/game.js keeps its heavy pieces out of the script: the 3D pictures, the radio voices, the
// recorded sounds and the band's instruments come from assets/ next to it, listed in pack.json, and each part of the
// game takes over its piece as it arrives. The one-file version has them all built in (window.__DA_DATA). If the
// pack can't be reached the game still starts, with painted characters, synth sounds and a radio of clicks and static.
import { GS } from './gs.js';
import { $ } from './errors.js';
import { SBV, gunHD } from '../audio/audio.js';
import { MSN, loadMusic } from '../audio/music.js';
import { BAKE } from '../render/bake.js';

// what arrived: the pack's version, the 3D pictures (bake), and which of the sound sets came in
export const PACK = {
  v: null,
  bake: window.__DA_DATA ? window.__DA_DATA.bake : undefined,
  gun: false,
  mus: false,
  vox: false,
  err: '',
};
// where assets/ is: next to dist/game.js, which records its own address in window.__DA_BASE. Empty in the one-file version
const ASSET_URL = window.__DA_BASE ? window.__DA_BASE.replace(/dist\/$/, 'assets/') : '';
export async function assetsPrep() {
  if (!ASSET_URL) return;
  const ld = $('loading'),
    get = async (f, how, ms) => {
      const c = new AbortController(),
        t = setTimeout(() => c.abort(), ms);
      try {
        const r = await fetch(ASSET_URL + f, { signal: c.signal, mode: 'cors' });
        if (!r.ok) throw new Error(f + ' ' + r.status);
        return await r[how]();
      } finally {
        clearTimeout(t);
      }
    };
  if (ld) ld.textContent = 'Bringing in the convoy’s gear…';
  try {
    const j = await get('pack.json', 'json', 12000);
    PACK.bake = { key: j.bake.key, hs: j.bake.hs, pos: j.bake.pos, a: ASSET_URL + j.bake.a, h: ASSET_URL + j.bake.h };
    PACK.v = j.v;
    if (j.gun)
      get(j.gun.file, 'arrayBuffer', 90000)
        .then(gb => {
          GS.GUNHD = j.gun.list.map(([n, o, l]) => [n, gb.slice(o, o + l)]);
          PACK.gun = true;
          gunHD();
        })
        .catch(e =>
          console.warn('Dead Acre: full-quality gun sounds unavailable, using the built-in ones', e)
        ); /* the recorded gun set, swapped in as it arrives */
    if (j.mus)
      get(j.mus.file, 'arrayBuffer', 120000)
        .then(mb => {
          GS.MUSHD = j.mus.list.map(([n, o, l, ...x]) => [n, mb.slice(o, o + l), ...x]);
          PACK.mus = true;
          loadMusic();
        })
        .catch(e => console.warn('Dead Acre: the recorded band is unavailable, playing the synth one', e));
    get(j.vox.file, 'arrayBuffer', 90000)
      .then(vb => {
        GS.VOX = j.vox.list.map(([id, t, d, o, n, w]) => [id, t, d, vb.slice(o, o + n), w || 'R']);
        PACK.vox = true;
      })
      .catch(e =>
        console.warn('Dead Acre: no radio voices this time', e)
      ); /* the voices come in behind the game; until then the radio is clicks and static */
  } catch (e) {
    PACK.err = String((e && e.message) || e);
    console.warn('Dead Acre: the asset pack could not be reached, playing with the built-in basics', e);
  }
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  // type DA_STATUS() in the browser console to see where the art and sounds came from
  window.DA_STATUS = () => ({
    pack: ASSET_URL ? PACK.v || 'unreachable: ' + PACK.err : 'built in',
    art:
      BAKE.diag && BAKE.diag.on ? BAKE.diag.n + ' parts' : 'painted (' + ((BAKE.diag && BAKE.diag.why) || 'none') + ')',
    voices: GS.VOX.length,
    guns: Object.keys(SBV).length,
    band: MSN(),
  });
}
