/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The asset pack. dist/game.js keeps its heavy pieces out of the script: the 3D pictures, the radio voices, the
// recorded sounds and the band's instruments come from assets/ next to it, listed in pack.json, and each part of the
// game takes over its piece as it arrives. The one-file version has them all built in (window.__DA_DATA). If the
// pack can't be reached the game still starts, with painted characters, synth sounds and a radio of clicks and static.
import { GS } from './gs.js';
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
  parts: {}, // each download: { size, got, done } (done whether it arrived or failed), for the loading bars
};
const SOUNDS = ['gun', 'vox', 'mus'];
// how the sounds are coming along: bytes in, bytes in all, and whether any is still on its way
export function soundProgress() {
  let got = 0,
    size = 0,
    pend = false;
  for (const k of SOUNDS) {
    const q = PACK.parts[k];
    if (!q) continue;
    got += Math.min(q.got, q.size);
    size += q.size;
    if (!q.done) pend = true;
  }
  return { got, size, pend };
}
// where assets/ is: next to dist/game.js, which records its own address in window.__DA_BASE. Empty in the one-file version
const ASSET_URL = window.__DA_BASE ? window.__DA_BASE.replace(/dist\/$/, 'assets/') : '';
// a download that counts its bytes as they come in
async function get(f, how, ms, part) {
  const c = new AbortController(),
    t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(ASSET_URL + f, { signal: c.signal, mode: 'cors' });
    if (!r.ok) throw new Error(f + ' ' + r.status);
    if (how === 'json' || !part || !r.body || !r.body.getReader) return await r[how]();
    const rd = r.body.getReader(),
      chunks = [];
    let n = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      chunks.push(value);
      n += value.length;
      part.got = n;
    }
    const out = new Uint8Array(n);
    let o = 0;
    for (const ch of chunks) {
      out.set(ch, o);
      o += ch.length;
    }
    return out.buffer;
  } finally {
    clearTimeout(t);
    if (part) part.done = true;
  }
}
const listSize = (list, io = 1) => list.reduce((m, e) => Math.max(m, e[io] + e[io + 1]), 0); // io: where each entry keeps its offset (its length follows)
export async function assetsPrep(step) {
  if (!ASSET_URL) return;
  step('Bringing in the convoy’s gear…', 0.03);
  try {
    const j = await get('pack.json', 'json', 12000);
    PACK.v = j.v;
    // the 3D art first, on its own, so the menu comes up as soon as it can; the sounds follow behind it
    const A = (PACK.parts.artA = { size: j.bake.an || 732000, got: 0, done: false }),
      H = (PACK.parts.artH = { size: j.bake.hn || 122000, got: 0, done: false }),
      tick = setInterval(() => {
        const g = Math.min(A.got, A.size) + Math.min(H.got, H.size),
          n = A.size + H.size;
        step(
          `Bringing in the 3D art · ${(g / 1048576).toFixed(1)} of ${(n / 1048576).toFixed(1)} MB`,
          0.05 + 0.7 * (g / n)
        );
      }, 120);
    let a = ASSET_URL + j.bake.a,
      h = ASSET_URL + j.bake.h;
    try {
      const [ab, hb] = await Promise.all([
        get(j.bake.a, 'arrayBuffer', 60000, A),
        get(j.bake.h, 'arrayBuffer', 60000, H),
      ]);
      a = URL.createObjectURL(new Blob([ab], { type: 'image/avif' }));
      h = URL.createObjectURL(new Blob([hb], { type: 'image/avif' }));
    } catch (e) {
      console.warn('Dead Acre: the 3D art came in slowly; trying it directly', e);
    } finally {
      clearInterval(tick);
    }
    PACK.bake = { key: j.bake.key, hs: j.bake.hs, pos: j.bake.pos, a, h };
    const sound = (k, ms, take, why) => {
      if (!j[k]) return;
      const q = (PACK.parts[k] = { size: listSize(j[k].list, k === 'vox' ? 3 : 1), got: 0, done: false });
      get(j[k].file, 'arrayBuffer', ms, q)
        .then(take)
        .catch(e => console.warn('Dead Acre: ' + why, e));
    };
    sound(
      'gun',
      120000,
      gb => {
        GS.GUNHD = j.gun.list.map(([n, o, l]) => [n, gb.slice(o, o + l)]);
        PACK.gun = true;
        gunHD();
      },
      'full-quality gun sounds unavailable, using the built-in ones'
    ); // the recorded gun set, swapped in as it arrives
    sound(
      'vox',
      150000,
      vb => {
        GS.VOX = j.vox.list.map(([id, t, d, o, n, w]) => [id, t, d, vb.slice(o, o + n), w || 'R']);
        PACK.vox = true;
      },
      'no radio voices this time'
    ); // until the voices are in, the radio is clicks and static
    sound(
      'mus',
      180000,
      mb => {
        GS.MUSHD = j.mus.list.map(([n, o, l, ...x]) => [n, mb.slice(o, o + l), ...x]);
        PACK.mus = true;
        loadMusic();
      },
      'the recorded band is unavailable, playing the synth one'
    );
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
    download: Object.fromEntries(
      Object.entries(PACK.parts).map(([k, q]) => [k, `${q.got}/${q.size}${q.done ? ' done' : ''}`])
    ),
  });
}
